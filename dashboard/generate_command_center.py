#!/usr/bin/env python3
"""
Command Center — the one dashboard Brew always refers to.

Pulls every data source into a single self-contained HTML page + JSON:
  - GA4 traffic (CW + KD properties, incl. realtime active users)
  - Google Search Console (both sites, week-over-week)
  - Bing Webmaster Tools (when secrets/api-keys.json has bing.api_key)
  - Funnels: calculator -> email capture -> completion -> paid; drip; newsletter; coach
  - Calculator demographics per site (CW + KD, from calculator_sessions_v2)
  - Feedback (content_feedback) and inbound mail (Resend receiving + drip_events)
  - Email engagement (opens / clicks / bounces / complaints)
  - Stripe revenue vs the $1k/month net target

Outputs:
  dashboard/command-center-data.json   (machine-readable, for future model runs)
  dashboard/command-center.html        (open this — self-contained, no server)

Run:            python3 dashboard/generate_command_center.py
Skip AI review: python3 dashboard/generate_command_center.py --no-model
Automated:      .github/workflows/dashboard-update.yml (daily 10:30 UTC) commits both files.

Maintenance notes for future (small-model) sessions:
  - Every fetcher degrades gracefully: on error it returns {'error': ...} and the
    HTML renders a "source unavailable" note instead of crashing the whole page.
  - To add a section: write fetch_x() -> dict, add to collect(), add render block
    in render_html(), and (optionally) rules in build_insights().
  - Do NOT print or embed secret values anywhere in the JSON/HTML.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CREDS_PATH = os.path.join(SCRIPT_DIR, 'ga4-credentials.json')
SECRETS_PATH = os.path.join(PROJECT_ROOT, 'secrets', 'api-keys.json')
DATA_OUT = os.path.join(SCRIPT_DIR, 'command-center-data.json')
HTML_OUT = os.path.join(SCRIPT_DIR, 'command-center.html')

SUPABASE_PROJECT_ID = 'kwtdpvnjewtahuxjyltn'
CW_GA4 = 'properties/517632328'
KD_GA4 = 'properties/539655784'
GSC_CW = 'sc-domain:carnivoreweekly.com'
GSC_KD = 'https://ketodial.com/'
BING_CW = 'https://carnivoreweekly.com'
BING_KD = 'https://ketodial.com'
NET_TARGET_MONTHLY = 1000.0  # CW goal: $1k/month NET profit
CW_DEMO_BASELINE = {'45_plus_share': 66, 'female_share': 53, 'weight_loss_share': 84}

TODAY = date.today()
NOW_STR = datetime.now().strftime('%Y-%m-%d %H:%M')

# Internal / test accounts filtered out of people-level data.
# NOTE: never filter on '+' alone — real readers use plus-addressing
# (see memory feedback-plus-addressing-not-junk).
TEST_EMAIL_MARKERS = ('iambrew@gmail.com', 'iambrew+', '@test.ketodial.com', '@example.com',
                      'mbrew@telus.net', 'shoptest@', 'qa+hermes@', 'm@e.com',
                      'brew+calctest@')

# Our own sending addresses. Mail FROM these is our own send looping back
# through the inbound catch-all (e.g. newsletter to a subscriber address on
# this domain) — never reader mail.
OWN_SENDER_MARKERS = ('newsletter@carnivoreweekly.com', 'ketodial@carnivoreweekly.com',
                      'coach@carnivoreweekly.com')

# Server-side equivalents for supa_count()/PostgREST, since those counts never
# pass through is_test_email(). '+' must be %2B in the URL or PostgREST reads a
# space. CALC variant keeps email-less rows (started-but-no-email is real data).
CALC_TEST_FILTER = ('or=(email.is.null,and(email.neq.iambrew@gmail.com,'
                    'email.not.ilike.iambrew%2B*,email.not.ilike.*@test.ketodial.com,'
                    'email.not.ilike.*@example.com))')
SUBSCRIBER_TEST_FILTER = ('email=neq.iambrew@gmail.com&email=not.ilike.iambrew%2B*'
                          '&email=not.ilike.*@test.ketodial.com&email=not.ilike.*@example.com')
TEST_TEXT_MARKERS = ('please ignore', 'this is only a test', 'test feedback')


def is_test_email(email):
    e = (email or '').lower()
    return any(m in e for m in TEST_EMAIL_MARKERS)


def is_test_feedback(row):
    text = (row.get('request_text') or '').lower()
    return is_test_email(row.get('email')) or any(m in text for m in TEST_TEXT_MARKERS)


def load_secrets():
    try:
        with open(SECRETS_PATH) as f:
            return json.load(f)
    except Exception:
        return {}


SECRETS = load_secrets()


def get_service_role_key():
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not key:
        env_path = os.path.join(PROJECT_ROOT, '.env')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                        key = line.split('=', 1)[1].strip().strip('"').strip("'")
    return key


def pct_change(cur, prev):
    if not prev:
        return None
    return round(((cur - prev) / prev) * 100, 1)


def http_json(url, headers=None, timeout=20):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


# ── GA4 ──────────────────────────────────────────────────────────────

_ga4_client = None


def ga4_client():
    global _ga4_client
    if _ga4_client is None:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(
            CREDS_PATH, scopes=['https://www.googleapis.com/auth/analytics.readonly'])
        _ga4_client = BetaAnalyticsDataClient(credentials=creds)
    return _ga4_client


def ga4_run(property_id, dimensions, metrics, date_ranges, limit=25, order_desc_metric=True):
    from google.analytics.data_v1beta.types import (
        DateRange, Dimension, Metric, OrderBy, RunReportRequest)
    order_bys = []
    if dimensions and not order_desc_metric:
        order_bys = [OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name=dimensions[0]))]
    elif dimensions:
        order_bys = [OrderBy(metric=OrderBy.MetricOrderBy(metric_name=metrics[0]), desc=True)]
    resp = ga4_client().run_report(RunReportRequest(
        property=property_id,
        date_ranges=[DateRange(start_date=s, end_date=e) for s, e in date_ranges],
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        order_bys=order_bys, limit=limit,
    ))
    return resp


def fetch_traffic(property_id):
    """Traffic block for one site. Week-over-week, today, realtime, 28d daily, sources, pages."""
    out = {}
    metrics = ['sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'engagedSessions', 'bounceRate']
    resp = ga4_run(property_id, [], metrics,
                   [('7daysAgo', 'today'), ('14daysAgo', '8daysAgo')], order_desc_metric=False)
    cur = [float(v.value) for v in resp.rows[0].metric_values] if resp.rows else [0] * 6
    prev = [float(v.value) for v in resp.rows[1].metric_values] if len(resp.rows) > 1 else [0] * 6
    out['week'] = {m: {'current': c, 'previous': p, 'change_pct': pct_change(c, p)}
                   for m, c, p in zip(metrics, cur, prev)}

    resp = ga4_run(property_id, [], ['sessions', 'totalUsers', 'screenPageViews'],
                   [('today', 'today')], order_desc_metric=False)
    tv = [int(float(v.value)) for v in resp.rows[0].metric_values] if resp.rows else [0, 0, 0]
    out['today'] = {'sessions': tv[0], 'users': tv[1], 'pageviews': tv[2]}

    try:
        from google.analytics.data_v1beta.types import Metric, RunRealtimeReportRequest
        rt = ga4_client().run_realtime_report(RunRealtimeReportRequest(
            property=property_id, metrics=[Metric(name='activeUsers')]))
        out['active_now'] = int(rt.rows[0].metric_values[0].value) if rt.rows else 0
    except Exception:
        out['active_now'] = None

    resp = ga4_run(property_id, ['date'], ['sessions', 'totalUsers'],
                   [('28daysAgo', 'today')], limit=40, order_desc_metric=False)
    out['daily'] = sorted([
        {'date': f"{r.dimension_values[0].value[:4]}-{r.dimension_values[0].value[4:6]}-{r.dimension_values[0].value[6:]}",
         'sessions': int(r.metric_values[0].value), 'users': int(r.metric_values[1].value)}
        for r in resp.rows], key=lambda x: x['date'])

    # Bot-burst guard (bead yb7q): a single day >3x the 28d median is almost
    # always the direct/desktop/NY crawler burst (2026-08-01 verdict: Jul 14 hit
    # 71 sessions and Jul 28 hit 56 vs a ~15 median), not readers. Flag those
    # days and compute a week-over-week with them excluded, so one burst can't
    # fake a surge — or, by landing in the comparison week, fake a crash.
    daily = out['daily']
    med = sorted(x['sessions'] for x in daily)[len(daily) // 2] if daily else 0
    out['daily_median_28d'] = med
    out['spike_days'] = [x for x in daily if med >= 5 and x['sessions'] > 3 * med]
    spike_dates = {x['date'] for x in out['spike_days']}
    if len(daily) >= 14:
        cur_days = [x for x in daily[-7:] if x['date'] not in spike_dates]
        prev_days = [x for x in daily[-14:-7] if x['date'] not in spike_dates]
        cur_s = sum(x['sessions'] for x in cur_days)
        prev_s = sum(x['sessions'] for x in prev_days)
        out['week_ex_spike'] = {
            'current': cur_s, 'previous': prev_s, 'change_pct': pct_change(cur_s, prev_s),
            'excluded': sorted(spike_dates & {x['date'] for x in daily[-14:]})}

    resp = ga4_run(property_id, ['sessionSourceMedium'], ['sessions'], [('7daysAgo', 'today')], limit=10)
    out['sources_7d'] = [{'source': r.dimension_values[0].value, 'sessions': int(r.metric_values[0].value)}
                         for r in resp.rows]

    resp = ga4_run(property_id, ['pagePath'], ['screenPageViews'], [('7daysAgo', 'today')], limit=10)
    out['top_pages_7d'] = [{'page': r.dimension_values[0].value, 'views': int(r.metric_values[0].value)}
                           for r in resp.rows]

    resp = ga4_run(property_id, ['deviceCategory'], ['sessions'], [('7daysAgo', 'today')], limit=5)
    out['devices_7d'] = [{'device': r.dimension_values[0].value, 'sessions': int(r.metric_values[0].value)}
                         for r in resp.rows]

    # Country mix over 90d, not 7d: this is a slow-moving structural fact used for
    # pricing and shipping calls (USD pricing, ButcherBox not shipping to Canada), and
    # a single week of ~100 sessions is far too noisy to decide either on.
    # users is kept alongside sessions so crawler traffic stays visible: real readers
    # come back, so ~1 session per user at volume is the bot signature.
    resp = ga4_run(property_id, ['country'], ['sessions', 'totalUsers'],
                   [('90daysAgo', 'today')], limit=12)
    out['geo_90d'] = [{'country': r.dimension_values[0].value,
                       'sessions': int(r.metric_values[0].value),
                       'users': int(r.metric_values[1].value)}
                      for r in resp.rows]
    return out


# ── Google Search Console ────────────────────────────────────────────

_gsc_api = None


def gsc_api():
    global _gsc_api
    if _gsc_api is None:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        creds = service_account.Credentials.from_service_account_file(
            CREDS_PATH, scopes=['https://www.googleapis.com/auth/webmasters.readonly'])
        _gsc_api = build('searchconsole', 'v1', credentials=creds)
    return _gsc_api


def gsc_totals(site_url, start, end):
    resp = gsc_api().searchanalytics().query(siteUrl=site_url, body={
        'startDate': str(start), 'endDate': str(end)}).execute()
    rows = resp.get('rows', [])
    if not rows:
        return {'clicks': 0, 'impressions': 0, 'ctr': 0, 'position': 0}
    r = rows[0]
    return {'clicks': r['clicks'], 'impressions': r['impressions'],
            'ctr': round(r['ctr'] * 100, 2), 'position': round(r['position'], 1)}


def fetch_gsc(site_url):
    # GSC data lags ~2 days; compare the freshest full week to the prior week
    end = TODAY - timedelta(days=2)
    start = end - timedelta(days=6)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=6)
    out = {'window': f'{start} → {end}',
           'current': gsc_totals(site_url, start, end),
           'previous': gsc_totals(site_url, prev_start, prev_end)}
    for dim, key in [('query', 'top_queries'), ('page', 'top_pages')]:
        resp = gsc_api().searchanalytics().query(siteUrl=site_url, body={
            'startDate': str(start), 'endDate': str(end),
            'dimensions': [dim], 'rowLimit': 12}).execute()
        out[key] = [{'key': r['keys'][0], 'clicks': r['clicks'], 'impressions': r['impressions'],
                     'ctr': round(r['ctr'] * 100, 1), 'position': round(r['position'], 1)}
                    for r in resp.get('rows', [])]
    return out


# ── Bing Webmaster Tools ─────────────────────────────────────────────

def ga4_bing_sessions(property_id):
    """Bing organic sessions from GA4 — fallback when no Bing Webmaster API key."""
    from google.analytics.data_v1beta.types import (
        DateRange, Filter, FilterExpression, Metric, RunReportRequest)
    resp = ga4_client().run_report(RunReportRequest(
        property=property_id,
        date_ranges=[DateRange(start_date='7daysAgo', end_date='today'),
                     DateRange(start_date='14daysAgo', end_date='8daysAgo')],
        metrics=[Metric(name='sessions')],
        dimension_filter=FilterExpression(filter=Filter(
            field_name='sessionSource',
            string_filter=Filter.StringFilter(
                value='bing', match_type=Filter.StringFilter.MatchType.CONTAINS))),
    ))
    cur = int(float(resp.rows[0].metric_values[0].value)) if resp.rows else 0
    prev = int(float(resp.rows[1].metric_values[0].value)) if len(resp.rows) > 1 else 0
    return cur, prev


def fetch_bing(site_url, ga4_property=None):
    """Bing Webmaster JSON API. Needs bing.api_key in secrets/api-keys.json
    (Bing Webmaster Tools → gear icon → API access → generate key; both sites
    must be verified in BWT first). Without a key, falls back to Bing organic
    sessions measured by GA4."""
    api_key = (SECRETS.get('bing') or {}).get('api_key', '')
    if not api_key:
        out = {'configured': False,
               'note': 'Bing sessions below come from GA4. For impressions/queries/position, '
                       'add bing.api_key to secrets/api-keys.json (Bing Webmaster Tools → Settings → API access).'}
        if ga4_property:
            try:
                cur, prev = ga4_bing_sessions(ga4_property)
                out['ga4_sessions_7d'] = cur
                out['ga4_sessions_prev_7d'] = prev
            except Exception as e:
                out['error'] = str(e)[:200]
        return out
    base = 'https://ssl.bing.com/webmaster/api.svc/json'
    out = {'configured': True}
    stats = http_json(f'{base}/GetRankAndTrafficStats?siteUrl={urllib.request.quote(site_url)}&apikey={api_key}')
    rows = stats.get('d', []) or []
    recent = rows[-7:]
    prior = rows[-14:-7]
    out['clicks_7d'] = sum(r.get('Clicks', 0) for r in recent)
    out['impressions_7d'] = sum(r.get('Impressions', 0) for r in recent)
    out['clicks_prev_7d'] = sum(r.get('Clicks', 0) for r in prior)
    out['impressions_prev_7d'] = sum(r.get('Impressions', 0) for r in prior)
    try:
        q = http_json(f'{base}/GetQueryStats?siteUrl={urllib.request.quote(site_url)}&apikey={api_key}')
        out['top_queries'] = [{'key': r.get('Query'), 'clicks': r.get('Clicks', 0),
                               'impressions': r.get('Impressions', 0)}
                              for r in (q.get('d') or [])[:12]]
    except Exception:
        out['top_queries'] = []
    return out


# ── Supabase (REST, service role) ────────────────────────────────────

def supa_headers():
    key = get_service_role_key()
    return {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}


def supa_fetch(table, select='*', filters='', limit=100, order=''):
    url = f'https://{SUPABASE_PROJECT_ID}.supabase.co/rest/v1/{table}?select={select}&limit={limit}'
    if filters:
        url += f'&{filters}'
    if order:
        url += f'&order={order}'
    return http_json(url, headers=supa_headers())


def supa_count(table, filters=''):
    url = f'https://{SUPABASE_PROJECT_ID}.supabase.co/rest/v1/{table}?select=id&{filters}&limit=1'
    headers = dict(supa_headers())
    headers['Prefer'] = 'count=exact'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        total = resp.headers.get('content-range', '').split('/')[-1]
        return int(total) if total and total != '*' else 0


def iso_days_ago(n):
    return (TODAY - timedelta(days=n)).isoformat()


def fetch_funnels():
    d7, d8, d14, d30 = iso_days_ago(7), iso_days_ago(8), iso_days_ago(14), iso_days_ago(30)
    out = {}

    # Calculator funnel per site (30d): started → email captured → completed → premium → paid
    for label, src in [('cw', 'cw'), ('kd', 'ketodial')]:
        base = f'source=eq.{src}&created_at=gte.{d30}&{CALC_TEST_FILTER}'
        started = supa_count('calculator_sessions_v2', base)
        email = supa_count('calculator_sessions_v2', f'{base}&email=not.is.null')
        # step 3 is the final form step (the dead completed_at column was
        # dropped 2026-08-01; free_results_viewed_at now marks results views)
        completed = supa_count('calculator_sessions_v2', f'{base}&step_completed=gte.3')
        premium = supa_count('calculator_sessions_v2', f'{base}&is_premium=eq.true')
        paid = supa_count('calculator_sessions_v2', f'{base}&amount_paid_cents=gt.0')
        wk = supa_count('calculator_sessions_v2', f'source=eq.{src}&created_at=gte.{d7}&{CALC_TEST_FILTER}')
        wk_prev = supa_count('calculator_sessions_v2',
                             f'source=eq.{src}&created_at=gte.{d14}&created_at=lt.{d8}&{CALC_TEST_FILTER}')
        out[f'calculator_{label}'] = {
            'window': 'last 30 days',
            'stages': [
                {'name': 'Sessions started', 'count': started},
                {'name': 'Reached step 3', 'count': completed},
                {'name': 'Email captured', 'count': email},
                {'name': 'Premium unlocked', 'count': premium},
                {'name': 'Paid', 'count': paid},
            ],
            'week': {'current': wk, 'previous': wk_prev, 'change_pct': pct_change(wk, wk_prev)},
        }

    # Drip funnels, one per site (CW 30-day Carnivore Starter, KD 30-day Keto Starter)
    for site in ['cw', 'kd']:
        s = f'site=eq.{site}&{SUBSCRIBER_TEST_FILTER}'
        last_sent = supa_fetch('drip_subscribers', select='last_sent_at',
                               filters=f'{s}&unsubscribed=eq.false&completed=eq.false&last_sent_at=not.is.null',
                               order='last_sent_at.desc', limit=1)
        out[f'drip_{site}'] = {
            'total': supa_count('drip_subscribers', s),
            'active': supa_count('drip_subscribers', f'{s}&unsubscribed=eq.false&completed=eq.false'),
            'completed': supa_count('drip_subscribers', f'{s}&completed=eq.true'),
            'unsubscribed': supa_count('drip_subscribers', f'{s}&unsubscribed=eq.true'),
            'new_7d': supa_count('drip_subscribers', f'{s}&subscribed_at=gte.{d7}'),
            'last_send': last_sent[0]['last_sent_at'] if last_sent else None,
        }

    # Newsletter per site
    for site in ['cw', 'kd']:
        ns = f'site=eq.{site}&{SUBSCRIBER_TEST_FILTER}'
        out[f'newsletter_{site}'] = {
            'active': supa_count('newsletter_subscribers', f'{ns}&unsubscribed_at=is.null'),
            'new_7d': supa_count('newsletter_subscribers', f'{ns}&created_at=gte.{d7}'),
            'new_prev_7d': supa_count('newsletter_subscribers',
                                      f'{ns}&created_at=gte.{d14}&created_at=lt.{d8}'),
            'unsub_7d': supa_count('newsletter_subscribers',
                                   f'{ns}&unsubscribed_at=gte.{d7}'),
        }

    # Coach (KD Coach app + waitlist)
    out['coach'] = {
        'waitlist_total': supa_count('coach_waitlist', ''),
        'waitlist_7d': supa_count('coach_waitlist', f'created_at=gte.{d7}'),
        'members_active': supa_count('coach_members', 'status=eq.active'),
        'members_total': supa_count('coach_members', ''),
    }
    return out


AGE_BUCKETS = [(0, 24, '18–24'), (25, 34, '25–34'), (35, 44, '35–44'),
               (45, 54, '45–54'), (55, 64, '55–64'), (65, 200, '65+')]


def _bucketize(rows, field):
    counts = {}
    for r in rows:
        v = r.get(field)
        v = str(v).strip().lower() if v not in (None, '') else '(not given)'
        counts[v] = counts.get(v, 0) + 1
    total = sum(counts.values()) or 1
    return [{'value': k, 'count': c, 'pct': round(c * 100 / total, 1)}
            for k, c in sorted(counts.items(), key=lambda x: -x[1])]


def fetch_demographics():
    """Per-calculator demographics from calculator_sessions_v2, last 90 days."""
    d90 = iso_days_ago(90)
    out = {}
    for label, src in [('cw', 'cw'), ('kd', 'ketodial')]:
        rows = supa_fetch(
            'calculator_sessions_v2',
            select='sex,age,goal,diet_type,device_type,email,created_at',
            filters=f'source=eq.{src}&created_at=gte.{d90}',
            order='created_at.desc', limit=1000)
        rows = [r for r in rows if not is_test_email(r.get('email'))]
        n = len(rows)
        ages = {}
        known_age = 0
        over45 = 0
        for r in rows:
            try:
                a = int(r.get('age'))
            except (TypeError, ValueError):
                continue
            known_age += 1
            if a >= 45:
                over45 += 1
            for lo, hi, name in AGE_BUCKETS:
                if lo <= a <= hi:
                    ages[name] = ages.get(name, 0) + 1
                    break
        email_captured = sum(1 for r in rows if r.get('email'))
        out[label] = {
            'window': 'last 90 days', 'sessions': n,
            'age_buckets': [{'value': name, 'count': ages.get(name, 0),
                             'pct': round(ages.get(name, 0) * 100 / known_age, 1) if known_age else 0}
                            for _, _, name in AGE_BUCKETS],
            'share_45_plus': round(over45 * 100 / known_age, 1) if known_age else None,
            'sex': _bucketize(rows, 'sex'),
            'goal': _bucketize(rows, 'goal'),
            'diet_type': _bucketize(rows, 'diet_type'),
            'device': _bucketize(rows, 'device_type'),
            'email_capture_pct': round(email_captured * 100 / n, 1) if n else None,
        }
    return out


def fetch_feedback():
    """Counts computed in Python (not supa_count) so test entries can be excluded."""
    rows = supa_fetch('content_feedback',
                      select='request_text,email,submitted_at,status',
                      order='submitted_at.desc', limit=200)
    real = [r for r in rows if not is_test_feedback(r)]
    hidden = len(rows) - len(real)
    d7, d30 = iso_days_ago(7), iso_days_ago(30)
    return {
        'total': len(real),
        'new_7d': sum(1 for r in real if (r.get('submitted_at') or '') >= d7),
        'new_30d': sum(1 for r in real if (r.get('submitted_at') or '') >= d30),
        'unreviewed': sum(1 for r in real if r.get('status') == 'new'),
        'hidden_test': hidden,
        'recent': [{'text': (r.get('request_text') or '')[:280],
                    'email': r.get('email') or '(anonymous)',
                    'date': (r.get('submitted_at') or '')[:16],
                    'status': r.get('status')} for r in real[:20]],
    }


def fetch_mail():
    """Inbound mail: Resend receiving API (authoritative, has sender) with
    drip_events email.received as fallback. api.resend.com blocks urllib (CF 1010),
    so this uses `requests`."""
    out = {'inbound': [], 'source': None}
    resend_key = (SECRETS.get('resend') or {}).get('key', '')
    if resend_key:
        try:
            import requests
            resp = requests.get('https://api.resend.com/emails/receiving',
                                headers={'Authorization': f'Bearer {resend_key}'},
                                params={'limit': 25}, timeout=20)
            resp.raise_for_status()
            items = resp.json().get('data', [])
            out['inbound'] = [{
                'from': i.get('from'), 'to': ', '.join(i.get('to') or []),
                'subject': i.get('subject'), 'date': (i.get('created_at') or '')[:16],
            } for i in items]
            out['source'] = 'resend_api'
        except Exception as e:
            out['resend_error'] = str(e)[:200]
    if not out['inbound']:
        rows = supa_fetch('drip_events', select='email,subject,created_at,metadata',
                          filters='event_type=eq.email.received',
                          order='created_at.desc', limit=25)
        out['inbound'] = [{'from': (r.get('metadata') or {}).get('from', '(unknown sender)'),
                           'to': r.get('email'), 'subject': r.get('subject'),
                           'date': (r.get('created_at') or '')[:16]} for r in rows]
        out['source'] = out['source'] or 'drip_events'
    def is_report(m):
        blob = f"{m.get('from', '')} {m.get('to', '')} {m.get('subject', '')}".lower()
        return ('dmarc' in blob or 'report domain' in blob or 'postmaster' in blob
                or 'mailer-daemon' in blob)

    def is_internal(m):
        frm = (m.get('from') or '').lower()
        return (is_test_email(m.get('from')) or is_test_email(m.get('to'))
                or any(a in frm for a in OWN_SENDER_MARKERS))

    out['human'] = [m for m in out['inbound'] if not is_report(m) and not is_internal(m)]
    out['internal'] = [m for m in out['inbound'] if not is_report(m) and is_internal(m)]
    out['reports'] = [m for m in out['inbound'] if is_report(m)]
    d7 = iso_days_ago(7)
    out['inbound_7d'] = supa_count('drip_events', f'event_type=eq.email.received&created_at=gte.{d7}')
    out['human_7d'] = sum(1 for m in out['human'] if (m.get('date') or '') >= d7)
    return out


def fetch_email_engagement():
    d7, d8, d14 = iso_days_ago(7), iso_days_ago(8), iso_days_ago(14)
    out = {}
    for site in ['cw', 'kd']:
        s = {}
        for ev in ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']:
            cur = supa_count('drip_events', f'site=eq.{site}&event_type=eq.{ev}&created_at=gte.{d7}')
            prev = supa_count('drip_events',
                              f'site=eq.{site}&event_type=eq.{ev}&created_at=gte.{d14}&created_at=lt.{d8}')
            s[ev] = {'current_7d': cur, 'previous_7d': prev}
        sent = s['sent']['current_7d'] or 0
        delivered = s['delivered']['current_7d'] or 0
        s['open_rate_pct'] = round(s['opened']['current_7d'] * 100 / delivered, 1) if delivered else None
        s['click_rate_pct'] = round(s['clicked']['current_7d'] * 100 / delivered, 1) if delivered else None
        s['delivery_rate_pct'] = round(delivered * 100 / sent, 1) if sent else None
        out[site] = s
    return out


def fetch_revenue():
    stripe_key = (SECRETS.get('stripe') or {}).get('secret_key_live', '')
    if not stripe_key:
        return {'configured': False}
    now_ts = int(time.time())
    charges = http_json(
        f'https://api.stripe.com/v1/charges?limit=100&created[gte]={now_ts - 30 * 86400}',
        headers={'Authorization': f'Bearer {stripe_key}'}).get('data', [])
    ok = [c for c in charges if c.get('status') == 'succeeded']
    month_start = datetime(TODAY.year, TODAY.month, 1, tzinfo=timezone.utc).timestamp()

    def window(cs):
        gross = sum(c['amount'] for c in cs) / 100
        refunds = sum(c.get('amount_refunded', 0) for c in cs) / 100
        return {'gross': round(gross, 2), 'refunds': round(refunds, 2),
                'net': round(gross - refunds, 2), 'charges': len(cs)}

    mtd = [c for c in ok if c['created'] >= month_start]
    days_elapsed = TODAY.day
    days_in_month = (date(TODAY.year + (TODAY.month == 12), (TODAY.month % 12) + 1, 1)
                     - date(TODAY.year, TODAY.month, 1)).days
    mtd_net = window(mtd)['net']
    pace = round(mtd_net / days_elapsed * days_in_month, 2) if days_elapsed else 0

    # Attribute charges to products via their Checkout Session metadata. Charge
    # descriptions are empty for Checkout payments, which is how a KD protocol
    # sale (2026-07-31, $10.99) sat invisible in every report (bead d0r2):
    # assessment_session_id = CW calculator report, items / kd_ session token =
    # KD protocol, shop_product = shop item.
    pi_label = {}
    try:
        sessions = http_json(
            f'https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]={now_ts - 30 * 86400}',
            headers={'Authorization': f'Bearer {stripe_key}'}).get('data', [])
        for s in sessions:
            md = s.get('metadata') or {}
            if md.get('assessment_session_id'):
                label = 'CW calculator report'
            elif md.get('items') or str(md.get('session_token', '')).startswith('kd_'):
                label = f"KD {md.get('items') or 'protocol'}"
            elif md.get('shop_product'):
                label = f"{(md.get('site') or 'cw').upper()} shop: {md['shop_product']}"
            else:
                label = None
            if s.get('payment_intent') and label:
                pi_label[s['payment_intent']] = label
    except Exception as e:
        print(f'  (checkout-session attribution unavailable: {e})')

    def charge_label(c):
        return pi_label.get(c.get('payment_intent')) or (c.get('description') or c['id'])[:60]

    by_product = {}
    for c in ok:
        lbl = pi_label.get(c.get('payment_intent')) or c.get('description') or 'unattributed'
        by_product[lbl] = round(by_product.get(lbl, 0) + (c['amount'] - c.get('amount_refunded', 0)) / 100, 2)

    today_start = datetime(TODAY.year, TODAY.month, TODAY.day, tzinfo=timezone.utc).timestamp()
    return {
        'configured': True,
        'yesterday': window([c for c in ok
                             if today_start - 86400 <= c['created'] < today_start]),
        'last_7d': window([c for c in ok if c['created'] >= now_ts - 7 * 86400]),
        'last_30d': window(ok),
        'mtd': window(mtd),
        'days_left_in_month': days_in_month - days_elapsed,
        'month_pace': pace,
        'target': NET_TARGET_MONTHLY,
        'by_product_30d': by_product,
        'recent': [{'desc': charge_label(c),
                    'amount': round(c['amount'] / 100, 2),
                    'date': datetime.fromtimestamp(c['created']).strftime('%Y-%m-%d'),
                    'refunded': bool(c.get('refunded'))} for c in ok[:10]],
    }


# ── Insights (rule-based; always runs) ───────────────────────────────

def fetch_etsy():
    """Read the local Etsy daily-snapshot log (reports/etsy-snapshots/snapshots.jsonl,
    written by the etsy-daily-snapshot task). Intentionally NO live Etsy call — reading
    the file avoids sharing/rotating the Etsy OAuth token with the snapshot task."""
    path = os.path.join(PROJECT_ROOT, 'reports', 'etsy-snapshots', 'snapshots.jsonl')
    if not os.path.exists(path):
        return {'absent': True}
    snaps = []
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    snaps.append(json.loads(line))
    except Exception as ex:
        return {'error': str(ex)}
    if not snaps:
        return {'absent': True}
    latest = snaps[-1]
    lt = latest.get('ts', 0)
    older = [s for s in snaps[:-1] if lt - s.get('ts', 0) >= 6 * 86400]
    prior = older[-1] if older else (snaps[0] if len(snaps) > 1 else None)
    shop = latest.get('shop', {})
    listings = latest.get('listings', [])

    def delta(key):
        if not prior:
            return None
        pv, cv = prior.get('shop', {}).get(key), shop.get(key)
        return (cv - pv) if (pv is not None and cv is not None) else None

    # Day-over-day: latest snapshot vs the one before it (snapshots are daily).
    prev = snaps[-2] if len(snaps) > 1 else None
    yesterday = None
    if prev:
        pv = sum(l.get('views', 0) for l in prev.get('listings', []))
        cv = sum(l.get('views', 0) for l in listings)
        ps = prev.get('shop', {}).get('sales_lifetime')
        cs = shop.get('sales_lifetime')
        yesterday = {'since': prev.get('date'), 'views_delta': cv - pv,
                     'sales_delta': (cs - ps) if (ps is not None and cs is not None) else None}

    ranked = sorted(listings, key=lambda l: (l.get('units_90d', 0), l.get('views', 0)), reverse=True)
    top = [{'title': l.get('title', '')[:40], 'units': l.get('units_90d', 0),
            'views': l.get('views', 0),
            'proxy': (l.get('units_90d', 0) / l['views'] * 100) if l.get('views') else 0}
           for l in ranked[:6]]
    return {
        'date': latest.get('date'),
        'reviews': shop.get('reviews'), 'review_avg': shop.get('review_avg'),
        'sales_lifetime': shop.get('sales_lifetime'), 'active_listings': shop.get('active_listings'),
        'total_views': sum(l.get('views', 0) for l in listings),
        'reviews_delta': delta('reviews'), 'sales_delta': delta('sales_lifetime'),
        'snapshots': len(snaps), 'baseline_date': (prior or latest).get('date'),
        'yesterday': yesterday,
        'top': top,
    }


GITHUB_REPO = 'MikeBrew123/carnivore-weekly'
# workflow file -> (label, max age in days before it counts as stale; None = event-driven)
HEALTH_WORKFLOWS = {
    'daily-publish.yml': ('Daily publish', 2),
    'weekly-update.yml': ('Weekly update + newsletter', 8),
    'dashboard-update.yml': ('Dashboard report', 2),
    'deploy.yml': ('Site deploy', None),
}


def fetch_automation_health():
    """Latest completed run per key GitHub workflow. The repo is public so
    unauthenticated API calls work in CI; GITHUB_TOKEN is used when present.
    Catches the silent-failure class (poster stops, publish stalls) that has
    bitten before without any visible alarm."""
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'command-center'}
    tok = os.environ.get('GITHUB_TOKEN', '')
    if tok:
        headers['Authorization'] = f'Bearer {tok}'
    out = {'workflows': []}
    for wf, (label, max_age) in HEALTH_WORKFLOWS.items():
        try:
            runs = http_json(
                f'https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/{wf}/runs'
                f'?per_page=1&status=completed', headers=headers).get('workflow_runs', [])
            if not runs:
                out['workflows'].append({'label': label, 'state': 'never-ran'})
                continue
            r = runs[0]
            ran = (r.get('run_started_at') or r.get('updated_at') or '')
            days = (TODAY - date.fromisoformat(ran[:10])).days if ran else None
            state = r.get('conclusion') or 'unknown'
            if state == 'success' and max_age is not None and days is not None and days > max_age:
                state = 'stale'
            out['workflows'].append({'label': label, 'state': state,
                                     'ran': ran[:16].replace('T', ' '), 'days_ago': days})
        except Exception as e:
            out['workflows'].append({'label': label, 'state': 'api-error', 'error': str(e)[:80]})
    return out


def fetch_queues():
    """Content queue depths from repo files — a drained queue is the classic
    silent failure here (the Pinterest queue once sat at 0 for days unnoticed)."""
    out = {}
    try:
        with open(os.path.join(PROJECT_ROOT, 'data', 'blog_posts.json')) as fh:
            bp = json.load(fh)
        posts = bp.get('blog_posts', bp) if isinstance(bp, dict) else bp
        for site in ('cw', 'kd'):
            sp = [p for p in posts if p.get('site', 'cw') == site]
            pub = sorted(p.get('publish_date', '') for p in sp
                         if (p.get('status') == 'published' or p.get('published'))
                         and p.get('publish_date', '') <= TODAY.isoformat())
            out[site] = {'ready': sum(1 for p in sp if p.get('status') == 'ready'),
                         'last_published': pub[-1] if pub else None}
    except Exception as e:
        out['error'] = str(e)[:200]
    try:
        with open(os.path.join(PROJECT_ROOT, 'ketodial', 'marketing',
                               'pinterest-pin-queue.json')) as fh:
            pins = json.load(fh).get('pins', [])
        out['pinterest'] = {'unposted': sum(1 for p in pins if not p.get('posted')),
                            'total': len(pins)}
    except Exception as e:
        out['pinterest'] = {'error': str(e)[:200]}
    return out


def fetch_yesterday():
    """Small counts that genuinely change day to day, unlike the week-over-week
    blocks — these keep the daily email different every morning."""
    y, t = iso_days_ago(1), TODAY.isoformat()
    day = f'created_at=gte.{y}&created_at=lt.{t}'
    out = {'date': y}
    for label, src in [('cw', 'cw'), ('kd', 'ketodial')]:
        base = f'source=eq.{src}&{day}&{CALC_TEST_FILTER}'
        out[f'calc_sessions_{label}'] = supa_count('calculator_sessions_v2', base)
        out[f'calc_emails_{label}'] = supa_count('calculator_sessions_v2',
                                                 f'{base}&email=not.is.null')
    for site in ('cw', 'kd'):
        s = f'site=eq.{site}&{SUBSCRIBER_TEST_FILTER}'
        out[f'newsletter_signups_{site}'] = supa_count('newsletter_subscribers', f'{s}&{day}')
        out[f'drip_signups_{site}'] = supa_count(
            'drip_subscribers', f'{s}&subscribed_at=gte.{y}&subscribed_at=lt.{t}')
    return out


def load_open_decisions():
    """dashboard/open-decisions.json — decisions waiting on Brew. Sessions add
    {title, opened} when one is raised and delete it when decided; the email
    nudges once a week (Monday) with the oldest."""
    try:
        with open(os.path.join(SCRIPT_DIR, 'open-decisions.json')) as fh:
            decisions = json.load(fh).get('decisions', [])
    except Exception:
        return {'decisions': [], 'oldest': None}
    for item in decisions:
        try:
            item['age_days'] = (TODAY - date.fromisoformat(item['opened'])).days
        except Exception:
            item['age_days'] = None
    aged = [i for i in decisions if i.get('age_days') is not None]
    oldest = max(aged, key=lambda i: i['age_days']) if aged else None
    return {'decisions': decisions, 'oldest': oldest}


def _wow(block, key='sessions'):
    w = (block or {}).get('week', {}).get(key, {})
    return w.get('current', 0), w.get('previous', 0), w.get('change_pct')


def build_insights(d):
    """Deterministic watch-list. Severities: good / info / watch / alert."""
    ins = []

    def add(sev, text):
        ins.append({'severity': sev, 'text': text})

    for site, label in [('cw', 'Carnivore Weekly'), ('kd', 'KetoDial')]:
        t = d['traffic'].get(site)
        if not t or t.get('error'):
            add('watch', f'{label} traffic data unavailable this run — GA4 fetch failed.')
            continue

        # Bot-resistant trend read (bead yb7q). Raw GA4 sessions produced both the
        # phantom "checkout surge" and the phantom "43% crash" of Jul 2026 (bot
        # burst + utm session-splitting). Trend numbers exclude flagged spike
        # days, and a GA4-only drop can no longer escalate past 'watch' unless
        # Google clicks or calculator sessions corroborate it.
        med = t.get('daily_median_28d', 0)
        for sd in t.get('spike_days', []):
            add('watch', f'{label}: {sd["date"]} spiked to {sd["sessions"]} sessions '
                         f'({sd["users"]} users) vs a {med}/day 28d median — matches the '
                         f'direct/desktop crawler burst; excluded from trend numbers below.')

        cur, prev, chg = _wow(t)
        ex = t.get('week_ex_spike') or {}
        use_chg = ex.get('change_pct', chg)
        use_cur = ex.get('current', cur)
        use_prev = ex.get('previous', prev)
        excluded = ex.get('excluded') or []
        suffix = f' (excluding {len(excluded)} spike day(s))' if excluded else ''

        gsc_wk = d['search'].get(site) or {}
        gsc_chg = pct_change(gsc_wk.get('current', {}).get('clicks', 0),
                             gsc_wk.get('previous', {}).get('clicks', 0)) if gsc_wk.get('current') else None
        calc_chg = ((d.get('funnels') or {}).get(f'calculator_{site}') or {}).get('week', {}).get('change_pct')
        corroborated = (gsc_chg is not None and gsc_chg <= -25) or (calc_chg is not None and calc_chg <= -30)

        if use_chg is not None:
            if use_chg <= -30 and corroborated:
                add('alert', f'{label} sessions dropped {abs(use_chg):.0f}% week-over-week '
                             f'({use_prev:.0f} → {use_cur:.0f}){suffix}, corroborated by '
                             f'Google clicks/calculator sessions. Check GSC indexing and recent deploys.')
            elif use_chg <= -30:
                add('watch', f'{label} GA4 sessions down {abs(use_chg):.0f}% WoW '
                             f'({use_prev:.0f} → {use_cur:.0f}){suffix}, but Google clicks and '
                             f'calculator sessions are steady — likely measurement noise, not lost readers.')
            elif use_chg <= -15:
                add('watch', f'{label} sessions down {abs(use_chg):.0f}% vs last week '
                             f'({use_prev:.0f} → {use_cur:.0f}){suffix}.')
            elif use_chg >= 15:
                add('good', f'{label} sessions up {use_chg:.0f}% week-over-week '
                            f'({use_prev:.0f} → {use_cur:.0f}){suffix}.')

    # Calculator sessions are the bot-resistant demand metric (server-side rows,
    # test accounts excluded) — they get their own alert tier.
    for site, label in [('cw', 'CW'), ('kd', 'KD')]:
        wk = ((d.get('funnels') or {}).get(f'calculator_{site}') or {}).get('week') or {}
        c, p, chg = wk.get('current', 0), wk.get('previous', 0), wk.get('change_pct')
        if chg is None or (c + p) < 10:
            continue  # too few sessions for a percentage to mean anything
        if chg <= -40:
            add('alert', f'{label} calculator sessions dropped {abs(chg):.0f}% WoW ({p} → {c}) — '
                         f'this metric is bot-resistant, so treat as a real demand drop.')
        elif chg >= 40:
            add('good', f'{label} calculator sessions up {chg:.0f}% WoW ({p} → {c}).')

    # Where readers actually are. Drives the USD-pricing and affiliate-shipping calls,
    # and separates real audience from crawler traffic inflating the totals.
    for site, label in [('cw', 'Carnivore Weekly'), ('kd', 'KetoDial')]:
        t = d['traffic'].get(site)
        if not t or t.get('error'):
            continue
        geo = t.get('geo_90d') or []
        geo_total = sum(g['sessions'] for g in geo)
        if geo_total < 100:
            continue  # too little data over 90d for a country split to mean anything
        ca_pct = sum(g['sessions'] for g in geo if g['country'] == 'Canada') / geo_total * 100
        if ca_pct >= 15:
            add('info', f'{label}: Canada is {ca_pct:.0f}% of sessions over 90d. Affiliate offers '
                        f'that do not ship to Canada (ButcherBox) dead-end that share of readers.')
        for g in geo:
            if g['country'] in ('United States', 'Canada') or g['users'] < 50:
                continue
            share = g['sessions'] / geo_total * 100
            if share >= 10 and g['sessions'] <= g['users'] * 1.1:
                add('watch', f'{label}: {g["country"]} is {share:.0f}% of 90d sessions '
                             f'({g["sessions"]} sessions from {g["users"]} users, about one visit each). '
                             f'That is the crawler signature, not readers, so treat totals as inflated.')

    for site, label in [('cw', 'CW'), ('kd', 'KD')]:
        g = d['search'].get(site)
        if not g or g.get('error'):
            continue
        c, p = g['current'], g['previous']
        chg = pct_change(c['clicks'], p['clicks'])
        # Clicks are bot-resistant, so a big drop here is a real alert (window
        # already lags 2 days for GSC's late-arriving data).
        if chg is not None and chg <= -40 and p['clicks'] >= 25:
            add('alert', f'{label} Google clicks down {abs(chg):.0f}% ({p["clicks"]} → {c["clicks"]}) — '
                         f'bot-resistant metric, treat as real. Check GSC indexing and recent deploys.')
        elif chg is not None and chg <= -25:
            add('watch', f'{label} Google clicks down {abs(chg):.0f}% ({p["clicks"]} → {c["clicks"]}).')
        elif chg is not None and chg >= 25:
            add('good', f'{label} Google clicks up {chg:.0f}% ({p["clicks"]} → {c["clicks"]}).')
        if p['position'] and c['position'] - p['position'] >= 2:
            add('watch', f'{label} average Google position slipped from {p["position"]} to {c["position"]}.')

    bing = d['search'].get('bing_cw', {})
    if not bing.get('configured'):
        ga4_b = bing.get('ga4_sessions_7d')
        suffix = (f' Meanwhile GA4 shows {ga4_b} Bing session(s) on CW this week.'
                  if ga4_b is not None else '')
        add('info', 'Bing Webmaster API not connected — no key exists on this machine; Brew must '
                    'generate one (Bing Webmaster Tools → Settings → API access) and save it as '
                    f'bing.api_key in secrets/api-keys.json.{suffix}')
    elif not bing.get('error'):
        b_cur, b_prev = bing.get('clicks_7d', 0), bing.get('clicks_prev_7d', 0)
        chg = pct_change(b_cur, b_prev)
        g_clicks = (d['search'].get('cw') or {}).get('current', {}).get('clicks', 0)
        if g_clicks and b_cur >= g_clicks * 0.8:
            add('info', f'Bing is a real channel for CW: {b_cur} clicks this week vs {g_clicks} '
                        f'from Google. Keep Bing Webmaster sitemaps/indexing healthy — do not '
                        f'optimize for Google alone.')
        if chg is not None and chg <= -30:
            add('watch', f'CW Bing clicks dropped {abs(chg):.0f}% ({b_prev} → {b_cur}).')
        elif chg is not None and chg >= 30 and b_cur >= 20:
            add('good', f'CW Bing clicks up {chg:.0f}% week-over-week ({b_prev} → {b_cur}).')

    f = d.get('funnels', {})
    calc = f.get('calculator_cw', {})
    if calc and not calc.get('error'):
        stages = {s['name']: s['count'] for s in calc['stages']}
        started = stages.get('Sessions started', 0)
        if started:
            cap = stages.get('Email captured', 0) * 100 / started
            if cap < 50:
                add('watch', f'CW calculator email capture is {cap:.0f}% of sessions — '
                             f'below expectations since the mandatory email step (launched Jun 29).')
        wk = calc.get('week', {})
        if wk.get('change_pct') is not None and wk['change_pct'] <= -30:
            add('watch', f'CW calculator sessions fell {abs(wk["change_pct"]):.0f}% this week '
                         f'({wk["previous"]} → {wk["current"]}).')

    for dsite, dlabel in [('cw', 'CW'), ('kd', 'KD')]:
        drip = f.get(f'drip_{dsite}', {})
        if drip and not drip.get('error') and drip.get('active', 0) > 0 and drip.get('last_send'):
            try:
                last = datetime.fromisoformat(drip['last_send'].replace('Z', '+00:00'))
                hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600
                if hours > 48:
                    add('alert', f'{dlabel} drip pipeline looks stalled — {drip["active"]} active '
                                 f'subscribers but no send in {hours / 24:.1f} days. '
                                 f'Check daily-publish.yml / send_drip.py --site {dsite}.')
            except Exception:
                pass

    for site, label in [('cw', 'CW'), ('kd', 'KD')]:
        nl = f.get(f'newsletter_{site}', {})
        if nl and not nl.get('error'):
            if nl.get('new_7d', 0) == 0:
                add('watch', f'{label} newsletter gained zero subscribers in the last 7 days.')
            if nl.get('unsub_7d', 0) >= 3:
                add('watch', f'{label} newsletter had {nl["unsub_7d"]} unsubscribes this week.')

    coach = f.get('coach', {})
    if coach and coach.get('waitlist_total', 0) >= 5 and coach.get('members_active', 0) == 0:
        add('alert', f'Coach waitlist has {coach["waitlist_total"]} signups — that hits the 5+ gate. '
                     f'Time to decide on launching the 12-week program.')

    demo = d.get('demographics', {}).get('cw', {})
    if demo and not demo.get('error') and demo.get('share_45_plus') is not None:
        base = CW_DEMO_BASELINE['45_plus_share']
        if abs(demo['share_45_plus'] - base) >= 10:
            add('info', f'CW calculator age mix shifted: {demo["share_45_plus"]:.0f}% are 45+ '
                        f'(baseline {base}%). Content tone may need a look.')

    fb = d.get('feedback', {})
    if fb and not fb.get('error'):
        if fb.get('unreviewed', 0) > 0:
            add('info', f'{fb["unreviewed"]} feedback submission(s) waiting for review.')
        if fb.get('new_7d', 0) > 0:
            add('good', f'{fb["new_7d"]} new feedback submission(s) this week — readers are talking.')

    mail = d.get('mail', {})
    if mail and mail.get('human_7d', 0) > 0:
        add('info', f'{mail["human_7d"]} real inbound email(s) to @carnivoreweekly.com this week '
                    f'(automated DMARC/postmaster reports excluded) — listed below in Mail.')

    eng = d.get('email_engagement', {})
    if eng and not eng.get('error'):
        if eng.get('complained', {}).get('current_7d', 0) > 0:
            add('alert', f'{eng["complained"]["current_7d"]} spam complaint(s) this week — '
                         f'protect sender reputation, review list quality.')
        if eng.get('bounced', {}).get('current_7d', 0) >= 3:
            add('watch', f'{eng["bounced"]["current_7d"]} email bounces this week.')
        if eng.get('open_rate_pct') is not None and eng['open_rate_pct'] < 25:
            add('watch', f'Email open rate is {eng["open_rate_pct"]}% (7d) — below the ~40% norm for this list.')

    rev = d.get('revenue', {})
    if rev.get('configured') and not rev.get('error'):
        pace = rev.get('month_pace', 0)
        if pace >= NET_TARGET_MONTHLY:
            add('good', f'Revenue pacing at ${pace:.0f} gross this month — on track vs the $1k net target '
                        f'(remember: target is NET of costs).')
        else:
            add('info', f'Revenue pacing ${pace:.0f} gross for the month vs the $1k/mo net target. '
                        f'MTD net so far: ${rev["mtd"]["net"]:.2f}.')

    q = d.get('queues') or {}
    for site, label in [('cw', 'CW'), ('kd', 'KD')]:
        s = q.get(site) or {}
        if s and s.get('ready') == 0:
            add('alert', f'{label} blog queue is EMPTY — publishing stalls unless the next '
                         f'generation run refills it.')
        elif s and s.get('ready', 99) <= 2:
            add('watch', f'{label} blog queue is down to {s["ready"]} ready post(s).')
    pin = q.get('pinterest') or {}
    if pin.get('unposted') == 0 and 'error' not in pin:
        add('watch', 'Pinterest pin queue is empty — the daily poster has nothing to post.')

    for w in (d.get('automation') or {}).get('workflows', []):
        if w.get('state') == 'failure':
            add('alert', f'GitHub workflow "{w["label"]}" FAILED its last run ({w.get("ran", "?")}).')
        elif w.get('state') == 'stale':
            add('alert', f'GitHub workflow "{w["label"]}" hasn\'t run in {w.get("days_ago", "?")} '
                         f'days — silent stall, check the Actions tab.')

    order = {'alert': 0, 'watch': 1, 'good': 2, 'info': 3}
    ins.sort(key=lambda i: order.get(i['severity'], 9))
    return ins


# ── Optional model narrative (small model keeps this fresh) ──────────

# The weekly data moves too slowly for a full review to read differently each
# morning, so each weekday deep-dives one area; Sunday keeps the week-in-review.
DAILY_FOCUS = {
    0: ('Search & rankings',
        'Google and Bing — positions, clicks, impressions, which queries moved and why'),
    1: ('Traffic quality',
        'bounce rate, engaged sessions, pages per session — are the new readers the right readers'),
    2: ('Email & newsletter',
        'opens, clicks, bounces, inbound mail — is the list getting healthier or tired'),
    3: ('Funnels & conversion',
        'calculator -> email capture -> completion -> paid, plus drip and coach — where readers drop off'),
    4: ('Revenue & the $1k target',
        'Stripe and Etsy against the $1k/month net goal — what is actually selling'),
    5: ('Audience & feedback',
        'calculator demographics vs baseline and reader feedback — who is showing up and what they say'),
}


def daily_focus():
    return DAILY_FOCUS.get(TODAY.weekday(), ('Week in review', None))


NARRATIVE_MODEL = 'claude-sonnet-5'
NARRATIVE_TABLE = 'command_center_narratives'


def fetch_narrative_history(limit=21):
    """Past Daily Focus narratives (Supabase), newest first. [] on any failure."""
    try:
        # Exclude today's own row so a same-day re-run reads like the first run.
        return supa_fetch(NARRATIVE_TABLE, select='run_date,focus,narrative',
                          filters=f'run_date=lt.{TODAY.isoformat()}',
                          limit=limit, order='run_date.desc') or []
    except Exception as e:
        print(f'  narrative history unavailable: {e}')
        return []


def save_narrative(narrative, focus, model):
    """Upsert today's narrative so future runs remember what was already said."""
    try:
        import requests
        headers = dict(supa_headers())
        headers['Prefer'] = 'resolution=merge-duplicates'
        resp = requests.post(
            f'https://{SUPABASE_PROJECT_ID}.supabase.co/rest/v1/{NARRATIVE_TABLE}'
            '?on_conflict=run_date',
            headers=headers,
            json={'run_date': TODAY.isoformat(), 'focus': daily_focus()[0],
                  'narrative': narrative, 'model': model},
            timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f'  narrative history save failed: {e}')


def model_narrative(data, model=NARRATIVE_MODEL):
    api_key = os.environ.get('ANTHROPIC_API_KEY') or (SECRETS.get('anthropic') or {}).get('key', '')
    if not api_key:
        return None
    digest = {
        'traffic_week': {s: data['traffic'].get(s, {}).get('week') for s in ('cw', 'kd')},
        'search_google': {s: {'current': data['search'].get(s, {}).get('current'),
                              'previous': data['search'].get(s, {}).get('previous')} for s in ('cw', 'kd')},
        'search_bing': {s: {k: v for k, v in (data['search'].get(f'bing_{s}') or {}).items()
                            if k != 'top_queries'} for s in ('cw', 'kd')},
        'funnels': data.get('funnels'),
        'demographics_cw': {k: v for k, v in (data.get('demographics', {}).get('cw') or {}).items()
                            if k in ('sessions', 'share_45_plus', 'email_capture_pct', 'sex', 'goal')},
        'demographics_kd': {k: v for k, v in (data.get('demographics', {}).get('kd') or {}).items()
                            if k in ('sessions', 'share_45_plus', 'email_capture_pct', 'sex', 'goal')},
        'feedback': {k: v for k, v in (data.get('feedback') or {}).items() if k != 'recent'},
        'inbound_mail_7d': (data.get('mail') or {}).get('inbound_7d'),
        'email_engagement': data.get('email_engagement'),
        'revenue': {k: v for k, v in (data.get('revenue') or {}).items() if k != 'recent'},
        'yesterday': data.get('yesterday'),
        'content_queues': data.get('queues'),
        'automation_health': data.get('automation'),
        'rule_based_flags': data.get('insights'),
    }
    focus_name, focus_scope = daily_focus()
    if focus_scope:
        angle = (
            f"Today's focus is {focus_name}: {focus_scope}.\n"
            "Open with ONE sentence on how the week is going overall, then spend everything "
            "else on today's focus area only: what its numbers say, the most likely reason, "
            "and 1-2 concrete things worth doing or watching there. Do not tour the other "
            "areas — each gets its own day this week."
        )
    else:
        angle = (
            "It's the weekly review day. Write 2-3 short paragraphs: (1) how the week went "
            "overall, (2) what changed or stands out, (3) the 1-3 things worth watching or "
            "acting on."
        )

    # Memory: what past runs already told him. Without this the same slow-moving
    # data produces the same review every week (the exact problem Brew flagged
    # 2026-08-24) — the model must know what's already been said to say only
    # what's new.
    history = fetch_narrative_history()
    history_block = ''
    if history:
        parts = []
        for h in history:
            tag = f"[{h.get('run_date')} · {h.get('focus') or 'general'}]"
            parts.append(f"{tag}\n{(h.get('narrative') or '').strip()}")
        history_block = (
            "\n\nYOUR PREVIOUS REVIEWS (newest first — Brew has read all of these):\n"
            + "\n---\n".join(parts) + "\n\n"
            "MEMORY RULES (these outrank everything below):\n"
            "1. Say only what is NEW since the last review of today's focus area. Compare "
            "today's numbers against what that review described and lead with what changed.\n"
            "2. If nothing in the focus area materially changed since it was last covered, say "
            "so in 2-3 sentences and stop. A short honest 'no real change since last "
            f"{focus_name} review' is a SUCCESS, not a failure — never pad it.\n"
            "3. Never repeat a recommendation that appears in any review above unless you name "
            "what changed since it was given (e.g. 'suggested X on the 17th; clicks still flat, "
            "so either do it or drop it'). If a repeated suggestion was clearly never acted on "
            "twice, say that once and let it go.\n"
            "4. Standing facts he already knows (Bing rivals Google on CW, China crawler "
            "inflation, revenue far below the $1k pace, KD is tiny) get at most a clause, and "
            "only if today's point depends on them. Never re-explain them.\n"
            "5. If a previous review said 'watch X this week', today is the day to close that "
            "loop: report what X did.\n"
        )

    prompt = (
        "You are writing the morning plain-English review for Brew, the solo operator of "
        "Carnivore Weekly (CW) and KetoDial (KD). He hates fluff and wants to know what's "
        "actually happening and what to look out for. Business context: goal is $1k/month NET "
        "profit; CW calculator audience baseline is ~66% aged 45+, ~53% female, ~84% weight loss."
        f"{history_block}\n"
        f"Today's data (JSON):\n{json.dumps(digest, default=str)}\n\n"
        "Note: in search data, LOWER average position is better (position 1 = top of Google). "
        "Sanity-check metrics before citing them: an open rate over 100% means multiple opens "
        "per send, not a healthy list signal — flag oddities instead of quoting them straight.\n"
        f"{angle}\n"
        "Plain prose only — no markdown, no headers, no bullet lists, no hype, no restating raw "
        "numbers he can see in the tables — interpret them. Under 220 words, shorter when "
        "little changed."
    )
    try:
        import requests
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'x-api-key': api_key, 'anthropic-version': '2023-06-01',
                     'content-type': 'application/json'},
            json={'model': model, 'max_tokens': 700,
                  'messages': [{'role': 'user', 'content': prompt}]},
            timeout=120)
        resp.raise_for_status()
        parts = resp.json().get('content', [])
        text = ' '.join(p.get('text', '') for p in parts if p.get('type') == 'text').strip()
        lines = [ln for ln in text.splitlines() if not ln.strip().startswith('#')]
        return '\n'.join(lines).replace('**', '').strip() or None
    except Exception as e:
        print(f'  Model narrative skipped: {e}')
        return None


# ── Collect everything ───────────────────────────────────────────────

def guarded(name, fn, *args):
    try:
        return fn(*args)
    except Exception as e:
        print(f'  {name} failed: {e}')
        return {'error': str(e)[:200]}


def collect(use_model=True):
    print(f'Command Center — collecting data at {NOW_STR}')
    data = {'meta': {'generated_at': NOW_STR, 'generated_date': str(TODAY), 'version': 1}}

    print('  GA4 traffic...')
    data['traffic'] = {'cw': guarded('GA4 CW', fetch_traffic, CW_GA4),
                       'kd': guarded('GA4 KD', fetch_traffic, KD_GA4)}
    print('  Search Console...')
    data['search'] = {'cw': guarded('GSC CW', fetch_gsc, GSC_CW),
                      'kd': guarded('GSC KD', fetch_gsc, GSC_KD),
                      'bing_cw': guarded('Bing CW', fetch_bing, BING_CW, CW_GA4),
                      'bing_kd': guarded('Bing KD', fetch_bing, BING_KD, KD_GA4)}
    print('  Funnels...')
    data['funnels'] = guarded('Funnels', fetch_funnels)
    print('  Demographics...')
    data['demographics'] = guarded('Demographics', fetch_demographics)
    print('  Feedback...')
    data['feedback'] = guarded('Feedback', fetch_feedback)
    print('  Mail...')
    data['mail'] = guarded('Mail', fetch_mail)
    print('  Email engagement...')
    data['email_engagement'] = guarded('Engagement', fetch_email_engagement)
    print('  Revenue...')
    data['revenue'] = guarded('Revenue', fetch_revenue)
    print('  Etsy snapshot...')
    data['etsy'] = guarded('Etsy', fetch_etsy)
    print('  Queues...')
    data['queues'] = guarded('Queues', fetch_queues)
    print('  Automation health...')
    data['automation'] = guarded('Automation', fetch_automation_health)
    print('  Yesterday...')
    data['yesterday'] = guarded('Yesterday', fetch_yesterday)
    data['decisions'] = load_open_decisions()

    data['insights'] = build_insights(data)
    data['analysis'] = {'narrative': None, 'generated_by': 'rules', 'focus': daily_focus()[0]}
    if use_model:
        print('  Plain-language review (model)...')
        text = model_narrative(data)
        if text:
            data['analysis'] = {'narrative': text, 'generated_by': NARRATIVE_MODEL,
                                'focus': daily_focus()[0]}
            save_narrative(text, daily_focus()[0], NARRATIVE_MODEL)
    return data


# ── HTML rendering ───────────────────────────────────────────────────

def esc(s):
    return (str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            if s is not None else '')


def trend_html(chg, invert=False):
    if chg is None:
        return '<span class="trend flat">—</span>'
    shown = -chg if invert else chg
    cls = 'up' if shown > 3 else ('down' if shown < -3 else 'flat')
    arrow_ch = '▲' if chg > 0 else ('▼' if chg < 0 else '—')
    return f'<span class="trend {cls}">{arrow_ch} {abs(chg):.0f}%</span>'


def sparkline(daily, color):
    if not daily:
        return ''
    vals = [d['sessions'] for d in daily]
    mx = max(vals) or 1
    w, h = 260, 48
    step = w / max(len(vals) - 1, 1)
    pts = ' '.join(f'{i * step:.1f},{h - (v / mx) * (h - 6) - 3:.1f}' for i, v in enumerate(vals))
    return (f'<svg class="spark" viewBox="0 0 {w} {h}" preserveAspectRatio="none">'
            f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2"/></svg>')


def err_note(block, label):
    if isinstance(block, dict) and block.get('error'):
        return f'<p class="err">⚠️ {esc(label)} unavailable this run: {esc(block["error"])}</p>'
    return None


def funnel_html(f, accent):
    if not f or f.get('error'):
        return err_note(f, 'Funnel') or '<p class="muted">No data.</p>'
    stages = f['stages']
    # scale bars to the largest stage — stages aren't always monotonic
    # (email is captured at step 1, so it can exceed "Reached step 3")
    top = max(s['count'] for s in stages) or 1
    first = stages[0]['count'] or 1
    rows = []
    prev_count = None
    for s in stages:
        width = max(s['count'] * 100 / top, 1.5)
        of_top = s['count'] * 100 / first
        conv = f'{s["count"] * 100 / prev_count:.0f}% of prev' if prev_count else '100%'
        rows.append(
            f'<div class="fstage"><div class="frow"><span class="fname">{esc(s["name"])}</span>'
            f'<span class="fnum">{s["count"]:,} <span class="muted">({of_top:.0f}% · {conv})</span></span></div>'
            f'<div class="fbarwrap"><div class="fbar" style="width:{width:.1f}%;background:{accent}"></div></div></div>')
        prev_count = s['count'] if s['count'] else prev_count
    wk = f.get('week', {})
    wk_html = ''
    if wk:
        wk_html = (f'<p class="muted small">This week: {wk.get("current", 0)} sessions vs '
                   f'{wk.get("previous", 0)} last week {trend_html(wk.get("change_pct"))}</p>')
    return f'<div class="funnel">{"".join(rows)}</div>{wk_html}'


def bar_list(items, key='value', accent='#4ade80', max_items=6):
    if not items:
        return '<p class="muted">No data.</p>'
    # scale to the largest shown item — age buckets arrive in age order, not count order
    top = max(it['count'] for it in items[:max_items]) or 1
    out = []
    for it in items[:max_items]:
        w = max(it['count'] * 100 / top, 2)
        out.append(f'<div class="bl"><span class="bl-label">{esc(it[key])}</span>'
                   f'<span class="bl-bar"><i style="width:{w:.0f}%;background:{accent}"></i></span>'
                   f'<span class="bl-num">{it["count"]} ({it["pct"]}%)</span></div>')
    return ''.join(out)


def table(headers, rows):
    th = ''.join(f'<th>{esc(h)}</th>' for h in headers)
    trs = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows)
    return f'<table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>'


def traffic_card(label, t, accent):
    if not t or t.get('error'):
        return f'<div class="card"><h3>{esc(label)}</h3>{err_note(t, "GA4")}</div>'
    w = t['week']
    sess = w['sessions']
    active = t.get('active_now')
    active_html = (f'<span class="live">● {active} active now</span>' if active is not None else '')
    rows = ''
    for key, name in [('sessions', 'Sessions'), ('totalUsers', 'Users'), ('newUsers', 'New users'),
                      ('screenPageViews', 'Pageviews'), ('engagedSessions', 'Engaged')]:
        m = w[key]
        rows += (f'<tr><td>{name}</td><td>{m["current"]:.0f}</td><td class="muted">{m["previous"]:.0f}</td>'
                 f'<td>{trend_html(m["change_pct"])}</td></tr>')
    br = w['bounceRate']
    rows += (f'<tr><td>Bounce rate</td><td>{br["current"] * 100:.0f}%</td>'
             f'<td class="muted">{br["previous"] * 100:.0f}%</td>'
             f'<td>{trend_html(br["change_pct"], invert=True)}</td></tr>')
    today = t['today']
    src = ''.join(f'<div class="kv"><span>{esc(s["source"])}</span><b>{s["sessions"]}</b></div>'
                  for s in t['sources_7d'][:5])
    pages = ''.join(f'<div class="kv"><span>{esc(p["page"])}</span><b>{p["views"]}</b></div>'
                    for p in t['top_pages_7d'][:5])

    geo = t.get('geo_90d') or []
    geo_total = sum(g['sessions'] for g in geo)
    geo_line = ''
    if geo_total:
        def _share(name):
            return sum(g['sessions'] for g in geo if g['country'] == name) / geo_total * 100
        geo_line = (f'<p class="muted small">Last 90d: US {_share("United States"):.0f}% · '
                    f'Canada {_share("Canada"):.0f}% of {geo_total} sessions</p>')
    geo_rows = ''.join(
        f'<div class="kv"><span>{esc(g["country"])}</span>'
        f'<b>{g["sessions"]} <span class="muted">/ {g["users"]}u</span></b></div>'
        for g in geo[:10])
    geo_block = (f'<h4>Countries (90d, sessions / users)</h4>{geo_rows}' if geo_rows else '')
    return f'''<div class="card">
      <h3 style="border-color:{accent}">{esc(label)} {active_html}</h3>
      <div class="bignum">{sess["current"]:.0f} <span class="muted small">sessions / 7d</span> {trend_html(sess["change_pct"])}</div>
      {sparkline(t.get('daily', []), accent)}
      <p class="muted small">Today so far: {today["sessions"]} sessions · {today["users"]} users · {today["pageviews"]} pageviews</p>
      {geo_line}
      <table><thead><tr><th>Metric</th><th>7d</th><th>Prior</th><th></th></tr></thead><tbody>{rows}</tbody></table>
      <details><summary>Top sources, pages & countries</summary>
        <h4>Sources (7d)</h4>{src}<h4>Pages (7d)</h4>{pages}{geo_block}</details>
    </div>'''


def search_card(label, g, accent):
    if not g or g.get('error'):
        return f'<div class="card"><h3>{esc(label)}</h3>{err_note(g, "Search Console")}</div>'
    c, p = g['current'], g['previous']
    q_rows = [[esc(q['key']), q['clicks'], q['impressions'], f'{q["ctr"]}%', q['position']]
              for q in g.get('top_queries', [])[:8]]
    return f'''<div class="card">
      <h3 style="border-color:{accent}">{esc(label)} <span class="muted small">({esc(g["window"])})</span></h3>
      <div class="statrow">
        <div class="stat"><b>{c["clicks"]}</b><span>clicks</span>{trend_html(pct_change(c["clicks"], p["clicks"]))}</div>
        <div class="stat"><b>{c["impressions"]:,}</b><span>impressions</span>{trend_html(pct_change(c["impressions"], p["impressions"]))}</div>
        <div class="stat"><b>{c["ctr"]}%</b><span>CTR</span></div>
        <div class="stat"><b>{c["position"]}</b><span>avg pos</span>{trend_html(pct_change(c["position"], p["position"]), invert=True)}</div>
      </div>
      <details><summary>Top queries</summary>
      {table(['Query', 'Clicks', 'Impr', 'CTR', 'Pos'], q_rows)}</details>
    </div>'''


def bing_card(label, b):
    if not b:
        return ''
    if not b.get('configured'):
        stats = ''
        if b.get('ga4_sessions_7d') is not None:
            stats = (f'<div class="statrow"><div class="stat"><b>{b["ga4_sessions_7d"]}</b>'
                     f'<span>sessions 7d (GA4)</span>'
                     f'{trend_html(pct_change(b["ga4_sessions_7d"], b.get("ga4_sessions_prev_7d", 0)))}'
                     f'</div></div>')
        return (f'<div class="card"><h3>{esc(label)}</h3>{stats}'
                f'<p class="muted small">{esc(b.get("note", ""))}</p></div>')
    if b.get('error'):
        return f'<div class="card"><h3>{esc(label)}</h3>{err_note(b, "Bing")}</div>'
    return f'''<div class="card"><h3>{esc(label)}</h3>
      <div class="statrow">
        <div class="stat"><b>{b["clicks_7d"]}</b><span>clicks 7d</span>{trend_html(pct_change(b["clicks_7d"], b["clicks_prev_7d"]))}</div>
        <div class="stat"><b>{b["impressions_7d"]:,}</b><span>impressions 7d</span>{trend_html(pct_change(b["impressions_7d"], b["impressions_prev_7d"]))}</div>
      </div></div>'''


def demo_card(label, dm, accent):
    if not dm or dm.get('error'):
        return f'<div class="card"><h3>{esc(label)}</h3>{err_note(dm, "Demographics")}</div>'
    ages = bar_list(dm['age_buckets'], accent=accent, max_items=6) if dm.get('age_buckets') else ''
    return f'''<div class="card">
      <h3 style="border-color:{accent}">{esc(label)} <span class="muted small">({dm["sessions"]} sessions, 90d)</span></h3>
      <p class="small">Email capture: <b>{dm["email_capture_pct"] if dm["email_capture_pct"] is not None else "—"}%</b>
      &nbsp;·&nbsp; 45+: <b>{dm["share_45_plus"] if dm["share_45_plus"] is not None else "—"}%</b></p>
      <h4>Age</h4>{ages}
      <h4>Sex</h4>{bar_list(dm["sex"], accent=accent, max_items=4)}
      <h4>Goal</h4>{bar_list(dm["goal"], accent=accent, max_items=5)}
      <details><summary>Diet type & device</summary>
      <h4>Diet</h4>{bar_list(dm["diet_type"], accent=accent, max_items=5)}
      <h4>Device</h4>{bar_list(dm["device"], accent=accent, max_items=4)}</details>
    </div>'''


SEV_META = {'alert': ('🔴', 'Act on this'), 'watch': ('🟡', 'Keep an eye on'),
            'good': ('🟢', 'Going well'), 'info': ('🔵', 'Worth knowing')}


def etsy_delta(n):
    if n is None or n == 0:
        return ''
    cls = 'up' if n > 0 else 'down'
    return f' <span class="trend {cls}">{"+" if n > 0 else ""}{n}</span>'


def etsy_card(e):
    if not e or e.get('absent'):
        return ('<div class="card"><h3>Etsy — CarnivoreWeekly</h3>'
                '<p class="muted">No snapshot data on this run. The <code>etsy-daily-snapshot</code> task '
                'writes reports/etsy-snapshots/ on the Mac; this panel fills in where that log lives.</p></div>')
    if e.get('error'):
        return f'<div class="card"><h3>Etsy — CarnivoreWeekly</h3>{err_note(e, "Etsy") or ""}</div>'
    top_rows = [[esc(t['title']), t['units'], f"{t['views']:,}", f"{t['proxy']:.2f}%"] for t in e['top']]
    return f'''<div class="card"><h3 style="border-color:var(--green)">Etsy — CarnivoreWeekly <span class="muted small">(snapshot {esc(e['date'])})</span></h3>
      <div class="statrow wrap">
        <div class="stat"><b>{esc(e['reviews'])}</b><span>reviews</span>{etsy_delta(e['reviews_delta'])}</div>
        <div class="stat"><b>{esc(e['review_avg'])}</b><span>avg rating</span></div>
        <div class="stat"><b>{esc(e['sales_lifetime'])}</b><span>lifetime sales</span>{etsy_delta(e['sales_delta'])}</div>
        <div class="stat"><b>{esc(e['active_listings'])}</b><span>active listings</span></div>
        <div class="stat"><b>{e['total_views']:,}</b><span>total views</span></div>
      </div>
      <p class="muted small">B2 target: 10+ reviews by Sept 15 · {e['snapshots']} snapshot(s) since {esc(e['baseline_date'])}</p>
      <p class="muted small" style="margin-top:8px">Top listings by 90-day units. <b>proxy%</b> = units / lifetime views (a sell-through proxy, not true conversion):</p>
      {table(['Listing', 'units 90d', 'views', 'proxy%'], top_rows)}
    </div>'''


def render_html(d):
    ins_html = ''
    for i in d.get('insights', []):
        icon, _ = SEV_META.get(i['severity'], ('•', ''))
        ins_html += f'<li class="ins {i["severity"]}">{icon} {esc(i["text"])}</li>'

    # Daily Pulse — the strip of things that actually change every day
    STATE_DOT = {'success': ('var(--green)', 'ok'), 'failure': ('var(--red)', 'FAILED'),
                 'stale': ('var(--red)', 'stale'), 'never-ran': ('var(--muted)', 'never ran'),
                 'api-error': ('var(--amber)', 'api error'), 'unknown': ('var(--amber)', '?')}
    auto_html = ''
    for w in (d.get('automation') or {}).get('workflows', []):
        color, word = STATE_DOT.get(w.get('state'), ('var(--amber)', w.get('state', '?')))
        age = f' · {w["days_ago"]}d ago' if w.get('days_ago') is not None else ''
        auto_html += (f'<span class="pulse-item"><i style="background:{color}"></i>'
                      f'{esc(w["label"])} <span class="muted">({word}{age})</span></span>')

    q = d.get('queues') or {}
    queue_html = ''
    if q and not q.get('error'):
        parts = []
        for site, label in [('cw', 'CW posts'), ('kd', 'KD posts')]:
            s = q.get(site) or {}
            if s:
                warn = ' style="color:var(--red)"' if s.get('ready', 0) == 0 else ''
                parts.append(f'<span{warn}><b>{s.get("ready", "?")}</b> {label} ready'
                             f' <span class="muted">(last pub {esc(s.get("last_published") or "—")})</span></span>')
        pin = q.get('pinterest') or {}
        if 'unposted' in pin:
            warn = ' style="color:var(--red)"' if pin['unposted'] == 0 else ''
            parts.append(f'<span{warn}><b>{pin["unposted"]}</b> Pinterest pins queued</span>')
        queue_html = ' · '.join(parts)

    ydata = d.get('yesterday') or {}
    y_html = ''
    if ydata and not ydata.get('error'):
        rev_y = (d.get('revenue') or {}).get('yesterday') or {}
        etsy_y = (d.get('etsy') or {}).get('yesterday') or {}
        ystats = [
            (ydata.get('calc_sessions_cw', 0), 'CW calc sessions'),
            (ydata.get('calc_sessions_kd', 0), 'KD calc sessions'),
            (ydata.get('calc_emails_cw', 0) + ydata.get('calc_emails_kd', 0), 'emails captured'),
            (ydata.get('newsletter_signups_cw', 0) + ydata.get('newsletter_signups_kd', 0),
             'newsletter signups'),
            (ydata.get('drip_signups_cw', 0) + ydata.get('drip_signups_kd', 0), 'drip signups'),
        ]
        if rev_y:
            ystats.append((f'${rev_y.get("net", 0):.2f}', 'revenue'))
        if etsy_y and etsy_y.get('views_delta') is not None:
            ystats.append((f'{etsy_y["views_delta"]:+d}', 'Etsy views'))
        y_html = '<div class="statrow wrap">' + ''.join(
            f'<div class="stat"><b>{v}</b><span>{lbl}</span></div>' for v, lbl in ystats) + '</div>'

    dec = d.get('decisions') or {}
    dec_html = ''
    if dec.get('oldest'):
        o = dec['oldest']
        dec_html = (f'<p class="small muted">Oldest open decision: <b>{esc(o["title"])}</b> '
                    f'— waiting {o["age_days"]} days ({len(dec["decisions"])} open total)</p>')

    narrative = (d.get('analysis') or {}).get('narrative')
    gen_by = (d.get('analysis') or {}).get('generated_by', 'rules')
    focus = (d.get('analysis') or {}).get('focus')
    narrative_html = ''
    if narrative:
        focus_tag = f'<p class="focus-label">Daily focus · {esc(focus)}</p>' if focus else ''
        paras = ''.join(f'<p>{esc(p.strip())}</p>' for p in narrative.split('\n') if p.strip())
        narrative_html = f'<div class="narrative">{focus_tag}{paras}<p class="muted small">— written by {esc(gen_by)}</p></div>'

    f = d.get('funnels', {})
    coach = f.get('coach', {}) if not f.get('error') else {}
    drip_cw = f.get('drip_cw', {}) if not f.get('error') else {}
    drip_kd = f.get('drip_kd', {}) if not f.get('error') else {}
    nl_cw = f.get('newsletter_cw', {})
    nl_kd = f.get('newsletter_kd', {})

    fb = d.get('feedback', {})
    fb_recent = fb.get('recent', []) if not fb.get('error') else []
    # Open items get the table; completed/closed collapse so they stop
    # resurfacing every day after they've been handled.
    _fb_done = ('completed', 'done', 'closed', 'resolved')
    def _fb_row(r):
        return [esc(r['date']), esc(r['email']), esc(r['text']), esc(r['status'])]
    fb_open_rows = [_fb_row(r) for r in fb_recent
                    if (r.get('status') or '').lower() not in _fb_done]
    fb_done_rows = [_fb_row(r) for r in fb_recent
                    if (r.get('status') or '').lower() in _fb_done]

    mail = d.get('mail', {})
    human_rows = [[esc(m['date']), esc(m['from']), esc(m['to']), esc(m['subject'])]
                  for m in mail.get('human', [])]
    report_rows = [[esc(m['date']), esc(m['from']), esc(m['subject'])]
                   for m in mail.get('reports', [])]
    internal_rows = [[esc(m['date']), esc(m['from']), esc(m['to']), esc(m['subject'])]
                     for m in mail.get('internal', [])]
    mail_html = (table(['Date', 'From', 'To', 'Subject'], human_rows) if human_rows
                 else '<p class="muted">No reader mail — inbox is clear.</p>')
    if internal_rows:
        mail_html += (f'<details><summary>{len(internal_rows)} internal / test email(s)</summary>'
                      f'{table(["Date", "From", "To", "Subject"], internal_rows)}</details>')
    if report_rows:
        mail_html += (f'<details><summary>{len(report_rows)} automated report(s) '
                      f'(DMARC / postmaster)</summary>'
                      f'{table(["Date", "From", "Subject"], report_rows)}</details>')

    eng = d.get('email_engagement', {})
    eng_html = ''
    if eng and not eng.get('error'):
        for esite, elabel in [('cw', 'CW'), ('kd', 'KD')]:
            se = eng.get(esite, {})
            if not se:
                continue
            cells = ''
            for ev, name in [('sent', 'Sent'), ('delivered', 'Delivered'), ('opened', 'Opened'),
                             ('clicked', 'Clicked'), ('bounced', 'Bounced'), ('complained', 'Complaints')]:
                e = se.get(ev, {})
                cells += (f'<div class="stat"><b>{e.get("current_7d", 0)}</b><span>{name} 7d</span>'
                          f'{trend_html(pct_change(e.get("current_7d", 0), e.get("previous_7d", 0)))}</div>')
            rates = (f'<p class="small muted">{elabel}: Delivery {se.get("delivery_rate_pct", "—")}% · '
                     f'Open {se.get("open_rate_pct", "—")}% · Click {se.get("click_rate_pct", "—")}%</p>')
            eng_html += f'<p class="small muted"><b>{elabel}</b></p><div class="statrow wrap">{cells}</div>{rates}'

    rev = d.get('revenue', {})
    rev_html = '<p class="muted">Stripe not configured.</p>'
    if rev.get('configured') and not rev.get('error'):
        pace_pct = min(rev['month_pace'] * 100 / rev['target'], 100) if rev['target'] else 0
        rev_rows = [[esc(r['desc']), f'${r["amount"]:.2f}', esc(r['date']),
                     'refunded' if r['refunded'] else 'paid'] for r in rev.get('recent', [])]
        rev_html = f'''
        <div class="statrow">
          <div class="stat"><b>${rev["last_7d"]["net"]:.2f}</b><span>net 7d</span></div>
          <div class="stat"><b>${rev["last_30d"]["net"]:.2f}</b><span>net 30d</span></div>
          <div class="stat"><b>${rev["mtd"]["net"]:.2f}</b><span>net MTD</span></div>
          <div class="stat"><b>${rev["month_pace"]:.0f}</b><span>month pace</span></div>
        </div>
        <div class="target"><div class="tbar"><i style="width:{pace_pct:.0f}%"></i></div>
        <span class="small muted">pace vs $1k/mo net-profit target (gross shown; costs not subtracted)</span></div>
        {'<p class="small">By product (30d net): ' + ' · '.join(f'{esc(k)} <b>${v:.2f}</b>' for k, v in sorted(rev.get('by_product_30d', {}).items(), key=lambda kv: -kv[1])) + '</p>' if rev.get('by_product_30d') else ''}
        <details><summary>Recent charges</summary>{table(['Charge', 'Amount', 'Date', 'Status'], rev_rows)}</details>'''
    elif rev.get('error'):
        rev_html = err_note(rev, 'Stripe')

    coach_html = ''
    if coach:
        coach_html = (f'<div class="statrow"><div class="stat"><b>{coach.get("waitlist_total", 0)}</b>'
                      f'<span>waitlist total</span></div>'
                      f'<div class="stat"><b>{coach.get("waitlist_7d", 0)}</b><span>waitlist 7d</span></div>'
                      f'<div class="stat"><b>{coach.get("members_active", 0)}</b><span>active members</span></div></div>')

    def drip_block(drip):
        if not drip:
            return ''
        return (f'<div class="statrow"><div class="stat"><b>{drip.get("active", 0)}</b><span>active</span></div>'
                f'<div class="stat"><b>{drip.get("new_7d", 0)}</b><span>new 7d</span></div>'
                f'<div class="stat"><b>{drip.get("completed", 0)}</b><span>completed</span></div>'
                f'<div class="stat"><b>{drip.get("unsubscribed", 0)}</b><span>unsubbed</span></div></div>'
                f'<p class="muted small">Last drip send: {esc(drip.get("last_send") or "never")[:16]}</p>')

    drip_cw_html = drip_block(drip_cw)
    drip_kd_html = drip_block(drip_kd)

    def nl_block(label, nl):
        if not nl:
            return ''
        return (f'<div class="stat"><b>{nl.get("active", 0)}</b><span>{label} active</span></div>'
                f'<div class="stat"><b>{nl.get("new_7d", 0)}</b><span>new 7d</span>'
                f'{trend_html(pct_change(nl.get("new_7d", 0), nl.get("new_prev_7d", 0)))}</div>')

    css = '''
    :root{--bg:#0f1117;--card:#181b23;--card2:#1e222c;--text:#e8eaf0;--muted:#8b91a0;
      --green:#4ade80;--blue:#60a5fa;--amber:#fbbf24;--red:#f87171;--line:#2a2f3a}
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,'Segoe UI',Roboto,sans-serif;padding-bottom:60px}
    header{position:sticky;top:0;background:var(--bg);
      border-bottom:1px solid var(--line);padding:14px 24px;z-index:5;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
    header h1{font-size:19px}
    header .upd{color:var(--muted);font-size:13px}
    nav a{color:var(--muted);text-decoration:none;font-size:13px;margin-right:12px}
    nav a:hover{color:var(--text)}
    main{max-width:1200px;margin:0 auto;padding:24px}
    section{margin-bottom:36px}
    section>h2{font-size:16px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);
      margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid var(--line)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
    .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px}
    .card.dim{opacity:.65}
    .card h3{font-size:15px;margin-bottom:10px;border-left:3px solid var(--muted);padding-left:8px}
    .card h4{font-size:12px;color:var(--muted);text-transform:uppercase;margin:12px 0 6px}
    .bignum{font-size:28px;font-weight:700;margin:4px 0}
    .bignum .small{font-size:13px;font-weight:400}
    .muted{color:var(--muted)} .small{font-size:13px}
    .err{color:var(--amber);font-size:13px}
    .live{color:var(--green);font-size:12px;font-weight:600;margin-left:8px}
    .trend{font-size:12px;font-weight:700;padding:1px 6px;border-radius:8px}
    .trend.up{color:var(--green);background:rgba(74,222,128,.12)}
    .trend.down{color:var(--red);background:rgba(248,113,113,.12)}
    .trend.flat{color:var(--muted)}
    .spark{width:100%;height:48px;margin:6px 0}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
    th{color:var(--muted);text-align:left;font-weight:600;padding:4px 8px 4px 0;border-bottom:1px solid var(--line)}
    td{padding:5px 8px 5px 0;border-bottom:1px solid var(--line);vertical-align:top;word-break:break-word}
    details{margin-top:10px} summary{cursor:pointer;color:var(--muted);font-size:13px}
    .kv{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:3px 0;border-bottom:1px solid var(--line)}
    .kv span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .statrow{display:flex;gap:22px;flex-wrap:wrap;margin:8px 0}
    .stat b{display:block;font-size:22px}
    .stat span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
    .funnel{margin:8px 0}
    .fstage{margin:7px 0;font-size:13px}
    .frow{display:flex;justify-content:space-between;gap:10px;margin-bottom:3px}
    .fbarwrap{background:var(--card2);border-radius:6px;height:14px;overflow:hidden}
    .fbar{height:100%;border-radius:6px;min-width:3px}
    .fnum{text-align:right;white-space:nowrap}
    .bl{display:grid;grid-template-columns:110px 1fr 90px;gap:8px;align-items:center;font-size:13px;margin:3px 0}
    .bl-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bl-bar{background:var(--card2);border-radius:4px;height:12px;overflow:hidden;display:block}
    .bl-bar i{display:block;height:100%;border-radius:4px}
    .bl-num{text-align:right;color:var(--muted)}
    ul.insights{list-style:none}
    .ins{padding:9px 12px;border-radius:8px;margin-bottom:8px;background:var(--card);border:1px solid var(--line);font-size:14px}
    .ins.alert{border-left:4px solid var(--red)}
    .ins.watch{border-left:4px solid var(--amber)}
    .ins.good{border-left:4px solid var(--green)}
    .ins.info{border-left:4px solid var(--blue)}
    .narrative{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--green);
      border-radius:10px;padding:16px 18px;margin-bottom:16px}
    .narrative p{margin-bottom:10px}
    .narrative .focus-label{color:var(--green);font-size:11px;font-weight:700;
      text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
    .pulse-row{display:flex;gap:18px;flex-wrap:wrap}
    .pulse-item{white-space:nowrap}
    .pulse-item i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
    .target{margin:10px 0}
    .tbar{background:var(--card2);height:14px;border-radius:7px;overflow:hidden;margin-bottom:4px}
    .tbar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),#22c55e);border-radius:7px}
    '''

    html = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Command Center — CW + KD</title><style>{css}</style></head>
<body>
<header><h1>🎛️ Command Center</h1><span class="upd">Updated {esc(d["meta"]["generated_at"])} PT</span>
<nav><a href="#review">Review</a><a href="#pulse">Pulse</a><a href="#traffic">Traffic</a><a href="#search">Search</a>
<a href="#funnels">Funnels</a><a href="#demographics">Demographics</a>
<a href="#mail">Mail & Feedback</a><a href="#revenue">Revenue</a><a href="#etsy">Etsy</a></nav></header>
<main>

<section id="review"><h2>Plain-English Review</h2>
{narrative_html}
<ul class="insights">{ins_html or '<li class="ins info">No flags today — quiet week.</li>'}</ul>
</section>

<section id="pulse"><h2>Daily Pulse <span class="small">(yesterday · queues · automations)</span></h2>
<div class="card">
<h4>Yesterday ({esc(ydata.get('date') or '—')})</h4>
{y_html or '<p class="muted small">Yesterday counts unavailable.</p>'}
<h4>Content queues</h4>
<p class="small">{queue_html or '<span class="muted">Queue files unreadable.</span>'}</p>
<h4>Automation health</h4>
<p class="small pulse-row">{auto_html or '<span class="muted">GitHub Actions status unavailable.</span>'}</p>
{dec_html}
</div>
</section>

<section id="traffic"><h2>Traffic <span class="small">(GA4, week vs prior week)</span></h2>
<div class="grid">
{traffic_card('Carnivore Weekly', d['traffic'].get('cw'), 'var(--green)')}
{traffic_card('KetoDial', d['traffic'].get('kd'), 'var(--blue)')}
</div></section>

<section id="search"><h2>Search — Google & Bing</h2>
<div class="grid">
{search_card('Google · Carnivore Weekly', d['search'].get('cw'), 'var(--green)')}
{search_card('Google · KetoDial', d['search'].get('kd'), 'var(--blue)')}
{bing_card('Bing · Carnivore Weekly', d['search'].get('bing_cw'))}
{bing_card('Bing · KetoDial', d['search'].get('bing_kd'))}
</div></section>

<section id="funnels"><h2>Funnels</h2>
<div class="grid">
<div class="card"><h3 style="border-color:var(--green)">CW Calculator → Paid <span class="muted small">(30d)</span></h3>
{funnel_html(f.get('calculator_cw'), 'var(--green)')}</div>
<div class="card"><h3 style="border-color:var(--blue)">KD Calculator → Paid <span class="muted small">(30d)</span></h3>
{funnel_html(f.get('calculator_kd'), 'var(--blue)')}</div>
<div class="card"><h3 style="border-color:var(--green)">30-Day Drip (CW)</h3>{drip_cw_html or err_note(f, 'Funnels') or ''}</div>
<div class="card"><h3 style="border-color:var(--blue)">30-Day Drip (KD)</h3>{drip_kd_html or err_note(f, 'Funnels') or ''}</div>
<div class="card"><h3>Newsletters</h3><div class="statrow wrap">{nl_block('CW', nl_cw)}{nl_block('KD', nl_kd)}</div></div>
<div class="card"><h3>Coach (KD)</h3>{coach_html}</div>
</div></section>

<section id="demographics"><h2>Calculator Demographics</h2>
<div class="grid">
{demo_card('CW Calculator', d['demographics'].get('cw') if not d['demographics'].get('error') else d['demographics'], 'var(--green)')}
{demo_card('KD Calculator', d['demographics'].get('kd') if not d['demographics'].get('error') else d['demographics'], 'var(--blue)')}
</div></section>

<section id="mail"><h2>Mail & Feedback</h2>
<div class="grid">
<div class="card"><h3>Inbound Mail <span class="muted small">(@carnivoreweekly.com · {mail.get('inbound_7d', 0)} total this week)</span></h3>
{mail_html}
</div>
<div class="card"><h3>Site Feedback <span class="muted small">({fb.get('new_7d', 0)} new this week · {fb.get('unreviewed', 0)} unreviewed · {fb.get('hidden_test', 0)} test entries hidden)</span></h3>
{table(['Date', 'From', 'Message', 'Status'], fb_open_rows) if fb_open_rows else (err_note(fb, 'Feedback') or '<p class="muted">No open feedback — all caught up.</p>')}
{f'<details><summary>{len(fb_done_rows)} completed item(s)</summary>{table(["Date", "From", "Message", "Status"], fb_done_rows)}</details>' if fb_done_rows else ''}
</div>
<div class="card"><h3>Email Engagement <span class="muted small">(drip + newsletter, 7d)</span></h3>
{eng_html or err_note(eng, 'Engagement') or ''}</div>
</div></section>

<section id="revenue"><h2>Revenue</h2>
<div class="card">{rev_html}</div></section>

<section id="etsy"><h2>Etsy Shop <span class="small">(daily snapshot · reviews + conversion)</span></h2>
<div class="grid">{etsy_card(d.get('etsy'))}</div></section>

<p class="muted small">Generated by dashboard/generate_command_center.py · data in command-center-data.json ·
auto-updates daily via GitHub Actions (dashboard-update.yml) · run manually any time:
<code>python3 dashboard/generate_command_center.py</code></p>
</main></body></html>'''
    return html


def email_report(data, html):
    """Email the dashboard to Brew (body = review + flags, full HTML attached).
    Used by the daily GitHub Action — the repo is PUBLIC, so the report is
    delivered by email instead of being committed."""
    import base64
    import requests
    resend_key = (SECRETS.get('resend') or {}).get('key', '')
    if not resend_key:
        print('  Email skipped: no resend key.')
        return
    sev_color = {'alert': '#dc2626', 'watch': '#d97706', 'good': '#16a34a', 'info': '#2563eb'}
    items = ''.join(
        f'<li style="margin:6px 0;padding:8px 12px;background:#f6f7f9;border-left:4px solid '
        f'{sev_color.get(i["severity"], "#999")};border-radius:4px">{esc(i["text"])}</li>'
        for i in data.get('insights', []))
    narrative = (data.get('analysis') or {}).get('narrative') or ''
    focus = (data.get('analysis') or {}).get('focus') or ''
    focus_tag = (f'<p style="color:#16a34a;font-size:11px;font-weight:700;text-transform:uppercase;'
                 f'letter-spacing:.8px;margin:0 0 8px">Daily focus · {esc(focus)}</p>') if focus else ''
    paras = ''.join(f'<p style="margin:0 0 12px">{esc(p.strip())}</p>'
                    for p in narrative.split('\n') if p.strip())

    # $1k pace line
    rev = data.get('revenue') or {}
    pace_html = ''
    if rev.get('configured') and not rev.get('error'):
        pace_html = (f'<p style="margin:0 0 12px;padding:8px 12px;background:#f0fdf4;'
                     f'border-left:4px solid #16a34a;border-radius:4px;font-size:14px">'
                     f'💰 MTD net <b>${rev["mtd"]["net"]:.2f}</b> · pace <b>${rev["month_pace"]:.0f}</b> '
                     f'vs $1k target · {rev.get("days_left_in_month", "?")} days left</p>')

    # Yesterday strip
    y = data.get('yesterday') or {}
    y_html = ''
    if y and not y.get('error'):
        rev_y = rev.get('yesterday') or {}
        etsy_y = (data.get('etsy') or {}).get('yesterday') or {}
        cells = [
            f'{y.get("calc_sessions_cw", 0)}/{y.get("calc_sessions_kd", 0)} calc sessions (CW/KD)',
            f'{y.get("calc_emails_cw", 0) + y.get("calc_emails_kd", 0)} emails captured',
            f'{y.get("newsletter_signups_cw", 0) + y.get("newsletter_signups_kd", 0)} newsletter + '
            f'{y.get("drip_signups_cw", 0) + y.get("drip_signups_kd", 0)} drip signups',
        ]
        if rev_y:
            cells.append(f'${rev_y.get("net", 0):.2f} revenue')
        if etsy_y and etsy_y.get('views_delta') is not None:
            cells.append(f'{etsy_y["views_delta"]:+d} Etsy views')
        y_html = (f'<p style="margin:0 0 12px;font-size:13px;color:#444">'
                  f'<b>Yesterday:</b> {esc(" · ".join(cells))}</p>')

    # Automation health dots + queue depths
    dot_color = {'success': '#16a34a', 'failure': '#dc2626', 'stale': '#dc2626',
                 'never-ran': '#999', 'api-error': '#d97706', 'unknown': '#d97706'}
    auto_bits = ''.join(
        f'<span style="white-space:nowrap;margin-right:14px">'
        f'<span style="display:inline-block;width:9px;height:9px;border-radius:50%;'
        f'background:{dot_color.get(w.get("state"), "#d97706")};margin-right:4px"></span>'
        f'{esc(w["label"])}</span>'
        for w in (data.get('automation') or {}).get('workflows', []))
    qd = data.get('queues') or {}
    q_bits = []
    if qd and not qd.get('error'):
        for site, label in [('cw', 'CW'), ('kd', 'KD')]:
            s = qd.get(site) or {}
            if s:
                n = s.get('ready', '?')
                style = 'color:#dc2626;font-weight:700' if n == 0 else ''
                q_bits.append(f'<span style="{style}">{label} posts: {n}</span>')
        pin = qd.get('pinterest') or {}
        if 'unposted' in pin:
            style = 'color:#dc2626;font-weight:700' if pin['unposted'] == 0 else ''
            q_bits.append(f'<span style="{style}">Pinterest: {pin["unposted"]}</span>')
    pulse_html = ''
    if auto_bits or q_bits:
        pulse_html = (f'<p style="margin:0 0 4px;font-size:13px;color:#444">{auto_bits}</p>'
                      f'<p style="margin:0 0 12px;font-size:13px;color:#444">'
                      f'<b>Queues:</b> {" · ".join(q_bits)}</p>')

    # Weekly decision nudge (Mondays only, so it doesn't nag daily)
    dec_html = ''
    oldest = (data.get('decisions') or {}).get('oldest')
    if oldest and TODAY.weekday() == 0:
        dec_html = (f'<p style="margin:0 0 12px;padding:8px 12px;background:#fefce8;'
                    f'border-left:4px solid #d97706;border-radius:4px;font-size:13px">'
                    f'🧭 Oldest open decision: <b>{esc(oldest["title"])}</b> — waiting '
                    f'{oldest["age_days"]} days</p>')

    body = f'''<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;
      margin:0 auto;color:#1a1a1a;font-size:15px;line-height:1.5">
      <h2 style="margin:0 0 4px">🎛️ Command Center — {esc(data['meta']['generated_date'])}</h2>
      <p style="color:#667;margin:0 0 16px">Full interactive dashboard attached (open in a browser).</p>
      {focus_tag}{paras}
      {pace_html}{y_html}{pulse_html}{dec_html}
      <ul style="list-style:none;padding:0;margin:16px 0">{items}</ul>
      <p style="color:#889;font-size:12px">Generated {esc(data['meta']['generated_at'])} PT ·
      dashboard/generate_command_center.py</p></div>'''
    resp = requests.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {resend_key}', 'Content-Type': 'application/json'},
        json={'from': 'Command Center <newsletter@carnivoreweekly.com>',
              'to': ['iambrew@gmail.com'],
              'subject': f'🎛️ Command Center — {data["meta"]["generated_date"]}'
                         + (f' · {focus}' if focus else ''),
              'html': body,
              'attachments': [{'filename': f'command-center-{data["meta"]["generated_date"]}.html',
                               'content': base64.b64encode(html.encode()).decode()}]},
        timeout=30)
    resp.raise_for_status()
    print(f'  Emailed to iambrew@gmail.com (id {resp.json().get("id", "?")})')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--no-model', action='store_true',
                    help='Skip the AI narrative (rule-based insights only)')
    ap.add_argument('--email', action='store_true',
                    help='Also email the report to Brew via Resend (used by CI)')
    args = ap.parse_args()

    if not get_service_role_key():
        print('WARNING: no SUPABASE_SERVICE_ROLE_KEY (env or .env) — Supabase sections will fail.')

    data = collect(use_model=not args.no_model)

    html = render_html(data)
    with open(DATA_OUT, 'w') as fh:
        json.dump(data, fh, indent=1, default=str)
    with open(HTML_OUT, 'w') as fh:
        fh.write(html)
    if args.email:
        email_report(data, html)
    print(f'Done → {HTML_OUT}')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Command Center — the one dashboard Brew always refers to.

Command Centre 2.0 (2026-09-13): an executive decision layer on top of the
existing monitoring report. The page now answers, in about 60 seconds, how CW
and KD are doing, what changed, why it might have changed, and whether anything
needs doing. Every original section is still here, moved into the collapsible
"Forensic detail" region underneath.

The layer is built on one rule, and the rule is enforced in code, not by habit:

    FACT            what the measurement says          (fetchers, unchanged)
    INTERPRETATION  what it probably means             (command_center_exec.py)
    ACTION          what, if anything, Brew should do  (needs_attention only)

Specifically:
  - A percentage is never printed on a base too small to carry it. "1 sale → 3
    sales" shows "+2, low sample — directional only", never "+200%".
  - Observed and decision-useful traffic are separate numbers. The crawler-spike
    detector already existed; its output is now shown rather than only used.
  - A failed API renders as "data unavailable", never as zero.
  - Gross is never compared against the $1k NET target without naming the
    mismatch, and "net" is labelled as net-of-refunds-only, since no cost feed
    exists.
  - The paid funnel is built from GA4 SESSIONS containing each event, not event
    fires, and every stage is tagged measured / inferred / unavailable. Stages
    that are not sequential (CTA paths into the payment modal) are drawn as
    contributors, not as a stage above it.
  - A metric being down is not, by itself, "needs attention".

Email metrics are NOT redefined anywhere in this file or in the executive layer.
They are produced by compute_email_metrics() below to the definitions repaired
on 2026-09-13 (attempts = delivered + bounced over distinct resend_id; delivery
and bounce over attempts; complaint and both unique rates over delivered;
fixtures excluded from the whole cohort before anything is counted).

Pulls every data source into a single self-contained HTML page + JSON:
  - GA4 traffic (CW + KD properties, incl. realtime active users)
  - GA4 paid-funnel events (step1 → free results → offer → modal → checkout)
  - Google Search Console (both sites, week-over-week)
  - Bing Webmaster Tools (when secrets/api-keys.json has bing.api_key)
  - Calculator states, drip, newsletter, coach
  - Calculator demographics per site (CW + KD, from calculator_sessions_v2)
  - Feedback (content_feedback) and inbound mail (Resend receiving + drip_events)
  - Email engagement (the repaired metrics above)
  - Stripe revenue vs the $1k/month net target
  - Project-change timeline from docs/project-log + git, for correlation

Outputs:
  dashboard/command-center-data.json   (machine-readable, for future model runs)
  dashboard/command-center.html        (open this — self-contained, no server)

Run:            python3 dashboard/generate_command_center.py
Skip AI review: python3 dashboard/generate_command_center.py --no-model
Tests:          python3 dashboard/test_command_center.py
Automated:      .github/workflows/dashboard-update.yml (daily 10:17 UTC, emails)
                Mac crontab 03:40 PT runs --nas --email (publishes to the NAS)

Maintenance notes for future (small-model) sessions:
  - Every fetcher degrades gracefully: on error it returns {'error': ...} and
    the HTML renders "data unavailable" instead of a zero or a crash.
  - To add a section: write fetch_x() -> dict, add to collect(), add a render
    block in render_html(), and (optionally) a rule in build_insights().
  - To add an executive rule: put the LOGIC in command_center_exec.py (pure,
    testable) and only the markup here. Add a test in test_command_center.py.
  - To declare a live experiment: edit dashboard/experiments.json. Delete the
    entry when it concludes.
  - This dashboard is READ-ONLY. It must never send email to subscribers,
    change Stripe, modify Supabase customer records, deploy, or publish.
  - Do NOT print or embed secret values anywhere in the JSON/HTML.
  - Customer email contents and addresses are never sent to the model; only the
    aggregated counts in mail['signal_7d'] are.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import command_center_exec as X  # noqa: E402  (pure logic for the executive layer)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CREDS_PATH = os.path.join(SCRIPT_DIR, 'ga4-credentials.json')
SECRETS_PATH = os.path.join(PROJECT_ROOT, 'secrets', 'api-keys.json')
DATA_OUT = os.path.join(SCRIPT_DIR, 'command-center-data.json')
HTML_OUT = os.path.join(SCRIPT_DIR, 'command-center.html')

# NAS deck (BobLoblaw). Tailscale IP so the link works off the LAN too; the
# report holds subscriber emails and revenue, so it never leaves Brew's network.
NAS_HOST = 'mbrew@100.117.74.5'
NAS_ROOT = '/volume1/docker/artifacts-site'
NAS_BASE_URL = 'http://100.117.74.5:8087'

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


MAIL_SCRIPT = r'''
<script>
/* Mail & Feedback: which reader threads Brew has already handled.
   State lives on the deck server so it survives every regeneration of this
   file. If the API is unreachable (page opened outside the tailnet, or the
   deck is down) every thread simply stays visible, which is the safe failure:
   showing a handled thread again is an annoyance, hiding an unanswered reader
   is a lost customer. A thread reappears on its own when the person writes
   back, because a new message carries a new id. */
(function () {
  var API = '/api/mail-handled';
  var open_ = document.querySelector('#mail-open tbody');
  var done = document.getElementById('mail-done');
  var wrap = document.getElementById('mail-done-wrap');
  var count = document.getElementById('mail-done-count');
  var empty = document.getElementById('mail-empty');
  if (!open_ || !done) return;

  function refresh() {
    var n = done.children.length;
    if (count) count.textContent = n;
    if (wrap) wrap.hidden = n === 0;
    if (empty) empty.hidden = open_.children.length !== 0;
  }

  function button(row, handled) {
    var cell = row.querySelector('td.mailact');
    if (!cell) return;
    cell.innerHTML = '';
    var b = document.createElement('button');
    b.className = handled ? 'mundo' : 'mdone';
    b.textContent = handled ? 'Reopen' : 'Done';
    b.addEventListener('click', function () { set(row, !handled, b); });
    cell.appendChild(b);
  }

  function move(row, handled) {
    (handled ? done : open_).appendChild(row);
    button(row, handled);
    refresh();
  }

  function set(row, handled, b) {
    b.disabled = true;
    fetch(API, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: row.dataset.mid,
        handled: handled,
        sender: row.dataset.sender || '',
        subject: row.dataset.subject || ''
      })
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      move(row, handled);
    }).catch(function () {
      b.disabled = false;
      b.textContent = 'retry';
    });
  }

  Array.prototype.forEach.call(open_.querySelectorAll('tr'), function (row) {
    button(row, false);
  });

  fetch(API).then(function (r) { return r.json(); }).then(function (d) {
    var h = (d && d.handled) || {};
    Array.prototype.forEach.call(open_.querySelectorAll('tr'), function (row) {
      if (h[row.dataset.mid]) move(row, true);
    });
    refresh();
  }).catch(function () { refresh(); });

  refresh();
})();
</script>
'''


def mail_id(created_at, sender, subject):
    """Stable id for one inbound message.

    Resend's own id is used when present. The drip_events fallback has no id, so
    this hashes the three fields that identify a message. It must stay stable
    across regenerations: an id that changes daily would un-handle every thread
    Brew has already cleared.
    """
    blob = f'{created_at or ""}|{sender or ""}|{subject or ""}'
    return 'h' + hashlib.sha1(blob.encode()).hexdigest()[:15]


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
    # Windows END YESTERDAY. The old ('7daysAgo','today') compared a partial
    # current day against a complete prior week, which understates every
    # current-week figure for most of the day. Today is reported separately as
    # "today so far" and never enters a comparison.
    resp = ga4_run(property_id, [], metrics,
                   [('7daysAgo', 'yesterday'), ('14daysAgo', '8daysAgo')], order_desc_metric=False)
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



# Events behind the CW paid funnel. Verified present in the property on
# 2026-09-13 (first-fired dates from dashboard/ga4_event_history.py):
# step1_viewed 2026-07-10, free_results 2026-01-06, offer_impression 2026-08-01,
# bridge_cta_click 2026-05-29, payment_modal_opened 2026-01-09,
# begin_checkout 2026-05-29, purchase 2026-01-01.
FUNNEL_EVENTS = ('calculator_step1_viewed', 'calculator_free_results',
                 'calculator_offer_impression', 'calculator_bridge_cta_click',
                 'calculator_payment_modal_opened', 'begin_checkout', 'purchase')


def fetch_offer_events(property_id, days=28):
    """Daily sessions-containing-event and raw event counts for the paid funnel.

    SESSIONS is the funnel denominator, not eventCount. On 2026-09-13 the
    bridge CTA showed 31 events from 7 sessions — quoting the event count would
    have claimed four times the people who actually engaged.
    """
    from google.analytics.data_v1beta.types import (
        DateRange, Dimension, Filter, FilterExpression, Metric, RunReportRequest)
    f = FilterExpression(filter=Filter(field_name='eventName', string_filter=Filter.StringFilter(
        match_type=Filter.StringFilter.MatchType.FULL_REGEXP, value='|'.join(FUNNEL_EVENTS))))
    resp = ga4_client().run_report(RunReportRequest(
        property=property_id,
        dimensions=[Dimension(name='date'), Dimension(name='eventName')],
        metrics=[Metric(name='eventCount'), Metric(name='sessions')],
        date_ranges=[DateRange(start_date=f'{days}daysAgo', end_date='yesterday')],
        dimension_filter=f, limit=20000))
    by = {}
    for r in resp.rows:
        raw = r.dimension_values[0].value
        day = f'{raw[:4]}-{raw[4:6]}-{raw[6:]}'
        name = r.dimension_values[1].value
        rec = by.setdefault(name, {'events': 0, 'sessions': 0, 'daily': []})
        ev, se = int(r.metric_values[0].value), int(r.metric_values[1].value)
        rec['events'] += ev
        rec['sessions'] += se
        rec['daily'].append({'date': day, 'events': ev, 'sessions': se})
    for rec in by.values():
        rec['daily'].sort(key=lambda x: x['date'])
    return {'window_days': days, 'by_event': by,
            'metric_note': 'sessions = GA4 sessions containing the event; events = raw fires'}


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
        # These are NOT sequential stages and must never be drawn as a funnel.
        # Email is captured at step 1 (mandatory since 2026-06-29), so "email
        # captured" routinely exceeds "reached step 3" — the old rendering
        # produced 120 → 148 = 123%, a transition that cannot happen. They are
        # states a session can be in, each shown against sessions started.
        out[f'calculator_{label}'] = {
            'window': 'last 30 days',
            'sequential': False,
            'denominator': started,
            'note': ('Parallel states, not funnel stages: email is captured at step 1, '
                     'so it is not downstream of step 3. Each share is of sessions started.'),
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
        try:
            ls = out[f'drip_{site}']['last_send']
            out[f'drip_{site}']['stalled_days'] = round(
                (datetime.now(timezone.utc)
                 - datetime.fromisoformat(ls.replace('Z', '+00:00'))).total_seconds() / 86400, 1
            ) if ls else None
        except Exception:
            out[f'drip_{site}']['stalled_days'] = None

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
                'id': i.get('id') or mail_id(i.get('created_at'), i.get('from'),
                                            i.get('subject')),
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
        out['inbound'] = [{'id': mail_id(r.get('created_at'),
                                         (r.get('metadata') or {}).get('from'),
                                         r.get('subject')),
                           'from': (r.get('metadata') or {}).get('from', '(unknown sender)'),
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
    # Executive-level signal: counts and a coarse category from the SUBJECT LINE
    # only. No sender address and no message body leaves this dict, so the
    # summary can sit above the fold and can be handed to the model digest,
    # while the addressed table stays in the forensic drill-down.
    CATEGORY_HINTS = (
        ('report issue', ('wrong', 'error', 'mistake', 'not match', 'issue', 'problem',
                          'broken', 'missing', 'refund')),
        ('product question', ('question', 'how do', 'how to', 'can i', 'does it', '?')),
        ('positive feedback', ('thank', 'thanks', 'love', 'great', 'awesome', 'helped')),
    )

    def categorise(m):
        subj = (m.get('subject') or '').lower()
        for name, hints in CATEGORY_HINTS:
            if any(h in subj for h in hints):
                return name
        return 'support'

    cats = {}
    for m in out['human']:
        if (m.get('date') or '') >= d7:
            c = categorise(m)
            cats[c] = cats.get(c, 0) + 1
    out['signal_7d'] = {'replies': out['human_7d'], 'categories': cats,
                        'basis': 'category inferred from subject line only; '
                                 'no address or message body is summarised here'}
    return out


# ---------------------------------------------------------------------------
# EMAIL METRICS
# ---------------------------------------------------------------------------
# Rewritten 2026-09-13. The old version divided by the local 'sent' event and
# counted raw engagement events as if they were rates, which produced figures
# that could not be true: CW 7d showed 339 delivered / 215 sent = 158% delivery.
#
# Why 'sent' was wrong: only send_drip.py writes a local 'sent' row, while the
# Resend webhook writes 'delivered' for EVERY send path (newsletter, worker
# transactional, coach). Over 30 days local 'sent' was 1,184 against Resend's
# real 1,622, a 27% undercount, so it can never be a valid denominator.
#
# What replaces it: ATTEMPTS = delivered + bounced, counted over distinct
# resend_id. Both come from the webhook, so both cover every send path.
# Verified against Resend's native metrics API on 2026-09-13: attempts
# reproduced Resend's `sent` EXACTLY at both 7d (459) and 30d (1,622), as did
# delivered, bounced, complained, unique opens and unique clicks.
#
# 'Attempts' is deliberately NOT relabelled 'Sent' in the UI. It is a resolved
# count of messages Resend reached a verdict on, not the number the API
# accepted, and those differ while a message is still in flight.
#
# Denominators, and why they differ:
#   delivery rate   = delivered / attempts   (share of attempts that landed)
#   bounce rate     = bounced   / attempts   (share of attempts that failed)
#   complaint rate  = complained / delivered (industry convention, matching
#                     Google Postmaster and SES: only a message that actually
#                     landed can be reported as spam, so bounces must not
#                     dilute the denominator)
#   unique open rate  = distinct resend_id with an 'opened'  event / delivered
#   unique click rate = distinct resend_id with a 'clicked' event / delivered
#
# Opens and clicks MUST be de-duplicated by resend_id. One reader opening one
# message four times is one opened message, not four. Raw event totals are
# still exposed as opened_events / clicked_events for curiosity, but they are
# never used as a rate.
FIXTURE_EXCLUDED_NOTE = 'fixture/test addresses excluded (scripts/subscriber_hygiene.py)'


def _load_fixture_filter():
    """Reuse the project's single fixture rule. Never define a second list here.

    subscriber_hygiene.is_undeliverable_fixture is the same function the live
    send paths use to refuse a test address, so the dashboard cohort and the
    mailable cohort can never drift apart. If the import fails the dashboard
    still renders, but it says so rather than quietly reporting contaminated
    numbers.
    """
    try:
        scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts')
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        from subscriber_hygiene import is_undeliverable_fixture
        return is_undeliverable_fixture, True
    except Exception as e:
        print(f'  [email-metrics] WARNING: fixture filter unavailable ({e}); '
              f'metrics will include test traffic')
        return (lambda _e: False), False


def _fetch_events(start_iso, end_iso=None):
    """Every drip_events row in a window, paged. select is narrow on purpose."""
    rows, offset, page = [], 0, 1000
    while True:
        filters = f'created_at=gte.{start_iso}'
        if end_iso:
            filters += f'&created_at=lt.{end_iso}'
        filters += f'&offset={offset}'
        batch = supa_fetch('drip_events', select='email,event_type,resend_id,site',
                           filters=filters, limit=page)
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
        if offset > 50000:   # runaway guard
            break
    return rows


def compute_email_metrics(rows, is_fixture):
    """Per-site production email metrics from raw drip_events rows.

    The fixture filter is applied ONCE, to the whole cohort, before anything is
    counted. Dropping fixture bounces while leaving their delivered and opened
    events in the denominators would flatter every rate on the page.
    """
    out = {}
    for site in ('cw', 'kd'):
        site_rows = [r for r in rows if r.get('site') == site]
        prod = [r for r in site_rows if not is_fixture(r.get('email'))]

        def uniq(event):
            return len({r['resend_id'] for r in prod
                        if r.get('event_type') == event and r.get('resend_id')})

        delivered = uniq('delivered')
        bounced = uniq('bounced')
        complained = uniq('complained')
        attempts = delivered + bounced
        opened_msgs = uniq('opened')
        clicked_msgs = uniq('clicked')

        def pct(n, d):
            return round(n * 100 / d, 2) if d else None

        out[site] = {
            'attempts': attempts,
            'delivered': delivered,
            'bounced': bounced,
            'complained': complained,
            'unique_opened_messages': opened_msgs,
            'unique_clicked_messages': clicked_msgs,
            # Raw totals, kept visible but never used as a rate.
            'opened_events': sum(1 for r in prod if r.get('event_type') == 'opened'),
            'clicked_events': sum(1 for r in prod if r.get('event_type') == 'clicked'),
            'fixture_events_excluded': len(site_rows) - len(prod),
            'delivery_rate_pct': pct(delivered, attempts),
            'bounce_rate_pct': pct(bounced, attempts),
            'complaint_rate_pct': pct(complained, delivered),
            'unique_open_rate_pct': pct(opened_msgs, delivered),
            'unique_click_rate_pct': pct(clicked_msgs, delivered),
        }
    return out


def fetch_email_engagement():
    d7, d8, d14 = iso_days_ago(7), iso_days_ago(8), iso_days_ago(14)
    is_fixture, fixture_ok = _load_fixture_filter()

    cur = compute_email_metrics(_fetch_events(d7), is_fixture)
    prev = compute_email_metrics(_fetch_events(d14, d8), is_fixture)

    out = {'fixture_filter_active': fixture_ok, 'fixture_note': FIXTURE_EXCLUDED_NOTE}
    for site in ('cw', 'kd'):
        s = dict(cur[site])
        s['previous_7d'] = prev[site]
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
    # Comparable windows, both complete: the 7 days ending last midnight against
    # the 7 before those, and yesterday against the day before. Computed from the
    # same 30-day charge list, so no extra API call and no estimation.
    return {
        'configured': True,
        'yesterday': window([c for c in ok
                             if today_start - 86400 <= c['created'] < today_start]),
        'day_before': window([c for c in ok
                              if today_start - 2 * 86400 <= c['created'] < today_start - 86400]),
        'last_7d': window([c for c in ok if c['created'] >= now_ts - 7 * 86400]),
        'prev_7d': window([c for c in ok if now_ts - 14 * 86400 <= c['created']
                           < now_ts - 7 * 86400]),
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
        cutoff = iso_days_ago(28)[:10]
        for site in ('cw', 'kd'):
            sp = [p for p in posts if p.get('site', 'cw') == site]
            pub = sorted(p.get('publish_date', '') for p in sp
                         if (p.get('status') == 'published' or p.get('published'))
                         and p.get('publish_date', '') <= TODAY.isoformat())
            ready = sum(1 for p in sp if p.get('status') == 'ready')
            # Runway only means something if we know the cadence. Measure it from
            # the last 28 days of actual publications; if nothing published in
            # that window, report the count and say the cadence is unknown.
            recent = [d for d in pub if d >= cutoff]
            per_day = len(recent) / 28 if recent else 0
            out[site] = {'ready': ready,
                         'last_published': pub[-1] if pub else None,
                         'published_28d': len(recent),
                         'cadence_per_week': round(per_day * 7, 1) if per_day else None,
                         'runway_days': int(ready / per_day) if per_day else None}
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


def load_experiments():
    """dashboard/experiments.json — what is currently being measured.

    Deliberately tiny and declarative. Prose in decisions.md cannot say which
    GA4 event is the denominator, so that pair is declared here; everything
    else about the change already lives in the project log and is picked up by
    parse_timeline(). Delete an entry when the experiment concludes.
    """
    try:
        with open(os.path.join(SCRIPT_DIR, 'experiments.json')) as fh:
            return json.load(fh).get('experiments', [])
    except Exception:
        return []


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

    # Consumes the corrected per-site email block verbatim (attempts =
    # delivered + bounced over distinct resend_id; complaint and both unique
    # rates over delivered; fixtures excluded from the whole cohort first).
    # These rules previously read eng['complained']['current_7d'], a shape that
    # no longer exists, so none of them could fire.
    eng = d.get('email_engagement', {}) or {}
    for site, label in [('cw', 'CW'), ('kd', 'KD')]:
        e = eng.get(site) or {}
        if not e or e.get('error'):
            continue
        attempts = e.get('attempts', 0)
        if e.get('complained', 0) > 0:
            add('alert', f'{label}: {e["complained"]} spam complaint(s) this week '
                         f'({e.get("complaint_rate_pct")}% of delivered) — protect sender '
                         f'reputation, review list quality.')
        if attempts >= 100 and (e.get('bounce_rate_pct') or 0) >= 5:
            add('watch', f'{label} bounce rate {e["bounce_rate_pct"]}% of {attempts} attempts.')
        if attempts >= 100 and e.get('unique_open_rate_pct') is not None \
                and e['unique_open_rate_pct'] < 25:
            add('watch', f'{label} unique open rate is {e["unique_open_rate_pct"]}% of '
                         f'{e.get("delivered", 0)} delivered — below the ~40% norm for this list.')
    if eng and eng.get('fixture_filter_active') is False:
        add('watch', 'Email metrics ran WITHOUT the fixture filter — subscriber_hygiene could not '
                     'be imported, so test traffic is inside these numbers.')

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
        # Command Centre 2.0: the deterministic layer is computed BEFORE this
        # call and is what Brew reads first. Passing it in stops the model
        # repeating the brief and lets it add only what rules cannot infer.
        'paid_funnel_28d': data.get('paid_funnel'),
        'deterministic_brief': (data.get('executive') or {}).get('brief'),
        'needs_attention': data.get('needs_attention'),
        'dont_overreact': data.get('dont_overreact'),
        'project_changes_45d': [{'date': e['date'], 'title': e['title']}
                                for e in (data.get('timeline') or [])[:12]],
        'experiments': data.get('experiments'),
        'customer_signal_7d': (data.get('mail') or {}).get('signal_7d'),
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
        "A deterministic brief, an attention list and a do-not-overreact list have ALREADY "
        "been computed and are shown above yours on the page. Do not repeat them; add only "
        "what a rule cannot infer. Never present an inference as a measurement.\n"
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
            # max_tokens covers THINKING + text. The model emits a thinking block
            # first, so a 700-token budget was being consumed before a single
            # word of the review was written and the call returned silently
            # empty (observed 2026-09-13). The review itself is under 220 words.
            json={'model': model, 'max_tokens': 3000,
                  'messages': [{'role': 'user', 'content': prompt}]},
            timeout=180)
        resp.raise_for_status()
        payload = resp.json()
        parts = payload.get('content', [])
        text = ' '.join(p.get('text', '') for p in parts if p.get('type') == 'text').strip()
        if not text:
            print(f'  Model narrative empty (stop_reason='
                  f'{payload.get("stop_reason")}, blocks='
                  f'{[p.get("type") for p in parts]}) — falling back to rules.')
            return None
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
    print('  Paid-funnel events (GA4)...')
    data['offer_events'] = guarded('Offer events', fetch_offer_events, CW_GA4)
    data['decisions'] = load_open_decisions()

    # ── Executive layer (deterministic; see dashboard/command_center_exec.py) ──
    today_iso = TODAY.isoformat()
    data['data_quality'] = X.build_data_quality(data, NOW_STR)
    data['timeline'] = X.parse_timeline(PROJECT_ROOT, days=45, today=TODAY)
    data['paid_funnel'] = X.build_funnel(
        data['offer_events'],
        stripe_purchases=((data.get('revenue') or {}).get('last_30d') or {}).get('charges'))
    data['revenue_exec'] = X.build_revenue(data.get('revenue'), NET_TARGET_MONTHLY, TODAY)
    data['changes'] = X.build_changes(data, TODAY)
    data['signal'] = {s: X.clean_traffic((data.get('traffic') or {}).get(s), today_iso)
                      for s in ('cw', 'kd')}
    data['experiments'] = X.build_experiments(load_experiments(), data['offer_events'], TODAY)
    data['needs_attention'] = X.build_needs_attention(data, data['changes'], TODAY)
    data['dont_overreact'] = X.build_dont_overreact(data, data['changes'],
                                                    data['paid_funnel'], today_iso)
    data['correlations'] = X.correlate(data['timeline'], data['changes'], TODAY)
    data['executive'] = X.build_executive(data, data['changes'], data['paid_funnel'],
                                          data['revenue_exec'], data['needs_attention'],
                                          today_iso)

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
    """Renders the calculator block. When the block declares sequential=False
    this draws STATES, each against sessions started, and prints no
    stage-to-stage conversion at all — "120 reached step 3 → 148 email
    captured = 123%" was a transition that cannot happen, because email is
    captured at step 1 and is not downstream of step 3.
    """
    if not f or f.get('error'):
        return err_note(f, 'Funnel') or '<p class="muted">No data.</p>'
    stages = f['stages']
    sequential = f.get('sequential', True)
    top = max(s['count'] for s in stages) or 1
    first = f.get('denominator') or stages[0]['count'] or 1
    rows = []
    prev_count = None
    for s in stages:
        width = max(s['count'] * 100 / top, 1.5)
        of_top = s['count'] * 100 / first
        if sequential and prev_count:
            detail = f'{of_top:.0f}% · {s["count"] * 100 / prev_count:.0f}% of prev'
        else:
            detail = f'{of_top:.0f}% of sessions started'
        rows.append(
            f'<div class="fstage"><div class="frow"><span class="fname">{esc(s["name"])}</span>'
            f'<span class="fnum">{s["count"]:,} <span class="muted">({detail})</span></span></div>'
            f'<div class="fbarwrap"><div class="fbar" style="width:{width:.1f}%;background:{accent}"></div></div></div>')
        prev_count = s['count'] if s['count'] else prev_count
    note = f'<p class="col-sub">{esc(f["note"])}</p>' if f.get('note') else ''
    wk = f.get('week', {})
    wk_html = ''
    if wk:
        wk_html = (f'<p class="muted small">This week: {wk.get("current", 0)} sessions vs '
                   f'{wk.get("previous", 0)} last week {trend_html(wk.get("change_pct"))}</p>')
    return f'{note}<div class="funnel">{"".join(rows)}</div>{wk_html}'


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



# ── Executive-layer rendering ────────────────────────────────────────
# Facts, interpretation and action are rendered in visually distinct blocks on
# purpose. A reader must never have to guess whether a line is a measurement or
# a guess about a measurement.

STATUS_CLASS = {'green': 'st-green', 'blue': 'st-blue', 'amber': 'st-amber', 'red': 'st-red'}


def chg_pill(c):
    """One movement. A low-sample movement shows no percentage at all."""
    if not c:
        return ''
    arrow = {'up': '▲', 'down': '▼', 'flat': '■'}[c['direction']]
    cls = {'up': 'up', 'down': 'down', 'flat': 'flat'}[c['direction']]
    pct = (f'<span class="pct">{c["pct"]:+.0f}%</span>'
           if c['pct'] is not None else '<span class="pct muted">—</span>')
    note = f'<div class="chg-note">{esc(c["note"])}</div>' if c.get('note') else ''
    return (f'<div class="chg {cls}">'
            f'<div class="chg-label">{esc(c["label"])}</div>'
            f'<div class="chg-vals"><span class="was">{esc(c["prev_fmt"])}</span>'
            f'<span class="arrow">→</span><b>{esc(c["cur_fmt"])}</b>'
            f'<span class="abs">{esc(c["abs_fmt"])}</span>{arrow} {pct}</div>'
            f'{note}</div>')


def exec_html(d):
    ex = d.get('executive') or {}
    if not ex:
        return '<p class="muted">Executive summary unavailable.</p>'
    cls = STATUS_CLASS.get(ex['status'], 'st-blue')
    brief = ' '.join(esc(b) for b in ex.get('brief', []))
    return (f'<div class="exec {cls}">'
            f'<div class="exec-status">{ex["status_icon"]} {esc(ex["status_label"])}</div>'
            f'<p class="exec-brief">{brief}</p></div>')


def interp_html(d):
    ex = d.get('executive') or {}
    cols = [
        ('What this means', 'interp', ex.get('what_this_means'),
         'Interpretation of the measurements above, not a measurement.'),
        ("What I'd watch", 'watch', ex.get('what_id_watch'),
         'Not yet actionable — confirm before moving on it.'),
        ('Suggested next action', 'action', ex.get('suggested_action'), None),
    ]
    out = ''
    for title, css, items, sub in cols:
        lis = ''.join(f'<li>{esc(i)}</li>' for i in (items or [])) or '<li class="muted">Nothing.</li>'
        subtitle = f'<div class="col-sub">{esc(sub)}</div>' if sub else ''
        out += (f'<div class="card col-{css}"><h3>{esc(title)}</h3>{subtitle}'
                f'<ul class="plain">{lis}</ul></div>')
    return out


def changes_html(d):
    ch = d.get('changes') or {}
    dod = ''.join(chg_pill(c) for c in ch.get('dod', []))
    wow = ''.join(chg_pill(c) for c in ch.get('wow', []))
    levels = ''.join(
        f'<div class="stat"><b>{l["value"]}</b><span>{esc(l["label"])}</span></div>'
        for l in ch.get('yesterday_levels', []))
    lv = (f'<h4>Yesterday ({esc(ch.get("yesterday_date") or "—")}) — levels, no stored prior day'
          f'</h4><div class="statrow wrap">{levels}</div>') if levels else ''
    return (f'<div class="card"><h3>Since yesterday</h3>'
            f'<div class="chg-grid">{dod or "<p class=muted>No day-over-day pairs available.</p>"}</div>'
            f'{lv}</div>'
            f'<div class="card"><h3>Since last week <span class="muted small">'
            f'(7 complete days vs the 7 before)</span></h3>'
            f'<div class="chg-grid">{wow or "<p class=muted>No week-over-week pairs available.</p>"}</div></div>')


def revenue_exec_html(d):
    r = d.get('revenue_exec') or {}
    if r.get('unavailable'):
        return (f'<div class="card col-rev"><h3>Revenue</h3>'
                f'<p class="err">Data unavailable — {esc(r.get("reason"))}. '
                f'This is not zero revenue.</p></div>')
    pct = r.get('target_pct') or 0
    bar = min(100, pct)
    aov = (f'${r["aov_30d"]:.2f}' if r.get('aov_30d') else '—')
    aov_note = ('' if r.get('aov_reliable')
                else f' <span class="muted small">({r["purchases_30d"]} sales — thin)</span>')
    prods = ''.join(f'<div class="kv"><span>{esc(k)}</span><span>${v:,.2f}</span></div>'
                    for k, v in sorted((r.get('by_product_30d') or {}).items(),
                                       key=lambda x: -x[1]))
    return (f'<div class="card col-rev"><h3>💰 Revenue</h3>'
            f'<div class="statrow wrap">'
            f'<div class="stat"><b>${r["yesterday"].get("net", 0):,.2f}</b><span>yesterday</span></div>'
            f'<div class="stat"><b>${r["last_7d"].get("net", 0):,.2f}</b><span>7 days</span></div>'
            f'<div class="stat"><b>${r["last_30d"].get("net", 0):,.2f}</b><span>30 days</span></div>'
            f'<div class="stat"><b>{r["purchases_30d"]}</b><span>purchases 30d</span></div>'
            f'<div class="stat"><b>{aov}{aov_note}</b><span>avg order</span></div></div>'
            f'<h4>Month to date vs target</h4>'
            f'<div class="kv"><span>MTD gross</span><span>${r["mtd_gross"]:,.2f}</span></div>'
            f'<div class="kv"><span>MTD net (measured)</span><span>${r["mtd_net_measured"]:,.2f}</span></div>'
            f'<div class="kv"><span>Net target</span><span>${r["target_net"]:,.0f}/mo</span></div>'
            f'<div class="target"><div class="tbar"><i style="width:{bar}%"></i></div>'
            f'<span class="small muted">{pct:.0f}% of the NET target</span></div>'
            f'<p class="caveat">⚠ {esc(r["mismatch_note"])} Net here is {esc(r["net_basis"])}.</p>'
            f'<h4>By product (30d)</h4>{prods or "<p class=muted small>No attributed sales.</p>"}'
            f'</div>')


def attention_html(d):
    items = d.get('needs_attention') or []
    if not items:
        return ('<div class="card col-ok"><h3>🟢 Needs attention</h3>'
                '<p>Nothing needs intervention today.</p>'
                '<p class="muted small">Metrics being down is not, by itself, a problem. '
                'This box stays empty unless something is actionable.</p></div>')
    lis = ''
    for it in items:
        dot = '🔴' if it['severity'] == 'red' else '🟡'
        why = f'<div class="col-sub">{esc(it["why"])}</div>' if it.get('why') else ''
        lis += f'<li class="att {it["severity"]}">{dot} {esc(it["text"])}{why}</li>'
    return (f'<div class="card col-att"><h3>Needs attention '
            f'<span class="muted small">({len(items)})</span></h3>'
            f'<ul class="plain">{lis}</ul></div>')


def dont_overreact_html(d):
    items = d.get('dont_overreact') or []
    if not items:
        return ''
    lis = ''.join(f'<li>{esc(i)}</li>' for i in items)
    return (f'<div class="card col-dno"><h3>🚧 Do not overreact to</h3>'
            f'<ul class="plain">{lis}</ul></div>')


def signal_html(d):
    sig = d.get('signal') or {}
    cards = ''
    for site, label in (('cw', 'Carnivore Weekly'), ('kd', 'KetoDial')):
        s = sig.get(site)
        if not s:
            cards += (f'<div class="card"><h3>{esc(label)}</h3>'
                      f'<p class="err">Traffic data unavailable — not zero traffic.</p></div>')
            continue
        flag = ('<p class="caveat">⚠ Raw metric — known crawler distortion on '
                + esc(', '.join(s['excluded_days'])) + '</p>') if s['contaminated'] else ''
        base = (f'<div class="kv"><span>28-day baseline (median × 7)</span>'
                f'<span>{s["baseline_28d_7d"]}</span></div>' if s.get('baseline_28d_7d') else '')
        today = (f'<div class="kv"><span>Today so far (not comparable)</span>'
                 f'<span>{s["today_so_far"]}</span></div>' if s.get('today_so_far') is not None else '')
        cards += (f'<div class="card"><h3>{esc(label)}</h3>'
                  f'<div class="kv"><span>Observed (GA4 as reported, 7d)</span>'
                  f'<span>{s["observed_7d"]}</span></div>'
                  f'<div class="kv"><span><b>Decision-useful</b> (human-like, 7d)</span>'
                  f'<span><b>{s["clean_7d"]}</b></span></div>{base}{today}{flag}'
                  f'<div class="chg-grid">{chg_pill(s["delta"])}</div></div>')
    return cards


def scorecard_html(d, site, label, accent):
    """One compact business scorecard. Current, previous comparable, trend."""
    rows = []

    def row(name, cur, prev, unit='count', base='generic', invert=False, note=None):
        c = X.delta(name, prev, cur, unit=unit, base=base, invert=invert, note=note)
        rows.append((name, cur, prev, c, unit))

    sig = (d.get('signal') or {}).get(site)
    if sig:
        row('Human-like sessions', sig['clean_7d'], sig['clean_prev_7d'], base='sessions')
    g = (d.get('search') or {}).get(site) or {}
    if g.get('current'):
        row('Organic search clicks', g['current'].get('clicks'),
            g['previous'].get('clicks'), base='clicks')
    fw = ((d.get('funnels') or {}).get(f'calculator_{site}') or {}).get('week') or {}
    if fw:
        row('Calculator starts', fw.get('current'), fw.get('previous'), base='calculator')
    nl = (d.get('funnels') or {}).get(f'newsletter_{site}') or {}
    if nl and not nl.get('error'):
        row('Newsletter signups', nl.get('new_7d'), nl.get('new_prev_7d'))
    if site == 'cw':
        pf = d.get('paid_funnel') or {}
        st = {x['name']: x for x in pf.get('stages', [])} if not pf.get('error') else {}
        for nm, key in (('Offer impressions (28d)', 'Paid offer seen'),
                        ('CTA engagement (28d)', 'CTA engagement'),
                        ('Checkout starts (28d)', 'Checkout started')):
            if key in st and st[key]['sessions'] is not None:
                rows.append((nm, st[key]['sessions'], None, None, 'count'))
    r = d.get('revenue_exec') or {}
    if site == 'cw' and not r.get('unavailable'):
        rows.append(('Purchases (30d)', r['purchases_30d'], None, None, 'count'))
        rows.append(('Revenue 7d', f'${r["last_7d"].get("net", 0):,.2f}', None, None, 'money'))
        rows.append(('Revenue 30d', f'${r["last_30d"].get("net", 0):,.2f}', None, None, 'money'))
    e = (d.get('email_engagement') or {}).get(site) or {}
    if e.get('attempts'):
        p = e.get('previous_7d') or {}
        row('Email unique open rate', e.get('unique_open_rate_pct'),
            p.get('unique_open_rate_pct'), unit='pct', base='email')
        row('Email unique click rate', e.get('unique_click_rate_pct'),
            p.get('unique_click_rate_pct'), unit='pct', base='email')

    body = ''
    for name, cur, prev, c, unit in rows:
        cur_s = cur if isinstance(cur, str) else (
            f'{cur:.1f}%' if unit == 'pct' and cur is not None else
            ('—' if cur is None else f'{cur:,}'))
        prev_s = ('—' if prev is None else
                  (f'{prev:.1f}%' if unit == 'pct' else f'{prev:,}'))
        if c:
            arrow = {'up': '▲', 'down': '▼', 'flat': '■'}[c['direction']]
            tr = (f'<span class="trend {c["direction"] if c["direction"] != "flat" else "flat"}">'
                  f'{arrow} {c["pct"]:+.0f}%</span>' if c['pct'] is not None
                  else f'<span class="trend flat">{arrow} {esc(c["abs_fmt"])}</span>')
        else:
            tr = '<span class="trend flat">—</span>'
        body += (f'<tr><td>{esc(name)}</td><td class="num"><b>{cur_s}</b></td>'
                 f'<td class="num muted">{prev_s}</td><td class="num">{tr}</td></tr>')
    return (f'<div class="card"><h3 style="border-color:{accent}">{esc(label)}</h3>'
            f'<table class="score"><tr><th>Metric</th><th class="num">Now</th>'
            f'<th class="num">Prev</th><th class="num">Trend</th></tr>{body}</table>'
            f'<p class="muted small">Weekly rows compare 7 complete days against the 7 before. '
            f'Rows marked 28d/30d are single-window levels with no comparable prior period '
            f'fetched.</p></div>')


STAGE_TAG = {'measured': ('tag-ok', 'measured'),
             'inferred': ('tag-inf', 'inferred'),
             'unavailable': ('tag-na', 'unavailable')}


def paid_funnel_html(d):
    pf = d.get('paid_funnel') or {}
    if pf.get('error'):
        return (f'<div class="card"><h3>CW paid funnel</h3>'
                f'<p class="err">Event data unavailable — {esc(pf["error"])}. '
                f'No stages are shown rather than showing zeros.</p></div>')
    stages = pf.get('stages', [])
    top = max((s['sessions'] or 0) for s in stages) or 1
    body = ''
    for s in stages:
        cls, word = STAGE_TAG.get(s['status'], ('tag-na', s['status']))
        n = s['sessions']
        width = (n / top * 100) if n else 0
        conv = (f'{s["from_prev_pct"]}% of previous' if s.get('from_prev_pct') is not None
                else 'first stage')
        overall = (f' · {s["from_start_pct"]}% of starts' if s.get('from_start_pct') is not None
                   else '')
        rep = (f' · {s["events"]} raw events from {n} sessions ({s["repeat_ratio"]}× repeats)'
               if s.get('repeat_ratio') and s['repeat_ratio'] >= 1.5 else '')
        bad = ' impossible' if s.get('impossible') else ''
        note = f'<div class="col-sub">{esc(s["note"])}</div>' if s.get('note') else ''
        body += (f'<div class="fstage{bad}">'
                 f'<div class="frow"><span>{esc(s["name"])} '
                 f'<span class="tag {cls}">{word}</span></span>'
                 f'<span class="fnum">{"—" if n is None else n}</span></div>'
                 f'<div class="fbarwrap"><div class="fbar" style="width:{width:.1f}%;'
                 f'background:var(--green)"></div></div>'
                 f'<div class="col-sub">{conv}{overall}{rep}</div>{note}</div>')
    br = ''
    for b in pf.get('branches', []):
        n = b['sessions']
        br += (f'<div class="kv"><span>{esc(b["name"])}</span>'
               f'<span>{"unavailable" if n is None else f"{n} sessions"}'
               f'{f" · {b['events']} clicks" if b.get("events") else ""}</span></div>')
    br_html = (f'<h4>CTA paths into the payment modal</h4>{br}'
               f'<p class="col-sub">{esc(pf.get("branch_note", ""))}</p>') if br else ''
    leak = pf.get('biggest_leak')
    leak_html = (f'<p class="leak">Biggest drop-off: {esc(leak["text"])}</p>') if leak else ''
    xc = pf.get('purchase_crosscheck') or {}
    xc_html = ''
    if xc:
        agree = '✓ agrees with' if xc['agrees'] else '⚠ differs from'
        xc_html = (f'<p class="muted small">Purchase stage {agree} Stripe: '
                   f'GA4 {xc["ga4_sessions"]} sessions vs {xc["stripe_charges"]} charges '
                   f'(30d Stripe window vs {pf.get("window_days")}d GA4 window).</p>')
    return (f'<div class="card"><h3>CW paid funnel '
            f'<span class="muted small">({pf.get("window_days")}d · sessions containing each event)'
            f'</span></h3>{leak_html}{body}{xc_html}'
            f'<p class="muted small">Denominator is SESSIONS, not event fires: one reader '
            f'clicking a CTA four times is one engaged session. Every stage is tagged with how '
            f'it is known. No stage is estimated into existence.</p></div>')


def experiments_html(d):
    exps = d.get('experiments') or []
    if not exps:
        return ('<div class="card"><h3>🔬 Currently measuring</h3>'
                '<p class="muted">No experiment declared in dashboard/experiments.json.</p></div>')
    body = ''
    for e in exps:
        locked = 'KEEP MEASURING' in e['status']
        cls = 'exp-lock' if locked else 'exp-read'
        rate = f'{e["rate_pct"]}%' if e.get('rate_pct') is not None else '—'
        notes = f'<p class="col-sub">{esc(e["notes"])}</p>' if e.get('notes') else ''
        body += (f'<div class="exp {cls}"><b>{esc(e["name"])}</b>'
                 f'<div class="col-sub">Started {esc(e["started"])} · day {e["days"]}</div>'
                 f'<div class="kv"><span>{esc(e["denominator_label"])}</span>'
                 f'<span>{e["denominator"] if e["denominator"] is not None else "—"}'
                 f' / {e["min_sample"]} needed</span></div>'
                 f'<div class="kv"><span>{esc(e["numerator_label"])}</span>'
                 f'<span>{e["numerator"] if e["numerator"] is not None else "—"} ({rate})</span></div>'
                 f'<div class="exp-status">{esc(e["status"])}</div>'
                 f'<div class="col-sub">{esc(e["verdict"])}</div>{notes}</div>')
    return (f'<div class="card"><h3>🔬 Currently measuring</h3>{body}'
            f'<p class="muted small">A locked experiment must not be changed by Brew or any '
            f'agent until it reads READABLE.</p></div>')


def customer_signal_html(d):
    """Counts and categories only. Addresses and message text stay below, in
    the forensic table, and are never sent to the model digest."""
    mail = d.get('mail') or {}
    sig = mail.get('signal_7d') or {}
    fb = d.get('feedback') or {}
    if mail.get('error'):
        return ('<div class="card"><h3>Customer signal</h3>'
                '<p class="err">Inbound mail unavailable this run — not zero replies.</p></div>')
    cats = ''.join(f'<div class="kv"><span>{esc(k)}</span><span>{v}</span></div>'
                   for k, v in sorted((sig.get('categories') or {}).items(), key=lambda x: -x[1]))
    return (f'<div class="card"><h3>📬 Customer signal <span class="muted small">(7d)</span></h3>'
            f'<div class="statrow wrap">'
            f'<div class="stat"><b>{sig.get("replies", 0)}</b><span>real customer replies</span></div>'
            f'<div class="stat"><b>{fb.get("new_7d", 0)}</b><span>site feedback</span></div>'
            f'<div class="stat"><b>{fb.get("unreviewed", 0)}</b><span>unreviewed</span></div>'
            f'</div>{cats}'
            f'<p class="muted small">Senders and message text are in the forensic section below, '
            f'not here, and are never sent to the model.</p></div>')


def timeline_html(d):
    tl = d.get('timeline') or []
    cors = d.get('correlations') or []
    cor_html = ''
    for c in cors:
        movs = ''.join(f'<li>{esc(m["metric"])}: {esc(m["movement"])}</li>'
                       for m in c['movements'])
        others = (f' <span class="muted small">({c["other_candidates"]} other change(s) also '
                  f'sit in this window)</span>' if c.get('other_candidates') else '')
        src = ('a recorded project decision' if c.get('kind') == 'decision'
               else 'a recorded status entry' if c.get('kind') == 'status'
               else 'a commit subject, which is a weaker signal than a recorded decision')
        cor_html += (f'<p class="col-sub">Nearest recorded change ({src}).</p>'
                     f'<p class="small">In the {c["days_before"]} day(s) since '
                     f'“{esc(c["change"])}” ({esc(c["change_date"])}){others}:</p>'
                     f'<ul class="plain">{movs}</ul>'
                     f'<p class="caveat">{esc(c["caveat"])}</p>')
    rows = ''.join(
        f'<div class="kv"><span>{esc(e["date"])} · <span class="tag tag-{e["kind"]}">'
        f'{e["kind"]}</span> {esc(e["title"])}</span></div>' for e in tl[:18])
    co = (f'<h4>Possible co-movements</h4>{cor_html}' if cor_html
          else '<p class="muted small">No metric moved enough, reliably enough, to pair with a '
               'project change this run.</p>')
    return (f'<div class="card"><h3>🗓️ Project changes (45 days)</h3>{co}'
            f'<details><summary>{len(tl)} logged change(s)</summary>{rows}</details>'
            f'<p class="muted small">Sourced from docs/project-log/decisions.md, '
            f'current-status.md and git subjects. Proximity in time only.</p></div>')


DQ_DOT = {'ok': ('var(--green)', 'ok'), 'failed': ('var(--red)', 'FAILED'),
          'missing': ('var(--amber)', 'missing'),
          'not-configured': ('var(--muted)', 'not configured')}


def data_quality_html(d):
    dq = d.get('data_quality') or {}
    items = ''
    for s in dq.get('sources', []):
        color, word = DQ_DOT.get(s['state'], ('var(--amber)', s['state']))
        detail = f' — {esc(s["detail"])}' if s.get('detail') else ''
        items += (f'<span class="pulse-item"><i style="background:{color}"></i>'
                  f'{esc(s["label"])} <span class="muted">({word}{detail})</span></span>')
    failed = dq.get('failed', 0)
    banner = (f'<p class="caveat">⚠ {failed} source(s) failed this run. Their sections show '
              f'nothing, never zero.</p>' if failed else '')
    return (f'<div class="card"><h3>Data sources <span class="muted small">'
            f'(last successful refresh {esc(dq.get("generated_at"))} PT)</span></h3>'
            f'{banner}<p class="small pulse-row">{items}</p>'
            f'<p class="muted small">{esc(dq.get("note", ""))}</p></div>')


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
    # Open items get the table; handled ones collapse so they stop resurfacing
    # every day, and then fall off entirely after 30 days (Brew, 2026-08-14:
    # "completed messages older than 30 days fall off the view").
    # 'declined' belongs here too: a declined item is handled, and leaving it out
    # of this tuple rendered it as open forever.
    _fb_done = ('completed', 'done', 'closed', 'resolved', 'declined')
    _fb_cutoff = iso_days_ago(30)[:16]

    def _fb_row(r):
        return [esc(r['date']), esc(r['email']), esc(r['text']), esc(r['status'])]

    def _is_done(r):
        return (r.get('status') or '').lower() in _fb_done

    fb_open_rows = [_fb_row(r) for r in fb_recent if not _is_done(r)]
    fb_done_recent = [r for r in fb_recent
                      if _is_done(r) and (r.get('date') or '') >= _fb_cutoff]
    fb_done_rows = [_fb_row(r) for r in fb_done_recent]
    fb_aged_off = sum(1 for r in fb_recent if _is_done(r)) - len(fb_done_rows)

    mail = d.get('mail', {})
    # Reader mail rows carry a stable id and a Done control. Handled state lives
    # on the deck server (/api/mail-handled), NOT in this file, so it survives
    # every regeneration; the script at the bottom of the page moves handled
    # threads into the collapsed section on load.
    #
    # Why this is a button and not automatic reply-detection: Brew answers
    # readers from his own mail client, so nothing about a reply reaches Resend.
    # Checked 2026-09-07 against the last 100 sent emails, and every one is an
    # automated drip or newsletter send. Inferring "replied" from Resend would
    # have marked a reader handled because the drip mailed them afterwards,
    # which hides real mail. One tap is honest; a wrong guess is not.
    def _mail_row(m):
        mid = esc(m.get('id') or '')
        return (f'<tr data-mid="{mid}" data-sender="{esc(m.get("from") or "")}" '
                f'data-subject="{esc(m.get("subject") or "")}">'
                f'<td>{esc(m["date"])}</td><td>{esc(m["from"])}</td>'
                f'<td>{esc(m["to"])}</td><td>{esc(m["subject"])}</td>'
                f'<td class="mailact"><button class="mdone" data-mid="{mid}">Done</button></td>'
                f'</tr>')

    human = mail.get('human', [])
    report_rows = [[esc(m['date']), esc(m['from']), esc(m['subject'])]
                   for m in mail.get('reports', [])]
    internal_rows = [[esc(m['date']), esc(m['from']), esc(m['to']), esc(m['subject'])]
                     for m in mail.get('internal', [])]
    if human:
        _head = ('<thead><tr><th>Date</th><th>From</th><th>To</th><th>Subject</th>'
                 '<th></th></tr></thead>')
        mail_html = (f'<table id="mail-open">{_head}<tbody>'
                     + ''.join(_mail_row(m) for m in human) + '</tbody></table>'
                     + '<p class="muted small" id="mail-empty" hidden>'
                       'No open reader mail — inbox is clear.</p>'
                     + '<details id="mail-done-wrap" hidden><summary>'
                       '<span id="mail-done-count">0</span> handled</summary>'
                       f'<table>{_head}<tbody id="mail-done"></tbody></table></details>')
    else:
        mail_html = '<p class="muted">No reader mail — inbox is clear.</p>'
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
            # 'Attempts' replaces the old 'Sent' tile. It is delivered + bounced
            # over distinct resend_id, not the count the Resend API accepted.
            # Opened/Clicked tiles now show UNIQUE MESSAGES, which is what the
            # rates below divide by; the raw event totals sit in the footnote so
            # the two can never be mistaken for each other again.
            prev7 = se.get('previous_7d', {})
            cells = ''
            for key, name in [('attempts', 'Attempts'), ('delivered', 'Delivered'),
                              ('unique_opened_messages', 'Opened (uniq)'),
                              ('unique_clicked_messages', 'Clicked (uniq)'),
                              ('bounced', 'Bounced'), ('complained', 'Complaints')]:
                curv = se.get(key, 0) or 0
                prevv = prev7.get(key, 0) or 0
                cells += (f'<div class="stat"><b>{curv}</b><span>{name} 7d</span>'
                          f'{trend_html(pct_change(curv, prevv))}</div>')
            fmt = lambda v: f'{v}%' if v is not None else '—'
            rates = (f'<p class="small muted">{elabel}: '
                     f'Delivery {fmt(se.get("delivery_rate_pct"))} · '
                     f'Bounce {fmt(se.get("bounce_rate_pct"))} · '
                     f'Complaints {fmt(se.get("complaint_rate_pct"))} · '
                     f'Unique open {fmt(se.get("unique_open_rate_pct"))} · '
                     f'Unique click {fmt(se.get("unique_click_rate_pct"))}</p>'
                     f'<p class="small muted">Attempts = delivered + bounced (distinct message ids). '
                     f'Delivery and bounce over attempts; complaints and unique rates over delivered. '
                     f'Raw events: {se.get("opened_events", 0)} opens, {se.get("clicked_events", 0)} clicks '
                     f'(not used as rates). {se.get("fixture_events_excluded", 0)} fixture events excluded.</p>')
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

    def nl_block(nl):
        if not nl:
            return ''
        # The card header already names the site, so the stat says just "active".
        return (f'<div class="stat"><b>{nl.get("active", 0)}</b><span>active</span></div>'
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
    td.mailact{width:1%;white-space:nowrap;text-align:right}
    button.mdone,button.mundo{font:inherit;font-size:11px;cursor:pointer;padding:2px 8px;
      border:1px solid var(--line,#ccc);border-radius:4px;background:transparent;color:inherit;opacity:.65}
    button.mdone:hover,button.mundo:hover{opacity:1}
    button.mdone[disabled],button.mundo[disabled]{opacity:.3;cursor:default}
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

    /* ── Executive layer ── */
    .exec{border-radius:14px;padding:20px 22px;margin-bottom:18px;border:1px solid var(--line);
      background:var(--card);border-left-width:6px}
    .exec.st-green{border-left-color:var(--green)} .exec.st-blue{border-left-color:var(--blue)}
    .exec.st-amber{border-left-color:var(--amber)} .exec.st-red{border-left-color:var(--red)}
    .exec-status{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
      margin-bottom:10px}
    .exec.st-green .exec-status{color:var(--green)} .exec.st-blue .exec-status{color:var(--blue)}
    .exec.st-amber .exec-status{color:var(--amber)} .exec.st-red .exec-status{color:var(--red)}
    .exec-brief{font-size:17px;line-height:1.62;max-width:76ch}
    .col-sub{color:var(--muted);font-size:12px;margin:2px 0 6px}
    ul.plain{list-style:none} ul.plain li{padding:6px 0;border-bottom:1px solid var(--line);font-size:14px}
    ul.plain li:last-child{border-bottom:none}
    .col-interp{border-top:3px solid var(--blue)}
    .col-watch{border-top:3px solid var(--amber)}
    .col-action{border-top:3px solid var(--green)}
    .col-rev{border-top:3px solid var(--green)}
    .col-att{border-top:3px solid var(--red)}
    .col-ok{border-top:3px solid var(--green)}
    .col-dno{border-top:3px solid var(--amber);background:var(--card2)}
    .chg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
    .chg{background:var(--card2);border-radius:9px;padding:9px 11px;border-left:3px solid var(--muted)}
    .chg.up{border-left-color:var(--green)} .chg.down{border-left-color:var(--red)}
    .chg-label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .chg-vals{font-size:15px;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-top:3px}
    .chg-vals .was{color:var(--muted)} .chg-vals .arrow{color:var(--muted)}
    .chg-vals .abs{color:var(--muted);font-size:12px}
    .chg .pct{font-weight:700;font-size:13px}
    .chg.up .pct{color:var(--green)} .chg.down .pct{color:var(--red)}
    .chg-note{font-size:11.5px;color:var(--amber);margin-top:4px}
    .caveat{color:var(--amber);font-size:12.5px;margin-top:8px;line-height:1.45}
    .caveat-inline{color:var(--amber);font-size:12px}
    .leak{background:rgba(248,113,113,.09);border-left:3px solid var(--red);padding:8px 10px;
      border-radius:6px;font-size:13.5px;margin-bottom:10px}
    .tag{font-size:10px;text-transform:uppercase;letter-spacing:.06em;padding:1px 6px;
      border-radius:5px;font-weight:700;vertical-align:middle}
    .tag-ok{background:rgba(74,222,128,.15);color:var(--green)}
    .tag-inf{background:rgba(251,191,36,.15);color:var(--amber)}
    .tag-na{background:rgba(139,145,160,.15);color:var(--muted)}
    .tag-decision{background:rgba(96,165,250,.15);color:var(--blue)}
    .tag-status{background:rgba(74,222,128,.15);color:var(--green)}
    .tag-commit{background:rgba(139,145,160,.15);color:var(--muted)}
    .fstage.impossible .fbar{background:var(--red)!important}
    table.score td.num,table.score th.num{text-align:right}
    table.score td{font-size:13.5px}
    .att .col-sub{margin-left:22px}
    .exp{background:var(--card2);border-radius:9px;padding:11px 13px;margin-bottom:10px;
      border-left:3px solid var(--muted)}
    .exp.exp-lock{border-left-color:var(--amber)} .exp.exp-read{border-left-color:var(--green)}
    .exp-status{font-weight:800;font-size:12px;letter-spacing:.06em;margin-top:7px}
    .exp-lock .exp-status{color:var(--amber)} .exp-read .exp-status{color:var(--green)}
    .forensic{margin-top:8px;border-top:1px solid var(--line);padding-top:18px}
    .forensic>summary{font-size:15px;font-weight:700;cursor:pointer;color:var(--text);
      padding:12px 0;list-style:none}
    .forensic>summary::before{content:'▸ ';color:var(--muted)}
    .forensic[open]>summary::before{content:'▾ '}
    .statusbar{font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;
      text-transform:uppercase;letter-spacing:.06em}
    .statusbar.st-green{background:rgba(74,222,128,.15);color:var(--green)}
    .statusbar.st-blue{background:rgba(96,165,250,.15);color:var(--blue)}
    .statusbar.st-amber{background:rgba(251,191,36,.15);color:var(--amber)}
    .statusbar.st-red{background:rgba(248,113,113,.15);color:var(--red)}
    @media(max-width:640px){
      .exec-brief{font-size:15.5px}
      main{padding:14px}
      .chg-grid{grid-template-columns:1fr}
      header{padding:10px 14px}
      nav a{margin-right:10px;display:inline-block;padding:2px 0}
    }
    '''

    html = f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Command Center — CW + KD</title><style>{css}</style></head>
<body>
<header><h1>🎛️ Command Center</h1>
<span class="statusbar {STATUS_CLASS.get((d.get('executive') or {}).get('status', 'blue'), 'st-blue')}">
{(d.get('executive') or {}).get('status_icon', '')} {esc((d.get('executive') or {}).get('status_label', ''))}</span>
<span class="upd">Updated {esc(d["meta"]["generated_at"])} PT</span>
<nav><a href="#brief">Brief</a><a href="#changed">What changed</a><a href="#money">Revenue</a>
<a href="#scorecard">Scorecard</a><a href="#funnel">Funnel</a><a href="#signal">Signal</a>
<a href="#timeline">Timeline</a><a href="#quality">Data</a><a href="#forensic">Detail</a></nav></header>
<main>

<section id="brief"><h2>Executive brief</h2>
{exec_html(d)}
<div class="grid">{interp_html(d)}</div>
</section>

<section id="changed"><h2>What changed</h2>
<div class="grid">{changes_html(d)}</div>
</section>

<section id="money"><h2>Revenue &amp; what needs attention</h2>
<div class="grid">
{revenue_exec_html(d)}
{attention_html(d)}
{dont_overreact_html(d)}
{customer_signal_html(d)}
</div></section>

<section id="scorecard"><h2>Business scorecard</h2>
<div class="grid">
{scorecard_html(d, 'cw', 'Carnivore Weekly', 'var(--green)')}
{scorecard_html(d, 'kd', 'KetoDial', 'var(--blue)')}
</div></section>

<section id="funnel"><h2>Paid funnel &amp; active experiment</h2>
<div class="grid">
{paid_funnel_html(d)}
{experiments_html(d)}
</div></section>

<section id="signal"><h2>Signal vs noise</h2>
<div class="grid">{signal_html(d)}</div></section>

<section id="timeline"><h2>Change correlation</h2>
<div class="grid">{timeline_html(d)}</div></section>

<section id="quality"><h2>Data quality</h2>
<div class="grid">{data_quality_html(d)}</div></section>

<details class="forensic" id="forensic"><summary>Forensic detail — every source, unchanged</summary>

<section id="review"><h2>Plain-English Review <span class="small">(model opinion, separate from the deterministic brief above)</span></h2>
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

<section id="traffic"><h2>Traffic <span class="small">(GA4, 7 complete days vs the 7 before)</span></h2>
<div class="grid">
{traffic_card('Carnivore Weekly', d['traffic'].get('cw'), 'var(--green)')}
{traffic_card('KetoDial', d['traffic'].get('kd'), 'var(--blue)')}
</div></section>

<section id="search"><h2>Search — Google &amp; Bing</h2>
<div class="grid">
{search_card('Google · Carnivore Weekly', d['search'].get('cw'), 'var(--green)')}
{search_card('Google · KetoDial', d['search'].get('kd'), 'var(--blue)')}
{bing_card('Bing · Carnivore Weekly', d['search'].get('bing_cw'))}
{bing_card('Bing · KetoDial', d['search'].get('bing_kd'))}
</div></section>

<section id="funnels"><h2>Calculator states, drip, newsletter, coach</h2>
<div class="grid">
<div class="card"><h3 style="border-color:var(--green)">CW calculator states <span class="muted small">(30d)</span></h3>
{funnel_html(f.get('calculator_cw'), 'var(--green)')}</div>
<div class="card"><h3 style="border-color:var(--blue)">KD calculator states <span class="muted small">(30d)</span></h3>
{funnel_html(f.get('calculator_kd'), 'var(--blue)')}</div>
<div class="card"><h3 style="border-color:var(--green)">30-Day Drip (CW)</h3>{drip_cw_html or err_note(f, 'Funnels') or ''}</div>
<div class="card"><h3 style="border-color:var(--blue)">30-Day Drip (KD)</h3>{drip_kd_html or err_note(f, 'Funnels') or ''}</div>
<div class="card"><h3 style="border-color:var(--green)">Newsletter (CW)</h3><div class="statrow wrap">{nl_block(nl_cw)}</div></div>
<div class="card"><h3 style="border-color:var(--blue)">Newsletter (KD)</h3><div class="statrow wrap">{nl_block(nl_kd)}</div></div>
<div class="card"><h3>Coach (KD)</h3>{coach_html}</div>
</div></section>

<section id="demographics"><h2>Calculator Demographics</h2>
<div class="grid">
{demo_card('CW Calculator', d['demographics'].get('cw') if not d['demographics'].get('error') else d['demographics'], 'var(--green)')}
{demo_card('KD Calculator', d['demographics'].get('kd') if not d['demographics'].get('error') else d['demographics'], 'var(--blue)')}
</div></section>

<section id="mail"><h2>Mail &amp; Feedback</h2>
<div class="grid">
<div class="card"><h3>Inbound Mail <span class="muted small">(@carnivoreweekly.com · {mail.get('inbound_7d', 0)} total this week)</span></h3>
{mail_html}
</div>
<div class="card"><h3>Site Feedback <span class="muted small">({fb.get('new_7d', 0)} new this week · {fb.get('unreviewed', 0)} unreviewed · {fb.get('hidden_test', 0)} test entries hidden)</span></h3>
{table(['Date', 'From', 'Message', 'Status'], fb_open_rows) if fb_open_rows else (err_note(fb, 'Feedback') or '<p class="muted">No open feedback — all caught up.</p>')}
{f'<details><summary>{len(fb_done_rows)} completed item(s), last 30 days</summary>{table(["Date", "From", "Message", "Status"], fb_done_rows)}</details>' if fb_done_rows else ''}
{f'<p class="muted small">{fb_aged_off} older completed item(s) aged off this view.</p>' if fb_aged_off > 0 else ''}
</div>
<div class="card"><h3>Email Engagement <span class="muted small">(drip + newsletter, 7d)</span></h3>
{eng_html or err_note(eng, 'Engagement') or ''}</div>
</div></section>

<section id="revenue"><h2>Revenue detail</h2>
<div class="card">{rev_html}</div></section>

<section id="etsy"><h2>Etsy Shop <span class="small">(daily snapshot · reviews + conversion)</span></h2>
<div class="grid">{etsy_card(d.get('etsy'))}</div></section>

</details>

<p class="muted small">Generated by dashboard/generate_command_center.py · data in command-center-data.json ·
auto-updates daily via GitHub Actions (dashboard-update.yml) · run manually any time:
<code>python3 dashboard/generate_command_center.py</code></p>
</main>{MAIL_SCRIPT}</body></html>'''
    return html


def push_to_nas(html, data):
    """Publish to the NAS deck: a stable /live/ URL plus a dated archive copy.

    Called BEFORE the email so the link is already live when the mail lands.
    Only the two files written here go in the tar — index.html, artifacts/,
    data/ and server.py on the NAS are never touched.
    """
    dated = f'command-center-{data["meta"]["generated_date"]}.html'
    try:
        with tempfile.TemporaryDirectory() as tmp:
            live = os.path.join(tmp, 'public', 'live')
            reports = os.path.join(tmp, 'public', 'reports')
            os.makedirs(live)
            os.makedirs(reports)
            for path in (os.path.join(live, 'command-center.html'),
                         os.path.join(reports, dated)):
                with open(path, 'w') as fh:
                    fh.write(html)
            subprocess.run(
                ['sh', '-c',
                 f'tar czf - -C "{tmp}" public | '
                 f'ssh -o ConnectTimeout=15 -o BatchMode=yes {NAS_HOST} '
                 f'"cd {NAS_ROOT} && tar xzf -"'],
                check=True, capture_output=True, timeout=180)
        print(f'  NAS updated -> {NAS_BASE_URL}/live/command-center.html')
        return True
    except Exception as e:
        detail = getattr(e, 'stderr', b'') or str(e).encode()
        print(f'  NAS push FAILED: {detail.decode(errors="replace")[:300]}')
        return False


def email_report(data, html, nas_ok=False):
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
    # Command Centre 2.0: the email opens with the same deterministic verdict
    # the page opens with, so a phone read and a desktop read agree.
    ex = data.get('executive') or {}
    ex_color = {'green': '#16a34a', 'blue': '#2563eb', 'amber': '#d97706', 'red': '#dc2626'}
    exec_html_block = ''
    if ex:
        sentences = ' '.join(esc(b) for b in ex.get('brief', []))
        acts = ''.join(f'<li>{esc(a)}</li>' for a in ex.get('suggested_action', []))
        dno = ''.join(f'<li>{esc(a)}</li>' for a in (data.get('dont_overreact') or []))
        exec_html_block = (
            f'<div style="border:1px solid #e5e7eb;border-left:6px solid '
            f'{ex_color.get(ex.get("status"), "#2563eb")};border-radius:10px;padding:14px 16px;'
            f'margin:0 0 16px;background:#fafafa">'
            f'<p style="margin:0 0 8px;font-size:12px;font-weight:800;text-transform:uppercase;'
            f'letter-spacing:.08em;color:{ex_color.get(ex.get("status"), "#2563eb")}">'
            f'{ex.get("status_icon", "")} {esc(ex.get("status_label", ""))}</p>'
            f'<p style="margin:0 0 10px;font-size:15px;line-height:1.6">{sentences}</p>'
            f'{f"<p style=\'margin:0 0 4px;font-size:12px;color:#555;font-weight:700\'>SUGGESTED ACTION</p><ul style=\'margin:0 0 10px;padding-left:18px;font-size:14px\'>{acts}</ul>" if acts else ""}'
            f'{f"<p style=\'margin:0 0 4px;font-size:12px;color:#555;font-weight:700\'>DO NOT OVERREACT TO</p><ul style=\'margin:0;padding-left:18px;font-size:13px;color:#555\'>{dno}</ul>" if dno else ""}'
            f'</div>')

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
        # Gross and net are both shown, and the target is named as NET, because
        # "$201 pace vs $1k target" compared two different quantities.
        rx = data.get('revenue_exec') or {}
        pace_html = (f'<p style="margin:0 0 12px;padding:8px 12px;background:#f0fdf4;'
                     f'border-left:4px solid #16a34a;border-radius:4px;font-size:14px">'
                     f'💰 MTD <b>${rev["mtd"]["gross"]:.2f}</b> gross · '
                     f'<b>${rev["mtd"]["net"]:.2f}</b> net of refunds · '
                     f'{rx.get("target_pct", 0):.0f}% of the <b>$1,000/mo NET</b> target · '
                     f'{rev.get("days_left_in_month", "?")} days left. '
                     f'<span style="color:#666;font-size:12px">Net here excludes processor fees '
                     f'and COGS, which are not fed in.</span></p>')

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

    # Link first, attachment second. Apple Mail drops attachments into its own
    # sandboxed container, and macOS blocks file:// reads there — the link is the
    # copy that actually opens (2026-08-28).
    if nas_ok:
        nas_html = (f'<p style="margin:0 0 16px"><a href="{NAS_BASE_URL}/live/command-center.html" '
                    f'style="color:#0b57d0;font-weight:600">Open the full dashboard</a> '
                    f'<span style="color:#889">(on the NAS deck, also attached below)</span></p>')
    else:
        nas_html = ('<p style="color:#667;margin:0 0 16px">Full interactive dashboard attached '
                    '(open in a browser). NAS copy unavailable this run.</p>')
    body = f'''<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;
      margin:0 auto;color:#1a1a1a;font-size:15px;line-height:1.5">
      <h2 style="margin:0 0 4px">🎛️ Command Center — {esc(data['meta']['generated_date'])}</h2>
      {nas_html}
      {exec_html_block}
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
              'subject': (f'{ex.get("status_icon", "🎛️")} Command Center — '
                          f'{data["meta"]["generated_date"]}'
                          + (f' · {ex["status_label"]}' if ex.get('status_label') else '')
                          + (f' · {focus}' if focus else '')),
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
                    help='Also email the report to Brew via Resend')
    ap.add_argument('--nas', action='store_true',
                    help='Publish to the NAS deck before emailing (Mac cron only)')
    args = ap.parse_args()

    if not get_service_role_key():
        print('WARNING: no SUPABASE_SERVICE_ROLE_KEY (env or .env) — Supabase sections will fail.')

    data = collect(use_model=not args.no_model)

    html = render_html(data)
    with open(DATA_OUT, 'w') as fh:
        json.dump(data, fh, indent=1, default=str)
    with open(HTML_OUT, 'w') as fh:
        fh.write(html)
    nas_ok = push_to_nas(html, data) if args.nas else False
    if args.email:
        email_report(data, html, nas_ok=nas_ok)
    print(f'Done → {HTML_OUT}')


if __name__ == '__main__':
    main()

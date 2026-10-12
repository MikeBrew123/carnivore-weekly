#!/usr/bin/env python3
"""Per-site GA4 + Search Console snapshot for the Live Site Pulse artifact.

Prints one JSON object keyed by site (cw/kd/pd). Read-only: no writes anywhere.
Usage: python3 dashboard/pulse_snapshot.py
"""
import json
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest
from google.oauth2 import service_account
from googleapiclient.discovery import build

HERE = os.path.dirname(os.path.abspath(__file__))
CREDS = os.path.join(HERE, 'ga4-credentials.json')
SITES = {
    'cw': ('properties/517632328', 'sc-domain:carnivoreweekly.com'),
    'kd': ('properties/539655784', 'https://ketodial.com/'),
    'pd': ('properties/557125657', 'sc-domain:pescodial.com'),
}
# GSC data lags about 2 days; end the windows there so the last bars are not empty.
GSC_END = date.today() - timedelta(days=2)


def ga4(client, prop):
    def run(dims, start, end):
        r = client.run_report(RunReportRequest(
            property=prop, dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name='sessions'), Metric(name='activeUsers')],
            date_ranges=[DateRange(start_date=start, end_date=end)]))
        return r.rows
    def channels():
        r = client.run_report(RunReportRequest(
            property=prop, dimensions=[Dimension(name='date'), Dimension(name='sessionDefaultChannelGroup')],
            metrics=[Metric(name='sessions')], limit=1000,
            date_ranges=[DateRange(start_date='13daysAgo', end_date='today')]))
        return [{'d': x.dimension_values[0].value, 'ch': x.dimension_values[1].value, 'c': int(x.metric_values[0].value)}
                for x in r.rows]
    d28 = run([], '27daysAgo', 'today')
    cur = run([], '7daysAgo', 'today')
    prev = run([], '14daysAgo', '8daysAgo')
    daily = run(['date'], '13daysAgo', 'today')
    g = lambda rows, i: int(rows[0].metric_values[i].value) if rows else 0
    return {
        'sessions_28d': g(d28, 0), 'channels': channels(),
        'sessions_7d': g(cur, 0), 'sessions_prev7d': g(prev, 0), 'users_7d': g(cur, 1),
        'daily': sorted([{'d': r.dimension_values[0].value, 'c': int(r.metric_values[0].value)} for r in daily],
                        key=lambda x: x['d']),
    }


def gsc(api, site):
    def q(start, end, dims=None, limit=25):
        body = {'startDate': str(start), 'endDate': str(end), 'rowLimit': limit}
        if dims:
            body['dimensions'] = dims
        return api.searchanalytics().query(siteUrl=site, body=body).execute().get('rows', [])
    def tot(start, end):
        rows = q(start, end)
        return rows[0] if rows else {'clicks': 0, 'impressions': 0, 'position': 0}
    cur = tot(GSC_END - timedelta(days=6), GSC_END)
    prev = tot(GSC_END - timedelta(days=13), GSC_END - timedelta(days=7))
    daily = q(GSC_END - timedelta(days=13), GSC_END, ['date'])
    t28 = tot(GSC_END - timedelta(days=27), GSC_END)
    pages = q(GSC_END - timedelta(days=27), GSC_END, ['page'], limit=250)
    return {
        'clicks_28d': int(t28['clicks']), 'impr_28d': int(t28['impressions']),
        'pages': [{'p': r['keys'][0], 'c': int(r['clicks']), 'i': int(r['impressions']), 'pos': round(r['position'], 1)}
                  for r in pages],
        'clicks_7d': int(cur['clicks']), 'clicks_prev7d': int(prev['clicks']),
        'impr_7d': int(cur['impressions']), 'impr_prev7d': int(prev['impressions']),
        'pos_7d': round(cur['position'], 1), 'pos_prev7d': round(prev['position'], 1),
        'daily': [{'d': r['keys'][0], 'c': int(r['clicks'])} for r in sorted(daily, key=lambda r: r['keys'][0])],
        'through': str(GSC_END),
    }


def main():
    creds = service_account.Credentials.from_service_account_file(
        CREDS, scopes=['https://www.googleapis.com/auth/analytics.readonly',
                       'https://www.googleapis.com/auth/webmasters.readonly'])
    client = BetaAnalyticsDataClient(credentials=creds)
    api = build('searchconsole', 'v1', credentials=creds, cache_discovery=False)
    out = {}
    for key, (prop, site) in SITES.items():
        out[key] = {}
        for name, fn, arg in (('ga4', ga4, (client, prop)), ('gsc', gsc, (api, site))):
            try:
                out[key][name] = fn(*arg)
            except Exception as e:  # keep the other source if one fails
                out[key][name] = {'error': str(e)[:200]}
    if '--push' in sys.argv:
        push(out)
    else:
        print(json.dumps(out))


def push(out):
    """Upsert one row per (site, source) into site_pulse_snapshot via PostgREST."""
    env = {}
    for line in open(os.path.join(HERE, '.env')):
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v.strip().strip('"\'')
    rows = [{'site': s, 'source': n, 'payload': p, 'fetched_at': datetime.now(timezone.utc).isoformat()}
            for s, srcs in out.items() for n, p in srcs.items() if 'error' not in p]
    req = urllib.request.Request(
        env['SUPABASE_URL'].rstrip('/') + '/rest/v1/site_pulse_snapshot?on_conflict=site,source',
        data=json.dumps(rows).encode(), method='POST',
        headers={'apikey': env['SUPABASE_SERVICE_ROLE_KEY'],
                 'Authorization': 'Bearer ' + env['SUPABASE_SERVICE_ROLE_KEY'],
                 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    urllib.request.urlopen(req, timeout=30)
    print(f'pushed {len(rows)} rows; skipped {sum(1 for s in out.values() for p in s.values() if "error" in p)} with errors')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Update the CW + KD Daily Dashboard Google Sheet.
Pulls data from Supabase, GA4, and GSC, writes to all tabs + charts.

Run: python3 scripts/update_dashboard_sheet.py
Schedule: cron at 5 AM EST, also runs on boot
"""

import json
import os
import sys
import urllib.request
from datetime import date, datetime, timedelta

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange, Dimension, Metric, OrderBy, RunReportRequest,
)
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
CREDS_PATH = os.path.join(PROJECT_ROOT, 'dashboard', 'ga4-credentials.json')

SPREADSHEET_ID = '1tsEPlB4ZXzc9LY8ZIv4msf-AUti3q6Bb8abKor119Wk'
SUPABASE_PROJECT_ID = 'kwtdpvnjewtahuxjyltn'
CW_GA4_PROPERTY = 'properties/517632328'
KD_GA4_PROPERTY = 'properties/539655784'
GSC_CW_SITE = 'sc-domain:carnivoreweekly.com'
GSC_KD_SITE = 'https://ketodial.com/'

creds_sheets = service_account.Credentials.from_service_account_file(
    CREDS_PATH, scopes=['https://www.googleapis.com/auth/spreadsheets']
)
creds_analytics = service_account.Credentials.from_service_account_file(
    CREDS_PATH, scopes=['https://www.googleapis.com/auth/analytics.readonly']
)
creds_gsc = service_account.Credentials.from_service_account_file(
    CREDS_PATH, scopes=['https://www.googleapis.com/auth/webmasters.readonly']
)

sheets_api = build('sheets', 'v4', credentials=creds_sheets)
ga4_client = BetaAnalyticsDataClient(credentials=creds_analytics)
gsc_api = build('searchconsole', 'v1', credentials=creds_gsc)

NOW = datetime.now().strftime('%Y-%m-%d %H:%M')
TODAY = date.today()

# Colors
WHITE = {'red': 1, 'green': 1, 'blue': 1}
DARK = {'red': 0.13, 'green': 0.13, 'blue': 0.13}
GREEN_DARK = {'red': 0.09, 'green': 0.36, 'blue': 0.18}
GREEN_LIGHT = {'red': 0.85, 'green': 0.93, 'blue': 0.87}
BLUE_DARK = {'red': 0.10, 'green': 0.27, 'blue': 0.50}
BLUE_LIGHT = {'red': 0.85, 'green': 0.91, 'blue': 0.97}
GRAY_LIGHT = {'red': 0.95, 'green': 0.95, 'blue': 0.95}
GRAY_MED = {'red': 0.88, 'green': 0.88, 'blue': 0.88}


# ── Helpers ──

def write_sheet(range_name, values):
    sheets_api.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID, range=range_name,
        valueInputOption='USER_ENTERED', body={'values': values},
    ).execute()


def clear_sheet(range_name):
    sheets_api.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID, range=range_name, body={},
    ).execute()


def get_values(range_name):
    result = sheets_api.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range=range_name,
    ).execute()
    return result.get('values', [])


def _get_service_role_key():
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not key:
        env_path = os.path.join(PROJECT_ROOT, '.env')
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                        key = line.split('=', 1)[1].strip().strip('"').strip("'")
    return key


def supa_fetch(table, select='*', filters='', limit=100):
    key = _get_service_role_key()
    if not key:
        return []
    url = f"https://{SUPABASE_PROJECT_ID}.supabase.co/rest/v1/{table}?select={select}&limit={limit}"
    if filters:
        url += f"&{filters}"
    req = urllib.request.Request(url, headers={
        'apikey': key, 'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  Supabase error ({table}): {e}")
        return []


def supa_count(table, filters=''):
    key = _get_service_role_key()
    if not key:
        return 0
    url = f"https://{SUPABASE_PROJECT_ID}.supabase.co/rest/v1/{table}?select=id&{filters}&limit=500"
    req = urllib.request.Request(url, headers={
        'apikey': key, 'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json', 'Prefer': 'count=exact',
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            count = resp.headers.get('content-range', '').split('/')[-1]
            return int(count) if count and count != '*' else len(json.loads(resp.read()))
    except Exception:
        return 0


def ga4_report(property_id, dimensions, metrics, days=1, limit=25):
    resp = ga4_client.run_report(RunReportRequest(
        property=property_id,
        date_ranges=[DateRange(start_date=f'{days}daysAgo', end_date='today')],
        dimensions=[Dimension(name=d) for d in dimensions],
        metrics=[Metric(name=m) for m in metrics],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name=metrics[0]), desc=True)],
        limit=limit,
    ))
    return [
        [dv.value for dv in row.dimension_values] + [mv.value for mv in row.metric_values]
        for row in resp.rows
    ]


def ga4_totals(property_id, days=1):
    resp = ga4_client.run_report(RunReportRequest(
        property=property_id,
        date_ranges=[DateRange(start_date=f'{days}daysAgo', end_date='today')],
        metrics=[
            Metric(name='sessions'), Metric(name='totalUsers'),
            Metric(name='newUsers'), Metric(name='screenPageViews'),
            Metric(name='averageSessionDuration'), Metric(name='bounceRate'),
            Metric(name='engagedSessions'),
        ],
    ))
    if resp.rows:
        v = resp.rows[0].metric_values
        return {
            'sessions': v[0].value, 'users': v[1].value, 'new_users': v[2].value,
            'pageviews': v[3].value, 'avg_duration': f"{float(v[4].value):.0f}s",
            'bounce_rate': f"{float(v[5].value)*100:.1f}%", 'engaged': v[6].value,
        }
    return {}


def ga4_period_compare(property_id):
    keys = ['sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'bounceRate', 'engagedSessions']
    resp = ga4_client.run_report(RunReportRequest(
        property=property_id,
        date_ranges=[
            DateRange(start_date='7daysAgo', end_date='today'),
            DateRange(start_date='14daysAgo', end_date='8daysAgo'),
        ],
        metrics=[Metric(name=m) for m in keys],
    ))
    cur = [float(v.value) for v in resp.rows[0].metric_values] if resp.rows else [0] * 6
    prev = [float(v.value) for v in resp.rows[1].metric_values] if len(resp.rows) > 1 else [0] * 6
    return dict(zip(keys, zip(cur, prev)))


def ga4_daily(property_id, days=14):
    resp = ga4_client.run_report(RunReportRequest(
        property=property_id,
        date_ranges=[DateRange(start_date=f'{days}daysAgo', end_date='today')],
        dimensions=[Dimension(name='date')],
        metrics=[Metric(name='sessions'), Metric(name='totalUsers'), Metric(name='screenPageViews')],
        order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name='date'))],
    ))
    return [
        [f"{r.dimension_values[0].value[:4]}-{r.dimension_values[0].value[4:6]}-{r.dimension_values[0].value[6:]}",
         int(r.metric_values[0].value), int(r.metric_values[1].value), int(r.metric_values[2].value)]
        for r in resp.rows
    ]


def ga4_dimension(property_id, dim, days=7):
    resp = ga4_client.run_report(RunReportRequest(
        property=property_id,
        date_ranges=[DateRange(start_date=f'{days}daysAgo', end_date='today')],
        dimensions=[Dimension(name=dim)],
        metrics=[Metric(name='sessions')],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name='sessions'), desc=True)],
        limit=8,
    ))
    return [[r.dimension_values[0].value, int(r.metric_values[0].value)] for r in resp.rows]


def gsc_data(site_url, days=7):
    end = TODAY - timedelta(days=1)
    start = end - timedelta(days=days)
    results = {'queries': [], 'pages': [], 'totals': {}}
    for dim_type in ['query', 'page']:
        try:
            resp = gsc_api.searchanalytics().query(siteUrl=site_url, body={
                'startDate': str(start), 'endDate': str(end),
                'dimensions': [dim_type], 'rowLimit': 25,
            }).execute()
            key = 'queries' if dim_type == 'query' else 'pages'
            results[key] = [
                [r['keys'][0], r['clicks'], r['impressions'],
                 f"{r['ctr']*100:.1f}%", f"{r['position']:.1f}"]
                for r in resp.get('rows', [])
            ]
        except Exception:
            pass
    try:
        resp = gsc_api.searchanalytics().query(siteUrl=site_url, body={
            'startDate': str(start), 'endDate': str(end),
        }).execute()
        for r in resp.get('rows', []):
            results['totals'] = {
                'clicks': r['clicks'], 'impressions': r['impressions'],
                'ctr': f"{r['ctr']*100:.1f}%", 'position': f"{r['position']:.1f}",
            }
    except Exception:
        pass
    return results


def arrow(current, previous, invert=False):
    if previous == 0:
        return '➖'
    pct = ((current - previous) / previous) * 100
    if invert:
        pct = -pct
    if pct > 5:
        return f'🟢 ▲ {abs(pct):.0f}%'
    elif pct < -5:
        return f'🔴 ▼ {abs(pct):.0f}%'
    return f'⚪ ➖ {abs(pct):.0f}%'


# ── Tab updaters ──

def update_dashboard():
    print("  Dashboard...")
    cw = ga4_period_compare(CW_GA4_PROPERTY)
    kd = ga4_period_compare(KD_GA4_PROPERTY)
    cw_gsc = gsc_data(GSC_CW_SITE)
    kd_gsc = gsc_data(GSC_KD_SITE)

    d7 = (TODAY - timedelta(days=7)).isoformat()
    d14 = (TODAY - timedelta(days=14)).isoformat()
    d8 = (TODAY - timedelta(days=8)).isoformat()

    data = []
    data.append(['CW + KD Daily Dashboard', '', '', '', '', f'Updated: {NOW}'])
    data.append([])
    data.append(['', 'CW (7d)', 'Prior 7d', 'Trend', '', 'KD (7d)', 'Prior 7d', 'Trend'])

    for label, key, invert in [
        ('Sessions', 'sessions', False), ('Users', 'totalUsers', False),
        ('New Users', 'newUsers', False), ('Pageviews', 'screenPageViews', False),
        ('Bounce Rate', 'bounceRate', True), ('Engaged Sessions', 'engagedSessions', False),
    ]:
        cw_c, cw_p = cw.get(key, (0, 0))
        kd_c, kd_p = kd.get(key, (0, 0))
        fmt = (lambda v: f"{v*100:.1f}%") if key == 'bounceRate' else (lambda v: f"{int(v)}")
        data.append([label, fmt(cw_c), fmt(cw_p), arrow(cw_c, cw_p, invert),
                      '', fmt(kd_c), fmt(kd_p), arrow(kd_c, kd_p, invert)])

    data.append([])

    # GSC
    cw_t = cw_gsc.get('totals', {})
    kd_t = kd_gsc.get('totals', {})
    data.append(['SEARCH (7d)', 'CW', '', 'Trend', '', 'KD', '', 'Trend'])
    data.append(['Clicks', cw_t.get('clicks', 0), '', '', '', kd_t.get('clicks', 0)])
    data.append(['Impressions', cw_t.get('impressions', 0), '', '', '', kd_t.get('impressions', 0)])
    data.append(['CTR', cw_t.get('ctr', ''), '', '', '', kd_t.get('ctr', '')])
    data.append(['Avg Position', cw_t.get('position', ''), '', '', '', kd_t.get('position', '')])
    data.append([])

    # Calculator
    data.append(['CALCULATORS (7d)', 'This 7d', 'Prior 7d', 'Trend', '', 'This 7d', 'Prior 7d', 'Trend'])
    cw_c7 = supa_count('calculator_sessions_v2', f'source=eq.cw&created_at=gte.{d7}')
    cw_cp = supa_count('calculator_sessions_v2', f'source=eq.cw&created_at=gte.{d14}&created_at=lt.{d8}')
    kd_c7 = supa_count('calculator_sessions_v2', f'source=eq.ketodial&created_at=gte.{d7}')
    kd_cp = supa_count('calculator_sessions_v2', f'source=eq.ketodial&created_at=gte.{d14}&created_at=lt.{d8}')
    data.append(['CW Calculator', str(cw_c7), str(cw_cp), arrow(cw_c7, cw_cp)])
    data.append(['KD Calculator', '', '', '', '', str(kd_c7), str(kd_cp), arrow(kd_c7, kd_cp)])
    data.append([])

    # Newsletter
    s7 = supa_count('newsletter_subscribers', f'created_at=gte.{d7}')
    sp = supa_count('newsletter_subscribers', f'created_at=gte.{d14}&created_at=lt.{d8}')
    data.append(['NEWSLETTER', 'This 7d', 'Prior 7d', 'Trend'])
    data.append(['New Subscribers', str(s7), str(sp), arrow(s7, sp)])

    clear_sheet("'Dashboard'!A:H")
    write_sheet("'Dashboard'!A1", data)
    return data


def update_calculator_tab(sheet_name, source_filter):
    print(f"  {sheet_name}...")
    rows = supa_fetch(
        'calculator_sessions_v2',
        select='created_at,goal,diet_type,step_completed,is_premium,payment_status,source,referrer,device_type',
        filters=f'source=eq.{source_filter}&order=created_at.desc',
        limit=50,
    )
    header = ['Date', 'Goal', 'Diet Type', 'Step', 'Premium', 'Payment', 'Source', 'Referrer', 'Device']
    data = [header]
    for r in rows:
        data.append([
            r.get('created_at', '')[:16], r.get('goal', ''), r.get('diet_type', ''),
            str(r.get('step_completed', '')), str(r.get('is_premium', '')),
            r.get('payment_status', ''), r.get('source', ''),
            (r.get('referrer', '') or '')[:60], r.get('device_type', ''),
        ])
    clear_sheet(f"'{sheet_name}'!A:I")
    write_sheet(f"'{sheet_name}'!A1", data)
    return len(rows)


def update_traffic(sheet_name, ga4_property, label):
    print(f"  {label} Traffic...")
    totals_1d = ga4_totals(ga4_property, days=1)
    totals_7d = ga4_totals(ga4_property, days=7)
    pages = ga4_report(ga4_property, ['pagePath'], ['screenPageViews', 'sessions'], days=1)
    sources = ga4_report(ga4_property, ['sessionSourceMedium'], ['sessions', 'totalUsers'], days=1)
    devices = ga4_report(ga4_property, ['deviceCategory'], ['sessions', 'totalUsers'], days=1)
    countries = ga4_report(ga4_property, ['country'], ['sessions', 'totalUsers'], days=1, limit=10)
    events = ga4_report(ga4_property, ['eventName'], ['eventCount'], days=1, limit=15)

    data = [[f'{label} Traffic — Last 24h', '', f'Updated: {NOW}'], []]
    data.append(['Metric', '24h', '7d'])
    for key in ['sessions', 'users', 'new_users', 'pageviews', 'avg_duration', 'bounce_rate', 'engaged']:
        data.append([key.replace('_', ' ').title(), totals_1d.get(key, ''), totals_7d.get(key, '')])
    data.append([])
    for section, rows in [('Top Pages', pages), ('Source / Medium', sources),
                           ('Device', devices), ('Country', countries), ('Event', events)]:
        header = [section, 'Views' if section == 'Top Pages' else ('Count' if section == 'Event' else 'Sessions'),
                  'Sessions' if section == 'Top Pages' else ('', 'Users')[section != 'Event']]
        data.append(header)
        data.extend(rows)
        data.append([])

    clear_sheet(f"'{sheet_name}'!A:C")
    write_sheet(f"'{sheet_name}'!A1", data)


def update_search_console():
    print("  Search Console...")
    cw = gsc_data(GSC_CW_SITE)
    kd = gsc_data(GSC_KD_SITE)

    data = [[f'Search Console — Last 7 Days', '', '', '', f'Updated: {NOW}'], []]

    data.append(['=== CARNIVORE WEEKLY ==='])
    t = cw.get('totals', {})
    data.append(['Clicks', t.get('clicks', 0), 'Impressions', t.get('impressions', 0),
                 'CTR', t.get('ctr', ''), 'Avg Pos', t.get('position', '')])
    data.append([])
    data.append(['Top Queries', 'Clicks', 'Impressions', 'CTR', 'Position'])
    data.extend(cw.get('queries', []))
    data.append([])
    data.append(['Top Pages', 'Clicks', 'Impressions', 'CTR', 'Position'])
    data.extend(cw.get('pages', []))
    data.extend([[], []])

    data.append(['=== KETODIAL ==='])
    t = kd.get('totals', {})
    data.append(['Clicks', t.get('clicks', 0), 'Impressions', t.get('impressions', 0),
                 'CTR', t.get('ctr', ''), 'Avg Pos', t.get('position', '')])
    data.append([])
    data.append(['Top Queries', 'Clicks', 'Impressions', 'CTR', 'Position'])
    data.extend(kd.get('queries', []) or [['(no queries yet)']])
    data.append([])
    data.append(['Top Pages', 'Clicks', 'Impressions', 'CTR', 'Position'])
    data.extend(kd.get('pages', []) or [['(no pages yet)']])

    clear_sheet("'Search Console'!A:H")
    write_sheet("'Search Console'!A1", data)


def update_chart_data():
    print("  Chart data...")
    cw_daily = ga4_daily(CW_GA4_PROPERTY)
    kd_daily = ga4_daily(KD_GA4_PROPERTY)
    cw_devices = ga4_dimension(CW_GA4_PROPERTY, 'deviceCategory')
    kd_devices = ga4_dimension(KD_GA4_PROPERTY, 'deviceCategory')
    cw_sources = ga4_dimension(CW_GA4_PROPERTY, 'sessionSourceMedium')
    kd_sources = ga4_dimension(KD_GA4_PROPERTY, 'sessionSourceMedium')

    cw_dict = {r[0]: r[1:] for r in cw_daily}
    kd_dict = {r[0]: r[1:] for r in kd_daily}
    all_dates = sorted(set(list(cw_dict.keys()) + list(kd_dict.keys())))

    data = [['Date', 'CW Sessions', 'CW Users', 'CW Pageviews', '', 'KD Sessions', 'KD Users', 'KD Pageviews']]
    for d in all_dates:
        c = cw_dict.get(d, [0, 0, 0])
        k = kd_dict.get(d, [0, 0, 0])
        data.append([d, c[0], c[1], c[2], '', k[0], k[1], k[2]])

    data.append([])
    data.append(['CW Devices', 'Sessions', '', 'KD Devices', 'Sessions'])
    for i in range(max(len(cw_devices), len(kd_devices))):
        row = (cw_devices[i] if i < len(cw_devices) else ['', '']) + [''] + \
              (kd_devices[i] if i < len(kd_devices) else ['', ''])
        data.append(row)

    data.append([])
    data.append(['CW Sources', 'Sessions', '', 'KD Sources', 'Sessions'])
    for i in range(max(len(cw_sources), len(kd_sources))):
        row = (cw_sources[i] if i < len(cw_sources) else ['', '']) + [''] + \
              (kd_sources[i] if i < len(kd_sources) else ['', ''])
        data.append(row)

    # Ensure Chart Data tab exists
    meta = sheets_api.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    existing = [s['properties']['title'] for s in meta['sheets']]
    if 'Chart Data' not in existing:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID, body={'requests': [
            {'addSheet': {'properties': {'title': 'Chart Data', 'index': 6}}},
        ]}).execute()

    clear_sheet("'Chart Data'!A:H")
    write_sheet("'Chart Data'!A1", data)
    return len(all_dates), len(cw_devices), len(kd_devices), len(cw_sources), len(kd_sources)


def apply_formatting(dash_data):
    print("  Formatting...")
    meta = sheets_api.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sid = {s['properties']['title']: s['properties']['sheetId'] for s in meta['sheets']}
    reqs = []

    def hdr(sheet_id, end_col, bg):
        reqs.append({'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': 0, 'endRowIndex': 1, 'endColumnIndex': end_col},
            'cell': {'userEnteredFormat': {
                'textFormat': {'bold': True, 'fontSize': 13, 'foregroundColor': WHITE}, 'backgroundColor': bg,
            }}, 'fields': 'userEnteredFormat(textFormat,backgroundColor)',
        }})

    def section(sheet_id, row, end_col, bg):
        reqs.append({'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': row, 'endRowIndex': row + 1, 'endColumnIndex': end_col},
            'cell': {'userEnteredFormat': {
                'textFormat': {'bold': True, 'fontSize': 10, 'foregroundColor': WHITE}, 'backgroundColor': bg,
            }}, 'fields': 'userEnteredFormat(textFormat,backgroundColor)',
        }})

    def sub(sheet_id, row, end_col, bg=GRAY_MED):
        reqs.append({'repeatCell': {
            'range': {'sheetId': sheet_id, 'startRowIndex': row, 'endRowIndex': row + 1, 'endColumnIndex': end_col},
            'cell': {'userEnteredFormat': {
                'textFormat': {'bold': True, 'fontSize': 10}, 'backgroundColor': bg,
            }}, 'fields': 'userEnteredFormat(textFormat,backgroundColor)',
        }})

    def widths(sheet_id, w_list):
        for i, w in enumerate(w_list):
            reqs.append({'updateDimensionProperties': {
                'range': {'sheetId': sheet_id, 'dimension': 'COLUMNS', 'startIndex': i, 'endIndex': i + 1},
                'properties': {'pixelSize': w}, 'fields': 'pixelSize',
            }})

    def freeze(sheet_id, rows=1):
        reqs.append({'updateSheetProperties': {
            'properties': {'sheetId': sheet_id, 'gridProperties': {'frozenRowCount': rows}},
            'fields': 'gridProperties.frozenRowCount',
        }})

    def zebra(sheet_id, start, end, end_col):
        for r in range(start, end):
            if (r - start) % 2 == 0:
                reqs.append({'repeatCell': {
                    'range': {'sheetId': sheet_id, 'startRowIndex': r, 'endRowIndex': r + 1, 'endColumnIndex': end_col},
                    'cell': {'userEnteredFormat': {'backgroundColor': GRAY_LIGHT}},
                    'fields': 'userEnteredFormat.backgroundColor',
                }})

    # Dashboard
    hdr(sid['Dashboard'], 8, GREEN_DARK)
    widths(sid['Dashboard'], [180, 90, 90, 120, 30, 90, 90, 120])
    freeze(sid['Dashboard'])
    for i, row in enumerate(dash_data):
        if not row:
            continue
        txt = str(row[0])
        if txt == '':
            sub(sid['Dashboard'], i, 8, BLUE_LIGHT)
        elif any(k in txt for k in ['SEARCH', 'CALCULATOR', 'NEWSLETTER']):
            section(sid['Dashboard'], i, 8, DARK)

    # Calculator tabs
    for name, bg in [('CW Calculator', GREEN_DARK), ('KD Calculator', BLUE_DARK)]:
        hdr(sid[name], 9, bg)
        widths(sid[name], [140, 80, 90, 50, 70, 80, 60, 300, 70])
        freeze(sid[name])
        vals = get_values(f"'{name}'!A:I")
        if len(vals) > 1:
            zebra(sid[name], 1, len(vals), 9)

    # Traffic tabs
    for name, bg, light in [('CW Traffic', GREEN_DARK, GREEN_LIGHT), ('KD Traffic', BLUE_DARK, BLUE_LIGHT)]:
        hdr(sid[name], 3, bg)
        widths(sid[name], [300, 120, 120])
        freeze(sid[name])
        vals = get_values(f"'{name}'!A:C")
        for i, row in enumerate(vals):
            if row and any(k in str(row[0]) for k in ['Top Pages', 'Source', 'Device', 'Country', 'Event', 'Metric']):
                sub(sid[name], i, 3, light)

    # Search Console
    hdr(sid['Search Console'], 8, DARK)
    widths(sid['Search Console'], [320, 80, 100, 60, 80, 60, 100, 80])
    freeze(sid['Search Console'])
    vals = get_values("'Search Console'!A:H")
    for i, row in enumerate(vals):
        if not row:
            continue
        if 'CARNIVORE WEEKLY' in str(row[0]):
            section(sid['Search Console'], i, 8, GREEN_DARK)
        elif 'KETODIAL' in str(row[0]):
            section(sid['Search Console'], i, 8, BLUE_DARK)
        elif any(k in str(row[0]) for k in ['Top Queries', 'Top Pages', 'Clicks']):
            sub(sid['Search Console'], i, 8, GRAY_MED)

    for chunk_start in range(0, len(reqs), 100):
        sheets_api.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={'requests': reqs[chunk_start:chunk_start + 100]},
        ).execute()


def update_charts(num_daily, num_cw_dev, num_kd_dev, num_cw_src, num_kd_src):
    print("  Charts...")
    meta = sheets_api.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    sid = {s['properties']['title']: s['properties']['sheetId'] for s in meta['sheets']}
    chart_sid = sid['Chart Data']
    dash_sid = sid['Dashboard']

    # Remove existing charts
    existing = []
    for s in meta['sheets']:
        for c in s.get('charts', []):
            existing.append(c['chartId'])
    if existing:
        sheets_api.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID, body={
            'requests': [{'deleteEmbeddedObject': {'objectId': cid}} for cid in existing],
        }).execute()

    n = num_daily + 1  # +1 for header
    chart_data = get_values("'Chart Data'!A:H")
    dev_row = next(i for i, r in enumerate(chart_data) if r and 'CW Devices' in str(r[0]))
    src_row = next(i for i, r in enumerate(chart_data) if r and 'CW Sources' in str(r[0]))

    def line_chart(title, anchor_row, anchor_col, col_cw, col_kd, y_title):
        return {'addChart': {'chart': {
            'position': {'overlayPosition': {'anchorCell': {'sheetId': dash_sid, 'rowIndex': anchor_row, 'columnIndex': anchor_col}, 'widthPixels': 580, 'heightPixels': 280}},
            'spec': {'title': title, 'basicChart': {
                'chartType': 'LINE', 'legendPosition': 'BOTTOM_LEGEND',
                'axis': [{'position': 'BOTTOM_AXIS'}, {'position': 'LEFT_AXIS', 'title': y_title}],
                'domains': [{'domain': {'sourceRange': {'sources': [
                    {'sheetId': chart_sid, 'startRowIndex': 0, 'endRowIndex': n, 'startColumnIndex': 0, 'endColumnIndex': 1}
                ]}}}],
                'series': [
                    {'series': {'sourceRange': {'sources': [
                        {'sheetId': chart_sid, 'startRowIndex': 0, 'endRowIndex': n, 'startColumnIndex': col_cw, 'endColumnIndex': col_cw + 1}
                    ]}}, 'color': {'red': 0.2, 'green': 0.65, 'blue': 0.32}, 'lineStyle': {'width': 3}},
                    {'series': {'sourceRange': {'sources': [
                        {'sheetId': chart_sid, 'startRowIndex': 0, 'endRowIndex': n, 'startColumnIndex': col_kd, 'endColumnIndex': col_kd + 1}
                    ]}}, 'color': {'red': 0.2, 'green': 0.4, 'blue': 0.75}, 'lineStyle': {'width': 3}},
                ],
                'headerCount': 1,
            }},
        }}}

    def pie_chart(title, anchor_row, anchor_col, data_row, data_end, label_col, val_col):
        return {'addChart': {'chart': {
            'position': {'overlayPosition': {'anchorCell': {'sheetId': dash_sid, 'rowIndex': anchor_row, 'columnIndex': anchor_col}, 'widthPixels': 370, 'heightPixels': 260}},
            'spec': {'title': title, 'pieChart': {
                'legendPosition': 'RIGHT_LEGEND',
                'domain': {'sourceRange': {'sources': [
                    {'sheetId': chart_sid, 'startRowIndex': data_row, 'endRowIndex': data_end, 'startColumnIndex': label_col, 'endColumnIndex': label_col + 1}
                ]}},
                'series': {'sourceRange': {'sources': [
                    {'sheetId': chart_sid, 'startRowIndex': data_row, 'endRowIndex': data_end, 'startColumnIndex': val_col, 'endColumnIndex': val_col + 1}
                ]}},
            }},
        }}}

    def bar_chart(title, anchor_row, anchor_col, data_row, data_end, label_col, val_col, color):
        return {'addChart': {'chart': {
            'position': {'overlayPosition': {'anchorCell': {'sheetId': dash_sid, 'rowIndex': anchor_row, 'columnIndex': anchor_col}, 'widthPixels': 580, 'heightPixels': 260}},
            'spec': {'title': title, 'basicChart': {
                'chartType': 'BAR', 'legendPosition': 'NO_LEGEND',
                'axis': [{'position': 'BOTTOM_AXIS', 'title': 'Sessions'}, {'position': 'LEFT_AXIS'}],
                'domains': [{'domain': {'sourceRange': {'sources': [
                    {'sheetId': chart_sid, 'startRowIndex': data_row, 'endRowIndex': data_end, 'startColumnIndex': label_col, 'endColumnIndex': label_col + 1}
                ]}}}],
                'series': [{'series': {'sourceRange': {'sources': [
                    {'sheetId': chart_sid, 'startRowIndex': data_row, 'endRowIndex': data_end, 'startColumnIndex': val_col, 'endColumnIndex': val_col + 1}
                ]}}, 'color': color}],
                'headerCount': 1,
            }},
        }}}

    green = {'red': 0.2, 'green': 0.65, 'blue': 0.32}
    blue = {'red': 0.2, 'green': 0.4, 'blue': 0.75}

    charts = [
        line_chart('Daily Sessions — CW vs KD', 20, 0, 1, 5, 'Sessions'),
        line_chart('Daily Pageviews — CW vs KD', 20, 4, 3, 7, 'Pageviews'),
        pie_chart('CW Devices', 36, 0, dev_row, dev_row + 1 + num_cw_dev, 0, 1),
        pie_chart('KD Devices', 36, 4, dev_row, dev_row + 1 + num_kd_dev, 3, 4),
        bar_chart('CW Traffic Sources', 50, 0, src_row, src_row + 1 + num_cw_src, 0, 1, green),
        bar_chart('KD Traffic Sources', 50, 4, src_row, src_row + 1 + num_kd_src, 3, 4, blue),
    ]

    sheets_api.spreadsheets().batchUpdate(
        spreadsheetId=SPREADSHEET_ID, body={'requests': charts},
    ).execute()


def main():
    print(f"Updating CW+KD Dashboard at {NOW}")
    dash_data = update_dashboard()
    update_calculator_tab('CW Calculator', 'cw')
    update_calculator_tab('KD Calculator', 'ketodial')
    update_traffic('CW Traffic', CW_GA4_PROPERTY, 'CW')
    update_traffic('KD Traffic', KD_GA4_PROPERTY, 'KD')
    update_search_console()
    num_daily, cw_dev, kd_dev, cw_src, kd_src = update_chart_data()
    apply_formatting(dash_data)
    update_charts(num_daily, cw_dev, kd_dev, cw_src, kd_src)
    print(f"Done! https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}")


if __name__ == '__main__':
    main()

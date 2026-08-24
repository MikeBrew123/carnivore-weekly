#!/usr/bin/env python3
"""CW GSC query-level movement, last 7d vs prior 7d (2-day data lag)."""
import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

CREDS = '/Users/mbrew/Developer/carnivore-weekly/dashboard/ga4-credentials.json'
SITE = 'sc-domain:carnivoreweekly.com'

creds = service_account.Credentials.from_service_account_file(
    CREDS, scopes=['https://www.googleapis.com/auth/webmasters.readonly'])
svc = build('searchconsole', 'v1', credentials=creds)

end = datetime.date.today() - datetime.timedelta(days=2)
cur_start = end - datetime.timedelta(days=6)
prev_end = cur_start - datetime.timedelta(days=1)
prev_start = prev_end - datetime.timedelta(days=6)


def pull(start, stop):
    resp = svc.searchanalytics().query(siteUrl=SITE, body={
        'startDate': start.isoformat(), 'endDate': stop.isoformat(),
        'dimensions': ['query'], 'rowLimit': 250}).execute()
    return {r['keys'][0]: r for r in resp.get('rows', [])}


cur = pull(cur_start, end)
prev = pull(prev_start, prev_end)

print(f'Current week {cur_start} to {end} vs prior {prev_start} to {prev_end}')
print(f'Queries with clicks: {sum(1 for r in cur.values() if r["clicks"] > 0)} current, '
      f'{sum(1 for r in prev.values() if r["clicks"] > 0)} prior\n')

rows = []
for q, r in cur.items():
    p = prev.get(q, {})
    rows.append({
        'q': q, 'clicks': r['clicks'], 'clicks_prev': p.get('clicks', 0),
        'imp': r['impressions'], 'imp_prev': p.get('impressions', 0),
        'pos': round(r['position'], 1), 'pos_prev': round(p['position'], 1) if p else None,
    })

print('=== TOP QUERIES BY CLICKS (current week) ===')
for r in sorted(rows, key=lambda x: -x['clicks'])[:20]:
    pp = f"{r['pos_prev']}" if r['pos_prev'] is not None else 'new'
    print(f"  {r['clicks']:>3} clicks (prev {r['clicks_prev']:>2}) | pos {r['pos']:>5} (prev {pp:>5}) | "
          f"imp {r['imp']:>4} | {r['q']}")

print('\n=== BIGGEST POSITION IMPROVEMENTS (min 20 impressions both weeks) ===')
movers = [r for r in rows if r['pos_prev'] is not None and r['imp'] >= 20 and r['imp_prev'] >= 20]
for r in sorted(movers, key=lambda x: x['pos'] - x['pos_prev'])[:15]:
    print(f"  {r['pos_prev']:>5} -> {r['pos']:>5} | {r['clicks']:>3} clicks | imp {r['imp']:>4} | {r['q']}")

print('\n=== BIGGEST POSITION DROPS (min 20 impressions both weeks) ===')
for r in sorted(movers, key=lambda x: x['pos_prev'] - x['pos'])[:10]:
    print(f"  {r['pos_prev']:>5} -> {r['pos']:>5} | {r['clicks']:>3} clicks | imp {r['imp']:>4} | {r['q']}")

print('\n=== HIGH IMPRESSIONS, NO CLICKS (page-2 opportunities, pos 11-25, imp >= 50) ===')
opps = [r for r in rows if r['clicks'] == 0 and r['imp'] >= 50 and 11 <= r['pos'] <= 25]
for r in sorted(opps, key=lambda x: -x['imp'])[:15]:
    print(f"  imp {r['imp']:>4} | pos {r['pos']:>5} | {r['q']}")

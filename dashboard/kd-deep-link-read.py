#!/usr/bin/env python3
"""Read the KD deep-link test (docs/project-log/kd-deep-link-plan-2026-10-20.md).

12 KD articles got one editorial link from a CW post on 2026-10-20 (LINKED).
12 KD articles with no CW link anywhere were drawn at random as the comparison
group (CONTROL, seed 20261020). If the links work, LINKED pages get crawled and
indexed and CONTROL pages do not.

Read-only. Usage:
  python3 dashboard/kd-deep-link-read.py            # print the read
  python3 dashboard/kd-deep-link-read.py --save     # also write a dated JSON snapshot
Baseline snapshot: dashboard/kd-deep-link-snapshots/2026-10-20.json. Read date 2026-11-17.
"""
import datetime
import json
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

DASH = os.path.dirname(os.path.abspath(__file__))
CREDS = os.path.join(DASH, 'ga4-credentials.json')
SNAP_DIR = os.path.join(DASH, 'kd-deep-link-snapshots')
KD_SITE = 'https://ketodial.com/'
CW_SITE = 'sc-domain:carnivoreweekly.com'
KD_GA4 = 'properties/539655784'

# CW source post -> KD target. Women's health was pulled from the batch (pre-existing dose issue).
LINKED = {
    '2026-08-03-rabbit-starvation-fat-floor': 'too-much-fat-keto',
    '2026-02-08-endurance-running-marathon': 'keto-working-out-do-you-need-carbs',
    '2026-08-14-what-1500-calories-carnivore-looks-like': 'recalculate-macros-every-10-pounds',
    '2026-06-13-carnivore-recomp': 'high-protein-keto-macros',
    '2026-08-15-80-20-or-93-7-ground-beef': 'keto-protein-foods',
    '2026-05-18-carnivore-cheat-reentry-protocol': 'why-you-quit-keto-last-time',
    '2026-02-21-carnivore-fertility-conception': 'keto-pcos-meta-analysis',
    '2026-08-05-appetite-loss-carnivore': 'am-i-eating-enough-on-keto',
    '2026-08-12-knee-pain-arthritis-after-60': 'keto-meal-plan-beginners-first-7-days',
    '2026-08-22-carnivore-a1c-90-days': 'keto-blood-sugar-first-30-days',
    '2026-08-21-hair-shedding-carnivore-month-three': 'keto-hair-loss-month-3',
    '2026-06-18-carnivore-sleep-week-3': 'keto-insomnia-3am',
}
CONTROL = [
    'almond-flour-worst-what-pros-bake-with', 'cottage-cheese-flatbread-tested',
    'does-keto-cause-cancer', 'keto-bloating-what-changes', 'keto-flu-community',
    'keto-office-lunch', 'keto-pasta-pizza-swaps-ranked', 'keto-potato-bean-swaps',
    'metabolic-flexibility-new-goal', 'thirty-dollar-keto-week', 'usda-keto-food-pyramid',
    'week-3-hunger-not-electrolytes',
]
# Brew may "Request indexing" this one by hand; report it but count it separately.
MANUALLY_REQUESTED = {'keto-meal-plan-beginners-first-7-days'}


def kd_url(slug):
    return f'https://ketodial.com/blog/{slug}.html'


def inspect(gsc, slug):
    r = gsc.urlInspection().index().inspect(
        body={'inspectionUrl': kd_url(slug), 'siteUrl': KD_SITE}).execute()
    s = r['inspectionResult']['indexStatusResult']
    return {'coverage': s.get('coverageState', '?'), 'last_crawl': (s.get('lastCrawlTime') or '')[:10]}


def gsc_pages(gsc, site, start, end):
    r = gsc.searchanalytics().query(siteUrl=site, body={
        'startDate': str(start), 'endDate': str(end), 'dimensions': ['page'], 'rowLimit': 1000}).execute()
    return {x['keys'][0]: x for x in r.get('rows', [])}


def kd_referrals_from_cw(start, end):
    """KD GA4 sessions from carnivoreweekly.com, by KD landing page."""
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = CREDS
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        DateRange, Dimension, Filter, FilterExpression, Metric, RunReportRequest)
    rows = BetaAnalyticsDataClient().run_report(RunReportRequest(
        property=KD_GA4, date_ranges=[DateRange(start_date=str(start), end_date=str(end))],
        dimensions=[Dimension(name='landingPage')], metrics=[Metric(name='sessions')],
        dimension_filter=FilterExpression(filter=Filter(
            field_name='sessionSource',
            string_filter=Filter.StringFilter(match_type=Filter.StringFilter.MatchType.CONTAINS,
                                              value='carnivoreweekly'))),
        limit=200)).rows
    return {r.dimension_values[0].value: int(r.metric_values[0].value) for r in rows}


def main():
    creds = service_account.Credentials.from_service_account_file(
        CREDS, scopes=['https://www.googleapis.com/auth/webmasters.readonly'])
    gsc = build('searchconsole', 'v1', credentials=creds)
    today = datetime.date.today()
    end = today - datetime.timedelta(days=3)
    start = end - datetime.timedelta(days=27)

    kd_perf = gsc_pages(gsc, KD_SITE, start, end)
    cw_perf = gsc_pages(gsc, CW_SITE, start, end)
    try:
        refs = kd_referrals_from_cw(start, end)
    except Exception as e:  # GA4 is a bonus; the read stands on GSC
        print('GA4 referral read failed:', e)
        refs = {}

    out = {'date': str(today), 'window': [str(start), str(end)], 'linked': {}, 'control': {}}
    for group, slugs in (('linked', list(LINKED.values())), ('control', CONTROL)):
        for slug in slugs:
            row = inspect(gsc, slug)
            p = kd_perf.get(kd_url(slug), {})
            row.update({'clicks': p.get('clicks', 0), 'impressions': p.get('impressions', 0),
                        'cw_referral_sessions': refs.get(f'/blog/{slug}.html', 0),
                        'manual_request': slug in MANUALLY_REQUESTED})
            out[group][slug] = row
    out['cw_sources'] = {}
    for cw_slug in LINKED:
        p = cw_perf.get(f'https://carnivoreweekly.com/blog/{cw_slug}.html', {})
        out['cw_sources'][cw_slug] = {'clicks': p.get('clicks', 0), 'impressions': p.get('impressions', 0),
                                      'position': round(p.get('position', 0), 1)}

    print(f"KD deep-link read {out['date']} (GSC window {start} to {end})")
    for group in ('linked', 'control'):
        rows = out[group]
        crawled = sum(1 for r in rows.values() if r['last_crawl'])
        indexed = sum(1 for r in rows.values() if r['coverage'].startswith('Submitted and indexed')
                      or r['coverage'] == 'Indexed, not submitted in sitemap')
        print(f"\n{group.upper()}: crawled {crawled}/12, indexed {indexed}/12, "
              f"impressions {sum(r['impressions'] for r in rows.values())}, "
              f"CW referral sessions {sum(r['cw_referral_sessions'] for r in rows.values())}")
        for slug, r in rows.items():
            flag = ' (manual request, count apart)' if r['manual_request'] else ''
            print(f"  {r['coverage'][:34]:34} crawl {r['last_crawl'] or '-':10} imp {int(r['impressions']):>4}  {slug}{flag}")
    print('\nCW source posts (28d clicks / position):')
    for s, r in out['cw_sources'].items():
        print(f"  {int(r['clicks']):>4} {r['position']:>5}  {s}")

    if '--save' in sys.argv:
        os.makedirs(SNAP_DIR, exist_ok=True)
        path = os.path.join(SNAP_DIR, f"{out['date']}.json")
        with open(path, 'w') as f:
            json.dump(out, f, indent=2)
        print('\nsaved', path)


if __name__ == '__main__':
    main()

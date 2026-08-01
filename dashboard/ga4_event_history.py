#!/usr/bin/env python3
"""First-fired dates and weekly counts for GA4 events (bead ffq1).

Run this BEFORE making any week-over-week claim about a GA4 event. The
2026-08-01 funnel investigation traced a "checkout starts tripled 6→17" scare
to calculator_step1_completed, a brand-new event whose "6" was a 3-day partial
launch week. An event's first full week is the earliest valid comparison base.

Usage:
    python3 dashboard/ga4_event_history.py calculator_step1_completed begin_checkout
    python3 dashboard/ga4_event_history.py --regex 'calculator_.*' --property 539655784
"""
import argparse
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

CREDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ga4-credentials.json')
CW_PROPERTY = '517632328'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('events', nargs='*', help='exact GA4 event names')
    ap.add_argument('--regex', help='full regexp of event names (alternative to exact names)')
    ap.add_argument('--property', default=CW_PROPERTY, help='GA4 property id (default CW)')
    ap.add_argument('--weeks', type=int, default=10, help='weekly-count window (default 10)')
    args = ap.parse_args()
    if not args.events and not args.regex:
        ap.error('give event names or --regex')

    from google.oauth2 import service_account
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (RunReportRequest, DateRange, Dimension,
                                                    Metric, FilterExpression, Filter)

    sa = service_account.Credentials.from_service_account_file(
        CREDS, scopes=['https://www.googleapis.com/auth/analytics.readonly'])
    client = BetaAnalyticsDataClient(credentials=sa)

    pattern = args.regex or '|'.join(args.events)
    f = FilterExpression(filter=Filter(field_name='eventName', string_filter=Filter.StringFilter(
        match_type=Filter.StringFilter.MatchType.FULL_REGEXP, value=pattern)))

    # 13 months of daily data covers GA4's standard retention window.
    start = (date.today() - timedelta(days=395)).isoformat()
    resp = client.run_report(RunReportRequest(
        property=f'properties/{args.property}',
        dimensions=[Dimension(name='date'), Dimension(name='eventName')],
        metrics=[Metric(name='eventCount')],
        date_ranges=[DateRange(start_date=start, end_date='today')],
        dimension_filter=f, limit=100000))

    by_event = {}
    for row in resp.rows:
        d, name = row.dimension_values[0].value, row.dimension_values[1].value
        by_event.setdefault(name, []).append((d, int(row.metric_values[0].value)))

    if not by_event:
        print(f'No data for {pattern!r} in the last 13 months on property {args.property}.')
        return

    cutoff = date.today() - timedelta(weeks=args.weeks)
    for name in sorted(by_event):
        days = sorted(by_event[name])
        first = days[0][0]
        first_d = date(int(first[:4]), int(first[4:6]), int(first[6:]))
        age_weeks = (date.today() - first_d).days / 7
        print(f'\n{name}')
        print(f'  first fired: {first_d}  ({age_weeks:.1f} weeks ago)')
        if age_weeks < 3:
            print('  ⚠️  YOUNGER THAN 3 WEEKS — no valid week-over-week comparison exists yet.')
        # ISO-weekly counts, flagging the launch week as partial
        weekly = {}
        for d, n in days:
            dd = date(int(d[:4]), int(d[4:6]), int(d[6:]))
            if dd < cutoff:
                continue
            wk = dd - timedelta(days=dd.weekday())
            weekly[wk] = weekly.get(wk, 0) + n
        launch_week = first_d - timedelta(days=first_d.weekday())
        for wk in sorted(weekly):
            note = '  ← launch week (PARTIAL — never use as a comparison base)' if wk == launch_week else ''
            print(f'  wk {wk}: {weekly[wk]}{note}')


if __name__ == '__main__':
    main()

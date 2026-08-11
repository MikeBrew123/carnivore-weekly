#!/usr/bin/env python3
"""Etsy Test 1 readout: daily views/day per listing over an arbitrary window.

Read-only. Touches nothing on Etsy, writes nothing. Reads the local snapshot
series only.

Why this exists: the test's first baseline was a 14-day mean that sat far below
the listing's actual pre-change run rate, so the revert guardrail could never
fire. The guardrail is only as good as the number it is compared against, so the
baseline and every later read must be computed the same way, by the same code.

Method
------
Snapshots are taken once a day around 08:05 PDT and carry a *lifetime* view
counter per listing. One "day" is therefore the delta between two consecutive
snapshots, labelled with the later snapshot's date. The listing edit landed
2026-08-10 05:25 PDT, which is *before* that morning's 08:06 snapshot, so the
interval labelled 2026-08-10 is already partly post-change and is excluded from
any baseline.

We report both mean and median. The median is the headline number: the Carnivore
listing's pre-change window contains a regime change (roughly 1 view/day for
three weeks, then 100+ from 2026-08-06), and a mean straddling that step is
below every day of the run rate it is supposed to describe.

Usage
-----
    python3 etsy/image-test-readout.py                       # baseline window
    python3 etsy/image-test-readout.py 2026-08-11 2026-08-17 # guardrail read
"""

import json
import os
import sys
from statistics import mean, median

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOTS = os.path.join(REPO, "reports", "etsy-snapshots", "snapshots.jsonl")

# Last five fully pre-change daily intervals. See module docstring for why this
# stops at 08-09 rather than 08-10.
BASELINE_FROM, BASELINE_TO = "2026-08-05", "2026-08-09"

LISTINGS = {
    4464217679: ("treated", "Carnivore Food List"),
    4464217699: ("treated", "Pescatarian Food List"),
    4495055944: ("control", "Carnivore Cheat Sheet"),
    4495049647: ("control", "Keto Food Cheat Sheet"),
    4464219356: ("frozen", "Keto Diet Food List (bestseller)"),
}


def load_days():
    """Return {date: {listing_id: row}}, keeping the last snapshot of each date."""
    by_date = {}
    with open(SNAPSHOTS) as fh:
        rows = [json.loads(line) for line in fh if line.strip()]
    for snap in sorted(rows, key=lambda r: (r["date"], r["ts"])):
        by_date[snap["date"]] = {l["id"]: l for l in snap["listings"]}
    return by_date


def daily_views(by_date, listing_id):
    """{date: views gained in the interval ending at that date}."""
    out, prev = {}, None
    for date in sorted(by_date):
        row = by_date[date].get(listing_id)
        if row is None:
            prev = None  # listing absent (delisted or an API blank); break the chain
            continue
        # A lifetime counter can only go up. A drop means the API returned a
        # blank, which happened on 2026-08-01/02; do not emit a negative day.
        if prev is not None and row["views"] >= prev:
            out[date] = row["views"] - prev
        prev = row["views"]
    return out


def main():
    start, end = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else (BASELINE_FROM, BASELINE_TO)
    by_date = load_days()

    print(f"Window {start} to {end} (daily intervals, labelled by closing snapshot)\n")
    header = f"{'listing':<12} {'group':<8} {'label':<34} {'mean':>7} {'median':>7}  days"
    print(header)
    print("-" * len(header))

    for listing_id, (group, label) in LISTINGS.items():
        days = daily_views(by_date, listing_id)
        series = [v for d, v in sorted(days.items()) if start <= d <= end]
        if not series:
            print(f"{listing_id:<12} {group:<8} {label:<34} {'n/a':>7} {'n/a':>7}  no data")
            continue
        print(f"{listing_id:<12} {group:<8} {label:<34} "
              f"{mean(series):>7.1f} {median(series):>7.1f}  {series}")

    print("\nBaseline of record (medians, window "
          f"{BASELINE_FROM} to {BASELINE_TO}) lives in "
          "reports/etsy-image-test-2026-08-10.json -> baseline_pre_change.")


if __name__ == "__main__":
    main()

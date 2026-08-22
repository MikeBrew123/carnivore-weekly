#!/usr/bin/env python3
"""Etsy watchdog: reads reports/etsy-snapshots/snapshots.jsonl, prints a status
report and emits ALERT lines when triggers fire. Read-only, no Etsy calls, no
network. Built 2026-08-22 (Brew approved in live chat). Stateless: milestone
alerts fire only on the exact day a streak hits them, so no state file needed.

Exit codes: 0 = quiet, 2 = at least one ALERT fired (never 1, so a crash is
distinguishable from a finding).
"""
import json, sys, os
from datetime import date

SNAP = os.path.join(os.path.dirname(__file__), "..", "reports", "etsy-snapshots", "snapshots.jsonl")
STREAK_MILESTONES = (7, 14, 21, 28, 45, 60, 90)
VIEW_COLLAPSE_RATIO = 0.5     # 3d avg below 50% of trailing 14d avg
TOP_N_WATCHED = 5             # watch the N listings with the biggest 14d view gain
MIN_TRAILING_VPD = 3.0        # ignore collapse checks on listings under this baseline (noise)

def load():
    rows = [json.loads(l) for l in open(SNAP) if l.strip()]
    # one row per date, keep the last row for a date (batch counter: identical anyway)
    by_date = {}
    for r in rows:
        by_date[r["date"]] = r
    return [by_date[d] for d in sorted(by_date)]

def views_map(row):
    return {l["id"]: l for l in row["listings"]}

def main():
    rows = load()
    if len(rows) < 2:
        print("watchdog: not enough snapshot history"); return 0
    today, prev = rows[-1], rows[-2]
    alerts, info = [], []

    # ---- 1. sales streak / new sales ----
    sales = today["shop"]["sales_lifetime"]
    if sales > prev["shop"]["sales_lifetime"]:
        alerts.append(f"GOOD NEWS: +{sales - prev['shop']['sales_lifetime']} sale(s), lifetime now {sales}.")
    streak = 0
    for r in reversed(rows):
        if r["shop"]["sales_lifetime"] < sales: break
        streak += 1
    streak -= 1  # days since last increase, counting from first flat day
    last_sale_date = next((rows[i]["date"] for i in range(len(rows)-1, 0, -1)
                           if rows[i]["shop"]["sales_lifetime"] > rows[i-1]["shop"]["sales_lifetime"]), "unknown")
    info.append(f"Zero-sale streak: {streak} day(s). Last sale visible {last_sale_date}.")
    if streak in STREAK_MILESTONES:
        alerts.append(f"SALES DROUGHT: {streak} straight days with zero sales (last sale {last_sale_date}).")

    # ---- 2. reviews / followers / listing count ----
    for k, label in (("reviews","review"), ("followers","follower")):
        d = today["shop"][k] - prev["shop"][k]
        if d > 0: alerts.append(f"GOOD NEWS: +{d} {label}(s), now {today['shop'][k]}.")
        if d < 0: alerts.append(f"{label.upper()} COUNT DROPPED {prev['shop'][k]} -> {today['shop'][k]}.")
    dl = today["shop"]["active_listings"] - prev["shop"]["active_listings"]
    if dl < 0: alerts.append(f"ACTIVE LISTINGS DROPPED {prev['shop']['active_listings']} -> {today['shop']['active_listings']}: likely an expiry. Check renewals.")
    if dl > 0: info.append(f"Active listings up {prev['shop']['active_listings']} -> {today['shop']['active_listings']}.")

    # ---- 3. price changes (guard: every price change must be a known job) ----
    tm, pm = views_map(today), views_map(prev)
    for lid, l in tm.items():
        if lid in pm and abs(l["price"] - pm[lid]["price"]) > 0.001:
            alerts.append(f"PRICE CHANGED on {lid} ({l['title'][:40]}): ${pm[lid]['price']:.2f} -> ${l['price']:.2f}. "
                          "If this is not a logged, approved job, investigate immediately.")

    # ---- 4. view collapse on top-traffic listings ----
    if len(rows) >= 18:
        r14, r3 = rows[-18], rows[-4]   # trailing window = 14d ending 3 days ago
        m14, m3 = views_map(r14), views_map(r3)
        gains = sorted(((tm[i]["views"] - m14[i]["views"], i) for i in tm if i in m14), reverse=True)
        for _, lid in gains[:TOP_N_WATCHED]:
            trail = (m3[lid]["views"] - m14[lid]["views"]) / 14.0 if lid in m14 and lid in m3 else 0
            recent = (tm[lid]["views"] - m3[lid]["views"]) / 3.0 if lid in m3 else 0
            if trail >= MIN_TRAILING_VPD and recent < trail * VIEW_COLLAPSE_RATIO:
                alerts.append(f"VIEW COLLAPSE on {lid} ({tm[lid]['title'][:40]}): {recent:.1f}/day last 3d "
                              f"vs {trail:.1f}/day trailing 14d ({100*recent/trail:.0f}%).")
            else:
                info.append(f"views ok {lid}: {recent:.1f}/day last 3d vs {trail:.1f}/day trailing.")
    else:
        info.append("view-collapse check skipped: <18 days of history")

    # ---- report ----
    print(f"# Etsy watchdog {today['date']}")
    print(f"Lifetime sales {sales}, reviews {today['shop']['reviews']}, "
          f"followers {today['shop']['followers']}, active {today['shop']['active_listings']}, "
          f"total views {sum(l['views'] for l in today['listings'])}")
    for i in info: print("  .", i)
    if alerts:
        print()
        for a in alerts: print("ALERT:", a)
        return 2
    print("QUIET: no alerts.")
    return 0

if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""KetoDial drip check-in: did the 2026-08-14 mobile rebuild move engagement?

READ-ONLY. Issues HTTP GETs against Supabase PostgREST and prints a table. It
sends nothing, writes nothing, and never touches a subscriber record.

What it measures, and what it cannot
------------------------------------
The mobile rebuild (commit f40d874d) changed CSS and inline font sizes in the 11
KD drip templates. Copy, links and subject lines were byte-for-byte unchanged.
So the only engagement metric it can plausibly move is the OPEN-to-CLICK path
and, weakly, opens themselves through better-rendered preview text.

It cannot move BOUNCES. A bounce is the receiving mail server refusing the
message. That happens before a human sees any pixel, so no amount of CSS can
change it. KD's 13 bounces all landed 2026-08-03 to 2026-08-09 and stopped on
their own. This script reports bounces so the number is in front of you, but a
change there is not evidence about the rebuild either way.

The cutover
-----------
send_drip.py runs from the daily-publish GitHub Action at 14:00 UTC. f40d874d
was pushed 2026-08-14 around 21:15 UTC, after that day's run. So the first send
carrying the new templates is the 2026-08-15 14:00 UTC run.

Usage:
    python3 scripts/drip_mobile_checkin.py
    python3 scripts/drip_mobile_checkin.py --site cw
"""
import argparse
import json
import math
import os
import urllib.parse
import urllib.request
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS = os.path.join(REPO, "secrets", "api-keys.json")

CUTOVER = "2026-08-15T14:00:00+00:00"   # first drip run carrying the rebuilt templates
LOOKBACK = "2026-07-20T00:00:00+00:00"  # KD drip's first recorded send


def fetch(url, headers):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def pull_events(site, since):
    s = json.load(open(SECRETS))["supabase"]
    key = s["service_role_key"]
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    base = s["url"].rstrip("/") + "/rest/v1/drip_events"
    rows, offset = [], 0
    while True:
        q = urllib.parse.urlencode({
            "select": "resend_id,event_type,created_at,site",
            "site": f"eq.{site}",
            "created_at": f"gte.{since}",
            "order": "created_at.asc",
            "limit": 1000,
            "offset": offset,
        })
        page = fetch(f"{base}?{q}", headers)
        rows += page
        if len(page) < 1000:
            return rows
        offset += 1000


def ci95(k, n):
    """Half-width of the 95% interval on a proportion, in percentage points."""
    if not n:
        return float("nan")
    p = k / n
    return 100 * 1.96 * math.sqrt(max(p * (1 - p), 1e-9) / n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="kd", choices=["kd", "cw"])
    args = ap.parse_args()

    rows = pull_events(args.site, LOOKBACK)

    # Group by message. A message's era is decided by when it was sent, so an
    # open that arrives the next morning still counts against the right template.
    msgs = defaultdict(lambda: {"sent_at": None, "types": set()})
    loose_bounces = {"pre": 0, "post": 0}
    for r in rows:
        rid = r.get("resend_id")
        if not rid:
            continue
        m = msgs[rid]
        m["types"].add(r["event_type"])
        if r["event_type"] in ("sent", "delivered"):
            if m["sent_at"] is None or r["created_at"] < m["sent_at"]:
                m["sent_at"] = r["created_at"]

    eras = {"pre": [], "post": []}
    for rid, m in msgs.items():
        if m["sent_at"] is None:
            continue
        eras["post" if m["sent_at"] >= CUTOVER else "pre"].append(m)

    print(f"KetoDial drip mobile check-in, site={args.site}")
    print(f"  templates rebuilt in f40d874d; cutover = first run at {CUTOVER}")
    print(f"  window {LOOKBACK[:10]} to now, {len(msgs)} messages seen\n")

    hdr = f"{'era':<6} {'delivered':>9} {'opened':>7} {'open %':>8} {'+/- 95%':>8} {'clicked':>8} {'click %':>8} {'bounced':>8}"
    print(hdr)
    print("-" * len(hdr))
    for era in ("pre", "post"):
        ms = eras[era]
        delivered = [m for m in ms if "delivered" in m["types"]]
        n = len(delivered)
        opened = sum(1 for m in delivered if "opened" in m["types"])
        clicked = sum(1 for m in delivered if "clicked" in m["types"])
        bounced = sum(1 for m in ms if "bounced" in m["types"]) + loose_bounces[era]
        if n:
            print(f"{era:<6} {n:>9} {opened:>7} {100*opened/n:>7.1f}% {ci95(opened, n):>7.1f} "
                  f"{clicked:>8} {100*clicked/n:>7.1f}% {bounced:>8}")
        else:
            print(f"{era:<6} {n:>9} {'-':>7} {'-':>8} {'-':>8} {'-':>8} {'-':>8} {bounced:>8}")

    post_n = len([m for m in eras["post"] if "delivered" in m["types"]])
    print(f"\nPower note: at KD's ~13 sends/day, a post-fix n of {post_n} carries a 95% interval")
    print("of roughly +/- 15 points on the open rate at n=40, +/- 10 at n=95, +/- 6.5 at n=220.")
    print("Nothing short of a very large swing is readable before late August.")
    print("Bounces are a delivery-layer event and cannot be caused or cured by CSS.")


if __name__ == "__main__":
    main()

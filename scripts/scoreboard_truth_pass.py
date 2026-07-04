#!/usr/bin/env python3
"""
Weekly scoreboard truth pass — every number from a primary source.

Pulls GA4 (CW + KD), Stripe (charges 30d, subscriptions), Supabase
(drip, newsletter, coach, drip_events), Etsy (via sales-summary.mjs),
and the Pinterest queue, then appends a dated section to the vault
scoreboard and saves a JSON snapshot next to it. Commits are left to
com.brew.vaultsync.

Born from sprint task 1.2 (2026-07-04): the old weekly report summarized
daily notes (AI summaries of AI summaries). This one only reports what
APIs say. No LLM involved.

Run weekly via crontab (Mondays). Manual: python3 scripts/scoreboard_truth_pass.py
"""

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).parent.parent
SECRETS = json.loads((PROJECT_ROOT / "secrets" / "api-keys.json").read_text())
VAULT_CW = Path("/Users/mbrew/Documents/Brew-Vault/04-Systems/Projects/Carnivore-Weekly")
SCOREBOARD_MD = VAULT_CW / "reports" / "scoreboard.md"
SNAPSHOT_DIR = VAULT_CW / "reports" / "scoreboard-snapshots"
PINTEREST_QUEUE = PROJECT_ROOT / "ketodial" / "marketing" / "pinterest-pin-queue.json"

GA4_PROPS = {"cw": "517632328", "kd": "539655784"}


def pull_ga4():
    import os
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(PROJECT_ROOT / "dashboard" / "ga4-credentials.json")
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric
    c = BetaAnalyticsDataClient()
    out = {}
    for site, prop in GA4_PROPS.items():
        r = c.run_report(RunReportRequest(
            property=f"properties/{prop}",
            date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
            metrics=[Metric(name="sessions"), Metric(name="totalUsers"), Metric(name="screenPageViews")],
        ))
        v = r.rows[0].metric_values if r.rows else None
        out[site] = {
            "sessions_30d": int(v[0].value) if v else 0,
            "users_30d": int(v[1].value) if v else 0,
            "pageviews_30d": int(v[2].value) if v else 0,
        }
    return out


def pull_stripe():
    key = SECRETS["stripe"]["secret_key_live"]
    h = {"Authorization": f"Bearer {key}"}
    import time as _t
    since = int(_t.time()) - 30 * 86400
    charges = requests.get(f"https://api.stripe.com/v1/charges?created[gte]={since}&limit=100", headers=h).json()["data"]
    ok = [c for c in charges if c["status"] == "succeeded" and not c["refunded"]]
    subs = requests.get("https://api.stripe.com/v1/subscriptions?status=all&limit=100", headers=h).json()["data"]
    return {
        "charges_30d": len(ok),
        "revenue_30d_usd": sum(c["amount"] for c in ok) / 100,
        "subscriptions_all_time": len(subs),
    }


def sb_query(table, params):
    sb = SECRETS["supabase"]
    key = sb["service_role_key"]
    r = requests.get(f"{sb['url']}/rest/v1/{table}",
                     headers={"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact"},
                     params=params)
    r.raise_for_status()
    return r


def sb_count(table, params):
    params = dict(params, select="id", limit="1")
    r = sb_query(table, params)
    return int(r.headers.get("Content-Range", "0/0").split("/")[-1])


def pull_supabase():
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    return {
        "drip_total": sb_count("drip_subscribers", {}),
        "drip_active": sb_count("drip_subscribers", {"completed": "eq.false", "unsubscribed": "eq.false"}),
        "drip_new_7d": sb_count("drip_subscribers", {"subscribed_at": f"gt.{week_ago}"}),
        "newsletter_cw": sb_count("newsletter_subscribers", {"site": "eq.cw", "status": "eq.active"}),
        "newsletter_kd": sb_count("newsletter_subscribers", {"site": "eq.kd", "status": "eq.active"}),
        "coach_active_paid": sb_count("coach_members", {"status": "eq.active", "stripe_subscription_id": "not.is.null"}),
        "coach_active_unpaid": sb_count("coach_members", {"status": "eq.active", "stripe_subscription_id": "is.null"}),
        "drip_opens_7d": sb_count("drip_events", {"event_type": "eq.opened", "created_at": f"gt.{week_ago}"}),
        "drip_clicks_7d": sb_count("drip_events", {"event_type": "eq.clicked", "created_at": f"gt.{week_ago}"}),
        "drip_sent_7d": sb_count("drip_events", {"event_type": "eq.sent", "created_at": f"gt.{week_ago}"}),
    }


def pull_etsy():
    out = subprocess.run(["node", "sales-summary.mjs"], cwd=PROJECT_ROOT / "etsy",
                         capture_output=True, text=True, timeout=120).stdout
    aov = re.search(r"Avg order value:\s*([\d.]+)", out)
    months = re.findall(r"(\d{4}-\d{2}):\s*(\d+)", out)
    rev = re.search(r"revenue.*?([\d.]+)\s*CAD", out)
    return {
        "aov_cad": float(aov.group(1)) if aov else None,
        "orders_by_month": {m: int(n) for m, n in months},
        "raw_saved": False,
        "revenue_90d_cad": float(rev.group(1)) if rev else None,
    }


def pull_pinterest():
    q = json.loads(PINTEREST_QUEUE.read_text())
    pins = q if isinstance(q, list) else q.get("pins", [])
    posted = sum(1 for p in pins if p.get("status") == "posted" or p.get("posted"))
    return {"total": len(pins), "posted": posted, "queued": len(pins) - posted}


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snap = {"date": today}
    errors = []
    for name, fn in [("ga4", pull_ga4), ("stripe", pull_stripe), ("supabase", pull_supabase),
                     ("etsy", pull_etsy), ("pinterest", pull_pinterest)]:
        try:
            snap[name] = fn()
        except Exception as e:
            snap[name] = None
            errors.append(f"{name}: {e}")

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    (SNAPSHOT_DIR / f"{today}.json").write_text(json.dumps(snap, indent=2))

    g, s, d, e, p = (snap.get(k) or {} for k in ("ga4", "stripe", "supabase", "etsy", "pinterest"))
    cw, kd = g.get("cw", {}), g.get("kd", {})
    lines = [
        f"\n## Scoreboard — {today} (auto truth pass, primary sources only)\n",
        "| Metric | Value | Source |",
        "|--------|-------|--------|",
        f"| CW traffic 30d | {cw.get('sessions_30d','?')} sessions / {cw.get('users_30d','?')} users | GA4 API |",
        f"| KD traffic 30d | {kd.get('sessions_30d','?')} sessions / {kd.get('users_30d','?')} users | GA4 API |",
        f"| Stripe 30d | {s.get('charges_30d','?')} charges, ${s.get('revenue_30d_usd','?')} USD; subs ever: {s.get('subscriptions_all_time','?')} | Stripe live API |",
        f"| Drip list | {d.get('drip_total','?')} total, {d.get('drip_active','?')} active, +{d.get('drip_new_7d','?')} this week | Supabase |",
        f"| Drip engagement 7d | {d.get('drip_sent_7d','?')} sent / {d.get('drip_opens_7d','?')} opens / {d.get('drip_clicks_7d','?')} clicks | Supabase drip_events |",
        f"| Newsletter | CW {d.get('newsletter_cw','?')}, KD {d.get('newsletter_kd','?')} active | Supabase |",
        f"| Coach | {d.get('coach_active_paid','?')} paid, {d.get('coach_active_unpaid','?')} unpaid-manual active | Supabase coach_members |",
        f"| Etsy | AOV ${e.get('aov_cad','?')} CAD; orders/mo {', '.join(f'{m} {n}' for m, n in (e.get('orders_by_month') or {}).items())} | Etsy API (sales-summary.mjs) |",
        f"| Pinterest queue | {p.get('total','?')} total, {p.get('posted','?')} posted, {p.get('queued','?')} queued | pin-queue.json |",
    ]
    if errors:
        lines.append(f"\n⚠️ Pull errors: {'; '.join(errors)}")

    with SCOREBOARD_MD.open("a") as f:
        f.write("\n".join(lines) + "\n")

    print(f"Scoreboard appended for {today}. Errors: {errors or 'none'}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()

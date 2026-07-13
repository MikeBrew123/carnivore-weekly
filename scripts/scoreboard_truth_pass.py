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
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
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
    now = int(_t.time())
    since = now - 30 * 86400
    month_start = int(datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0).timestamp())
    charges = requests.get(f"https://api.stripe.com/v1/charges?created[gte]={since}&limit=100", headers=h).json()["data"]
    ok = [c for c in charges if c["status"] == "succeeded" and not c["refunded"]]
    subs = requests.get("https://api.stripe.com/v1/subscriptions?status=all&limit=100", headers=h).json()["data"]
    # Checkout starts = Checkout Sessions created (regardless of completion).
    sessions = requests.get(
        f"https://api.stripe.com/v1/checkout/sessions?created[gte]={now - 7 * 86400}&limit=100",
        headers=h).json()["data"]
    return {
        "charges_30d": len(ok),
        "revenue_30d_usd": sum(c["amount"] for c in ok) / 100,
        "charges_month_to_date": len([c for c in ok if c["created"] >= month_start]),
        "subscriptions_all_time": len(subs),
        "checkout_starts_7d": len(sessions),
        "checkout_completed_7d": len([s for s in sessions if s.get("status") == "complete"]),
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
        "bounced_7d": sb_count("drip_events", {"event_type": "eq.bounced", "created_at": f"gt.{week_ago}"}),
        "complained_7d": sb_count("drip_events", {"event_type": "eq.complained", "created_at": f"gt.{week_ago}"}),
    }


def pull_gsc_kd():
    """KD organic search clicks, this week vs last week, from Search Console."""
    from google.oauth2 import service_account
    import googleapiclient.discovery
    creds = service_account.Credentials.from_service_account_file(
        str(PROJECT_ROOT / "dashboard" / "ga4-credentials.json"),
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    svc = googleapiclient.discovery.build("searchconsole", "v1", credentials=creds)
    today = datetime.now(timezone.utc).date()

    def clicks(start, end):
        r = svc.searchanalytics().query(
            siteUrl="https://ketodial.com/",
            body={"startDate": str(start), "endDate": str(end)}).execute()
        rows = r.get("rows", [])
        return int(rows[0]["clicks"]) if rows else 0

    return {
        "clicks_this_week": clicks(today - timedelta(days=7), today),
        "clicks_prior_week": clicks(today - timedelta(days=14), today - timedelta(days=8)),
    }


def pull_heartbeat():
    """Silent-failure count from the last heartbeat run's summary line."""
    last = (PROJECT_ROOT / "logs" / "heartbeat.log").read_text().strip().splitlines()[-1]
    m = re.search(r"HEARTBEAT: (\d+) PROBLEM", last)
    return {"problems": int(m.group(1)) if m else (0 if "OK" in last.upper() else None),
            "last_line": last}


def find_node():
    # cron runs with PATH=/usr/bin:/bin, so shutil.which alone fails there.
    for candidate in [shutil.which("node"), "/opt/homebrew/bin/node", "/usr/local/bin/node"]:
        if candidate and Path(candidate).exists():
            return candidate
    raise FileNotFoundError("node not found in PATH, /opt/homebrew/bin, or /usr/local/bin")


def pull_etsy():
    out = subprocess.run([find_node(), "sales-summary.mjs"], cwd=PROJECT_ROOT / "etsy",
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


def pull_funnel():
    # funnel_by_diet is a DB view: per diet_type, how many calculator users with a
    # known diet + captured email routed to a newsletter / drip and engaged by email.
    return sb_query("funnel_by_diet", {"select": "*"}).json()


def pull_affiliate_clicks():
    """Site affiliate-link clicks (30d) from GA4 enhanced-measurement outbound
    clicks, grouped by linkDomain. Needs no custom-dimension setup: linkDomain
    is a standard dimension on the automatic 'click' event. Maps the two
    affiliate domains to partner names; everything else is other outbound."""
    import os
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(PROJECT_ROOT / "dashboard" / "ga4-credentials.json")
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        RunReportRequest, DateRange, Metric, Dimension, Filter, FilterExpression)
    c = BetaAnalyticsDataClient()
    r = c.run_report(RunReportRequest(
        property=f"properties/{GA4_PROPS['cw']}",
        date_ranges=[DateRange(start_date="30daysAgo", end_date="today")],
        dimensions=[Dimension(name="linkDomain")],
        metrics=[Metric(name="eventCount")],
        dimension_filter=FilterExpression(filter=Filter(
            field_name="eventName", string_filter=Filter.StringFilter(value="click"))),
        limit=100,
    ))
    partners = {"elementallabs.refr.cc": "LMNT", "butcherbox.pxf.io": "ButcherBox"}
    out = {"LMNT": 0, "ButcherBox": 0}
    for row in r.rows:
        label = partners.get(row.dimension_values[0].value)
        if label:
            out[label] += int(row.metric_values[0].value)
    return out


GREEN, YELLOW, RED, GREY = "🟢", "🟡", "🔴", "⚪"


def operating_metrics(snap):
    """The 10 operating metrics from the July operating packet (2026-07-06).
    Each row: (metric, value, source, status, decision triggered, owner).
    Rows without instrumentation say so explicitly and name the task — never guess."""
    s, d, e = (snap.get(k) or {} for k in ("stripe", "supabase", "etsy"))
    gsc, hb = snap.get("gsc_kd"), snap.get("heartbeat")
    rows = []

    day = datetime.now(timezone.utc).day
    mtd = s.get("charges_month_to_date")
    if mtd is None:
        rows.append(("Calculator paid sales (July cumulative)", "pull failed", "Stripe", GREY,
                     "R2 keep/test path", "Hermes"))
    else:
        weeks_elapsed = max(1, (day + 6) // 7)
        st = GREEN if mtd >= weeks_elapsed else (YELLOW if mtd >= 1 or day < 14 else RED)
        rows.append((f"Calculator paid sales (July cumulative)", str(mtd), "Stripe live API", st,
                     "R2: keep if on pace ≥1/wk; 0 by wk4 = upstream traffic problem, not price", "Hermes"))

    cs = s.get("checkout_starts_7d")
    if cs is None:
        rows.append(("Calculator checkout starts /wk", "pull failed", "Stripe Checkout Sessions", GREY,
                     "traffic-vs-conversion diagnosis", "Sonnet"))
    else:
        st = GREEN if cs >= 10 else (YELLOW if cs >= 3 else RED)
        rows.append((f"Calculator checkout starts /wk",
                     f"{cs} started / {s.get('checkout_completed_7d', '?')} completed",
                     "Stripe Checkout Sessions API", st,
                     "<3 = traffic problem: fix internal links to calculator, not price", "Sonnet"))

    rows.append(("Etsy views→order conversion (30d)",
                 "NOT INSTRUMENTED — sales-summary.mjs has lifetime views only",
                 "needs Etsy Stats 30d views per listing", GREY,
                 "R1 ad gate (ads need ≥2% conv AND ≥$300 CAD/90d)",
                 "Sonnet — task: add 30d views to etsy/sales-summary.mjs"))

    rev = e.get("revenue_90d_cad")
    if rev is None:
        rows.append(("Etsy 90-day rolling revenue", "pull failed", "Etsy API", GREY,
                     "R1 ad gate", "Hermes"))
    else:
        st = GREEN if rev >= 300 else (YELLOW if rev >= 150 else RED)
        rows.append(("Etsy 90-day rolling revenue", f"${rev} CAD", "Etsy API (sales-summary.mjs)", st,
                     "R1: no ads below $300 CAD/90d regardless of anything else", "Hermes"))

    if gsc is None:
        rows.append(("KD organic search clicks /wk", "pull failed (GSC property or access issue)",
                     "GSC https://ketodial.com/", GREY,
                     "feeds Aug KD keep/kill", "Hermes"))
    else:
        tw, pw = gsc["clicks_this_week"], gsc["clicks_prior_week"]
        st = GREEN if tw > pw > 0 else (YELLOW if tw >= pw else RED)
        rows.append(("KD organic search clicks /wk", f"{tw} (prior wk {pw})",
                     "GSC API https://ketodial.com/", st,
                     "needs 2+ wks of growth before KD traffic counts as 'proven'", "Hermes"))

    paid = d.get("coach_active_paid")
    st = GREY if paid is None else (GREEN if paid >= 1 else RED)
    rows.append(("Coach paid customers", "pull failed" if paid is None else str(paid),
                 "Supabase coach_members (stripe_subscription_id set)", st,
                 "R3: 0 = Coach frozen, zero build hours; 1st payment unlocks 4h budget", "Hermes (daily)"))

    rows.append(("Drip Step-1 completion + drip→Kit clicks",
                 f"NOT INSTRUMENTED — total drip clicks 7d: {d.get('drip_clicks_7d', '?')}, "
                 "but no Step-1 funnel event and no Kit-link attribution",
                 "needs GA4 step event + tagged Kit link in drip emails", GREY,
                 "F3 email-gate verdict + F7 drip→Kit attribution",
                 "Sonnet — task: GA4 step_1_complete event; UTM-tag Kit links in drip"))

    sent, bounced, complained = d.get("drip_sent_7d"), d.get("bounced_7d"), d.get("complained_7d")
    if sent:
        rate = (bounced + complained) / sent * 100
        comp_rate = complained / sent * 100
        st = RED if (rate > 5 or comp_rate > 0.3) else (YELLOW if rate >= 2 else GREEN)
        rows.append(("Newsletter/drip bounce+complaint (7d)",
                     f"{rate:.1f}% ({bounced} bounced, {complained} complained / {sent} sent)",
                     "Supabase drip_events", st,
                     "R4: red = pause sends, list-hygiene pass first", "Hermes"))
    else:
        rows.append(("Newsletter/drip bounce+complaint (7d)", "no sends in window or pull failed",
                     "Supabase drip_events", GREY, "R4 send health", "Hermes"))

    if hb and hb.get("problems") is not None:
        n = hb["problems"]
        st = GREEN if n == 0 else (YELLOW if n <= 2 else RED)
        rows.append(("Silent-failure count (last heartbeat)", str(n),
                     "logs/heartbeat.log", st,
                     "any problem jumps all queues; 3+ = stop feature work", "Hermes"))
    else:
        rows.append(("Silent-failure count", "heartbeat log unreadable", "logs/heartbeat.log", GREY,
                     "fix the heartbeat itself first", "Hermes"))

    rows.append(("Items stalled >7d awaiting Brew",
                 "NOT INSTRUMENTED — no approval-queue log exists yet",
                 "needs reports/approval-queue.md maintained by Hermes Sunday batch", GREY,
                 ">0 = fix the queue design, not the item",
                 "Hermes — task: create approval-queue.md, one dated line per pending ask"))
    return rows


def write_html(snap, rows, path):
    dot = {"🟢": "#22a06b", "🟡": "#d9a514", "🔴": "#d64545", "⚪": "#999"}
    tr = "".join(
        f"<tr><td class='m'>{m}</td><td>{v}</td>"
        f"<td><span class='dot' style='background:{dot.get(st, '#999')}'></span>{st}</td>"
        f"<td class='s'>{src}</td><td class='dec'>{dec}</td><td>{own}</td></tr>"
        for m, v, src, st, dec, own in rows)
    path.write_text(f"""<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CW/KD/Etsy Operating Scoreboard — {snap['date']}</title><style>
body{{font:15px/1.5 -apple-system,system-ui,sans-serif;margin:2rem auto;max-width:1100px;padding:0 1rem;color:#1a1a1a}}
h1{{font-size:1.3rem}} .sub{{color:#666;margin-bottom:1.5rem}}
table{{border-collapse:collapse;width:100%}} th,td{{text-align:left;padding:.5rem .6rem;border-bottom:1px solid #e5e5e5;vertical-align:top}}
th{{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#888}}
.m{{font-weight:600;min-width:12rem}} .s,.dec{{font-size:.85rem;color:#555}}
.dot{{display:inline-block;width:.7rem;height:.7rem;border-radius:50%;margin-right:.4rem;vertical-align:baseline}}
.rules{{background:#f7f6f3;border-radius:8px;padding:1rem 1.4rem;margin-top:2rem;font-size:.9rem}}
@media(prefers-color-scheme:dark){{body{{background:#111;color:#eee}} th{{color:#999}} td{{border-color:#333}} .s,.dec{{color:#aaa}} .rules{{background:#1c1c1c}}}}
</style></head><body>
<h1>CW / KD / Etsy — Operating Scoreboard</h1>
<div class="sub">Truth pass {snap['date']} · primary sources only · auto-generated by scoreboard_truth_pass.py</div>
<table><thead><tr><th>Metric</th><th>Value</th><th>Status</th><th>Source of truth</th><th>Decision triggered</th><th>Owner</th></tr></thead>
<tbody>{tr}</tbody></table>
<div class="rules"><strong>Operating rules (July packet, 2026-07-06)</strong><ul>
<li>No Etsy ads unless conversion ≥2% <em>and</em> 90-day revenue ≥$300 CAD.</li>
<li>Do not kill Starter Kit in July — verdict is an August 1 decision.</li>
<li>No KD Coach work until the first paid customer (Stripe, not signups).</li>
<li>KD newsletter may send at any list size if bounce/complaint health is green.</li>
<li>Amazon Associates waits for 1,500 combined CW+KD organic sessions/week, 3 consecutive weeks.</li>
<li>No new products or niches without Brew approval.</li>
</ul></div></body></html>""")


def main():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snap = {"date": today}
    errors = []
    for name, fn in [("ga4", pull_ga4), ("stripe", pull_stripe), ("supabase", pull_supabase),
                     ("etsy", pull_etsy), ("pinterest", pull_pinterest), ("funnel", pull_funnel),
                     ("affiliate", pull_affiliate_clicks), ("gsc_kd", pull_gsc_kd),
                     ("heartbeat", pull_heartbeat)]:
        try:
            snap[name] = fn()
        except Exception as e:
            snap[name] = None
            errors.append(f"{name}: {e}")

    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    (SNAPSHOT_DIR / f"{today}.json").write_text(json.dumps(snap, indent=2))

    g, s, d, e, p = (snap.get(k) or {} for k in ("ga4", "stripe", "supabase", "etsy", "pinterest"))
    af = snap.get("affiliate") or {}
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
        f"| Affiliate clicks 30d (site) | LMNT {af.get('LMNT','?')}, ButcherBox {af.get('ButcherBox','?')} | GA4 outbound click by linkDomain |",
    ]
    funnel = snap.get("funnel") or []
    if funnel:
        lines += [
            "\n### Funnel by diet (calculator signups with a known diet + email)\n",
            "| Diet | Chose it | On newsletter | In drip | Opened email | Clicked email |",
            "|------|----------|---------------|---------|--------------|---------------|",
        ]
        for row in funnel:
            lines.append(
                f"| {row['diet_type']} | {row['chose_diet']} | {row['on_newsletter']} "
                f"| {row['in_drip']} | {row['opened_email']} | {row['clicked_email']} |"
            )

    op_rows = operating_metrics(snap)
    lines += [
        f"\n### Operating scoreboard — the 10 metrics that trigger decisions\n",
        "| Metric | Value | Status | Source of truth | Decision triggered | Owner |",
        "|--------|-------|--------|-----------------|--------------------|-------|",
    ]
    lines += [f"| {m} | {v} | {st} | {src} | {dec} | {own} |" for m, v, src, st, dec, own in op_rows]

    if errors:
        lines.append(f"\n⚠️ Pull errors: {'; '.join(errors)}")

    with SCOREBOARD_MD.open("a") as f:
        f.write("\n".join(lines) + "\n")

    write_html(snap, op_rows, SCOREBOARD_MD.parent / "scoreboard.html")

    print(f"Scoreboard appended for {today}. Errors: {errors or 'none'}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()

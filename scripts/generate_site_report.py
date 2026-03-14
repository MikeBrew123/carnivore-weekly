#!/usr/bin/env python3
"""
Weekly Site Report — Carnivore Weekly
Sends a comprehensive HTML email to the site owner with traffic, search,
subscriber, and SEO opportunity data.

Usage:
    python3 scripts/generate_site_report.py
"""

import json
import os
import datetime
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS_PATH = os.path.join(BASE_DIR, "secrets", "api-keys.json")
GA4_CREDS_PATH = os.path.join(BASE_DIR, "dashboard", "ga4-credentials.json")
TOPICS_PATH = os.path.join(BASE_DIR, "data", "weekly_topics.json")
GA4_PROPERTY_ID = "517632328"
GSC_PROPERTY = "sc-domain:carnivoreweekly.com"
MAILERLITE_NEWSLETTER_GROUP = "180231939510240621"
MAILERLITE_STARTER_GROUP = "180222507377231448"


def load_secrets():
    try:
        return json.load(open(SECRETS_PATH))
    except Exception:
        return {}


def get_credentials():
    secrets = load_secrets()
    return {
        "resend_key": os.environ.get("RESEND_API_KEY") or secrets.get("resend", {}).get("key", ""),
        "mailerlite_key": os.environ.get("MAILERLITE_API_KEY") or secrets.get("mailerlite", {}).get("api_key", ""),
        "stripe_key": os.environ.get("STRIPE_SECRET_KEY") or secrets.get("stripe", {}).get("secret_key_live", ""),
        "anthropic_key": os.environ.get("ANTHROPIC_API_KEY") or secrets.get("anthropic", {}).get("key", ""),
        "admin_email": os.environ.get("ADMIN_EMAIL") or "hello@carnivoreweekly.com",
    }


# ── Section 1: Topics Queue ──────────────────────────────────────────────────

def get_topics_data():
    try:
        data = json.load(open(TOPICS_PATH))
        return data.get("topics", []), data.get("community_pulse", "")
    except Exception as e:
        return [], f"(topics unavailable: {e})"


WRITER_COLORS = {
    "sarah": "#cd5c5c",
    "marcus": "#4682b4",
    "chloe": "#3cb371",
}


def render_topics_section(topics, community_pulse):
    rows = ""
    for t in topics[:10]:
        writer = t.get("suggested_writer", "—").lower()
        color = WRITER_COLORS.get(writer, "#aaa")
        angle = (t.get("angle") or t.get("why_now") or "")[:80]
        if len(t.get("angle", "")) > 80:
            angle += "…"
        pub = t.get("publish_date", "—")
        rows += f"""
        <tr>
          <td style="padding:6px 8px;color:#aaa;text-align:center">{t.get('rank','')}</td>
          <td style="padding:6px 8px;color:#e0e0e0">{t.get('title','')}</td>
          <td style="padding:6px 8px;color:{color};font-weight:600;text-transform:capitalize">{writer}</td>
          <td style="padding:6px 8px;color:#aaa;font-size:12px">{angle}</td>
          <td style="padding:6px 8px;color:#aaa;font-size:12px;white-space:nowrap">{pub}</td>
        </tr>"""

    pulse_block = f'<div style="background:#1e1e1e;border-left:3px solid #d4a017;padding:12px 16px;border-radius:4px;color:#ccc;font-style:italic;margin-top:12px">{community_pulse}</div>' if community_pulse else ""

    return f"""
    <div class="card">
      <h2 class="section-title">Topic Queue</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid #333">
            <th style="padding:6px 8px;color:#d4a017;font-size:11px;text-align:center">#</th>
            <th style="padding:6px 8px;color:#d4a017;font-size:11px;text-align:left">Title</th>
            <th style="padding:6px 8px;color:#d4a017;font-size:11px;text-align:left">Writer</th>
            <th style="padding:6px 8px;color:#d4a017;font-size:11px;text-align:left">Angle</th>
            <th style="padding:6px 8px;color:#d4a017;font-size:11px;text-align:left">Date</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {pulse_block}
    </div>"""


# ── Section 2: GA4 Traffic ───────────────────────────────────────────────────

def get_ga4_traffic():
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            RunReportRequest, DateRange, Metric, Dimension, OrderBy
        )
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_file(
            GA4_CREDS_PATH,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"]
        )
        client = BetaAnalyticsDataClient(credentials=creds)

        def run_report(start, end):
            req = RunReportRequest(
                property=f"properties/{GA4_PROPERTY_ID}",
                date_ranges=[DateRange(start_date=start, end_date=end)],
                metrics=[Metric(name="sessions"), Metric(name="screenPageViews"), Metric(name="activeUsers")],
            )
            return client.run_report(req)

        def run_pages(start, end):
            req = RunReportRequest(
                property=f"properties/{GA4_PROPERTY_ID}",
                date_ranges=[DateRange(start_date=start, end_date=end)],
                dimensions=[Dimension(name="pagePath")],
                metrics=[Metric(name="screenPageViews")],
                order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
                limit=5,
            )
            return client.run_report(req)

        r_cur = run_report("7daysAgo", "today")
        r_prev = run_report("14daysAgo", "8daysAgo")
        r_pages = run_pages("7daysAgo", "today")

        def extract(r):
            row = r.rows[0] if r.rows else None
            if not row:
                return {"sessions": 0, "pageviews": 0, "users": 0}
            return {
                "sessions": int(row.metric_values[0].value),
                "pageviews": int(row.metric_values[1].value),
                "users": int(row.metric_values[2].value),
            }

        cur = extract(r_cur)
        prev = extract(r_prev)
        pages = [(row.dimension_values[0].value, int(row.metric_values[0].value)) for row in r_pages.rows]
        return {"current": cur, "previous": prev, "top_pages": pages, "error": None}
    except Exception as e:
        return {"error": str(e)}


def pct_change(cur, prev):
    if prev == 0:
        return None
    return round((cur - prev) / prev * 100, 1)


def arrow(val):
    if val is None:
        return '<span style="color:#aaa">—</span>'
    if val >= 0:
        return f'<span style="color:#4caf50">▲ {val}%</span>'
    return f'<span style="color:#f44336">▼ {abs(val)}%</span>'


def render_traffic_section(data):
    if data.get("error"):
        return f'<div class="card"><h2 class="section-title">Traffic Report</h2><p class="muted">Traffic data unavailable — add GA4_SERVICE_ACCOUNT_JSON to GitHub secrets.<br><small>{data["error"]}</small></p></div>'

    cur = data["current"]
    prev = data["previous"]
    metrics = [
        ("Sessions", cur["sessions"], prev["sessions"]),
        ("Pageviews", cur["pageviews"], prev["pageviews"]),
        ("Users", cur["users"], prev["users"]),
    ]
    metric_html = ""
    for label, c, p in metrics:
        ch = pct_change(c, p)
        metric_html += f'<td style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:700;color:#e0e0e0">{c:,}</div><div style="font-size:12px;color:#aaa">{label}</div><div style="font-size:13px;margin-top:4px">{arrow(ch)}</div></td>'

    page_rows = "".join(
        f'<tr><td style="padding:5px 8px;color:#aaa;font-size:12px">{path}</td><td style="padding:5px 8px;color:#e0e0e0;text-align:right;font-size:12px">{views:,}</td></tr>'
        for path, views in data["top_pages"]
    )

    return f"""
    <div class="card">
      <h2 class="section-title">Traffic Report <span style="font-size:12px;color:#aaa;font-weight:400">(7-day vs prior 7-day)</span></h2>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>{metric_html}</tr></table>
      <h3 style="color:#d4a017;font-size:13px;margin:16px 0 8px">Top 5 Pages</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tbody>{page_rows}</tbody>
      </table>
    </div>"""


# ── Section 3: GSC Search ────────────────────────────────────────────────────

def get_gsc_data():
    try:
        from google.oauth2 import service_account
        import googleapiclient.discovery

        creds = service_account.Credentials.from_service_account_file(
            GA4_CREDS_PATH,
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
        )
        svc = googleapiclient.discovery.build("searchconsole", "v1", credentials=creds)
        today = datetime.date.today()

        def fetch(start, end):
            return svc.searchanalytics().query(
                siteUrl=GSC_PROPERTY,
                body={"startDate": str(start), "endDate": str(end),
                      "dimensions": [], "rowLimit": 1}
            ).execute()

        def fetch_queries(start, end):
            return svc.searchanalytics().query(
                siteUrl=GSC_PROPERTY,
                body={"startDate": str(start), "endDate": str(end),
                      "dimensions": ["query"], "rowLimit": 5,
                      "orderBy": [{"fieldName": "impressions", "sortOrder": "DESCENDING"}]}
            ).execute()

        cur_start = today - datetime.timedelta(days=7)
        prev_start = today - datetime.timedelta(days=14)
        prev_end = today - datetime.timedelta(days=8)

        r_cur = fetch(cur_start, today)
        r_prev = fetch(prev_start, prev_end)
        r_queries = fetch_queries(cur_start, today)

        def extract(r):
            rows = r.get("rows", [])
            if not rows:
                return {"impressions": 0, "clicks": 0, "position": 0}
            row = rows[0]
            return {"impressions": int(row.get("impressions", 0)),
                    "clicks": int(row.get("clicks", 0)),
                    "position": round(row.get("position", 0), 1)}

        cur = extract(r_cur)
        prev = extract(r_prev)
        queries = [(r["keys"][0], int(r.get("impressions", 0)), int(r.get("clicks", 0)))
                   for r in r_queries.get("rows", [])]
        return {"current": cur, "previous": prev, "top_queries": queries, "error": None}
    except Exception as e:
        return {"error": str(e)}


def render_search_section(data):
    if data.get("error"):
        return f'<div class="card"><h2 class="section-title">Search Report</h2><p class="muted">GSC data unavailable.<br><small>{data["error"]}</small></p></div>'

    cur = data["current"]
    prev = data["previous"]
    metrics = [
        ("Impressions", cur["impressions"], prev["impressions"]),
        ("Clicks", cur["clicks"], prev["clicks"]),
        ("Avg Position", cur["position"], prev["position"], True),
    ]
    metric_html = ""
    for row in metrics:
        label, c, p = row[0], row[1], row[2]
        inverted = len(row) > 3
        ch = pct_change(c, p)
        if inverted and ch is not None:
            ch = -ch
        metric_html += f'<td style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:700;color:#e0e0e0">{c:,}</div><div style="font-size:12px;color:#aaa">{label}</div><div style="font-size:13px;margin-top:4px">{arrow(ch)}</div></td>'

    query_rows = "".join(
        f'<tr><td style="padding:5px 8px;color:#aaa;font-size:12px">{q}</td><td style="padding:5px 8px;color:#e0e0e0;text-align:right;font-size:12px">{imp:,}</td><td style="padding:5px 8px;color:#e0e0e0;text-align:right;font-size:12px">{clk}</td></tr>'
        for q, imp, clk in data["top_queries"]
    )

    return f"""
    <div class="card">
      <h2 class="section-title">Search Report <span style="font-size:12px;color:#aaa;font-weight:400">(7-day vs prior 7-day)</span></h2>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>{metric_html}</tr></table>
      <h3 style="color:#d4a017;font-size:13px;margin:16px 0 8px">Top 5 Queries</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <thead><tr>
          <th style="padding:5px 8px;color:#d4a017;font-size:11px;text-align:left">Query</th>
          <th style="padding:5px 8px;color:#d4a017;font-size:11px;text-align:right">Impr.</th>
          <th style="padding:5px 8px;color:#d4a017;font-size:11px;text-align:right">Clicks</th>
        </tr></thead>
        <tbody>{query_rows}</tbody>
      </table>
    </div>"""


# ── Section 4: Signups & Revenue ─────────────────────────────────────────────

def get_mailerlite_count(api_key, group_id):
    try:
        url = f"https://api.mailerlite.com/api/v2/groups/{group_id}/subscribers/count"
        r = requests.get(url, headers={"X-MailerLite-ApiKey": api_key}, timeout=10)
        if r.status_code == 200:
            return r.json().get("count", "—")
        url2 = f"https://api.mailerlite.com/api/v2/groups/{group_id}"
        r2 = requests.get(url2, headers={"X-MailerLite-ApiKey": api_key}, timeout=10)
        if r2.status_code == 200:
            return r2.json().get("total", "—")
        return f"err {r.status_code}"
    except Exception as e:
        return f"err: {e}"


def get_stripe_revenue(stripe_key):
    try:
        since = int((datetime.datetime.utcnow() - datetime.timedelta(days=7)).timestamp())
        url = "https://api.stripe.com/v1/payment_intents"
        params = {"limit": 100, "created[gte]": since, "query": "status:'succeeded'"}
        r = requests.get(url, auth=(stripe_key, ""),
                         params={"limit": 100, "created[gte]": since}, timeout=10)
        if r.status_code != 200:
            return None, None
        intents = [pi for pi in r.json().get("data", []) if pi.get("status") == "succeeded"]
        total_cents = sum(pi.get("amount_received", 0) for pi in intents)
        return len(intents), total_cents / 100
    except Exception as e:
        return None, None


def render_signup_section(creds):
    ml_key = creds["mailerlite_key"]
    stripe_key = creds["stripe_key"]

    newsletter_count = get_mailerlite_count(ml_key, MAILERLITE_NEWSLETTER_GROUP) if ml_key else "—"
    starter_count = get_mailerlite_count(ml_key, MAILERLITE_STARTER_GROUP) if ml_key else "—"

    if stripe_key:
        count, revenue = get_stripe_revenue(stripe_key)
        stripe_html = f'<td style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:700;color:#e0e0e0">{count if count is not None else "—"}</div><div style="font-size:12px;color:#aaa">Stripe Payments (7d)</div></td><td style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:700;color:#4caf50">${revenue:,.2f}</div><div style="font-size:12px;color:#aaa">Revenue (7d)</div></td>' if count is not None else '<td colspan="2" style="padding:12px;color:#aaa;font-size:12px;text-align:center">Stripe data unavailable</td>'
    else:
        stripe_html = '<td colspan="2" style="padding:12px;color:#aaa;font-size:12px;text-align:center">Stripe key not configured</td>'

    ml_note = "" if ml_key else '<p class="muted">MailerLite key not configured</p>'

    return f"""
    <div class="card">
      <h2 class="section-title">Signup &amp; Revenue Report</h2>
      {ml_note}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:700;color:#e0e0e0">{newsletter_count}</div><div style="font-size:12px;color:#aaa">Newsletter Subscribers</div></td>
          <td style="padding:12px;text-align:center"><div style="font-size:28px;font-weight:700;color:#e0e0e0">{starter_count}</div><div style="font-size:12px;color:#aaa">Starter Plan Signups</div></td>
          {stripe_html}
        </tr>
      </table>
    </div>"""


# ── Section 5: SEO Opportunities ─────────────────────────────────────────────

def get_seo_suggestions(anthropic_key, gsc_data, traffic_data):
    try:
        if not anthropic_key:
            return None

        context_parts = []
        if not gsc_data.get("error"):
            cur = gsc_data["current"]
            context_parts.append(f"GSC (last 7 days): {cur['impressions']} impressions, {cur['clicks']} clicks, avg position {cur['position']}")
            if gsc_data.get("top_queries"):
                q_lines = "\n".join(f"  - {q} ({imp} imp, {clk} clicks)" for q, imp, clk in gsc_data["top_queries"])
                context_parts.append(f"Top queries:\n{q_lines}")
        if not traffic_data.get("error"):
            pages = traffic_data.get("top_pages", [])
            if pages:
                p_lines = "\n".join(f"  - {p} ({v} views)" for p, v in pages)
                context_parts.append(f"Top pages (7d):\n{p_lines}")

        context = "\n\n".join(context_parts) or "No data available."
        prompt = f"""You are an SEO consultant for carnivoreweekly.com, a carnivore diet content site.

Site data:
{context}

Give 3-5 specific, actionable SEO improvements. For each one, write a ready-to-paste Claude Code prompt the site owner can run in their carnivore-weekly project. Be concrete — reference actual data from above where possible.

Format each suggestion exactly like this:
SUGGESTION: [title]
DESCRIPTION: [1-2 sentences explaining the opportunity]
PROMPT: python3 scripts/generate_weekly_content.py [or other specific command]
---"""

        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": anthropic_key, "anthropic-version": "2023-06-01",
                     "Content-Type": "application/json"},
            json={"model": "claude-haiku-4-5-20251001", "max_tokens": 1200,
                  "messages": [{"role": "user", "content": prompt}]},
            timeout=30,
        )
        if r.status_code == 200:
            return r.json()["content"][0]["text"]
        return None
    except Exception:
        return None


def parse_suggestions(raw):
    if not raw:
        return []
    blocks = raw.strip().split("---")
    suggestions = []
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = {k.strip(): v.strip() for k, _, v in (line.partition(": ") for line in block.splitlines() if ": " in line)}
        if "SUGGESTION" in lines:
            suggestions.append(lines)
    return suggestions


def render_seo_section(anthropic_key, gsc_data, traffic_data):
    raw = get_seo_suggestions(anthropic_key, gsc_data, traffic_data)
    suggestions = parse_suggestions(raw)

    if not suggestions:
        note = "SEO suggestions unavailable — add ANTHROPIC_API_KEY to environment." if not anthropic_key else "Could not generate SEO suggestions."
        return f'<div class="card"><h2 class="section-title">SEO Opportunities</h2><p class="muted">{note}</p></div>'

    cards = ""
    for s in suggestions:
        title = s.get("SUGGESTION", "Opportunity")
        desc = s.get("DESCRIPTION", "")
        prompt_text = s.get("PROMPT", "")
        cards += f"""
        <div style="border:1px solid #333;border-radius:6px;padding:14px;margin-bottom:12px">
          <div style="font-weight:600;color:#d4a017;margin-bottom:6px">{title}</div>
          <p style="color:#ccc;font-size:13px;margin:0 0 10px">{desc}</p>
          <div style="background:#111;border-radius:4px;padding:10px;font-family:monospace;font-size:12px;color:#7ec8e3;word-break:break-all">{prompt_text}</div>
        </div>"""

    return f'<div class="card"><h2 class="section-title">SEO Opportunities</h2>{cards}</div>'


# ── Section 6: Content CTA ───────────────────────────────────────────────────

def render_content_cta():
    return """
    <div class="card" style="border-color:#d4a017">
      <h2 class="section-title">Generate This Week's Content</h2>
      <p style="color:#ccc;margin:0 0 10px">To generate posts for the topics above, open Claude Code in <code style="background:#111;padding:2px 6px;border-radius:3px;color:#7ec8e3">carnivore-weekly</code> and paste:</p>
      <div style="background:#111;border-radius:4px;padding:12px;font-family:monospace;font-size:13px;color:#7ec8e3">python3 scripts/generate_weekly_content.py</div>
    </div>"""


# ── HTML Shell ───────────────────────────────────────────────────────────────

def build_email(sections, date_str):
    body = "\n".join(sections)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body {{margin:0;padding:0;background:#1a1a1a;font-family:system-ui,-apple-system,sans-serif;color:#e0e0e0}}
  .wrapper {{max-width:640px;margin:0 auto;padding:24px 16px}}
  .header {{background:#252525;border-radius:10px;padding:24px;text-align:center;margin-bottom:20px;border-bottom:3px solid #d4a017}}
  .header h1 {{margin:0;font-size:22px;color:#d4a017}}
  .header p {{margin:6px 0 0;color:#aaa;font-size:13px}}
  .card {{background:#252525;border-radius:10px;padding:20px;margin-bottom:16px;border:1px solid #333}}
  .section-title {{margin:0 0 14px;font-size:16px;color:#d4a017;border-bottom:1px solid #333;padding-bottom:8px}}
  .muted {{color:#888;font-size:13px;margin:0}}
  .footer {{text-align:center;padding:20px;color:#555;font-size:12px}}
  td {{vertical-align:top}}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🥩 Carnivore Weekly — Site Report</h1>
    <p>{date_str}</p>
  </div>
  {body}
  <div class="footer">Generated by the automation pipeline &middot; carnivoreweekly.com</div>
</div>
</body>
</html>"""


# ── Send via Resend ──────────────────────────────────────────────────────────

def send_email(resend_key, admin_email, subject, html):
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={"from": "Carnivore Weekly Bot <bot@carnivoreweekly.com>",
                  "to": [admin_email], "subject": subject, "html": html},
            timeout=15,
        )
        return r.status_code, r.text
    except Exception as e:
        return None, str(e)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    today = datetime.date.today()
    date_str = today.strftime("%B %d, %Y")
    creds = get_credentials()

    print(f"[site-report] Generating weekly report for {date_str}...")

    topics, community_pulse = get_topics_data()
    print("[site-report] Fetching GA4 traffic...")
    traffic_data = get_ga4_traffic()
    print("[site-report] Fetching GSC search data...")
    gsc_data = get_gsc_data()

    sections = [
        render_topics_section(topics, community_pulse),
        render_traffic_section(traffic_data),
        render_search_section(gsc_data),
        render_signup_section(creds),
        render_seo_section(creds["anthropic_key"], gsc_data, traffic_data),
        render_content_cta(),
    ]

    html = build_email(sections, date_str)
    subject = f"🥩 Weekly Site Report — {date_str}"

    if not creds["resend_key"]:
        out_path = os.path.join(BASE_DIR, "dashboard", "site-report-preview.html")
        with open(out_path, "w") as f:
            f.write(html)
        print(f"[site-report] No Resend key — saved preview to {out_path}")
        return

    print(f"[site-report] Sending to {creds['admin_email']}...")
    status, body = send_email(creds["resend_key"], creds["admin_email"], subject, html)
    if status and 200 <= status < 300:
        print(f"[site-report] Sent successfully (HTTP {status})")
    else:
        print(f"[site-report] Send failed (HTTP {status}): {body}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Send styled HTML newsletters via Resend Broadcasts.

Pulls subscriber emails from Beehiiv API, sends the fully-styled HTML
newsletter through Resend so all inline CSS and table layouts are preserved.

Usage:
    python3 scripts/send_newsletter.py                    # CW, latest newsletter
    python3 scripts/send_newsletter.py --date 2026-06-01  # CW, specific date
    python3 scripts/send_newsletter.py --site kd          # KetoDial newsletter
    python3 scripts/send_newsletter.py --test             # Send test to iambrew@gmail.com only
    python3 scripts/send_newsletter.py --dry-run          # Show what would be sent, don't send
"""

import argparse
import json
import os
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).parent.parent
SECRETS_PATH = PROJECT_ROOT / "secrets" / "api-keys.json"

SITES = {
    "cw": {
        "name": "Carnivore Weekly",
        "from_email": "newsletter@carnivoreweekly.com",
        "from_name": "Carnivore Weekly",
        "reply_to": "iambrew@gmail.com",
        "newsletter_dir": PROJECT_ROOT / "newsletters",
        "content_json": PROJECT_ROOT / "data" / "newsletter_content.json",
    },
    "kd": {
        "name": "KetoDial",
        "from_email": "ketodial@carnivoreweekly.com",
        "from_name": "KetoDial — The Weekly Dial-In",
        "reply_to": "iambrew@gmail.com",
        "newsletter_dir": PROJECT_ROOT / "ketodial" / "public" / "newsletter",
        "content_json": None,
    },
    "kd_coach": {
        "name": "KetoDial Coach",
        "from_email": "coach@carnivoreweekly.com",
        "from_name": "Your KetoDial Coach",
        "reply_to": "iambrew@gmail.com",
        "newsletter_dir": PROJECT_ROOT / "ketodial" / "coach-app" / "emails",
        "content_json": None,
    },
}

TEST_EMAIL = "iambrew@gmail.com"


def load_secrets():
    sb_url = os.environ.get("SUPABASE_URL")
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    resend_key = os.environ.get("RESEND_API_KEY")
    if sb_url and sb_key and resend_key:
        return {
            "supabase": {"url": sb_url, "service_role_key": sb_key},
            "resend": {"key": resend_key},
        }
    secrets = json.loads(SECRETS_PATH.read_text())
    if not secrets.get("resend", {}).get("key"):
        print("Error: resend.key missing from secrets/api-keys.json")
        sys.exit(1)
    return secrets


def get_subscribers(secrets, site):
    sb = secrets.get("supabase", {})
    url = sb.get("url", "").rstrip("/")
    key = sb.get("service_role_key") or sb.get("anon_key")
    if not url or not key:
        print("Error: supabase.url / supabase.service_role_key missing from secrets")
        sys.exit(1)

    resp = requests.get(
        f"{url}/rest/v1/newsletter_subscribers",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        },
        params={
            "select": "email",
            "site": f"eq.{site}",
            "status": "eq.active",
        },
    )
    resp.raise_for_status()
    return [row["email"] for row in resp.json()]


def load_newsletter_html(site_config, date=None):
    newsletter_dir = site_config["newsletter_dir"]
    if date:
        html_path = newsletter_dir / f"{date}.html"
    else:
        html_path = newsletter_dir / "latest.html"
        if not html_path.exists():
            htmls = sorted(newsletter_dir.glob("202*.html"), reverse=True)
            if htmls:
                html_path = htmls[0]

    if not html_path.exists():
        print(f"Error: {html_path} not found")
        sys.exit(1)

    html = html_path.read_text(encoding="utf-8")
    print(f"Loaded {html_path.name} ({len(html):,} bytes)")
    return html, html_path.stem


def load_subject(site_config):
    content_json = site_config.get("content_json")
    if content_json and content_json.exists():
        data = json.loads(content_json.read_text())
        return data.get("subject_line", f"{site_config['name']} Newsletter")
    return f"{site_config['name']} — The Weekly Dial-In"


UNSUB_BASE = "https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe"


def personalize_html(html, email, site):
    from urllib.parse import quote
    unsub_url = f"{UNSUB_BASE}?email={quote(email)}&site={site}"
    html = html.replace("{{unsubscribe_url}}", unsub_url)
    html = html.replace("{{ unsubscribe_link }}", unsub_url)
    return html


def send_via_resend(resend_key, from_email, from_name, reply_to, to_emails, subject, html, site):
    results = []
    for email in to_emails:
        personalized = personalize_html(html, email, site)
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"{from_name} <{from_email}>",
                "to": [email],
                "reply_to": reply_to,
                "subject": subject,
                "html": personalized,
            },
        )
        if resp.status_code == 200:
            results.append((email, "sent", resp.json().get("id", "")))
        else:
            results.append((email, "failed", resp.text[:100]))
    return results


def main():
    parser = argparse.ArgumentParser(description="Send newsletter via Resend")
    parser.add_argument("--site", choices=["cw", "kd", "kd_coach"], default="cw", help="Which site (default: cw)")
    parser.add_argument("--date", help="Specific newsletter date (YYYY-MM-DD)")
    parser.add_argument("--test", action="store_true", help="Send only to test email")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be sent")
    args = parser.parse_args()

    site = SITES[args.site]
    secrets = load_secrets()
    resend_key = secrets["resend"]["key"]

    html, date_slug = load_newsletter_html(site, args.date)
    subject = load_subject(site)

    if args.test:
        to_emails = [TEST_EMAIL]
        print(f"TEST MODE: sending to {TEST_EMAIL} only")
    else:
        to_emails = get_subscribers(secrets, args.site)
        print(f"Found {len(to_emails)} active subscribers")

    print(f"\n{'=' * 60}")
    print(f"  Site:    {site['name']}")
    print(f"  From:    {site['from_name']} <{site['from_email']}>")
    print(f"  Subject: {subject}")
    print(f"  To:      {len(to_emails)} recipient(s)")
    print(f"  HTML:    {len(html):,} bytes")
    print(f"{'=' * 60}\n")

    if args.dry_run:
        print("DRY RUN — no emails sent")
        for email in to_emails:
            print(f"  Would send to: {email}")
        return

    results = send_via_resend(
        resend_key, site["from_email"], site["from_name"],
        site["reply_to"], to_emails, subject, html, args.site,
    )

    sent = sum(1 for _, status, _ in results if status == "sent")
    failed = sum(1 for _, status, _ in results if status == "failed")

    print(f"\nResults: {sent} sent, {failed} failed")
    for email, status, detail in results:
        icon = "✅" if status == "sent" else "❌"
        print(f"  {icon} {email} — {detail[:60]}")


if __name__ == "__main__":
    main()

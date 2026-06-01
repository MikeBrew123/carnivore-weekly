#!/usr/bin/env python3
"""
Daily drip email sender for the 7-Day Carnivore Starter sequence.

Queries drip_subscribers for anyone not completed/unsubscribed,
sends the next day's email via Resend, bumps the counter.
After day 7, marks completed and auto-subscribes to the CW weekly newsletter.

Run daily (Hermes cron or GitHub Action).

Usage:
    python3 scripts/send_drip.py              # Send pending drip emails
    python3 scripts/send_drip.py --dry-run    # Show what would be sent
    python3 scripts/send_drip.py --test       # Reset and send day 1 to iambrew@gmail.com
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).parent.parent
SECRETS_PATH = PROJECT_ROOT / "secrets" / "api-keys.json"
DRIP_DIR = PROJECT_ROOT / "data" / "drip-emails"

FROM_EMAIL = "Carnivore Weekly <newsletter@carnivoreweekly.com>"
REPLY_TO = "iambrew@gmail.com"
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
    return secrets


def supabase_query(secrets, table, params):
    sb = secrets["supabase"]
    key = sb["service_role_key"]
    resp = requests.get(
        f"{sb['url']}/rest/v1/{table}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
        params=params,
    )
    resp.raise_for_status()
    return resp.json()


def supabase_update(secrets, table, row_id, data):
    sb = secrets["supabase"]
    key = sb["service_role_key"]
    resp = requests.patch(
        f"{sb['url']}/rest/v1/{table}?id=eq.{row_id}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=data,
    )
    resp.raise_for_status()


def supabase_insert(secrets, table, data):
    sb = secrets["supabase"]
    key = sb["service_role_key"]
    resp = requests.post(
        f"{sb['url']}/rest/v1/{table}",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json=data,
    )
    return resp


def load_drip_email(day):
    path = DRIP_DIR / f"day-{day}.html"
    if not path.exists():
        return None, None
    html = path.read_text(encoding="utf-8")
    subject_match = re.search(r'Subject:\s*(.+?)(?:\s*-->)', html)
    subject = subject_match.group(1).strip() if subject_match else f"Day {day} — Your Carnivore Starter"
    return subject, html


def send_email(resend_key, to, subject, html):
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": FROM_EMAIL,
            "to": [to],
            "reply_to": REPLY_TO,
            "subject": subject,
            "html": html,
        },
    )
    return resp.status_code == 200, resp.json() if resp.status_code == 200 else resp.text


def main():
    parser = argparse.ArgumentParser(description="Send daily drip emails")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test", action="store_true", help="Send day 1 to test email")
    args = parser.parse_args()

    secrets = load_secrets()
    resend_key = secrets["resend"]["key"]

    if args.test:
        subject, html = load_drip_email(1)
        if not html:
            print("Error: day-1.html not found")
            sys.exit(1)
        ok, detail = send_email(resend_key, TEST_EMAIL, subject, html)
        print(f"{'✅' if ok else '❌'} Test → {TEST_EMAIL}: {subject}")
        return

    pending = supabase_query(secrets, "drip_subscribers", {
        "select": "id,email,current_day",
        "completed": "eq.false",
        "unsubscribed": "eq.false",
    })

    if not pending:
        print("No pending drip subscribers")
        return

    print(f"Found {len(pending)} pending subscriber(s)\n")
    now = datetime.now(timezone.utc).isoformat()

    sent = 0
    graduated = 0
    for sub in pending:
        next_day = sub["current_day"] + 1
        if next_day > 7:
            supabase_update(secrets, "drip_subscribers", sub["id"], {
                "completed": True,
            })
            supabase_insert(secrets, "newsletter_subscribers", {
                "email": sub["email"],
                "site": "cw",
                "status": "active",
                "signup_source": "direct",
            })
            graduated += 1
            print(f"  🎓 {sub['email']} — completed drip, added to CW weekly")
            continue

        subject, html = load_drip_email(next_day)
        if not html:
            print(f"  ⚠️  day-{next_day}.html missing, skipping {sub['email']}")
            continue

        if args.dry_run:
            print(f"  Would send day {next_day} to {sub['email']}: {subject}")
            continue

        ok, detail = send_email(resend_key, sub["email"], subject, html)
        if ok:
            supabase_update(secrets, "drip_subscribers", sub["id"], {
                "current_day": next_day,
                "last_sent_at": now,
            })
            sent += 1
            print(f"  ✅ Day {next_day} → {sub['email']}: {subject}")
        else:
            print(f"  ❌ Day {next_day} → {sub['email']}: {str(detail)[:80]}")

    print(f"\nDone: {sent} sent, {graduated} graduated to weekly")


if __name__ == "__main__":
    main()

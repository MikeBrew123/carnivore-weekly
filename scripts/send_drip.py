#!/usr/bin/env python3
"""
Daily drip email sender for the 30-Day Carnivore Starter sequence.

Queries drip_subscribers for anyone not completed/unsubscribed,
sends the next day's email via Resend, bumps the counter.
The sequence is sparse past day 7 (days 10, 14, 21, 28); days with no
day-N.html advance the counter silently without sending.
Day 28 is segmented: subscribers whose latest calculator session has
diet_type=keto get day-28-keto.html, everyone else gets day-28.html.
After day 28, marks completed and auto-subscribes to the CW weekly newsletter.

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
WEBHOOK_URL = os.environ.get("RESEND_WEBHOOK_URL", "")
FINAL_DAY = 28  # Graduate to the weekly newsletter after this day's email
UNSUB_URL = "https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe"


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


def load_drip_email(day, variant=None):
    path = DRIP_DIR / (f"day-{day}-{variant}.html" if variant else f"day-{day}.html")
    if variant and not path.exists():
        path = DRIP_DIR / f"day-{day}.html"  # fall back to the default email
    if not path.exists():
        return None, None
    html = path.read_text(encoding="utf-8")
    subject_match = re.search(r'Subject:\s*(.+?)(?:\s*-->)', html)
    subject = subject_match.group(1).strip() if subject_match else f"Day {day} — Your Carnivore Starter"
    return subject, html


def get_diet_type(secrets, email):
    """Latest calculator diet_type for this email, or '' if none."""
    try:
        rows = supabase_query(secrets, "calculator_sessions_v2", {
            "select": "diet_type",
            "email": f"eq.{email}",
            "order": "created_at.desc",
            "limit": "1",
        })
        return (rows[0].get("diet_type") or "").lower() if rows else ""
    except Exception:
        return ""


def personalize(html, email):
    """Substitute merge tags. {$unsubscribe} was previously sent literally (dead link)."""
    from urllib.parse import quote
    return html.replace("{$unsubscribe}", f"{UNSUB_URL}?email={quote(email)}")


def send_email(resend_key, to, subject, html, tags=None):
    from urllib.parse import quote
    payload = {
        "from": FROM_EMAIL,
        "to": [to],
        "reply_to": REPLY_TO,
        "subject": subject,
        "html": html,
        "headers": {
            "X-Entity-Ref-ID": f"drip-{to}-{subject[:30]}",
            "List-Unsubscribe": f"<{UNSUB_URL}?email={quote(to)}>",
        },
    }
    if tags:
        payload["tags"] = tags
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json",
        },
        json=payload,
    )
    result = resp.json() if resp.status_code == 200 else resp.text
    if resp.status_code == 200:
        email_id = result.get("id", "")
        log_drip_event(secrets_cache, to, subject, email_id, tags)
    return resp.status_code == 200, result


# Global ref for secrets inside send_email logging
secrets_cache = None


def log_drip_event(secrets, to, subject, email_id, tags):
    """Log each send to drip_events table for open/click tracking."""
    if not secrets:
        return
    try:
        supabase_insert(secrets, "drip_events", {
            "email": to,
            "resend_id": email_id,
            "event_type": "sent",
            "subject": subject,
            "tags": json.dumps(tags) if tags else None,
        })
    except Exception:
        pass  # Non-critical, don't break sends


MAX_SENDS_PER_RUN = 20  # Hard cap — if more than this, something is wrong


def already_sent_today(secrets, email):
    """Check if this email already received a drip today. Prevents duplicates."""
    sb = secrets["supabase"]
    key = sb["service_role_key"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        resp = requests.get(
            f"{sb['url']}/rest/v1/drip_subscribers",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            params={
                "select": "last_sent_at",
                "email": f"eq.{email}",
            },
        )
        if resp.status_code == 200 and resp.json():
            last = resp.json()[0].get("last_sent_at", "")
            if last and last[:10] == today:
                return True
    except Exception:
        pass  # Fail open — better to risk a send than silently skip
    return False


def main():
    parser = argparse.ArgumentParser(description="Send daily drip emails")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test", action="store_true",
                        help="Dry-run Day 1 to test email (prints what WOULD send, never actually sends)")
    args = parser.parse_args()

    secrets = load_secrets()
    global secrets_cache
    secrets_cache = secrets
    resend_key = secrets["resend"]["key"]

    if args.test:
        subject, html = load_drip_email(1)
        if not html:
            print("Error: day-1.html not found")
            sys.exit(1)
        print(f"🧪 TEST MODE — would send to {TEST_EMAIL}: {subject}")
        print(f"   HTML size: {len(html):,} bytes")
        print(f"   ⚠️  No email sent. Use normal run to send.")
        return

    pending = supabase_query(secrets, "drip_subscribers", {
        "select": "id,email,current_day",
        "completed": "eq.false",
        "unsubscribed": "eq.false",
    })

    if not pending:
        print("No pending drip subscribers")
        return

    if len(pending) > MAX_SENDS_PER_RUN:
        print(f"🚨 SAFETY STOP: {len(pending)} subscribers exceeds cap of {MAX_SENDS_PER_RUN}.")
        print("   This is unexpected. Check for bad data before proceeding.")
        print("   Override with MAX_SENDS_PER_RUN env var if intentional.")
        cap = int(os.environ.get("MAX_SENDS_PER_RUN", MAX_SENDS_PER_RUN))
        if len(pending) > cap:
            sys.exit(1)

    print(f"Found {len(pending)} pending subscriber(s)\n")
    now = datetime.now(timezone.utc).isoformat()

    sent = 0
    skipped_dup = 0
    graduated = 0
    for sub in pending:
        next_day = sub["current_day"] + 1
        if next_day > FINAL_DAY:
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

        variant = None
        if next_day == 28:
            diet = get_diet_type(secrets, sub["email"])
            variant = "keto" if diet == "keto" else None

        subject, html = load_drip_email(next_day, variant)
        if not html:
            # Sparse sequence: no email defined for this day — advance silently
            if args.dry_run:
                print(f"  Would advance {sub['email']} to day {next_day} (quiet day, no email)")
                continue
            supabase_update(secrets, "drip_subscribers", sub["id"], {
                "current_day": next_day,
            })
            print(f"  💤 {sub['email']} — day {next_day} is a quiet day, advanced without sending")
            continue

        if args.dry_run:
            print(f"  Would send day {next_day} to {sub['email']}: {subject}")
            continue

        # Dedup: skip if already sent today (prevents double-sends from re-runs)
        if already_sent_today(secrets, sub["email"]):
            skipped_dup += 1
            print(f"  ⏭️  {sub['email']} — already sent today, skipping")
            continue

        tags = [
            {"name": "drip_day", "value": str(next_day)},
            {"name": "sequence", "value": "30day-starter"},
        ]
        ok, detail = send_email(resend_key, sub["email"], subject, personalize(html, sub["email"]), tags=tags)
        if ok:
            supabase_update(secrets, "drip_subscribers", sub["id"], {
                "current_day": next_day,
                "last_sent_at": now,
            })
            sent += 1
            print(f"  ✅ Day {next_day} → {sub['email']}: {subject}")
        else:
            print(f"  ❌ Day {next_day} → {sub['email']}: {str(detail)[:80]}")

    summary = f"\nDone: {sent} sent, {graduated} graduated to weekly"
    if skipped_dup:
        summary += f", {skipped_dup} skipped (already sent today)"
    print(summary)


if __name__ == "__main__":
    main()

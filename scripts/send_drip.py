#!/usr/bin/env python3
"""
Daily drip email sender for the 30-day starter sequences.

Runs one site per invocation (CW by default, KetoDial with --site kd).
Queries drip_subscribers for anyone on that site not completed/unsubscribed,
sends the next day's email via Resend, bumps the counter.
Both sequences are sparse past day 7 (days 10, 14, 21, 28); days with no
day-N.html advance the counter silently without sending.

CW: only carnivore-diet signups enter (keto/low-carb are deflected to the KD
side at calculator Step 2 — see handleSubscribe in the worker).
KD: keto/low-carb calculator selectors and KD homepage signups.
After day 28, marks completed and auto-subscribes to that site's weekly newsletter.

Run daily (GitHub Action daily-publish.yml).

Usage:
    python3 scripts/send_drip.py                     # Send pending CW drip emails
    python3 scripts/send_drip.py --site kd           # Send pending KD drip emails
    python3 scripts/send_drip.py --dry-run           # Show what would be sent
    python3 scripts/send_drip.py --test              # Print day 1 info, never sends
    python3 scripts/send_drip.py --site kd --preview-to iambrew@gmail.com
                                                     # Send EVERY day's email to one
                                                     # address for copy review (uses
                                                     # fallback promo, no minting)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).parent.parent
SECRETS_PATH = PROJECT_ROOT / "secrets" / "api-keys.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from subscriber_hygiene import is_undeliverable_fixture  # noqa: E402

TEST_EMAIL = "iambrew@gmail.com"
WEBHOOK_URL = os.environ.get("RESEND_WEBHOOK_URL", "")
FINAL_DAY = 28  # Graduate to the weekly newsletter after this day's email
UNSUB_URL = "https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe"

# ===== Expiring per-subscriber promo codes (days 7 & 28) =====
# Each day-7/day-28 send mints a unique single-use Stripe promotion code with
# a REAL 48h expiry, so the email's urgency claim is true and Stripe-enforced.
# The CW checkout worker validates unknown codes via validatePromotionCode()
# (api/calculator-api.js); the KD embedded checkout accepts them through its
# promo-code field (allow_promotion_codes, ketodial/worker/index.js). Both
# sites bill the same Stripe account, so one coupon backs both sequences.
# If minting fails, the send falls back to the static DRIP50 code with copy
# that makes no expiry claim.
STRIPE_VERSION = "2024-06-20"  # newer account-default versions changed the promotion_codes shape
DRIP_COUPON_ID = "52fYA51M"    # 50% off — same Stripe coupon behind DRIP50/ETSY50
PROMO_EXPIRY_HOURS = 48
PROMO_FALLBACK_CODE = "DRIP50"
PROMO_DAYS = {7: "WEEK1", 28: "GRAD"}
PROMO_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L lookalikes

# Per-site promo copy. "real" may claim the 48h window because Stripe enforces
# it on minted codes; "fallback" must NEVER claim expiry.
# CW copy by Sarah (2026-07-19). KD copy by Sarah/Chloe (2026-07-20).
PROMO_COPY = {
    "cw": {
        7: {
            "real": "Your code {code} was made just for you: it works once, and it stops working 48 hours after this email went out. That's a real window Stripe enforces, not a marketing countdown, so if life gets in the way and it lapses, no hard feelings, the plan's still here at $29 whenever you're ready.",
            "fallback": "This is my one-week milestone reward, and $14.50 is the best price I'll ever put on it. Your code {code} has no countdown clock. It's here when you're ready.",
        },
        28: {
            "real": "It's $29, but you finished all 30 days, so I made you a graduation code: {code} brings it down to $14.50. It's yours alone, it works once, and it expires 48 hours after this email went out. That's a real window, not pressure, so if the timing's wrong, let it go and know the plan's still here at full price whenever you want it.",
            "fallback": "It's $29, but the code {code} brings it down to $14.50, the same deal I gave you at the one-week mark. There's no countdown clock on this one. It's here whenever you're ready.",
        },
    },
    "kd": {
        7: {
            "real": "Your code {code} was made just for you. It works once, on any report in the calculator, and it stops working 48 hours after this email went out. That's a real window Stripe enforces, not a countdown gimmick. If it lapses, no stress, the reports are still there at full price whenever you want them.",
            "fallback": "This is my one-week reward for you: code {code} takes half off any report in the calculator. No countdown clock on this one. It's here when you're ready.",
        },
        28: {
            "real": "You finished the month, so I made you a graduation code: {code} takes half off any report in the calculator. It's yours alone, it works once, and it expires 48 hours after this email went out. That's a real deadline, not pressure. If the timing's wrong, let it go and grab the reports at full price whenever it suits you.",
            "fallback": "Code {code} takes half off any report in the calculator, the same deal I gave you at the one-week mark. There's no countdown on this one. It's here whenever you're ready.",
        },
    },
}

# ===== Per-site sending config =====
SITES = {
    "cw": {
        "name": "Carnivore Weekly",
        "from_email": "Carnivore Weekly <newsletter@carnivoreweekly.com>",
        "reply_to": "newsletter@carnivoreweekly.com",
        "drip_dir": PROJECT_ROOT / "data" / "drip-emails",
        "sequence": "30day-starter",
        "newsletter_site": "cw",
        # Legacy CW links carry no site param; the unsubscribe handler defaults to cw.
        "unsub_extra": "",
        "default_subject": "Your First Weeks on Carnivore",
    },
    "kd": {
        "name": "KetoDial",
        "from_email": "KetoDial <ketodial@carnivoreweekly.com>",
        # Replies ride the @carnivoreweekly.com inbound catch-all: the inbox is
        # scanned daily and Brew gets one digest with proposed drafts from Sarah.
        "reply_to": "ketodial@carnivoreweekly.com",
        "drip_dir": PROJECT_ROOT / "data" / "drip-emails" / "kd",
        "sequence": "kd-30day-starter",
        "newsletter_site": "kd",
        "unsub_extra": "&site=kd",
        "default_subject": "Day {day} — Your Keto Starter",
    },
}

SITE = "cw"          # set from --site in main()
CFG = SITES["cw"]    # set from --site in main()


def mint_promo_code(stripe_key, day, email):
    """Create a unique single-use Stripe promotion code expiring in 48h.
    Returns the code string, or None on any failure (caller falls back)."""
    import secrets as pysecrets
    prefix = PROMO_DAYS[day]
    for attempt in range(2):
        code = prefix + "-" + "".join(pysecrets.choice(PROMO_CODE_ALPHABET) for _ in range(5))
        try:
            resp = requests.post(
                "https://api.stripe.com/v1/promotion_codes",
                auth=(stripe_key, ""),
                headers={"Stripe-Version": STRIPE_VERSION},
                data={
                    "coupon": DRIP_COUPON_ID,
                    "code": code,
                    "max_redemptions": "1",
                    "expires_at": str(int(datetime.now(timezone.utc).timestamp()) + PROMO_EXPIRY_HOURS * 3600),
                    "metadata[drip_day]": str(day),
                    "metadata[email]": email,
                    "metadata[site]": SITE,
                },
                timeout=15,
            )
            body = resp.json()
            # livemode check: a test-mode key would mint codes live checkout rejects
            if resp.status_code == 200 and body.get("livemode") and body.get("active"):
                return code
            print(f"  ⚠️  promo mint attempt {attempt + 1} failed: {str(body.get('error', body))[:120]}")
        except Exception as e:
            print(f"  ⚠️  promo mint attempt {attempt + 1} error: {e}")
    return None


def apply_promo(html, day, email, stripe_key):
    """Merge the per-subscriber promo code and matching urgency copy into
    day-7/day-28 emails. Any other day passes through untouched."""
    if day not in PROMO_DAYS:
        return html
    code = mint_promo_code(stripe_key, day, email) if stripe_key else None
    variant = "real" if code else "fallback"
    if not code:
        code = PROMO_FALLBACK_CODE
        print(f"  ⚠️  no minted code — using {code} with no-expiry copy")
    line = PROMO_COPY[SITE][day][variant].replace("{code}", code)
    return (
        html.replace("{$promo_code}", code)
            .replace("{$promo_urgency}", line)
            .replace("{$promo_pitch}", line)
    )


def load_secrets():
    sb_url = os.environ.get("SUPABASE_URL")
    sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    resend_key = os.environ.get("RESEND_API_KEY")
    if sb_url and sb_key and resend_key:
        return {
            "supabase": {"url": sb_url, "service_role_key": sb_key},
            "resend": {"key": resend_key},
            # Optional: enables per-subscriber expiring promo codes on days 7/28.
            # Missing key just means those sends fall back to the static DRIP50.
            "stripe": {"secret_key_live": os.environ.get("STRIPE_SECRET_KEY", "")},
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
    drip_dir = CFG["drip_dir"]
    path = drip_dir / (f"day-{day}-{variant}.html" if variant else f"day-{day}.html")
    if variant and not path.exists():
        path = drip_dir / f"day-{day}.html"  # fall back to the default email
    if not path.exists():
        return None, None
    html = path.read_text(encoding="utf-8")
    subject_match = re.search(r'Subject:\s*(.+?)(?:\s*-->)', html)
    subject = subject_match.group(1).strip() if subject_match else CFG["default_subject"].format(day=day)
    return subject, html


def personalize(html, email):
    """Substitute merge tags. {$unsubscribe} was previously sent literally (dead link)."""
    from urllib.parse import quote
    unsub = f"{UNSUB_URL}?email={quote(email)}{CFG['unsub_extra']}"
    return html.replace("{$unsubscribe}", unsub)


def send_email(resend_key, to, subject, html, tags=None, log=True):
    from urllib.parse import quote
    payload = {
        "from": CFG["from_email"],
        "to": [to],
        "reply_to": CFG["reply_to"],
        "subject": subject,
        "html": html,
        "headers": {
            "X-Entity-Ref-ID": f"drip-{to}-{subject[:30]}",
            "List-Unsubscribe": f"<{UNSUB_URL}?email={quote(to)}{CFG['unsub_extra']}>",
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
    if resp.status_code == 200 and log:
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
            "site": SITE,
            "tags": json.dumps(tags) if tags else None,
        })
    except Exception:
        pass  # Non-critical, don't break sends


MIN_SEND_CAP = 50  # Floor for the dynamic cap so the list can always grow into it


def dynamic_send_cap(secrets):
    """Safety cap that grows with the list: 3x the busiest send day of the
    past week ON THIS SITE, never below MIN_SEND_CAP. Catches a bad-data
    signup flood (ISSUE-040) without strangling organic growth (ISSUE-043)."""
    try:
        since = datetime.now(timezone.utc) - timedelta(days=7)
        rows = supabase_query(secrets, "drip_events", {
            "select": "created_at",
            "event_type": "eq.sent",
            "site": f"eq.{SITE}",
            "created_at": f"gte.{since.isoformat()}",
        })
        by_day = {}
        for r in rows:
            day = (r.get("created_at") or "")[:10]
            by_day[day] = by_day.get(day, 0) + 1
        busiest = max(by_day.values(), default=0)
        return max(MIN_SEND_CAP, busiest * 3)
    except Exception:
        return MIN_SEND_CAP  # Fail safe but recoverable


def already_sent_today(secrets, email):
    """Check if this email already received this site's drip today. Prevents duplicates."""
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
                "site": f"eq.{SITE}",
            },
        )
        if resp.status_code == 200 and resp.json():
            last = resp.json()[0].get("last_sent_at", "")
            if last and last[:10] == today:
                return True
    except Exception:
        pass  # Fail open — better to risk a send than silently skip
    return False


def preview_all(resend_key, to):
    """Send every existing day's email for this site to one address for copy
    review. Uses the fallback promo path (no Stripe minting) and does NOT log
    to drip_events or touch subscriber state."""
    days = sorted(
        int(m.group(1)) for f in CFG["drip_dir"].glob("day-*.html")
        if (m := re.match(r"day-(\d+)\.html$", f.name))
    )
    if not days:
        print(f"No templates found in {CFG['drip_dir']}")
        sys.exit(1)
    print(f"📬 Preview: sending {len(days)} {CFG['name']} drip emails to {to}\n")
    for day in days:
        subject, html = load_drip_email(day)
        html = apply_promo(html, day, to, stripe_key="")  # fallback path, no minting
        ok, detail = send_email(resend_key, to, f"[PREVIEW d{day}] {subject}",
                                personalize(html, to), log=False)
        print(f"  {'✅' if ok else '❌'} day {day}: {subject}" + ("" if ok else f" — {str(detail)[:80]}"))


def main():
    parser = argparse.ArgumentParser(description="Send daily drip emails")
    parser.add_argument("--site", choices=list(SITES), default="cw",
                        help="Which site's drip to send (default: cw)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test", action="store_true",
                        help="Dry-run Day 1 to test email (prints what WOULD send, never actually sends)")
    parser.add_argument("--preview-to", metavar="EMAIL",
                        help="Send every existing day's email to this address for copy review")
    args = parser.parse_args()

    global SITE, CFG
    SITE = args.site
    CFG = SITES[SITE]

    secrets = load_secrets()
    global secrets_cache
    secrets_cache = secrets
    resend_key = secrets["resend"]["key"]

    if args.test:
        subject, html = load_drip_email(1)
        if not html:
            print(f"Error: day-1.html not found in {CFG['drip_dir']}")
            sys.exit(1)
        print(f"🧪 TEST MODE ({SITE}) — would send to {TEST_EMAIL}: {subject}")
        print(f"   HTML size: {len(html):,} bytes")
        print(f"   ⚠️  No email sent. Use normal run to send.")
        return

    if args.preview_to:
        preview_all(resend_key, args.preview_to)
        return

    pending = supabase_query(secrets, "drip_subscribers", {
        "select": "id,email,current_day,subscribed_at",
        "site": f"eq.{SITE}",
        "completed": "eq.false",
        "unsubscribed": "eq.false",
        # Set by the Resend webhook on a permanent bounce or spam complaint.
        # Without this the cron re-sends to dead addresses every day for the
        # rest of the sequence, which is what tanked KD's bounce rate in Aug.
        "bounced_at": "is.null",
    })

    # Fixture guard (Brew, 2026-08-31, bounce review rule 2). Reserved and
    # fixture domains cannot belong to a real person, so a live send to one is
    # always a mistake: it burns sending reputation and, for anything on a
    # deliverable domain that merely looks seeded, mails somebody who never
    # asked. The coach reminder path has had this guard since 2026-09-01; the
    # drip had nothing, so a reseeded fixture would have been mailed daily.
    # Skipped rows are left completely untouched, not advanced and not marked.
    blocked = [s for s in pending if is_undeliverable_fixture(s.get("email"))]
    if blocked:
        pending = [s for s in pending if not is_undeliverable_fixture(s.get("email"))]
        for sub in blocked:
            print(f"  🚫 {sub.get('email')} — test fixture address, never mailed live")

    if not pending:
        print(f"No pending {SITE} drip subscribers")
        return

    cap = int(os.environ.get("MAX_SENDS_PER_RUN", 0)) or dynamic_send_cap(secrets)
    if len(pending) > cap:
        print(f"🚨 SAFETY STOP: {len(pending)} subscribers exceeds cap of {cap}.")
        print("   This looks like a bad-data signup flood. Check drip_subscribers before proceeding.")
        print("   Override with MAX_SENDS_PER_RUN env var if the volume is legitimate.")
        sys.exit(1)

    print(f"Found {len(pending)} pending {SITE} subscriber(s)\n")
    now = datetime.now(timezone.utc).isoformat()

    sent = 0
    skipped_dup = 0
    skipped_new = 0
    graduated = 0
    for sub in pending:
        next_day = sub["current_day"] + 1
        # 48h buffer before day-1 (Brew, 2026-08-30): KD signup triggers an
        # instant plan email, so day-1 landing on the next cron run meant two
        # emails in under 24h. KD ONLY for now — CW sends nothing at signup
        # yet, so gating CW here left new subscribers in 2-3 days of silence
        # (red-team finding, same day). Widen to both sites only when the CW
        # day-0 results/welcome email actually ships. Only day-0 rows are
        # gated; anyone mid-sequence is untouched.
        if SITE == "kd" and sub["current_day"] == 0 and sub.get("subscribed_at"):
            try:
                sub_at = datetime.fromisoformat(sub["subscribed_at"].replace("Z", "+00:00"))
                if datetime.now(timezone.utc) - sub_at < timedelta(hours=48):
                    print(f"  ⏳ {sub['email']}: subscribed {sub['subscribed_at'][:16]}, day-1 waits for the 48h buffer")
                    skipped_new += 1
                    continue
            except ValueError:
                pass  # unparseable timestamp: fail open, send rather than strand
        if next_day > FINAL_DAY:
            supabase_update(secrets, "drip_subscribers", sub["id"], {
                "completed": True,
            })
            supabase_insert(secrets, "newsletter_subscribers", {
                "email": sub["email"],
                "site": CFG["newsletter_site"],
                "status": "active",
                "signup_source": "direct",
            })
            graduated += 1
            print(f"  🎓 {sub['email']} — completed drip, added to {CFG['name']} weekly")
            continue

        subject, html = load_drip_email(next_day)
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
            {"name": "sequence", "value": CFG["sequence"]},
        ]
        stripe_key = (secrets.get("stripe") or {}).get("secret_key_live", "")
        html_merged = apply_promo(html, next_day, sub["email"], stripe_key)
        ok, detail = send_email(resend_key, sub["email"], subject, personalize(html_merged, sub["email"]), tags=tags)
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
    if skipped_new:
        summary += f", {skipped_new} waiting on the 48h day-1 buffer"
    print(summary)


if __name__ == "__main__":
    main()

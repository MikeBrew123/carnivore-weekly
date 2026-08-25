#!/usr/bin/env python3
"""One-off coach launch send, 2026-08-27.

Deliberately NOT send_newsletter.py: that script suppresses everyone still in
the 30-day drip, which here would drop 57% of the audience. This is an
announcement, not the weekly, so it goes to the union of both lists.

  python3 scripts/send_coach_launch.py --dry-run   # who would get it, sends nothing
  python3 scripts/send_coach_launch.py --test      # only Brew
  python3 scripts/send_coach_launch.py --send      # the real thing, requires --send
"""
import argparse, json, sys, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "emails" / "2026-08-27-coach-launch.html"
SUBJECT = "A small group I'm putting together"
FROM = "Sarah at Carnivore Weekly <newsletter@carnivoreweekly.com>"
REPLY_TO = "sarah@carnivoreweekly.com"
UNSUB = "https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe"
TEST_EMAILS = ["iambrew@gmail.com"]


def secrets():
    return json.loads((ROOT / "secrets" / "api-keys.json").read_text())


def audience(s):
    sb = s["supabase"]; url = sb["url"].rstrip("/"); key = sb["service_role_key"]
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    nl = requests.get(f"{url}/rest/v1/newsletter_subscribers",
                      headers=h, params={"select": "email", "site": "eq.cw", "status": "eq.active"})
    nl.raise_for_status()
    dr = requests.get(f"{url}/rest/v1/drip_subscribers", headers=h,
                      params={"select": "email", "site": "eq.cw",
                              "or": "(unsubscribed.is.null,unsubscribed.eq.false)"})
    dr.raise_for_status()
    emails = {r["email"].strip().lower() for r in nl.json() if r.get("email")}
    emails |= {r["email"].strip().lower() for r in dr.json() if r.get("email")}
    # never mail the seeded fixtures
    return sorted(e for e in emails
                  if not e.endswith("@test.ketodial.com") and not e.startswith("qa-"))


def personalise(html, email):
    from urllib.parse import quote
    return (html.replace("{{unsubscribe_url}}", f"{UNSUB}?email={quote(email)}&site=cw")
                .replace("{{first_name_comma}}", ","))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--send", action="store_true")
    a = ap.parse_args()
    if not (a.dry_run or a.test or a.send):
        ap.error("pick one of --dry-run, --test, --send")

    s = secrets()
    html = HTML.read_text(encoding="utf-8")
    to = TEST_EMAILS if a.test else audience(s)

    print(f"subject : {SUBJECT}")
    print(f"from    : {FROM}")
    print(f"recipients: {len(to)}")
    if a.dry_run:
        for e in to[:12]:
            print(f"   would send -> {e}")
        if len(to) > 12:
            print(f"   ... and {len(to)-12} more")
        print("\nDRY RUN. Nothing sent.")
        return

    key = s["resend"]["key"]
    sent = failed = 0
    for i, e in enumerate(to, 1):
        r = requests.post("https://api.resend.com/emails",
                          headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                          json={"from": FROM, "to": e, "reply_to": REPLY_TO,
                                "subject": SUBJECT, "html": personalise(html, e)})
        if r.status_code < 300:
            sent += 1
        else:
            failed += 1
            print(f"  FAIL {e}: {r.status_code} {r.text[:110]}")
        if i % 10 == 0:
            print(f"  {i}/{len(to)}...")
        time.sleep(0.6)          # stay under Resend's rate limit
    print(f"\nsent {sent}, failed {failed}")


if __name__ == "__main__":
    main()

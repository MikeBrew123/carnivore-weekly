#!/usr/bin/env python3
"""One-off coach launch send, 2026-08-27.

Deliberately NOT send_newsletter.py: that script suppresses everyone still in
the 30-day drip, which here would drop 57% of the audience. This is an
announcement, not the weekly, so it goes to the union of both lists.

  python3 scripts/send_coach_launch.py --dry-run   # who would get it, sends nothing
  python3 scripts/send_coach_launch.py --test      # only Brew
  python3 scripts/send_coach_launch.py --send      # the real thing, requires --send

Every attempt against the real audience is appended to
reports/coach-launch-send-ledger.jsonl and flushed to disk before the next
recipient, so a crash keeps a record of everything already sent. Re-running
skips anyone the ledger records as successfully sent, which makes a partial run
safe to retry instead of double-mailing the people it already reached.

A live send asks for confirmation first. Pass --yes to skip the prompt when
running non-interactively.
"""
import argparse, json, os, sys, time
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from subscriber_hygiene import filter_mailable  # noqa: E402

HTML = ROOT / "emails" / "2026-08-27-coach-launch.html"
LEDGER = ROOT / "reports" / "coach-launch-send-ledger.jsonl"
SUBJECT = "Nobody was expecting to hear from him on Sunday"
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
                              "bounced_at": "is.null",
                              "or": "(unsubscribed.is.null,unsubscribed.eq.false)"})
    dr.raise_for_status()
    emails = {r["email"].strip().lower() for r in nl.json() if r.get("email")}
    emails |= {r["email"].strip().lower() for r in dr.json() if r.get("email")}
    # Never mail the seeded fixtures. This used to be an inline two-domain
    # check; it now shares one rule with send_drip.py, send_newsletter.py and
    # the coach reminder engine, so widening the rule widens it everywhere.
    mailable, _blocked = filter_mailable(sorted(emails))
    return mailable


def read_ledger(path):
    """Return (sent, failed_only, bad_line_count) from the append-only ledger.

    Unreadable lines are counted and skipped rather than fatal: a crash can
    leave a half-written final line, and that must not block a resume.
    """
    sent, failed, bad = set(), set(), 0
    if not path.exists():
        return sent, failed, bad
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                email = (rec.get("email") or "").strip().lower()
            except (ValueError, AttributeError):
                bad += 1
                continue
            if not email:
                bad += 1
                continue
            (sent if rec.get("status") == "sent" else failed).add(email)
    return sent, failed - sent, bad


def ledger_append(fh, email, status, message_id=None, http_status=None, error=None):
    """Write one record and get it onto disk before we touch the next recipient."""
    fh.write(json.dumps({
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ts": int(time.time()),
        "email": email,
        "status": status,
        "message_id": message_id,
        "http_status": http_status,
        "error": error,
    }) + "\n")
    fh.flush()
    os.fsync(fh.fileno())


def confirm(prompt):
    if not sys.stdin.isatty():
        print("Not a terminal and no --yes flag, so there is nobody to ask. Refusing to send.")
        return False
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except (EOFError, KeyboardInterrupt):
        print()
        return False


def personalise(html, email):
    from urllib.parse import quote
    return (html.replace("{{unsubscribe_url}}", f"{UNSUB}?email={quote(email)}&site=cw")
                .replace("{{first_name_comma}}", ","))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--yes", action="store_true",
                    help="skip the confirmation prompt (for non-interactive runs)")
    ap.add_argument("--ledger", default=str(LEDGER),
                    help=f"append-only send ledger (default: {LEDGER})")
    a = ap.parse_args()
    if not (a.dry_run or a.test or a.send):
        ap.error("pick one of --dry-run, --test, --send")

    s = secrets()
    html = HTML.read_text(encoding="utf-8")
    ledger_path = Path(a.ledger)
    use_ledger = not a.test          # --test only ever hits Brew; keep it out of the real ledger

    to = TEST_EMAILS if a.test else audience(s)
    audience_size = len(to)

    already, failed_before, bad_lines = read_ledger(ledger_path) if use_ledger else (set(), set(), 0)
    skipped = [e for e in to if e in already]
    if use_ledger:
        to = [e for e in to if e not in already]

    print(f"subject : {SUBJECT}")
    print(f"from    : {FROM}")
    print(f"recipients: {audience_size}")
    if use_ledger:
        print(f"ledger  : {ledger_path}")
        print(f"  ledger records {len(already)} sent; {len(skipped)} of this audience already sent -> skipping")
        if failed_before:
            print(f"  {len(failed_before)} earlier failure(s) recorded, still queued to retry")
        if bad_lines:
            print(f"  WARNING: {bad_lines} unreadable ledger line(s) ignored")
    else:
        print("ledger  : not used for --test")
    print(f"to send : {len(to)}")

    if a.dry_run:
        for e in to[:12]:
            print(f"   would send -> {e}")
        if len(to) > 12:
            print(f"   ... and {len(to)-12} more")
        for e in skipped[:12]:
            print(f"   skip (already sent) -> {e}")
        if len(skipped) > 12:
            print(f"   ... and {len(skipped)-12} more already sent")
        print("\nDRY RUN. Nothing sent.")
        return 0

    if not to:
        print("\nNothing left to send: the ledger already covers everyone in this audience.")
        return 0

    if not a.yes:
        target = f"TEST send to {', '.join(TEST_EMAILS)}" if a.test else "LIVE send"
        summary = f"{len(to)} email(s) will go out"
        if use_ledger:
            summary += f", {len(skipped)} skipped as already sent, logged to {ledger_path.name}"
        print(f"\n{target}: {summary}.")
        if not confirm("Type 'yes' to send: "):
            print("Aborted. Nothing sent.")
            return 1

    key = s["resend"]["key"]
    sent = failed = 0
    fh = None
    if use_ledger:
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        fh = ledger_path.open("a", encoding="utf-8")
    try:
        for i, e in enumerate(to, 1):
            try:
                r = requests.post("https://api.resend.com/emails",
                                  headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                                  json={"from": FROM, "to": e, "reply_to": REPLY_TO,
                                        "subject": SUBJECT, "html": personalise(html, e)},
                                  timeout=30)
            except requests.RequestException as exc:
                failed += 1
                print(f"  FAIL {e}: {exc}")
                if fh:
                    ledger_append(fh, e, "failed", error=str(exc)[:200])
                time.sleep(0.6)
                continue
            if r.status_code < 300:
                try:
                    message_id = r.json().get("id")
                except ValueError:
                    message_id = None
                sent += 1
                if fh:
                    ledger_append(fh, e, "sent", message_id=message_id, http_status=r.status_code)
            else:
                failed += 1
                print(f"  FAIL {e}: {r.status_code} {r.text[:110]}")
                if fh:
                    ledger_append(fh, e, "failed", http_status=r.status_code, error=r.text[:200])
            if i % 10 == 0:
                print(f"  {i}/{len(to)}...")
            time.sleep(0.6)          # stay under Resend's rate limit
    finally:
        if fh:
            fh.close()
    print(f"\nsent {sent}, failed {failed}")
    if use_ledger:
        print(f"ledger: {ledger_path} (re-run to retry anyone not recorded as sent)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

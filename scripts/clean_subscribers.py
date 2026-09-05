#!/usr/bin/env python3
"""Retire addresses that can never receive mail. Backs the list up first, always.

Approved by Brew 2026-08-31 ("approve all three", Command Deck 5d4dac87) and
re-confirmed in live chat 2026-09-05. His own condition, attached to that
approval and ruled on 2026-09-01, is the reason step one exists:

  "do we ever back that up? Maybe we should have a backup of our email list
   every time we clean it, save it."

So: this script runs scripts/backup_subscribers.py FIRST and refuses to change
anything if the backup does not exit 0. That is not a courtesy check, it is the
condition the approval came with, and --apply cannot get past it.

WHO GETS RETIRED, from the 2026-08-28 bounce review:

  rule 1, never-delivered   5+ sends with zero delivered, opened and clicked.
                            A real person's mail generates a delivered event,
                            so this rule cannot fire on anyone whose mail is
                            arriving. Catches the placeholder addresses people
                            type to get past the calculator's email field.
  rule 2, test fixture      reserved and fixture domains (see
                            scripts/subscriber_hygiene.py). Nobody real can
                            hold one.

WHO NEVER GETS RETIRED: anybody who bounced. A bounce is the webhook's business
and a ContentRejected bounce says nothing about the address at all, which is
what nearly cut a live reader loose in August (commit 7783a20c). This script
does not read bounces and must not learn to.

NOTHING IS DELETED. Rows are marked, never removed, so every retirement is a
one-line revert and the person is still there if the call was wrong. The mark
is the existing bounced_at/bounce_reason pair, because that is what both send
paths already honour (send_newsletter.py takes status='active' only,
send_drip.py skips bounced_at) and drip_subscribers has no status column to
retire into. The reason string always starts `retired-` so a future bounce
audit can tell these apart from real provider bounces.

  python3 scripts/clean_subscribers.py             # dry run, changes nothing
  python3 scripts/clean_subscribers.py --apply     # back up, then retire
  python3 scripts/clean_subscribers.py --apply --skip-backup   # refuses

Exit codes: 0 clean (or nothing to do), 1 something was wrong and no row was
changed.
"""

import argparse
import json
import os
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = ROOT / "secrets" / "api-keys.json"
BACKUP_SCRIPT = ROOT / "scripts" / "backup_subscribers.py"
LEDGER_DIR = ROOT / "reports" / "subscriber-cleans"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from subscriber_hygiene import (  # noqa: E402
    MIN_SENDS_FOR_NEVER_DELIVERED,
    is_undeliverable_fixture,
    never_delivered,
)

PAGE_SIZE = 1000
REASON_PREFIX = "retired"
COUNTED_EVENTS = ("sent", "delivered", "opened", "clicked")


def load_secrets():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url.rstrip("/"), key
    if not SECRETS_PATH.exists():
        raise SystemExit(f"Error: {SECRETS_PATH} not found and SUPABASE_URL/"
                         "SUPABASE_SERVICE_ROLE_KEY are not set")
    sb = json.loads(SECRETS_PATH.read_text()).get("supabase", {})
    url = (sb.get("url") or "").rstrip("/")
    key = sb.get("service_role_key")
    if not url or not key:
        raise SystemExit("Error: supabase.url / supabase.service_role_key missing "
                         "from secrets/api-keys.json")
    return url, key


def run_backup():
    """Brew's condition. Returns the backup file path, or raises."""
    print("Step 1: backing the list up before touching anything")
    proc = subprocess.run(
        [sys.executable, str(BACKUP_SCRIPT)],
        capture_output=True, text=True, cwd=str(ROOT),
    )
    for line in (proc.stdout or "").splitlines():
        print(f"  {line}")
    if proc.returncode != 0:
        for line in (proc.stderr or "").splitlines():
            print(f"  {line}")
        raise SystemExit("❌ Backup failed. Nothing was changed. "
                         "The clean cannot run without a backup.")
    marker = "subscriber rows → "
    for line in (proc.stdout or "").splitlines():
        if marker in line:
            return line.split(marker, 1)[1].strip()
    raise SystemExit("❌ Backup reported success but named no file. "
                     "Refusing to clean against a backup I cannot point at.")


def fetch_all(url, key, table, params):
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    rows, offset = [], 0
    while True:
        resp = requests.get(f"{url}/rest/v1/{table}", headers=headers, timeout=60,
                            params={**params, "limit": PAGE_SIZE, "offset": offset})
        resp.raise_for_status()
        page = resp.json()
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def event_stats(url, key):
    """Per-address counts of the events that prove (or disprove) arrival."""
    stats = defaultdict(lambda: dict.fromkeys(COUNTED_EVENTS, 0))
    for row in fetch_all(url, key, "drip_events",
                         {"select": "email,event_type", "order": "id"}):
        email = (row.get("email") or "").strip().lower()
        etype = row.get("event_type")
        if email and etype in COUNTED_EVENTS:
            stats[email][etype] += 1
    return stats


def newsletter_targets(url, key, stats, now):
    """Rows on the weekly list that are still active and must not be."""
    out = []
    for row in fetch_all(url, key, "newsletter_subscribers",
                         {"select": "id,email,site,status,bounced_at,bounce_reason",
                          "status": "eq.active", "order": "id"}):
        email = (row.get("email") or "").strip().lower()
        reason = classify(email, stats.get(email))
        if reason:
            out.append({"table": "newsletter_subscribers", "row": row,
                        "email": email, "why": reason,
                        "patch": {"status": "bounced", "bounced_at": now,
                                  "bounce_reason": reason}})
    return out


def drip_targets(url, key, stats, now):
    """Rows still inside the 30-day sequence that must stop receiving it."""
    out = []
    for row in fetch_all(url, key, "drip_subscribers",
                         {"select": "id,email,site,current_day,completed,"
                                    "unsubscribed,bounced_at,bounce_reason",
                          "bounced_at": "is.null", "order": "id"}):
        if row.get("unsubscribed"):
            continue
        email = (row.get("email") or "").strip().lower()
        reason = classify(email, stats.get(email))
        if reason:
            out.append({"table": "drip_subscribers", "row": row,
                        "email": email, "why": reason,
                        "patch": {"bounced_at": now, "bounce_reason": reason}})
    return out


def classify(email, stats):
    """The reason string, or None to leave this address entirely alone."""
    if is_undeliverable_fixture(email):
        return f"{REASON_PREFIX}-fixture: reserved or fixture domain, never mailable"
    if stats and never_delivered(stats):
        return (f"{REASON_PREFIX}-never-delivered: {stats['sent']} sends, "
                f"0 delivered, 0 opened, 0 clicked")
    return None


def patch_row(url, key, table, row_id, patch):
    resp = requests.patch(
        f"{url}/rest/v1/{table}",
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json", "Prefer": "return=representation"},
        params={"id": f"eq.{row_id}"},
        json=patch, timeout=60,
    )
    resp.raise_for_status()
    return resp.json()


def write_ledger(targets, backup_path, started_at, out_dir):
    """Before-state plus a revert recipe. Gitignored: this holds real addresses."""
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"clean-{started_at.strftime('%Y%m%dT%H%M%SZ')}.json"
    payload = {
        "kind": "carnivore-weekly-subscriber-clean",
        "version": 1,
        "cleaned_at": started_at.isoformat().replace("+00:00", "Z"),
        "backup": backup_path,
        "authority": "Brew 2026-08-31 (deck 5d4dac87), re-confirmed 2026-09-05",
        "revert": "For each entry, PATCH the row id back to the values in "
                  "`before`. Nothing was deleted, so a revert restores the "
                  "address to exactly the state it was in.",
        "entries": [{"table": t["table"], "id": t["row"]["id"], "email": t["email"],
                     "why": t["why"], "before": t["row"], "after": t["patch"]}
                    for t in targets],
    }
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    os.chmod(path, 0o600)
    return path


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true",
                    help="actually retire the addresses (default: dry run)")
    ap.add_argument("--skip-backup", action="store_true",
                    help="refused with --apply; only meaningful on a dry run")
    args = ap.parse_args()

    if args.apply and args.skip_backup:
        print("❌ --skip-backup cannot be combined with --apply. Backing the list "
              "up before a clean is Brew's own condition on this work "
              "(2026-08-31), not an option.")
        return 1

    started_at = datetime.now(timezone.utc)
    now = started_at.isoformat().replace("+00:00", "Z")
    url, key = load_secrets()

    backup_path = None
    if args.apply:
        backup_path = run_backup()
    else:
        print("Step 1: dry run, no backup taken and nothing will be changed")

    print("Step 2: reading the lists and their delivery history")
    stats = event_stats(url, key)
    targets = (newsletter_targets(url, key, stats, now)
               + drip_targets(url, key, stats, now))

    if not targets:
        print(f"✅ Nothing to retire. No address matched either rule "
              f"(never-delivered threshold: {MIN_SENDS_FOR_NEVER_DELIVERED} sends).")
        return 0

    print(f"\nStep 3: {len(targets)} row(s) matched, across "
          f"{len({t['email'] for t in targets})} address(es)")
    for t in targets:
        print(f"  {t['table']:<23} {t['email']:<32} {t['why']}")

    if not args.apply:
        print("\nDry run. Nothing was changed. Re-run with --apply to retire these.")
        return 0

    ledger = write_ledger(targets, backup_path, started_at, LEDGER_DIR)
    print(f"\nStep 4: before-state written to {ledger.relative_to(ROOT)}")

    failures = []
    for t in targets:
        try:
            patch_row(url, key, t["table"], t["row"]["id"], t["patch"])
        except requests.RequestException as exc:
            failures.append(f"{t['table']} {t['email']}: {exc}")
    if failures:
        for f in failures:
            print(f"  FAILED  {f}")
        print(f"❌ {len(failures)} of {len(targets)} row(s) failed. The rest went "
              f"through; revert from {ledger.name} if you need the list back.")
        return 1

    print(f"✅ Retired {len(targets)} row(s). Backup: {backup_path}. "
          f"Revert: {ledger.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

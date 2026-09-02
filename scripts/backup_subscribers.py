#!/usr/bin/env python3
"""Point-in-time backup of the newsletter/drip subscriber lists.

The list is not on Beehiiv and never was — `handleBeehiivSubscribe` in
api/calculator-api.js is a stale name for a pure Supabase writer. The real list
is two Postgres tables reached over PostgREST:

  newsletter_subscribers  the weekly list (cw + kd), with status/bounce columns
  drip_subscribers        the 30-day onboarding sequence, graduates into the above

Both are dumped in full, every column, so a restore needs nothing but this file.

READ-ONLY BY CONSTRUCTION: this script issues GET requests and nothing else.
It never writes to Supabase, never touches Resend, and cannot mail anyone.

  python3 scripts/backup_subscribers.py             # write a timestamped backup
  python3 scripts/backup_subscribers.py --dry-run   # count rows, write nothing
  python3 scripts/backup_subscribers.py --out-dir /tmp/x

Backups land in reports/subscriber-backups/, which is gitignored: the SCRIPT is
committed, the DATA never is. Subscriber addresses are PII and this is a public
repo. Files are written 0600.

Cadence: run this before every list clean (anything that deletes or hard-bounces
addresses), and at least once a month regardless. Nothing schedules it yet —
wiring it into automation is a separate, un-taken decision.

Exit codes: 0 wrote (or dry-ran) a verified backup, 1 something was wrong and
no backup was written. A refusal is deliberate — a truncated or empty backup is
worse than none, because it looks like a safety net and is not one.
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = ROOT / "secrets" / "api-keys.json"
OUT_DIR = ROOT / "reports" / "subscriber-backups"

# Every table that together makes up "the email list". Order is cosmetic.
TABLES = ["newsletter_subscribers", "drip_subscribers"]

PAGE_SIZE = 1000


def load_secrets():
    """Supabase URL + key, env first (CI) then the checked-in secrets file."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url.rstrip("/"), key
    if not SECRETS_PATH.exists():
        raise SystemExit(f"Error: {SECRETS_PATH} not found and SUPABASE_URL/"
                         "SUPABASE_SERVICE_ROLE_KEY are not set")
    sb = json.loads(SECRETS_PATH.read_text()).get("supabase", {})
    url = (sb.get("url") or "").rstrip("/")
    key = sb.get("service_role_key") or sb.get("anon_key")
    if not url or not key:
        raise SystemExit("Error: supabase.url / supabase.service_role_key missing "
                         "from secrets/api-keys.json")
    return url, key


def parse_content_range(header):
    """PostgREST returns '0-99/238'. Give back the total, or None if unknown."""
    if not header or "/" not in header:
        return None
    total = header.rsplit("/", 1)[1].strip()
    if not total.isdigit():
        return None
    return int(total)


def make_getter(url, key):
    """A GET-only callable bound to this project. No other verb is reachable."""
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    def get(table, params, extra_headers=None):
        resp = requests.get(
            f"{url}/rest/v1/{table}",
            headers={**headers, **(extra_headers or {})},
            params=params,
            timeout=60,
        )
        resp.raise_for_status()
        return resp

    return get


def table_count(get, table):
    """Server-side exact count, fetched without pulling any rows."""
    resp = get(table, {"select": "id"},
               {"Prefer": "count=exact", "Range": "0-0", "Range-Unit": "items"})
    return parse_content_range(resp.headers.get("content-range"))


def fetch_all(get, table):
    """Every row, every column, paged so a growing list cannot silently truncate."""
    rows = []
    offset = 0
    while True:
        page = get(table, {"select": "*", "order": "id",
                           "limit": PAGE_SIZE, "offset": offset}).json()
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def build_payload(tables, generated_at):
    """The backup file's shape. Restores read this, so keep it boring."""
    return {
        "kind": "carnivore-weekly-subscriber-backup",
        "version": 1,
        "generated_at": generated_at.isoformat().replace("+00:00", "Z"),
        "source": "supabase postgrest",
        "tables": {
            name: {"count": len(rows), "rows": rows}
            for name, rows in tables.items()
        },
        "total_rows": sum(len(rows) for rows in tables.values()),
    }


def verify_payload(payload, expected_counts):
    """Problems worth refusing over. Empty list == treat as a failed read."""
    problems = []
    for name, expected in expected_counts.items():
        got = payload["tables"].get(name, {}).get("count")
        if got is None:
            problems.append(f"{name}: missing from backup")
        elif expected is not None and got != expected:
            problems.append(f"{name}: fetched {got} rows but server reported {expected}")
        elif got == 0:
            problems.append(f"{name}: 0 rows — refusing to write an empty backup")
    for name, table in payload["tables"].items():
        missing = sum(1 for r in table["rows"] if not r.get("email"))
        if missing:
            problems.append(f"{name}: {missing} row(s) have no email address")
    return problems


def backup_filename(generated_at):
    return f"subscribers-{generated_at.strftime('%Y%m%dT%H%M%SZ')}.json"


def write_backup(payload, out_dir, generated_at):
    """Write 0600 (PII), then read it back and confirm the counts survived."""
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / backup_filename(generated_at)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    os.chmod(path, 0o600)

    reread = json.loads(path.read_text(encoding="utf-8"))
    for name, table in payload["tables"].items():
        if len(reread["tables"][name]["rows"]) != table["count"]:
            raise SystemExit(f"Error: {path} did not read back intact for {name}")
    return path


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true",
                    help="report the counts and write nothing")
    ap.add_argument("--out-dir", default=str(OUT_DIR),
                    help=f"where backups land (default {OUT_DIR})")
    args = ap.parse_args()

    url, key = load_secrets()
    get = make_getter(url, key)
    generated_at = datetime.now(timezone.utc)

    expected_counts = {}
    tables = {}
    for name in TABLES:
        expected_counts[name] = table_count(get, name)
        tables[name] = fetch_all(get, name)
        print(f"  {name}: {len(tables[name])} rows "
              f"(server reports {expected_counts[name]})")

    payload = build_payload(tables, generated_at)
    problems = verify_payload(payload, expected_counts)
    if problems:
        for p in problems:
            print(f"  PROBLEM  {p}")
        print("❌ No backup written — fix the above and re-run.")
        return 1

    if args.dry_run:
        print(f"✅ Dry run OK → {payload['total_rows']} rows would be backed up "
              f"as {backup_filename(generated_at)}")
        return 0

    path = write_backup(payload, Path(args.out_dir), generated_at)
    rel = path.relative_to(ROOT) if str(path).startswith(str(ROOT)) else path
    print(f"✅ Backed up {payload['total_rows']} subscriber rows → {rel}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

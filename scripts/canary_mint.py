#!/usr/bin/env python3
"""Mint a canary token (honeytoken) and record where it was planted.

A canary token is a credential with no power. Nothing legitimate ever sends
one, so a single hit means somebody found a planted key and tried it. The
Worker (api/calculator-api.js) matches on prefix, so a new token works the
moment it is minted -- no redeploy.

    python3 scripts/canary_mint.py <placement> "<where exactly it lives>"

    placement   short label, letters/digits only, shows up in the alert subject
                e.g. ghpub, macenv, vault, n8n

Writes to secrets/canary-tokens.json (gitignored). Never commit that file:
it is the map from token to hiding place.
"""
import json
import secrets
import string
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER = ROOT / "secrets" / "canary-tokens.json"
ALPHABET = string.ascii_lowercase + string.digits


def mint(placement: str, note: str) -> dict:
    rand = "".join(secrets.choice(ALPHABET) for _ in range(24))
    key = f"cw_live_sk_{placement}_{rand}"
    hook = f"https://api.carnivoreweekly.com/api/v1/hooks/cwc_{placement}_{rand[:16]}"
    return {
        "placement": placement,
        "note": note,
        "key": key,
        "hook_url": hook,
        "minted": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tripped": [],
    }


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    placement = "".join(c for c in sys.argv[1].lower() if c.isalnum())
    if not placement:
        print("placement must contain letters or digits")
        return 1
    note = " ".join(sys.argv[2:])

    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else []
    entry = mint(placement, note)
    ledger.append(entry)
    LEDGER.write_text(json.dumps(ledger, indent=2) + "\n")

    print(f"placement : {entry['placement']}")
    print(f"note      : {entry['note']}")
    print(f"key       : {entry['key']}")
    print(f"hook url  : {entry['hook_url']}")
    print(f"\nrecorded in {LEDGER.relative_to(ROOT)} ({len(ledger)} total)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""PescoDial welcome drip (data/drip-emails/pd/).

  A. the HTML is generated from Sarah's drafts and is not stale;
  B. every email has a subject, the unsubscribe merge tag, PescoDial branding and
     no Carnivore Weekly / KetoDial branding, no em-dashes, no leftover placeholder;
  C. send_drip.py --site pd sends day 7 and day 28 as plain emails: no Stripe
     promo code is minted and nothing crashes on missing promo copy.

No network, no Stripe, no email. Run: python3 tests/test_pd_drip.py
"""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.setdefault("UNSUBSCRIBE_SECRET", "test-unsubscribe-secret")
import send_drip  # noqa: E402

FAILED = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" - {detail}"))
    if not ok:
        FAILED.append(name)


def test_generated_and_fresh():
    r = subprocess.run([sys.executable, str(ROOT / "pescodial/scripts/build_pd_drip.py"), "--check"], capture_output=True, text=True)
    check("A. drip HTML matches the drafts", r.returncode == 0, r.stdout + r.stderr)
    drafts = sorted(p.stem for p in (ROOT / "pescodial/drafts/drip").glob("day-*.md"))
    built = sorted(p.stem for p in (ROOT / "data/drip-emails/pd").glob("day-*.html"))
    check("A. one email per draft", drafts == built, f"{drafts} vs {built}")


def test_content():
    for p in sorted((ROOT / "data/drip-emails/pd").glob("day-*.html")):
        h = p.read_text()
        check(f"B. {p.name} subject", bool(re.match(r"<!-- Subject: .+ -->", h)))
        check(f"B. {p.name} unsubscribe tag", "{$unsubscribe}" in h)
        check(f"B. {p.name} PescoDial sign-off", "Sarah</p>" in h and "PescoDial</p>" in h)
        bad = re.search(r"carnivore\s*weekly|carnivoreweekly|ketodial|\[PROMO|\{\$promo|—|\*\*", h, re.I)
        check(f"B. {p.name} no foreign brand or placeholder", not bad, bad and bad.group(0))


def test_promo_days_plain():
    send_drip.SITE, send_drip.CFG = "pd", send_drip.SITES["pd"]
    minted = []
    real = send_drip.mint_promo_code
    send_drip.mint_promo_code = lambda *a, **k: minted.append(a) or "WEEK1-XXXXX"
    try:
        for day in (7, 28):
            _, html = send_drip.load_drip_email(day)
            out = send_drip.apply_promo(html, day, "reader@example.com", "sk_test_stub", buyers=set())
            check(f"C. pd day {day} sends without an offer", "{$promo" not in out and "WEEK1" not in out and "GRAD" not in out)
        check("C. no Stripe code minted for pd", minted == [], f"{len(minted)} minted")
    finally:
        send_drip.mint_promo_code = real
        send_drip.SITE, send_drip.CFG = "cw", send_drip.SITES["cw"]


if __name__ == "__main__":
    test_generated_and_fresh()
    test_content()
    test_promo_days_plain()
    sys.exit(1 if FAILED else 0)

#!/usr/bin/env python3
"""Day 28 points to the sister sites, mints no code; day 7 keeps its discount.

Brew 2026-11-23: 362 day-28 GRAD codes in 90 days, 0 used. Day 28 now carries
tagged sister-site calculator links (CW -> KetoDial + PescoDial, KD -> CW).
Run: python3 tests/test_drip_day28_sister.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import send_drip as d

d.UNSUB_SECRET = "t" * 32
minted = []
d.mint_promo_code = lambda key, day, email: minted.append(day) or f"CODE{day}"
fails = []
def check(name, ok):
    print(("PASS " if ok else "FAIL ") + name)
    if not ok: fails.append(name)

check("day 28 is no longer a promo day; day 7 still is", d.PROMO_DAYS == {7: "WEEK1"})
URLS = {
    "cw": ["https://ketodial.com/?utm_source=carnivoreweekly&amp;utm_medium=email&amp;utm_campaign=cw_day28_sister&amp;utm_content=ketodial_calculator#calc",
           "https://www.pescodial.com/?utm_source=carnivoreweekly&amp;utm_medium=email&amp;utm_campaign=cw_day28_sister&amp;utm_content=pescodial_calculator#calc"],
    "kd": ["https://carnivoreweekly.com/calculator.html?utm_source=ketodial&amp;utm_medium=email&amp;utm_campaign=kd_day28_sister&amp;utm_content=cw_calculator"],
}
for site in ("cw", "kd"):
    d.SITE, d.CFG = site, d.SITES[site]
    _, html = d.load_drip_email(28)
    reader = d.apply_promo(html, 28, "r@example.com", "sk_stub", set())
    buyer = d.apply_promo(html, 28, "r@example.com", "sk_stub", {"r@example.com"})
    check(f"{site} day 28 mints no code", 28 not in minted)
    check(f"{site} day 28 has no discount placeholders or markers", not any(t in reader for t in ("{$promo", "BUYER_", "50%", "graduation code", "Graduation Discount")))
    check(f"{site} day 28 same email for buyers and readers", reader == buyer)
    for u in URLS[site]:
        check(f"{site} day 28 links {u.split('utm_content=')[1].split('#')[0]}", u in reader)
    _, h7 = d.load_drip_email(7)
    out7 = d.apply_promo(h7, 7, "r@example.com", "sk_stub", set())
    check(f"{site} day 7 still mints and shows its code", 7 in minted and "CODE7" in out7)
    minted.clear()
print("\n".join(fails) and f"{len(fails)} failed" or "all passed")
sys.exit(1 if fails else 0)

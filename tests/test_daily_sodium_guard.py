#!/usr/bin/env python3
"""Red/green proof for the daily-sodium rule in scripts/check_electrolyte_dosing.py.

Brew, Command Deck card 9abbfdc5, 2026-10-14 05:49 PDT: a daily sodium gram
target is a dose. CW and KD say "salt to taste", plus "check with your doctor
first if you have high blood pressure or a salt limit". This rule is Gate 11's
sodium half (pre-push and daily publish), so it has to go red on the real lines
it replaced and stay green on the real lines that replaced them.

Every UNSAFE string is a real line removed on 2026-10-14; every SAFE string is
either its real replacement or a live food fact / label we deliberately keep.
Run: python3 tests/test_daily_sodium_guard.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_electrolyte_dosing import held, scan  # noqa: E402

UNSAFE = [
    "Most adults do well on 3 to 5 grams of sodium a day, and 1 teaspoon of salt gives about 2.3 grams.",
    "Daily sodium target: 3-5g, up to 6g on heavy training days.",
    "Most people need 3,000-5,000mg of sodium per day, sometimes more if they're active.",
    "Athletes on carnivore may need up to 6g of sodium on days they train hard, against the 3-5g baseline.",
    "Add extra salt to everything. I'm talking about 2 teaspoons a day, which is roughly 4 to 5 grams.",
    "Keep electrolytes up. 2-3g sodium per meal minimum.",
    "Salt: 1 to 2 teaspoons a day, spread across meals.",
    "Sodium: 4 to 5g daily during the first few weeks.",
    # A caveat placed BEFORE the target does not clear it for everyone else.
    "If you take a water pill, ask your doctor before raising your salt. For other adults, "
    "3-5 g of sodium a day is a reasonable range.",
]

SAFE = [
    "Salt your food to taste and spread it out rather than loading one meal. If you have high "
    "blood pressure or a salt limit, check with your doctor first.",
    "One teaspoon of salt is about 2.3 grams of sodium.",
    "Broth or bouillon. One cup can carry 800 to 1,200 mg of sodium.",
    "LMNT (per packet): 1,000 mg sodium (from salt) 200 mg potassium (from potassium chloride)",
    "A 2 oz serving of deli turkey carries roughly 450 to 700 mg of sodium.",
    "Two 1/4 lb ground beef patties, 80/20 (560 cal, 40g protein, 44g fat) Salt to taste",
    "Salt does more than people expect. Protein first. Aim for 30 to 40 grams per meal.",
    "If your doctor has you on a limit of under 2,000 mg a day, follow it.",
]


def flags(text, site="cw"):
    return [h for h in scan("t", text, site) if h[0] == "daily-Na"]


def main():
    fails = 0
    for t in UNSAFE:
        if not flags(t):
            print(f"FAIL (should flag): {t}")
            fails += 1
        if not flags(t, "kd"):
            print(f"FAIL (should flag on KD): {t}")
            fails += 1
        if flags(t, "pd"):
            print(f"FAIL (PD is exempt, its line is a ceiling): {t}")
            fails += 1
    for t in SAFE:
        if flags(t):
            print(f"FAIL (false positive): {t} -> {flags(t)}")
            fails += 1
    # The frozen-page hold expires on its date and never covers other minerals.
    w = "blog_posts.json:2026-04-14-the-carnivore-mistake-i-wish-someone-warned-me"
    if not held(w, "daily-Na", today="2026-10-14"):
        print("FAIL: frozen control page should be held before 2026-11-14")
        fails += 1
    if held(w, "daily-Na", today="2026-11-14"):
        print("FAIL: hold must expire on 2026-11-14")
        fails += 1
    if held(w, "K/Mg", today="2026-10-14"):
        print("FAIL: hold must not cover potassium/magnesium")
        fails += 1
    if fails:
        print(f"\n{fails} failure(s)")
        return 1
    print(f"PASS  {len(UNSAFE)} unsafe lines red on CW and KD, green on PD; "
          f"{len(SAFE)} safe lines green; hold expiry checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())

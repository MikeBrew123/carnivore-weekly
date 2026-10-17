#!/usr/bin/env python3
"""Red/green proof that the electrolyte guard ALLOWS a daily salt range again.

Brew, Command Centre DECISION_LOG 2026-10-17 "CONTENT LINE": keep the diet's
normal guidance with real numbers (salt and electrolyte ranges), worded as what
people on the diet typically do, with ONE safety line per page. That supersedes
the 2026-10-14 rule (deck 9abbfdc5) that failed any daily sodium or salt target,
so these lines must now pass Gate 11 on CW, KD and PD. The 2026-09-14 rules are
untouched: a potassium or magnesium dose and a sodium amount during a fast still
fail. Run: python3 tests/test_daily_sodium_guard.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_electrolyte_dosing import scan  # noqa: E402

# Formerly red under the 2026-10-14 rule, now green.
NOW_ALLOWED = [
    "Most people on carnivore land around 3 to 5 grams of sodium a day, and 1 teaspoon of salt gives about 2.3 grams.",
    "Many people on carnivore aim for 3,000-5,000mg of sodium per day, sometimes more if they're active.",
    "Salt: people on the diet typically use 1 to 2 teaspoons a day, spread across meals.",
    "Salt your food to taste and spread it out rather than loading one meal.",
    "One teaspoon of salt is about 2.3 grams of sodium.",
    "LMNT (per packet): 1,000 mg sodium (from salt) 200 mg potassium (from potassium chloride)",
]

# The 2026-09-14 rules still hold.
STILL_FLAGGED = [
    "Take 300-400 mg of magnesium glycinate before bed every day.",
    "Add 1,000 mg of potassium a day to your water.",
]


def main():
    fails = 0
    for t in NOW_ALLOWED:
        for site in ("cw", "kd", "pd"):
            if scan("t", t, site):
                print(f"FAIL (daily salt range should pass on {site}): {t} -> {scan('t', t, site)}")
                fails += 1
    for t in STILL_FLAGGED:
        if not scan("t", t, "cw"):
            print(f"FAIL (should still flag): {t}")
            fails += 1
    if fails:
        print(f"\n{fails} failure(s)")
        return 1
    print(f"PASS  {len(NOW_ALLOWED)} salt lines green on CW/KD/PD; "
          f"{len(STILL_FLAGGED)} K/Mg doses still red")
    return 0


if __name__ == "__main__":
    sys.exit(main())

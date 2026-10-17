#!/usr/bin/env python3
"""Red/green proof for scripts/check_electrolyte_dosing.py after the 2026-10-17 rules.

Brew, Command Centre DECISION_LOG 2026-10-17:
  "CONTENT LINE": daily salt ranges come back, one safety line per page.
  "ELECTROLYTE AMOUNTS UP TO THE LABEL": magnesium, potassium and fasting-salt
  amounts may be stated in new content, never above the supplement label amount.
So the guard now fails only an amount ABOVE a common label (magnesium 350 mg,
potassium 99 mg, fasting sodium 1,000 mg a serving or 5,000 mg a day) and any
prescription drug dose. Run: python3 tests/test_daily_sodium_guard.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_electrolyte_dosing import scan  # noqa: E402

FAST = ("Fasting basics. On a fast, people often feel flat. Fasting changes how the "
        "kidneys handle salt. A longer fast needs a plan. Many people break a fast "
        "slowly. Fasting is not for everyone. ")

ALLOWED = [
    "Most people on carnivore land around 3 to 5 grams of sodium a day, and 1 teaspoon of salt gives about 2.3 grams.",
    "Salt: people on the diet typically use 1 to 2 teaspoons a day, spread across meals.",
    "Many people take 200-350 mg of magnesium glycinate in the evening.",
    "Many people take 350 mg of supplemental magnesium a day.",
    "Beef has about 300-400 mg of potassium per 4 oz.",
    "Some people add a 99 mg potassium tablet a day.",
    FAST + "During a fast, many people take 500 mg of sodium in water a few times a day.",
    FAST + "On a longer fast, people usually aim for 3-5 g of sodium a day.",
    "LMNT (per packet): 1,000 mg sodium (from salt) 200 mg potassium (from potassium chloride)",
    "Fasting glucose of 95-110 mg/dL with low fasting insulin points one way.",
    "We do not publish a metformin dose such as 500 mg; that is your prescriber's call.",
]

FLAGGED = [
    ("K/Mg", "Take 600 mg of magnesium a day for cramps."),
    ("K/Mg", "Take 400 mg of supplemental magnesium a day."),
    ("K/Mg", "Add 1,000 mg of potassium a day to your water."),
    ("fasting-Na", FAST + "During a fast, take 2,000 mg of sodium in one glass of water."),
    ("fasting-Na", FAST + "On a long fast, aim for 7 g of sodium a day."),
    ("drug-dose", "Most people start metformin at 500 mg with dinner."),
    ("drug-dose", "Take 20 mEq of Klor-Con with food."),
    ("drug-dose", "Drop to 10 units of insulin on carnivore."),
]


def main():
    fails = 0
    for t in ALLOWED:
        for site in ("cw", "kd", "pd"):
            hits = scan("t", t, site)
            if hits:
                print(f"FAIL (should pass on {site}): {t[-90:]} -> {hits[0][:2]}")
                fails += 1
    for kind, t in FLAGGED:
        kinds = [h[0] for h in scan("t", t, "cw")]
        if kind not in kinds:
            print(f"FAIL (should flag {kind}): {t[-90:]} -> {kinds}")
            fails += 1
    if fails:
        print(f"\n{fails} failure(s)")
        return 1
    print(f"PASS  {len(ALLOWED)} at-label lines green on CW/KD/PD; "
          f"{len(FLAGGED)} above-label or drug-dose lines red")
    return 0


if __name__ == "__main__":
    sys.exit(main())

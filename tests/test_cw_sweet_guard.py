#!/usr/bin/env python3
"""Proof tests for the Carnivore Weekly sweet-treat guardrail.

Plain Python on purpose. `npm test` in this repo currently loads zero suites,
so a Jest file would prove nothing. Run:

    python3 tests/test_cw_sweet_guard.py

Exit 0 = every case behaves. Exit 1 = a case regressed, with the detail printed.

The two halves matter equally. FIRES proves the guardrail actually stops the
thing Brew complained about. CLEAN proves it does not maul legitimate carnivore
writing, which would be a worse bug than the one it fixes.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from cw_sweet_guard import check_copy, check_newsletter_content  # noqa: E402


# --- Copy that MUST trip the guardrail on Carnivore Weekly -----------------
FIRES = [
    ("classic offender",
     "Craving something sweet? Try these keto brownies made with erythritol, "
     "or reach for a square of dark chocolate to satisfy your sweet tooth."),
    ("sweetener roundup",
     "Our favorite sugar substitutes for carnivore are monk fruit and allulose."),
    ("permission framing",
     "A little stevia in your coffee is totally fine on carnivore."),
    ("cheat-day framing",
     "Plan one cheat meal a week and enjoy the dessert you actually want."),
    ("recipe instructions",
     "Here is how to make a carnivore cheesecake with allulose and cream cheese."),
    ("guilt-free override beats the negation",
     "You won't feel bad about these guilt-free keto cookies."),
    ("shopping recommendation",
     "Stock up on sugar-free candy so you always have a sweet treat on hand."),
]

# --- Legitimate carnivore copy that must NOT trip it -----------------------
CLEAN = [
    ("sweetbreads are an organ meat",
     "Sweetbreads are the most underrated organ meat on the shelf. Pan seared "
     "sweetbreads in butter make a great Sunday dinner, and the best butcher in "
     "town will order them for you."),
    ("sweet as a flavour description",
     "Sear the ribeye in tallow until it builds a sweet, nutty crust."),
    ("blood sugar is core subject matter",
     "Many people find their blood sugar steadies within three weeks, and the "
     "best marker to watch is fasting insulin."),
    ("Sarah's real article, arguing against swaps",
     "The honest answer is that you stop answering the craving. Not with berries, "
     "not with dark chocolate, not with sugar-free candy that tastes almost like "
     "the real thing. Every substitute you reach for keeps the craving pathway open."),
    ("try-this-week copy that discourages",
     "Before you grab a sweet swap, pause for 60 seconds and ask whether you are "
     "actually hungry."),
    ("crab cakes are food",
     "Crab cakes bound with egg instead of breadcrumbs are a good Friday option, "
     "and the best ones are almost all crab."),
    ("reporting a debate is not endorsing it",
     "Over 378 people jumped into the comments this week arguing about the best "
     "sweet swap on carnivore."),
    ("citing a source title",
     'Reddit thread: r/carnivore, "Carnivore ice cream recipe"'),
]


def run():
    failures = []

    for name, text in FIRES:
        if not check_copy(text, site="cw", label="t"):
            failures.append(f"MISSED (should fire on cw): {name}\n    {text}")

    for name, text in CLEAN:
        hits = check_copy(text, site="cw", label="t")
        if hits:
            failures.append(f"FALSE POSITIVE (should stay clean): {name}\n    " +
                            "\n    ".join(hits))

    # KetoDial is a different brand. Keto content legitimately discusses
    # sweeteners, so not one of the offending cases may fire on site='kd'.
    for name, text in FIRES:
        if check_copy(text, site="kd", label="t"):
            failures.append(f"LEAKED ONTO KETODIAL: {name}")

    # Rule B: the front of a CW newsletter. This is the exact shape of the
    # 2026-09-06 issue, whose article argued AGAINST sweet swaps and still put
    # "Dark chocolate, berries, keto desserts" in the hero teaser.
    sep6_shape = {
        "subject_line": "The swap keeping your sugar cravings alive",
        "opening": "<p>This week's community was on fire debating sweet swaps.</p>",
        "hero": {
            "slug": "2026-09-05-kill-sugar-cravings-carnivore",
            "title": "What Actually Kills Sugar Cravings on Carnivore",
            "teaser": "Dark chocolate, berries, keto desserts, you name it, someone "
                      "defended it. But Sarah's answer isn't about finding a better swap.",
            "cta": "Read before your next craving hits",
        },
        "try_this_week": "<p>Notice what you reach for when a craving hits.</p>",
    }
    hits = check_newsletter_content(sep6_shape, site="cw")
    if not any("front of the email" in h for h in hits):
        failures.append("MISSED Rule B: sweet-treat topic in the CW newsletter front")
    if check_newsletter_content(sep6_shape, site="kd"):
        failures.append("LEAKED ONTO KETODIAL: newsletter front check")

    # A clean CW newsletter front must pass untouched.
    good = {
        "subject_line": "The protein number almost everyone gets wrong",
        "opening": "<p>Short week, one big idea, and a grocery list you can print.</p>",
        "hero": {"slug": "2026-09-12-protein-floor", "title": "Your Protein Floor After 50",
                 "teaser": "Most people eat too little in week one and blame themselves "
                           "for what is really an intake problem.",
                 "cta": "See the number"},
        "try_this_week": "<p>Weigh one dinner this week. Just one.</p>",
    }
    hits = check_newsletter_content(good, site="cw")
    if hits:
        failures.append("FALSE POSITIVE on a clean CW newsletter:\n    " +
                        "\n    ".join(hits))

    # The newsletter generator must actually refuse. A check that only warns
    # is how the Sep 6 issue shipped in the first place.
    import json as _json
    try:
        import weekly_newsletter as wn
        real_call = wn.call_anthropic
        try:
            wn.call_anthropic = lambda *a, **k: _json.dumps(sep6_shape)  # bad "repair"
            if wn.sweet_guard_cw(sep6_shape, "fake-key") is not None:
                failures.append("weekly_newsletter.sweet_guard_cw did not BLOCK a "
                                "newsletter that still violates after repair")
            wn.call_anthropic = lambda *a, **k: _json.dumps(good)  # good repair
            if wn.sweet_guard_cw(sep6_shape, "fake-key") != good:
                failures.append("weekly_newsletter.sweet_guard_cw did not accept a "
                                "properly repaired newsletter")
            wn.call_anthropic = lambda *a, **k: (_ for _ in ()).throw(
                AssertionError("clean content must not trigger a repair call"))
            if wn.sweet_guard_cw(good, "fake-key") is not good:
                failures.append("weekly_newsletter.sweet_guard_cw altered clean content")
        finally:
            wn.call_anthropic = real_call
        newsletter_checks = 3
    except ImportError as e:
        print(f"  note: skipped weekly_newsletter integration ({e})")
        newsletter_checks = 0

    total = len(FIRES) * 2 + len(CLEAN) + 4 + newsletter_checks
    if failures:
        print(f"FAIL  {len(failures)} of {total} checks\n")
        for f in failures:
            print("  " + f + "\n")
        return 1
    print(f"PASS  {total} checks: {len(FIRES)} promotional cases blocked, "
          f"{len(CLEAN)} legitimate carnivore passages left alone, "
          f"KetoDial unaffected, newsletter front gate working.")
    return 0


if __name__ == "__main__":
    sys.exit(run())

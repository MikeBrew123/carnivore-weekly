#!/usr/bin/env python3
"""Red/green proof for the R6 electrolyte dosing guard.

Plain Python, matching tests/test_cw_sweet_guard.py. `npm test` in this repo
loads zero suites, so a Jest file would prove nothing. Run:

    python3 tests/test_electrolyte_dose_guard.py

Every UNSAFE fixture below is the REAL text of a defect removed on 2026-09-12,
pulled with `git show`, and every REPAIRED fixture is the real replacement text
from the same diff. The provenance line on each pair names the commit. A guard
that has never been seen to go red is not evidence: on 2026-09-07 a 445-
assertion pass sat on top of six P0 defects, and on 2026-09-12 three separate
all-clears were false. So the suite asserts both directions on the same text.

The CLEAN block is the false-positive boundary. Every entry was ruled in-bounds
by Sarah on 2026-09-12 and is live on a page we deliberately kept. A regression
there is worse than the bug this guard was built for, because it would make the
guard something people learn to skip.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from electrolyte_dose_guard import check_text, check_json, _cli  # noqa: E402


def live(text):
    """Findings that are NOT exempted."""
    return [f for f in check_text(text) if not f.exemption]


# ---------------------------------------------------------------------------
# Family 1 -- quantitative supplement / electrolyte protocols
# Each pair: (name, provenance, UNSAFE original, REPAIRED replacement)
# ---------------------------------------------------------------------------
PAIRS = [
    (
        "family1 numeric dose: CW drip day 10 magnesium bullet",
        "a5a77d43 data/drip-emails/day-10.html",
        "<li><strong>Magnesium:</strong> this one's hard to get from food alone. "
        "Around 300 to 400 mg of magnesium glycinate in the evening works well "
        "for most people. Skip magnesium oxide.</li>",
        "<li><strong>Magnesium is the honest exception.</strong> It is the one "
        "that is genuinely hard to get from meat alone. It is also the one where "
        "the right amount depends on you and on what else you take, so it is a "
        "good question for your pharmacist, who can look at your actual list in "
        "about two minutes. I am not going to hand you a number for it in an "
        "email.</li>",
    ),
    (
        "family1 numeric measure: CW drip day 10 DIY mineral drink",
        "a5a77d43 data/drip-emails/day-10.html",
        "<p>A big glass of water, 1/2 teaspoon of salt, 1/4 teaspoon of Lite "
        "Salt, and a squeeze of lemon if plain salt water makes you gag. Drink "
        "one in the morning and one mid-afternoon.</p>",
        "<p>A mug of hot broth, salted the way you would salt soup. It is warm, "
        "it is savoury, it goes down when nothing else appeals, and it gets the "
        "job done through food instead of through a measuring spoon.</p>",
    ),
    (
        "family1 daily target: KD drip day 2 three-numbers box",
        "a0126df9 data/drip-emails/kd/day-2.html",
        "<ul><li><strong>Sodium: 3,000 to 5,000 mg per day.</strong> A half "
        "teaspoon of salt is about 1,150 mg. Add a quarter teaspoon to your "
        "water bottle twice a day, and salt your food generously on top of "
        "that.</li><li><strong>Potassium: 2,600 mg per day for women, 3,400 mg "
        "for men.</strong> A quarter teaspoon of Lite Salt adds about 350 mg if "
        "you need help getting there.</li><li><strong>Magnesium: 300 to 500 mg "
        "per day.</strong> Look for glycinate or citrate, not oxide. Take it in "
        "the evening.</li></ul>",
        "<ul><li><strong>Salt your food, and then salt it a bit more.</strong> "
        "On the eggs, on the steak, in the vegetables, at every meal, until it "
        "tastes right to you.</li><li><strong>Put potassium on the "
        "plate.</strong> Avocado, spinach, salmon, mushrooms, plain unsweetened "
        "yogurt if you eat dairy.</li><li><strong>Magnesium is the honest "
        "exception.</strong> It is the hardest of the three to get from food, so "
        "it is a good two-minute question for your pharmacist, who can look at "
        "your actual list. I am not going to put a number for it in an email "
        "that goes to thousands of people.</li></ul>",
    ),
    (
        "family1 multi-word measure: KD keto-flu guide ketoade recipe",
        "d1ad75a ketodial/public/blog/keto-flu-electrolyte-fix.html",
        "<ul><li>24 oz water</li><li>1/4 tsp regular salt (sodium "
        "chloride)</li><li>1/4 tsp Lite Salt (potassium chloride)</li><li>1 tbsp "
        "lemon or lime juice (optional, for taste)</li></ul>"
        "<p>Make two of these per day. That gives you about 2,300 mg sodium and "
        "700 mg potassium from the drinks alone.</p>",
        "<p>This page used to carry a ketoade recipe, measured out by the quarter "
        "teaspoon. I've taken it down, and I'd rather tell you why than quietly "
        "swap it for something else. A salt substitute is a potassium supplement "
        "wearing a kitchen label. If you're eyeing a commercial electrolyte "
        "powder, turn it over and read the potassium line, and bring that label "
        "to your pharmacist.</p>",
    ),
    (
        "family1 sodium protocol prose: CW dosing-protocol page",
        "57e7bfdf public/blog/2026-03-31-electrolytes-carnivore-protocol-dosing"
        "-sodium-magnesium.html",
        "<li>Add 1/4 to 1/2 teaspoon of sodium chloride (table salt) to a glass "
        "of water 2-3 times per day, especially in the morning and around "
        "exercise</li>",
        "<li>Season every meal until it tastes right to you, and expect your "
        "taste for salt to climb in the first couple of weeks</li>",
    ),
    (
        "family1 escalation instruction: CW dosing-protocol page",
        "57e7bfdf public/blog/2026-03-31-electrolytes-carnivore-protocol-dosing"
        "-sodium-magnesium.html",
        "<p>If you're experiencing these despite supplementing, increase sodium "
        "by an additional 500-1,000mg per day for one week and see what "
        "changes.</p>",
        "<p>And the instruction that used to close this section, to increase "
        "sodium by a set amount per day for a week if you still felt bad, is "
        "gone for good. A page cannot see who is reading it. If seasoning to "
        "taste for a fortnight hasn't sorted it out then the next step is that "
        "conversation with your doctor, not a bigger number.</p>",
    ),
    (
        "family1 checklist doses: CW beginners-blueprint (linked from drip day 1)",
        "57e7bfdf public/blog/2026-01-02-beginners-blueprint.html",
        "<ul><li>Magnesium: 400mg (supplement if needed)</li>"
        "<li>Potassium: about 2,600mg a day for women and 3,400mg for men, and "
        "meat covers most of it</li>"
        "<li>Drink salted water (1/2 tsp salt in 16 oz water, sip throughout the "
        "day)</li></ul>",
        "<ul><li>Salt your food at every meal until it tastes right to you</li>"
        "<li>Potassium comes off the plate: beef, lamb, pork and eggs do the "
        "work</li>"
        "<li>Magnesium is the pharmacist question, because the right amount "
        "depends on what else you take</li></ul>",
    ),
    # ---------------- Family 2 -- followable structures ----------------
    (
        "family2 SCHEDULE: the defect that survived three passes",
        "af8b64b ketodial/public/blog/keto-sleep-problems-fix.html",
        "<ul><li><strong>6:00 PM:</strong> Last meal. High fat, moderate "
        "protein. Usually salmon or ribeye with butter and greens.</li>"
        "<li><strong>7:30 PM:</strong> Bone broth with salt. Screens dim or "
        "off.</li>"
        "<li><strong>8:00 PM:</strong> 400mg magnesium glycinate + 300mg KSM-66 "
        "ashwagandha</li>"
        "<li><strong>9:00 PM:</strong> Room cold (65-67F), blackout curtains</li>"
        "</ul>",
        "<ul><li><strong>6:00 PM:</strong> Last meal. High fat, moderate "
        "protein. Usually salmon or ribeye with butter and greens.</li>"
        "<li><strong>7:30 PM:</strong> Bone broth with salt. Screens dim or "
        "off.</li>"
        "<li><strong>8:00 PM:</strong> Magnesium glycinate, and 300mg KSM-66 "
        "ashwagandha. The magnesium amount is deliberately not on this schedule. "
        "See step 1 above and ask a pharmacist: a timetable is the part people "
        "copy straight out, so a number here would be the number that actually "
        "gets taken.</li>"
        "<li><strong>9:00 PM:</strong> Room cold (65-67F), blackout curtains</li>"
        "</ul>",
    ),
    (
        "family2 TABLE: the paid Etsy printable dose table",
        "31431ab9 etsy/products/templates/keto-bundle-pages.html",
        '<table class="carb-table">'
        "<tr><th>Electrolyte</th><th>Daily Target</th></tr>"
        "<tr><td><strong>Sodium</strong></td><td>3,000-5,000 mg</td></tr>"
        "<tr><td><strong>Potassium</strong></td><td>2,600 mg (women) / 3,400 mg "
        "(men)</td></tr>"
        "<tr><td><strong>Magnesium</strong></td><td>300-400 mg</td></tr>"
        "</table>",
        '<div class="item"><span><strong>Salt your food to taste,</strong> and '
        "have a cup of broth. Under-salting is the most common reason week one "
        "feels awful.</span></div>"
        '<div class="item"><span><strong>Get potassium from food,</strong> not '
        "from potassium pills or lite salt.</span></div>"
        '<div class="warn-box"><strong>No milligram targets here, on purpose.'
        "</strong> If you take any prescription, have a heart, kidney or liver "
        "condition, or have ever been told to go easy on salt, your amounts are "
        "a question for your doctor.</div>",
    ),
    # ---------------- Family 3 -- non-numeric directive language -------
    (
        "family3 symptom routing, no number anywhere in the line",
        "d1ad75a ketodial/public/blog/keto-flu-electrolyte-fix.html",
        "<p><strong>Signs you need more potassium:</strong> muscle cramps "
        "(especially calves and feet), heart palpitations, feeling weak during "
        "workouts you normally handle fine.</p>",
        "<p><strong>Heart palpitations, a racing or skipping heartbeat, or "
        "muscle weakness that feels new.</strong> I've pulled this one out on "
        "its own because it doesn't belong with the others. Both too little and "
        "too much potassium can cause it, and you cannot tell which from the way "
        "it feels. So this is not one to answer by adding potassium. Call your "
        "doctor and tell them you've recently changed how you eat.</p>",
    ),
    (
        "family3 absolute imperative: no verb, no numeral, no symptom noun",
        "af8b64b ketodial/public/blog/full-day-of-keto-macros.html",
        "<p>I add electrolytes daily, non-negotiable, and I tell every client to "
        "do the same. Salt your food and use an electrolyte mix that actually "
        "has enough sodium in it. This isn't optional on a low-insulin diet, "
        "especially if you train.</p>",
        "<p>What I'm not going to tell you is that a daily electrolyte mix is "
        "non-negotiable, because for some readers it's the opposite. If you take "
        "a daily pill for your blood pressure or your heart, a water pill, or "
        "anything to do with your kidneys, check with your doctor or your "
        "pharmacist before you add sodium or potassium.</p>",
    ),
]


# ---------------------------------------------------------------------------
# The false-positive boundary. All live, all deliberately kept.
# ---------------------------------------------------------------------------
CLEAN = [
    ("1 tbsp butter in a carb reference table",
     "<ul><li>12 oz ribeye steak (900 cal, 66g protein, 70g fat)</li>"
     "<li>2 tbsp butter on top (200 cal, 22g fat)</li>"
     "<li>4 eggs cooked in butter (320 cal, 24g protein, 24g fat)</li></ul>"),
    ("food composition: broth sodium, kept verbatim in the repaired page",
     "<ul><li>Salt your food generously. Table salt, sea salt, doesn't matter "
     "much.</li><li>Broth or bouillon. One cup can carry 800 to 1,200 mg of "
     "sodium.</li><li>Pickles, olives, and cured meats.</li></ul>"),
    ("culinary: a quarter teaspoon of salt in bone broth",
     "<p>Simmer the carcass with water, a quarter teaspoon of salt and a splash "
     "of vinegar for a few hours. Free broth for the rest of the week.</p>"),
    ("a pinch of salt in water as a hunger-versus-thirst test",
     "<p>Next time you think you are hungry, drink a glass of water with a pinch "
     "of salt in it and wait ten minutes. Half the time that was thirst.</p>"),
    ("THE SHARPEST TEST: 99 mg cited as the reason NOT to dose (2 live CW pages)",
     "<p>Too much potassium and too little potassium both affect heart rhythm, "
     "and from the inside they feel the same. That's why over-the-counter "
     "potassium pills are capped at 99 mg each, and it's why a target is the "
     "wrong tool here.</p>"),
    ("the same cap citation in its other live wording",
     "<p>We do not publish potassium dosing of any kind on this site, and that "
     "is on purpose. Over-the-counter potassium pills are capped at 99mg each "
     "for a reason.</p>"),
    ("food composition, per-serving mineral content",
     "<p>Ground beef has about 300 mg per 4 oz serving. Salmon has about 500 mg "
     "per 6 oz. Beef liver is one of the highest sources at around 380 mg per 3 "
     "oz. Avocado. One has around 700 mg.</p>"),
    ("Day N line that is a cooking schedule, not a dosing schedule",
     "<p>Roast the whole chicken on Day 1. Season it with salt, pepper, and "
     "garlic powder. Cook at 425F for about 1 hour 15 minutes.</p>"),
    ("macro table, the content that filled the window behind `head -20`",
     "<table><tr><th>Meal</th><th>Protein</th><th>Fat</th></tr>"
     "<tr><td>Breakfast</td><td>24g</td><td>24g</td></tr>"
     "<tr><td>Dinner</td><td>66g</td><td>70g</td></tr></table>"),
    ("clinician-gated absolute: the imperative points at the safe action",
     "<p>If you have kidney problems, you're on blood pressure medication, or "
     "you have any heart condition, do not load up on sodium or potassium on "
     "your own. Talk to your doctor first and let them set your targets. This "
     "isn't optional. Period.</p>"),
    # These two exist because the 2026-09-12 mutation run found the cap-citation
    # and food-composition exemptions were NOT load-bearing: the live wordings
    # above happened to pass for other reasons, so either exemption could have
    # rotted away unnoticed. Each of these can only pass via its own exemption.
    ("ISOLATES cap-citation: a bound dose cited as a regulatory ceiling",
     "<p>Potassium supplements are capped at 99 mg of potassium per tablet by "
     "regulation.</p>"),
    ("ISOLATES food-composition: a bound dose stating what a food contains",
     "<p>A 4 oz serving of ground beef contains 300 mg of potassium.</p>"),
    # Sarah's own repaired sentence. The 2026-09-12 repo sweep flagged this as
    # routing a racing heartbeat to salt, which is the opposite of what it says.
    ("REGRESSION: repaired copy that routes a symptom AWAY from salt",
     "<p>If it's getting worse rather than better, or it arrives with a racing "
     "heartbeat or dizziness on standing, that's a phone call rather than more "
     "salt.</p>"),
    ("ISOLATES redirected-away: symptom named only to rule the mineral out",
     "<p>A racing heartbeat is the one symptom to answer with a doctor rather "
     "than more potassium.</p>"),
    # Both measured false positives from the 2026-09-12 repo sweep.
    ("REGRESSION: curing salt is a weight ratio, not a dose",
     "<p>Salt math. This is the big one. Curing is a ratio by weight, not a "
     "handful. You need a kitchen scale. Not optional.</p>"),
    ("REGRESSION: a journaling paragraph that happens to list salt",
     "<p>If you've been writing down your meat, your fat, your water, your "
     "salt, your sleep and your energy every single day, you have data that "
     "disagrees with the feelings.</p>"),
    ("REGRESSION: the 99 mg cap in its FDA-limits wording, live on a CW page",
     "<p>The FDA limits over-the-counter potassium supplements to 99 mg per dose "
     "specifically because potassium overdose is a real, life-threatening "
     "risk.</p>"),
    ("salt-to-taste seasoning guidance with no measured quantity",
     "<p>Salt your food, then salt it again. On the meat, at every meal, until "
     "it tastes right to you. Not measured into a glass.</p>"),
]


# ---------------------------------------------------------------------------
# Real defects the guard must catch, where no repaired counterpart exists to
# pair with: one was deleted outright rather than rewritten, the other is still
# live and unrepaired as of 2026-09-12 (the guard found it). Each isolates a
# protection that nothing else in this file exercises.
# ---------------------------------------------------------------------------
MUST_FIRE = [
    # False NEGATIVES found by the 2026-09-12 sweep's exemption audit: the
    # culinary and food-composition exemptions were swallowing real daily
    # targets whenever the paragraph also talked about seasoning food. The
    # second of these is a PAID Etsy printable, the same class as the bundle
    # repaired earlier the same night.
    ("ISOLATES daily-target override vs culinary: a target beside 'salt your meat'",
     "live and unrepaired 2026-09-12, "
     "public/blog/2026-06-23-carnivore-endurance-problem.html",
     "<li>Sodium: 4 to 6 grams a day, more on long training days. Salt your "
     "meat heavily.</li>"),
    ("ISOLATES daily-target override on a paid printable dose line",
     "live and unrepaired 2026-09-12, "
     "etsy/products/templates/diet-food-list-pages.html",
     "<p>Electrolytes: 2-3 tsp salt/day &middot; Magnesium via bone broth or "
     "glycinate 400mg &middot; Potassium from meat &amp; broth.</p>"),
    ("ISOLATES daily-target override vs food-composition in one sentence",
     "live and unrepaired 2026-09-12, "
     "public/blog/2026-09-09-potassium-on-carnivore.html",
     "<li>Sodium: 3 to 5 grams a day for most adults. One teaspoon of salt is "
     "about 2.3 grams of sodium.</li>"),
    ("ISOLATES vehicle-override: composition framing with a water vehicle",
     "57e7bfdf public/blog/2026-05-17-carnivore-electrolyte-problem.html "
     "(deleted, not rewritten)",
     "<p>One supplement that does help bridge potassium without the risks: "
     "cream of tartar. Half a teaspoon contains about 250 mg of potassium and "
     "is sometimes added to water or broth.</p>"),
    ("ISOLATES paragraph units: symptom and directive in adjacent sentences",
     "live and unrepaired 2026-09-12, "
     "public/blog/2026-08-28-heart-palpitations-carnivore.html",
     "<p>Salt first. Most people who feel palpitations in week two are simply "
     "under-salting. You need more than you did eating carbs, and you need it "
     "spread through the day rather than dumped in one meal.</p>"),
]


def run():
    fails = []
    checks = 0

    for name, prov, text in MUST_FIRE:
        checks += 1
        if not live(text):
            fails.append(f"NOT RED on a real defect: {name}\n    [{prov}]\n"
                         f"    {text[:200]}")

    # --- the mutation requirement, both directions on the same real text ---
    for name, prov, unsafe, repaired in PAIRS:
        checks += 2
        if not live(unsafe):
            fails.append(f"NOT RED on the real defect: {name}\n    [{prov}]\n"
                         f"    {unsafe[:200]}")
        hits = live(repaired)
        if hits:
            fails.append(f"NOT GREEN on the real repair: {name}\n    [{prov}]\n"
                         + "\n".join("    " + h.render() for h in hits))

    # --- family coverage: each family must be the thing that fires ---
    families = {}
    for name, _prov, unsafe, _rep in PAIRS:
        for f in live(unsafe):
            families.setdefault(f.family.split("/")[0], set()).add(name)
    for fam in ("quantitative", "directive"):
        checks += 1
        if fam not in families:
            fails.append(f"no fixture fires signature family '{fam}'")
    for shape in ("quantitative/dose", "quantitative/measure",
                  "quantitative/word-measure", "directive/symptom-routing",
                  "directive/absolute"):
        checks += 1
        hit = any(f.family == shape
                  for _n, _p, u, _r in PAIRS for f in live(u))
        if not hit:
            fails.append(f"no fixture fires pattern '{shape}' -- that pattern "
                         f"is unproven and may be dead")

    # --- the followable-structure escalation ---
    checks += 1
    sched = [f for f in live(PAIRS[7][2]) if f.severity == "HIGH"]
    if not sched:
        fails.append("the 8:00 PM schedule defect was not reported HIGH; the "
                     "followable-structure escalation is not working")
    checks += 1
    if not any("schedule" in f.kind for f in live(PAIRS[7][2])):
        fails.append("the clock-stamped line was not identified as a schedule")
    checks += 1
    if not any(f.kind.startswith(("tr", "td", "th")) for f in live(PAIRS[8][2])):
        fails.append("the paid-printable dose table was not scanned as a table "
                     "row or cell")

    # --- the false-positive boundary ---
    for name, text in CLEAN:
        checks += 1
        hits = live(text)
        if hits:
            fails.append(f"FALSE POSITIVE on content we deliberately kept: "
                         f"{name}\n" + "\n".join("    " + h.render()
                                                 for h in hits))

    # --- constraint 1: short lines must not be dropped ---
    checks += 1
    if not live("<li>Magnesium: 400mg</li>"):
        fails.append("a 26-character <li> was dropped. This is the wide-fixed-"
                     "context-window bug the guard exists to avoid.")
    checks += 1
    if not live("<td>Magnesium 300-400 mg</td>"):
        fails.append("a bare <td> dose cell was dropped")
    checks += 1
    # The mineral in one cell, its dose in the next. Neither cell alone carries
    # the defect; the row does. This is the shape the paid printable shipped.
    if not live("<tr><td><strong>Sodium</strong></td><td>3,000-5,000 mg</td></tr>"):
        fails.append("a dose split across two <td> cells of one <tr> was missed")

    # --- the non-mineral scope line, live on a repaired page ---
    checks += 1
    if live("<li><strong>8:00 PM:</strong> Magnesium glycinate, and 300mg "
            "KSM-66 ashwagandha.</li>"):
        fails.append("a quantity bound to a non-mineral (KSM-66) reached "
                     "backwards and grabbed 'Magnesium glycinate'. That exact "
                     "line is live on a repaired KD page.")

    # --- JSON entry point (data/blog_posts.json is a real surface) ---
    checks += 2
    doc = {"posts": [
        {"slug": "bad", "content": "<p>Target 3,000 to 5,000 mg of sodium "
                                   "daily.</p>"},
        {"slug": "good", "content": "<p>Salt your food until it tastes right to "
                                    "you.</p>"}]}
    jf = [f for f in check_json(doc, "data/blog_posts.json") if not f.exemption]
    if not jf:
        fails.append("check_json missed a dose inside a blog_posts.json row")
    if any("good" in f.path for f in jf):
        fails.append("check_json fired on the repaired blog_posts.json row")

    # --- CLI contract: exit codes and no truncation ---
    import io
    import contextlib
    import tempfile
    import os
    checks += 4
    tmp = tempfile.mkdtemp()
    bad = os.path.join(tmp, "bad.html")
    good = os.path.join(tmp, "good.html")
    with open(bad, "w") as fh:
        fh.write(PAIRS[2][2])
    with open(good, "w") as fh:
        fh.write(PAIRS[2][3])
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc_bad = _cli(["--files", bad])
    out = buf.getvalue()
    if rc_bad != 2:
        fails.append(f"CLI exit code on a finding was {rc_bad}, expected 2")
    if out.count("[MEDIUM]") + out.count("[HIGH]") < 3:
        fails.append("CLI printed fewer findings than the file contains; the "
                     "never-truncate rule is broken\n" + out)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc_good = _cli(["--files", good])
    if rc_good != 0:
        fails.append(f"CLI exit code on clean content was {rc_good}, expected 0")
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc_report = _cli(["--files", bad, "--mode", "report"])
    if rc_report != 0:
        fails.append(f"--mode report exited {rc_report}, expected 0 (report "
                     f"mode must never block a commit)")

    if fails:
        print(f"FAIL  {len(fails)} of {checks} checks\n")
        for f in fails:
            print("  " + f + "\n")
        return 1
    print(f"PASS  {checks} checks: {len(PAIRS)} real defect/repair pairs go red "
          f"then green, all 3 signature families and all 5 patterns proven "
          f"live, {len(CLEAN)} deliberately-kept passages left alone, short "
          f"lines and table cells scanned, CLI exit codes correct.")
    return 0


if __name__ == "__main__":
    sys.exit(run())

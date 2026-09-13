#!/usr/bin/env python3
"""R6: ungated electrolyte / mineral dosing guard.

Why this file exists
--------------------
On 2026-09-12 the same defect class was removed from six surfaces in one night:
CW drip day 10, KD drip day 2, the KD keto-flu guide, 11 managed blog pages,
7 legacy KD pages, and a paid Etsy printable. It kept being missed by eye and
by ad-hoc greps. This module is the mechanical version of that review.

The class: quantitative or absolute instructions to take a mineral supplement,
hit a daily mineral intake target, or measure out a salt substitute, published
to a general audience with no medication or condition gate in front of it.

House rule from CLAUDE.md: suppress, never substitute. This guard therefore
reports; it never proposes a smaller number.

Two constraints, both learned from bugs on 2026-09-12
-----------------------------------------------------
1. NO WIDE FIXED CONTEXT WINDOW. A pattern shaped like ``.{100}(magnesium|...)``
   requires 100 characters before the keyword and so silently drops every short
   line. Short lines are exactly what checklists, tables and timetables are made
   of. Every window here is bounded by real content (a sentence, an <li>), never
   by a character count that must be filled.
2. NEVER TRUNCATE OUTPUT. A sweep piped through ``head -20`` filled its window
   with food-macro grams before reaching the page with the real defect. This CLI
   prints every finding it has. Do not pipe it through head; use --json or grep
   if you need to narrow, so the count in the summary line stays honest.

Three signature families, all learned from real failures
--------------------------------------------------------
1. Quantitative supplement / electrolyte protocols. Three quantity shapes,
   needed together because each misses what the others catch:
     - numeric dose      "300 mg magnesium", "3,000-5,000 mg sodium", "3-5g"
     - numeric measure   "1/4 tsp Lite Salt", "1/2 teaspoon of salt"
     - multi-word measure "half a teaspoon", "a quarter teaspoon"
2. Followable structures. <li>, <td>, <th>, clock-stamped lines ("8:00 PM:")
   and "Day N" lines are scanned as their own units. A real defect survived
   three passes because the prose bullet was repaired and
   "8:00 PM: 400mg magnesium glycinate" in the schedule below it was not.
   The timetable is the part people copy straight out, so findings inside one
   are reported at severity HIGH.
3. Non-numeric directive language. "Signs you need more potassium: heart
   palpitations" has no number and is in class because it routes a serious
   symptom to self-supplementation. "non-negotiable" and "isn't optional" carry
   no verb, no numeral and no symptom noun, so every numeric pattern and every
   symptom signature misses them.

The false-positive boundary (Sarah, 2026-09-12)
-----------------------------------------------
A number is IN class when it doses a mineral supplement, sets a daily intake
target, or measures a salt substitute. It is OUT of class when it describes how
to season or portion food, or states what a food contains.

Ruled in-bounds and verified against live pages, all of these must pass:
    "1 tbsp butter"                                   (culinary, not a mineral)
    "One cup can carry 800 to 1,200 mg of sodium"     (food composition)
    "a quarter teaspoon of salt" in bone broth        (culinary, food-delivered)
    "a pinch of salt in your water"                   (no measured quantity)
    "potassium pills are capped at 99 mg each"        (a dose cited as the
                                                       REASON NOT to dose)
Every exemption below is named, and --show-exempt prints what was exempted and
why, so the boundary stays auditable instead of becoming folklore.

Scope note: this guard is scoped to electrolyte minerals and salt substitutes on
purpose. "300mg KSM-66 ashwagandha" sits in a repaired live page and is out of
scope; widening to every supplement would re-break that page.

Usage
-----
    python3 scripts/electrolyte_dose_guard.py --files public/blog/*.html
    python3 scripts/electrolyte_dose_guard.py --files data/blog_posts.json
    echo "Take 300 mg of magnesium" | python3 scripts/electrolyte_dose_guard.py --stdin
    python3 scripts/electrolyte_dose_guard.py --files X --mode report   # never blocks

Exit codes (house convention, matches cw_sweet_guard.py):
    0  clean, or --mode report
    2  at least one finding in --mode check
    1  bad invocation / unreadable input
"""

import argparse
import json
import re
import sys

# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------

# The minerals this guard is scoped to, plus salt substitutes, which are
# potassium supplements wearing a kitchen label. Bare "salt" is here, and is
# held in check by the culinary exemption rather than by leaving it out: the
# defect "add 1/4 teaspoon of salt to a glass of water" has no other noun.
MINERAL = re.compile(
    r"""\b(?:
        sodium | natrium
      | potassium
      | magnesium
      | calcium
      | electrolytes?
      | lite\s*salt | losalt | no\s*salt | nu-?salt
      | salt\s+substitutes? | potassium\s+chloride | sodium\s+chloride
      | kcl | nacl | cream\s+of\s+tartar | ketoade
      | (?:table|sea|kosher|pink|himalayan|rock|celtic)\s+salt
      | salt
      | magnesium\s+(?:glycinate|citrate|oxide|malate|taurate|threonate)
    )\b""",
    re.I | re.X,
)

# Words allowed to sit between a quantity and the mineral it doses. Dose verbs
# are filler on purpose: they support the binding rather than break it.
FILLER = {
    "of", "the", "a", "an", "to", "or", "and", "per", "day", "days", "daily",
    "week", "weekly", "elemental", "about", "roughly", "around", "approx",
    "approximately", "up", "at", "least", "most", "total", "each", "extra",
    "additional", "more", "by", "in", "into", "your", "my", "is", "are", "was",
    "be", "added", "adds", "spread", "across", "meals", "meal", "worth",
    "dose", "doses", "dosage", "supplemental", "supplement", "supplements",
    "pill", "pills", "capsule", "capsules", "tablet", "tablets", "powder",
    "chloride", "glycinate", "citrate", "oxide", "malate", "taurate",
    "threonate", "bicarbonate", "target", "targets", "intake", "amount",
    "amounts", "level", "levels", "range", "minimum", "maximum", "under",
    "over", "between", "plus", "with", "from", "for", "on", "as", "it", "you",
    "take", "taking", "aim", "aiming", "get", "getting", "need", "needs",
    "needed", "use", "using", "add", "adding", "start", "starting", "give",
    "shoot", "hit", "hitting", "want", "wants", "should", "must", "s",
    "combined", "roughly", "same", "that", "this", "these", "those",
    "week", "weeks", "month", "months", "fortnight", "night", "evening",
    "morning", "bed", "bedtime", "dinner", "breakfast", "lunch", "time",
    "times", "once", "twice", "if", "when", "while", "so", "then", "but",
    "before", "after", "throughout", "spread",
}

# --- the three quantity shapes -------------------------------------------
UNIT_MASS = r"(?:mg|milligrams?|mcg|micrograms?|g|grams?|mmol|meq)"
UNIT_SPOON = (r"(?:tsp|teaspoons?|tbsp|tablespoons?|scoops?|capsules?"
              r"|tablets?|pills?|sticks?|packets?|servings?)")
RANGE = r"(?:\s*(?:to|-|–—|–|—|and|or)\s*[\d][\d,.]*)?"

Q_DOSE = re.compile(
    rf"\b\d[\d,.]*{RANGE}\s*{UNIT_MASS}\b", re.I)
Q_MEASURE = re.compile(
    rf"\b(?:\d+\s+)?(?:\d+/\d+|\d[\d,.]*){RANGE}\s*{UNIT_SPOON}\b", re.I)
# "half a teaspoon", "a quarter teaspoon", "two tablespoons".
Q_WORD = re.compile(
    rf"\b(?:a\s+|one\s+)?(?:half|quarter|third|one|two|three|four)\s+"
    rf"(?:a\s+)?{UNIT_SPOON}\b", re.I)
# Deliberately NOT quantities: "a pinch of salt", "a dash", "a sprinkle".
# They are unmeasurable by design, which is what makes them safe.

QUANTITY_PATTERNS = (("dose", Q_DOSE), ("measure", Q_MEASURE),
                     ("word-measure", Q_WORD))

# --- exemptions, each named so a reviewer can audit the boundary ----------

# The sharpest test in the set: a dose number cited as the REASON NOT to dose.
# Live on two CW pages ("over-the-counter potassium pills are capped at 99 mg
# each"). If this stops working, the guard starts fighting our own safety copy.
EX_CAP_CITATION = re.compile(
    r"""(?:
        capp?ed\s+(?:at|to)
      | \bcap\s+(?:of|is|at)
      | upper\s+limit | tolerable\s+upper
      | regulated\s+(?:at|to|in)
      | (?:limited|restricted)\s+(?:to|at)
      # The FDA limits OTC potassium supplements to 99 mg per dose -- the
      # 2026-09-12 repo sweep found this wording of the 99 mg cap citation on a
      # live CW page and the guard fired on it. A limiting verb plus to <n> is
      # a ceiling, not an instruction to take that much.
      | \b(?:limits?|caps?|restricts?|regulates?|allows?)\s+[^.]{0,60}?\bto\s+\d
      | \bper\s+dose\b(?=[^.]{0,80}(?:overdose|risk|safety|regulat|cap))
      | no\s+more\s+than\s+\d[^.]{0,40}\bper\s+(?:tablet|pill|capsule)
      | \bper\s+(?:tablet|pill|capsule)\b
      | \bfor\s+that\s+reason\b
    )""", re.I | re.X)

# "This food contains X." Describing a food, not instructing a reader.
EX_FOOD_COMPOSITION = re.compile(
    r"""(?:
        \bcontains?\b | \bcontaining\b | \bcarr(?:y|ies)\b | \bcarrying\b
      | \bhas\s+(?:about|around|roughly|approximately)?\s*\d
      | \bhave\s+(?:about|around|roughly)?\s*\d
      | \bprovides?\b | \bdelivers?\b | \bsupplies\b | \byields?\b
      | \bis\s+about\s+\d | \bare\s+about\s+\d | \bsits\s+at\b
      | \bworks\s+out\s+to\b | \bcomes\s+(?:in|out)\s+at\b
      | \bper\s+\d+\s*(?:oz|ounce|lb|pound|g|gram|cup|serving)
      | \bper\s+(?:serving|cup|slice|egg|steak|portion)\b
      | \b(?:one|a|each)\s+(?:cup|avocado|egg|steak|serving|fillet|packet|stick)\b
      | \bnaturally\s+in\b | \balready\s+in\b
      | \bfrom\s+food\s+alone\b
      | \bnutrition\s+(?:label|facts)\b | \bon\s+the\s+label\b
    )""", re.I | re.X)

# Seasoning or portioning food. Salt on a steak is not a dose.
EX_CULINARY = re.compile(
    r"""(?:
        \bseason(?:ed|ing|s)?\b | \bto\s+taste\b | \btastes?\s+right\b
      | \bsalt\s+(?:your|the|it|everything|every)\b
      | \bsprinkl\w+ | \brub\b | \bmarinade\b | \bbrine\b | \bcrust\b
      | \brecipe\b | \bcook(?:ed|ing|s)?\b | \broast(?:ed|ing|s)?\b
      | \bsimmer\w* | \bsear(?:ed|ing)?\b | \bbake[ds]?\b | \bgrill\w*
      | \bbone\s+broth\b | \bbroth\b | \bstock\b | \bsoup\b | \bstew\b
      | \bbutter\b | \bsteak\b | \beggs?\b | \bmince\b
      | \bin\s+the\s+(?:pan|pot|oven)\b
    )""", re.I | re.X)

# Overrides both food exemptions: a measuring vehicle or an explicit target
# turns "a quarter teaspoon" back into a dose. "Half a teaspoon contains about
# 250 mg of potassium and is sometimes added to water" was a real removed
# defect that reads as composition until you get to the water.
EX_OVERRIDE_VEHICLE = re.compile(
    r"""(?:
        \b(?:glass|bottle|mug|jug|litre|liter|quart)\s+of\s+water\b
      | \bwater\s+bottle\b | \binto\s+(?:a\s+)?(?:glass|water)\b
      | \bstir(?:red|ring)?\s+(?:it\s+)?(?:in|into)\b
      | \bdissolv\w+ | \bmix(?:ed|ing)?\s+(?:it\s+)?(?:in|into)\s+water\b
      | \badd(?:ed|ing)?\s+[^.]{0,40}\bto\s+(?:your\s+|a\s+|the\s+)?
            (?:water|glass|bottle|drink)\b
      | \bdaily\s+(?:target|targets|dose|intake|total)\b
      | \b(?:target|targets|aim\s+for|shoot\s+for|hit)\b[^.]{0,30}\bper\s+day\b
      | \bper\s+day\b[^.]{0,20}\b(?:target|total|minimum)\b
      | \b(?:take|taking)\s+[^.]{0,30}\b(?:before\s+bed|at\s+night|in\s+the\s+evening|with\s+dinner)\b
      | \bsupplement(?:ing|ation)?\b
      | \bketoade\b
      | \bin\s+(?:a\s+glass\s+of\s+)?water\b | \binto\s+water\b
      | \bin\s+a\s+glass\b | \bin\s+\d+\s*oz\s+(?:of\s+)?water\b
    )""", re.I | re.X)

# A per-day / per-meal framing makes a quantity an intake TARGET, which is in
# class however the surrounding paragraph talks about food. Kept narrow on
# purpose: it is checked against the sentence the quantity is in, not the unit.
DAILY_TARGET = re.compile(
    r"""(?:
        \bper\s+day\b | \ba\s+day\b | \bdaily\b | /\s*day\b
      | \bper\s+meal\b | \bevery\s+day\b | \beach\s+day\b
      | \b(?:twice|three\s+times|2-3\s+times)\s+a\s+day\b
      | \bper\s+hour\b | \bevery\s+\d+(?:-\d+)?\s+hours?\b
      | \bdaily\s+total\b | \bper\s+24\s+hours\b
    )""", re.I | re.X)


# --- family 3: non-numeric directive language ----------------------------

SERIOUS_SYMPTOM = re.compile(
    r"""(?:
        heart\s+palpitations? | \bpalpitations?\b | arrhythmias?
      | irregular\s+(?:heart\s*beat|heartbeat|pulse|rhythm)
      | racing\s+(?:heart|pulse|heartbeat) | skipping\s+(?:a\s+)?beats?
      | heart\s+(?:flutters?|racing|skipping)
      | chest\s+pain | breathless\w* | shortness\s+of\s+breath
      | faint(?:ing|s|ed)?\b | syncope | black(?:ing)?\s+out
      | confusion | disorient\w*
      | muscle\s+weakness | weakness\s+that\s+feels\s+new
    )""", re.I | re.X)

# "You are short on this mineral, so add some" -- the directive half.
DIRECTIVE_TO_SUPPLEMENT = re.compile(
    r"""(?:
        signs?\s+(?:that\s+)?you(?:'re|\s+are)?\s+
            (?:need|needs|needing|low|short|running\s+low)
      | signs?\s+you'?re\s+(?:still\s+)?(?:under[-\s]?dosing|low)
      | \byou\s+need\s+more\b | \bneed\s+more\b
      | \badd(?:ing)?\s+more\b | \bincrease\s+(?:your\s+)?\b
      | \bup\s+your\b | \bbump\s+(?:up\s+)?your\b
      | \bload\s+up\s+on\b | \btake\s+more\b
      | \bsupplement(?:ing)?\s+with\b
      | \bmore\s+(?:sodium|potassium|magnesium|salt|electrolytes)\b
    )""", re.I | re.X)

# No verb, no numeral, no symptom noun -- invisible to every other signature.
ABSOLUTE_IMPERATIVE = re.compile(
    r"""(?:
        non[-\s]?negotiable
      | (?:is\s*n'?t|are\s*n'?t|not)\s+optional
      | no\s+excuses | no\s+exceptions
      | \bmandatory\b | \bmust\s+do\s+this\b
      | \bskip\s+this\s+at\s+your\s+peril\b
    )""", re.I | re.X)
# Dropped from the set above after the 2026-09-12 repo sweep: "every single
# day". It is a generic intensifier, and both of its hits were a journaling
# paragraph that happened to list "your salt" among things to write down.

# Absolutes that are not about intake at all. Both were measured false positives
# on the same sweep: curing salt is a weight ratio (kitchen scale "not
# optional"), which is food preservation, not a dose.
EX_NOT_DOSING = re.compile(
    r"""(?:
        kitchen\s+scale | ratio\s+by\s+weight | \bcur(?:e|es|ed|ing)\b
      | \bbiltong\b | \bjerky\b | \bbrining\b | \bkoji\b
      | \bwrit(?:e|ing)\s+down\b | \bfood\s+(?:journal|diary|log)\b
    )""", re.I | re.X)

# Sends the reader to a person who can see their chart. When this is present,
# an absolute is pointing at the safe action ("Talk to your doctor first. This
# isn't optional.") rather than at self-supplementation.
CLINICIAN_REFERRAL = re.compile(
    r"""(?:
        (?:talk|speak|check|ask|conversation)\s+(?:to|with)?\s*
            (?:your\s+)?(?:doctor|gp|pharmacist|clinician|physician|nurse)
      | your\s+(?:doctor|pharmacist|clinician)\s+(?:can|should|needs|knows)
      | \bask\s+a\s+pharmacist\b
      | \bcall\s+your\s+doctor\b | \bring\s+your\s+doctor\b
      | \bmedical\s+(?:advice|guidance|supervision)\b
      | \burgent\s+care\b | \bemergency\s+(?:room|care|department)\b | \b911\b
      | \b(?:that'?s|thats)\s+a\s+(?:phone\s+)?call\b
      | \bphone\s+call\s+rather\s+than\b
      | \bget\s+it\s+looked\s+at\b | \bgo\s+and\s+get\s+checked\b
      | \bblood\s+test\b
    )""", re.I | re.X)

# The symptom is being routed AWAY from self-supplementation. Measured on the
# 2026-09-12 repo sweep: without this, Sarah's own repaired sentence "that's a
# phone call rather than more salt" was reported as routing a racing heartbeat
# to salt, i.e. the guard fired on the fix. A guard that flags the repair is how
# people learn to skip it.
REDIRECTED_AWAY = re.compile(
    r"""(?:
        rather\s+than\s+(?:more\s+|adding\s+|a\s+bigger\s+)?
            (?:salt|salting|sodium|potassium|magnesium|electrolytes?|
               supplements?|a\s+supplement|pills?)
      | instead\s+of\s+(?:more\s+|adding\s+)?
            (?:salt|salting|sodium|potassium|magnesium|electrolytes?)
      | (?:not|n'?t)\s+(?:one\s+)?to\s+(?:answer|treat|fix)\b
      | (?:do\s*n'?t|don'?t)\s+(?:answer|treat|fix)\s+(?:this|that|it|these)\b
      | (?:not|n'?t)\s+(?:a\s+)?(?:minerals?|electrolytes?)\s+question
      | (?:not|n'?t)\s+something\s+to\s+(?:salt|supplement)
      | (?:is|are)\s+not\s+keto\s+flu
      | salting\s+past\s+it
      | (?:pulled|taken|moved)\s+(?:this|it|that)\s+(?:one\s+)?(?:out|off)\b
    )""", re.I | re.X)

# The author explicitly declining to give the instruction.
SELF_DISCLAIMER = re.compile(
    r"""(?:
        (?:not|n'?t)\s+going\s+to\s+(?:tell|give|put|hand|print)
      | \bi\s+wo\s*n'?t\s+(?:tell|give|put|print)
      | \bno\s+(?:milligram|mg)\s+(?:target|targets|numbers?)\b
      | deliberately\s+not | on\s+purpose\b
      | \bnot\s+printing\b | \bwo\s*n'?t\s+be\s+printing\b
      | \bi'?m\s+not\s+going\s+to\b
    )""", re.I | re.X)


# ---------------------------------------------------------------------------
# Text handling
# ---------------------------------------------------------------------------

def strip_html(html, soft=False):
    """Plain text, with block tags turned into sentence boundaries.

    Without the boundary, two unrelated blocks merge and a dose verb in one gets
    glued to a mineral in the next.

    soft=True joins instead of terminating. It is used for a table ROW, where
    "<td>Sodium</td><td>3,000-5,000 mg</td>" is one statement split across
    cells: a hard boundary there puts the mineral and its dose in different
    sentences and the row reads as clean. That is exactly how the dose table in
    the paid printable would have slipped through.
    """
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html or "")
    sep = " · " if soft else " . "
    text = re.sub(r"(?i)</?(p|div|td|th|tr|li|ul|ol|h[1-6]|br|table|blockquote)[^>]*>",
                  sep, text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&mdash;", " ").replace("&ndash;", "-")
                .replace("&nbsp;", " ").replace("&rsquo;", "'")
                .replace("&lsquo;", "'").replace("&ldquo;", '"')
                .replace("&rdquo;", '"').replace("&#x27;", "'")
                .replace("&quot;", '"').replace("&amp;", "&"))
    text = re.sub(r"&#?\w+;", " ", text)
    return re.sub(r"[ \t ]+", " ", text).strip()


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?;])\s+", text) if s.strip()]


CLOCK_LINE = re.compile(r"\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?\s*[:\-–]")
DAY_LINE = re.compile(r"\bday\s+\d+\b", re.I)
# <tr> is scanned as well as its cells: in the paid printable the mineral name
# and its dose lived in SEPARATE <td>s, so neither cell alone carried the
# defect. The row is the semantic unit; findings are deduped afterwards.
STRUCT_TAG = re.compile(r"(?is)<(li|tr|td|th)\b[^>]*>(.*?)</\1>")


def units(raw, is_html=True):
    """Yield (kind, text, line_no) units.

    Followable structures come out whole -- <li>, <td>, <th>, clock-stamped
    lines and Day N lines -- because those are what a reader copies. The rest
    of the document is sentence-split prose. A unit is never dropped for being
    short: that was the bug.
    """
    out = []
    if is_html:
        consumed = []
        for m in STRUCT_TAG.finditer(raw):
            tag = m.group(1).lower()
            text = strip_html(m.group(2), soft=(tag == "tr"))
            if text:
                line = raw.count("\n", 0, m.start()) + 1
                kind = "tr/td" if tag == "tr" else tag
                if CLOCK_LINE.search(text):
                    kind = "schedule/" + kind
                elif DAY_LINE.search(text):
                    kind = "day-line/" + kind
                out.append((kind, text, line))
            consumed.append([m.start(), m.end()])
        # Everything not inside a followable structure, as prose.
        merged = []
        for s, e in sorted(consumed):
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
        rest, prev = [], 0
        for s, e in merged:
            rest.append((prev, raw[prev:s]))
            prev = e
        rest.append((prev, raw[prev:]))
        for offset, chunk in rest:
            base = raw.count("\n", 0, offset) + 1
            for sent in sentences(strip_html(chunk)):
                kind = "prose"
                if CLOCK_LINE.search(sent):
                    kind = "schedule"
                elif DAY_LINE.search(sent):
                    kind = "day-line"
                out.append((kind, sent, base))
    else:
        for i, line in enumerate(raw.splitlines(), 1):
            for sent in sentences(line.strip()):
                kind = "prose"
                if CLOCK_LINE.search(sent):
                    kind = "schedule"
                elif DAY_LINE.search(sent):
                    kind = "day-line"
                out.append((kind, sent, i))
    return out


BLOCK_TAG = re.compile(r"(?is)<(p|blockquote|h[1-6])\b[^>]*>(.*?)</\1>")


def blocks(raw, is_html=True):
    """Paragraph-sized units, for the non-numeric directive family only.

    A symptom and the instruction that mis-routes it are often in adjacent
    sentences ("Signs you need more potassium." / "Heart palpitations."), so the
    directive detectors need a wider unit than the quantity detectors, which
    must stay tight to avoid binding a number to a mineral a clause away. The
    gates (clinician referral, self-disclaimer, redirected-away) widen with it,
    which is what keeps the false-positive rate flat.
    """
    out = []
    if not is_html:
        return [("paragraph", chunk.strip(), i)
                for i, chunk in enumerate(raw.split("\n\n"), 1) if chunk.strip()]
    for m in BLOCK_TAG.finditer(raw):
        text = strip_html(m.group(2))
        if text:
            out.append(("paragraph", text, raw.count("\n", 0, m.start()) + 1))
    return out


FOLLOWABLE = ("li", "tr", "td", "th", "schedule", "day-line")


def is_followable(kind):
    return any(kind.startswith(f) or f in kind for f in FOLLOWABLE)


# ---------------------------------------------------------------------------
# Family 1: does this quantity dose a mineral?
# ---------------------------------------------------------------------------

TOKEN = re.compile(r"[A-Za-z][A-Za-z'’-]*")

# Bounded token windows. Content-derived, small, and documented so nobody
# "improves" them into the wide fixed window that dropped every short line.
RIGHT_TOKENS = 6   # how far right a mineral may sit from its quantity
CLAIM_TOKENS = 2   # how far right a NON-mineral may sit and claim the quantity


def _binds_to_mineral(sentence, span):
    """Bind a quantity to the mineral it doses, or to nothing.

    Right first: the token a quantity sits in front of is the noun it measures.
    "400mg magnesium glycinate" binds; "300mg KSM-66 ashwagandha" binds to a
    non-mineral and is therefore claimed -- it must NOT then reach backwards and
    grab the "Magnesium glycinate" earlier in the same line. That exact line is
    live on a repaired KD page.

    Left only if nothing substantive follows ("Sodium: 3,000 to 5,000 mg per
    day."). Both scans are bounded by the sentence, never by a character count.
    """
    start, end = span
    after = sentence[end:]
    m = MINERAL.match(after.lstrip())
    if m:
        return m.group(0)
    # Right scan: look for the mineral in the next RIGHT_TOKENS words. A
    # quantity is "claimed" by a non-mineral only when that non-mineral sits in
    # the first CLAIM_TOKENS words, i.e. right where the measured noun goes.
    # "300mg KSM-66" is claimed. "500-1,000mg per day for one week" is not, so
    # it may still bind left to the "sodium" it escalates.
    claimed = False
    for i, tm in enumerate(TOKEN.finditer(after)):
        if i >= RIGHT_TOKENS:
            break
        mm = MINERAL.match(after[tm.start():])
        if mm:
            return mm.group(0)
        if tm.group(0).lower() not in FILLER:
            if i < CLAIM_TOKENS:
                claimed = True
            break
    if claimed:
        return None
    # Look left, bounded by the sentence -- never by a character count.
    before = sentence[:start]
    toks = list(TOKEN.finditer(before))
    for tm in reversed(toks):
        word = tm.group(0).lower()
        mm = MINERAL.match(before[tm.start():])
        if mm:
            return mm.group(0)
        if word in FILLER:
            continue
        return None
    return None


def _exemption(unit_text, sentence):
    """Named exemption for an in-class quantity, or None.

    Binding is judged on the sentence; exemption on the whole unit, so a
    culinary or composition frame set up one clause earlier still counts.

    Order matters and was set by the 2026-09-12 repo sweep:

    1. A cap citation wins outright. "Capped at 99 mg" is a ceiling however it
       is framed, and it is live on two CW pages.
    2. Then DAILY_TARGET. The sweep's false-NEGATIVE audit found the culinary
       exemption swallowing real defects whenever the unit also said "salt your
       food": "Sodium: 4 to 6 grams a day. Salt your meat heavily", and a dose
       line on two paid Etsy printables. A daily intake target is in class by
       Sarah's own definition no matter what else is in the paragraph, so it
       beats both food exemptions.
    3. Then the measuring vehicle, which turns a culinary spoon into a dose.
    4. Only then the two food exemptions.
    """
    if EX_CAP_CITATION.search(sentence) or EX_CAP_CITATION.search(unit_text):
        return "cap-citation"
    if DAILY_TARGET.search(sentence):
        return None
    if EX_OVERRIDE_VEHICLE.search(unit_text):
        return None
    if EX_FOOD_COMPOSITION.search(sentence):
        return "food-composition"
    if EX_CULINARY.search(unit_text):
        return "culinary"
    return None


def scan_quantities(kind, unit_text):
    """(severity, family, detail, exemption) for every quantity in a unit."""
    results = []
    for sentence in sentences(unit_text) or [unit_text]:
        seen = []
        for shape, pattern in QUANTITY_PATTERNS:
            for m in pattern.finditer(sentence):
                if any(m.start() < e and s < m.end() for s, e in seen):
                    continue
                seen.append((m.start(), m.end()))
                mineral = _binds_to_mineral(sentence, m.span())
                if not mineral:
                    continue
                ex = _exemption(unit_text, sentence)
                sev = "HIGH" if is_followable(kind) else "MEDIUM"
                results.append((sev, f"quantitative/{shape}",
                                f'"{m.group(0).strip()}" doses "{mineral}"', ex))
    return results


# ---------------------------------------------------------------------------
# Family 3: non-numeric directive language
# ---------------------------------------------------------------------------

def scan_directives(kind, unit_text):
    results = []
    gated = bool(CLINICIAN_REFERRAL.search(unit_text)
                 or SELF_DISCLAIMER.search(unit_text)
                 or REDIRECTED_AWAY.search(unit_text))
    sev = "HIGH" if is_followable(kind) else "MEDIUM"

    sym = SERIOUS_SYMPTOM.search(unit_text)
    if sym and MINERAL.search(unit_text) and DIRECTIVE_TO_SUPPLEMENT.search(unit_text):
        results.append((sev, "directive/symptom-routing",
                        f'routes "{sym.group(0)}" to self-supplementation',
                        "clinician-referral" if gated else None))

    ab = ABSOLUTE_IMPERATIVE.search(unit_text)
    if ab and MINERAL.search(unit_text) and not EX_NOT_DOSING.search(unit_text):
        results.append((sev, "directive/absolute",
                        f'"{ab.group(0)}" applied to an electrolyte instruction',
                        "clinician-referral" if gated else None))
    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class Finding:
    __slots__ = ("path", "line", "kind", "severity", "family", "detail",
                 "snippet", "exemption")

    def __init__(self, path, line, kind, severity, family, detail, snippet,
                 exemption):
        self.path, self.line, self.kind = path, line, kind
        self.severity, self.family, self.detail = severity, family, detail
        self.snippet, self.exemption = snippet, exemption

    def as_dict(self):
        return {k: getattr(self, k) for k in self.__slots__}

    def render(self):
        head = (f"  [{self.severity}] {self.path}:{self.line} ({self.kind}) "
                f"{self.family}")
        return f"{head}\n        {self.detail}\n        {self.snippet}"


def _snip(text, limit=220):
    text = re.sub(r"\s+", " ", text).strip()
    return text if len(text) <= limit else text[:limit - 3] + "..."


def check_text(raw, path="copy", is_html=True):
    """All findings for one document. Exempted ones are included, flagged."""
    found, seen = [], set()
    work = [(k, t, l, True) for k, t, l in units(raw, is_html=is_html)]
    work += [(k, t, l, False) for k, t, l in blocks(raw, is_html=is_html)]
    for kind, text, line, quant in work:
        rules = scan_directives(kind, text)
        if quant:
            rules = scan_quantities(kind, text) + rules
        for sev, fam, detail, ex in rules:
            # A <tr> and one of its <td>s can report the same defect. Keep the
            # first, which is the row, because the row is what a reader copies.
            key = (line, fam, detail)
            if key in seen:
                continue
            seen.add(key)
            found.append(Finding(path, line, kind, sev, fam, detail,
                                 _snip(text), ex))
    return found


def check_json(blob, path="data.json"):
    """Walk every string in a JSON document (data/blog_posts.json and kin)."""
    found = []

    def walk(node, trail):
        if isinstance(node, str):
            if len(node) < 12:
                return
            for f in check_text(node, path=f"{path}:{trail}", is_html=True):
                f.line = 0
                found.append(f)
        elif isinstance(node, dict):
            for k, v in node.items():
                walk(v, f"{trail}.{k}" if trail else k)
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{trail}[{i}]")

    walk(blob, "")
    return found


def check_file(path):
    with open(path, encoding="utf-8", errors="ignore") as fh:
        raw = fh.read()
    if path.endswith(".json"):
        try:
            return check_json(json.loads(raw), path)
        except ValueError:
            pass
    return check_text(raw, path=path, is_html=("<" in raw))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _cli(argv=None):
    ap = argparse.ArgumentParser(
        description="R6 ungated electrolyte / mineral dosing guard")
    ap.add_argument("--files", nargs="*", default=[])
    ap.add_argument("--stdin", action="store_true")
    ap.add_argument("--mode", choices=("check", "report"), default="check",
                    help="check exits 2 on findings; report always exits 0")
    ap.add_argument("--show-exempt", action="store_true",
                    help="also print what was exempted and by which rule")
    ap.add_argument("--json", action="store_true", dest="as_json")
    ap.add_argument("--quiet", action="store_true",
                    help="skip the per-file ok lines; findings always print")
    args = ap.parse_args(argv)

    if not args.files and not args.stdin:
        ap.error("nothing to scan: pass --files or --stdin")

    findings, exempted, scanned, unreadable = [], [], 0, []

    def take(fs):
        for f in fs:
            (exempted if f.exemption else findings).append(f)

    if args.stdin:
        take(check_text(sys.stdin.read(), path="<stdin>"))
        scanned += 1
    for path in args.files:
        try:
            take(check_file(path))
            scanned += 1
        except OSError as e:
            unreadable.append(f"{path}: {e}")

    if args.as_json:
        print(json.dumps({
            "scanned": scanned,
            "findings": [f.as_dict() for f in findings],
            "exempted": [f.as_dict() for f in exempted],
            "unreadable": unreadable,
        }, indent=2))
        return 0 if (args.mode == "report" or not findings) else 2

    # Never truncate. Every finding prints, grouped by file, in file order.
    by_file = {}
    for f in findings:
        by_file.setdefault(f.path, []).append(f)
    for path in sorted(by_file):
        print(f"[FINDING] {path}")
        for f in sorted(by_file[path], key=lambda x: (x.line, x.family)):
            print(f.render())
    if not args.quiet:
        clean = [p for p in args.files if p not in by_file]
        for p in sorted(clean):
            print(f"[ok  ] {p}")
    if args.show_exempt:
        print(f"\n--- exempted ({len(exempted)}) ---")
        for f in exempted:
            print(f"  [exempt:{f.exemption}] {f.path}:{f.line} ({f.kind}) "
                  f"{f.family}\n        {f.detail}\n        {f.snippet}")
    for u in unreadable:
        print(f"  skip {u}")

    high = sum(1 for f in findings if f.severity == "HIGH")
    print(f"\n{len(findings)} finding(s) ({high} in followable structures) "
          f"across {len(by_file)} of {scanned} file(s); "
          f"{len(exempted)} exempted. mode={args.mode}")
    if args.mode == "report":
        return 0
    return 2 if findings else 0


if __name__ == "__main__":
    sys.exit(_cli())

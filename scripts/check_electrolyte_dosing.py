#!/usr/bin/env python3
"""Regression guard for the electrolyte dosing defect class (bead drp9, 2026-09-14).

Between 2026-09-07 and 2026-09-14 the same defect kept reappearing in new places:
a quantitative electrolyte protocol addressed to every reader, with nothing
deciding whether it is safe to print a number for THIS reader. It was found in
the CW drip, the KD drip, a KetoDial blog page, four CW blog pages, seventeen
more, and finally three fasting pages. Each discovery was made by hand, and twice
the hand-rolled scan undercounted.

This exists so the next one is found by a script instead.

WHAT IT FLAGS
  Potassium or magnesium with a milligram figure, phrased as an instruction.
  Sodium with a milligram or gram figure inside a FASTING context, because that
  is a dose taken with no food rather than seasoning.
  A daily sodium or salt target on CW/KD ("3-5 g of sodium a day", "3,000-5,000 mg
  per day", "up to 6 g on training days", "1-2 teaspoons of salt a day", "2-3 g per
  meal minimum"). Brew, deck 9abbfdc5, 2026-10-14: a daily sodium gram target is a
  dose, because a fixed number can hurt a reader on a salt limit. The house line is
  salt to taste, plus check with your doctor first if you have high blood pressure
  or are on a salt limit. PD is exempt: its standing sodium line is the standard
  "under 2,300 mg a day" ceiling, which is a limit, not a target.

WHAT IT DELIBERATELY DOES NOT FLAG, because these are correct and useful:
  Food facts          "beef has 300-400 mg potassium per 4 oz"
  Product labels      "LMNT (per packet): 1,000 mg sodium"
  Overdose warnings   "a teaspoon of potassium chloride is roughly 2,500 mg"
  Salt to taste       "salt your food to taste", outside a fast
  Conversions         "one teaspoon of salt is about 2.3 g of sodium" (no daily target)
  Limits              "your doctor's limit of under 2,000 mg a day"
  Refusals            "we do not publish a potassium dose"

Scans data/blog_posts.json, every public/blog/*.html (including the ~30 pages
that exist on disk outside the JSON), KetoDial's legacy pages in
ketodial/public/blog/ when the submodule is checked out, and data/drip-emails/.

Exit 0 clean, 1 if anything is flagged.
Run: python3 scripts/check_electrolyte_dosing.py [--verbose] [--site cw|kd|pd]

WIRED IN (2026-10-13, after three new posts reintroduced magnesium doses because
this guard ran only by hand): Gate 11 of validate_before_commit.py (pre-push hook
and the CW daily publish), daily_publish.py --site kd (which skips that
validator), and the weekly CW / Saturday KD generation task prompts.
"""

import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NUM = re.compile(r'[\d,][\d,\-–\. ]{0,8}\s*(?:mg|g)\b(?![a-z])', re.I)
# Protein and fat are measured in grams too. A gram figure sitting next to a macro
# word is a macro target, not an electrolyte dose.
MACRO = re.compile(r'protein|\bfat\b|carb|fibre|fiber|collagen', re.I)
KMG = re.compile(r'potassium|magnesium', re.I)
NA = re.compile(r'sodium|\bsalt\b', re.I)
FASTING = re.compile(r'\bfast(?:ing|ed)?\b|\bOMAD\b|extended fast|water fast', re.I)

# Phrased as an instruction to the reader.
RX = re.compile(r'\b(take|taking|add|adding|supplement(?:ing)?|aim for|target|'
                r'start with|increase|consume|intake of|per day|a day|daily|'
                r'throughout|every \d)\b', re.I)

# Descriptive, a label, or a hazard illustration. These clear a hit wherever they
# appear, because they describe a number rather than telling the reader to take it.
DESCRIPTIVE = re.compile(r'\b(contains?|provides?|per 4 ?oz|per serving|per 100 ?g|per lb|'
                         r'per pound|per packet|per scoop|per tablet|holds?|delivers?|'
                         r'worth of|naturally|accidental|overdose|hyperkalemia|'
                         r'capped at|wrong tool|invites you|serving size|not a target|'
                         r'industry (settled|picked|chose))\b', re.I)

# A refusal or a caution. These clear a hit ONLY when they appear BEFORE the figure.
# A caveat placed after a number is not a gate, and treating it as one is the exact
# half-fix that kept this defect alive through three separate passes. A refusal about
# one mineral must also not clear a different mineral's dose sitting next to it, which
# is why this is checked against the text leading up to the figure only.
REFUSAL = re.compile(r'\b(do not publish|don.t publish|we do not|used to (carry|list|print)|'
                     r'ask your (doctor|pharmacist)|cleared by your kidneys|'
                     r'no way to pick|instead of)\b', re.I)


# Daily sodium target (deck 9abbfdc5, 2026-10-14). Grams, milligrams and teaspoons,
# because "1-2 teaspoons of salt a day" is the same target in kitchen units.
NA_QTY = re.compile(r'(?:\d[\d,\.]*|one|two|three|four|five|six|half an?|a half)'
                    r'(?:\s*(?:-|–|to|or)\s*(?:\d[\d,\.]*|one|two|three|four|five|six))?'
                    r'\s*(?:mg|g|grams?|milligrams?|tsp|teaspoons?)\b', re.I)
NA_WORD = re.compile(r'sodium|\bsalt', re.I)
# The figure is a per-day (or per-meal) amount the reader is meant to hit.
NA_DAILY = re.compile(r'\b(?:per day|a day|each day|every day|daily|a-day|/day|per meal|'
                      r'each meal|baseline|on (?:heavy |hard )?(?:training |workout )?days)\b'
                      r'|/day', re.I)
# A ceiling, not a target ("under 2,300 mg a day", "your doctor's limit").
NA_LIMIT = re.compile(r'\b(?:under|less than|no more than|below|limit(?:ed)? (?:of|to)|'
                      r'cap(?:ped)? at|restrict(?:ed)? to)\s+(?:about |roughly |around )?$', re.I)
NA_REFUSAL = re.compile(r'\b(?:do not publish|don.t publish|we do not (?:give|publish|set)|'
                        r'used to (?:carry|list|print|say)|no (?:daily )?(?:sodium )?(?:number|target))\b', re.I)
OTHER_NUTRIENT = re.compile(r'protein|\bfat\b|carb|fibre|fiber|collagen|potassium|magnesium|'
                            r'calorie|\bcal\b', re.I)
SENTENCE_END = re.compile(r'(?<=[.!?])\s+(?=[A-Z0-9"\'(])')


def sentence_at(text, start, end):
    """The sentence holding text[start:end], capped at 300 characters each side."""
    lo = max(0, start - 300)
    hi = min(len(text), end + 300)
    left = text[lo:start + 1]  # one char past, so a boundary right before start is seen
    cuts = [m.end() for m in SENTENCE_END.finditer(left) if m.end() <= start - lo]
    s0 = lo + (cuts[-1] if cuts else 0)
    m = SENTENCE_END.search(text, end, hi)
    s1 = m.start() if m else hi
    return text[s0:s1]


def scan_daily_sodium(text):
    """Daily sodium or salt targets addressed to the reader. CW and KD only."""
    out = []
    for m in NA_QTY.finditer(text):
        sent = sentence_at(text, m.start(), m.end())
        # Salt is often named in the sentence before the amount ("Add extra salt to
        # everything. I mean 2 teaspoons a day."), so look back 160 characters too.
        named = NA_WORD.search(sent) or NA_WORD.search(text[max(0, m.start() - 160):m.start()])
        if not named or not NA_DAILY.search(sent):
            continue
        # "40 g protein" beside a salted burger, "400 mg potassium" on a label that
        # also lists sodium, "30 to 40 grams per meal" after "Protein first": the
        # nearest nutrient word decides what the figure measures. First word after
        # the figure wins; failing that, the last one before it.
        after = text[m.end():m.end() + 15]
        nxt = OTHER_NUTRIENT.search(after)
        na_next = NA_WORD.search(after)
        if nxt and (not na_next or nxt.start() < na_next.start()):
            continue
        if not na_next:
            before = text[max(0, m.start() - 60):m.start()]
            last_other = max((x.end() for x in OTHER_NUTRIENT.finditer(before)), default=-1)
            last_na = max((x.end() for x in NA_WORD.finditer(before)), default=-1)
            if last_other > last_na:
                continue
        # Product labels and food facts ("LMNT (per packet): 1,000 mg sodium").
        if DESCRIPTIVE.search(text[max(0, m.start() - 80):m.end() + 40]):
            continue
        if NA_LIMIT.search(text[max(0, m.start() - 40):m.start()]):
            continue
        # Only a real refusal clears it. "Ask your doctor first if you have high blood
        # pressure" in front of a target still leaves the target for everyone else.
        if NA_REFUSAL.search(text[max(0, m.start() - 220):m.start()]):
            continue
        out.append(("daily-Na", m.group(0).strip(), sent.strip()))
    return out


def strip(raw):
    raw = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', raw, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw)))


def scan(name, text, site="cw"):
    """Return a list of (mineral, figure, context) that look like universal dosing."""
    out = scan_daily_sodium(text) if site in ("cw", "kd") else []
    fasting_page = len(FASTING.findall(text)) >= 6
    for m in NUM.finditer(text):
        near = text[max(0, m.start() - 70):m.end() + 70]
        window = text[max(0, m.start() - 160):m.end() + 160]
        if MACRO.search(near) and m.group(0).rstrip().endswith("g"):
            continue
        if KMG.search(near):
            mineral = "K/Mg"
        elif NA.search(near) and fasting_page and FASTING.search(window):
            mineral = "fasting-Na"
        else:
            continue
        pre = text[max(0, m.start() - 220):m.start()]
        if DESCRIPTIVE.search(window) or REFUSAL.search(pre) or not RX.search(window):
            continue
        out.append((mineral, m.group(0).strip(), window.strip()))
    return out


# Pages that carry a daily sodium target but sit inside an open measurement window,
# so they cannot be edited yet (deck 9abbfdc5 exclusions, 2026-10-14). Until the
# date they print as HELD and do not fail the gate; from that date they fail like
# any other page. Never extend a date to make a run go green: fix the page.
DAILY_NA_HELD = {
    "2026-04-14-the-carnivore-mistake-i-wish-someone-warned-me": (
        "2026-11-14", "control page in the writer-rewrites cohort, read 2026-11-13"),
}


def held(where, mineral, today=None):
    """True if this daily-Na hit is on a frozen page whose window is still open."""
    import datetime
    if mineral != "daily-Na":
        return False
    today = today or datetime.date.today().isoformat()
    for slug, (until, _why) in DAILY_NA_HELD.items():
        if slug in where and today < until:
            return True
    return False


def find_flags(root=ROOT, site=None, include_held=False):
    """Return (scanned, flagged) for the whole corpus, or one site's share of it.

    site=None scans everything. site="kd" (or "pd") scans that site's JSON posts and
    its drip folder only, so a CW defect cannot block a KD publish and vice versa.
    flagged is a list of (where, mineral, figure, context).
    """
    flagged = []
    scanned = 0

    posts = json.load(open(os.path.join(root, "data/blog_posts.json")))["blog_posts"]
    json_slugs = {p["slug"] for p in posts}
    for p in posts:
        if site and p.get("site", "cw") != site:
            continue
        scanned += 1
        for hit in scan(p["slug"], strip(p["content"]), p.get("site", "cw")):
            flagged.append((f"blog_posts.json:{p['slug']}",) + hit)

    if site in (None, "cw"):
        for f in sorted(glob.glob(os.path.join(root, "public/blog/*.html"))):
            slug = os.path.basename(f)[:-5]
            if slug in json_slugs or slug == "index":
                continue  # rendered from the JSON, already covered above
            scanned += 1
            for hit in scan(slug, strip(open(f, encoding="utf-8").read())):
                flagged.append((f"public/blog/{slug}.html (outside blog_posts.json)",) + hit)

    # KetoDial's legacy hand-authored pages live only as HTML in the ketodial/public
    # submodule. Skipped quietly when the submodule is not checked out (CI jobs that
    # do not need it); JSON-pipeline KD pages are covered above, and their filenames
    # drop the YYYY-MM-DD- prefix (ISSUE-085).
    if site in (None, "kd"):
        kd_json = {re.sub(r"^\d{4}-\d{2}-\d{2}-", "", s) for s in json_slugs}
        for f in sorted(glob.glob(os.path.join(root, "ketodial/public/blog/*.html"))):
            slug = os.path.basename(f)[:-5]
            if slug in kd_json or slug == "index":
                continue
            scanned += 1
            for hit in scan(slug, strip(open(f, encoding="utf-8").read()), "kd"):
                flagged.append((f"ketodial/public/blog/{slug}.html (outside blog_posts.json)",) + hit)

    drip = os.path.join(root, "data/drip-emails")
    for f in sorted(glob.glob(os.path.join(drip, "**/*.html"), recursive=True)):
        rel = os.path.relpath(f, root)
        # CW drips sit at the top of data/drip-emails/, other sites in a subfolder.
        parts = os.path.relpath(f, drip).split(os.sep)
        owner = parts[0] if len(parts) > 1 else "cw"
        if site and owner != site:
            continue
        scanned += 1
        for hit in scan(rel, strip(open(f, encoding="utf-8").read()), owner):
            flagged.append((rel,) + hit)

    if not include_held:
        flagged = [f for f in flagged if not held(f[0], f[1])]
    return scanned, flagged


def main():
    verbose = "--verbose" in sys.argv
    site = sys.argv[sys.argv.index("--site") + 1] if "--site" in sys.argv else None
    scanned, flagged = find_flags(site=site)
    _, everything = find_flags(site=site, include_held=True)
    on_hold = [f for f in everything if f not in flagged]

    print(f"Scanned {scanned} documents.")
    for where, mineral, fig, _ctx in on_hold:
        slug = next(s for s in DAILY_NA_HELD if s in where)
        until, why = DAILY_NA_HELD[slug]
        print(f"HELD (frozen until {until}, {why}): [{mineral}] {where}: {fig}")
    if not flagged:
        print("PASS: no universal potassium, magnesium, fasting-sodium or daily-sodium dosing found.")
        return 0

    print(f"\nFAIL: {len(flagged)} possible universal dosing instruction(s).\n")
    for where, mineral, fig, ctx in flagged:
        print(f"  [{mineral}] {where}")
        print(f"      figure: {fig}")
        if verbose:
            print(f"      context: ...{ctx}...")
        print()
    print("Suppress, never substitute. Do not swap the figure for a smaller one, and")
    print("do not add a caveat after it. See docs/project-log/decisions.md, 2026-09-14.")
    print("Sodium (2026-10-14): salt to taste, plus 'if you have high blood pressure or")
    print("a salt limit, check with your doctor first'. No daily gram, mg or tsp target.")
    return 1


if __name__ == "__main__":
    sys.exit(main())

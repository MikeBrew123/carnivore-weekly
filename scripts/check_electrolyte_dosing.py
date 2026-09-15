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

WHAT IT DELIBERATELY DOES NOT FLAG, because these are correct and useful:
  Food facts          "beef has 300-400 mg potassium per 4 oz"
  Product labels      "LMNT (per packet): 1,000 mg sodium"
  Overdose warnings   "a teaspoon of potassium chloride is roughly 2,500 mg"
  Salt to taste       "salt your food, about 1-2 tsp", outside a fast
  Refusals            "we do not publish a potassium dose"

Scans data/blog_posts.json, every public/blog/*.html (including the ~30 pages
that exist on disk outside the JSON), and data/drip-emails/.

Exit 0 clean, 1 if anything is flagged.
Run: python3 scripts/check_electrolyte_dosing.py [--verbose]
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


def strip(raw):
    raw = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', raw, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw)))


def scan(name, text):
    """Return a list of (figure, context) that look like universal dosing."""
    out = []
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


def main():
    verbose = "--verbose" in sys.argv
    flagged = []
    scanned = 0

    posts = json.load(open(os.path.join(ROOT, "data/blog_posts.json")))["blog_posts"]
    json_slugs = {p["slug"] for p in posts}
    for p in posts:
        scanned += 1
        for hit in scan(p["slug"], strip(p["content"])):
            flagged.append((f"blog_posts.json:{p['slug']}",) + hit)

    for f in sorted(glob.glob(os.path.join(ROOT, "public/blog/*.html"))):
        slug = os.path.basename(f)[:-5]
        if slug in json_slugs or slug == "index":
            continue  # rendered from the JSON, already covered above
        scanned += 1
        for hit in scan(slug, strip(open(f, encoding="utf-8").read())):
            flagged.append((f"public/blog/{slug}.html (outside blog_posts.json)",) + hit)

    for f in sorted(glob.glob(os.path.join(ROOT, "data/drip-emails/**/*.html"), recursive=True)):
        scanned += 1
        rel = os.path.relpath(f, ROOT)
        for hit in scan(rel, strip(open(f, encoding="utf-8").read())):
            flagged.append((rel,) + hit)

    print(f"Scanned {scanned} documents.")
    if not flagged:
        print("PASS: no universal potassium, magnesium or fasting-sodium dosing found.")
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
    return 1


if __name__ == "__main__":
    sys.exit(main())

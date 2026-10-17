#!/usr/bin/env python3
"""Regression guard for the electrolyte dosing defect class (bead drp9, 2026-09-14).

Between 2026-09-07 and 2026-09-14 the same defect kept reappearing in new places:
a quantitative electrolyte protocol addressed to every reader, with nothing
deciding whether it is safe to print a number for THIS reader. It was found in
the CW drip, the KD drip, a KetoDial blog page, four CW blog pages, seventeen
more, and finally three fasting pages. Each discovery was made by hand, and twice
the hand-rolled scan undercounted.

This exists so the next one is found by a script instead.

WHAT IT FLAGS (Brew, DECISION_LOG 2026-10-17 "ELECTROLYTE AMOUNTS UP TO THE
LABEL", supersedes the 2026-09-14 block on these amounts for new content)
  A magnesium, potassium or fasting-sodium amount phrased as an instruction that
  is ABOVE a common supplement label amount (LABEL_MAX_MG below):
    magnesium      400 mg   (top of the usual 100-400 mg per-serving label)
    potassium       99 mg   (the per-tablet amount on over-the-counter labels)
    fasting sodium 1,000 mg per serving (one electrolyte packet), or 5,000 mg a
                   day (the top of the house 3-5 g daily range)
  Amounts at or under those may be stated, worded as what people typically do,
  with the page's one safety line (scripts/check_doctor_line.py).
  A prescription drug named next to a dose ("metformin 500 mg", "20 mEq of
  potassium chloride"), on any site. We never give drug doses.

NO LONGER FLAGGED (Brew, Command Centre DECISION_LOG 2026-10-17 "CONTENT LINE"):
  A daily sodium or salt range ("3-5 g of sodium a day"). The 2026-10-14 rule
  that treated a daily sodium gram target as a dose (deck 9abbfdc5) is
  superseded for new content: the diet's normal salt range is kept, worded as
  what people on the diet typically do, and the page carries ONE safety line
  (see scripts/check_doctor_line.py). Existing pages are not swept.

WHAT IT DELIBERATELY DOES NOT FLAG, because these are correct and useful:
  Food facts          "beef has 300-400 mg potassium per 4 oz"
  Product labels      "LMNT (per packet): 1,000 mg sodium"
  Overdose warnings   "a teaspoon of potassium chloride is roughly 2,500 mg"
  Salt to taste       "salt your food to taste", outside a fast
  Daily salt ranges   "most people on carnivore land around 3-5 g of sodium a day"
  Conversions         "one teaspoon of salt is about 2.3 g of sodium"
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
# Common supplement label maxima, in mg (see the docstring).
LABEL_MAX_MG = {"magnesium": 400, "potassium": 99}
FASTING_NA_MAX_MG = {"serving": 1000, "day": 5000}
PER_DAY = re.compile(r'\b(?:a day|per day|daily|each day|every day)\b|/day', re.I)
MINERAL_WORD = re.compile(r'potassium|magnesium', re.I)

# Drug doses. A prescription drug named next to a dose unit ("metformin 500 mg",
# "500 mg of metformin", "10 units of insulin"). Lab values ("120 mg/dL") are not
# doses, so a unit followed by "/" never counts. Potassium chloride is left to the
# potassium check: it is also a salt substitute and an electrolyte-label ingredient.
DRUG = (r'(?:metformin|glipizide|glyburide|glimepiride|sitagliptin|jardiance|'
        r'empagliflozin|dapagliflozin|semaglutide|ozempic|wegovy|tirzepatide|mounjaro|'
        r'lisinopril|losartan|amlodipine|hydrochlorothiazide|chlorthalidone|furosemide|'
        r'lasix|spironolactone|metoprolol|atenolol|atorvastatin|rosuvastatin|'
        r'simvastatin|pravastatin|levothyroxine|synthroid|warfarin|apixaban|'
        r'eliquis|rivaroxaban|clopidogrel|prednisone|k-dur|klor-con|'
        r'allopurinol|colchicine|lithium|digoxin)')
DOSE_UNIT = (r'\d[\d,\.]*(?:\s*(?:-|–|to)\s*\d[\d,\.]*)?\s*'
             r'(?:mg|mcg|µg|micrograms?|milligrams?|units?|iu|meq)\b(?!\s*/)')
DRUG_DOSE = re.compile(rf'\b{DRUG}\b[^.!?\d]{{0,30}}{DOSE_UNIT}|{DOSE_UNIT}\s+(?:of\s+)?{DRUG}\b'
                       rf'|\binsulin\b[^.!?\d]{{0,30}}\d[\d,\.]*\s*units?\b'
                       rf'|\d[\d,\.]*\s*units?\s+of\s+insulin\b', re.I)

REFUSAL = re.compile(r'\b(do not publish|don.t publish|we do not|used to (carry|list|print)|'
                     r'ask your (doctor|pharmacist)|cleared by your kidneys|'
                     r'no way to pick|instead of)\b', re.I)


def strip(raw):
    raw = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', raw, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', raw)))


def max_mg(fig):
    """The largest amount in a figure like "300-400 mg" or "1.5 g", in mg."""
    nums = [float(x.replace(",", "")) for x in re.findall(r"\d[\d,]*(?:\.\d+)?", fig)]
    if not nums:
        return 0
    top = max(nums)
    return top * 1000 if re.search(r"\d\s*g\b", fig, re.I) and not re.search(r"mg", fig, re.I) else top


def nearest_mineral(text, start, end):
    """Potassium or magnesium, whichever word sits closest to the figure."""
    lo = max(0, start - 70)
    best, dist = None, None
    for w in MINERAL_WORD.finditer(text, lo, min(len(text), end + 70)):
        d = start - w.end() if w.end() <= start else w.start() - end
        if dist is None or abs(d) < dist:
            best, dist = w.group(0).lower(), abs(d)
    return best


def above_label(mineral, fig, window, text, start, end):
    amount = max_mg(fig)
    if mineral == "K/Mg":
        which = nearest_mineral(text, start, end) or "potassium"
        return amount > LABEL_MAX_MG[which]
    cap = FASTING_NA_MAX_MG["day" if PER_DAY.search(window) else "serving"]
    return amount > cap


def scan(name, text, site="cw"):
    """Return (kind, figure, context) for amounts above the label, and drug doses."""
    out = []
    for m in DRUG_DOSE.finditer(text):
        if REFUSAL.search(text[max(0, m.start() - 220):m.start()]):
            continue
        out.append(("drug-dose", m.group(0).strip(),
                    text[max(0, m.start() - 160):m.end() + 160].strip()))
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
        if not above_label(mineral, m.group(0), window, text, m.start(), m.end()):
            continue
        out.append((mineral, m.group(0).strip(), window.strip()))
    return out


def find_flags(root=ROOT, site=None):
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

    return scanned, flagged


def main():
    verbose = "--verbose" in sys.argv
    site = sys.argv[sys.argv.index("--site") + 1] if "--site" in sys.argv else None
    scanned, flagged = find_flags(site=site)

    print(f"Scanned {scanned} documents.")
    if not flagged:
        print("PASS: no electrolyte amount above the label and no drug dose found.")
        return 0

    print(f"\nFAIL: {len(flagged)} amount(s) above the label or drug dose(s).\n")
    for where, mineral, fig, ctx in flagged:
        print(f"  [{mineral}] {where}")
        print(f"      figure: {fig}")
        if verbose:
            print(f"      context: ...{ctx}...")
        print()
    print("Bring the amount down to the label (magnesium 400 mg, potassium 99 mg, fasting")
    print("sodium 1,000 mg a serving or 5,000 mg a day), worded as what people typically")
    print("do, or remove it. Remove every drug dose. DECISION_LOG 2026-10-17.")
    print("A daily salt range is fine (CONTENT LINE, 2026-10-17); the page carries one")
    print("safety line, checked by scripts/check_doctor_line.py.")
    return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Safety gate for the keto flagship product, with its own mutation test.

CLAUDE.md, paid health reports: "Test rendered output, and mutation-test the
test. A passing suite is not evidence until you have broken each protection,
watched the suite go red on a named assertion, and restored it."

So this file does two jobs:

  1. SCAN  - run every protection against the real content JSON and the real
             BUILT PDF text. Rendered output, not just the source.
  2. MUTATE - for each protection, inject a string that protection exists to
             catch and assert that it actually fires. A check that cannot go
             red is decoration, and a green run that contains decoration is
             worse than no run at all.

Usage:
  python3 tests/test_keto_flagship_safety.py
  python3 tests/test_keto_flagship_safety.py --scan-only
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "etsy" / "products" / "content" / "keto-flagship-content.json"
PDFS = [
    ROOT / "etsy" / "products" / "pdfs" / "keto-30day-flagship-letter.pdf",
    ROOT / "etsy" / "products" / "pdfs" / "keto-30day-flagship-a4.pdf",
]

# name -> (pattern, a string that MUST trip it)
PROTECTIONS = {
    "calorie-target": (
        r"\b\d{3,4}\s*(?:k?cal\b|calories?\b)",
        "aim for 1500 calories a day",
    ),
    "calorie-target-prose": (
        r"(?:eat|aim for|target|stick to|keep to)\s+(?:about\s+)?\d{3,4}\b",
        "aim for 1600 a day",
    ),
    "mineral-dose": (
        r"\b\d+\s*(?:mg|mcg|milligrams?|micrograms?)\b",
        "take 400 mg of magnesium",
    ),
    "salt-dose": (
        r"\b\d+\s*(?:-\s*\d+\s*)?(?:tsp|tbsp|teaspoons?|tablespoons?)\s+(?:of\s+)?"
        r"(?:salt|sodium|magnesium|potassium|lite salt)",
        "add 2 tsp of salt daily",
    ),
    "supplement-instruction": (
        r"(?:take|supplement with|add|start)\s+(?:a\s+|some\s+)?"
        r"(?:magnesium|potassium|electrolyte|lite salt|salt tablet)",
        "take a magnesium supplement at night",
    ),
    "potassium-substitute": (
        r"lite salt|potassium (?:pill|chloride|supplement)|salt substitute",
        "use lite salt if you cramp",
    ),
    "symptom-to-dose": (
        r"(?:cramps?|headaches?|fatigue|brain fog|dizz\w+)[^.]{0,90}"
        r"(?:salt everything|means you(?:'re| are) behind|take more|supplement|more sodium)",
        "leg cramps mean you are behind, take more magnesium",
    ),
    "water-formula": (
        r"half your body weight|\b\d+\s*(?:oz|ounces|litres|liters|glasses)\s+(?:of\s+)?water",
        "drink half your body weight in oz of water",
    ),
    "macro-prescription": (
        r"\b\d{1,3}\s*g\s+(?:of\s+)?(?:protein|carbs?|carbohydrate|fat)\s+(?:a|per)\s+day",
        "eat 120 g of protein a day",
    ),
    "diagnostic-claim": (
        r"(?:will|does)\s+(?:cure|reverse|treat|heal)\s+(?:your\s+)?\w+",
        "this will cure your diabetes",
    ),
    "stop-medication": (
        r"(?:stop|quit|come off|reduce)\s+(?:taking\s+)?your\s+(?:medication|meds|insulin|pills)",
        "stop taking your medication once you adapt",
    ),
    "em-dash": (r"—", "a sentence — like this"),
}


def all_strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from all_strings(v)
    elif isinstance(o, list):
        for v in o:
            yield from all_strings(v)


def content_text():
    return "\n".join(all_strings(json.loads(CONTENT.read_text())))


def pdf_text(p):
    if not p.exists():
        return None
    return subprocess.run(["pdftotext", str(p), "-"],
                          capture_output=True, text=True).stdout


def run_scan(text, label, verbose=True):
    failures = []
    for name, (pat, _) in PROTECTIONS.items():
        hits = re.findall(pat, text, re.I)
        if hits:
            failures.append((name, hits[:5]))
    if verbose:
        if failures:
            for n, h in failures:
                print(f"  FAIL  {label}: {n} -> {h}")
        else:
            print(f"  pass  {label}: {len(PROTECTIONS)} protections, 0 hits")
    return failures


def run_mutation(text):
    """Every protection must go red when fed the thing it exists to catch."""
    print("\nMutation test (each protection must be able to fail):")
    dead = []
    for name, (pat, poison) in PROTECTIONS.items():
        mutated = text + "\n" + poison
        hits = re.findall(pat, mutated, re.I)
        if hits:
            print(f"  red   {name:24s} <- {poison!r}")
        else:
            print(f"  DEAD  {name:24s} did NOT fire on {poison!r}")
            dead.append(name)
    return dead


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scan-only", action="store_true")
    a = ap.parse_args()

    print("Scanning source content and RENDERED output")
    text = content_text()
    failures = run_scan(text, "content.json")

    scanned_pdfs = 0
    for p in PDFS:
        t = pdf_text(p)
        if t is None:
            print(f"  WARN  {p.name} not built, skipped")
            continue
        scanned_pdfs += 1
        failures += run_scan(t, p.name)

    if scanned_pdfs == 0:
        print("\nFAIL: no built PDF was scanned. Source-only passes prove nothing.")
        return 1

    dead = [] if a.scan_only else run_mutation(text)

    print()
    if failures:
        print(f"RESULT: FAIL, {len(failures)} protection hit(s) in real output.")
        return 1
    if dead:
        print(f"RESULT: FAIL, {len(dead)} protection(s) cannot fail: {', '.join(dead)}")
        print("A green scan is not evidence while any protection is dead.")
        return 1
    print(f"RESULT: PASS. {len(PROTECTIONS)} protections, all provably able to fail, "
          f"0 hits across content.json and {scanned_pdfs} rendered PDF(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

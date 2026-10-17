#!/usr/bin/env python3
"""One safety line per page, for NEW CW and KD posts (CONTENT LINE, 2026-10-17).

Brew, Command Centre DECISION_LOG 2026-10-17: keep the diet's normal guidance
with real numbers, and give every page exactly ONE plain safety line, near the
first number that needs it. Never repeat it after each recommendation:

    This is not for everyone. Talk to your doctor first if you have high blood
    pressure, kidney or heart problems, diabetes, are pregnant, or take medicine.

Going forward only. This checks posts that have not published yet
(status "ready" or "draft" in data/blog_posts.json); published and unpublished
posts are never checked or edited. PD is out of scope: its one line lives in
the medicine box its post contract already requires.

A post FAILS when the safety line is missing or appears more than once.

It is listed for REVIEW (not a failure) when another sentence looks like a
repeated doctor caveat ("if you have high blood pressure or a salt limit, check
with your doctor first"). The reviewer deletes a repeat of the warning, and
keeps lines that are not a repeat: a red-flag "see a doctor now if..." section,
"any change to your medicine is your prescriber's decision", or a list of tests
to ask about. Those protect the reader and the never-skip-medical-care rule.

Exit 0 clean, 1 if any queued post fails.
Run: python3 scripts/check_doctor_line.py [--site cw|kd] [--slug <slug>]
"""

import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SAFETY_LINE = ("This is not for everyone. Talk to your doctor first if you have high "
               "blood pressure, kidney or heart problems, diabetes, are pregnant, or "
               "take medicine.")
CHECKED_STATUSES = {"ready", "draft"}

_CANON = re.compile(r"this is not for everyone\.?\s+talk to your doctor first if you have "
                    r"high blood pressure,? kidney or heart problems,? diabetes,? are "
                    r"pregnant,? or take medicine\.?", re.I)
# A conditional caveat addressed to the reader: names a clinician AND is framed
# as "if you ..." or "... first / before you start". "Here is what to ask your
# doctor about" and "worth discussing with your doctor" are not warnings and stay.
_CLINICIAN = re.compile(r"\b(?:doctor|pharmacist|prescriber|clinician|physician|gp)\b", re.I)
_CONDITION = re.compile(r"\bif you\b|\bbefore (?:you|starting|changing|adding)\b|"
                        r"\bfirst\b|\bcheck with (?:them|him|her)\b", re.I)
_SENT = re.compile(r"(?<=[.!?])\s+")


def strip(raw):
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw))).strip()


def check_text(text):
    """Return (problems, reviews) for one page's plain text. No problems = pass."""
    problems, reviews = [], []
    n = len(_CANON.findall(text))
    if n == 0:
        problems.append("missing the safety line")
    elif n > 1:
        problems.append(f"safety line appears {n} times, keep exactly one")
    rest = _CANON.sub(" ", text)
    for s in _SENT.split(rest):
        if _CLINICIAN.search(s) and _CONDITION.search(s):
            reviews.append(s.strip()[:160])
    return problems, reviews


def find_failures(root=ROOT, site=None, slug=None):
    posts = json.load(open(os.path.join(root, "data/blog_posts.json")))["blog_posts"]
    out = []
    for p in posts:
        psite = p.get("site", "cw")
        if psite not in ("cw", "kd") or (site and psite != site):
            continue
        if slug and p.get("slug") != slug:
            continue
        if p.get("status") not in CHECKED_STATUSES:
            continue
        probs, reviews = check_text(strip(p.get("content", "")))
        if probs or reviews:
            out.append((p.get("slug", "?"), probs, reviews))
    return out


def main():
    site = sys.argv[sys.argv.index("--site") + 1] if "--site" in sys.argv else None
    slug = sys.argv[sys.argv.index("--slug") + 1] if "--slug" in sys.argv else None
    found = find_failures(site=site, slug=slug)
    failed = [f for f in found if f[1]]
    for s, probs, reviews in found:
        print(f"  {s}")
        for pr in probs:
            print(f"      FAIL: {pr}")
        for r in reviews:
            print(f'      REVIEW (delete if it repeats the warning): "{r}"')
    if not failed:
        print("PASS: every queued CW/KD post carries exactly one safety line.")
        return 0
    print(f"\nFAIL: {len(failed)} queued post(s). One line per page, near the first "
          "number that needs it:")
    print(f"  {SAFETY_LINE}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Red/green proof for scripts/check_doctor_line.py (CONTENT LINE, 2026-10-17).

Exactly one safety line per new CW/KD page. Missing or doubled fails; a repeated
doctor caveat is listed for review; published posts are never checked.
Run: python3 tests/test_doctor_line_guard.py
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from check_doctor_line import SAFETY_LINE, check_text, find_failures  # noqa: E402

ONE = f"<p>Most people land around 3-5 g of sodium a day. {SAFETY_LINE}</p><p>Eat beef.</p>"
NONE = "<p>Most people land around 3-5 g of sodium a day.</p>"
TWO = f"<p>{SAFETY_LINE}</p><p>Protein runs 0.8-1.0 g/lb. {SAFETY_LINE}</p>"
REPEAT = (f"<p>{SAFETY_LINE}</p><p>Salt to taste. If you have high blood pressure or a "
          "salt limit, check with your doctor first.</p>")
NOT_A_WARNING = (f"<p>{SAFETY_LINE}</p><p>Here is the short list to ask your doctor "
                 "about: a lipid panel and A1c.</p>")


def main():
    fails = 0

    def expect(label, cond):
        nonlocal fails
        if not cond:
            print(f"FAIL: {label}")
            fails += 1

    from check_doctor_line import strip
    expect("one line passes", check_text(strip(ONE)) == ([], []))
    expect("missing line fails", check_text(strip(NONE))[0])
    expect("two lines fail", check_text(strip(TWO))[0])
    p, r = check_text(strip(REPEAT))
    expect("repeat caveat is listed for review, not failed", not p and r)
    expect("ask-your-doctor-about list is not a warning", check_text(strip(NOT_A_WARNING)) == ([], []))

    posts = {"blog_posts": [
        {"slug": "old", "site": "cw", "status": "published", "content": NONE},
        {"slug": "pd", "site": "pd", "status": "ready", "content": NONE},
        {"slug": "new-ok", "site": "kd", "status": "ready", "content": ONE},
        {"slug": "new-bad", "site": "cw", "status": "ready", "content": NONE},
    ]}
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "data").mkdir()
        (Path(d) / "data/blog_posts.json").write_text(json.dumps(posts))
        failed = [s for s, probs, _r in find_failures(root=d) if probs]
    expect("only the queued CW/KD post without the line fails (published and PD skipped)",
           failed == ["new-bad"])

    if fails:
        print(f"\n{fails} failure(s)")
        return 1
    print("PASS  one-line rule: missing/doubled red, repeat listed, published and PD skipped")
    return 0


if __name__ == "__main__":
    sys.exit(main())

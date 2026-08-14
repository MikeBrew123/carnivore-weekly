#!/usr/bin/env python3
"""Check drip email templates for mobile-readiness. Read-only: renders locally,
sends nothing, touches no network beyond the headless browser's own about:blank.

83% of KetoDial subscribers open on a phone (see the 2026-08-13 diagnosis), so
these templates get checked at phone widths before anything ships.

Usage:
    python3 scripts/check_email_mobile.py data/drip-emails/kd
    python3 scripts/check_email_mobile.py data/drip-emails/kd --shots screenshots/out

Exit code is non-zero if any template fails a check.

Checks, at 320 / 375 / 414px:
  * no horizontal overflow (page or any element)
  * reading copy >= 16px; labels, attribution and footer legal >= 14px
  * button-style links (display block / inline-block) >= 44px tall
"""
import argparse
import json
import re
import sys
from pathlib import Path

WIDTHS = (320, 375, 414)
MIN_BODY_PX = 16      # prose the reader reads for content
MIN_CHROME_PX = 14    # labels, kickers, attribution, footer legal
MIN_TAP_PX = 44       # Apple/Google minimum touch target

# Realistic merge-tag values so promo codes and unsubscribe URLs are measured at
# the length subscribers actually receive. WEEK1-xxxxx is the widest code
# send_drip.py mints (PROMO_DAYS prefix + 5 chars).
MERGE = {
    "{$promo_code}": "WEEK1-A3F2K",
    "{$promo_urgency}": (
        "Your code WEEK1-A3F2K was made just for you. It works once, on any report "
        "in the calculator, and it stops working 48 hours after this email went out."
    ),
    "{$promo_pitch}": "Your code WEEK1-A3F2K takes half off any report in the calculator.",
    "{$unsubscribe}": (
        "https://carnivore-report-api-production.iambrew.workers.dev/api/v1/"
        "unsubscribe?email=someone%40example.com&site=kd"
    ),
}

PROBE = """() => {
  const vw = window.innerWidth, de = document.documentElement, b = document.body;
  const out = {vw, scrollW: Math.max(de.scrollWidth, b.scrollWidth),
               overflow: [], small: [], taps: []};
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const cls = (typeof el.className === 'string' && el.className.trim())
      ? '.' + el.className.trim().split(/\\s+/).join('.') : '';
    const desc = el.tagName.toLowerCase() + cls;
    const txt = (el.textContent || '').trim().slice(0, 50);
    if (r.right > vw + 0.5 || r.left < -0.5)
      out.overflow.push({el: desc, txt, right: +r.right.toFixed(1)});
    const own = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3 && n.textContent.trim())
      .map(n => n.textContent.trim()).join(' ');
    if (own.length > 25)
      out.small.push({el: desc, fs: parseFloat(cs.fontSize), txt: own.slice(0, 50),
                      chrome: !!el.closest('.footer, .header') ||
                              el.matches('.subtitle, .eyebrow, .attribution')});
    if (el.tagName === 'A' && ['block', 'inline-block'].includes(cs.display))
      out.taps.push({txt, h: +r.height.toFixed(1), w: +r.width.toFixed(1)});
  }
  return out;
}"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="directory of day-*.html templates")
    ap.add_argument("--shots", metavar="DIR", help="also save full-page 375px previews here")
    ap.add_argument("--json", metavar="FILE", help="write the raw measurements here")
    args = ap.parse_args()

    from playwright.sync_api import sync_playwright

    src = Path(args.src)
    files = sorted(src.glob("day-*.html"),
                   key=lambda p: int(re.search(r"day-(\d+)", p.name).group(1)))
    if not files:
        print(f"no day-*.html templates in {src}")
        return 1

    raw, failures = {}, 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for f in files:
            html = f.read_text(encoding="utf-8")
            for tag, val in MERGE.items():
                html = html.replace(tag, val)
            problems = []
            for width in WIDTHS:
                page = browser.new_page(viewport={"width": width, "height": 812})
                page.set_content(html, wait_until="load")
                r = page.evaluate(PROBE)
                raw.setdefault(f.name, {})[width] = r
                if r["scrollW"] > r["vw"]:
                    problems.append(f"[{width}px] page scrolls sideways ({r['scrollW']}px)")
                for o in r["overflow"]:
                    problems.append(f"[{width}px] {o['el']} runs to {o['right']}px :: {o['txt']}")
                for s in r["small"]:
                    # kickers, labels, attribution and footer legal only owe 14px
                    floor = MIN_CHROME_PX if s["chrome"] else MIN_BODY_PX
                    if s["fs"] < floor:
                        problems.append(
                            f"[{width}px] {s['fs']}px < {floor}px on {s['el']} :: {s['txt']}")
                for t in r["taps"]:
                    if t["h"] < MIN_TAP_PX:
                        problems.append(
                            f"[{width}px] button only {t['h']}px tall :: {t['txt']}")
                if args.shots and width == 375:
                    out = Path(args.shots)
                    out.mkdir(parents=True, exist_ok=True)
                    page.screenshot(path=str(out / f"{f.stem}-375px.png"), full_page=True)
                page.close()
            if problems:
                failures += 1
                print(f"FAIL {f.name}")
                for p in problems:
                    print(f"       {p}")
            else:
                print(f"OK   {f.name}")
        browser.close()

    if args.json:
        Path(args.json).write_text(json.dumps(raw, indent=2))
    print(f"\n{len(files) - failures}/{len(files)} templates mobile-clean")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

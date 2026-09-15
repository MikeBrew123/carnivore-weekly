#!/usr/bin/env python3
"""Build the KetoDial calculator bonus insert: an AD, not a line.

The KetoDial sibling of build_calculator_insert.py. Same job, same structure,
different destination: this one sends an Etsy buyer to ketodial.com rather than
carnivoreweekly.com, because Brew's aim is to build KD traffic.

Every number on the card was read out of the code or the live site, not written
from memory. That is the rule the CW card was built under and it holds here:

  * The example results tile is computed by transcribing computeMacros() from
    ketodial/public/ketodial.js verbatim (Mifflin-St Jeor BMR, 20% deficit on
    'lose', keto split 70% fat / 25% protein / 5% carbs). KD does NOT share the
    CW engine: CW anchors on protein at roughly 2g/kg and takes a configurable
    deficit, so CW's tests/macro_parity/golden.json numbers would be WRONG here.
    The profile shown matches the CW card's example on purpose, so the two cards
    are comparable side by side.
  * Prices are ketodial/stripe-products.json: Starter Kit $3.99, Doctor's Report
    $5.99, 7-Day Meal Plan $5.99, Essentials $7.99, Full Protocol $10.99.
  * The Full Protocol Bundle "contains" doctor + meal + starter, per that file.
  * ETSY25 is a live Stripe promotion code created 2026-09-15, 25% off, RESTRICTED
    to prod_Uc9wngyhL1WpS6 (Full Protocol Bundle) via coupon NV7xcM9C. The card
    says so, because a code that silently fails on the other four tiers would be
    worse than no code.
  * KD's checkout takes codes through Stripe's native allow_promotion_codes
    (ketodial/worker/index.js), so the buyer types it. The card says "enter it at
    checkout" and never claims it auto-applies.
  * The kidney gate is real, not marketing: ketodial.js prints a referral where
    the protein target would be, rather than a smaller number.

Copy by Sarah, 2026-09-15.

Usage:
  python3 build_kd_calculator_insert.py                 -> DRAFT, placeholder code
  python3 build_kd_calculator_insert.py --code ETSY25   -> shippable card
"""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "etsy" / "products" / "pdfs"
BUILD_DIR = ROOT / "etsy" / "products" / "_build"

# KetoDial palette, taken from the live site's calculator page.
BG, INK, ACCENT, SOFT, BOXBG, LINE = "#ffffff", "#0f172a", "#0ea5e9", "#475569", "#f0f9ff", "rgba(14,165,233,0.25)"

CODES = {
    "ETSY25": dict(code="ETSY25", off="25% off", was="$10.99", now="$8.24"),
}
PLACEHOLDER = dict(code="XXXXXX", off="XX% off", was="$10.99", now="$X.XX")

# Computed from ketodial.js computeMacros(), profile: female, 57, 5ft4, 168lb,
# lightly active (1.375), losing. Recompute with --verify if that code changes.
EXAMPLE = dict(profile="Example: female, 57, 5 ft 4 in, 168 lb, lightly active, losing weight",
               calories="1,466", tdee="1,832", fat="114", protein="92", carbs="18")

C = {
 "kicker": "FREE WITH YOUR CARNIVORE WEEKLY ORDER",
 "headline": "Your own keto numbers, in about two minutes",
 "subhead": "The printable you just bought gives you the structure. The KetoDial calculator gives you the amounts, worked out for your body instead of an average one.",
 "free_tier_para": "Answer six plain questions: sex, age, height, weight, how active you are, and what you are trying to do. Your keto targets come back free, right there on the page, no card and no waiting. It does ask for your email address, because that is where your results and the follow-up go.",
 "safety_para": "Before it prints anything, it asks one question most calculators skip: whether you have kidney disease, reduced kidney function, or are on dialysis. If your answer means a safe number would take a doctor who knows your history, it does not quietly hand you a softer number. It stops, tells you so, and points you to your clinician. That is the part we are proudest of.",
 "paid_heading": "If you want the whole thing worked out for you",
 "paid_para": "The Full Protocol Bundle is every KetoDial guide in one download, built around the numbers you just got. It is for the person who would rather be handed the plan than build it. Buy it once, print it, keep it in a binder on the counter.",
 "paid_bullets": [
   "The Doctor's Report, a clear one-page summary of your profile and targets to take to your next appointment",
   "The 7-Day Meal Plan, a full week of meals portioned to your own numbers",
   "The grocery list that goes with the week, sorted the way a store is laid out",
   "The Keto Starter Kit, covering the first two weeks in plain language",
   "What to expect week by week, including the rough patches nobody warns you about",
   "Printable, readable pages. Large type, real tables, nothing you need a phone to use",
 ],
 "closing": "Start with your numbers. The rest gets a lot simpler after that.",
 "url": "ketodial.com/calculator.html",
}

PAGE = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0; }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ -webkit-print-color-adjust:exact; print-color-adjust:exact;
    width:8.5in; height:11in; background:{BG}; color:{INK};
    font-family:'Source Sans 3', Helvetica, sans-serif;
    display:flex; align-items:center; justify-content:center; }}
  .card {{ width:7.0in; }}
  .kicker {{ color:{ACCENT}; font-weight:700; letter-spacing:2.5px; font-size:9.5pt;
    text-transform:uppercase; text-align:center; margin-bottom:10px; }}
  h1 {{ font-family:'Libre Baskerville',Georgia,serif; font-size:20pt; line-height:1.15;
    text-align:center; margin-bottom:12px; }}
  .lede {{ font-size:10pt; line-height:1.5; color:{SOFT}; text-align:center; margin-bottom:11px; }}
  .results {{ border:2px solid {ACCENT}; border-radius:12px; overflow:hidden; }}
  .results-head {{ background:{ACCENT}; color:#fff; padding:7px 14px; font-size:8.5pt;
    letter-spacing:1.4px; text-transform:uppercase; font-weight:700;
    display:flex; justify-content:space-between; }}
  .results-body {{ background:{BOXBG}; padding:10px; }}
  .profile {{ font-size:9pt; color:{SOFT}; text-align:center; padding-bottom:10px;
    margin-bottom:11px; border-bottom:1px solid {LINE}; }}
  .tiles {{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }}
  .tile {{ background:{BG}; border:1px solid {LINE}; border-radius:8px; padding:6px 4px; text-align:center; }}
  .tile .lab {{ font-size:7.5pt; letter-spacing:0.9px; text-transform:uppercase; color:{SOFT}; margin-bottom:3px; }}
  .tile .num {{ font-family:'Libre Baskerville',Georgia,serif; font-size:15pt; font-weight:700; color:{ACCENT}; line-height:1.1; }}
  .tile .unit {{ font-size:7.5pt; color:{SOFT}; margin-top:2px; }}
  .caption {{ font-size:8pt; color:{SOFT}; text-align:center; margin-top:7px; font-style:italic; }}
  .freeline {{ font-size:9.5pt; line-height:1.45; color:{SOFT}; text-align:center; margin:10px 0 9px; }}
  .safety {{ background:{BOXBG}; border-left:4px solid {ACCENT}; border-radius:6px;
    padding:9px 12px; font-size:9.5pt; line-height:1.42; color:{SOFT}; margin-bottom:11px; }}
  .rule {{ height:1px; background:{LINE}; margin:0 0 11px; }}
  h2 {{ font-family:'Libre Baskerville',Georgia,serif; font-size:13pt; text-align:center; margin-bottom:6px; }}
  .paid-lede {{ font-size:9.5pt; line-height:1.42; color:{SOFT}; text-align:center; margin-bottom:9px; }}
  ul {{ list-style:none; margin-bottom:10px; }}
  li {{ font-size:9pt; line-height:1.35; color:{SOFT}; padding-left:13px; position:relative; margin-bottom:2px; }}
  li:before {{ content:"\\2022"; color:{ACCENT}; font-weight:700; position:absolute; left:0; }}
  .offer {{ border:2px dashed {ACCENT}; border-radius:10px; padding:10px; text-align:center; margin-bottom:9px; }}
  .offer .code {{ font-family:'Libre Baskerville',Georgia,serif; font-size:19pt; font-weight:700;
    color:{ACCENT}; letter-spacing:3px; line-height:1.1; }}
  .offer .terms {{ font-size:9.5pt; color:{SOFT}; margin-top:6px; line-height:1.45; }}
  .offer .price s {{ color:{SOFT}; }}
  .offer .price strong {{ color:{INK}; font-size:13pt; }}
  .cta {{ text-align:center; font-size:12pt; font-weight:700; color:{ACCENT}; margin-bottom:5px; }}
  .closing {{ text-align:center; font-size:10pt; color:{SOFT}; font-style:italic; }}
  .draft {{ position:fixed; top:48%; left:0; right:0; text-align:center; font-size:64pt;
    font-weight:700; color:rgba(14,165,233,0.13); letter-spacing:16px; }}
</style></head><body>
{DRAFT}
<div class="card">
  <div class="kicker">{kicker}</div>
  <h1>{headline}</h1>
  <p class="lede">{subhead}</p>

  <div class="results">
    <div class="results-head"><span>Your personalised keto targets</span><span>FREE</span></div>
    <div class="results-body">
      <div class="profile">{profile}</div>
      <div class="tiles">
        <div class="tile"><div class="lab">Daily calories</div><div class="num">{calories}</div><div class="unit">kcal</div></div>
        <div class="tile"><div class="lab">Protein</div><div class="num">{protein}</div><div class="unit">grams</div></div>
        <div class="tile"><div class="lab">Fat</div><div class="num">{fat}</div><div class="unit">grams</div></div>
        <div class="tile"><div class="lab">Net carbs</div><div class="num">{carbs}</div><div class="unit">grams</div></div>
        <div class="tile"><div class="lab">Maintenance</div><div class="num">{tdee}</div><div class="unit">TDEE kcal</div></div>
        <div class="tile"><div class="lab">Method</div><div class="num" style="font-size:11pt">Mifflin<br>St Jeor</div><div class="unit">metabolic rate</div></div>
      </div>
      <div class="caption">Real output for the example profile. Yours will land somewhere else.</div>
    </div>
  </div>

  <p class="freeline">{free_tier_para}</p>
  <div class="safety">{safety_para}</div>
  <div class="rule"></div>

  <h2>{paid_heading}</h2>
  <p class="paid-lede">{paid_para}</p>
  <ul>{bullets}</ul>

  <div class="offer">
    <div class="code">{code}</div>
    <div class="price"><s>{was}</s> &rarr; <strong>{now}</strong></div>
    <div class="terms">{off} the Full Protocol Bundle. Enter it at checkout. The code works on the Full Protocol Bundle only.</div>
  </div>

  <div class="cta">{url}</div>
  <p class="closing">{closing}</p>
</div>
</body></html>"""


def build(code_key):
    d = CODES.get(code_key) or PLACEHOLDER
    draft = "" if code_key in CODES else '<div class="draft">DRAFT</div>'
    html = PAGE.format(
        BG=BG, INK=INK, ACCENT=ACCENT, SOFT=SOFT, BOXBG=BOXBG, LINE=LINE,
        DRAFT=draft, bullets="".join(f"<li>{b}</li>" for b in C["paid_bullets"]),
        **{k: v for k, v in C.items() if k != "paid_bullets"}, **EXAMPLE, **d)

    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    hp = BUILD_DIR / "kd-calculator-insert.html"
    hp.write_text(html)
    name = "bonus-insert-kd-calculator.pdf" if code_key in CODES else "bonus-insert-kd-calculator-DRAFT.pdf"
    out = OUT_DIR / name

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page()
        pg.goto(hp.as_uri(), wait_until="networkidle")
        pg.emulate_media(media="print")
        pg.pdf(path=str(out), width="8.5in", height="11in", print_background=True,
               margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
        b.close()
    print(f"  {out.relative_to(ROOT)}  ({out.stat().st_size // 1024} KB)")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--code", choices=sorted(CODES),
                    help="omit for a clearly marked DRAFT that cannot be mistaken for shippable")
    a = ap.parse_args()
    out = build(a.code)
    pages = subprocess.run(["pdfinfo", str(out)], capture_output=True, text=True).stdout
    print("  " + next((l for l in pages.splitlines() if l.startswith("Pages")), "Pages: ?"))
    return 0


if __name__ == "__main__":
    sys.exit(main())

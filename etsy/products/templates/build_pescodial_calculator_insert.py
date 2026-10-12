#!/usr/bin/env python3
"""Build the PescoDial calculator bonus insert for the pescatarian Etsy listings.

Brew, 2026-10-03: pescatarian Etsy listings get a PescoDial calculator card with a
discount code, inside the delivered file. Brew, 2026-10-06: "make the swap, people who buy the
Pesco products won't have interest in the Keto or Carnivore redirects".

Same layout as build_calculator_insert.py (the CW card). Everything on the card was read from code:
  * Example tiles: api/calculator-api.js calculateMacros, diet 'pesco-lowcarb', female 57, 5 ft 4,
    168 lb, moderate, lose -> 1652 kcal / 152 g protein / 72 g fat / 100 g carbs (run 2026-10-06).
  * Fish meals a week: PD_FISH_MEALS_PER_WEEK['pesco-lowcarb'] = 5 (api/pd-meal-plan.js).
  * Four styles, $29 USD one-time, 7-day plan contents and 30-day refund line: pescodial/public/calculator/index.html.
  * ETSY50 is live in stripeCouponMap (50% off once, $14.50); Brew approved CW codes at PD checkout 2026-10-03.
  * Medical line copied from the PescoDial calculator page.
Usage: python3 build_pescodial_calculator_insert.py   -> etsy/products/pdfs/Free-PescoDial-Calculator-50-Percent-Off.pdf
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "pdfs" / "Free-PescoDial-Calculator-50-Percent-Off.pdf"

PAGE = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 8.5in; height: 11in; background: {BG}; color: {INK};
    font-family: 'Atkinson Hyperlegible', Helvetica, sans-serif;
    display: flex; align-items: center; justify-content: center; }}
  .card {{ width: 6.9in; }}

  .kicker {{ color: {ACCENT}; font-weight: 700; letter-spacing: 2.5px;
    font-size: 10pt; text-transform: uppercase; text-align: center; margin-bottom: 10px; }}
  h1 {{ font-family: 'Atkinson Hyperlegible', Georgia, sans-serif; font-size: 25pt;
    line-height: 1.18; text-align: center; margin-bottom: 12px; }}
  .lede {{ font-size: 11.5pt; line-height: 1.6; color: {SOFT};
    text-align: center; margin-bottom: 20px; }}
  .lede strong {{ color: {INK}; }}

  /* The results tile: this is the part that SHOWS instead of telling */
  .results {{ border: 2px solid {ACCENT}; border-radius: 12px; overflow: hidden; }}
  .results-head {{ background: {ACCENT}; color: {BG}; padding: 7px 14px;
    font-size: 9pt; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 700;
    display: flex; justify-content: space-between; }}
  .results-body {{ background: {BOXBG}; padding: 14px; }}
  .profile {{ font-size: 9.5pt; color: {SOFT}; text-align: center;
    padding-bottom: 11px; margin-bottom: 12px; border-bottom: 1px solid rgba(29,58,87,0.22); }}
  .tiles {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }}
  .tile {{ background: {BG}; border: 1px solid rgba(29,58,87,0.2);
    border-radius: 8px; padding: 10px 6px; text-align: center; }}
  .tile .lab {{ font-size: 8pt; letter-spacing: 0.9px; text-transform: uppercase;
    color: {SOFT}; margin-bottom: 4px; }}
  .tile .num {{ font-family: 'Atkinson Hyperlegible', Georgia, sans-serif;
    font-size: 19pt; font-weight: 700; color: {ACCENT}; line-height: 1.1; }}
  .tile .unit {{ font-size: 8pt; color: {SOFT}; margin-top: 2px; }}
  .caption {{ font-size: 8.5pt; color: {SOFT}; text-align: center;
    margin-top: 11px; font-style: italic; }}

  .freeline {{ font-size: 11pt; line-height: 1.6; color: {SOFT};
    text-align: center; margin: 16px 0 20px; }}
  .freeline strong {{ color: {INK}; }}

  .rule {{ height: 1px; background: rgba(29,58,87,0.28); margin: 0 0 18px; }}

  h2 {{ font-family: 'Atkinson Hyperlegible', Georgia, sans-serif; font-size: 15pt;
    text-align: center; margin-bottom: 9px; }}
  .paid-lede {{ font-size: 10.5pt; line-height: 1.55; color: {SOFT};
    text-align: center; margin-bottom: 14px; }}
  ul {{ list-style: none; display: grid; grid-template-columns: 1fr 1fr;
    gap: 6px 18px; margin-bottom: 14px; }}
  li {{ font-size: 10pt; line-height: 1.4; color: {SOFT}; padding-left: 14px;
    position: relative; }}
  li:before {{ content: "\\2022"; color: {ACCENT}; font-weight: 700;
    position: absolute; left: 2px; }}
  li strong {{ color: {INK}; font-weight: 600; }}
  .price {{ text-align: center; font-size: 10.5pt; color: {SOFT}; margin-bottom: 18px; }}
  .price strong {{ color: {INK}; font-size: 12pt; }}

  .cta {{ display: flex; gap: 12px; }}
  .box {{ background: {BOXBG}; border: 2.5px solid {ACCENT};
    border-radius: 12px; padding: 14px 10px; text-align: center; }}
  .box .go {{ font-size: 8.5pt; letter-spacing: 1.4px; text-transform: uppercase;
    color: {SOFT}; margin-bottom: 5px; }}
  .box .big {{ font-family: 'Atkinson Hyperlegible', Georgia, sans-serif;
    font-size: 16pt; font-weight: 700; color: {ACCENT}; white-space: nowrap; }}
  .box-url {{ flex: 1.62; }}
  .box-url .big {{ font-size: 12.5pt; }}
  .box-code {{ flex: 1; }}
  .box .sub {{ font-size: 8.5pt; color: {SOFT}; margin-top: 5px; }}

  .foot {{ font-size: 9.5pt; color: {SOFT}; margin-top: 20px; text-align: center; }}

  .draftbar {{ position: absolute; top: 50%; left: 0; right: 0;
    transform: translateY(-50%) rotate(-32deg); text-align: center;
    color: rgba(29,58,87,0.20); font-size: 46pt; font-weight: 700;
    letter-spacing: 5px; pointer-events: none; }}
</style></head>
<body>
  {DRAFTBAR}
  <div class="card">
    <div class="kicker">Free with your pescatarian order</div>
    <h1>Your own numbers, in about two minutes</h1>
    <p class="lede">The printable you just bought gives you the structure. PescoDial gives you
    the amounts. Answer a few questions about your height, weight, age, activity and goal,
    and the calculator hands back <strong>your</strong> version of this:</p>

    <div class="results">
      <div class="results-head"><span>Your personalized macros</span><span>Free</span></div>
      <div class="results-body">
        <div class="profile">Example: female, 57, 5 ft 4 in, 168 lb, moderately active, losing weight, Pescatarian Low Carb</div>
        <div class="tiles">
          <div class="tile"><div class="lab">Daily calories</div><div class="num">1,652</div><div class="unit">kcal</div></div>
          <div class="tile"><div class="lab">Protein</div><div class="num">152</div><div class="unit">grams</div></div>
          <div class="tile"><div class="lab">Fish meals</div><div class="num">5</div><div class="unit">a week</div></div>
          <div class="tile"><div class="lab">Fat</div><div class="num">72</div><div class="unit">grams</div></div>
          <div class="tile"><div class="lab">Carbs</div><div class="num">100</div><div class="unit">grams</div></div>
          <div class="tile"><div class="lab">Style</div><div class="num" style="font-size:11pt;line-height:1.5">Pescatarian<br>Low Carb</div><div class="unit">your choice of four</div></div>
        </div>
        <div class="caption">Real output for the example profile. Yours will land somewhere else.</div>
      </div>
    </div>

    <p class="freeline">That part is free. It asks for your email, not your card. You also get
    a sample day built on your numbers. Choose from four pescatarian styles:
    <strong>Mediterranean, low carb, keto or carnivore</strong>.</p>

    <div class="rule"></div>

    <h2>Then, if you want the full week</h2>
    <p class="paid-lede">Knowing your numbers is the easy part. Knowing what to put on the plate, and what to
    buy, is where most plans stall. Your full 7-day plan is built on your numbers:</p>
    <ul>
      <li><strong>A 7-day meal plan</strong> built on your calorie and protein targets</li>
      <li><strong>A grocery list</strong> you can take to the store</li>
      <li><strong>Recipes</strong> for the dishes in your plan</li>
      <li><strong>A weekly fish plan</strong> with lower-mercury choices</li>
      <li><strong>An eating-out guide</strong> for restaurants and takeout</li>
      <li><strong>Questions to take to your doctor</strong>, in plain English</li>
    </ul>
    <p class="price"><strong>$29 USD, once.</strong> No subscription. If it is not useful, email us
    within 30 days for a full refund.</p>

    <div class="cta">
      <div class="box box-url">
        <div class="go">Start free at</div>
        <div class="big">pescodial.com/calculator</div>
        <div class="sub">Free, no card</div>
      </div>
      <div class="box box-code">
        <div class="go">Your code, {OFF}</div>
        <div class="big">{CODE}</div>
        <div class="sub">Enter it at checkout: {PRICE}</div>
      </div>
    </div>

    <p class="foot">General information, not medical advice. If you take medicine, are pregnant or have a heart, kidney or other condition, check with your doctor first.</p>
  </div>
</body></html>"""

PALETTE = dict(BG="#fffbf4", INK="#1f2328", SOFT="#4a4f55", ACCENT="#1d3a57", BOXBG="#e3ebf1")


def main() -> int:
    html = PAGE.format(DRAFTBAR="", CODE="ETSY50", OFF="50% off", PRICE="$14.50", **PALETTE)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(path=str(OUT), width="8.5in", height="11in",
                 margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                 print_background=True, scale=1.0)
        browser.close()
    print("built", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())

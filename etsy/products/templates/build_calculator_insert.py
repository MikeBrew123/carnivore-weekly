#!/usr/bin/env python3
"""Build the calculator bonus insert: an AD, not a line.

Replaces the "free 30-day tracker" bonus card for Etsy digital downloads.
Brew, 2026-08-25: "we should include a promo in the insert that shows what
they get from the calculator, an add not just a line saying they get it."

So the card SHOWS the calculator's real output. Every number and claim on it
was read out of the code or the live site, not written from memory:

  * The example results tile is golden test case
    tests/macro_parity/golden.json (female, 57, 5'4", 168 lb, moderate,
    losing, carnivore) -> 1652 cal / 152 g protein / 116 g fat / 0 g carbs.
    That file is CI-enforced against the worker's calculateMacros, which is
    what actually prices every paid report. Maintenance 2065 and the 63% fat
    split are the same formula (api/calculator-api.js calculateMacros).
  * Free tier really shows: the six macro tiles (MacroPreview.tsx) plus the
    profile summary and MEAL 1 only. Meals 2-4 and the snack are blurred
    behind the paywall (Step3FreeResults.tsx), so the card claims one meal,
    not a sample day.
  * $29 is the live charged price: Stripe price_1T5CZkEVDfkpGz8wnvZEnZH7,
    unit_amount 2900, active, livemode (read 2026-09-06), wired at
    api/calculator-api.js tierPriceMap.
  * The six paid sections are the ones the live bundle names, verified
    present in the served asset index--6W-161v.js.
  * The free tier is NOT anonymous: Step1PhysicalStats.tsx:138 makes email
    required and the field's own help text says it subscribes you to the
    weekly email. The card says so rather than implying no sign-up.
  * Diets are the four in Step3FreeResults dietConfig. Mediterranean and
    anti-inflammatory buyers get this card too, and the calculator does NOT
    support those diets, so the card says which four it covers rather than
    implying all of them.

QR and link (2026-11-23): the card carries a QR code and a clickable link to
calculator.html?coupon=<CODE> with Etsy print UTMs. The calculator reads
?coupon= and applies the code at checkout, so the instructions say "applied",
with the printed code kept as the typed fallback for the "Have a coupon code?"
box. The QR is generated locally with the python qrcode package (error
correction M, 4-module quiet zone, dark on white), never an AI image. Needs:
  uv run --with playwright --with qrcode --with pillow python3 build_calculator_insert.py --code ETSY50

Discount code: parameterised on purpose. Which code survives the coupon
ladder is an open question for Brew, and a printed code on a downloaded PDF
can never be recalled. With no --code the build emits a clearly marked DRAFT
that cannot be mistaken for a shippable file.

Usage:
  python3 build_calculator_insert.py              -> DRAFT, placeholder code
  python3 build_calculator_insert.py --code ETSY50 -> shippable card

Outputs to etsy/products/pdfs/.
"""
import argparse
import base64
from html import escape as html_escape
import io
import sys
from pathlib import Path

import qrcode

from playwright.sync_api import sync_playwright

OUT_DIR = Path(__file__).resolve().parents[1] / "pdfs"

# Live Stripe coupons, read read-only from the live account 2026-09-06 and
# cross-checked against stripeCouponMap (api/calculator-api.js). Only codes
# that BOTH exist in Stripe and are wired into the validator belong here: a
# code missing from the map silently charges full price at checkout.
# The 100% and 75% coupons are deliberately absent. A card that ships to every
# buyer must never carry a code that gives the product away.
CODES = {
    "ETSY50": dict(code="ETSY50", off="50% off", price="$14.50"),
    "CARNIVORE20": dict(code="CARNIVORE20", off="20% off", price="$23.20"),
    "THANKYOU25": dict(code="THANKYOU25", off="25% off", price="$21.75"),
    "WELCOME10": dict(code="WELCOME10", off="10% off", price="$26.10"),
}
PLACEHOLDER = dict(code="XXXXXX", off="XX% off", price="$XX.XX")

LINK = ("https://carnivoreweekly.com/calculator.html?coupon={code}"
        "&utm_source=etsy&utm_medium=print&utm_campaign=cw_coupon_card")


def qr_data_uri(url: str) -> str:
    """PNG data URI for url: error correction M, 4-module quiet zone."""
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,
                       box_size=20, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    buf = io.BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

PAGE = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 8.5in; height: 11in; background: {BG}; color: {INK};
    font-family: 'Source Sans 3', Helvetica, sans-serif;
    display: flex; align-items: center; justify-content: center; }}
  .card {{ width: 6.9in; }}

  .kicker {{ color: {ACCENT}; font-weight: 700; letter-spacing: 2.5px;
    font-size: 10pt; text-transform: uppercase; text-align: center; margin-bottom: 10px; }}
  h1 {{ font-family: 'Libre Baskerville', Georgia, serif; font-size: 22pt;
    line-height: 1.18; text-align: center; margin-bottom: 12px; }}
  .lede {{ font-size: 11pt; line-height: 1.5; color: {SOFT};
    text-align: center; margin-bottom: 16px; }}
  .lede strong {{ color: {INK}; }}

  /* The results tile: this is the part that SHOWS instead of telling */
  .results {{ border: 2px solid {ACCENT}; border-radius: 12px; overflow: hidden; }}
  .results-head {{ background: {ACCENT}; color: {BG}; padding: 7px 14px;
    font-size: 9pt; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 700;
    display: flex; justify-content: space-between; }}
  .results-body {{ background: {BOXBG}; padding: 11px 14px; }}
  .profile {{ font-size: 9.5pt; color: {SOFT}; text-align: center;
    padding-bottom: 11px; margin-bottom: 12px; border-bottom: 1px solid rgba(168,52,31,0.22); }}
  .tiles {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }}
  .tile {{ background: {BG}; border: 1px solid rgba(168,52,31,0.2);
    border-radius: 8px; padding: 7px 6px; text-align: center; }}
  .tile .lab {{ font-size: 8pt; letter-spacing: 0.9px; text-transform: uppercase;
    color: {SOFT}; margin-bottom: 4px; }}
  .tile .num {{ font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 19pt; font-weight: 700; color: {ACCENT}; line-height: 1.1; }}
  .tile .unit {{ font-size: 8pt; color: {SOFT}; margin-top: 2px; }}
  .caption {{ font-size: 8.5pt; color: {SOFT}; text-align: center;
    margin-top: 11px; font-style: italic; }}

  .freeline {{ font-size: 10.5pt; line-height: 1.5; color: {SOFT};
    text-align: center; margin: 12px 0 14px; }}
  .freeline strong {{ color: {INK}; }}

  .rule {{ height: 1px; background: rgba(168,52,31,0.28); margin: 0 0 14px; }}

  h2 {{ font-family: 'Libre Baskerville', Georgia, serif; font-size: 15pt;
    text-align: center; margin-bottom: 9px; }}
  .paid-lede {{ font-size: 10.5pt; line-height: 1.55; color: {SOFT};
    text-align: center; margin-bottom: 10px; }}
  ul {{ list-style: none; display: grid; grid-template-columns: 1fr 1fr;
    gap: 5px 18px; margin-bottom: 10px; }}
  li {{ font-size: 10pt; line-height: 1.4; color: {SOFT}; padding-left: 14px;
    position: relative; }}
  li:before {{ content: "\\2022"; color: {ACCENT}; font-weight: 700;
    position: absolute; left: 2px; }}
  li strong {{ color: {INK}; font-weight: 600; }}
  .price {{ text-align: center; font-size: 10.5pt; color: {SOFT}; margin-bottom: 14px; }}
  .price strong {{ color: {INK}; font-size: 12pt; }}

  a {{ color: inherit; text-decoration: none; }}
  .cta {{ display: flex; gap: 12px; align-items: stretch; }}
  .qr {{ background: #ffffff; border: 2.5px solid {ACCENT}; border-radius: 12px;
    padding: 6px 6px 5px; text-align: center; flex: 0 0 auto; }}
  .qr img {{ display: block; width: 1.25in; height: 1.25in; image-rendering: pixelated; }}
  .qr .go {{ font-size: 8pt; letter-spacing: 1.2px; text-transform: uppercase;
    color: {SOFT}; margin-top: 3px; }}
  .stack {{ flex: 1; display: flex; gap: 12px; }}
  .stack .box {{ display: flex; flex-direction: column; justify-content: center; }}
  .box-url {{ flex: 1.75; }}
  .box-code {{ flex: 1; }}
  .box {{ background: {BOXBG}; border: 2.5px solid {ACCENT};
    border-radius: 12px; padding: 9px 10px; text-align: center; }}
  .box .go {{ font-size: 8.5pt; letter-spacing: 1.4px; text-transform: uppercase;
    color: {SOFT}; margin-bottom: 3px; }}
  .box .big {{ font-family: 'Libre Baskerville', Georgia, serif;
    font-size: 15pt; font-weight: 700; color: {ACCENT}; white-space: nowrap; }}
  .box-url .big {{ font-size: 12pt; }}
  .box .sub {{ font-size: 8.5pt; color: {SOFT}; margin-top: 3px; }}
  .how {{ font-size: 9pt; line-height: 1.45; color: {SOFT}; text-align: center;
    margin-top: 10px; }}
  .how strong {{ color: {INK}; }}

  .foot {{ font-size: 9.5pt; color: {SOFT}; margin-top: 12px; text-align: center; }}

  .draftbar {{ position: absolute; top: 50%; left: 0; right: 0;
    transform: translateY(-50%) rotate(-32deg); text-align: center;
    color: rgba(168,52,31,0.20); font-size: 46pt; font-weight: 700;
    letter-spacing: 5px; pointer-events: none; }}
</style></head>
<body>
  {DRAFTBAR}
  <div class="card">
    <div class="kicker">Free with your Carnivore Weekly order</div>
    <h1>Your own numbers, in about two minutes</h1>
    <p class="lede">The printable you just bought gives you the structure. This gives you
    the amounts. Answer a few questions about your height, weight, age, activity and goal,
    and the calculator hands back <strong>your</strong> version of this:</p>

    <div class="results">
      <div class="results-head"><span>Your personalized macros</span><span>Free</span></div>
      <div class="results-body">
        <div class="profile">Example: female, 57, 5 ft 4 in, 168 lb, moderately active, losing weight, carnivore</div>
        <div class="tiles">
          <div class="tile"><div class="lab">Daily calories</div><div class="num">1,652</div><div class="unit">kcal</div></div>
          <div class="tile"><div class="lab">Maintenance</div><div class="num">2,065</div><div class="unit">TDEE</div></div>
          <div class="tile"><div class="lab">Protein</div><div class="num">152</div><div class="unit">grams</div></div>
          <div class="tile"><div class="lab">Fat</div><div class="num">116</div><div class="unit">grams</div></div>
          <div class="tile"><div class="lab">Carbs</div><div class="num">0</div><div class="unit">grams</div></div>
          <div class="tile"><div class="lab">Macro split</div><div class="num">63%</div><div class="unit">fat</div></div>
        </div>
        <div class="caption">Real output for the example profile. Yours will land somewhere else.</div>
      </div>
    </div>

    <p class="freeline">That part is free. It asks for your email, not your card, and the
    weekly Carnivore Weekly email comes with it. You also get the first meal of a sample day,
    portioned to your numbers. It runs for
    <strong>carnivore, keto, low carb and pescatarian</strong>.</p>

    <div class="rule"></div>

    <h2>Then, if you want all 30 days</h2>
    <p class="paid-lede">Most plans do not fall apart in week one. They fall apart in week three,
    when the scale stops and nothing tells you what to do next. The Complete Protocol is your
    numbers turned into a month:</p>
    <ul>
      <li><strong>30 days of meals</strong> portioned to your calorie and protein targets</li>
      <li><strong>Weekly grocery lists</strong> you can take to the store</li>
      <li><strong>A stall guide</strong> for when the scale stops moving</li>
      <li><strong>A week by week guide</strong> to energy dips, cravings and sleep</li>
      <li><strong>A doctor conversation guide</strong> in plain English</li>
      <li><strong>Which labs to ask for</strong> at 30, 60 and 90 days</li>
    </ul>
    <p class="price"><strong>$29 once.</strong> No subscription. If it does not help, email us
    within 30 days for a full refund.</p>

    <div class="cta">
      <a class="qr" href="{LINK}"><img src="{QR}" alt="QR code"><div class="go">Scan me</div></a>
      <div class="stack">
        <a class="box box-url" href="{LINK}">
          <div class="go">Or go to</div>
          <div class="big">carnivoreweekly.com/calculator</div>
          <div class="sub">Free to start, no card</div>
        </a>
        <div class="box box-code">
          <div class="go">Your code, {OFF}</div>
          <div class="big">{CODE}</div>
          <div class="sub">Type it at checkout</div>
        </div>
      </div>
    </div>
    <p class="how">Scan or click and your {OFF} is applied at checkout (<strong>{PRICE}</strong>).
    Or type {CODE} in the &ldquo;Have a coupon code?&rdquo; box when you check out.</p>

    <p class="foot">Keep it simple. Stay consistent. Become unstoppable.</p>
  </div>
</body></html>"""

PALETTE = dict(BG="#faf5ec", INK="#2c1810", SOFT="#7a5c44",
               ACCENT="#a8341f", BOXBG="#f1e6d4")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--code", choices=sorted(CODES),
                    help="live discount code to print; omit to build a DRAFT")
    args = ap.parse_args()

    draft = args.code is None
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    codeinfo = PLACEHOLDER if draft else CODES[args.code]
    out = OUT_DIR / ("bonus-insert-calculator-DRAFT.pdf" if draft
                     else "bonus-insert-calculator.pdf")
    draftbar = ('<div class="draftbar">DRAFT, CODE NOT SET</div>'
                if draft else "")

    link = LINK.format(code=codeinfo["code"])
    html = PAGE.format(DRAFTBAR=draftbar, CODE=codeinfo["code"],
                       OFF=codeinfo["off"],
                       PRICE=codeinfo["price"], LINK=html_escape(link),
                       QR=qr_data_uri(link), **PALETTE)

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(path=str(out), width="8.5in", height="11in",
                 margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                 print_background=True, scale=1.0)
        browser.close()

    print("built", out)
    print("link", link)
    if draft:
        print("DRAFT build: discount code is a placeholder. Do NOT upload to Etsy.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

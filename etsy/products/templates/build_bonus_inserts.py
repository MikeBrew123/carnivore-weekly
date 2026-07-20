#!/usr/bin/env python3
"""Build the one-page bonus insert PDFs added to Etsy digital downloads.

Each card thanks the buyer and points to the site-matched free 30-day
tracker page (CW carnivore / KD keto). Outputs:
  etsy/products/pdfs/bonus-insert-carnivore.pdf
  etsy/products/pdfs/bonus-insert-keto.pdf
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT_DIR = Path(__file__).resolve().parents[1] / "pdfs"

PAGE = """<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Source+Sans+3:wght@400;600;700&family=Hanken+Grotesk:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 8.5in; height: 11in; background: {BG}; color: {INK};
    font-family: {BODY_FONT}; display: flex; align-items: center; justify-content: center; }}
  .card {{ width: 6.6in; text-align: center; }}
  .kicker {{ color: {ACCENT}; font-weight: 700; letter-spacing: 3px; font-size: 12pt; text-transform: uppercase; margin-bottom: 14px; }}
  h1 {{ font-family: {HEAD_FONT}; font-size: 30pt; line-height: 1.15; margin-bottom: 20px; }}
  p {{ font-size: 13.5pt; line-height: 1.65; margin-bottom: 16px; color: {SOFT}; }}
  p strong {{ color: {INK}; }}
  .urlbox {{ background: {BOXBG}; border: 3px solid {ACCENT}; border-radius: 14px; padding: 22px 18px; margin: 26px 0; }}
  .urlbox .go {{ font-size: 11pt; letter-spacing: 2px; text-transform: uppercase; color: {SOFT}; margin-bottom: 6px; }}
  .urlbox .url {{ font-size: 22pt; font-weight: 800; color: {ACCENT}; font-family: {HEAD_FONT}; }}
  .foot {{ font-size: 10.5pt; color: {SOFT}; margin-top: 30px; }}
</style></head>
<body>
  <div class="card">
    <div class="kicker">{KICKER}</div>
    <h1>{TITLE}</h1>
    <p>{BODY1}</p>
    <p>{BODY2}</p>
    <div class="urlbox">
      <div class="go">Grab it free at</div>
      <div class="url">{URL}</div>
    </div>
    <p class="foot">{FOOT}</p>
  </div>
</body></html>"""

VARIANTS = {
    "bonus-insert-carnivore.pdf": dict(
        KICKER="🥩 Carnivore Weekly — thank you!",
        TITLE="Your order comes with a free 30-Day Tracker",
        BODY1="Thanks for buying from our little shop. As a thank-you, we made you a bonus: a <strong>printable 30-day tracker</strong> that picks up right where the 14-day one leaves off. One fridge sheet for meat, fat, water, salt, energy, and mood.",
        BODY2="It pairs with our free 30-day starter emails, so the sheet on your fridge and the notes in your inbox stay in step.",
        URL="carnivoreweekly.com/bonus",
        FOOT="Keep it simple. Stay consistent. Become unstoppable.",
        BG="#faf5ec", INK="#2c1810", SOFT="#7a5c44", ACCENT="#a8341f", BOXBG="#f1e6d4",
        BODY_FONT="'Source Sans 3', Helvetica, sans-serif",
        HEAD_FONT="'Libre Baskerville', Georgia, serif",
    ),
    "bonus-insert-keto.pdf": dict(
        KICKER="KetoDial — thank you!",
        TITLE="Your order comes with a free 30-Day Keto Tracker",
        BODY1="Thanks for buying from our little shop. As a thank-you, we made you a bonus: a <strong>printable 30-day keto tracker</strong>. One fridge sheet for net carbs, protein, fat, water, electrolytes, energy, and mood.",
        BODY2="It comes with the weekly Dial-In: one short, practical keto email a week. No fluff, unsubscribe anytime.",
        URL="ketodial.com/bonus.html",
        FOOT="Small dials, big results. One honest column a day.",
        BG="#f1f5f9", INK="#0f172a", SOFT="#475569", ACCENT="#0e9db8", BOXBG="#ffffff",
        BODY_FONT="'Hanken Grotesk', Helvetica, sans-serif",
        HEAD_FONT="'Hanken Grotesk', Helvetica, sans-serif",
    ),
}

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page()
    for out, v in VARIANTS.items():
        page.set_content(PAGE.format(**v), wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(path=str(OUT_DIR / out), width="8.5in", height="11in",
                 margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                 print_background=True, scale=1.0)
        print("built", OUT_DIR / out)
    browser.close()

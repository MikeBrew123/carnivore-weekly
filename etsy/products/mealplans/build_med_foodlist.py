#!/usr/bin/env python3
"""Mediterranean Diet Food List chart — typeset replacement for the AI-generated
recraft PNG that shipped with label glitches on listing 4513518786 (2026-07-28).

Content comes from med-foodlist-content.json (verified by Sarah, writer pipeline).
Renders one-page US Letter via Playwright, same approach as build_mealplans.py.

Usage: python3 build_med_foodlist.py
"""
import base64
import json
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE.parent / "pdfs" / "fridge-card-mediterranean.pdf"
CONTENT = json.loads((HERE / "med-foodlist-content.json").read_text())
ILL_DIR = HERE / "med-illustrations"  # AI-generated ILLUSTRATION-ONLY spot art
# (no text in the images — all chart text is typeset below, ISSUE-062 rule)


def ill(name):
    p = ILL_DIR / f"{name}.png"
    if not p.exists():
        return ""
    b64 = base64.b64encode(p.read_bytes()).decode()
    return f'<img class="spot" src="data:image/png;base64,{b64}">'

# MED theme (matches build_mealplans.py)
BG, INK, ACCENT, HEADBG, HEADINK = "#faf5ec", "#2c1810", "#5a7d2a", "#2f3d1c", "#f2f0e4"
LINE, LBLBG = "#b8c49a", "#eef0e2"

SECTIONS = [
    ("healthy_fats", "Healthy Fats", "fats"), ("proteins", "Proteins", "proteins"),
    ("vegetables", "Vegetables", "vegetables"), ("fruits", "Fruits", "fruits"),
    ("whole_grains", "Whole Grains", "grains"), ("herbs_spices", "Herbs & Spices", "herbs"),
    ("beverages", "Beverages", "beverages"), ("foods_to_avoid", "Foods to Avoid", None),
]


def box(key, label, art):
    avoid = key == "foods_to_avoid"
    items = "".join(
        f'<li{" class=avoid" if avoid else ""}>{i}</li>' for i in CONTENT[key])
    head_style = "background:#8c2f1f;" if avoid else ""
    spot = ill(art) if art else ""
    return f'''<div class="box{" avoidbox" if avoid else ""}">
      <div class="bhead" style="{head_style}">{label}</div>
      <div class="brow"><ul class="items{" solo" if not spot else ""}">{items}</ul>{spot}</div></div>'''


boxes = "".join(box(k, l, a) for k, l, a in SECTIONS)

html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0; }}
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ -webkit-print-color-adjust:exact; print-color-adjust:exact;
    font-family:'Source Sans 3', Helvetica, sans-serif; background:{BG}; color:{INK}; }}
  .page {{ width:8.5in; height:11in; padding:0.45in 0.5in 0.4in; position:relative; overflow:hidden; }}
  .frame {{ border:2px solid {ACCENT}; border-radius:6px; height:100%; padding:0.28in 0.32in;
    display:flex; flex-direction:column; }}
  .banner {{ background:{HEADBG}; color:{HEADINK}; text-align:center; border-radius:6px;
    padding:12px 8px 10px; }}
  .banner h1 {{ font-family:'Libre Baskerville', Georgia, serif; font-size:26pt; letter-spacing:3px; }}
  .tagline {{ text-align:center; color:{ACCENT}; font-weight:700; letter-spacing:2px;
    font-size:11pt; text-transform:uppercase; margin:8px 0 12px; }}
  .grid {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; flex:1; }}
  .box {{ border:1.5px dashed {ACCENT}; border-radius:6px; background:{BG};
    padding:0 0 6px; overflow:hidden; display:flex; flex-direction:column; }}
  .bhead {{ background:{ACCENT}; color:#fff; font-weight:700; text-align:center;
    font-size:11.5pt; letter-spacing:1.5px; padding:5px 0; margin-bottom:6px; }}
  .brow {{ display:flex; align-items:center; gap:6px; flex:1; padding-right:8px; }}
  .brow .spot {{ width:1.5in; max-height:1.85in; object-fit:contain; flex:0 0 auto; }}
  ul.items {{ list-style:none; padding:0 0 0 12px; flex:1; }}
  ul.items.solo {{ column-count:2; column-gap:8px; padding:0 12px; }}
  ul.items li {{ font-size:9.6pt; line-height:1.5; padding-left:12px; position:relative;
    break-inside:avoid; }}
  ul.items li::before {{ content:"•"; position:absolute; left:0; color:{ACCENT}; font-weight:700; }}
  .avoidbox {{ border-color:#8c2f1f; background:#f5e8e4; }}
  li.avoid::before {{ content:"✕"; color:#8c2f1f; font-size:8pt; top:1.5pt; }}
  .foot {{ text-align:center; font-size:8pt; color:#7a6a55; padding-top:8px; }}
  .foot b {{ color:{ACCENT}; }}
</style></head><body><div class="page"><div class="frame">
  <div class="banner"><h1>MEDITERRANEAN DIET</h1></div>
  <div class="tagline">{CONTENT["tagline"]}</div>
  <div class="grid">{boxes}</div>
  <div class="foot"><b>CarnivoreWeekly.com</b> &nbsp;•&nbsp; For Personal Use Only &nbsp;•&nbsp; Print at 100% Scale (US Letter)</div>
</div></div></body></html>"""


def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(path=str(OUT), width="8.5in", height="11in",
                 margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                 print_background=True, scale=1.0)
        browser.close()
    print(f"built {OUT.name}")


if __name__ == "__main__":
    main()

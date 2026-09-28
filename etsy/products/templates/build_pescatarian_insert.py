#!/usr/bin/env python3
"""Build the pescatarian bonus insert added to the pescatarian Etsy downloads.

Replaces the Carnivore Weekly card on pescatarian listings (Brew, 2026-09-28: "we should be
giving a Pescatarian insert for these listings"). A real bonus rather than an ad: the FDA/EPA
low-mercury seafood chart plus low-carb and buying notes. Chart lists copied from
https://www.fda.gov/food/consumers/advice-about-eating-fish (updated 2024-03-05, checked 2026-09-28).
Output: etsy/products/pdfs/Bonus-Low-Mercury-Seafood-Guide.pdf
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "pdfs" / "Bonus-Low-Mercury-Seafood-Guide.pdf"

BEST = ("Anchovy, Atlantic croaker, Atlantic mackerel, Black sea bass, Butterfish, Catfish, Clam, Cod, Crab, "
        "Crawfish, Flounder, Haddock, Hake, Herring, Lobster, Mullet, Oyster, Pacific chub mackerel, Perch, "
        "Pickerel, Plaice, Pollock, Salmon, Sardine, Scallop, Shad, Shrimp, Skate, Smelt, Sole, Squid, "
        "Tilapia, Freshwater trout, Canned light tuna, Whitefish, Whiting")
GOOD = ("Bluefish, Buffalofish, Carp, Chilean sea bass, Grouper, Halibut, Mahi mahi, Monkfish, Rockfish, "
        "Sablefish, Sheepshead, Snapper, Spanish mackerel, Striped bass (ocean), Tilefish (Atlantic), "
        "Albacore (white) tuna, Yellowfin tuna, Weakfish, White croaker")
AVOID = "King mackerel, Marlin, Orange roughy, Shark, Swordfish, Tilefish (Gulf of Mexico), Bigeye tuna"


def items(csv):
    return "".join(f"<li>{x.strip()}</li>" for x in csv.split(","))


PAGE = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page {{ size: letter; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 8.5in; height: 11in;
    background: #f2f7f7; color: #13292e; font-family: 'Source Sans 3', Helvetica, sans-serif;
    padding: 0.55in 0.6in; display: flex; flex-direction: column; gap: 14px; }}
  .kicker {{ color: #1d6a72; font-weight: 700; letter-spacing: 3px; font-size: 10.5pt; text-transform: uppercase; }}
  h1 {{ font-family: 'Libre Baskerville', Georgia, serif; font-size: 25pt; line-height: 1.15; }}
  .lede {{ font-size: 12pt; line-height: 1.5; color: #3f5a60; max-width: 6.6in; }}
  .cols {{ display: grid; grid-template-columns: 1.25fr 1fr 0.8fr; gap: 12px; margin-top: 4px; }}
  .col {{ background: #fff; border-radius: 12px; padding: 14px 14px 12px; border-top: 7px solid; }}
  .col h2 {{ font-size: 13pt; font-weight: 700; }}
  .col .how {{ font-size: 10pt; font-weight: 600; margin: 2px 0 8px; }}
  .col ul {{ list-style: none; font-size: 10pt; line-height: 1.42; }}
  .best {{ border-color: #2f7d4a; }} .best .how {{ color: #2f7d4a; }}
  .good {{ border-color: #c08a1e; }} .good .how {{ color: #9a6c12; }}
  .avoid {{ border-color: #b3402e; }} .avoid .how {{ color: #b3402e; }}
  .best ul {{ columns: 2; column-gap: 10px; }}
  .notes {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
  .note {{ background: #e2eeee; border-radius: 12px; padding: 12px 14px; font-size: 10.5pt; line-height: 1.45; }}
  .note b {{ display: block; font-size: 11pt; margin-bottom: 3px; color: #1d6a72; }}
  .foot {{ font-size: 8.5pt; line-height: 1.4; color: #587075; margin-top: auto; }}
</style></head>
<body>
  <div class="kicker">Thank you for your order</div>
  <h1>Your bonus: the Low-Mercury Seafood Guide</h1>
  <p class="lede">Fish is the heart of a pescatarian plate, but not all fish is equal on mercury. Keep this next to
  your food list: eat freely from the green column, go easy on the yellow, and skip the red.</p>
  <div class="cols">
    <div class="col best"><h2>Best choices</h2><div class="how">2 to 3 servings a week</div><ul>{items(BEST)}</ul></div>
    <div class="col good"><h2>Good choices</h2><div class="how">1 serving a week</div><ul>{items(GOOD)}</ul></div>
    <div class="col avoid"><h2>Skip these</h2><div class="how">Highest in mercury</div><ul>{items(AVOID)}</ul></div>
  </div>
  <div class="notes">
    <div class="note"><b>Keeping it low carb</b>Plain fish, shrimp, crab, lobster and scallops have almost no carbs.
    Oysters, mussels and clams carry a few grams per serving, so count them. Watch breading, glazes and sweet sauces,
    which is where most seafood carbs hide.</div>
    <div class="note"><b>Buying tips</b>One serving is 4 oz, about the size of your palm. For canned tuna, light has
    less mercury than albacore. Sardines, salmon and anchovies are cheap, low in mercury and high in omega-3s. The
    blue MSC label (wild) and the ASC label (farmed) mark certified sustainable seafood.</div>
  </div>
  <p class="foot">Chart based on the U.S. FDA/EPA "Advice about Eating Fish" (updated March 2024), written for people
  who are or may become pregnant or breastfeeding and for young children. Health Canada's advice is similar. If you are
  pregnant, breastfeeding, or feeding children, follow the chart closely and ask your doctor. This guide is general
  information, not medical advice.</p>
</body></html>"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page()
    page.set_content(PAGE, wait_until="networkidle")
    page.emulate_media(media="print")
    page.pdf(path=str(OUT), width="8.5in", height="11in",
             margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}, print_background=True)
    page.set_viewport_size({"width": 816, "height": 1056})
    page.screenshot(path=str(OUT.with_suffix(".png")), full_page=True)
    browser.close()
print("built", OUT)

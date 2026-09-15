#!/usr/bin/env python3
"""Build the Etsy gallery images for the keto flagship.

Every card is rendered from the SAME page PNGs that came out of the product
PDF, through the same fonts and palette as the product itself. That is the
whole point: the gallery, the video and the thing the buyer downloads cannot
drift apart, because they all come from one render.

Rank 1 is product-first and readable at search-grid size (ISSUE-064). The two
lifestyle composites are gallery depth only and sit at the back.

Inputs : etsy/products/_build/pages/p-*.png  (pdftoppm -r 150 of the letter PDF)
         etsy/products/scene-plates/*.jpg    (empty AI scenes)
Output : etsy/products/listing-images/keto-flagship/NN-name.jpg

Usage:
  python3 etsy/products/templates/build_keto_flagship_gallery.py
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
PAGES = ROOT / "etsy" / "products" / "_build" / "pages"
PLATES = ROOT / "etsy" / "products" / "scene-plates"
CONTENT = ROOT / "etsy" / "products" / "content" / "keto-flagship-content.json"
OUT = ROOT / "etsy" / "products" / "listing-images" / "keto-flagship"
TMP = ROOT / "etsy" / "products" / "_build" / "gallery"

W, H = 2000, 2500  # Etsy likes 2000px on the short side; 4:5 crops well in-grid

FONTS = ("@import url('https://fonts.googleapis.com/css2?"
         "family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap');")

BASE = FONTS + """
* { margin:0; padding:0; box-sizing:border-box; }
:root {
  --green:#2f5233; --green-dark:#1f381f; --green-soft:#e8efe4;
  --cream:#faf7ef; --ink:#23271f; --muted:#6d7268;
}
body { width:%dpx; height:%dpx; font-family:'Nunito',sans-serif; color:var(--ink);
       background:var(--cream); overflow:hidden; }
.wrap { width:100%%; height:100%%; display:flex; flex-direction:column;
        padding:70px 70px 60px; }
h1 { font-family:'Fredoka',sans-serif; font-weight:700; color:var(--green-dark);
     font-size:104px; line-height:1.03; letter-spacing:-1px; }
h1 .thin { color:var(--green); }
.kicker { font-family:'Fredoka',sans-serif; font-size:40px; color:var(--green);
          letter-spacing:5px; text-transform:uppercase; margin-bottom:18px; }
.sub { font-size:44px; line-height:1.34; color:var(--ink); margin-top:22px; font-weight:600; }
.badge { display:inline-block; background:var(--green); color:#fff; font-family:'Fredoka',sans-serif;
         font-size:40px; padding:14px 34px; border-radius:100px; letter-spacing:1px; }
.foot { margin-top:auto; display:flex; justify-content:space-between; align-items:center;
        font-family:'Fredoka',sans-serif; font-size:34px; color:var(--green);
        letter-spacing:2px; border-top:5px solid var(--green); padding-top:26px; }
img.pg { display:block; width:100%%; border:2px solid #dcdcd2; box-shadow:0 18px 44px rgba(0,0,0,.18); }
.full { flex:1; display:flex; align-items:center; justify-content:center; min-height:0; }
.full img { max-height:100%%; width:auto; max-width:100%%; }
"""


def page_uri(n):
    return (PAGES / f"p-{n:02d}.png").as_uri()


def shot(html, out, w=W, h=H):
    TMP.mkdir(parents=True, exist_ok=True)
    f = TMP / (Path(out).stem + ".html")
    f.write_text(f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{BASE % (w, h)}</style>"
                 f"</head><body>{html}</body></html>")
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        pg.goto(f.as_uri(), wait_until="networkidle")
        pg.screenshot(path=str(out), type="jpeg", quality=92)
        b.close()
    print(f"  {Path(out).name}  ({Path(out).stat().st_size//1024} KB)")


def card_hero(total_pages):
    tiles = "".join(
        f'<div class="t" style="z-index:{9-i}"><img class="pg" src="{page_uri(n)}"></div>'
        for i, n in enumerate((1, 2, 6, 14, 19, 21))
    )
    return f"""
    <style>
      .fan {{ flex:1; display:grid; grid-template-columns:repeat(3,1fr);
              grid-template-rows:repeat(2,1fr); gap:30px; min-height:0; margin:34px 0 30px; }}
      .t {{ display:flex; align-items:center; justify-content:center; min-height:0; }}
      .t img {{ max-height:100%; width:auto; max-width:100%; }}
    </style>
    <div class="wrap">
      <div class="kicker">Keto, sorted</div>
      <h1>30-Day Keto<br><span class="thin">Meal Plan</span> &amp; Food Guide</h1>
      <div class="fan">{tiles}</div>
      <div class="foot"><span>{total_pages} PRINTABLE PAGES</span>
        <span>US LETTER + A4</span></div>
    </div>"""


def card_full(n, kicker, title):
    return f"""
    <div class="wrap">
      <div class="kicker">{kicker}</div>
      <h1 style="font-size:78px">{title}</h1>
      <div class="full" style="margin:34px 0 30px"><img class="pg" src="{page_uri(n)}"></div>
      <div class="foot"><span>CARNIVOREWEEKLY.COM</span><span>INSTANT PDF</span></div>
    </div>"""


def card_contents(total_pages):
    tiles = "".join(f'<div class="c"><img class="pg" src="{page_uri(n)}"></div>'
                    for n in range(1, total_pages + 1))
    return f"""
    <style>
      .grid {{ flex:1; display:grid; grid-template-columns:repeat(5,1fr);
               grid-auto-rows:1fr; gap:18px; align-content:stretch;
               min-height:0; margin:30px 0 26px; }}
      .c {{ display:flex; align-items:center; justify-content:center; min-height:0; }}
      .c img {{ max-height:100%; width:auto; max-width:100%;
                box-shadow:0 6px 16px rgba(0,0,0,.14); }}
    </style>
    <div class="wrap">
      <div class="kicker">Everything you get</div>
      <h1 style="font-size:88px">All {total_pages} pages</h1>
      <div class="grid">{tiles}</div>
      <div class="foot"><span>NO CALORIE COUNTING</span><span>PRINT AT HOME</span></div>
    </div>"""


def card_whats_inside(items):
    lis = "".join(f'<li><b>{a}</b><span>{b}</span></li>' for a, b in items)
    return f"""
    <style>
      ul {{ list-style:none; flex:1; display:flex; flex-direction:column;
            justify-content:center; gap:30px; margin:40px 0; }}
      li {{ display:flex; flex-direction:column; gap:8px; border-left:10px solid var(--green);
            padding-left:30px; }}
      li b {{ font-family:'Fredoka',sans-serif; font-size:52px; color:var(--green-dark); }}
      li span {{ font-size:38px; line-height:1.36; color:var(--muted); }}
    </style>
    <div class="wrap">
      <div class="kicker">What's inside</div>
      <h1 style="font-size:84px">A month, <span class="thin">handled</span></h1>
      <ul>{lis}</ul>
      <div class="foot"><span>CARNIVOREWEEKLY.COM</span><span>US LETTER + A4</span></div>
    </div>"""


def composite_scene(page_n, plate, out):
    src = TMP / f"scene-src-{Path(plate).stem}.png"
    shutil.copy(PAGES / f"p-{page_n:02d}.png", src)
    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "composite_product_scene.py"),
         str(src), str(PLATES / plate), str(out)],
        check=True,
    )


def main():
    data = json.loads(CONTENT.read_text())
    total = len(list(PAGES.glob("p-*.png")))
    OUT.mkdir(parents=True, exist_ok=True)
    TMP.mkdir(parents=True, exist_ok=True)
    print(f"Building gallery from {total} rendered pages")

    shot(card_hero(total), OUT / "01-hero.jpg")
    shot(card_full(2, "The food list", "Eat, Limit, Avoid"), OUT / "02-eat-limit-avoid.jpg")
    shot(card_full(6, "The plan", "A week at a time"), OUT / "03-week-one.jpg")
    shot(card_full(14, "The shopping", "Lists that match"), OUT / "04-grocery-list.jpg")
    shot(card_contents(total), OUT / "05-all-pages.jpg")
    shot(card_whats_inside([
        ("30 days of meals", "Breakfast, lunch and dinner, built around leftovers so you cook once and eat twice"),
        ("4 grocery lists", "One per week, matching the menu day for day"),
        ("Eat, Limit, Avoid", "The keto food list in plain language, no jargon"),
        ("Prep, swaps and eating out", "The Sunday hour, what freezes, and how to order in a restaurant"),
        ("A 30-day tracker", "No calories, no macros, no maths"),
    ]), OUT / "06-whats-inside.jpg")

    for n, plate, name in ((2, "fridge-final.jpg", "07-on-the-fridge.jpg"),
                           (6, "clipboard-final.jpg", "08-in-the-kitchen.jpg")):
        composite_scene(n, plate, OUT / name)

    print(f"\n  {len(list(OUT.glob('*.jpg')))} images -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

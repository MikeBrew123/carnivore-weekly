#!/usr/bin/env python3
"""Render 2000x2000 Etsy hero images for the meal-plan products.

Content is drawn from the actual product config + prose, so images always
match the real product (no mockups, no fabricated content).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from build_mealplans import CONFIGS, PROSE

OUT = Path(__file__).parent / "heroes"
OUT.mkdir(exist_ok=True)

HTML = """<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ width:2000px; height:2000px; background:{ACCENT}; font-family:{BODY_FONT};
  -webkit-print-color-adjust:exact; display:flex; align-items:center; justify-content:center; }}
.sheet {{ width:1560px; height:1720px; background:{BG}; border-radius:28px; padding:110px 120px;
  box-shadow:0 40px 90px rgba(0,0,0,0.35); color:{INK}; position:relative; }}
.kicker {{ color:{ACCENT}; font-weight:700; letter-spacing:8px; font-size:34px; text-transform:uppercase; }}
h1 {{ font-family:{HEAD_FONT}; font-size:{TITLE_SIZE}px; line-height:1.08; margin:36px 0 24px; }}
.sub {{ font-size:44px; color:{SOFT}; line-height:1.4; }}
.rule {{ border-bottom:10px solid {ACCENT}; margin:52px 0; }}
ul {{ list-style:none; }}
li {{ font-size:44px; line-height:1.45; padding-left:70px; position:relative; margin-bottom:34px; }}
li::before {{ content:"✓"; position:absolute; left:0; color:{ACCENT}; font-weight:700; }}
.badges {{ display:flex; gap:28px; margin-top:60px; flex-wrap:wrap; }}
.badge {{ background:{HEADBG}; color:{HEADINK}; font-weight:700; font-size:36px;
  padding:22px 40px; border-radius:ec14px; border-radius:14px; letter-spacing:1px; }}
.foot {{ position:absolute; bottom:70px; left:120px; right:120px; display:flex;
  justify-content:space-between; font-size:36px; color:{SOFT}; border-top:5px solid {LINE}; padding-top:34px; }}
.foot b {{ color:{ACCENT}; }}
</style></head><body>
<div class="sheet">
  <div class="kicker">{BRAND} · Printable PDF</div>
  <h1>{TITLE}</h1>
  <div class="sub">{TAGLINE}</div>
  <div class="rule"></div>
  <ul>{ITEMS}</ul>
  <div class="badges">{BADGES}</div>
  <div class="foot"><b>{URL}</b><span>Instant digital download</span></div>
</div></body></html>"""

BADGES = {
    "carnivore": ["30 DAYS", "MACROS COMPUTED", "TRACKER INCLUDED"],
    "keto": ["28 DAYS", "1500 CALORIES", "UNDER 25G NET CARBS"],
    "lowcarb": ["28 DAYS", "1500 CALORIES", "WHOLE FOODS"],
    "lion": ["30-DAY PROTOCOL", "REINTRODUCTION PLAN", "SYMPTOM JOURNAL"],
    "pescatarian": ["30 DAYS", "SEAFOOD FORWARD", "LOW CARB"],
    "mediterranean": ["7 DAYS", "ONE GROCERY LIST", "WHOLE FOODS"],
}

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 2000, "height": 2000})
    for key, cfg in CONFIGS.items():
        t = cfg["theme"]
        pr = PROSE.get(key, {})
        items = "".join(f"<li>{x}</li>" for x in pr.get("inside", [])[:4])
        badges = "".join(f'<div class="badge">{b}</div>' for b in BADGES[key])
        title = cfg["title"] + (f', {cfg["subtitle_kcal"]}' if cfg.get("subtitle_kcal") else "")
        html = HTML.format(TITLE=title, TAGLINE=pr.get("tagline", ""), ITEMS=items,
                           BADGES=badges, TITLE_SIZE=104 if len(title) < 34 else 88, **t)
        page.set_content(html, wait_until="networkidle")
        out = OUT / f"hero-{key}.png"
        page.screenshot(path=str(out))
        print("built", out.name)
    browser.close()

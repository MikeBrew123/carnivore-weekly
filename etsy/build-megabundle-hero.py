#!/usr/bin/env python3
"""Build the Mega Bundle (listing 4495089980) hero image.

Replaces the live hero that says "7 PDFs" three times and carries a contents note
listing only 3 cheat sheets + 4 how-to guides. The bundle has shipped 9 PDFs since
the two 30-day trackers were added in July 2026.

Per the global rule in CLAUDE.md: NO AI-generated mockups. Every product thumbnail
here is a real page render of the actual shipped PDF, taken straight out of
etsy/products/pdfs/mega-bundle-9-pdfs.zip with pdftoppm. The chrome around them is
plain HTML, screenshotted with Playwright.

  python3 etsy/build-megabundle-hero.py            # -> etsy/products/mockups/megabundle-hero.jpg
  python3 etsy/build-megabundle-hero.py --out FILE
"""
import argparse, base64, io, subprocess, sys, tempfile, zipfile
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
ZIP = REPO / "etsy/products/pdfs/mega-bundle-9-pdfs.zip"

# (pdf stem, display label, kind) — order is the order they appear in the grid
ITEMS = [
    ("cheatsheet-keto-v1",       "Keto Cheat Sheet",      "sheet"),
    ("cheatsheet-carnivore-v1",  "Carnivore Cheat Sheet", "sheet"),
    ("cheatsheet-lowcarb-v1",    "Low Carb Cheat Sheet",  "sheet"),
    ("howto-keto-v1",            "How To Keto",           "guide"),
    ("howto-carnivore-v1",       "How To Carnivore",      "guide"),
    ("howto-lowcarb-v1",         "How To Low Carb",       "guide"),
    ("howto-lion-v1",            "How To Lion Diet",      "guide"),
    ("keto-30-day-tracker",      "30-Day Keto Tracker",   "tracker"),
    ("carnivore-30-day-tracker", "30-Day Carnivore Tracker", "tracker"),
]

CREAM, NAVY, GREEN, GOLD = "#f7f4ec", "#12233f", "#2f5d2a", "#c8a238"


def render_pages(workdir: Path) -> dict:
    """Unzip the shipped bundle and render page 1 of every PDF. Verifies the count."""
    with zipfile.ZipFile(ZIP) as z:
        names = [n for n in z.namelist() if n.lower().endswith(".pdf")]
        if len(names) != 9:
            sys.exit(f"REFUSING: zip holds {len(names)} PDFs, the hero claims 9. Fix one or the other.")
        z.extractall(workdir)
    stems = {Path(n).stem for n in names}
    missing = {s for s, _, _ in ITEMS} - stems
    if missing:
        sys.exit(f"REFUSING: these are in the layout but not in the zip: {sorted(missing)}")
    out = {}
    for stem, _, _ in ITEMS:
        subprocess.run(["pdftoppm", "-png", "-r", "110", "-f", "1", "-l", "1",
                        str(workdir / f"{stem}.pdf"), str(workdir / stem)], check=True)
        png = next(workdir.glob(f"{stem}-*.png"))
        im = Image.open(png).convert("RGB")
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=88)
        out[stem] = base64.b64encode(buf.getvalue()).decode()
    return out


def card(stem, label, kind, b64):
    tone = {"sheet": GREEN, "guide": NAVY, "tracker": "#8c2f1d"}[kind]
    return f"""
      <figure class="card {kind}">
        <div class="shot"><img src="data:image/jpeg;base64,{b64[stem]}"></div>
        <figcaption style="background:{tone}">{label}</figcaption>
      </figure>"""


def build_html(b64):
    sheets = "".join(card(s, l, k, b64) for s, l, k in ITEMS if k == "sheet")
    guides = "".join(card(s, l, k, b64) for s, l, k in ITEMS if k == "guide")
    tracks = "".join(card(s, l, k, b64) for s, l, k in ITEMS if k == "tracker")
    return f"""<!doctype html><meta charset="utf-8"><style>
  * {{ box-sizing:border-box; margin:0; padding:0 }}
  body {{ width:1536px; height:1024px; background:{CREAM};
         font-family:"Avenir Next Condensed","Avenir Next",Helvetica,sans-serif;
         display:flex; flex-direction:column; overflow:hidden }}
  .masthead {{ text-align:center; padding:18px 0 10px }}
  .kicker {{ font-size:31px; font-weight:800; letter-spacing:.045em; color:{NAVY} }}
  .title  {{ font-size:63px; font-weight:900; letter-spacing:.012em; color:{GREEN}; line-height:.97 }}
  .mega   {{ display:inline-block; margin-top:9px; background:{NAVY}; color:#fff; font-size:33px;
             font-weight:900; letter-spacing:.30em; padding:6px 40px 6px 46px; border-radius:4px }}
  .count  {{ display:inline-block; margin-top:9px; background:{GREEN}; color:#fff; font-size:21px;
             font-weight:700; letter-spacing:.05em; padding:6px 26px; border-radius:20px }}
  .count b {{ color:#ffd85e; font-size:24px }}
  main {{ flex:1; display:flex; gap:20px; padding:6px 26px 0 30px; min-height:0 }}
  .grid {{ flex:1; display:flex; flex-direction:column; gap:9px; min-height:0 }}
  .band {{ display:flex; align-items:center; gap:10px }}
  .band h2 {{ font-size:15px; font-weight:800; letter-spacing:.14em; color:{NAVY}; white-space:nowrap }}
  .band .rule {{ flex:1; height:2px; background:#d8d2c2 }}
  .row {{ display:flex; gap:11px; min-height:0 }}
  .card {{ flex:1; display:flex; flex-direction:column; min-height:0 }}
  .shot {{ flex:1; border:2px solid #ded8c8; background:#fff; overflow:hidden;
           display:flex; align-items:flex-start; justify-content:center;
           box-shadow:0 2px 5px rgba(0,0,0,.10) }}
  .shot img {{ width:100%; display:block }}
  figcaption {{ color:#fff; font-size:14px; font-weight:700; letter-spacing:.035em;
                text-align:center; padding:4px 2px }}
  aside {{ width:296px; display:flex; flex-direction:column; gap:11px }}
  .big {{ background:{NAVY}; color:#fff; border-radius:9px; padding:16px 12px 18px; text-align:center }}
  .big .n {{ font-size:82px; font-weight:900; color:#ffd85e; line-height:.9 }}
  .big .w {{ font-size:20px; font-weight:800; letter-spacing:.16em; margin-top:4px }}
  .big .s {{ font-size:15px; font-weight:600; letter-spacing:.10em; margin-top:9px;
             border-top:1px solid rgba(255,255,255,.28); padding-top:9px; line-height:1.45 }}
  .note {{ border:2px solid {GOLD}; border-radius:9px; padding:12px 13px; background:#fffdf5 }}
  .note h3 {{ font-size:14px; font-weight:800; letter-spacing:.12em; color:#8a6d15; margin-bottom:6px }}
  .note p {{ font-size:14.5px; line-height:1.5; color:#333 }}
  .note ul {{ margin:5px 0 0 15px }}
  .note li {{ font-size:14.5px; line-height:1.52; color:#333 }}
  .note .no {{ margin-top:8px; font-size:13.5px; color:#7a2f22; font-weight:700 }}
  .spec {{ border:2px solid #ded8c8; border-radius:9px; background:#fff; padding:4px 12px }}
  .spec .r {{ display:flex; justify-content:space-between; align-items:baseline;
              padding:7px 0; border-bottom:1px solid #eee9dc; font-size:13.5px }}
  .spec .r:last-child {{ border-bottom:0 }}
  .spec b {{ color:#8a8272; letter-spacing:.10em; font-size:11.5px; font-weight:800 }}
  .spec span {{ color:#12233f; font-weight:700 }}
  footer {{ display:flex; align-items:center; justify-content:center; gap:16px;
            background:{NAVY}; color:#fff; margin:10px 0 0; padding:11px 0 }}
  footer span {{ font-size:19px; font-weight:800; letter-spacing:.10em }}
  footer i {{ color:{GOLD}; font-style:normal; font-size:16px }}
</style>
<div class="masthead">
  <div class="kicker">LOW CARB &amp; CARNIVORE</div>
  <div class="title">DIET FRIDGE SYSTEM</div>
  <div class="mega">MEGA BUNDLE</div>
  <div class="count"><b>9 PDFs</b> &nbsp;•&nbsp; 3 CHEAT SHEETS + 4 HOW-TO GUIDES + 2 30-DAY TRACKERS</div>
</div>
<main>
  <div class="grid">
    <div class="band"><h2>3 CHEAT SHEETS</h2><div class="rule"></div></div>
    <div class="row" style="flex:2.45">{sheets}</div>
    <div class="band"><h2>4 HOW-TO GUIDES</h2><div class="rule"></div></div>
    <div class="row" style="flex:2.30">{guides}</div>
    <div class="band"><h2>2 30-DAY TRACKERS</h2><div class="rule"></div></div>
    <div class="row" style="flex:1.95">{tracks}</div>
  </div>
  <aside>
    <div class="big">
      <div class="n">9</div><div class="w">PDFS</div>
      <div class="s">INSTANT DOWNLOAD<br>PRINT AT HOME</div>
    </div>
    <div class="note">
      <h3>WHAT YOU GET</h3>
      <ul>
        <li>3 Cheat Sheets — keto, carnivore, low carb</li>
        <li>4 How-To Guides — keto, carnivore, low carb, lion</li>
        <li>2 30-Day Trackers — keto, carnivore</li>
      </ul>
      <p class="no">No Lion cheat sheet is included. The Lion diet comes as the how-to guide only.</p>
    </div>
    <div class="spec">
      <div class="r"><b>FORMAT</b><span>9 print-ready PDFs</span></div>
      <div class="r"><b>DELIVERY</b><span>Instant download</span></div>
      <div class="r"><b>SHIPPING</b><span>None. Nothing physical.</span></div>
      <div class="r"><b>PRINTS</b><span>At home or any print shop</span></div>
    </div>
  </aside>
</main>
<footer>
  <span>DOWNLOAD</span><i>&#9654;</i><span>PRINT</span><i>&#9654;</i><span>STICK</span>
  <i>&#9654;</i><span>FOLLOW</span><i>&#9654;</i><span>GET RESULTS</span>
</footer>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(REPO / "etsy/products/mockups/megabundle-hero.jpg"),
                    help="output JPEG (default: etsy/products/mockups/megabundle-hero.jpg)")
    a = ap.parse_args()
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        wd = Path(td)
        b64 = render_pages(wd)
        html = wd / "hero.html"
        html.write_text(build_html(b64))
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 1536, "height": 1024}, device_scale_factor=2)
            pg.goto(f"file://{html}")
            pg.wait_for_timeout(700)
            shot = wd / "hero.png"
            pg.screenshot(path=str(shot))
            b.close()
        im = Image.open(shot).convert("RGB")
        im.save(a.out, "JPEG", quality=93)
        print(f"{a.out}  {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    main()

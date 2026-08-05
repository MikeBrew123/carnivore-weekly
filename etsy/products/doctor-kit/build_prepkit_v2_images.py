#!/usr/bin/env python3
"""Listing images for the Doctor Visit Prep Kit v2 (2026-08-05 design rebuild).

HARD RULE (Brew's lessons-learned): the product shown is always REAL rendered
page screenshots (etsy/products/doctor-kit/_pages/prepkit-NN.png, 200 dpi from
the shipping PDF). AI (Replicate flux-schnell) generated only the EMPTY scenes
in scenes/; real pages are composited onto them with Pillow.

Six graphic canvases are authored as HTML and screenshotted with Playwright
(same fonts/palette as the product itself); two are Pillow scene composites.

Output: listing-images/prepkit2-0*.jpg (2000x2000, ordered per the roadmap's
listing-image formula).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
PAGES = HERE / "_pages"
SCENES = HERE / "scenes"
OUT = HERE / "listing-images"
OUT.mkdir(exist_ok=True)

CANVAS = 2000


def page(n: int) -> Path:
    return PAGES / f"prepkit-{n:02d}.png"


# ---------------------------------------------------------------- Pillow bits
def shadowed(img: Image.Image, width: int, rotate: float = 0.0) -> Image.Image:
    scale = width / img.width
    im = img.resize((width, int(img.height * scale)), Image.LANCZOS)
    pad = 80
    base = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle(
        [pad + 10, pad + 16, pad + im.width + 10, pad + im.height + 16],
        fill=(0, 0, 0, 90),
    )
    sh = sh.filter(ImageFilter.GaussianBlur(16))
    base.alpha_composite(sh)
    base.paste(im, (pad, pad))
    if rotate:
        base = base.rotate(rotate, expand=True, resample=Image.BICUBIC)
    return base


def desk_mockup():
    """Scene 1: overhead white desk; real page 6 (diet summary) on the blank spot."""
    scene = Image.open(SCENES / "scene-desk.jpg").convert("RGBA").resize((CANVAS, CANVAS), Image.LANCZOS)
    card = shadowed(Image.open(page(6)), 760, rotate=-2.5)
    scene.alpha_composite(card, (560, 500))
    scene.convert("RGB").save(OUT / "prepkit2-02-desk-mockup.jpg", quality=90)


def clipboard_mockup():
    """Scene 2: hands holding clipboard; real page 3 (checklist) on the board."""
    scene = Image.open(SCENES / "scene-clipboard.jpg").convert("RGBA").resize((CANVAS, CANVAS), Image.LANCZOS)
    # clipboard paper area in the 2000px scene: roughly x 700-1420, y 660-1620
    pg = Image.open(page(3)).convert("RGBA")
    w = 660
    im = pg.resize((w, int(pg.height * w / pg.width)), Image.LANCZOS)
    scene.alpha_composite(im, (700, 680))
    scene.convert("RGB").save(OUT / "prepkit2-06-clipboard-mockup.jpg", quality=90)


# ------------------------------------------------------------- HTML canvases
BASE_CSS = """
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 2000px; height: 2000px; font-family: 'Source Sans 3', Helvetica, Arial, sans-serif;
       background: #FAFAF8; overflow: hidden; position: relative; }
.badge { position: absolute; top: 70px; right: 70px; background: #2E7D5B; color: #fff;
         font-size: 34px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;
         padding: 22px 44px; border-radius: 60px; z-index: 5;
         box-shadow: 0 10px 30px rgba(0,0,0,0.18); }
.pagecard { background: #fff; box-shadow: 0 30px 80px rgba(15,35,52,0.35); border-radius: 6px; }
img.pg { display: block; width: 100%; border-radius: 6px; }
h1 { color: #fff; font-weight: 700; }
.footbrand { position: absolute; bottom: 56px; left: 0; right: 0; text-align: center;
             font-size: 30px; letter-spacing: 6px; color: rgba(255,255,255,0.85);
             text-transform: uppercase; font-weight: 600; z-index: 5; }
.footbrand.dark { color: #52606D; }
</style>
"""

def html_hero(p):
    return BASE_CSS + f"""
<body style="background: linear-gradient(150deg,#2C5F8A 0%,#24506F 55%,#1F4666 100%);">
  <svg style="position:absolute;inset:0;" width="2000" height="2000">
    <circle cx="1750" cy="240" r="420" fill="#35709F" opacity="0.5"/>
    <circle cx="150" cy="1850" r="500" fill="#254F72" opacity="0.7"/>
  </svg>
  <div class="badge">Instant Download</div>
  <div style="position:absolute; left:110px; top:250px; width:820px; z-index:4;">
    <div style="font-size:34px; letter-spacing:7px; color:#9FC2DD; font-weight:600; text-transform:uppercase; margin-bottom:36px;">Doctor Visit Prep Kit</div>
    <h1 style="font-size:104px; line-height:1.08;">Walk in organized.</h1>
    <h1 style="font-size:104px; line-height:1.08; color:#A8D5BD; margin-top:10px;">Walk out with answers.</h1>
    <div style="font-size:42px; color:#D7E5F0; margin-top:48px; line-height:1.45;">The 12-page appointment prep kit for anyone changing how they eat while under a doctor's care.</div>
    <div style="display:inline-block; margin-top:52px; border:3px solid #A8D5BD; color:#A8D5BD; font-size:34px; font-weight:700; letter-spacing:3px; padding:18px 36px; border-radius:14px;">LOW-CARB EDITION &bull; PRINTABLE PDF</div>
  </div>
  <div class="pagecard" style="position:absolute; right:120px; top:190px; width:900px; transform:rotate(2deg);">
    <img class="pg" src="{page(1).as_uri()}">
  </div>
  <div class="footbrand">Carnivore Weekly &bull; carnivoreweekly.com</div>
</body>"""


def html_closeup(p):
    return BASE_CSS + f"""
<body style="background: linear-gradient(160deg,#EAF3EE 0%,#DCEAE1 100%);">
  <div class="badge">Page 6 of 12</div>
  <div style="position:absolute; left:110px; top:170px; width:760px; z-index:4;">
    <div style="font-size:32px; letter-spacing:6px; color:#2E7D5B; font-weight:700; text-transform:uppercase; margin-bottom:30px;">The heart of the kit</div>
    <div style="font-size:88px; line-height:1.12; font-weight:700; color:#1F2933;">The one-page summary your doctor reads in <span style="color:#2C5F8A;">30 seconds</span>.</div>
    <div style="font-size:40px; color:#52606D; margin-top:44px; line-height:1.5;">No defending. No convincing. Hand it over at the start of the visit and let it do the talking.</div>
  </div>
  <div class="pagecard" style="position:absolute; right:110px; top:120px; width:980px; transform:rotate(-1.5deg);">
    <img class="pg" src="{page(6).as_uri()}">
  </div>
  <div class="footbrand dark">Real page from the kit &bull; Carnivore Weekly</div>
</body>"""


def html_contents(p):
    cells = ""
    labels = ["Cover", "How to use it", "Before-visit checklist", "Medications worksheet",
              "Supplements & allergies", "One-page diet summary", "Baseline labs sheet",
              "12 questions to ask", "Symptoms to mention", "Visit notes",
              "Between-visits parking lot", "Fine print + resources"]
    for i in range(12):
        cells += f"""
    <div style="text-align:center;">
      <img src="{page(i+1).as_uri()}" style="width:100%; border-radius:4px; box-shadow:0 8px 20px rgba(15,35,52,0.28); background:#fff;">
      <div style="font-size:23px; font-weight:600; color:#E5EEF5; margin-top:10px; white-space:nowrap;">{i+1}. {labels[i]}</div>
    </div>"""
    return BASE_CSS + f"""
<body style="background: linear-gradient(150deg,#2C5F8A 0%,#1F4666 100%);">
  <div style="text-align:center; padding-top:64px;">
    <h1 style="font-size:74px;">Everything inside the kit</h1>
    <div style="font-size:36px; color:#A8D5BD; font-weight:600; margin-top:14px;">12 pages &bull; US Letter PDF &bull; fill in by hand, once per appointment</div>
  </div>
  <div style="display:grid; grid-template-columns:repeat(4,368px); justify-content:center; gap:26px 36px; padding-top:48px;">{cells}</div>
</body>"""


def html_steps(p):
    def col(n, tag, color, title, txt):
        return f"""
    <div style="width:540px; text-align:center;">
      <div style="display:inline-block; background:{color}; color:#fff; font-size:30px; font-weight:700; letter-spacing:3px; text-transform:uppercase; padding:14px 36px; border-radius:40px; margin-bottom:34px;">{tag}</div>
      <img src="{page(n).as_uri()}" style="width:100%; border-radius:6px; box-shadow:0 18px 44px rgba(15,35,52,0.25); background:#fff;">
      <div style="font-size:37px; font-weight:700; color:#1F2933; margin-top:30px;">{title}</div>
      <div style="font-size:29px; color:#52606D; margin-top:12px; line-height:1.45;">{txt}</div>
    </div>"""
    return BASE_CSS + f"""
<body>
  <div style="text-align:center; padding-top:100px;">
    <h1 style="font-size:84px; color:#1F2933;">One kit. Three moments.</h1>
    <div style="font-size:40px; color:#52606D; margin-top:18px;">Nothing to track daily. Use it once per appointment.</div>
  </div>
  <div style="display:flex; justify-content:center; gap:70px; margin-top:90px;">
    {col(3, 'Before', '#2C5F8A', 'Get organized', 'Checklists and worksheets, filled in a few days ahead')}
    {col(10, 'During', '#2C5F8A', 'Capture what matters', 'Write down what your doctor actually said')}
    {col(11, 'After', '#2E7D5B', 'Never lose a question', 'Park late questions for the next visit')}
  </div>
  <div class="footbrand dark">Carnivore Weekly &bull; Doctor Visit Prep Kit</div>
</body>"""


def html_format(p):
    return BASE_CSS + f"""
<body style="background: linear-gradient(160deg,#E9F0F6 0%,#DCE7F0 100%);">
  <div class="pagecard" style="position:absolute; left:130px; top:230px; width:880px; transform:rotate(-2deg);">
    <img class="pg" src="{page(4).as_uri()}">
  </div>
  <div style="position:absolute; right:110px; top:260px; width:780px;">
    <div style="font-size:88px; font-weight:700; color:#1F2933; line-height:1.15;">Print at home in minutes</div>
    <div style="margin-top:64px; display:flex; flex-direction:column; gap:40px;">
      <div style="display:flex; gap:26px; align-items:center;"><div style="width:74px;height:74px;border-radius:18px;background:#2C5F8A;color:#fff;font-size:38px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;">8.5</div><div style="font-size:40px; color:#1F2933; font-weight:600;">US Letter (8.5 x 11 in) PDF</div></div>
      <div style="display:flex; gap:26px; align-items:center;"><div style="width:74px;height:74px;border-radius:18px;background:#2C5F8A;color:#fff;font-size:34px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;">B/W</div><div style="font-size:40px; color:#1F2933; font-weight:600;">Prints beautifully in black &amp; white</div></div>
      <div style="display:flex; gap:26px; align-items:center;"><div style="width:74px;height:74px;border-radius:18px;background:#2E7D5B;color:#fff;font-size:38px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;">Aa</div><div style="font-size:40px; color:#1F2933; font-weight:600;">Large, easy-to-read type. No squinting.</div></div>
      <div style="display:flex; gap:26px; align-items:center;"><div style="width:74px;height:74px;border-radius:18px;background:#2E7D5B;color:#fff;font-size:38px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none;">&#8635;</div><div style="font-size:40px; color:#1F2933; font-weight:600;">Reprint fresh for every appointment</div></div>
    </div>
  </div>
  <div class="footbrand dark">Digital download &bull; no physical product shipped</div>
</body>"""


def html_trust(p):
    ic = 'width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="#A8D5BD" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
    return BASE_CSS + f"""
<body style="background: linear-gradient(150deg,#2C5F8A 0%,#1F4666 100%);">
  <div style="height:2000px; display:flex; flex-direction:column; justify-content:center; padding:0 110px 60px;">
    <div style="text-align:center;">
      <h1 style="font-size:96px;">Instant download</h1>
      <div style="font-size:44px; color:#A8D5BD; font-weight:600; margin-top:22px;">Ready to print the moment you buy</div>
    </div>
    <div style="display:flex; justify-content:center; gap:56px; margin-top:130px;">
      <div style="flex:1; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.25); border-radius:24px; padding:70px 40px 64px; text-align:center;">
        <svg {ic}><path d="M12 3 v12 M6.5 9.5 L12 15 l5.5-5.5"/><path d="M4 17.5 v2 A1.5 1.5 0 0 0 5.5 21 h13 a1.5 1.5 0 0 0 1.5-1.5 v-2"/></svg>
        <div style="font-size:42px; color:#fff; font-weight:700; margin-top:34px;">Download instantly</div>
        <div style="font-size:31px; color:#C9DAE8; margin-top:18px; line-height:1.45;">The PDF arrives the moment your order completes</div>
      </div>
      <div style="flex:1; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.25); border-radius:24px; padding:70px 40px 64px; text-align:center;">
        <svg {ic}><path d="M7 8 V3.5 h10 V8"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 13.5 h10 V20.5 H7 Z" fill="#1F4666"/><circle cx="17" cy="11" r="0.9" fill="#A8D5BD" stroke="none"/></svg>
        <div style="font-size:42px; color:#fff; font-weight:700; margin-top:34px;">Print at home</div>
        <div style="font-size:31px; color:#C9DAE8; margin-top:18px; line-height:1.45;">No shipping, no waiting, nothing physical arrives</div>
      </div>
      <div style="flex:1; background:rgba(255,255,255,0.08); border:2px solid rgba(255,255,255,0.25); border-radius:24px; padding:70px 40px 64px; text-align:center;">
        <svg {ic}><path d="M20 12 a8 8 0 1 1 -2.3-5.6"/><path d="M18.5 2.5 v4 h-4"/></svg>
        <div style="font-size:42px; color:#fff; font-weight:700; margin-top:34px;">Reuse forever</div>
        <div style="font-size:31px; color:#C9DAE8; margin-top:18px; line-height:1.45;">Print a fresh kit for every appointment, for personal use</div>
      </div>
    </div>
    <div style="text-align:center; margin-top:140px;">
      <div style="display:inline-block; background:#2E7D5B; color:#fff; font-size:36px; font-weight:700; letter-spacing:2px; padding:28px 64px; border-radius:60px;">Education + your own notes. Never medical advice.</div>
    </div>
  </div>
  <div class="footbrand">Carnivore Weekly &bull; by Sarah Whitfield, Health Coach</div>
</body>"""


HTML_IMAGES = {
    "prepkit2-01-hero.jpg": html_hero,
    "prepkit2-03-closeup.jpg": html_closeup,
    "prepkit2-04-contents-grid.jpg": html_contents,
    "prepkit2-05-how-it-works.jpg": html_steps,
    "prepkit2-07-format.jpg": html_format,
    "prepkit2-08-trust.jpg": html_trust,
}


def build_html_canvases():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        pg = browser.new_page(viewport={"width": CANVAS, "height": CANVAS})
        for name, fn in HTML_IMAGES.items():
            tmp = OUT / "_canvas.html"
            tmp.write_text(fn(None))
            pg.goto(tmp.as_uri())
            pg.wait_for_timeout(1400)
            pg.screenshot(path=str(OUT / name.replace(".jpg", ".png")))
            im = Image.open(OUT / name.replace(".jpg", ".png")).convert("RGB")
            im.save(OUT / name, quality=90)
            (OUT / name.replace(".jpg", ".png")).unlink()
            print("built", name)
        tmp.unlink()
        browser.close()


if __name__ == "__main__":
    desk_mockup()
    print("built prepkit2-02-desk-mockup.jpg")
    clipboard_mockup()
    print("built prepkit2-06-clipboard-mockup.jpg")
    build_html_canvases()

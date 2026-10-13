"""Screenshot real pages of the rendered report (letter width, 2x). The cover is
masked below its own content so the stubbed AI section never shows."""
import sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
W = sys.argv[1]
targets = {'cover': None, 'meal': 'Week 1: Adaptation', 'grocery': 'Week 1 Shopping List',
           'physician': 'SECTION 1: The Opening Script', 'lab': 'Report #9:', 'stall': 'Report #12:'}
TOP = "t=>[...document.querySelectorAll('h2')].find(e=>e.textContent.includes(t)).getBoundingClientRect().top+window.scrollY"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 816, 'height': 1056}, device_scale_factor=2)
    pg.goto(f'file://{W}/report.html'); pg.wait_for_timeout(500)
    for k, t in targets.items():
        y = 0 if t is None else pg.evaluate(TOP, t) - 24
        pg.screenshot(path=f'{W}/shots/{k}.png', clip={'x': 0, 'y': y, 'width': 816, 'height': 1056}, full_page=True)
    cut = int((pg.evaluate(TOP, 'Report #1:') - 30) * 2)
    b.close()
im = Image.open(f'{W}/shots/cover.png').convert('RGB')
ImageDraw.Draw(im).rectangle([0, cut, im.width, im.height], fill='white'); im.save(f'{W}/shots/cover.png')

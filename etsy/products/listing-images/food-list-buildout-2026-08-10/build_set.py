#!/usr/bin/env python3
"""Build Etsy supporting listing images (ranks 3-8) for the food-list listings.

Composite approach only: every product surface shown is the REAL product file
(live listing hero art or a pdftoppm render of the shipped PDF). Nothing is
AI-generated. Scenes are either real photo assets from the repo or drawn.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, sys

S = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(S, 'out')
os.makedirs(OUT, exist_ok=True)

W = H = 2000
FONT_DIR = '/System/Library/Fonts/Supplemental'
BLACK = os.path.join(FONT_DIR, 'Arial Black.ttf')
BOLD = os.path.join(FONT_DIR, 'Arial Bold.ttf')
REG = os.path.join(FONT_DIR, 'Arial.ttf')

def f(path, size):
    return ImageFont.truetype(path, size)

def tw(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0], b[3] - b[1]

def ctext(draw, text, y, font, fill, w=W, x0=0):
    width, _ = tw(draw, text, font)
    draw.text((x0 + (w - width) // 2, y), text, font=font, fill=fill)

def track(draw, text, y, font, fill, spacing, w=W, x0=0):
    """Letter-spaced centered text."""
    widths = [tw(draw, c, font)[0] for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = x0 + (w - total) // 2
    for c, cw in zip(text, widths):
        draw.text((x, y), c, font=font, fill=fill)
        x += cw + spacing

def shadow_card(base, img, xy, radius=18, blur=26, alpha=70, pad=30):
    """Paste img at xy with a soft drop shadow behind it."""
    x, y = xy
    sh = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.rounded_rectangle([pad, pad + 10, pad + img.width, pad + img.height + 14],
                        radius=radius, fill=(60, 40, 30, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.paste(sh, (x - pad, y - pad), sh)
    base.paste(img, (x, y))

def fit_h(img, h):
    return img.resize((max(1, int(img.width * h / img.height)), h), Image.LANCZOS)

def fit_w(img, w):
    return img.resize((w, max(1, int(img.height * w / img.width))), Image.LANCZOS)


# ────────────────────────────────────────────────────────────────
# Per-product config. Facts here are verified against the live
# listing files endpoint and pdfinfo, not assumed.
# ────────────────────────────────────────────────────────────────
CFG = {
    'carnivore': {
        'slug': 'carnivore',
        'listing_id': 4464217679,
        'chart': os.path.join(S, 'current/carn-1.jpg'),
        'bonus': os.path.join(S, 'src/bonus-insert-carnivore-1.png'),
        'brand': (144, 1, 7),
        'ink': (32, 26, 24),
        'cream': (247, 243, 238),
        'name': 'CARNIVORE DIET FOOD LIST',
        'cats': ['Beef', 'Pork', 'Poultry', 'Fish & Seafood', 'Eggs & Dairy',
                 'Animal Fats', 'Organ Meats', 'Seasonings & Salt', 'Beverages'],
        'n_cats': '9 CATEGORIES',
        'n_foods': '45+ FOODS',
        'zoom_crops': [
            # (left, top, right, bottom) in chart pixel space, label
            ((28, 428, 988, 968), 'BEEF'),
            ((28, 2055, 988, 2524), 'ORGAN MEATS'),
        ],
    },
    'pescatarian': {
        'slug': 'pescatarian',
        'listing_id': 4464217699,
        'chart': os.path.join(S, 'current/pesc-1.jpg'),
        'bonus': os.path.join(S, 'src/bonus-insert-carnivore-1.png'),
        'brand': (31, 92, 107),
        'ink': (32, 30, 26),
        'cream': (251, 244, 230),
        'name': 'PESCATARIAN LOW CARB FOOD LIST',
        'cats': ['Fresh Fish', 'Shellfish', 'Low Carb Vegetables', 'Berries',
                 'Eggs & Dairy', 'Healthy Fats', 'Condiments', 'Beverages'],
        'n_cats': '8 CATEGORIES',
        'n_foods': '55+ FOODS',
        'zoom_crops': [
            ((100, 440, 1140, 1130), 'FRESH FISH'),
            ((100, 1800, 1140, 2432), 'SHELLFISH'),
        ],
    },
}


def img03_zoom(c):
    """Legibility proof: real crops from the real file, enlarged."""
    im = Image.new('RGB', (W, H), c['cream'])
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 210], fill=c['brand'])
    ctext(d, 'ACTUALLY READABLE', 52, f(BLACK, 88), (255, 255, 255))
    track(d, 'REAL DETAIL FROM THE REAL FILE', 156, f(BOLD, 28), (255, 255, 255), 8)

    chart = Image.open(c['chart']).convert('RGB')
    gap = 70
    avail = 1560                      # usable band between the header and the caption
    width = 1400
    for _ in range(24):               # shrink until the stack actually fits
        crops = [fit_w(chart.crop(box), width) for box, _ in c['zoom_crops']]
        total = sum(cr.height + 40 for cr in crops) + gap * (len(crops) - 1)
        if total <= avail:
            break
        width = int(width * 0.94)
    y = 260 + max(0, (avail - total) // 2)
    for crop in crops:
        card = Image.new('RGB', (crop.width + 40, crop.height + 40), (255, 255, 255))
        card.paste(crop, (20, 20))
        shadow_card(im, card, ((W - card.width) // 2, y))
        y += card.height + gap

    ctext(d, 'Every category. Every food. No squinting.', H - 130, f(REG, 46), c['ink'])
    return im


def img04_included(c):
    """What you get: the real chart page + the real bonus page."""
    im = Image.new('RGB', (W, H), c['cream'])
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 210], fill=c['brand'])
    ctext(d, 'WHAT YOU GET', 52, f(BLACK, 88), (255, 255, 255))
    track(d, 'INSTANT DIGITAL DOWNLOAD', 152, f(BOLD, 30), (255, 255, 255), 8)

    chart = fit_h(Image.open(c['chart']).convert('RGB'), 1020)
    bonus = fit_h(Image.open(c['bonus']).convert('RGB'), 1020)
    gap = 90
    total = chart.width + bonus.width + gap
    x = (W - total) // 2
    shadow_card(im, chart, (x, 285))
    d.text((x, 1350), 'THE FOOD LIST', font=f(BOLD, 38), fill=c['ink'])
    d.text((x, 1400), 'Printable PDF, US Letter', font=f(REG, 32), fill=(110, 100, 95))
    x2 = x + chart.width + gap
    shadow_card(im, bonus, (x2, 285))
    d.text((x2, 1350), 'BONUS PAGE', font=f(BOLD, 38), fill=c['ink'])
    d.text((x2, 1400), 'Free 30-day tracker inside', font=f(REG, 32), fill=(110, 100, 95))

    y = 1540
    for line in ['2 printable PDF pages, delivered instantly',
                 'US Letter 8.5 x 11, prints at home',
                 'Personal use, no physical item is shipped']:
        d.ellipse([250, y + 14, 274, y + 38], fill=c['brand'])
        d.text((310, y), line, font=f(REG, 46), fill=c['ink'])
        y += 96
    return im


def img05_categories(c):
    """Category index built from the real chart contents."""
    im = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 210], fill=c['brand'])
    ctext(d, c['n_cats'] + '  ·  ' + c['n_foods'], 52, f(BLACK, 82), (255, 255, 255))
    track(d, 'ON ONE PAGE', 152, f(BOLD, 30), (255, 255, 255), 8)

    chart = fit_h(Image.open(c['chart']).convert('RGB'), 1420)
    shadow_card(im, chart, (150, 300))

    x = 150 + chart.width + 130
    y = 330
    for cat in c['cats']:
        d.rounded_rectangle([x, y, W - 150, y + 96], radius=14, fill=c['cream'])
        d.rectangle([x, y, x + 12, y + 96], fill=c['brand'])
        d.text((x + 46, y + 26), cat, font=f(BOLD, 44), fill=c['ink'])
        y += 112

    ctext(d, 'Stop guessing in the grocery aisle.', H - 190, f(REG, 52), c['ink'])
    return im


def img06_frame(c):
    """Framed wall print. Frame and wall are drawn; the art is the real file."""
    im = Image.new('RGB', (W, H), (233, 227, 219))
    d = ImageDraw.Draw(im)
    # soft wall gradient
    grad = Image.new('L', (1, H))
    for y in range(H):
        grad.putpixel((0, y), int(238 - 26 * (y / H)))
    wall = Image.merge('RGB', [grad.resize((W, H))] * 3)
    wall = Image.blend(wall, Image.new('RGB', (W, H), (236, 228, 216)), 0.45)
    im.paste(wall)
    d = ImageDraw.Draw(im)

    art = fit_h(Image.open(c['chart']).convert('RGB'), 1240)
    mat = 58
    fr = 34
    fw, fh = art.width + (mat + fr) * 2, art.height + (mat + fr) * 2
    frame = Image.new('RGB', (fw, fh), (252, 250, 247))
    fd = ImageDraw.Draw(frame)
    fd.rectangle([0, 0, fw, fh], outline=(72, 58, 48), width=fr)
    frame.paste(art, (mat + fr, mat + fr))
    fx, fy = (W - fw) // 2, 190
    shadow_card(im, frame, (fx, fy), blur=40, alpha=95, pad=60)

    d = ImageDraw.Draw(im)
    ctext(d, 'Frame it, or stick it on the fridge.', fy + fh + 90, f(REG, 56), (70, 62, 56))
    return im


def img07_howto(c):
    """Three factual steps."""
    im = Image.new('RGB', (W, H), c['cream'])
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 210], fill=c['brand'])
    ctext(d, 'HOW IT WORKS', 52, f(BLACK, 88), (255, 255, 255))
    track(d, 'NOTHING SHIPS, NOTHING WAITS', 152, f(BOLD, 30), (255, 255, 255), 8)

    steps = [('1', 'BUY IT', 'Checkout takes a minute.'),
             ('2', 'DOWNLOAD IT', 'Your PDF is ready right away.'),
             ('3', 'PRINT IT', 'Any home printer, US Letter.')]
    y = 330
    for n, title, sub in steps:
        d.ellipse([250, y, 250 + 150, y + 150], fill=c['brand'])
        nw, nh = tw(d, n, f(BLACK, 84))
        d.text((250 + 75 - nw // 2, y + 28), n, font=f(BLACK, 84), fill=(255, 255, 255))
        d.text((470, y + 18), title, font=f(BLACK, 62), fill=c['ink'])
        d.text((470, y + 96), sub, font=f(REG, 44), fill=(110, 100, 95))
        y += 236

    chart = fit_h(Image.open(c['chart']).convert('RGB'), 780)
    shadow_card(im, chart, ((W - chart.width) // 2, 1080))
    ctext(d, 'CarnivoreWeekly.com', H - 120, f(BOLD, 40), c['brand'])
    return im


SCENE = ('/Users/mbrew/Developer/carnivore-weekly/etsy/products/'
         'mockups/mockup-fridge-keto.jpg')
# Corners of the sheet already hanging on the fridge in SCENE, measured off the
# source photo. Our real chart gets perspective-mapped onto exactly this quad,
# so the paper keeps the photo's own angle, shadow and lighting.
SHEET = [(641, 157), (1064, 130), (1052, 792), (634, 762)]   # TL, TR, BR, BL
MAGNET = (827, 135, 44)                                      # cx, cy, r: sits in FRONT of the paper


def _persp_coeffs(dst, src):
    """Coefficients for Image.transform(PERSPECTIVE): output quad -> input rect."""
    import numpy as np
    m = []
    for (dx, dy), (sx, sy) in zip(dst, src):
        m.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        m.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
    A = np.array(m, dtype=float)
    B = np.array(src, dtype=float).reshape(8)
    return np.linalg.solve(A.T @ A, A.T @ B)


def img08_fridge(c):
    """Real kitchen photo, our real chart mapped onto the sheet already hanging there."""
    SCENE_H, XOFF = 1700, 276          # taller crop so the brand band stays slim
    scene = Image.open(SCENE).convert('RGB')
    scale = SCENE_H / scene.height
    scene = scene.resize((int(scene.width * scale), SCENE_H), Image.LANCZOS)
    scene = scene.crop((XOFF, 0, XOFF + W, SCENE_H))
    quad = [(x * scale - XOFF, y * scale) for x, y in SHEET]

    chart = Image.open(c['chart']).convert('RGB')
    # Keep the chart's own proportions: if it is wider than the paper in the
    # photo, push the paper's right edge out to match instead of squashing text.
    def _len(a, b):
        return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5
    tl, tr, br, bl = quad
    qw = (_len(tl, tr) + _len(bl, br)) / 2
    qh = (_len(tl, bl) + _len(tr, br)) / 2
    k = (chart.width / chart.height) / (qw / qh)
    if k > 1.01:
        tr = (tl[0] + (tr[0] - tl[0]) * k, tl[1] + (tr[1] - tl[1]) * k)
        br = (bl[0] + (br[0] - bl[0]) * k, bl[1] + (br[1] - bl[1]) * k)
        quad = [tl, tr, br, bl]

    # small outward bleed so no edge of the photo's original sheet peeks out
    cx = sum(p[0] for p in quad) / 4
    cy = sum(p[1] for p in quad) / 4
    quad = [(cx + (px - cx) * 1.018, cy + (py - cy) * 1.018) for px, py in quad]

    src = [(0, 0), (chart.width, 0), (chart.width, chart.height), (0, chart.height)]
    coeffs = _persp_coeffs(quad, src)
    size = (W, SCENE_H)
    warped = chart.transform(size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    mask = Image.new('L', chart.size, 255).transform(size, Image.PERSPECTIVE,
                                                     coeffs, Image.BICUBIC)

    # paper shadow, so a widened sheet still sits on the door rather than floating
    sh = mask.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.55))
    shadow = Image.new('RGB', size, (24, 20, 18))
    scene.paste(shadow, (14, 16), sh)
    scene.paste(warped, (0, 0), mask)

    # the wooden magnet is in front of the paper, so put it back on top
    mx, my, mr = int(MAGNET[0] * scale - XOFF), int(MAGNET[1] * scale), int(MAGNET[2] * scale)
    orig = Image.open(SCENE).convert('RGB')
    orig = orig.resize((int(orig.width * scale), SCENE_H), Image.LANCZOS).crop((XOFF, 0, XOFF + W, SCENE_H))
    mm = Image.new('L', size, 0)
    ImageDraw.Draw(mm).ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=255)
    scene.paste(orig, (0, 0), mm.filter(ImageFilter.GaussianBlur(1.5)))

    im = Image.new('RGB', (W, H), c['brand'])
    im.paste(scene, (0, 0))
    d = ImageDraw.Draw(im)
    top = scene.height
    ctext(d, 'BIG ENOUGH TO READ FROM THE FRIDGE', top + 68, f(BLACK, 60), (255, 255, 255))
    ctext(d, c['name'], top + 172, f(BOLD, 42), (255, 255, 255))
    return im


BUILDERS = [('03-readable', img03_zoom), ('04-whats-included', img04_included),
            ('05-categories', img05_categories), ('06-framed-print', img06_frame),
            ('07-how-it-works', img07_howto), ('08-fridge', img08_fridge)]

if __name__ == '__main__':
    which = sys.argv[1:] or ['carnivore', 'pescatarian']
    for key in which:
        c = CFG[key]
        for name, fn in BUILDERS:
            out = os.path.join(OUT, f"{c['slug']}-{name}.png")
            fn(c).save(out, 'PNG')
            print('wrote', os.path.basename(out))

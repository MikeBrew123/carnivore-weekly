#!/usr/bin/env python3
"""Rank-2 image for Pescatarian Food List 4464217699 (2026-09-28).

Replaces the rank-2 photo, which was a byte-identical copy of rank 1. Shows what the buyer gets:
the real chart (live hero art, originals/pesc-1.jpg) and the real new bonus page
(etsy/products/pdfs/Bonus-Low-Mercury-Seafood-Guide.png, rendered from the shipped PDF).
Composite only, nothing AI-generated. Same palette and type as build_set.py.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

S = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(S, '..', '..', '..', '..'))
CHART = os.path.join(S, 'originals', 'pesc-1.jpg')
BONUS = os.path.join(REPO, 'etsy', 'products', 'pdfs', 'Bonus-Low-Mercury-Seafood-Guide.png')
OUT = os.path.join(S, 'out', 'pescatarian-02-free-bonus.png')

W = H = 2000
FONT_DIR = '/System/Library/Fonts/Supplemental'
BLACK, BOLD, REG = (os.path.join(FONT_DIR, n) for n in ('Arial Black.ttf', 'Arial Bold.ttf', 'Arial.ttf'))
BRAND, INK, CREAM, SOFT = (31, 92, 107), (32, 30, 26), (251, 244, 230), (95, 88, 80)


def f(path, size):
    return ImageFont.truetype(path, size)


def ctext(d, text, y, font, fill, w=W, x0=0):
    b = d.textbbox((0, 0), text, font=font)
    d.text((x0 + (w - (b[2] - b[0])) // 2, y), text, font=font, fill=fill)


def shadow_card(base, img, xy, blur=26, alpha=70, pad=30):
    sh = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([pad, pad + 12, pad + img.width, pad + img.height + 12], fill=(60, 40, 30, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.paste(sh, (xy[0] - pad, xy[1] - pad), sh)
    base.paste(img, xy)


def fit_h(img, h):
    return img.resize((round(img.width * h / img.height), h), Image.LANCZOS)


im = Image.new('RGB', (W, H), CREAM)
d = ImageDraw.Draw(im)
d.rectangle([0, 0, W, 210], fill=BRAND)
ctext(d, 'FREE BONUS INSIDE', 52, f(BLACK, 88), (255, 255, 255))
ctext(d, 'An extra printable page with every order', 156, f(BOLD, 32), (255, 255, 255))

card_h = 1180
chart = fit_h(Image.open(CHART).convert('RGB'), card_h)
bonus = fit_h(Image.open(BONUS).convert('RGB'), card_h)
gap = 90
x = (W - chart.width - bonus.width - gap) // 2
y = 300
shadow_card(im, chart, (x, y))
shadow_card(im, bonus, (x + chart.width + gap, y))

cy = y + card_h + 50
for x0, w, head, sub in ((x, chart.width, 'THE FOOD LIST', 'Seafood plus plants, under 50g carbs'),
                         (x + chart.width + gap, bonus.width, 'BONUS PAGE', 'Low-mercury seafood guide')):
    ctext(d, head, cy, f(BLACK, 44), INK, w, x0)
    ctext(d, sub, cy + 64, f(REG, 34), SOFT, w, x0)

ctext(d, 'Which fish to eat often, which to limit, which to skip.', H - 250, f(REG, 44), INK)
d.rectangle([0, H - 110, W, H], fill=BRAND)
ctext(d, 'Instant download. Prints at home on US Letter.', H - 88, f(BOLD, 34), (255, 255, 255))
ctext(d, 'CarnivoreWeekly.com', H - 44, f(BOLD, 26), (255, 255, 255))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
im.save(OUT, 'PNG')
print('wrote', OUT)

#!/usr/bin/env python3
"""Listing images for the doctor-coordination printables.

Real page renders only (listing-images-show-pages rule): main image is a
fanned composite of actual PDF pages; supporting images are single framed
pages. No mockups, no fabricated content.
"""
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).parent
PDF_DIR = HERE.parent / "pdfs"
OUT = HERE / "listing-images"
OUT.mkdir(exist_ok=True)
TMP = HERE / "_pages"
TMP.mkdir(exist_ok=True)

CANVAS = (2000, 2000)
BG = (44, 95, 138)       # clinical blue
BG2 = (46, 125, 91)      # trust green (secondary shots)

PRODUCTS = {
    "prepkit": {
        "pdf": "doctor-visit-prep-kit.pdf",
        "fan": [5, 2, 7],          # diet summary, checklist, questions
        "singles": [5, 2, 7, 3],   # + meds worksheet
    },
    "bplog": {
        "pdf": "bp-glucose-doctor-log.pdf",
        "fan": [7, 3, 2],          # summary sheet, week log, technique
        "singles": [7, 3, 2, 8],   # + when-to-call
    },
}


def render_pages(key, cfg):
    pdf = PDF_DIR / cfg["pdf"]
    subprocess.run(
        ["pdftoppm", "-png", "-r", "150", str(pdf), str(TMP / key)],
        check=True,
    )
    return sorted(TMP.glob(f"{key}-*.png"))


def page_img(key, n):
    for p in TMP.glob(f"{key}-*.png"):
        if int(p.stem.split("-")[-1]) == n:
            return Image.open(p)
    raise FileNotFoundError(f"{key} page {n}")


def shadowed(img, w):
    scale = w / img.width
    im = img.resize((w, int(img.height * scale)), Image.LANCZOS)
    pad = 60
    base = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle(
        [pad + 12, pad + 18, pad + im.width + 12, pad + im.height + 18],
        fill=(0, 0, 0, 110),
    )
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    base.alpha_composite(sh)
    base.paste(im, (pad, pad))
    return base


def fan_composite(key, cfg):
    canvas = Image.new("RGB", CANVAS, BG)
    pages = [page_img(key, n) for n in cfg["fan"]]
    # back-to-front: right tilt, left tilt, center front
    specs = [
        (pages[2], -7, (1050, 340)),
        (pages[1], 7, (170, 340)),
        (pages[0], 0, (560, 240)),
    ]
    for img, angle, pos in specs:
        card = shadowed(img, 900).rotate(angle, expand=True, resample=Image.BICUBIC)
        canvas.paste(card, pos, card)
    canvas.save(OUT / f"{key}-main.jpg", quality=90)


def single(key, n, idx, bg):
    canvas = Image.new("RGB", CANVAS, bg)
    card = shadowed(page_img(key, n), 1240)
    canvas.paste(card, ((CANVAS[0] - card.width) // 2, (CANVAS[1] - card.height) // 2), card)
    canvas.save(OUT / f"{key}-page{idx}.jpg", quality=90)


for key, cfg in PRODUCTS.items():
    render_pages(key, cfg)
    fan_composite(key, cfg)
    for i, n in enumerate(cfg["singles"], start=1):
        single(key, n, i, BG if i % 2 else BG2)
    print(f"{key}: main + {len(cfg['singles'])} page images -> {OUT}")

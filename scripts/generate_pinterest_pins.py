#!/usr/bin/env python3
"""Generate 2:3 vertical Pinterest pins for KetoDial recipes.

Reverse-engineered from the top-ranked pins for "keto dinner/dessert recipes"
(reconnaissance 2026-07-19). The winning keto-niche template is consistent:

  - 1000x1500 (2:3) full-bleed appetizing food photo
  - a small curiosity/qualifier KICKER pill up top (time / "keto")
  - a bottom gradient scrim carrying a big bold HERO recipe title
  - a MACRO BADGE row weaponizing the killer numbers (net carbs, protein) —
    exactly what "3G NET CARBS" / "Only 5 ingredients" winners do
  - a small brand URL tag at the very bottom

Everything the badges need (net carbs, protein, total time) already lives in
each recipe page's Recipe schema, so pins auto-populate with no new copy.

Usage:
  python3 scripts/generate_pinterest_pins.py --slugs a b c --out /tmp/preview   # samples
  python3 scripts/generate_pinterest_pins.py --all                              # all recipes
"""
import argparse
import glob
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECIPE_DIR = os.path.join(ROOT, "ketodial/public/recipes")
IMG_DIR = os.path.join(ROOT, "ketodial/public/images/recipes")
OUT_DIR = os.path.join(IMG_DIR, "pins")
BLOG_DIR = os.path.join(ROOT, "ketodial/public/blog")
BLOG_IMG_DIR = os.path.join(ROOT, "ketodial/public/images/blog")
BLOG_OUT_DIR = os.path.join(BLOG_IMG_DIR, "pins")
SKIP_BLOG = ("index", "announcement", "why-we-built", "changelog", "release-notes")

W, H = 1000, 1500
NAVY = (15, 23, 42)       # #0f172a
TEAL = (45, 212, 191)     # #2dd4bf
SKY = (14, 165, 233)      # #0ea5e9
WHITE = (255, 255, 255)

BLACK_FONT = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
BOLD_FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def font(path, size):
    return ImageFont.truetype(path, size)


def _text(html, prop=None, name=None):
    if prop:
        m = re.search(r'<meta property="%s" content="([^"]*)"' % re.escape(prop), html)
    else:
        m = re.search(r'<meta name="%s" content="([^"]*)"' % re.escape(name), html)
    return m.group(1).strip() if m else ""


def _schema(html, key):
    m = re.search(r'"%s":\s*"([^"]*)"' % re.escape(key), html)
    return m.group(1).strip() if m else ""


def clean_title(t):
    t = re.sub(r"\s*[-–—|]+\s*KetoDial.*$", "", t)
    t = re.sub(r"\s*[-–—|].*Recipe\s*$", "", t) if False else t
    return t.replace("—", " ").strip()


def parse_time(iso):
    if not iso:
        return ""
    h = re.search(r"(\d+)H", iso)
    m = re.search(r"(\d+)M", iso)
    if h and m:
        return "%dH %dM" % (int(h.group(1)), int(m.group(1)))
    if h:
        return "%dH" % int(h.group(1))
    if m:
        return "%d MIN" % int(m.group(1))
    return ""


def num(s):
    m = re.search(r"(\d+)", s or "")
    return m.group(1) if m else ""


def cover(img, w, h):
    """Scale + center-crop to exactly fill w x h."""
    iw, ih = img.size
    scale = max(w / iw, h / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def rounded_pill(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def fit_lines(text, fnt_path, max_size, min_size, max_w, max_lines):
    """Pick the largest font size where wrapped text fits max_w and <= max_lines."""
    words = text.split()
    for size in range(max_size, min_size - 1, -3):
        f = font(fnt_path, size)
        lines, cur = [], ""
        for wd in words:
            trial = (cur + " " + wd).strip()
            if f.getbbox(trial)[2] <= max_w:
                cur = trial
            else:
                if cur:
                    lines.append(cur)
                cur = wd
        if cur:
            lines.append(cur)
        if len(lines) <= max_lines and all(f.getbbox(l)[2] <= max_w for l in lines):
            return f, lines, size
    f = font(fnt_path, min_size)
    return f, [text], min_size


def build_pin(slug, out_path, src_dir=RECIPE_DIR, img_dir=IMG_DIR, img_prefix="recipe-", blog=False):
    html_path = os.path.join(src_dir, slug + ".html")
    with open(html_path, encoding="utf-8") as fh:
        html = fh.read()

    title = clean_title(_text(html, prop="og:title") or slug.replace("-", " ").title())
    if blog:
        carbs = protein = time_str = ""
    else:
        carbs = num(_schema(html, "carbohydrateContent"))
        protein = num(_schema(html, "proteinContent"))
        time_str = parse_time(_schema(html, "totalTime"))

    img_file = os.path.join(img_dir, "%s%s.jpg" % (img_prefix, slug))
    if not os.path.exists(img_file):
        m = re.search(r'og:image" content="[^"]*/([^/"]+\.(?:jpg|png))"', html)
        if m:
            img_file = os.path.join(img_dir, m.group(1))
    photo = Image.open(img_file).convert("RGB")
    canvas = cover(photo, W, H).convert("RGBA")

    # --- bottom gradient scrim for legibility ---
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scrim)
    top_y = 720
    for y in range(top_y, H):
        a = int(245 * ((y - top_y) / (H - top_y)) ** 1.15)
        sd.line([(0, y), (W, y)], fill=(NAVY[0], NAVY[1], NAVY[2], min(a, 245)))
    canvas = Image.alpha_composite(canvas, scrim)
    d = ImageDraw.Draw(canvas)

    # --- top kicker pill ---
    if time_str:
        kicker = "READY IN " + time_str
    elif blog:
        kicker = "THE KETO GUIDE"
    else:
        kicker = "KETO RECIPE"
    kf = font(BOLD_FONT, 34)
    kb = kf.getbbox(kicker)
    kw, kh = kb[2] - kb[0], kb[3] - kb[1]
    pad = 26
    rounded_pill(d, (44, 44, 44 + kw + pad * 2, 44 + kh + pad * 2), 999, TEAL)
    d.text((44 + pad, 44 + pad - kb[1]), kicker, font=kf, fill=NAVY)

    # --- macro badges (bottom, above nothing/brand) ---
    badges = []
    if carbs:
        badges.append(("%sg NET CARBS" % carbs, TEAL, NAVY))
    if protein:
        badges.append(("%sg PROTEIN" % protein, SKY, WHITE))
    bf = font(BLACK_FONT, 33)
    brand_y = H - 96
    badge_h = 74
    badge_y = brand_y - badge_h - 34
    bx = 48
    for txt, bg, fg in badges:
        bb = bf.getbbox(txt)
        bw = bb[2] - bb[0]
        pill_w = bw + 56
        rounded_pill(d, (bx, badge_y, bx + pill_w, badge_y + badge_h), 16, bg)
        d.text((bx + 28, badge_y + (badge_h - (bb[3] - bb[1])) // 2 - bb[1]), txt, font=bf, fill=fg)
        bx += pill_w + 20

    # --- hero title (bottom-anchored, above badges) ---
    title_anchor = (badge_y - 40) if badges else (brand_y - 40)
    tf, lines, size = fit_lines(title.upper(), BLACK_FONT, 108, 60, W - 96, 3)
    line_h = int(size * 1.06)
    block_h = line_h * len(lines)
    ty = title_anchor - block_h
    for ln in lines:
        d.text((48, ty), ln, font=tf, fill=WHITE)
        ty += line_h

    # --- brand tag ---
    brf = font(BOLD_FONT, 34)
    brand = "K E T O D I A L . C O M"
    bbb = brf.getbbox(brand)
    d.text(((W - (bbb[2] - bbb[0])) // 2, brand_y), brand, font=brf, fill=TEAL)

    canvas.convert("RGB").save(out_path, "JPEG", quality=90)
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slugs", nargs="*", help="specific recipe slugs")
    ap.add_argument("--all", action="store_true", help="all recipes")
    ap.add_argument("--all-blog", action="store_true", help="all blog posts")
    ap.add_argument("--out")
    args = ap.parse_args()

    ok = fail = 0

    if args.all or args.slugs:
        out_dir = args.out or OUT_DIR
        os.makedirs(out_dir, exist_ok=True)
        if args.all:
            slugs = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(RECIPE_DIR, "*.html"))
                     if os.path.basename(f) != "index.html"]
        else:
            slugs = args.slugs
        for s in slugs:
            try:
                build_pin(s, os.path.join(out_dir, "recipe-%s-pin.jpg" % s))
                ok += 1
            except Exception as e:
                print("FAIL recipe", s, e); fail += 1

    if args.all_blog:
        out_dir = args.out or BLOG_OUT_DIR
        os.makedirs(out_dir, exist_ok=True)
        slugs = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(BLOG_DIR, "*.html"))
                 if not any(p in os.path.basename(f) for p in SKIP_BLOG)]
        for s in slugs:
            try:
                build_pin(s, os.path.join(out_dir, "%s-pin.jpg" % s),
                          src_dir=BLOG_DIR, img_dir=BLOG_IMG_DIR, img_prefix="", blog=True)
                ok += 1
            except Exception as e:
                print("FAIL blog", s, e); fail += 1

    print("done: %d ok, %d failed" % (ok, fail))


if __name__ == "__main__":
    main()

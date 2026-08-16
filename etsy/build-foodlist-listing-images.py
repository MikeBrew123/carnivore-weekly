#!/usr/bin/env python3
"""Build the extra Etsy listing images for the two 2-image food list listings.

Listings:
  4464217679  Carnivore Diet Food List  (4,215 views, 2 images)
  4464217699  Pescatarian Diet Food List (3,898 views, 2 images)

Why: Etsy recommends 7 to 10 images. Both listings sit at 2 and convert at
0.02% and 0.05% on real traffic. This is Test 1 of the staggered cohort test in
reports/etsy-deep-dive-2026-08-09.md.

HARD RULE (Brew's lessons-learned): the product shown is always the REAL product
render. Nothing here is AI generated and nothing here costs money. Every panel is
a crop or a composite of the actual chart the buyer receives, laid onto scene
plates that already exist in this repo.

Sources:
  Carnivore   -> the listing's own live rank-1 image (the modern red chart).
                 NOTE: products/pdfs/fridge-card-carnivore.pdf in this repo is an
                 OLDER vintage-sepia design and does NOT match what is live, so it
                 is deliberately not used here.
  Pescatarian -> products/product-images/fridge-card-pescatarian.jpg, verified
                 pixel-identical in design to the live rank-1 image, at 2550x3300.
  Scene plate -> products/doctor-kit/scenes/scene-desk.jpg (already in repo).

Output: _build/foodlist-images/<slug>-NN-<name>.jpg at 2000x2000, quality 90.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
SCENES = HERE / "products" / "doctor-kit" / "scenes"
OUT = HERE / "_build" / "foodlist-images"
OUT.mkdir(parents=True, exist_ok=True)

CANVAS = 2000
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"


def f(path, size):
    return ImageFont.truetype(path, size)


def centered(draw, text, y, font, fill, width=CANVAS):
    w = draw.textbbox((0, 0), text, font=font)[2]
    draw.text(((width - w) // 2, y), text, font=font, fill=fill)


def shadowed(img, target_w, rotate=0.0, blur=18, alpha=95):
    """Real page render with a soft drop shadow, optionally rotated."""
    scale = target_w / img.width
    im = img.resize((target_w, int(img.height * scale)), Image.LANCZOS).convert("RGBA")
    pad = 90
    base = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle(
        [pad + 12, pad + 20, pad + im.width + 12, pad + im.height + 20],
        fill=(0, 0, 0, alpha),
    )
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    base.paste(im, (pad, pad))
    if rotate:
        base = base.rotate(rotate, expand=True, resample=Image.BICUBIC)
    return base


def fit_box(img, box_w, box_h):
    s = min(box_w / img.width, box_h / img.height)
    return img.resize((int(img.width * s), int(img.height * s)), Image.LANCZOS)


# --------------------------------------------------------------- panel builders
def detail_panel(chart, crop, headline, subline, theme, out_name):
    """A large readable crop of the real chart, captioned. No zoom past 1.8x."""
    accent, cream, ink = theme["accent"], theme["cream"], theme["ink"]
    img = Image.new("RGB", (CANVAS, CANVAS), cream)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, CANVAS, 250], fill=accent)
    centered(d, headline, 62, f(FONT_BOLD, 84), "#FFFFFF")
    centered(d, subline, 168, f(FONT_REG, 44), "#FFFFFFDD")

    piece = chart.crop(crop)
    piece = fit_box(piece, 1780, 1560)
    card = shadowed(piece, piece.width, blur=16, alpha=70)
    img.paste(card.convert("RGB"), ((CANVAS - card.width) // 2, 300 + (1600 - card.height) // 2), card)

    d.rectangle([0, CANVAS - 70, CANVAS, CANVAS], fill=accent)
    centered(d, "CarnivoreWeekly.com", CANVAS - 58, f(FONT_BOLD, 34), "#FFFFFFEE")
    img.save(OUT / out_name, quality=90)
    print("  ->", out_name)


def desk_panel(chart, theme, out_name):
    """The real chart lying on the repo's existing overhead desk plate."""
    scene = Image.open(SCENES / "scene-desk.jpg").convert("RGBA")
    scene = scene.resize((CANVAS, CANVAS), Image.LANCZOS)
    card = shadowed(chart, 1000, rotate=-2.0, blur=22, alpha=90)
    scene.alpha_composite(card, ((CANVAS - card.width) // 2, 250))

    img = scene.convert("RGB")
    d = ImageDraw.Draw(img)
    d.rectangle([0, CANVAS - 190, CANVAS, CANVAS], fill=theme["accent"])
    centered(d, "PRINT IT AT HOME IN ONE MINUTE", CANVAS - 158, f(FONT_BOLD, 62), "#FFFFFF")
    centered(d, "Instant download. No physical item shipped.", CANVAS - 78, f(FONT_REG, 40), "#FFFFFFDD")
    img.save(OUT / out_name, quality=90)
    print("  ->", out_name)


def spec_panel(chart, theme, out_name):
    """Format facts, straight off the listing description. Product stays big."""
    accent, cream, ink = theme["accent"], theme["cream"], theme["ink"]
    img = Image.new("RGB", (CANVAS, CANVAS), cream)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, CANVAS, 230], fill=accent)
    centered(d, "WHAT YOU GET", 52, f(FONT_BOLD, 88), "#FFFFFF")
    centered(d, "One page. Print it and you are done.", 158, f(FONT_REG, 42), "#FFFFFFDD")

    card = shadowed(chart, 880, blur=20, alpha=80)
    img.paste(card.convert("RGB"), (110, 280), card)

    x = 1160
    y = 360
    rows = [
        ("1 high res PDF", "The full food list chart"),
        ("8.5 x 11 inches", "US Letter, standard paper"),
        ("300 DPI", "Print ready, no blurry text"),
        ("Instant download", "Files are ready right after checkout"),
        ("Print anywhere", "Home printer or any print shop"),
    ]
    fb, fr = f(FONT_BOLD, 62), f(FONT_REG, 40)
    for title, sub in rows:
        d.ellipse([x, y + 14, x + 34, y + 48], fill=accent)
        d.text((x + 66, y), title, font=fb, fill=ink)
        d.text((x + 66, y + 74), sub, font=fr, fill="#5A5A5A")
        y += 190

    d.rectangle([0, CANVAS - 130, CANVAS, CANVAS], fill=accent)
    centered(d, "Digital download for personal use only", CANVAS - 108, f(FONT_REG, 44), "#FFFFFFEE")
    centered(d, "CarnivoreWeekly.com", CANVAS - 52, f(FONT_BOLD, 36), "#FFFFFFCC")
    img.save(OUT / out_name, quality=90)
    print("  ->", out_name)


def audience_panel(chart, bullets, theme, out_name):
    """Who it is for. Text left, real chart right, mirror of the spec panel."""
    accent, cream, ink = theme["accent"], theme["cream"], theme["ink"]
    img = Image.new("RGB", (CANVAS, CANVAS), cream)
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, CANVAS, 230], fill=accent)
    centered(d, "PERFECT FOR", 52, f(FONT_BOLD, 88), "#FFFFFF")
    centered(d, "The people this was actually made for", 158, f(FONT_REG, 42), "#FFFFFFDD")

    card = shadowed(chart, 660, blur=20, alpha=80)
    img.paste(card.convert("RGB"), (CANVAS - card.width - 80, 360), card)

    x, y = 110, 420
    fr = f(FONT_REG, 44)
    for line in bullets:
        d.ellipse([x, y + 14, x + 24, y + 38], fill=accent)
        d.text((x + 56, y), line, font=fr, fill=ink)
        y += 168

    d.rectangle([0, CANVAS - 130, CANVAS, CANVAS], fill=accent)
    centered(d, "Instant download. Print at home or any print shop.", CANVAS - 108, f(FONT_REG, 44), "#FFFFFFEE")
    centered(d, "CarnivoreWeekly.com", CANVAS - 52, f(FONT_BOLD, 36), "#FFFFFFCC")
    img.save(OUT / out_name, quality=90)
    print("  ->", out_name)


# --------------------------------------------------------------------- products
CARNIVORE = {
    "slug": "carnivore",
    "theme": {"accent": "#900107", "cream": "#FBF7F3", "ink": "#1A1A1A"},
    # source is 2000x3000; crops land on panel borders so no heading is sliced
    "details": [
        ((0, 0, 2000, 1516), "EVERY CATEGORY, AT A GLANCE",
         "Beef, eggs and dairy, fish and seafood, poultry", "03-detail-top"),
        ((0, 1516, 2000, 3000), "THE REST OF THE LIST",
         "Pork, animal fats, organ meats, seasonings", "04-detail-mid"),
        ((955, 2022, 2000, 2903), "THE PART BEGINNERS ACTUALLY NEED",
         "What to drink, and how to eat it", "05-detail-rules"),
    ],
    "bullets": [
        "Beginners who do not know where to start",
        "Meal preppers who want a quick visual",
        "Anyone tired of asking is this allowed",
        "Partners and family supporting your diet",
        "Grocery runs, snap a photo and go",
    ],
}

PESCATARIAN = {
    "slug": "pescatarian",
    "theme": {"accent": "#145A73", "cream": "#FBF3E2", "ink": "#1A1A1A"},
    # source is 2550x3300; the boxes are staggered, so crop by column not by row
    "details": [
        ((40, 415, 1310, 1965), "EVERY CATEGORY, AT A GLANCE",
         "Fresh fish and low carb vegetables", "03-detail-top"),
        ((40, 1965, 1285, 3255), "SHELLFISH, AND THE FRUIT THAT FITS",
         "Shrimp to lobster, berries only", "04-detail-mid"),
        ((1245, 2440, 2540, 3235), "THE CARB TRAPS, LISTED OUT",
         "Foods to avoid, plus what you can drink", "05-detail-avoid"),
    ],
    "bullets": [
        "Anyone eating fish and staying low carb",
        "Beginners who want one clear reference",
        "Meal prep and grocery planning",
        "Partners cooking for a pescatarian",
        "Staying under 50g carbs a day",
    ],
}


def build(product, chart_path):
    print(product["slug"], "from", chart_path)
    chart = Image.open(chart_path).convert("RGB")
    theme = product["theme"]
    s = product["slug"]
    for crop, head, sub, name in product["details"]:
        detail_panel(chart, crop, head, sub, theme, f"{s}-{name}.jpg")
    desk_panel(chart, theme, f"{s}-06-desk.jpg")
    spec_panel(chart, theme, f"{s}-07-what-you-get.jpg")
    audience_panel(chart, product["bullets"], theme, f"{s}-08-perfect-for.jpg")


if __name__ == "__main__":
    import sys

    carn_src, pesc_src = sys.argv[1], sys.argv[2]
    build(CARNIVORE, carn_src)
    build(PESCATARIAN, pesc_src)

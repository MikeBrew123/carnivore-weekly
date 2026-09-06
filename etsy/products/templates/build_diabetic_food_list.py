#!/usr/bin/env python3
"""Build the diabetic-audience printable food list set (DRAFT, Etsy only).

Approved by Brew 2026-09-02 by voice: "build diabetic food list products for
ETSY ONLY." Not for carnivoreweekly.com, not for ketodial.com.

House style follows the existing food list family (keto-eat-limit-avoid.html,
pcos-food-list.html): Fredoka + Nunito, a three column sheet with green /
amber / red coding, US Letter and A4 renders of every sheet, full bleed
backgrounds, and one small brand plus fine print line at the very bottom.

WHAT THIS PRODUCT DOES NOT DO, and why the copy is written the way it is:

  * It makes NO treatment claim and NO blood sugar claim. Nothing here says or
    implies that the list manages, controls, lowers or treats diabetes or blood
    sugar. Brew's constraint, and it is also the only version of this product
    that is defensible.
  * So the three columns are NOT "eat / limit / avoid" like the keto sheet.
    An eat/limit/avoid split aimed at a diabetic buyer reads as instruction.
    The columns here are LOWER CARB / MODERATE CARB / HIGHER CARB, which is a
    statement about the food's carbohydrate content and nothing else. Every
    placement below is defensible as ordinary nutrition information.
  * Foods that are genuinely argued over were left out rather than sorted. See
    the OMITTED note at the bottom of this file.
  * Fine print is ONE line at the foot of each sheet, small, not a wall.

Audience is women 45 and over. The appeal lives in the tone (plain language,
no jargon, no lecture, big enough type to read across a kitchen) and in the
listing copy, not in an outcome promise on the sheet.

Every output carries a -DRAFT suffix so nothing here can be mistaken for a
shipped asset. Publishing to Etsy is Brew's own hands.

Usage:
  python3 build_diabetic_food_list.py             -> all six PDFs
  python3 build_diabetic_food_list.py --png       -> also write preview PNGs
  python3 build_diabetic_food_list.py food-list   -> one sheet only

Outputs to etsy/products/pdfs/ (which is gitignored; only this builder is
tracked).
"""
import argparse
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT_DIR = Path(__file__).resolve().parents[1] / "pdfs"

BRAND = "CarnivoreWeekly.com"
# ONE line, at the very bottom, small. Brew: "not overdone."
FINE_PRINT = "For informational purposes only. Please talk with your doctor."

SIZES = {
    "letter": dict(w="8.5in", h="11in", pad="0.30in 0.35in 0.24in", label="US LETTER  |  8.5 x 11 IN"),
    # A4 in inches, not mm and not Playwright's format="A4". Both of those go
    # through a CSS pixel round trip and land ~0.2mm out; 8.268 x 11.693in is
    # 210 x 297mm to the nearest thousandth of an inch, and it renders exact.
    "a4": dict(w="8.268in", h="11.693in", pad="8mm 10mm 6mm", label="A4  |  210 x 297 MM"),
}

# ---------------------------------------------------------------------------
# Sheet 1: the food list. Three columns, sorted by carbohydrate content only.
# ---------------------------------------------------------------------------

LOWER = [
    ("Meat and Poultry", [
        ("\U0001F969", "Beef, all cuts"), ("\U0001F357", "Chicken"),
        ("\U0001F983", "Turkey"), ("\U0001F356", "Pork"),
        ("\U0001F411", "Lamb"), ("\U0001F953", "Bacon"),
    ]),
    ("Fish and Seafood", [
        ("\U0001F41F", "Salmon"), ("\U0001F420", "Tuna"),
        ("\U0001F41A", "Sardines"), ("\U0001F990", "Shrimp"),
        ("\U0001F99E", "Cod and haddock"), ("\U0001F980", "Crab"),
    ]),
    ("Eggs, Cheese, Cream", [
        ("\U0001F95A", "Eggs"), ("\U0001F9C8", "Butter"),
        ("\U0001F9C0", "Hard cheese"), ("\U0001F95B", "Heavy cream"),
        ("\U0001F368", "Cream cheese"), ("\U0001F95B", "Plain Greek yogurt"),
    ]),
    ("Vegetables", [
        ("\U0001F96C", "Spinach and kale"), ("\U0001F966", "Broccoli"),
        ("\U0001F33F", "Cauliflower"), ("\U0001F952", "Cucumber"),
        ("\U0001FAD1", "Bell peppers"), ("\U0001F344", "Mushrooms"),
        ("\U0001F957", "Lettuce and salad greens"), ("\U0001F33F", "Zucchini"),
        ("\U0001F33F", "Asparagus"), ("\U0001F96C", "Cabbage"),
        ("\U0001F33F", "Green beans"), ("\U0001F345", "Tomatoes"),
        ("\U0001F33F", "Celery"), ("\U0001F96C", "Brussels sprouts"),
    ]),
    ("Fats and Oils", [
        ("\U0001F951", "Avocado"), ("\U0001FAD2", "Olive oil"),
        ("\U0001F965", "Coconut oil"), ("\U0001F9C8", "Ghee and tallow"),
    ]),
    ("Flavour, Free Rein", [
        ("\U0001F9C2", "Salt and pepper"), ("\U0001F9C4", "Garlic and onion powder"),
        ("\U0001F33F", "Fresh and dried herbs"), ("\U0001F9C3", "Vinegar"),
        ("\U0001F944", "Mustard"), ("\U0001F375", "Tea and coffee, unsweetened"),
    ]),
]

MODERATE = [
    ("Starchy Vegetables", [
        ("\U0001F360", "Sweet potato"), ("\U0001F383", "Winter squash"),
        ("\U0001F955", "Carrots"), ("\U0001FAD8", "Peas"),
        ("\U0001F7E4", "Beets"), ("\U0001F33D", "Corn"),
    ]),
    ("Beans and Lentils", [
        ("\U0001FAD8", "Black beans"), ("\U0001FAD8", "Chickpeas"),
        ("\U0001FAD8", "Lentils"), ("\U0001FAD8", "Kidney beans"),
    ]),
    ("Whole Grains", [
        ("\U0001F963", "Oats, rolled or steel cut"), ("\U0001F35A", "Brown rice"),
        ("\U0001F33E", "Quinoa"), ("\U0001F35E", "Whole grain bread"),
        ("\U0001F33E", "Barley"),
    ]),
    ("Fruit", [
        ("\U0001FAD0", "Berries"), ("\U0001F34E", "Apple"),
        ("\U0001F34A", "Orange"), ("\U0001F350", "Pear"),
        ("\U0001F351", "Peach"), ("\U0001F95D", "Kiwi"),
        ("\U0001F352", "Cherries"), ("\U0001FAD0", "Plum"),
    ]),
    ("Milk and Soft Dairy", [
        ("\U0001F95B", "Milk"), ("\U0001F95B", "Plain yogurt"),
        ("\U0001FAD9", "Cottage cheese"),
    ]),
    ("Nuts and Seeds", [
        ("\U0001F330", "Almonds and walnuts"), ("\U0001F95C", "Pecans"),
        ("\U0001F330", "Cashews"), ("\U0001F95C", "Peanut butter"),
        ("\U0001F383", "Pumpkin seeds"), ("\U0001F33B", "Sunflower seeds"),
    ]),
]

HIGHER = [
    ("Sugar and Sweets", [
        ("\U0001F36C", "Candy"), ("\U0001F36A", "Cookies"),
        ("\U0001F382", "Cake and pastries"), ("\U0001F369", "Doughnuts"),
        ("\U0001F368", "Ice cream"), ("\U0001F36F", "Honey"),
        ("\U0001F95E", "Maple syrup"), ("\U0001FAD9", "Jam and jelly"),
        ("\U0001F36B", "Milk chocolate"),
    ]),
    ("Sweetened Drinks", [
        ("\U0001F964", "Soda"), ("\U0001F9C3", "Fruit juice"),
        ("\U0001F9CB", "Sweet tea"), ("\U0001F376", "Sports drinks"),
        ("\U0001F95B", "Flavoured coffee drinks"),
    ]),
    ("Refined Grains", [
        ("\U0001F35E", "White bread"), ("\U0001F35A", "White rice"),
        ("\U0001F35D", "Pasta"), ("\U0001F96F", "Bagels"),
        ("\U0001F963", "Breakfast cereal"), ("\U0001FAD3", "Tortillas"),
        ("\U0001F968", "Crackers and pretzels"),
    ]),
    ("Potato and Snack Starch", [
        ("\U0001F954", "Potatoes"), ("\U0001F35F", "French fries"),
        ("\U0001F954", "Potato chips"), ("\U0001F37F", "Popcorn"),
    ]),
    ("Dried and Tropical Fruit", [
        ("\U0001F347", "Raisins"), ("\U0001F334", "Dates"),
        ("\U0001F96D", "Dried mango"), ("\U0001F34C", "Banana"),
        ("\U0001F34D", "Pineapple"), ("\U0001F347", "Grapes"),
    ]),
]

COLUMNS = [
    ("lower", "\U0001F7E2", "Lower Carb", "Little to no carbohydrate in a normal serving", LOWER),
    ("mod", "\U0001F7E1", "Moderate Carb", "Real carbohydrate here, so the portion is the whole story", MODERATE),
    ("high", "\U0001F534", "Higher Carb", "Mostly carbohydrate, and it adds up fast", HIGHER),
]

# ---------------------------------------------------------------------------
# Sheet 2: the grocery list. Same foods, shopping order, tick boxes.
# ---------------------------------------------------------------------------

GROCERY = [
    ("\U0001F969", "Meat Counter", [
        "Ground beef", "Steak or roast", "Chicken thighs", "Chicken breast",
        "Pork chops", "Bacon", "Lamb", "Turkey",
    ]),
    ("\U0001F41F", "Fish Counter", [
        "Salmon", "Cod or haddock", "Shrimp", "Canned tuna",
        "Canned sardines", "Smoked mackerel",
    ]),
    ("\U0001F95A", "Dairy and Eggs", [
        "Eggs, two dozen", "Butter", "Hard cheese", "Cream cheese",
        "Heavy cream", "Plain Greek yogurt", "Cottage cheese",
    ]),
    ("\U0001FAD2", "Pantry and Fats", [
        "Olive oil", "Avocado oil", "Coconut oil", "Almonds or walnuts",
        "Nut butter, no sugar added", "Olives", "Canned tomatoes", "Bone broth",
    ]),
    # The biggest aisle, so it takes the full width of the sheet instead of
    # overflowing a half-width box.
    ("\U0001F96C", "Produce, Lower Carb", [
        "Spinach or kale", "Salad greens", "Broccoli", "Cauliflower",
        "Zucchini", "Cucumber", "Bell peppers", "Mushrooms",
        "Green beans", "Asparagus", "Tomatoes", "Avocado",
        "Celery", "Cabbage", "Brussels sprouts", "Lemons",
    ], "wide"),
    ("\U0001F34E", "Produce, Moderate Carb", [
        "Berries", "Apples", "Oranges", "Sweet potato",
        "Carrots", "Winter squash",
    ]),
    ("\U0001F9C2", "Flavour Shelf and Drinks", [
        "Sea salt", "Black pepper", "Garlic", "Dried herbs",
        "Cinnamon", "Vinegar", "Mustard", "Coffee",
        "Tea", "Sparkling water",
    ]),
]

# ---------------------------------------------------------------------------
# Sheet 3: lower carb swaps. Each row swaps one food for a lower carb food.
# The only claim in a row is that the right side carries less carbohydrate
# than the left, which is a fact about the two foods.
# ---------------------------------------------------------------------------

SWAPS = [
    ("\U0001F35A", "White rice", "Cauliflower rice"),
    ("\U0001F35D", "Spaghetti", "Spiralised zucchini or spaghetti squash"),
    ("\U0001F954", "Mashed potato", "Mashed cauliflower"),
    ("\U0001F35E", "Sandwich bread", "Big lettuce leaves as a wrap"),
    ("\U0001F963", "Breakfast cereal", "Eggs with spinach"),
    ("\U0001F95B", "Fruit yogurt", "Plain yogurt with a handful of berries"),
    ("\U0001F9C3", "Orange juice", "A whole orange"),
    ("\U0001F964", "Soda", "Sparkling water with lemon"),
    ("\U0001F954", "Potato chips", "Cucumber slices with cream cheese"),
    ("\U0001F968", "Crackers and dip", "Bell pepper strips and dip"),
    ("\U0001F35F", "French fries", "Roasted green beans"),
    ("\U0001F36F", "Sugar in coffee", "Cinnamon in coffee"),
    ("\U0001F35B", "Flour breading", "Crushed pork rind or parmesan"),
    ("\U0001F32E", "Flour tortilla", "Egg wrap or lettuce cup"),
    ("\U0001F35C", "Thickened sauce", "Cream and cheese reduction"),
    ("\U0001F36B", "Candy bar", "Berries with cream"),
]

# ---------------------------------------------------------------------------
# Shared CSS. One template, page size injected per render.
# ---------------------------------------------------------------------------

CSS = """
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
  @page {{ size: {W} {H}; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: 'Nunito', 'Segoe UI', sans-serif;
    background: #fffdfa; color: #2d2d2d;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }}
  .page {{
    width: {W}; height: {H}; padding: {PAD};
    display: flex; flex-direction: column; overflow: hidden;
  }}

  .header {{ text-align: center; margin-bottom: 5px; flex-shrink: 0; }}
  .header-icon {{ font-size: 19pt; line-height: 1; }}
  .header h1 {{
    font-family: 'Fredoka', sans-serif; font-size: 23pt; font-weight: 700;
    color: #1a1a2e; letter-spacing: 2px; text-transform: uppercase; margin: 1px 0;
  }}
  .header .subtitle {{
    font-family: 'Fredoka', sans-serif; font-size: 11.5pt; font-weight: 500;
    color: #a34a6b; letter-spacing: 2.5px; text-transform: uppercase;
  }}
  .header .tagline {{ font-size: 8pt; color: #7a7a7a; letter-spacing: 0.6px; margin-top: 3px; }}

  .size-bar {{
    background: #2d2d2d; color: #fff; text-align: center;
    font-family: 'Fredoka', sans-serif; font-size: 8pt; font-weight: 600;
    letter-spacing: 3.5px; text-transform: uppercase; padding: 5px 0;
    border-radius: 4px 4px 0 0;
  }}

  .columns {{
    flex: 1; display: flex; border: 2px solid #e6e0d8; border-top: none;
    border-radius: 0 0 4px 4px; overflow: hidden; min-height: 0;
  }}
  .col {{ flex: 1; display: flex; flex-direction: column; border-right: 1.5px solid #ece7e0; }}
  .col:last-child {{ border-right: none; }}

  .col-header {{ text-align: center; padding: 6px 5px 5px; flex-shrink: 0; }}
  .col-header .icon {{ font-size: 13pt; display: block; line-height: 1; margin-bottom: 2px; }}
  .col-header h2 {{
    font-family: 'Fredoka', sans-serif; font-size: 13.5pt; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.4px;
  }}
  .col-header .note {{ font-size: 6.6pt; line-height: 1.3; color: #6f6f6f; margin-top: 3px; padding: 0 4px; }}

  .col-lower .col-header {{ background: #e8f5e9; }}
  .col-lower .col-header h2 {{ color: #2e7d32; }}
  .col-mod .col-header {{ background: #fff8e1; }}
  .col-mod .col-header h2 {{ color: #c66a10; }}
  .col-high .col-header {{ background: #fdeaef; }}
  .col-high .col-header h2 {{ color: #b02a4a; }}

  .food-list {{ flex: 1; padding: 6px 8px; overflow: hidden; }}
  .col-lower .food-list {{ background: #f3f9f3; }}
  .col-mod .food-list {{ background: #fffdf4; }}
  .col-high .food-list {{ background: #fdf5f7; }}

  .food-section {{ margin-bottom: 3px; }}
  .food-section-title {{
    font-size: 6.6pt; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.8px; padding: 2px 0 1px;
    border-bottom: 1px dashed #d8d2ca; margin-bottom: 1px;
  }}
  .col-lower .food-section-title {{ color: #2e7d32; }}
  .col-mod .food-section-title {{ color: #c66a10; }}
  .col-high .food-section-title {{ color: #b02a4a; }}

  .food-item {{ font-size: 8.2pt; line-height: 1.4; display: flex; align-items: flex-start; gap: 4px; }}
  /* flex-basis, not width: a bare `width` loses to the sibling rule's
     flex-basis and the icon column balloons to half the tile. */
  .food-item .fi {{ font-size: 8pt; flex: 0 0 13px; text-align: center; }}
  .food-item .tx {{ flex: 1 1 auto; min-width: 0; }}

  /* Grocery sheet */
  .grid {{
    flex: 1; display: grid; grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr; gap: 8px 12px; padding-top: 8px; min-height: 0;
  }}
  .gbox {{
    border: 1.5px solid #ece7e0; border-radius: 6px; overflow: hidden;
    background: #fffdf9; display: flex; flex-direction: column;
  }}
  .gbox h3 {{
    font-family: 'Fredoka', sans-serif; font-size: 10pt; font-weight: 600;
    letter-spacing: 1.2px; text-transform: uppercase; color: #a34a6b;
    background: #fdf3f6; padding: 4px 8px; flex-shrink: 0;
  }}
  .gbox ul {{ list-style: none; padding: 6px 9px 7px; columns: 2; column-gap: 12px; flex: 1; }}
  .gbox.wide {{ grid-column: span 2; }}
  .gbox.wide ul {{ columns: 4; }}
  .gbox.wide .blanks {{ grid-template-columns: repeat(4, 1fr); }}
  .gbox li {{
    font-size: 8.4pt; line-height: 1.95; break-inside: avoid;
    display: flex; align-items: center; gap: 6px;
  }}
  /* Write-in rows. The note strip promises blank rows, so they have to exist,
     and they sit outside the two column list so the balancer cannot bury them. */
  .blanks {{
    display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; row-gap: 3px;
    padding: 0 9px 8px; flex-shrink: 0;
  }}
  .brow {{ display: flex; align-items: center; gap: 6px; height: 13px; }}
  .brow .rule {{ flex: 1; border-bottom: 1px dotted #cfc7bd; }}
  .tick {{
    width: 9px; height: 9px; border: 1.2px solid #b9b1a7;
    border-radius: 2px; flex-shrink: 0; background: #fff;
  }}
  .note-strip {{
    margin-top: 8px; border: 1.5px dashed #e0d8ce; border-radius: 6px;
    padding: 7px 10px; font-size: 8pt; line-height: 1.5; color: #6f6f6f;
    background: #fffdf7; flex-shrink: 0;
  }}

  /* Swaps sheet */
  .swaps {{ flex: 1; display: flex; flex-direction: column; padding-top: 9px; min-height: 0; }}
  .swap-head {{
    display: grid; grid-template-columns: 1fr 30px 1fr;
    font-family: 'Fredoka', sans-serif; font-size: 9pt; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase; color: #fff;
    background: #2d2d2d; border-radius: 4px 4px 0 0; padding: 5px 12px;
  }}
  /* Headers sit over the text they label, not over the column midpoint: the
     left column's text starts after a 15px icon plus a 6px gap. */
  .swap-head div:first-child {{ padding-left: 21px; }}
  .swap-rows {{ flex: 1; border: 2px solid #e6e0d8; border-top: none; border-radius: 0 0 4px 4px; overflow: hidden; }}
  .swap-row {{
    display: grid; grid-template-columns: 1fr 30px 1fr; align-items: center;
    padding: 0 12px; border-bottom: 1px solid #f0ebe4; height: calc((100% - 0px) / {NROWS});
  }}
  .swap-row:last-child {{ border-bottom: none; }}
  .swap-row:nth-child(odd) {{ background: #fffdf7; }}
  .swap-from {{ font-size: 9.5pt; color: #8a8078; display: flex; align-items: center; gap: 6px; }}
  .swap-from .fi {{ font-size: 10pt; width: 15px; text-align: center; }}
  .swap-arrow {{ text-align: center; color: #a34a6b; font-size: 12pt; font-weight: 800; }}
  .swap-to {{ font-size: 10pt; font-weight: 700; color: #2e7d32; }}

  .footer {{
    text-align: center; font-size: 6.2pt; color: #a8a29a;
    padding-top: 6px; flex-shrink: 0; letter-spacing: 0.4px;
  }}
"""


def shell(size_key, title, subtitle, tagline, icon, inner, nrows=1):
    s = SIZES[size_key]
    css = CSS.format(W=s["w"], H=s["h"], PAD=s["pad"], NROWS=nrows)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>{title}</title>
<style>{css}</style></head>
<body>
<div class="page">
  <div class="header">
    <div class="header-icon">{icon}</div>
    <h1>{title}</h1>
    <div class="subtitle">{subtitle}</div>
    <div class="tagline">{tagline}</div>
  </div>
  <div class="size-bar">{s['label']}&nbsp;&nbsp;|&nbsp;&nbsp;INSTANT DOWNLOAD</div>
  {inner}
  <div class="footer">{BRAND}&nbsp; &middot; &nbsp;{FINE_PRINT}</div>
</div>
</body></html>"""


def food_list_html():
    cols = []
    for key, icon, head, note, sections in COLUMNS:
        body = []
        for sec_title, items in sections:
            rows = "".join(
                f'<div class="food-item"><span class="fi">{ic}</span><span class="tx">{name}</span></div>'
                for ic, name in items
            )
            body.append(
                f'<div class="food-section"><div class="food-section-title">{sec_title}</div>{rows}</div>'
            )
        cols.append(
            f'<div class="col col-{key}">'
            f'<div class="col-header"><span class="icon">{icon}</span>'
            f'<h2>{head}</h2><div class="note">{note}</div></div>'
            f'<div class="food-list">{"".join(body)}</div></div>'
        )
    return f'<div class="columns">{"".join(cols)}</div>'


def grocery_html():
    boxes = []
    for entry in GROCERY:
        icon, head, items = entry[0], entry[1], entry[2]
        wide = " wide" if len(entry) > 3 else ""
        lis = "".join(f'<li><span class="tick"></span>{i}</li>' for i in items)
        # Write-in rows per aisle, so the note strip's promise is true.
        n = 4 if wide else 2
        blanks = '<span class="brow"><span class="tick"></span><span class="rule"></span></span>' * n
        boxes.append(
            f'<div class="gbox{wide}"><h3>{icon} {head}</h3><ul>{lis}</ul>'
            f'<div class="blanks">{blanks}</div></div>'
        )
    strip = (
        '<div class="note-strip">Shop the outside walls first. Meat, fish, eggs and '
        'fresh produce fill most of a cart, and the middle aisles are where the boxes live. '
        'Blank rows are on purpose, so add what your household actually eats.</div>'
    )
    return f'<div class="grid">{"".join(boxes)}</div>{strip}'


def swaps_html():
    rows = "".join(
        f'<div class="swap-row"><div class="swap-from"><span class="fi">{ic}</span>{a}</div>'
        f'<div class="swap-arrow">&rarr;</div><div class="swap-to">{b}</div></div>'
        for ic, a, b in SWAPS
    )
    return (
        '<div class="swaps">'
        '<div class="swap-head"><div>Instead of</div><div></div><div>Try</div></div>'
        f'<div class="swap-rows">{rows}</div></div>'
    )


SHEETS = {
    "food-list": dict(
        stem="diabetic-food-list",
        icon="\U0001F957",
        title="Diabetic Food List",
        subtitle="Sorted By Carbohydrate",
        tagline="A PLAIN, PRINTABLE LIST FOR YOUR FRIDGE. NO APPS, NO COUNTING, NO JARGON.",
        build=food_list_html,
    ),
    "grocery-list": dict(
        stem="diabetic-grocery-list",
        icon="\U0001F6D2",
        title="Diabetic Grocery List",
        subtitle="One Sheet, One Trip",
        tagline="TICK YOUR WAY ROUND THE STORE. FOLD IT, POCKET IT, GO HOME.",
        build=grocery_html,
    ),
    "swaps": dict(
        stem="diabetic-lower-carb-swaps",
        icon="\U0001F504",
        title="Lower Carb Swaps",
        subtitle="Same Meal, Less Carbohydrate",
        tagline="SIXTEEN SWAPS THAT KEEP THE MEAL YOU ALREADY LIKE.",
        build=swaps_html,
    ),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheets", nargs="*", choices=list(SHEETS) or None, default=None)
    ap.add_argument("--png", action="store_true", help="also write preview PNGs beside the PDFs")
    args = ap.parse_args()
    wanted = args.sheets or list(SHEETS)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        for key in wanted:
            cfg = SHEETS[key]
            for size_key, s in SIZES.items():
                html = shell(
                    size_key, cfg["title"], cfg["subtitle"], cfg["tagline"],
                    cfg["icon"], cfg["build"](), nrows=len(SWAPS),
                )
                page.set_content(html, wait_until="networkidle")
                page.emulate_media(media="print")
                out = OUT_DIR / f"{cfg['stem']}-{size_key}-DRAFT.pdf"
                page.pdf(path=str(out), width=s["w"], height=s["h"],
                         margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                         print_background=True, scale=1.0)
                print("built", out)
                if args.png:
                    px = {"letter": (816, 1056), "a4": (794, 1123)}[size_key]
                    page.set_viewport_size({"width": px[0], "height": px[1]})
                    page.screenshot(path=str(OUT_DIR / f"{cfg['stem']}-{size_key}-DRAFT.png"))
        browser.close()


if __name__ == "__main__":
    sys.exit(main())

# OMITTED ON PURPOSE, because the argument is live and a printable sheet is the
# wrong place to settle it:
#   * Artificial and non-nutritive sweeteners (sucralose, aspartame, stevia,
#     monk fruit, sugar alcohols). Placing them anywhere on a carbohydrate
#     scale invites a health reading the sheet is not making.
#   * Alcohol of every kind. Carbohydrate content and the rest of the picture
#     point in different directions, and it is genuinely contested.
#   * Any serving size, gram figure, glycemic index or glycemic load number.
#     Numbers turn a food list into a prescription, and the source figures
#     vary by database and by preparation.
#   * Anything about medication, testing, timing or meal frequency.

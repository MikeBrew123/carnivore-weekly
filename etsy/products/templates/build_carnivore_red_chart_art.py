#!/usr/bin/env python3
"""Extract the food illustrations out of the live red carnivore chart.

Context: the Etsy listing 4464217679 photos show a modern red-and-white chart
with 10 sections, but the file buyers download is the old cream-and-sepia
8-section design. See reports/carnivore-chart-mismatch-2026-08-11.md in the
vault. The fix is to rebuild the red chart as a real 8.5x11 300 DPI PDF.

The red chart only survives as a 2000x3000 JPEG pulled off the live listing on
2026-08-10. That is a 2:3 poster shape, so at 300 DPI it prints 6.67x10in,
short of the 8.5x11 the listing promises. Upscaling the whole thing is not
acceptable, so the chart gets retypeset: all the TEXT is rebuilt as real text
in fridge-card-carnivore-red.html, and only the eight watercolour food
illustrations are lifted out of the JPEG and reused here.

HARD RULE (Brew's lessons-learned): nothing here is AI generated. Every
illustration is a crop of the real artwork already shown in the listing photos.

Run:  python3 products/templates/build_carnivore_red_chart_art.py   (cwd=etsy/)
Out:  products/product-images/carnivore-red-chart-art/<name>.png
"""
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ETSY = HERE.parent.parent
SRC = (
    ETSY
    / "products"
    / "listing-images"
    / "food-list-buildout-2026-08-10"
    / "originals"
    / "carn-1.jpg"
)
OUT = ETSY / "products" / "product-images" / "carnivore-red-chart-art"

# Bounding boxes measured off carn-1.jpg (2000x3000) by colour-saturation mask.
# The Organ Meats and How To Eat panels carry no illustration in the original.
CROPS = {
    "beef": (84, 560, 637, 963),
    "eggs-dairy": (1057, 579, 1507, 929),
    "fish-seafood": (76, 1149, 626, 1486),
    "poultry": (1050, 1105, 1565, 1500),
    "pork": (67, 1609, 643, 1976),
    "animal-fats": (1114, 1658, 1403, 2000),
    "beverages": (1076, 2206, 1497, 2448),
    "seasonings-salt": (133, 2617, 508, 2878),
}

# The Pork and Poultry artwork tucks up under its own section heading, so a
# plain rectangle drags a slice of the old "PORK" / "POULTRY" lettering along
# with it. These boxes (same source coordinates) get painted back to white.
ERASE = {
    "pork": [(60, 1550, 305, 1660)],
    "poultry": [(1040, 1015, 1360, 1110)],
}

PAD = 18  # keep the soft drop shadow that sits under each illustration


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGB")
    for name, (x0, y0, x1, y1) in CROPS.items():
        box = (
            max(0, x0 - PAD),
            max(0, y0 - PAD),
            min(src.width, x1 + PAD),
            min(src.height, y1 + PAD),
        )
        crop = src.crop(box)
        for ex0, ey0, ex1, ey1 in ERASE.get(name, []):
            ImageDraw.Draw(crop).rectangle(
                [ex0 - box[0], ey0 - box[1], ex1 - box[0], ey1 - box[1]],
                fill=(255, 255, 255),
            )
        dest = OUT / f"{name}.png"
        crop.save(dest, "PNG", optimize=True)
        print(f"  {dest.name}  {crop.width}x{crop.height}")


if __name__ == "__main__":
    main()

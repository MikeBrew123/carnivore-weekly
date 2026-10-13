"""Composite real report screenshots onto the empty scene plates in ./plates, 800x597.
Used by build.sh. The plates are AI-generated EMPTY scenes (flux-1.1-pro, 2026-10-13,
$0.20 via scripts/image_budget.py) holding a blank sheet; the product on the sheet is
always the real page, warped by scripts/composite_product_scene.py. Corners are fixed
because auto-detect misreads three of these plates."""
import sys
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from composite_product_scene import composite  # noqa: E402

WORK, OUT = Path(sys.argv[1]), Path(sys.argv[2])
# shot -> (output file, sheet corners TL,TR,BR,BL in plate pixels, final crop box)
JOBS = {
    'physician': ('physician-guide', [(470, 163), (943, 322), (816, 842), (266, 668)], None),
    'stall': ('stall-breaker-protocol', [(396, 287), (854, 283), (863, 822), (392, 822)], None),
    'meal': ('kryptonite-kitchen', [(434, 233), (908, 209), (921, 749), (429, 749)], (73, 20, 1079, 770)),
    'grocery': ('kryptonite-prep', [(335, 105), (854, 110), (850, 808), (333, 806)], None),
    'lab': ('lab-reference', [(322, 390), (670, 230), (966, 648), (592, 858)], None),
}
for shot, (name, quad, box) in JOBS.items():
    page = WORK / 'shots' / f'{shot}.png'
    if shot == 'physician':  # near-square sheet: crop the page to its shape, never squash text
        im = Image.open(page); w = im.width
        page = WORK / 'shots' / 'physician_sq.png'; im.crop((0, 0, w, int(w * 535 / 499))).save(page)
    tmp = WORK / f'{shot}-comp.jpg'
    composite(page, HERE / 'plates' / f'{shot}.jpg', tmp, corners=quad)
    im = Image.open(tmp)
    if box is None:
        h = round(im.width * 597 / 800); y = (im.height - h) // 2; box = (0, y, im.width, y + h)
    im.crop(box).resize((800, 597), Image.LANCZOS).save(OUT / f'{name}.jpg', quality=86, optimize=True, progressive=True)

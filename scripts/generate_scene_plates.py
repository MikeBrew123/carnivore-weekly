#!/usr/bin/env python3
"""
Generate EMPTY lifestyle scene plates on Replicate for Etsy product mockups.

These plates contain NO product. The real product page is composited in
afterwards by scripts/composite_product_scene.py using Pillow. That is a house
rule (CLAUDE.md): product mockups MUST use the actual product screenshot
composited into a generated empty scene. Never an AI-generated fake of the
product. It is also the only way the gallery images and the video stay
consistent with each other, because they all carry the identical page render.

Spend is gated by scripts/image_budget.py ($1.00/day shared CW + KD, fails
closed). Model unit costs must already exist in config/image-budget.json.

Usage:
  python3 scripts/generate_scene_plates.py --draft          # flux-schnell, $0.003 each
  python3 scripts/generate_scene_plates.py --final          # flux-1.1-pro, $0.04 each
  python3 scripts/generate_scene_plates.py --final --only counter
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "scripts"))

from image_budget import BudgetBlocked, ImageBudget  # noqa: E402

OUT_DIR = BASE_DIR / "etsy" / "products" / "scene-plates"
SECRETS = BASE_DIR / "secrets" / "api-keys.json"

DRAFT_MODEL = "black-forest-labs/flux-schnell"
FINAL_MODEL = "black-forest-labs/flux-1.1-pro"

# Replicate sits behind Cloudflare, which 403s urllib's default User-Agent
# (error code 1010). A normal UA is required.
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " \
     "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"

# Every prompt describes an EMPTY surface with a blank sheet of paper on it.
# The blank sheet is the composite target. Flat, square-on framing keeps the
# perspective transform simple and keeps the product readable in the result.
SCENES = {
    "counter": (
        "A single blank sheet of white printer paper in PORTRAIT orientation, "
        "clearly taller than it is wide, lying flat on a light oak kitchen "
        "counter, photographed straight down from directly above. The paper is "
        "an upright rectangle, pure blank white, no text, no print, no lines, "
        "no shadows across it. Soft morning daylight from a window. A white "
        "ceramic coffee mug and a small linen napkin sit to the side, outside "
        "the paper, slightly out of focus. Warm, calm, homely kitchen. "
        "Photorealistic, natural colours, shot on a 50mm lens."
    ),
    "fridge": (
        "A blank sheet of white paper in PORTRAIT orientation, clearly taller "
        "than it is wide, held by two simple magnets on a clean stainless steel "
        "fridge door, photographed straight on at eye level. The paper is an "
        "upright rectangle, pure blank white, completely empty, no text or "
        "printing of any kind. Bright even kitchen light, soft reflections on "
        "the steel. Tidy modern family kitchen slightly blurred at the edges. "
        "Photorealistic, natural colours."
    ),
    "clipboard": (
        "A wooden clipboard in PORTRAIT orientation lying flat on a pale marble "
        "worktop, holding a single blank sheet of white paper that is clearly "
        "taller than it is wide, photographed straight down from above. The "
        "paper is an upright rectangle, pure blank white, entirely empty, no "
        "writing, no lines. A pen rests beside the clipboard. Soft diffused "
        "daylight. Clean, organised, calm. Photorealistic."
    ),
}


def load_token():
    return json.loads(SECRETS.read_text())["replicate"]["api_token"]


def post_json(url, payload, token):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": UA,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def get_json(url, token):
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {token}", "User-Agent": UA}
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def generate(name, prompt, model, token, budget, aspect="4:5"):
    ok, why = budget.check(model)
    if not ok:
        print(f"  SKIPPED {name} (budget): {why}")
        return None

    inputs = {"prompt": prompt, "output_format": "jpg"}
    if model == DRAFT_MODEL:
        inputs.update({"aspect_ratio": aspect, "num_outputs": 1, "go_fast": True})
    else:
        inputs.update({"aspect_ratio": aspect, "output_quality": 95, "safety_tolerance": 2})

    pred = post_json(
        f"https://api.replicate.com/v1/models/{model}/predictions",
        {"input": inputs},
        token,
    )

    url = pred["urls"]["get"]
    for _ in range(90):
        if pred["status"] in ("succeeded", "failed", "canceled"):
            break
        time.sleep(2)
        pred = get_json(url, token)

    if pred["status"] != "succeeded":
        print(f"  FAILED {name}: {pred['status']} {pred.get('error')}")
        return None

    out = pred["output"]
    img_url = out[0] if isinstance(out, list) else out

    tag = "draft" if model == DRAFT_MODEL else "final"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    dest = OUT_DIR / f"{name}-{tag}.jpg"
    req = urllib.request.Request(img_url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())

    # Only record spend once the file is actually on disk.
    budget.record(site="cw", post=f"flagship-scene-{name}", image=str(dest), model=model)
    print(f"  OK {name} -> {dest.relative_to(BASE_DIR)}  ({dest.stat().st_size // 1024} KB)")
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--draft", action="store_true", help=f"cheap pass ({DRAFT_MODEL})")
    ap.add_argument("--final", action="store_true", help=f"quality pass ({FINAL_MODEL})")
    ap.add_argument("--only", help="generate a single scene by name")
    args = ap.parse_args()

    if args.draft == args.final:
        ap.error("pick exactly one of --draft / --final")

    model = DRAFT_MODEL if args.draft else FINAL_MODEL
    scenes = {args.only: SCENES[args.only]} if args.only else SCENES

    token = load_token()
    try:
        budget = ImageBudget()
    except BudgetBlocked as e:
        print(f"BUDGET BLOCKED: {e}")
        return 1

    print(f"Model: {model}   scenes: {', '.join(scenes)}")
    for name, prompt in scenes.items():
        try:
            generate(name, prompt, model, token, budget)
        except urllib.error.HTTPError as e:
            print(f"  HTTP {e.code} on {name}: {e.read()[:200]}")
        except Exception as e:  # noqa: BLE001
            print(f"  ERROR on {name}: {e}")

    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Generate recipe hero images via Replicate flux-schnell (~$0.003/image).

Reads a voice JSON file (array with slug + image_prompt) and writes
public/images/recipes/recipe-{slug}.jpg for any slug missing an image.

Usage: python3 generate_recipe_images.py <voice.json>
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

CW_REPO = Path("/Users/mbrew/Developer/carnivore-weekly")
sys.path.insert(0, str(CW_REPO / "scripts"))
from image_budget import BudgetBlocked, ImageBudget  # noqa: E402

ROOT = Path(__file__).parent.parent / "public"
IMG_DIR = ROOT / "images" / "recipes"
SECRETS = CW_REPO / "secrets" / "api-keys.json"
IMAGE_MODEL = "black-forest-labs/flux-schnell"
BRAND_SUFFIX = ("warm natural light, rich earthy tones, shallow depth of field, "
                "high detail, photorealistic, no text, no people")


def generate(api_token, prompt):
    payload = json.dumps({
        "input": {"prompt": prompt, "aspect_ratio": "4:3", "output_format": "jpg", "num_outputs": 1}
    }).encode()
    req = urllib.request.Request(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
        data=payload,
        headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json", "Prefer": "wait"},
        method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        pred = json.loads(resp.read())
    for _ in range(30):
        if pred.get("status") == "succeeded":
            out = pred.get("output")
            return out if isinstance(out, str) else out[0]
        if pred.get("status") in ("failed", "canceled"):
            raise RuntimeError(f"Replicate {pred['status']}: {pred.get('error')}")
        req = urllib.request.Request(pred["urls"]["get"], headers={"Authorization": f"Bearer {api_token}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            pred = json.loads(resp.read())
        time.sleep(3)
    raise TimeoutError("Replicate timed out")


def main():
    # Same $1.00/day pool as CW and KD post images. Recipes are not a separate
    # allowance.
    budget = ImageBudget()
    if not budget.available:
        print(f"IMAGE BUDGET UNAVAILABLE: {budget.blocked_reason}")
        print("Generated nothing (fail closed).")
        return

    token = json.load(open(SECRETS))["replicate"]["api_token"]
    recipes = json.load(open(sys.argv[1]))
    for r in recipes:
        dest = IMG_DIR / f"recipe-{r['slug']}.jpg"
        if dest.exists():
            print(f"SKIP {dest.name} — exists")
            continue
        ok, why = budget.check(IMAGE_MODEL)
        if not ok:
            print(f"STOP budget: {why}")
            break
        url = generate(token, f"{r['image_prompt']} {BRAND_SUFFIX}")
        with urllib.request.urlopen(url, timeout=60) as resp:
            dest.write_bytes(resp.read())
        try:
            budget.record(
                site="kd", post=r["slug"], image=f"/images/recipes/{dest.name}",
                model=IMAGE_MODEL, note="recipe hero",
            )
        except BudgetBlocked as e:
            print(f"STOP ledger write failed: {e}")
            break
        print(f"OK   {dest.name} ({dest.stat().st_size // 1024} KB)")

    print(f"Image spend today: ${budget.spent_today:.4f} of ${budget.cap:.2f}")


if __name__ == "__main__":
    main()

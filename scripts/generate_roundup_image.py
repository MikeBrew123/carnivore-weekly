#!/usr/bin/env python3
"""
Generate a weekly roundup hero image via Replicate (Flux 1.1 Pro).

Reads the weekly summary, uses Claude to write a cinematic photo prompt,
calls Replicate to generate the image, saves to public/images/roundup-YYYY-MM-DD.webp.

Prints the relative image path on stdout so callers can capture it.
Usage:
    python3 scripts/generate_roundup_image.py
    python3 scripts/generate_roundup_image.py --dry-run
"""

import json
import os
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SECRETS_FILE = BASE_DIR / "secrets" / "api-keys.json"
ANALYZED_CONTENT = BASE_DIR / "data" / "analyzed_content.json"
IMAGES_DIR = BASE_DIR / "public" / "images"

BRAND_SUFFIX = (
    "warm natural light, rich earthy tones, shallow depth of field, "
    "high detail, photorealistic, no text, no people"
)


def load_secrets():
    secrets = json.loads(SECRETS_FILE.read_text())
    # Env var overrides secrets file
    env_token = os.environ.get("REPLICATE_API_TOKEN", "")
    if env_token:
        secrets.setdefault("replicate", {})["api_token"] = env_token
    return secrets


def get_weekly_summary():
    try:
        data = json.loads(ANALYZED_CONTENT.read_text())
        return data.get("weekly_summary", "")
    except Exception:
        return ""


def build_image_prompt_via_claude(api_key, summary):
    """Ask Claude to distill the summary into a vivid scene for image generation."""
    if not summary:
        return "A sunlit farmers market meat counter with cuts of grass-fed beef and pasture-raised eggs, " + BRAND_SUFFIX

    user_prompt = f"""Based on this carnivore community weekly summary, write a single vivid scene description for a photorealistic lifestyle image. Output only the scene description — no explanation, no quotes.

Rules:
- Reflect the ACTUAL theme or mood of this week — not just "steak on a board"
- If the week is about food policy/politics: think farmers market, grocery store, family dinner table
- If the week is about community/people: think someone cooking at home, meal prep, a kitchen scene
- If the week is about science/health: think close-up ingredients, a simple meal, organ meats
- Only default to a hero steak shot if the week genuinely has no other dominant theme
- Be specific and visual — one concrete scene, not a list of foods
- No text in the image, no people

Weekly summary:
{summary[:600]}

Output format: one sentence describing the scene, ending with a comma."""

    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 120,
        "messages": [{"role": "user", "content": user_prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        scene = json.loads(resp.read())["content"][0]["text"].strip()

    return f"{scene} {BRAND_SUFFIX}"


def generate_image_replicate(api_token, prompt):
    """Submit prediction to Replicate and poll until complete."""
    model = "google/nano-banana-pro"

    # Create prediction
    payload = json.dumps({
        "input": {
            "prompt": prompt,
            "aspect_ratio": "4:3",
            "output_format": "jpg",
            "resolution": "1K",
            "image_input": [],
            "safety_filter_level": "block_only_high",
            "allow_fallback_model": False,
        }
    }).encode()

    req = urllib.request.Request(
        f"https://api.replicate.com/v1/models/{model}/predictions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
            "Prefer": "wait",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        prediction = json.loads(resp.read())

    # Poll if not immediately done
    for _ in range(30):
        status = prediction.get("status")
        if status == "succeeded":
            output = prediction.get("output")
            return output if isinstance(output, str) else output[0]
        if status in ("failed", "canceled"):
            raise RuntimeError(f"Replicate prediction {status}: {prediction.get('error')}")

        poll_url = prediction["urls"]["get"]
        req = urllib.request.Request(
            poll_url,
            headers={"Authorization": f"Bearer {api_token}"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            prediction = json.loads(resp.read())
        time.sleep(3)

    raise TimeoutError("Replicate prediction timed out")


def download_image(url, dest_path):
    with urllib.request.urlopen(url, timeout=60) as resp:
        dest_path.write_bytes(resp.read())


def main():
    dry_run = "--dry-run" in sys.argv

    secrets = load_secrets()
    anthropic_key = secrets.get("anthropic", {}).get("key", "")
    replicate_token = secrets.get("replicate", {}).get("api_token", "")

    if not anthropic_key:
        print("ERROR: No Anthropic key", file=sys.stderr)
        sys.exit(1)
    if not replicate_token:
        print("ERROR: No Replicate token", file=sys.stderr)
        sys.exit(1)

    summary = get_weekly_summary()
    print(f"   Summary: {summary[:80]}...", file=sys.stderr)

    prompt = build_image_prompt_via_claude(anthropic_key, summary)
    print(f"   Prompt: {prompt[:100]}...", file=sys.stderr)

    if dry_run:
        print("   [DRY RUN] Would call Replicate", file=sys.stderr)
        print("/images/lifestyle-cooking-1200w.webp")
        return

    image_url = generate_image_replicate(replicate_token, prompt)
    print(f"   Generated: {image_url}", file=sys.stderr)

    date_str = datetime.now().strftime("%Y-%m-%d")
    dest = IMAGES_DIR / f"roundup-{date_str}.jpg"
    download_image(image_url, dest)
    print(f"   Saved: {dest}", file=sys.stderr)

    # Print relative path for caller to capture
    print(f"/images/roundup-{date_str}.jpg")


if __name__ == "__main__":
    main()

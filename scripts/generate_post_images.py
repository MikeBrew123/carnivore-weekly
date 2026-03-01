#!/usr/bin/env python3
"""
Generate float-right article images for blog posts via Replicate (nano-banana-pro).

For each post with status "ready" or "published" that has no image field,
uses Claude to write a scene prompt from the post title + excerpt,
calls Replicate, saves to public/images/blog/{slug}.jpg,
and updates blog_posts.json with the image path.

Usage:
    python3 scripts/generate_post_images.py              # All queued posts missing images
    python3 scripts/generate_post_images.py --slug some-slug   # One specific post
    python3 scripts/generate_post_images.py --dry-run    # Show prompts, no API calls
"""

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SECRETS_FILE = BASE_DIR / "secrets" / "api-keys.json"
POSTS_FILE = BASE_DIR / "data" / "blog_posts.json"
IMAGES_DIR = BASE_DIR / "public" / "images" / "blog"

BRAND_SUFFIX = (
    "warm natural light, rich earthy tones, shallow depth of field, "
    "high detail, photorealistic, no text, no people"
)


def load_secrets():
    secrets = json.loads(SECRETS_FILE.read_text())
    env_token = os.environ.get("REPLICATE_API_TOKEN", "")
    if env_token:
        secrets.setdefault("replicate", {})["api_token"] = env_token
    return secrets


def build_image_prompt(api_key, title, excerpt, author, content=""):
    """Claude reads the actual post content and writes a relevant scene — not just steak."""
    # Strip HTML tags from content for context
    import re
    clean_content = re.sub(r"<[^>]+>", " ", content)
    clean_content = re.sub(r"\s+", " ", clean_content).strip()[:800]

    user_prompt = f"""A blog post needs a small float-right in-article image. Read the post and write a single vivid scene for a photorealistic lifestyle photo that reflects what the post is actually about.

Post title: {title}
Author: {author}
Excerpt: {excerpt[:200]}
Post content (first 800 chars): {clean_content}

Rules:
- Read the content carefully — what is the post really about? Match that.
- Examples: histamine post → simple fresh beef, no cured/aged foods; dental post → someone carefully plating a clean meal; air fryer post → a modern kitchen counter with an air fryer; social settings post → a restaurant table with simple meat dish; early weight gain → a scale or meal prep; SIBO/gut post → bone broth or simple protein; fat thirst → a glass of water beside fatty meat
- Do NOT default to a hero steak shot unless steak is the literal subject
- One concrete, specific scene — not a list of foods
- No text, no people, no faces

Output: one sentence describing the scene, ending with a comma."""

    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 150,
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
        "https://api.replicate.com/v1/models/google/nano-banana-pro/predictions",
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

    for _ in range(30):
        status = prediction.get("status")
        if status == "succeeded":
            output = prediction.get("output")
            return output if isinstance(output, str) else output[0]
        if status in ("failed", "canceled"):
            raise RuntimeError(f"Replicate {status}: {prediction.get('error')}")
        poll_url = prediction["urls"]["get"]
        req = urllib.request.Request(poll_url, headers={"Authorization": f"Bearer {api_token}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            prediction = json.loads(resp.read())
        time.sleep(3)

    raise TimeoutError("Replicate timed out")


def main():
    dry_run = "--dry-run" in sys.argv
    target_slug = None
    if "--slug" in sys.argv:
        idx = sys.argv.index("--slug")
        target_slug = sys.argv[idx + 1]

    secrets = load_secrets()
    api_key = secrets.get("anthropic", {}).get("key", "")
    replicate_token = secrets.get("replicate", {}).get("api_token", "")

    if not api_key:
        print("ERROR: No Anthropic key", file=sys.stderr)
        sys.exit(1)
    if not replicate_token and not dry_run:
        print("ERROR: No Replicate token", file=sys.stderr)
        sys.exit(1)

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    data = json.loads(POSTS_FILE.read_text())
    posts = data["blog_posts"]

    targets = [
        p for p in posts
        if p.get("status") in ("ready", "published")
        and not p.get("image")
        and (not target_slug or p.get("slug") == target_slug)
    ]

    if not targets:
        print("No posts need images.")
        return

    print(f"Generating images for {len(targets)} posts...")
    changed = False

    for post in targets:
        slug = post["slug"]
        title = post.get("title", slug)
        excerpt = post.get("excerpt", "")
        author = post.get("author", "")
        content = post.get("content", "")
        dest = IMAGES_DIR / f"{slug}.jpg"

        print(f"\n→ {slug[:60]}")

        prompt = build_image_prompt(api_key, title, excerpt, author, content)
        print(f"  Prompt: {prompt[:100]}...")

        if dry_run:
            print("  [DRY RUN] skipping Replicate call")
            continue

        if dest.exists():
            print(f"  Image already exists, skipping generation")
        else:
            image_url = generate_image_replicate(replicate_token, prompt)
            with urllib.request.urlopen(image_url, timeout=60) as r:
                dest.write_bytes(r.read())
            print(f"  Saved: {dest}")

        post["image"] = f"/images/blog/{slug}.jpg"
        changed = True

    if changed and not dry_run:
        POSTS_FILE.write_text(json.dumps(data, indent=2))
        print(f"\n✅ Updated blog_posts.json with image paths")


if __name__ == "__main__":
    main()

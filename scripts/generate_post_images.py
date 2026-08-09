#!/usr/bin/env python3
"""
Generate float-right article images for blog posts via Replicate (nano-banana-pro).

For each post with status "ready" or "published" that has no image field,
uses Claude to write a scene prompt from the post title + excerpt,
calls Replicate, saves to public/images/blog/{slug}.jpg,
and updates blog_posts.json with the image path.

Every paid call is gated by the SHARED CW+KD daily spend cap in
scripts/image_budget.py ($1.00/day across both sites). The cap fails closed:
if the ledger or config cannot be read, no images are generated.

This script is FORWARD LOOKING by default. It only touches posts publishing
today or later, so a stale backlog can never be swept in one run. Use
--include-backlog deliberately if you actually want old posts filled in.

Usage:
    python3 scripts/generate_post_images.py              # Upcoming CW posts missing images
    python3 scripts/generate_post_images.py --site kd    # Same for KetoDial
    python3 scripts/generate_post_images.py --slug some-slug   # One specific post
    python3 scripts/generate_post_images.py --dry-run    # Plan and price it, zero API calls
    python3 scripts/generate_post_images.py --max-images 3
    python3 scripts/generate_post_images.py --include-backlog  # opt in to old posts
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from image_budget import BudgetBlocked, ImageBudget, today_str  # noqa: E402

BASE_DIR = Path(__file__).parent.parent

PROMPT_MODEL = "claude-haiku-4-5-20251001"
IMAGE_MODEL = "black-forest-labs/flux-schnell"

# Safety rail independent of the dollar cap: even a cheap model should never
# fire hundreds of times in one unattended run.
DEFAULT_MAX_IMAGES = 10
SECRETS_FILE = BASE_DIR / "secrets" / "api-keys.json"
POSTS_FILE = BASE_DIR / "data" / "blog_posts.json"
CW_IMAGES_DIR = BASE_DIR / "public" / "images" / "blog"
KD_IMAGES_DIR = BASE_DIR / "ketodial" / "public" / "images" / "blog"

BRAND_SUFFIX = (
    "warm natural light, rich earthy tones, shallow depth of field, "
    "high detail, photorealistic, no text, no people"
)


def load_secrets():
    if SECRETS_FILE.exists():
        secrets = json.loads(SECRETS_FILE.read_text())
    else:
        secrets = {}
    env_token = os.environ.get("REPLICATE_API_TOKEN", "")
    if env_token:
        secrets.setdefault("replicate", {})["api_token"] = env_token
    env_anthropic = os.environ.get("ANTHROPIC_API_KEY", "")
    if env_anthropic:
        secrets.setdefault("anthropic", {})["key"] = env_anthropic
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
        "model": PROMPT_MODEL,
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
            "num_outputs": 1,
        }
    }).encode()

    req = urllib.request.Request(
        f"https://api.replicate.com/v1/models/{IMAGE_MODEL}/predictions",
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


def strip_date_prefix(slug: str) -> str:
    import re
    return re.sub(r"^\d{4}-\d{2}-\d{2}-", "", slug)


def main():
    dry_run = "--dry-run" in sys.argv
    include_backlog = "--include-backlog" in sys.argv
    target_slug = None
    site_filter = "cw"
    max_images = DEFAULT_MAX_IMAGES

    if "--slug" in sys.argv:
        idx = sys.argv.index("--slug")
        target_slug = sys.argv[idx + 1]
    if "--site" in sys.argv:
        idx = sys.argv.index("--site")
        site_filter = sys.argv[idx + 1]
    if "--max-images" in sys.argv:
        idx = sys.argv.index("--max-images")
        max_images = int(sys.argv[idx + 1])

    images_dir = KD_IMAGES_DIR if site_filter == "kd" else CW_IMAGES_DIR

    budget = ImageBudget(dry_run=dry_run)
    if not budget.available:
        print(f"IMAGE BUDGET UNAVAILABLE: {budget.blocked_reason}")
        print("Skipping all image generation (fail closed). No API calls made.")
        return
    print(
        f"Image budget: ${budget.spent_today:.4f} spent of ${budget.cap:.2f} today "
        f"(shared CW+KD), ${budget.remaining:.4f} remaining"
    )

    secrets = load_secrets()
    api_key = secrets.get("anthropic", {}).get("key", "")
    replicate_token = secrets.get("replicate", {}).get("api_token", "")

    if not api_key:
        print("ERROR: No Anthropic key", file=sys.stderr)
        sys.exit(1)
    if not replicate_token and not dry_run:
        print("ERROR: No Replicate token", file=sys.stderr)
        sys.exit(1)

    images_dir.mkdir(parents=True, exist_ok=True)

    data = json.loads(POSTS_FILE.read_text())
    posts = data["blog_posts"]

    targets = [
        p for p in posts
        if p.get("status") in ("ready", "published")
        and not p.get("image")
        and p.get("site", "cw") == site_filter
        and (not target_slug or p.get("slug") == target_slug)
    ]

    # Forward looking only. An unattended run must never sweep the archive:
    # that is how a $1 cap turns into a surprise. An explicit --slug or
    # --include-backlog is a human saying yes on purpose.
    if not target_slug and not include_backlog:
        cutoff = today_str(budget.tz_name)
        skipped_old = [p for p in targets if str(p.get("publish_date", "")) < cutoff]
        targets = [p for p in targets if str(p.get("publish_date", "")) >= cutoff]
        if skipped_old:
            print(
                f"Skipping {len(skipped_old)} backlog {site_filter.upper()} post(s) "
                f"published before {cutoff} (use --include-backlog to fill them in)"
            )

    if not targets:
        print(f"No {site_filter.upper()} posts need images.")
        return

    if len(targets) > max_images:
        print(f"Capping this run at {max_images} of {len(targets)} eligible posts")
        targets = targets[:max_images]

    print(f"Generating images for {len(targets)} {site_filter.upper()} posts...")
    changed = False

    for post in targets:
        slug = post["slug"]
        file_slug = strip_date_prefix(slug) if site_filter == "kd" else slug
        title = post.get("title", slug)
        excerpt = post.get("excerpt", "")
        author = post.get("author", "")
        content = post.get("content", "")
        dest = images_dir / f"{file_slug}.jpg"

        print(f"\n-> {slug[:60]}")

        # Free path first: an existing file costs nothing, so never pay Claude
        # to write a prompt we are about to throw away.
        image_ready = dest.exists()
        if image_ready:
            print("  Image already exists, skipping generation")
            post["image"] = f"/images/blog/{file_slug}.jpg"
            changed = True
            POSTS_FILE.write_text(json.dumps(data, indent=2))
            continue

        # Budget gate: price the prompt call AND the image call together, so we
        # never buy a prompt we cannot afford to turn into a picture.
        ok, why = budget.check_pair(PROMPT_MODEL, IMAGE_MODEL)
        if not ok:
            print(f"  SKIPPED (budget): {why}")
            print("  Stopping: the shared CW+KD daily image cap is spent.")
            break

        if dry_run:
            # A dry run costs nothing. It used to call Claude for the scene
            # prompt, which is a real charge the ledger never saw.
            cost = budget.unit_cost(PROMPT_MODEL) + budget.unit_cost(IMAGE_MODEL)
            budget.record(
                site=site_filter, post=slug, image=f"/images/blog/{file_slug}.jpg",
                model=IMAGE_MODEL, cost_usd=cost, note="dry run, not charged",
            )
            print(f"  [DRY RUN] would generate {dest.name} for ~${cost:.4f}")
            continue

        try:
            prompt = build_image_prompt(api_key, title, excerpt, author, content)
        except Exception as e:
            print(f"  Failed to build prompt, skipping post: {e}")
            continue

        try:
            budget.record(
                site=site_filter, post=slug, image="", model=PROMPT_MODEL,
                note="scene prompt",
            )
        except BudgetBlocked as e:
            print(f"  LEDGER WRITE FAILED: {e}")
            print("  Stopping before any image is generated (fail closed).")
            break
        print(f"  Prompt: {prompt[:100]}...")

        try:
            for attempt in range(3):
                # Re-checked on every retry: a retry is another billable call.
                ok, why = budget.check(IMAGE_MODEL)
                if not ok:
                    print(f"  SKIPPED (budget): {why}")
                    break
                try:
                    image_url = generate_image_replicate(replicate_token, prompt)
                    with urllib.request.urlopen(image_url, timeout=60) as r:
                        dest.write_bytes(r.read())
                    budget.record(
                        site=site_filter, post=slug,
                        image=f"/images/blog/{file_slug}.jpg", model=IMAGE_MODEL,
                    )
                    print(
                        f"  Saved: {dest}  "
                        f"(${budget.spent_today:.4f} of ${budget.cap:.2f} today)"
                    )
                    image_ready = True
                    break
                except BudgetBlocked as e:
                    print(f"  LEDGER WRITE FAILED after generating: {e}")
                    image_ready = dest.exists()
                    break
                except urllib.error.HTTPError as e:
                    if e.code == 429 and attempt < 2:
                        wait = 10 * (attempt + 1)
                        print(f"  Rate limited, waiting {wait}s...")
                        time.sleep(wait)
                    else:
                        print(f"  Failed after {attempt+1} attempts: {e}")
                        break
                except (RuntimeError, TimeoutError) as e:
                    if attempt < 2:
                        wait = 10 * (attempt + 1)
                        print(f"  Replicate error ({e}), retrying in {wait}s...")
                        time.sleep(wait)
                    else:
                        print(f"  Failed after {attempt+1} attempts: {e}")
                        break
            time.sleep(3)
        except Exception as e:
            print(f"  Unexpected error, skipping post: {e}")
            continue

        if image_ready:
            post["image"] = f"/images/blog/{file_slug}.jpg"
            changed = True
            POSTS_FILE.write_text(json.dumps(data, indent=2))

    print(
        f"\nImage spend today: ${budget.spent_today:.4f} of ${budget.cap:.2f} "
        f"(shared CW+KD), ${budget.remaining:.4f} left"
    )

    if changed and not dry_run:
        print(f"\n Updated blog_posts.json with image paths")
        subprocess.run(["git", "add", str(images_dir)], cwd=str(BASE_DIR), capture_output=True)
        # The ledger is the only record of what was spent. Stage it with the
        # images so a run's cost cannot silently disappear.
        subprocess.run(
            ["git", "add", str(budget.ledger_file)], cwd=str(BASE_DIR), capture_output=True
        )
        print(f" Staged generated images and spend ledger for git")


if __name__ == "__main__":
    main()

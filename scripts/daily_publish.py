#!/usr/bin/env python3
"""
Daily Blog Publisher
====================
Called by .github/workflows/daily-publish.yml every day at 9 AM EST.

Finds posts with status="ready" and publish_date <= today,
flips them to published, re-renders the site, and validates.

BACKLOG PREVENTION: Uses <= (not ==) for date check.
If the cron misses a day or a post has a past date, it still gets published
on the next run. No post can sit in the queue past its date.
"""

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
BLOG_POSTS_JSON = ROOT / "data" / "blog_posts.json"
GENERATE_SCRIPT = ROOT / "scripts" / "generate_blog_pages.py"
VALIDATE_SCRIPT = ROOT / "scripts" / "validate_before_commit.py"

TODAY = date.today().isoformat()  # YYYY-MM-DD

# Which site to publish for -- set via --site flag, default 'cw'
SITE = "cw"


def load_posts():
    """Load blog_posts.json and return the full data dict."""
    with open(BLOG_POSTS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def save_posts(data):
    """Save blog_posts.json with consistent formatting."""
    with open(BLOG_POSTS_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def find_ready_posts(posts):
    """
    Find posts that are ready to publish.

    Criteria:
      - status == "ready"
      - publish_date <= today (backlog prevention: catches overdue posts too)

    Posts with status "published" or "draft" are skipped.
    """
    ready = []
    for post in posts:
        status = post.get("status", "")
        publish_date = post.get("publish_date", "")
        post_site = post.get("site", "cw")

        if status == "ready" and publish_date and publish_date <= TODAY and post_site == SITE:
            ready.append(post)

    return ready


def publish_posts(posts_to_publish):
    """
    Flip each post from ready → published.
    Sets both status="published" and published=true for backward compatibility
    with generate_blog_pages.py which filters on the 'published' boolean.
    """
    for post in posts_to_publish:
        post["status"] = "published"
        post["published"] = True
        post["date"] = post.get("publish_date") or post.get("scheduled_date") or post.get("date", "")
        print(f"  Publishing: {post['slug']} (scheduled: {post.get('publish_date', 'N/A')})")


def run_generator():
    """Render HTML for the site being published.

    CW: generate_blog_pages.py renders into public/blog/.
    KD: ketodial/scripts/generate_kd_blog.py renders into ketodial/public/blog/.
        generate_blog_pages.py must NOT run for KD — it has no KD output path,
        so `--site kd` rendered KD posts into CW's public/blog/ with the CW
        template, where their internal links then failed validation.
    """
    print("\n🔄 Regenerating site...")
    if SITE == "kd":
        generator_cmd = [sys.executable, str(ROOT / "ketodial" / "scripts" / "generate_kd_blog.py"), "--only-new"]
    else:
        generator_cmd = [sys.executable, str(GENERATE_SCRIPT), "--site", SITE]
    result = subprocess.run(
        generator_cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("❌ Generator failed:")
        print(result.stderr)
        sys.exit(1)
    print("✅ Blog pages regenerated")

    # Regenerate main pages (homepage bento) — CW only.
    # KD has no generate.py equivalent; its pages live in the ketodial submodule.
    if SITE == "cw":
        print("\n🔄 Regenerating main pages (homepage, etc.)...")
        pages_result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "generate.py"), "--type", "pages"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        if pages_result.returncode != 0:
            print("❌ Main pages generator failed:")
            print(pages_result.stderr)
            sys.exit(1)
        print("✅ Main pages regenerated")
    else:
        print("\n⏭️  Skipping main pages regeneration (not applicable for KD)")


def run_validator():
    """
    Run validate_before_commit.py — block on CRITICAL errors only.

    Exit codes from validate_before_commit.py:
      0 = clean (no issues)
      1 = critical issues (broken links, missing files, etc.)
      2 = warnings only (missing skip-nav, JSON-LD, etc.)

    We block publishing on exit 1 (critical) but allow exit 2 (warnings).
    Warnings are logged but do NOT prevent blog posts from going live.

    History: Before this fix, `returncode != 0` treated warnings as blocking,
    which caused the daily-publish pipeline to fail and leave posts stuck
    in "ready" status. See docs/project-log/recurring-loops.md Loop 12.
    """
    if SITE == "kd":
        # validate_before_commit.py checks the CW public/ tree, which a KD
        # publish never touches. Running it here can only produce false
        # blocks. KD-specific validation: see beads task.
        print("\n⏭️  Skipping CW-tree validation (not applicable for KD)")
        return
    print("\n🔍 Running validation...")
    result = subprocess.run(
        [sys.executable, str(VALIDATE_SCRIPT)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode == 1:
        print("❌ Validation CRITICAL — blocking commit:")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)
    elif result.returncode == 2:
        print("⚠️ Validation warnings (non-blocking):")
        print(result.stdout)
    else:
        print("✅ Validation passed")


def get_next_scheduled(posts):
    """Find the next scheduled post date (earliest 'ready' post in the future for this site)."""
    future_ready = [
        p.get("publish_date", "")
        for p in posts
        if p.get("status") == "ready" and p.get("publish_date", "") > TODAY
        and p.get("site", "cw") == SITE
    ]
    if future_ready:
        return min(future_ready)
    return "None queued"


def main():
    global SITE
    parser = argparse.ArgumentParser(description="Daily blog publisher")
    parser.add_argument("--site", choices=["cw", "kd"], default="cw",
                        help="Which site to publish for (default: cw)")
    args = parser.parse_args()
    SITE = args.site

    data = load_posts()
    posts = data["blog_posts"]

    # Count already-published posts for this site
    already_published = sum(1 for p in posts if (p.get("status") == "published" or
                           (p.get("published") and not p.get("status")))
                           and p.get("site", "cw") == SITE)

    # Find posts ready to go live
    to_publish = find_ready_posts(posts)

    if not to_publish:
        print(f"No posts to publish today ({TODAY})")
        print(f"Total published: {already_published}")
        next_date = get_next_scheduled(posts)
        print(f"Next scheduled: {next_date}")
        sys.exit(0)

    # Safety check: verify no posts are missing a site tag
    untagged = [p for p in posts if not p.get("site")]
    if untagged:
        print(f"🛑 SAFETY: {len(untagged)} posts have no site tag. Refusing to publish.")
        print("   Fix: ensure every post in blog_posts.json has a 'site' field ('cw' or 'kd')")
        for p in untagged[:5]:
            print(f"   - {p.get('slug', 'unknown')}")
        sys.exit(1)

    # Publish them
    print(f"📰 Publishing {len(to_publish)} post(s) for {TODAY} [site={SITE}]:")
    publish_posts(to_publish)

    # Save updated JSON
    save_posts(data)

    # Regenerate site HTML
    run_generator()

    # Validate — blocks commit if critical errors
    run_validator()

    # Summary
    new_total = already_published + len(to_publish)
    next_date = get_next_scheduled(posts)
    print(f"\n✅ Published {len(to_publish)} posts. Total published: {new_total}. Next scheduled: {next_date}")


if __name__ == "__main__":
    main()

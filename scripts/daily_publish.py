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

        if status == "ready" and publish_date and publish_date <= TODAY:
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
        print(f"  Publishing: {post['slug']} (scheduled: {post.get('publish_date', 'N/A')})")


def run_generator():
    """Run generate_blog_pages.py to render HTML + sitemap + RSS + index."""
    print("\n🔄 Regenerating site...")
    result = subprocess.run(
        [sys.executable, str(GENERATE_SCRIPT)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("❌ Generator failed:")
        print(result.stderr)
        sys.exit(1)
    print("✅ Site regenerated")


def run_validator():
    """
    Run validate_before_commit.py — if critical errors, exit 1.
    This blocks the GitHub Action from committing broken HTML.
    """
    print("\n🔍 Running validation...")
    result = subprocess.run(
        [sys.executable, str(VALIDATE_SCRIPT)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("❌ Validation failed — blocking commit:")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)
    print("✅ Validation passed")


def get_next_scheduled(posts):
    """Find the next scheduled post date (earliest 'ready' post in the future)."""
    future_ready = [
        p.get("publish_date", "")
        for p in posts
        if p.get("status") == "ready" and p.get("publish_date", "") > TODAY
    ]
    if future_ready:
        return min(future_ready)
    return "None queued"


def main():
    data = load_posts()
    posts = data["blog_posts"]

    # Count already-published posts
    already_published = sum(1 for p in posts if p.get("status") == "published" or
                           (p.get("published") and not p.get("status")))

    # Find posts ready to go live
    to_publish = find_ready_posts(posts)

    if not to_publish:
        print(f"No posts to publish today ({TODAY})")
        print(f"Total published: {already_published}")
        next_date = get_next_scheduled(posts)
        print(f"Next scheduled: {next_date}")
        sys.exit(0)

    # Publish them
    print(f"📰 Publishing {len(to_publish)} post(s) for {TODAY}:")
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

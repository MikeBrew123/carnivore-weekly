#!/usr/bin/env python3
"""
Check for blog posts ready to publish based on scheduled date.
NEW: Just publishes pre-generated files (no content generation).
Content generation happens during weekly automation on Sunday.
"""

import json
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
BLOG_POSTS_FILE = PROJECT_ROOT / "data" / "blog_posts.json"
BLOG_DIR = PROJECT_ROOT / "public" / "blog"

def check_and_publish_scheduled_posts():
    """Check for posts with scheduled_date <= today and publish them."""

    print("📝 DAILY BLOG PUBLISHING")
    print("=" * 60)

    if not BLOG_POSTS_FILE.exists():
        print("❌ No blog posts file found")
        with open("/tmp/posts_published.txt", "w") as f:
            f.write("0")
        return

    with open(BLOG_POSTS_FILE, "r") as f:
        data = json.load(f)

    today = datetime.now().strftime("%Y-%m-%d")
    published_count = 0
    published_titles = []
    missing_files = []

    print(f"📅 Checking posts scheduled for {today}")
    print()

    for post in data.get("blog_posts", []):
        # Check if post is scheduled but not yet published
        if not post.get("published", False):
            scheduled_date = post.get("scheduled_date", post.get("date"))

            if scheduled_date <= today:
                slug = post.get("slug", "")
                html_file = BLOG_DIR / f"{slug}.html"

                # Check if HTML file exists (should be pre-generated on Sunday)
                if not html_file.exists():
                    print(f"⚠️  WARNING: {post['title']}")
                    print(f"   File not found: {slug}.html")
                    print(f"   This post should have been generated during weekly automation")
                    missing_files.append(post.get("title", "Unknown"))
                    continue

                # File exists - publish it
                post["published"] = True
                published_count += 1
                published_titles.append(post.get("title", "Unknown"))
                print(f"✅ Publishing: {post['title']}")
                print(f"   Scheduled: {scheduled_date}")
                print(f"   File: {slug}.html")
                print()

    if published_count > 0:
        # Save updated post data
        with open(BLOG_POSTS_FILE, "w") as f:
            json.dump(data, f, indent=2)

        print("=" * 60)
        print(f"✅ Published {published_count} post(s) today:")
        for title in published_titles:
            print(f"   • {title}")

        with open("/tmp/posts_published.txt", "w") as f:
            f.write(str(published_count))
    else:
        print("=" * 60)
        print("⏳ No posts ready to publish today")
        with open("/tmp/posts_published.txt", "w") as f:
            f.write("0")

    # Report missing files
    if missing_files:
        print(f"\n⚠️  {len(missing_files)} post(s) missing HTML files:")
        for title in missing_files:
            print(f"   • {title}")
        print()
        print("💡 Run generate_weekly_blog_posts.py to create missing files")

    print("=" * 60)

if __name__ == "__main__":
    check_and_publish_scheduled_posts()

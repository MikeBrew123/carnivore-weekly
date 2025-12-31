#!/usr/bin/env python3
"""
Check for blog posts ready to publish based on scheduled date.
Updates published status in blog_posts.json.
"""

import json
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
BLOG_POSTS_FILE = PROJECT_ROOT / "data" / "blog_posts.json"

def check_and_publish_scheduled_posts():
    """Check for posts with scheduled_date <= today and publish them."""

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

    for post in data.get("blog_posts", []):
        # Check if post is scheduled but not yet published
        if not post.get("published", False):
            scheduled_date = post.get("scheduled_date", post.get("date"))

            if scheduled_date <= today:
                # Publish this post
                post["published"] = True
                published_count += 1
                published_titles.append(post.get("title", "Unknown"))
                print(f"✅ Publishing: {post['title']} (scheduled for {scheduled_date})")

    if published_count > 0:
        # Save updated post data
        with open(BLOG_POSTS_FILE, "w") as f:
            json.dump(data, f, indent=2)

        print(f"\n📝 Published {published_count} post(s) today:")
        for title in published_titles:
            print(f"   • {title}")

        with open("/tmp/posts_published.txt", "w") as f:
            f.write(str(published_count))
    else:
        print("⏳ No posts ready to publish today")
        with open("/tmp/posts_published.txt", "w") as f:
            f.write("0")

if __name__ == "__main__":
    check_and_publish_scheduled_posts()

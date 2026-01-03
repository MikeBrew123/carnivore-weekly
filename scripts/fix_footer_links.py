#!/usr/bin/env python3
"""
Fix malformed footer links in December posts.
"""

import re
from pathlib import Path


def fix_footer_links(file_path):
    """Fix malformed footer links."""

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # Fix broken href attributes (missing closing quote before space)
    content = re.sub(
        r'<a href="(/[^"]+)\.html style=',
        r'<a href="\1.html" style=',
        content,
    )

    # Check if anything changed
    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    """Fix footer links in all December posts."""
    blog_dir = Path("/Users/mbrew/Developer/carnivore-weekly/public/blog")
    december_posts = sorted(blog_dir.glob("2025-12*.html"))

    if not december_posts:
        print("No December posts found")
        return

    print(f"Fixing footer links in {len(december_posts)} posts\n")

    fixed_count = 0
    for post_file in december_posts:
        print(f"Checking: {post_file.name}...", end=" ")
        try:
            if fix_footer_links(str(post_file)):
                print("✓ Fixed")
                fixed_count += 1
            else:
                print("✓ No changes needed")
        except Exception as e:
            print(f"✗ Error: {e}")

    print(f"\nCompleted: {fixed_count} posts fixed")


if __name__ == "__main__":
    main()

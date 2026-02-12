#!/usr/bin/env python3
"""
Remove duplicate H1 tags in blog posts.
Each post should have exactly 1 H1 (the post-title).
Extra H1s in post content should be converted to H2.
"""

import re
from pathlib import Path


def fix_h1_tags(file_path):
    """Fix duplicate H1 tags in a blog post"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the post-content section
    post_content_match = re.search(
        r'<div class="post-content">(.*?)</div>\s*<div class="post-footer"', content, re.DOTALL
    )

    if not post_content_match:
        return False

    post_content = post_content_match.group(1)
    h1_count = len(re.findall(r"<h1[^>]*>", post_content))

    if h1_count == 0:
        # No H1 in post content, that's fine
        return False

    if h1_count > 0:
        # Convert first H1 in post content to H2 (it's a duplicate of the title)
        # Replace only the FIRST H1 tag and its closing tag
        updated_content = re.sub(
            r"<h1([^>]*)>(.*?)</h1>",
            lambda m: f"<h2{m.group(1)}>{m.group(2)}</h2>",
            post_content,
            count=1,
        )

        if updated_content != post_content:
            content = content.replace(post_content, updated_content)

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

            print(f"✓ Fixed {Path(file_path).name} - converted duplicate H1 to H2")
            return True

    return False


def main():
    """Fix all blog posts"""
    # Use Path(__file__).parent.parent to get project root (more portable)
    blog_dir = Path(__file__).parent.parent / "public" / "blog"
    html_files = sorted(blog_dir.glob("*.html"))

    if not html_files:
        print(f"❌ No HTML files found in {blog_dir}")
        return

    print(f"🔧 Fixing H1 duplicates in {len(html_files)} blog posts")
    print()

    fixed_count = 0

    for html_file in html_files:
        try:
            if fix_h1_tags(str(html_file)):
                fixed_count += 1
        except Exception as e:
            print(f"❌ Error processing {html_file.name}: {e}")

    print()
    print("=" * 50)
    print(f"✅ Fixed: {fixed_count} posts")
    print("=" * 50)


if __name__ == "__main__":
    main()

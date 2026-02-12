#!/usr/bin/env python3
"""
Fix blog posts that use <header class="post-header"> instead of <div class="post-header">
The header tag triggers unwanted hero styling meant for the site header.
"""

from pathlib import Path

BLOG_DIR = Path('/Users/mbrew/Developer/carnivore-weekly/public/blog')

BAD_POSTS = [
    '2026-01-02-beginners-blueprint.html',
    '2026-01-03-top-creators-2026.html',
    '2026-01-04-organ-meats-guide.html',
    '2026-01-05-womens-health.html',
    '2026-01-06-transformation-stories.html',
    '2026-01-07-fasting-protocols.html',
    '2026-01-08-environmental-impact.html'
]

def fix_header_tag(filepath):
    """Change <header class="post-header"> to <div class="post-header">"""
    content = filepath.read_text()

    # Replace opening tag
    content = content.replace(
        '<header class="post-header">',
        '<div class="post-header">'
    )

    # Replace closing tag (look for </header> after post-header section)
    # Need to be careful to only replace the one that closes post-header
    content = content.replace(
        '</header>\n\n                <!-- Post Content -->',
        '</div>\n\n                <!-- Post Content -->'
    )

    # Also handle variations
    content = content.replace(
        '</header>\n\n            <!-- Post Content -->',
        '</div>\n\n            <!-- Post Content -->'
    )

    filepath.write_text(content)
    print(f"✅ {filepath.name}")

def main():
    print("\n🔧 FIXING HEADER TAGS IN BLOG POSTS\n")
    print("="*60)
    print("Issue: <header> tag triggers dark brown hero styling")
    print("Fix: Change to <div class=\"post-header\">\n")

    for post_name in BAD_POSTS:
        filepath = BLOG_DIR / post_name
        if filepath.exists():
            fix_header_tag(filepath)
        else:
            print(f"⚠️  {post_name} not found")

    print("\n" + "="*60)
    print("✅ All header tags fixed!")
    print("\nThese posts now match the gold standard structure.")

if __name__ == '__main__':
    main()

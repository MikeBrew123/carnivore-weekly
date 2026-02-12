#!/usr/bin/env python3
"""
Add proper HTML structure to all post-reactions components in blog posts.
"""

import re
from pathlib import Path

BLOG_DIR = Path('/Users/mbrew/Developer/carnivore-weekly/public/blog')

# The full HTML structure the JavaScript expects
REACTIONS_HTML = '''<div class="post-reactions" data-post-slug="{slug}">
                    <div class="reactions-header">
                        <h4>Was this helpful?</h4>
                    </div>

                    <div class="reactions-buttons">
                        <button class="reaction-btn reaction-btn--up">
                            <span>👍</span>
                            <span class="reaction-count" data-type="up">0</span>
                        </button>
                        <button class="reaction-btn reaction-btn--down">
                            <span>👎</span>
                            <span class="reaction-count" data-type="down">0</span>
                        </button>
                    </div>

                    <div class="reactions-thanks" style="display: none;">
                        <p class="thanks-message">Thanks for your feedback!</p>
                    </div>
                </div>'''

def fix_post_reactions(filepath):
    """Add proper HTML structure to post-reactions component."""
    content = filepath.read_text()

    # Skip if already has the full structure
    if 'reactions-header' in content:
        print(f"  ⏭️  {filepath.name} - already fixed")
        return False

    # Find all empty post-reactions divs
    # Pattern: <div class="post-reactions" data-post-slug="SLUG"></div>
    pattern = r'<div class="post-reactions" data-post-slug="([^"]+)"></div>'

    def replace_with_full_structure(match):
        slug = match.group(1)
        return REACTIONS_HTML.format(slug=slug)

    new_content = re.sub(pattern, replace_with_full_structure, content)

    if new_content != content:
        filepath.write_text(new_content)
        print(f"  ✅ {filepath.name}")
        return True
    else:
        print(f"  ⚠️  {filepath.name} - no empty reactions div found")
        return False

def main():
    """Fix all blog posts."""
    print("\n🔧 FIXING POST-REACTIONS HTML STRUCTURE\n")
    print("="*60)

    blog_posts = sorted(BLOG_DIR.glob('*.html'))
    fixed_count = 0

    for post in blog_posts:
        if fix_post_reactions(post):
            fixed_count += 1

    print("\n" + "="*60)
    print(f"✅ Fixed {fixed_count} blog posts")
    print("\nNow update the template too:")
    print("  templates/blog_post_template_2026.html")

if __name__ == '__main__':
    main()

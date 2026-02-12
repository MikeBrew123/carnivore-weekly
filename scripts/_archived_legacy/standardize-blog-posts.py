#!/usr/bin/env python3
"""
Standardize ALL blog posts to match the gold standard structure from:
public/blog/2025-12-23-adhd-connection.html

Fixes:
1. Add layout-wrapper-2026 and main-content-2026 wrappers
2. Remove inline styles from post-header
3. Add wiki links section
4. Add featured videos section
5. Add post-reactions component
6. Add utterances comments
7. Add related-content component
8. Add proper footer
9. Add mobile-nav.js script
"""

import re
from pathlib import Path

# Gold standard components to add
WIKI_LINKS_SECTION = '''
    <div style="background: #2c1810; padding: 20px; border-left: 4px solid #d4a574; margin: 30px 0; border-radius: 4px;">
      <strong style="color: #ffd700;">Related Wiki Topics:</strong><br>
      <span style="color: #d4a574; font-size: 14px;"><a href="/wiki.html#cholesterol" class="wiki-link">cholesterol</a> • <a href="/wiki.html#insulin-resistance" class="wiki-link">insulin-resistance</a> • <a href="/wiki.html#digestion" class="wiki-link">digestion</a></span>
    </div>
'''

FEATURED_VIDEOS_SECTION = '''
    <div style="background: #2c1810; padding: 20px; border-left: 4px solid #d4a574; margin: 30px 0; border-radius: 4px;">
      <strong style="color: #ffd700;">📺 Featured This Week:</strong><br>

    <div style="margin-bottom: 20px; padding: 15px; background: #2c1810; border-radius: 4px;">
      <strong style="color: #ffd700;">If I Started Carnivore in 2026, This is What I'd Do [FULL BLUEPRINT]</strong><br>
      <span style="color: #d4a574; font-size: 13px;">by Anthony Chaffee MD</span><br>
      <a href="https://www.youtube.com/watch?v=6ExSc9OdIIA" target="_blank" style="color: #d4a574; text-decoration: underline; font-size: 13px;">Watch on YouTube →</a>
    </div>

    </div>
'''

POST_FOOTER_SECTION = '''
        <!-- Post Footer -->
        <div class="post-footer">
            <!-- Tags -->
            <div class="tags">
                <span class="tag">{tags}</span>
            </div>

            <!-- Comments Section -->
            <div class="comments-section">
                <h3>Comments</h3>
                <div class="post-reactions" data-post-slug="{slug}"></div>
                <script src="/js/post-reactions.js" defer></script>


                <script src="https://utteranc.es/client.js"
                    repo="MikeBrew123/carnivore-weekly"
                    issue-term="pathname"
                    theme="github-dark"
                    crossorigin="anonymous"
                    async>
                </script>
            </div>
        </div>

        <!-- Footer -->

<!-- Related Content Component -->
<section class="related-content" data-content-type="blog" data-content-id="{slug}">
    <h3 class="related-content-title">Related Content</h3>
    <div class="related-content-loading">
        <span class="spinner"></span>
        Loading related content...
    </div>
    <div class="related-content-grid" style="display: none;"></div>
</section>

<script src="/js/related-content.js" defer></script>
<footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #8b4513; text-align: center; color: #d4a574; font-size: 12px;">
            <p>&copy; 2026 Carnivore Weekly |
               <a href="/about.html" style="color: #d4a574; text-decoration: underline;">About</a> |
               <a href="/the-lab.html" style="color: #d4a574; text-decoration: underline;">The Lab</a> |
               <a href="mailto:feedback@carnivoreweekly.com" style="color: #d4a574; text-decoration: underline;">Contact</a>
            </p>
            <p style="margin-top: 10px; font-size: 11px;">
                🤖 Curated with AI • Made with <a href="https://claude.com/claude-code" style="color: #d4a574; text-decoration: underline;">Claude Code</a>
            </p>
        </footer>
    </div>
    </main>
    </div>

    <script src="/js/mobile-nav.js"></script>
</body>
</html>
'''


def extract_slug(filename):
    """Extract slug from filename (remove .html)."""
    return filename.replace('.html', '')


def extract_tags(content):
    """Extract keywords from meta tags."""
    keywords_match = re.search(r'<meta name="keywords" content="([^"]+)"', content)
    if keywords_match:
        keywords = keywords_match.group(1)
        # Take first 3 keywords
        tags = [k.strip() for k in keywords.split(',')[:3]]
        return '</span>\n                <span class="tag">'.join(tags)
    return 'carnivore'


def standardize_post(filepath):
    """Standardize a blog post to match gold standard structure."""
    content = filepath.read_text()
    slug = extract_slug(filepath.name)

    # Skip if already standardized (has layout-wrapper-2026)
    if 'layout-wrapper-2026' in content:
        print(f'⏭️  {filepath.name} - already standardized')
        return False

    # 1. Wrap content in layout-wrapper-2026 and main-content-2026
    # Find where to insert wrapper (after nav menu)
    nav_end = content.find('</nav>')
    if nav_end == -1:
        print(f'⚠️  {filepath.name} - could not find nav menu')
        return False

    # Find the closing line after nav
    insert_point = content.find('\n', nav_end) + 1

    # Insert opening wrapper
    content = (
        content[:insert_point] +
        '\n    <div class="layout-wrapper-2026">\n        <main class="main-content-2026">\n' +
        content[insert_point:]
    )

    # 2. Remove inline styles from post-header div
    content = re.sub(
        r'<div class="post-header"[^>]*>',
        '<div class="post-header">',
        content
    )

    # 3. Replace post-container with just the back link (it's inside layout wrapper now)
    content = re.sub(
        r'<div class="post-container">\s*\n\s*<a href="/blog\.html"',
        '<a href="/blog.html"',
        content
    )

    # 4. Find where post-content ends (before closing div)
    post_content_end = content.find('</div>\n    </div>\n\n    <!-- Footer -->')
    if post_content_end == -1:
        # Alternative: find last </div> in post-content
        post_content_end = content.rfind('</div>\n\n    <!-- Footer -->')

    if post_content_end == -1:
        # Try finding where content actually ends
        # Look for the end of post-content div
        matches = list(re.finditer(r'</div>\s*(?=\s*<!-- Footer -->|\s*<footer|\s*</body>)', content))
        if matches:
            post_content_end = matches[-1].start() + 6  # +6 for </div>

    if post_content_end == -1:
        print(f'⚠️  {filepath.name} - could not find post content end')
        return False

    # Extract tags for footer
    tags = extract_tags(content)

    # Insert wiki links, videos, and footer sections before the old footer
    footer_content = POST_FOOTER_SECTION.format(tags=tags, slug=slug)

    content = (
        content[:post_content_end] +
        '\n\n        </div>\n' +
        '\n        <!-- Wiki Links Section -->\n' +
        WIKI_LINKS_SECTION +
        '\n        <!-- Featured Videos Section -->\n' +
        FEATURED_VIDEOS_SECTION +
        '\n        <!-- Product Recommendations Section (Soft Conversion) -->\n\n' +
        footer_content
    )

    # 5. Remove old footer and closing tags
    # First, remove everything from </div> after post-footer to </html>
    # This catches various footer structures
    content = re.sub(
        r'(</div>\s*</div>\s*)(?:<!-- Footer -->.*?)?</body>\s*</html>',
        r'\1',
        content,
        flags=re.DOTALL
    )

    # Also handle cases where footer comes before closing post divs
    content = re.sub(
        r'(</div>\s*)(?:<!-- Footer -->|<footer).*?</html>',
        r'\1',
        content,
        flags=re.DOTALL
    )

    # Make sure we don't have duplicate closing tags
    content = re.sub(r'</html>\s*</html>', '</html>', content)
    content = re.sub(r'</body>\s*</body>', '</body>', content)

    # Write back
    filepath.write_text(content)
    print(f'✅ {filepath.name} - standardized')
    return True


def main():
    """Process all blog posts."""
    blog_dir = Path(__file__).parent.parent / 'public' / 'blog'
    posts = sorted(blog_dir.glob('*.html'))

    # Exclude non-post files
    exclude = {'index.html', 'insulin-resistance-morning-glucose.html'}
    posts = [p for p in posts if p.name not in exclude]

    print(f'Found {len(posts)} blog posts\n')

    updated = 0
    for post_path in posts:
        if standardize_post(post_path):
            updated += 1

    print(f'\n✅ Updated {updated} posts')


if __name__ == '__main__':
    main()

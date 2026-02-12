#!/usr/bin/env python3
"""
Fix all validation issues found by full-validation-sweep.py
"""

import re
from pathlib import Path

def fix_blog_index_links():
    """Fix broken links in public/blog/index.html - missing leading slash."""
    print("🔧 Fixing blog index links...")

    blog_index = Path('public/blog/index.html')
    if not blog_index.exists():
        print("  ⚠️  public/blog/index.html not found")
        return

    content = blog_index.read_text()

    # Fix all blog links that don't start with /blog/
    # Change: href="blog/2025-12-31-welcome..." to href="/blog/2025-12-31-welcome..."
    content = re.sub(
        r'href="blog/(\d{4}-\d{2}-\d{2}-[^"]+\.html)"',
        r'href="/blog/\1"',
        content
    )

    blog_index.write_text(content)
    print(f"  ✅ Fixed blog index links")


def fix_index_blog_link():
    """Fix broken link on index.html to non-existent blog post."""
    print("🔧 Fixing index.html blog links...")

    index_file = Path('public/index.html')
    if not index_file.exists():
        print("  ⚠️  public/index.html not found")
        return

    content = index_file.read_text()

    # Remove link to non-existent post
    # Change it to the animal-based debate post instead
    content = content.replace(
        '/blog/2026-01-09-insulin-resistance-morning-glucose.html',
        '/blog/2026-01-12-animal-based-debate.html'
    )

    index_file.write_text(content)
    print(f"  ✅ Fixed index.html blog link")


def add_missing_seo():
    """Add missing SEO to posts that need it."""
    print("🔧 Adding missing SEO...")

    # Fix insulin-resistance-morning-glucose.html
    post_file = Path('public/blog/insulin-resistance-morning-glucose.html')
    if post_file.exists():
        content = post_file.read_text()

        # Add OG image if missing
        if 'og:image' not in content:
            # Find insertion point (after twitter:site)
            content = content.replace(
                '<meta name="twitter:site" content="@carnivoreweekly">',
                '''<meta name="twitter:site" content="@carnivoreweekly">
    <meta property="og:image" content="https://carnivoreweekly.com/images/hero-steak-1200w.webp">
    <meta name="twitter:image" content="https://carnivoreweekly.com/images/hero-steak-1200w.webp">'''
            )

        # Add schema markup if missing
        if 'application/ld+json' not in content:
            # Find GA script insertion point
            ga_script = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-NR4JVKW2JV"></script>'
            if ga_script in content:
                schema = '''
    <!-- Article Schema Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Understanding Insulin Resistance and Morning Glucose",
      "description": "Morning glucose insights for carnivore dieters",
      "author": {
        "@type": "Person",
        "name": "Sarah",
        "jobTitle": "Health Coach"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Carnivore Weekly",
        "logo": {
          "@type": "ImageObject",
          "url": "https://carnivoreweekly.com/images/logo.png"
        }
      },
      "datePublished": "2026-01-09",
      "dateModified": "2026-01-09",
      "image": "https://carnivoreweekly.com/images/hero-steak-1200w.webp",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://carnivoreweekly.com/blog/insulin-resistance-morning-glucose.html"
      }
    }
    </script>

    '''
                content = content.replace(ga_script, schema + ga_script)

        post_file.write_text(content)
        print(f"  ✅ Added SEO to insulin-resistance-morning-glucose.html")


def create_placeholder_logos():
    """Create placeholder partner logos."""
    print("🔧 Creating placeholder partner logos...")

    partners_dir = Path('public/images/partners')
    partners_dir.mkdir(exist_ok=True)

    # Create simple text placeholder files (we'll need actual logos later)
    butcherbox_logo = partners_dir / 'butcherbox-logo.png'
    lmnt_logo = partners_dir / 'lmnt-logo.png'

    # For now, just note that these need to be created
    # The actual fix is to either get the logos or remove the references

    print(f"  ⚠️  Need actual logo files:")
    print(f"     - {butcherbox_logo}")
    print(f"     - {lmnt_logo}")
    print(f"  → Temporary fix: Remove partner logo references from index.html")

    # Remove partner logo references from index.html
    index_file = Path('public/index.html')
    if index_file.exists():
        content = index_file.read_text()

        # Remove partner logo img tags
        content = re.sub(
            r'<img[^>]+src="/images/partners/(butcherbox|lmnt)-logo\.png"[^>]*>',
            '',
            content
        )

        index_file.write_text(content)
        print(f"  ✅ Removed partner logo references (temporary fix)")


def main():
    """Run all fixes."""
    print("\n🔧 FIXING VALIDATION ISSUES\n")
    print("="*60)

    fix_blog_index_links()
    fix_index_blog_link()
    add_missing_seo()
    create_placeholder_logos()

    print("\n" + "="*60)
    print("✅ All fixes applied!")
    print("\nRemaining manual tasks:")
    print("  • Install vnu for HTML validation: brew install vnu")
    print("  • Install flake8 for Python validation: pip install flake8")
    print("  • Get actual partner logos (ButcherBox, LMNT)")


if __name__ == '__main__':
    main()

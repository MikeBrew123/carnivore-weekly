#!/usr/bin/env python3
"""
Add Article schema markup and OG images to all blog posts missing them.
"""

import re
import glob
from pathlib import Path

# Schema template
SCHEMA_TEMPLATE = '''
    <!-- Article Schema Markup -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "{headline}",
      "description": "{description}",
      "author": {{
        "@type": "Person",
        "name": "{author_name}",
        "jobTitle": "{author_title}"
      }},
      "publisher": {{
        "@type": "Organization",
        "name": "Carnivore Weekly",
        "logo": {{
          "@type": "ImageObject",
          "url": "https://carnivoreweekly.com/images/logo.png"
        }}
      }},
      "datePublished": "{date}",
      "dateModified": "{date}",
      "image": "https://carnivoreweekly.com/images/hero-steak-1200w.webp",
      "mainEntityOfPage": {{
        "@type": "WebPage",
        "@id": "https://carnivoreweekly.com/blog/{filename}"
      }}
    }}
    </script>
'''

IMAGE_TAGS = '''    <meta property="og:image" content="https://carnivoreweekly.com/images/hero-steak-1200w.webp">
    <meta name="twitter:image" content="https://carnivoreweekly.com/images/hero-steak-1200w.webp">
'''


def extract_metadata(content, filename):
    """Extract metadata from blog post HTML."""
    metadata = {}

    # Extract title from meta or h1
    title_match = re.search(r'<title>([^<]+)</title>', content)
    if title_match:
        # Remove " - Carnivore Weekly Blog" suffix
        title = title_match.group(1).replace(' - Carnivore Weekly Blog', '')
        metadata['headline'] = title

    # Extract description
    desc_match = re.search(r'<meta name="description" content="([^"]+)"', content)
    if desc_match:
        metadata['description'] = desc_match.group(1)
    else:
        metadata['description'] = metadata.get('headline', '')

    # Extract date from filename (YYYY-MM-DD format)
    date_match = re.match(r'(\d{4}-\d{2}-\d{2})-', filename)
    if date_match:
        metadata['date'] = date_match.group(1)

    # Extract author from post-meta
    author_match = re.search(r'<span>by ([^<]+)</span>', content)
    if author_match:
        author_text = author_match.group(1)
        # Parse various author formats
        if '(Sarah)' in author_text or 'Health Coach' in author_text:
            metadata['author_name'] = 'Sarah'
            metadata['author_title'] = 'Health Coach'
        elif '(Marcus)' in author_text or 'Protocol Engineer' in author_text:
            metadata['author_name'] = 'Marcus'
            metadata['author_title'] = 'Protocol Engineer'
        elif '(Chloe)' in author_text or 'Community Manager' in author_text:
            metadata['author_name'] = 'Chloe'
            metadata['author_title'] = 'Community Manager'
        else:
            # Default fallback
            metadata['author_name'] = author_text.strip()
            metadata['author_title'] = 'Writer'

    metadata['filename'] = filename

    return metadata


def add_schema_to_post(filepath):
    """Add schema markup to a blog post if it doesn't already have it."""
    content = filepath.read_text()

    # Check if already has schema
    if 'application/ld+json' in content:
        print(f'⏭️  {filepath.name} - already has schema')
        return False

    # Extract metadata
    metadata = extract_metadata(content, filepath.name)

    # Check if has required metadata
    if not all(k in metadata for k in ['headline', 'date', 'author_name']):
        print(f'⚠️  {filepath.name} - missing required metadata')
        return False

    # Generate schema block
    schema = SCHEMA_TEMPLATE.format(**metadata)

    # Find insertion point (before GA script)
    ga_match = re.search(r'(\s+<script async src="https://www\.googletagmanager\.com/gtag/js)', content)
    if not ga_match:
        print(f'⚠️  {filepath.name} - could not find GA script insertion point')
        return False

    # Check if already has OG image
    has_og_image = 'og:image' in content

    # Build insertion content
    if has_og_image:
        insertion = schema
    else:
        insertion = IMAGE_TAGS + '\n' + schema

    # Insert schema and images before GA script
    new_content = content.replace(
        ga_match.group(1),
        insertion + ga_match.group(1)
    )

    # Write back
    filepath.write_text(new_content)

    print(f'✅ {filepath.name} - added schema' + (' and images' if not has_og_image else ''))
    return True


def main():
    """Process all blog posts."""
    blog_dir = Path(__file__).parent.parent / 'public' / 'blog'
    posts = sorted(blog_dir.glob('*.html'))

    print(f'Found {len(posts)} blog posts\n')

    updated = 0
    for post_path in posts:
        if add_schema_to_post(post_path):
            updated += 1

    print(f'\n✅ Updated {updated} posts')


if __name__ == '__main__':
    main()

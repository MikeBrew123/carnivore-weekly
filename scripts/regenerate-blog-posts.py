#!/usr/bin/env python3
"""
Blog Post Regeneration Script
Standardizes all blog posts to use shared CSS and site footer.
"""

import os
import re
import json
import argparse
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime

# Paths
BLOG_DIR = Path('public/blog')
TEMPLATE_PATH = Path('templates/blog_post_template_2026.html')
BACKUP_DIR = Path('data/blog_content_backup')

def extract_metadata(soup):
    """Extract title, date, author, and description from existing post."""
    metadata = {}

    # Title from h1.post-title, fallback to <title> tag in <head>
    title_tag = soup.find('h1', class_='post-title')
    if title_tag:
        metadata['title'] = title_tag.text.strip()
    else:
        # Fallback to <title> tag
        head_title = soup.find('title')
        if head_title:
            # Remove " - Carnivore Weekly Blog" suffix if present
            title_text = head_title.text.strip()
            metadata['title'] = title_text.replace(' - Carnivore Weekly Blog', '').strip()
        else:
            metadata['title'] = 'Untitled'

    # Date from first <span> inside .post-meta (format: "December 23, 2025")
    post_meta = soup.find('div', class_='post-meta')
    if post_meta:
        date_span = post_meta.find('span')
        if date_span:
            metadata['date'] = date_span.text.strip()
        else:
            metadata['date'] = datetime.now().strftime('%B %d, %Y')
    else:
        metadata['date'] = datetime.now().strftime('%B %d, %Y')

    # Author from post-meta
    author_tag = soup.find('span', class_='post-author')
    metadata['author'] = author_tag.text.strip() if author_tag else 'Carnivore Weekly'

    # Description from meta tag
    meta_desc = soup.find('meta', attrs={'name': 'description'})
    metadata['description'] = meta_desc['content'] if meta_desc else metadata['title']

    # Keywords from meta tag
    meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
    metadata['keywords'] = meta_keywords['content'] if meta_keywords else ''

    # Slug from filename (will be passed in)
    metadata['slug'] = ''

    # Author details
    author_bio_tag = soup.find('div', class_='post-author-bio')
    if author_bio_tag:
        author_name = author_bio_tag.find('strong')
        metadata['author_name'] = author_name.text.strip() if author_name else metadata['author']
        # Get text after <strong>, strip the <br>
        bio_text = author_bio_tag.get_text(separator=' ', strip=True)
        metadata['author_bio'] = bio_text.replace(metadata['author_name'], '').strip()
    else:
        metadata['author_name'] = metadata['author']
        metadata['author_bio'] = 'Writer at Carnivore Weekly'

    return metadata

def extract_content(soup):
    """Extract inner contents of post-content div using decode_contents().

    This returns ONLY the inner HTML, not the wrapper div itself.
    Prevents layout conflicts from nested container tags.
    """

    # Find the post-content div (contains the full article body)
    content_div = soup.find('div', class_='post-content')

    if not content_div:
        # Fallback: try to find article tag
        content_div = soup.find('article')

    if not content_div:
        return '<p>Content extraction failed.</p>'

    # Remove scripts and styles only (keep all content elements)
    for tag in content_div.find_all(['script', 'style']):
        tag.decompose()

    # Remove post-reactions (template provides these)
    for reactions in content_div.find_all(class_='post-reactions'):
        reactions.decompose()

    # Remove any stray headers, navs, or header/nav-like divs (double-header fix)
    for tag in content_div.find_all(['header', 'nav']):
        tag.decompose()
    for div in content_div.find_all('div', class_=lambda c: c and ('header' in c or 'nav' in c)):
        div.decompose()

    # Use decode_contents() to get ONLY the inner HTML without wrapper div
    # This prevents nested .post-content divs causing layout issues
    inner_html = content_div.decode_contents()

    # Wrap in fresh post-content div for template insertion
    return f'<div class="post-content">\n{inner_html}\n</div>'

def load_template():
    """Load the blog post template."""
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE_PATH}")

    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        return f.read()

def save_backup(slug, metadata, content_html):
    """Save a clean backup of the post content as JSON."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    backup_data = {
        'slug': slug,
        'title': metadata['title'],
        'date': metadata['date'],
        'author': metadata['author'],
        'description': metadata['description'],
        'content_html': content_html,
        'backed_up_at': datetime.now().isoformat()
    }

    backup_file = BACKUP_DIR / f"{slug}.json"
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2, ensure_ascii=False)

    return backup_file

def regenerate_post(post_path, template, dry_run=False):
    """Regenerate a single blog post from template."""

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing: {post_path.name}")

    # Extract slug from filename (remove .html)
    slug = post_path.stem

    # Read original post
    with open(post_path, 'r', encoding='utf-8') as f:
        original_html = f.read()

    # Parse with BeautifulSoup
    soup = BeautifulSoup(original_html, 'html.parser')

    # Extract metadata and content
    metadata = extract_metadata(soup)
    metadata['slug'] = slug
    content_html = extract_content(soup)

    # Print extracted data
    print(f"  Title: {metadata['title']}")
    print(f"  Date: {metadata['date']}")
    print(f"  Author: {metadata['author']}")
    print(f"  Slug: {slug}")

    if dry_run:
        print("  [DRY RUN] Skipping file write.")
        return True

    # Save backup
    backup_file = save_backup(slug, metadata, content_html)
    print(f"  ✓ Backup saved: {backup_file}")

    # Replace placeholders in template
    output = template
    output = output.replace('{{ title }}', metadata['title'])
    output = output.replace('{{ meta_description }}', metadata['description'])
    output = output.replace('{{ description }}', metadata['description'])
    output = output.replace('{{ keywords }}', metadata['keywords'])
    output = output.replace('{{ slug }}', slug)
    output = output.replace('{{ publish_date }}', metadata['date'])
    output = output.replace('{{ date }}', metadata['date'])
    output = output.replace('{{ author }}', metadata['author'])
    output = output.replace('{{ author_name }}', metadata['author_name'])
    output = output.replace('{{ author_bio }}', metadata['author_bio'])
    output = output.replace('{{ content }}', content_html)

    # Save regenerated post
    with open(post_path, 'w', encoding='utf-8') as f:
        f.write(output)

    print(f"  ✓ Regenerated: {post_path.name}")
    return True

def main():
    parser = argparse.ArgumentParser(description='Regenerate blog posts from template')
    parser.add_argument('--dry-run', action='store_true',
                       help='Print what would be done without making changes')
    parser.add_argument('--test', type=str, metavar='FILENAME',
                       help='Test on a single file (e.g., 2025-12-23-adhd-connection.html)')
    args = parser.parse_args()

    # Load template
    print("Loading template...")
    template = load_template()
    print(f"✓ Template loaded: {TEMPLATE_PATH}")

    # Get list of posts to process
    if args.test:
        # Process single test file
        test_file = BLOG_DIR / args.test
        if not test_file.exists():
            print(f"ERROR: Test file not found: {test_file}")
            return 1
        posts = [test_file]
        print(f"\n=== TEST MODE: Processing 1 file ===")
    else:
        # Process all HTML files in blog directory
        all_html_files = sorted(BLOG_DIR.glob('*.html'))

        # Filter: only process files matching blog post pattern (YYYY-MM-DD-slug.html)
        # Skip index.html, archive.html, etc.
        blog_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}-.+\.html$')
        posts = [f for f in all_html_files if blog_pattern.match(f.name)]

        skipped = len(all_html_files) - len(posts)
        print(f"\n=== Found {len(posts)} blog posts ===")
        if skipped > 0:
            print(f"    (Skipped {skipped} non-blog files)")

    if args.dry_run:
        print("\n=== DRY RUN MODE: No files will be modified ===\n")

    # Process each post
    success_count = 0
    error_count = 0

    for post_path in posts:
        try:
            if regenerate_post(post_path, template, dry_run=args.dry_run):
                success_count += 1
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            error_count += 1

    # Summary
    print(f"\n{'='*50}")
    print(f"{'DRY RUN ' if args.dry_run else ''}SUMMARY:")
    print(f"  ✓ Success: {success_count}")
    print(f"  ✗ Errors: {error_count}")

    if not args.dry_run:
        print(f"\n✓ Backups saved to: {BACKUP_DIR}/")

    print(f"{'='*50}\n")

    return 0 if error_count == 0 else 1

if __name__ == '__main__':
    exit(main())

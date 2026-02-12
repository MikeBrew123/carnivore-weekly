#!/usr/bin/env python3
"""Fix all remaining validation issues."""

import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

def fix_heading_skip(file_path):
    """Fix h1→h3 skips by converting h3 to h2."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')

    # Find all headings
    headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    prev_level = 0
    changes_made = False

    for heading in headings:
        level = int(heading.name[1])

        # If we skip from h1 to h3, change h3 to h2
        if prev_level == 1 and level == 3:
            # Find this heading in the raw content and replace
            heading_str = str(heading)
            if heading_str in content:
                new_heading = heading_str.replace('<h3', '<h2').replace('</h3>', '</h2>')
                content = content.replace(heading_str, new_heading)
                changes_made = True

        prev_level = level

    if changes_made:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def add_title_and_meta(file_path):
    """Add missing title and meta description to HTML file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    soup = BeautifulSoup(content, 'html.parser')
    changes_made = False

    # Extract h1 for title
    h1 = soup.find('h1')
    if h1:
        title_text = h1.get_text(strip=True)
    else:
        # Fallback to filename
        title_text = file_path.stem.replace('-', ' ').title()

    # Extract first paragraph for description
    first_p = soup.find('p')
    if first_p:
        desc_text = first_p.get_text(strip=True)[:155]
    else:
        desc_text = f"Carnivore Weekly - {title_text}"

    # Add title if missing
    if not soup.find('title'):
        head = soup.find('head')
        if head:
            # Insert after charset or at beginning
            charset = head.find('meta', attrs={'charset': True})
            if charset:
                title_tag = soup.new_tag('title')
                title_tag.string = title_text
                charset.insert_after('\n    ', title_tag)
            else:
                title_tag = f'\n    <title>{title_text}</title>'
                content = content.replace('<head>', f'<head>{title_tag}')
            changes_made = True

    # Add meta description if missing
    if not soup.find('meta', attrs={'name': 'description'}):
        head = soup.find('head')
        if head:
            # Find title tag to insert after
            if '<title>' in content:
                meta_tag = f'\n    <meta name="description" content="{desc_text}">'
                # Insert after title
                content = re.sub(
                    r'(<title>.*?</title>)',
                    r'\1' + meta_tag,
                    content,
                    count=1
                )
            else:
                # Insert at start of head
                meta_tag = f'\n    <meta name="description" content="{desc_text}">'
                content = content.replace('<head>', f'<head>{meta_tag}')
            changes_made = True

    if changes_made:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def fix_empty_links(file_path):
    """Fix empty href attributes."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Replace empty hrefs
    content = re.sub(r'href=""', 'href="#"', content)

    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    base = Path('/Users/mbrew/Developer/carnivore-weekly')

    # Files needing title/meta (CRITICAL)
    blog_files = [
        'public/blog/medical-establishment-backlash.html',
        'public/blog/beginners-complete-blueprint-30-days-carnivore.html',
        'public/blog/coffee-on-carnivore-practical-answer.html',
        'public/blog/real-2-week-results-carnivore.html',
        'public/blog/organ-meats-for-skeptics.html',
        'public/blog/carnivore-didnt-fix-everything-content.html',
    ]

    # Files with heading skips (WARNING)
    heading_files = [
        'channels.html',
        'newsletters/latest_newsletter.html',
        'newsletters/newsletter_2025-12-26.html',
        'newsletters/newsletter_2025-12-30.html',
        'newsletters/newsletter_2026-01-01T10:26:35.669700.html',
        'newsletters/latest.html',
        'archive/2025-12-26.html',
    ]

    # Files with empty links (WARNING)
    link_files = [
        'newsletters/latest.html',
        'docs/DESIGN_SYSTEM_VISUAL_GUIDE.html',
        'docs/DATABASE_HEALTH_REPORT.html',
    ]

    fixed_count = 0

    print("Fixing title/meta issues (CRITICAL)...")
    for rel_path in blog_files:
        file_path = base / rel_path
        if file_path.exists():
            if add_title_and_meta(file_path):
                print(f"  ✅ Fixed: {rel_path}")
                fixed_count += 1
        else:
            print(f"  ⚠️  Not found: {rel_path}")

    print("\nFixing heading skips (WARNING)...")
    for rel_path in heading_files:
        file_path = base / rel_path
        if file_path.exists():
            if fix_heading_skip(file_path):
                print(f"  ✅ Fixed: {rel_path}")
                fixed_count += 1
        else:
            print(f"  ⚠️  Not found: {rel_path}")

    print("\nFixing empty links (WARNING)...")
    for rel_path in link_files:
        file_path = base / rel_path
        if file_path.exists():
            if fix_empty_links(file_path):
                print(f"  ✅ Fixed: {rel_path}")
                fixed_count += 1
        else:
            print(f"  ⚠️  Not found: {rel_path}")

    print(f"\n{'='*60}")
    print(f"Fixed {fixed_count} files")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()

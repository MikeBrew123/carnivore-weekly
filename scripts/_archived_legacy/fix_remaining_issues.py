#!/usr/bin/env python3
"""Fix remaining 27 legitimate validation issues."""

import re
import sys
from pathlib import Path

def fix_skipped_headings(content):
    """Fix h2→h4 skips by converting h4 to h3."""
    # Find all heading sequences
    lines = content.split('\n')
    result = []
    last_h_level = 1

    for line in lines:
        # Check for heading tags
        h2_match = re.search(r'<h2[^>]*>', line)
        h3_match = re.search(r'<h3[^>]*>', line)
        h4_match = re.search(r'<h4[^>]*>', line)

        if h2_match:
            last_h_level = 2
            result.append(line)
        elif h3_match:
            last_h_level = 3
            result.append(line)
        elif h4_match:
            # If we skip from h2 to h4, convert h4 to h3
            if last_h_level == 2:
                line = line.replace('<h4', '<h3').replace('</h4>', '</h3>')
                last_h_level = 3
            else:
                last_h_level = 4
            result.append(line)
        else:
            result.append(line)

    return '\n'.join(result)

def fix_empty_links(content):
    """Fix empty href attributes."""
    content = re.sub(r'href=""', 'href="#"', content)
    return content

def add_meta_description(content, file_path):
    """Add missing meta description."""
    if '<meta name="description"' not in content and '<head>' in content:
        # Try to extract meaningful text
        para_match = re.search(r'<p[^>]*>(.*?)</p>', content, re.DOTALL)
        if para_match:
            desc_text = re.sub(r'<[^>]+>', '', para_match.group(1))
            desc_text = ' '.join(desc_text.split())[:155]
            meta_tag = f'\n    <meta name="description" content="{desc_text}">'
            content = content.replace('</head>', f'{meta_tag}\n</head>')
        else:
            # Fallback generic description
            desc_text = f"Carnivore Weekly - {Path(file_path).stem.replace('_', ' ').title()}"
            meta_tag = f'\n    <meta name="description" content="{desc_text}">'
            content = content.replace('</head>', f'{meta_tag}\n</head>')
    return content

def add_title(content, file_path):
    """Add missing title tag."""
    if '<title>' not in content and '<head>' in content:
        # Try to extract h1 text
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL)
        if h1_match:
            title_text = re.sub(r'<[^>]+>', '', h1_match.group(1))
            title_text = ' '.join(title_text.split())
        else:
            # Fallback
            title_text = f"Carnivore Weekly - {Path(file_path).stem.replace('_', ' ').title()}"

        title_tag = f'\n    <title>{title_text}</title>'
        content = content.replace('</head>', f'{title_tag}\n</head>')
    return content

def fix_file(file_path):
    """Fix all issues in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply fixes
        content = fix_skipped_headings(content)
        content = fix_empty_links(content)
        content = add_meta_description(content, file_path)
        content = add_title(content, file_path)

        # Only write if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed: {file_path}")
            return True
        else:
            print(f"⏭️  No changes needed: {file_path}")
            return False
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

def main():
    base_path = Path('/Users/mbrew/Developer/carnivore-weekly')

    # Files with issues
    files_to_fix = [
        # Skipped heading levels
        'channels.html',
        'newsletters/latest.html',
        'newsletters/latest_newsletter.html',
        'newsletters/newsletter_2025-12-26.html',
        'newsletters/newsletter_2025-12-30.html',
        'newsletters/newsletter_2026-01-01T10:26:35.669700.html',
        'docs/DESIGN_SYSTEM_VISUAL_GUIDE.html',
        'docs/reports/validations/BANNER_VALIDATION_REPORT.html',
        'public/blog/2026-01-08-environmental-impact.html',
        'public/blog/2026-01-10-dating-carnivore.html',
        'public/blog/2026-01-11-travel-hacks.html',
        'public/blog/2026-01-12-animal-based-debate.html',
        'public/blog/2026-01-25-bone-broth-benefits.html',
        # Empty links
        'docs/DATABASE_HEALTH_REPORT.html',
        # Missing meta/title
        'dashboard/analytics-report.html',
        'public/assessment/success/index.html',
    ]

    fixed_count = 0
    for file_rel in files_to_fix:
        file_path = base_path / file_rel
        if file_path.exists():
            if fix_file(file_path):
                fixed_count += 1
        else:
            print(f"⚠️  File not found: {file_path}")

    print(f"\n{'='*60}")
    print(f"Fixed {fixed_count} files")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()

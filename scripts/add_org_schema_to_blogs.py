#!/usr/bin/env python3
"""
Add Organization schema with mentions to all blog posts for GEO optimization.
Inserts after the existing Article schema closing tag.
"""

import os
import re
from pathlib import Path

BLOG_DIR = Path(__file__).parent.parent / "public" / "blog"

ORG_SCHEMA = '''
    <!-- Organization Schema with Mentions for GEO -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Carnivore Weekly",
      "url": "https://carnivoreweekly.com",
      "logo": "https://carnivoreweekly.com/images/logo.png",
      "description": "Evidence-based carnivore diet resources and weekly content curation for the meat-based community.",
      "sameAs": [
        "https://carnivoreweekly.com"
      ],
      "mentions": [
        {
          "@type": "Person",
          "name": "Dr. Shawn Baker",
          "description": "Orthopedic surgeon and author of The Carnivore Diet",
          "sameAs": "https://meatrx.com"
        },
        {
          "@type": "Person",
          "name": "Dr. Paul Saladino",
          "description": "MD and author of The Carnivore Code",
          "sameAs": "https://heartandsoil.co"
        },
        {
          "@type": "Person",
          "name": "Dr. Ken Berry",
          "description": "Family physician and keto/carnivore advocate",
          "sameAs": "https://www.youtube.com/@KenDBerryMD"
        }
      ]
    }
    </script>
'''

def already_has_org_schema(content):
    """Check if file already has Organization schema"""
    return '"@type": "Organization"' in content and '"mentions"' in content

def add_org_schema(filepath):
    """Add Organization schema after Article schema"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if already_has_org_schema(content):
        return False, "Already has Organization schema"

    # Find the closing of Article schema and insert after it
    # Pattern: end of Article schema script tag
    pattern = r'(<!-- Article Schema Markup -->.*?</script>)'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        return False, "No Article schema found"

    # Insert Organization schema after Article schema
    insert_pos = match.end()
    new_content = content[:insert_pos] + ORG_SCHEMA + content[insert_pos:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True, "Added Organization schema"

def main():
    blog_files = list(BLOG_DIR.glob("*.html"))
    print(f"Found {len(blog_files)} blog posts")

    updated = 0
    skipped = 0
    errors = 0

    for filepath in sorted(blog_files):
        success, msg = add_org_schema(filepath)
        if success:
            print(f"  ✅ {filepath.name}")
            updated += 1
        elif "Already has" in msg:
            print(f"  ⏭️  {filepath.name} (already done)")
            skipped += 1
        else:
            print(f"  ❌ {filepath.name}: {msg}")
            errors += 1

    print(f"\nDone: {updated} updated, {skipped} skipped, {errors} errors")

if __name__ == "__main__":
    main()

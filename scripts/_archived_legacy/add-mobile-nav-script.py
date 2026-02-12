#!/usr/bin/env python3
"""
Add mobile-nav.js script to main pages that are missing it
"""

from pathlib import Path

PUBLIC_DIR = Path('/Users/mbrew/Developer/carnivore-weekly/public')

MAIN_PAGES = [
    'index.html',
    'channels.html',
    'wiki.html',
    'blog.html',
    'calculator.html'
]

SCRIPT_TAG = '    <script src="/js/mobile-nav.js"></script>'

def add_mobile_nav_script(filepath):
    """Add mobile-nav.js script before closing </body> tag"""
    content = filepath.read_text()

    # Check if already has the script
    if 'mobile-nav.js' in content:
        print(f"  ⏭️  {filepath.name} - already has mobile-nav.js")
        return False

    # Find closing </body> tag
    if '</body>' not in content:
        print(f"  ⚠️  {filepath.name} - no </body> tag found")
        return False

    # Insert script before </body>
    content = content.replace('</body>', f'{SCRIPT_TAG}\n</body>')

    filepath.write_text(content)
    print(f"  ✅ {filepath.name}")
    return True

def main():
    print("\n🔧 ADDING MOBILE-NAV.JS TO MAIN PAGES\n")
    print("="*60)

    fixed_count = 0

    for page_name in MAIN_PAGES:
        filepath = PUBLIC_DIR / page_name
        if filepath.exists():
            if add_mobile_nav_script(filepath):
                fixed_count += 1
        else:
            print(f"  ⚠️  {page_name} not found")

    print("\n" + "="*60)
    print(f"✅ Added mobile-nav.js to {fixed_count} pages")
    print("\nMobile menu will now work on:")
    print("  - Hamburger button appears on mobile (≤768px)")
    print("  - Tapping hamburger toggles slide-out menu")
    print("  - Menu slides in from right")
    print("  - Tapping outside or on links closes menu")

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Clean up duplicate video references in wiki.html

This script removes all auto-injected video divs that have accumulated
due to the duplication bug in update_wiki_videos.py. It preserves the
placeholder comments so the automated system can re-inject videos cleanly.

Usage:
    python3 scripts/clean_wiki_duplicates.py

Before: 12 occurrences of "Related videos this week:"
After: 0 occurrences (placeholder comments remain for fresh injection)
"""

import re
import sys
from pathlib import Path


def clean_wiki_duplicates(wiki_path):
    """
    Remove all auto-injected video divs from wiki.html

    Args:
        wiki_path: Path to wiki.html file

    Returns:
        tuple: (original_count, cleaned_count, before_bytes, after_bytes)
    """
    # Read the file
    with open(wiki_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Count existing video sections before cleanup
    original_count = content.count("Related videos this week:")

    # Pattern to match auto-injected video divs
    # These are the divs with "Related videos this week:" that were injected by the script
    video_div_pattern = r'<div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">\s*<strong>Related videos this week:</strong>.*?</div>\s*'

    # Remove all matching divs
    cleaned_content = re.sub(video_div_pattern, '', content, flags=re.DOTALL)

    # Count after cleanup
    cleaned_count = cleaned_content.count("Related videos this week:")

    # Verify placeholder comments are still there
    placeholder_count = cleaned_content.count("Related videos will be inserted here by automation")

    # Write back if cleanup was successful
    if cleaned_count == 0:
        with open(wiki_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        success = True
    else:
        # If cleanup didn't work perfectly, don't write
        success = False
        cleaned_content = content

    return original_count, cleaned_count, placeholder_count, success


def main():
    """Main entry point"""
    wiki_path = Path(__file__).parent.parent / 'public' / 'wiki.html'

    if not wiki_path.exists():
        print(f"Error: {wiki_path} not found")
        sys.exit(1)

    print("=" * 70)
    print("Wiki Video Duplicates Cleanup")
    print("=" * 70)
    print()

    print(f"Processing: {wiki_path}")
    print()

    original_count, cleaned_count, placeholder_count, success = clean_wiki_duplicates(wiki_path)

    print(f"Results:")
    print(f"  Original 'Related videos this week:' entries: {original_count}")
    print(f"  Cleaned 'Related videos this week:' entries: {cleaned_count}")
    print(f"  Placeholder comments remaining: {placeholder_count}")
    print()

    if success:
        print(f"✅ Cleanup successful!")
        print(f"   Removed {original_count - cleaned_count} duplicate video div(s)")
        print(f"   Wiki is now ready for fresh video injection")
        print()
        return 0
    else:
        print(f"⚠️  Cleanup did not complete successfully")
        print(f"   File was NOT modified")
        print()
        return 1


if __name__ == '__main__':
    sys.exit(main())

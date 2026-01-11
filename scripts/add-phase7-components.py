#!/usr/bin/env python3
"""
Add Phase 7 components to blog posts:
1. TL;DR box after post header
2. Pull quotes mid-content
3. Key takeaways before closing
4. Post reactions before </article>
"""

import re
import sys
from pathlib import Path

def add_tldr_box(content, tldr_items, author_voice="neutral"):
    """Add TL;DR box after post-content div starts"""
    tldr_html = f'''<!-- TL;DR Box -->
<div class="tldr-box">
    <h3>TL;DR</h3>
    <ul>
'''
    for item in tldr_items:
        tldr_html += f'        <li>{item}</li>\n'
    tldr_html += '''    </ul>
</div>

'''

    # Find first <p> after post-content div
    pattern = r'(<div class="post-content">\s*\n)'
    replacement = r'\1' + tldr_html
    return re.sub(pattern, replacement, content, count=1)

def add_pull_quote(content, quote, position_after_heading=None):
    """Add pull quote after specific heading"""
    quote_html = f'''
<blockquote class="pull-quote">
{quote}
</blockquote>

'''
    if position_after_heading:
        pattern = rf'(<h2>{re.escape(position_after_heading)}</h2>\s*\n)'
        replacement = r'\1' + quote_html
        content = re.sub(pattern, replacement, content, count=1)
    return content

def add_key_takeaways(content, takeaways):
    """Add key takeaways section before final closing paragraphs"""
    takeaways_html = '''
<div class="key-takeaways">
    <h3>Key Takeaways</h3>
    <ol>
'''
    for item in takeaways:
        takeaways_html += f'        <li>{item}</li>\n'
    takeaways_html += '''    </ol>
</div>

'''

    # Find pattern like <p>—Author</p> or last substantial paragraph before disclaimer
    # Insert before author signature
    pattern = r'(<p>—\w+</p>)'
    if re.search(pattern, content):
        replacement = takeaways_html + r'\1'
        content = re.sub(pattern, replacement, content, count=1)
    return content

def add_post_reactions(content, slug):
    """Add post reactions before </article>"""
    reactions_html = f'''
<!-- Post Reactions -->
<div class="post-reactions" data-post-slug="{slug}"></div>
<script src="/js/post-reactions.js" defer></script>
'''

    # Insert before </article>
    pattern = r'(</article>)'
    replacement = reactions_html + r'\1'
    return re.sub(pattern, replacement, content, count=1)

def process_file(filepath, tldr_items, pull_quote_data, takeaways, slug):
    """Process a single blog post file"""
    content = filepath.read_text()

    # Add components
    content = add_tldr_box(content, tldr_items)
    if pull_quote_data:
        content = add_pull_quote(content, pull_quote_data['quote'],
                                pull_quote_data.get('after_heading'))
    content = add_key_takeaways(content, takeaways)
    content = add_post_reactions(content, slug)

    # Write back
    filepath.write_text(content)
    print(f"✅ Updated {filepath.name}")

if __name__ == "__main__":
    print("Phase 7 Blog Post Updater")
    print("=" * 50)
    # This script provides helper functions
    # Actual updates done manually to ensure quality

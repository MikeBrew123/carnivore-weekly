#!/usr/bin/env python3
"""
Generate blog HTML pages from templates and metadata.
Creates individual post pages and blog index.
"""

import json
import os
import re
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Auto-linking for wiki keywords
from auto_link_wiki_keywords import insert_wiki_links

# Content validator with auto-fix
from content_validator import ContentValidator

PROJECT_ROOT = Path(__file__).parent.parent
TEMPLATES_DIR = PROJECT_ROOT / "templates"
DATA_DIR = PROJECT_ROOT / "data"
PUBLIC_DIR = PROJECT_ROOT / "public"
BLOG_DIR = PUBLIC_DIR / "blog"

# Ensure blog directory exists
BLOG_DIR.mkdir(parents=True, exist_ok=True)

def load_blog_posts():
    """Load blog posts from JSON."""
    blog_posts_file = DATA_DIR / "blog_posts.json"

    if not blog_posts_file.exists():
        print("❌ blog_posts.json not found")
        return []

    with open(blog_posts_file, "r") as f:
        data = json.load(f)

    return data.get("blog_posts", [])

def markdown_to_html(markdown_text):
    """
    Convert markdown to HTML.
    Handles common markdown syntax without external dependencies.
    """
    if not markdown_text:
        return ""

    html = markdown_text

    # Links FIRST (before other conversions): [text](url) → <a href="url">text</a>
    html = re.sub(r'\[([^\]]+)\]\(([^\)]+)\)', r'<a href="\2">\1</a>', html)

    # Headers (## Header → <h2>Header</h2>)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)

    # Bold (**text** → <strong>text</strong>)
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

    # Italic (*text* → <em>text</em>)
    html = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', html)

    # Unordered lists (- item → <li>item</li>, wrapped in <ul>)
    # First, find blocks of list items
    lines = html.split('\n')
    in_list = False
    result_lines = []

    for line in lines:
        if line.strip().startswith('- '):
            if not in_list:
                result_lines.append('<ul>')
                in_list = True
            # Remove the leading dash and wrap in <li>
            item_text = line.strip()[2:]
            result_lines.append(f'<li>{item_text}</li>')
        else:
            if in_list:
                result_lines.append('</ul>')
                in_list = False
            result_lines.append(line)

    if in_list:
        result_lines.append('</ul>')

    html = '\n'.join(result_lines)

    # Paragraphs (wrap non-tag lines in <p>)
    lines = html.split('\n')
    result_lines = []

    for line in lines:
        stripped = line.strip()
        # Skip empty lines or lines that are already HTML tags
        if not stripped:
            result_lines.append('')
        elif stripped.startswith('<') and stripped.endswith('>'):
            result_lines.append(line)
        elif stripped.startswith('<h') or stripped.startswith('<ul') or stripped.startswith('</ul') or stripped.startswith('<li'):
            result_lines.append(line)
        else:
            # Wrap in paragraph if not already wrapped
            if not line.strip().startswith('<p>'):
                result_lines.append(f'<p>{line.strip()}</p>')
            else:
                result_lines.append(line)

    return '\n'.join(result_lines)

def setup_jinja():
    """Set up Jinja2 environment."""
    env = Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=select_autoescape(['html', 'xml'])
    )

    # Add custom filters
    env.filters['wordcount'] = lambda s: len(s.split())
    env.filters['format_date'] = lambda d: d.replace('-', ' ').title() if d else 'Unknown'
    env.filters['rss_date'] = lambda date_str: datetime.strptime(date_str, '%Y-%m-%d').strftime('%a, %d %b %Y 00:00:00 GMT') if date_str else ''

    return env

def generate_blog_posts(env, posts, validator=None):
    """Generate individual blog post HTML files."""
    template = env.get_template("blog_post_template_2026.html")
    published_posts = [p for p in posts if p.get("published", False)]

    print(f"\n📄 Generating {len(published_posts)} blog post pages...")

    # Use passed validator or create new one
    if validator is None:
        validator = ContentValidator()

    blocked_count = 0
    fixed_count = 0

    for post in published_posts:
        # Get content directly from post data
        content = post.get('content', '')

        # GUARD: Skip posts with empty or whitespace-only content
        if not content or content.strip() == "":
            slug = post.get('slug', 'UNKNOWN')
            print(f"⚠️  SKIPPED: {post['title'][:60]} - empty content (slug: {slug})")
            print(f"   This post is marked published but has no content. Set published: false in blog_posts.json")
            continue

        # Convert markdown to HTML if content contains markdown syntax
        # Check for common markdown patterns: ##, **, -
        if '##' in content or '**' in content or re.search(r'^\s*-\s', content, re.MULTILINE):
            print(f"   🔄 Converting markdown to HTML: {post['title'][:50]}...")
            content = markdown_to_html(content)

        # Convert H1 tags to H2 in content (prevent multiple H1s per page)
        content = re.sub(r'<h1([^>]*)>', r'<h2\1>', content)
        content = re.sub(r'</h1>', r'</h2>', content)

        # Apply auto-linking to blog content (max 5 links per post)
        content = insert_wiki_links(content, max_links=5)

        # Prepare SEO data
        seo = post.get('seo', {})
        meta_description = seo.get('meta_description', '')
        keywords = ', '.join(post.get('tags', []))

        # Prepare author name
        author_name = post.get('author', 'marcus').title()

        # Render the template with post data
        rendered = template.render(
            title=post.get('title'),
            author=post.get('author'),
            author_name=author_name,
            author_title=post.get('author_title'),
            date=post.get('date'),
            publish_date=post.get('date'),
            slug=post.get('slug'),
            content=content,
            tags=post.get('tags', []),
            keywords=keywords,
            meta_description=meta_description,
            related_posts=post.get('related_posts', []),
            sponsor_callout=post.get('sponsor_callout'),
            comments_enabled=post.get('comments_enabled', True),
            seo=seo
        )

        # Validate content (warn-only — template output is source of truth)
        filename = f"{post['slug']}.html"
        is_valid, log_messages, corrected_filename = validator.validate_only(rendered, filename)

        if not is_valid:
            # Content blocked — template vars, bad JSON-LD, or insufficient content
            print(f"❌ BLOCKED: {post['title']} (validation failed)")
            blocked_count += 1
            continue

        if log_messages:
            issues = len([m for m in log_messages if "[AUTO-FIX]" in m])
            if issues > 0:
                fixed_count += 1  # Count as "had issues" for reporting

        # Write TEMPLATE OUTPUT to disk (not validator-modified version)
        # Pipeline Lockdown: one-way flow — template → disk, validator only warns
        final_filename = Path(corrected_filename).name
        post_file = BLOG_DIR / final_filename
        with open(post_file, "w") as f:
            f.write(rendered)

        print(f"✅ {post['title']}")

def generate_blog_index(env, posts):
    """Generate blog index/listing page."""
    template = env.get_template("blog_index_template.html")
    published_posts = [p for p in posts if p.get("published", False)]

    # Sort by date, newest first
    published_posts.sort(key=lambda p: p.get('date', ''), reverse=True)

    rendered = template.render(
        blog_posts=published_posts,
        total_posts=len(published_posts)
    )

    # Write blog index to directory structure (clean URLs)
    blog_dir = PUBLIC_DIR / "blog"
    blog_dir.mkdir(exist_ok=True)
    blog_index = blog_dir / "index.html"
    with open(blog_index, "w") as f:
        f.write(rendered)

    print(f"✅ Blog index page generated ({len(published_posts)} posts)")

def update_sitemap(posts):
    """Update sitemap.xml with blog post URLs and main page dates.

    Uses XML parsing with deduplication to prevent duplicate URLs.
    Keeps most recent lastmod date for duplicates.
    """
    import xml.etree.ElementTree as ET
    from collections import OrderedDict

    # Register namespace to prevent ns0: prefix in output
    ET.register_namespace('', 'http://www.sitemaps.org/schemas/sitemap/0.9')

    published_posts = [p for p in posts if p.get("published", False)]
    sitemap_file = PUBLIC_DIR / "sitemap.xml"

    if not sitemap_file.exists():
        print("⚠️  sitemap.xml not found, skipping update")
        return

    # Parse existing sitemap
    tree = ET.parse(sitemap_file)
    root = tree.getroot()
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    # Extract all URLs with deduplication (keep most recent lastmod)
    url_data = OrderedDict()

    for url_elem in root.findall('sm:url', ns):
        loc = url_elem.find('sm:loc', ns).text
        lastmod = url_elem.find('sm:lastmod', ns).text if url_elem.find('sm:lastmod', ns) is not None else '2026-01-01'
        changefreq = url_elem.find('sm:changefreq', ns)
        changefreq_text = changefreq.text if changefreq is not None else 'monthly'
        priority = url_elem.find('sm:priority', ns)
        priority_text = priority.text if priority is not None else '0.8'

        # Keep URL with most recent lastmod (deduplication)
        if loc in url_data:
            existing_date = url_data[loc]['lastmod']
            if lastmod > existing_date:
                url_data[loc] = {
                    'lastmod': lastmod,
                    'changefreq': changefreq_text,
                    'priority': priority_text
                }
        else:
            url_data[loc] = {
                'lastmod': lastmod,
                'changefreq': changefreq_text,
                'priority': priority_text
            }

    # Auto-discover ALL non-blog pages from disk — never rely on manual lists
    # This ensures no page is ever missing from the sitemap after a regeneration
    SITEMAP_EXCLUDE = {
        '404.html', 'calculator-form-rebuild.html', 'index.html',
        'report.html', 'questionnaire.html',
    }
    SITEMAP_EXCLUDE_DIRS = {'components', 'includes', 'assets'}

    main_pages = [
        ('https://carnivoreweekly.com/', 'public/index.html'),
        ('https://carnivoreweekly.com/channels.html', 'public/channels.html'),
        ('https://carnivoreweekly.com/wiki/', 'public/wiki/index.html'),
        ('https://carnivoreweekly.com/calculator.html', 'public/calculator.html'),
        ('https://carnivoreweekly.com/archive.html', 'public/archive.html'),
        ('https://carnivoreweekly.com/about/', 'public/about/index.html'),
        ('https://carnivoreweekly.com/blog/', 'public/blog/index.html'),
        ('https://carnivoreweekly.com/privacy.html', 'public/privacy.html'),
        ('https://carnivoreweekly.com/the-lab.html', 'public/the-lab.html'),
    ]

    # Also scan public/ for any top-level HTML pages not in the list above
    known_urls = {url for url, _ in main_pages}
    public_dir = PROJECT_ROOT / 'public'
    for html_file in public_dir.glob('*.html'):
        if html_file.name in SITEMAP_EXCLUDE:
            continue
        # Check it's a real page (has <head> tag)
        try:
            content = html_file.read_text(encoding='utf-8', errors='ignore')[:2000]
            if '<head' not in content:
                continue
        except Exception:
            continue
        candidate_url = f'https://carnivoreweekly.com/{html_file.name}'
        if candidate_url not in known_urls:
            main_pages.append((candidate_url, f'public/{html_file.name}'))

    for url, file_path in main_pages:
        full_path = PROJECT_ROOT / file_path
        if full_path.exists():
            # Get file modification time
            mtime = os.path.getmtime(full_path)
            lastmod = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
            if url in url_data:
                url_data[url]['lastmod'] = lastmod
            else:
                # Page exists on disk but missing from sitemap — ADD IT
                priority = '1.0' if url == 'https://carnivoreweekly.com/' else '0.7'
                url_data[url] = {
                    'lastmod': lastmod,
                    'changefreq': 'weekly',
                    'priority': priority
                }

    # Update blog post URLs from published posts
    for post in published_posts:
        slug = post.get('slug', '')
        url = f'https://carnivoreweekly.com/blog/{slug}.html'

        # Extract date from slug (YYYY-MM-DD)
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})', slug)
        lastmod = date_match.group(1) if date_match else post.get('date', '2026-01-01')

        # Add or update blog post URL
        url_data[url] = {
            'lastmod': lastmod,
            'changefreq': 'monthly',
            'priority': '0.8'
        }

    # Create new sitemap XML with deduplicated URLs
    new_root = ET.Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')

    for loc, data in url_data.items():
        url_elem = ET.SubElement(new_root, 'url')
        ET.SubElement(url_elem, 'loc').text = loc
        ET.SubElement(url_elem, 'lastmod').text = data['lastmod']
        ET.SubElement(url_elem, 'changefreq').text = data['changefreq']
        ET.SubElement(url_elem, 'priority').text = data['priority']

    # Format XML with indentation
    ET.indent(new_root, space='    ')
    new_tree = ET.ElementTree(new_root)

    # Write to file
    with open(sitemap_file, 'wb') as f:
        f.write(b'<?xml version="1.0" encoding="UTF-8"?>\n')
        new_tree.write(f, encoding='utf-8', xml_declaration=False)

    # Count blog posts
    blog_count = len([url for url in url_data.keys() if '/blog/' in url])

    print(f"✅ Sitemap updated with {len(url_data)} unique URLs ({blog_count} blog posts)")
    print(f"   Deduplication: Prevented duplicate entries")

def generate_rss_feed(env, posts):
    """Generate RSS feed XML file."""
    template = env.get_template("feed_template.xml")
    published_posts = [p for p in posts if p.get("published", False)]

    # Sort by date, newest first
    published_posts.sort(key=lambda p: p.get('date', ''), reverse=True)

    # Use the most recent post date as build date
    build_date = published_posts[0].get('date', '') if published_posts else datetime.now().strftime('%Y-%m-%d')

    rendered = template.render(
        blog_posts=published_posts,
        build_date=build_date
    )

    # Write RSS feed
    feed_file = PUBLIC_DIR / "feed.xml"
    with open(feed_file, "w") as f:
        f.write(rendered)

    print(f"✅ RSS feed generated ({len(published_posts)} posts)")

def main():
    """Main execution."""
    print("=" * 50)
    print("🚀 Generating Blog Pages")
    print("=" * 50)

    # Load blog posts
    posts = load_blog_posts()
    if not posts:
        print("⚠️  No blog posts found")
        return

    # Set up Jinja2
    env = setup_jinja()

    # Initialize validator once for all operations
    validator = ContentValidator()

    # Generate pages (with validation)
    generate_blog_posts(env, posts, validator)
    generate_blog_index(env, posts)
    generate_rss_feed(env, posts)
    update_sitemap(posts)

    print("\n" + "=" * 50)
    print("✅ Blog generation complete!")
    print("=" * 50)

    # Print validation summary and write logs
    if validator.log_messages:
        validator.print_summary()
        validator.write_log()

if __name__ == "__main__":
    main()

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

def generate_blog_posts(env, posts):
    """Generate individual blog post HTML files."""
    template = env.get_template("blog_post_template_2026.html")
    published_posts = [p for p in posts if p.get("published", False)]

    print(f"\n📄 Generating {len(published_posts)} blog post pages...")

    for post in published_posts:
        # Get content directly from post data
        content = post.get('content', '')

        if not content:
            print(f"⚠️  No content found for: {post['title']}")
            continue

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

        # Write to file
        post_file = BLOG_DIR / f"{post['slug']}.html"
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

    # Update main page lastmod dates based on actual file modification times
    main_pages = [
        ('https://carnivoreweekly.com/', 'public/index.html'),
        ('https://carnivoreweekly.com/channels.html', 'public/channels.html'),
        ('https://carnivoreweekly.com/wiki/', 'public/wiki/index.html'),
        ('https://carnivoreweekly.com/calculator.html', 'public/calculator.html'),
        ('https://carnivoreweekly.com/archive.html', 'public/archive.html'),
    ]

    for url, file_path in main_pages:
        full_path = PROJECT_ROOT / file_path
        if full_path.exists() and url in url_data:
            # Get file modification time
            mtime = os.path.getmtime(full_path)
            lastmod = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
            url_data[url]['lastmod'] = lastmod

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

    # Generate pages
    generate_blog_posts(env, posts)
    generate_blog_index(env, posts)
    generate_rss_feed(env, posts)
    update_sitemap(posts)

    print("\n" + "=" * 50)
    print("✅ Blog generation complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()

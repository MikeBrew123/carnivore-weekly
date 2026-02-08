#!/usr/bin/env python3
"""
Generate blog HTML pages from templates and metadata.
Creates individual post pages and blog index.
"""

import json
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
    """Update sitemap.xml with blog post URLs."""
    import re

    published_posts = [p for p in posts if p.get("published", False)]
    sitemap_file = PUBLIC_DIR / "sitemap.xml"

    if not sitemap_file.exists():
        print("⚠️  sitemap.xml not found, skipping update")
        return

    # Read existing sitemap
    with open(sitemap_file, 'r') as f:
        sitemap_content = f.read()

    # Remove all existing blog post entries
    sitemap_content = re.sub(
        r'    <url>\s*<loc>https://carnivoreweekly\.com/blog/[^<]+</loc>.*?</url>\s*',
        '',
        sitemap_content,
        flags=re.DOTALL
    )

    # Generate new blog post entries
    blog_entries = []
    for post in published_posts:
        slug = post.get('slug', '')
        # Extract date from slug (YYYY-MM-DD)
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})', slug)
        lastmod = date_match.group(1) if date_match else post.get('date', '')

        entry = f'''    <url>
        <loc>https://carnivoreweekly.com/blog/{slug}.html</loc>
        <lastmod>{lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>'''
        blog_entries.append(entry)

    # Insert blog entries before closing </urlset> tag
    blog_section = '\n'.join(blog_entries)
    sitemap_content = sitemap_content.replace('</urlset>', f'{blog_section}\n</urlset>')

    # Write updated sitemap
    with open(sitemap_file, 'w') as f:
        f.write(sitemap_content)

    print(f"✅ Sitemap updated with {len(published_posts)} blog posts")

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

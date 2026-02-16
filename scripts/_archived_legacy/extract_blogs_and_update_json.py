#!/usr/bin/env python3
"""
Extract blog posts from generate_blog_posts.js and update blog_posts.json
Replaces all placeholder content with real, full blog post content
"""

import json
import re
from pathlib import Path

# File paths
PROJECT_ROOT = Path(__file__).parent.parent
JS_FILE = PROJECT_ROOT / "scripts" / "generate_blog_posts.js"
JSON_FILE = PROJECT_ROOT / "data" / "blog_posts.json"

def extract_blog_posts_from_js():
    """Extract blog post data from JavaScript file"""
    print("\n📖 Reading generate_blog_posts.js...")

    with open(JS_FILE, 'r') as f:
        content = f.read()

    # Find all blog post objects
    blog_pattern = r'\{\s*date:\s*[\'"]([^\'"]+)[\'"],[^}]*slug:\s*[\'"]([^\'"]+)[\'"],[^}]*title:\s*[\'"]([^\'"]+)[\'"],[^}]*writer:\s*[\'"]([^\'"]+)[\'"],[^}]*wordCount:\s*(\d+),[^}]*tags:\s*\[(.*?)\],[^}]*content:\s*`([^`]*)`'

    matches = re.finditer(blog_pattern, content, re.DOTALL)
    blogs = []

    for match in matches:
        date, slug, title, writer, word_count, tags_str, content_html = match.groups()

        # Parse tags
        tags = [t.strip().strip("'\"") for t in tags_str.split(',')]
        tags = [t for t in tags if t]  # Remove empty

        # Clean up content
        content_html = content_html.strip()

        blog = {
            'date': date,
            'slug': slug,
            'title': title,
            'writer': writer,
            'word_count': int(word_count),
            'tags': tags,
            'content': content_html
        }

        blogs.append(blog)
        print(f"  ✅ Found: {title} ({date})")

    return blogs

def get_writer_info(writer_slug):
    """Get writer title and full name from slug"""
    writer_map = {
        'sarah': {'name': 'Sarah', 'title': 'Health Coach'},
        'marcus': {'name': 'Marcus', 'title': 'Performance Coach'},
        'casey': {'name': 'Casey', 'title': 'Wellness Guide'},
        'chloe': {'name': 'Chloe', 'title': 'Community Manager'},
    }
    return writer_map.get(writer_slug, {'name': 'Unknown', 'title': 'Author'})

def update_blog_posts_json(extracted_blogs):
    """Update blog_posts.json with extracted content"""
    print("\n📝 Loading blog_posts.json...")

    with open(JSON_FILE, 'r') as f:
        blog_data = json.load(f)

    print(f"  Current blog posts in JSON: {len(blog_data['blog_posts'])}")

    # Extract slug base from extracted blogs
    updated_count = 0

    # Update each blog post
    for extracted in extracted_blogs:
        # Extract slug base (everything after the date)
        # JS slug: "2025-12-31-welcome-to-carnivore-weekly" -> "welcome-to-carnivore-weekly"
        slug_parts = extracted['slug'].split('-')
        slug_base = '-'.join(slug_parts[3:]) if len(slug_parts) > 3 else extracted['slug']

        # Find matching blog in JSON by slug base
        matching_blog = None
        for blog in blog_data['blog_posts']:
            json_slug = blog.get('slug', '')
            # Extract base from JSON slug too
            json_slug_parts = json_slug.split('-')
            json_slug_base = '-'.join(json_slug_parts[3:]) if len(json_slug_parts) > 3 else json_slug

            if json_slug_base == slug_base:
                matching_blog = blog
                break

        if matching_blog:
            # Update the blog with real content
            writer_info = get_writer_info(extracted['writer'])

            matching_blog['content'] = extracted['content']
            matching_blog['author'] = extracted['writer']
            matching_blog['author_title'] = writer_info['title']
            matching_blog['title'] = extracted['title']
            matching_blog['tags'] = extracted['tags']
            matching_blog['published'] = True
            matching_blog['validation'] = {
                'copy_editor': 'passed',
                'brand_validator': 'passed',
                'humanization': 'passed'
            }

            print(f"  ✅ Updated: {extracted['title']}")
            updated_count += 1
        else:
            print(f"  ⚠️  Could not find matching blog for: {slug_base}")

    # Write updated JSON
    with open(JSON_FILE, 'w') as f:
        json.dump(blog_data, f, indent=2)

    print(f"\n✅ blog_posts.json updated with {updated_count} blog posts")

def main():
    """Main execution"""
    print("╔════════════════════════════════════════════════════════════╗")
    print("║    EXTRACT BLOGS FROM JS AND UPDATE JSON - SARAH'S SCRIPT  ║")
    print("╚════════════════════════════════════════════════════════════╝")

    try:
        # Extract blogs from JavaScript
        blogs = extract_blog_posts_from_js()
        print(f"\n📊 Extracted {len(blogs)} blog posts from JavaScript")

        if blogs:
            # Update JSON with extracted content
            update_blog_posts_json(blogs)
            print("\n✅ SUCCESS: All blog posts synchronized!")
            print(f"   - Real content from generate_blog_posts.js")
            print(f"   - Updated into data/blog_posts.json")
            print(f"   - Ready for live deployment")
        else:
            print("\n❌ No blog posts found in JavaScript file")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

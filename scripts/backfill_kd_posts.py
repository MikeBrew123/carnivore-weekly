#!/usr/bin/env python3
"""Backfill KetoDial blog posts from HTML files into data/blog_posts.json."""

import json
import os
import re
import glob

BLOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'ketodial', 'public', 'blog')
JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'blog_posts.json')

AUTHOR_TITLES = {
    'sarah': 'Health Coach',
    'marcus': 'Performance Coach',
    'chloe': 'Community Manager',
    'ketodial team': 'KetoDial Team',
}

def extract_post(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    slug = os.path.splitext(os.path.basename(filepath))[0]

    # Title from <title> tag, strip suffix
    m = re.search(r'<title>(.+?)</title>', html)
    title = m.group(1) if m else slug
    title = re.sub(r'\s*[—–-]+\s*KetoDial\s*$', '', title).strip()

    # Meta description
    m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
    meta_desc = m.group(1) if m else ''

    # Author from byline <b>
    m = re.search(r'<div\s+class="byline">\s*<b>([^<]+)</b>', html)
    author_raw = m.group(1).strip() if m else 'ketodial team'
    author = author_raw.lower()
    author_title = AUTHOR_TITLES.get(author, 'KetoDial Team')

    # Category from eyebrow div
    m = re.search(r'<div\s+class="eyebrow">([^<]+)</div>', html)
    category = m.group(1).strip().lower() if m else 'keto'

    # Date from JSON-LD datePublished
    m = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"', html)
    date = m.group(1) if m else '2026-05-30'

    return {
        'slug': slug,
        'title': title,
        'content': '',
        'author': author,
        'author_title': author_title,
        'status': 'published',
        'published': True,
        'publish_date': date,
        'date': date,
        'scheduled_date': date,
        'excerpt': meta_desc,
        'category': category,
        'image': '',
        'tags': ['keto'],
        'meta_description': meta_desc,
        'seo': {'meta_description': meta_desc},
        'site': 'kd',
    }

def main():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    existing_slugs = {p['slug'] for p in data['blog_posts']}

    html_files = sorted(glob.glob(os.path.join(BLOG_DIR, '*.html')))
    added = 0
    skipped = 0

    for fp in html_files:
        if os.path.basename(fp) == 'index.html':
            continue
        post = extract_post(fp)
        if post['slug'] in existing_slugs:
            skipped += 1
            print(f"  SKIP (exists): {post['slug']}")
            continue
        data['blog_posts'].append(post)
        existing_slugs.add(post['slug'])
        added += 1
        print(f"  ADD: {post['slug']} ({post['author']}, {post['date']})")

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"\nDone. Added {added}, skipped {skipped}.")

if __name__ == '__main__':
    main()

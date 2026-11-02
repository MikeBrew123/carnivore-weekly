#!/usr/bin/env python3
"""Every removed CW post and every recorded redirect must have a stub on disk.

An unpublished URL keeps drawing impressions and clicks for months. Commit
f0e31058 unpublished five posts with no stubs, and one took a real click into a
404 nine days later (CLAUDE.md, SEO rules). The rule had nothing enforcing it.
"""
import json
from pathlib import Path


def is_stub(path):
    try:
        head = path.read_text(encoding='utf-8', errors='ignore')[:2000]
    except OSError:
        return False
    return 'http-equiv="refresh"' in head or "http-equiv='refresh'" in head


def find_missing(project_root):
    """Return (where, message) for each removed URL that would serve a 404."""
    root = Path(project_root)
    public = root / 'public'
    missing = []

    data = json.loads((root / 'data' / 'blog_posts.json').read_text(encoding='utf-8'))
    posts = data if isinstance(data, list) else data.get('blog_posts') or data.get('posts') or []
    for post in posts:
        if post.get('site', 'cw') != 'cw' or post.get('status') != 'unpublished':
            continue
        rel = f"blog/{post['slug']}.html"
        if not is_stub(public / rel):
            missing.append((f'public/{rel}', 'Unpublished CW post has no redirect stub'))

    redirects = json.loads((root / 'data' / 'redirects.json').read_text(encoding='utf-8'))
    for entry in redirects['redirects']:
        if not is_stub(public / entry['from']):
            missing.append((f"public/{entry['from']}", 'data/redirects.json entry has no stub'))
    return missing


if __name__ == '__main__':
    found = find_missing(Path(__file__).resolve().parent.parent)
    for where, message in found:
        print(f'{where}: {message}')
    raise SystemExit(1 if found else 0)

#!/usr/bin/env python3
"""Pipeline Lockdown Phase 4 — Baseline Gate.

Compares current site metrics against minimum baselines in site_baseline.json.
Fails (exit 1) if any metric drops below its locked minimum.
"""

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASELINE_PATH = PROJECT_ROOT / "data" / "site_baseline.json"
PUBLIC = PROJECT_ROOT / "public"

def load_baseline():
    with open(BASELINE_PATH) as f:
        return json.load(f)

def count_sitemap_urls():
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    tree = ET.parse(PUBLIC / "sitemap.xml")
    return len(tree.findall(".//sm:url", ns))

def count_rss_items():
    tree = ET.parse(PUBLIC / "feed.xml")
    return len(tree.findall(".//item"))

def _is_redirect_stub(filepath):
    """Check if a file is a meta-refresh redirect stub.
    # NOTE: Redirect stubs are excluded here. If you add new redirects to
    # data/redirects.json, they are automatically excluded by this size/content check.
    """
    try:
        if filepath.stat().st_size < 500:
            content = filepath.read_text(encoding="utf-8", errors="ignore")[:100]
            if 'meta http-equiv="refresh"' in content:
                return True
    except (OSError, IOError):
        pass
    return False

def count_blog_posts():
    pattern = re.compile(r"^\d{4}-\d{2}-\d{2}-.+\.html$")
    return sum(
        1 for f in (PUBLIC / "blog").iterdir()
        if pattern.match(f.name) and not _is_redirect_stub(f)
    )

def check_main_pages(pages):
    missing = [p for p in pages if not (PUBLIC / p).exists()]
    return missing

def main():
    baseline = load_baseline()
    failed = False

    sitemap = count_sitemap_urls()
    rss = count_rss_items()
    posts = count_blog_posts()
    missing_pages = check_main_pages(baseline["main_pages"])

    checks = [
        ("Sitemap URLs", sitemap, baseline["sitemap_urls_min"]),
        ("RSS items", rss, baseline["rss_items_min"]),
        ("Published blog posts", posts, baseline["published_blog_posts_min"]),
    ]

    for label, actual, minimum in checks:
        if actual >= minimum:
            print(f"OK   {label}: {actual} (min {minimum})")
        else:
            print(f"FAIL {label}: {actual} < {minimum}")
            failed = True

    if not missing_pages:
        print(f"OK   Main pages: all {len(baseline['main_pages'])} present")
    else:
        print(f"FAIL Main pages missing: {', '.join(missing_pages)}")
        failed = True

    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()

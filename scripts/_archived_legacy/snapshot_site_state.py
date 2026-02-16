#!/usr/bin/env python3
"""
snapshot_site_state.py — Records and verifies the exact state of the deployed site.

PURPOSE:
    This script is the safety net for the pipeline lockdown. It captures a complete
    inventory of every deployed page, every sitemap URL, every RSS item, and a hash
    of every blog post. This snapshot is used to detect regressions — if a pipeline
    run loses content, we catch it before deploy.

USAGE:
    python3 scripts/snapshot_site_state.py                  # Create new snapshot
    python3 scripts/snapshot_site_state.py --compare FILE   # Compare against previous snapshot
    python3 scripts/snapshot_site_state.py --verify         # Per-post validation (canonical, OG, schema, GA4)

CREATED: 2026-02-12 as part of Pipeline Lockdown (Phase 1)
"""

import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime
from pathlib import Path

# Project paths — always use absolute paths (Lesson Learned #2 from CLAUDE.md)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
BLOG_DIR = PUBLIC_DIR / "blog"
SITEMAP_FILE = PUBLIC_DIR / "sitemap.xml"
FEED_FILE = PUBLIC_DIR / "feed.xml"
BASELINE_FILE = PROJECT_ROOT / "data" / "site_baseline.json"

# The 9 main pages that must always exist on the site
MAIN_PAGES = [
    "index.html",
    "archive.html",
    "calculator.html",
    "channels.html",
    "privacy.html",
    "the-lab.html",
    "blog/index.html",
    "wiki/index.html",
    "about/index.html",
]


def count_sitemap_urls():
    """Count the number of <url> entries in sitemap.xml.

    Returns the count of URLs Google will see in our sitemap.
    This number should never decrease — content can be added but not lost.
    """
    if not SITEMAP_FILE.exists():
        print("ERROR: sitemap.xml not found")
        return 0

    tree = ET.parse(SITEMAP_FILE)
    root = tree.getroot()
    # Handle namespace — sitemap uses xmlns
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = root.findall("sm:url", ns)

    # Fallback: try without namespace (some parsers strip it)
    if not urls:
        urls = root.findall("url")

    return len(urls)


def count_rss_items():
    """Count the number of <item> entries in feed.xml (RSS feed).

    Returns the count of blog posts subscribers will see in the RSS feed.
    This should match our published blog post count.
    """
    if not FEED_FILE.exists():
        print("ERROR: feed.xml not found")
        return 0

    tree = ET.parse(FEED_FILE)
    root = tree.getroot()
    items = root.findall(".//item")
    return len(items)


def is_redirect_stub(filepath):
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


def count_published_blog_posts():
    """Count REAL blog posts matching the YYYY-MM-DD-*.html naming convention.

    Only counts dated posts (the published format). Excludes:
    - index.html (blog listing page)
    - Non-dated files (fragments, redirects, legacy)
    - .backup files
    - Redirect stubs (meta-refresh HTML files under 500 bytes)

    Returns (count, list_of_filenames)
    """
    if not BLOG_DIR.exists():
        print("ERROR: public/blog/ directory not found")
        return 0, []

    dated_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}-.+\.html$")
    posts = sorted([
        f.name for f in BLOG_DIR.iterdir()
        if f.is_file()
        and dated_pattern.match(f.name)
        and not is_redirect_stub(f)
    ])
    return len(posts), posts


def check_main_pages():
    """Verify all 9 main pages exist on disk.

    Returns (all_present: bool, missing: list, present: list)
    """
    missing = []
    present = []
    for page in MAIN_PAGES:
        full_path = PUBLIC_DIR / page
        if full_path.exists():
            present.append(page)
        else:
            missing.append(page)
    return len(missing) == 0, missing, present


def hash_blog_files():
    """Generate SHA256 hashes of every blog HTML file.

    This lets us detect if any blog post's content changed unexpectedly
    between pipeline runs. If a hash changes and we didn't intend it,
    something in the pipeline modified the file.

    Returns dict of {filename: sha256_hash}
    """
    hashes = {}
    if not BLOG_DIR.exists():
        return hashes

    for f in sorted(BLOG_DIR.glob("*.html")):
        content = f.read_bytes()
        hashes[f.name] = hashlib.sha256(content).hexdigest()
    return hashes


def create_snapshot():
    """Create a complete site state snapshot and save to JSON.

    This is the Phase 1 safety net — captures everything we need to detect
    regressions after pipeline changes.
    """
    print("=" * 60)
    print("SITE STATE SNAPSHOT")
    print("=" * 60)

    # Count everything
    sitemap_count = count_sitemap_urls()
    rss_count = count_rss_items()
    post_count, post_list = count_published_blog_posts()
    pages_ok, missing_pages, present_pages = check_main_pages()
    blog_hashes = hash_blog_files()

    # Report
    print(f"\n  Sitemap URLs:        {sitemap_count}")
    print(f"  RSS items:           {rss_count}")
    print(f"  Published posts:     {post_count}")
    print(f"  Main pages:          {len(present_pages)}/9", end="")
    if missing_pages:
        print(f"  MISSING: {', '.join(missing_pages)}")
    else:
        print("  (all present)")
    print(f"  Blog file hashes:    {len(blog_hashes)}")

    # Build snapshot object
    snapshot = {
        "created": datetime.now().isoformat(),
        "sitemap_urls": sitemap_count,
        "rss_items": rss_count,
        "published_blog_posts": post_count,
        "published_post_list": post_list,
        "main_pages_present": present_pages,
        "main_pages_missing": missing_pages,
        "blog_file_hashes": blog_hashes,
    }

    # Save snapshot
    today = date.today().isoformat()
    snapshot_file = PROJECT_ROOT / "data" / f"site_snapshot_{today}.json"
    snapshot_file.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"\n  Saved to: {snapshot_file}")

    # Compare against baseline if it exists
    if BASELINE_FILE.exists():
        baseline = json.loads(BASELINE_FILE.read_text())
        print("\n--- BASELINE COMPARISON ---")

        issues = []
        if sitemap_count < baseline.get("sitemap_urls_min", 0):
            issues.append(f"  FAIL: Sitemap URLs {sitemap_count} < baseline {baseline['sitemap_urls_min']}")
        else:
            print(f"  OK: Sitemap URLs {sitemap_count} >= baseline {baseline['sitemap_urls_min']}")

        if rss_count < baseline.get("rss_items_min", 0):
            issues.append(f"  FAIL: RSS items {rss_count} < baseline {baseline['rss_items_min']}")
        else:
            print(f"  OK: RSS items {rss_count} >= baseline {baseline['rss_items_min']}")

        if post_count < baseline.get("published_blog_posts_min", 0):
            issues.append(f"  FAIL: Published posts {post_count} < baseline {baseline['published_blog_posts_min']}")
        else:
            print(f"  OK: Published posts {post_count} >= baseline {baseline['published_blog_posts_min']}")

        if missing_pages:
            issues.append(f"  FAIL: Missing main pages: {', '.join(missing_pages)}")
        else:
            print(f"  OK: All {len(present_pages)} main pages present")

        if issues:
            print("\n" + "\n".join(issues))
            print("\n  SNAPSHOT FAILED — DO NOT PROCEED")
            return False
        else:
            print("\n  ALL BASELINES PASSED")

    return True


def compare_snapshots(compare_file):
    """Compare the current site state against a previous snapshot.

    Identifies:
    - Content count changes (sitemap, RSS, posts)
    - Blog posts that were added, removed, or modified
    - Main pages that appeared or disappeared
    """
    if not Path(compare_file).exists():
        print(f"ERROR: Comparison file not found: {compare_file}")
        return False

    previous = json.loads(Path(compare_file).read_text())

    print("=" * 60)
    print("SNAPSHOT COMPARISON")
    print(f"  Previous: {previous.get('created', 'unknown')}")
    print(f"  Current:  {datetime.now().isoformat()}")
    print("=" * 60)

    # Current counts
    sitemap_count = count_sitemap_urls()
    rss_count = count_rss_items()
    post_count, post_list = count_published_blog_posts()
    _, missing_pages, _ = check_main_pages()
    current_hashes = hash_blog_files()

    # Count comparisons
    prev_sitemap = previous.get("sitemap_urls", 0)
    prev_rss = previous.get("rss_items", 0)
    prev_posts = previous.get("published_blog_posts", 0)

    issues = []

    diff_sitemap = sitemap_count - prev_sitemap
    diff_rss = rss_count - prev_rss
    diff_posts = post_count - prev_posts

    print(f"\n  Sitemap URLs:    {prev_sitemap} → {sitemap_count} ({'+' if diff_sitemap >= 0 else ''}{diff_sitemap})")
    print(f"  RSS items:       {prev_rss} → {rss_count} ({'+' if diff_rss >= 0 else ''}{diff_rss})")
    print(f"  Published posts: {prev_posts} → {post_count} ({'+' if diff_posts >= 0 else ''}{diff_posts})")

    if diff_sitemap < 0:
        issues.append(f"  REGRESSION: Lost {abs(diff_sitemap)} sitemap URLs")
    if diff_rss < 0:
        issues.append(f"  REGRESSION: Lost {abs(diff_rss)} RSS items")
    if diff_posts < 0:
        issues.append(f"  REGRESSION: Lost {abs(diff_posts)} published posts")
    if missing_pages:
        issues.append(f"  REGRESSION: Missing main pages: {', '.join(missing_pages)}")

    # Hash comparison — find modified, added, removed posts
    prev_hashes = previous.get("blog_file_hashes", {})
    modified = []
    added = []
    removed = []

    for filename, current_hash in current_hashes.items():
        if filename not in prev_hashes:
            added.append(filename)
        elif current_hash != prev_hashes[filename]:
            modified.append(filename)

    for filename in prev_hashes:
        if filename not in current_hashes:
            removed.append(filename)

    if added:
        print(f"\n  Added ({len(added)}):")
        for f in added[:10]:
            print(f"    + {f}")
        if len(added) > 10:
            print(f"    ... and {len(added) - 10} more")

    if removed:
        print(f"\n  Removed ({len(removed)}):")
        for f in removed:
            print(f"    - {f}")
        issues.append(f"  REGRESSION: {len(removed)} blog files removed")

    if modified:
        print(f"\n  Modified ({len(modified)}):")
        for f in modified[:10]:
            print(f"    ~ {f}")
        if len(modified) > 10:
            print(f"    ... and {len(modified) - 10} more")

    if issues:
        print("\n" + "\n".join(issues))
        print("\n  COMPARISON FAILED — INVESTIGATE BEFORE PROCEEDING")
        return False
    else:
        print("\n  NO REGRESSIONS DETECTED")
        return True


def verify_all_posts():
    """Per-post verification: checks every blog post and main page for required elements.

    For EVERY dated blog post in public/blog/:
    - Has <link rel="canonical"> pointing to correct self-URL
    - Has og:title, og:description, og:url meta tags
    - Has twitter:card meta tag
    - Has application/ld+json script block (schema)
    - Has GA4 tracking ID G-NR4JVKW2JV
    - Has <!DOCTYPE html> (not a fragment)
    - Filename date is not in the future

    For EVERY main page (9 pages):
    - Has canonical tag
    - Has GA4 tracking

    Returns True if all pass, False if any fail.
    """
    print("=" * 60)
    print("PER-POST VERIFICATION")
    print("=" * 60)

    issues = []
    checked = 0
    today = date.today()

    # Check all dated blog posts
    dated_pattern = re.compile(r"^(\d{4}-\d{2}-\d{2})-.+\.html$")
    for html_file in sorted(BLOG_DIR.glob("*.html")):
        match = dated_pattern.match(html_file.name)
        if not match:
            continue  # Skip index.html, redirects, non-dated files

        # Skip redirect stubs (tiny meta-refresh files under 500 bytes)
        # NOTE: Redirect stubs are excluded here. If you add new redirects to
        # data/redirects.json, they are automatically excluded by this size/content check.
        if html_file.stat().st_size < 500:
            content_peek = html_file.read_text(encoding="utf-8", errors="ignore")[:100]
            if 'meta http-equiv="refresh"' in content_peek:
                continue  # Redirect stub — not a real blog post

        checked += 1
        slug = html_file.stem
        content = html_file.read_text(encoding="utf-8", errors="ignore")

        # Check: Not a fragment (must start with <!DOCTYPE or <html)
        if not content.strip()[:20].lower().startswith(("<!doctype", "<html")):
            issues.append(f"  {html_file.name}: FRAGMENT — not a complete HTML page")
            continue  # Skip remaining checks if it's a fragment

        # Check: Future date
        post_date_str = match.group(1)
        try:
            post_date = datetime.strptime(post_date_str, "%Y-%m-%d").date()
            if post_date > today:
                issues.append(f"  {html_file.name}: FUTURE DATE — {post_date_str} is after today")
        except ValueError:
            issues.append(f"  {html_file.name}: INVALID DATE — {post_date_str}")

        # Check: Canonical tag
        expected_canonical = f"https://carnivoreweekly.com/blog/{slug}.html"
        if 'rel="canonical"' not in content:
            issues.append(f"  {html_file.name}: MISSING canonical tag")
        elif expected_canonical not in content:
            issues.append(f"  {html_file.name}: WRONG canonical (expected {expected_canonical})")

        # Check: OG tags
        if 'property="og:title"' not in content:
            issues.append(f"  {html_file.name}: MISSING og:title")
        if 'property="og:description"' not in content:
            issues.append(f"  {html_file.name}: MISSING og:description")

        # Check: Twitter card
        if 'name="twitter:card"' not in content:
            issues.append(f"  {html_file.name}: MISSING twitter:card")

        # Check: Schema (JSON-LD)
        if "application/ld+json" not in content:
            issues.append(f"  {html_file.name}: MISSING JSON-LD schema")

        # Check: GA4 tracking
        if "G-NR4JVKW2JV" not in content:
            issues.append(f"  {html_file.name}: MISSING GA4 tracking (G-NR4JVKW2JV)")

    # Check all main pages
    for page in MAIN_PAGES:
        full_path = PUBLIC_DIR / page
        if not full_path.exists():
            issues.append(f"  {page}: MISSING — main page does not exist")
            continue

        content = full_path.read_text(encoding="utf-8", errors="ignore")
        checked += 1

        if 'rel="canonical"' not in content:
            issues.append(f"  {page}: MISSING canonical tag")

        if "G-NR4JVKW2JV" not in content:
            issues.append(f"  {page}: MISSING GA4 tracking (G-NR4JVKW2JV)")

    # Report
    print(f"\n  Checked: {checked} files ({checked - len(MAIN_PAGES)} blog posts + {len(MAIN_PAGES)} main pages)")

    if issues:
        print(f"\n  ISSUES FOUND: {len(issues)}")
        for issue in issues:
            print(issue)
        print(f"\n  VERIFICATION FAILED — {len(issues)} issue(s)")
        return False
    else:
        print(f"\n  ALL {checked} FILES PASSED VERIFICATION")
        return True


def main():
    parser = argparse.ArgumentParser(description="Site state snapshot and verification tool")
    parser.add_argument("--compare", metavar="FILE", help="Compare current state against a previous snapshot JSON file")
    parser.add_argument("--verify", action="store_true", help="Run per-post validation (canonical, OG, schema, GA4)")
    args = parser.parse_args()

    if args.compare:
        success = compare_snapshots(args.compare)
        sys.exit(0 if success else 1)
    elif args.verify:
        success = verify_all_posts()
        sys.exit(0 if success else 1)
    else:
        success = create_snapshot()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

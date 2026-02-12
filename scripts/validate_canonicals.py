#!/usr/bin/env python3
"""
Canonical URL Validation Script
CI gate to prevent canonical tag regressions.

Usage:
    python3 scripts/validate_canonicals.py

Exit codes:
    0 = all canonical tags valid
    1 = one or more validation failures
"""

import os
import re
import sys
from pathlib import Path

SITE_ORIGIN = "https://carnivoreweekly.com"
PUBLIC_DIR = Path("public")

# Intentional canonical overrides: file path (relative to public/) -> expected canonical URL
# Add entries here when a page intentionally points its canonical elsewhere.
WHITELIST = {
    "index.html": f"{SITE_ORIGIN}/",
    # Intentional canonical overrides (sub-components pointing to main page)
    "assets/calculator2/index.html": f"{SITE_ORIGIN}/calculator.html",
    "archive/index.html": f"{SITE_ORIGIN}/archive.html",
    "channels/index.html": f"{SITE_ORIGIN}/channels.html",
}

CANONICAL_RE = re.compile(
    r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
CANONICAL_RE_ALT = re.compile(
    r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']',
    re.IGNORECASE,
)


# Paths to exclude from validation (partials, components, error pages)
EXCLUDED_PREFIXES = (
    "components/",
    "includes/",
)
EXCLUDED_FILES = {
    "404.html",
}


def is_standalone_html(html: str) -> bool:
    """Check if HTML file is a full standalone page (has <head> tag)."""
    return bool(re.search(r'<head[\s>]', html, re.IGNORECASE))


def is_excluded(rel_path: str) -> bool:
    """Check if a file should be excluded from canonical validation."""
    if rel_path in EXCLUDED_FILES:
        return True
    if rel_path.startswith(EXCLUDED_PREFIXES):
        return True
    return False


def find_canonicals(html: str) -> list[str]:
    """Extract all canonical URLs from an HTML document."""
    found = CANONICAL_RE.findall(html)
    found += CANONICAL_RE_ALT.findall(html)
    # Deduplicate while preserving order (same tag matched by both patterns)
    seen = set()
    unique = []
    for url in found:
        if url not in seen:
            seen.add(url)
            unique.append(url)
    return unique


def expected_canonical(rel_path: str) -> str:
    """
    Derive the expected canonical URL from a file's path relative to public/.

    Mapping:
      index.html                -> https://carnivoreweekly.com/
      blog/slug.html            -> https://carnivoreweekly.com/blog/slug.html
      archive/date.html         -> https://carnivoreweekly.com/archive/date.html
      calculator.html           -> https://carnivoreweekly.com/calculator.html
      X/index.html              -> https://carnivoreweekly.com/X/
      anything.html             -> https://carnivoreweekly.com/anything.html
    """
    if rel_path == "index.html":
        return f"{SITE_ORIGIN}/"

    # Directory index files: X/index.html -> /X/
    if rel_path.endswith("/index.html"):
        dir_path = rel_path[: -len("index.html")]
        return f"{SITE_ORIGIN}/{dir_path}"

    # Everything else keeps its path
    return f"{SITE_ORIGIN}/{rel_path}"


def classify_page(rel_path: str) -> str:
    """Return a page type string for rule enforcement."""
    if rel_path.startswith("blog/"):
        return "blog"
    if rel_path.startswith("archive/"):
        return "archive"
    if rel_path == "index.html":
        return "homepage"
    return "other"


def validate_file(filepath: Path, rel_path: str) -> list[str]:
    """
    Validate canonical tags for a single HTML file.
    Returns a list of error messages (empty = pass).
    """
    errors = []

    try:
        html = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        errors.append(f"{rel_path}: Could not read file: {e}")
        return errors

    canonicals = find_canonicals(html)
    page_type = classify_page(rel_path)

    # --- Check 1: Exactly one canonical tag ---
    if len(canonicals) == 0:
        errors.append(f"{rel_path}: MISSING canonical tag (no <link rel=\"canonical\"> found)")
        return errors  # Can't do further checks without a canonical

    if len(canonicals) > 1:
        errors.append(
            f"{rel_path}: DUPLICATE canonical tags ({len(canonicals)} found): "
            + ", ".join(canonicals)
        )
        # Continue checking the first one for additional issues

    canonical_url = canonicals[0]

    # --- Check 2: Canonical matches expected path ---
    if rel_path in WHITELIST:
        want = WHITELIST[rel_path]
    else:
        want = expected_canonical(rel_path)

    if canonical_url != want:
        errors.append(
            f"{rel_path}: WRONG canonical URL\n"
            f"    expected: {want}\n"
            f"    actual:   {canonical_url}"
        )

    # --- Check 3: Non-blog page must not have /blog/ canonical ---
    if page_type != "blog" and "/blog/" in canonical_url:
        errors.append(
            f"{rel_path}: Non-blog page has /blog/ canonical: {canonical_url}"
        )

    # --- Check 4: Archive page must not canonicalize to homepage ---
    if page_type == "archive" and canonical_url.rstrip("/") == SITE_ORIGIN:
        errors.append(
            f"{rel_path}: Archive page canonicalizes to homepage: {canonical_url}"
        )

    return errors


def main() -> int:
    if not PUBLIC_DIR.is_dir():
        print(f"ERROR: {PUBLIC_DIR} directory not found. Run from project root.")
        return 1

    html_files = sorted(PUBLIC_DIR.rglob("*.html"))

    if not html_files:
        print(f"WARNING: No .html files found in {PUBLIC_DIR}/")
        return 0

    all_errors: list[str] = []
    checked = 0

    skipped = 0

    for filepath in html_files:
        rel_path = str(filepath.relative_to(PUBLIC_DIR))
        # Normalize to forward slashes on Windows
        rel_path = rel_path.replace("\\", "/")

        # Skip excluded paths (components, includes, error pages)
        if is_excluded(rel_path):
            skipped += 1
            continue

        # Skip content fragments (no <head> tag = not a standalone page)
        try:
            html_content = filepath.read_text(encoding="utf-8", errors="replace")
        except Exception:
            html_content = ""
        if not is_standalone_html(html_content):
            skipped += 1
            continue

        file_errors = validate_file(filepath, rel_path)
        all_errors.extend(file_errors)
        checked += 1

    # --- Report ---
    print(f"Canonical validation: checked {checked} HTML files, skipped {skipped} (partials/components/fragments)")
    print()

    if all_errors:
        print(f"FAILED: {len(all_errors)} issue(s) found:\n")
        for err in all_errors:
            print(f"  {err}")
        print()
        print("Fix canonical tags before deploying.")
        return 1

    print("PASSED: All canonical tags are valid.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
generate_redirects.py — Creates HTML redirect files for old URLs.

Pipeline Lockdown Phase 5: GitHub Pages ignores .htaccess, so we generate
minimal HTML files at old URL paths with meta-refresh + canonical pointing
to the correct destination. This recovers 17 dead redirect rules.

USAGE:
    python3 scripts/generate_redirects.py
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
REDIRECTS_FILE = PROJECT_ROOT / "data" / "redirects.json"
SITE_URL = "https://carnivoreweekly.com"

REDIRECT_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url={destination}">
    <link rel="canonical" href="{canonical_url}">
    <title>Redirecting...</title>
</head>
<body>
    <p>This page has moved. <a href="{destination}">Click here</a> if not redirected.</p>
</body>
</html>"""


def generate_redirects():
    if not REDIRECTS_FILE.exists():
        print("ERROR: data/redirects.json not found")
        return 0

    data = json.loads(REDIRECTS_FILE.read_text())
    redirects = data.get("redirects", [])
    created = 0

    for rule in redirects:
        source = rule["from"]
        destination = rule["to"]

        # Build canonical URL for the destination
        if destination.startswith("http"):
            canonical_url = destination
        else:
            canonical_url = f"{SITE_URL}{destination}"

        # Create the redirect HTML file at the source path
        output_path = PUBLIC_DIR / source
        output_path.parent.mkdir(parents=True, exist_ok=True)

        html = REDIRECT_TEMPLATE.format(
            destination=destination,
            canonical_url=canonical_url
        )

        output_path.write_text(html, encoding="utf-8")
        created += 1

    print(f"  Generated {created} redirect files from {len(redirects)} rules")
    return created


if __name__ == "__main__":
    print("=" * 60)
    print("GENERATING REDIRECT FILES")
    print("=" * 60)
    count = generate_redirects()
    if count > 0:
        print(f"\n  Done — {count} redirect HTML files created in public/")
    else:
        print("\n  No redirects generated")

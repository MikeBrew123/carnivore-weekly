#!/usr/bin/env python3
"""
Publish the latest Carnivore Weekly newsletter to Beehiiv.

Reads:  newsletters/latest.html  (or newsletters/{date}.html)
        data/newsletter_content.json  (for subject line / title)

NOTE: The Beehiiv Create Post API requires the Enterprise plan.
On the free Launch plan, use --copy to get clipboard-ready HTML to paste
into the Beehiiv editor manually.

Usage:
    python3 scripts/publish_to_beehiiv.py --copy               # Strip footer + copy HTML to clipboard (free plan)
    python3 scripts/publish_to_beehiiv.py --date 2026-03-21 --copy  # Specific issue
    python3 scripts/publish_to_beehiiv.py --publish            # API send (Enterprise plan only)
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

import beehiiv_client  # noqa: E402


def copy_to_clipboard(text: str) -> bool:
    """Copy text to macOS clipboard. Returns True on success."""
    try:
        subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish newsletter to Beehiiv")
    parser.add_argument(
        "--date",
        help="Load newsletters/{date}.html instead of latest.html (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--copy",
        action="store_true",
        help="Strip footer and copy clean HTML to clipboard for manual paste into Beehiiv editor (free plan workflow).",
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Push via API (Enterprise plan only). Will 403 on free/Scale plans.",
    )
    args = parser.parse_args()

    # ── Load HTML ─────────────────────────────────────────────────────────────
    if args.date:
        html_path = PROJECT_ROOT / "newsletters" / f"{args.date}.html"
    else:
        html_path = PROJECT_ROOT / "newsletters" / "latest.html"

    if not html_path.exists():
        print(f"Error: {html_path} not found.")
        print("Run scripts/generate_newsletter.py first.")
        sys.exit(1)

    html = html_path.read_text(encoding="utf-8")
    print(f"Loaded {html_path.name}  ({len(html):,} bytes)")

    # ── Load title / subject from newsletter_content.json ─────────────────────
    content_path = PROJECT_ROOT / "data" / "newsletter_content.json"
    title = "Your Weekly Carnivore Briefing"

    if content_path.exists():
        content = json.loads(content_path.read_text())
        subject = content.get("subject_line", "").strip()
        if subject:
            title = subject
        date_str = content.get("date", "")
        subtitle = f"Week of {date_str}" if date_str else "Carnivore Weekly"
    else:
        subtitle = "Carnivore Weekly"

    # ── --copy: free plan manual workflow ─────────────────────────────────────
    if args.copy:
        print("Extracting body content and stripping footer...")
        # Extract only what's inside <body>...</body> — Beehiiv doesn't want
        # the full document (<html>, <head>, <style> blocks). Just the body content.
        body_match = re.search(r'<body[^>]*>([\s\S]*)</body>', html, re.IGNORECASE)
        body_html = body_match.group(1).strip() if body_match else html
        clean_html = beehiiv_client.strip_footer(body_html)
        print(f"Clean HTML: {len(clean_html):,} bytes (removed {len(html) - len(clean_html):,} bytes from full doc)")

        copied = copy_to_clipboard(clean_html)
        if copied:
            print("\n✅ HTML copied to clipboard")
        else:
            out_path = PROJECT_ROOT / "newsletters" / "beehiiv-ready.html"
            out_path.write_text(clean_html, encoding="utf-8")
            print(f"\n✅ Saved to {out_path} (pbcopy not available)")

        print(f"\nSubject line: {title}")
        print(f"Subtitle:     {subtitle}")
        print("\nNext steps:")
        print("  1. Beehiiv dashboard → Posts → New Post → 'Write with HTML'")
        print("  2. Paste the clipboard contents")
        print(f"  3. Set subject: {title}")
        print("  4. Preview, send test, then publish")
        return

    # ── --publish: Enterprise plan API workflow ────────────────────────────────
    print(f"Title:    {title}")
    print(f"Subtitle: {subtitle}")
    print("Stripping local footer...")

    try:
        result = beehiiv_client.create_post(
            title=title,
            html=html,
            subtitle=subtitle,
            status="confirmed" if args.publish else "draft",
            preview_text=title,
        )
    except Exception as e:
        print(f"\n❌ Beehiiv API error: {e}")
        print("\nNote: The Create Post API requires the Enterprise plan.")
        print("On the free Launch plan, use --copy instead.")
        sys.exit(1)

    post = result.get("data", result)
    post_id = post.get("id", "unknown")
    web_url = post.get("web_url") or post.get("url", "")

    print(f"\n✅ Post created — ID: {post_id}")
    if web_url:
        print(f"   URL: {web_url}")


if __name__ == "__main__":
    main()

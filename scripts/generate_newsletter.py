#!/usr/bin/env python3
"""
Weekly Newsletter Renderer for Carnivore Weekly

Loads pre-written editorial content from data/newsletter_content.json
and combines it with YouTube data to render the newsletter template.

Content is written by Claude Code using writer personas during the weekly
content session — this script just assembles and renders.

Usage:
    python3 scripts/generate_newsletter.py
    python3 scripts/generate_newsletter.py --date 2026-02-16

Output:
    newsletters/{date}.html
    public/newsletter-preview.html (browser-viewable copy)

Content file format (data/newsletter_content.json):
    {
        "date": "2026-02-16",
        "subject_line": "...",           # for email service, NOT displayed in template
        "opening": "<p>...</p>",         # Chloe
        "by_the_numbers": "...",         # Marcus — inline HTML
        "whats_trending": "<p>...</p>",  # Chloe
        "community_pulse": "<p>...</p>", # Sarah
        "looking_ahead": "<p>...</p>",   # Marcus
        "blog_teasers": [
            {"slug": "...", "title": "...", "writer": "...", "teaser": "..."},
            ...
        ]
    }
"""

import json
import sys
import argparse
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent

try:
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    print("Error: pip3 install jinja2")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Data loaders
# ---------------------------------------------------------------------------

def load_config():
    """Load project config for newsletter settings."""
    config_path = PROJECT_ROOT / "config" / "project.json"
    with open(config_path) as f:
        return json.load(f)


def load_newsletter_content():
    """Load pre-written editorial content from data/newsletter_content.json."""
    content_path = PROJECT_ROOT / "data" / "newsletter_content.json"
    if not content_path.exists():
        print(f"Error: {content_path} not found.")
        print("Generate content first during the weekly content session.")
        return None
    return json.loads(content_path.read_text())


def load_featured_videos(limit=2):
    """Load top YouTube videos from youtube_data.json, mapped to template slots."""
    yt_path = PROJECT_ROOT / "data" / "youtube_data.json"
    if not yt_path.exists():
        return {}

    data = json.loads(yt_path.read_text())

    # Collect all videos across creators, sort by views
    all_videos = []
    for creator in data.get("top_creators", []):
        for video in creator.get("videos", []):
            all_videos.append({
                "url": f"https://youtube.com/watch?v={video['video_id']}",
                "thumbnail": video.get("thumbnail_url",
                    f"https://i.ytimg.com/vi/{video['video_id']}/mqdefault.jpg"),
                "title": video.get("title", ""),
                "creator": creator.get("channel_name", "Unknown"),
                "views": f"{video.get('statistics', {}).get('view_count', 0):,}",
                "date": _format_yt_date(video.get("published_at", "")),
            })

    all_videos.sort(key=lambda v: int(v["views"].replace(",", "")), reverse=True)
    featured = all_videos[:limit]

    # Map to featured_video_1 ... featured_video_N
    result = {}
    for i, video in enumerate(featured, 1):
        result[f"featured_video_{i}"] = video

    return result


def _format_yt_date(iso_str):
    """Format ISO date to readable format."""
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y")
    except (ValueError, TypeError):
        return iso_str[:10]


def _with_utm(url, campaign):
    """Append CW newsletter UTMs, respecting any existing query string."""
    if not url:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}utm_source=cw_newsletter&utm_medium=email&utm_campaign={campaign}"


def load_affiliate_and_product(date_str=None):
    """Pick this week's affiliate (rotate active ones by ISO week) + the product
    feature, from data/newsletter_affiliates.json. Returns (affiliate|None,
    product_feature|None) with UTM-tagged URLs. Inactive/missing → None so the
    template section simply doesn't render."""
    cfg_path = PROJECT_ROOT / "data" / "newsletter_affiliates.json"
    if not cfg_path.exists():
        return None, None
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  ⚠ newsletter_affiliates.json unreadable: {e}")
        return None, None

    active = [a for a in cfg.get("affiliates", []) if a.get("active") and a.get("url")]
    affiliate = None
    if active:
        try:
            week = datetime.strptime(date_str, "%Y-%m-%d").isocalendar()[1] if date_str else datetime.now().isocalendar()[1]
        except Exception:
            week = datetime.now().isocalendar()[1]
        chosen = dict(active[week % len(active)])
        chosen["url"] = _with_utm(chosen["url"], f"affiliate_{chosen.get('key','x')}")
        affiliate = chosen
        print(f"  ✓ Affiliate slot: {chosen.get('name')} (week {week})")

    pf = cfg.get("product_feature")
    product_feature = None
    if pf and pf.get("active") and pf.get("url"):
        product_feature = dict(pf)
        product_feature["url"] = _with_utm(product_feature["url"], "starter_kit")
        print(f"  ✓ Product feature: on")

    return affiliate, product_feature


# ---------------------------------------------------------------------------
# Main renderer
# ---------------------------------------------------------------------------

def generate_newsletter(date_str=None):
    """Render the weekly newsletter from pre-written content + data."""

    # Load editorial content
    content = load_newsletter_content()
    if not content:
        return False

    # Use date from content file or override
    if not date_str:
        date_str = content.get("date", datetime.now().strftime("%Y-%m-%d"))

    # Format display date
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    display_date = dt.strftime("%B %d, %Y")

    print(f"\n{'='*60}")
    print(f"\U0001f4e7 NEWSLETTER RENDERER \u2014 Week of {display_date}")
    print(f"{'='*60}\n")

    # Load data
    print("\U0001f4ca Loading data...")
    featured_videos = load_featured_videos(limit=2)
    print(f"  \u2713 {len(featured_videos)} featured videos")

    # New structure: hero + supporting + try_this_week
    hero = content.get("hero")
    supporting = content.get("supporting", [])
    # Legacy fallback: if old blog_teasers format, convert
    if not hero and content.get("blog_teasers"):
        teasers = content["blog_teasers"]
        hero = teasers[0] if teasers else None
        if hero and "cta" not in hero:
            hero["cta"] = "Read the full story"
        supporting = teasers[1:4] if len(teasers) > 1 else []

    hero_label = f"Hero: {hero['title'][:40]}..." if hero else "No hero"
    print(f"  \u2713 {hero_label}")
    print(f"  \u2713 {len(supporting)} supporting links")

    editorial_sections = {
        "subject_line": content.get("subject_line", "This Week in Carnivore"),
        "opening": content.get("opening", ""),
        "try_this_week": content.get("try_this_week", ""),
        "looking_ahead": content.get("looking_ahead", ""),
    }

    # Affiliate slot (rotates active affiliates by ISO week) + product feature.
    # Config is committed in data/newsletter_affiliates.json so the automated
    # send needs no secrets. URLs there are clean; UTMs are appended here.
    affiliate, product_feature = load_affiliate_and_product(date_str)

    template_vars = {
        "date": display_date,
        "unsubscribe_link": "{{unsubscribe_url}}",
        **featured_videos,
        **editorial_sections,
        "hero": hero,
        "supporting": supporting,
        "community_pulse": content.get("community_pulse", []),
        "affiliate": affiliate,
        "product_feature": product_feature,
    }

    # Load and render template
    print("\n\U0001f3a8 Rendering template...")
    templates_dir = PROJECT_ROOT / "templates"
    env = Environment(loader=FileSystemLoader(templates_dir))
    template = env.get_template("newsletter_template.html")
    html_output = template.render(**template_vars)
    print(f"  \u2713 Rendered ({len(html_output):,} bytes)")

    # Write outputs
    print("\n\U0001f4be Writing output files...")

    # newsletters/{date}.html
    newsletters_dir = PROJECT_ROOT / "newsletters"
    newsletters_dir.mkdir(parents=True, exist_ok=True)
    newsletter_path = newsletters_dir / f"{date_str}.html"
    newsletter_path.write_text(html_output, encoding="utf-8")
    print(f"  \u2713 {newsletter_path}")

    # public/newsletter-preview.html (sanitized for public web)
    preview_path = PROJECT_ROOT / "public" / "newsletter-preview.html"
    preview_html = html_output.replace("{{unsubscribe_url}}", "#")
    preview_html = preview_html.replace(
        '<meta http-equiv="X-UA-Compatible" content="IE=edge">',
        '<meta http-equiv="X-UA-Compatible" content="IE=edge">\n    <meta name="robots" content="noindex, nofollow">',
    )
    preview_path.write_text(preview_html, encoding="utf-8")
    print(f"  \u2713 {preview_path} (sanitized)")

    # Summary
    print(f"\n{'='*60}")
    print(f"\u2705 NEWSLETTER RENDERED")
    print(f"{'='*60}")
    print(f"  Subject (email only): {editorial_sections['subject_line']}")
    print(f"  Date: {display_date}")
    print(f"  Hero: {hero['title'][:50] if hero else 'None'}")
    print(f"  Supporting links: {len(supporting)}")
    print(f"  Featured videos: {len(featured_videos)}")

    # Sections that render in template (exclude subject_line)
    rendered_sections = {k: v for k, v in editorial_sections.items() if k != "subject_line"}
    print(f"\n  Section word counts:")
    for name, text in rendered_sections.items():
        wc = len(text.split())
        print(f"    {name:20s} \u2192 {wc:3d} words")

    total_words = sum(len(s.split()) for s in rendered_sections.values())
    print(f"    {'TOTAL':20s} \u2192 {total_words:3d} words")

    empty = [n for n, c in rendered_sections.items() if not c.strip()]
    if empty:
        print(f"\n  \u26a0 Empty sections: {', '.join(empty)}")
    else:
        print(f"\n  \u2713 All sections have content")

    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Render Carnivore Weekly newsletter from pre-written content"
    )
    parser.add_argument("--date", help="Newsletter date (YYYY-MM-DD)", default=None)
    args = parser.parse_args()

    success = generate_newsletter(date_str=args.date)
    sys.exit(0 if success else 1)

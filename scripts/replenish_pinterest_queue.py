#!/usr/bin/env python3
"""Auto-replenish the KetoDial Pinterest pin queue.

The daily poster (scheduled task `pinterest-kd-daily-pins`) drains the queue
(ketodial/marketing/pinterest-pin-queue.json) and self-disables when empty.
This tops the queue back up from KD blog posts that don't yet have a pin, so the
poster stays supplied. Blog posts are the renewable supply (~6 new/week), and
each pin drives Pinterest -> post -> the in-prose calculator CTAs on those posts.

It reuses each post's already-writer-crafted og:title + description + og:image
(no new un-reviewed copy), builds a UTM-tagged pinterest create-button URL, and
appends entries with posted=null so the poster picks them up.

Usage:
  python3 scripts/replenish_pinterest_queue.py [--max N] [--min-buffer M] [--dry-run]

Only adds when unposted pins fall below --min-buffer (default 12), and adds at
most --max per run (default 10). Exit 0 always; prints what it did.
"""
import argparse
import glob
import json
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "ketodial/marketing/pinterest-pin-queue.json")
BLOG_DIR = os.path.join(ROOT, "ketodial/public/blog")
FALLBACK_IMG = "https://ketodial.com/images/og-image.jpg"

# non-evergreen / meta posts that don't belong on Pinterest boards
SKIP_PATTERNS = ("announcement", "why-we-built", "changelog", "release-notes", "coach-announcement")


def _meta(html, prop=None, name=None):
    if prop:
        m = re.search(r'<meta property="%s" content="([^"]*)"' % re.escape(prop), html)
    else:
        m = re.search(r'<meta name="%s" content="([^"]*)"' % re.escape(name), html)
    return m.group(1).strip() if m else ""


def _clean(text):
    # strip the "-- KetoDial" / "- KetoDial" title suffix and any em-dashes
    text = re.sub(r"\s*[-–—]+\s*KetoDial\s*$", "", text)
    text = text.replace("—", ", ").replace(" -- ", ", ")
    return text.strip()


def board_for(slug, title):
    t = (slug + " " + title).lower()
    if any(k in t for k in ["dessert", "sweet", "fat bomb", "cheesecake", "brownie", "cookie", "chocolate"]):
        return "Low Carb Desserts"
    if any(k in t for k in ["breakfast", "pancake", "egg cup"]):
        return "Keto Breakfast Recipes"
    if "snack" in t:
        return "Keto Snacks"
    if "dinner" in t:
        return "Keto Dinner Ideas"
    return "Keto Meal Prep"  # catch-all for planning + educational posts


def build_pin(slug, title, desc, image):
    dest = (
        "https://ketodial.com/blog/%s.html"
        "?utm_source=pinterest&utm_medium=social&utm_campaign=%s" % (slug, slug)
    )
    # Prefer the 2:3 vertical pin (scripts/generate_pinterest_pins.py) over the
    # landscape og:image — vertical is the single biggest Pinterest ranking lever.
    pin_img = os.path.join(ROOT, "ketodial/public/images/blog/pins/%s-pin.jpg" % slug)
    media = ("https://ketodial.com/images/blog/pins/%s-pin.jpg" % slug
             if os.path.exists(pin_img) else (image or FALLBACK_IMG))
    d = _clean(desc)
    if "ketodial.com" not in d.lower():
        d = (d + " Read more at ketodial.com").strip()
    d = d[:480]
    pin_url = (
        "https://www.pinterest.com/pin/create/button/?url="
        + urllib.parse.quote(dest, safe="")
        + "&media="
        + urllib.parse.quote(media, safe="")
        + "&description="
        + urllib.parse.quote(d, safe="")
    )
    return {"slug": slug, "title": _clean(title)[:100], "pin_url": pin_url,
            "board": board_for(slug, title), "posted": None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=10, help="max pins to add per run")
    ap.add_argument("--min-buffer", type=int, default=12,
                    help="only replenish when unposted pins fall below this")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(QUEUE, encoding="utf-8") as fh:
        data = json.load(fh)
    pins = data["pins"]
    have = {p["slug"] for p in pins}
    unposted = sum(1 for p in pins if p.get("posted") is None)

    if unposted >= args.min_buffer:
        print("queue healthy: %d unposted >= buffer %d; nothing to add" % (unposted, args.min_buffer))
        return 0

    # uncovered blog posts, newest first (filenames are date-prefixed)
    files = sorted(glob.glob(os.path.join(BLOG_DIR, "*.html")), reverse=True)
    added = []
    for f in files:
        slug = os.path.basename(f)[:-5]
        if slug == "index" or slug in have:
            continue
        if any(pat in slug for pat in SKIP_PATTERNS):
            continue
        with open(f, encoding="utf-8") as fh:
            html = fh.read()
        title = _meta(html, prop="og:title")
        if not title:
            m = re.search(r"<title>([^<]*)</title>", html)
            title = m.group(1) if m else ""
        desc = _meta(html, prop="og:description") or _meta(html, name="description")
        img = _meta(html, prop="og:image")
        if not _clean(title) or not desc:
            continue
        added.append(build_pin(slug, title, desc, img))
        have.add(slug)
        if len(added) >= args.max:
            break

    if not added:
        print("no uncovered blog posts to add (supply exhausted until new posts publish)")
        return 0

    if args.dry_run:
        print("[dry-run] would add %d pins:" % len(added))
        for p in added:
            print("  %-38s -> %s" % (p["slug"], p["board"]))
        return 0

    data["pins"].extend(added)
    with open(QUEUE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    now_unposted = sum(1 for p in data["pins"] if p.get("posted") is None)
    print("added %d pins; queue now %d total, %d unposted" % (len(added), len(data["pins"]), now_unposted))
    return 0


if __name__ == "__main__":
    sys.exit(main())

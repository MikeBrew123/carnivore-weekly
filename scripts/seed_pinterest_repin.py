#!/usr/bin/env python3
"""One-time: seed the Pinterest queue with fresh 2:3 vertical pins.

We migrated from landscape og:image pins to purpose-built 1000x1500 pins
(scripts/generate_pinterest_pins.py). A brand-new pin design for an existing
URL is exactly the "fresh pin" the 2026 algorithm rewards, so re-pinning every
recipe + blog post with its new vertical design is desirable, not spam.

This appends one posted=null entry per recipe/blog pin that exists on disk and
doesn't already have an unposted vertical entry queued. The daily poster then
works through them at 10/day. Idempotent: safe to re-run.

Usage: python3 scripts/seed_pinterest_repin.py [--dry-run]
"""
import argparse
import glob
import json
import os
import re
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE = os.path.join(ROOT, "ketodial/marketing/pinterest-pin-queue.json")
RECIPE_DIR = os.path.join(ROOT, "ketodial/public/recipes")
BLOG_DIR = os.path.join(ROOT, "ketodial/public/blog")
RECIPE_PIN_DIR = os.path.join(ROOT, "ketodial/public/images/recipes/pins")
BLOG_PIN_DIR = os.path.join(ROOT, "ketodial/public/images/blog/pins")


def _meta(html, prop=None, name=None):
    pat = (r'<meta property="%s" content="([^"]*)"' % re.escape(prop) if prop
           else r'<meta name="%s" content="([^"]*)"' % re.escape(name))
    m = re.search(pat, html)
    return m.group(1).strip() if m else ""


def _clean(text):
    text = re.sub(r"\s*[-–—]+\s*KetoDial\s*$", "", text)
    return text.replace("—", ", ").replace(" -- ", ", ").strip()


def board_for(slug, title):
    t = (slug + " " + title).lower()
    if any(k in t for k in ["dessert", "sweet", "fat bomb", "cheesecake", "brownie",
                            "cookie", "chocolate", "mousse", "creme", "cupcake"]):
        return "Low Carb Desserts"
    if any(k in t for k in ["breakfast", "pancake", "egg cup", "chaffle", "muffin",
                            "granola", "french toast", "overnight oats", "frittata"]):
        return "Keto Breakfast Recipes"
    if any(k in t for k in ["snack", "cracker", "crisp", "chip", "popper", "dip",
                            "deviled", "pork rind", "trail mix", "energy ball"]):
        return "Keto Snacks"
    if any(k in t for k in ["dinner", "chicken", "steak", "soup", "stew", "casserole",
                            "taco", "salisbury", "parmesan", "lasagna", "beef"]):
        return "Keto Dinner Ideas"
    return "Keto Meal Prep"


def entry(slug, kind, pin_media_url):
    if kind == "recipe":
        html = open(os.path.join(RECIPE_DIR, slug + ".html"), encoding="utf-8").read()
        dest = "https://ketodial.com/recipes/%s.html" % slug
    else:
        html = open(os.path.join(BLOG_DIR, slug + ".html"), encoding="utf-8").read()
        dest = "https://ketodial.com/blog/%s.html" % slug
    title = _clean(_meta(html, prop="og:title") or slug.replace("-", " ").title())
    desc = _clean(_meta(html, prop="og:description") or _meta(html, name="description"))
    if "ketodial.com" not in desc.lower():
        desc = (desc + " Read more at ketodial.com").strip()
    desc = desc[:480]
    dest_utm = dest + "?utm_source=pinterest&utm_medium=social&utm_campaign=%s" % slug
    pin_url = ("https://www.pinterest.com/pin/create/button/?url="
               + urllib.parse.quote(dest_utm, safe="")
               + "&media=" + urllib.parse.quote(pin_media_url, safe="")
               + "&description=" + urllib.parse.quote(desc, safe=""))
    return {"slug": slug, "title": title[:100], "pin_url": pin_url,
            "board": board_for(slug, title), "variant": "vertical-2x3", "posted": None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    data = json.load(open(QUEUE, encoding="utf-8"))
    pins = data["pins"]
    # Every (slug, board) combo already in the queue -- POSTED OR UNPOSTED.
    # Guarding on the combo (not just an unposted-slug set) is what keeps this
    # idempotent across posting: once the poster marks an entry posted, a
    # slug-only guard would drop it and re-seed a fresh posted=null duplicate of
    # an already-posted combo (this is what left 68 junk rows in the queue).
    def combo(p):
        return (p["slug"], p.get("board", "Keto Recipes"))
    have_combo = {combo(p) for p in pins}

    def maybe_add(slug, kind, media_url):
        if not os.path.exists(os.path.join(
                RECIPE_DIR if kind == "recipe" else BLOG_DIR, slug + ".html")):
            return
        e = entry(slug, kind, media_url)
        if combo(e) in have_combo:
            return
        added.append(e)
        have_combo.add(combo(e))

    added = []
    for f in sorted(glob.glob(os.path.join(RECIPE_PIN_DIR, "recipe-*-pin.jpg"))):
        slug = os.path.basename(f)[len("recipe-"):-len("-pin.jpg")]
        maybe_add(slug, "recipe",
                  "https://ketodial.com/images/recipes/pins/recipe-%s-pin.jpg" % slug)
    for f in sorted(glob.glob(os.path.join(BLOG_PIN_DIR, "*-pin.jpg"))):
        slug = os.path.basename(f)[:-len("-pin.jpg")]
        maybe_add(slug, "blog",
                  "https://ketodial.com/images/blog/pins/%s-pin.jpg" % slug)

    if args.dry_run:
        print("[dry-run] would add %d vertical-pin entries" % len(added))
        for p in added[:8]:
            print("  %-40s -> %s" % (p["slug"], p["board"]))
        return

    pins.extend(added)
    with open(QUEUE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    unposted = sum(1 for p in pins if p.get("posted") is None)
    print("added %d vertical entries; queue now %d total, %d unposted" %
          (len(added), len(pins), unposted))


if __name__ == "__main__":
    main()

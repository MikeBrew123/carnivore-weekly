#!/usr/bin/env python3
"""
generate_kd_blog.py -- Generate KetoDial blog post pages, update the blog
index feed-grid, and update the sitemap with new blog URLs.

Usage:
    python3 generate_kd_blog.py                # generate all
    python3 generate_kd_blog.py --only-new      # skip posts with existing HTML
    python3 generate_kd_blog.py --dry-run       # preview without writing files

Reads from: data/blog_posts.json (site == "kd", status == "published" or published == true)
Writes to:  ketodial/public/blog/{slug}.html
Updates:    ketodial/public/blog/index.html (feed-grid section)
            ketodial/public/sitemap.xml (new URLs only)
"""

import argparse
import json
import math
import os
import re
import sys
from datetime import datetime
from html import escape

# ---------------------------------------------------------------------------
# Paths (relative to repo root)
# ---------------------------------------------------------------------------
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
POSTS_JSON = os.path.join(REPO_ROOT, "data", "blog_posts.json")
BLOG_DIR = os.path.join(REPO_ROOT, "ketodial", "public", "blog")
INDEX_HTML = os.path.join(BLOG_DIR, "index.html")
SITEMAP_XML = os.path.join(REPO_ROOT, "ketodial", "public", "sitemap.xml")

# ---------------------------------------------------------------------------
# Author config
# ---------------------------------------------------------------------------
AUTHOR_MAP = {
    "sarah":  {"display": "Sarah",  "initial": "S", "avatar_class": "s", "title": "Health Coach"},
    "marcus": {"display": "Marcus", "initial": "M", "avatar_class": "m", "title": "Performance Coach"},
    "chloe":  {"display": "Chloe",  "initial": "C", "avatar_class": "c", "title": "Community & Lifestyle Writer"},
    "team":   {"display": "KetoDial Team", "initial": "K", "avatar_class": "s", "title": "KetoDial Team"},
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def strip_date_prefix(slug: str) -> str:
    """Remove YYYY-MM-DD- prefix from slug if present."""
    return re.sub(r"^\d{4}-\d{2}-\d{2}-", "", slug)


def reading_time(html_content: str) -> int:
    """Estimate reading time from HTML content. Minimum 3 minutes."""
    text = re.sub(r"<[^>]+>", "", html_content)
    words = len(text.split())
    return max(3, math.ceil(words / 230))


def format_date(date_str: str) -> str:
    """Format YYYY-MM-DD as 'June 15, 2026'."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return dt.strftime("%B %-d, %Y")
    except (ValueError, TypeError):
        return date_str or ""


def get_publish_date(post: dict) -> str:
    """Get the best available date string for a post."""
    return post.get("publish_date") or post.get("date") or post.get("scheduled_date") or ""


def get_meta_description(post: dict) -> str:
    """Extract meta description from post data."""
    if post.get("meta_description"):
        return post["meta_description"]
    seo = post.get("seo") or {}
    if seo.get("meta_description"):
        return seo["meta_description"]
    return post.get("excerpt", "")


def is_published(post: dict) -> bool:
    """Check if a post is published."""
    return (
        post.get("site") == "kd"
        and (post.get("status") == "published" or post.get("published") is True)
    )


def sanitize_emdash(text: str) -> str:
    """Replace em-dashes with double hyphens."""
    return text.replace("—", "--").replace("–", "--")


# ---------------------------------------------------------------------------
# JSON-LD schema for article pages
# ---------------------------------------------------------------------------

def build_json_ld(post: dict, kd_slug: str) -> str:
    """Build Article JSON-LD for a blog post."""
    author_info = AUTHOR_MAP.get(post.get("author", "team"), AUTHOR_MAP["team"])
    pub_date = get_publish_date(post)
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post["title"],
        "description": get_meta_description(post),
        "url": f"https://ketodial.com/blog/{kd_slug}.html",
        "datePublished": pub_date,
        "dateModified": pub_date,
        "author": {
            "@type": "Person",
            "name": author_info["display"]
        },
        "publisher": {
            "@type": "Organization",
            "name": "KetoDial",
            "url": "https://ketodial.com"
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"https://ketodial.com/blog/{kd_slug}.html"
        }
    }
    return json.dumps(schema, indent=2)


# ---------------------------------------------------------------------------
# Blog post HTML template
# ---------------------------------------------------------------------------

BLOG_POST_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} -- KetoDial</title>
<meta name="description" content="{meta_description}">
<link rel="canonical" href="https://ketodial.com/blog/{kd_slug}.html">
<meta property="og:type" content="article">
<meta property="og:url" content="https://ketodial.com/blog/{kd_slug}.html">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{meta_description}">
<meta property="og:site_name" content="KetoDial">
<meta property="og:image" content="https://ketodial.com{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{meta_description}">
<meta name="twitter:image" content="https://ketodial.com{og_image}">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:ital,opsz,wght@0,16..72,400;0,16..72,500;1,16..72,400&display=swap" rel="stylesheet" />
<!-- GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-0Y79FB48EG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-0Y79FB48EG');
</script>
<style>
:root{{
  --bg:#f1f5f9;--surface:#ffffff;--ink:#0f172a;--ink-soft:#475569;--ink-faint:#94a3b8;
  --line:#e2e8f0;--accent:#38bdf8;--accent-deep:#0ea5e9;
  --sans:"Hanken Grotesk",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace;--serif:"Newsreader",Georgia,serif;
}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:var(--sans);background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.6}}
a{{color:var(--accent-deep);text-decoration:none}}
a:hover{{text-decoration:underline}}

header.nav{{position:sticky;top:0;z-index:40;background:rgba(241,245,249,.82);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}}
.nav-inner{{display:flex;align-items:center;justify-content:space-between;height:70px;max-width:1180px;margin:0 auto;padding:0 28px}}
.brand{{display:flex;align-items:center;gap:11px;text-decoration:none}}
.brand .word{{font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--ink)}}
.brand .word b{{color:var(--accent-deep)}}
.nav-links{{display:flex;align-items:center;gap:30px}}
.nav-links a{{font-size:14.5px;font-weight:500;color:var(--ink-soft);text-decoration:none}}
.nav-links a:hover{{color:var(--ink)}}
@media(max-width:860px){{.nav-links{{display:none}}}}

.article{{max-width:720px;margin:0 auto;padding:48px 28px 80px}}
.article .eyebrow{{font-family:var(--mono);font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent-deep);font-weight:500;margin-bottom:12px}}
.article h1{{font-size:clamp(30px,5vw,42px);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:16px}}
.article .byline{{font-size:14px;color:var(--ink-faint);margin-bottom:32px;display:flex;align-items:center;gap:8px}}
.article .byline b{{color:var(--ink-soft);font-weight:600}}
.content{{font-family:var(--serif);font-size:18px;line-height:1.7;color:#334155}}
.content h2{{font-family:var(--sans);font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--ink);margin:36px 0 14px}}
.content p{{margin-bottom:16px}}
.content ul{{margin:8px 0 18px 24px}}
.content li{{margin-bottom:8px}}
.content strong{{color:var(--ink);font-weight:600}}
.content a{{color:var(--accent-deep);font-weight:500}}
.content blockquote{{border-left:3px solid var(--accent);padding:16px 20px;margin:24px 0;background:#f7fbfe;border-radius:0 10px 10px 0;font-size:15px;color:var(--ink-soft);font-style:normal}}
.content blockquote em{{font-style:italic}}

.cta-box{{background:var(--ink);color:#e2eef7;border-radius:16px;padding:28px 32px;margin:36px 0;text-align:center}}
.cta-box h3{{font-family:var(--sans);font-size:20px;font-weight:800;color:#fff;margin-bottom:8px}}
.cta-box p{{font-size:15px;color:#9fc0d6;margin-bottom:16px;font-family:var(--sans)}}
.cta-box a{{display:inline-block;background:var(--accent);color:#062234;font-family:var(--sans);font-weight:700;font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;transition:background .15s}}
.cta-box a:hover{{background:#7dd3fc;text-decoration:none}}

footer{{background:#0b1620;color:#9fb8c9;padding:40px 0 24px}}
.foot-inner{{max-width:1180px;margin:0 auto;padding:0 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}}
.foot-inner .disclaimer{{font-size:12px;color:#6b8aa0;max-width:640px;line-height:1.5}}
.foot-inner .copy{{font-family:var(--mono);font-size:11.5px;color:#5f8198}}
.skip-nav{{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;z-index:100}}.skip-nav:focus{{position:fixed;top:8px;left:8px;width:auto;height:auto;padding:12px 20px;background:var(--ink,#0f172a);color:#fff;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;z-index:9999}}
</style>
<script type="application/ld+json">
{json_ld}
</script>
<!-- Pinterest Tag -->
<script>
!function(e){{if(!window.pintrk){{window.pintrk=function(){{window.pintrk.queue.push(Array.prototype.slice.call(arguments))}};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}}}("https://s.pinimg.com/ct/core.js");
pintrk('load','2612943505341');
pintrk('page');
</script>
<noscript><img height="1" width="1" style="display:none;" alt="" src="https://ct.pinterest.com/v3/?event=init&tid=2612943505341&noscript=1" /></noscript>
<!-- end Pinterest Tag -->
</head>
<body>
<a href="#main-content" class="skip-nav">Skip to content</a>
<header class="nav">
  <div class="nav-inner">
    <a class="brand" href="/">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="19" fill="#0b1620"/>
        <path d="M9 25 A 12 12 0 1 1 31 25" stroke="#1e3a52" stroke-width="3" stroke-linecap="round"/>
        <path d="M9 25 A 12 12 0 0 1 18.5 8.4" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
        <line x1="20" y1="20" x2="26.5" y2="13.5" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="20" cy="20" r="3" fill="#e2eef7"/>
      </svg>
      <span class="word">Keto<b>Dial</b></span>
    </a>
    <nav class="nav-links">
      <a href="/#calc">Calculator</a>
      <a href="/#how">How it works</a>
      <a href="/#guides">Guides</a>
      <a href="/recipes/">Recipes</a>
      <a href="/">Home</a>
    </nav>
  </div>
</header>
<article class="article" id="main-content">
  <div class="eyebrow">{category}</div>
  <h1>{title}</h1>
  <div class="byline"><b>{author_display}</b> · {author_title} · {date_formatted}</div>
  <div class="content">
    {article_image}
    {content}
    <div class="cta-box">
      <h3>Ready to dial in your macros?</h3>
      <p>Free results in 90 seconds. No account needed.</p>
      <a href="/#calc">Try the calculator</a>
    </div>
  </div>
</article>
<footer>
  <div class="foot-inner">
    <p class="disclaimer">KetoDial provides general nutrition estimates for informational purposes only and is not medical advice. Consult a qualified healthcare provider before starting any diet.</p>
    <span class="copy">&copy; 2026 KetoDial</span>
  </div>
</footer>
<script src="/js/share-buttons.js" defer></script>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Card HTML for blog index feed-grid
# ---------------------------------------------------------------------------

CARD_TEMPLATE = """      <a class="pcard" href="/blog/{kd_slug}.html">
        {card_img}
        <div class="body">
          <span class="kicker {category_lower}">{category}</span>
          <h3>{title}</h3>
          <p>{excerpt}</p>
          <div class="byline">
            <span class="avatar {avatar_class}">{author_initial}</span>
            <b>{author_display}</b><span class="dotsep">&middot;</span><span>{read_time} min read</span>
          </div>
        </div>
      </a>"""


# ---------------------------------------------------------------------------
# Load and filter posts
# ---------------------------------------------------------------------------

def load_kd_posts() -> list:
    """Load published KD posts from blog_posts.json, sorted newest-first."""
    with open(POSTS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    posts = [p for p in data.get("blog_posts", []) if is_published(p)]

    # Sort newest-first by publish date
    posts.sort(key=lambda p: get_publish_date(p), reverse=True)
    return posts


# ---------------------------------------------------------------------------
# Generate individual blog post HTML
# ---------------------------------------------------------------------------

def generate_post_html(post: dict) -> str:
    """Render a blog post dict into a full HTML page string."""
    kd_slug = strip_date_prefix(post["slug"])
    author_info = AUTHOR_MAP.get(post.get("author", "team"), AUTHOR_MAP["team"])
    meta_desc = get_meta_description(post)
    content = post.get("content", "")
    pub_date = get_publish_date(post)

    json_ld = build_json_ld(post, kd_slug)

    image = post.get("image", "")
    if image:
        article_image = f'<img src="{escape(image)}" alt="{escape(post["title"])}" style="float:right;max-width:260px;margin:0 0 18px 24px;border-radius:12px" loading="lazy">'
    else:
        article_image = ""

    og_image = image if image else "/images/og-image.jpg"

    html = BLOG_POST_TEMPLATE.format(
        title=escape(post["title"]),
        meta_description=escape(meta_desc),
        kd_slug=kd_slug,
        category=escape(post.get("category", "Guide").title()),
        author_display=author_info["display"],
        author_title=post.get("author_title") or author_info["title"],
        date_formatted=format_date(pub_date),
        content=content,
        article_image=article_image,
        og_image=og_image,
        json_ld=json_ld,
    )

    return sanitize_emdash(html)


# ---------------------------------------------------------------------------
# Generate feed-grid cards for blog index
# ---------------------------------------------------------------------------

def generate_feed_grid(posts: list) -> str:
    """Build the inner HTML for the feed-grid div."""
    cards = []
    for post in posts:
        kd_slug = strip_date_prefix(post["slug"])
        author_info = AUTHOR_MAP.get(post.get("author", "team"), AUTHOR_MAP["team"])
        content = post.get("content", "")
        read_time = reading_time(content)
        category_raw = post.get("category", "guide")

        image = post.get("image", "")
        if image:
            card_img = f'<img class="card-img" src="{escape(image)}" alt="{escape(post["title"])}" loading="lazy">'
        else:
            card_img = ""

        card = CARD_TEMPLATE.format(
            kd_slug=kd_slug,
            card_img=card_img,
            category_lower=category_raw.lower(),
            category=escape(category_raw.title()),
            title=escape(post["title"]),
            excerpt=escape(post.get("excerpt", "")),
            avatar_class=author_info["avatar_class"],
            author_initial=author_info["initial"],
            author_display=author_info["display"],
            read_time=read_time,
        )
        cards.append(sanitize_emdash(card))

    return "\n\n".join(cards)


def update_blog_index(posts: list, dry_run: bool = False) -> bool:
    """INSERT new post cards at the top of the feed-grid in index.html.

    Insert-only by design (ISSUE-034): most KD posts exist solely as standalone
    HTML and are NOT in blog_posts.json, so rebuilding the grid from JSON wiped
    26 of 27 cards on 2026-07-02. Existing cards are never touched or removed.
    Returns True if changed.
    """
    with open(INDEX_HTML, "r", encoding="utf-8") as f:
        html = f.read()

    # Find the feed-grid div and replace its contents.
    # Pattern: <div class="feed-grid"> ... </div> followed by the AD SLOT comment
    # We need to find the matching closing </div> for feed-grid.
    start_marker = '<div class="feed-grid">'
    start_idx = html.find(start_marker)
    if start_idx == -1:
        print("ERROR: Could not find feed-grid div in index.html", file=sys.stderr)
        return False

    content_start = start_idx + len(start_marker)

    # Find the closing </div> for feed-grid. We need to count nesting.
    depth = 1
    i = content_start
    while i < len(html) and depth > 0:
        if html[i:i+5] == "<div " or html[i:i+4] == "<div>":
            depth += 1
        elif html[i:i+6] == "</div>":
            depth -= 1
            if depth == 0:
                break
        i += 1

    if depth != 0:
        print("ERROR: Could not find closing </div> for feed-grid", file=sys.stderr)
        return False

    # i now points to the '<' of the closing </div>
    content_end = i
    existing_grid = html[content_start:content_end]

    # Only build cards for posts not already in the grid — never remove anything.
    new_posts = [
        p for p in posts
        if f'href="/blog/{strip_date_prefix(p["slug"])}.html"' not in existing_grid
    ]
    if not new_posts:
        print("  Blog index: no new cards to insert")
        return False

    new_cards = generate_feed_grid(new_posts)
    new_html = (html[:content_start]
                + "\n" + new_cards + "\n"
                + existing_grid.lstrip("\n")
                + html[content_end:])

    if dry_run:
        print(f"  [DRY RUN] Would insert {len(new_posts)} new card(s) at top of feed-grid")
        return True

    with open(INDEX_HTML, "w", encoding="utf-8") as f:
        f.write(new_html)
    print(f"  Inserted {len(new_posts)} new card(s) at top of feed-grid (existing cards preserved)")
    return True


# ---------------------------------------------------------------------------
# Update sitemap
# ---------------------------------------------------------------------------

def update_sitemap(posts: list, dry_run: bool = False) -> int:
    """Add new blog post URLs to sitemap.xml. Returns count of URLs added."""
    with open(SITEMAP_XML, "r", encoding="utf-8") as f:
        sitemap = f.read()

    added = 0
    insert_before = "</urlset>"
    new_entries = []

    for post in posts:
        kd_slug = strip_date_prefix(post["slug"])
        url = f"https://ketodial.com/blog/{kd_slug}.html"

        if url in sitemap:
            continue

        pub_date = get_publish_date(post)
        entry = (
            f"  <url>"
            f"<loc>{url}</loc>"
            f"<lastmod>{pub_date}</lastmod>"
            f"<changefreq>monthly</changefreq>"
            f"<priority>0.8</priority>"
            f"</url>"
        )
        new_entries.append(entry)
        added += 1

    if added == 0:
        print("  Sitemap: no new URLs to add")
        return 0

    if dry_run:
        for entry in new_entries:
            print(f"  [DRY RUN] Would add to sitemap: {entry}")
        return added

    insert_pos = sitemap.rfind(insert_before)
    if insert_pos == -1:
        print("ERROR: Could not find </urlset> in sitemap.xml", file=sys.stderr)
        return 0

    new_sitemap = sitemap[:insert_pos] + "\n".join(new_entries) + "\n" + sitemap[insert_pos:]

    with open(SITEMAP_XML, "w", encoding="utf-8") as f:
        f.write(new_sitemap)

    print(f"  Added {added} new URL(s) to sitemap")
    return added


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate KetoDial blog pages")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing files")
    parser.add_argument("--only-new", action="store_true", help="Skip posts whose HTML already exists")
    args = parser.parse_args()

    # Verify paths
    if not os.path.isfile(POSTS_JSON):
        print(f"ERROR: {POSTS_JSON} not found", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(BLOG_DIR):
        print(f"ERROR: {BLOG_DIR} not found", file=sys.stderr)
        sys.exit(1)

    posts = load_kd_posts()
    print(f"Found {len(posts)} published KD post(s)")

    if not posts:
        print("Nothing to do.")
        return

    # 1. Generate individual post pages
    generated = 0
    skipped = 0
    for post in posts:
        kd_slug = strip_date_prefix(post["slug"])
        out_path = os.path.join(BLOG_DIR, f"{kd_slug}.html")

        if args.only_new and os.path.isfile(out_path):
            skipped += 1
            continue

        html = generate_post_html(post)

        if args.dry_run:
            print(f"  [DRY RUN] Would write {out_path}")
        else:
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"  Wrote {kd_slug}.html")
        generated += 1

    print(f"  Generated: {generated}, Skipped (--only-new): {skipped}")

    # 2. Update blog index feed-grid
    print("\nUpdating blog index...")
    update_blog_index(posts, dry_run=args.dry_run)

    # 3. Update sitemap
    print("\nUpdating sitemap...")
    update_sitemap(posts, dry_run=args.dry_run)

    print("\nDone.")


if __name__ == "__main__":
    main()

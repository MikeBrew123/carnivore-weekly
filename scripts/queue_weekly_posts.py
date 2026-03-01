#!/usr/bin/env python3
"""
Queue Weekly Posts

Reads data/weekly_topics.json, generates full HTML content for each topic
using writer personas + Claude Haiku, and appends to blog_posts.json with
status="ready" and publish dates spread across the next 7 days.

The daily-publish.yml GitHub Action picks up status="ready" posts each morning.

Usage:
    python3 scripts/queue_weekly_posts.py
    python3 scripts/queue_weekly_posts.py --dry-run
"""

import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SECRETS_FILE = BASE_DIR / "secrets" / "api-keys.json"
TOPICS_FILE = BASE_DIR / "data" / "weekly_topics.json"
BLOG_POSTS_FILE = BASE_DIR / "data" / "blog_posts.json"
PERSONAS_FILE = BASE_DIR / "data" / "personas.json"

AUTHOR_TITLES = {"sarah": "Health Coach", "marcus": "Performance Coach", "chloe": "Community Manager"}


def load_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if key:
        return key
    try:
        secrets = json.loads(SECRETS_FILE.read_text())
        return secrets.get("anthropic", {}).get("key", "")
    except Exception:
        return ""


def call_claude(api_key, prompt, max_tokens=3500):
    url = "https://api.anthropic.com/v1/messages"
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())["content"][0]["text"]


def slugify(title, date_str):
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)[:60].rstrip("-")
    return f"{date_str}-{slug}"


def spread_dates(n, start_offset_days=1):
    """Distribute n posts across the next 7 days, max 2/day."""
    start = datetime.now() + timedelta(days=start_offset_days)
    dates, day, day_count = [], start, {}
    while len(dates) < n:
        ds = day.strftime("%Y-%m-%d")
        if day_count.get(ds, 0) < 2:
            dates.append(ds)
            day_count[ds] = day_count.get(ds, 0) + 1
        else:
            day += timedelta(days=1)
    return dates


def build_prompt(topic, persona):
    name = persona["name"]
    backstory = persona.get("backstory", "")
    personality = persona.get("personality", "")
    writing_style = persona.get("writing_style", "")
    signature = persona.get("signature", f"-{name}")

    return f"""You are {name}, a writer for CarnivoreWeekly.com.

ABOUT YOU:
- Backstory: {backstory}
- Personality: {personality}
- Writing style: {writing_style}
- Sign off with: {signature}

POST TO WRITE:
Title: {topic['title']}
Angle: {topic['angle']}
Why topical: {topic['why_now']}

INSTRUCTIONS:
Write a 1,000–1,300 word blog post. Output HTML body content only (no <html>/<head>/<body> tags).

Format rules:
- Open with a compelling <h2> subheading (NOT the title)
- Use 3–5 <h2> subheadings throughout
- Write in {name}'s authentic first-person voice — specific, concrete, no fluff
- End with a short personal paragraph + "{signature}" on its own line
- Pure HTML only (<p>, <h2>, <ul>, <li>, <strong>) — no markdown

After the HTML content, add these metadata lines (each on its own line):
META: [120–160 char meta description with target keyword]
EXCERPT: [1–2 sentence hook for the blog index]
TAGS: [5–7 lowercase tags, comma-separated]
KEYWORDS: [3–4 SEO keyword phrases, comma-separated]"""


def parse_response(raw, topic, persona, publish_date, existing_slugs):
    """Split HTML content from metadata lines and build the post object."""
    lines = raw.strip().split("\n")
    meta_idx = next((i for i, l in enumerate(lines) if l.startswith("META:")), len(lines))
    content = "\n".join(lines[:meta_idx]).strip()

    meta_desc = excerpt = ""
    tags, keywords = [], []
    for line in lines[meta_idx:]:
        if line.startswith("META:"):
            meta_desc = line[5:].strip()
        elif line.startswith("EXCERPT:"):
            excerpt = line[8:].strip()
        elif line.startswith("TAGS:"):
            tags = [t.strip() for t in line[5:].split(",") if t.strip()]
        elif line.startswith("KEYWORDS:"):
            keywords = [k.strip() for k in line[9:].split(",") if k.strip()]

    writer = topic["suggested_writer"]
    slug = slugify(topic["title"], publish_date)

    # Avoid slug collisions
    base_slug = slug
    counter = 2
    while slug in existing_slugs:
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Related posts: last 3 existing slugs from same writer
    related = [s for s in reversed(existing_slugs) if writer in s][:3]

    return {
        "slug": slug,
        "title": topic["title"],
        "author": writer,
        "author_title": AUTHOR_TITLES.get(writer, "Writer"),
        "date": publish_date,
        "scheduled_date": publish_date,
        "published": False,
        "status": "ready",
        "publish_date": publish_date,
        "category": _infer_category(topic, writer),
        "tags": tags or [writer, "carnivore"],
        "excerpt": excerpt,
        "wiki_links": [],
        "related_posts": related,
        "sponsor_callout": "",
        "seo": {"meta_description": meta_desc, "keywords": keywords},
        "validation": {},
        "content": content,
    }


def _infer_category(topic, writer):
    title_lower = topic["title"].lower()
    if any(w in title_lower for w in ["skin", "gut", "sleep", "histamine", "sibo", "dental", "fertility"]):
        return "health"
    if any(w in title_lower for w in ["performance", "fat", "protein", "muscle", "athlete"]):
        return "performance"
    if any(w in title_lower for w in ["social", "community", "rfk", "policy", "media", "reddit"]):
        return "community"
    return {"sarah": "health", "marcus": "performance", "chloe": "community"}.get(writer, "health")


def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("✍️  QUEUE WEEKLY POSTS")
    print("=" * 60)

    api_key = load_api_key()
    if not api_key:
        print("❌ No Anthropic API key found")
        sys.exit(1)

    topics_data = json.loads(TOPICS_FILE.read_text())
    topics = topics_data.get("topics", [])
    print(f"\n📋 {len(topics)} topics loaded")

    personas = json.loads(PERSONAS_FILE.read_text()).get("personas", {})

    blog_data = json.loads(BLOG_POSTS_FILE.read_text())
    existing_posts = blog_data.get("blog_posts", [])
    existing_slugs = [p["slug"] for p in existing_posts]
    existing_titles_lower = {p["title"].lower() for p in existing_posts}

    # Skip already-covered topics
    new_topics = [t for t in topics if t["title"].lower() not in existing_titles_lower]
    skipped = len(topics) - len(new_topics)
    if skipped:
        print(f"   ⚠ {skipped} topics already published — skipping")
    topics = new_topics

    if not topics:
        print("✅ All topics already exist — nothing to generate")
        sys.exit(0)

    publish_dates = spread_dates(len(topics))

    if dry_run:
        print("\n🔍 DRY RUN — would generate:")
        for t, d in zip(topics, publish_dates):
            print(f"  {d} [{t['suggested_writer']:6}] {t['title']}")
        return

    print(f"\n📅 Schedule: {publish_dates[0]} → {publish_dates[-1]}")
    print()

    new_posts = []
    for i, (topic, pub_date) in enumerate(zip(topics, publish_dates), 1):
        writer = topic["suggested_writer"]
        persona = personas.get(writer, {})
        print(f"  [{i}/{len(topics)}] {writer:6} | {pub_date} | {topic['title'][:52]}")
        try:
            prompt = build_prompt(topic, persona)
            raw = call_claude(api_key, prompt)
            post = parse_response(raw, topic, persona, pub_date, existing_slugs)
            new_posts.append(post)
            existing_slugs.append(post["slug"])
            print(f"           ✓ {len(post['content'])} chars | {post['slug']}")
        except Exception as e:
            print(f"           ❌ Failed: {e}")
        if i < len(topics):
            time.sleep(1)

    if not new_posts:
        print("\n❌ No posts generated")
        sys.exit(1)

    blog_data["blog_posts"].extend(new_posts)
    BLOG_POSTS_FILE.write_text(json.dumps(blog_data, indent=2))

    print(f"\n✅ {len(new_posts)}/{len(topics)} posts added → blog_posts.json (status: ready)")
    print("\nPublish schedule:")
    for p in new_posts:
        print(f"  {p['publish_date']} [{p['author']:6}] {p['title'][:55]}")
    print("\nGitHub Actions will publish at 9 AM EST each day.")


if __name__ == "__main__":
    main()

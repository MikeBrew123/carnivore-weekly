#!/usr/bin/env python3
"""
Weekly Topic Research — Chloe's Community Pulse Check

Scans Reddit (r/carnivore, r/zerocarb, r/carnivorediet) and YouTube comment
data to surface what the community is actually talking about this week.
Cross-checks against existing blog posts to avoid repeats.
Calls Claude to synthesize 8-10 fresh, topical content ideas.

Output: data/weekly_topics.json
Runs as Step 1.5 in run_weekly_update.sh
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SECRETS_FILE = BASE_DIR / "secrets" / "api-keys.json"
YOUTUBE_DATA = BASE_DIR / "data" / "youtube_data.json"
ANALYZED_CONTENT = BASE_DIR / "data" / "analyzed_content.json"
BLOG_POSTS = BASE_DIR / "data" / "blog_posts.json"
OUTPUT_FILE = BASE_DIR / "data" / "weekly_topics.json"

SUBREDDITS = ["carnivore", "zerocarb", "carnivorediet"]
REDDIT_HEADERS = {"User-Agent": "CarnivoreWeekly/1.0 (content research bot)"}


def load_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if key:
        return key
    try:
        secrets = json.loads(SECRETS_FILE.read_text())
        return secrets.get("anthropic", {}).get("key", "")
    except Exception:
        return ""


def fetch_reddit(subreddit, limit=25):
    """Fetch top posts from a subreddit using public JSON API."""
    url = f"https://www.reddit.com/r/{subreddit}/hot.json?limit={limit}"
    req = urllib.request.Request(url, headers=REDDIT_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            posts = data.get("data", {}).get("children", [])
            results = []
            for p in posts:
                d = p.get("data", {})
                if d.get("stickied") or d.get("pinned"):
                    continue
                results.append({
                    "title": d.get("title", ""),
                    "score": d.get("score", 0),
                    "num_comments": d.get("num_comments", 0),
                    "selftext": (d.get("selftext", "") or "")[:300],
                    "flair": d.get("link_flair_text", ""),
                })
            return results
    except Exception as e:
        print(f"   ⚠ Reddit r/{subreddit} failed: {e}")
        return []


def load_existing_titles():
    """Load all published post titles for deduplication."""
    try:
        posts = json.loads(BLOG_POSTS.read_text())
        return [p.get("title", "") for p in posts if p.get("status") == "published"]
    except Exception:
        return []


def load_youtube_signals():
    """Extract trending signals from already-analyzed YouTube data."""
    signals = []
    try:
        analyzed = json.loads(ANALYZED_CONTENT.read_text())
        summary = analyzed.get("weekly_summary", "")
        topics_raw = analyzed.get("trending_topics", "")
        if isinstance(topics_raw, str) and "```" in topics_raw:
            topics_raw = topics_raw.split("```json")[-1].split("```")[0]
        if topics_raw:
            try:
                topics = json.loads(topics_raw) if isinstance(topics_raw, str) else topics_raw
                signals = [t.get("topic", "") for t in topics if isinstance(t, dict)]
            except Exception:
                pass
        if summary:
            signals.append(f"YOUTUBE_SUMMARY: {summary[:500]}")
    except Exception:
        pass
    return signals


def call_claude(api_key, prompt):
    """Call Claude API via urllib (no SDK dependency)."""
    url = "https://api.anthropic.com/v1/messages"
    payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
        return result["content"][0]["text"]


def build_prompt(reddit_posts, youtube_signals, existing_titles):
    reddit_text = ""
    for sub, posts in reddit_posts.items():
        if not posts:
            continue
        reddit_text += f"\nr/{sub} top posts this week:\n"
        for p in posts[:15]:
            reddit_text += f"  - \"{p['title']}\" ({p['score']} upvotes, {p['num_comments']} comments)\n"
            if p["selftext"]:
                reddit_text += f"    {p['selftext'][:150]}\n"

    yt_text = "\n".join(f"  - {s}" for s in youtube_signals if not s.startswith("YOUTUBE_SUMMARY"))
    yt_summary = next((s.replace("YOUTUBE_SUMMARY: ", "") for s in youtube_signals if s.startswith("YOUTUBE_SUMMARY")), "")

    existing_sample = "\n".join(f"  - {t}" for t in existing_titles[:80])

    today = datetime.now().strftime("%B %d, %Y")

    return f"""You are Chloe, a writer for CarnivoreWeekly.com. It's {today} and you've spent Sunday morning scanning carnivore communities to find what people are actually talking about this week.

COMMUNITY SIGNALS THIS WEEK:
{reddit_text}

YouTube trending topics:
{yt_text}

YouTube weekly summary:
{yt_summary}

EXISTING BLOG POSTS (do NOT suggest these topics — we already have them):
{existing_sample}

YOUR TASK:
Generate 8-10 content ideas the team can write this week. Each idea must:
1. Be topical (tied to what's happening THIS week in the community)
2. Not duplicate any existing post
3. Have a clear angle and hook — not generic
4. Vary across writers: Sarah (science/research), Marcus (performance/practical), Chloe (lifestyle/real-talk)

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{{
  "generated_date": "{datetime.now().strftime('%Y-%m-%d')}",
  "community_pulse": "1-2 sentence summary of what the carnivore community is focused on this week",
  "topics": [
    {{
      "rank": 1,
      "title": "Specific, clickable blog post title",
      "angle": "The specific take or hook — what makes this different from generic content",
      "why_now": "Why this is timely THIS week",
      "suggested_writer": "sarah|marcus|chloe",
      "priority": "high|medium"
    }}
  ]
}}"""


def generate_weekly_topics():
    print("=" * 60)
    print("🔍 CHLOE'S WEEKLY COMMUNITY RESEARCH")
    print("=" * 60)

    api_key = load_api_key()
    if not api_key:
        print("   ❌ No Anthropic API key found — skipping topic generation")
        return False

    # Step 1: Reddit
    print("\n📱 Scanning Reddit communities...")
    reddit_posts = {}
    for sub in SUBREDDITS:
        posts = fetch_reddit(sub)
        reddit_posts[sub] = posts
        print(f"   r/{sub}: {len(posts)} posts")
        time.sleep(1)  # be polite

    total_reddit = sum(len(p) for p in reddit_posts.values())
    if total_reddit == 0:
        print("   ⚠ No Reddit data — proceeding with YouTube signals only")

    # Step 2: YouTube signals
    print("\n📺 Loading YouTube signals...")
    youtube_signals = load_youtube_signals()
    print(f"   {len(youtube_signals)} signals loaded")

    # Step 3: Existing posts
    print("\n📚 Loading existing post titles...")
    existing_titles = load_existing_titles()
    print(f"   {len(existing_titles)} published posts to cross-check")

    # Step 4: Claude synthesis
    print("\n🤖 Synthesizing topic ideas with Claude...")
    prompt = build_prompt(reddit_posts, youtube_signals, existing_titles)
    try:
        response = call_claude(api_key, prompt)
        # Strip any accidental markdown fences
        response = response.strip()
        if response.startswith("```"):
            response = response.split("```json")[-1].split("```")[0].strip()
        result = json.loads(response)
    except Exception as e:
        print(f"   ❌ Claude call failed: {e}")
        return False

    # Step 5: Assign writers and publish dates
    # Marcus checked first so "performance/athletes" beats Sarah's "weight loss" keyword
    WRITER_KEYWORDS = {
        "marcus": ["performance", "athletes", "strength", "training", "workout", "protocol",
                   "meal prep", "budget", "cost", "fasting", "muscle", "endurance"],
        "sarah": ["weight loss", "cholesterol", "health", "medical", "women", "hormones",
                  "thyroid", "gut", "electrolytes", "inflammation", "sleep", "skin",
                  "autoimmune", "nutrition"],
        "chloe": ["community", "beginner", "social", "viral", "media", "trending", "reddit",
                  "transformation", "first 30 days", "lifestyle", "travel", "tips", "hacks",
                  "content creator"],
    }
    RANK_CYCLE = {1: "sarah", 2: "sarah", 3: "sarah",
                  4: "marcus", 5: "marcus", 6: "marcus",
                  7: "chloe", 8: "chloe", 9: "chloe"}

    tomorrow = datetime.now().date() + timedelta(days=1)

    for i, topic in enumerate(result.get("topics", [])):
        text = (topic.get("title", "") + " " + topic.get("angle", "")).lower()
        assigned = None
        for writer, keywords in WRITER_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                assigned = writer
                break
        if assigned is None:
            rank = topic.get("rank", i + 1)
            assigned = RANK_CYCLE.get(rank, ["sarah", "marcus", "chloe"][i % 3])
        topic["assigned_writer"] = assigned
        topic["publish_date"] = (tomorrow + timedelta(days=i * 2)).isoformat()

    # Step 6: Save
    OUTPUT_FILE.write_text(json.dumps(result, indent=2))

    print(f"\n✅ {len(result.get('topics', []))} topics generated")
    print(f"\n📋 Community pulse: {result.get('community_pulse', '')}")
    print("\nTop topics:")
    for t in result.get("topics", [])[:5]:
        writer = t.get("suggested_writer", "?")
        print(f"  [{writer:6}] {t['title']}")
    print(f"\n   Saved → {OUTPUT_FILE.relative_to(BASE_DIR)}")
    return True


if __name__ == "__main__":
    success = generate_weekly_topics()
    sys.exit(0 if success else 1)

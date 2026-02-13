#!/usr/bin/env python3
"""
Generate Editorial Commentary for Content of the Week
Assigns videos to writers (Sarah, Marcus, Chloe) and generates humanized commentary.
Uses writer memory from Supabase and local context for cross-referencing.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from anthropic import Anthropic

# Load environment variables from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=True)

# Add scripts/ to path for fetch_writer_context import
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

# Initialize Claude
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Project paths
YOUTUBE_DATA_PATH = PROJECT_ROOT / "data" / "youtube_data.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "content-of-the-week.json"

# Video selection — editorial model requires community signal
MIN_COMMENTS_FOR_SELECTION = 5

# Import channel blocklist for selection-time filtering
try:
    from youtube_collector import is_blocked_channel
except ImportError:
    def is_blocked_channel(name):
        return False, None

# Writer personas
WRITERS = {
    "Sarah": "Evidence-based researcher. Focuses on science, mechanisms, metabolic health.",
    "Marcus": "Performance coach. Direct, action-oriented, practical advice.",
    "Chloe": "Community voice. Casual tone, reads trends, understands social dynamics.",
}


def load_writer_context(writer_name):
    """Load writer context from Supabase (memories, past articles, team articles).
    Falls back to local-only context if Supabase is unavailable.
    Uses signal-based timeout to prevent hanging on Supabase connection."""
    import signal

    def _timeout_handler(signum, frame):
        raise TimeoutError("Supabase connection timed out")

    try:
        # Set 10s timeout — import triggers module-level create_client()
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(10)

        from fetch_writer_context import (
            fetch_writer_context,
            format_context_for_prompt,
        )

        context = fetch_writer_context(writer_name.lower())
        signal.alarm(0)  # Cancel timeout
        signal.signal(signal.SIGALRM, old_handler)

        if "error" not in context:
            formatted = format_context_for_prompt(context)
            # Append wiki topics (not included in fetch_writer_context)
            formatted += _build_wiki_context()
            print(f"   ✓ Loaded {writer_name} memory from Supabase")
            return formatted
        else:
            print(f"   ⚠ Supabase returned error for {writer_name}: {context.get('error')}")
    except Exception as e:
        signal.alarm(0)  # Cancel any pending alarm
        print(f"   ⚠ Could not load {writer_name} memory from Supabase: {e}")

    # Fallback: minimal local-only context
    return build_local_context(writer_name)


def build_local_context(writer_name):
    """Build minimal writer context from local JSON files when Supabase is unavailable."""
    context = f"\n# CONTEXT FOR {writer_name.upper()}\n\n"

    # Load published blog posts for linking
    blog_path = PROJECT_ROOT / "data" / "blog_posts.json"
    if blog_path.exists():
        blog_data = json.loads(blog_path.read_text())
        posts = [
            p
            for p in blog_data.get("blog_posts", [])[:30]
            if p.get("published")
        ]
        # Show this writer's recent posts
        own_posts = [
            p for p in posts
            if p.get("author", "").lower() == writer_name.lower()
        ]
        if own_posts:
            context += "## Your Recent Articles\n"
            for p in own_posts[:5]:
                context += f"- /blog/{p['slug']}.html — {p['title']}\n"
        # Show team posts
        team_posts = [
            p for p in posts
            if p.get("author", "").lower() != writer_name.lower()
        ]
        if team_posts:
            context += "\n## Teammate Articles (cross-reference these)\n"
            for p in team_posts[:10]:
                author = p.get("author", "").title()
                context += f"- /blog/{p['slug']}.html — {p['title']} (by {author})\n"

    # Add wiki topics
    context += _build_wiki_context()

    return context


def _build_wiki_context():
    """Build wiki topics section from wiki-keywords.json."""
    wiki_path = PROJECT_ROOT / "data" / "wiki-keywords.json"
    if not wiki_path.exists():
        return ""

    wiki_data = json.loads(wiki_path.read_text())
    keywords = wiki_data.get("keyword_map", {})

    # Get unique wiki pages (deduplicate by URL)
    seen = set()
    wiki_topics = []
    for kw, url in keywords.items():
        if url not in seen and len(kw) > 3:
            seen.add(url)
            wiki_topics.append(f"- {url} — {kw}")

    if not wiki_topics:
        return ""

    result = "\n## Wiki Topics (link when relevant)\n"
    result += "\n".join(wiki_topics[:15]) + "\n"
    return result


def store_commentary_memory(writer_name, video_title, commentary):
    """Store generated commentary as a new memory for the writer.
    Non-critical: never blocks commentary generation."""
    try:
        from supabase import create_client

        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not supabase_key:
            return

        sb = create_client(supabase_url, supabase_key)

        # Get writer_id
        writer_result = (
            sb.table("writers")
            .select("id")
            .eq("slug", writer_name.lower())
            .execute()
        )
        if not writer_result.data:
            return

        writer_id = writer_result.data[0]["id"]

        sb.table("writer_memory_log").insert(
            {
                "writer_id": writer_id,
                "memory_type": "pattern_identified",
                "title": f"Commentary: {video_title[:80]}",
                "description": commentary[:300],
                "content": commentary[:300],
                "source": "direct_learning",
                "tags": ["commentary", "video-reaction", "weekly"],
                "relevance_score": 0.70,
                "impact_category": "engagement_boost",
                "implementation_status": "implemented",
            }
        ).execute()
        print(f"   ✓ Stored memory for {writer_name}")
    except Exception as e:
        print(f"   ⚠ Could not store memory for {writer_name}: {e}")


def load_youtube_data():
    """Load current YouTube data"""
    with open(YOUTUBE_DATA_PATH, "r") as f:
        return json.load(f)


def get_top_6_videos(data):
    """Select top 6 videos ranked by engagement, requiring minimum comment count.

    Videos with fewer than MIN_COMMENTS_FOR_SELECTION comments are deprioritized
    because the editorial model depends on community reactions. Engagement score
    weights comments highest (editorial value), then likes, then views.
    """
    # Flatten all videos from all creators
    all_videos = []
    for creator in data.get("top_creators", []):
        for video in creator.get("videos", []):
            stats = video.get("statistics", {})
            comment_count = stats.get("comment_count", 0)
            like_count = stats.get("like_count", 0)
            view_count = stats.get("view_count", 0)
            all_videos.append(
                {
                    "video_id": video["video_id"],
                    "title": video["title"],
                    "creator": creator["channel_name"],
                    "views": view_count,
                    "comment_count": comment_count,
                    "description": video.get("description", "")[:300],
                    "comments_sample": [
                        {"text": c["text"], "likes": c.get("likes", 0)}
                        for c in video.get("top_comments", [])[:10]
                    ],
                    "_engagement": comment_count * 2 + like_count + (view_count / 1000),
                }
            )

    # Filter out blocked channels (safety net — collector should catch these upstream)
    pre_filter = len(all_videos)
    all_videos = [v for v in all_videos if not is_blocked_channel(v["creator"])[0]]
    if len(all_videos) < pre_filter:
        print(f"   ✗ Filtered {pre_filter - len(all_videos)} videos from blocklisted channels")

    # Split by comment threshold
    qualified = [v for v in all_videos if v["comment_count"] >= MIN_COMMENTS_FOR_SELECTION]
    unqualified = [v for v in all_videos if v["comment_count"] < MIN_COMMENTS_FOR_SELECTION]

    # Rank qualified by engagement score (comments weighted highest)
    qualified.sort(key=lambda v: v["_engagement"], reverse=True)

    selected = qualified[:6]

    # Backfill if we don't have 6 qualified videos
    if len(selected) < 6:
        shortfall = 6 - len(selected)
        unqualified.sort(key=lambda v: v["views"], reverse=True)
        backfill = unqualified[:shortfall]
        print(f"   ⚠ Only {len(qualified)} videos had {MIN_COMMENTS_FOR_SELECTION}+ comments, "
              f"filling {shortfall} slots from lower-comment videos")
        selected.extend(backfill)

    # Clean up internal scoring field
    for v in selected:
        v.pop("_engagement", None)

    return selected


def assign_writer(index):
    """Rotate writers across videos"""
    writer_list = ["Chloe", "Sarah", "Chloe", "Sarah", "Marcus", "Sarah"]
    return writer_list[index % 6]


def assign_heat_badge(views, index):
    """Assign heat badge based on views and position"""
    if views > 100000:
        return "🔥🔥 Trending"
    elif views > 40000:
        return "🔥 Science"
    elif index == 3:
        return "🔥🔥 Mental Health"
    elif index == 4:
        return "🔥 Motivation"
    elif index == 5:
        return "🔥 Recipe"
    else:
        return "🔥 Success Story"


def markdown_links_to_html(text):
    """Convert any markdown [text](url) links to HTML <a> tags."""
    import re
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)


def humanize_text(text):
    """Apply humanization rules to remove AI tells"""
    # Convert any stray markdown links to HTML
    text = markdown_links_to_html(text)

    replacements = {
        # AI tell phrases
        "utilize": "use",
        "Utilize": "Use",
        "leverage": "use",
        "Leverage": "Use",
        "facilitate": "help",
        "Facilitate": "Help",
        "robust": "solid",
        "Robust": "Solid",
        "comprehensive": "complete",
        "Comprehensive": "Complete",
        "delve into": "explore",
        "Delve into": "Explore",
        "navigate": "handle",
        "Navigate": "Handle",
        "landscape": "scene",
        "Landscape": "Scene",
        # Remove excessive formality
        "in order to": "to",
        "In order to": "To",
        "prior to": "before",
        "Prior to": "Before",
        "subsequent to": "after",
        "Subsequent to": "After",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Remove em-dashes (replace with period + space for new sentence)
    text = text.replace("—", ". ")

    # Fix double periods
    while ".." in text:
        text = text.replace("..", ".")

    # Fix spacing issues
    text = text.replace(".  ", ". ")

    return text


def generate_commentary(video, writer):
    """Generate editorial commentary using Claude with humanization and memory"""
    writer_persona = WRITERS[writer]

    # Load full writer context (memories + articles + wiki)
    writer_context = load_writer_context(writer)

    prompt = f"""You are {writer}, a writer for Carnivore Weekly. {writer_persona}

{writer_context}

Write a 3-4 sentence editorial commentary for this video.

HUMANIZATION REQUIREMENTS (CRITICAL):
- NO AI tells: "delve", "landscape", "robust", "utilize", "facilitate", "leverage"
- NO formal jargon: "comprehensive", "holistic", "synergy", "paradigm"
- NO em-dashes (use periods or commas instead)
- Sound like talking to a friend, not writing an essay
- Use contractions where natural (it's, don't, can't)
- Be direct and specific (not vague generalizations)

SOFT-CONVERSION APPROACH:
- If mentioning products/supplements, use natural context (not sales pitches)
- Share what works, don't pressure
- "Some people find X helpful" > "You need to buy X"
- Trust the reader to make their own decisions

CONTENT REQUIREMENTS:
- React to what the COMMUNITY is saying in the comments (if available)
- Quote or paraphrase specific comments when interesting
- Reference your own past writing if the topic connects ("I covered this in...")
- Mention teammates' articles when relevant ("Marcus had a great take on...")
- Naturally mention wiki topics when the video touches on them
- Explain why this video matters to the carnivore world
- Use short sentences (vary length for rhythm)

LINKING RULES:
- You may reference blog posts or wiki topics from the context above
- CRITICAL: Write links as HTML, NOT markdown. Commentary is inserted into HTML templates.
  CORRECT: <a href="/blog/2026-02-08-strength-gains.html">strength gains</a>
  WRONG:   [strength gains](/blog/2026-02-08-strength-gains.html)
- Use natural phrasing: "check out our <a href="...">dairy guide</a>"
- Only reference content that genuinely relates to the video topic
- Don't force links, only include if they add real value
- Keep it to 0-1 references max (this is short commentary, not an article)

Video Details:
Title: {video['title']}
Creator: {video['creator']}
Views: {video['views']:,}
Description: {video['description']}
"""

    # Add comments section only if there are comments
    comments = video.get("comments_sample", [])
    if comments:
        comments_text = chr(10).join(
            f"- [{c.get('likes', 0)} likes] {c['text']}" for c in comments[:10]
        )
        prompt += f"""
Top Community Comments (react to these):
{comments_text}
"""
    else:
        prompt += """
(No community comments available yet — focus on the video content itself)
"""

    prompt += """Write ONLY the commentary text (no labels, no intro). Make it sound human."""

    response = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}],
    )

    commentary = response.content[0].text.strip()

    # Post-processing humanization pass
    commentary = humanize_text(commentary)

    return commentary


def create_editorial_title(original_title):
    """Simplify video title for editorial purposes"""
    # Remove extra dots, clean up formatting
    title = original_title.replace("..", "").strip()

    # If title is already good, return it
    if len(title) < 60 and not title.endswith("..."):
        return title

    # Otherwise keep original
    return original_title


def main():
    print("🎨 Generating Editorial Commentary...")

    # Load data
    youtube_data = load_youtube_data()
    videos = get_top_6_videos(youtube_data)

    print(f"   Found {len(videos)} videos")

    # Generate commentary for each video
    featured_videos = []

    for i, video in enumerate(videos):
        writer = assign_writer(i)
        print(f"   {i+1}. {video['title'][:50]}... (assigned to {writer})")

        # Generate commentary with memory context
        commentary = generate_commentary(video, writer)

        # Store commentary as memory for future runs
        store_commentary_memory(writer, video["title"], commentary)

        # Create editorial title
        editorial_title = create_editorial_title(video["title"])

        # Assign heat badge
        heat_badge = assign_heat_badge(video["views"], i)

        featured_videos.append(
            {
                "video_id": video["video_id"],
                "editorial_title": editorial_title,
                "heat_badge": heat_badge,
                "commentary": commentary,
                "curator": writer,
            }
        )

    # Create output
    output = {
        "week": datetime.now().strftime("%Y-%m-%d"),
        "updated_by": "Agent System (Sarah, Marcus, Chloe)",
        "featured_videos": featured_videos,
    }

    # Save
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"   ✓ Saved to {OUTPUT_PATH}")
    print("")


if __name__ == "__main__":
    main()

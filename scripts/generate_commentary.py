#!/usr/bin/env python3
"""
Generate Editorial Commentary for Content of the Week
Assigns videos to writers (Sarah, Marcus, Chloe) and generates humanized commentary.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from anthropic import Anthropic

# Initialize Claude
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
YOUTUBE_DATA_PATH = PROJECT_ROOT / "data" / "youtube_data.json"
OUTPUT_PATH = PROJECT_ROOT / "data" / "content-of-the-week.json"

# Writer personas
WRITERS = {
    "Sarah": "Evidence-based researcher. Focuses on science, mechanisms, metabolic health.",
    "Marcus": "Performance coach. Direct, action-oriented, practical advice.",
    "Chloe": "Community voice. Casual tone, reads trends, understands social dynamics.",
}


def load_youtube_data():
    """Load current YouTube data"""
    with open(YOUTUBE_DATA_PATH, "r") as f:
        return json.load(f)


def get_top_6_videos(data):
    """Extract top 6 videos from YouTube data"""
    videos = []
    for creator in data.get("top_creators", []):
        for video in creator.get("videos", []):
            videos.append(
                {
                    "video_id": video["video_id"],
                    "title": video["title"],
                    "creator": creator["channel_name"],
                    "views": video["statistics"]["view_count"],
                    "description": video.get("description", "")[:300],
                    "comments_sample": [c["text"] for c in video.get("top_comments", [])[:5]],
                }
            )
            if len(videos) >= 6:
                break
        if len(videos) >= 6:
            break
    return videos


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


def humanize_text(text):
    """Apply humanization rules to remove AI tells"""
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
    """Generate editorial commentary using Claude with humanization"""
    writer_persona = WRITERS[writer]

    prompt = f"""You are {writer}, a writer for Carnivore Weekly. {writer_persona}

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
- Explain WHY this video matters to the carnivore community
- Reference specific details from the video or comments
- Use short sentences (vary length for rhythm)

Video Details:
Title: {video['title']}
Creator: {video['creator']}
Views: {video['views']:,}
Description: {video['description']}

Top Comments:
{chr(10).join(f"- {comment}" for comment in video['comments_sample'][:3])}

Write ONLY the commentary text (no labels, no intro). Make it sound human."""

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

        # Generate commentary
        commentary = generate_commentary(video, writer)

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

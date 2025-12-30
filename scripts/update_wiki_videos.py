#!/usr/bin/env python3
"""
Update wiki.html with video links from analyzed content.

Only injects videos that made it to the top_videos list in analyzed_content.json.
This ensures wiki stays curated with high-quality content only.

Updates:
1. Video links in placeholder sections
2. "Last Updated" timestamps
"""

import json
import re
from datetime import datetime
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "analyzed_content.json"
WIKI_FILE = PROJECT_ROOT / "public" / "wiki.html"

# Mapping: wiki section ID -> trending topic names and related creators
SECTION_TO_TOPICS = {
    "dairy": ["Why People Quit Carnivore"],
    "salt": ["Electrolytes & Salt Loading"],
    "electrolytes": ["Electrolytes & Salt Loading"],
    "digestion": ["Gut Health & Fermented Foods"],
    "coffee": ["Vitamin B1 (Thiamine) Deficiency", "Why People Quit Carnivore"],
    "budget": ["Budget Carnivore & Ground Beef Focus"],
    "critics": ["Carnivore vs. Mainstream Nutrition Science"],
    "organ-meats": ["Gut Health & Fermented Foods"],
    "scurvy": ["Gut Health & Fermented Foods"],  # Vitamin C related
    "alcohol": ["Electrolytes & Salt Loading"],  # Alcohol affects electrolytes
}


def load_analyzed_content():
    """Load analyzed content from JSON file."""
    if not DATA_FILE.exists():
        print(f"⚠️  No analyzed content found at {DATA_FILE}")
        return None

    with open(DATA_FILE, 'r') as f:
        return json.load(f)


def create_video_links(videos, section_id, trending_topics):
    """
    Create HTML for video links matching the section's topics.

    Only includes videos from top_videos list (high-quality threshold).
    """
    matching_videos = []

    for video in videos:
        creator = video.get("creator", "").lower()

        # Check if this video's creator is mentioned in relevant trending topics
        for topic_name in SECTION_TO_TOPICS.get(section_id, []):
            # Find trending topic by name
            for topic in trending_topics:
                if topic.get("topic") == topic_name:
                    mentioned_creators = [c.lower() for c in topic.get("mentioned_by", [])]
                    # Normalize creator name for matching
                    if creator_matches(creator, mentioned_creators):
                        matching_videos.append(video)
                        break

    if not matching_videos:
        return ""

    # Build HTML for video links
    html_lines = []
    for video in matching_videos:
        video_id = video.get("video_id", "")
        title = video.get("title", "Unknown")
        creator = video.get("creator", "Unknown")

        if video_id:
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            html_lines.append(
                f'                <li><a href="{youtube_url}" target="_blank">{title} - {creator}</a></li>'
            )

    if html_lines:
        return "\n".join(html_lines)
    return ""


def creator_matches(video_creator, mentioned_creators):
    """
    Check if video creator matches any mentioned creator.
    Handles name variations (e.g., "Ken D Berry" vs "KenDBerryMD").
    """
    # Normalize: remove spaces, convert to lowercase
    video_normalized = video_creator.replace(" ", "").lower()

    for mentioned in mentioned_creators:
        mentioned_normalized = mentioned.replace(" ", "").lower()

        # Exact match
        if video_normalized == mentioned_normalized:
            return True

        # Partial match (handles channel names vs display names)
        if video_normalized in mentioned_normalized or mentioned_normalized in video_normalized:
            # But require at least 3 chars match to avoid false positives
            common = sum(1 for a, b in zip(video_normalized, mentioned_normalized) if a == b)
            if common >= 3:
                return True

    return False


def update_wiki_file(wiki_content, videos, trending_topics):
    """
    Update wiki HTML with video links and timestamps.
    """
    updated_content = wiki_content

    # Get today's date for "Last Updated"
    today = datetime.now().strftime("%B %d, %Y")
    last_updated_pattern = r'<span class="last-updated">📅 Last Updated: .*?</span>'
    last_updated_replacement = f'<span class="last-updated">📅 Last Updated: {today}</span>'

    # Update all "Last Updated" timestamps
    updated_content = re.sub(
        last_updated_pattern,
        last_updated_replacement,
        updated_content,
        flags=re.DOTALL
    )

    # Process each section's video placeholder
    placeholder = "<!-- Add video links manually when influencers cover this topic -->"

    for section_id in SECTION_TO_TOPICS.keys():
        # Find the specific placeholder in this section's related-videos div
        # Pattern: <div class="topic" id="{id}"> ... <!-- placeholder --> ... </div>
        section_pattern = f'<div class="topic" id="{section_id}">(.*?){re.escape(placeholder)}(.*?)</div>(?=\s*(?:<!--|\<div class="topic"|$))'

        match = re.search(section_pattern, updated_content, re.DOTALL)

        if match:
            before_placeholder = match.group(1)
            after_placeholder = match.group(2)

            # Get video links for this section
            video_links_html = create_video_links(videos, section_id, trending_topics)

            if video_links_html:
                # Build replacement with video list
                video_list_html = (
                    f'{placeholder}\n'
                    f'                <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;">\n'
                    f'                    <strong>Related videos this week:</strong>\n'
                    f'                    <ul style="margin: 10px 0; padding-left: 20px;">\n'
                    f'{video_links_html}\n'
                    f'                    </ul>\n'
                    f'                </div>'
                )

                # Build the replacement section
                new_section = (
                    f'<div class="topic" id="{section_id}">{before_placeholder}{video_list_html}{after_placeholder}</div>'
                )

                # Replace in the document
                old_section = match.group(0)
                updated_content = updated_content.replace(old_section, new_section, 1)

    return updated_content


def main():
    """Main workflow."""
    print("🔄 Updating wiki with video links...")

    # Load data
    data = load_analyzed_content()
    if not data:
        print("❌ No data to process")
        return

    videos = data.get("analysis", {}).get("top_videos", [])
    trending_topics = data.get("analysis", {}).get("trending_topics", [])

    if not videos or not trending_topics:
        print("⚠️  No videos or trending topics found")
        return

    # Read wiki
    if not WIKI_FILE.exists():
        print(f"❌ Wiki file not found: {WIKI_FILE}")
        return

    with open(WIKI_FILE, 'r') as f:
        wiki_content = f.read()

    # Update wiki with video links
    updated_wiki = update_wiki_file(wiki_content, videos, trending_topics)

    # Write updated wiki
    with open(WIKI_FILE, 'w') as f:
        f.write(updated_wiki)

    # Count changes
    old_dates = re.findall(r'Last Updated: (.*?)</span>', wiki_content)
    new_dates = re.findall(r'Last Updated: (.*?)</span>', updated_wiki)

    print(f"✅ Wiki updated successfully")
    print(f"   📅 Updated {len(set(old_dates))} section timestamps")
    print(f"   🎥 Injected video links from {len(videos)} top videos")
    print(f"   📊 Matched against {len(trending_topics)} trending topics")


if __name__ == "__main__":
    main()

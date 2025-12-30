#!/usr/bin/env python3
"""
Update wiki.html with video links from analyzed content.

Only injects videos that made it to the top_videos list in analyzed_content.json.
This ensures wiki stays curated with high-quality content only.

Features:
1. Video links in placeholder sections (top 1-2 most relevant per section)
2. "Last Updated" timestamps
3. Video metadata tracking (injection date, expires after 30 days)
4. Prevents duplicate accumulation via class="wiki-auto-video" marker
5. Video ranking by creator prominence in topic + view count

Updates:
- Removes expired videos (older than 30 days)
- Limits to top 1-2 most relevant videos per section
- Tracks video metadata in data/wiki_videos_meta.json
- Idempotent: running multiple times won't create duplicates
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "analyzed_content.json"
WIKI_FILE = PROJECT_ROOT / "public" / "wiki.html"
METADATA_FILE = PROJECT_ROOT / "data" / "wiki_videos_meta.json"

# Expiration settings
EXPIRATION_DAYS = 30
MAX_VIDEOS_PER_SECTION = 2

# Mapping: wiki section ID -> trending topic names and related creators
# NOTE: This mapping can become stale. Topics change weekly based on YouTube analysis.
# Consider making this dynamic based on analyzed_content.json in future versions.
SECTION_TO_TOPICS = {
    "dairy": ["2026 Carnivore Restart Blueprint", "Carnivore Comfort Food Recipes"],
    "salt": ["Oxalate Dumping Symptoms"],
    "electrolytes": ["Oxalate Dumping Symptoms"],
    "digestion": ["Oxalate Dumping Symptoms"],
    "coffee": ["Vitamin B1 (Thiamine) Concerns"],
    "budget": ["2026 Carnivore Restart Blueprint"],
    "critics": ["2026 Carnivore Restart Blueprint"],
    "organ-meats": ["Oxalate Dumping Symptoms"],
    "scurvy": ["Vitamin B1 (Thiamine) Concerns"],
    "alcohol": ["Carnivore Weight Loss Stalls"],
}


# ============================================================================
# Metadata Management Functions
# ============================================================================

def load_video_metadata():
    """Load existing video metadata from file."""
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Error loading metadata: {e}")
            return None
    return None


def save_video_metadata(metadata):
    """Save video metadata to file."""
    try:
        METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(METADATA_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        print(f"❌ Error saving metadata: {e}")


def initialize_metadata():
    """Create initial metadata structure."""
    return {
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "expiration_days": EXPIRATION_DAYS,
        "sections": {section_id: [] for section_id in SECTION_TO_TOPICS.keys()}
    }


def remove_expired_videos(metadata, days=EXPIRATION_DAYS):
    """Remove videos older than specified days from metadata."""
    cutoff_date = datetime.now() - timedelta(days=days)

    for section_id in metadata.get("sections", {}):
        videos = metadata["sections"][section_id]

        # Keep only videos that are newer than cutoff_date
        active_videos = []
        for video in videos:
            injected_date_str = video.get("injected_date")
            try:
                injected_date = datetime.strptime(injected_date_str, "%Y-%m-%d")
                if injected_date > cutoff_date:
                    active_videos.append(video)
            except (ValueError, TypeError):
                # Invalid date format, keep it
                active_videos.append(video)

        metadata["sections"][section_id] = active_videos

    return metadata


def is_video_already_tracked(section_id, video_id, metadata):
    """Check if video is already in metadata for this section."""
    if not metadata or "sections" not in metadata:
        return False

    videos = metadata.get("sections", {}).get(section_id, [])
    for video in videos:
        if video.get("video_id") == video_id:
            return True

    return False


def add_video_to_metadata(metadata, section_id, video):
    """Add a video to metadata for tracking."""
    if section_id not in metadata["sections"]:
        metadata["sections"][section_id] = []

    # Create metadata entry
    metadata_entry = {
        "video_id": video.get("video_id"),
        "title": video.get("title"),
        "channel": video.get("creator"),
        "injected_date": datetime.now().strftime("%Y-%m-%d"),
        "url": f"https://www.youtube.com/watch?v={video.get('video_id')}"
    }

    metadata["sections"][section_id].append(metadata_entry)


# ============================================================================
# Video Ranking Functions
# ============================================================================

def score_video_relevance(video, section_id, trending_topics):
    """
    Score video by relevance to topic.
    Factors:
    - Creator mentioned in trending topic (weight: 2.0)
    - View count (normalized, weight: 1.0)
    """
    creator = video.get("creator", "").lower()
    score = 0.0

    # Check if creator is mentioned in topics for this section
    for topic_name in SECTION_TO_TOPICS.get(section_id, []):
        for topic in trending_topics:
            if topic.get("topic") == topic_name:
                mentioned_creators = [c.lower() for c in topic.get("mentioned_by", [])]
                if creator_matches(creator, mentioned_creators):
                    score += 2.0
                    break

    # Add view count (normalized)
    view_count = video.get("view_count", 0)
    if isinstance(view_count, str):
        try:
            view_count = int(view_count)
        except ValueError:
            view_count = 0

    # Normalize view count (each 100k views = 1 point)
    score += view_count / 100000.0

    return score


def load_analyzed_content():
    """Load analyzed content from JSON file."""
    if not DATA_FILE.exists():
        print(f"⚠️  No analyzed content found at {DATA_FILE}")
        return None

    with open(DATA_FILE, 'r') as f:
        return json.load(f)


def create_video_links(videos, section_id, trending_topics, metadata=None):
    """
    Create HTML for video links matching the section's topics.

    Only includes videos from top_videos list (high-quality threshold).
    Limits to MAX_VIDEOS_PER_SECTION (default 2) most relevant videos.
    Avoids duplicates by checking metadata.
    """
    matching_videos = []

    for video in videos:
        creator = video.get("creator", "").lower()
        video_id = video.get("video_id", "")

        # Skip if already tracked in metadata
        if is_video_already_tracked(section_id, video_id, metadata):
            continue

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
        return "", []

    # Score and rank videos by relevance
    scored_videos = [
        (score_video_relevance(v, section_id, trending_topics), v)
        for v in matching_videos
    ]
    scored_videos.sort(reverse=True, key=lambda x: x[0])

    # Take only top N videos
    top_videos = [v for score, v in scored_videos[:MAX_VIDEOS_PER_SECTION]]

    if not top_videos:
        return "", []

    # Build HTML for video links
    html_lines = []
    for video in top_videos:
        video_id = video.get("video_id", "")
        title = video.get("title", "Unknown")
        creator = video.get("creator", "Unknown")

        if video_id:
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            html_lines.append(
                f'                <li><a href="{youtube_url}" target="_blank">{title} - {creator}</a></li>'
            )

    html_content = "\n".join(html_lines) if html_lines else ""
    return html_content, top_videos


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


def update_wiki_file(wiki_content, videos, trending_topics, metadata=None):
    """
    Update wiki HTML with video links and timestamps.

    Key features:
    - Clears old auto-injected video divs before adding new ones (prevents duplication)
    - Uses class="wiki-auto-video" marker to identify auto-injected content
    - Limits to top 1-2 videos per section (configurable)
    - Only updates timestamps for sections with new videos
    - Tracks videos in metadata for expiration management
    - Idempotent: running multiple times won't create duplicates
    """
    updated_content = wiki_content
    updated_sections = []  # Track which sections got updated

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

            # CRITICAL FIX: Remove any existing auto-injected video divs from after_placeholder
            # This prevents accumulating duplicates on each run
            auto_video_pattern = r'<div class="wiki-auto-video"[^>]*>.*?</div>\s*'
            cleaned_after = re.sub(auto_video_pattern, '', after_placeholder, flags=re.DOTALL)

            # Get video links for this section (respects metadata and limits to top videos)
            video_links_html, selected_videos = create_video_links(videos, section_id, trending_topics, metadata)

            if video_links_html:
                # This section is getting updated, so track it
                updated_sections.append(section_id)

                # Build replacement with video list
                # Use class="wiki-auto-video" marker so we can identify and clean these later
                video_list_html = (
                    f'{placeholder}\n'
                    f'                <div class="wiki-auto-video" data-injected="{datetime.now().strftime("%Y-%m-%d")}">\n'
                    f'                    <p style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px;"><strong>Related videos this week:</strong></p>\n'
                    f'                    <ul style="margin: 10px 0; padding-left: 20px; background: #f5f5f5; border-radius: 8px; padding: 15px;">\n'
                    f'{video_links_html}\n'
                    f'                    </ul>\n'
                    f'                </div>'
                )

                # Build the replacement section with updated timestamp
                today = datetime.now().strftime("%B %d, %Y")
                old_timestamp_pattern = r'<span class="last-updated">📅 Last Updated: .*?</span>'
                new_timestamp = f'<span class="last-updated">📅 Last Updated: {today}</span>'

                # Update the timestamp in this section's content
                new_before = re.sub(
                    old_timestamp_pattern,
                    new_timestamp,
                    before_placeholder
                )

                # Build the replacement section with cleaned content
                # Use cleaned_after instead of after_placeholder to avoid duplicates
                new_section = (
                    f'<div class="topic" id="{section_id}">{new_before}{video_list_html}{cleaned_after}</div>'
                )

                # Replace in the document
                old_section = match.group(0)
                updated_content = updated_content.replace(old_section, new_section, 1)

                # Track videos in metadata
                if metadata:
                    for video in selected_videos:
                        if not is_video_already_tracked(section_id, video.get("video_id"), metadata):
                            add_video_to_metadata(metadata, section_id, video)

    return updated_content, updated_sections


def main():
    """Main workflow."""
    print("🔄 Updating wiki with video links...")
    print(f"   📁 Settings: Max {MAX_VIDEOS_PER_SECTION} videos/section, {EXPIRATION_DAYS} day expiration")
    print()

    # Load or initialize metadata
    metadata = load_video_metadata()
    if metadata is None:
        print("   📝 Creating new metadata file...")
        metadata = initialize_metadata()
    else:
        print(f"   📝 Loaded existing metadata ({METADATA_FILE})")

    # Remove expired videos from metadata
    print(f"   ⏰ Checking for expired videos (older than {EXPIRATION_DAYS} days)...")
    expired_before = sum(len(v) for v in metadata.get("sections", {}).values())
    metadata = remove_expired_videos(metadata)
    expired_after = sum(len(v) for v in metadata.get("sections", {}).values())
    expired_removed = expired_before - expired_after

    if expired_removed > 0:
        print(f"      ✓ Removed {expired_removed} expired video(s)")
    else:
        print(f"      ✓ No expired videos found")
    print()

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

    # Update wiki with video links (with metadata to prevent duplicates)
    print("   🔍 Processing sections...")
    updated_wiki, updated_sections = update_wiki_file(wiki_content, videos, trending_topics, metadata)

    # Write updated wiki
    with open(WIKI_FILE, 'w') as f:
        f.write(updated_wiki)

    # Save updated metadata
    metadata["last_updated"] = datetime.now().strftime("%Y-%m-%d")
    save_video_metadata(metadata)

    print()
    print(f"✅ Wiki updated successfully")
    print(f"   📅 Updated {len(updated_sections)} section(s) with new videos")
    if updated_sections:
        print(f"      Sections: {', '.join(updated_sections)}")
    else:
        print(f"      No new videos to inject (all videos already tracked or expired)")
    print(f"   🎥 Processed {len(videos)} top video(s)")
    print(f"   📊 Matched against {len(trending_topics)} trending topic(s)")
    print(f"   💾 Metadata saved to {METADATA_FILE}")

    # Summary statistics
    total_tracked = sum(len(v) for v in metadata.get("sections", {}).values())
    print(f"   📈 Total videos currently tracked: {total_tracked}")


if __name__ == "__main__":
    main()

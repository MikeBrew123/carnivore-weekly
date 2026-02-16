#!/usr/bin/env python3
"""
YouTube Data Collector for Carnivore Diet Content

This script searches YouTube for carnivore diet content, identifies the top
creators by total views in the past week, and collects detailed information
about their recent videos including comments.

Author: Created with Claude Code
Date: 2024-12-25
"""

import os
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List
from collections import defaultdict

# Third-party imports
# These need to be installed: pip install google-api-python-client python-dotenv
from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Supabase for caching API responses
try:
    from supabase import create_client
except ImportError:
    print("Warning: Supabase client not installed. Install with: pip install supabase")
    create_client = None

# Anthropic for relevance scoring
try:
    from anthropic import Anthropic
except ImportError:
    print("Warning: Anthropic client not installed. Install with: pip install anthropic")
    Anthropic = None

# Load environment variables from .env file
# This keeps sensitive data like API keys out of your code
load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

# Get YouTube API key from environment variables
# Never hardcode API keys in your scripts!
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Define file paths using pathlib (more reliable than string concatenation)
# __file__ gives us the path to this script
# .parent.parent goes up two levels to the project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_FILE = DATA_DIR / "youtube_data.json"

# Search parameters
SEARCH_QUERIES = ["carnivore diet", "animal-based diet", "meat only diet", "zero carb diet"]
DAYS_BACK = 7  # How many days back to search
TOP_CREATORS_COUNT = 12  # How many top creators to analyze (increased for diversity)
MAX_VIDEOS_PER_CREATOR = 2  # Max videos per creator (enforces diversity)
COMMENTS_PER_VIDEO = 20  # Top comments per video
MIN_RELEVANCE_SCORE = 7  # Minimum Claude relevance score (1-10)

# PERMANENT BLOCKLIST - Channels that should NEVER appear
# Categories: "off-topic" = not carnivore content, "opposing-stance" = anti-carnivore advocacy
BLOCKED_CHANNELS = {
    "off-topic": [
        "Ouachita Mountain Living",  # General lifestyle/cultural commentary
    ],
    "opposing-stance": [
        "Mic the Vegan",  # Anti-carnivore advocacy channel
    ],
}


def is_blocked_channel(channel_name):
    """Check if channel is on any blocklist. Returns (blocked, reason) tuple."""
    for reason, names in BLOCKED_CHANNELS.items():
        if any(blocked.lower() in channel_name.lower() for blocked in names):
            return True, reason
    return False, None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def format_number(num: int) -> str:
    """
    Format large numbers with commas for readability

    Args:
        num: Integer to format

    Returns:
        Formatted string (e.g., 1000000 -> "1,000,000")
    """
    return f"{num:,}"


def get_date_filter() -> str:
    """
    Calculate the date filter for YouTube API (7 days ago)

    YouTube API requires dates in RFC 3339 format (ISO 8601)
    Example: 2024-12-18T00:00:00Z

    Returns:
        Date string in RFC 3339 format
    """
    # Get current time
    now = datetime.utcnow()

    # Subtract 7 days
    past_date = now - timedelta(days=DAYS_BACK)

    # Format as RFC 3339 (Z means UTC timezone)
    return past_date.strftime("%Y-%m-%dT%H:%M:%SZ")


def is_less_than_24_hours_old(timestamp_str: str) -> bool:
    """
    Check if a timestamp is less than 24 hours old

    Args:
        timestamp_str: ISO format timestamp string

    Returns:
        True if timestamp is within last 24 hours, False otherwise
    """
    try:
        # Parse the timestamp
        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

        # Get current time (timezone-aware)
        now = datetime.now(timestamp.tzinfo)

        # Calculate age
        age = now - timestamp

        # Return True if less than 24 hours old
        return age < timedelta(hours=24)
    except (ValueError, AttributeError):
        # If we can't parse the timestamp, assume it's old
        return False


def is_likely_english(text: str) -> bool:
    """
    Check if text is likely English by detecting non-Latin characters.

    Filters out videos with titles containing:
    - Japanese (Hiragana, Katakana, Kanji)
    - Chinese (Hanzi)
    - Korean (Hangul)
    - Arabic, Thai, Devanagari, etc.

    Args:
        text: Video title or description to check

    Returns:
        True if text appears to be English (Latin characters), False otherwise
    """
    if not text:
        return True  # Empty text is fine

    # Count non-Latin characters
    non_latin_count = 0
    total_chars = 0

    for char in text:
        # Skip spaces, numbers, and punctuation
        if char.isspace() or char.isdigit() or not char.isalnum():
            continue

        total_chars += 1

        # Check if character is outside Latin character range
        # Latin: Basic Latin (0000-007F) + Latin-1 Supplement (0080-00FF) +
        #        Latin Extended-A (0100-017F) + Latin Extended-B (0180-024F)
        if ord(char) > 0x024F:
            non_latin_count += 1

    # If we have no alphanumeric characters, assume English
    if total_chars == 0:
        return True

    # If more than 20% of characters are non-Latin, reject as non-English
    non_latin_ratio = non_latin_count / total_chars
    return non_latin_ratio < 0.2


# ============================================================================
# MAIN COLLECTOR CLASS
# ============================================================================


class YouTubeCollector:
    """
    Collects carnivore diet content from YouTube

    This class handles all interactions with the YouTube Data API v3,
    including searching for videos, getting channel info, and fetching comments.
    """

    def __init__(self, api_key: str):
        """
        Initialize the YouTube API client

        Args:
            api_key: Your YouTube Data API v3 key

        Raises:
            ValueError: If API key is missing or invalid
        """
        if not api_key:
            raise ValueError(
                "YouTube API key not found! " "Please set YOUTUBE_API_KEY in your .env file"
            )

        # Build the YouTube service object
        # This is our connection to YouTube's API
        try:
            self.youtube = build("youtube", "v3", developerKey=api_key)
            print("✓ YouTube API client initialized")
        except Exception as e:
            raise ValueError(f"Failed to initialize YouTube API: {e}")

        # Initialize Supabase client for caching
        self.supabase = None
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if supabase_url and supabase_key and create_client:
                self.supabase = create_client(supabase_url, supabase_key)
                print("✓ Supabase client initialized (data caching enabled)")
            else:
                print("⚠ Supabase not configured - data will only be saved to JSON")
        except Exception as e:
            print(f"⚠ Warning: Could not initialize Supabase: {e}")

        # Initialize Anthropic client for relevance scoring
        self.anthropic = None
        try:
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            if anthropic_key and Anthropic:
                self.anthropic = Anthropic(api_key=anthropic_key)
                print("✓ Claude API initialized (smart content filtering enabled)")
            else:
                print("⚠ Claude API not configured - using basic keyword filtering")
        except Exception as e:
            print(f"⚠ Warning: Could not initialize Claude API: {e}")

    def load_from_cache(self) -> Dict:
        """
        Load recent data from Supabase cache if available

        Checks if we have data less than 24 hours old in Supabase.
        If so, returns it instead of making API calls.

        Returns:
            Cached data dictionary, or empty dict if no valid cache
        """
        if not self.supabase:
            return {}

        try:
            print("\n🔍 Checking Supabase for recent cached data...")

            # Query for most recent collection timestamp
            response = (
                self.supabase.table("youtube_videos")
                .select("*")
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )

            if not response.data:
                print("   ⚠ No cached data found")
                return {}

            # Check if data is less than 24 hours old
            most_recent = response.data[0]
            updated_at = most_recent.get("updated_at")

            if not updated_at or not is_less_than_24_hours_old(updated_at):
                print("   ⚠ Cached data is older than 24 hours")
                return {}

            # Data is fresh - load all videos from cache
            print(f"   ✓ Found recent data (updated: {updated_at})")
            print("   Loading full dataset from cache...")

            all_videos_response = self.supabase.table("youtube_videos").select("*").execute()

            if not all_videos_response.data:
                return {}

            # Convert Supabase data back to our JSON format
            videos_by_channel = defaultdict(list)
            for video in all_videos_response.data:
                channel_id = video.get("channel_id")
                if channel_id:
                    videos_by_channel[channel_id].append(
                        {
                            "video_id": video.get("youtube_id"),
                            "title": video.get("title") or "",
                            "channel_name": video.get("channel_name") or "Unknown",
                            "description": video.get("description") or "",
                            "thumbnail_url": video.get("thumbnail_url") or "",
                            "published_at": video.get("published_at") or "",
                            "statistics": {
                                "view_count": video.get("view_count") or 0,
                                "like_count": video.get("like_count") or 0,
                                "comment_count": video.get("comment_count") or 0,
                            },
                            "tags": video.get("topic_tags") or [],
                            "top_comments": video.get("top_comments") or [],
                            "comment_sentiment": video.get("comment_sentiment"),
                        }
                    )

            # Reconstruct top_creators structure
            top_creators = []
            for channel_id, videos in videos_by_channel.items():
                if videos:
                    channel_name = videos[0].get("channel_name", "Unknown")
                    total_views = sum(v["statistics"]["view_count"] for v in videos)
                    top_creators.append(
                        {
                            "channel_id": channel_id,
                            "channel_name": channel_name,
                            "total_views_week": total_views,
                            "videos": videos,
                        }
                    )

            # Sort by total views
            top_creators.sort(key=lambda x: x["total_views_week"], reverse=True)

            cached_data = {
                "collection_date": datetime.now().strftime("%Y-%m-%d"),
                "collection_timestamp": datetime.now().isoformat(),
                "search_queries": SEARCH_QUERIES,
                "days_back": DAYS_BACK,
                "total_videos_found": len(all_videos_response.data),
                "top_creators_count": len(top_creators),
                "top_creators": top_creators,
                "source": "cache",
            }

            print(f"   ✓ Loaded {len(all_videos_response.data)} videos from cache")
            return cached_data

        except Exception as e:
            print(f"   ⚠ Error loading from cache: {e}")
            return {}

    def score_video_relevance(self, title: str, description: str) -> tuple:
        """
        Score video relevance to carnivore diet content using Claude API

        Args:
            title: Video title
            description: Video description

        Returns:
            Tuple of (score: int, reason: str)
        """
        if not self.anthropic:
            # Fallback: basic keyword matching
            text = (title + " " + description).lower()
            carnivore_keywords = ["carnivore", "meat", "beef", "animal-based", "zero carb"]
            if any(kw in text for kw in carnivore_keywords):
                return (8, "Contains carnivore keywords")
            return (5, "No specific carnivore keywords")

        try:
            prompt = f"""Score this video's relevance to CARNIVORE DIET content (1-10):

Title: {title}
Description: {description[:500]}

CARNIVORE DIET = eating only animal products (meat, fish, eggs, dairy). Content must discuss this eating style.

Scoring guidelines:
- 9-10: Directly about carnivore/animal-based diet (recipes, results, protocols, experiences, "what I eat")
- 7-8: Carnivore-adjacent topics (keto for carnivore, exercise ON carnivore, health improvements FROM carnivore)
- 4-6: General health/fitness that MENTIONS carnivore but isn't focused on it
- 1-3: Off-topic (general commentary, societal issues, generic fitness without carnivore)
- 1: Anti-carnivore advocacy (content attacking, debunking, or discouraging carnivore diet)

REJECT if: Video is about general lifestyle, culture, society, or fitness WITHOUT carnivore diet context.
ACCEPT if: Video discusses carnivore diet, eating carnivore, living carnivore, or health changes from carnivore.

Return ONLY valid JSON: {{"score": X, "reason": "brief reason"}}"""

            response = self.anthropic.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}],
            )

            result_text = response.content[0].text.strip()
            # Parse JSON response
            import json

            result = json.loads(result_text)
            return (result["score"], result["reason"])

        except Exception as e:
            print(f"   ⚠ Claude scoring failed: {e}")
            # Fallback to basic keyword matching
            text = (title + " " + description).lower()
            if "carnivore" in text or "meat diet" in text:
                return (7, "Fallback: contains carnivore keywords")
            return (5, "Fallback: relevance unclear")

    def enforce_creator_diversity(self, videos: List[Dict]) -> List[Dict]:
        """
        Limit videos per creator to ensure diversity

        Args:
            videos: List of videos with view counts

        Returns:
            Filtered list with max MAX_VIDEOS_PER_CREATOR per creator
        """
        videos_by_creator = defaultdict(list)

        for video in videos:
            creator_id = video.get("channel_id")
            if creator_id:
                videos_by_creator[creator_id].append(video)

        # Take top MAX_VIDEOS_PER_CREATOR videos per creator, sorted by views
        diverse_videos = []
        for creator_id, creator_videos in videos_by_creator.items():
            # Sort by view count (descending)
            sorted_videos = sorted(
                creator_videos,
                key=lambda v: v.get("statistics", {}).get("view_count", 0),
                reverse=True,
            )
            diverse_videos.extend(sorted_videos[:MAX_VIDEOS_PER_CREATOR])

        return diverse_videos

    def log_rejected_video(self, video: Dict, score: int, reason: str):
        """
        Log rejected video to Supabase for analysis

        Args:
            video: Video metadata
            score: Relevance score
            reason: Rejection reason
        """
        if not self.supabase:
            return

        try:
            self.supabase.table("rejected_videos").insert(
                {
                    "video_id": video.get("video_id"),
                    "title": video.get("title"),
                    "channel_name": video.get("channel_title"),
                    "relevance_score": score,
                    "rejection_reason": reason,
                    "published_at": video.get("published_at"),
                }
            ).execute()
        except Exception as e:
            # Silent fail - logging is not critical
            pass

    def search_videos(self, query: str, max_results: int = 50) -> List[Dict]:
        """
        Search YouTube for videos matching a query

        This is Step 1: Find all carnivore diet videos from the past week

        Args:
            query: Search term (e.g., "carnivore diet")
            max_results: Maximum number of results to return (max 50 per request)

        Returns:
            List of video dictionaries with basic info
        """
        print(f"\n🔍 Searching YouTube for '{query}'...")
        print(f"   Looking back {DAYS_BACK} days")

        try:
            # Build the search request
            # part='snippet' means we want video metadata (title, description, etc.)
            request = self.youtube.search().list(
                part="snippet",
                q=query,
                type="video",  # Only search for videos (not channels or playlists)
                order="viewCount",  # Sort by most viewed
                publishedAfter=get_date_filter(),  # Only videos from past week
                maxResults=max_results,
                relevanceLanguage="en",  # Prefer English content
                safeSearch="none",  # Don't filter content
            )

            # Execute the API request
            response = request.execute()

            # Extract video items from response
            videos = response.get("items", [])

            print(f"✓ Found {len(videos)} videos")

            # Transform API response into cleaner format
            cleaned_videos = []
            for video in videos:
                # Extract thumbnail URL (prefer medium, fallback to default)
                thumbnails = video["snippet"].get("thumbnails", {})
                thumbnail_url = (
                    thumbnails.get("medium", {}).get("url")
                    or thumbnails.get("default", {}).get("url")
                    or ""
                )

                cleaned_videos.append(
                    {
                        "video_id": video["id"]["videoId"],
                        "channel_id": video["snippet"]["channelId"],
                        "channel_title": video["snippet"]["channelTitle"],
                        "title": video["snippet"]["title"],
                        "published_at": video["snippet"]["publishedAt"],
                        "thumbnail_url": thumbnail_url,
                        "description": video["snippet"].get("description", ""),
                    }
                )

            return cleaned_videos

        except HttpError as e:
            print(f"✗ YouTube API error: {e}")
            return []

    def get_video_statistics(self, video_ids: List[str]) -> Dict[str, Dict]:
        """
        Get detailed statistics for multiple videos

        YouTube API allows batch requests (up to 50 video IDs at once)
        This is more efficient than requesting one video at a time

        Args:
            video_ids: List of YouTube video IDs

        Returns:
            Dictionary mapping video_id -> statistics
        """
        if not video_ids:
            return {}

        print(f"   Fetching statistics for {len(video_ids)} videos...")

        stats_dict = {}

        try:
            # YouTube API allows max 50 IDs per request — batch in chunks
            for i in range(0, len(video_ids), 50):
                chunk = video_ids[i:i + 50]
                video_ids_str = ",".join(chunk)

                request = self.youtube.videos().list(
                    part="statistics", id=video_ids_str
                )
                response = request.execute()

                # Build dictionary of video_id -> stats
                for item in response.get("items", []):
                    video_id = item["id"]
                    stats = item["statistics"]

                    stats_dict[video_id] = {
                        "view_count": int(stats.get("viewCount", 0)),
                        "like_count": int(stats.get("likeCount", 0)),
                        "comment_count": int(stats.get("commentCount", 0)),
                    }

            return stats_dict

        except HttpError as e:
            print(f"   ✗ Error fetching statistics: {e}")
            return {}

    def calculate_channel_rankings(self, videos: List[Dict]) -> List[Dict]:
        """
        Calculate total views per channel and rank them

        This is Step 2: From all videos found, determine which channels
        are most popular based on total views in the past week

        Args:
            videos: List of video dictionaries from search

        Returns:
            List of top channels sorted by total views (descending)
        """
        print(f"\n📊 Calculating channel rankings...")

        # Extract all unique video IDs
        video_ids = [v["video_id"] for v in videos]

        # Get statistics for all videos
        stats = self.get_video_statistics(video_ids)

        # Dictionary to accumulate views per channel
        # defaultdict creates missing keys automatically with default value (0)
        channel_views = defaultdict(int)
        channel_names = {}  # Store channel names

        # Sum up total views for each channel
        # Filter out live/upcoming videos that report 0 views
        filtered_count = 0
        for video in videos:
            video_id = video["video_id"]
            channel_id = video["channel_id"]

            # Get view count from stats (default to 0 if not found)
            views = stats.get(video_id, {}).get("view_count", 0)

            # Skip videos with 0 views — these are live/upcoming broadcasts
            # that haven't accumulated real engagement data yet
            if views == 0:
                filtered_count += 1
                continue

            # Add to channel's total
            channel_views[channel_id] += views

            # Remember channel name
            channel_names[channel_id] = video["channel_title"]

        if filtered_count > 0:
            print(f"   Filtered {filtered_count} live/upcoming videos (0 views)")

        # Convert to list of dictionaries and sort by views
        ranked_channels = [
            {
                "channel_id": channel_id,
                "channel_name": channel_names[channel_id],
                "total_views_week": views,
            }
            for channel_id, views in channel_views.items()
        ]

        # Sort by total views (highest first)
        ranked_channels.sort(key=lambda x: x["total_views_week"], reverse=True)

        # Print top channels
        print(f"\n   Top {TOP_CREATORS_COUNT} Channels by Views (past {DAYS_BACK} days):")
        for i, channel in enumerate(ranked_channels[:TOP_CREATORS_COUNT], 1):
            print(
                f"   {i}. {channel['channel_name']}: "
                f"{format_number(channel['total_views_week'])} views"
            )

        return ranked_channels[:TOP_CREATORS_COUNT]

    def get_channel_videos(self, channel_id: str, max_results: int = 5) -> List[Dict]:
        """
        Get recent videos from a specific channel

        Args:
            channel_id: YouTube channel ID
            max_results: Number of recent videos to fetch

        Returns:
            List of video dictionaries with full details
        """
        try:
            # Search for videos from this channel only
            request = self.youtube.search().list(
                part="snippet",
                channelId=channel_id,
                type="video",
                order="date",  # Most recent first
                publishedAfter=get_date_filter(),
                maxResults=max_results,
            )

            response = request.execute()
            videos = response.get("items", [])

            # Get video IDs
            video_ids = [v["id"]["videoId"] for v in videos]

            if not video_ids:
                return []

            # Get detailed information for each video
            return self._get_detailed_video_info(video_ids)

        except HttpError as e:
            print(f"   ✗ Error fetching videos for channel: {e}")
            return []

    @staticmethod
    def _parse_duration_seconds(duration_str: str) -> int:
        """Parse ISO 8601 duration (PT1H2M3S) to seconds."""
        import re
        match = re.match(
            r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str or ""
        )
        if not match:
            return 0
        h = int(match.group(1) or 0)
        m = int(match.group(2) or 0)
        s = int(match.group(3) or 0)
        return h * 3600 + m * 60 + s

    def _get_video_durations(self, video_ids: List[str]) -> Dict[str, int]:
        """Fetch durations for videos missing duration_seconds."""
        durations = {}
        try:
            for i in range(0, len(video_ids), 50):
                chunk = video_ids[i:i + 50]
                resp = self.youtube.videos().list(
                    part="contentDetails", id=",".join(chunk)
                ).execute()
                for item in resp.get("items", []):
                    dur = item.get("contentDetails", {}).get("duration", "")
                    durations[item["id"]] = self._parse_duration_seconds(dur)
        except HttpError as e:
            print(f"   ⚠ Could not fetch durations: {e}")
        return durations

    def _get_detailed_video_info(self, video_ids: List[str]) -> List[Dict]:
        """
        Get complete details for videos (private helper method)

        The underscore prefix (_) indicates this is a private method
        meant to be used only within this class

        Args:
            video_ids: List of video IDs to fetch details for

        Returns:
            List of detailed video dictionaries
        """
        try:
            detailed_videos = []

            # Batch in chunks of 50 (YouTube API limit)
            for i in range(0, len(video_ids), 50):
                chunk = video_ids[i:i + 50]
                video_ids_str = ",".join(chunk)

                # Include contentDetails for duration (shorts filter)
                request = self.youtube.videos().list(
                    part="snippet,statistics,contentDetails",
                    id=video_ids_str,
                )
                response = request.execute()

                for item in response.get("items", []):
                    snippet = item["snippet"]
                    stats = item["statistics"]
                    content = item.get("contentDetails", {})

                    # Filter shorts (< 60 seconds)
                    duration_sec = self._parse_duration_seconds(
                        content.get("duration", "")
                    )
                    if 0 < duration_sec < 60:
                        print(
                            f"   ✗ Skipped short ({duration_sec}s):"
                            f" {snippet['title'][:50]}..."
                        )
                        continue

                    thumbnails = snippet.get("thumbnails", {})
                    thumbnail_url = (
                        thumbnails.get("medium", {}).get("url")
                        or thumbnails.get("default", {}).get("url")
                        or ""
                    )

                    view_count = int(stats.get("viewCount", 0))

                    # Skip live/upcoming videos with 0 views
                    if view_count == 0:
                        continue

                    video_data = {
                        "video_id": item["id"],
                        "title": snippet["title"],
                        "description": snippet["description"],
                        "thumbnail_url": thumbnail_url,
                        "published_at": snippet["publishedAt"],
                        "duration_seconds": duration_sec,
                        "statistics": {
                            "view_count": view_count,
                            "like_count": int(stats.get("likeCount", 0)),
                            "comment_count": int(
                                stats.get("commentCount", 0)
                            ),
                        },
                        "tags": snippet.get("tags", []),
                        "top_comments": [],
                    }

                    detailed_videos.append(video_data)

            return detailed_videos

        except HttpError as e:
            print(f"   ✗ Error fetching video details: {e}")
            return []

    def get_video_comments(self, video_id: str, max_results: int = 20) -> List[Dict]:
        """
        Get top comments for a video, sorted by like count

        Args:
            video_id: YouTube video ID
            max_results: Number of top comments to fetch

        Returns:
            List of comment dictionaries
        """
        try:
            # Request comment threads (top-level comments only, not replies)
            request = self.youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                order="relevance",  # YouTube's algorithm for "best" comments
                maxResults=max_results,
                textFormat="plainText",  # Get text without HTML formatting
            )

            response = request.execute()

            comments = []

            for item in response.get("items", []):
                # Comment data is nested in topLevelComment
                comment = item["snippet"]["topLevelComment"]["snippet"]

                comments.append(
                    {
                        "text": comment["textDisplay"],
                        "author": comment["authorDisplayName"],
                        "likes": comment.get("likeCount", 0),
                        "published_at": comment["publishedAt"],
                    }
                )

            # Sort by like count (highest first)
            # YouTube's 'relevance' order isn't always by likes
            comments.sort(key=lambda x: x["likes"], reverse=True)

            return comments[:max_results]

        except HttpError as e:
            # Some videos have comments disabled
            # This is expected, not an error
            if "commentsDisabled" in str(e):
                return []
            print(f"   ⚠ Could not fetch comments: {e}")
            return []

    def collect_all_data(self) -> Dict:
        """
        Main collection method - orchestrates the entire data collection process

        This method ties everything together:
        1. Check Supabase cache for recent data (< 24 hours old)
        2. If cache hit: return cached data and update JSON
        3. If cache miss: Search for carnivore diet videos
        4. Rank channels by total views
        5. Get detailed info for top channels
        6. Collect comments for each video

        Returns:
            Complete data dictionary ready to be saved as JSON
        """
        print("\n" + "=" * 70)
        print("🥩 CARNIVORE DIET YOUTUBE DATA COLLECTOR")
        print("=" * 70)

        # Step 0: Check Supabase cache first
        cached_data = self.load_from_cache()
        if cached_data:
            print("\n✓ Using cached data from Supabase (skipping API calls)")
            print("   This saves your YouTube API quota!")

            # IMPORTANT: Filter cached videos through Claude to ensure quality
            print("\n🤖 Running content filter on cached videos...")
            cached_creators = cached_data.get("top_creators", [])
            filtered_creators = []
            total_filtered = 0
            total_kept = 0

            for creator in cached_creators:
                # Skip blocked channels
                channel_name = creator.get("channel_name", "")
                blocked, block_reason = is_blocked_channel(channel_name)
                if blocked:
                    print(f"   ✗ BLOCKED: {channel_name} ({block_reason})")
                    for video in creator.get("videos", []):
                        self.log_rejected_video(video, 0, f"{block_reason} creator")
                    total_filtered += len(creator.get("videos", []))
                    continue

                # Fetch durations for shorts filtering if missing
                vids_needing_duration = [
                    v["video_id"] for v in creator.get("videos", [])
                    if "duration_seconds" not in v
                ]
                if vids_needing_duration and self.youtube:
                    dur_info = self._get_video_durations(vids_needing_duration)
                    for v in creator.get("videos", []):
                        if v["video_id"] in dur_info:
                            v["duration_seconds"] = dur_info[v["video_id"]]

                filtered_videos = []
                for video in creator.get("videos", []):
                    # Filter shorts (< 60 seconds)
                    dur = video.get("duration_seconds", 999)
                    if 0 < dur < 60:
                        total_filtered += 1
                        title = video.get("title", "")
                        print(f"   ✗ Filtered (short {dur}s): {title[:50]}...")
                        continue

                    # Filter out non-English videos first
                    title = video.get("title", "")
                    if not is_likely_english(title):
                        total_filtered += 1
                        print(f"   ✗ Filtered (non-English): {title[:50]}...")
                        continue

                    # Check if video already has a score
                    if "relevance_score" not in video or video.get("relevance_score") == "N/A":
                        # Score it with Claude
                        score, reason = self.score_video_relevance(
                            video.get("title", ""), video.get("description", "")
                        )
                        video["relevance_score"] = score
                        video["relevance_reason"] = reason
                    else:
                        score = video["relevance_score"]

                    # Keep only videos that meet minimum relevance threshold
                    if score >= MIN_RELEVANCE_SCORE:
                        filtered_videos.append(video)
                        total_kept += 1
                    else:
                        total_filtered += 1
                        print(
                            f"   ✗ Filtered: {video.get('title', 'Unknown')[:50]}... (score: {score})"
                        )

                # Only keep creator if they have videos that passed
                if filtered_videos:
                    creator["videos"] = filtered_videos
                    filtered_creators.append(creator)

            print(f"   ✓ Kept: {total_kept} videos (score >= {MIN_RELEVANCE_SCORE})")
            print(f"   ✗ Filtered out: {total_filtered} off-topic videos")

            # Update cached data with filtered results
            cached_data["top_creators"] = filtered_creators
            cached_data["top_creators_count"] = len(filtered_creators)
            return cached_data

        # No cache hit - proceed with API calls
        print("\n⚠ No recent cache found - fetching fresh data from YouTube API")

        # Step 1: Search for videos using multiple queries
        all_videos = []
        seen_video_ids = set()

        for query in SEARCH_QUERIES:
            print(f"\n🔍 Query: '{query}'")
            query_videos = self.search_videos(query, max_results=30)

            # Deduplicate and filter non-English videos
            for video in query_videos:
                video_id = video.get("video_id")
                if video_id not in seen_video_ids:
                    # Filter out non-English videos by title
                    title = video.get("title", "")
                    if not is_likely_english(title):
                        print(f"   ✗ Skipped non-English: {title[:60]}...")
                        continue

                    all_videos.append(video)
                    seen_video_ids.add(video_id)

        print(f"\n✓ Total unique videos found: {len(all_videos)}")

        if not all_videos:
            print("✗ No videos found. Exiting.")
            return {}

        # Step 1.5: Filter by relevance using Claude
        print(f"\n🤖 Filtering by relevance (min score: {MIN_RELEVANCE_SCORE})...")
        relevant_videos = []
        rejected_count = 0

        for video in all_videos:
            score, reason = self.score_video_relevance(
                video.get("title", ""), video.get("description", "")
            )

            if score >= MIN_RELEVANCE_SCORE:
                video["relevance_score"] = score
                video["relevance_reason"] = reason
                relevant_videos.append(video)
            else:
                rejected_count += 1
                self.log_rejected_video(video, score, reason)

        print(f"   ✓ Kept: {len(relevant_videos)} videos (score >= {MIN_RELEVANCE_SCORE})")
        print(f"   ✗ Rejected: {rejected_count} videos (score < {MIN_RELEVANCE_SCORE})")

        # Step 1.6: Filter blocked channels (not caught by relevance scoring)
        pre_block_count = len(relevant_videos)
        filtered_relevant = []
        for video in relevant_videos:
            ch_name = video.get("channel_title", "") or video.get("channel_name", "")
            blocked, block_reason = is_blocked_channel(ch_name)
            if blocked:
                self.log_rejected_video(video, 0, f"{block_reason} creator")
                print(f"   ✗ BLOCKED: {ch_name} ({block_reason})")
            else:
                filtered_relevant.append(video)
        relevant_videos = filtered_relevant
        blocked_count = pre_block_count - len(relevant_videos)
        if blocked_count:
            print(f"   ✗ Blocked: {blocked_count} videos from blocklisted channels")

        if not relevant_videos:
            print("✗ No relevant videos after filtering. Exiting.")
            return {}

        # Step 2: Rank channels
        top_channels = self.calculate_channel_rankings(relevant_videos)

        if not top_channels:
            print("✗ Could not rank channels. Exiting.")
            return {}

        # Step 3: Collect detailed data for top channels
        print(f"\n📹 Collecting detailed data for top {TOP_CREATORS_COUNT} channels...")

        for i, channel in enumerate(top_channels, 1):
            channel_id = channel["channel_id"]
            channel_name = channel["channel_name"]

            print(f"\n   [{i}/{TOP_CREATORS_COUNT}] {channel_name}")
            print(f"   Channel ID: {channel_id}")

            # Get recent videos from this channel (limited per creator for diversity)
            videos = self.get_channel_videos(channel_id, MAX_VIDEOS_PER_CREATOR)
            print(f"   ✓ Found {len(videos)} recent videos")

            # For each video, score relevance and get comments
            scored_videos = []
            for video in videos:
                # Filter out non-English videos first (before scoring with Claude)
                title = video.get("title", "")
                if not is_likely_english(title):
                    print(f"      ✗ Skipped (non-English): {title[:45]}...")
                    continue

                # Score this video's relevance
                score, reason = self.score_video_relevance(
                    video.get("title", ""), video.get("description", "")
                )
                video["relevance_score"] = score
                video["relevance_reason"] = reason

                # Only include videos that pass the relevance threshold
                if score < MIN_RELEVANCE_SCORE:
                    print(f"      ✗ Skipped (score {score}): {video['title'][:45]}...")
                    continue

                print(f"      Getting comments for: {video['title'][:50]}...")
                comments = self.get_video_comments(video["video_id"], COMMENTS_PER_VIDEO)
                video["top_comments"] = comments
                print(f"      ✓ Collected {len(comments)} comments (score: {score})")
                scored_videos.append(video)

            # Add scored videos to channel data
            channel["videos"] = scored_videos

        # Step 4: Build final data structure
        final_data = {
            "collection_date": datetime.now().strftime("%Y-%m-%d"),
            "collection_timestamp": datetime.now().isoformat(),
            "search_queries": SEARCH_QUERIES,
            "days_back": DAYS_BACK,
            "total_videos_found": len(relevant_videos),
            "videos_per_creator_max": MAX_VIDEOS_PER_CREATOR,
            "min_relevance_score": MIN_RELEVANCE_SCORE,
            "top_creators_count": len(top_channels),
            "top_creators": top_channels,
            "source": "api",  # Mark as fresh API data (vs 'cache')
        }

        return final_data

    def save_data(self, data: Dict, output_file: Path = OUTPUT_FILE):
        """
        Save collected data to JSON file

        Args:
            data: Dictionary to save
            output_file: Path to output JSON file
        """
        if not data:
            print("\n✗ No data to save")
            return

        # Create data directory if it doesn't exist
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Write JSON with nice formatting (indent=2)
        # ensure_ascii=False allows unicode characters (emojis, etc.)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print("\n" + "=" * 70)
        print("✓ DATA COLLECTION COMPLETE!")
        print("=" * 70)
        print(f"\n📁 Data saved to: {output_file}")
        print(f"📊 Total creators analyzed: {data['top_creators_count']}")

        # Calculate total videos collected
        total_videos = sum(len(c["videos"]) for c in data["top_creators"])
        print(f"📹 Total videos collected: {total_videos}")

        # Calculate total comments collected
        total_comments = sum(
            len(v["top_comments"]) for c in data["top_creators"] for v in c["videos"]
        )
        print(f"💬 Total comments collected: {total_comments}")
        print()

        # Also save to Supabase for caching
        self.save_to_supabase(data)

    def save_to_supabase(self, data: Dict):
        """
        Save collected YouTube videos to Supabase for caching
        Reduces API calls on subsequent runs by reading from cache instead of YouTube API

        Args:
            data: Dictionary with top_creators and their videos
        """
        if not self.supabase:
            return

        try:
            print("\n📊 Syncing data to Supabase...")
            videos_inserted = 0

            for creator in data.get("top_creators", []):
                channel_name = creator.get("channel_name", "Unknown")

                for video in creator.get("videos", []):
                    try:
                        # Prepare video record for Supabase
                        video_record = {
                            "youtube_id": video.get("video_id"),
                            "channel_name": channel_name,
                            "channel_id": creator.get("channel_id", ""),
                            "title": video.get("title"),
                            "description": video.get("description", ""),
                            "published_at": video.get("published_at"),
                            "thumbnail_url": video.get("thumbnail_url", ""),
                            "view_count": video.get("statistics", {}).get("view_count", 0),
                            "like_count": video.get("statistics", {}).get("like_count", 0),
                            "comment_count": video.get("statistics", {}).get("comment_count", 0),
                            "topic_tags": video.get("tags", [])[:10],
                            # Persist comments for commentary generation (limit 10)
                            "top_comments": video.get("top_comments", [])[:10],
                        }

                        # Insert or update in Supabase (upsert on youtube_id)
                        self.supabase.table("youtube_videos").upsert(
                            video_record, on_conflict="youtube_id"
                        ).execute()
                        videos_inserted += 1

                    except Exception as e:
                        print(f"   ⚠ Failed to insert video {video.get('video_id')}: {e}")

            if videos_inserted > 0:
                print(f"   ✓ Synced {videos_inserted} videos to Supabase")

        except Exception as e:
            print(f"   ⚠ Warning: Could not sync to Supabase: {e}")
            print("   Data saved to JSON only")


# ============================================================================
# MAIN EXECUTION
# ============================================================================


def main():
    """
    Main function - entry point when script is run directly

    This function is only executed when you run this file directly
    (not when you import it as a module)
    """
    try:
        # Initialize collector
        collector = YouTubeCollector(YOUTUBE_API_KEY)

        # Collect all data
        data = collector.collect_all_data()

        # Save to file
        if data:
            collector.save_data(data)
        else:
            print("\n✗ No data collected")

    except ValueError as e:
        # Handle configuration errors (missing API key, etc.)
        print(f"\n✗ Configuration Error: {e}")
        print("\nPlease check:")
        print("1. YOUTUBE_API_KEY is set in your .env file")
        print("2. Your API key is valid")
        print("3. YouTube Data API v3 is enabled in Google Cloud Console")

    except KeyboardInterrupt:
        # Handle Ctrl+C gracefully
        print("\n\n⚠ Collection interrupted by user")

    except Exception as e:
        # Catch any other unexpected errors
        print(f"\n✗ Unexpected error: {e}")
        print("\nPlease report this error if it persists")


# This is Python's way of saying "only run main() if this file is executed directly"
# If someone imports this file as a module, main() won't run automatically
if __name__ == "__main__":
    main()

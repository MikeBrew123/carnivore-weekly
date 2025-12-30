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
SEARCH_QUERY = "carnivore diet"
DAYS_BACK = 7  # How many days back to search
TOP_CREATORS_COUNT = 10  # How many top creators to analyze
VIDEOS_PER_CREATOR = 5  # Videos to collect per creator
COMMENTS_PER_VIDEO = 20  # Top comments per video


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
                "YouTube API key not found! "
                "Please set YOUTUBE_API_KEY in your .env file"
            )

        # Build the YouTube service object
        # This is our connection to YouTube's API
        try:
            self.youtube = build("youtube", "v3", developerKey=api_key)
            print("✓ YouTube API client initialized")
        except Exception as e:
            raise ValueError(f"Failed to initialize YouTube API: {e}")

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
                cleaned_videos.append(
                    {
                        "video_id": video["id"]["videoId"],
                        "channel_id": video["snippet"]["channelId"],
                        "channel_title": video["snippet"]["channelTitle"],
                        "title": video["snippet"]["title"],
                        "published_at": video["snippet"]["publishedAt"],
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
            # Join video IDs with commas (API accepts comma-separated list)
            video_ids_str = ",".join(video_ids)

            # Request statistics for all videos at once
            request = self.youtube.videos().list(part="statistics", id=video_ids_str)

            response = request.execute()

            # Build dictionary of video_id -> stats
            for item in response.get("items", []):
                video_id = item["id"]
                stats = item["statistics"]

                # Convert view count to integer (API returns strings)
                # Use .get() with default value to handle missing fields
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
        for video in videos:
            video_id = video["video_id"]
            channel_id = video["channel_id"]

            # Get view count from stats (default to 0 if not found)
            views = stats.get(video_id, {}).get("view_count", 0)

            # Add to channel's total
            channel_views[channel_id] += views

            # Remember channel name
            channel_names[channel_id] = video["channel_title"]

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
        print(
            f"\n   Top {TOP_CREATORS_COUNT} Channels by Views (past {DAYS_BACK} days):"
        )
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
            # Join IDs
            video_ids_str = ",".join(video_ids)

            # Request full video details
            # part='snippet,statistics' gets both metadata and stats in one request
            request = self.youtube.videos().list(
                part="snippet,statistics", id=video_ids_str
            )

            response = request.execute()

            detailed_videos = []

            for item in response.get("items", []):
                snippet = item["snippet"]
                stats = item["statistics"]

                video_data = {
                    "video_id": item["id"],
                    "title": snippet["title"],
                    "description": snippet["description"],
                    "published_at": snippet["publishedAt"],
                    "statistics": {
                        "view_count": int(stats.get("viewCount", 0)),
                        "like_count": int(stats.get("likeCount", 0)),
                        "comment_count": int(stats.get("commentCount", 0)),
                    },
                    # Tags might not exist for all videos
                    "tags": snippet.get("tags", []),
                    "top_comments": [],  # Will be filled later
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
        1. Search for carnivore diet videos
        2. Rank channels by total views
        3. Get detailed info for top channels
        4. Collect comments for each video

        Returns:
            Complete data dictionary ready to be saved as JSON
        """
        print("\n" + "=" * 70)
        print("🥩 CARNIVORE DIET YOUTUBE DATA COLLECTOR")
        print("=" * 70)

        # Step 1: Search for videos
        videos = self.search_videos(SEARCH_QUERY, max_results=50)

        if not videos:
            print("✗ No videos found. Exiting.")
            return {}

        # Step 2: Rank channels
        top_channels = self.calculate_channel_rankings(videos)

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

            # Get recent videos from this channel
            videos = self.get_channel_videos(channel_id, VIDEOS_PER_CREATOR)
            print(f"   ✓ Found {len(videos)} recent videos")

            # For each video, get comments
            for video in videos:
                print(f"      Getting comments for: {video['title'][:50]}...")
                comments = self.get_video_comments(
                    video["video_id"], COMMENTS_PER_VIDEO
                )
                video["top_comments"] = comments
                print(f"      ✓ Collected {len(comments)} comments")

            # Add videos to channel data
            channel["videos"] = videos

        # Step 4: Build final data structure
        final_data = {
            "collection_date": datetime.now().strftime("%Y-%m-%d"),
            "collection_timestamp": datetime.now().isoformat(),
            "search_query": SEARCH_QUERY,
            "days_back": DAYS_BACK,
            "total_videos_found": len(videos),
            "top_creators_count": len(top_channels),
            "top_creators": top_channels,
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

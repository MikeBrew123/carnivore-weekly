#!/usr/bin/env python3
"""
Extract Sentiment Data for Sentiment Threads Feature

Parses analyzed_content.json to extract sentiment information from video cards
and generates sentiment-threads-data.json for frontend consumption.

This script:
1. Reads analyzed_content.json (from weekly automation)
2. Extracts sentiment scores and comment data from all video cards
3. Aggregates sentiment summary statistics
4. Identifies success stories (high engagement + positive sentiment)
5. Sorts threads by engagement and sentiment
6. Outputs formatted JSON for frontend

Author: Generated with Claude Code
Date: 2025-12-31
"""

import json
import os
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Any, Optional


# ===================================================================
# Configuration
# ===================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"

ANALYZED_CONTENT_FILE = DATA_DIR / "analyzed_content.json"
OUTPUT_FILE = PUBLIC_DATA_DIR / "sentiment-threads-data.json"

# Sentiment score thresholds
POSITIVE_THRESHOLD = 60
NEGATIVE_THRESHOLD = 40

# Success story criteria
MIN_ENGAGEMENT_FOR_SUCCESS = 100
MIN_POSITIVE_PERCENT = 70


# ===================================================================
# Data Classes & Types
# ===================================================================


class SentimentExtractor:
    """Extract sentiment data from analyzed content"""

    def __init__(self):
        self.analyzed_content: Dict[str, Any] = {}
        self.threads: List[Dict[str, Any]] = []
        self.success_stories: List[Dict[str, Any]] = []
        self.summary = {"positive": 0, "neutral": 0, "negative": 0, "total_threads": 0}

    def run(self) -> Dict[str, Any]:
        """Execute the full extraction pipeline"""
        print("Starting sentiment data extraction...")

        # Load source data
        if not self.load_analyzed_content():
            return None

        # Extract threads from video cards
        self.extract_threads_from_videos()

        # Aggregate summary statistics
        self.calculate_summary()

        # Identify success stories
        self.identify_success_stories()

        # Sort threads by engagement
        self.sort_threads()

        print(f"✓ Extracted {len(self.threads)} threads")
        print(f"✓ Identified {len(self.success_stories)} success stories")
        print(f"✓ Sentiment breakdown: {self.summary['positive']} positive, "
              f"{self.summary['neutral']} neutral, {self.summary['negative']} negative")

        return self.get_output_data()

    # ===================================================================
    # Loading & Validation
    # ===================================================================

    def load_analyzed_content(self) -> bool:
        """Load analyzed content from JSON file"""
        try:
            if not ANALYZED_CONTENT_FILE.exists():
                print(f"ERROR: {ANALYZED_CONTENT_FILE} not found")
                return False

            with open(ANALYZED_CONTENT_FILE, "r", encoding="utf-8") as f:
                self.analyzed_content = json.load(f)

            print(f"✓ Loaded analyzed content from {ANALYZED_CONTENT_FILE}")
            return True

        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON in {ANALYZED_CONTENT_FILE}: {e}")
            return False
        except Exception as e:
            print(f"ERROR: Failed to load analyzed content: {e}")
            return False

    # ===================================================================
    # Thread Extraction
    # ===================================================================

    def extract_threads_from_videos(self):
        """Extract sentiment threads from top videos"""
        if "analysis" not in self.analyzed_content:
            print("WARNING: No 'analysis' section in analyzed content")
            return

        analysis = self.analyzed_content["analysis"]
        top_videos = analysis.get("top_videos", [])

        print(f"Processing {len(top_videos)} videos...")

        for video in top_videos:
            threads = self.extract_video_threads(video)
            self.threads.extend(threads)

    def extract_video_threads(self, video: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract threads from a single video's comment sentiment"""
        threads = []

        video_id = video.get("video_id", "unknown")
        title = video.get("title", "Unknown Video")
        creator = video.get("creator", "Unknown Creator")

        # Get sentiment data from video
        sentiment_data = video.get("comment_sentiment", {})

        if not sentiment_data:
            print(f"  ⚠ No sentiment data for: {title}")
            return []

        # Determine overall sentiment
        positive_pct = sentiment_data.get("positive_percent", 0)
        negative_pct = sentiment_data.get("negative_percent", 0)
        neutral_pct = sentiment_data.get("neutral_percent", 0)

        sentiment = self.classify_sentiment(positive_pct, negative_pct, neutral_pct)

        # Create thread from sentiment summary
        thread = {
            "id": f"thread-{video_id}",
            "sentiment": sentiment,
            "title": f"Community response to: {title}",
            "summary": sentiment_data.get("summary", ""),
            "video_id": video_id,
            "video_title": title,
            "creator": creator,
            "timestamp": self.get_video_date(video),
            "engagement": video.get("views", 0) // 10,  # Use views/10 as engagement proxy
            "replies": max(1, video.get("views", 0) // 50),  # Estimated replies
            "positive_percent": positive_pct,
            "negative_percent": negative_pct,
            "neutral_percent": neutral_pct,
        }

        threads.append(thread)
        return threads

    def classify_sentiment(self, positive_pct: float, negative_pct: float, neutral_pct: float) -> str:
        """Classify sentiment based on percentages"""
        if positive_pct >= POSITIVE_THRESHOLD:
            return "positive"
        elif negative_pct >= NEGATIVE_THRESHOLD:
            return "negative"
        else:
            return "neutral"

    def get_video_date(self, video: Dict[str, Any]) -> str:
        """Extract published date from video"""
        published_at = video.get("published_at")
        if published_at:
            try:
                date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                return date.strftime("%Y-%m-%d")
            except (ValueError, AttributeError):
                pass

        # Default to today if parsing fails
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # ===================================================================
    # Summary Statistics
    # ===================================================================

    def calculate_summary(self):
        """Calculate sentiment summary statistics"""
        sentiment_counts = defaultdict(int)

        for thread in self.threads:
            sentiment = thread.get("sentiment", "neutral")
            sentiment_counts[sentiment] += 1

        self.summary["positive"] = sentiment_counts.get("positive", 0)
        self.summary["neutral"] = sentiment_counts.get("neutral", 0)
        self.summary["negative"] = sentiment_counts.get("negative", 0)
        self.summary["total_threads"] = len(self.threads)

    # ===================================================================
    # Success Story Identification
    # ===================================================================

    def identify_success_stories(self):
        """Identify success stories from high-engagement positive videos"""
        if "analysis" not in self.analyzed_content:
            return

        analysis = self.analyzed_content["analysis"]
        top_videos = analysis.get("top_videos", [])

        for video in top_videos:
            if self.is_success_story(video):
                story = {
                    "id": f"story-{video.get('video_id')}",
                    "image": self.get_story_image(video),
                    "title": self.extract_story_title(video),
                    "summary": self.extract_story_summary(video),
                    "video_id": video.get("video_id"),
                    "video_url": self.get_video_url(video),
                    "creator": video.get("creator", "Unknown Creator"),
                    "date": self.get_video_date(video),
                }
                self.success_stories.append(story)

    def is_success_story(self, video: Dict[str, Any]) -> bool:
        """Check if video qualifies as a success story"""
        # Must have sentiment data
        sentiment_data = video.get("comment_sentiment", {})
        if not sentiment_data:
            return False

        # Must be positive
        positive_pct = sentiment_data.get("positive_percent", 0)
        if positive_pct < MIN_POSITIVE_PERCENT:
            return False

        # Must have good engagement
        views = video.get("views", 0)
        if views < MIN_ENGAGEMENT_FOR_SUCCESS:
            return False

        return True

    def extract_story_title(self, video: Dict[str, Any]) -> str:
        """Extract story title from video"""
        title = video.get("title", "Untitled Story")

        # Clean up title for story format
        if len(title) > 50:
            title = title[:50] + "..."

        return title

    def extract_story_summary(self, video: Dict[str, Any]) -> str:
        """Extract story summary from video summary"""
        summary = video.get("summary", "")

        # Trim to reasonable length
        if len(summary) > 100:
            # Find sentence boundary
            sentences = summary.split(". ")
            trimmed = ". ".join(sentences[:2]) + "."
            if len(trimmed) > 100:
                trimmed = summary[:100] + "..."
            return trimmed

        return summary

    def get_story_image(self, video: Dict[str, Any]) -> str:
        """Get thumbnail image for story"""
        # In production, would extract from YouTube or use video thumbnail
        # For now, return placeholder with video ID
        video_id = video.get("video_id", "")
        return f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"

    def get_video_url(self, video: Dict[str, Any]) -> str:
        """Generate YouTube URL for video"""
        video_id = video.get("video_id", "")
        return f"https://www.youtube.com/watch?v={video_id}"

    # ===================================================================
    # Sorting & Organization
    # ===================================================================

    def sort_threads(self):
        """Sort threads by engagement and sentiment"""
        # Sort by engagement (descending) and then by positive sentiment
        self.threads.sort(
            key=lambda x: (
                x.get("engagement", 0) * (-1),  # Descending engagement
                x.get("sentiment") == "positive" and -1 or 1,  # Positive first
            )
        )

        # Sort success stories by date (newest first)
        self.success_stories.sort(
            key=lambda x: x.get("date", ""),
            reverse=True,
        )

    # ===================================================================
    # Output
    # ===================================================================

    def get_output_data(self) -> Dict[str, Any]:
        """Build output data structure"""
        return {
            "summary": self.summary,
            "threads": self.threads,
            "success_stories": self.success_stories,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def save_output(self, data: Dict[str, Any]) -> bool:
        """Save output to JSON file"""
        try:
            # Create directory if needed
            PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            print(f"✓ Saved sentiment data to {OUTPUT_FILE}")
            return True

        except Exception as e:
            print(f"ERROR: Failed to save output: {e}")
            return False


# ===================================================================
# Main Execution
# ===================================================================


def main():
    """Main entry point"""
    try:
        # Create extractor and run
        extractor = SentimentExtractor()
        output_data = extractor.run()

        if output_data:
            # Save the output
            if extractor.save_output(output_data):
                print("\n✅ Sentiment data extraction complete!")
                print(f"   Summary: {output_data['summary']}")
                return 0
            else:
                print("\n❌ Failed to save output")
                return 1
        else:
            print("\n❌ Extraction failed")
            return 1

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())

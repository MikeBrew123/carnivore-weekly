#!/usr/bin/env python3
"""
Reddit Data Collector for Carnivore Diet Content

Monitors carnivore subreddits for trending discussions and collects:
- Top posts from past 7 days
- Top comments on each post (sorted by upvotes)
- Basic sentiment analysis

Used by Chloe's research pipeline to identify trending community topics.

Author: LEO (Database Architect)
Date: 2026-01-01
"""

import os
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from collections import Counter

# Third-party imports
import requests

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_FILE = DATA_DIR / "reddit_data.json"

# Subreddits to monitor
SUBREDDITS = ["carnivore", "meat_only", "animalbaseddiet"]
DAYS_BACK = 7
TOP_POSTS_PER_SUBREDDIT = 10
TOP_COMMENTS_PER_POST = 15
MIN_UPVOTES = 5  # Filter posts with at least this many upvotes

# Reddit JSON API (no auth required for public subreddits)
REDDIT_API_BASE = "https://reddit.com"
HEADERS = {
    "User-Agent": "CarnivoreWeekly/1.0 (Python Reddit Data Collector)"
}


def get_date_filter() -> str:
    """Calculate timestamp for 'past 7 days' filter"""
    past_date = datetime.utcnow() - timedelta(days=DAYS_BACK)
    return past_date.strftime("%Y-%m-%dT%H:%M:%SZ")


def analyze_sentiment(text: str) -> str:
    """
    Basic sentiment analysis for comment/post text.

    Returns: 'positive', 'negative', or 'neutral'
    """
    if not text:
        return 'neutral'

    text_lower = text.lower()

    # Positive indicators
    positive_words = ['amazing', 'great', 'good', 'love', 'excellent', 'awesome',
                      'incredible', 'works', 'helped', 'better', 'improved', 'success',
                      'fantastic', 'perfect', 'best', 'happy', 'glad', 'wonderful']

    # Negative indicators
    negative_words = ['hate', 'bad', 'terrible', 'awful', 'horrible', 'worst',
                      'doesn\'t work', 'failed', 'worse', 'disappointed', 'struggling',
                      'difficult', 'hard', 'problem', 'issue', 'error']

    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)

    if positive_count > negative_count:
        return 'positive'
    elif negative_count > positive_count:
        return 'negative'
    else:
        return 'neutral'


def fetch_subreddit_posts(subreddit: str) -> List[Dict]:
    """
    Fetch top posts from a subreddit using Reddit JSON API

    Args:
        subreddit: Name of subreddit (without r/ prefix)

    Returns:
        List of post dictionaries with metadata
    """
    print(f"\n   Fetching posts from r/{subreddit}...")

    posts = []

    try:
        # Reddit JSON API endpoint
        url = f"{REDDIT_API_BASE}/r/{subreddit}/top.json"
        params = {
            "t": "week",  # Past week
            "limit": TOP_POSTS_PER_SUBREDDIT
        }

        response = requests.get(url, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Extract posts from response
        for item in data.get("data", {}).get("children", []):
            post_data = item.get("data", {})

            # Filter by minimum upvotes
            if post_data.get("ups", 0) < MIN_UPVOTES:
                continue

            post = {
                "post_id": post_data.get("id"),
                "title": post_data.get("title"),
                "url": f"https://reddit.com{post_data.get('permalink', '')}",
                "author": post_data.get("author", "[deleted]"),
                "upvotes": post_data.get("ups", 0),
                "downvotes": post_data.get("downs", 0),
                "comment_count": post_data.get("num_comments", 0),
                "created_utc": datetime.utcfromtimestamp(
                    post_data.get("created_utc", 0)
                ).isoformat() + "Z",
                "text": post_data.get("selftext", "")[:500],  # First 500 chars
                "sentiment": analyze_sentiment(post_data.get("selftext", "")),
                "top_comments": []  # Will be filled in next step
            }

            posts.append(post)

        print(f"   ✓ Found {len(posts)} posts")
        return posts

    except requests.RequestException as e:
        print(f"   ✗ Error fetching posts: {e}")
        return []


def fetch_post_comments(subreddit: str, post_id: str) -> List[Dict]:
    """
    Fetch top comments from a Reddit post

    Args:
        subreddit: Name of subreddit
        post_id: Reddit post ID

    Returns:
        List of comment dictionaries
    """
    comments = []

    try:
        # Comments endpoint
        url = f"{REDDIT_API_BASE}/r/{subreddit}/comments/{post_id}.json"
        params = {"limit": TOP_COMMENTS_PER_POST}

        response = requests.get(url, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Extract comments from response (second item is comments)
        if len(data) > 1:
            comments_data = data[1].get("data", {}).get("children", [])

            for item in comments_data:
                if item.get("kind") != "t1":  # Skip non-comment items
                    continue

                comment_data = item.get("data", {})

                # Skip deleted/removed comments
                if comment_data.get("author") == "[deleted]":
                    continue

                comment = {
                    "text": comment_data.get("body", "")[:300],  # First 300 chars
                    "author": comment_data.get("author", "[deleted]"),
                    "upvotes": comment_data.get("ups", 0),
                    "sentiment": analyze_sentiment(comment_data.get("body", ""))
                }

                comments.append(comment)

        # Sort by upvotes (most liked first)
        comments.sort(key=lambda x: x["upvotes"], reverse=True)

        return comments[:TOP_COMMENTS_PER_POST]

    except requests.RequestException as e:
        # Silently fail for comments (some posts may have comments disabled)
        return []


def collect_all_data() -> Dict:
    """
    Main collection method - orchestrates entire process

    Returns:
        Complete data dictionary ready for JSON serialization
    """
    print("\n" + "=" * 70)
    print("🥩 CARNIVORE DIET REDDIT DATA COLLECTOR")
    print("=" * 70)

    subreddit_data = []
    total_posts = 0
    total_comments = 0

    for subreddit in SUBREDDITS:
        print(f"\n📍 Monitoring r/{subreddit}...")

        # Fetch posts
        posts = fetch_subreddit_posts(subreddit)

        if not posts:
            print(f"   ⚠️  No posts found in r/{subreddit}")
            continue

        # Fetch comments for each post
        for post in posts:
            print(f"      Getting comments for: {post['title'][:50]}...", end="")
            comments = fetch_post_comments(subreddit, post["post_id"])
            post["top_comments"] = comments
            print(f" ✓ ({len(comments)} comments)")

            total_comments += len(comments)

        total_posts += len(posts)

        subreddit_data.append({
            "subreddit": subreddit,
            "post_count": len(posts),
            "posts": posts
        })

    # Final data structure
    final_data = {
        "collection_date": datetime.now().strftime("%Y-%m-%d"),
        "collection_timestamp": datetime.now().isoformat(),
        "subreddits_monitored": SUBREDDITS,
        "days_back": DAYS_BACK,
        "total_subreddits": len(subreddit_data),
        "total_posts_collected": total_posts,
        "total_comments_collected": total_comments,
        "subreddits": subreddit_data
    }

    return final_data


def save_data(data: Dict) -> bool:
    """
    Save collected data to JSON file

    Args:
        data: Dictionary to save

    Returns:
        True if successful, False otherwise
    """
    if not data or data["total_posts_collected"] == 0:
        print("\n✗ No data collected")
        return False

    # Create data directory if needed
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    try:
        # Write JSON with nice formatting
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print("\n" + "=" * 70)
        print("✓ REDDIT DATA COLLECTION COMPLETE!")
        print("=" * 70)
        print(f"\n📁 Data saved to: {OUTPUT_FILE}")
        print(f"📊 Subreddits analyzed: {data['total_subreddits']}")
        print(f"📹 Total posts collected: {data['total_posts_collected']}")
        print(f"💬 Total comments collected: {data['total_comments_collected']}")
        print()

        return True

    except Exception as e:
        print(f"\n✗ Error saving data: {e}")
        return False


def main():
    """Main entry point"""
    try:
        # Check internet connectivity
        print("🔍 Checking Reddit API connectivity...")
        try:
            response = requests.head(REDDIT_API_BASE, timeout=5)
            print("   ✓ Reddit API accessible")
        except requests.RequestException as e:
            print(f"   ✗ Cannot reach Reddit API: {e}")
            print("   Please check your internet connection")
            return

        # Collect data
        data = collect_all_data()

        # Save data
        if save_data(data):
            print("✅ Reddit data collection successful!")
            print("\nNext steps:")
            print("1. Run: python3 scripts/analyze_trends.py")
            print("2. Run: node scripts/leo_prioritize_topics.js")
        else:
            print("❌ Failed to save Reddit data")

    except KeyboardInterrupt:
        print("\n\n⚠️  Collection interrupted by user")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")


if __name__ == "__main__":
    main()

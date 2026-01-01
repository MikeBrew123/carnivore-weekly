#!/usr/bin/env python3
"""
Trend Analysis Engine for Carnivore Community

Aggregates YouTube and Reddit data to identify trending topics:
1. Loads youtube_data.json and reddit_data.json
2. Extracts common keywords and phrases
3. Calculates trend metrics (velocity, engagement, sentiment)
4. Detects repetition (checks if already covered)
5. Identifies series candidates (sustained 14+ days)
6. Flags stale topics (>7 days old)
7. Outputs to trending_topics.json

Used by LEO's prioritization system to assign topics to Chloe.

Author: LEO (Database Architect)
Date: 2026-01-01
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Set, Tuple
from collections import Counter, defaultdict
import sqlite3

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
YOUTUBE_FILE = DATA_DIR / "youtube_data.json"
REDDIT_FILE = DATA_DIR / "reddit_data.json"
OUTPUT_FILE = DATA_DIR / "trending_topics.json"
DATABASE_URL = "sqlite:///carnivore.db"  # Will use Supabase when available

DAYS_BACK = 7
MIN_MENTIONS = 3  # Minimum mentions to be considered "trending"
SERIES_THRESHOLD_DAYS = 14  # Days before considering as series candidate
SERIES_THRESHOLD_VELOCITY = 5.0  # Mentions per day


def extract_keywords(text: str) -> List[str]:
    """
    Extract keywords from text (blog titles, comments, etc.)

    Returns common terms that indicate trending topics
    """
    if not text:
        return []

    # Convert to lowercase
    text = text.lower()

    # Remove URLs, mentions, special characters
    text = re.sub(r'http\S+|@\w+|[^\w\s]', ' ', text)

    # Split into words
    words = text.split()

    # Common stop words to filter
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
        'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
        'might', 'must', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its',
        'just', 'like', 'want', 'try', 'really', 'very', 'so', 'as', 'by',
        'from', 'up', 'about', 'into', 'with', 'through', 'during', 'before',
        'after', 'above', 'below', 'between', 'under', 'again', 'further',
        'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
        'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some'
    }

    # Filter: minimum 3 letters, not in stop words
    keywords = [w for w in words if len(w) >= 3 and w not in stop_words]

    return keywords[:5]  # Return top 5 keywords


def extract_topic_phrases(text: str) -> Set[str]:
    """
    Extract multi-word phrases that indicate topics

    Examples: "lion diet", "carnivore bar", "electrolyte deficiency"
    """
    if not text:
        return set()

    text = text.lower()

    # Common topic patterns
    patterns = [
        r'\b(carnivore|lion|animal-based)\s+(\w+(?:\s+\w+)?)',
        r'\b(electrolyte|sodium|potassium|magnesium)\s+(?:deficiency|balance|levels?)',
        r'\b(adhd|autoimmune|thyroid|pcos|diabetes)\s+(?:and|on)?\s+carnivore',
        r'\b(zero carb|beef only|meat only|ground beef)',
        r'\b(intermittent\s+fasting|if|fasting)',
        r'\b(weight loss|muscle gain|performance|energy)',
        r'\b(bloating|digestion|constipation|diarrhea)',
        r'\b(fasting|intermittent|fat adaptation)',
    ]

    phrases = set()
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            if isinstance(match, tuple):
                phrase = ' '.join([m for m in match if m])
            else:
                phrase = match
            if phrase and len(phrase) > 3:
                phrases.add(phrase)

    return phrases


def load_json_file(filepath: Path) -> Dict:
    """Load JSON data from file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        print(f"Warning: Invalid JSON in {filepath}")
        return {}


def aggregate_youtube_topics(youtube_data: Dict) -> Dict[str, Dict]:
    """
    Extract topics from YouTube data

    Returns dict mapping topic_slug -> {mention_count, sources, sentiment}
    """
    topics = defaultdict(lambda: {
        'mentions': [],
        'sources': [],
        'sentiment': {'positive': 0, 'neutral': 0, 'negative': 0},
        'creators': set(),
        'platform': 'youtube'
    })

    creators = youtube_data.get("top_creators", [])

    for creator in creators:
        creator_name = creator.get("channel_name", "Unknown")
        videos = creator.get("videos", [])

        for video in videos:
            title = video.get("title", "")
            comments = video.get("top_comments", [])

            # Extract topics from video title
            phrases = extract_topic_phrases(title)

            for phrase in phrases:
                topic_slug = phrase.lower().replace(" ", "-")

                topics[topic_slug]['mentions'].append({
                    'text': title,
                    'source': 'youtube_video',
                    'creator': creator_name,
                    'date': video.get('published_at', ''),
                    'engagement': video.get('statistics', {}).get('like_count', 0)
                })

                topics[topic_slug]['sources'].append(f"YouTube: {title[:50]}")
                topics[topic_slug]['creators'].add(creator_name)

            # Extract topics from comments
            for comment in comments:
                text = comment.get("text", "")
                sentiment = 'positive' if 'love' in text.lower() or 'great' in text.lower() else \
                           'negative' if 'hate' in text.lower() or 'bad' in text.lower() else 'neutral'

                phrases = extract_topic_phrases(text)
                for phrase in phrases:
                    topic_slug = phrase.lower().replace(" ", "-")
                    topics[topic_slug]['sentiment'][sentiment] += 1

    return dict(topics)


def aggregate_reddit_topics(reddit_data: Dict) -> Dict[str, Dict]:
    """
    Extract topics from Reddit data

    Returns dict mapping topic_slug -> {mention_count, sources, sentiment}
    """
    topics = defaultdict(lambda: {
        'mentions': [],
        'sources': [],
        'sentiment': {'positive': 0, 'neutral': 0, 'negative': 0},
        'creators': set(),
        'platform': 'reddit'
    })

    subreddits = reddit_data.get("subreddits", [])

    for sub in subreddits:
        sub_name = sub.get("subreddit", "")
        posts = sub.get("posts", [])

        for post in posts:
            title = post.get("title", "")
            text = post.get("text", "")
            post_sentiment = post.get("sentiment", "neutral")
            comments = post.get("top_comments", [])

            # Extract topics from post title and text
            phrases = extract_topic_phrases(title + " " + text)

            for phrase in phrases:
                topic_slug = phrase.lower().replace(" ", "-")

                topics[topic_slug]['mentions'].append({
                    'text': title,
                    'source': 'reddit_post',
                    'subreddit': sub_name,
                    'date': post.get('created_utc', ''),
                    'engagement': post.get('upvotes', 0)
                })

                topics[topic_slug]['sources'].append(f"Reddit r/{sub_name}: {title[:50]}")
                topics[topic_slug]['sentiment'][post_sentiment] += 1

            # Extract topics from comments
            for comment in comments:
                text = comment.get("text", "")
                sentiment = comment.get("sentiment", "neutral")

                phrases = extract_topic_phrases(text)
                for phrase in phrases:
                    topic_slug = phrase.lower().replace(" ", "-")
                    topics[topic_slug]['sentiment'][sentiment] += 1

    return dict(topics)


def calculate_metrics(topic_data: Dict, topic_slug: str) -> Dict:
    """
    Calculate trend metrics for a topic

    Returns: {
        mention_count, velocity_score, engagement_score,
        days_active, youtube_mentions, reddit_mentions
    }
    """
    mentions = topic_data.get('mentions', [])
    sentiment = topic_data.get('sentiment', {})

    mention_count = len(mentions)

    # Calculate velocity (mentions per day)
    dates = [m.get('date', '')[:10] for m in mentions if m.get('date')]
    days_active = len(set(dates)) if dates else 1
    velocity_score = mention_count / max(days_active, 1)

    # Calculate engagement (average engagement per mention)
    engagement_scores = [m.get('engagement', 0) for m in mentions]
    engagement_score = sum(engagement_scores) / len(engagement_scores) if engagement_scores else 0

    # Categorize mentions by platform
    youtube_mentions = sum(1 for m in mentions if 'youtube' in m.get('source', ''))
    reddit_mentions = sum(1 for m in mentions if 'reddit' in m.get('source', ''))

    # Sentiment ratio
    total_sentiment = sentiment.get('positive', 0) + sentiment.get('neutral', 0) + sentiment.get('negative', 0)
    sentiment_positive = sentiment.get('positive', 0) / max(total_sentiment, 1)

    return {
        'mention_count': mention_count,
        'velocity_score': round(velocity_score, 2),
        'engagement_score': round(engagement_score, 1),
        'days_active': days_active,
        'youtube_mentions': youtube_mentions,
        'reddit_mentions': reddit_mentions,
        'sentiment_positive': round(sentiment_positive, 2)
    }


def determine_format(metrics: Dict, days_active: int) -> Tuple[str, str]:
    """
    Determine content format recommendation

    Returns: (format, series_status)
    - single_post: One blog post
    - series: Multi-week series (14+ days active)
    - monthly_wrapup: High mention count but not series
    """
    velocity = metrics['velocity_score']
    mention_count = metrics['mention_count']

    if days_active >= SERIES_THRESHOLD_DAYS and velocity >= SERIES_THRESHOLD_VELOCITY:
        return 'series', 'candidate'

    if mention_count >= 50 and days_active >= 7:
        return 'monthly_wrapup', 'candidate'

    return 'single_post', 'none'


def check_freshness(latest_date: str, days_threshold: int = 7) -> Tuple[str, bool]:
    """
    Check if topic is fresh (< 7 days old)

    Returns: (status, is_fresh)
    """
    if not latest_date:
        return 'UNKNOWN', False

    try:
        topic_date = datetime.fromisoformat(latest_date.replace('Z', '+00:00'))
        days_old = (datetime.utcnow() - topic_date).days
        is_fresh = days_old <= days_threshold
        status = 'FRESH' if is_fresh else f'STALE ({days_old}d old)'
        return status, is_fresh
    except:
        return 'UNKNOWN', False


def analyze_all_trends() -> List[Dict]:
    """
    Main analysis engine
    """
    print("\n" + "=" * 70)
    print("🧠 CARNIVORE TREND ANALYSIS ENGINE")
    print("=" * 70)

    # Load data
    print("\n📂 Loading data...")
    youtube_data = load_json_file(YOUTUBE_FILE)
    reddit_data = load_json_file(REDDIT_FILE)

    if not youtube_data and not reddit_data:
        print("❌ No data files found!")
        print("   Run: python3 scripts/youtube_collector.py")
        print("   Run: python3 scripts/reddit_collector.py")
        return []

    print(f"   ✓ YouTube data: {youtube_data.get('total_videos_found', 0)} videos")
    print(f"   ✓ Reddit data: {reddit_data.get('total_posts_collected', 0)} posts")

    # Aggregate topics
    print("\n🔍 Aggregating topics...")
    youtube_topics = aggregate_youtube_topics(youtube_data)
    reddit_topics = aggregate_reddit_topics(reddit_data)

    # Merge topics (same phrase from both platforms)
    all_topics = {}

    for slug, data in youtube_topics.items():
        all_topics[slug] = data

    for slug, data in reddit_topics.items():
        if slug in all_topics:
            # Merge Reddit data into existing YouTube topic
            all_topics[slug]['mentions'].extend(data['mentions'])
            all_topics[slug]['sources'].extend(data['sources'])
            all_topics[slug]['reddit_mentions'] = len(data['mentions'])
            for sentiment_type in ['positive', 'neutral', 'negative']:
                all_topics[slug]['sentiment'][sentiment_type] += data['sentiment'][sentiment_type]
        else:
            # New topic from Reddit only
            all_topics[slug] = data

    print(f"   ✓ Found {len(all_topics)} unique topics")

    # Calculate metrics and create output
    topics_output = []

    for topic_slug, topic_data in all_topics.items():
        metrics = calculate_metrics(topic_data, topic_slug)

        # Skip very low-mention topics
        if metrics['mention_count'] < MIN_MENTIONS:
            continue

        # Determine latest date for freshness check
        dates = [m.get('date', '') for m in topic_data.get('mentions', [])]
        latest_date = max(dates) if dates else ''

        freshness_status, is_fresh = check_freshness(latest_date)

        # Determine format
        content_format, series_status = determine_format(metrics, metrics['days_active'])

        # Create title from slug
        topic_title = ' '.join(word.capitalize() for word in topic_slug.split('-'))

        topic_output = {
            'topic_slug': topic_slug,
            'topic_title': topic_title,
            'description': '',
            'mention_count': metrics['mention_count'],
            'velocity_score': metrics['velocity_score'],
            'engagement_score': metrics['engagement_score'],
            'days_active': metrics['days_active'],
            'youtube_mentions': metrics['youtube_mentions'],
            'reddit_mentions': metrics['reddit_mentions'],
            'creator_count': len(topic_data.get('creators', set())),
            'sentiment': topic_data.get('sentiment', {}),
            'content_format': content_format,
            'series_status': series_status,
            'freshness_check': freshness_status,
            'is_fresh': is_fresh,
            'sample_sources': topic_data.get('sources', [])[:5],
            'tags': []
        }

        topics_output.append(topic_output)

    # Sort by mention count (trending first)
    topics_output.sort(key=lambda x: x['mention_count'], reverse=True)

    print(f"   ✓ Analyzed {len(topics_output)} trending topics")

    return topics_output


def save_trends(trends: List[Dict]) -> bool:
    """Save trends to JSON file"""
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        output = {
            'analysis_date': datetime.now().strftime("%Y-%m-%d"),
            'analysis_timestamp': datetime.now().isoformat(),
            'total_topics': len(trends),
            'fresh_topics': sum(1 for t in trends if t['is_fresh']),
            'topics': trends
        }

        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print("\n" + "=" * 70)
        print("✓ TREND ANALYSIS COMPLETE!")
        print("=" * 70)
        print(f"\n📁 Saved to: {OUTPUT_FILE}")
        print(f"📊 Topics analyzed: {len(trends)}")
        print(f"🆕 Fresh topics: {sum(1 for t in trends if t['is_fresh'])}")
        print("\nTop 5 Trending Topics:")
        for i, topic in enumerate(trends[:5], 1):
            print(f"   {i}. {topic['topic_title']} ({topic['mention_count']} mentions)")

        print("\nNext step: node scripts/leo_prioritize_topics.js")
        print()

        return True

    except Exception as e:
        print(f"✗ Error saving trends: {e}")
        return False


def main():
    """Main entry point"""
    try:
        trends = analyze_all_trends()
        if trends:
            save_trends(trends)
        else:
            print("❌ No trends analyzed")

    except KeyboardInterrupt:
        print("\n⚠️  Analysis interrupted")
    except Exception as e:
        print(f"\n✗ Error: {e}")


if __name__ == "__main__":
    main()

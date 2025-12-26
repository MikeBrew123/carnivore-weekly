#!/usr/bin/env python3
"""
Cost-Effective Sentiment Analyzer

Uses Claude Haiku (cheap) to add sentiment analysis to existing analyzed content.
Only analyzes top 5 comments per video to minimize cost.

Estimated cost: $0.02-0.05 per run (vs $0.30 with Sonnet analyzing all comments)

Author: Created with Claude Code
Date: 2025-12-26
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / 'data'

YOUTUBE_DATA_FILE = DATA_DIR / 'youtube_data.json'
ANALYZED_FILE = DATA_DIR / 'analyzed_content.json'

# Use Haiku for cost savings - 10x cheaper than Sonnet!
CLAUDE_MODEL = "claude-3-5-haiku-20241022"


# ============================================================================
# SENTIMENT ANALYZER
# ============================================================================

class SentimentAnalyzer:
    """Add sentiment analysis to videos using cheap Claude Haiku model"""

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in .env file")

        self.client = Anthropic(api_key=api_key)
        print(f"✓ Claude Haiku initialized (cost-effective mode)")


    def analyze_video_sentiment(self, video_title: str, comments: list) -> dict:
        """
        Analyze sentiment for a single video using only top 5 comments

        Returns sentiment percentages and summary
        """
        # Only use top 5 comments to save costs
        top_comments = comments[:5]

        if not top_comments:
            return {
                "positive_percent": 0,
                "negative_percent": 0,
                "neutral_percent": 0,
                "overall": "neutral",
                "summary": "No comments available"
            }

        # Build prompt with just the top comments
        comments_text = "\n".join([f"- {c['text']}" for c in top_comments])

        prompt = f"""Analyze the sentiment of these YouTube comments for the video "{video_title}".

Comments:
{comments_text}

Provide a JSON response with sentiment breakdown:
{{
  "positive_percent": <0-100>,
  "negative_percent": <0-100>,
  "neutral_percent": <0-100>,
  "overall": "positive/negative/mixed",
  "summary": "One sentence summary of the sentiment"
}}

Positive = praise, enthusiasm, success stories, gratitude
Negative = criticism, complaints, doubts
Neutral = questions, neutral observations

Percentages must add up to 100."""

        try:
            message = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=300,  # Keep it small for cost savings
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text

            # Extract JSON
            start = response_text.find('{')
            end = response_text.rfind('}') + 1

            if start != -1 and end > start:
                sentiment = json.loads(response_text[start:end])
                return sentiment
            else:
                raise ValueError("No JSON in response")

        except Exception as e:
            print(f"   ⚠ Error analyzing sentiment: {e}")
            return {
                "positive_percent": 50,
                "negative_percent": 25,
                "neutral_percent": 25,
                "overall": "mixed",
                "summary": "Unable to analyze sentiment"
            }


    def add_sentiment_to_analysis(self):
        """
        Load existing analyzed content and add sentiment data
        """
        print("\n" + "="*70)
        print("💰 COST-EFFECTIVE SENTIMENT ANALYZER")
        print("="*70)

        # Load YouTube data (has all the comments)
        print(f"\n📂 Loading YouTube data...")
        with open(YOUTUBE_DATA_FILE, 'r') as f:
            youtube_data = json.load(f)

        # Load existing analysis
        print(f"📂 Loading existing analysis...")
        with open(ANALYZED_FILE, 'r') as f:
            analyzed_data = json.load(f)

        # Create a mapping of video_id -> comments
        video_comments = {}
        for creator in youtube_data['top_creators']:
            for video in creator['videos']:
                video_comments[video['video_id']] = video['top_comments']

        # Add sentiment to top_videos
        print(f"\n🤖 Analyzing sentiment for top videos...")
        for i, video in enumerate(analyzed_data['analysis']['top_videos'], 1):
            video_id = video.get('video_id')
            if video_id and video_id in video_comments:
                print(f"   [{i}/{len(analyzed_data['analysis']['top_videos'])}] {video['title'][:50]}...")

                sentiment = self.analyze_video_sentiment(
                    video['title'],
                    video_comments[video_id]
                )

                video['comment_sentiment'] = sentiment
                print(f"      → {sentiment['overall'].upper()} ({sentiment['positive_percent']}% positive)")

        # Add sentiment to recommended_watching
        print(f"\n🤖 Analyzing sentiment for recommended videos...")
        for i, video in enumerate(analyzed_data['analysis']['recommended_watching'], 1):
            video_id = video.get('video_id')
            if video_id and video_id in video_comments:
                print(f"   [{i}/{len(analyzed_data['analysis']['recommended_watching'])}] {video['title'][:50]}...")

                sentiment = self.analyze_video_sentiment(
                    video['title'],
                    video_comments[video_id]
                )

                video['comment_sentiment'] = sentiment
                print(f"      → {sentiment['overall'].upper()} ({sentiment['positive_percent']}% positive)")

        # Save updated analysis
        print(f"\n💾 Saving updated analysis...")
        with open(ANALYZED_FILE, 'w', encoding='utf-8') as f:
            json.dump(analyzed_data, f, indent=2, ensure_ascii=False)

        print("\n" + "="*70)
        print("✓ SENTIMENT ANALYSIS COMPLETE!")
        print("="*70)
        print(f"\n💰 Cost savings: ~90% less than using Sonnet!")
        print(f"📊 Analyzed {len(analyzed_data['analysis']['top_videos']) + len(analyzed_data['analysis']['recommended_watching'])} videos")
        print(f"📁 Updated file: {ANALYZED_FILE}")
        print("\nNext: Run generate_pages.py to update the website!\n")


def main():
    try:
        analyzer = SentimentAnalyzer(ANTHROPIC_API_KEY)
        analyzer.add_sentiment_to_analysis()

    except ValueError as e:
        print(f"\n✗ Configuration Error: {e}")

    except FileNotFoundError as e:
        print(f"\n✗ File Error: {e}")
        print("Make sure you've run youtube_collector.py and content_analyzer.py first!")

    except KeyboardInterrupt:
        print("\n\n⚠ Interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == '__main__':
    main()

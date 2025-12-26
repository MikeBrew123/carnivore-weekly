#!/usr/bin/env python3
"""
Newsletter Generator for Carnivore Weekly

Automatically generates a unique weekly newsletter by:
- Comparing this week vs last week
- Identifying trends and changes
- Creating AI-powered insights
- Formatting for email delivery

Author: Created with Claude Code
Date: 2025-12-26
"""

import json
import os
from datetime import datetime
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / 'data'
ARCHIVE_DIR = DATA_DIR / 'archive'
OUTPUT_DIR = PROJECT_ROOT / 'newsletters'

CURRENT_DATA = DATA_DIR / 'analyzed_content.json'

# ============================================================================
# NEWSLETTER GENERATOR CLASS
# ============================================================================

class NewsletterGenerator:
    """
    Generates weekly newsletter with week-over-week insights
    """

    def __init__(self):
        """Initialize Claude AI client"""
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment")

        self.client = Anthropic(api_key=api_key)
        print("✓ Claude AI client initialized")


    def load_current_week(self):
        """Load this week's analyzed content"""
        print(f"\n📂 Loading current week data...")

        with open(CURRENT_DATA, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"✓ Loaded current week: {data['analysis_date']}")
        return data


    def load_last_week(self):
        """Load last week's data from archive"""
        print(f"\n📚 Looking for last week's data in archive...")

        # Find all archive files
        archive_files = sorted(ARCHIVE_DIR.glob('*.json'), reverse=True)

        if not archive_files:
            print("⚠ No archive data found - this must be the first week")
            return None

        # Get the most recent archive (last week)
        last_week_file = archive_files[0]

        with open(last_week_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"✓ Loaded last week: {data['analysis_date']}")
        return data


    def calculate_stats_comparison(self, current, last_week):
        """Calculate week-over-week statistics"""
        print(f"\n📊 Calculating week-over-week changes...")

        stats = {}

        # Video counts
        current_videos = len(current['analysis']['top_videos']) + len(current['analysis']['recommended_watching'])
        last_videos = len(last_week['analysis']['top_videos']) + len(last_week['analysis']['recommended_watching']) if last_week else 0

        stats['video_count_change'] = current_videos - last_videos
        stats['current_videos'] = current_videos

        # Total views (from top videos)
        current_views = sum(v['views'] for v in current['analysis']['top_videos'])
        last_views = sum(v['views'] for v in last_week['analysis']['top_videos']) if last_week else 0

        stats['view_count_change'] = current_views - last_views
        stats['current_views'] = current_views

        # Top performer
        if current['analysis']['top_videos']:
            top = max(current['analysis']['top_videos'], key=lambda x: x['views'])
            stats['top_performer'] = {
                'creator': top['creator'],
                'title': top['title'],
                'views': top['views']
            }

        # Creator rankings this week
        creator_views = {}
        for video in current['analysis']['top_videos']:
            creator = video['creator']
            creator_views[creator] = creator_views.get(creator, 0) + video['views']

        stats['creator_rankings'] = sorted(
            [{'creator': k, 'views': v} for k, v in creator_views.items()],
            key=lambda x: x['views'],
            reverse=True
        )[:5]

        print(f"✓ Stats calculated: {stats['video_count_change']:+d} videos, {stats['view_count_change']:+,} views")
        return stats


    def generate_newsletter_content(self, current, last_week, stats):
        """Use Claude AI to generate unique newsletter content"""
        print(f"\n🤖 Generating newsletter content with Claude AI...")

        # Prepare data for prompt
        current_summary = current['analysis']['weekly_summary']
        current_topics = current['analysis']['trending_topics']
        current_videos = current['analysis']['top_videos']

        last_summary = last_week['analysis']['weekly_summary'] if last_week else "No previous week data"
        last_topics = last_week['analysis']['trending_topics'] if last_week else []

        prompt = f"""You are the curator behind Carnivore Weekly, writing your weekly insider newsletter to subscribers who trust your eye for what matters in the carnivore community.

MISSION: Create compelling, fun content that makes subscribers EXCITED to read every Monday. Hook them immediately and keep them engaged throughout.

THE DATA YOU'RE WORKING WITH:

━━━━ THIS WEEK'S LANDSCAPE ━━━━
{current_summary}

Hot Topics Right Now:
{json.dumps(current_topics, indent=2)}

This Week's Standout Videos:
{json.dumps(current_videos[:5], indent=2)}

━━━━ LAST WEEK FOR COMPARISON ━━━━
{last_summary}

What Was Trending Then:
{json.dumps(last_topics, indent=2)}

━━━━ THE NUMBERS STORY ━━━━
• Videos Posted: {stats['current_videos']} ({stats['video_count_change']:+d} change from last week)
• Total Views: {stats['current_views']:,} ({stats['view_count_change']:+,} change)
• Top Performer: {stats['top_performer']['creator']} crushing it with {stats['top_performer']['views']:,} views
• Creator Leaderboard: {json.dumps(stats['creator_rankings'], indent=2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR JOB: Write a newsletter that delivers UNIQUE insights not found on the website.

STRUCTURE & TONE:

1. KILLER OPENING (1-2 sentences)
   → Hook with something surprising, controversial, or intriguing
   → Make them NEED to keep reading
   → Example: "Sauerkraut juice just broke the carnivore internet. Let me explain..."

2. 📊 BY THE NUMBERS
   → 2-3 sentences turning stats into a STORY
   → What do these numbers actually MEAN?
   → Find the human angle in the data
   → Be fun but factual

3. 🚀 MOVERS & SHAKERS
   → Who's winning this week? Who's slipping?
   → Any surprise breakouts or comebacks?
   → Write 2-3 punchy bullets with PERSONALITY
   → Example: "HomesteadHow went from crickets to 157K views with one word: sauerkraut"

4. 🔥 WHAT'S TRENDING
   → Compare THIS WEEK vs LAST WEEK
   → What's heating up? What's cooling down?
   → Spot the shift before anyone else does
   → 3-4 sentences with clear insights
   → Use specific examples from the data

5. 💭 COMMUNITY PULSE
   → What are people ACTUALLY talking about in comments?
   → Any debates brewing?
   → Success stories worth highlighting?
   → Questions everyone's asking?
   → 2-3 sentences capturing the vibe

6. 🔮 LOOKING AHEAD
   → Based on patterns, what should subscribers watch for?
   → Any predictions or trends to follow?
   → Set them up for next week
   → 2-3 sentences

7. STRONG CLOSE
   → 1 sentence that reinforces value
   → Call to action: drive them to the full site
   → Example: "All the deep dives, Q&A, and video breakdowns are waiting at carnivoreweekly.com"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL INSTRUCTIONS:

✓ TONE: Fun, sharp, insider knowledge. Like texting a friend who's deep in this world.
✓ NO FLUFF: Every sentence should deliver value or entertainment
✓ USE DATA: Weave in specific numbers, names, and examples naturally
✓ BE OPINIONATED: Have a point of view. Notice things others miss.
✓ STAY TIGHT: Brief but meaty. Respect their time.
✓ NO MARKDOWN: Plain text only, use section headers with emojis and dashes

AVOID:
✗ Generic statements anyone could write
✗ Just summarizing what's on the website
✗ Boring corporate speak
✗ Walls of text - use short paragraphs!

Think: "What would make ME forward this email to a friend?"

Write the newsletter NOW:
"""

        # Call Claude AI
        response = self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        newsletter_content = response.content[0].text

        print("✓ Newsletter content generated!")
        return newsletter_content


    def format_newsletter(self, content, current_data, stats):
        """Format the newsletter with header and footer"""

        current_date = current_data['analysis_date']

        newsletter = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CARNIVORE WEEKLY INSIDER
Week of {current_date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{content}

🔗 FULL WEEKLY ROUNDUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deep analysis, top videos, Q&A, and more:
→ https://carnivoreweekly.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
See you next Monday,
Carnivore Weekly

P.S. - Reply to this email with questions or suggestions!

🤖 Curated with AI • Made with Claude Code
"""

        return newsletter


    def save_newsletter(self, newsletter, current_data):
        """Save newsletter to file"""

        # Create output directory
        OUTPUT_DIR.mkdir(exist_ok=True)

        # Generate filename with date
        date_str = current_data['analysis_date']
        filename = f"newsletter_{date_str}.txt"
        output_file = OUTPUT_DIR / filename

        # Save
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(newsletter)

        print(f"\n✓ Newsletter saved: {output_file}")

        # Also save as "latest" for easy access
        latest_file = OUTPUT_DIR / 'latest_newsletter.txt'
        with open(latest_file, 'w', encoding='utf-8') as f:
            f.write(newsletter)

        print(f"✓ Latest saved: {latest_file}")

        return output_file


    def generate(self):
        """Main method to generate newsletter"""
        print("\n" + "="*70)
        print("📧 CARNIVORE WEEKLY NEWSLETTER GENERATOR")
        print("="*70)

        # Load data
        current = self.load_current_week()
        last_week = self.load_last_week()

        # Calculate stats
        stats = self.calculate_stats_comparison(current, last_week)

        # Generate content with AI
        content = self.generate_newsletter_content(current, last_week, stats)

        # Format newsletter
        newsletter = self.format_newsletter(content, current, stats)

        # Save
        output_file = self.save_newsletter(newsletter, current)

        print("\n" + "="*70)
        print("✓ NEWSLETTER GENERATION COMPLETE!")
        print("="*70)
        print(f"\n📁 Newsletter saved to: {output_file}")
        print(f"\n💡 Next steps:")
        print(f"   1. Review: cat {output_file}")
        print(f"   2. Send via email service (Mailchimp, ConvertKit, etc.)")
        print(f"   3. Or integrate with API for automatic sending")

        return output_file


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == '__main__':
    try:
        generator = NewsletterGenerator()
        generator.generate()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        raise

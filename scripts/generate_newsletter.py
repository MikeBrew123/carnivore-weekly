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
import re
from datetime import datetime
from pathlib import Path
from anthropic import Anthropic
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader

# Load environment variables
load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / 'data'
ARCHIVE_DIR = DATA_DIR / 'archive'
OUTPUT_DIR = PROJECT_ROOT / 'newsletters'
TEMPLATES_DIR = PROJECT_ROOT / 'templates'

CURRENT_DATA = DATA_DIR / 'analyzed_content.json'

# Affiliate Links
AFFILIATE_LINKS = {
    'lmnt': 'https://amzn.to/4ayLBG4',
    'butcherbox': 'https://www.butcherbox.com',  # Update when approved
}

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


    def parse_newsletter_sections(self, content):
        """Parse AI-generated content into sections"""
        sections = {}

        # Extract subject line (first line after opening)
        lines = content.strip().split('\n')
        sections['subject_line'] = lines[0] if lines else "This Week's Carnivore Roundup"

        # Simple parsing - split by section headers
        sections['opening'] = self._extract_section(content, start_marker='', end_marker='📊')
        sections['by_the_numbers'] = self._extract_section(content, start_marker='📊', end_marker='🚀')
        sections['movers_shakers'] = self._extract_section(content, start_marker='🚀', end_marker='🔥')
        sections['whats_trending'] = self._extract_section(content, start_marker='🔥', end_marker='💭')
        sections['community_pulse'] = self._extract_section(content, start_marker='💭', end_marker='🔮')
        sections['looking_ahead'] = self._extract_section(content, start_marker='🔮', end_marker='━━━')
        sections['closing'] = self._extract_section(content, start_marker='━━━', end_marker=None)

        return sections


    def _extract_section(self, content, start_marker, end_marker):
        """Extract text between two markers"""
        try:
            if start_marker:
                start_idx = content.find(start_marker)
                if start_idx == -1:
                    return ""
                # Find end of line after marker
                start_idx = content.find('\n', start_idx) + 1
            else:
                start_idx = 0

            if end_marker:
                end_idx = content.find(end_marker, start_idx)
                if end_idx == -1:
                    end_idx = len(content)
            else:
                end_idx = len(content)

            return content[start_idx:end_idx].strip()
        except:
            return ""


    def generate_html_newsletter(self, content, current, stats):
        """Generate HTML version of newsletter"""
        print(f"\n🎨 Generating HTML newsletter...")

        # Parse sections
        sections = self.parse_newsletter_sections(content)

        # Get featured videos
        top_videos = current['analysis']['top_videos'][:3]
        featured_videos = []

        for video in top_videos:
            featured_videos.append({
                'url': f"https://youtube.com/watch?v={video['video_id']}",
                'thumbnail': f"https://img.youtube.com/vi/{video['video_id']}/mqdefault.jpg",
                'title': video['title'],
                'creator': video['creator'],
                'views': f"{video['views']:,}",
                'date': video.get('published_at', '')[:10] if video.get('published_at') else ''
            })

        # Load template
        env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
        template = env.get_template('newsletter_template.html')

        # Render HTML
        html = template.render(
            date=current['analysis_date'],
            subject_line=sections.get('subject_line', 'This Week in Carnivore'),
            opening=sections.get('opening', ''),
            by_the_numbers=sections.get('by_the_numbers', ''),
            movers_shakers=sections.get('movers_shakers', ''),
            whats_trending=sections.get('whats_trending', ''),
            community_pulse=sections.get('community_pulse', ''),
            looking_ahead=sections.get('looking_ahead', ''),
            closing=sections.get('closing', ''),
            featured_video_1=featured_videos[0] if len(featured_videos) > 0 else None,
            featured_video_2=featured_videos[1] if len(featured_videos) > 1 else None,
            affiliate_link_lmnt=AFFILIATE_LINKS['lmnt'],
            affiliate_link_butcherbox=AFFILIATE_LINKS['butcherbox'],
            unsubscribe_link='{{ unsubscribe_url }}'  # Email service will replace
        )

        print("✓ HTML newsletter generated!")
        return html


    def save_html_newsletter(self, html, current_data):
        """Save HTML newsletter"""
        # Create output directory
        OUTPUT_DIR.mkdir(exist_ok=True)

        # Generate filename
        date_str = current_data['analysis_date']
        filename = f"newsletter_{date_str}.html"
        output_file = OUTPUT_DIR / filename

        # Save
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✓ HTML saved: {output_file}")

        # Also save as "latest"
        latest_file = OUTPUT_DIR / 'latest_newsletter.html'
        with open(latest_file, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✓ Latest HTML saved: {latest_file}")

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

        # Format plain text newsletter
        newsletter = self.format_newsletter(content, current, stats)

        # Save plain text
        output_file = self.save_newsletter(newsletter, current)

        # Generate HTML version
        html = self.generate_html_newsletter(content, current, stats)
        html_file = self.save_html_newsletter(html, current)

        print("\n" + "="*70)
        print("✓ NEWSLETTER GENERATION COMPLETE!")
        print("="*70)
        print(f"\n📁 Plain text: {output_file}")
        print(f"📁 HTML: {html_file}")
        print(f"\n💡 Next steps:")
        print(f"   1. Preview HTML: open {html_file}")
        print(f"   2. Copy HTML to email service (Mailchimp, ConvertKit, etc.)")
        print(f"   3. Or use plain text for simple email")

        return output_file, html_file


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

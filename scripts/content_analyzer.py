#!/usr/bin/env python3
"""
Content Analyzer for Carnivore Diet YouTube Data

This script uses Claude AI (Anthropic API) to analyze the collected YouTube data
and generate insights, summaries, and trending topics for the weekly update.

IMPORTANT: All output content must pass validation before publishing.
See CONTENT_VALIDATION.md for requirements:
- No em-dashes (max 1 per page)
- No AI tell words (delve, robust, leverage, navigate, etc.)
- Conversational tone with specific examples
- Varied sentence lengths and natural contractions
- Each persona matches their authentic voice

Personas Used:
- Sarah (Health Coach): weekly_summary, community_sentiment
- Chloe (Marketing & Community): trending_topics
- Marcus (Sales & Partnerships): key_insights

Author: Created with Claude Code
Date: 2025-12-26
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Third-party imports
from dotenv import load_dotenv
from anthropic import Anthropic

# Local imports
from personas_helper import PersonaManager

# Load environment variables
load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
INPUT_FILE = DATA_DIR / "youtube_data.json"
OUTPUT_FILE = DATA_DIR / "analyzed_content.json"

# Claude model to use
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"


# ============================================================================
# CONTENT ANALYZER CLASS
# ============================================================================


class ContentAnalyzer:
    """
    Analyzes carnivore diet YouTube content using Claude AI
    """

    def __init__(self, api_key: str):
        """Initialize the Anthropic client and persona manager"""
        if not api_key:
            raise ValueError(
                "Anthropic API key not found! "
                "Please set ANTHROPIC_API_KEY in your .env file"
            )

        self.client = Anthropic(api_key=api_key)
        self.persona_manager = PersonaManager()
        print("✓ Claude AI client initialized")
        print("✓ Persona manager initialized")

    def load_youtube_data(self, input_file: Path) -> Dict:
        """Load the YouTube data from JSON file"""
        print(f"\n📂 Loading YouTube data from: {input_file}")

        if not input_file.exists():
            raise FileNotFoundError(
                f"YouTube data file not found: {input_file}\n"
                "Please run youtube_collector.py first!"
            )

        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"✓ Loaded data for {len(data['top_creators'])} creators")
        return data

    def create_analysis_prompt(self, youtube_data: Dict) -> str:
        """
        Create a detailed prompt for Claude to analyze the YouTube data with persona context
        """
        # Extract key information for the prompt
        creators = youtube_data["top_creators"]
        total_videos = sum(len(c["videos"]) for c in creators)

        # Get persona contexts for different sections
        sarah_context = self.persona_manager.get_persona_context("sarah")
        marcus_context = self.persona_manager.get_persona_context("marcus")
        chloe_context = self.persona_manager.get_persona_context("chloe")

        # Build a summary of all videos and comments
        content_summary = []

        for creator in creators:
            creator_info = f"\n## {creator['channel_name']}\n"
            creator_info += f"Channel ID: {creator['channel_id']}\n"
            creator_info += (
                f"Total views (past week): {creator['total_views_week']:,}\n"
            )
            creator_info += f"Videos ({len(creator['videos'])}):\n"

            for video in creator["videos"]:
                video_info = f"\n### {video['title']}\n"
                video_info += f"- Video ID: {video['video_id']}\n"
                video_info += f"- Published: {video['published_at']}\n"
                video_info += f"- Views: {video['statistics']['view_count']:,}\n"
                video_info += f"- Likes: {video['statistics']['like_count']:,}\n"
                video_info += f"- Comments: {video['statistics']['comment_count']:,}\n"

                # Add top 5 comments for context
                if video["top_comments"]:
                    video_info += "\nTop comments:\n"
                    for i, comment in enumerate(video["top_comments"][:5], 1):
                        video_info += f"{i}. {comment['text'][:100]}...\n"

                creator_info += video_info

            content_summary.append(creator_info)

        # Create the full prompt with persona guidance
        prompt = f"""You are analyzing carnivore diet content from YouTube for a weekly content hub.

IMPORTANT: Different sections will be written by different authors with distinct voices:

**WEEKLY_SUMMARY (Sarah's voice):**
{sarah_context}

WIKI LINKING INSTRUCTIONS FOR WEEKLY SUMMARY:
When you mention complex carnivore topics for the FIRST TIME, wrap them in an HTML link to the wiki.
Available wiki sections (use these anchor links):
- Weight loss / stalls / plateaus → <a href="wiki.html#weight-stall" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Cholesterol / LDL / HDL → <a href="wiki.html#cholesterol" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Fiber concerns → <a href="wiki.html#fiber" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Dairy questions → <a href="wiki.html#dairy" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Coffee / caffeine → <a href="wiki.html#coffee" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Scurvy / vitamin C → <a href="wiki.html#scurvy" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Digestion / constipation / diarrhea → <a href="wiki.html#digestion" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Salt / sodium → <a href="wiki.html#salt" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Electrolytes / potassium / magnesium → <a href="wiki.html#electrolytes" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Alcohol / drinking / beer → <a href="wiki.html#alcohol" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Organ meats / liver / kidney → <a href="wiki.html#organ-meats" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Budget / cost / affordable → <a href="wiki.html#budget" style="color: #8b4513; text-decoration: none;">descriptive text</a>
- Gout / uric acid → <a href="wiki.html#gout" style="color: #8b4513; text-decoration: none;">descriptive text</a>

LINKING RULES:
1. First mention only - don't link the same topic twice
2. Use descriptive anchor text - the natural phrase you're writing (e.g., "weight loss stalls", "electrolyte management")
3. NEVER use "click here" or generic phrases
4. Only link if the topic is genuinely complex/confusing - don't over-link (max 2-3 links per summary)
5. Link styling is already in the HTML - just use the template above

Example:
BAD: "Many people ask about weight loss. <a href="wiki.html#weight-stall">Click here</a> to learn more."
GOOD: "The <a href="wiki.html#weight-stall" style="color: #8b4513; text-decoration: none;">weight loss stall conversation</a> is heating up, and I'm noticing something interesting..."

**TRENDING_TOPICS (Chloe's voice):**
{chloe_context}

**KEY_INSIGHTS (Marcus's voice):**
{marcus_context}

**COMMUNITY_SENTIMENT (Sarah's voice):**
{sarah_context}

CRITICAL WRITING GUIDELINES:
- NO em-dashes (—). Use periods, commas, or colons instead.
- NO clichés: avoid "delve," "robust," "leverage," "navigate," "crucial," "it's important to note"
- SPECIFIC examples over generalizations
- CONVERSATIONAL tone - sounds like talking to a friend
- Varied sentence lengths (mix short and long)
- Use contractions naturally (don't, can't, won't)

When generating each section, adopt the appropriate persona's voice, tone, and style above.

I've collected data from the top {len(creators)} carnivore diet creators over the past week ({total_videos} total videos).

Here's the detailed data:

{''.join(content_summary)}

Please provide a comprehensive analysis in JSON format with the following structure:

{{
  "weekly_summary": "A 2-3 paragraph overview of the week's carnivore diet content",
  "trending_topics": [
    {{
      "topic": "Topic name",
      "description": "Why it's trending",
      "mentioned_by": ["Creator 1", "Creator 2"]
    }}
  ],
  "top_videos": [
    {{
      "video_id": "video_id from data",
      "channel_id": "channel_id from data",
      "title": "Video title",
      "creator": "Creator name",
      "views": number,
      "published_at": "published_at from data",
      "why_notable": "What makes this video stand out"
    }}
  ],
  "community_sentiment": {{
    "overall_tone": "positive/neutral/mixed",
    "common_questions": ["Question 1", "Question 2"],
    "success_stories": [
      {{
        "story": "Summary of success story",
        "username": "commenter username from data",
        "video_id": "video_id where comment was found",
        "video_title": "title of video"
      }}
    ]
  }},
  "key_insights": [
    "Insight 1",
    "Insight 2",
    "Insight 3"
  ],
  "recommended_watching": [
    {{
      "video_id": "video_id from data",
      "channel_id": "channel_id from data",
      "title": "Video title",
      "creator": "Creator name",
      "published_at": "published_at from data",
      "reason": "Why viewers should watch this"
    }}
  ]
}}

Focus on:
1. What topics are creators discussing this week?
2. Are there any controversies or debates?
3. What questions is the community asking?
4. Any notable success stories or testimonials?
5. Which videos provide the most value to viewers?

**IMPORTANT**: Make sure to include video_id, channel_id, and published_at (from the data provided above) in top_videos and recommended_watching so we can create clickable links and show publish dates.

Provide actionable, interesting insights that would help someone stay up-to-date with the carnivore diet community."""

        return prompt

    def analyze_content(self, youtube_data: Dict) -> Dict:
        """
        Use Claude AI to analyze the YouTube content
        """
        print("\n🤖 Analyzing content with Claude AI...")
        print(f"   Model: {CLAUDE_MODEL}")

        # Create the analysis prompt
        prompt = self.create_analysis_prompt(youtube_data)

        # Call Claude API
        try:
            message = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )

            # Extract the response
            response_text = message.content[0].text

            print("✓ Analysis complete!")

            # Parse the JSON response
            try:
                analysis = json.loads(response_text)
                return analysis
            except json.JSONDecodeError:
                # If Claude didn't return pure JSON, try to extract it
                print("⚠ Response wasn't pure JSON, extracting...")
                # Find JSON in the response
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start != -1 and end > start:
                    analysis = json.loads(response_text[start:end])
                    return analysis
                else:
                    raise ValueError("Could not extract JSON from Claude's response")

        except Exception as e:
            print(f"✗ Error during analysis: {e}")
            raise

    def apply_persona_signatures(self, analysis: Dict) -> Dict:
        """
        Apply persona signatures to analysis sections

        Maps sections to personas:
        - weekly_summary -> Sarah
        - trending_topics -> Chloe
        - key_insights -> Marcus
        - community_sentiment -> Sarah
        """
        # Apply Sarah's signature to weekly_summary
        if "weekly_summary" in analysis:
            analysis["weekly_summary"] += f"\n\n{self.persona_manager.get_persona_signature('sarah')}"

        # Apply Chloe's signature to trending_topics
        if "trending_topics" in analysis and analysis["trending_topics"]:
            # Add signature as a final note
            topics_note = f"_Curated by {self.persona_manager.get_persona_signature('chloe').strip()}_"
            analysis["trending_topics_author"] = topics_note

        # Apply Marcus's signature to key_insights
        if "key_insights" in analysis and analysis["key_insights"]:
            insights_note = f"_Strategic insights by {self.persona_manager.get_persona_signature('marcus').strip()}_"
            analysis["key_insights_author"] = insights_note

        # Apply Sarah's signature to community_sentiment
        if "community_sentiment" in analysis:
            sentiment = analysis["community_sentiment"]
            if isinstance(sentiment, dict) and "overall_tone" in sentiment:
                sentiment["analyst"] = self.persona_manager.get_persona_signature('sarah').strip()

        return analysis

    def generate_video_summaries(self, videos: List[Dict]) -> List[Dict]:
        """
        Generate 2-3 sentence summaries for each video using Claude API.
        Summaries explain why the video matters and who should watch.

        Returns: List of videos with added 'summary' field
        """
        print("\n🧠 Generating video summaries with Claude...")

        for video in videos:
            title = video.get("title", "Unknown")
            creator = video.get("creator", "Unknown")

            prompt = f"""Write a 2-3 sentence summary for this carnivore diet video.

Video: "{title}"
Creator: {creator}

Requirements:
- Explain why this video matters for carnivore dieters
- Include 1 key insight or takeaway
- Mention who should watch (e.g., "Watch if you've hit a weight stall")
- Keep it actionable and specific
- Grade 8-10 reading level
- No hype or excessive praise - direct and clear

Format: Just the summary, no extra text."""

            try:
                response = self.client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=150,
                    messages=[{"role": "user", "content": prompt}],
                )

                summary = response.content[0].text.strip()
                video["summary"] = summary

            except Exception as e:
                print(f"  ⚠️  Failed to generate summary for '{title}': {e}")
                video["summary"] = ""  # Fallback to empty

        print(f"  ✓ Generated summaries for {len(videos)} videos")
        return videos

    def auto_tag_videos(self, videos: List[Dict]) -> List[Dict]:
        """
        Assign 2-3 topic tags to each video for filtering/search.

        Tags enable:
        - "Filter by Topic" UI on homepage
        - Tag-based search ("Show me all cholesterol videos")
        - Long-tail SEO ("carnivore diet cholesterol videos")

        Returns: List of videos with added 'tags' field (list of strings)
        """
        print("\n🏷️  Auto-tagging videos with topics...")

        # Define allowed tags for consistency
        ALLOWED_TAGS = [
            "weight loss",
            "cholesterol",
            "dairy",
            "gut health",
            "inflammation",
            "beginners",
            "advanced",
            "fasting",
            "protein",
            "fat",
            "electrolytes",
            "salt",
            "coffee",
            "alcohol",
            "budget",
            "organ meats",
            "meal prep",
            "science",
            "testimonials",
            "debate",
        ]

        for video in videos:
            title = video.get("title", "Unknown")
            creator = video.get("creator", "Unknown")
            summary = video.get("summary", "")

            prompt = f"""Assign 2-3 topic tags to this carnivore diet video.

Video: "{title}"
Creator: {creator}
Summary: {summary}

Allowed tags: {', '.join(ALLOWED_TAGS)}

Instructions:
- Choose 2-3 most relevant tags from the allowed list
- Base tags on the video's main topics
- Return ONLY the tags as a comma-separated list
- No explanations, just the tags

Example output: cholesterol, science, advanced"""

            try:
                response = self.client.messages.create(
                    model="claude-opus-4-5-20251101",  # Use Opus for accuracy (cost-effective for tagging)
                    max_tokens=50,
                    messages=[{"role": "user", "content": prompt}],
                )

                tags_text = response.content[0].text.strip()
                # Parse comma-separated tags
                tags = [tag.strip() for tag in tags_text.split(",")]
                # Validate tags are in allowed list (case-insensitive)
                tags = [
                    tag
                    for tag in tags
                    if tag.lower() in [t.lower() for t in ALLOWED_TAGS]
                ]

                video["tags"] = tags[:3]  # Limit to 3 max

            except Exception as e:
                print(f"  ⚠️  Failed to tag '{title}': {e}")
                video["tags"] = []  # Fallback to empty

        print(f"  ✓ Tagged {len(videos)} videos")
        return videos

    def save_analysis(self, analysis: Dict, youtube_data: Dict, output_file: Path):
        """
        Save the analyzed content to a JSON file
        """
        print(f"\n💾 Saving analysis to: {output_file}")

        # Combine original data with analysis
        final_data = {
            "analysis_date": datetime.now().strftime("%Y-%m-%d"),
            "analysis_timestamp": datetime.now().isoformat(),
            "source_data": {
                "collection_date": youtube_data["collection_date"],
                "total_creators": youtube_data["top_creators_count"],
                "total_videos": sum(
                    len(c["videos"]) for c in youtube_data["top_creators"]
                ),
                "search_query": youtube_data["search_query"],
            },
            "analysis": analysis,
            "creators_data": youtube_data["top_creators"],
        }

        # Create output directory if needed
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Save to file
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)

        print("✓ Analysis saved successfully!")
        print(f"\n📊 Analysis Summary:")
        print(f"   - Trending topics: {len(analysis.get('trending_topics', []))}")
        print(f"   - Top videos highlighted: {len(analysis.get('top_videos', []))}")
        print(f"   - Key insights: {len(analysis.get('key_insights', []))}")
        print(
            f"   - Recommended videos: {len(analysis.get('recommended_watching', []))}"
        )

    def run_analysis(self):
        """
        Main method to run the complete analysis pipeline
        """
        print("\n" + "=" * 70)
        print("🧠 CARNIVORE DIET CONTENT ANALYZER")
        print("=" * 70)

        try:
            # Load YouTube data
            youtube_data = self.load_youtube_data(INPUT_FILE)

            # Analyze content with Claude
            analysis = self.analyze_content(youtube_data)

            # Apply persona signatures to analysis sections
            analysis = self.apply_persona_signatures(analysis)

            # Generate summaries and tags for top videos (Phase A)
            top_videos = analysis.get("top_videos", [])
            if top_videos:
                top_videos = self.generate_video_summaries(top_videos)
                top_videos = self.auto_tag_videos(top_videos)
                analysis["top_videos"] = top_videos

            # Save results
            self.save_analysis(analysis, youtube_data, OUTPUT_FILE)

            print("\n" + "=" * 70)
            print("✓ ANALYSIS COMPLETE!")
            print("=" * 70)
            print(f"\n📁 Results saved to: {OUTPUT_FILE}")
            print("\nNext step: Run generate_pages.py to create the website!\n")

        except FileNotFoundError as e:
            print(f"\n✗ Error: {e}")
        except Exception as e:
            print(f"\n✗ Unexpected error: {e}")
            raise


# ============================================================================
# MAIN EXECUTION
# ============================================================================


def main():
    """Main function"""
    try:
        analyzer = ContentAnalyzer(ANTHROPIC_API_KEY)
        analyzer.run_analysis()

    except ValueError as e:
        print(f"\n✗ Configuration Error: {e}")
        print("\nPlease check:")
        print("1. ANTHROPIC_API_KEY is set in your .env file")
        print("2. Your API key is valid")
        print("3. You have credits available in your Anthropic account")

    except KeyboardInterrupt:
        print("\n\n⚠ Analysis interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()

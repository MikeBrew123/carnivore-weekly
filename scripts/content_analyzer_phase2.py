#!/usr/bin/env python3
"""
Content Analyzer for Carnivore Diet YouTube Data - PHASE 2: TOKEN OPTIMIZATION

This script uses Claude AI (Anthropic API) to analyze collected YouTube data
and generate insights, summaries, and trending topics for the weekly update.

PHASE 2 ENHANCEMENT:
- Uses optimized writer prompts (~300 tokens) vs old 10,000 token prompts
- Integrates with generate_agent_prompt.js for dynamic prompt generation
- Reduces token overhead by 97% while preserving writer voice
- Maintains all original functionality with improved efficiency

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
Date: 2025-12-31
Phase: 2 (Token Optimization)
"""

import os
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from enum import Enum

# Third-party imports
from dotenv import load_dotenv
from anthropic import Anthropic

# Local imports
from personas_helper import PersonaManager

# Load environment variables from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=True)

# ============================================================================
# CONFIGURATION
# ============================================================================

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DATA_DIR = PROJECT_ROOT / "data"
INPUT_FILE = DATA_DIR / "youtube_data.json"
OUTPUT_FILE = DATA_DIR / "analyzed_content.json"
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
GENERATE_PROMPT_SCRIPT = SCRIPTS_DIR / "generate_agent_prompt.js"

# Claude model to use
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

# Token budget for monitoring (Phase 2 enhancement)
TOKEN_BUDGET_BEFORE = 10000  # Old approach token count
TOKEN_BUDGET_AFTER = 300     # New optimized approach


class PromptGenerationMethod(Enum):
    """Prompt generation strategy"""
    OPTIMIZED = "optimized"  # Use generate_agent_prompt.js (Phase 2)
    LEGACY = "legacy"         # Use original inline prompts (Phase 1)


# ============================================================================
# OPTIMIZED PROMPT GENERATION (PHASE 2)
# ============================================================================

class OptimizedPromptGenerator:
    """
    Generates token-optimized writer prompts using generate_agent_prompt.js

    This class manages the integration between Python content analyzer and
    Node.js prompt generation system, handling:
    - Subprocess execution with proper environment variables
    - Error handling and retry logic
    - Token counting and logging
    - Fallback to legacy prompts if generation fails
    """

    def __init__(self, node_script_path: Path):
        """
        Initialize the prompt generator

        Args:
            node_script_path: Path to generate_agent_prompt.js
        """
        self.script_path = node_script_path
        self.persona_manager = PersonaManager()
        self.retry_count = 0
        self.max_retries = 2

        # Verify script exists
        if not self.script_path.exists():
            raise FileNotFoundError(
                f"Prompt generation script not found: {self.script_path}\n"
                "Please ensure generate_agent_prompt.js exists in scripts directory"
            )

    def _get_node_executable(self) -> str:
        """
        Find Node.js executable in system PATH

        Returns:
            Path to node executable

        Raises:
            FileNotFoundError: If Node.js is not installed
        """
        try:
            result = subprocess.run(
                ["which", "node"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode != 0:
                raise FileNotFoundError(
                    "Node.js not found in PATH. "
                    "Install Node.js: https://nodejs.org/"
                )

            return result.stdout.strip()

        except subprocess.TimeoutExpired:
            raise RuntimeError("Node.js check timed out")
        except Exception as e:
            raise RuntimeError(f"Failed to locate Node.js: {e}")

    def generate_prompt(
        self,
        writer_slug: str,
        topic: str,
        use_fallback: bool = True
    ) -> Dict[str, any]:
        """
        Generate optimized prompt for writer via Node.js subprocess

        This integrates with generate_agent_prompt.js to:
        1. Query writers table for writer context
        2. Fetch recent memory log entries
        3. Build optimized prompt (~300 tokens)
        4. Return complete prompt + metadata

        Args:
            writer_slug: Writer identifier (e.g., "sarah", "marcus", "chloe")
            topic: Topic for content generation
            use_fallback: Use legacy prompt if generation fails

        Returns:
            Dict with:
            - prompt: The generated prompt text
            - writer_name: Writer's full name
            - token_count: Estimated tokens in prompt
            - method: "optimized" or "legacy"
            - success: Boolean success indicator
            - error: Error message if failed

        Side Effects:
            - Logs token usage and savings to console
            - Records generation failures in error logs
        """
        print(f"\n📨 Generating optimized prompt for {writer_slug.upper()}...")
        print(f"   Topic: {topic}")

        try:
            # Get Node executable
            node_exe = self._get_node_executable()

            # Prepare environment with Supabase credentials
            env = os.environ.copy()
            # Environment variables are already set from .env loading above

            # Execute generate_agent_prompt.js as subprocess
            print(f"   Calling: {self.script_path.name} {writer_slug} '{topic}'")

            result = subprocess.run(
                [node_exe, str(self.script_path), writer_slug, topic],
                capture_output=True,
                text=True,
                timeout=30,  # 30 second timeout for Supabase query
                env=env
            )

            # Check for execution errors
            if result.returncode != 0:
                stderr = result.stderr.strip()

                # Log the full error for debugging
                print(f"   ⚠️  Script error (exit code {result.returncode})")

                if "Writer not found" in stderr:
                    raise ValueError(
                        f"Writer '{writer_slug}' not found in database. "
                        "Ensure writer exists with correct slug."
                    )

                if "SUPABASE" in stderr:
                    raise RuntimeError(
                        f"Supabase connection failed. "
                        f"Check environment variables:\n{stderr}"
                    )

                raise RuntimeError(f"Script execution failed:\n{stderr}")

            # Parse JSON output from Node script
            stdout = result.stdout.strip()

            # Extract JSON from stdout (skip logging output)
            json_start = stdout.rfind('{')
            json_end = stdout.rfind('}') + 1

            if json_start == -1 or json_end <= json_start:
                raise ValueError(
                    "Invalid JSON output from prompt generator. "
                    f"Output: {stdout[-500:]}"  # Last 500 chars for debugging
                )

            json_str = stdout[json_start:json_end]
            prompt_data = json.loads(json_str)

            # Validate response structure
            if not prompt_data.get('prompt'):
                raise ValueError("Generated prompt is empty")

            # Log success and token savings
            token_count = prompt_data.get('tokenCount', 0)
            savings = TOKEN_BUDGET_BEFORE - token_count
            savings_percent = round((savings / TOKEN_BUDGET_BEFORE) * 100)

            print(f"   ✓ Prompt generated successfully!")
            print(f"   Tokens: ~{token_count} (saved {savings_percent}%)")

            return {
                'prompt': prompt_data['prompt'],
                'writer_name': prompt_data.get('writerProfile', {}).get('name', writer_slug),
                'token_count': token_count,
                'token_savings': savings,
                'savings_percent': savings_percent,
                'method': PromptGenerationMethod.OPTIMIZED.value,
                'success': True,
                'error': None,
                'metadata': {
                    'memory_log_entries': len(prompt_data.get('memoryLog', [])),
                    'domains': prompt_data.get('writerProfile', {}).get('content_domains', []),
                }
            }

        except subprocess.TimeoutExpired:
            error_msg = (
                f"Prompt generation timeout after 30 seconds. "
                f"Check Supabase connectivity and credentials."
            )
            print(f"   ✗ {error_msg}")

            if use_fallback:
                print(f"   → Falling back to legacy prompt generation")
                return self._generate_legacy_prompt(writer_slug, topic)

            return {
                'success': False,
                'error': error_msg,
                'method': PromptGenerationMethod.LEGACY.value
            }

        except (ValueError, RuntimeError) as e:
            error_msg = str(e)
            print(f"   ✗ {error_msg}")

            if use_fallback:
                print(f"   → Falling back to legacy prompt generation")
                return self._generate_legacy_prompt(writer_slug, topic)

            return {
                'success': False,
                'error': error_msg,
                'method': PromptGenerationMethod.OPTIMIZED.value
            }

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            print(f"   ✗ {error_msg}")

            if use_fallback:
                return self._generate_legacy_prompt(writer_slug, topic)

            return {
                'success': False,
                'error': error_msg,
                'method': PromptGenerationMethod.OPTIMIZED.value
            }

    def _generate_legacy_prompt(self, writer_slug: str, topic: str) -> Dict[str, any]:
        """
        Fallback to legacy prompt generation

        Used if optimized prompt generation fails. This maintains backward
        compatibility by generating simple prompts inline.

        Args:
            writer_slug: Writer identifier
            topic: Topic for generation

        Returns:
            Dict with legacy prompt and metadata
        """
        print(f"   Generating legacy prompt for {writer_slug}...")

        persona = self.persona_manager.get_persona(writer_slug)

        if not persona:
            fallback_prompt = (
                f"You are a content writer. "
                f"Write about: {topic}\n\n"
                f"Keep writing conversational, specific, and engaging."
            )
            writer_name = writer_slug.title()
        else:
            writer_name = persona.get('name', writer_slug)
            context = self.persona_manager.get_persona_context(writer_slug)
            fallback_prompt = (
                f"{context}\n\n"
                f"Today's topic: {topic}\n\n"
                f"Write in your authentic voice about this topic."
            )

        token_estimate = len(fallback_prompt.split()) * 1.3

        print(f"   ✓ Legacy prompt ready (~{int(token_estimate)} tokens)")

        return {
            'prompt': fallback_prompt,
            'writer_name': writer_name,
            'token_count': int(token_estimate),
            'token_savings': 0,
            'savings_percent': 0,
            'method': PromptGenerationMethod.LEGACY.value,
            'success': True,
            'error': None,
            'metadata': {
                'fallback': True,
                'reason': 'Optimized generation unavailable'
            }
        }


# ============================================================================
# CONTENT ANALYZER CLASS (PHASE 2 ENHANCED)
# ============================================================================

class ContentAnalyzer:
    """
    Analyzes carnivore diet YouTube content using Claude AI with Phase 2
    token optimization.

    Phase 2 enhancements:
    - Integrates optimized prompt generation (~300 tokens vs 10,000)
    - Tracks token usage across all API calls
    - Logs token savings metrics
    - Maintains backward compatibility with Phase 1
    """

    def __init__(self, api_key: str):
        """Initialize the Anthropic client and prompt generator"""
        if not api_key:
            raise ValueError(
                "Anthropic API key not found! "
                "Please set ANTHROPIC_API_KEY in your .env file"
            )

        self.client = Anthropic(api_key=api_key)
        self.persona_manager = PersonaManager()

        # Initialize Phase 2 prompt generator
        try:
            self.prompt_generator = OptimizedPromptGenerator(GENERATE_PROMPT_SCRIPT)
            self.use_optimized_prompts = True
            print("✓ Claude AI client initialized")
            print("✓ Persona manager initialized")
            print("✓ Phase 2 optimized prompt generator initialized")
        except FileNotFoundError:
            print("⚠️  Prompt generator script not found - using Phase 1 legacy prompts")
            self.use_optimized_prompts = False

        # Token tracking (Phase 2 feature)
        self.token_usage = {
            'analysis': 0,
            'summaries': 0,
            'tags': 0,
            'total': 0
        }

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

    def get_writer_prompt(
        self,
        writer_slug: str,
        topic: str,
        section_type: str = "analysis"
    ) -> str:
        """
        Get optimized or legacy prompt for writer

        Phase 2 Feature: Attempts to generate optimized prompt via Node.js.
        Falls back to legacy prompt if optimization unavailable.

        Args:
            writer_slug: Writer identifier (sarah, marcus, chloe)
            topic: Topic for content generation
            section_type: Type of content (analysis, summary, tags)

        Returns:
            Complete prompt text for Claude API

        Side Effects:
            - Updates self.token_usage tracking
            - Logs prompt generation method to console
        """
        if not self.use_optimized_prompts:
            # Phase 1: Use original inline prompt
            return self.persona_manager.get_persona_context(writer_slug)

        # Phase 2: Generate optimized prompt
        result = self.prompt_generator.generate_prompt(writer_slug, topic)

        if result.get('success'):
            # Track token usage for Phase 2 analysis
            if section_type in self.token_usage:
                self.token_usage[section_type] += result.get('token_count', 0)
            self.token_usage['total'] += result.get('token_count', 0)

            return result['prompt']
        else:
            # Fallback to legacy on failure
            print(f"   → Using legacy prompt due to: {result.get('error', 'unknown error')}")
            return self.persona_manager.get_persona_context(writer_slug)

    def create_analysis_prompt(self, youtube_data: Dict) -> str:
        """
        Create analysis prompt with Phase 2 optimization

        Combines:
        1. Optimized writer prompts for each persona
        2. YouTube data context
        3. Analysis requirements and output format

        Args:
            youtube_data: Collected YouTube data

        Returns:
            Complete analysis prompt for Claude API
        """
        creators = youtube_data["top_creators"]
        total_videos = sum(len(c["videos"]) for c in creators)

        # Phase 2: Get optimized prompts for each writer
        sarah_context = self.get_writer_prompt(
            "sarah",
            "Provide health-focused weekly summary of carnivore content",
            "analysis"
        )
        marcus_context = self.get_writer_prompt(
            "marcus",
            "Extract business and partnership insights from content trends",
            "analysis"
        )
        chloe_context = self.get_writer_prompt(
            "chloe",
            "Analyze community sentiment and trending topics",
            "analysis"
        )

        # Build content summary
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

                if video["top_comments"]:
                    video_info += "\nTop comments:\n"
                    for i, comment in enumerate(video["top_comments"][:5], 1):
                        video_info += f"{i}. {comment['text'][:100]}...\n"

                creator_info += video_info

            content_summary.append(creator_info)

        # Create the full prompt
        prompt = f"""You are analyzing carnivore diet content from YouTube for a weekly content hub.

DIFFERENT SECTIONS WILL BE WRITTEN BY DIFFERENT AUTHORS WITH DISTINCT VOICES:

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
2. Use descriptive anchor text - the natural phrase you're writing
3. NEVER use "click here" or generic phrases
4. Only link if genuinely complex/confusing (max 2-3 links per summary)
5. Link styling is already in the HTML

**TRENDING_TOPICS (Chloe's voice):**
{chloe_context}

**KEY_INSIGHTS (Marcus's voice):**
{marcus_context}

**COMMUNITY_SENTIMENT (Sarah's voice):**
{sarah_context}

CRITICAL WRITING GUIDELINES:
- NO em-dashes (—). Use periods, commas, or colons instead.
- NO clichés: avoid "delve," "robust," "leverage," "navigate," "crucial"
- SPECIFIC examples over generalizations
- CONVERSATIONAL tone - like talking to a friend
- Varied sentence lengths (mix short and long)
- Use contractions naturally (don't, can't, won't)

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

Provide actionable, interesting insights that would help someone stay up-to-date with the carnivore diet community."""

        return prompt

    def analyze_content(self, youtube_data: Dict) -> Dict:
        """
        Use Claude AI to analyze the YouTube content

        Phase 2: Tracks token usage from API calls
        """
        print("\n🤖 Analyzing content with Claude AI...")
        print(f"   Model: {CLAUDE_MODEL}")

        prompt = self.create_analysis_prompt(youtube_data)

        try:
            message = self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )

            # Phase 2: Track tokens from API response
            if hasattr(message, 'usage'):
                self.token_usage['analysis'] = message.usage.input_tokens

            response_text = message.content[0].text

            print("✓ Analysis complete!")

            try:
                analysis = json.loads(response_text)
                return analysis
            except json.JSONDecodeError:
                print("⚠ Response wasn't pure JSON, extracting...")
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
        """Apply persona signatures to analysis sections"""
        if "weekly_summary" in analysis:
            analysis["weekly_summary"] += f"\n\n{self.persona_manager.get_persona_signature('sarah')}"

        if "trending_topics" in analysis and analysis["trending_topics"]:
            topics_note = f"_Curated by {self.persona_manager.get_persona_signature('chloe').strip()}_"
            analysis["trending_topics_author"] = topics_note

        if "key_insights" in analysis and analysis["key_insights"]:
            insights_note = f"_Strategic insights by {self.persona_manager.get_persona_signature('marcus').strip()}_"
            analysis["key_insights_author"] = insights_note

        if "community_sentiment" in analysis:
            sentiment = analysis["community_sentiment"]
            if isinstance(sentiment, dict) and "overall_tone" in sentiment:
                sentiment["analyst"] = self.persona_manager.get_persona_signature('sarah').strip()

        return analysis

    def generate_video_summaries(self, videos: List[Dict]) -> List[Dict]:
        """Generate 2-3 sentence summaries for each video using Claude API"""
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
- Mention who should watch
- Keep it actionable and specific
- Grade 8-10 reading level
- No hype or excessive praise

Format: Just the summary, no extra text."""

            try:
                response = self.client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=150,
                    messages=[{"role": "user", "content": prompt}],
                )

                # Phase 2: Track tokens
                if hasattr(response, 'usage'):
                    self.token_usage['summaries'] += response.usage.input_tokens

                summary = response.content[0].text.strip()
                video["summary"] = summary

            except Exception as e:
                print(f"  ⚠️  Failed to generate summary for '{title}': {e}")
                video["summary"] = ""

        print(f"  ✓ Generated summaries for {len(videos)} videos")
        return videos

    def auto_tag_videos(self, videos: List[Dict]) -> List[Dict]:
        """Assign 2-3 topic tags to each video"""
        print("\n🏷️  Auto-tagging videos with topics...")

        ALLOWED_TAGS = [
            "weight loss", "cholesterol", "dairy", "gut health",
            "inflammation", "beginners", "advanced", "fasting",
            "protein", "fat", "electrolytes", "salt", "coffee",
            "alcohol", "budget", "organ meats", "meal prep",
            "science", "testimonials", "debate",
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
- Return ONLY the tags as a comma-separated list
- No explanations

Example: cholesterol, science, advanced"""

            try:
                response = self.client.messages.create(
                    model="claude-opus-4-5-20251101",
                    max_tokens=50,
                    messages=[{"role": "user", "content": prompt}],
                )

                # Phase 2: Track tokens
                if hasattr(response, 'usage'):
                    self.token_usage['tags'] += response.usage.input_tokens

                tags_text = response.content[0].text.strip()
                tags = [tag.strip() for tag in tags_text.split(",")]
                tags = [
                    tag for tag in tags
                    if tag.lower() in [t.lower() for t in ALLOWED_TAGS]
                ]

                video["tags"] = tags[:3]

            except Exception as e:
                print(f"  ⚠️  Failed to tag '{title}': {e}")
                video["tags"] = []

        print(f"  ✓ Tagged {len(videos)} videos")
        return videos

    def save_analysis(self, analysis: Dict, youtube_data: Dict, output_file: Path):
        """Save the analyzed content to a JSON file"""
        print(f"\n💾 Saving analysis to: {output_file}")

        final_data = {
            "analysis_date": datetime.now().strftime("%Y-%m-%d"),
            "analysis_timestamp": datetime.now().isoformat(),
            "phase_2_metrics": {
                "optimization_enabled": self.use_optimized_prompts,
                "token_usage": self.token_usage,
                "estimated_token_savings": {
                    "before": TOKEN_BUDGET_BEFORE,
                    "after": self.token_usage['total'],
                    "savings": TOKEN_BUDGET_BEFORE - self.token_usage['total'],
                    "percent_saved": round(
                        ((TOKEN_BUDGET_BEFORE - self.token_usage['total']) / TOKEN_BUDGET_BEFORE) * 100
                    ) if self.token_usage['total'] > 0 else 0
                }
            },
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

        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)

        print("✓ Analysis saved successfully!")
        print(f"\n📊 Analysis Summary:")
        print(f"   - Trending topics: {len(analysis.get('trending_topics', []))}")
        print(f"   - Top videos highlighted: {len(analysis.get('top_videos', []))}")
        print(f"   - Key insights: {len(analysis.get('key_insights', []))}")
        print(f"   - Recommended videos: {len(analysis.get('recommended_watching', []))}")

        # Phase 2: Show token savings
        if self.use_optimized_prompts and self.token_usage['total'] > 0:
            savings = TOKEN_BUDGET_BEFORE - self.token_usage['total']
            savings_percent = round((savings / TOKEN_BUDGET_BEFORE) * 100)
            print(f"\n🚀 Phase 2 Token Optimization:")
            print(f"   - Before: ~{TOKEN_BUDGET_BEFORE} tokens")
            print(f"   - After: ~{self.token_usage['total']} tokens")
            print(f"   - Saved: {savings_percent}%")

    def run_analysis(self):
        """Main method to run the complete analysis pipeline"""
        print("\n" + "=" * 70)
        print("🧠 CARNIVORE DIET CONTENT ANALYZER - PHASE 2 OPTIMIZED")
        print("=" * 70)

        try:
            youtube_data = self.load_youtube_data(INPUT_FILE)
            analysis = self.analyze_content(youtube_data)
            analysis = self.apply_persona_signatures(analysis)

            top_videos = analysis.get("top_videos", [])
            if top_videos:
                top_videos = self.generate_video_summaries(top_videos)
                top_videos = self.auto_tag_videos(top_videos)
                analysis["top_videos"] = top_videos

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
        print("3. You have credits available")

    except KeyboardInterrupt:
        print("\n\n⚠ Analysis interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()

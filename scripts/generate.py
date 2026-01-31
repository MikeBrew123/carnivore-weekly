#!/usr/bin/env python3
"""
Unified Generator for Carnivore Weekly

Consolidates generation logic from multiple generators:
- generate_pages.py
- generate_archive.py
- generate_newsletter.py
- generate_channels.py
- update_wiki_videos.py

Usage:
    python3 scripts/generate.py --type pages
    python3 scripts/generate.py --type newsletter
    python3 scripts/generate.py --type all

Features:
- Loads configuration from config/project.json
- Unified data loading and caching
- Consistent output handling
- Machine-readable results
"""

import sys
import json
import argparse
import re
from pathlib import Path
from typing import Dict
from datetime import datetime

# Auto-linking for wiki keywords
from auto_link_wiki_keywords import insert_wiki_links
from dotenv import load_dotenv
import os

# Load environment variables from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=True)

try:
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    print("Error: Jinja2 not installed. Install with:")
    print("  pip3 install jinja2")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("Error: Supabase client not installed. Install with:")
    print("  pip3 install supabase")
    sys.exit(1)

try:
    import markdown
except ImportError:
    markdown = None

try:
    from googleapiclient.discovery import build
except ImportError:
    build = None

# Note: load_dotenv already called at top of file with project root path


class UnifiedGenerator:
    """Unified generation system for all content types"""

    def __init__(self, config_path: str = "config/project.json"):
        """Initialize generator with configuration"""
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.project_root = Path(self.config["paths"]["project_root"])
        self.data_cache = {}
        self._setup_jinja()
        self._setup_supabase()

    def _load_config(self) -> Dict:
        """Load project configuration"""
        if self.config_path.exists():
            with open(self.config_path) as f:
                return json.load(f)
        else:
            print(f"Error: Config file not found: {self.config_path}")
            sys.exit(1)

    def _setup_jinja(self):
        """Setup Jinja2 environment"""
        templates_dir = self.project_root / self.config["paths"]["templates_dir"]
        self.jinja_env = Environment(loader=FileSystemLoader(templates_dir))

        # Add custom filters
        def format_date(date_str):
            """Format ISO date string to readable format"""
            if not date_str or date_str == "N/A":
                return "N/A"
            try:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                return dt.strftime("%b %-d/%y")
            except (ValueError, AttributeError, TypeError):
                return str(date_str)[:10]

        self.jinja_env.filters["format_date"] = format_date

        # Add markdown filter
        def markdown_to_html(text):
            """Convert markdown text to HTML"""
            if not text or not markdown:
                return text
            try:
                # Convert markdown to HTML
                html = markdown.markdown(text, extensions=["tables", "nl2br"])
                # Mark as safe for Jinja2 (won't escape HTML)
                from markupsafe import Markup

                return Markup(html)
            except Exception:
                return text

        self.jinja_env.filters["markdown"] = markdown_to_html

    def _setup_supabase(self):
        """Initialize Supabase client"""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if supabase_url and supabase_key:
                self.supabase = create_client(supabase_url, supabase_key)
            else:
                print("Warning: Supabase credentials not found in environment")
                self.supabase = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase: {e}")
            self.supabase = None

    def _sanitize_text(self, text: str) -> str:
        """Remove AI tell words and patterns from text"""
        if not text:
            return text

        # Replace AI tell words with more direct alternatives
        replacements = {
            r"\bCRUCIAL\b": "Essential",
            r"\bcrucial\b": "essential",
            r"\bROBUST\b": "Strong",
            r"\brobust\b": "strong",
            r"\bLEVERAGE\b": "Use",
            r"\bleverage\b": "use",
            r"\bDELVE\b": "Look into",
            r"\bdelve\b": "look into",
            r"\bNAVIGATE\b": "Handle",
            r"\bnavigate\b": "handle",
        }

        result = text
        for pattern, replacement in replacements.items():
            result = re.sub(pattern, replacement, result)

        return result

    def _fetch_from_supabase(self, table: str, limit: int = 100) -> list:
        """Fetch data from Supabase table"""
        if not self.supabase:
            return []
        try:
            response = self.supabase.table(table).select("*").limit(limit).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Warning: Could not fetch {table} from Supabase: {e}")
            return []

    def _fetch_blog_posts_from_db(self) -> Dict:
        """Fetch blog posts from Supabase and format for templates"""
        posts = self._fetch_from_supabase("blog_posts", limit=50)
        writers_list = self._fetch_from_supabase("writers", limit=100)

        # Create writer map
        writer_map = {w["slug"]: w for w in writers_list}

        # Format posts for template
        blog_posts = []
        for post in posts:
            if post.get("is_published"):
                blog_posts.append(
                    {
                        "slug": post.get("slug"),
                        "title": post.get("title"),
                        "author": writer_map.get(post.get("author_id"), {}).get("name", "Unknown"),
                        "date": post.get("published_date"),
                        "excerpt": post.get("excerpt"),
                        "category": post.get("category"),
                        "tags": post.get("tags", []),
                    }
                )

        return {"blog_posts": blog_posts}

    def _fetch_top_videos_from_db(self, limit: int = 10) -> list:
        """Fetch top videos from youtube_videos table ordered by relevance and recency"""
        videos = self._fetch_from_supabase("youtube_videos", limit=limit)

        # Load sentiment data from youtube_data.json
        sentiment_map = {}
        try:
            youtube_path = self.project_root / "data" / "youtube_data.json"
            if youtube_path.exists():
                youtube_data = json.loads(youtube_path.read_text())
                for creator in youtube_data.get("top_creators", []):
                    for video in creator.get("videos", []):
                        video_id = video.get("video_id", "")
                        if video_id and "comment_sentiment" in video:
                            sentiment_map[video_id] = video["comment_sentiment"]
        except Exception:
            pass  # Sentiment is optional

        formatted_videos = []
        for video in videos:
            video_id = video.get("youtube_id")
            video_obj = {
                "title": self._sanitize_text(video.get("title", "")),
                "creator": video.get("channel_name"),
                "channel_id": video.get("channel_id"),
                "video_id": video_id,
                "published_at": video.get("published_at"),
                "thumbnail_url": video.get("thumbnail_url", ""),
                "views": video.get("view_count", 0),
                "summary": video.get("analysis_summary"),
                "why_notable": video.get("analysis_summary", ""),
                "tags": video.get("topic_tags", []),
            }

            # Add sentiment if available
            if video_id and video_id in sentiment_map:
                sentiment = sentiment_map[video_id].copy()
                # Calculate percentages for sentiment bar
                total_comments = (
                    sentiment.get("positive_count", 0)
                    + sentiment.get("negative_count", 0)
                    + sentiment.get("neutral_count", 0)
                )
                if total_comments > 0:
                    sentiment["positive_percent"] = round(
                        (sentiment.get("positive_count", 0) / total_comments) * 100
                    )
                    sentiment["neutral_percent"] = round(
                        (sentiment.get("neutral_count", 0) / total_comments) * 100
                    )
                    sentiment["negative_percent"] = round(
                        (sentiment.get("negative_count", 0) / total_comments) * 100
                    )
                video_obj["comment_sentiment"] = sentiment

            formatted_videos.append(video_obj)

        return formatted_videos

    def _fetch_weekly_analysis_from_db(self) -> Dict:
        """Fetch latest weekly analysis from Supabase"""
        analyses = self._fetch_from_supabase("weekly_analysis", limit=1)

        if not analyses:
            return {}

        analysis = analyses[0]

        # Parse community_sentiment - may come from JSONB field as dict
        community_sentiment = analysis.get("community_sentiment", {})
        if isinstance(community_sentiment, str):
            try:
                community_sentiment = json.loads(community_sentiment)
            except (json.JSONDecodeError, TypeError):
                community_sentiment = {"overall_tone": community_sentiment, "success_stories": []}
        elif not isinstance(community_sentiment, dict):
            community_sentiment = {"overall_tone": "positive", "success_stories": []}

        # Ensure required keys exist
        if not community_sentiment.get("overall_tone"):
            community_sentiment["overall_tone"] = "positive"
        if not community_sentiment.get("success_stories"):
            community_sentiment["success_stories"] = []

        # Parse qa_section - may come from JSONB field
        qa_section = analysis.get("qa_section", [])
        if isinstance(qa_section, str):
            try:
                qa_section = json.loads(qa_section)
            except (json.JSONDecodeError, TypeError):
                qa_section = []

        return {
            "analysis_date": analysis.get("analysis_date"),
            "weekly_summary": analysis.get("weekly_summary", ""),
            "trending_topics": analysis.get("trending_topics", []),
            "key_insights": analysis.get("key_insights", []),
            "community_sentiment": community_sentiment,
            "recommended_watching": analysis.get("recommended_watching", []),
            "qa_section": qa_section,
            "top_videos": analysis.get("recommended_watching", []),
        }

    def load_data(self, data_type: str = "analyzed_content") -> Dict:
        """
        Load data from JSON files, with optional Supabase enrichment

        Args:
            data_type: Type of data to load (analyzed_content, archive, etc)

        Returns:
            Dictionary containing the data
        """
        if data_type in self.data_cache:
            return self.data_cache[data_type]

        data = {}
        data_dir = self.project_root / self.config["paths"]["data_dir"]

        # For analyzed_content, always use JSON (has full markdown that can be parsed)
        # This is important for proper trending_topics/key_insights parsing
        if data_type == "analyzed_content":
            data_file = data_dir / "analyzed_content.json"
        elif data_type == "archive":
            data_file = data_dir / "archive.json"
        else:
            data_file = data_dir / f"{data_type}.json"

        if not data_file.exists():
            print(f"Warning: Data file not found: {data_file}")
            return {}

        try:
            with open(data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.data_cache[data_type] = data
            return data
        except Exception as e:
            print(f"Error loading data from {data_file}: {e}")
            return {}

    def generate(self, generation_type: str) -> bool:
        """
        Generate content of specified type

        Args:
            generation_type: One of pages, archive, newsletter, channels, wiki, all

        Returns:
            True if generation successful, False otherwise
        """
        if generation_type == "all":
            types = self.config["generation"]["supported_types"]
        elif generation_type in self.config["generation"]["supported_types"]:
            types = [generation_type]
        else:
            print(f"Error: Unknown generation type: {generation_type}")
            print(
                f"Supported types: {', '.join(self.config['generation']['supported_types'])}, all"
            )
            return False

        success = True
        for gen_type in types:
            if not self._generate_single(gen_type):
                success = False

        return success

    def _generate_single(self, generation_type: str) -> bool:
        """Generate a single content type"""
        print(f"\n🎨 Generating {generation_type}...")

        try:
            if generation_type == "pages":
                return self._generate_pages()
            elif generation_type == "archive":
                return self._generate_archive()
            elif generation_type == "newsletter":
                return self._generate_newsletter()
            elif generation_type == "channels":
                return self._generate_channels()
            elif generation_type == "wiki":
                return self._generate_wiki()
            else:
                print(f"Unknown generation type: {generation_type}")
                return False
        except Exception as e:
            print(f"Error generating {generation_type}: {e}")
            return False

    def _generate_pages(self) -> bool:
        """Generate main pages from templates"""
        mapping = self.config["generation"]["template_mappings"]["pages"]

        # Load data
        data = self.load_data("analyzed_content")
        if not data:
            print("Error: No data available for page generation")
            return False

        # Load template
        try:
            template = self.jinja_env.get_template(mapping["template"])
        except Exception as e:
            print(f"Error loading template {mapping['template']}: {e}")
            return False

        # Prepare template variables
        # Handle both flat and nested data structures
        analysis = data.get("analysis", {})
        source_data = data.get("source_data", {})

        # Support both flat structure (from new analyzer) and nested structure
        weekly_summary = analysis.get("weekly_summary", data.get("weekly_summary", ""))

        # Handle trending_topics - parse markdown string to structured array
        trending_topics_raw = analysis.get("trending_topics", data.get("trending_topics", []))

        # Load wiki keywords for matching
        wiki_keyword_map = {}
        wiki_keywords_path = self.project_root / "data" / "wiki-keywords.json"
        if wiki_keywords_path.exists():
            try:
                wiki_data = json.loads(wiki_keywords_path.read_text())
                wiki_keyword_map = wiki_data.get("keyword_map", {})
            except Exception:
                pass

        if isinstance(trending_topics_raw, str):
            # Clean up markdown code fences if present
            clean_raw = trending_topics_raw.strip()
            if clean_raw.startswith("```"):
                clean_raw = clean_raw.replace("```json", "").replace("```", "").strip()

            # First, try to parse as JSON array (new format)
            try:
                import json as json_lib

                parsed_topics = json_lib.loads(clean_raw)
                if isinstance(parsed_topics, list):
                    # Handle both new format (objects with wiki_keyword) and old format (strings)
                    trending_topics = []
                    for topic in parsed_topics:
                        if isinstance(topic, dict):
                            # New format: {"topic": "...", "wiki_keyword": "..."}
                            topic_obj = {
                                "topic": topic.get("topic", ""),
                                "description": "",
                                "mentioned_by": ["Analysis"],
                            }
                            # Add wiki link if keyword provided and exists in map
                            wiki_kw = topic.get("wiki_keyword")
                            if wiki_kw and wiki_kw in wiki_keyword_map:
                                anchor = wiki_keyword_map[wiki_kw].replace("wiki.html#", "")
                                topic_obj["wiki_links"] = [
                                    {"anchor": anchor, "title": wiki_kw.title()}
                                ]
                            trending_topics.append(topic_obj)
                        else:
                            # Old format: simple string
                            trending_topics.append(
                                {
                                    "topic": str(topic),
                                    "description": "",
                                    "mentioned_by": ["Analysis"],
                                }
                            )
                else:
                    raise ValueError("Not a list")
            except (json_lib.JSONDecodeError, ValueError):
                # Fall back to markdown parsing
                trending_topics = []
                lines = trending_topics_raw.split("\n")
                current_topic = None

                for line in lines:
                    line_stripped = line.strip()

                    # Look for h3 headers (### Topic Name)
                    if line_stripped.startswith("### "):
                        if current_topic and current_topic["description"]:
                            trending_topics.append(current_topic)
                        current_topic = {
                            "topic": line_stripped.replace("### ", "")
                            .replace("**", "")
                            .replace("#", ""),
                            "description": "",
                            "mentioned_by": ["Analysis"],
                        }
                    # Look for description content
                    elif current_topic and line_stripped:
                        # Skip empty lines and markdown-only lines
                        if line_stripped in ["---", "**", "##", "-", "*"]:
                            continue
                        # Skip header lines
                        if line_stripped.startswith("#"):
                            continue
                        # Include bullet points and regular text
                        if line_stripped.startswith("- "):
                            # Remove bullet and add as description
                            content = line_stripped[2:].strip()
                            if current_topic["description"]:
                                current_topic["description"] += " " + content
                            else:
                                current_topic["description"] = content
                        elif line_stripped and not line_stripped.startswith("---"):
                            # Add regular text
                            if not line_stripped.startswith("**") or not line_stripped.endswith(
                                "**"
                            ):
                                if current_topic["description"]:
                                    current_topic["description"] += " " + line_stripped
                                else:
                                    current_topic["description"] = line_stripped

                # Add last topic
                if current_topic and current_topic["description"]:
                    trending_topics.append(current_topic)

                # If parsing failed, use defaults
                if not trending_topics:
                    trending_topics = [
                        {
                            "topic": "Content Opportunities",
                            "description": trending_topics_raw[:100],
                            "mentioned_by": ["Analysis"],
                        }
                    ]
        elif isinstance(trending_topics_raw, list):
            trending_topics = trending_topics_raw
        else:
            trending_topics = []

        # Add wiki_links to trending topics by matching keywords (fallback only)
        # Only apply if wiki_links wasn't already set during parsing
        wiki_keywords_path = self.project_root / "data" / "wiki-keywords.json"
        if wiki_keywords_path.exists():
            try:
                wiki_data = json.loads(wiki_keywords_path.read_text())
                keyword_map = wiki_data.get("keyword_map", {})

                for topic in trending_topics:
                    # Skip if wiki_links already set from explicit wiki_keyword
                    if isinstance(topic, dict) and topic.get("wiki_links"):
                        continue

                    topic_name = topic.get("topic", "") if isinstance(topic, dict) else str(topic)
                    topic_lower = topic_name.lower()

                    # Try to find a matching wiki keyword based on topic name
                    wiki_links = []
                    for keyword, wiki_url in keyword_map.items():
                        # Check if keyword appears in topic name
                        if keyword in topic_lower or topic_lower in keyword:
                            anchor = wiki_url.replace("wiki.html#", "")
                            wiki_links.append({"anchor": anchor, "title": keyword.title()})
                            break  # Just need one match

                    if isinstance(topic, dict) and wiki_links:
                        topic["wiki_links"] = wiki_links
            except Exception as e:
                print(f"  Warning: Could not load wiki keywords: {e}")

        # Handle key_insights - parse markdown string to structured array
        key_insights_raw = analysis.get("key_insights", data.get("key_insights", []))
        if isinstance(key_insights_raw, str):
            # Parse markdown-formatted insights string into structured list
            key_insights = []
            lines = key_insights_raw.split("\n")
            current_insight = None

            for line in lines:
                line_stripped = line.strip()

                # Look for h3 headers (### Insight Title)
                if line_stripped.startswith("### "):
                    if current_insight and current_insight["description"]:
                        key_insights.append(current_insight)
                    current_insight = {
                        "title": line_stripped.replace("### ", "")
                        .replace("**", "")
                        .replace("#", ""),
                        "description": "",
                    }
                # Look for description content
                elif current_insight and line_stripped:
                    # Skip empty lines and markdown-only lines
                    if line_stripped in ["---", "**", "##", "-", "*"]:
                        continue
                    # Skip header lines
                    if line_stripped.startswith("#"):
                        continue
                    # Include bullet points and regular text
                    if line_stripped.startswith("- "):
                        # Remove bullet and add as description
                        content = line_stripped[2:].strip()
                        if current_insight["description"]:
                            current_insight["description"] += " " + content
                        else:
                            current_insight["description"] = content
                    elif line_stripped and not line_stripped.startswith("---"):
                        # Add regular text
                        if not line_stripped.startswith("**") or not line_stripped.endswith("**"):
                            if current_insight["description"]:
                                current_insight["description"] += " " + line_stripped
                            else:
                                current_insight["description"] = line_stripped

            # Add last insight
            if current_insight and current_insight["description"]:
                key_insights.append(current_insight)

            # If parsing failed, use defaults
            if not key_insights:
                key_insights = [{"title": "Key Insight", "description": key_insights_raw[:100]}]
        elif isinstance(key_insights_raw, list):
            key_insights = key_insights_raw
        else:
            key_insights = []

        # Load editorial commentary from content-of-the-week.json
        editorial_commentary = {}
        try:
            content_week_path = self.project_root / "data" / "content-of-the-week.json"
            if content_week_path.exists():
                content_week_data = json.loads(content_week_path.read_text())
                for video in content_week_data.get("featured_videos", []):
                    editorial_commentary[video["video_id"]] = {
                        "editorial_title": video.get("editorial_title"),
                        "heat_badge": video.get("heat_badge"),
                        "commentary": video.get("commentary"),
                        "curator": video.get("curator"),
                    }
                print(f"  ✓ Loaded editorial commentary for {len(editorial_commentary)} videos")
        except Exception as e:
            print(f"  Warning: Could not load content-of-the-week.json: {e}")

        # Load real YouTube videos from youtube_data.json
        top_videos = []

        # Priority 1: Use JSON when we have editorial commentary (ensures fresh curated content)
        # This prevents stale Supabase cache from overriding this week's curated videos
        use_json_first = len(editorial_commentary) > 0

        if not use_json_first:
            # Priority 2: Fetch from Supabase (cached data - no API calls needed)
            try:
                top_videos = self._fetch_top_videos_from_db(limit=10)
                if top_videos:
                    print("  ✓ Loaded YouTube data from Supabase cache (no API calls)")
            except Exception as e:
                print(f"  Warning: Could not load from Supabase: {e}")

        # Priority 3: Load from JSON file (fresh data or fallback)
        if not top_videos:
            try:
                youtube_path = self.project_root / "data" / "youtube_data.json"
                if youtube_path.exists():
                    youtube_data = json.loads(youtube_path.read_text())
                    # Convert YouTube data to template format
                    for creator in youtube_data.get("top_creators", []):
                        for video in creator.get("videos", [])[:2]:  # Take first 2 per creator
                            video_obj = {
                                "video_id": video["video_id"],
                                "title": self._sanitize_text(video["title"]),
                                "description": video.get("description", "")[
                                    :200
                                ],  # First 200 chars
                                "creator": creator["channel_name"],
                                "channel_id": creator.get("channel_id", ""),
                                "views": video["statistics"]["view_count"],
                                "likes": video["statistics"]["like_count"],
                                "comments": video["statistics"]["comment_count"],
                                "url": f"https://youtube.com/watch?v={video['video_id']}",
                                "thumbnail_url": video.get(
                                    "thumbnail_url",
                                    f"https://i.ytimg.com/vi/{video['video_id']}/mqdefault.jpg",
                                ),
                                "tags": video.get("tags", [])[:3],
                            }
                            # Include sentiment scores if available
                            if video.get("comment_sentiment"):
                                sentiment = video["comment_sentiment"]
                                # Calculate percentages for sentiment bar
                                total_comments = (
                                    sentiment.get("positive_count", 0)
                                    + sentiment.get("negative_count", 0)
                                    + sentiment.get("neutral_count", 0)
                                )
                                if total_comments > 0:
                                    sentiment["positive_percent"] = round(
                                        (sentiment.get("positive_count", 0) / total_comments) * 100
                                    )
                                    sentiment["neutral_percent"] = round(
                                        (sentiment.get("neutral_count", 0) / total_comments) * 100
                                    )
                                    sentiment["negative_percent"] = round(
                                        (sentiment.get("negative_count", 0) / total_comments) * 100
                                    )
                                video_obj["comment_sentiment"] = sentiment
                            top_videos.append(video_obj)
                    if top_videos:
                        print("  ✓ Loaded YouTube data from JSON file")
            except Exception as e:
                print(f"  Warning: Could not load YouTube data from JSON: {e}")

        # Priority 3: Fallback to analysis data (last resort)
        if not top_videos:
            top_videos = analysis.get("top_videos", data.get("top_videos", []))

        # Get community sentiment with proper structure
        community_sentiment = analysis.get(
            "community_sentiment", data.get("community_sentiment", {})
        )
        if isinstance(community_sentiment, str):
            community_sentiment = {"overall_tone": community_sentiment, "success_stories": []}
        elif not isinstance(community_sentiment, dict):
            community_sentiment = {"overall_tone": "positive", "success_stories": []}

        # Get Q&A section
        qa_section = analysis.get("qa_section", data.get("qa_section", []))

        # Load recommended_watching (use additional videos from youtube_data.json if available)
        recommended_watching = analysis.get(
            "recommended_watching", data.get("recommended_watching", [])
        )

        # If recommended_watching is empty, use remaining videos from youtube_data.json
        if not recommended_watching and top_videos:
            # Take videos beyond the first set (if we loaded from JSON)
            try:
                youtube_path = self.project_root / "data" / "youtube_data.json"
                if youtube_path.exists():
                    youtube_data = json.loads(youtube_path.read_text())
                    # Collect all remaining videos (skip the first 2 from each creator already used in top_videos)
                    for creator in youtube_data.get("top_creators", []):
                        videos_to_recommend = creator.get("videos", [])[
                            2:
                        ]  # Skip first 2 (used in top_videos)
                        for video in videos_to_recommend:
                            recommended_watching.append(
                                {
                                    "video_id": video["video_id"],
                                    "title": self._sanitize_text(video["title"]),
                                    "reason": video.get(
                                        "summary", "Expert insight on carnivore nutrition"
                                    ),
                                    "creator": creator["channel_name"],
                                    "channel_id": creator.get("channel_id", ""),
                                    "views": video["statistics"]["view_count"],
                                    "thumbnail_url": video.get(
                                        "thumbnail_url",
                                        f"https://i.ytimg.com/vi/{video['video_id']}/mqdefault.jpg",
                                    ),
                                    "tags": video.get("tags", [])[:3],
                                }
                            )
            except Exception:
                pass  # Silently fail if no additional videos available

        # Merge editorial commentary into top_videos
        for video in top_videos:
            video_id = video.get("video_id")
            if video_id and video_id in editorial_commentary:
                commentary_data = editorial_commentary[video_id]
                # Use editorial title if available, otherwise keep original
                if commentary_data.get("editorial_title"):
                    video["editorial_title"] = commentary_data["editorial_title"]
                # Add editorial commentary with auto-linking (max 3 links per commentary)
                if commentary_data.get("commentary"):
                    raw_commentary = commentary_data["commentary"]
                    linked_commentary = insert_wiki_links(f"<p>{raw_commentary}</p>", max_links=3)
                    # Remove wrapper paragraph tags
                    linked_commentary = linked_commentary.replace("<p>", "").replace("</p>", "")
                    video["editorial_commentary"] = linked_commentary
                # Add heat badge
                if commentary_data.get("heat_badge"):
                    video["heat_badge"] = commentary_data["heat_badge"]
                # Add curator name
                if commentary_data.get("curator"):
                    video["curator"] = commentary_data["curator"]

        # Build creator_channels mapping for JavaScript linking
        creator_channels = {}
        if youtube_path.exists():
            youtube_data = json.loads(youtube_path.read_text())
            for creator in youtube_data.get("top_creators", []):
                creator_channels[creator["channel_name"]] = creator.get("channel_id", "")

        # Load blog posts for Featured Insights section (3 newest + 3 popular)
        newest_blog_posts = []
        popular_blog_posts = []

        # Try to fetch from Supabase first (includes real popularity data)
        if self.supabase:
            try:
                # Fetch 3 newest published posts
                newest_response = (
                    self.supabase.table("blog_posts")
                    .select("slug, title, excerpt, published_date, category, tags")
                    .eq("is_published", True)
                    .order("published_date", desc=True)
                    .limit(3)
                    .execute()
                )

                if newest_response.data:
                    for post in newest_response.data:
                        newest_blog_posts.append(
                            {
                                "slug": post.get("slug"),
                                "title": post.get("title"),
                                "excerpt": post.get("excerpt"),
                                "date": post.get("published_date"),
                                "category": post.get("category"),
                                "tags": post.get("tags", []),
                            }
                        )

                # Fetch reaction counts for popularity ranking
                reactions_response = (
                    self.supabase.table("v_post_reaction_counts")
                    .select("post_slug, thumbs_up")
                    .execute()
                )

                # Build reaction map for quick lookup
                reaction_map = {}
                if reactions_response.data:
                    for r in reactions_response.data:
                        reaction_map[r.get("post_slug")] = r.get("thumbs_up", 0)

                # Fetch all published posts (excluding newest 3)
                exclude_slugs = [p["slug"] for p in newest_blog_posts]
                all_posts_response = (
                    self.supabase.table("blog_posts")
                    .select("slug, title, excerpt, published_date, category, tags")
                    .eq("is_published", True)
                    .execute()
                )

                if all_posts_response.data:
                    # Filter out newest, add reaction counts, sort by popularity
                    candidates = [
                        {**p, "thumbs_up": reaction_map.get(p.get("slug"), 0)}
                        for p in all_posts_response.data
                        if p.get("slug") not in exclude_slugs
                    ]
                    # Sort by thumbs_up (desc), then by date (desc)
                    candidates.sort(
                        key=lambda x: (-x["thumbs_up"], x.get("published_date", "") or ""),
                        reverse=False,
                    )

                    for post in candidates[:3]:
                        popular_blog_posts.append(
                            {
                                "slug": post.get("slug"),
                                "title": post.get("title"),
                                "excerpt": post.get("excerpt"),
                                "date": post.get("published_date"),
                                "category": post.get("category"),
                                "tags": post.get("tags", []),
                                "thumbs_up": post.get("thumbs_up", 0),
                            }
                        )

                if newest_blog_posts or popular_blog_posts:
                    print(
                        f"  ✓ Loaded {len(newest_blog_posts)} newest + "
                        f"{len(popular_blog_posts)} popular blog posts from Supabase"
                    )
            except Exception as e:
                print(f"  Warning: Could not load blog posts from Supabase: {e}")

        # Fallback to JSON if Supabase didn't return data
        if not newest_blog_posts:
            try:
                blog_posts_path = self.project_root / "data" / "blog_posts.json"
                if blog_posts_path.exists():
                    blog_data = json.loads(blog_posts_path.read_text())
                    all_posts = blog_data.get("blog_posts", [])
                    published_posts = [p for p in all_posts if p.get("published", False)]

                    by_date = sorted(published_posts, key=lambda p: p.get("date", ""), reverse=True)
                    newest_blog_posts = by_date[:3]

                    newest_slugs = {p["slug"] for p in newest_blog_posts}
                    remaining = [p for p in published_posts if p["slug"] not in newest_slugs]
                    popular_blog_posts = sorted(remaining, key=lambda p: p.get("date", ""))[:3]

                    print(
                        f"  ✓ Loaded {len(newest_blog_posts)} newest + "
                        f"{len(popular_blog_posts)} popular blog posts from JSON (fallback)"
                    )
            except Exception as e:
                print(f"  Warning: Could not load blog posts: {e}")

        template_vars = {
            "analysis_date": data.get(
                "analysis_date", data.get("timestamp", datetime.now().isoformat())
            ),
            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "search_query": source_data.get("search_query", "carnivore diet"),
            "total_creators": source_data.get("total_creators", 10),
            "total_videos": source_data.get("total_videos", 39),
            "weekly_summary": weekly_summary,
            "trending_topics": trending_topics,
            "top_videos": top_videos,
            "key_insights": key_insights,
            "community_sentiment": community_sentiment,
            "recommended_watching": recommended_watching,
            "qa_section": qa_section,
            "layout_metadata": data.get("layout_metadata"),
            "creator_channels": creator_channels,  # Map of creator names to YouTube channel IDs
            "newest_blog_posts": newest_blog_posts,  # 3 most recent blog posts
            "popular_blog_posts": popular_blog_posts,  # 3 most popular blog posts (older/established)
        }

        # Render template
        try:
            html_content = template.render(**template_vars)
        except Exception as e:
            print(f"Error rendering template: {e}")
            return False

        # Write output
        output_file = self.project_root / mapping["output"]
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"✓ Generated: {output_file}")
            return True
        except Exception as e:
            print(f"Error writing output file {output_file}: {e}")
            return False

    def _generate_archive(self) -> bool:
        """Generate archive pages"""
        mapping = self.config["generation"]["template_mappings"]["archive"]

        # Load template
        try:
            template = self.jinja_env.get_template(mapping["template"])
        except Exception as e:
            print(f"Error loading template {mapping['template']}: {e}")
            return False

        # Load all archive files
        archive_dir = self.project_root / self.config["paths"]["data_dir"] / "archive"
        weeks = []

        if archive_dir.exists():
            # Get all JSON files sorted by date (newest first)
            archive_files = sorted(
                [f for f in archive_dir.glob("*.json") if f.name[0].isdigit()],
                key=lambda f: f.name,
                reverse=True,
            )

            for archive_file in archive_files[:10]:  # Limit to 10 most recent weeks
                try:
                    with open(archive_file) as f:
                        week_data = json.load(f)

                    # Handle nested structure (analysis key) or flat structure
                    analysis = week_data.get("analysis", week_data)

                    # Extract week info, use actual data if available
                    total_creators = analysis.get("top_creators_count", 0)
                    total_videos = analysis.get("total_videos_found", 0)

                    # If counts are 0, try to extract from creators data or trending topics
                    if total_creators == 0:
                        if "creators_data" in analysis:
                            total_creators = len(analysis.get("creators_data", {}))
                        elif "trending_topics" in analysis:
                            total_creators = len(
                                [t for t in analysis.get("trending_topics", []) if t]
                            )

                    if total_videos == 0:
                        if "trending_topics" in analysis:
                            total_videos = len(analysis.get("trending_topics", []))
                        elif "key_insights" in analysis:
                            total_videos = len(analysis.get("key_insights", []))

                    # Get summary - first 150 chars of weekly_summary if available
                    summary_preview = analysis.get("weekly_summary", "")
                    if isinstance(summary_preview, str):
                        summary_preview = summary_preview[:150]
                    else:
                        summary_preview = str(summary_preview)[:150]

                    week_info = {
                        "date": archive_file.stem,
                        "total_creators": max(total_creators, 1),  # At least 1 creator
                        "total_videos": max(total_videos, 1),  # At least 1 video
                        "summary_preview": (
                            summary_preview if summary_preview else f"Week of {archive_file.stem}"
                        ),
                    }
                    weeks.append(week_info)
                except (json.JSONDecodeError, KeyError, Exception) as e:
                    print(f"Warning: Could not load {archive_file.name}: {e}")
                    continue

        # Prepare template variables
        template_vars = {
            "weeks": weeks,
            "total_weeks": len(weeks),
            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        # Render template
        try:
            html_content = template.render(**template_vars)
        except Exception as e:
            print(f"Error rendering archive template: {e}")
            return False

        # Write output
        output_file = self.project_root / mapping["output"]
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"✓ Generated: {output_file}")
        except Exception as e:
            print(f"Error writing archive file {output_file}: {e}")
            return False

        # Also generate individual week pages from archive data (using index template)
        if archive_dir.exists():
            archive_files = sorted(
                [f for f in archive_dir.glob("*.json") if f.name[0].isdigit()],
                key=lambda f: f.name,
                reverse=True,
            )

            archive_week_dir = self.project_root / "public" / "archive"
            archive_week_dir.mkdir(parents=True, exist_ok=True)

            # Load the pages template (index_template.html) for individual week pages
            try:
                pages_mapping = self.config["generation"]["template_mappings"]["pages"]
                week_template = self.jinja_env.get_template(pages_mapping["template"])
            except Exception as e:
                print(f"Warning: Could not load pages template for archive weeks: {e}")
                week_template = None

            if week_template:
                for archive_file in archive_files[:10]:
                    try:
                        with open(archive_file) as f:
                            week_data = json.load(f)

                        # Handle nested structure
                        analysis = week_data.get("analysis", week_data)

                        # Extract creator channels mapping
                        creator_channels = {}
                        youtube_path = self.project_root / "data" / "youtube_data.json"
                        if youtube_path.exists():
                            youtube_data = json.loads(youtube_path.read_text())
                            for creator in youtube_data.get("top_creators", []):
                                creator_channels[creator["channel_name"]] = creator.get(
                                    "channel_id", ""
                                )

                        # Build template variables (same as _generate_pages)
                        week_template_vars = {
                            "analysis_date": week_data.get("analysis_date", ""),
                            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "search_query": week_data.get("source_data", {}).get(
                                "search_query", "carnivore diet"
                            ),
                            "total_creators": week_data.get("source_data", {}).get(
                                "total_creators", 0
                            ),
                            "total_videos": week_data.get("source_data", {}).get("total_videos", 0),
                            "weekly_summary": analysis.get("weekly_summary", ""),
                            "trending_topics": analysis.get("trending_topics", []),
                            "top_videos": analysis.get("top_videos", []),
                            "key_insights": analysis.get("key_insights", []),
                            "community_sentiment": analysis.get("community_sentiment", {}),
                            "recommended_watching": analysis.get("recommended_watching", []),
                            "qa_section": analysis.get("qa_section", []),
                            "layout_metadata": week_data.get("layout_metadata"),
                            "creator_channels": creator_channels,
                        }

                        # Render week page
                        week_html = week_template.render(**week_template_vars)

                        # Write week page
                        week_output_file = archive_week_dir / f"{archive_file.stem}.html"
                        week_output_file.write_text(week_html, encoding="utf-8")
                        print(f"✓ Generated: {week_output_file}")

                    except (json.JSONDecodeError, KeyError, Exception) as e:
                        print(f"Warning: Could not generate week page for {archive_file.name}: {e}")
                        continue

        return True

    def _generate_newsletter(self) -> bool:
        """Generate newsletter"""
        mapping = self.config["generation"]["template_mappings"]["newsletter"]

        # Load data
        data = self.load_data("analyzed_content")
        if not data:
            print("Error: No data available for newsletter generation")
            return False

        # Load template
        try:
            template = self.jinja_env.get_template(mapping["template"])
        except Exception as e:
            print(f"Error loading template {mapping['template']}: {e}")
            return False

        # Prepare template variables
        # Handle both flat and nested data structures
        analysis = data.get("analysis", {})

        # Support both flat structure (from new analyzer) and nested structure
        weekly_summary = analysis.get("weekly_summary", data.get("weekly_summary", ""))
        trending_topics = analysis.get("trending_topics", data.get("trending_topics", ""))
        key_insights = analysis.get("key_insights", data.get("key_insights", ""))
        top_videos = analysis.get("top_videos", data.get("top_videos", []))

        template_vars = {
            "analysis_date": data.get(
                "analysis_date", data.get("timestamp", datetime.now().isoformat())
            ),
            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "weekly_summary": weekly_summary,
            "trending_topics": trending_topics,
            "top_videos": top_videos,
            "key_insights": key_insights,
            "newsletter_config": self.config["newsletter"],
        }

        # Render template
        try:
            html_content = template.render(**template_vars)
        except Exception as e:
            print(f"Error rendering newsletter template: {e}")
            return False

        # Write output
        output_file = self.project_root / mapping["output"]
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"✓ Generated: {output_file}")
            return True
        except Exception as e:
            print(f"Error writing newsletter file {output_file}: {e}")
            return False

    def _fetch_channel_profile_images(self, channel_ids: list) -> Dict[str, str]:
        """Fetch channel profile images from YouTube API"""
        channel_images = {}

        if not build or not channel_ids:
            return channel_images

        try:
            youtube_api_key = os.getenv("YOUTUBE_API_KEY")
            if not youtube_api_key:
                print("⚠ Warning: YOUTUBE_API_KEY not set, using placeholder images")
                return channel_images

            youtube = build("youtube", "v3", developerKey=youtube_api_key)

            # Fetch channel info in batches (API limit is 50 per request)
            for i in range(0, len(channel_ids), 50):
                batch = channel_ids[i : i + 50]
                request = youtube.channels().list(
                    part="snippet", id=",".join(batch), fields="items(id,snippet(thumbnails))"
                )
                response = request.execute()

                for item in response.get("items", []):
                    channel_id = item.get("id", "")
                    thumbnails = item.get("snippet", {}).get("thumbnails", {})
                    # Prefer high quality, fallback to medium/default
                    image_url = (
                        thumbnails.get("high", {}).get("url")
                        or thumbnails.get("medium", {}).get("url")
                        or thumbnails.get("default", {}).get("url")
                    )
                    if image_url:
                        channel_images[channel_id] = image_url
        except Exception as e:
            print(f"⚠ Warning: Failed to fetch channel profile images: {e}")

        return channel_images

    def _generate_channels(self) -> bool:
        """Generate channels page"""
        mapping = self.config["generation"]["template_mappings"]["channels"]

        # Load data
        data = self.load_data("analyzed_content")
        if not data:
            print("Error: No data available for channels generation")
            return False

        # Load template
        try:
            template = self.jinja_env.get_template(mapping["template"])
        except Exception as e:
            print(f"Error loading template {mapping['template']}: {e}")
            return False

        # Try to fetch videos from Supabase first
        videos = self._fetch_from_supabase("youtube_videos", limit=100)

        # If Supabase is empty, fall back to youtube_data.json
        if not videos:
            youtube_data = self.load_data("youtube_data")
            if youtube_data and "top_creators" in youtube_data:
                # Convert top_creators format to video-like format for channels page
                channels_list = []
                for creator in youtube_data["top_creators"]:
                    channel_id = creator.get("channel_id", "")
                    videos_list = creator.get("videos", [])

                    # Fetch profile image if we have it
                    channel_images = (
                        self._fetch_channel_profile_images([channel_id]) if channel_id else {}
                    )

                    # Extract top 3 videos with proper structure
                    top_videos = []
                    for video in videos_list[:3]:
                        top_videos.append(
                            {
                                "video_id": video.get("video_id", ""),
                                "title": video.get("title", ""),
                                "view_count": video.get("statistics", {}).get("view_count", 0),
                                "published_at": video.get("published_at", ""),
                            }
                        )

                    channels_list.append(
                        {
                            "name": creator.get("channel_name", "Unknown"),
                            "channel_id": channel_id,
                            "thumbnail_url": channel_images.get(
                                channel_id,
                                "https://via.placeholder.com/150x150/8b4513/f4e4d4?text=Channel",
                            ),
                            "appearances": 1,  # Only have data for 1 week currently
                            "total_videos": len(videos_list),  # Count of videos this week
                            "latest_date": (
                                videos_list[0].get("published_at", "") if videos_list else ""
                            ),
                            "top_videos": top_videos,
                        }
                    )

                # Build top_videos list for "Top Videos This Week" panel
                top_videos = []
                for creator in youtube_data["top_creators"]:
                    for video in creator.get("videos", [])[:2]:  # Take first 2 per creator
                        video_obj = {
                            "video_id": video.get("video_id", ""),
                            "title": video.get("title", ""),
                            "creator": creator.get("channel_name", "Unknown"),
                            "views": video.get("statistics", {}).get("view_count", 0),
                            "likes": video.get("statistics", {}).get("like_count", 0),
                            "comments": video.get("statistics", {}).get("comment_count", 0),
                            "thumbnail_url": video.get("thumbnail_url", ""),
                            "summary": (
                                video.get("description", "")[:200]
                                if video.get("description")
                                else ""
                            ),
                        }
                        top_videos.append(video_obj)

                template_vars = {
                    "channels": channels_list,
                    "total_channels": len(channels_list),
                    "total_weeks": 1,
                    "top_videos": top_videos[:10],  # Limit to 10 videos
                    "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }

                # Render and output
                try:
                    html_content = template.render(**template_vars)
                    output_file = self.project_root / mapping["output"]
                    output_file.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_file, "w", encoding="utf-8") as f:
                        f.write(html_content)
                    print(f"✓ Generated: {output_file} (using youtube_data.json)")
                    return True
                except Exception as e:
                    print(f"Error rendering channels template: {e}")
                    return False
            else:
                print("⚠ Warning: No YouTube data available for channels page")
                # Render with empty channels
                template_vars = {
                    "channels": [],
                    "total_channels": 0,
                    "total_weeks": 0,
                    "top_videos": [],  # Empty top videos
                    "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                try:
                    html_content = template.render(**template_vars)
                    output_file = self.project_root / mapping["output"]
                    output_file.parent.mkdir(parents=True, exist_ok=True)
                    with open(output_file, "w", encoding="utf-8") as f:
                        f.write(html_content)
                    print(f"✓ Generated: {output_file} (empty channels)")
                    return True
                except Exception as e:
                    print(f"Error rendering channels template: {e}")
                    return False

        # Load sentiment data from youtube_data.json
        youtube_data = self.load_data("youtube_data")
        sentiment_map = {}
        if youtube_data and "top_creators" in youtube_data:
            for creator in youtube_data["top_creators"]:
                for video in creator.get("videos", []):
                    video_id = video.get("video_id", "")
                    if video_id and "comment_sentiment" in video:
                        sentiment_map[video_id] = video["comment_sentiment"]

        # Group videos by channel from Supabase
        # Track unique weeks (by added_at) separately from video count
        from datetime import datetime

        channels_dict = {}
        unique_channel_ids = set()

        for video in videos:
            channel_name = video.get("channel_name", "Unknown")
            channel_id = video.get("channel_id", "")

            if channel_name not in channels_dict:
                channels_dict[channel_name] = {
                    "name": channel_name,
                    "channel_id": channel_id,
                    "thumbnail_url": None,  # Will be fetched from API
                    "appearances": 0,  # Will be calculated from unique weeks
                    "total_videos": 0,
                    "total_views": 0,  # For engagement score
                    "total_likes": 0,  # For engagement score
                    "total_comments": 0,  # For engagement score
                    "engagement_score": 0,  # Calculated: views + likes*10 + comments*20
                    "latest_date": video.get("published_at", ""),
                    "top_videos": [],
                    "_weeks_set": set(),  # Track unique weeks (year, week_num)
                }
                if channel_id:
                    unique_channel_ids.add(channel_id)

            # Track unique weeks by added_at date
            added_at = video.get("added_at", "")
            if added_at:
                try:
                    # Parse ISO timestamp and get week number
                    dt = datetime.fromisoformat(added_at.replace("Z", "+00:00"))
                    week_key = dt.isocalendar()[:2]  # (year, week_number)
                    channels_dict[channel_name]["_weeks_set"].add(week_key)
                except (ValueError, TypeError):
                    pass

            # Update video count and engagement metrics
            channels_dict[channel_name]["total_videos"] += 1
            channels_dict[channel_name]["total_views"] += video.get("view_count", 0) or 0
            channels_dict[channel_name]["total_likes"] += video.get("like_count", 0) or 0
            channels_dict[channel_name]["total_comments"] += video.get("comment_count", 0) or 0

            # Keep latest date
            if video.get("published_at", "") > channels_dict[channel_name]["latest_date"]:
                channels_dict[channel_name]["latest_date"] = video.get("published_at", "")

            # Add to top videos (keep top 3)
            if len(channels_dict[channel_name]["top_videos"]) < 3:
                channels_dict[channel_name]["top_videos"].append(
                    {
                        "video_id": video.get("youtube_id", ""),
                        "title": video.get("title", ""),
                        "view_count": video.get("view_count", 0),
                        "published_at": video.get("published_at", ""),
                    }
                )

        # Fetch channel profile images
        channel_images = self._fetch_channel_profile_images(list(unique_channel_ids))

        # Assign profile images to channels and calculate appearances/engagement from weeks
        for channel_name, channel_data in channels_dict.items():
            channel_id = channel_data.get("channel_id", "")
            if channel_id in channel_images:
                channel_data["thumbnail_url"] = channel_images[channel_id]
            else:
                # Fallback to placeholder if image not found
                channel_data["thumbnail_url"] = (
                    "https://via.placeholder.com/150x150/8b4513/f4e4d4?text=Channel"
                )
            # Calculate appearances from unique weeks count
            channel_data["appearances"] = len(channel_data.get("_weeks_set", set())) or 1
            # Calculate engagement score: views + likes*10 + comments*20
            channel_data["engagement_score"] = (
                channel_data["total_views"]
                + (channel_data["total_likes"] * 10)
                + (channel_data["total_comments"] * 20)
            )
            # Remove internal tracking field before output
            if "_weeks_set" in channel_data:
                del channel_data["_weeks_set"]

        # Convert to sorted list (sort by weeks, then by videos as tiebreaker)
        channels_list = list(channels_dict.values())
        channels_list.sort(key=lambda x: (x["appearances"], x["total_videos"]), reverse=True)

        # Build Top 10 Leaderboard sorted by engagement score
        # Load previous rankings if available for movement indicators
        data_dir = self.project_root / self.config["paths"]["data_dir"]
        leaderboard_file = os.path.join(data_dir, "channel_rankings.json")
        previous_rankings = {}
        try:
            if os.path.exists(leaderboard_file):
                with open(leaderboard_file, "r") as f:
                    previous_data = json.load(f)
                    previous_rankings = {
                        ch["name"]: ch["rank"] for ch in previous_data.get("leaderboard", [])
                    }
        except (json.JSONDecodeError, IOError):
            pass

        # Sort by engagement score for leaderboard
        leaderboard = sorted(channels_list, key=lambda x: x["engagement_score"], reverse=True)[:10]

        # Add rank and movement to each leaderboard entry
        for i, channel in enumerate(leaderboard, 1):
            channel["rank"] = i
            prev_rank = previous_rankings.get(channel["name"])
            if prev_rank is None:
                channel["movement"] = "new"  # New to leaderboard
            elif prev_rank > i:
                channel["movement"] = "up"
                channel["movement_delta"] = prev_rank - i
            elif prev_rank < i:
                channel["movement"] = "down"
                channel["movement_delta"] = i - prev_rank
            else:
                channel["movement"] = "same"
                channel["movement_delta"] = 0

        # Save current rankings for next week's comparison
        try:
            with open(leaderboard_file, "w") as f:
                json.dump(
                    {
                        "leaderboard": [
                            {"name": ch["name"], "rank": ch["rank"]} for ch in leaderboard
                        ]
                    },
                    f,
                )
        except IOError:
            pass

        # Build top_videos list for "Top Videos This Week" panel
        top_videos = []
        for video in videos[:20]:  # Take top 20 videos sorted by views
            video_id = video.get("youtube_id", "")
            sentiment = sentiment_map.get(video_id, {})

            video_obj = {
                "video_id": video_id,
                "title": video.get("title", ""),
                "creator": video.get("channel_name", "Unknown"),
                "views": video.get("view_count", 0),
                "likes": video.get("like_count", 0),
                "comments": video.get("comment_count", 0),
                "thumbnail_url": video.get("thumbnail_url", ""),
                "summary": (video.get("description", "")[:200] if video.get("description") else ""),
                "sentiment": sentiment.get("overall", "neutral"),
                "sentiment_score": sentiment.get("score", 0),
                "positive_count": sentiment.get("positive_count", 0),
                "negative_count": sentiment.get("negative_count", 0),
            }
            top_videos.append(video_obj)

        # Prepare template variables
        template_vars = {
            "channels": channels_list,
            "total_channels": len(channels_list),
            "total_weeks": 1,  # Currently tracking one week
            "top_videos": top_videos[:10],  # Limit to 10 videos
            "leaderboard": leaderboard,  # Top 10 by engagement score
            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

        # Render template
        try:
            html_content = template.render(**template_vars)
        except Exception as e:
            print(f"Error rendering channels template: {e}")
            return False

        # Write output
        output_file = self.project_root / mapping["output"]
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"✓ Generated: {output_file}")
            return True
        except Exception as e:
            print(f"Error writing channels file {output_file}: {e}")
            return False

    def _generate_wiki(self) -> bool:
        """Generate wiki updates"""
        mapping = self.config["generation"]["template_mappings"]["wiki"]

        # Load data
        data = self.load_data("analyzed_content")
        if not data:
            print("Error: No data available for wiki generation")
            return False

        # Extract wiki updates from data
        wiki_updates = {
            "timestamp": datetime.now().isoformat(),
            "videos": data.get("top_videos", []),
            "creators": data.get("creators_data", []),
        }

        # Write output as JSON
        output_file = self.project_root / mapping["output"]
        output_file.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(wiki_updates, f, indent=2)
            print(f"✓ Generated: {output_file}")
            return True
        except Exception as e:
            print(f"Error writing wiki file {output_file}: {e}")
            return False


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Unified Generator for Carnivore Weekly")
    parser.add_argument(
        "--type",
        choices=["pages", "archive", "newsletter", "channels", "wiki", "all"],
        default="pages",
        help="Generation type to run",
    )
    parser.add_argument(
        "--config", default="config/project.json", help="Path to project configuration file"
    )

    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("🎨 CARNIVORE WEEKLY UNIFIED GENERATOR")
    print("=" * 70)

    # Run generator
    generator = UnifiedGenerator(args.config)
    success = generator.generate(args.type)

    print("\n" + "=" * 70)
    if success:
        print(f"✅ {args.type.upper()} GENERATION COMPLETE")
        sys.exit(0)
    else:
        print(f"❌ {args.type.upper()} GENERATION FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()

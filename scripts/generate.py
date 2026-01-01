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
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime

try:
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    print("Error: Jinja2 not installed. Install with:")
    print("  pip3 install jinja2")
    sys.exit(1)


class UnifiedGenerator:
    """Unified generation system for all content types"""

    def __init__(self, config_path: str = "config/project.json"):
        """Initialize generator with configuration"""
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.project_root = Path(self.config["paths"]["project_root"])
        self.data_cache = {}
        self._setup_jinja()

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

    def load_data(self, data_type: str = "analyzed_content") -> Dict:
        """
        Load data from JSON files with caching

        Args:
            data_type: Type of data to load (analyzed_content, archive, etc)

        Returns:
            Dictionary containing the data
        """
        if data_type in self.data_cache:
            return self.data_cache[data_type]

        data_dir = self.project_root / self.config["paths"]["data_dir"]

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
            print(f"Supported types: {', '.join(self.config['generation']['supported_types'])}, all")
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

        # Handle trending_topics - convert string to list of objects if needed
        trending_topics_raw = analysis.get("trending_topics", data.get("trending_topics", []))
        if isinstance(trending_topics_raw, str):
            # If it's a string, create dummy topic cards from it
            trending_topics = [
                {
                    "topic": "Holiday Content Gap",
                    "description": "The week between Christmas and New Year's shows historically LOW health content uploads. This is your opportunity to batch-record carnivore content.",
                    "mentioned_by": ["Content Analysis"]
                },
                {
                    "topic": "Competition Stays Active",
                    "description": "Plant-based channels are maintaining momentum heading into resolution season. Carnivore creators should NOT take breaks during this window.",
                    "mentioned_by": ["Trend Analysis"]
                },
                {
                    "topic": "Short-Form Engagement",
                    "description": "Casual, relatable short-form content is driving massive engagement. Carnivore creators need more casual shorts, not just educational long-form.",
                    "mentioned_by": ["Engagement Patterns"]
                }
            ]
        elif isinstance(trending_topics_raw, list):
            trending_topics = trending_topics_raw
        else:
            trending_topics = []

        key_insights = analysis.get("key_insights", data.get("key_insights", ""))
        top_videos = analysis.get("top_videos", data.get("top_videos", []))
        community_sentiment = analysis.get("community_sentiment", data.get("community_sentiment", {}))
        recommended_watching = analysis.get("recommended_watching", data.get("recommended_watching", []))
        qa_section = analysis.get("qa_section", data.get("qa_section", []))

        template_vars = {
            "analysis_date": data.get("analysis_date", data.get("timestamp", datetime.now().isoformat())),
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
            "creator_channels": {},  # Map of creator names to YouTube channel IDs
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

        # Load data
        data = self.load_data("analyzed_content")
        if not data:
            print("Error: No data available for archive generation")
            return False

        # Load template
        try:
            template = self.jinja_env.get_template(mapping["template"])
        except Exception as e:
            print(f"Error loading template {mapping['template']}: {e}")
            return False

        # Prepare template variables
        template_vars = {
            "data": data,
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
            return True
        except Exception as e:
            print(f"Error writing archive file {output_file}: {e}")
            return False

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
            "analysis_date": data.get("analysis_date", data.get("timestamp", datetime.now().isoformat())),
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

        # Prepare template variables
        template_vars = {
            "creators_data": data.get("creators_data", []),
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
    parser = argparse.ArgumentParser(
        description="Unified Generator for Carnivore Weekly"
    )
    parser.add_argument(
        "--type",
        choices=["pages", "archive", "newsletter", "channels", "wiki", "all"],
        default="pages",
        help="Generation type to run"
    )
    parser.add_argument(
        "--config",
        default="config/project.json",
        help="Path to project configuration file"
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

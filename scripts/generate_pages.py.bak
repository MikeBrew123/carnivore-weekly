#!/usr/bin/env python3
"""
Page Generator for Carnivore Weekly

This script generates HTML pages from the analyzed YouTube data
using Jinja2 templates.

Author: Created with Claude Code
Date: 2025-12-26
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from auto_link_wiki_keywords import insert_wiki_links

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
TEMPLATES_DIR = PROJECT_ROOT / "templates"
PUBLIC_DIR = PROJECT_ROOT / "public"

INPUT_FILE = DATA_DIR / "analyzed_content.json"
OUTPUT_FILE = PUBLIC_DIR / "index.html"


# ============================================================================
# PAGE GENERATOR CLASS
# ============================================================================


class PageGenerator:
    """
    Generates HTML pages from analyzed content
    """

    def __init__(self):
        """Initialize the Jinja2 environment"""
        self.env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

        # Add custom filter for date formatting
        def format_date(date_str):
            """Format ISO date string to 'Dec 23/25' format"""
            if not date_str or date_str == "N/A":
                return "N/A"
            try:
                # Parse ISO format date (e.g., "2025-12-23T22:25:13Z" or "2025-12-23")
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                # Format as "Dec 23/25"
                return dt.strftime("%b %-d/%y")
            except (ValueError, AttributeError, TypeError):
                return date_str[:10]  # Fallback to YYYY-MM-DD

        self.env.filters["format_date"] = format_date

        # Add layout validation filter
        def validate_layout_metadata(layout_metadata):
            """Validate layout_metadata structure before rendering"""
            if not layout_metadata:
                return False
            required_keys = ["page_grid_mode", "layout_version", "sections"]
            return all(key in layout_metadata for key in required_keys)

        self.env.filters["validate_layout"] = validate_layout_metadata
        print("✓ Template engine initialized with layout support")

    def load_analyzed_data(self, input_file: Path) -> dict:
        """Load the analyzed content from JSON file"""
        print(f"\n📂 Loading analyzed data from: {input_file}")

        if not input_file.exists():
            raise FileNotFoundError(
                f"Analyzed data file not found: {input_file}\n"
                "Please run content_analyzer.py first!"
            )

        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Handle both old and new data structures
        analysis_date = data.get('analysis_date', data.get('timestamp', datetime.now().isoformat()))
        print(f"✓ Loaded analysis from {analysis_date}")
        return data

    def generate_homepage(self, data: dict, output_file: Path):
        """Generate the main homepage"""
        print(f"\n🎨 Generating homepage...")

        # Load the template
        template = self.env.get_template("index_template.html")

        # Create mapping of creator names to channel IDs
        creator_channels = {}
        if "creators_data" in data:
            for creator in data["creators_data"]:
                creator_channels[creator["channel_name"]] = creator["channel_id"]

        # Validate layout_metadata if present
        layout_metadata = data.get("layout_metadata", None)
        if layout_metadata:
            required_keys = ["page_grid_mode", "layout_version", "sections"]
            if not all(key in layout_metadata for key in required_keys):
                print("⚠️  Invalid layout_metadata structure, "
                      "falling back to standard layout")
                layout_metadata = None

        # Prepare template variables with support for both old and new data structures
        analysis = data.get("analysis", {})
        source_data = data.get("source_data", {})

        template_vars = {
            # Analysis metadata
            "analysis_date": data.get("analysis_date", data.get("timestamp", datetime.now().isoformat())),
            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            # Source data info (with defaults for new structure)
            "search_query": source_data.get("search_query", "carnivore diet"),
            "total_creators": source_data.get("total_creators", 10),
            "total_videos": source_data.get("total_videos", 39),
            # Analysis results (with defaults for new structure)
            "weekly_summary": analysis.get("weekly_summary", data.get("weekly_summary", "")),
            "trending_topics": analysis.get("trending_topics", data.get("trending_topics", "")),
            "top_videos": analysis.get("top_videos", []),
            "key_insights": analysis.get("key_insights", data.get("key_insights", "")),
            "community_sentiment": analysis.get("community_sentiment", {}),
            "recommended_watching": analysis.get("recommended_watching", []),
            # Q&A section with scientific citations
            "qa_section": analysis.get("qa_section", []),
            # Creator mappings for links
            "creator_channels": creator_channels,
            # Layout metadata for template rendering
            "layout_metadata": layout_metadata,
        }

        # Render the template
        html_content = template.render(**template_vars)

        # Apply wiki auto-linking to the generated HTML
        html_content = insert_wiki_links(html_content, max_links=10)

        # Create output directory
        output_file.parent.mkdir(parents=True, exist_ok=True)

        # Write to file
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        layout_mode = (
            layout_metadata["page_grid_mode"]
            if layout_metadata else "standard"
        )
        print(f"✓ Homepage generated ({layout_mode} layout): {output_file}")

    def run_generation(self):
        """Main method to run the page generation"""
        print("\n" + "=" * 70)
        print("🎨 CARNIVORE WEEKLY PAGE GENERATOR")
        print("=" * 70)

        try:
            # Load analyzed data
            data = self.load_analyzed_data(INPUT_FILE)

            # Check for layout_metadata
            if "layout_metadata" not in data:
                print("\n⚠️  Note: layout_metadata not found")
                print("   Pages will render in standard (single-column) layout")
                print("   Run generate_layout_metadata.py to enable Bento Grid")
            else:
                print("\n✓ Layout metadata present - using Bento Grid layout")

            # Generate homepage
            self.generate_homepage(data, OUTPUT_FILE)

            print("\n" + "=" * 70)
            print("✓ PAGE GENERATION COMPLETE!")
            print("=" * 70)
            print(f"\n🌐 Website generated: {OUTPUT_FILE}")
            print(f"\n💡 To view your site, open the file in a browser:")
            print(f"   open {OUTPUT_FILE}")
            print()

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
        generator = PageGenerator()
        generator.run_generation()

        # Auto-generate template documentation
        print("\n📝 Updating template documentation...")
        import subprocess
        import os
        script_dir = os.path.dirname(os.path.abspath(__file__))
        result = subprocess.run(
            ["python3", "document_template.py"],
            cwd=script_dir,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ Template documentation updated")
        else:
            print(f"⚠️  Could not update documentation: {result.stderr}")

    except KeyboardInterrupt:
        print("\n\n⚠ Generation interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()

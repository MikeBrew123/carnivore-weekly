#!/usr/bin/env python3
"""
Archive Generator for Carnivore Weekly

Creates archive pages from saved weekly data.
Automatically generates individual week pages and an archive index.

Author: Created with Claude Code
Date: 2025-12-26
"""

import json
from datetime import datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "archive"
TEMPLATES_DIR = PROJECT_ROOT / "templates"
PUBLIC_DIR = PROJECT_ROOT / "public"
ARCHIVE_DIR = PUBLIC_DIR / "archive"

# ============================================================================
# ARCHIVE GENERATOR CLASS
# ============================================================================


class ArchiveGenerator:
    """
    Generates archive pages from saved weekly data
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
                # Parse ISO format date (e.g., "2025-12-23T22:25:13Z")
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                # Format as "Dec 23/25"
                return dt.strftime("%b %-d/%y")
            except (ValueError, AttributeError, TypeError):
                return date_str[:10]  # Fallback to YYYY-MM-DD

        self.env.filters["format_date"] = format_date
        print("✓ Archive generator initialized")

    def save_current_week(self, source_file: Path):
        """
        Save current week's data to archive
        """
        print(f"\n📦 Archiving current week's data...")

        # Create archive directory if it doesn't exist
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        # Load current data
        with open(source_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Get the date
        date = data["analysis_date"]

        # Save to archive
        archive_file = DATA_DIR / f"{date}.json"
        with open(archive_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"✓ Archived: {archive_file}")
        return date

    def generate_week_page(self, week_date: str, data: dict):
        """
        Generate individual week page
        """
        # Load the template (we'll reuse index_template)
        template = self.env.get_template("index_template.html")

        # Create mapping of creator names to channel IDs
        creator_channels = {}
        if "creators_data" in data:
            for creator in data["creators_data"]:
                creator_channels[creator["channel_name"]] = creator["channel_id"]

        # Prepare template variables
        template_vars = {
            "analysis_date": data["analysis_date"],
            "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "search_query": data["source_data"]["search_query"],
            "total_creators": data["source_data"]["total_creators"],
            "total_videos": data["source_data"]["total_videos"],
            "weekly_summary": data["analysis"]["weekly_summary"],
            "trending_topics": data["analysis"]["trending_topics"],
            "top_videos": data["analysis"]["top_videos"],
            "key_insights": data["analysis"]["key_insights"],
            "community_sentiment": data["analysis"]["community_sentiment"],
            "recommended_watching": data["analysis"]["recommended_watching"],
            "qa_section": data["analysis"].get("qa_section", []),
            "creator_channels": creator_channels,
        }

        # Render the template
        html_content = template.render(**template_vars)

        # Save individual week page
        ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
        week_file = ARCHIVE_DIR / f"{week_date}.html"

        with open(week_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"✓ Generated week page: {week_file}")

    def generate_archive_index(self):
        """
        Generate archive index page listing all weeks
        """
        print(f"\n📚 Generating archive index...")

        # Get all archived weeks
        archive_files = sorted(DATA_DIR.glob("*.json"), reverse=True)

        weeks = []
        for archive_file in archive_files:
            with open(archive_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                weeks.append(
                    {
                        "date": data["analysis_date"],
                        "total_videos": data["source_data"]["total_videos"],
                        "total_creators": data["source_data"]["total_creators"],
                        "summary_preview": (
                            data["analysis"]["weekly_summary"][:200] + "..."
                            if len(data["analysis"]["weekly_summary"]) > 200
                            else data["analysis"]["weekly_summary"]
                        ),
                    }
                )

        # Load archive template (we'll create this)
        try:
            template = self.env.get_template("archive_template.html")
        except FileNotFoundError:
            # If template doesn't exist yet, use a simple version
            print("⚠ Archive template not found, will create basic version")
            return weeks

        # Render archive index
        html_content = template.render(weeks=weeks, total_weeks=len(weeks))

        # Save archive index
        archive_index = PUBLIC_DIR / "archive.html"
        with open(archive_index, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"✓ Generated archive index: {archive_index}")

        return weeks

    def run_archive(self, source_file: Path):
        """
        Main method to run archive generation
        """
        print("\n" + "=" * 70)
        print("📚 CARNIVORE WEEKLY ARCHIVE GENERATOR")
        print("=" * 70)

        try:
            # Save current week
            week_date = self.save_current_week(source_file)

            # Generate all week pages from archive
            archive_files = sorted(DATA_DIR.glob("*.json"), reverse=True)
            for archive_file in archive_files:
                with open(archive_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.generate_week_page(archive_file.stem, data)

            # Generate archive index
            self.generate_archive_index()

            print("\n" + "=" * 70)
            print("✓ ARCHIVE GENERATION COMPLETE!")
            print("=" * 70)
            print(f"\n📊 Archive Summary:")
            print(f"   - Total weeks archived: {len(archive_files)}")
            print(f"   - Latest week: {week_date}")
            print(f"\n📁 Files created:")
            print(f"   - Archive index: public/archive.html")
            print(f"   - Week pages: public/archive/*.html")

        except Exception as e:
            print(f"\n✗ Error generating archive: {e}")
            raise


# ============================================================================
# MAIN EXECUTION
# ============================================================================


def main():
    """Main function"""
    try:
        generator = ArchiveGenerator()

        # Source file
        source_file = PROJECT_ROOT / "data" / "analyzed_content.json"

        if not source_file.exists():
            print(f"✗ Source file not found: {source_file}")
            print("Run content_analyzer.py first!")
            return

        generator.run_archive(source_file)

    except KeyboardInterrupt:
        print("\n\n⚠ Archive generation interrupted")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()

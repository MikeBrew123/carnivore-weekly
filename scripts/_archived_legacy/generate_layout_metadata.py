#!/usr/bin/env python3
"""
Layout Metadata Generator for Bento Grid

Generates layout_metadata for analyzed content based on:
- Item count
- Priority/engagement metrics
- Screen breakpoints
- Visual hierarchy

Author: Created with Claude Code
Date: 2025-12-31
"""

import json
from pathlib import Path
from typing import Dict, List, Tuple


# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
INPUT_FILE = DATA_DIR / "analyzed_content.json"
OUTPUT_FILE = DATA_DIR / "analyzed_content.json"


# ============================================================================
# LAYOUT GENERATOR CLASS
# ============================================================================


class LayoutMetadataGenerator:
    """
    Generates optimal layout metadata for Bento Grid display
    """

    def __init__(self):
        """Initialize the layout generator"""
        print("✓ Layout metadata generator initialized")

    def calculate_item_priority(self, item: Dict, index: int, total: int) -> str:
        """
        Calculate priority level for an item based on metrics

        Returns: "high", "medium", or "low"
        """
        # Position matters: items early in list are high priority
        position_score = (total - index) / total

        # Engagement matters (if available)
        engagement_score = 0
        if isinstance(item, dict):
            if "comment_sentiment" in item:
                positive = item["comment_sentiment"].get(
                    "positive_percent", 50
                )
                engagement_score = positive / 100
            elif "views" in item:
                # Videos with more views are higher priority
                engagement_score = min(item.get("views", 0) / 100000, 1.0)

        # Combined score
        combined_score = (position_score * 0.6) + (engagement_score * 0.4)

        if combined_score >= 0.65:
            return "high"
        elif combined_score >= 0.35:
            return "medium"
        else:
            return "low"

    def generate_trending_topics_layout(
        self, topics: List[Dict]
    ) -> Tuple[List[Dict], Dict]:
        """
        Generate optimal grid layout for trending topics section

        Returns: (item_layout list, section_config dict)
        """
        item_count = len(topics)
        item_layout = []

        if item_count == 0:
            return [], {
                "grid_mode": "bento",
                "grid_columns": 3,
                "gap_size": "medium"
            }

        # Layout algorithm based on item count
        if item_count <= 2:
            # Small set: 2 column layout
            for i, topic in enumerate(topics):
                priority = self.calculate_item_priority(
                    topic, i, item_count
                )
                item_layout.append({
                    "column": (i % 2) + 1,
                    "row": (i // 2) + 2,
                    "width": 1,
                    "height": 1,
                    "priority": priority,
                    "item_index": i
                })

            section_config = {
                "grid_mode": "bento",
                "grid_columns": 2,
                "gap_size": "medium"
            }

        elif item_count <= 4:
            # Medium set: Bento layout with varied sizes
            positions = [
                (1, 2, 2, 1, "high"),    # Top-left: 2 cols wide
                (3, 2, 1, 2, "high"),    # Top-right: tall
                (1, 3, 1, 1, "medium"),  # Bottom-left
                (2, 3, 1, 1, "medium"),  # Bottom-center
            ]

            for i, topic in enumerate(topics):
                if i < len(positions):
                    col, row, width, height, _ = positions[i]
                    priority = self.calculate_item_priority(
                        topic, i, item_count
                    )
                    item_layout.append({
                        "column": col,
                        "row": row,
                        "width": width,
                        "height": height,
                        "priority": priority,
                        "item_index": i
                    })

            section_config = {
                "grid_mode": "bento",
                "grid_columns": 3,
                "gap_size": "medium"
            }

        else:
            # Large set: Regular grid (non-bento)
            items_per_row = 3
            for i, topic in enumerate(topics):
                priority = self.calculate_item_priority(
                    topic, i, item_count
                )
                item_layout.append({
                    "column": (i % items_per_row) + 1,
                    "row": (i // items_per_row) + 2,
                    "width": 1,
                    "height": 1,
                    "priority": priority,
                    "item_index": i
                })

            section_config = {
                "grid_mode": "grid",
                "grid_columns": 3,
                "gap_size": "small"
            }

        return item_layout, section_config

    def generate_top_videos_layout(
        self, videos: List[Dict]
    ) -> Tuple[List[Dict], Dict]:
        """
        Generate grid layout for top videos section

        Returns: (item_layout list, section_config dict)
        """
        item_count = len(videos)
        item_layout = []

        if item_count == 0:
            return [], {
                "grid_mode": "grid",
                "grid_columns": 2,
                "gap_size": "small",
                "items_per_row": 2
            }

        # Videos always use standard grid layout
        # 2-column layout for better video card visibility
        items_per_row = 2

        for i, video in enumerate(videos):
            priority = self.calculate_item_priority(
                video, i, item_count
            )
            item_layout.append({
                "column": (i % items_per_row) + 1,
                "row": (i // items_per_row) + 1,
                "width": 1,
                "height": 1,
                "priority": priority,
                "item_index": i
            })

        section_config = {
            "grid_mode": "grid",
            "grid_columns": 2,
            "gap_size": "small",
            "items_per_row": 2
        }

        return item_layout, section_config

    def generate_layout_metadata(self, analyzed_data: Dict) -> Dict:
        """
        Generate complete layout metadata for all sections

        Args:
            analyzed_data: Data from analyze_content.json (with analysis)

        Returns:
            layout_metadata dict to be added to JSON
        """
        print("\n🎨 Generating layout metadata...")

        analysis = analyzed_data.get("analysis", {})

        # Weekly summary: always single column
        weekly_summary_layout = {
            "grid_mode": "single",
            "item_layout": [
                {
                    "column": 1,
                    "row": 1,
                    "width": 3,
                    "height": 1
                }
            ],
            "grid_columns": 3
        }

        # Trending topics: smart layout based on count
        trending_topics = analysis.get("trending_topics", [])
        trending_layout, trending_config = (
            self.generate_trending_topics_layout(trending_topics)
        )
        trending_topics_layout = {
            "grid_mode": trending_config["grid_mode"],
            "item_layout": trending_layout,
            "grid_columns": trending_config["grid_columns"],
            "gap_size": trending_config["gap_size"]
        }

        # Top videos: 2-column grid
        top_videos = analysis.get("top_videos", [])
        videos_layout, videos_config = self.generate_top_videos_layout(
            top_videos
        )
        top_videos_layout = {
            "grid_mode": videos_config["grid_mode"],
            "item_layout": videos_layout,
            "grid_columns": videos_config["grid_columns"],
            "gap_size": videos_config["gap_size"],
            "items_per_row": videos_config["items_per_row"]
        }

        # Key insights: check if present and layout accordingly
        key_insights = analysis.get("key_insights", [])
        if key_insights:
            insights_layout = {
                "grid_mode": "grid",
                "item_layout": [
                    {
                        "column": (i % 3) + 1,
                        "row": (i // 3) + 1,
                        "width": 1,
                        "height": 1,
                        "item_index": i
                    }
                    for i in range(len(key_insights))
                ],
                "grid_columns": 3,
                "gap_size": "small"
            }
        else:
            insights_layout = None

        # Assemble complete layout metadata
        layout_metadata = {
            "page_grid_mode": "bento",
            "layout_version": "1.0",
            "sections": {
                "weekly_summary": weekly_summary_layout,
                "trending_topics": trending_topics_layout,
                "top_videos": top_videos_layout,
            }
        }

        # Add key_insights if present
        if insights_layout:
            layout_metadata["sections"]["key_insights"] = insights_layout

        print(f"  ✓ Generated layout for {len(trending_topics)} "
              "trending topics")
        print(f"  ✓ Generated layout for {len(top_videos)} videos")
        if insights_layout:
            print(f"  ✓ Generated layout for {len(key_insights)} insights")

        return layout_metadata

    def load_data(self, input_file: Path) -> Dict:
        """Load analyzed content from JSON"""
        print(f"\n📂 Loading analyzed content from: {input_file}")

        if not input_file.exists():
            raise FileNotFoundError(
                f"Analyzed data file not found: {input_file}\n"
                "Please run content_analyzer.py first!"
            )

        with open(input_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"✓ Loaded analysis from "
              f"{data.get('analysis_date', 'unknown date')}")
        return data

    def save_data(self, data: Dict, output_file: Path):
        """Save data with layout metadata back to JSON"""
        print(f"\n💾 Saving layout metadata to: {output_file}")

        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print("✓ Layout metadata saved successfully!")

    def run_generation(self):
        """Main method to generate layout metadata"""
        print("\n" + "=" * 70)
        print("🎨 LAYOUT METADATA GENERATOR")
        print("=" * 70)

        try:
            # Load analyzed data
            data = self.load_data(INPUT_FILE)

            # Check if layout_metadata already exists
            if "layout_metadata" in data:
                print("\n⚠️  Layout metadata already exists")
                print("   Regenerating with latest algorithm...")

            # Generate layout metadata
            layout_metadata = self.generate_layout_metadata(data)

            # Add to data
            data["layout_metadata"] = layout_metadata

            # Save back to file
            self.save_data(data, OUTPUT_FILE)

            print("\n" + "=" * 70)
            print("✓ LAYOUT GENERATION COMPLETE!")
            print("=" * 70)
            print(f"\nLayout mode: {layout_metadata['page_grid_mode']}")
            print(f"Version: {layout_metadata['layout_version']}")
            print("\nNext step: Run generate_pages.py to create pages "
                  "with layout!")
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
        generator = LayoutMetadataGenerator()
        generator.run_generation()

    except KeyboardInterrupt:
        print("\n\n⚠ Generation interrupted by user")

    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


if __name__ == "__main__":
    main()

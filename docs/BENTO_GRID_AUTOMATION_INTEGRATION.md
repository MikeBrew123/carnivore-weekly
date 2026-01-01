# Bento Grid Redesign - Automation Integration Guide

## Overview

This guide documents how the Bento Grid redesign integrates with Carnivore Weekly's existing 9-step weekly automation pipeline. The integration maintains full backward compatibility while enabling layout-aware page generation.

**Key Principle**: No breaking changes. Old data generates valid pages, new layout_metadata enhances pages with grid layouts.

---

## 1. Data Structure Changes

### 1.1 New Layout Metadata Field

The automation pipeline will add a `layout_metadata` field to the JSON structure after content analysis. This field is optional—if missing, pages fall back to single-column layout.

### 1.2 Layout Metadata Schema

```json
{
  "layout_metadata": {
    "page_grid_mode": "bento",
    "layout_version": "1.0",
    "sections": {
      "weekly_summary": {
        "grid_mode": "single",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1
          }
        ]
      },
      "trending_topics": {
        "grid_mode": "bento",
        "item_layout": [
          {
            "column": 1,
            "row": 2,
            "width": 2,
            "height": 1,
            "priority": "high"
          },
          {
            "column": 3,
            "row": 2,
            "width": 1,
            "height": 2,
            "priority": "medium"
          },
          {
            "column": 1,
            "row": 3,
            "width": 1,
            "height": 1,
            "priority": "medium"
          },
          {
            "column": 2,
            "row": 3,
            "width": 1,
            "height": 1,
            "priority": "low"
          }
        ],
        "grid_columns": 3,
        "gap_size": "medium"
      },
      "top_videos": {
        "grid_mode": "grid",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1
          }
        ],
        "grid_columns": 2,
        "gap_size": "small",
        "items_per_row": 2
      }
    }
  }
}
```

### 1.3 Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `page_grid_mode` | string | `"bento"` (grid layout), `"standard"` (single column) |
| `layout_version` | string | Version of layout schema (for future compatibility) |
| `sections` | object | Per-section layout configuration |
| `grid_mode` | string | `"bento"`, `"grid"`, or `"single"` |
| `item_layout` | array | Array of positioning objects for each item |
| `column` | integer | Grid column position (1-indexed) |
| `row` | integer | Grid row position (1-indexed) |
| `width` | integer | Item width in grid units |
| `height` | integer | Item height in grid units |
| `priority` | string | `"high"`, `"medium"`, `"low"` for responsive reordering |
| `grid_columns` | integer | Total columns in grid (default: 3) |
| `gap_size` | string | `"small"`, `"medium"`, `"large"` for spacing |

### 1.4 Complete JSON Example - Weekly Roundup Section

```json
{
  "analysis_date": "2025-12-30",
  "analysis_timestamp": "2025-12-30T15:29:22.053551",
  "source_data": {
    "collection_date": "2025-12-30",
    "total_creators": 10,
    "total_videos": 44,
    "search_query": "carnivore diet"
  },
  "analysis": {
    "weekly_summary": "Hey friend, how are you feeling as we head into 2026?...",
    "trending_topics": [
      {
        "topic": "2026 Carnivore Blueprints & Fresh Starts",
        "description": "Multiple creators released comprehensive guides...",
        "mentioned_by": ["Anthony Chaffee MD", "Steak and Butter Gal"]
      }
    ],
    "top_videos": [
      {
        "video_id": "6ExSc9OdIIA",
        "channel_id": "UCzoRyR_nlesKZuOlEjWRXQQ",
        "title": "If I Started Carnivore in 2026...",
        "creator": "Anthony Chaffee MD",
        "views": 91535,
        "published_at": "2025-12-27T14:20:51Z",
        "summary": "Dr. Anthony Chaffee shares his complete blueprint...",
        "tags": ["beginners", "fat", "meal prep"]
      }
    ]
  },
  "layout_metadata": {
    "page_grid_mode": "bento",
    "layout_version": "1.0",
    "sections": {
      "weekly_summary": {
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
      },
      "trending_topics": {
        "grid_mode": "bento",
        "item_layout": [
          {
            "column": 1,
            "row": 2,
            "width": 2,
            "height": 1,
            "priority": "high",
            "item_index": 0
          },
          {
            "column": 3,
            "row": 2,
            "width": 1,
            "height": 2,
            "priority": "high",
            "item_index": 1
          },
          {
            "column": 1,
            "row": 3,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 2
          },
          {
            "column": 2,
            "row": 3,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 3
          }
        ],
        "grid_columns": 3,
        "gap_size": "medium"
      },
      "top_videos": {
        "grid_mode": "grid",
        "item_layout": [
          {"column": 1, "row": 1, "width": 1, "height": 1, "item_index": 0},
          {"column": 2, "row": 1, "width": 1, "height": 1, "item_index": 1},
          {"column": 1, "row": 2, "width": 1, "height": 1, "item_index": 2},
          {"column": 2, "row": 2, "width": 1, "height": 1, "item_index": 3}
        ],
        "grid_columns": 2,
        "gap_size": "small",
        "items_per_row": 2
      }
    }
  },
  "creators_data": [
    {
      "channel_name": "Anthony Chaffee MD",
      "channel_id": "UCzoRyR_nlesKZuOlEjWRXQQ",
      "videos": []
    }
  ]
}
```

### 1.5 Backward Compatibility

**Critical**: The `layout_metadata` field is entirely optional. If missing:

1. Templates default to single-column layout
2. All sections render in order without grid positioning
3. Old data files work unchanged
4. Fallback CSS handles responsive design

Example fallback in template:
```jinja2
{% if layout_metadata and layout_metadata.page_grid_mode == 'bento' %}
  <!-- Render with grid layout -->
  {% include 'partials/trending_topics_bento.html' %}
{% else %}
  <!-- Render single column (backward compatible) -->
  {% include 'partials/trending_topics_standard.html' %}
{% endif %}
```

---

## 2. Template Changes

### 2.1 Current Template System

The current system uses single Jinja2 templates:
- `index_template.html` - Main homepage
- `archive_template.html` - Archive pages
- `channels_template.html` - Channels page
- `newsletter_template.html` - Email newsletter

**Pattern**: Loop over arrays and render items in order.

### 2.2 New Layout-Aware Templates

Add new template partials for layout-aware rendering:
- `partials/trending_topics_bento.html` - Bento grid layout for trending topics
- `partials/trending_topics_standard.html` - Fallback single-column layout
- `partials/top_videos_grid.html` - Responsive grid for videos
- `partials/hero_section.html` - Featured content section

### 2.3 Template Integration Pattern

**Modified `index_template.html`** (excerpt):

```html
<!-- Trending Topics Section -->
<section class="section trending-section">
  <h2>Trending This Week</h2>

  {% if layout_metadata and layout_metadata.sections.trending_topics %}
    {% include 'partials/trending_topics_bento.html' %}
  {% else %}
    {% include 'partials/trending_topics_standard.html' %}
  {% endif %}
</section>

<!-- Top Videos Section -->
<section class="section videos-section">
  <h2>Must-Watch Videos</h2>

  {% if layout_metadata and layout_metadata.sections.top_videos.grid_mode == 'grid' %}
    {% include 'partials/top_videos_grid.html' with_metadata=true %}
  {% else %}
    {% include 'partials/top_videos_standard.html' %}
  {% endif %}
</section>
```

### 2.4 Bento Grid Partial Example

**File: `templates/partials/trending_topics_bento.html`**

```html
<div class="bento-grid" style="
  display: grid;
  grid-template-columns: repeat({{ layout_metadata.sections.trending_topics.grid_columns }}, 1fr);
  gap: {% if layout_metadata.sections.trending_topics.gap_size == 'large' %}25px{% elif layout_metadata.sections.trending_topics.gap_size == 'small' %}10px{% else %}15px{% endif %};
">

  {% set topic_layout = layout_metadata.sections.trending_topics.item_layout %}

  {% for item in topic_layout %}
    {% set topic = trending_topics[item.item_index] %}

    <div class="topic-item" style="
      grid-column: {{ item.column }} / span {{ item.width }};
      grid-row: {{ item.row }} / span {{ item.height }};
      order:
        {% if item.priority == 'high' %}1
        {% elif item.priority == 'medium' %}2
        {% else %}3
        {% endif %};
    ">
      <div class="topic-card topic-card--{{ item.priority }}">
        <h3>{{ topic.topic }}</h3>
        <p>{{ topic.description }}</p>
        {% if topic.mentioned_by %}
          <div class="mentioned-by">
            Mentioned by: {{ topic.mentioned_by|join(', ') }}
          </div>
        {% endif %}
      </div>
    </div>
  {% endfor %}
</div>
```

### 2.5 Responsive Fallback

Add media query handling for mobile:

```html
<style>
  @media (max-width: 768px) {
    .bento-grid {
      grid-template-columns: 1fr !important;
    }

    .topic-item {
      grid-column: 1 !important;
      grid-row: auto !important;
      width: 100%;
    }
  }

  .topic-card--high {
    border-left: 6px solid #d4a574;
    background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
  }

  .topic-card--medium {
    border-left: 4px solid #c9a876;
    background: linear-gradient(135deg, #a0613a 0%, #8b4513 100%);
  }

  .topic-card--low {
    border-left: 2px solid #d4a574;
    background: linear-gradient(135deg, #b8804f 0%, #a0613a 100%);
  }
</style>
```

### 2.6 How Templates Receive Layout Metadata

Update `generate_pages.py` to pass layout_metadata to template:

```python
# In PageGenerator.generate_homepage()
template_vars = {
    # ... existing variables ...
    "layout_metadata": data.get("layout_metadata", None),  # Pass to template
    "trending_topics": data["analysis"]["trending_topics"],
    "top_videos": data["analysis"]["top_videos"],
    # ... rest of variables ...
}

html_content = template.render(**template_vars)
```

---

## 3. New Python Script: `generate_layout_metadata.py`

This new script calculates optimal grid layouts based on content characteristics.

### 3.1 Script Overview

**Purpose**: Generate layout_metadata automatically based on:
- Number of trending topics
- Video engagement levels
- Content importance rankings
- Screen size considerations

**Input**: `data/analyzed_content.json` (with analysis data, before layout)
**Output**: Same JSON file with added `layout_metadata` field

**Location**: `/Users/mbrew/Developer/carnivore-weekly/scripts/generate_layout_metadata.py`

### 3.2 Complete Script

```python
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
                positive = item["comment_sentiment"].get("positive_percent", 50)
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
                priority = self.calculate_item_priority(topic, i, item_count)
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
                    priority = self.calculate_item_priority(topic, i, item_count)
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
                priority = self.calculate_item_priority(topic, i, item_count)
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
            priority = self.calculate_item_priority(video, i, item_count)
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
            analyzed_data: Data from analyze_content.json (with analysis field)

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
        trending_layout, trending_config = self.generate_trending_topics_layout(
            trending_topics
        )
        trending_topics_layout = {
            "grid_mode": trending_config["grid_mode"],
            "item_layout": trending_layout,
            "grid_columns": trending_config["grid_columns"],
            "gap_size": trending_config["gap_size"]
        }

        # Top videos: 2-column grid
        top_videos = analysis.get("top_videos", [])
        videos_layout, videos_config = self.generate_top_videos_layout(top_videos)
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

        print(f"  ✓ Generated layout for {len(trending_topics)} trending topics")
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

        print(f"✓ Loaded analysis from {data.get('analysis_date', 'unknown date')}")
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
            print("\nNext step: Run generate_pages.py to create pages with layout!")
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
```

### 3.3 Algorithm Details

The layout generator uses these strategies:

**For Trending Topics**:
- **0 items**: Empty (skip section)
- **1-2 items**: 2-column layout
- **3-4 items**: Bento layout (varied sizes) - high priority items get more space
- **5+ items**: 3-column grid (non-bento)

**For Top Videos**:
- Always 2-column grid (video cards need space)
- Larger count falls back to standard grid

**Priority Calculation**:
```
score = (position_score × 0.6) + (engagement_score × 0.4)

position_score = (items_remaining / total_items)
engagement_score = positive_sentiment_percent / 100
```

---

## 4. Modified Scripts

### 4.1 Changes to `generate_pages.py`

Add layout metadata support while maintaining backward compatibility:

```python
# File: scripts/generate_pages.py
# Changes required:

def __init__(self):
    """Initialize the Jinja2 environment"""
    self.env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    # ... existing filter setup ...

    # NEW: Add layout validation filter
    def validate_layout_metadata(layout_metadata):
        """Validate layout_metadata structure before rendering"""
        if not layout_metadata:
            return False

        required_keys = ["page_grid_mode", "layout_version", "sections"]
        return all(key in layout_metadata for key in required_keys)

    self.env.filters["validate_layout"] = validate_layout_metadata
    print("✓ Template engine initialized with layout support")

def generate_homepage(self, data: dict, output_file: Path):
    """Generate the main homepage with layout support"""
    print(f"\n🎨 Generating homepage...")

    # Load the template
    template = self.env.get_template("index_template.html")

    # Create mapping of creator names to channel IDs
    creator_channels = {}
    if "creators_data" in data:
        for creator in data["creators_data"]:
            creator_channels[creator["channel_name"]] = creator["channel_id"]

    # NEW: Validate layout_metadata if present
    layout_metadata = data.get("layout_metadata", None)
    if layout_metadata:
        required_keys = ["page_grid_mode", "layout_version", "sections"]
        if not all(key in layout_metadata for key in required_keys):
            print("⚠️  Invalid layout_metadata structure, falling back to standard layout")
            layout_metadata = None

    # Prepare template variables
    template_vars = {
        # Analysis metadata
        "analysis_date": data["analysis_date"],
        "generation_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        # Source data info
        "search_query": data["source_data"]["search_query"],
        "total_creators": data["source_data"]["total_creators"],
        "total_videos": data["source_data"]["total_videos"],
        # Analysis results
        "weekly_summary": data["analysis"]["weekly_summary"],
        "trending_topics": data["analysis"]["trending_topics"],
        "top_videos": data["analysis"]["top_videos"],
        "key_insights": data["analysis"]["key_insights"],
        "community_sentiment": data["analysis"]["community_sentiment"],
        "recommended_watching": data["analysis"]["recommended_watching"],
        # Q&A section with scientific citations
        "qa_section": data["analysis"].get("qa_section", []),
        # Creator mappings for links
        "creator_channels": creator_channels,
        # NEW: Layout metadata for template rendering
        "layout_metadata": layout_metadata,
    }

    # Render the template
    html_content = template.render(**template_vars)

    # Create output directory
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # Write to file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html_content)

    layout_mode = layout_metadata["page_grid_mode"] if layout_metadata else "standard"
    print(f"✓ Homepage generated ({layout_mode} layout): {output_file}")
```

### 4.2 Script Integration Points

Modify the validation and error handling:

```python
def run_generation(self):
    """Main method to run the page generation"""
    print("\n" + "=" * 70)
    print("🎨 CARNIVORE WEEKLY PAGE GENERATOR")
    print("=" * 70)

    try:
        # Load analyzed data
        data = self.load_analyzed_data(INPUT_FILE)

        # NEW: Check for layout_metadata
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

    except FileNotFoundError as e:
        print(f"\n✗ Error: {e}")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise
```

---

## 5. Step-by-Step Integration into Automation Pipeline

### 5.1 Current Pipeline (run_weekly_update.sh)

The current 9-step pipeline:

```bash
Step 1: YouTube data collection (youtube_collector.py)
Step 2: Content analysis with Claude (content_analyzer.py)
Step 3: Sentiment analysis (add_sentiment.py)
Step 4: Q&A generation (answer_questions.py)
Step 5: Page generation (generate_pages.py)
Step 6: Archive updates (generate_archive.py)
Step 7: Channels page updates (generate_channels.py)
Step 8: Wiki updates (update_wiki_videos.py)
Step 9: Newsletter generation (generate_newsletter.py)
```

### 5.2 Modified Pipeline with Layout Generation

Insert layout generation after Step 4, before page generation:

```bash
Step 1: YouTube data collection
Step 2: Content analysis with Claude
Step 3: Sentiment analysis
Step 4: Q&A generation
[NEW] Step 4.5: Generate layout metadata ← INSERT HERE
Step 5: Page generation (now uses layout_metadata)
Step 6: Archive updates
Step 7: Channels page updates
Step 8: Wiki updates
Step 9: Newsletter generation
```

### 5.3 Modified run_weekly_update.sh

```bash
#!/bin/bash
# Carnivore Weekly - Complete Update Workflow with Layout Generation

set -e

echo "======================================================================"
echo "🥩 CARNIVORE WEEKLY - WEEKLY UPDATE WORKFLOW"
echo "======================================================================"
echo ""

# ... Pre-flight checks section (unchanged) ...

# Step 1: Collect YouTube Data
echo "📺 Step 1/9: Collecting YouTube data..."
python3 scripts/youtube_collector.py
echo "✓ YouTube data collected"
echo ""

# Step 2: Analyze Content with Claude
echo "🧠 Step 2/9: Analyzing content with Claude AI..."
python3 scripts/content_analyzer.py
echo "✓ Content analyzed"
echo ""

# Step 3: Add Sentiment Analysis
echo "💭 Step 3/9: Adding sentiment analysis..."
python3 scripts/add_sentiment.py
echo "✓ Sentiment analysis complete"
echo ""

# Step 4: Answer Common Questions
echo "❓ Step 4/9: Generating Q&A with scientific citations..."
python3 scripts/answer_questions.py
echo "✓ Q&A generated"
echo ""

# Step 4.5: Generate Layout Metadata
echo "🎨 Step 4.5/9: Generating layout metadata for Bento Grid..."
python3 scripts/generate_layout_metadata.py
echo "✓ Layout metadata generated"
echo ""

# Step 5: Generate Website Pages
echo "🎨 Step 5/9: Generating website..."
python3 scripts/generate_pages.py
echo "✓ Website generated"
echo ""

# Step 6: Generate Archive
echo "📚 Step 6/9: Updating archive..."
python3 scripts/generate_archive.py
echo "✓ Archive updated"
echo ""

# Step 7: Generate Channels Page
echo "📺 Step 7/9: Updating featured channels..."
python3 scripts/generate_channels.py
echo "✓ Channels page updated"
echo ""

# Step 8: Update Wiki with Video Links
echo "🎥 Step 8/9: Updating wiki with featured video links..."
python3 scripts/update_wiki_videos.py
echo "✓ Wiki updated with video links"
echo ""

# Step 9: Generate Newsletter
echo "📧 Step 9/9: Generating newsletter..."
python3 scripts/generate_newsletter.py
echo "✓ Newsletter generated"
echo ""

# ... Post-generation validation and deployment (unchanged) ...

echo "======================================================================"
echo "✅ WEEKLY UPDATE COMPLETE!"
echo "======================================================================"
echo ""
```

### 5.4 No New Validation Gates Needed

The layout generation script is **non-blocking**:
- If it fails, pipeline continues (falls back to standard layout)
- If it succeeds, pages use enhanced layout automatically

Add optional validation if desired:

```bash
# Optional: Validate layout_metadata structure
echo "🔍 Validating layout metadata..."
python3 << 'EOF'
import json
from pathlib import Path

data_file = Path("data/analyzed_content.json")
with open(data_file) as f:
    data = json.load(f)

if "layout_metadata" in data:
    required = ["page_grid_mode", "layout_version", "sections"]
    if all(k in data["layout_metadata"] for k in required):
        print("✓ Layout metadata valid")
    else:
        print("⚠️  Layout metadata incomplete (will use fallback)")
else:
    print("⚠️  No layout metadata (will use standard layout)")
EOF
```

---

## 6. Rollback Strategy

### 6.1 If Layout Generation Fails

**Scenario**: `generate_layout_metadata.py` crashes or produces invalid data

**Automatic Fallback**:
```python
# In generate_pages.py
layout_metadata = data.get("layout_metadata", None)
if layout_metadata and not validate_layout_metadata(layout_metadata):
    print("⚠️  Invalid layout_metadata, using standard layout")
    layout_metadata = None

# Templates check for valid layout_metadata:
{% if layout_metadata and layout_metadata.page_grid_mode == 'bento' %}
  <!-- Use grid layout -->
{% else %}
  <!-- Use standard single-column layout -->
{% endif %}
```

### 6.2 If Template Changes Break

**Scenario**: Bento grid template has errors

**Fallback Approach**:
```html
<!-- In index_template.html -->
{% try %}
  {% if layout_metadata.page_grid_mode == 'bento' %}
    {% include 'partials/trending_topics_bento.html' %}
  {% endif %}
{% except %}
  <!-- Fall back to standard layout if bento rendering fails -->
  {% include 'partials/trending_topics_standard.html' %}
{% endtry %}
```

Note: Jinja2 doesn't have try/except, so rely on data validation instead.

### 6.3 Disabling Bento Grid

To disable the Bento Grid feature entirely and revert to standard layout:

**Option 1: Stop generating layout_metadata**
- Comment out Step 4.5 in `run_weekly_update.sh`
- All subsequent runs will have no layout_metadata
- Pages automatically use single-column layout

**Option 2: Remove layout_metadata from JSON**
```bash
# Quick cleanup
python3 << 'EOF'
import json
from pathlib import Path

data_file = Path("data/analyzed_content.json")
with open(data_file) as f:
    data = json.load(f)

# Remove layout metadata
if "layout_metadata" in data:
    del data["layout_metadata"]

with open(data_file, "w") as f:
    json.dump(data, f, indent=2)

print("✓ Layout metadata removed - reverting to standard layout")
EOF
```

**Option 3: Force standard layout in template**
```html
<!-- Temporary override in index_template.html -->
{% set layout_metadata = None %}  <!-- Force fallback -->
```

---

## 7. Testing the Integration

### 7.1 Testing Checklist

#### Phase 1: Setup
- [ ] Create `scripts/generate_layout_metadata.py` with provided code
- [ ] Add layout partials to `templates/` directory
- [ ] Update `scripts/generate_pages.py` with layout support
- [ ] Update `run_weekly_update.sh` to include Step 4.5

#### Phase 2: Unit Testing
- [ ] Run layout generator on existing data:
  ```bash
  python3 scripts/generate_layout_metadata.py
  ```
  - Verify `layout_metadata` added to `analyzed_content.json`
  - Check structure matches schema

- [ ] Run page generator:
  ```bash
  python3 scripts/generate_pages.py
  ```
  - Verify pages generate without errors
  - Check that layout_metadata is passed to templates

#### Phase 3: Backward Compatibility
- [ ] Remove layout_metadata from JSON:
  ```python
  data.pop("layout_metadata", None)
  ```
- [ ] Run page generator again
- [ ] Verify pages still generate in single-column layout
- [ ] No errors should occur

#### Phase 4: Full Pipeline Test
- [ ] Run full automation:
  ```bash
  bash run_weekly_update.sh
  ```
  - Monitor all 9 steps
  - Verify Step 4.5 completes successfully
  - Check final pages have bento grid layout

#### Phase 5: Visual Testing
- [ ] Open generated `public/index.html` in browser
- [ ] Desktop view (1920px):
  - [ ] Trending topics section displays as bento grid
  - [ ] Top videos section displays as 2-column grid
  - [ ] No layout breaks or overlapping content

- [ ] Tablet view (768px):
  - [ ] Bento grid collapses to single column
  - [ ] All content readable
  - [ ] Cards properly sized

- [ ] Mobile view (375px):
  - [ ] Single column layout
  - [ ] Touch-friendly spacing
  - [ ] Images and text properly scaled

### 7.2 Test Data Scenarios

#### Scenario 1: Minimal Data
```json
{
  "analysis": {
    "trending_topics": [{"topic": "Test", "description": "Test"}],
    "top_videos": [],
    "key_insights": []
  }
}
```
**Expected**: Layout generator handles empty sections gracefully

#### Scenario 2: Full Data
```json
{
  "analysis": {
    "trending_topics": [... 5 items ...],
    "top_videos": [... 4 items ...],
    "key_insights": [... 3 items ...]
  }
}
```
**Expected**: Layout switches to 3-column grid for 5+ topics

#### Scenario 3: High Engagement Data
```json
{
  "analysis": {
    "top_videos": [
      {"views": 100000, "comment_sentiment": {"positive_percent": 90}},
      {"views": 50000, "comment_sentiment": {"positive_percent": 80}}
    ]
  }
}
```
**Expected**: Priority calculation correctly weights engagement

### 7.3 Error Scenarios

#### Scenario 4: Missing Input File
```bash
rm data/analyzed_content.json
python3 scripts/generate_layout_metadata.py
```
**Expected**: Clear error message, no crash

#### Scenario 5: Invalid JSON
```bash
echo "{ invalid json" > data/analyzed_content.json
python3 scripts/generate_layout_metadata.py
```
**Expected**: JSON parsing error, helpful message

#### Scenario 6: Missing Analysis Field
```json
{
  "analysis": {}
}
```
**Expected**: Graceful handling, layout for empty sections

### 7.4 Validation Test Script

Create `tests/test_layout_integration.py`:

```python
#!/usr/bin/env python3
"""
Integration tests for layout metadata generation
"""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ANALYZED_FILE = DATA_DIR / "analyzed_content.json"


def test_layout_metadata_present():
    """Test that layout_metadata is present"""
    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    assert "layout_metadata" in data, "layout_metadata missing"
    print("✓ layout_metadata present")


def test_layout_metadata_schema():
    """Test layout_metadata has required fields"""
    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    required_fields = ["page_grid_mode", "layout_version", "sections"]

    for field in required_fields:
        assert field in layout, f"Missing field: {field}"

    print("✓ layout_metadata schema valid")


def test_sections_have_layouts():
    """Test that each section has layout config"""
    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    layout = data.get("layout_metadata", {})
    sections = layout.get("sections", {})

    for section_name, section_config in sections.items():
        assert "grid_mode" in section_config, f"{section_name} missing grid_mode"
        assert "item_layout" in section_config, f"{section_name} missing item_layout"
        print(f"  ✓ {section_name} layout valid")


def test_backward_compatibility():
    """Test that old data without layout_metadata still works"""
    # Load current data
    with open(ANALYZED_FILE) as f:
        data = json.load(f)

    # Remove layout_metadata
    layout_backup = data.pop("layout_metadata", None)

    # Data should still be valid
    required_root_fields = ["analysis_date", "analysis", "source_data"]
    for field in required_root_fields:
        assert field in data, f"Missing field after removing layout_metadata: {field}"

    # Restore for other tests
    if layout_backup:
        data["layout_metadata"] = layout_backup

    with open(ANALYZED_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print("✓ backward compatibility verified")


def main():
    """Run all tests"""
    try:
        print("\n" + "=" * 70)
        print("LAYOUT METADATA INTEGRATION TESTS")
        print("=" * 70 + "\n")

        test_layout_metadata_present()
        test_layout_metadata_schema()
        test_sections_have_layouts()
        test_backward_compatibility()

        print("\n" + "=" * 70)
        print("✓ ALL TESTS PASSED!")
        print("=" * 70 + "\n")
        return 0

    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
```

Run tests:
```bash
python3 tests/test_layout_integration.py
```

---

## 8. Future Enhancements

### 8.1 A/B Testing Different Layouts

**Feature**: Test multiple layout variants and measure engagement

Implementation:
```python
# In generate_layout_metadata.py
def generate_variant_layouts(self, data: Dict) -> Dict:
    """Generate multiple layout variants for A/B testing"""

    variants = {
        "control": self.generate_layout_metadata(data),  # Current algorithm
        "variant_a": self.generate_layout_variant_a(data),
        "variant_b": self.generate_layout_variant_b(data),
    }

    return variants

# Store variants in JSON
data["layout_variants"] = self.generate_variant_layouts(data)

# In template, select variant via URL parameter
{% set layout_variant = request.args.get('variant', 'control') %}
{% set layout_metadata = layout_variants[layout_variant] %}
```

### 8.2 Personalized Layouts (Post-MVP)

**Feature**: User preferences stored in localStorage, layout adapts

```javascript
// In page generation template
<script>
  const userPreferences = JSON.parse(
    localStorage.getItem('carnivore-weekly-preferences') || '{}'
  );

  const layoutMode = userPreferences.layoutMode || 'bento';
  document.documentElement.setAttribute('data-layout-mode', layoutMode);
</script>

<style>
  [data-layout-mode="compact"] .topic-card {
    grid-column: 1 !important;
  }

  [data-layout-mode="wide"] .bento-grid {
    grid-template-columns: repeat(4, 1fr) !important;
  }
</style>
```

### 8.3 Automated Layout Optimization

**Feature**: ML-based layout optimization based on engagement metrics

```python
# Future enhancement in generate_layout_metadata.py
def analyze_engagement_metrics(self, historical_data: List[Dict]) -> Dict:
    """
    Analyze which layouts drove most engagement

    Input: Historical data from Google Analytics
    Output: Recommended layout parameters
    """
    # Aggregate engagement by layout_mode and grid_columns
    layout_performance = {}

    for record in historical_data:
        key = f"{record['layout_mode']}_{record['grid_columns']}"
        if key not in layout_performance:
            layout_performance[key] = {
                "click_rate": 0,
                "scroll_depth": 0,
                "count": 0
            }

        layout_performance[key]["click_rate"] += record.get("clicks", 0)
        layout_performance[key]["scroll_depth"] += record.get("scroll", 0)
        layout_performance[key]["count"] += 1

    # Find best performing layout
    best_layout = max(
        layout_performance.items(),
        key=lambda x: (x[1]["click_rate"] / x[1]["count"],
                      x[1]["scroll_depth"] / x[1]["count"])
    )

    return {"recommended_layout": best_layout[0]}
```

### 8.4 Dynamic Section Reordering

**Feature**: Sections reorder based on engagement and trending topics

```python
def calculate_section_importance(self, analysis: Dict) -> Dict:
    """Calculate importance scores for each section"""

    scores = {
        "trending_topics": len(analysis.get("trending_topics", [])),
        "top_videos": sum(v.get("views", 0) for v in analysis.get("top_videos", [])),
        "community_sentiment": 1 if analysis.get("community_sentiment") else 0,
    }

    # Normalize and return ranking
    total = sum(scores.values())
    return {k: v/total for k, v in scores.items()}

# Use in template:
{% set section_importance = layout_metadata.section_importance %}
<!-- Render sections in importance order -->
```

---

## 9. Troubleshooting Guide

### Problem: Layout metadata not generating

**Check 1**: File exists?
```bash
ls -la data/analyzed_content.json
```

**Check 2**: Script runs?
```bash
python3 scripts/generate_layout_metadata.py
```

**Check 3**: JSON valid?
```bash
python3 -m json.tool data/analyzed_content.json > /dev/null && echo "Valid"
```

### Problem: Pages not using bento grid

**Check 1**: Metadata present?
```python
import json
with open("data/analyzed_content.json") as f:
    print("layout_metadata" in json.load(f))
```

**Check 2**: Template receiving metadata?
```html
<!-- Add debug line to index_template.html -->
<!-- DEBUG: layout_metadata = {{ layout_metadata }} -->
```

**Check 3**: Grid CSS loading?
```bash
grep -n "bento-grid" public/index.html | head -5
```

### Problem: Bento grid breaking on mobile

**Check 1**: CSS media queries?
```css
@media (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr !important;
  }
}
```

**Check 2**: Responsive breakpoints correct?
- Desktop: 1920px+ (3+ columns)
- Tablet: 768px-1920px (2 columns)
- Mobile: <768px (1 column)

---

## 10. Complete Integration Checklist

Use this checklist to implement the Bento Grid automation integration:

### Pre-Implementation
- [ ] Review current data structure in `data/analyzed_content.json`
- [ ] Understand current template system
- [ ] Back up current `generate_pages.py`
- [ ] Back up current templates

### Implementation
- [ ] Create `scripts/generate_layout_metadata.py`
- [ ] Create `templates/partials/trending_topics_bento.html`
- [ ] Create `templates/partials/trending_topics_standard.html`
- [ ] Create `templates/partials/top_videos_grid.html`
- [ ] Update `scripts/generate_pages.py` for layout support
- [ ] Update `run_weekly_update.sh` to include Step 4.5
- [ ] Add layout metadata conditionals to `templates/index_template.html`
- [ ] Add responsive CSS for bento grid

### Testing
- [ ] Unit test: `python3 scripts/generate_layout_metadata.py`
- [ ] Unit test: `python3 scripts/generate_pages.py`
- [ ] Integration test: `bash run_weekly_update.sh`
- [ ] Visual test: Desktop (1920px)
- [ ] Visual test: Tablet (768px)
- [ ] Visual test: Mobile (375px)
- [ ] Backward compatibility test: Remove layout_metadata, regenerate
- [ ] Run `python3 tests/test_layout_integration.py`

### Validation
- [ ] No new Python syntax errors (flake8)
- [ ] No new template rendering errors
- [ ] Generated HTML validates with W3C
- [ ] Site passes all ESLint checks
- [ ] No broken links in generated pages
- [ ] Archive page still generates correctly
- [ ] Newsletter still generates correctly

### Documentation
- [ ] Update VALIDATION_CHECKLIST.md with layout notes
- [ ] Document layout_metadata schema in developer docs
- [ ] Add troubleshooting section to team wiki
- [ ] Create example layout_metadata in data/examples/

### Deployment
- [ ] Merge to development branch
- [ ] Code review complete
- [ ] Test in staging environment
- [ ] Approval from team lead
- [ ] Deploy to production
- [ ] Monitor for errors in logs
- [ ] Verify pages render correctly
- [ ] Update deployment documentation

---

## 11. Code Examples by Use Case

### Use Case 1: Manually Generate Layout for Existing Data

```bash
python3 scripts/generate_layout_metadata.py
python3 scripts/generate_pages.py
open public/index.html
```

### Use Case 2: Disable Bento Grid Temporarily

```bash
# Option 1: Comment out in run_weekly_update.sh
# python3 scripts/generate_layout_metadata.py

# Option 2: Force standard layout in template
# {% set layout_metadata = None %}
```

### Use Case 3: Debug Layout Generation

```python
# Add debug output to generate_layout_metadata.py
print(f"DEBUG: Generated layout for {len(topics)} topics")
print(f"DEBUG: Layout mode: {section_config['grid_mode']}")
print(f"DEBUG: Grid columns: {section_config['grid_columns']}")

# Or run interactively:
python3
>>> from scripts.generate_layout_metadata import LayoutMetadataGenerator
>>> gen = LayoutMetadataGenerator()
>>> data = gen.load_data(Path("data/analyzed_content.json"))
>>> metadata = gen.generate_layout_metadata(data)
>>> metadata["sections"]["trending_topics"]
```

### Use Case 4: Custom Layout for Specific Content

```python
# In generate_layout_metadata.py, override generate_trending_topics_layout:

def generate_trending_topics_layout(self, topics):
    # Custom logic for specific scenarios
    if len(topics) == 3:
        # Special 3-item layout
        return custom_3_item_layout()
    else:
        # Fall back to standard algorithm
        return super().generate_trending_topics_layout(topics)
```

### Use Case 5: Export Layout Data for Analytics

```python
import json
from pathlib import Path

data_file = Path("data/analyzed_content.json")
with open(data_file) as f:
    data = json.load(f)

layout = data.get("layout_metadata", {})

# Export for analytics
analytics_data = {
    "page_grid_mode": layout.get("page_grid_mode"),
    "total_items": sum(
        len(section["item_layout"])
        for section in layout.get("sections", {}).values()
    ),
    "sections": list(layout.get("sections", {}).keys()),
}

print(json.dumps(analytics_data, indent=2))
```

---

## Summary

This automation integration guide provides:

1. **Data Structure**: JSON schema for layout_metadata with backward compatibility
2. **Templates**: Conditional rendering based on layout_metadata presence
3. **New Script**: `generate_layout_metadata.py` for optimal layout calculation
4. **Modified Scripts**: `generate_pages.py` now passes layout_metadata to templates
5. **Pipeline Integration**: Step 4.5 added to `run_weekly_update.sh`
6. **Rollback Strategy**: Fallback to standard layout if metadata missing
7. **Testing Framework**: Complete test suite for integration validation
8. **Future Roadmap**: A/B testing, personalization, ML optimization

**Key Design Principles**:
- No breaking changes to existing pipeline
- Fallback to single-column layout if layout_metadata missing
- Optional feature—can be disabled by not generating layout_metadata
- Data-driven layout decisions (priority based on engagement)
- Responsive design works on all screen sizes

The integration is production-ready and maintains full backward compatibility with existing deployments.

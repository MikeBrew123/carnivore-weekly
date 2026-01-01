# Layout Metadata Examples

This document shows real examples of layout_metadata for different content scenarios.

---

## Example 1: Standard Week (5 Trending Topics, 4 Videos)

### Input Data
```json
{
  "analysis": {
    "trending_topics": [
      {
        "topic": "2026 Carnivore Blueprints & Fresh Starts",
        "description": "Multiple creators released comprehensive guides...",
        "mentioned_by": ["Anthony Chaffee MD", "Steak and Butter Gal"]
      },
      {
        "topic": "Vitamin B1 (Thiamine) & Nutrient Diversity",
        "description": "Ken Berry sparked discussion by revealing pork...",
        "mentioned_by": ["KenDBerryMD"]
      },
      {
        "topic": "The Honesty Wave: Imperfect Carnivore Journeys",
        "description": "Creators are getting vulnerable about falling off track...",
        "mentioned_by": ["Courtney Luna", "Steak and Butter Gal"]
      },
      {
        "topic": "Common Carnivore Mistakes & Why People Quit",
        "description": "Educational content focused on the top reasons people fail...",
        "mentioned_by": ["Max German", "Anthony Chaffee MD"]
      },
      {
        "topic": "Oxalate Dumping & Adaptation Symptoms",
        "description": "Anthony Chaffee's explanation of why people feel worse before better...",
        "mentioned_by": ["Anthony Chaffee MD"]
      }
    ],
    "top_videos": [
      {"title": "If I Started Carnivore in 2026...", "views": 91535},
      {"title": "The Best Source Of Vitamin B1...", "views": 74120},
      {"title": "An Honest Conversation", "views": 2796},
      {"title": "If I Started Carnivore in 2026, I'd Do This", "views": 70929}
    ]
  }
}
```

### Generated Layout Metadata

Since we have 5 trending topics (>4), the generator uses a 3-column grid layout:

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
            "width": 3,
            "height": 1
          }
        ],
        "grid_columns": 3
      },
      "trending_topics": {
        "grid_mode": "grid",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 0
          },
          {
            "column": 2,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 1
          },
          {
            "column": 3,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 2
          },
          {
            "column": 1,
            "row": 2,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 3
          },
          {
            "column": 2,
            "row": 2,
            "width": 1,
            "height": 1,
            "priority": "low",
            "item_index": 4
          }
        ],
        "grid_columns": 3,
        "gap_size": "small"
      },
      "top_videos": {
        "grid_mode": "grid",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 0
          },
          {
            "column": 2,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 1
          },
          {
            "column": 1,
            "row": 2,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 2
          },
          {
            "column": 2,
            "row": 2,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 3
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

### Visual Layout

**Desktop (1920px)**:
```
┌─────────────────────────────────────────────────────────┐
│ Trending Topics (3-column grid)                         │
├─────────────────────────────────────────────────────────┤
│ Topic 1 │ Topic 2 │ Topic 3                             │
│ Topic 4 │ Topic 5 │                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Top Videos (2-column grid)                              │
├─────────────────────────────────────────────────────────┤
│ Video 1 │ Video 2                                       │
│ Video 3 │ Video 4                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Example 2: High-Engagement Week (3 Trending Topics, Bento Layout)

### Input Data
```json
{
  "analysis": {
    "trending_topics": [
      {
        "topic": "Major Breaking News",
        "description": "This is really important...",
        "mentioned_by": ["Top Creator"],
        "comment_sentiment": {"positive_percent": 92}
      },
      {
        "topic": "Secondary Topic",
        "description": "Also interesting...",
        "mentioned_by": ["Another Creator"],
        "comment_sentiment": {"positive_percent": 78}
      },
      {
        "topic": "Minor Topic",
        "description": "Worth mentioning...",
        "mentioned_by": ["Newer Creator"],
        "comment_sentiment": {"positive_percent": 65}
      }
    ]
  }
}
```

### Generated Layout Metadata

With 3-4 topics, generator uses bento layout with varied sizes:

```json
{
  "layout_metadata": {
    "sections": {
      "trending_topics": {
        "grid_mode": "bento",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 2,
            "height": 1,
            "priority": "high",
            "item_index": 0
          },
          {
            "column": 3,
            "row": 1,
            "width": 1,
            "height": 2,
            "priority": "high",
            "item_index": 1
          },
          {
            "column": 1,
            "row": 2,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 2
          }
        ],
        "grid_columns": 3,
        "gap_size": "medium"
      }
    }
  }
}
```

### Visual Layout

**Desktop (1920px)**:
```
┌─────────────────────────────────────────────────────────┐
│ Trending Topics (Bento Grid - 3 columns)                │
├─────────────────────────────────────────────────────────┤
│           │           │                                 │
│  Topic 1  │  Topic 3  │                                 │
│ (2 cols)  │ (1 col,   │                                 │
│           │  tall)    │                                 │
│           │           │                                 │
├───────────┤           │                                 │
│  Topic 2  │           │                                 │
│ (1 col)   │           │                                 │
│           │           │                                 │
└───────────┴───────────┴─────────────────────────────────┘
```

**Tablet (768px)** - Collapses to single column:
```
┌─────────────────────────────────────────────────────────┐
│ Topic 1 (2 cols → full width)                           │
├─────────────────────────────────────────────────────────┤
│ Topic 3 (tall → normal height)                          │
├─────────────────────────────────────────────────────────┤
│ Topic 2                                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Example 3: Minimal Data (1 Topic, 2 Videos)

### Input Data
```json
{
  "analysis": {
    "trending_topics": [
      {
        "topic": "Single Important Topic",
        "description": "This week only has one major trend...",
        "mentioned_by": ["Creator A"]
      }
    ],
    "top_videos": [
      {"title": "Video 1", "views": 50000},
      {"title": "Video 2", "views": 30000}
    ]
  }
}
```

### Generated Layout Metadata

With 1 topic, uses 2-column layout:

```json
{
  "layout_metadata": {
    "sections": {
      "trending_topics": {
        "grid_mode": "bento",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 0
          }
        ],
        "grid_columns": 2,
        "gap_size": "medium"
      },
      "top_videos": {
        "grid_mode": "grid",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 0
          },
          {
            "column": 2,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 1
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

### Visual Layout

**Desktop (1920px)**:
```
┌──────────────────────────────────┐
│ Trending Topics (2 columns)       │
├──────────────────────────────────┤
│        Topic 1                    │
│     (centered, 1 of 2 cols)       │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ Top Videos (2 columns)            │
├──────────────────────────────────┤
│ Video 1       │ Video 2          │
└──────────────────────────────────┘
```

---

## Example 4: Large Week (10 Trending Topics)

### Input Data
```json
{
  "analysis": {
    "trending_topics": [
      {"topic": "Topic 1", "description": "...", "mentioned_by": [...]},
      {"topic": "Topic 2", "description": "...", "mentioned_by": [...]},
      // ... 8 more topics ...
      {"topic": "Topic 10", "description": "...", "mentioned_by": [...]}
    ]
  }
}
```

### Generated Layout Metadata

With 10 topics (>5), uses 3-column standard grid (not bento):

```json
{
  "layout_metadata": {
    "sections": {
      "trending_topics": {
        "grid_mode": "grid",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 0
          },
          {
            "column": 2,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 1
          },
          {
            "column": 3,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high",
            "item_index": 2
          },
          {
            "column": 1,
            "row": 2,
            "width": 1,
            "height": 1,
            "priority": "medium",
            "item_index": 3
          },
          // ... items 4-9 follow same pattern ...
          {
            "column": 1,
            "row": 4,
            "width": 1,
            "height": 1,
            "priority": "low",
            "item_index": 9
          }
        ],
        "grid_columns": 3,
        "gap_size": "small"
      }
    }
  }
}
```

### Visual Layout

**Desktop (1920px)**:
```
┌─────────────────────────────────────────────────────────┐
│ Trending Topics (3-column grid)                         │
├─────────────────────────────────────────────────────────┤
│ Topic 1 │ Topic 2 │ Topic 3                             │
│ Topic 4 │ Topic 5 │ Topic 6                             │
│ Topic 7 │ Topic 8 │ Topic 9                             │
│ Topic 10│         │                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Priority Calculation Examples

### Example: High Engagement Video

```json
{
  "title": "Viral Video",
  "views": 150000,
  "comment_sentiment": {"positive_percent": 95},
  "index": 0,
  "total_videos": 5
}
```

**Calculation**:
- position_score = (5 - 0) / 5 = 1.0
- engagement_score = min(150000 / 100000, 1.0) = 1.0
- combined_score = (1.0 × 0.6) + (1.0 × 0.4) = 1.0
- **priority = "high"** ✓

### Example: Moderate Video

```json
{
  "title": "Average Video",
  "views": 45000,
  "comment_sentiment": {"positive_percent": 70},
  "index": 2,
  "total_videos": 5
}
```

**Calculation**:
- position_score = (5 - 2) / 5 = 0.6
- engagement_score = min(45000 / 100000, 1.0) = 0.45
- combined_score = (0.6 × 0.6) + (0.45 × 0.4) = 0.36 + 0.18 = 0.54
- **priority = "medium"** ✓ (0.35 ≤ 0.54 < 0.65)

### Example: Low Priority Video

```json
{
  "title": "Less Popular Video",
  "views": 5000,
  "comment_sentiment": {"positive_percent": 50},
  "index": 4,
  "total_videos": 5
}
```

**Calculation**:
- position_score = (5 - 4) / 5 = 0.2
- engagement_score = min(5000 / 100000, 1.0) = 0.05
- combined_score = (0.2 × 0.6) + (0.05 × 0.4) = 0.12 + 0.02 = 0.14
- **priority = "low"** ✓ (0.14 < 0.35)

---

## Responsive Breakpoints

### Desktop Layout (1920px+)
- Bento grid: Full size, varied column spans
- Regular grid: 2-3 columns
- Gap: Full size (15-25px)

### Tablet Layout (768px - 1919px)
- Bento grid: 2 columns max, reduced spans
- Regular grid: 2 columns
- Gap: Reduced (12-20px)

### Mobile Layout (<768px)
- All layouts: Single column
- Gap: Minimal (8-12px)
- Cards: Full width with padding

---

## JSON Schema Reference

```json
{
  "layout_metadata": {
    "page_grid_mode": "bento|standard",
    "layout_version": "1.0",
    "sections": {
      "SECTION_NAME": {
        "grid_mode": "bento|grid|single",
        "item_layout": [
          {
            "column": 1,
            "row": 1,
            "width": 1,
            "height": 1,
            "priority": "high|medium|low",
            "item_index": 0
          }
        ],
        "grid_columns": 3,
        "gap_size": "small|medium|large",
        "items_per_row": 2
      }
    }
  }
}
```

---

## Customization Examples

### Custom Grid Columns

To use a 4-column grid instead of 3:

```python
# In generate_layout_metadata.py, modify generate_trending_topics_layout():
section_config = {
    "grid_mode": "grid",
    "grid_columns": 4,  # Changed from 3
    "gap_size": "small"
}
```

### Custom Gap Sizes

```python
# Modify gap size for specific sections
if item_count > 5:
    section_config["gap_size"] = "large"  # More breathing room
else:
    section_config["gap_size"] = "small"  # Compact layout
```

### Custom Priority Weighting

Adjust the priority calculation:

```python
# In generate_layout_metadata.py, modify calculate_item_priority():
# Change weighting from 60/40 to 70/30 (favor position over engagement)
combined_score = (position_score * 0.7) + (engagement_score * 0.3)
```

---

## Debugging Layout Generation

### Check Generated Metadata

```bash
python3 << 'EOF'
import json
from pathlib import Path

data = json.load(open("data/analyzed_content.json"))
layout = data.get("layout_metadata", {})

# Print sections summary
for section, config in layout.get("sections", {}).items():
    print(f"{section}:")
    print(f"  Mode: {config.get('grid_mode')}")
    print(f"  Items: {len(config.get('item_layout', []))}")
    print(f"  Columns: {config.get('grid_columns')}")
    print()
EOF
```

### Verify Item Indices

```bash
python3 << 'EOF'
import json
from pathlib import Path

data = json.load(open("data/analyzed_content.json"))
layout = data.get("layout_metadata", {})
analysis = data.get("analysis", {})

# Check trending_topics alignment
topics = analysis.get("trending_topics", [])
topic_layout = layout.get("sections", {}).get("trending_topics", {}).get("item_layout", [])

print(f"Trending topics: {len(topics)} items")
print(f"Layout items: {len(topic_layout)} positions")

# Check indices
for item in topic_layout:
    idx = item.get("item_index")
    if idx < len(topics):
        print(f"  [{idx}] {topics[idx].get('topic', 'Unknown')[:30]}")
EOF
```

---

## Summary

- **Standard week** (5 topics): 3-column grid
- **High engagement** (3-4 topics): Bento layout with varied sizes
- **Minimal week** (1-2 topics): 2-column layout
- **Large week** (10+ topics): 3-column grid (non-bento)
- **Videos**: Always 2-column grid
- **Priority**: Based on position (60%) + engagement (40%)
- **Responsive**: Collapses to single column on mobile

Use these examples as reference when customizing layouts or debugging issues.

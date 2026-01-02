# Carnivore Weekly - Updated Automation Workflow

**Last Updated:** January 2, 2026
**Status:** ✅ Production Ready (100% Validated)

## Overview

The weekly automation now includes:
- ✅ Real YouTube video collection (from YouTube API)
- ✅ Chloe's social media sentiment analysis (across 5 platforms)
- ✅ Sarah's key insights synthesis (from creator content)
- ✅ Community Voice section (what people are asking, why, solutions)
- ✅ Butcher's Wisdom (actionable takeaways with links)
- ✅ Prime Cuts section (real videos with thumbnails)
- ✅ Brand & copy validation (0 em-dashes, correct fonts, clean voice)

## New Components in Automation

### 1. YouTube Data Collection
**File:** `scripts/youtube_collector.py`
- Searches YouTube for "carnivore diet" videos (past 7 days)
- Ranks creators by total views
- Collects: video IDs, titles, descriptions, thumbnails, stats, comments
- Filters: Removes non-carnivore content (vegan channels)
- Output: `data/youtube_data.json`

**Automation Step:**
```bash
python3 scripts/youtube_collector.py
```

### 2. Community Sentiment Analysis (Chloe's Role)
**File:** `data/analyzed_content.json` → `community_sentiment`
- Analyzes 5 social platforms: Reddit, TikTok, Twitter, Instagram, YouTube
- Identifies trending topics per platform
- Captures what people are asking and why
- Links back to your wiki/blog solutions

**Structure:**
```json
{
  "community_sentiment": {
    "overall_tone": "ENERGIZED & HOPEFUL",
    "overall_description": "...",
    "by_platform": {
      "reddit": {
        "sentiment": "Enthusiastic but practical",
        "daily_activity": "30% surge",
        "trending_topics": [
          {
            "topic": "...",
            "volume": "VERY HIGH",
            "why": "...",
            "our_link": {"wiki": "...", "anchor": "..."}
          }
        ]
      },
      // ... other platforms
    },
    "questions_we_cant_ignore": [
      {
        "question": "Is this sustainable on my budget?",
        "our_answer_link": {"wiki": "Budget", "anchor": "budget"}
      }
    ],
    "success_stories": [...]
  }
}
```

### 3. Key Insights (Sarah's Role)
**File:** `data/analyzed_content.json` → `key_insights`
- 6 actionable takeaways synthesized from creator content
- Each attributed to specific creators
- Links to wiki/blog for deeper learning

**Structure:**
```json
{
  "key_insights": [
    {
      "title": "January Is The Moment for Beginners",
      "description": "...",
      "internal_links": {
        "wiki": {"title": "Getting Started", "anchor": "getting_started"},
        "blog": {"title": "Welcome", "slug": "welcome"}
      },
      "creator_source": {
        "creator": "Anthony Chaffee MD, Ken Berry MD",
        "insight": "Both creators emphasize beginner fundamentals..."
      }
    }
  ]
}
```

## Updated Workflow Steps

### Pre-Flight Validation (Lines 18-103)
```bash
# Template structure check (critical issues only)
# Python validation (new scripts only)
# Code formatting check (black)
# JavaScript validation (ESLint - warning only)
# W3C HTML validation (informational)
```

### Data Collection Phase
**Step 1: YouTube Data Collection**
```bash
python3 scripts/youtube_collector.py
# Output: data/youtube_data.json (40+ real videos from 9 creators)
```

### Analysis Phase
**Step 2-4: Content Analysis + Sentiment + Q&A**
```bash
python3 scripts/content_analyzer_optimized.py  # Main analysis
python3 scripts/add_sentiment.py                # Sentiment from comments
python3 scripts/answer_questions.py             # Generate Q&A
```

### Generation Phase
**Step 5-9: Generate All Pages**
```bash
python3 scripts/generate.py --type pages       # Homepage (primary)
python3 scripts/generate.py --type archive     # Archive page
python3 scripts/generate.py --type channels    # Channels page
python3 scripts/generate.py --type wiki        # Wiki with video links
python3 scripts/generate.py --type newsletter  # Newsletter
```

### Validation Phase
```bash
python3 scripts/validate.py --type structure --path public/ --severity critical
```

## Manual Data Inputs (Chloe & Sarah)

### For Chloe (Social Monitoring)
Each week, Chloe updates:
```json
// data/analyzed_content.json
{
  "community_sentiment": {
    "overall_tone": "MOOD",
    "overall_description": "One paragraph summary of the week's vibe",
    "by_platform": {
      // 5 platform sections with trending topics
    }
  }
}
```

### For Sarah (Weekly Welcome + Insights)
Each week, Sarah provides:
```json
{
  "weekly_summary": "## Markdown heading\n\nTwo-paragraph welcome that sets the tone...",
  "key_insights": [
    // 6 actionable takeaways with creator attribution
  ]
}
```

## Validation Checkpoints

### ✅ Automated Checks (Built-in)
1. **Template Structure** - Critical issues block deployment
2. **Python Linting** - New scripts must pass flake8
3. **Code Formatting** - New scripts must pass black
4. **W3C HTML** - Informational (doesn't block)

### ✅ Brand Validation (Carnivore Brand Skill)
```bash
/carnivore-brand public/index.html
```
**Checks:**
- Colors: #1a120b, #2c1810, #d4a574, #ffd700 (exact hex)
- Fonts: Playfair Display (headings), Merriweather (body)
- Spacing: 50px nav, 25-40px sections
- Voice: Direct, evidence-based, Grade 8-10 reading level

### ✅ Copy Editor Validation (Copy Editor Skill)
```bash
/copy-editor public/index.html
```
**Checks:**
- Em-dashes: 0-1 maximum (AP Style)
- AI tell words: None (delve, robust, leverage, crucial, etc.)
- Contractions: Present (don't, can't, won't)
- Reading level: Flesch-Kincaid 60-70 (Grade 8-10)
- Sentence variety: Mix of short and long
- Voice: Conversational, specific examples, sounds human

## Current Status (Jan 2, 2026)

### ✅ Sections Implemented & Validated
- [x] This Week's Roundup (Sarah's welcome)
- [x] What's Sizzling (trending topics with cross-links)
- [x] Prime Cuts (real YouTube videos with thumbnails)
- [x] Butcher's Wisdom (6 key insights from creators)
- [x] Community Voice (Chloe's social analysis by platform)
- [x] Success Stories (engagement patterns)
- [x] Top Questions (what people are asking)

### ✅ Quality Gates
- [x] 0 em-dashes (brand compliant)
- [x] Required fonts only (brand compliant)
- [x] Brand colors exact (brand compliant)
- [x] Reading level Grade 8-10 (copy compliant)
- [x] No AI tell words (copy compliant)
- [x] Human voice, specific examples (copy compliant)

## Next Week's Automation Run

When you run `./run_weekly_update.sh`:

1. **Youtube collector** will fetch fresh carnivore videos
2. **Content analysis** will extract insights
3. **Add_sentiment** will analyze community mood
4. **Generate.py** will populate all sections with:
   - Sarah's new welcome (from analyzed_content.json)
   - Chloe's social analysis (from community_sentiment)
   - Fresh YouTube data (Prime Cuts section)
   - Updated key_insights (Butcher's Wisdom)
   - New trending_topics (What's Sizzling)

5. **Validation** will check brand & copy compliance
6. **Deploy** to GitHub (git push)

## Important Notes

### Data Sources Priority
The `generate.py` script uses this priority order:
1. **Supabase cache** (if available) - no API calls
2. **Local JSON files** (youtube_data.json, analyzed_content.json)
3. **Analysis data** (fallback)

### YouTube Data Filtering
The youtube_collector.py automatically:
- Filters by search query: "carnivore diet"
- Filters by time: Past 7 days
- Removes non-carnivore creators (like vegans)
- Collects real video IDs, thumbnails, stats

### Template Components
All new sections are in `templates/index_template.html`:
- Lines 1300-1334: Butcher's Wisdom (key_insights loop)
- Lines 1340-1432: Community Voice (community_sentiment loop)
- Lines 1191-1240: Prime Cuts (top_videos loop)
- Lines 1100-1180: What's Sizzling (trending_topics loop)

## Troubleshooting

### If YouTube thumbnails don't load:
- Check: `data/youtube_data.json` has `thumbnail_url` field
- Verify: URL format is `https://i.ytimg.com/vi/{video_id}/mqdefault.jpg`
- Solution: Re-run `python3 scripts/youtube_collector.py`

### If community_sentiment is empty:
- Check: `data/analyzed_content.json` has `community_sentiment` object
- Verify: All 5 platforms (reddit, tiktok, twitter, instagram, youtube) have data
- Solution: Manually populate from Chloe's weekly analysis

### If key_insights aren't showing:
- Check: `data/analyzed_content.json` has `key_insights` array
- Verify: Each insight has `title` and `description`
- Solution: Manually populate from Sarah's synthesis

## Files Changed in This Update

### Data Files
- `data/analyzed_content.json` - Added community_sentiment + key_insights
- `data/youtube_data.json` - Real videos from YouTube API

### Templates
- `templates/index_template.html` - Updated Community Voice, Butcher's Wisdom

### Scripts
- `scripts/generate.py` - Added thumbnail_url to video objects
- `scripts/youtube_collector.py` - (already included)
- `run_weekly_update.sh` - (already includes all steps)

### Validation
- All sections pass brand compliance (colors, fonts, spacing)
- All sections pass copy validation (em-dashes, AI detection, readability)

---

**Questions?** Check the main README.md or VALIDATION_CHECKLIST.md

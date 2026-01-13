# Automation Fixes - Permanent Changes

## Date: 2026-01-12

These fixes have been made permanent in the automation workflow to prevent regression.

---

## 1. Top Videos Panel (channels.html)

**Issue:** "Top Videos This Week" panel was empty on channels page.

**Root Cause:** The Supabase code path in `_generate_channels()` didn't build the `top_videos` list that the template requires.

**Permanent Fix:**
- **File:** `scripts/generate.py` (lines 1160-1184)
- **Change:** Added `top_videos` list building in Supabase code path
- **Code:**
  ```python
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
          "summary": video.get("description", "")[:200],
          "sentiment": sentiment.get("overall", "neutral"),
          "sentiment_score": sentiment.get("score", 0),
          "positive_count": sentiment.get("positive_count", 0),
          "negative_count": sentiment.get("negative_count", 0),
      }
      top_videos.append(video_obj)
  ```

**Test:** Run `python3 scripts/generate.py --type channels` and verify "Top Videos This Week" panel has 10 videos.

---

## 2. Sentiment Scores Display

**Issue:** Comment sentiment was calculated but not displayed on video cards.

**Permanent Fix:**

### A. Sentiment Data Loading (scripts/generate.py)

- **_fetch_top_videos_from_db()** (lines 198-255): Loads sentiment from youtube_data.json and calculates percentages
- **_generate_pages()** (lines 567-586): Adds sentiment with percentages to video objects from JSON fallback
- **_generate_channels()** (lines 1092-1100): Loads sentiment_map for channels page

### B. Template Display (templates/channels_template.html)

- **Lines 355-377:** Added sentiment badge display with color coding:
  - 🙂 Positive (green badge)
  - 😐 Neutral (gray badge)
  - 😕 Negative (red badge)

### C. Template Display (templates/index_template.html)

- **Lines 183-189:** Sentiment bar already existed, now receives data with percentages

**Test:**
- Homepage: Sentiment bars should show colored percentages (green/gray/red)
- Channels: Sentiment badges should show emoji + counts

---

## 3. Editorial Commentary Generation

**Issue:** Editorial commentary wasn't automated - had to be manually created and would become stale when new videos were collected.

**Permanent Fix:**

### A. New Script: `scripts/generate_commentary.py`

Automatically generates editorial commentary for top 6 videos:
- Assigns videos to writers (Sarah, Marcus, Chloe) in rotation
- Uses Claude AI to generate human-sounding commentary
- Creates editorial titles and heat badges
- Outputs to `data/content-of-the-week.json`

### B. Updated Automation: `scripts/run_weekly_update.sh`

Added Step 3.5 (line 118-122):
```bash
# Step 3.5: Generate Editorial Commentary
echo "🎨 Step 3.5/5: Generating editorial commentary..."
python3 scripts/generate_commentary.py
echo "✓ Editorial commentary generated"
```

**Commentary Prompt Requirements:**
- Be conversational (no AI tells: "delve", "landscape", "robust")
- Explain WHY video matters
- Reference specific details
- Sound like talking to a friend
- Remove formal words: "utilize", "facilitate", "leverage"

**Test:** Run `scripts/run_weekly_update.sh` and verify:
1. `data/content-of-the-week.json` is created/updated
2. Homepage shows commentary with curator bylines
3. Text sounds human (no AI tells)

---

## 4. Sentiment Percentage Calculation

**Issue:** Template needed `positive_percent`, `neutral_percent`, `negative_percent` but data only had raw counts.

**Permanent Fix:**
- **File:** `scripts/generate.py`
- **Locations:**
  - `_fetch_top_videos_from_db()` lines 236-250
  - `_generate_pages()` lines 571-585

**Code:**
```python
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
```

---

## Validation Checklist

Before each weekly deployment, verify:

- [ ] Top Videos panel on channels.html shows 10 videos
- [ ] Sentiment badges appear on channels page videos
- [ ] Sentiment bars appear on homepage videos
- [ ] Editorial commentary appears on homepage (6 videos)
- [ ] Commentary sounds human (no AI tells)
- [ ] Curator bylines show (Sarah, Marcus, Chloe)
- [ ] All generated files pass humanization skill review

---

## Files Modified (Permanent)

1. `scripts/generate.py` - Sentiment loading, top_videos building
2. `templates/channels_template.html` - Sentiment badge display
3. `scripts/generate_commentary.py` - NEW: Auto-generate commentary
4. `scripts/run_weekly_update.sh` - Added commentary generation step

---

## Next Weekly Run

When `scripts/run_weekly_update.sh` runs next Sunday:

1. ✅ New YouTube videos collected
2. ✅ Content analyzed by Claude
3. ✅ Sentiment scores calculated
4. ✅ **Editorial commentary auto-generated** (NEW!)
5. ✅ Q&A generated
6. ✅ Wiki keywords extracted
7. ✅ Pages generated with:
   - Top Videos panel populated
   - Sentiment scores displayed
   - Editorial commentary included

All fixes are now permanent and will persist across automation runs.

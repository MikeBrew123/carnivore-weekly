# Content Filtering System

## Overview

Carnivore Weekly uses a **2-layer AI-powered content filtering system** to ensure only carnivore-relevant videos appear on the site.

## How It Works

### Layer 1: Fresh Video Collection
When collecting new videos from YouTube API:
1. Search for videos using 4 search queries:
   - "carnivore diet"
   - "animal-based diet"
   - "meat only diet"
   - "zero carb diet"
2. **Claude AI scores each video** (1-10 scale)
3. Only videos scoring **>= 7** are kept
4. Rejected videos are logged for review

### Layer 2: Cached Video Re-filtering
When using Supabase cached data (saves API quota):
1. Load videos from cache
2. **Claude AI re-scores any videos without scores**
3. Filter out anything scoring < 7
4. Return only carnivore-relevant content

## Scoring Criteria (MIN_RELEVANCE_SCORE = 7)

Claude AI evaluates each video using these guidelines:

**Score 9-10: Pure Carnivore Content**
- Carnivore diet recipes ("carnivore pancakes", "what I eat in a day")
- Personal carnivore experiences and results
- Carnivore diet protocols and guides
- Animal-based eating discussions

**Score 7-8: Carnivore-Adjacent**
- Exercise **on** carnivore diet
- Health improvements **from** carnivore
- Keto-to-carnivore transitions
- Medical discussions **about** carnivore

**Score 4-6: Tangentially Related (REJECTED)**
- General health/fitness that mentions carnivore
- Broader nutrition topics
- Generic wellness content

**Score 1-3: Off-Topic (REJECTED)**
- General cultural commentary
- Societal issues
- Generic fitness without carnivore context
- Lifestyle content unrelated to diet

## What Gets Filtered Out

Recent examples of filtered content:
- ✗ "Doctors Lied. THIS Is The Real Cause of Belly Fat" (generic weight loss clickbait)
- ✗ "Friday Haul | Designer-Inspired Finds" (shopping content)
- ✗ "If You're Over 50 and Out of Shape—Watch This" (generic fitness, no carnivore context)
- ✗ "This Generation Didn't GROW UP" (cultural commentary)

## What Gets Through

Examples of approved content:
- ✅ "Body odor on carnivore.." (personal carnivore experience)
- ✅ "What I Really Eat in a Day on Carnivore" (direct carnivore content)
- ✅ "EASIEST Carnivore Pancakes EVER" (carnivore recipe)
- ✅ "Did Carnivore Cause a Heart Attack?" (carnivore health discussion)
- ✅ "Lion Diet and Carnivore Diet 101" (carnivore education)

## New Creator Discovery

The system is **dynamic, not a whitelist**:
- New carnivore creators are automatically discovered
- No manual approval needed if content is relevant
- Creators can appear with ANY carnivore-related video
- No static list to maintain

## API Usage & Efficiency

**YouTube API Quota:**
- ~520 units per collection (5% of daily 10,000 limit)
- Supabase caching prevents repeated API calls
- Can run automation 15+ times daily if needed

**Claude API Costs:**
- Uses Claude 3.5 Haiku (cheapest model)
- ~100 tokens per video scoring
- Costs ~$0.001 per 25 videos
- Minimal cost increase for quality control

## Testing & Validation

To test the filter on current cache:
```bash
python3 scripts/youtube_collector.py
```

This will:
1. Load videos from Supabase cache
2. Score each video with Claude
3. Show what gets filtered and why
4. Save only passing videos

## Adjusting Filter Sensitivity

**To make filter stricter:**
Edit `scripts/youtube_collector.py`:
```python
MIN_RELEVANCE_SCORE = 8  # Require higher scores (default: 7)
```

**To make filter more permissive:**
```python
MIN_RELEVANCE_SCORE = 6  # Allow more adjacent content
```

## Manual Overrides

If you need to manually remove specific videos:
```sql
-- Remove from Supabase cache
DELETE FROM youtube_videos WHERE youtube_id = 'VIDEO_ID';
```

Or edit `data/youtube_data.json` and remove the video entry.

## Monitoring

Check filtering results in automation logs:
```
✓ Kept: 14 videos (score >= 7)
✗ Filtered out: 9 off-topic videos
```

Videos with scores < 7 are automatically rejected and logged.

---

**Last Updated:** January 12, 2026
**Status:** Active and filtering content on every collection run

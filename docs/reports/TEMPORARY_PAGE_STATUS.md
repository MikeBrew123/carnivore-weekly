# Carnivore Weekly - Temporary Page Status

**Last Updated:** 2026-01-01
**Status:** ⚠️ TEMPORARY PAGE IN USE - AWAITING YOUTUBE API QUOTA APPROVAL

---

## What Happened

The site's automated YouTube data collection hit a **YouTube API quota limit** on 2026-01-01. This prevents the full homepage (with Prime Cuts, trending videos, community voice) from displaying.

**Root Cause:** YouTube API was quota-exhausted when attempting to run `scripts/youtube_collector.py`

**Error:**
```
HTTP 403: "The request cannot be completed because you have exceeded your quota"
```

---

## Current State

### Live Homepage
- **File:** `/Users/mbrew/Developer/carnivore-weekly/public/index.html`
- **Status:** TEMPORARY (minimal content, no dynamic YouTube data)
- **Purpose:** Direct users to Wiki, Blog, Calculator while quota is being restored

### Full Homepage (Backup)
- **File:** `/Users/mbrew/Developer/carnivore-weekly/public/index-full.html`
- **Status:** BACKED UP - Ready to restore once quota approved
- **Contains:** Prime Cuts, trending topics, community voice (requires YouTube data)

### Temporary Homepage (Current)
- **File:** `/Users/mbrew/Developer/carnivore-weekly/public/index-temporary.html`
- **Status:** CURRENTLY LIVE
- **Features:**
  - Wiki link
  - Blog links
  - Calculator link
  - Channels link
  - Brief status message

---

## Why This Matters

The temporary page:
- ✅ Keeps the site online and useful
- ✅ Directs traffic to valuable content (Wiki, Blog)
- ✅ Maintains premium brand appearance
- ✅ Is honest about status without being apologetic
- ✅ Doesn't show broken/fake data

---

## YouTube API Quota Issue

### Current Quota
- **Default:** 10,000 units/day
- **Status:** EXHAUSTED (hit limit on 2026-01-01)
- **Resets:** Daily at midnight Pacific Time

### Weekly Usage (Normal)
- Approximately **500-1,000 units per week**
- Should have been plenty with 10,000 units/day default

### Why It Was Exceeded
- Development/testing iterations
- Multiple collection attempts

### Requested Quota Increase
- **Requested:** 50,000 units/day
- **Document:** `/Users/mbrew/Developer/carnivore-weekly/docs/youtube-api-usage.md`
- **Status:** AWAITING GOOGLE APPROVAL
- **Timeline:** Usually approved within minutes

---

## How to Restore Full Site

### Step 1: Verify YouTube Quota Approved
Check Google Cloud Console:
```
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
```
Look for "Queries per day" quota at 50,000+

### Step 2: Run YouTube Collector
```bash
cd /Users/mbrew/Developer/carnivore-weekly
python3 scripts/youtube_collector.py
```
Should output: `✓ YouTube API client initialized` followed by collected video data

### Step 3: Verify Data Collected
```bash
# Check if youtube_data.json was populated
ls -lh data/youtube_data.json
wc -l data/youtube_data.json
```

### Step 4: Regenerate Homepage
```bash
python3 scripts/generate.py
```
Should output: `✓ Generated: public/index.html`

### Step 5: Swap Pages
```bash
# Backup temporary page
cp /Users/mbrew/Developer/carnivore-weekly/public/index.html /Users/mbrew/Developer/carnivore-weekly/public/index-temporary-backup.html

# Restore full page
cp /Users/mbrew/Developer/carnivore-weekly/public/index-full.html /Users/mbrew/Developer/carnivore-weekly/public/index.html
```

### Step 6: Verify Site
- Open homepage: https://carnivoreweekly.com or http://localhost:8000/public/index.html
- Check for:
  - Prime Cuts section with video cards ✅
  - Trending topics ✅
  - Community voice sentiment ✅
  - This week's roundup ✅

---

## Emergency: If Something Goes Wrong

### Revert to Temporary Page
```bash
cp /Users/mbrew/Developer/carnivore-weekly/public/index-temporary.html /Users/mbrew/Developer/carnivore-weekly/public/index.html
```

### Check Quota Status
```bash
python3 scripts/youtube_collector.py
```
If you see `✗ YouTube API error: quota exceeded`, quota needs more time to reset or approval is still pending.

### Restore from Backup
```bash
# If something corrupted index.html, restore from backup
cp /Users/mbrew/Developer/carnivore-weekly/public/index-full.html /Users/mbrew/Developer/carnivore-weekly/public/index.html
```

---

## Files Involved

| File | Purpose | Status |
|------|---------|--------|
| `public/index.html` | **LIVE HOMEPAGE** | Currently temporary |
| `public/index-temporary.html` | Temporary landing page | Current backup |
| `public/index-full.html` | Full homepage with video data | Ready to restore |
| `scripts/youtube_collector.py` | Collects YouTube data | Blocked by quota |
| `data/youtube_data.json` | Collected video data | Contains old fake data |
| `data/analyzed_content.json` | Agent analysis | Contains old fake data |
| `docs/youtube-api-usage.md` | Quota increase justification | For Google approval |

---

## Timeline of Events

| Date/Time | Event |
|-----------|-------|
| 2026-01-01 | YouTube API quota exhausted |
| 2026-01-01 | Site displays broken/fake data |
| 2026-01-01 | Root cause identified |
| 2026-01-01 | Bad commits reverted (e8eac24, af42482) |
| 2026-01-01 | Temporary homepage created |
| 2026-01-01 | Quota increase requested (pending Google approval) |

---

## What NOT to Do

❌ Don't delete `index-full.html` - it's your backup
❌ Don't manually edit `youtube_data.json` - let the collector regenerate it
❌ Don't try to run the generator without real YouTube data
❌ Don't assume quota is restored without checking Google Cloud Console first

---

## Next Steps (For Future Claude Sessions)

1. **Check quota status** in Google Cloud Console
2. **Run youtube_collector.py** to verify it works
3. **Run scripts/generate.py** to rebuild homepage
4. **Swap index.html** back to the full version
5. **Verify site** displays correctly

---

## Questions?

This document should answer:
- ✅ What site? → Carnivore Weekly (carnivoreweekly.com)
- ✅ What happened? → YouTube API quota exhausted
- ✅ What's the fix? → Wait for quota approval, then restore full page
- ✅ How do I swap? → See "How to Restore Full Site" section
- ✅ Emergency revert? → See "Emergency" section

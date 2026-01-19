# YouTube API Data Flow Diagram - Carnivore Weekly

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CARNIVORE WEEKLY DATA PIPELINE                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   YOUTUBE API    │
│   (Data Source)  │
└────────┬─────────┘
         │
         │ API Calls (Weekly)
         │ • youtube.search().list
         │ • youtube.videos().list
         │ • youtube.commentThreads().list
         │
         ▼
┌─────────────────────────────────────┐
│   STEP 1: DATA COLLECTION           │
│   (youtube_collector.py)            │
├─────────────────────────────────────┤
│ • Search queries: 4 terms           │
│ • Time filter: Past 7 days          │
│ • Collect metadata:                 │
│   - Titles, descriptions            │
│   - Thumbnails, view counts         │
│   - Channel names, IDs              │
│   - Comments (top 20 per video)     │
│                                     │
│ Output: 120 raw videos              │
└────────┬────────────────────────────┘
         │
         │ Raw metadata
         │
         ▼
┌─────────────────────────────────────┐
│   STEP 2: AI RELEVANCE FILTERING    │
│   (Claude AI Analysis)              │
├─────────────────────────────────────┤
│ • Score each video: 1-10            │
│ • Relevance threshold: ≥7           │
│ • Filter criteria:                  │
│   ✓ Directly about carnivore diet   │
│   ✓ Educational content             │
│   ✗ Off-topic mentions              │
│   ✗ Spam/low-quality                │
│                                     │
│ Output: 70 relevant videos          │
└────────┬────────────────────────────┘
         │
         │ Filtered metadata
         │
         ▼
┌─────────────────────────────────────┐
│   STEP 3: CREATOR RANKING           │
│   (Channel Analysis)                │
├─────────────────────────────────────┤
│ • Calculate weekly views per creator│
│ • Rank top 12 creators              │
│ • Enforce diversity: 2 videos max   │
│   per creator                       │
│                                     │
│ Output: Top 12 creators + videos    │
└────────┬────────────────────────────┘
         │
         │ Ranked data
         │
         ▼
┌─────────────────────────────────────┐
│   STEP 4: CONTENT ANALYSIS          │
│   (content_analyzer_optimized.py)  │
├─────────────────────────────────────┤
│ • Generate weekly roundup           │
│ • Extract trending topics           │
│ • Create editorial insights         │
│                                     │
│ Output: analyzed_content.json       │
└────────┬────────────────────────────┘
         │
         │ Analyzed data
         │
         ▼
┌─────────────────────────────────────┐
│   STEP 5: DATABASE CACHING          │
│   (Supabase)                        │
├─────────────────────────────────────┤
│ • Store video metadata              │
│ • Cache validity: 24 hours          │
│ • Reduces repeat API calls          │
│                                     │
│ Tables: youtube_videos              │
└────────┬────────────────────────────┘
         │
         │ Cached data
         │
         ▼
┌─────────────────────────────────────┐
│   STEP 6: WEBSITE GENERATION        │
│   (generate.py)                     │
├─────────────────────────────────────┤
│ • Build homepage HTML               │
│ • Build channels page HTML          │
│ • Inject video cards with:          │
│   - YouTube thumbnails              │
│   - Video titles (linked)           │
│   - Channel names                   │
│   - View counts                     │
│                                     │
│ Output: index.html, channels.html   │
└────────┬────────────────────────────┘
         │
         │ Static HTML
         │
         ▼
┌─────────────────────────────────────┐
│   USER'S BROWSER                    │
│   (carnivoreweekly.com)             │
├─────────────────────────────────────┤
│ • Sees featured videos              │
│ • Clicks video card                 │
│ • Redirects to:                     │
│   youtube.com/watch?v=VIDEO_ID      │
│                                     │
│ Result: Traffic TO YouTube          │
└─────────────────────────────────────┘
```

---

## Data Display Examples

### Homepage Display Format
```
┌──────────────────────────────────────────────────┐
│         WHAT'S BUZZING THIS WEEK                 │
├──────────────────────────────────────────────────┤
│ [Editorial commentary about trending topics...]   │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ [Thumbnail] │  │ [Thumbnail] │  │[Thumbnail]│ │
│  │   Video 1   │  │   Video 2   │  │  Video 3  │ │
│  │ Channel A   │  │ Channel B   │  │ Channel C │ │
│  │  150K views │  │  120K views │  │ 95K views │ │
│  │  [Watch ↗]  │  │  [Watch ↗]  │  │ [Watch ↗] │ │
│  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                   │
│  [3 more video cards...]                          │
└──────────────────────────────────────────────────┘
         ↓ Click "Watch"
         ↓
  Opens: youtube.com/watch?v=VIDEO_ID
```

### Channels Page Display Format
```
┌──────────────────────────────────────────────────┐
│       FEATURED CARNIVORE DIET CREATORS           │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  🥇 #1               │  │  🥈 #2           │  │
│  │  Paul Saladino MD    │  │  Dr. Ken Berry   │  │
│  │  450K weekly views   │  │  380K weekly views│ │
│  │  ┌────────────┐      │  │  ┌────────────┐ │  │
│  │  │[Thumbnail] │      │  │  │[Thumbnail] │ │  │
│  │  │ Video 1    │      │  │  │ Video 1    │ │  │
│  │  │ 250K views │      │  │  │ 200K views │ │  │
│  │  └────────────┘      │  │  └────────────┘ │  │
│  │  ┌────────────┐      │  │  ┌────────────┐ │  │
│  │  │[Thumbnail] │      │  │  │[Thumbnail] │ │  │
│  │  │ Video 2    │      │  │  │ Video 2    │ │  │
│  │  │ 200K views │      │  │  │ 180K views │ │  │
│  │  └────────────┘      │  │  └────────────┘ │  │
│  └──────────────────────┘  └──────────────────┘  │
│                                                   │
│  [10 more creator cards...]                       │
└──────────────────────────────────────────────────┘
         ↓ Click any video
         ↓
  Opens: youtube.com/watch?v=VIDEO_ID
```

---

## API Quota Usage Breakdown

### Weekly Collection (Sunday automation)

```
API Operation              Quota Units    Frequency    Total
─────────────────────────────────────────────────────────────
search.list (query 1)           100      1x/week       100
search.list (query 2)           100      1x/week       100
search.list (query 3)           100      1x/week       100
search.list (query 4)           100      1x/week       100
videos.list (batch 50)            1      1x/week         1
commentThreads.list              1      12x/week       12
─────────────────────────────────────────────────────────────
TOTAL PER WEEK                                         413
AVERAGE PER DAY                                         59
```

**Well within 10,000 units/day default quota**

---

## Metadata Usage Examples

### From YouTube API Response:
```json
{
  "video_id": "abc123xyz",
  "title": "30 Days on Carnivore Diet - My Results",
  "description": "Sharing my health improvements after...",
  "thumbnail_url": "https://i.ytimg.com/vi/abc123xyz/mqdefault.jpg",
  "channel_name": "Health Journey with Sarah",
  "channel_id": "UC_channel_id",
  "statistics": {
    "view_count": 150000,
    "like_count": 8500,
    "comment_count": 430
  },
  "published_at": "2026-01-15T10:30:00Z"
}
```

### Displayed on Our Site:
```html
<div class="video-card">
  <a href="https://youtube.com/watch?v=abc123xyz" target="_blank">
    <img src="https://i.ytimg.com/vi/abc123xyz/mqdefault.jpg"
         alt="30 Days on Carnivore Diet - My Results">
  </a>
  <h3>
    <a href="https://youtube.com/watch?v=abc123xyz">
      30 Days on Carnivore Diet - My Results
    </a>
  </h3>
  <p class="channel">Health Journey with Sarah</p>
  <p class="views">150,000 views</p>
  <p class="description">Sharing my health improvements after...</p>
</div>
```

**Key Points:**
✅ Direct link to YouTube
✅ Official thumbnail URL (not downloaded/modified)
✅ Channel name attribution
✅ No modifications to metadata
✅ Drives traffic TO YouTube

---

## Compliance Checklist

✅ **Attribution**
- Channel names displayed on all videos
- Clear indication content is from YouTube

✅ **Linking**
- Every video links to youtube.com/watch
- Opens in new tab (target="_blank")

✅ **Thumbnails**
- Using official YouTube thumbnail URLs
- No downloading or modifying images

✅ **Metadata**
- Displaying as-is from API
- No alterations to titles/descriptions

✅ **No Downloads**
- Never downloading video files
- Only using public metadata

✅ **Caching**
- 24-hour cache validity
- Respects data freshness

✅ **Privacy**
- No user tracking
- No login required
- Public data only

---

## Traffic Flow to YouTube

```
User Journey:
1. Visits carnivoreweekly.com
2. Sees curated video cards
3. Clicks "Watch" link
4. Redirects to youtube.com/watch?v=VIDEO_ID
5. Watches video on YouTube
6. Creator gets view/watch time credit

Result: 100% of video views happen on YouTube
```

**Monthly Traffic to YouTube (Estimated):**
- Site visitors: ~2,000/week
- Click-through rate: ~40%
- Monthly clicks to YouTube: ~3,200 visits

**We drive traffic TO YouTube, not away from it.**

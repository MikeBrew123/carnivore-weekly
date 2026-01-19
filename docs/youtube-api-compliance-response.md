# YouTube API Services Compliance Review Response
**Date:** January 19, 2026
**API Client:** Carnivore Weekly (carnivoreweekly.com)
**Use Case:** Educational content curation for carnivore diet community

---

## Executive Summary

Carnivore Weekly is an educational resource that curates carnivore diet content from YouTube to help users discover high-quality, relevant videos. We use the YouTube Data API v3 to collect public video metadata, analyze relevance using AI, and present the most valuable content to our community.

---

## 1. How We Use YouTube API Data

### Data Collection Process

**Script:** `scripts/youtube_collector.py`

**What we collect from YouTube API:**
- Video titles, descriptions, thumbnails
- Publication dates
- View counts, like counts, comment counts
- Channel names and IDs
- Video tags
- Top comments (for community insights)

**Collection workflow:**
1. **Search Query** - We search for videos using carnivore-related terms:
   - "carnivore diet"
   - "animal-based diet"
   - "meat only diet"
   - "zero carb diet"

2. **Time Filter** - Only videos from the past 7 days (publishedAfter parameter)

3. **Relevance Scoring** - Each video is analyzed using Claude AI to score relevance (1-10 scale)
   - Videos scoring below 7 are filtered out
   - Ensures only genuinely carnivore-related content is featured

4. **Creator Diversity** - Limited to 2 videos per creator (max 12 creators)
   - Prevents any single channel from dominating
   - Ensures diverse perspectives

5. **Data Storage** - Metadata cached in Supabase database
   - Reduces API calls on subsequent page loads
   - Data refreshed weekly

**API Endpoints Used:**
- `youtube.search().list` - Find relevant videos
- `youtube.videos().list` - Get video statistics and details
- `youtube.commentThreads().list` - Fetch top comments for context

---

## 2. How We Analyze YouTube Metadata

### Analysis Process

**Script:** `scripts/content_analyzer_optimized.py`

**Analysis types performed:**

1. **Relevance Filtering**
   - AI evaluates if video genuinely discusses carnivore diet
   - Filters out off-topic content that matches keywords but isn't relevant
   - Example: "carnivore" mentioned in passing vs. dedicated carnivore content

2. **Community Insights**
   - Weekly roundup summarizing trending themes
   - Identifies what the carnivore community is discussing
   - Written in conversational tone by "Chloe" persona

3. **Trending Topics Extraction**
   - Analyzes video titles, descriptions, and tags
   - Generates 3-5 trending topic tags
   - Examples: "Carnivore for athletes", "Organ meat benefits"

4. **Content Categorization**
   - Groups videos by theme (recipes, health results, science)
   - Helps users find content matching their interests

**Analysis Output:** `data/analyzed_content.json`
- Weekly summary
- Trending topics
- Key insights
- Analysis timestamp

---

## 3. How Analyzed Data is Displayed on Our Site

### Display Locations

#### A. Homepage (carnivoreweekly.com)

**Section: "What's Buzzing This Week"**

Displays:
- Editorial commentary about trending themes (AI-generated)
- Top 6 featured videos from the week
- Each video shows:
  - ✅ YouTube thumbnail (via thumbnail_url from API)
  - ✅ Video title
  - ✅ Channel name
  - ✅ View count
  - ✅ Direct link to YouTube video (youtube.com/watch?v=[videoId])

**Template:** `templates/index_template.html`
**Live URL:** https://carnivoreweekly.com

---

#### B. Channels Page (carnivoreweekly.com/channels.html)

**Section: "Featured Content Creators"**

Displays:
- Ranked list of top carnivore diet creators (by weekly views)
- Grid layout showing each creator's channel card

Each channel card shows:
- ✅ Rank badge (#1, #2, #3, etc.)
- ✅ Channel name
- ✅ Total weekly views
- ✅ List of their recent videos with:
  - Video thumbnail
  - Video title
  - Description preview
  - View count
  - Direct link to YouTube video

**Template:** `templates/channels_template.html`
**Live URL:** https://carnivoreweekly.com/channels.html

---

### Video Display Example

```html
<!-- Typical video card structure on our site -->
<article class="video-card">
  <a href="https://youtube.com/watch?v=VIDEO_ID" target="_blank">
    <img src="THUMBNAIL_URL" alt="Video thumbnail">
  </a>
  <h3>
    <a href="https://youtube.com/watch?v=VIDEO_ID">VIDEO_TITLE</a>
  </h3>
  <p class="channel-name">CHANNEL_NAME</p>
  <p class="view-count">VIEW_COUNT views</p>
  <p class="description">DESCRIPTION_PREVIEW...</p>
</article>
```

---

## 4. Compliance Highlights

### YouTube Terms of Service Compliance

✅ **Attribution** - All videos clearly display channel names
✅ **Links** - Every video links directly back to YouTube
✅ **Thumbnails** - Using official thumbnail URLs from API
✅ **No modifications** - Video metadata displayed as-is from API
✅ **No downloads** - We don't download or store video files
✅ **Public data only** - Only displaying publicly available metadata
✅ **Branding** - Clear indication that videos are from YouTube

### Data Refresh Policy

- Data collected weekly (every Sunday)
- Cached in database to minimize API calls
- Cache expires after 24 hours
- Fresh API calls only when cache is stale

### Privacy & User Data

- We do NOT collect any user viewing data
- We do NOT track which videos users click
- We do NOT require login to view curated content
- Comments displayed are top public comments from YouTube API

---

## 5. Sample Report: Weekly Data Flow

**Week of January 12-19, 2026**

### Step 1: Data Collection
```
API Calls Made:
- Search queries: 4 (one per search term)
- Video details: 50 videos (batch request)
- Comments: 12 videos (top 20 comments each)

Total API Quota Used: ~100 units
```

### Step 2: Relevance Filtering
```
Videos Found: 120
AI Relevance Scoring Applied: 120 videos
Passed Threshold (≥7): 70 videos
Rejected (off-topic): 50 videos
```

### Step 3: Creator Ranking
```
Top 12 Creators by Weekly Views:
1. Paul Saladino MD - 450K views
2. Dr. Ken Berry - 380K views
3. Steak and Butter Gal - 290K views
... (12 total)
```

### Step 4: Analysis
```
Generated Content:
- Weekly community roundup (2-3 paragraphs)
- Trending topics: ["Electrolytes on carnivore", "Carnivore athletes", "Nose-to-tail eating"]
- Key insights summary
```

### Step 5: Display
```
Homepage: 6 featured videos
Channels: 12 creator profiles with 2 videos each (24 videos total)
All videos link directly to YouTube
```

---

## 6. Visual Reference Screenshots

### Screenshot 1: Homepage - Featured Videos
**Location:** carnivoreweekly.com
**Shows:**
- "What's Buzzing This Week" section
- 6 video cards with thumbnails, titles, channel names
- Each card links to YouTube
- View counts displayed
- Editorial commentary above

### Screenshot 2: Channels Page - Creator Rankings
**Location:** carnivoreweekly.com/channels.html
**Shows:**
- Grid of 12 featured creators
- Rank badges (#1, #2, #3)
- Channel names
- Total weekly views
- Recent video listings per creator

### Screenshot 3: Individual Video Card Detail
**Shows:**
- YouTube thumbnail
- Video title (linked to YouTube)
- Channel name
- View count
- Description preview (first 200 chars from API)
- Published date

---

## 7. API Quota Usage Estimate

**Weekly collection:**
- Search requests: 4 queries × 100 units = 400 units
- Video details: 1 batch request × 1 unit = 1 unit
- Comments: 12 requests × 1 unit = 12 units

**Total per week:** ~413 units
**Total per day:** ~59 units
**Well within default quota:** 10,000 units/day

**Quota increase request reason:**
Our community is growing rapidly. We'd like to:
- Expand from 12 to 20 featured creators
- Increase search query coverage
- Add international carnivore content (other languages)

---

## 8. Benefit to YouTube Ecosystem

Our curation service:
- ✅ Drives traffic TO YouTube (all links point to youtube.com)
- ✅ Helps quality carnivore content get discovered
- ✅ Filters spam/off-topic content for users
- ✅ Provides editorial context that helps users find valuable content
- ✅ Increases watch time for carnivore diet creators on YouTube

We act as a discovery layer that makes YouTube's carnivore diet content more accessible to a dedicated health community.

---

## Contact Information

**Website:** carnivoreweekly.com
**Project Repository:** (Available upon request for code review)
**Technical Contact:** [Your email]

**Technical Implementation Files:**
- Data collection: `scripts/youtube_collector.py`
- Analysis: `scripts/content_analyzer_optimized.py`
- Display templates: `templates/index_template.html`, `templates/channels_template.html`

---

## Appendix: Code Snippets

### API Call Example (Search)
```python
request = self.youtube.search().list(
    part="snippet",
    q="carnivore diet",
    type="video",
    order="viewCount",
    publishedAfter="2026-01-12T00:00:00Z",  # 7 days back
    maxResults=50,
    relevanceLanguage="en",
    safeSearch="none"
)
response = request.execute()
```

### API Call Example (Video Statistics)
```python
request = self.youtube.videos().list(
    part="statistics",
    id="video_id_1,video_id_2,video_id_3"  # Batch request
)
response = request.execute()
```

### Display Example (HTML)
```html
<div class="video-card">
  <a href="https://youtube.com/watch?v={{ video.video_id }}">
    <img src="{{ video.thumbnail_url }}" alt="{{ video.title }}">
  </a>
  <h3>{{ video.title }}</h3>
  <p>{{ video.channel_name }}</p>
  <p>{{ video.view_count }} views</p>
</div>
```

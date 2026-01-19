# Email Draft for YouTube API Compliance Review

---

**Subject:** API Compliance Review Response - Carnivore Weekly (Application ID: [Your ID])

---

Dear YouTube API Compliance Team,

Thank you for reviewing our quota request. Please find below the complete information about our API usage and implementation.

## API Client Overview

**Website:** carnivoreweekly.com
**Purpose:** Educational content curation for the carnivore diet health community
**API Use Case:** Discovering and presenting relevant carnivore diet videos to help users find quality educational content

---

## 1. Complete Use Case Description

**What we do:**
Carnivore Weekly is a content discovery platform that helps people following the carnivore diet find high-quality YouTube videos from trusted creators. We use the YouTube Data API v3 to:

1. Search for videos about carnivore diet topics (weekly)
2. Collect public metadata (titles, descriptions, thumbnails, view counts)
3. Analyze relevance using AI to filter out off-topic content
4. Present the top 12 creators and their best videos to our audience

**Why this benefits YouTube:**
- Drives traffic TO YouTube (every video links directly to youtube.com)
- Helps quality carnivore content get discovered by dedicated audience
- Filters spam/low-quality content
- Increases watch time for educational health content creators

---

## 2. How We Analyze YouTube Metadata

### Collection Process
**Script:** `scripts/youtube_collector.py` (Python)

**APIs Used:**
- `youtube.search().list` - Find videos matching carnivore diet queries
- `youtube.videos().list` - Get video statistics (views, likes, comments)
- `youtube.commentThreads().list` - Fetch top comments for community insights

**Metadata Collected:**
- Video titles, descriptions, thumbnails
- Channel names and IDs
- View counts, like counts, comment counts
- Publish dates
- Video tags
- Top 20 comments per video (for editorial context)

### Analysis Process
**Script:** `scripts/content_analyzer_optimized.py` (Python)

**AI-Powered Filtering:**
- Each video is scored for relevance to carnivore diet (1-10 scale)
- Videos scoring below 7 are filtered out
- Prevents off-topic content from being featured
- Uses Claude AI (Anthropic) for natural language understanding

**Content Insights Generated:**
- Weekly community roundup (editorial summary)
- Trending topics in carnivore community
- Theme categorization (recipes, health results, science)

**Data Storage:**
- Cached in Supabase database
- Reduces API calls (cache valid for 24 hours)
- Data refreshed weekly (Sundays)

---

## 3. How Analyzed Data is Displayed on Our Site

### Display Format

**Homepage (carnivoreweekly.com):**
- "What's Buzzing This Week" section
- Editorial commentary about trending themes
- 6 featured videos displayed as cards
- Each card shows:
  ✅ YouTube thumbnail (from API thumbnail_url)
  ✅ Video title (linked to YouTube)
  ✅ Channel name
  ✅ View count
  ✅ Direct link to youtube.com/watch?v=[videoId]

**Channels Page (carnivoreweekly.com/channels.html):**
- Top 12 creators ranked by weekly views
- Grid layout with creator cards
- Each creator shows:
  ✅ Rank badge (#1, #2, etc.)
  ✅ Channel name
  ✅ Total weekly views
  ✅ 2 most popular videos from past week
  ✅ All videos link directly to YouTube

### Compliance Features
✅ **Attribution** - Channel names clearly displayed
✅ **Links** - Every video links back to YouTube
✅ **Thumbnails** - Official thumbnails from API (not modified)
✅ **No downloads** - We never download or store video files
✅ **Public data only** - Only displaying publicly available metadata
✅ **YouTube branding** - Clear indication videos are from YouTube

---

## 4. Visual References

**Attached files:**
1. `carnivore-homepage-screenshot.png` - Shows featured videos section
2. `carnivore-channels-screenshot.png` - Shows creator rankings page
3. `youtube-api-compliance-response.md` - Complete technical documentation

**Key visual elements to note in screenshots:**
- All video cards link to YouTube
- YouTube thumbnails prominently displayed
- Channel names visible on every video
- View counts shown (from API statistics)
- Clean, organized presentation that respects YouTube branding

---

## 5. Sample Data Flow Report

**Example: Week of January 12-19, 2026**

### API Calls Made:
```
Search queries: 4 (carnivore diet, animal-based diet, meat only diet, zero carb diet)
Video details: 1 batch request (50 videos)
Comment threads: 12 requests (top videos only)
Total quota used: ~413 units
```

### Analysis Results:
```
Videos found: 120
AI relevance filtering applied
Videos passing threshold (score ≥7): 70 videos
Videos rejected (off-topic): 50 videos
```

### Top Creators Featured:
```
1. Paul Saladino MD - 450K weekly views
2. Dr. Ken Berry - 380K weekly views
3. Steak and Butter Gal - 290K weekly views
4-12. (Additional creators)
```

### Content Displayed:
```
Homepage: 6 featured videos
Channels page: 12 creators × 2 videos = 24 videos total
All videos link directly to YouTube
```

---

## 6. Current Quota Usage

**Weekly API Usage:**
- Search: ~400 units
- Video details: ~1 unit
- Comments: ~12 units
**Total per week:** ~413 units
**Daily average:** ~59 units

**Well within 10,000 units/day default quota**

**Quota Increase Request Reason:**
We're seeking increased quota to:
- Expand from 12 to 20 featured creators
- Add international carnivore content (Spanish, Portuguese)
- Increase search coverage for emerging topics
- Support growing community (currently 2,000+ weekly visitors)

---

## 7. Technical Implementation

**Open for Review:**
We're happy to provide:
- Full source code for review
- Live API call examples
- Database schema
- Additional screenshots
- Test API credentials for verification

**Contact Information:**
- Website: carnivoreweekly.com
- Technical documentation: Available upon request
- Email: [Your email]
- Response time: Within 24 hours

---

## Summary

Carnivore Weekly acts as a discovery layer that makes YouTube's carnivore diet content more accessible to a dedicated health community. We:

✅ Drive traffic TO YouTube (all videos link to youtube.com)
✅ Use only public metadata
✅ Display proper attribution
✅ Respect YouTube Terms of Service
✅ Help quality creators get discovered
✅ Filter spam/low-quality content

We believe our use case aligns perfectly with YouTube's goals of helping creators reach their audience and helping users discover quality content.

Please let me know if you need any additional information or clarification. I'm happy to provide whatever documentation would be helpful for your review.

Thank you for your time and consideration.

Best regards,
[Your Name]
[Your Title]
Carnivore Weekly

---

**Attachments:**
1. carnivore-homepage-screenshot.png
2. carnivore-channels-screenshot.png
3. youtube-api-compliance-response.md (full technical documentation)

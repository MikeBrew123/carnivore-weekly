# YouTube Integration Archive

## Overview

Carnivore Weekly curates YouTube videos from carnivore diet creators. Videos are fetched via YouTube Data API, filtered for quality, and displayed on the site.

## API Compliance

YouTube API Services Terms of Service compliance review completed (2026-01-19).

**Key compliance points:**
- Display YouTube branding per guidelines
- Link to YouTube's Terms of Service and Google Privacy Policy
- Don't cache API data beyond allowed limits
- Provide user data deletion mechanism
- No unauthorized commercial use of YouTube data

## Data Flow

1. **Fetch**: YouTube Data API v3 → video metadata (title, views, likes, comments)
2. **Filter**: Remove anti-carnivore content, require minimum 5 comments
3. **Rank**: Sort by engagement score (weighted: views, likes, comments)
4. **Store**: Cache in Supabase `youtube_videos` table (106 videos, 32 creators)
5. **Display**: Rendered on site with engagement metrics

## API Usage

- **Quota**: 10,000 units/day (standard)
- **Endpoints used**: `search.list` (100 units), `videos.list` (1 unit per video)
- **Caching**: Results cached in Supabase to minimize API calls

## Database

Table `youtube_videos`: video_id, title, channel_name, views, likes, comment_count, engagement_score, fetched_at

Table `wiki_video_links`: Maps wiki topics to relevant videos with relevance_score (0-100).

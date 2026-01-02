# YouTube API Usage - Carnivore Weekly

## Project Overview
Carnivore Weekly (carnivoreweekly.com) is a content aggregation platform that curates the best carnivore diet content from YouTube creators to help users discover evidence-based nutritional information.

## How We Use YouTube Data API v3

### Use Case
We collect and analyze carnivore diet-related YouTube content **once per week** to:
- Identify trending topics in the carnivore diet community
- Surface top-performing educational videos
- Highlight credible creators and evidence-based content
- Provide users with curated weekly digests

### API Endpoints Used

1. **Search API** (`search.list`)
   - Query: "carnivore diet"
   - Frequency: Once weekly
   - Purpose: Find recent videos (past 7 days)
   - Estimated cost: ~100 units per search

2. **Videos API** (`videos.list`)
   - Frequency: Once weekly (batch of ~50 videos)
   - Purpose: Get view counts, likes, comment counts for ranking
   - Estimated cost: ~50 units per batch

3. **Comment Threads API** (`commentThreads.list`)
   - Frequency: Once weekly (top videos only)
   - Purpose: Analyze community sentiment and common questions
   - Estimated cost: ~100-200 units total

### Total Weekly Usage
Approximately **500-1,000 units per week** (one collection cycle every 7 days)

### Why We Need Higher Quota

Current default quota (10,000 units/day) is sufficient for our weekly production operations, but we occasionally hit limits during:

- **Development & Testing:** Iterating on collection algorithms and data quality improvements
- **Quality Assurance:** Running validation checks before deploying updates
- **Special Analysis:** Generating reports or analyzing historical trends
- **Redundancy:** Backup collections in case of failures

**Requested Quota:** 50,000 units/day

This would allow us to:
- Run multiple test cycles during development without hitting daily limits
- Provide operational redundancy and backup data collection
- Expand coverage to additional nutrition-related topics in the future

## User Benefit

Our service helps users discover trustworthy carnivore diet information without manually searching through low-quality or misleading content. We:

- Surface evidence-based creators and credible health professionals
- Identify trending community discussions and common questions
- Provide weekly curated digests with the best educational content
- Drive traffic back to YouTube creators by linking directly to their videos

## Data Handling & Compliance

- **Public Data Only:** All data collected is publicly available YouTube information
- **No Content Storage:** We display video metadata (titles, creators, thumbnails) and link directly to YouTube
- **No Redistribution:** We do not download, store, or redistribute video content
- **ToS Compliance:** Full compliance with YouTube Terms of Service and API usage policies
- **Attribution:** All content properly attributed to original creators with direct YouTube links

## Technical Implementation

- **Language:** Python 3.9+
- **Library:** google-api-python-client (official Google client library)
- **Frequency:** Automated weekly collection (runs once every 7 days)
- **Caching:** Results cached to minimize redundant API calls
- **Error Handling:** Proper quota monitoring and exponential backoff on rate limits

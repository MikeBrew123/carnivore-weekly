# Carnivore Weekly API Reference

**Version**: 1.0.0
**Last Updated**: January 8, 2026
**For**: Developers integrating with Carnivore Weekly features

This document describes the data structures, endpoints, and integration points for Carnivore Weekly's features.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Endpoints](#data-endpoints)
3. [Feature APIs](#feature-apis)
4. [External API Integrations](#external-api-integrations)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

### Architecture

Carnivore Weekly uses a **static site** architecture with **pre-generated data**. There are no traditional REST endpoints—instead, data is:

1. **Generated locally** via Python scripts (weekly automation)
2. **Stored as JSON files** in `/data/` directory
3. **Embedded in HTML** during page generation (Jinja2)
4. **Served as static files** via GitHub Pages

**This means:**
- ✅ No backend server required
- ✅ Extremely fast (CDN-cached static files)
- ✅ No database needed
- ✅ Simple architecture, easy to maintain
- ❌ Real-time features not possible
- ❌ No user authentication
- ❌ Can't query data dynamically

### Data Flow

```
YOUTUBE
  ↓
youtube_collector.py → data/youtube_data.json
  ↓
content_analyzer.py + Claude API → data/analyzed_content.json
  ↓
add_sentiment.py → data/sentiment_data.json
  ↓
analyze_trending.py → data/trending_data.json
  ↓
generate_pages.py (Jinja2) + templates/ → public/index.html
  ↓
GitHub Pages → carnivoreweekly.com
  ↓
Browser fetches HTML + embedded JSON → Page displays
```

---

## Data Endpoints

### Static Data Files

All data is stored as JSON in the `/data/` directory and served as static files.

#### 1. YouTube Data: `/data/youtube_data.json`

**Purpose**: Metadata about all collected videos

**HTTP Access**: `https://carnivoreweekly.com/data/youtube_data.json` (if public)

**Sample:**
```json
{
    "collected_at": "2026-01-08T10:00:00Z",
    "videos": [
        {
            "id": "dQw4w9WgXcQ",
            "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
            "channel_name": "Rick Astley",
            "title": "Rick Astley - Never Gonna Give You Up",
            "description": "Official video for "Never Gonna Give You Up" by Rick Astley.",
            "published_at": "2009-10-25T06:57:33Z",
            "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
            "view_count": 1147000000,
            "like_count": 13000000,
            "comment_count": 500000,
            "duration": "PT3M33S",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
    ]
}
```

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | YouTube video ID (11 chars) |
| `channel_id` | string | YouTube channel ID |
| `channel_name` | string | Channel display name |
| `title` | string | Video title |
| `description` | string | Full video description |
| `published_at` | ISO 8601 timestamp | When video was published |
| `thumbnail` | URL | Video thumbnail image |
| `view_count` | integer | Total views |
| `like_count` | integer | Thumbs-up count |
| `comment_count` | integer | Total comments |
| `duration` | ISO 8601 duration | Video length (e.g., PT3M33S = 3 min 33 sec) |
| `url` | URL | Full YouTube video URL |

#### 2. Analyzed Content: `/data/analyzed_content.json`

**Purpose**: Claude AI analysis of each video

**Sample:**
```json
{
    "analyzed_at": "2026-01-08T10:30:00Z",
    "content": [
        {
            "video_id": "dQw4w9WgXcQ",
            "summary": "Comprehensive guide to starting a carnivore diet, covering macros, micronutrients, and common pitfalls.",
            "key_points": [
                "Focus on fatty cuts of beef for satiety",
                "Organ meats provide essential micronutrients",
                "Allow 3-4 weeks for metabolic adaptation"
            ],
            "health_claims": [
                "Carnivore diet reduces inflammation",
                "Improved mental clarity from ketones",
                "Weight loss from reduced appetite"
            ],
            "questions": [
                {
                    "question": "How long until I feel full on carnivore?",
                    "answer": "Most people feel satisfied sooner due to high fat content. Expect adjustment period of 3-7 days.",
                    "citation": "https://pubmed.ncbi.nlm.nih.gov/12345678"
                }
            ],
            "tone": "educational",
            "difficulty_level": "beginner"
        }
    ]
}
```

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `video_id` | string | YouTube video ID (matches youtube_data.json) |
| `summary` | string | 2-3 sentence summary of video content |
| `key_points` | array of strings | Bullet points of main ideas |
| `health_claims` | array of strings | Claims made (verify with citations) |
| `questions` | array of objects | Q&A extracted from video |
| `tone` | enum | "educational", "anecdotal", "promotional", "debate" |
| `difficulty_level` | enum | "beginner", "intermediate", "advanced" |

#### 3. Sentiment Data: `/data/sentiment_data.json`

**Purpose**: Sentiment analysis of YouTube comments

**Sample:**
```json
{
    "analyzed_at": "2026-01-08T10:45:00Z",
    "comments": [
        {
            "id": "UgzxxxxxyyyyzzzzAAA",
            "video_id": "dQw4w9WgXcQ",
            "author": "JohnDoe",
            "text": "This changed my life! Lost 30lbs and feel amazing!",
            "sentiment": "positive",
            "confidence": 0.95,
            "likes": 237,
            "published_at": "2026-01-06T10:00:00Z"
        }
    ],
    "summary": {
        "positive_count": 375,
        "neutral_count": 125,
        "negative_count": 50,
        "sentiment_distribution": {
            "positive": 0.70,
            "neutral": 0.23,
            "negative": 0.07
        }
    }
}
```

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | YouTube comment ID |
| `video_id` | string | Which video this comment is on |
| `author` | string | YouTube username of commenter |
| `text` | string | Full comment text |
| `sentiment` | enum | "positive", "neutral", "negative" |
| `confidence` | float | 0.0-1.0 confidence in classification |
| `likes` | integer | Upvote count on comment |
| `published_at` | ISO 8601 timestamp | When comment was posted |

#### 4. Trending Topics: `/data/trending_data.json`

**Purpose**: Ranked trending topics from community discussions

**Sample:**
```json
{
    "calculated_at": "2026-01-08T11:15:00Z",
    "trending": [
        {
            "rank": 1,
            "topic": "Protein Intake on Carnivore",
            "mention_count": 127,
            "comment_count": 450,
            "engagement_score": 2340,
            "sentiment": {
                "positive": 0.60,
                "neutral": 0.25,
                "negative": 0.15
            },
            "related_videos": [
                "dQw4w9WgXcQ",
                "xxxxxxyyyyyzzz"
            ],
            "sample_discussions": [
                "How much protein do I really need?",
                "Should I track macros on carnivore?",
                "Protein timing for athletes"
            ],
            "trend_direction": "up",
            "trend_velocity": 1.25
        }
    ]
}
```

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `rank` | integer | 1-5, ranking by engagement |
| `topic` | string | Topic name |
| `mention_count` | integer | How many comments mention this |
| `comment_count` | integer | Total comments discussing topic |
| `engagement_score` | integer | Calculated engagement ranking |
| `sentiment` | object | Positive/neutral/negative breakdown |
| `related_videos` | array | Video IDs discussing this topic |
| `sample_discussions` | array | Example discussion points |
| `trend_direction` | enum | "up", "stable", "down" |
| `trend_velocity` | float | Speed of trend (1.0 = stable) |

#### 5. Wiki Definitions: `/data/wiki_definitions.json`

**Purpose**: Health and nutrition term definitions

**Sample:**
```json
{
    "updated_at": "2026-01-08T11:00:00Z",
    "terms": [
        {
            "id": "term-001",
            "term": "Ketosis",
            "definition": "Metabolic state where your body burns fat for fuel instead of carbohydrates, producing ketones as energy.",
            "category": "Metabolic",
            "difficulty": "beginner",
            "related_terms": ["Ketones", "Fat Adaptation", "Nutritional Ketosis"],
            "scientific_name": "Nutritional Ketosis",
            "citation": "https://pubmed.ncbi.nlm.nih.gov/23633202",
            "examples": [
                "After 24-48 hours of fasting, most people enter ketosis",
                "Carnivore diet naturally produces ketosis due to zero carbs"
            ],
            "image_url": "https://cdn.example.com/ketosis-diagram.png",
            "last_updated": "2025-12-30"
        }
    ]
}
```

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for term |
| `term` | string | The word being defined |
| `definition` | string | 1-2 sentence definition |
| `category` | enum | "Metabolic", "Nutrition", "Health", "Lifestyle" |
| `difficulty` | enum | "beginner", "intermediate", "advanced" |
| `related_terms` | array | Related terms to learn about |
| `scientific_name` | string | Formal/scientific term name (optional) |
| `citation` | URL | Link to research source |
| `examples` | array | Real-world usage examples |
| `image_url` | URL | Diagram or image (optional) |
| `last_updated` | date | When definition was last updated |

#### 6. Weekly Content: `/data/weekly_content.json`

**Purpose**: Sarah's weekly health insights

**Sample:**
```json
{
    "week_of": "2026-01-06",
    "published_at": "2026-01-06T08:00:00Z",
    "headline": "5 Carnivore Protein Myths Debunked",
    "topics": [
        {
            "topic_title": "How Much Protein Do You Really Need?",
            "summary": "Research suggests 0.8-1.0g per pound of body weight, not the 2g often recommended. More isn't always better.",
            "key_insight": "Quality of protein matters more than quantity",
            "category": "Nutrition",
            "research_citations": [
                {
                    "source": "Journal of Sports Medicine",
                    "year": 2024,
                    "url": "https://pubmed.ncbi.nlm.nih.gov/12345678",
                    "title": "Optimal Protein Intake for Carnivore Athletes"
                }
            ],
            "faq": [
                {
                    "question": "Will too much protein hurt my kidneys?",
                    "answer": "No, research shows high protein doesn't damage healthy kidneys."
                }
            ],
            "action_item": "Track your protein intake for one week using a food scale"
        }
    ],
    "author": "Sarah",
    "author_bio": "Health coach with 20+ years of experience in carnivore nutrition"
}
```

**Schema:**
| Field | Type | Description |
|-------|------|-------------|
| `week_of` | date | Which week (Monday of that week) |
| `headline` | string | Main headline for the week |
| `topics` | array | 5-7 health topics |
| `topic.topic_title` | string | Topic name |
| `topic.summary` | string | 100-150 word summary |
| `topic.key_insight` | string | 1-2 sentence main point |
| `topic.category` | string | Category of topic |
| `topic.research_citations` | array | Supporting research links |
| `topic.faq` | array | Common questions about topic |
| `topic.action_item` | string | Something reader can do this week |
| `author` | string | Content creator (usually "Sarah") |

---

## Feature APIs

### JavaScript Feature APIs (Frontend)

These are JavaScript functions available in `public/features.js` for interacting with features on the page.

#### Wiki Auto-Linker

```javascript
// Initialize wiki definitions on page load
wikiLinker.initialize(definitionsData);

// Show definition for a term
wikiLinker.showDefinition(element, term, definition);

// Hide definition
wikiLinker.hideDefinition();

// Search for terms
wikiLinker.search(searchQuery);
// Returns: [{term: "...", definition: "..."}, ...]

// Get all terms in a category
wikiLinker.getTermsByCategory("Nutrition");
// Returns: [{id: "...", term: "...", ...}, ...]
```

**Usage Example:**
```javascript
// On page load
document.addEventListener('DOMContentLoaded', () => {
    const definitions = window.wikiData;  // Embedded in HTML
    wikiLinker.initialize(definitions);
});

// On hover/tap
document.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('wiki-term')) {
        const term = e.target.textContent;
        const definition = wikiLinker.findTerm(term);
        wikiLinker.showDefinition(e.target, term, definition);
    }
});
```

#### Trending Topics Explorer

```javascript
// Initialize trending topics
trendingTopics.initialize(trendingData);

// Filter by sentiment
trendingTopics.filterBySentiment("positive");
// Shows only topics where positive % > 50%

// Search topics
trendingTopics.search("protein");
// Returns matching topics

// Get topic details
const topic = trendingTopics.getTopic(1);  // rank 1
// Returns: {topic: "...", sentiment: {...}, ...}

// Expand a topic
trendingTopics.expandTopic(topicRank);
```

**Usage Example:**
```javascript
// On page load
trendingTopics.initialize(window.trendingData);

// On filter button click
document.querySelectorAll('.sentiment-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const sentiment = e.target.dataset.sentiment;
        trendingTopics.filterBySentiment(sentiment);
    });
});
```

#### Sentiment Threads

```javascript
// Initialize sentiment data
sentimentThreads.initialize(sentimentData);

// Filter by sentiment
sentimentThreads.filterBySentiment("positive");

// Get comments by sentiment
const positiveComments = sentimentThreads.getCommentsBySentiment("positive");
// Returns: [{id: "...", text: "...", sentiment: "positive", ...}, ...]

// Sort comments
sentimentThreads.sort("likes");  // Sort by likes
sentimentThreads.sort("recent");  // Sort by date

// Get sentiment summary for a topic
const summary = sentimentThreads.getSummary("Protein");
// Returns: {positive: 0.60, neutral: 0.25, negative: 0.15}
```

**Usage Example:**
```javascript
// On page load
sentimentThreads.initialize(window.sentimentData);

// On filter click
document.querySelectorAll('.sentiment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const sentiment = e.target.dataset.sentiment;
        sentimentThreads.filterBySentiment(sentiment);
        sentimentThreads.render();
    });
});
```

---

## External API Integrations

### YouTube Data API

**Purpose**: Collect video metadata and comments

**Authentication**: API Key (set in `.env`)

**Endpoints Used**:

#### 1. Get Videos from Channel
```
GET https://www.googleapis.com/youtube/v3/search
?key={API_KEY}
&part=snippet
&channelId={CHANNEL_ID}
&maxResults=50
&order=date
&publishedAfter={ISO_DATE}
```

**Response:**
```json
{
    "items": [
        {
            "id": {"videoId": "dQw4w9WgXcQ"},
            "snippet": {
                "title": "Video Title",
                "description": "Description...",
                "publishedAt": "2026-01-05T14:30:00Z",
                "thumbnails": {
                    "default": {"url": "https://..."}
                }
            }
        }
    ]
}
```

#### 2. Get Video Statistics
```
GET https://www.googleapis.com/youtube/v3/videos
?key={API_KEY}
&part=statistics,contentDetails
&id={VIDEO_ID}
```

**Response:**
```json
{
    "items": [
        {
            "statistics": {
                "viewCount": "1147000000",
                "likeCount": "13000000",
                "commentCount": "500000"
            },
            "contentDetails": {
                "duration": "PT3M33S"
            }
        }
    ]
}
```

#### 3. Get Comments
```
GET https://www.googleapis.com/youtube/v3/commentThreads
?key={API_KEY}
&part=snippet
&videoId={VIDEO_ID}
&maxResults=100
&textFormat=plainText
```

**Response:**
```json
{
    "items": [
        {
            "snippet": {
                "topLevelComment": {
                    "id": "UgzxxxxxyyyyzzzzAAA",
                    "snippet": {
                        "authorDisplayName": "Username",
                        "textDisplay": "Comment text...",
                        "publishedAt": "2026-01-06T10:00:00Z",
                        "likeCount": 237
                    }
                }
            }
        }
    ]
}
```

**Rate Limits**:
- Quota: 10,000 units/day
- Each `search`: 100 units
- Each `videos.list`: 1 unit
- Each `commentThreads.list`: 1 unit per comment batch
- **Budget**: ~50 videos/day maximum

### Anthropic Claude API

**Purpose**: AI content analysis and generation

**Authentication**: API Key (set in `.env`)

**Model**: `claude-3-5-sonnet-20241022`

**Endpoint:**
```
POST https://api.anthropic.com/v1/messages
Authorization: Bearer {ANTHROPIC_API_KEY}
```

**Request:**
```python
{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 2000,
    "system": "You are Sarah, a health coach...",
    "messages": [
        {
            "role": "user",
            "content": "Analyze this video: [content]"
        }
    ]
}
```

**Response:**
```python
{
    "id": "msg_123456",
    "content": [
        {
            "type": "text",
            "text": "Analysis results..."
        }
    ],
    "usage": {
        "input_tokens": 1500,
        "output_tokens": 800
    }
}
```

**Rate Limits**:
- Model: claude-3-5-sonnet-20241022
- TPM (Tokens Per Minute): ~100,000
- RPM (Requests Per Minute): ~10,000
- **Budget for analysis**: ~10 videos/script run (depends on content length)

**Python Integration:**
```python
from anthropic import Anthropic

client = Anthropic()

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2000,
    messages=[
        {
            "role": "user",
            "content": "Summarize this content: ..."
        }
    ]
)

summary = response.content[0].text
```

---

## Response Formats

### Standard Response Structure

All data is returned as JSON with this structure:

```json
{
    "metadata": {
        "version": "1.0.0",
        "generated_at": "2026-01-08T12:00:00Z",
        "data_source": "python scripts"
    },
    "data": {
        // Actual data here
    }
}
```

### Error Format

If an error occurs:

```json
{
    "error": {
        "type": "rate_limit_exceeded",
        "message": "YouTube API quota exceeded",
        "retry_after": 86400,
        "documentation": "https://developers.google.com/youtube/v3/getting-started"
    }
}
```

---

## Error Handling

### Common Errors

#### YouTube API Errors

**403 Forbidden (Quota Exceeded)**
```json
{
    "error": {
        "code": 403,
        "message": "The request cannot be completed because you have exceeded your YouTube API quota."
    }
}
```
**Solution**: Wait 24 hours, request fewer videos

**401 Unauthorized (Invalid Key)**
```json
{
    "error": {
        "code": 401,
        "message": "Invalid API key"
    }
}
```
**Solution**: Check `.env` file, verify API key validity

#### Claude API Errors

**429 Too Many Requests (Rate Limited)**
```json
{
    "error": {
        "type": "rate_limit_error",
        "message": "Rate limit exceeded"
    }
}
```
**Solution**: Implement exponential backoff, wait 60 seconds

**400 Bad Request (Invalid Input)**
```json
{
    "error": {
        "type": "invalid_request_error",
        "message": "Invalid parameter: max_tokens"
    }
}
```
**Solution**: Check request format, verify parameters

#### Data File Errors

**JSON Parse Error**
```
Error: JSON.parse: unexpected character at line 1 column 1
```
**Solution**: Validate JSON file, regenerate data scripts

### Retry Strategy

```python
import time
import anthropic

def call_with_retry(prompt, max_retries=3):
    """Call Claude API with exponential backoff"""

    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text

        except anthropic.RateLimitError:
            wait_time = (2 ** attempt)  # 1s, 2s, 4s
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)

        except anthropic.APIError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt)
            print(f"Error: {e}. Retrying in {wait_time}s...")
            time.sleep(wait_time)
```

---

## Rate Limiting

### YouTube Data API

**Quota**:
- 10,000 units/day
- 1 unit per video.list request
- 100 units per search request

**Current usage**:
- ~50 videos/week = 50 units/week
- ~1 search per week = 100 units/week
- **Total**: ~150 units/week = well within quota

**To monitor**:
```bash
# Check API console
https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
```

### Claude API

**Quota** (for claude-3-5-sonnet):
- 100,000 tokens per minute
- 10,000 requests per minute

**Current usage**:
- ~500 tokens per video analysis
- ~50 videos/week = 25,000 tokens/week
- **Total**: Well within quota

**To monitor**:
```bash
# Check Anthropic console
https://console.anthropic.com/account/billing/overview
```

### Implementation

**Python rate limiter:**

```python
from time import time, sleep
from functools import wraps

class RateLimiter:
    def __init__(self, calls_per_minute=1):
        self.calls_per_minute = calls_per_minute
        self.interval = 60 / calls_per_minute
        self.last_called = 0

    def wait(self):
        elapsed = time() - self.last_called
        wait_time = self.interval - elapsed
        if wait_time > 0:
            sleep(wait_time)
        self.last_called = time()

# Usage
youtube_limiter = RateLimiter(calls_per_minute=10)

for video_id in video_ids:
    youtube_limiter.wait()
    fetch_video(video_id)
```

---

## Integration Examples

### Example 1: Fetch and Display Trending Topics

```javascript
// HTML
<div id="trending-container"></div>

// JavaScript
async function displayTrendingTopics() {
    // In production, this data is embedded in HTML
    // For external integration, you would fetch the JSON:
    const response = await fetch('/data/trending_data.json');
    const data = await response.json();

    const html = data.trending
        .slice(0, 5)
        .map(topic => `
            <div class="trending-item">
                <h3>${topic.topic}</h3>
                <p>Rank: #${topic.rank}</p>
                <div class="sentiment">
                    <span style="color: green">Positive: ${(topic.sentiment.positive * 100).toFixed(0)}%</span>
                    <span style="color: gray">Neutral: ${(topic.sentiment.neutral * 100).toFixed(0)}%</span>
                    <span style="color: red">Negative: ${(topic.sentiment.negative * 100).toFixed(0)}%</span>
                </div>
            </div>
        `)
        .join('');

    document.getElementById('trending-container').innerHTML = html;
}

displayTrendingTopics();
```

### Example 2: Integrate Wiki Definitions

```javascript
// Embed definitions in content
function linkWikiTerms(text, definitions) {
    let linked = text;

    definitions.terms.forEach(term => {
        const regex = new RegExp(`\\b${term.term}\\b`, 'gi');
        linked = linked.replace(regex,
            `<span class="wiki-term" data-definition="${encodeURIComponent(term.definition)}">${term.term}</span>`
        );
    });

    return linked;
}

// Usage
const content = "Ketosis is a metabolic state...";
const definitions = window.wikiData;
const linked = linkWikiTerms(content, definitions);
document.getElementById('content').innerHTML = linked;
```

### Example 3: Analyze Sentiment for a Topic

```python
import json

def get_topic_sentiment(topic_name):
    """Get sentiment breakdown for a specific topic"""

    with open('data/sentiment_data.json') as f:
        sentiment_data = json.load(f)

    # Find comments mentioning the topic
    matching = [
        c for c in sentiment_data['comments']
        if topic_name.lower() in c['text'].lower()
    ]

    # Calculate breakdown
    positive = sum(1 for c in matching if c['sentiment'] == 'positive')
    neutral = sum(1 for c in matching if c['sentiment'] == 'neutral')
    negative = sum(1 for c in matching if c['sentiment'] == 'negative')
    total = len(matching)

    return {
        'topic': topic_name,
        'positive': positive / total if total > 0 else 0,
        'neutral': neutral / total if total > 0 else 0,
        'negative': negative / total if total > 0 else 0,
        'total_comments': total
    }

# Usage
print(get_topic_sentiment("Protein"))
# Output: {'topic': 'Protein', 'positive': 0.60, 'neutral': 0.25, 'negative': 0.15, 'total_comments': 450}
```

---

**Last Updated**: January 8, 2026
**Version**: 1.0.0

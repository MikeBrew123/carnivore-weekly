# Carnivore Weekly Developer Guide

**Version**: 1.0.0
**Last Updated**: January 8, 2026
**For**: Developers, Designers, and Technical Team Members

This guide documents the architecture and implementation of the Bento Grid Homepage Redesign and its five core features.

---

## Table of Contents

1. [Feature Architecture Overview](#feature-architecture-overview)
2. [File Structure & Location](#file-structure--location)
3. [How to Modify Features](#how-to-modify-features)
4. [How to Add New Features](#how-to-add-new-features)
5. [API Integration Points](#api-integration-points)
6. [Database Schema](#database-schema)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## Feature Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│              CARNIVORE WEEKLY HOMEPAGE              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │     BENTO GRID LAYOUT (CSS Grid)            │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │ Hero Item (2x2 desktop, 2x1 tablet) │    │   │
│  │  │ - Weekly Content Integration        │    │   │
│  │  └─────────────────────────────────────┘    │   │
│  │  ┌────────────────────┐  ┌───────────────┐  │   │
│  │  │ Featured Item 1    │  │ Trending      │  │   │
│  │  │ (2x1 desktop)      │  │ Topics        │  │   │
│  │  └────────────────────┘  │ Explorer      │  │   │
│  │  ┌────┬────┬────────────┐│               │  │   │
│  │  │Std1│Std2│ Std 3      ││               │  │   │
│  │  │    │    │(1x1)       │└───────────────┘  │   │
│  │  └────┴────┴────────────┘                   │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Wiki Auto-Linker (JavaScript)             │   │
│  │  - Hover/Tap Definitions                   │   │
│  │  - Embedded in all content                 │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Sentiment Threads (API-Driven)            │   │
│  │  - Community perspective analysis          │   │
│  │  - Sentiment filtering UI                  │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘

BACKEND SERVICES:
├─ YouTube Data API (video collection)
├─ Anthropic Claude API (analysis)
├─ Sentiment Analysis Service (comment analysis)
├─ Wiki Database (definitions)
└─ GitHub Pages CDN (hosting)
```

### Technology Stack

**Frontend:**
- HTML5 semantic markup
- CSS3 Grid, Flexbox, Media Queries
- Vanilla JavaScript (ES6+)
- No framework dependencies (lightweight)
- Responsive design (mobile-first)

**Backend:**
- Python 3.9+ (automation scripts)
- Jinja2 (templating)
- YouTube Data API v3
- Anthropic Claude API
- GitHub Pages (static hosting)

**DevOps:**
- GitHub Actions (CI/CD)
- Git (version control)
- Black (Python formatting)
- ESLint (JavaScript linting)

---

## File Structure & Location

### Key Directory Structure

```
carnivore-weekly/
├── public/
│   ├── index.html                    # Generated homepage
│   ├── style.css                     # All styling (including bento grid)
│   ├── script.js                     # Shared functionality
│   ├── features.js                   # Wiki linker, sentiment UI
│   └── [theme-colors.css]            # Color scheme
│
├── templates/
│   ├── index_template.html           # Homepage template (Jinja2)
│   ├── components/
│   │   ├── bento_grid.html          # Grid structure
│   │   ├── trending_topics.html     # Trending topics component
│   │   ├── sentiment_threads.html   # Sentiment component
│   │   └── weekly_content.html      # Sarah's content component
│   └── partials/
│       ├── header.html
│       ├── footer.html
│       └── nav.html
│
├── scripts/
│   ├── generate_pages.py            # Main page generation
│   ├── youtube_collector.py         # Collects YouTube data
│   ├── content_analyzer.py          # Claude AI analysis
│   ├── add_sentiment.py             # Sentiment analysis
│   ├── answer_questions.py          # Q&A generation
│   └── utils/
│       ├── wiki_definitions.py      # Wiki term management
│       ├── sentiment_analyzer.py    # Comment sentiment
│       └── feature_helpers.py       # Feature utilities
│
├── data/
│   ├── youtube_data.json            # Collected videos
│   ├── analyzed_content.json        # Claude analysis
│   ├── wiki_definitions.json        # Linked term definitions
│   ├── sentiment_data.json          # Sentiment analysis results
│   └── archive/                     # Historical data
│
├── tests/
│   ├── test_bento_grid.py          # Grid layout tests
│   ├── test_sentiment.py           # Sentiment analysis tests
│   ├── test_wiki_linker.py         # Wiki linking tests
│   └── e2e_tests.py                # End-to-end tests
│
├── docs/
│   ├── FEATURES_OVERVIEW.md        # Feature descriptions
│   ├── USER_GUIDE.md               # User documentation
│   ├── DEVELOPER_GUIDE.md          # This file
│   ├── MAINTENANCE_GUIDE.md        # Operations guide
│   └── API_REFERENCE.md            # API documentation
│
└── .github/
    └── workflows/
        └── update.yml              # GitHub Actions workflow
```

### Critical Files for Each Feature

**Bento Grid Layout:**
- `public/style.css` (lines 462-841): Grid CSS
- `templates/components/bento_grid.html`: Grid markup structure
- `public/script.js`: Responsive event handlers

**Trending Topic Explorer:**
- `templates/components/trending_topics.html`: Component markup
- `public/features.js`: Topic filtering & interaction logic
- `scripts/analyze_trending.py`: Trending calculation
- `data/trending_data.json`: Topic rankings

**Wiki Auto-Linker:**
- `public/features.js`: Hover/tap definition system
- `scripts/utils/wiki_definitions.py`: Definition management
- `data/wiki_definitions.json`: All term definitions
- `public/style.css` (wiki styles section): Definition popup styling

**Sentiment Threads:**
- `templates/components/sentiment_threads.html`: UI component
- `public/features.js`: Sentiment filtering logic
- `scripts/utils/sentiment_analyzer.py`: Analysis engine
- `data/sentiment_data.json`: Analyzed sentiment data
- `public/style.css` (sentiment styles section): Styling

**Weekly Content Integration:**
- `templates/components/weekly_content.html`: Content markup
- `scripts/content_analyzer.py`: Sarah's content analysis (Claude)
- `data/weekly_content.json`: This week's content
- `public/script.js`: Expandable section handlers

---

## How to Modify Features

### Modifying the Bento Grid Layout

#### Change Grid Column Count

**File**: `/Users/mbrew/Developer/carnivore-weekly/public/style.css`

Find the `.bento-grid` class (around line 462):

```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* Change this number */
    gap: 40px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
```

**To change desktop columns to 4:**
```css
grid-template-columns: repeat(4, 1fr);  /* 4 columns instead of 3 */
```

**Then update tablet breakpoint:**
```css
@media (max-width: 1099px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);  /* Adjust to suit */
    }
}
```

**Impact**: Affects layout on desktop only. Test at 1400px viewport.

#### Change Grid Gap (Spacing)

**File**: Same file, `.bento-grid` class

```css
.bento-grid {
    gap: 40px;  /* Change this to 20px, 50px, etc. */
}
```

**Values to consider:**
- 20px: Tight, compact feel
- 30px: Balanced
- 40px: Current (generous, premium feel)
- 50px: Very spacious

**Then update media queries:**
```css
@media (max-width: 1099px) {
    gap: 30px;  /* Tablet gap */
}
@media (max-width: 767px) {
    gap: 20px;  /* Mobile gap */
}
```

#### Adjust Hero Item Size

**File**: Same file, `.bento-item--hero` class (around line 520)

```css
.bento-item--hero {
    grid-column: 2;
    grid-row: 2;
    min-height: 400px;  /* Change this */
}
```

**Common adjustments:**
- `min-height: 300px`: Shorter hero
- `min-height: 400px`: Current (default)
- `min-height: 500px`: Taller hero

**Remember to update all breakpoints** (tablet and mobile sections below).

#### Add a New Item Type

**To create a .bento-item--custom class:**

1. **Add the CSS** (in `public/style.css`):
```css
.bento-item--custom {
    grid-column: 1;  /* Spans 1 column */
    grid-row: 1;     /* Spans 1 row */
    min-height: 250px;
    /* Add hover, typography, etc. */
}

@media (max-width: 1099px) {
    .bento-item--custom {
        grid-column: 1;
        min-height: 200px;
    }
}

@media (max-width: 767px) {
    .bento-item--custom {
        grid-column: 1 !important;
        grid-row: auto;
        min-height: 180px;
    }
}
```

2. **Use in template** (e.g., `templates/components/bento_grid.html`):
```html
<div class="bento-item bento-item--custom">
    <!-- Your content here -->
</div>
```

3. **Test at all breakpoints** before deploying.

### Modifying Trending Topics

#### Change Topic Ranking Algorithm

**File**: `/Users/mbrew/Developer/carnivore-weekly/scripts/analyze_trending.py`

Find the ranking function (typically `rank_topics()` or similar):

```python
def rank_topics(comments_data):
    # Current: Rank by comment count
    trending = sorted(comments, key=lambda x: x['comment_count'], reverse=True)
    return trending[:5]  # Top 5 trending
```

**To rank by engagement (upvotes + replies):**
```python
def rank_topics(comments_data):
    scoring = [
        {
            'topic': c['topic'],
            'score': (c['upvotes'] * 2) + (c['reply_count'] * 1.5),  # Weighted
            'comment_count': c['comment_count']
        }
        for c in comments
    ]
    trending = sorted(scoring, key=lambda x: x['score'], reverse=True)
    return trending[:5]
```

**To rank by recency + engagement:**
```python
import datetime

def rank_topics(comments_data):
    scoring = []
    now = datetime.datetime.now()

    for c in comments:
        age_hours = (now - c['timestamp']).total_seconds() / 3600
        recency_score = 1 / (1 + age_hours)  # Newer = higher score
        engagement_score = c['upvotes'] + c['reply_count']

        final_score = (recency_score * 0.3) + (engagement_score * 0.7)
        scoring.append({'topic': c['topic'], 'score': final_score})

    trending = sorted(scoring, key=lambda x: x['score'], reverse=True)
    return trending[:5]
```

**After changes:**
1. Test locally: `python3 scripts/analyze_trending.py`
2. Check `data/trending_data.json` output
3. Verify results make sense
4. Update any related documentation

#### Change Number of Trending Topics Shown

**File**: `templates/components/trending_topics.html`

Find the loop that displays topics (typically something like):

```html
{% for topic in trending_topics[:5] %}  <!-- Change 5 to show different count -->
    <div class="trending-item">
        <!-- Content -->
    </div>
{% endfor %}
```

**To show 3 topics instead of 5:**
```html
{% for topic in trending_topics[:3] %}
```

**To show all topics:**
```html
{% for topic in trending_topics %}
```

#### Add Custom Filtering

**File**: `public/features.js`

Find the topic filtering function:

```javascript
function filterTrendingTopics(filterType, filterValue) {
    // Current filtering logic
    const filtered = topics.filter(t => t.type === filterType);
    renderTopics(filtered);
}
```

**To add category filtering:**
```javascript
function filterTrendingTopics(category) {
    const filtered = topics.filter(t => t.category === category);
    renderTopics(filtered);
    updateActiveFilter(category);
}

// Call it:
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterTrendingTopics(e.target.dataset.category);
    });
});
```

### Modifying Wiki Auto-Linker

#### Add New Wiki Terms

**File**: `/Users/mbrew/Developer/carnivore-weekly/data/wiki_definitions.json`

Format:
```json
{
    "terms": [
        {
            "term": "Ketosis",
            "definition": "Metabolic state where your body burns fat for fuel instead of carbohydrates.",
            "category": "Metabolic",
            "related": ["Ketones", "Fat adaptation"],
            "citation": "https://example.com/ketosis-study",
            "difficulty": "beginner"
        }
    ]
}
```

**Steps to add:**
1. Add new term object to the array
2. Include all fields (term, definition, category, related, citation, difficulty)
3. Run: `python3 scripts/validate_wiki.py` (checks format)
4. Test the new term appears in the UI

#### Change Definition Popup Styling

**File**: `/Users/mbrew/Developer/carnivore-weekly/public/style.css`

Find the `.wiki-popup` or `.definition-popup` class:

```css
.wiki-popup {
    background: white;
    border: 2px solid #8b4513;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    /* Modify any of these */
}
```

**Common customizations:**
- `background`: Change popup background color
- `padding`: Adjust internal spacing
- `border-radius`: Make corners more/less rounded
- `box-shadow`: Adjust shadow depth

#### Change How Definitions Are Triggered

**File**: `/Users/mbrew/Developer/carnivore-weekly/public/features.js`

Find the event handler (typically):

```javascript
// Current: Show on hover
document.addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('wiki-term')) {
        showDefinition(e.target);
    }
});

// Current: Show on tap (mobile)
document.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('wiki-term')) {
        showDefinition(e.target);
    }
});
```

**To show on click instead:**
```javascript
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('wiki-term')) {
        toggleDefinition(e.target);  // Toggle on/off
    }
});
```

**To show on long-press:**
```javascript
let pressTimer = null;

document.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('wiki-term')) {
        pressTimer = setTimeout(() => {
            showDefinition(e.target);
        }, 500);  // 500ms long press
    }
});

document.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
});
```

### Modifying Sentiment Threads

#### Change Sentiment Analysis

**File**: `/Users/mbrew/Developer/carnivore-weekly/scripts/utils/sentiment_analyzer.py`

Find the sentiment scoring function:

```python
def analyze_sentiment(comment_text):
    # Current simple approach
    if 'great' in comment_text.lower() or 'love' in comment_text.lower():
        return 'positive'
    elif 'problem' in comment_text.lower() or 'hate' in comment_text.lower():
        return 'negative'
    else:
        return 'neutral'
```

**To use more sophisticated scoring:**
```python
from anthropic import Anthropic

def analyze_sentiment(comment_text):
    client = Anthropic()
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=100,
        messages=[
            {
                "role": "user",
                "content": f"Analyze sentiment as 'positive', 'neutral', or 'negative': {comment_text}"
            }
        ]
    )
    return response.content[0].text.strip().lower()
```

**After changes:**
1. Test with sample comments
2. Run: `python3 scripts/add_sentiment.py` to reanalyze all comments
3. Check `data/sentiment_data.json` results
4. Validate accuracy manually on a sample

#### Change Sentiment Filter UI

**File**: `templates/components/sentiment_threads.html`

Find the filter buttons:

```html
<div class="sentiment-filters">
    <button class="filter-btn active" data-sentiment="all">All</button>
    <button class="filter-btn" data-sentiment="positive">Positive</button>
    <button class="filter-btn" data-sentiment="neutral">Neutral</button>
    <button class="filter-btn" data-sentiment="negative">Negative</button>
</div>
```

**To add additional filter (e.g., by recency):**
```html
<div class="sentiment-filters">
    <div class="filter-group">
        <label>By Sentiment:</label>
        <button class="filter-btn" data-sentiment="all">All</button>
        <!-- ... other sentiment buttons ... -->
    </div>
    <div class="filter-group">
        <label>By Time:</label>
        <button class="filter-btn" data--time="week">This Week</button>
        <button class="filter-btn" data-time="month">This Month</button>
    </div>
</div>
```

**Then update JavaScript to handle both filters:**
```javascript
let activeFilters = { sentiment: 'all', time: 'week' };

function updateFilters() {
    let filtered = sentimentThreads;

    if (activeFilters.sentiment !== 'all') {
        filtered = filtered.filter(t => t.sentiment === activeFilters.sentiment);
    }

    if (activeFilters.time !== 'all') {
        filtered = filterByTime(filtered, activeFilters.time);
    }

    renderThreads(filtered);
}
```

### Modifying Weekly Content

#### Change Content Structure

**File**: `scripts/content_analyzer.py`

Find the content generation function (typically `analyze_content()` or `generate_weekly_brief()`):

```python
def generate_weekly_brief(videos, comments_data):
    brief = {
        'headline': extract_headline(videos),
        'topics': extract_topics(videos, count=5),  # Change count
        'sarah_perspective': get_sarah_perspective(videos),
        'citations': extract_citations(videos)
    }
    return brief
```

**To change the number of topics (5 → 7):**
```python
'topics': extract_topics(videos, count=7),  # Now 7 topics
```

**To add a new section (e.g., action items):**
```python
def generate_weekly_brief(videos, comments_data):
    brief = {
        'headline': extract_headline(videos),
        'topics': extract_topics(videos, count=5),
        'action_items': generate_actions(videos),  # New
        'sarah_perspective': get_sarah_perspective(videos),
        'citations': extract_citations(videos)
    }
    return brief
```

**Then update the template** to display the new section.

#### Change Content Generation Prompt

**File**: `scripts/content_analyzer.py`

Find the Claude API prompt (typically in `analyze_content()` or similar):

```python
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=2000,
    system="""You are Sarah, a health coach with 20+ years of experience...
    Generate a weekly health briefing on carnivore diet...""",
    messages=[...]
)
```

**To add new instructions:**
```python
system="""You are Sarah, a health coach with 20+ years of experience...
Generate a weekly health briefing on carnivore diet.

IMPORTANT:
- Include 1-2 controversial perspectives to show nuance
- Add a "what the community is asking" section
- Emphasize evidence-based claims with citations
- Keep language accessible to beginners and experts
- Include at least one actionable insight readers can try this week"""
```

---

## How to Add New Features

### Process for Adding a New Feature

1. **Define Requirements**
   - What problem does this solve?
   - How will users interact with it?
   - What data does it need?

2. **Design & Plan**
   - Create mockups/wireframes
   - Plan database schema changes
   - Outline API endpoints needed
   - Estimate development time

3. **Implement Frontend**
   - Add HTML components
   - Style with CSS
   - Add JavaScript interactivity

4. **Implement Backend**
   - Update data generation scripts
   - Add API endpoints if needed
   - Update database schema

5. **Test**
   - Unit tests
   - Integration tests
   - E2E tests
   - Manual testing across devices

6. **Deploy**
   - Merge to main branch
   - Deploy via GitHub Actions
   - Monitor for issues

### Example: Adding a "Save for Later" Feature

#### Step 1: Define Requirements
- Users can bookmark articles
- Bookmarks saved in browser localStorage (no server needed)
- Show bookmark count on article cards
- Have a "Saved" section on homepage

#### Step 2: Design Database Schema

**localStorage schema:**
```json
{
    "bookmarks": [
        {
            "id": "video-123",
            "title": "Best Carnivore Resources",
            "url": "/path/to/article",
            "savedAt": "2026-01-08T10:30:00Z",
            "notes": "Optional user notes"
        }
    ]
}
```

#### Step 3: Implement Frontend

**Add to HTML** (`templates/components/bookmarks.html`):
```html
<div class="article-card">
    <h3>Article Title</h3>
    <button class="bookmark-btn" data-id="article-123">
        <span class="icon">☆</span> Save
    </button>
</div>

<section id="saved-articles" class="bento-item bento-item--featured">
    <h2>Your Saved Articles</h2>
    <div id="bookmarks-list"></div>
</section>
```

**Add CSS** (`public/style.css`):
```css
.bookmark-btn {
    background: none;
    border: 1px solid #8b4513;
    padding: 8px 16px;
    cursor: pointer;
    transition: all 0.3s;
}

.bookmark-btn.saved {
    background: #8b4513;
    color: white;
}

.bookmark-btn.saved::before {
    content: "★";  /* Filled star */
}

#bookmarks-list {
    display: grid;
    gap: 20px;
    margin-top: 20px;
}

.bookmark-item {
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: rgba(255,255,255,0.5);
}
```

**Add JavaScript** (`public/features.js`):
```javascript
// Initialize bookmarks
const bookmarks = {
    load() {
        const saved = localStorage.getItem('carnivore_bookmarks');
        return saved ? JSON.parse(saved) : [];
    },

    save(bookmarks) {
        localStorage.setItem('carnivore_bookmarks', JSON.stringify(bookmarks));
    },

    add(id, title, url) {
        const items = this.load();
        items.push({
            id,
            title,
            url,
            savedAt: new Date().toISOString(),
            notes: ''
        });
        this.save(items);
        updateBookmarkUI();
    },

    remove(id) {
        let items = this.load();
        items = items.filter(b => b.id !== id);
        this.save(items);
        updateBookmarkUI();
    },

    render() {
        const items = this.load();
        const list = document.getElementById('bookmarks-list');

        list.innerHTML = items.map(item => `
            <div class="bookmark-item" data-id="${item.id}">
                <h4><a href="${item.url}">${item.title}</a></h4>
                <small>Saved ${new Date(item.savedAt).toLocaleDateString()}</small>
                <button class="remove-btn" data-id="${item.id}">Remove</button>
            </div>
        `).join('');

        // Add remove listeners
        list.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                bookmarks.remove(e.target.dataset.id);
            });
        });
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    bookmarks.render();

    // Add bookmark buttons
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.article-card');
            const id = e.target.dataset.id;
            const title = card.querySelector('h3').textContent;
            const url = card.querySelector('a').href;

            if (btn.classList.contains('saved')) {
                bookmarks.remove(id);
                btn.classList.remove('saved');
            } else {
                bookmarks.add(id, title, url);
                btn.classList.add('saved');
            }
        });
    });
});

function updateBookmarkUI() {
    bookmarks.render();
    // Update bookmark button states
    const saved = bookmarks.load().map(b => b.id);
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        if (saved.includes(btn.dataset.id)) {
            btn.classList.add('saved');
        } else {
            btn.classList.remove('saved');
        }
    });
}
```

#### Step 4: Test
```bash
# Test bookmark adding/removing in console
bookmarks.add('test-1', 'Test Article', '/test')
bookmarks.load()  # Should show the article
bookmarks.remove('test-1')
bookmarks.load()  # Should be empty
```

#### Step 5: Deploy
```bash
git add .
git commit -m "Add bookmark/save feature"
git push
```

---

## API Integration Points

### YouTube Data API

**Purpose**: Collect video data from carnivore creators

**Endpoints Used:**
- `youtube.videos().list()` - Get video details
- `youtube.commentThreads().list()` - Get comments

**Integration File**: `scripts/youtube_collector.py`

**Configuration:**
```python
API_KEY = os.getenv('YOUTUBE_API_KEY')
CHANNEL_IDS = [
    'UCxxxxxx',  # Channel 1
    'UCyyyyyy',  # Channel 2
    # ... more channels
]

def collect_videos():
    youtube = build('youtube', 'v3', developerKey=API_KEY)
    videos = []

    for channel_id in CHANNEL_IDS:
        request = youtube.videos().list(
            part='snippet,statistics',
            channelId=channel_id,
            maxResults=50,
            order='date',
            publishedAfter=get_date_7_days_ago()
        )
        response = request.execute()
        videos.extend(response['items'])

    return videos
```

### Anthropic Claude API

**Purpose**: AI content analysis and generation

**Models Used:**
- `claude-3-5-sonnet-20241022` - Content analysis, weekly briefing generation

**Integration Files:**
- `scripts/content_analyzer.py` - Main analysis
- `scripts/answer_questions.py` - Q&A generation

**Example Usage:**
```python
from anthropic import Anthropic

def analyze_video_content(video):
    client = Anthropic()

    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1500,
        system="You are an expert health analyst...",
        messages=[
            {
                "role": "user",
                "content": f"Analyze this carnivore video: {video['title']}"
            }
        ]
    )

    return response.content[0].text
```

**Configuration**: Set `ANTHROPIC_API_KEY` in `.env`

### Sentiment Analysis Service

**Purpose**: Analyze sentiment of comments

**Integration Files:**
- `scripts/add_sentiment.py`
- `scripts/utils/sentiment_analyzer.py`

**Current Implementation**:
- Keyword-based (fast, simple)
- Can be upgraded to Claude API or external service

**Upgrade to Claude:**
```python
def analyze_sentiment_with_claude(comment):
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=50,
        messages=[
            {
                "role": "user",
                "content": f"Rate sentiment (positive/neutral/negative): {comment}"
            }
        ]
    )
    return response.content[0].text.strip().lower()
```

---

## Database Schema

### data/youtube_data.json

**Purpose**: Store collected video metadata

**Schema:**
```json
{
    "collected_at": "2026-01-08T10:00:00Z",
    "videos": [
        {
            "id": "dQw4w9WgXcQ",
            "channel_id": "UCxxxxxx",
            "channel_name": "Creator Name",
            "title": "Video Title",
            "description": "Full description...",
            "published_at": "2026-01-05T14:30:00Z",
            "thumbnail": "https://...",
            "view_count": 5000,
            "like_count": 250,
            "comment_count": 45,
            "duration": "PT12M34S",
            "url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
        }
    ]
}
```

### data/analyzed_content.json

**Purpose**: Store Claude analysis results

**Schema:**
```json
{
    "analyzed_at": "2026-01-08T10:30:00Z",
    "content": [
        {
            "video_id": "dQw4w9WgXcQ",
            "summary": "AI-generated summary...",
            "key_points": ["Point 1", "Point 2"],
            "health_claims": ["Claim 1", "Claim 2"],
            "questions": [
                {
                    "question": "Q: What about xyz?",
                    "answer": "A: Research shows...",
                    "citation": "https://..."
                }
            ],
            "tone": "educational",
            "difficulty_level": "beginner"
        }
    ]
}
```

### data/sentiment_data.json

**Purpose**: Store sentiment analysis results

**Schema:**
```json
{
    "analyzed_at": "2026-01-08T10:45:00Z",
    "comments": [
        {
            "id": "comment-123",
            "video_id": "dQw4w9WgXcQ",
            "author": "Username",
            "text": "Comment text...",
            "sentiment": "positive",
            "confidence": 0.92,
            "likes": 15,
            "published_at": "2026-01-06T10:00:00Z"
        }
    ],
    "summary": {
        "positive_count": 30,
        "neutral_count": 10,
        "negative_count": 5,
        "sentiment_distribution": {
            "positive": 0.750,
            "neutral": 0.250,
            "negative": 0.125
        }
    }
}
```

### data/wiki_definitions.json

**Purpose**: Store health term definitions for the Wiki Auto-Linker

**Schema:**
```json
{
    "updated_at": "2026-01-08T11:00:00Z",
    "terms": [
        {
            "id": "term-001",
            "term": "Ketosis",
            "definition": "Metabolic state...",
            "category": "Metabolic",
            "difficulty": "beginner",
            "related_terms": ["Ketones", "Fat adaptation"],
            "scientific_name": "Nutritional ketosis",
            "citation": "https://pubmed.ncbi.nlm.nih.gov/...",
            "examples": [
                "After 24-48 hours of fasting, most people enter ketosis"
            ],
            "image_url": "https://cdn.../ketosis-diagram.png",
            "last_updated": "2025-12-30"
        }
    ]
}
```

### data/trending_data.json

**Purpose**: Store trending topic calculations

**Schema:**
```json
{
    "calculated_at": "2026-01-08T11:15:00Z",
    "trending": [
        {
            "rank": 1,
            "topic": "Protein Intake",
            "mention_count": 45,
            "comment_count": 200,
            "engagement_score": 850,
            "sentiment": {
                "positive": 0.60,
                "neutral": 0.25,
                "negative": 0.15
            },
            "related_videos": ["video-id-1", "video-id-2"],
            "sample_discussions": [
                "How much protein do I really need?",
                "Protein timing matters"
            ],
            "trend_direction": "up",
            "trend_velocity": 1.25
        }
    ]
}
```

---

## Common Issues & Solutions

### Feature Not Loading

**Problem**: A feature (trending topics, sentiment, etc.) isn't showing on the page

**Diagnosis:**
1. Check browser console for JavaScript errors
2. Check network tab to see if data files loaded
3. Verify file paths in the template

**Solutions:**

```bash
# 1. Check if data files exist
ls -la data/trending_data.json
ls -la data/sentiment_data.json

# 2. Validate JSON format
python3 -m json.tool data/trending_data.json  # Will error if invalid

# 3. Check if template includes the component
grep -n "trending_topics" templates/index_template.html

# 4. Regenerate pages with latest data
python3 scripts/generate_pages.py

# 5. Clear browser cache and reload
# Chrome: Ctrl+Shift+R
# Safari: Cmd+Shift+R
```

### Styling Issues

**Problem**: Grid doesn't look right, items overlapping, or responsive breakpoints not working

**Solution:**

```bash
# 1. Check CSS is being loaded
# In browser DevTools → Inspect element → find computed styles

# 2. Validate CSS syntax
python3 -c "import css_parser; parser = css_parser.CSSParser(); parser.parseFile('public/style.css')"

# 3. Check media query breakpoints
# Desktop: width > 1100px
# Tablet: 768px < width < 1100px
# Mobile: width < 768px

# 4. Test at actual breakpoints
# Desktop: 1400px wide
# Tablet: 768-1099px
# Mobile: 375-767px
```

### API Rate Limits

**Problem**: YouTube or Claude API calls failing with rate limit errors

**Solutions:**

**YouTube:**
- Default quota: 10,000 units/day
- Each video details request: 1 unit
- Each comment request: 1-10 units
- Solution: Cache results, request less frequently

```python
import time

def collect_with_backoff():
    for channel_id in CHANNEL_IDS:
        try:
            # Make request
            response = youtube.videos().list(...).execute()
        except HttpError as e:
            if e.resp.status == 403:  # Quota exceeded
                print("Rate limited. Waiting 24 hours...")
                time.sleep(86400)
                continue
```

**Claude:**
- Model: `claude-3-5-sonnet-20241022`
- Quota: 100,000 tokens/minute (for Sonnet)
- Solution: Use smaller models for simple tasks, batch requests

```python
# Batch requests to respect rate limits
def analyze_in_batches(videos, batch_size=10):
    for i in range(0, len(videos), batch_size):
        batch = videos[i:i+batch_size]
        for video in batch:
            analyze_video(video)
        time.sleep(2)  # Delay between batches
```

### Data Corruption

**Problem**: JSON files corrupted, features showing empty or broken

**Recovery:**

```bash
# 1. Backup current data
cp data/youtube_data.json data/youtube_data.json.backup

# 2. Validate JSON files
python3 -m json.tool data/*.json

# 3. If invalid, regenerate from source
python3 scripts/youtube_collector.py
python3 scripts/content_analyzer.py
python3 scripts/add_sentiment.py
python3 scripts/generate_pages.py

# 4. Compare with backup
diff data/youtube_data.json data/youtube_data.json.backup
```

### Performance Issues

**Problem**: Page loading slowly or features lagging

**Solutions:**

```bash
# 1. Check page size
du -h public/index.html  # Should be < 500KB

# 2. Check for large images
find public -name "*.jpg" -o -name "*.png" | xargs ls -lh

# 3. Minimize CSS
# In public/style.css, remove unused styles

# 4. Defer non-critical JavaScript
# In public/index.html, add defer attribute to non-essential scripts

# 5. Test Core Web Vitals
# Use: https://pagespeed.web.dev/
# Goal: LCP < 2.5s, INP < 200ms, CLS < 0.1
```

### Mobile Responsiveness

**Problem**: Site looks bad on mobile, text too small, content cut off

**Debug:**

```css
/* Add temporary grid lines to debug layout */
.bento-grid {
    border: 1px solid red;
    background-image: linear-gradient(#f0f0f0 1px, transparent 1px);
}

.bento-item {
    border: 1px solid blue;
    min-height: 100px;  /* Make items visible */
}
```

Then test at actual mobile sizes:
- iPhone SE: 375px
- iPhone 12: 390px
- iPhone 14 Pro Max: 430px
- iPad: 768px
- iPad Pro: 1024px

**Common fixes:**

```css
/* Ensure text is readable on mobile */
@media (max-width: 767px) {
    body { font-size: 16px; }  /* Never smaller */
    h1 { font-size: 24px; }
    .bento-item { padding: 12px; }  /* Not 30px */
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
python3 -m pytest tests/

# Run specific test file
python3 -m pytest tests/test_bento_grid.py -v

# Run with coverage
python3 -m pytest tests/ --cov=scripts/
```

### Adding New Tests

**Example test file:** `tests/test_new_feature.py`

```python
import unittest
from scripts.new_feature import analyze_data

class TestNewFeature(unittest.TestCase):

    def test_basic_functionality(self):
        """Test that feature works with valid input"""
        result = analyze_data({'key': 'value'})
        self.assertIsNotNone(result)

    def test_error_handling(self):
        """Test that feature handles invalid input gracefully"""
        with self.assertRaises(ValueError):
            analyze_data(None)

if __name__ == '__main__':
    unittest.main()
```

---

## Deployment

### Local Testing

```bash
# 1. Run automation script
./run_weekly_update.sh

# 2. Preview locally
python3 -m http.server 8000
# Visit http://localhost:8000/public/

# 3. Check results
open public/index.html  # Mac
# or
start public/index.html  # Windows
```

### Deploying to Production

```bash
# 1. Commit changes
git add .
git commit -m "Feature: Add new widget"

# 2. Push to GitHub
git push origin main

# 3. GitHub Actions runs automatically
# Check: https://github.com/MikeBrew123/carnivore-weekly/actions/

# 4. Site updates at: https://carnivoreweekly.com (in ~1 minute)
```

---

**Last Updated**: January 8, 2026
**Version**: 1.0.0

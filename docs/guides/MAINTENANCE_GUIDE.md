# Carnivore Weekly Maintenance Guide

**Version**: 1.0.0
**Last Updated**: January 8, 2026
**For**: Operations, Maintenance, and Admin Team

This guide covers day-to-day operations, maintenance tasks, and troubleshooting for Carnivore Weekly.

---

## Table of Contents

1. [Weekly Maintenance Tasks](#weekly-maintenance-tasks)
2. [Data Management](#data-management)
3. [Feature Maintenance](#feature-maintenance)
4. [Performance Monitoring](#performance-monitoring)
5. [Scaling Considerations](#scaling-considerations)
6. [Backup Procedures](#backup-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Weekly Maintenance Tasks

### Monday Morning Checklist (Pre-Publication)

Before publishing the weekly update, follow this checklist:

#### 1. Run the Weekly Update Script (1 hour)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
./run_weekly_update.sh
```

This automatically:
- Collects videos from YouTube (past 7 days)
- Analyzes content with Claude AI
- Performs sentiment analysis on comments
- Generates Q&A with citations
- Updates trending topics
- Generates HTML pages
- Creates archive entries

**Expected output:**
```
✅ YouTube data collected (45 videos)
✅ Content analyzed (Claude API used)
✅ Sentiment analysis complete
✅ Trending topics calculated
✅ Pages generated
✅ Archive updated
✅ All systems ready for publication
```

**If script fails:** See [Troubleshooting](#troubleshooting) section

#### 2. Validate Content Quality (1 hour)

**Use the copy editor tool:**
```bash
/copy-editor
```

**Checks for:**
- AI detection (no em-dashes, "delve", "robust", etc.)
- Sentence structure variety
- Natural contractions
- Conversational tone
- Specific examples vs. generic statements

**Expected output:** "All content passes copy editor standards" or list of issues to fix

**Use the brand validation tool:**
```bash
/carnivore-brand
```

**Checks for:**
- Voice consistency (matches Carnivore Weekly tone)
- Evidence-based claims (backed by data/research)
- No excessive praise or hype
- Persona authenticity (Sarah, Marcus, Chloe)
- Professional but accessible tone

**Expected output:** "All content aligned with brand standards" or list of issues

#### 3. Manual Spot Checks (30 minutes)

1. **Open the generated page:**
   ```bash
   open public/index.html  # Mac
   # or
   start public/index.html  # Windows
   ```

2. **Visual checks:**
   - [ ] Trending topics look reasonable (not spam/nonsensical)
   - [ ] Sarah's content is present and compelling
   - [ ] No broken images
   - [ ] Grid layout looks clean on desktop
   - [ ] Links work correctly
   - [ ] Video thumbnails display properly

3. **Content checks:**
   - [ ] No typos in headlines
   - [ ] Claims are evidence-based
   - [ ] Links go to correct URLs
   - [ ] Author attributions are correct

4. **Responsiveness checks:**
   - [ ] Test on mobile (375px viewport)
   - [ ] Test on tablet (768px viewport)
   - [ ] Test on desktop (1400px viewport)
   - [ ] No content overlapping
   - [ ] Readable font sizes on all devices

#### 4. Deploy to Production (15 minutes)

If all checks pass:

```bash
git add .
git commit -m "Weekly content update - $(date +%Y-%m-%d)"
git push origin main
```

**Site goes live:** ~1-2 minutes after push (GitHub Pages)

**Verify deployment:**
1. Visit https://carnivoreweekly.com
2. Check that new content is visible
3. Verify no error messages
4. Test key features work

#### 5. Post-Publication Monitoring (30 minutes)

After going live:

1. **Monitor for errors:**
   ```bash
   # Check GitHub deployment status
   # Navigate to Actions tab → Latest run
   ```

2. **Check site status:**
   - Verify homepage loads (< 3 seconds)
   - Check trending topics display
   - Verify Sarah's content visible
   - Test links on mobile

3. **Monitor analytics:**
   - Check Google Analytics (carnivoreweekly.com)
   - Look for spike in page views
   - Check for any error tracking (if configured)

4. **Social media:**
   - Post announcement (if configured)
   - Share trending topics
   - Invite community engagement

---

## Data Management

### Trending Topics

#### How Trending Topics Are Generated

**File**: `scripts/analyze_trending.py`

**Process:**
1. Collects all YouTube comments from videos
2. Extracts topics/keywords mentioned
3. Calculates engagement score (comment count + replies + upvotes)
4. Ranks by engagement
5. Filters out low-quality/spam topics
6. Outputs top 5 trending topics

**Output**: `data/trending_data.json`

#### Updating Trending Topics Manually

**If automatic calculation fails or seems wrong:**

1. **Review the data:**
   ```bash
   python3 -c "import json; print(json.dumps(json.load(open('data/trending_data.json')), indent=2))"
   ```

2. **Recalculate from scratch:**
   ```bash
   # Requires YouTube data to exist
   python3 scripts/analyze_trending.py
   ```

3. **Manually adjust if needed:**
   ```bash
   # Edit the JSON directly
   nano data/trending_data.json
   ```

4. **Regenerate pages:**
   ```bash
   python3 scripts/generate_pages.py
   ```

#### Filtering Spam/Low-Quality Topics

**In `scripts/analyze_trending.py`, add filter:**

```python
def filter_spam_topics(topics):
    """Remove spam, low-engagement, or off-topic items"""

    filtered = []
    for topic in topics:
        # Skip if too few mentions
        if topic['mention_count'] < 3:
            continue

        # Skip known spam keywords
        spam_keywords = ['click here', 'buy now', 'free download', 'viagra']
        if any(keyword in topic['name'].lower() for keyword in spam_keywords):
            continue

        # Skip if not health-related
        health_keywords = ['diet', 'health', 'carnivore', 'protein', 'metabolic']
        if not any(keyword in topic['name'].lower() for keyword in health_keywords):
            continue

        filtered.append(topic)

    return filtered
```

### Sentiment Data

#### How Sentiment Is Calculated

**File**: `scripts/utils/sentiment_analyzer.py`

**Process:**
1. Takes each YouTube comment
2. Analyzes text for sentiment indicators
3. Assigns: positive, neutral, or negative
4. Calculates confidence score
5. Outputs sentiment for each comment

**Current method**: Keyword-based (fast, simple)
**Available upgrade**: Claude API (more accurate)

#### Refreshing Sentiment Data

**To reanalyze all comments:**

```bash
python3 scripts/add_sentiment.py
```

**This:**
- Reads all collected YouTube comments
- Reanalyzes sentiment for each
- Overwrites `data/sentiment_data.json`
- Generates updated summary statistics

**Time:** ~1-5 minutes depending on comment volume

**Expected output:**
```
Processing 500 comments...
✅ 375 positive (75%)
✅ 100 neutral (20%)
✅ 25 negative (5%)
Sentiment analysis complete
```

#### Adjusting Sentiment Thresholds

**If sentiment analysis seems off-calibrated:**

```python
# In scripts/utils/sentiment_analyzer.py

def calculate_sentiment_score(text):
    """Score text sentiment from -1 (very negative) to +1 (very positive)"""

    positive_words = ['great', 'love', 'amazing', 'helpful', 'perfect', 'excellent']
    negative_words = ['hate', 'terrible', 'awful', 'useless', 'broken', 'scam']

    score = 0
    for word in text.lower().split():
        if word in positive_words:
            score += 1
        elif word in negative_words:
            score -= 1

    # Normalize to 0-1 range
    if score > 0.5:
        return 'positive'
    elif score < -0.5:
        return 'negative'
    else:
        return 'neutral'
```

**Adjust thresholds:**
- Lower threshold (e.g., 0.3): More items classified as positive/negative
- Higher threshold (e.g., 0.7): Stricter classification, more neutral

### Wiki Definitions

#### How Wiki Definitions Work

**File**: `data/wiki_definitions.json`

**Process:**
1. Store health/nutrition term definitions
2. System identifies terms in content
3. Links are created for interactive definitions
4. Users hover/tap to see definition

#### Adding New Wiki Terms

```bash
# 1. Edit the JSON file
nano data/wiki_definitions.json

# 2. Add new term (follow existing format)
{
    "id": "term-XXX",
    "term": "New Term",
    "definition": "1-2 sentence definition",
    "category": "Nutrition",  # or Metabolic, Health, Lifestyle
    "difficulty": "beginner",
    "related_terms": ["Related1", "Related2"],
    "citation": "https://example.com/research",
    "examples": ["Example 1", "Example 2"],
    "last_updated": "2026-01-08"
}

# 3. Validate JSON syntax
python3 -m json.tool data/wiki_definitions.json > /dev/null && echo "Valid JSON"

# 4. Regenerate pages
python3 scripts/generate_pages.py
```

#### Removing Outdated Terms

```bash
# 1. Find the term in data/wiki_definitions.json
# 2. Delete the entire term object
# 3. Regenerate pages
python3 scripts/generate_pages.py
```

#### Updating Existing Definitions

```bash
# 1. Find the term
grep -n "Ketosis" data/wiki_definitions.json

# 2. Edit the definition
nano data/wiki_definitions.json

# 3. Update the text and last_updated date
# 4. Regenerate pages
python3 scripts/generate_pages.py
```

#### Popular Terms to Define

Common terms readers ask about:
- Metabolic Adaptation
- Autophagy
- Ketosis
- Bioavailability
- Gluconeogenesis
- Macro/Micronutrients
- Amino Acids
- Digestibility
- Satiety
- Insulin Sensitivity

---

## Feature Maintenance

### Weekly Content (Sarah's Briefing)

#### Structure

Each week's content includes:
- Featured headline (1 sentence)
- 5-7 health topics
- Each topic has: summary, insight, "learn more" link
- Research citations for claims
- Related community sentiment links

#### Updating for Next Week

**Schedule:**
- Create draft: Friday before week
- Final review: Sunday before week
- Publish: Monday morning with other content

**Steps:**

1. **Check what the community is discussing:**
   ```bash
   # Look at trending_data.json
   python3 -c "import json; print(json.dumps(json.load(open('data/trending_data.json')), indent=2))"
   ```

2. **Identify 5-7 topics for Sarah to cover:**
   - Check trending topics
   - Review community Q&A
   - Consider timely health news
   - Mix of different health aspects

3. **Brief Sarah (or AI system):**
   - Send topic list
   - Include recent comments/questions from community
   - Provide any recent research to reference

4. **Generate content:**
   - System uses Claude to create analysis
   - Sarah reviews and approves
   - Edits for accuracy and tone

5. **Add to system:**
   - Content is stored in `data/weekly_content.json`
   - Regenerate pages
   - Deploy

#### Adjusting Content Prompt

**File**: `scripts/content_analyzer.py`

The system prompt tells Claude how to generate Sarah's content:

```python
SARAH_SYSTEM_PROMPT = """You are Sarah, a health coach with 20+ years of experience in carnivore nutrition and metabolic health.

Your voice is:
- Direct and clear (no corporate jargon)
- Evidence-based (cite research, not opinions)
- Practical (focus on actionable insights)
- Balanced (acknowledge nuance and different perspectives)
- Warm but professional

Your weekly briefing should:
1. Address trending community topics
2. Provide evidence-based health insights
3. Include 5-7 health topics
4. Each topic: 100-150 word summary + 1-2 sentence key insight
5. Include scientific citations where relevant
6. Acknowledge when there's disagreement in research
7. End with 1-2 actionable items readers can try this week

Style guide:
- No corporate phrases: avoid 'delve', 'robust', 'leverage', 'navigate'
- Use contractions: "it's" not "it is"
- Vary sentence length (2-20 words)
- Use specific examples, not generalizations
- Direct address: 'you', 'your' not 'users', 'one'
"""
```

**To adjust the tone:**
1. Edit the prompt above
2. Regenerate content: `python3 scripts/content_analyzer.py`
3. Review and approve changes

### Trending Topics

#### Automatic Calculation Issues

**Problem**: Trending topics look weird or irrelevant

**Solution 1: Check source data**
```bash
# Are comments being collected?
python3 -c "import json; data = json.load(open('data/youtube_data.json')); print(f'Videos: {len(data[\"videos\"])}')"

# Check if comments were analyzed
python3 -c "import json; data = json.load(open('data/sentiment_data.json')); print(f'Comments: {len(data[\"comments\"])}')"
```

**Solution 2: Recalculate**
```bash
python3 scripts/analyze_trending.py
```

**Solution 3: Manual override**
```bash
# Edit trending_data.json directly
nano data/trending_data.json

# Change the order/content of trending topics
# Then regenerate pages
python3 scripts/generate_pages.py
```

### Sentiment Threads

#### Updating Sentiment Data

```bash
# Reanalyze all comments
python3 scripts/add_sentiment.py

# This creates fresh sentiment analysis
# Regenerate pages to show new data
python3 scripts/generate_pages.py
```

#### Checking Sentiment Accuracy

**Manual spot check:**

```bash
# Get a sample comment
python3 -c "
import json
data = json.load(open('data/sentiment_data.json'))
for comment in data['comments'][:5]:
    print(f\"Comment: {comment['text'][:100]}...\")
    print(f\"Sentiment: {comment['sentiment']}\")
    print('---')
"
```

**Does the sentiment match the comment?**
- If yes: System is working well
- If no: Consider adjusting sentiment algorithm (see DEVELOPER_GUIDE.md)

### Wiki Auto-Linker

#### Checking Which Terms Are Linked

```bash
# Count how many terms are defined
python3 -c "import json; data = json.load(open('data/wiki_definitions.json')); print(f'Total terms: {len(data[\"terms\"])}')"

# Find terms in a specific category
python3 -c "
import json
data = json.load(open('data/wiki_definitions.json'))
nutrition = [t for t in data['terms'] if t['category'] == 'Nutrition']
print(f'Nutrition terms: {len(nutrition)}')
for t in nutrition[:5]:
    print(f'  - {t[\"term\"]}')"
```

#### Adding Terms the Community Asks About

**Process:**
1. Review community comments for questions
2. Extract terms being asked about
3. Create definitions for these terms
4. Add to `data/wiki_definitions.json`
5. Regenerate pages

**Example:**
```bash
# Community is asking: "What is metabolic rate?"
# Add to wiki_definitions.json:
{
    "id": "term-024",
    "term": "Metabolic Rate",
    "definition": "The amount of energy (calories) your body burns daily at rest.",
    "category": "Metabolic",
    "difficulty": "beginner",
    "related_terms": ["Metabolism", "Basal Metabolic Rate", "Thermic Effect"],
    "citation": "https://pubmed.ncbi.nlm.nih.gov/...",
    "examples": ["A 70kg person might have a metabolic rate of ~1500 calories/day"],
    "last_updated": "2026-01-08"
}

# Regenerate
python3 scripts/generate_pages.py
```

---

## Performance Monitoring

### Core Web Vitals (Google Metrics)

**Target metrics** (as of January 2026):

| Metric | Target | Current |
|--------|--------|---------|
| **LCP** (Largest Contentful Paint) | < 2.5s | ~2.3s |
| **INP** (Interaction to Next Paint) | < 200ms | ~150ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | ~0.05 |

**Check metrics:**

1. **Google PageSpeed Insights:**
   ```
   https://pagespeed.web.dev/
   Enter: https://carnivoreweekly.com
   ```

2. **Local testing:**
   ```bash
   # Install Lighthouse CLI
   npm install -g lighthouse

   # Run report
   lighthouse https://carnivoreweekly.com --view
   ```

### Load Time Monitoring

**Weekly checks:**

```bash
# Measure page load time
curl -w "@curl-format.txt" -o /dev/null -s https://carnivoreweekly.com

# Or using curl directly:
curl -w "Total time: %{time_total}s\n" -o /dev/null -s https://carnivoreweekly.com
```

**Expected:** < 3 seconds

**If slower:**
1. Check server status (GitHub Pages)
2. Check page size: `du -h public/index.html`
3. Check image sizes: `find public -name "*.jpg" | xargs du -h`
4. Run `./run_weekly_update.sh` to regenerate

### Uptime Monitoring

**Check if site is live:**

```bash
# Check status
curl -I https://carnivoreweekly.com | grep HTTP

# Expected: HTTP/2 200 (or HTTP/1.1 200)
```

**If getting errors:**
1. Check GitHub Pages status: https://www.githubstatus.com/
2. Verify DNS: `nslookup carnivoreweekly.com`
3. Check GitHub repo: https://github.com/MikeBrew123/carnivore-weekly

### Analytics Monitoring

**Check Google Analytics:**

1. Go to: https://analytics.google.com
2. Select Carnivore Weekly property
3. Monitor:
   - Daily users (goal: growth)
   - Page views per session (goal: > 2)
   - Bounce rate (goal: < 50%)
   - Time on page (goal: > 2 minutes)
   - Top traffic sources

**Weekly report:**
- Compare this week vs. last week
- Note any significant changes
- Investigate traffic spikes/drops

---

## Scaling Considerations

### Current Capacity

**Site serves:** ~1000 weekly visitors
**Server:** GitHub Pages (unlimited traffic, ~100GB limit)
**Bandwidth:** Unlimited
**Database:** JSON files (~2MB total)

### When to Consider Scaling

**Trigger 1: Page load time > 5 seconds**
- Issue: File size grew too large
- Solution: Split `index.html` into multiple pages, archive old weeks

**Trigger 2: Build time > 30 seconds**
- Issue: Too many videos/comments to process
- Solution: Implement database, batch processing, caching

**Trigger 3: Storage approaching 100GB**
- Issue: Years of archived content too large
- Solution: Implement proper database (PostgreSQL, MongoDB), S3 for archives

**Trigger 4: Manual updates taking > 2 hours**
- Issue: Too much data to process manually
- Solution: Implement better automation, add job queue (Celery, Bull)

### Recommended Upgrades

**Stage 1: Database (~2-5K visitors)**
- Current: JSON files
- Recommended: SQLite (local) or PostgreSQL (cloud)
- Benefit: Faster queries, better data organization

```sql
-- Example schema
CREATE TABLE videos (
    id TEXT PRIMARY KEY,
    channel_id TEXT,
    title TEXT,
    published_at TIMESTAMP,
    view_count INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    video_id TEXT REFERENCES videos(id),
    author TEXT,
    text TEXT,
    sentiment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trending_topics (
    id TEXT PRIMARY KEY,
    topic_name TEXT,
    engagement_score INT,
    calculated_at TIMESTAMP,
    week_of DATE
);
```

**Stage 2: Content Delivery Network (~10K visitors)**
- Current: GitHub Pages
- Recommended: Cloudflare Pages or Vercel
- Benefit: Faster global delivery, edge caching, automatic scaling

**Stage 3: Advanced Analytics (~50K visitors)**
- Add session tracking
- Implement feature usage analytics
- Track sentiment thread engagement
- A/B test trending topic display

**Stage 4: Real-time Features (~100K+ visitors)**
- Live trending topics (calculated continuously)
- Real-time community discussions
- Requires: WebSocket server, Redis cache, database

---

## Backup Procedures

### Manual Backup

**Weekly backup (after publication):**

```bash
# Create dated backup
mkdir -p backups
cp -r data/ backups/data-$(date +%Y-%m-%d)/
cp -r public/ backups/public-$(date +%Y-%m-%d)/
cp -r templates/ backups/templates-$(date +%Y-%m-%d)/

# Verify backup
ls -la backups/
```

### Automated Backup

**Using GitHub:**

Everything is already in GitHub. To recover:

```bash
# Clone entire history
git clone https://github.com/MikeBrew123/carnivore-weekly.git carnivore-weekly-backup

# Check commit history
git log --oneline | head -20

# Restore specific version
git checkout abc123def456  # Commit hash
```

### Data Recovery Scenarios

**Scenario 1: Last week's data corrupted**

```bash
# Restore from previous commit
git log --oneline | grep "Weekly"  # Find commits

# Show specific commit
git show abc123:data/youtube_data.json > data/youtube_data.json

# Regenerate
python3 scripts/generate_pages.py
```

**Scenario 2: Entire repo corrupted**

```bash
# Clone from GitHub backup
rm -rf carnivore-weekly
git clone https://github.com/MikeBrew123/carnivore-weekly.git
cd carnivore-weekly

# Restore latest content
python3 scripts/generate_pages.py
```

**Scenario 3: Lost historical data (archives)**

```bash
# Check archive in git history
git log --oneline -- "archive/"  # See archive commits

# Restore specific archive version
git show abc123:archive/2025-12-28.html > public/archive/2025-12-28.html
```

---

## Troubleshooting

### Common Issues & Quick Fixes

| Problem | Symptom | Solution |
|---------|---------|----------|
| **Script fails** | Error running `run_weekly_update.sh` | See script logs, check API keys |
| **YouTube API rate limit** | 403 error from YouTube | Wait 24 hours, reduce video requests |
| **Claude API rate limit** | Timeout analyzing content | Wait, reduce batch size, use cheaper model |
| **JSON corrupted** | `json.decoder.JSONDecodeError` | Restore from GitHub, regenerate |
| **Site won't update** | GitHub push succeeds but site not updated | Hard refresh browser (Cmd+Shift+R) |
| **Trending topics blank** | Trending section empty on homepage | Run `python3 scripts/analyze_trending.py` |
| **Sentiment not showing** | No sentiment data displayed | Run `python3 scripts/add_sentiment.py` |
| **Wiki terms not linking** | Words not clickable in content | Check `wiki_definitions.json` exists |

### Detailed Troubleshooting

#### Issue: Script Fails with "YouTube API key error"

**Check:**
```bash
# Verify .env file exists
ls -la .env

# Check API key is set
grep YOUTUBE_API_KEY .env

# Verify it's valid (can test with curl)
curl "https://www.googleapis.com/youtube/v3/videos?part=snippet&key=YOUR_KEY&id=test"
```

**Fix:**
```bash
# 1. Create .env if missing
cp .env.example .env

# 2. Add your actual API keys
nano .env

# 3. Test the script
python3 scripts/youtube_collector.py
```

#### Issue: Claude API Timeout or Error

**Check:**
```bash
# Verify API key
grep ANTHROPIC_API_KEY .env

# Test API connection
python3 -c "from anthropic import Anthropic; print('API working')"
```

**Fix:**
```bash
# 1. Check API quota/limits at https://console.anthropic.com/

# 2. Reduce token usage (use smaller batches):
# Edit scripts/content_analyzer.py
# Change max_tokens from 2000 to 1000

# 3. Try smaller model
# Use "claude-3-haiku-20240307" instead of "claude-3-5-sonnet"

# 4. Try again
python3 scripts/content_analyzer.py
```

#### Issue: Site Shows "404 Not Found"

**Check:**
```bash
# Verify public/index.html exists
ls -la public/index.html

# Check file size (shouldn't be 0)
du -h public/index.html

# Verify it's valid HTML
head -10 public/index.html | grep "DOCTYPE"
```

**Fix:**
```bash
# Regenerate pages
python3 scripts/generate_pages.py

# Commit and push
git add public/index.html
git commit -m "Regenerate homepage"
git push

# Wait 1-2 minutes for GitHub Pages to update
```

#### Issue: New Content Doesn't Appear on Live Site

**Check:**
```bash
# 1. Is the file updated locally?
git status

# 2. Is it committed?
git log -1 --format="%H %s"

# 3. Is it pushed?
git remote -v  # Should show GitHub
git status     # Should show "Your branch is up to date"

# 4. GitHub Pages building?
# Check: https://github.com/MikeBrew123/carnivore-weekly/actions/
```

**Fix:**
```bash
# 1. Hard refresh in browser
# Chrome/Firefox: Ctrl+Shift+R
# Safari: Cmd+Shift+R

# 2. Force regenerate and push
python3 scripts/generate_pages.py
git add .
git commit -m "Force regenerate content"
git push

# 3. Wait 2-3 minutes for rebuild
# Check Actions tab for build progress
```

#### Issue: "Trending Topics" Section Empty

**Check:**
```bash
# Does trending data exist?
ls -la data/trending_data.json

# Is it valid JSON?
python3 -m json.tool data/trending_data.json > /dev/null && echo "Valid"

# How many topics?
python3 -c "import json; d=json.load(open('data/trending_data.json')); print(f\"Topics: {len(d.get('trending', []))}\")"
```

**Fix:**
```bash
# Regenerate trending analysis
python3 scripts/analyze_trending.py

# Check output
python3 -m json.tool data/trending_data.json

# Regenerate pages
python3 scripts/generate_pages.py

# Deploy
git add .
git commit -m "Regenerate trending topics"
git push
```

#### Issue: Sentiment Data Missing

**Check:**
```bash
# Does sentiment file exist?
ls -la data/sentiment_data.json

# Is it valid JSON?
python3 -m json.tool data/sentiment_data.json > /dev/null && echo "Valid"

# How many comments analyzed?
python3 -c "import json; d=json.load(open('data/sentiment_data.json')); print(f\"Comments: {len(d.get('comments', []))}\")"
```

**Fix:**
```bash
# Reanalyze all comments
python3 scripts/add_sentiment.py

# Regenerate pages
python3 scripts/generate_pages.py

# Deploy
git add .
git commit -m "Refresh sentiment analysis"
git push
```

---

## Scheduled Maintenance

### Weekly (Every Monday)

- [ ] Run weekly update script
- [ ] Validate content quality
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Check analytics

### Monthly (First Monday)

- [ ] Review Core Web Vitals
- [ ] Check uptime statistics
- [ ] Audit API usage/costs
- [ ] Review backup integrity
- [ ] Update wiki definitions if needed
- [ ] Archive old data if approaching limits

### Quarterly (Every 3 months)

- [ ] Performance optimization review
- [ ] Security audit
- [ ] Dependency updates (Python packages, npm)
- [ ] Capacity planning for next quarter
- [ ] User feedback review

### Annually (January)

- [ ] Year-end capacity planning
- [ ] Technology stack review
- [ ] Cost optimization review
- [ ] Feature roadmap for next year
- [ ] Archive old year's content

---

**Last Updated**: January 8, 2026
**Version**: 1.0.0

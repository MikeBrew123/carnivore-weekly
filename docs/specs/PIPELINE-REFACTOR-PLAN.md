# Pipeline Refactor Plan — One Agent, One Run

**Created:** 2026-04-05
**Status:** Ready to build
**Goal:** Replace 9 sequential API-calling scripts with a single Claude Code agent that collects data once and does all AI work in-context.

---

## Why We're Doing This

The current pipeline makes ~6 separate Claude API calls and 2 YouTube API calls per weekly run. This:
- Wastes YouTube quota (2 scripts hit it independently)
- Pays for Claude API when Claude Code is already available
- Loses writer voice/memory — each API call starts fresh with no context
- Left the homepage showing "Week of March 23" on April 5 because stale data cascaded silently

The fix: one scheduled Claude Code agent that thinks for itself.

---

## Current State (What Exists)

### Scripts Making Claude API Calls (ALL GET REMOVED)
| Script | What It Does |
|--------|-------------|
| `content_analyzer_optimized.py` | Generates weekly_summary, trending_topics, key_insights → `analyzed_content.json` |
| `add_sentiment.py` | Per-video sentiment on top comments → into `youtube_data.json` |
| `generate_commentary.py` | 6 editorial video commentaries → `content-of-the-week.json` |
| `answer_questions.py` | Q&A with citations → `qa_section` in `analyzed_content.json` |
| `generate_weekly_topics.py` | Topic ideation from Reddit + YouTube → `weekly_topics.json` |
| `generate_roundup_image.py` | Calls Claude to write image prompt, then Replicate for image |

### Scripts That Hit YouTube API
| Script | Keep? |
|--------|-------|
| `youtube_collector.py` | ✅ Keep — but remove `score_video_relevance()` Claude call inside it |
| `generate_weekly_topics.py` | ❌ Delete — uses Reddit only (no YouTube), replaced by agent |

### Scripts That Survive Unchanged (Pure, No AI)
- `generate.py` — site builder, reads JSON files, no changes
- `generate_blog_pages.py` — renders blog HTML
- `extract_wiki_keywords.py` — re-indexes wiki anchors
- `sync_blog_posts_to_supabase.py` — DB sync
- `reddit_collector.py` — scrapes Reddit (currently unused, gets wired in)

---

## Target State

### New Pipeline (One Run)
```
Scheduled Agent fires (Sunday 9:01 AM)
│
├── 1. python3 scripts/youtube_collector.py
│         → writes data/youtube_data.json
│         → ONE YouTube API call, no Claude inside
│
├── 2. python3 scripts/reddit_collector.py
│         → writes data/reddit_data.json
│         → free scrape, no API cost
│
├── 3. AGENT DOES ALL AI WORK (steps below)
│         → reads youtube_data.json + reddit_data.json
│         → reads personas.json + writer memory from Supabase
│         → reads wiki-keywords.json + blog_posts.json
│         → reads seen_video_ids.json
│         → writes content-of-the-week.json
│         → writes analyzed_content.json
│         → writes updated youtube_data.json (with sentiment)
│         → writes updated seen_video_ids.json
│         → writes weekly_topics.json (editorial planning)
│         → generates roundup image prompt → calls Replicate
│
├── 4. python3 scripts/extract_wiki_keywords.py
├── 5. python3 scripts/generate_blog_pages.py
├── 6. python3 scripts/sync_blog_posts_to_supabase.py
├── 7. python3 scripts/generate.py --type pages
├── 8. python3 scripts/generate.py --type archive
├── 9. python3 scripts/generate.py --type channels
├── 10. python3 scripts/generate.py --type wiki
├── 11. python3 scripts/generate.py --type newsletter
│
└── 12. git add . && git commit && git push
          → site goes live on carnivoreweekly.com
```

---

## Build Steps

### Step 1 — Strip Claude from `youtube_collector.py`
**File:** `scripts/youtube_collector.py`
**What to do:**
- Remove `import anthropic` and `self.client = anthropic.Anthropic()`
- Delete `score_video_relevance()` method entirely
- Replace all calls to `score_video_relevance()` with the existing keyword fallback (already there at lines ~376-381)
- Remove `MIN_RELEVANCE_SCORE` constant (no longer needed)
- Remove `self.anthropic` from `__init__`

**Test:** `python3 scripts/youtube_collector.py` runs cleanly, no anthropic import error, collects videos.

---

### Step 2 — Wire in `reddit_collector.py`
**File:** `scripts/reddit_collector.py`
**What to do:**
- Run it manually to confirm it works standalone
- Check what it writes to `data/reddit_data.json`
- Note the schema so the agent knows what fields to read

**Test:** `python3 scripts/reddit_collector.py` → `data/reddit_data.json` exists with posts.

---

### Step 3 — Write the Agent Prompt
**File:** `scripts/weekly_agent_prompt.md`
**This is the most important file. The agent reads this as its instructions.**

The prompt must include:

#### Context injection (agent reads these files at start)
- `data/youtube_data.json` — collected videos
- `data/reddit_data.json` — Reddit posts
- `data/personas.json` — Sarah/Marcus/Chloe full profiles
- `data/wiki-keywords.json` — for link resolution in trending topics
- `data/blog_posts.json` — for topic dedup + Chloe blog references
- `data/seen_video_ids.json` — dedup of previously featured videos
- Supabase `writer_memory_log` — via Leo/MCP

#### Agent tasks in order:

**Task A — Select 6 featured videos**
- Filter: blocked channels, seen IDs, Shorts (< 300s OR (duration=0 AND 3+ hashtags))
- Rank by: `comment_count * 2 + like_count + (view_count / 1000)`
- Assign writers by rotation: `[Chloe, Sarah, Chloe, Sarah, Marcus, Sarah]`
- Update `seen_video_ids.json` (append new IDs, prune entries > 28 days old)

**Task B — Write editorial commentary (per video, in writer voice)**
- Chloe: casual, community-aware, "texting a friend" energy
- Sarah: warm, health-focused, evidence-nods, empathetic
- Marcus: punchy, strategic, performance angle
- 3-4 sentences per video, HTML format (`<a href>` not markdown links)
- Assign `heat_badge`: 🔥🔥🔥 Viral (>100k views), 🔥🔥 Trending (>10k), 🔥 Rising (<10k)
- Write `data/content-of-the-week.json`

**Task C — Write Chloe's weekly roundup**
- 2-3 paragraphs, week of [TODAY'S DATE] — date is ALWAYS injected, never inferred
- Start: `**Week of [date]**` then blank line then prose
- Casual opener ("Okay so..." / "Real talk..." / "This week was a lot...")
- Reference actual video topics from youtube_data + Reddit themes
- Weave in one recent blog post link if it genuinely fits
- End with a question or genuine reflection

**Task D — Write Marcus's key insights**
- Markdown format, what the data shows about trends this week
- Performance angle, numbers where available, opportunity-focused

**Task E — Sentiment analysis (per video)**
- For each video in `youtube_data.top_creators[].videos[]`
- Analyze `top_comments` (top 5 only)
- Write `comment_sentiment: {positive_percent, negative_percent, neutral_percent, positive_count, negative_count, neutral_count, overall, summary}`
- Save updated `data/youtube_data.json`

**Task F — Trending topics (3-5 topics)**
- Derived from this week's video titles, descriptions, comment themes, Reddit posts
- Match each to `wiki-keywords.json` first; fall back to blog_posts if no match
- Format: JSON array string (IMPORTANT: must be a JSON-encoded string, not a native array, because generate.py parses it with json.loads())
- `[{"topic": "...", "wiki_keyword": "...", "blog_link": null}]`

**Task G — Q&A section (3-5 questions)**
- One question per trending topic
- Assign by category: health → Sarah, strategy/performance → Marcus, community → Chloe
- Evidence-based answers with 2-4 real PubMed citations where possible
- Format: array of `{question, answer, citations, caveats, answered_by, question_category}`

**Task H — Write `data/analyzed_content.json`**
```json
{
  "weekly_summary": "[Chloe's roundup from Task C]",
  "trending_topics": "[JSON-encoded string from Task F]",
  "key_insights": "[Marcus's markdown from Task D]",
  "analysis_date": "April 05, 2026",
  "timestamp": "2026-04-05T09:01:00",
  "qa_section": [/* array from Task G */]
}
```

**Task I — Generate roundup image**
- Distill Chloe's weekly_summary into a vivid scene description for Replicate
- No people, no text in image, photorealistic lifestyle/food scene
- Call Replicate Flux 1.1 Pro with the prompt
- Save to `public/images/roundup-YYYY-MM-DD.webp`
- Update `roundup_image` path for generate.py

**Task J — Write `data/weekly_topics.json`** (editorial planning)
- 8-10 blog topic ideas from this week's Reddit + YouTube signals
- Cross-check against blog_posts.json slugs to avoid duplicates
- For editorial use only, not consumed by generate.py

---

### Step 4 — Write `scripts/run_weekly_agent.sh`
New thin shell wrapper replacing `run_weekly_update.sh`:

```bash
#!/bin/bash
set -e
cd /Users/mbrew/Developer/carnivore-weekly

echo "=== CARNIVORE WEEKLY — WEEKLY AGENT RUN ==="
echo "Started: $(date)"

# Data collection (external APIs)
echo "Step 1: YouTube collection..."
python3 scripts/youtube_collector.py

echo "Step 2: Reddit collection..."
python3 scripts/reddit_collector.py

echo "Step 3: Agent analysis (all AI work)..."
# Agent reads prompt file and does Tasks A-J
claude --print --allowedTools "Read,Write,Bash,mcp__supabase__execute_sql" \
  < scripts/weekly_agent_prompt.md

# Pure rendering steps
echo "Step 4-6: Indexing and sync..."
python3 scripts/extract_wiki_keywords.py
python3 scripts/generate_blog_pages.py
python3 scripts/sync_blog_posts_to_supabase.py

echo "Step 7-11: Building site..."
python3 scripts/generate.py --type pages
python3 scripts/generate.py --type archive
python3 scripts/generate.py --type channels
python3 scripts/generate.py --type wiki
python3 scripts/generate.py --type newsletter

# Copy to root for GitHub Pages
cp public/index.html index.html
cp public/archive.html archive.html 2>/dev/null || true
cp public/channels.html channels.html 2>/dev/null || true

# Deploy
echo "Step 12: Deploying..."
git add .
git commit -m "Weekly update - $(date +%Y-%m-%d)"
git push

echo "=== DONE — carnivoreweekly.com live ==="
```

---

### Step 5 — Update the Scheduled Task
**Current:** Runs `run_weekly_update.sh` at 9:01 AM Sundays
**New:** Runs `run_weekly_agent.sh` at 9:01 AM Sundays
**Add:** Catch-up behavior — if Mac was offline at 9 AM, run at next available opportunity

---

### Step 6 — Delete Old Scripts
After a successful dry run, delete:
- `scripts/content_analyzer_optimized.py`
- `scripts/add_sentiment.py`
- `scripts/generate_commentary.py`
- `scripts/answer_questions.py`
- `scripts/generate_weekly_topics.py`
- `scripts/run_weekly_update.sh`

Archive (don't delete yet — may contain useful logic):
- `scripts/generate_roundup_image.py` → Replicate call moves into agent prompt

---

## JSON Schemas (Reference)

### `data/content-of-the-week.json` (written by agent, Task B)
```json
{
  "week": "2026-04-05",
  "updated_by": "weekly-agent",
  "featured_videos": [
    {
      "video_id": "string",
      "title": "string",
      "creator": "string",
      "thumbnail_url": "string",
      "views": 0,
      "editorial_title": "string",
      "heat_badge": "🔥🔥 Trending",
      "commentary": "HTML string, use <a href> not markdown",
      "curator": "Chloe | Sarah | Marcus"
    }
  ]
}
```

### `data/analyzed_content.json` (written by agent, Task H)
```json
{
  "weekly_summary": "**Week of April 05, 2026**\n\n[prose]",
  "trending_topics": "[{\"topic\":\"...\",\"wiki_keyword\":\"...\",\"blog_link\":null}]",
  "key_insights": "# Marcus's Weekly Insights\n\n[markdown]",
  "analysis_date": "April 05, 2026",
  "timestamp": "2026-04-05T09:15:00",
  "qa_section": [
    {
      "question": "string",
      "answer": "string",
      "citations": [{"title":"","authors":"","year":0,"url":"","summary":""}],
      "caveats": "string",
      "answered_by": "-Sarah",
      "question_category": "health"
    }
  ]
}
```

### CRITICAL: `trending_topics` must be a JSON-encoded STRING
`generate.py` does `json.loads(trending_topics_raw)` — if the agent writes a native array, the site breaks.

---

## Risk Areas

| Risk | Mitigation |
|------|-----------|
| `trending_topics` written as array instead of string | Explicit note in agent prompt + schema validation step |
| `seen_video_ids.json` pruning logic wrong | Agent reads and re-implements the 28-day window exactly |
| Chloe writes wrong date | Date is injected at prompt start, never inferred from data |
| Replicate API call fails | Non-fatal — agent skips image, site builds without it |
| Reddit collector fails | Non-fatal — agent works from YouTube data only |
| 0 YouTube videos collected | Agent detects this, logs warning, preserves last week's `content-of-the-week.json` rather than overwriting with empty |

---

## Success Criteria

- [ ] `youtube_collector.py` runs with zero anthropic imports
- [ ] Agent dry run produces valid `content-of-the-week.json` and `analyzed_content.json`
- [ ] `analyzed_content.json` passes `json.loads()` on `trending_topics` field
- [ ] Weekly roundup starts with `**Week of [correct date]**`
- [ ] `generate.py --type pages` succeeds with agent-written files
- [ ] Homepage shows correct date and fresh content
- [ ] Site deploys to carnivoreweekly.com
- [ ] Old API-calling scripts deleted

---

## Files Touched

| File | Action |
|------|--------|
| `scripts/youtube_collector.py` | Modify — remove Claude calls |
| `scripts/weekly_agent_prompt.md` | Create |
| `scripts/run_weekly_agent.sh` | Create |
| `scripts/content_analyzer_optimized.py` | Delete |
| `scripts/add_sentiment.py` | Delete |
| `scripts/generate_commentary.py` | Delete |
| `scripts/answer_questions.py` | Delete |
| `scripts/generate_weekly_topics.py` | Delete |
| `scripts/run_weekly_update.sh` | Delete |
| `scripts/generate_roundup_image.py` | Archive (logic absorbed into agent) |
| Scheduled task config | Update prompt + add catch-up |

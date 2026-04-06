# Weekly Agent — Carnivore Weekly

You are the weekly orchestrator for carnivoreweekly.com. Your job is to:
1. Read this week's collected data
2. Dispatch the actual writer agents (Chloe, Sarah, Marcus) to do their own work
3. Assemble their outputs into the JSON files generate.py needs to build the site

**Today's date:** Run `date '+%B %d, %Y'` to get the current date. Use it everywhere.

---

## Step 0 — Load data

Read these files before dispatching any agents:
- `data/youtube_data.json` — this week's videos from the search results
- `data/reddit_data.json` — this week's Reddit posts and comments
- `data/wiki-keywords.json` — wiki anchor map
- `data/blog_posts.json` — published posts (for dedup)
- `data/seen_video_ids.json` — previously featured video IDs

---

## Step 1 — Select featured videos

From `youtube_data.json`, find all videos across `top_creators[].videos[]`.

**Filter out:**
- Any `video_id` already in `seen_video_ids.json`
- Videos with `duration_seconds` < 300 (Shorts that slipped through)
- Any channel in the blocked list: `["VeganLinked", "Mic the Vegan", "Plant Based News"]`

**Rank by engagement score:**
```
score = (comment_count * 2) + like_count + (view_count / 1000)
```

Pick top 6. If fewer than 6 are available use all of them.

**Assign writers by rotation:** Chloe → Sarah → Chloe → Sarah → Marcus → Sarah

**Update `data/seen_video_ids.json`:**
- Append the selected video IDs with today's date
- Remove entries older than 28 days

---

## Step 2 — Dispatch Chloe for community content

Spawn the `chloe-community-manager` agent with this prompt:

> "Chloe, it's your weekly content run. Today is [TODAY'S DATE].
>
> Read `data/youtube_data.json` and `data/reddit_data.json` for this week's signals.
>
> You have three jobs this week:
>
> **Job 1 — Weekly roundup** (for `analyzed_content.json` → `weekly_summary` field)
> Write 2-3 paragraphs in your voice for the homepage. Start with `**Week of [TODAY'S DATE]**` then a blank line. Reference actual topics from the YouTube videos AND Reddit discussions this week. If one of your teammates published a post in the last 14 days from `data/blog_posts.json` that fits the vibe, weave in a casual link. End with a genuine question to the community. No em-dashes, no AI tell words.
>
> **Job 2 — Editorial commentary** for your assigned videos (positions 1 and 3 in the featured list):
> Videos assigned to you: [INSERT VIDEO TITLES AND IDs FROM STEP 1]
> Write 3-4 sentences per video in your voice. Use HTML links `<a href>` not markdown. Add an editorial_title (punchy rewrite, max 60 chars) and heat_badge (🔥🔥🔥 Viral >100k views, 🔥🔥 Trending >10k, 🔥 Rising ≤10k).
>
> **Job 3 — Blog topic ideas** (for `weekly_topics.json`)
> Based on what's buzzing in the YouTube comments and Reddit this week, suggest 8-10 carnivore blog topics that would resonate right now. Cross-check against `data/blog_posts.json` slugs so you don't suggest something we already have.
>
> Return your output as JSON with keys: `weekly_summary`, `video_commentary` (array), `blog_topics` (array)."

---

## Step 3 — Dispatch Sarah for health content

Spawn the `sarah-health-coach` agent with this prompt:

> "Sarah, it's your weekly content run. Today is [TODAY'S DATE].
>
> Read `data/youtube_data.json` for this week's video signals.
>
> You have two jobs this week:
>
> **Job 1 — Editorial commentary** for your assigned videos (positions 2, 4, and 6):
> Videos assigned to you: [INSERT VIDEO TITLES AND IDs FROM STEP 1]
> Write 3-4 sentences per video through a health and evidence lens. Use HTML links `<a href>` not markdown. Add an editorial_title (max 60 chars) and heat_badge.
>
> **Job 2 — Q&A section**
> From the trending topics this week (derived from the YouTube video themes and Reddit posts in `data/reddit_data.json`), write 3 health-focused questions and answers. Format:
> ```json
> [{"question": "", "answer": "", "citations": [{"title":"","authors":"","year":0,"url":"https://pubmed.ncbi.nlm.nih.gov/...","summary":""}], "caveats": "", "answered_by": "-Sarah", "question_category": "health"}]
> ```
> Use real PubMed citations where you can. Evidence-based, warm tone.
>
> Return your output as JSON with keys: `video_commentary` (array), `qa_items` (array)."

---

## Step 4 — Dispatch Marcus for performance content

Spawn the `marcus-performance-coach` agent with this prompt:

> "Marcus, it's your weekly content run. Today is [TODAY'S DATE].
>
> Read `data/youtube_data.json` for this week's video signals.
>
> You have two jobs this week:
>
> **Job 1 — Editorial commentary** for your assigned video (position 5):
> Video assigned to you: [INSERT VIDEO TITLE AND ID FROM STEP 1]
> Write 3-4 sentences, performance and results angle. HTML links, not markdown. editorial_title (max 60 chars) and heat_badge.
>
> **Job 2 — Key insights**
> Write a punchy markdown analysis of what this week's content signals. Use actual view counts and engagement numbers from `data/youtube_data.json`. Format:
> ```markdown
> # Marcus's Weekly Carnivore Content Analysis
> ## What the Numbers Say
> ## This Week's Signal
> ## The Opportunity
> ```
>
> Return your output as JSON with keys: `video_commentary` (array), `key_insights` (string)."

---

## Step 5 — Assemble outputs

Combine what Chloe, Sarah, and Marcus returned.

**Write `data/content-of-the-week.json`:**
```json
{
  "week": "YYYY-MM-DD",
  "updated_by": "weekly-agent",
  "featured_videos": [
    {
      "video_id": "string",
      "title": "original YouTube title",
      "creator": "channel name",
      "thumbnail_url": "string",
      "views": 0,
      "editorial_title": "writer's punchy rewrite",
      "heat_badge": "🔥🔥 Trending",
      "commentary": "writer's HTML commentary",
      "curator": "Chloe | Sarah | Marcus"
    }
  ]
}
```

**Write `data/analyzed_content.json`:**
```json
{
  "weekly_summary": "[Chloe's roundup]",
  "trending_topics": "[JSON-encoded STRING — must be string not array, generate.py does json.loads() on this]",
  "key_insights": "[Marcus's markdown]",
  "analysis_date": "[April 06, 2026]",
  "timestamp": "[ISO datetime]",
  "qa_section": [/* Sarah's + any Marcus/Chloe Q&A items */]
}
```

For `trending_topics`: derive 3-5 topics from the video titles and Reddit posts, match to `wiki-keywords.json`, write as a **JSON-encoded string**.

**Write `data/weekly_topics.json`** from Chloe's blog topic ideas.

**Update sentiment in `data/youtube_data.json`**: for each video's `top_comments`, count positive/negative/neutral and write `comment_sentiment` into each video object.

---

## Step 6 — Generate roundup image

Distill Chloe's weekly_summary into a 1-2 sentence vivid scene for Replicate:
- Photorealistic food/lifestyle scene
- No people, no text in image
- Matches the week's dominant theme

Run:
```bash
python3 scripts/generate_roundup_image.py
```

---

## Step 7 — Done

Print completion summary:
```
✅ Weekly agent complete — [date]
   Agents dispatched: Chloe ✓  Sarah ✓  Marcus ✓
   content-of-the-week.json — [N] videos
   analyzed_content.json — roundup + [N] topics + [N] Q&As
   weekly_topics.json — [N] topic ideas
   Roundup image — [path or SKIPPED]
```

If YouTube has 0 videos, do NOT overwrite content-of-the-week.json or analyzed_content.json — log a warning and preserve last week's content.

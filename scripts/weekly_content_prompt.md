# WEEKLY CONTENT GENERATION

## STEP 1 — CHLOE'S RESEARCH

Research what's trending in the carnivore community RIGHT NOW.

Search the web for:
- Reddit r/carnivore, r/carnivorediet, r/zerocarb trending posts this week
- YouTube carnivore creators: what are they posting about?
- Any carnivore news, controversies, or viral moments

Then query Supabase for what we've already covered:
```sql
SELECT slug, title, author, publish_date
FROM writer_content
ORDER BY publish_date DESC LIMIT 30;
```

Also check blog_posts.json for recent posts to avoid repeats.

Produce 9 topic assignments (3 per writer):

| # | Topic | Writer | Why trending | Angle |
|---|-------|--------|-------------|-------|
| 1 | | Sarah | | |
| 2 | | Sarah | | |
| 3 | | Sarah | | |
| 4 | | Marcus | | |
| 5 | | Marcus | | |
| 6 | | Marcus | | |
| 7 | | Chloe | | |
| 8 | | Chloe | | |
| 9 | | Chloe | | |

**Assignment rules:**
- **Sarah:** health, science, healing, nutrition, medical
- **Marcus:** performance, protocols, fitness, optimization, budget
- **Chloe:** community, lifestyle, social, dating, trends, debates
- No topic covered in the last 3 months (check writer_content)
- If a topic is too similar to a recent post, find a fresh angle or swap it

**STOP and show me the 9 topics before generating content.**

---

## STEP 2 — GENERATE CONTENT (after topic approval)

For each of the 9 posts, follow the CLAUDE.md blog pipeline:

1. **Pre-Flight:** query Supabase for writer persona + memories
2. **Write content** (1,000-1,500 words, HTML body only)
3. **Store in blog_posts.json** with:
   - `status: "ready"` (NOT "published" — the daily cron handles that)
   - `publish_date`: space across next 7+ days starting tomorrow
   - One post per day, no gaps, no doubles

Process ONE post at a time. Report progress after each:
`"Post X/9 done — {writer} — {title} — {word_count} words — publishes {date}"`

---

## STEP 3 — RENDER AND VALIDATE

After all 9 posts are in blog_posts.json:

1. Run `generate_blog_pages.py`
2. Run `validate_before_commit.py` (must pass 0 critical, 0 warnings)
3. Commit: `"content: queue 9 blog posts for {date_range}"`
4. Push

---

## STEP 4 — POST-FLIGHT

Save articles to `writer_content` table in Supabase.
Save new memories to `writer_memory_log`.

Report final summary:
- 9 posts queued
- Date range: {first_date} to {last_date}
- Word counts per post
- Next available publish date (for mid-week top-up if needed)

**STOP.**

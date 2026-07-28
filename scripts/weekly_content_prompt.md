# WEEKLY CONTENT GENERATION

## WHO WE WRITE FOR (data snapshot 2026-07-28)

From 190 calculator sessions: 64% are 45+, 58% female, 87% weight loss goal. Both paying customers to date are women 69 and 72 who arrived via practical evergreen guides. Search clicks go to calculator-intent and symptom/troubleshooting content; athlete-performance and debate posts get near-zero traffic.

**Default reader: 45-70, often a woman, losing weight, possibly on medications, confused about macros and expectations. Community trends supply the language; search demand decides the assignment.**

Priority clusters, in order:
1. Calculator-adjacent (macros, protein targets, TDEE, women over 50)
2. Symptoms/adaptation troubleshooting ("is this normal", timelines, sleep, digestion)
3. Weight loss 45+ (stalls, menopause, starting after 50/60)
4. Condition-adjacent — Sarah only, Category 7 disclaimers (blood sugar, cholesterol fears, joint pain)
5. Practical basics (food lists, simple meal plans, budget, cooking for one or two)

## STEP 1 — CHLOE'S RESEARCH

Research what our readers are struggling with RIGHT NOW.

Search the web for:
- Reddit r/carnivore, r/carnivorediet, r/zerocarb, r/keto: pain points, symptoms, questions this week
- What would a 55-year-old woman type into Google? Every topic needs a plausible target search query
- Community trends are language input only — no topic gets assigned without search demand + audience fit (use the Topic Brief Gate in agents/chloe.md)

Then query Supabase for what we've already covered:
```sql
SELECT slug, title, author, publish_date
FROM writer_content
ORDER BY publish_date DESC LIMIT 30;
```

Also check blog_posts.json for recent posts to avoid repeats.

Produce 9 topic assignments (Sarah 5, Marcus 2, Chloe 2):

| # | Topic | Writer | Target query | Angle |
|---|-------|--------|-------------|-------|
| 1 | | Sarah | | |
| 2 | | Sarah | | |
| 3 | | Sarah | | |
| 4 | | Sarah | | |
| 5 | | Sarah | | |
| 6 | | Marcus | | |
| 7 | | Marcus | | |
| 8 | | Chloe | | |
| 9 | | Chloe | | |

**Assignment rules:**
- **Sarah (5):** health, symptoms, weight loss over 45, women's health, condition-adjacent questions
- **Marcus (2):** practical protocol for non-athletes — macros, protein targets, meal prep, budget. NO athlete/performance topics (marathon, glycogen, cuts, BJJ)
- **Chloe (2):** community topics grounded in a reader problem (eating out at 60, resistant spouse, family pushback). NO creator drama or debate coverage
- Every topic names its target search query — no query, no assignment
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
   - `meta_description` AND `seo.meta_description`: **130-165 characters, count them before storing** (ISSUE-059). `generate_blog_pages.py` hard-blocks any post outside that range — the post will not render until you shorten or lengthen the description.

Process ONE post at a time. Report progress after each:
`"Post X/9 done — {writer} — {title} — {word_count} words — publishes {date}"`

---

## STEP 3 — RENDER AND VALIDATE

After all 9 posts are in blog_posts.json:

1. Run `generate_blog_pages.py`
2. Run `generate_post_images.py` (generates article images via Replicate for any post missing one)
3. Run `generate_blog_pages.py` again (bakes image paths into HTML)
4. Run `generate.py --type pages` (regenerates homepage bento)
5. Run `validate_before_commit.py` (must pass 0 critical)
6. Commit: `"content: queue 9 blog posts for {date_range}"`
7. Push

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

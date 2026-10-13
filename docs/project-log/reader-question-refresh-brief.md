# Writer brief: fix your 3 worst posts (Brew, 2026-10-13)

## What we learned this week
We read ~10,000 YouTube comments plus Reddit and pulled ~700 real reader questions, grouped into themes, then checked them against Google Search Console.
- Reader question themes with counts and our matching pages: `coverage.json` in the out folder. Carnivore is the list that matters for CW.
- Real community phrases and funny lines: `agg_carnivore.json` (phrases + funny lines) in the out folder.
- CW ranks NARROW, PROBLEM-SHAPED pages fast (symptom/timeline pages debut at pos 5-12). Broad hubs and reference pages never rank (none ever above pos 30). The winners answer one specific problem a 45-70 woman actually has.
- Google is skipping pages that duplicate each other: 3 of our most-asked topics (LDL, fast food, electrolytes) have 5-6 CW pages each and the main ones are "not indexed". Those clusters are OUT of scope for this exercise.

## Your list
Your eligible posts, worst first, with 90-day Google impressions / clicks / avg position: `writer_pages.json` in the out folder under your name. Only posts published at least 60 days ago are listed. 0 impressions = Google shows it to nobody.

## The task
1. Pick YOUR 3 worst posts that are worth saving. Good picks: the post answers (or could answer) a real reader question theme, and no stronger CW page already covers the same problem. If a post duplicates a stronger page or is not worth saving, skip it and say so in one line (that becomes a consolidate/redirect question for Brew, not a rewrite).
2. For each pick, diagnose why it fails before fixing (wrong intent, broad hub instead of one problem, title nobody would search, buried answer, thin, duplicate).
3. Fix it with best practices:
   - Reshape it around ONE specific problem a reader would type into Google. Answer it in the first 2-3 sentences.
   - Title: do real research from the post's content and the reader-question wording. No mechanical trims. Under ~60 characters, the searcher's words first.
   - Meta description: says the answer, under ~155 characters.
   - Use the reader's own words where they fit (questions file, phrases file).
   - Keep the slug and publish date. Never change the URL.
   - Keep good existing material; cut padding.
4. Hard rules: CW no-sweets rule; no medical claims or "reversed/cured" language; no supplement or electrolyte DOSES (mg/g amounts) at all; anything health-adjacent gets "talk to your doctor" framing; no em-dashes; cross-site links only as full https://ketodial.com/... URLs; internal links only to CW posts that exist in data/blog_posts.json with status published.
5. You produce CONTENT ONLY. Do NOT edit data/blog_posts.json, public/, or templates/. Read data/blog_posts.json to get the current content.

## Deliverable
Write to `<out folder>/writer-fixes/<your-name>/`:
- `picks.md`: your 3 picks (slug, current numbers, diagnosis, what you changed and why), plus any posts you skipped as duplicates/not worth saving.
- For each pick, `<slug>.json` with keys: `slug`, `title`, `meta_description`, `excerpt`, `content` (the full replacement post body HTML, same format as the current `content` field).
Reply with one line: ✅ [task] complete → [folder]

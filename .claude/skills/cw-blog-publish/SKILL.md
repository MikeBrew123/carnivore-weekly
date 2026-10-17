---
name: cw-blog-publish
description: Publish a Carnivore Weekly or KetoDial blog post end to end - Supabase pre-flight, writer content, blog_posts.json schema, render, validate, sync, commit. Use whenever a post is written, scheduled, or fixed.
---

# Blog Post Pipeline (mandatory, no exceptions)

The unattended tasks `weekly-blog-content-generation` and `kd-blog-content-generation` (`~/.claude/scheduled-tasks/`) carry their own inline copy of steps 1-7. Any change here must be mirrored there.

Writers produce CONTENT ONLY. `scripts/generate_blog_pages.py` produces HTML. Writers never touch `public/blog/` or `templates/`. Process posts ONE AT A TIME through steps 1-3, then run 4-7 once.

## Step 1: Pre-flight (Supabase, executed by the main session)
```sql
SELECT * FROM writers WHERE slug = '{writer}';
SELECT memory_type, title, description FROM writer_memory_log
 WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}') AND memory_type <> 'life_fact'
 ORDER BY created_at DESC LIMIT 10;
-- The writer's whole life (all of it, every time; hand it to the writer as "YOUR LIFE")
SELECT title, description FROM writer_memory_log
 WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}') AND memory_type = 'life_fact' AND is_active
 ORDER BY created_at;
SELECT title, slug FROM writer_content
 WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}') ORDER BY created_at DESC LIMIT 5;
```

## Step 2: Write content
- **Invoke the writer agent. Never read a persona file and imitate the voice.**
  Agent tool, `subagent_type`: `sarah` → `sarah-health-coach`, `marcus` → `marcus-performance-coach`,
  `chloe` → `chloe-community-manager`. Resolved from `.claude/agents/` (the live definitions).
  "Agent type not found" means the session is in the wrong directory: `cd` to the repo root and retry.
  `agents/{writer}.md` (no dot prefix) is the retired 2026-06 copy. Do not load it.
- Body is clean HTML: `<h2>`, `<p>`, `<ul>`, `<strong>`, `<blockquote>` only. No page-level tags, no Jinja2.
- 1,000-1,500 words. Run the `copy-editor` checks (no em-dashes, no AI tells, contractions, grade 8-10) and `soft-conversion` for any product mention.
- Cross-links only to posts that are live on that domain. Cross-site links use the full URL.

## Step 3: Store in `data/blog_posts.json`
ALL fields required; partial entries fail silently.
```json
{
  "slug": "YYYY-MM-DD-topic-name",
  "title": "...",
  "content": "<full HTML body>",
  "author": "sarah|marcus|chloe",
  "author_title": "Health Coach|Performance Coach|Community Manager",
  "status": "ready|published",
  "published": true,
  "publish_date": "YYYY-MM-DD",
  "date": "YYYY-MM-DD",
  "scheduled_date": "YYYY-MM-DD",
  "image": "/images/blog/<slug>.jpg or empty",
  "excerpt": "<150-char hook>",
  "category": "health|protocol|community|strategy|news|featured",
  "tags": ["tag1", "tag2"],
  "meta_description": "<150-160 chars>",
  "seo": { "meta_description": "<same as above>" },
  "site": "cw|kd"
}
```
`publish_date`, `date`, and `scheduled_date` MUST match: `daily_publish.py` reads the first, the blog index sorts by the second, the homepage bento by the third. Dates are today or past, never future. Status flow: `draft` → `ready` → `published`.

## Step 4: Render
```bash
python3 scripts/generate_blog_pages.py --site cw   # or --site kd
python3 scripts/generate.py --type pages           # regenerates the homepage bento
```
Never omit `--site`. Never run one without the other.

## Step 5: Validate
```bash
python3 scripts/validate_before_commit.py
```
0 critical errors. Gate 11 there is the electrolyte dose guard (`python3 scripts/check_electrolyte_dosing.py --site cw|kd`): no magnesium or potassium mg amount, no sodium amount during a fast; on a hit, the writer rewrites the line (no number, say why), never a smaller number. A daily salt range is fine, worded as what people on the diet typically do (CONTENT LINE, 2026-10-17, supersedes deck 9abbfdc5). Then `python3 scripts/check_doctor_line.py --site cw|kd`: the post carries exactly ONE safety line, near the first number that needs it: "This is not for everyone. Talk to your doctor first if you have high blood pressure, kidney or heart problems, diabetes, are pregnant, or take medicine." Never repeat it after each recommendation; delete repeated doctor caveats it lists. Never tell a reader to start, stop or change a medicine, diagnose, promise a cure, give a drug dose or a supplement amount above the label, or skip medical care. Then the validators: `/copy-editor`, `/seo-validator` (meta 150-160, title 50-60, canonical, schema, headings, alt text), `/carnivore-brand` (Libre Baskerville + Source Sans 3, blog-post.css), `/visual-validator` (WCAG 2.1 AA), and 2-3 internal backlinks with descriptive anchors. Any fail = fix first.

## Step 6: Post-flight
Save the article to `writer_content`, new memories to `writer_memory_log`. If the writer used a NEW life detail (something not already in their life rows: the dog's surgery, a new storyline beat), save it as a `life_fact` row (tags: category + `invented`), so the next post knows. Never save a health outcome, credential, attendance or reader testimonial as a life fact; the database trigger refuses the obvious ones. Then:
```bash
python3 scripts/sync_blog_posts_to_supabase.py
```

## Step 7: Commit
```bash
git add -A && git commit -m "content: {description}" && git push
```

## KetoDial differences
New KD posts use `"site": "kd"` and render via `scripts/daily_publish.py --site kd` → `ketodial/scripts/generate_kd_blog.py --only-new`. Match the structure of an existing post (e.g. `keto-flu-electrolyte-fix.html`): same CSS, nav, footer, JSON-LD, GA4 tag `G-0Y79FB48EG`, skip-nav. Add the "Not a Doctor" blockquote before the closing `</div>` and 2-3 cross-links to related KD posts. `generate_kd_blog.py --only-new` updates `ketodial/public/sitemap.xml` and the `blog/index.html` feed-grid itself: verify both, do not hand-edit. Then resubmit the sitemap in Google Search Console (no Indexing API for normal pages). Never bulk-regenerate legacy KD posts.

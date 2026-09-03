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
 WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}') ORDER BY created_at DESC LIMIT 10;
SELECT title, slug FROM writer_content
 WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}') ORDER BY created_at DESC LIMIT 5;
```

## Step 2: Write content
- Read the writer's agent file `agents/{writer}.md`.
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
0 critical errors. Then the validators: `/copy-editor`, `/seo-validator` (meta 150-160, title 50-60, canonical, schema, headings, alt text), `/carnivore-brand` (Libre Baskerville + Source Sans 3, blog-post.css), `/visual-validator` (WCAG 2.1 AA), and 2-3 internal backlinks with descriptive anchors. Any fail = fix first.

## Step 6: Post-flight
Save the article to `writer_content`, new memories to `writer_memory_log`, then:
```bash
python3 scripts/sync_blog_posts_to_supabase.py
```

## Step 7: Commit
```bash
git add -A && git commit -m "content: {description}" && git push
```

## KetoDial differences
New KD posts use `"site": "kd"` and render via `scripts/daily_publish.py --site kd` → `ketodial/scripts/generate_kd_blog.py --only-new`. Match the structure of an existing post (e.g. `keto-flu-electrolyte-fix.html`): same CSS, nav, footer, JSON-LD, GA4 tag `G-0Y79FB48EG`, skip-nav. Add the "Not a Doctor" blockquote before the closing `</div>`, 2-3 cross-links to related KD posts, then update `ketodial/public/sitemap.xml` and `blog/index.html`, and submit to GSC via the Indexing API. Never bulk-regenerate legacy KD posts.

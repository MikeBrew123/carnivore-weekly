# CLAUDE.md — Carnivore Weekly

## Error Protocol

**Error log:** [`docs/project-log/recurring-issues.md`](docs/project-log/recurring-issues.md)

**On every error, follow this loop without being asked:**

1. **Before diagnosing:** check the error log. If the symptom matches a tracked ISSUE, read the Attempts list. Pick a NEW angle — never repeat a fix that already failed.
2. **After fixing (>15 min, OR any CI/workflow failure):** add or update the entry:
   ```
   ## ISSUE-NNN — One-line title
   🟢 FIXED | 🟡 RECURRING | 🔴 OPEN — Last: YYYY-MM-DD
   Pattern: one sentence
   Attempts:
   - YYYY-MM-DD — what was tried → outcome
   If recurs: next angle to try
   ```
3. **If already tracked and recurred:** append a new dated Attempt. Update status to 🟡 RECURRING.
4. **Keep entries ≤15 lines.**

**Pre-push hook:** `scripts/install-hooks.sh` installs `validate_before_commit.py` before every push. Don't bypass with `--no-verify`.

---

## Content Quality — Writer Agents Required

**NEVER publish ANY user-facing content without using writer agents (Sarah, Marcus, Chloe).**

Applies to: blog posts, editorial commentary, newsletter copy, video descriptions, social media, marketing copy.

**ALWAYS apply humanization:**
- Remove AI tells: delve, landscape, robust, utilize, leverage, facilitate, crucial, realm, navigate
- No em-dashes — use periods or commas (max 1 per post)
- Sound conversational (like talking to a friend)
- Use contractions (it's, don't, can't)
- Grade 8-10 reading level, short paragraphs (2-4 sentences)

**ALWAYS apply soft-conversion for product mentions:**
- Natural context, not sales pitches
- "Some people find X helpful" > "You must buy X"
- Trust readers to decide

**Enforcement:** `scripts/generate_commentary.py` has built-in humanization. For manual content, run `/ai-text-humanization` and `/soft-conversion` skills before publishing.

---

## Blog Post Pipeline (Mandatory — No Exceptions)

**The One Rule:** Writers produce CONTENT ONLY. `generate_blog_pages.py` produces HTML PAGES.
Writers NEVER open, edit, or create files in `public/blog/` or `templates/`.

### Step 1 — Pre-Flight (Supabase queries)
Execute these MCP queries directly (Leo cannot execute MCP):
```sql
SELECT * FROM writers WHERE slug = '{writer}';

SELECT memory_type, title, description
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}')
ORDER BY created_at DESC LIMIT 10;

SELECT title, slug FROM writer_content
WHERE writer_id = (SELECT id FROM writers WHERE slug = '{writer}')
ORDER BY created_at DESC LIMIT 5;
```

### Step 2 — Write Content
- Read the writer's agent file from `agents/{writer}.md`
- Write article body as clean HTML: `<h2>`, `<p>`, `<ul>`, `<strong>`, `<blockquote>` only
- NO page-level tags (`<html>`, `<head>`, `<body>`), NO Jinja2 variables
- Target: 1,000-1,500 words (7,000-10,000 characters)

### Step 3 — Store in blog_posts.json
Add or update entry in `data/blog_posts.json`. **ALL fields required** — partial entries cause silent rendering failures.

**Required schema:**
```json
{
  "slug": "YYYY-MM-DD-topic-name",
  "title": "...",
  "content": "<full HTML body>",
  "author": "sarah|marcus|chloe",
  "author_title": "Health Coach|Performance Coach|Community Manager",
  "status": "ready|published",
  "published": true|false,
  "publish_date": "YYYY-MM-DD",
  "date": "YYYY-MM-DD",
  "scheduled_date": "YYYY-MM-DD",
  "image": "/images/blog/<slug>.jpg or empty",
  "excerpt": "<150-char hook>",
  "category": "health|protocol|community|strategy|news|featured",
  "tags": ["tag1", "tag2"],
  "meta_description": "<150-160 chars>",
  "seo": { "meta_description": "<same as above>" }
}
```

**Why `publish_date`, `date`, AND `scheduled_date`:** `daily_publish.py` reads `publish_date`, blog index sorts by `date`, homepage bento sorts by `scheduled_date or date`. All three MUST match.

### Step 4 — Render HTML
```bash
python3 scripts/generate_blog_pages.py
```

### Step 5 — Validate
```bash
python3 scripts/validate_before_commit.py
```
Must pass with 0 critical errors.

### Step 6 — Post-Flight (Supabase save)
Save article to `writer_content` table. Save new memories to `writer_memory_log`.
Run `python3 scripts/sync_blog_posts_to_supabase.py` to keep blog_posts.json and Supabase in sync.

### Step 7 — Commit and Push
```bash
git add -A && git commit -m "content: {description}" && git push
```

### PROHIBITED Actions
- ❌ Editing files in `templates/` during content generation
- ❌ Writing full HTML pages manually instead of using `generate_blog_pages.py`
- ❌ Creating HTML files without date prefixes in the slug
- ❌ Spawning parallel agents that write to `blog_posts.json` simultaneously
- ❌ Cross-linking to posts that don't exist yet (check `public/blog/` first)
- ❌ Skipping validation before commit

### Multiple Posts
Process ONE AT A TIME through Steps 1-3. Then run Steps 4-7 once after all content is stored.

---

## Weekly Content Workflow

- **Cadence:** 9 posts/week (3 per writer), published one/day by GitHub Action
- **How:** Paste contents of `scripts/weekly_content_prompt.md` into Claude Code. Approve Chloe's topic assignments. Wait for generation. Daily cron handles publishing.
- **Mid-week top-up:** Run the prompt again. New posts get dates after last queued date.
- **Status values:** `draft` (not ready) → `ready` (waiting for publish_date) → `published` (live)
- **Daily publish:** GitHub Action at 9 AM EST runs `scripts/daily_publish.py` — publishes all posts where `status=ready AND publish_date<=today`
- **ALWAYS run BOTH** `generate_blog_pages.py` AND `generate.py --type pages` before commit. First generates blog pages, second regenerates homepage bento.

---

## Blog Post Validation

**BEFORE deploying ANY blog post, ALL validators must pass.**

1. **Copy Editor** (`/copy-editor`) — zero em-dashes, no AI tells, contractions, grade 8-10
2. **SEO Validator** (`/seo-validator`) — meta description 150-160 chars, canonical URL, title 50-60 chars, schema, heading hierarchy, alt text
3. **Brand Compliance** (`/carnivore-brand`) — Google Fonts, blog-post.css, Libre Baskerville + Source Sans 3, correct colors
4. **Frontend** — `<div class="post-content">` wrapper, mobile responsive, no layout breaks
5. **Visual Validator** (`/visual-validator`) — WCAG 2.1 AA contrast, accessibility
6. **Internal Backlinks** — 2-3 links to related posts, descriptive anchor text, no broken links

**Automation:** `scripts/validate_before_commit.py` runs pre-commit. `scripts/content_validator.py` validates during generation.

**GO/NO-GO:** All pass = deploy. Any fail = fix first.

---

## Blog Post Structure

**Active Template:** `templates/blog_post_template_2026.html`
**Gold Standard:** `public/blog/2025-12-23-adhd-connection.html`
**Generation Script:** `scripts/generate_blog_pages.py`

All posts MUST use `blog_post_template_2026.html`:
- `layout-wrapper-2026` + `main-content-2026` wrappers
- Wiki links, featured videos, post-footer with reactions + comments, related-content, mobile-nav.js

**DO NOT** use `blog_post_template.html` (deprecated, deleted Feb 2026).

---

## Generated Files — Manual Edit Policy

Auto-generated: `public/index.html`, `public/channels.html`

Manual edits allowed when instructed, but:
1. Document the change in `docs/project-log/current-status.md` under MANUAL EDITS LOG
2. Note it may be overwritten by next `run_weekly_update.sh` (Sundays)
3. If permanent, ALSO update the source template

**Template files (source of truth):** `templates/index_template.html`, `templates/channels_template.html`

---

## Database Access

- **Supabase MCP** is configured. Main session executes directly: `mcp__supabase__execute_sql({ query: "SQL" })`
- **Leo** (`leo-database-architect`) designs SQL, schema, migrations — but CANNOT execute MCP tools
- **Workflow:** Leo prepares SQL → main session executes via MCP
- **Stripe MCP** is available for payments, products, refunds — use directly, don't send user to dashboard
- NEVER ask for credentials — see root CLAUDE.md for locations
- If MCP isn't working: run `/status`, then `/mcp` to re-authenticate

---

## Agents

**Quinn** = Operations manager. Updates `docs/project-log/current-status.md` and `decisions.md`.

**Leo** = Database architect. Prepares SQL. Cannot execute MCP.

**Sarah, Marcus, Chloe** = Writer agents. See Content Quality section.

**Deprecated locations (NEVER use):** `docs/project-log/daily/`, `agents/daily_logs/`, `memory.log`

---

## Documentation Standards

- **Reports:** `/docs/archive/reports-archive/YYYY-MM-DD-topic.md`
- **Guides:** Update existing files in `/docs/guides/`, never create new ones
- **Daily logs:** NEVER create in this project — go to Obsidian only

**PROHIBITED:**
- ❌ Creating files in `docs/project-log/daily/`
- ❌ Including API keys, secrets, or credentials in any .md file — use `***REDACTED***`
- ❌ Leaving one-time reports in `docs/reports/` (archive them)

---

## Session Workflow (Beads)

### Starting
1. `bd ready` — find available work
2. `bd list --status=in-progress` — pick up where last session left off
3. `bd update <id> --status=in_progress` on whatever you're starting

### During
- New work: `bd create "description" --priority <1-5>`
- Completed: `bd update <id> --status=done`
- Blocked: `bd update <id> --status=blocked --comment "reason"`

### Ending (MANDATORY when Brew says "wrap up" or "end session")
1. File remaining work as beads tasks
2. Update in-progress tasks (done, blocked, or filed — never leave hanging)
3. Sync: `bd sync && git add .beads/ && git commit -m "beads: end session" && git push`
4. Report to Brew: completed, filed, `bd ready` output

**Rules:**
- NEVER end a session without syncing Beads
- Beads is the source of truth for task tracking, not markdown files

---

## Triggers
| You Say | I Do |
|---------|------|
| "good morning" or "standup" | Run /standup |
| "wrap up" or "done" or "end session" | Session end protocol (see root CLAUDE.md) + Beads sync |
| "decision:" or "we decided" | Quinn logs to decisions.md |
| "validate site" or "visual check" | Run /visual-validator on all pages |
| "show reports" or "analytics" | Run `dashboard/generate-all-reports.sh` |

---

## Lessons Learned (Don't Repeat These)

### Content
1. Content agents must NOT include template HTML in content fields. Content = article body only.
2. Content agents must NOT generate cross-links to unpublished posts. Check `public/blog/` first.
3. Never set future dates on blog posts. Google penalizes content dated ahead of crawl time.
4. Amazon book links wrap only the title, not the full citation sentence.
5. Template variables must match generator output. Check both sides.
6. NEVER bypass the blog post pipeline. Minimal-schema entries silently break homepage bento and blog index sort.
7. Always run BOTH `generate_blog_pages.py` AND `generate.py --type pages` before commit.
8. Always run post-flight Supabase sync (`scripts/sync_blog_posts_to_supabase.py`).
9. The `autonomous_blog_generation.sh` script blocks on stdin — it cannot run unattended. Use `weekly_content_prompt.md` instead.

### Code
10. Always use absolute paths in Python scripts.
11. Don't touch `content_validator.py` double-slash regex (fixed with `[^:]` before `//`).

### Validation
12. Pre-commit validator must check link targets exist on disk, not just non-empty hrefs.
13. Affiliate links must use https:// (mixed content triggers browser warnings).
14. New validators: always run against full codebase, not just new files.
15. Health checks must cover blog-to-blog cross-links.

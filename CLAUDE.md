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
python3 scripts/generate_blog_pages.py --site cw
```
**ALWAYS pass `--site cw` (or `--site kd`).** Bare invocation renders ALL sites' posts into `public/blog/` and pollutes CW's sitemap with KD posts (ISSUE-035).

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

- **Cadence:** CW 9 posts/week (3 per writer) + KD 6 posts/week, published one/day by GitHub Action
- **How:** AUTOMATED — Claude scheduled tasks generate content unattended: `weekly-blog-content-generation` (CW, Sun+Wed 4:33am) and `kd-blog-content-generation` (KD, Tue+Fri 4:33am). The blog-queue watchdog opens a GH issue if queues drain.
- **Manual fallback / mid-week top-up:** Paste `scripts/weekly_content_prompt.md` into Claude Code. New posts get dates after last queued date.
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

## Email & Newsletter — All In-House via Resend

**Beehiiv:** DEPRECATED. Do not use. All email is in-house now.
**MailerLite:** DEPRECATED (2026-05-26). Do not use.

### Sending Infrastructure
- **Platform:** Resend (all email — drip, newsletter, transactional)
- **Domain:** `carnivoreweekly.com` (verified, DKIM/SPF/DMARC live)
- **From addresses:**
  - CW newsletter: `newsletter@carnivoreweekly.com`
  - KD newsletter: `ketodial@carnivoreweekly.com`
  - KD coach: `coach@carnivoreweekly.com`
- **Reply-to:** `iambrew@gmail.com`
- **API key:** `secrets/api-keys.json` → `resend.key`

### Drip Sequences (CW 30-Day Carnivore Starter + KD 30-Day Keto Starter)
- **Script:** `scripts/send_drip.py --site cw|kd` (default cw) — runs daily via `daily-publish.yml` GitHub Action. KD step is gated by the `KD_DRIP_ENABLED` repo variable.
- **Templates:** `data/drip-emails/` (CW) and `data/drip-emails/kd/` (KD) — 11 emails each: day-1 through day-7 daily, then day-10, 14, 21, 28
- **Check-ins:** every email links an anonymous survey — CW `carnivoreweekly.com/journey-checkin.html?day=N`, KD `ketodial.com/journey-checkin.html?day=N`. Questions live in `drip_survey_questions`/`drip_survey_options` (site-scoped, config-driven: new days = inserts, not deploys).
- **KD from-address:** `KetoDial <ketodial@carnivoreweekly.com>`, reply-to `ketodial@carnivoreweekly.com` (drip replies ride the inbound catch-all → daily digest with Sarah's proposed drafts — never route drip replies to iambrew@gmail.com). KD promo codes reuse coupon `52fYA51M` (same Stripe account); the KD embedded checkout takes codes via its promo field — KD copy must say "enter code at checkout", never "auto-applies".
- **Expiring offers (honest urgency):** day-7/day-28 sends mint a per-subscriber single-use Stripe promo code (`WEEK1-XXXXX`/`GRAD-XXXXX`, real 48h expiry, coupon `52fYA51M`) via `mint_promo_code()` in `send_drip.py`; the checkout worker validates them via `validatePromotionCode()` (pinned Stripe-Version 2024-06-20 — account default breaks the shape). Mint failure falls back to static `DRIP50` with copy that makes NO expiry claim. NEVER write drip copy claiming a deadline that isn't Stripe-enforced.
- **Subscribers table:** `drip_subscribers` (Supabase) — tracks `current_day`, `last_sent_at`, `completed`
- **Flow:** signup → Supabase insert → daily cron advances to next scheduled day → after day 28 graduates to `newsletter_subscribers`
- **Unsubscribe:** `/api/v1/unsubscribe` on Cloudflare Worker

### Newsletter (Weekly)
- **Generate:** `scripts/generate_newsletter.py` → `newsletters/{date}.html`
- **Content:** `data/newsletter_content.json` (subject line, sections by writer)
- **Send:** `scripts/send_newsletter.py --site cw` (or `--site kd`)
- **Subscribers table:** `newsletter_subscribers` (Supabase) — `site` field = `cw` or `kd`
- **KetoDial:** `scripts/send_newsletter.py --site kd`

### Open/Click Tracking
- **Webhook:** Resend → `https://carnivore-report-api-production.iambrew.workers.dev/webhook/resend`
- **Events tracked:** sent, delivered, opened, clicked, bounced, complained
- **Storage:** `drip_events` table (Supabase) — `email`, `resend_id`, `event_type`, `subject`, `metadata`
- **Signing secret:** `secrets/api-keys.json` → `resend.webhook_signing_secret`
- **Query opens:** `SELECT * FROM drip_events WHERE event_type = 'opened' ORDER BY created_at DESC`

### Signup Endpoint
- **Route:** `/api/v1/subscribe` on Cloudflare Worker → inserts to `drip_subscribers` (Supabase)
- **Also:** `/api/v1/subscribe/newsletter` → inserts to `newsletter_subscribers`

### NEVER
- Use Beehiiv for anything (deprecated)
- Use MailerLite for anything (deprecated)
- Rich-text paste into any email editor (strips styling)
- Send newsletters without `--test` first

---

## Database Access

### One Supabase Project, Two Sites — Deliberate, Don't Cross the Streams

CW and KD share ONE Supabase project (`kwtdpvnjewtahuxjyltn`). This is intentional, not legacy debt: the writer team (Sarah/Marcus/Chloe) works both sites from shared `writers` / `writer_content` / `writer_memory_log` tables, and the audience flows both ways (keto → carnivore, ex-carnivore → keto), so cross-referencing lives in one database.

**The separation rules (a shared project is NOT shared data):**
- Site-scoped tables carry a `site` column (`cw`/`kd`): `blog_posts`, `newsletter_subscribers`, `coach_members`, `content_signals`, `drip_subscribers`, `drip_events`, `drip_survey_*`. **Every query, send, or export against these MUST filter by site.** Never SELECT/UPDATE across both sites unless the task is explicitly cross-site.
- `drip_subscribers` / `drip_events` gained a `site` column 2026-07-20 (unique is now `(email, site)` — the same person can be on both drips). CW rows = 30-day Carnivore Starter, KD rows = 30-day Keto Starter.
- Coach tables (`coach_*`) are the KD Coach app. Don't join them into CW reporting except via `coach_members.site`.
- Any NEW table holding per-site data gets a `site` column from day one, and scripts touching it take a `--site` flag (same convention as `send_newsletter.py --site cw|kd`).
- Shared-on-purpose (no site filter needed): `writers`, `writer_content`, `writer_memory_log`, `agent_memories`.

### MCP Access

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
| "run the week" or "weekly ops" | Read `Brew-Vault/04-Systems/Projects/Carnivore-Weekly/Operator-Handbook.md`, run the weekly loop |
| "scoreboard" | Read `Brew-Vault/.../Carnivore-Weekly/reports/scoreboard.md` — Operating Rules at top are canonical; latest dated section has the 10-metric operating table. Act on reds, don't just report them |

---

## Lessons Learned (Don't Repeat These)

### Content
1. Content agents must NOT include template HTML in content fields. Content = article body only.
2. Content agents must NOT generate cross-links to unpublished posts. Check `public/blog/` first.
2a. Cross-site mentions (CW writer referencing a KD post or vice versa) are ENCOURAGED but must be explicit and use the full cross-domain URL: "I wrote a piece over at KetoDial about X" + `https://ketodial.com/blog/...`. NEVER a same-site-relative link (`/blog/...`) pointing at a post that actually lives on the other site — that renders as a same-domain link, 404s, and fails the pre-commit validator (ISSUE-038, recurred 2026-07-05 and 2026-07-08). Verify the target is actually live on that domain (not just `status: published` in `blog_posts.json`) before referencing it.
3. Never set future dates on blog posts. Google penalizes content dated ahead of crawl time.
4. Amazon book links wrap only the title, not the full citation sentence.
5. Template variables must match generator output. Check both sides.
6. NEVER bypass the blog post pipeline. Minimal-schema entries silently break homepage bento and blog index sort.
7. Always run BOTH `generate_blog_pages.py` AND `generate.py --type pages` before commit.
8. Always run post-flight Supabase sync (`scripts/sync_blog_posts_to_supabase.py`).
9. The `autonomous_blog_generation.sh` script blocks on stdin — it cannot run unattended. Use `weekly_content_prompt.md` instead.

### SEO / Slug / Date Rules (burned us twice — ISSUE-021, ISSUE-022)
10. **NEVER batch-rename blog post dates to the same value.** Max 2 posts sharing any single datePublished. Google treats date clustering as a content farming signal and refuses to index.
11. **NEVER rename a published post's slug or date without creating a redirect** from the old URL to the new one (in `data/redirects.json` + a meta-refresh HTML stub). Google has already crawled the old URL — renaming without redirects creates 404s in GSC.
12. **NEVER chain redirects.** If post A redirects to B and B's URL changes to C, update A to point directly to C. The sitemap generator strips redirect stubs automatically, but `redirects.json` entries pointing to old URLs must be manually updated.
13. **Google Indexing API only works for JobPosting/BroadcastEvent schema.** For regular blog pages, resubmit the sitemap and wait for natural recrawl. There is no programmatic "request indexing" for normal pages.

### Code
14. Always use absolute paths in Python scripts.
15. Don't touch `content_validator.py` double-slash regex (fixed with `[^:]` before `//`).

### Validation
16. Pre-commit validator must check link targets exist on disk, not just non-empty hrefs.
17. Affiliate links must use https:// (mixed content triggers browser warnings).
18. New validators: always run against full codebase, not just new files.
19. Health checks must cover blog-to-blog cross-links.

### KetoDial (ISSUE-026 — burned us hard)
20. **NEVER bulk-regenerate KD blog HTML files.** KD posts are standalone HTML with inline content (no data store). A "regeneration" script wiped all 26 posts' article bodies on June 12. Edits must be surgical (sed/python targeting specific tags only).

---

## KetoDial (ketodial.com) — Static Site

KetoDial is a keto-focused site living inside this repo at `ketodial/`. The static site is at `ketodial/public/` (GitHub Pages). The Coach app is at `ketodial/coach-app/` (Vercel).

### KetoDial Blog Post Pipeline

KD blog is a **dual pipeline**:

(a) **Legacy posts (~27 files):** standalone hand-authored HTML files in `ketodial/public/blog/`, content inline in the HTML, no separate data store.

(b) **New posts (since Jun 12):** flow through `data/blog_posts.json` entries with `"site": "kd"` → `scripts/daily_publish.py --site kd` → `ketodial/scripts/generate_kd_blog.py --only-new` renders the HTML from the JSON entry.

**⚠️ NEVER bulk-regenerate KD blog HTML files.** Regeneration overwrites article content (ISSUE-026 wiped all 26 posts on June 12). All edits to existing legacy KD posts must be surgical — use sed/python to target specific tags (meta, images, nav) without touching `<div class="content">`. `--only-new` exists specifically so `generate_kd_blog.py` skips posts whose HTML already exists on disk — never drop that flag.

1. **Template:** Match the exact structure of existing posts (e.g., `keto-flu-electrolyte-fix.html`). Same CSS, nav, footer, JSON-LD schema, GA4 tag (G-0Y79FB48EG), fonts, skip-nav.
2. **Writers:** Use Sarah (health), Marcus (performance), Chloe (community) agents. Same voice rules as CW: no em-dashes, no AI tells, contractions, grade 8-10 reading level.
3. **Disclaimers:** Every health-adjacent post MUST include a "Not a Doctor" blockquote disclaimer before closing `</div>`.
4. **Internal links:** Every new post gets 2-3 cross-links to related KetoDial posts (before the disclaimer). Add backlinks from existing posts to new ones.
5. **After writing:** Update sitemap.xml, blog/index.html (add cards to feed-grid), and submit to GSC via Google Indexing API.
6. **Cross-promo rules:** Max 25% of posts get product mentions. Match product to article topic naturally. Etsy links use UTM params: `?utm_source=ketodial&utm_medium=blog&utm_campaign={slug}`. CW cross-links announced naturally: "Sarah wrote a great piece over at Carnivore Weekly..."

### KetoDial Recipe Pipeline (Mandatory — No Exceptions)

**Step 1 — Scrape via Apify**
Use the Apify MCP tools to scrape recipes from source sites. API key is in `project-nexus/secrets/api-keys.json` under `apify.api_key`.

- Search Apify Store for a recipe scraper actor (e.g., `web-scraper`, recipe-specific actors)
- Target sources: Wholesome Yum, Diet Doctor, KetoConnect, Ruled Me
- **Quality gate:** Only 4.5+ star recipes with verified ratings. No recipes under 4.5 stars.
- **No duplicates:** Check existing recipes in `ketodial/public/recipes/` before scraping
- Extract: title, rating (stars + vote count), servings, prep/cook/total time, calories, fat, protein, net carbs, full ingredient list with amounts, step-by-step instructions

**Step 2 — Build Recipe Cards**
- Template: Match EXACTLY the structure of `ketodial/public/recipes/bacon-spinach-egg-cups.html`
- Same CSS, card layout, gauge SVG, meta row, macro pills, two-column ingredients + method, tip box, pantry/shop section, footer, related recipes
- Design template reference: `ketodial/design/recipes/Recipe-Card-Template.html`
- Category tag in header: Breakfast, Lunch, Dinner, Snack, or Dessert
- Each recipe gets 3 related recipe cards at the bottom linking to same-category recipes

**Step 3 — Generate Images via Replicate**
- NEVER use images from the source recipe site. We generate our own.
- Use Replicate API (model: `black-forest-labs/flux-schnell` at ~$0.003/image). Do NOT use nano-banana-pro (~$0.04/image) or flux-pro.
- API token: `secrets/api-keys.json` under `replicate.api_token`
- Prompt pattern: describe the finished dish as a food photography scene. Append brand suffix: "warm natural light, rich earthy tones, shallow depth of field, high detail, photorealistic, no text, no people"
- Save to: `ketodial/public/images/recipes/recipe-{slug}.jpg`
- Reference script: `scripts/generate_post_images.py` (same Replicate flow, adapt for recipes)
- Update the recipe HTML: replace the photo placeholder `<div class="photo">` with an `<img>` tag pointing to the generated image

**Step 4 — Publish**
After creating recipe HTML files with images:
1. Add entries to `ketodial/public/sitemap.xml` (priority 0.7, monthly changefreq)
2. Add cards to `ketodial/public/recipes/index.html` with correct `data-meal` attribute (breakfast/lunch/dinner/snack/dessert)
3. **Index cards MUST include `<img>` tags** — match existing pattern: `<div class="rwrap"><img src="/images/recipes/recipe-{slug}.jpg" alt="..." loading="lazy" /><span class="net-tag">...`
4. Update the recipe count in the index filter JS (or use `cards.length` dynamic count)
5. Submit URLs to Google Indexing API via service account at `dashboard/ga4-credentials.json`

**PROHIBITED:**
- ❌ Scraping without Apify (use MCP tools, not manual WebFetch)
- ❌ Using images from source recipe sites (generate via Replicate, we own all images)
- ❌ Publishing recipes below 4.5 stars
- ❌ Duplicating existing recipes (check `ketodial/public/recipes/` first)
- ❌ Missing sitemap or index updates
- ❌ Skipping GSC submission
- ❌ Recipes without the pantry/shop section linking to `/pantry.html`
- ❌ Index cards without `<img>` tags (cards render blank without images)

### KetoDial Supabase
- KD shares the ONE project with CW: `kwtdpvnjewtahuxjyltn` (NOT the old `wnwkbbfuatdcfragrrpw`) — see "One Supabase Project, Two Sites" under Database Access for the separation rules
- Same MCP tool: `mcp__eb179240-a327-4553-8a6a-04f57f7ea545__execute_sql`
- Writer memory, waitlist, coach data all in this project; KD rows in shared tables are `site = 'kd'`

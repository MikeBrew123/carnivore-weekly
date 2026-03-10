# Current Status

**Last Updated:** 2026-03-06 (Maintenance + Hardening Session)

**Current Focus:**
Maintenance and hardening complete. Fixed 4 GSC 404s, patched YouTube Shorts infiltration, deployed Supabase migration 029, fixed silent video-section bug (editorial IDs now sourced from content-of-the-week.json, not youtube_data.json). 70 published posts. GSC 12 new March posts submitted to Indexing API.

---

## Outstanding TODOs

- **Email deliverability** — DKIM/SPF/DMARC for carnivoreweekly.com; emails still hitting spam. Priority.
- **GSC re-crawl confirmation** — Validate 4 stubs fixed after Google re-crawls (expected 24-72h from 2026-03-06).
- **12 March posts indexing** — Submitted to Indexing API 2026-03-06; confirm indexed in next GSC check.
- **SECURITY: Rotate Supabase service role key** — Old key exposed in git history (commit range `1e4216a`–`54f1d9d`). Rotate in Supabase Dashboard → Settings → API, then update `secrets/api-keys.json` and `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`.
- **Newsletter sending mechanism** — `generate_newsletter.py` creates HTML but no automated flow to send via MailerLite campaign yet.
- **Affiliate content (queued)** — Starter Kit roundup hub page, then individual reviews: chest freezer, meat thermometer, cast iron skillet. One per week max.
- **Chloe cross-promo** — Have Chloe casually mention Marcus's air fryer post in next weekend roundup. Link to `/blog/2026-02-25-best-air-fryer-carnivore-ninja-foodi.html`.

---

## Latest Session (2026-03-06 — Maintenance + Hardening)

### GSC 404 Fixes
- 4 GSC 404 errors resolved: redirect stubs deployed for dead URLs + blog manifest corrected
- GSC "Validate Fix" triggered for all 4 URLs; Google re-crawl expected 24-72h
- Root cause logged — stubs were missing from prior cleanup (Feb 26 orphan removal)

### YouTube Shorts Filter
- Silent infiltration: Shorts (< 5 min) were slipping into content-of-the-week selections
- Fix applied at two points: (1) collection stage in run_weekly_update.sh and (2) commentary selection in generate_commentary.py
- Threshold: `duration_seconds >= 300` required for any video to qualify
- Required Supabase migration 029 to store duration data

### Supabase Migration 029
- Added `duration_seconds INTEGER` and `top_comments JSONB` columns to `youtube_videos` table
- Backfilled existing records where possible
- Migration file: `migrations/029_add_duration_top_comments.sql`

### Trending Topics Link Hardening
- All trending topic entries now link to a relevant wiki anchor or blog post
- Fallback matcher tightened: requires 2+ meaningful word overlap (prevents false positives like "coffee" matching "ribeye steak")
- Previously some topics rendered with dead or missing hrefs

### Migrations Folder Cleanup
- 5 duplicate and draft migration files removed
- Migrations folder now clean; each migration number is unique and applied exactly once

### Video Section Silent Bug — Root Cause + Fix
- **Bug:** Homepage video section was rendering blank despite content-of-the-week.json having valid entries
- **Root cause:** `generate.py` was attempting to match editorial video IDs against `youtube_data.json` IDs. When the weekly update rotated videos, IDs in content-of-the-week.json no longer matched IDs in youtube_data.json, so no videos passed the filter — silent blank.
- **Fix:** `content-of-the-week.json` is now the authoritative source for the video section. `generate_commentary.py` now writes `creator`, `title`, and `thumbnail_url` directly into content-of-the-week.json at generation time. Homepage template reads directly from that file. No ID cross-reference against youtube_data.json.
- **Impact:** Video section will always render as long as commentary generation succeeds. Resilient to youtube_data.json rotation.

### Automation Hardening — Content Analyzer
- Content analyzer prompt updated: Claude now receives a list of published blog post slugs/titles as options when selecting related content for trending topics and commentary
- Eliminates hallucinated post references that previously caused dead internal links
- Fallback: if no post matches with 2+ word overlap, topic renders without a link (no broken href)

### Google Indexing API — 12 March Posts
- `gsc-request-indexing.js` run against all March posts not yet confirmed indexed
- 12 URLs submitted; crawl expected 24-48h
- GSC snapshot pre-submission: March posts showing impressions but not indexed

### generate_commentary.py Enhancement
- Now writes `creator`, `title`, and `thumbnail_url` into content-of-the-week.json for each selected video
- Eliminates the dependency on youtube_data.json ID matching that caused the video section blank bug

### Files Modified (2026-03-06)
- `migrations/029_add_duration_top_comments.sql` — NEW: duration_seconds + top_comments columns
- `scripts/generate_commentary.py` — Shorts filter, blog post options in prompt, write creator/title/thumbnail to cotw.json
- `scripts/run_weekly_update.sh` — Shorts filter at collection stage
- `data/content-of-the-week.json` — Now authoritative source for video section (creator/title/thumbnail stored)
- `public/index.html` — Video section reads from cotw.json directly (no youtube_data.json ID match)
- `templates/index_template.html` — Same fix applied to source template

---

## Previous Session (Feb 26 Evening — Calculator Hype Post + SEO + CTR Optimization)

### Calculator Hype Post
- **New post published:** "The Only Macro Calculator for Carnivore, Keto & Low-Carb"
- **URL:** `/blog/2026-02-26-best-macro-calculator-carnivore-keto-low-carb.html`
- **3 writers:** Sarah (science), Marcus (performance), Chloe (real experience)
- **17 calculator links, 4 CTA boxes, FAQ schema** (5 questions with microdata)
- **SEO targets:** "carnivore macro calculator", "keto macro calculator", "carnivore diet calculator", "low carb macro calculator"
- **Title:** 56 chars (shortened from 80 to avoid SERP truncation)
- **7+ exact-match keyword placements** added to body text after SEO audit found zero
- Submitted to Google Indexing API

### CTR Optimization — Adaptation Timeline
- Post had **1,590 impressions, 0 clicks** at avg position 2-4
- **New title:** "Carnivore Adaptation Timeline: Week-by-Week Symptoms & Fixes" (60 chars)
- **New meta:** Concrete week-by-week preview with specific milestones
- Check GSC for improvement

### GSC Snapshot (Feb 26)
- 7-day: 2,626 impressions, 5 clicks, 0.2% CTR, avg position 6.6
- Top page: Calculator — 4 clicks, 211 impressions
- 17/20 recent posts indexed, 3 stragglers submitted

---

## Previous Session (Feb 26 — Affiliate Post + GSC 404 Fixes + Site Cleanup)

### Affiliate Content
- **First product review:** "Air Fry Everything: A Carnivore's Best Kitchen Upgrade"
- **URL:** `/blog/2026-02-25-best-air-fryer-carnivore-ninja-foodi.html`
- Amazon affiliate link (`amzn.to/4aSJxXQ`), 6% Kitchen & Dining commission
- Already indexed by Google

### GSC 404 Fixes (Feb 26)
- `/{{unsubscribe_url}}` — MailerLite template variable leaked into newsletter-preview.html. Fixed preview + patched generate_newsletter.py.
- `/about/about.html` — Relative href resolved to double path. Fixed to `/about/`.

### Site Cleanup
- 11 tracked orphan files deleted, ~6.2MB untracked stale files removed

---

## Previous Session (Feb 25 — GSC Tooling + Indexing API + Pipeline Deploy)

- GSC report fixed to use `sc-domain:` property format
- Service account upgraded to Owner for URL inspection API
- Indexing API enabled (`indexing.googleapis.com`)
- `gsc-request-indexing.js` created — programmatic Indexing API submissions
- 6 unindexed Feb 8-9 posts submitted

---

## Previous Session (Feb 23 — SEO Audit + MailerLite Migration + Form Fixes)

- 22 meta descriptions rewritten (120-160 chars with keywords)
- Jinja2 autoescaping fix (HTML entities in titles/descriptions)
- MailerLite 7-day drip + newsletter groups wired
- All 3 forms (starter plan, newsletter, feedback) routed through Cloudflare Worker
- archive.html template fixed (skip-nav + JSON-LD added to source template)

---

## Current Status: PRODUCTION - FULLY OPERATIONAL

**All Features Working:**
- Calculator: Full flow + Stripe $29 + PDF + conversion tracking
- Blog: 70 published posts, 3-wall validation, daily-publish cron active
- Email: MailerLite 7-day drip + newsletter groups, Worker proxy
- Feedback: Worker → Supabase content_feedback
- GSC Tooling: gsc-report.js + gsc-request-indexing.js
- Etsy: 14 active listings, API scripted
- Supabase: MCP connected, 30+ tables, keep-alive active
- Weekly Automation: run_weekly_update.sh (Sun + Wed midnight UTC)
- Homepage Video Section: cotw.json is authoritative, Shorts filtered

---

## Next Session Priorities (Updated 2026-03-06)

**Phase: GROWTH — Traffic building, CTR optimization, content scaling.**

1. **Confirm GSC 404s cleared** — Re-crawl expected 24-72h; check GSC after
2. **Confirm 12 March posts indexed** — Submitted 2026-03-06; check GSC in 24-48h
3. **Email deliverability** — DKIM/SPF/DMARC for carnivoreweekly.com (top priority, emails hitting spam)
4. **Monitor CTR improvements** — Adaptation timeline post (1,590 imp / 0 clicks before fix)
5. **Chloe weekend roundup cross-promo** — Casual mention of Marcus's air fryer post
6. **Starter Kit roundup hub page** — First spoke of affiliate content strategy
7. **Rotate Supabase service role key** — Still outstanding from Feb security flag

---

**Latest Obsidian Log:** `/Users/mbrew/Documents/Brew-Vault/07-Daily/2026/03/2026-03-06.md`

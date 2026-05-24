# Current Status

**Last Updated:** 2026-05-24 (Hermes Onboarding + Calculator Tracking)

**Current Focus:**
Hermes onboarded as growth analyst. Email capture chain fixed (was silently broken). Scoreboard built. Calculator diet-selection GA4 tracking deployed. Waiting ~48h for data to confirm keto vs carnivore demand split.

---

## Outstanding TODOs

- **Generate proper hero images** — 12 posts using placeholder copies; need unique images
- **Author profile pages** — /about.html#sarah-whitfield etc. needed for Google Quality Raters
- **Author bio/photo block in template** — Only byline + schema updated; no visible bio on posts
- **PubMed citation links** — PMIDs exist in posts but aren't hyperlinked
- **Calculator CTA conversion tracking** — ✅ DONE (May 24) — diet_selected, completed, email_cta, product_cta events live
- **Internal linking** — Indexed posts don't link to calculator
- **Starter plan page traffic** — Only 3 views/30 days (down from 18/week)
- **Newsletter flows broken** — ✅ FIXED (May 24) — forms now hit Cloudflare Worker → MailerLite directly. N8N bypassed.
- **Backfill E-E-A-T signals** — 75+ existing posts still lack new writer identity signals
- **Etsy buyer message** — Updated copy written by Sarah; needs to be pasted into Etsy dashboard (digital + merch messages)
- **Blog post queue empty** — Next scheduled: None. Writers need to batch new posts.

---

## Latest Session (2026-05-24 — Hermes Onboarding + Measurement Sprint)

### Hermes Onboarded
- Growth/Ops Analyst role, communicates via Brew-Vault GitHub repo
- First spec delivered and executed same day (calculator tracking)
- Claude is CAO, Hermes advises, Brew has final say

### Email Capture Fixed (Was Silently Broken)
- starter-plan.html: N8N webhook → Cloudflare Worker (N8N had broken Supabase JWT)
- index.html: wrong form ID + Supabase client → corrected selector + Worker fetch
- calculator.html + keto-macro-calculator.html: added capture forms (didn't exist before)
- Uploaded MAILERLITE_API_KEY to Cloudflare (was missing)
- End-to-end tested: form → Worker → MailerLite → correct group → automation triggers

### Calculator Diet-Selection Tracking (GA4)
- `calculator_diet_selected` — fires on diet dropdown change
- `calculator_completed` — fires when results shown (step 3)
- `calculator_email_cta_clicked` — fires on post-calc email form submit
- `calculator_product_cta_clicked` — already existed as `calculator_upgrade_click`
- Fixed: tracking was in dead CalculatorWizard.tsx, moved to active CalculatorApp.tsx
- Rebuilt and deployed React app with new bundle hash

### Scoreboard
- `data/scoreboard.json` — baseline week (May 19) with all metrics
- Calculator tracking fields added (null until ~48h data collection)
- Brew-Vault `scoreboard.md` pushed for Hermes

### Team Overview Document
- Full architecture writeup: writer agents, memory system, why we chose this design
- Wins and losses honestly documented
- Current state: 131 posts, 72 sessions/week, $3.91 net profit, 62x gap to $1k target

---

## Previous Session (2026-05-19 — CLAUDE.md Consolidation + Docs Purge)

### CLAUDE.md Cleanup
- Project CLAUDE.md: 1,012 → 281 lines. Only prescriptive rules remain.
- Root CLAUDE.md: 286 → 136 lines. Global rules only, zero CW-specific content.
- Applied Prescriptive Test: rules stay in CLAUDE.md, facts move to memory files.
- Fixed Leo/MCP contradiction: Leo designs SQL but cannot execute MCP tools.

### Memory System Established
- 12 memory files created at `.claude/projects/.../memory/`
- Covers: credentials, Supabase config, Stripe MCP, newsletter workflow, autonomous pipeline, calculator validation, goals, user profile, feedback rules
- MEMORY.md index file for discoverability

### Stale Documentation Purge (251 files, ~95K lines)
- Deleted: docs/architecture/ (34), docs/specs/ (40), docs/qa/ (19), docs/design-system/ (18), docs/systems/ (11), docs/getting-started/ (11), docs/agents/ (12), api/ (12), calculator2-demo/ (13 .md files)
- Deleted: AGENTS.md, FAQ.md, START_HERE.md, STATUS.md, brand-kit.md, style-guide.md, etc.
- Archived: agent reports, visual baselines, daily logs → docs/archive/reports-archive/

### Agent Cleanup
- Deleted: casey.md, jordan.md, alex.md, eric.md, sam.md (both agents/ and .claude/agents/)
- Casey/Jordan refs in scripts (generate.py, full-validation-sweep.py, seed_writer_data.js) are harmless — low-priority future cleanup
- Active agents: Quinn (ops), Sarah/Marcus/Chloe (writers), Leo (DB design)

### Commit
- `5c25235 chore: consolidate CLAUDE.md and purge 95K lines of stale docs`
- Branch: claude/magical-leavitt-11291e (pushed to remote)

---

## Session (2026-04-13 — Pipeline Fix + Etsy Review)

### Daily-Publish Pipeline Bug — FIXED (commit 208b5ab)

**Root cause:** `.github/workflows/daily-publish.yml` line 37 used `git diff --name-only` to detect new blog HTML files. But new files are **untracked** — `git diff` only sees modifications to already-tracked files. So new posts were generated in the runner, but `has_changes` was always `false`, the commit step was skipped, and the HTML was thrown away. Every day from Apr 8-12 the workflow ran, published posts in memory, and discarded the results.

**Fix:** Changed to `git add -A` before the diff, then `git diff --staged --name-only` to detect both new and modified files.

**Impact:** 5 posts sat unpublished for up to 5 days. Sarah's Apr 8 post (published manually on Apr 8) was live but showed 404 initially because the index listed it before the HTML existed.

**Verification:** All 5 backlogged posts manually published and pushed. Workflow fix deployed — future runs should commit correctly.

### Missing Hero Images — PATCHED (commit 1a09ecd)

**Root cause:** 12 posts (Mar 15 onward) never had hero images generated. The "Validate & Deploy" workflow treats missing images as critical and exits with code 1, blocking deployment.

**Fix:** Copied placeholder images for all 12 posts. These are identical copies — proper unique images still need to be generated.

### Etsy Sales & Cross-Sell

- 4 total Etsy orders: 2x Keto Food List, 1x Lion Diet, 1x Pescatarian (CA$4.49 each)
- **Zero Etsy referral traffic** to carnivoreweekly.com in GA4 — old buyer messages had no links
- Sarah wrote updated "Message to buyers" for both digital and merch purchases
- Digital message includes free calculator CTA + ETSY50 discount code for all diet types
- Messages not yet applied in Etsy dashboard — needs manual paste

### E-E-A-T Overhaul (from Apr 7 session, context carried forward)

- Writers got full names: Sarah Whitfield, Marcus Cole, Chloe Navarro
- Conference memories created (~800 words each) for first-person experience signals
- Cross-referencing rules: writers reference each other's previous week articles only
- Affiliate links: LMNT + ButcherBox integrated; Amazon discontinued
- Template updated: full author names in byline + enhanced Person schema with url/image
- Generator updated: full name lookup dictionary

### Site Traffic (7-day snapshot, Apr 6-13)

- 44 users, 53 sessions, 101 pageviews
- Calculator: 28 views (17 users) — still #1 draw
- Starter plan: 3 views in 30 days — effectively dead
- Sources: 105 direct, 30 Google, 15 DuckDuckGo, 7 Bing, 2 ChatGPT
- No Etsy referral traffic at all

---

## Session (2026-04-05 — Security Hardening + GSC Push)

### Email Deliverability — FIXED
- DMARC record added: `v=DMARC1; p=none; rua=mailto:dmarc-reports@carnivoreweekly.com`
- SPF confirmed covering MailerLite; DKIM live for Resend
- All three DNS checks now pass — emails should stop hitting spam

### Supabase Key Rotation — COMPLETE
- Old key rotated in Supabase Dashboard
- New key updated in: Wrangler (carnivore-report-api), secrets/api-keys.json, apply-migration.js, apply-migrations.js, VERIFY_WRANGLER_SETUP.sh
- Deploy scripts refactored to read key from secrets/api-keys.json at runtime — no more hardcoded keys

### Supabase CLI
- Logged in with personal access token (stored in secrets/api-keys.json → `cli_access_token`)
- Can now apply migrations directly without dashboard SQL editor

### RLS Migration Applied
- Dropped `rls_public_update_calculator2_sessions` — anon users could update any session
- Dropped duplicate `select_calculator2_sessions` policy
- Migration file: `supabase/migrations/20260405_tighten_calculator2_sessions_rls.sql`
- Applied directly in Supabase SQL editor (confirmed: no rows returned = policies gone)

### GSC Indexing Push
- GSC report pulled: 97 submitted in sitemap, 6 of 20 recent posts indexed
- 14 unindexed March posts submitted to Indexing API
- Sitemap resubmitted to GSC
- Adaptation timeline post: 3,535 impressions / 3 clicks (0.08% CTR) — title rewritten

### Adaptation Timeline CTR Fix
- Old title: "How Long Does Carnivore Adaptation Take? Week-by-Week Timeline"
- New title: "Carnivore Flu Timeline: When Does Adaptation Actually End?"
- New meta: "Week 2 feels like quitting. Here's exactly what's happening in your body each week of carnivore adaptation — and when most people finally turn the corner."
- H1, OG, Twitter, schema all updated. Deployed to Cloudflare Pages.

### File Cleanup
- Deleted: WealthSimple monthly statements (5 files), TD account activity (9 files), crypto_transaction_summary.csv, investment_holdings.csv, Apple Watch ECG exports (13 files)

---

## Previous Session (2026-03-06 — Maintenance + Hardening)

- 4 GSC 404s fixed, YouTube Shorts filter deployed, Supabase migration 029, video section silent bug fixed, trending topics link hardening, 12 March posts submitted to Indexing API

---

## Current Status: PRODUCTION - FULLY OPERATIONAL

**All Features Working:**
- Calculator: Full flow + Stripe $29 + PDF + conversion tracking
- Blog: 70+ published posts, 3-wall validation, daily-publish cron active
- Email: DKIM/SPF/DMARC live; MailerLite 7-day drip + newsletter groups
- Feedback: Worker → Supabase content_feedback
- GSC Tooling: gsc-report.js + gsc-request-indexing.js
- Etsy: 14 active listings, API scripted
- Supabase: CLI logged in, MCP connected, 30+ tables, keep-alive active
- Weekly Automation: run_weekly_update.sh (Sun + Wed midnight UTC)

---

## Next Session Priorities (Updated 2026-04-05)

1. **Check GSC** — Are 14 March posts + 3 newly sitemapped posts indexed? (24-48h from submission)
2. **Calculator conversion tracking** — Add event tracking to CTA clicks
3. **Internal linking** — Link indexed posts to calculator
4. **Starter plan page** — Figure out why traffic is flat at 18 views/week
5. **Affiliate hub page** — Starter Kit roundup

---

## Evening Session (2026-04-05 — Validation + CI Fix)

### CI Fix
- `gsc-request-indexing.js` existed locally but was never committed — daily-publish workflow failing with exit code 1
- Fixed: committed the file, pipeline green on manual re-run
- **Lesson:** Any script referenced in a GitHub Actions workflow must be tracked in git

### Full Site Validation
- `validate_before_commit.py` → 129 warnings, 0 critical
- W3C (`validate-w3c.sh`) → 90/90 real posts pass; 2 redirect stubs flagged (expected)

### Fixes Applied
- 3 posts missing from sitemap added (Mar 27, 29, 31) — were invisible to Google
- 89 post images batch-patched with `width="1200" height="630" loading="lazy"` (CLS)
- Blog post template img tag fixed — all future posts get attributes automatically
- SEO hard rules added to Sarah, Marcus, Chloe agent self-check sections
- 19 long titles rewritten by writer agents in parallel — all now ≤60 chars

### Key Lesson: Writer agents > batch sed for content edits
Batch sed truncates blindly. Writer agents read the post, understand the topic, and write keyword-forward titles. Always use agents for title/meta rewrites.

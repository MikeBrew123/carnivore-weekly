# Current Status

**Last Updated:** 2026-04-05 (Security Hardening + GSC Indexing Push)

**Current Focus:**
Security debt cleared. Email deliverability fixed. 14 March posts submitted to Indexing API. Growth phase — traffic, CTR, conversion tracking.

---

## Outstanding TODOs

- **Confirm 14 March posts indexed** — Submitted to Indexing API 2026-04-05; check GSC in 24-48h
- **Calculator CTA conversion tracking** — 9 clicks/week with zero visibility into what converts
- **Internal linking** — Indexed posts don't link to calculator; leaving authority on the table
- **Starter plan page traffic** — Only 18 views/7 days; needs promotion
- **Affiliate content** — Starter Kit roundup hub page (first spoke of affiliate strategy)
- **Chloe cross-promo** — Mention Marcus's air fryer post in next weekend roundup
- **Newsletter sending mechanism** — generate_newsletter.py creates HTML but no automated send flow

---

## Latest Session (2026-04-05 — Security Hardening + GSC Push)

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

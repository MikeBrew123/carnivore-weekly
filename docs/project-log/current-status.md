# Current Status

**Last Updated:** 2026-02-02 (N8N Infrastructure Discovery)

**Current Focus:**
Discovered "Angie" Telegram bot assistant in N8N (created Sept 2025, never worked properly). User confirmed it could be useful for "Project Nexus" (knowledge management system). Decision: Rebuild Angie using modern MCP architecture instead of fixing old N8N implementation. Plan to integrate with Project Nexus (Supabase) and add Google Calendar/Gmail/Contacts MCP servers for standardized tool access.

---

## Latest Session (Feb 2 - N8N Infrastructure Discovery)

### Angie Telegram Bot Analysis
**Discovery:** Found active N8N workflow "Angie, Personal AI Assistant with Telegram Voice and Text"
**Created:** Aug 29, 2025 (from n8n template)
**Last Updated:** Sept 3, 2025
**Status:** Active but never worked properly per user

**Current Architecture (19 nodes):**
- Telegram Trigger → Voice/Text processing
- OpenAI Whisper for speech-to-text
- Tools: Google Calendar, Gmail, Google Contacts, SendEmail
- Window Buffer Memory (conversation history)
- Direct OpenAI API calls in N8N

**Limitations:**
- Direct OpenAI API calls (brittle)
- N8N-specific integrations (not standardized)
- No connection to project knowledge
- No long-term memory beyond conversation buffer

### Project Nexus Identified
**Revelation:** User mentioned "Project Nexus" as their knowledge management system
**Context:** Angie could integrate with Project Nexus
**Implication:** Supabase-based institutional memory already exists for Angie to tap into

### Modern MCP Architecture Proposal
**Decision:** Rebuild Angie using MCP tools instead of fixing N8N implementation

**Proposed Architecture:**
```
Telegram → Claude Agent (Angie)
           ├─ Supabase MCP (Project Nexus knowledge)
           ├─ Google Calendar MCP
           ├─ Gmail MCP
           ├─ Google Contacts MCP
           ├─ N8N MCP (workflow triggers)
           └─ Hostinger MCP (site management)
```

**Benefits:**
- Standardized tool interfaces (MCP ecosystem)
- Integration with Project Nexus institutional memory
- Better context management and reliability
- Access to project decisions, logs, knowledge entries
- More robust than direct API calls

**Next Session Prep:**
- User will start fresh session to discuss Angie rebuild
- Need to understand Project Nexus structure
- Need to install Google Calendar/Gmail/Contacts MCP servers
- Design Angie's role in Project Nexus ecosystem

**Status:** Planning phase, awaiting next session

---

## Previous Session (Feb 1 - SEO Cleanup)

### Google Search Console Analysis
**Crawl Stats (Dec 24 - Feb 1):**
- Very low crawl activity (5 days with crawling out of 39)
- Peak day: Jan 28 with 12 requests
- Identified 24 broken URLs (404 errors)

**Root Causes:**
- Blog posts had mismatched id (wrong date) vs slug (correct date) in blog_posts.json
- Google crawled URLs using the wrong "id" format
- Sitemap missing all blog posts (only 6 main pages)
- Wiki URL incorrect in sitemap (wiki.html vs wiki/)

### URL Redirect Fix
**Created:** `public/.htaccess`
**Action:** Added 301 redirects for 13 blog posts with wrong dates

Example:
```
Redirect 301 /blog/2025-01-27-coffee-on-carnivore.html /blog/2026-01-27-coffee-on-carnivore.html
```

### Blog Posts JSON Fix
**Fixed:** `data/blog_posts.json`
**Issue:** 14 posts had id/slug mismatches
**Solution:** Updated all IDs to match slugs (actual filenames)

### Sitemap Enhancement
**Updated:** `sitemap.xml`
**Changes:**
- Added 46 published blog posts
- Fixed wiki URL: wiki.html → wiki/
- Removed broken about.html
- Sitemap grew from 6 URLs → 51 URLs

### URL Validation
**Method:** Validated all 51 sitemap URLs with curl
**Result:** All URLs return 200 OK

### Search Console Indexing Requests
**User submitted 11 priority URLs for indexing:**
- 4 main pages (homepage, channels, wiki, calculator)
- 7 fresh blog posts (Jan 27-31 with real content)

### SEO Impact Summary
**Before:**
- 24 broken URLs
- Minimal crawl activity (5 days out of 39)
- 6 URLs in sitemap
- No blog posts indexed

**After:**
- All URLs working with 301 redirects
- 51 URLs in sitemap
- 11 priority URLs submitted for indexing
- Foundation for organic traffic growth

**Expected Results (Next 2-4 Weeks):**
- 404 errors drop from 24 → near 0
- Crawl activity increases
- Blog posts get indexed (46 new URLs)
- Organic traffic begins flowing

**Files Modified:**
- `public/.htaccess` (created with 301 redirects)
- `data/blog_posts.json` (fixed 14 id/slug mismatches)
- `sitemap.xml` (added 46 blog posts, fixed wiki URL, removed about.html)
- `public/robots.txt` (removed unsupported Host directive)

**Commits:** Pushed to main
**Status:** ✅ Deployed to production, monitoring indexing progress

---

## Earlier Session (Feb 1 - Blog Validation + Content Fix)

### GitHub Actions Fix
**Problem:** Workflow needed API key for validation
**Fix:**
- Added ANTHROPIC_API_KEY secret to `.github/workflows/blog_publish.yml`
- User configured secret in GitHub Actions settings
- Validation now has API access for AI text detection

### Blog Post Validation Integration
**Added to:** `scripts/check_scheduled_posts.py`

**Validation Function:** `validate_post(html_file)`
Checks for 7 critical issues:
1. Empty meta description (`content=""`)
2. Broken canonical URLs (`.html` suffix)
3. AI tells (em-dashes, "delve", "robust", "leverage", "navigate", "crucial", "realm", "landscape", "utilize")
4. Missing Google Fonts preconnect
5. Missing blog-post.css link
6. Missing `<div class="post-content">` wrapper
7. Em-dashes in content body

**Behavior:**
- Invalid posts: Deleted and logged (fail-fast)
- Valid posts: Proceed with publishing
- Prevents bad content from reaching production

### Evening Session: Placeholder Content Fix
**Problem:** 7 blog posts (Jan 27-31) contained placeholder content despite previous commits claiming they were complete.

**Posts Fixed:**
- 2026-01-27-coffee-on-carnivore.html (Marcus, 1,046 words)
- 2026-01-27-beginners-complete-blueprint.html (Sarah, 1,089 words)
- 2026-01-28-carnivore-didnt-fix-everything.html (Chloe, 1,089 words)
- 2026-01-29-medical-establishment-backlash.html (Sarah, 1,087 words)
- 2026-01-30-organ-meats-for-skeptics.html (Marcus, 1,148 words)
- 2026-01-30-real-2-week-results.html (Chloe, 1,089 words)
- 2026-01-31-meal-timing.html (Sarah, 1,043 words)

**Solution:**
- Generated real content using 7 parallel Task agents (Sarah, Marcus, Chloe personas)
- All content passes quality checks (no AI tells, no em-dashes, conversational tone)
- Fixed related-content component (was showing empty due to missing data-content-id attributes)
- Committed and pushed all changes to production

### First Automated Test
- **Date:** Feb 2, 2026 at 9 AM EST
- **Post:** "2026-02-01-building-social-support.html"
- **Purpose:** Test full validation pipeline in production

### Decisions
- **Validation now automated** - No longer manual-only
- **Fail-fast approach** - Delete invalid posts immediately
- **7 critical checks enforced** - Most common issues caught early
- **Visual validation deferred** - Complex checks for future automation
- **Parallel Task agents work well** - Efficient for bulk content generation with clear persona guidelines
- **SEO focus: Fix broken URLs first** - Google can't index broken pages, redirects preserve link equity

**Commits:** Pushed to main
**Status:** ✅ Deployed to production, ready for tomorrow's test

---

## Known Technical Debt

### Calculator SEO (Do Not Touch)
**Decision (2026-01-26):** Do not modify calculator SEO until stability is confirmed. Calculator is receiving traffic and working correctly.

**Minor issues documented for later:**
1. Canonical URL points to `/calculator.html` instead of `/calculator/` - minor inconsistency
2. Assessment/success page is a redirect with no SEO tags - acceptable for redirect behavior

**Status:** Deferred. Calculator is stable and generating traffic.

---

## Earlier Session (Jan 31 - Blog Post Formatting Fixes)

### Issue Identified
Multiple blog posts had incorrect fonts, font sizes, and text colors due to:
1. Missing Google Fonts links (Libre Baskerville, Source Sans 3)
2. Missing `<div class="post-content">` wrapper
3. blog-post.css missing explicit text color rule

### Posts Fixed
- 2025-12-29-lion-diet-challenge.html (fonts + structure)
- 2025-12-25-new-year-same-you.html (fonts)
- 2025-12-27-anti-resolution-playbook.html (fonts)
- 2025-12-28-physiological-insulin-resistance.html (fonts)
- insulin-resistance-morning-glucose.html (fonts)

### Changes Made
1. Added Google Fonts preconnect links to all 5 posts
2. Added `<div class="post-content">` wrapper to lion-diet-challenge
3. Updated blog-post.css with text color rule: `color: var(--cw-text) !important;`

### Decisions
- **blog-post.css must include explicit color rule** - Ensures consistent text rendering
- **All blog posts require Google Fonts links** - Mandatory for Libre Baskerville and Source Sans 3
- **All blog posts must have post-content wrapper** - Required for CSS rules to apply correctly
- **Gold standard: 2026-01-25-complete-carnivore-protocol-report.html** - Use as template reference

**Commits:** d1bd278, 424cee4
**Status:** ✅ Deployed to production

### GitHub Actions Automation Fix
**Problem:** Workflow failed Jan 30-31, preventing 7 scheduled posts from publishing automatically.
**Root Cause:** `wiki-keywords.json` existed locally but was gitignored, causing `FileNotFoundError` in GitHub Actions.

**Posts Published (manually):**
- Meal Timing on Carnivore (Jan 31)
- Real 2-Week Results (Jan 30)
- Organ Meats for Skeptics (Jan 30)
- Medical Establishment Backlash (Jan 29)
- Carnivore Didn't Fix Everything (Jan 28)
- Beginner's Complete Blueprint (Jan 27)
- Coffee on Carnivore (Jan 27)

**Fix Applied:**
- Added `!data/wiki-keywords.json` to .gitignore exceptions
- Committed wiki-keywords.json to repository
- Regenerated blog index, RSS feed, sitemap

**Commits:** e8cd434, f19f52c
**Status:** ✅ Deployed to production, automation fixed for future runs

---

## Earlier Session (Jan 25 Evening - Blog Audit)

### Blog Image Fixes
- Fixed ghost avatar images on `environmental-impact.html`
- Fixed ghost avatar images on `insulin-resistance.html`
- Images were referencing non-existent file paths

### SEO Audit (Top 5 Posts)
- Completed SEO review of top 5 blog posts
- Identified meta description gaps
- Identified internal linking opportunities
- Hero images created with proper branding

### Key Decision: Batch Updates Do Not Work
**Problem:** Attempted batch script approach to fix blog post issues failed repeatedly.
**Root Cause:** Each post has unique edge cases (different image paths, varied formatting, inconsistent structures).
**Decision:** Abandon batch approach. Tomorrow begins methodical 1-by-1 audit of all 40 blog posts.

---

## Earlier Session (Jan 25 - Blog Index Architecture)

### Blog Index Redesign (Major)

**Converted from hardcoded HTML to data-driven template:**
- Old: 1,090 lines of manually edited HTML
- New: Jinja2 template loops through `blog_posts.json`
- Adding posts: JSON entry + regenerate = done

**New magazine-style design:**
- Featured post hero (tilted card effect)
- Calculator promo banner (shimmer animation, $9.99 CTA)
- Author + category filters (client-side JS)
- Post card grid with hover effects
- Meet the Writers + Newsletter preserved

**RSS feed generation:**
- Template: `templates/feed_template.xml`
- Output: `public/feed.xml`
- Full content, RFC 822 dates, dc:creator
- Fixed empty lastBuildDate bug

**GEO improvements:**
- Added sameAs links (YouTube, Twitter, Instagram) to schema
- RSS validated (W3C)
- All 5 AI bots granted access

**New workflow for adding posts:**
1. Add to `data/blog_posts.json`
2. Create HTML in `public/blog/`
3. Run `python3 scripts/generate_blog_pages.py`
4. Post appears in index + RSS

**Files changed:**
- `templates/blog_index_template.html` - Complete rewrite
- `templates/feed_template.xml` - New
- `scripts/generate_blog_pages.py` - RSS + rss_date filter
- `data/blog_posts.json` - featured flag
- `public/blog.html` - Regenerated
- `public/feed.xml` - New

---

## Catch-Up Session (Jan 25 - Quinn Fix)

### Quinn Logging Protocol Fixed
**Problem:** Quinn confirmed logging complete but files were never written (Jan 21-25 work lost).
**Root Cause:** Conflicting instructions between `.claude/agents/quinn.md` and `CLAUDE.md` + no verification step.
**Fix:**
- Unified log location: `docs/project-log/` only
- Added mandatory verification: Quinn must run `ls`/`cat` after write
- Deprecated old locations: `agents/daily_logs/`, `memory.log`

### Catch-Up Work Logged (Jan 21-25)
- Electrolyte Protocol Part 1 & Part 2 blog posts
- 7 research briefs added to wiki
- Writer headshots added to blog index
- Blog signatures fixed (Casey to Chloe)
- Affiliate cards: product images + LMNT callout
- Daily blog publishing automation enabled
- Blog posts now fetch from Supabase
- 21 commits captured in catch-up log

**See:** `docs/project-log/daily/2026-01-25.md` for full details

---

## Current Status: PRODUCTION - FULLY OPERATIONAL

**All Features Working:**
- Calculator: Full flow + personalized reports + payment processing
- Payment: CORS headers correct, Stripe integration active, test999 coupon verified
- PDF Generation: Clean output (no version text)
- Homepage: Chloe's roundup, top videos, hero section, editorial commentary
- Channels: Toggle functionality, featured creators, 70 videos loaded
- Blog: Post reactions JS, related content JS, feedback modal, WCAG compliant colors
- Blog Index: Data-driven (Jinja2), magazine layout, author/category filters
- Blog Validation: Automated in check_scheduled_posts.py (7 critical checks)
- Blog Content: All 7 Jan 27-31 posts now have real content (900-1200 words each)
- Related Content Component: Fixed and working on all posts
- RSS Feed: W3C valid, full content, auto-generated
- Mobile: Navigation and layouts fixed (including calculator protein table)
- Template System: Source of truth established
- Supabase Caching: Videos cached, resilient to API failures
- Newsletter: Connected to database, subscribers saving
- Weekly Automation: 9-step pipeline operational
- Deployment Pipeline: Verified working with /version endpoint
- Accessibility: WCAG 2.1 AA color contrast validated
- GEO: COMPLETE - All major pages have structured data + sameAs links
- Analytics Tracking: Internal links, scroll depth, outbound clicks, wiki searches
- Analytics Reports: 4 reports with "show reports" trigger
- SEO: 51 URLs in sitemap, all URLs validated (200 OK), 11 priority URLs submitted for indexing

---

## Pending CEO Review - HIGH PRIORITY

**Strategic Document:** `/Users/mbrew/Developer/carnivore-weekly/docs/GROWTH-STRATEGY-2026.md`

**Scope:** 90+ page comprehensive growth strategy covering:
1. Controversy & debate content strategy
2. Transformation Tuesday series
3. Video content strategy
4. Interactive tools roadmap
5. Community engagement mechanisms
6. 4-week launch plan
7. Success metrics

**Decision Points Required:**
- Which initiatives to prioritize for Q1 2026
- Resource allocation across strategies
- Implementation timeline
- Success metric targets
- Community engagement approach

**Estimated Review Time:** 2-3 hours
**Priority:** HIGH (Strategic Planning)
**Next Action:** CEO to review and determine priority initiatives

---

## Next Phase

### IMMEDIATE (Validation Testing + SEO Monitoring)
1. Monitor Feb 2 automation run (9 AM EST)
2. Verify "building-social-support" post validation
3. Check GitHub Actions logs for success/failure
4. Verify related content loads correctly on automated posts
5. Monitor Search Console coverage report (404s dropping, indexed URLs increasing)
6. Check performance report for impressions/clicks
7. Verify blog posts are getting indexed

### BLOG AUDIT (PRIORITY)
8. Page-by-page audit of remaining blog posts
9. Fix images, links, schema per post
10. One post at a time - no batch scripts

### STRATEGIC (CEO Review Pending)
11. CEO review of GROWTH-STRATEGY-2026.md
12. Prioritize Q1 2026 initiatives
13. Resource allocation decisions

### GEO IMPROVEMENTS (Future Enhancements)
14. Question-based headers for AI extractability
15. Comparison tables on key pages
16. FAQ Schema on top blog posts
17. HowTo schema for calculator

### ACCESSIBILITY (Completed / Ongoing)
18. Blog color contrast - DONE (Jan 19)
19. Calculator mobile - DONE (Jan 20)
20. Run WCAG validator on homepage, channels
21. Keyboard navigation audit

### MONITORING & POLISH
22. Consider full-price payment test (no coupon)
23. Monitor site performance with 70 videos
24. Fix trending topics display (showing placeholder text)
25. Test related content functionality
26. Implement topic polls frontend

### NEXT WEEK (Content Production)
27. Schedule weekly automation for Sundays
28. Email delivery testing
29. Content quality review (editorial commentary)

---

## Architecture Status

### Working Pipeline
```
Sunday Automation (run_weekly_update.sh):
1. youtube_collector.py -> data/youtube_data.json
2. youtube_collector.py -> Supabase youtube_videos
3. content_analyzer_optimized.py -> data/analyzed_content.json
4. generate.py -> public/*.html
5. Site backup -> created
6. Validation -> passed
```

### Blog Generation Pipeline
```
Blog Index + RSS Generation:
1. Edit data/blog_posts.json (add new post entry)
2. Create HTML file in public/blog/
3. Run: python3 scripts/generate_blog_pages.py
4. Output: public/blog.html (index) + public/feed.xml (RSS)
```

### Blog Publishing Automation
```
Daily Blog Publishing (GitHub Actions):
1. Trigger: 9 AM EST daily
2. Run: scripts/check_scheduled_posts.py
3. Validate: 7 critical checks (meta, canonical, AI tells, fonts, CSS, wrapper, em-dashes)
4. Publish: Add to blog_posts.json if valid
5. Regenerate: Blog index + RSS feed + sitemap
6. Deploy: Push to production
```

### Deployment Pipeline
```
Calculator API Deployment:
1. cd api
2. wrangler deploy --env production
3. Verify: carnivore-report-api-production.iambrew.workers.dev/version
4. Test: wrangler tail --env production
```

### Supabase Status
- 30+ tables created
- 70 YouTube videos cached
- 19 blog posts indexed
- 7+ calculator sessions recorded
- 4+ calculator reports generated
- 2+ newsletter subscribers
- 2 feedback submissions

---

## Summary

**Multi-day accomplishment narrative:**
- Jan 2: Validation complete, analytics prepared, calculator layout perfected
- Jan 3: Homepage accessibility improved (67% depth reduction, 87%+ violation reduction)
- Jan 4: Calculator fully refined, all 4 Stripe tiers configured, pricing modal perfected
- Jan 11: Template system restored, full feature audit completed, critical blockers resolved
- Jan 12: Weekly automation validated, content collection optimized (70 videos)
- Jan 14: Deployment pipeline verified, calculator bugs identified as logic issues
- Jan 17: Strategic growth document ready for CEO review (90+ pages)
- Jan 18: Payment flow tested end-to-end, PDF cleanup, pricing card UI refinement, CORS fix deployed
- Jan 19: WCAG 2.1 color contrast fixed across all 30 blog posts, accessibility validator created
- Jan 20: GEO optimization complete (homepage, calculator, wiki, blog index, 32 blog posts), analytics tracking deployed, automation pipeline fixes, calculator mobile fix
- Jan 25: Blog index converted to Jinja2 template, RSS feed added, magazine-style layout, Quinn logging protocol fixed, ghost avatar images fixed, SEO audit completed, decision made to do page-by-page blog audit
- Jan 31: GitHub Actions automation fixed (wiki-keywords.json), 7 overdue posts published, blog post formatting fixes (fonts, CSS, wrappers), all posts match gold standard
- Feb 1 (Session 1): Blog validation automated in check_scheduled_posts.py, 7 critical checks enforced, ANTHROPIC_API_KEY configured
- Feb 1 (Session 2): Placeholder content issue discovered and fixed (7 posts), related content component fixed, all changes deployed to production
- Feb 1 (Session 3): SEO cleanup complete - fixed 24 broken URLs, added 46 blog posts to sitemap, validated all 51 URLs, submitted 11 priority URLs for indexing
- Feb 2: N8N infrastructure discovery - found Angie Telegram bot (Sept 2025), identified Project Nexus as knowledge management system, proposed MCP-based rebuild with Supabase integration

**System Status:** PRODUCTION - FULLY OPERATIONAL
- Calculator: Fully working with personalized reports and payment
- Payment: CORS fixed, Stripe integration verified
- PDF: Clean output (no debug text)
- Homepage/Channels: Working with editorial content and 70 videos
- Newsletter: Connected to database
- Automation: 9-step pipeline operational
- Blog: WCAG 2.1 AA compliant (color contrast validated)
- Blog Index: Data-driven with Jinja2, magazine layout, filters
- Blog Validation: Automated with 7 critical checks
- Blog Content: All 7 Jan 27-31 posts now have real content (✅)
- Related Content Component: Fixed and working (✅)
- RSS: W3C valid, auto-generated from blog_posts.json
- GEO: COMPLETE - All major pages have Organization schema + sameAs, AI bots granted access
- Mobile: Calculator protein table responsive
- SEO: 51 URLs in sitemap (up from 6), all URLs validated (200 OK), 11 priority URLs submitted for indexing (✅ NEW)

**Current Focus:** First automated blog post with validation deploys Feb 2 at 9 AM EST. SEO monitoring begins (coverage report, performance report, indexing progress).

**Latest Log:** `/Users/mbrew/Developer/carnivore-weekly/docs/project-log/daily/2026-02-01.md`

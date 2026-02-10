# Root Cause Analysis: Health Check Failures
**Date:** 2026-02-10
**Score Before Fixes:** 62/100

---

## Issue 1: Security Headers (0/6 present)
**Root Cause:** GitHub Pages does not support custom HTTP headers. We created a `_headers` file (Netlify/Cloudflare format) but it has no effect on GH Pages.
**Fix Applied:** Added CSP and Referrer-Policy as `<meta>` tags in HTML `<head>` on all pages. Kept `_headers` file for future Cloudflare migration.
**Still Unfixable on GH Pages:** X-Content-Type-Options, X-Frame-Options, HSTS, Permissions-Policy (require actual HTTP headers).
**Prevention:** Migrate to Cloudflare Pages when ready — `_headers` file already prepared. Or add Cloudflare proxy in front of GH Pages for header injection.

## Issue 2: HTTPS Enforcement Missing
**Root Cause:** GitHub Pages `https_enforced` setting was `false`. HTTP requests served full content instead of 301 redirect.
**Fix Applied:** Enabled via `gh api repos/MikeBrew123/carnivore-weekly/pages -X PUT` with `https_enforced: true`.
**Prevention:** Add HTTPS enforcement check to weekly monitoring script. This is a one-time config, unlikely to regress.

## Issue 3: Stale Sitemap (18 ghost URLs)
**Root Cause:** Sitemap was generated before blog cleanup. When 13 orphan/duplicate blog files were archived and 18 future-dated stubs were removed, sitemap was not regenerated.
**Fix Applied:** Manually cleaned sitemap from 80→62 URLs.
**Prevention:** Sitemap must be regenerated after ANY blog file addition/removal. Add sitemap regeneration to the blog publishing pipeline (n8n workflow or post-generation script).

## Issue 4: Image Dimensions Missing (0/16)
**Root Cause:** Original HTML templates never included width/height attributes on `<img>` tags. This is a common oversight — browsers render images fine without them, but CLS (Cumulative Layout Shift) suffers.
**Fix Applied:** Added width/height to all 16 homepage images and updated `index_template.html`.
**Prevention:** Pre-commit validator should check for missing width/height on images. Add this check to `validate_before_commit.py`.

## Issue 5: Calculator Missing Schema
**Root Cause:** Calculator page was built as a React SPA with minimal SEO consideration. No JSON-LD was added during development.
**Fix Applied:** Added WebApplication schema to calculator/index.html.
**Prevention:** SEO validator skill should be run before deploying new pages. Add JSON-LD presence check to pre-commit for non-blog HTML files.

## Issue 6: Default 404 Page
**Root Cause:** No `404.html` existed in the repo. GitHub Pages serves its default 404 when none is provided.
**Fix Applied:** Created branded `404.html` with GA4 tracking, navigation links, and CSP meta tags.
**Prevention:** One-time fix. 404 page now exists and won't regress.

## Issue 7: Skip-Navigation Missing
**Root Cause:** Accessibility feature was never implemented in any template. Not caught because there was no automated accessibility check.
**Fix Applied:** Added skip-nav link to all pages: homepage, calculator, channels, archive, wiki, blog index.
**Prevention:** Add skip-nav presence check to pre-commit validator. Also add to blog post template for next regeneration.

## Issue 8: Calculator Title Too Long (71 chars)
**Root Cause:** Title tag was descriptive but verbose: "Carnivore Calculator 2 - Personalized Macro Protocol | Carnivore Weekly".
**Fix Applied:** Shortened to "Free Carnivore Calculator - Personalized Macros | CW" (52 chars).
**Prevention:** Pre-commit already checks for missing titles. Add character length warning (>60 chars) to validator.

## Issue 9: 18 Broken Blog Cross-Links (FOUND TODAY)
**Root Cause:** Content generation agents created cross-links to articles that were planned but not yet published. They used future dates (2026-02-10, -12, -13, -15) for posts that either don't exist or exist with different dates.

Specifically:
- `2026-02-15-bloodwork-guide.html` → actual file is `2026-02-08-bloodwork-guide.html`
- `2026-02-15-adaptation-timeline.html` → actual file is `2026-02-08-adaptation-timeline.html`
- `2026-02-15-carnivore-supplements.html` → actual file is `2026-02-08-carnivore-supplements.html`
- `2026-02-13-autoimmune-remission.html` → does not exist (8 references)
- `2026-02-12-strength-gains.html` → does not exist (7 references)
- `2026-02-10-cholesterol-truth.html` → does not exist (1 reference)

**Why Link Checker Missed It:** The health check only tested homepage links (22/22). Blog cross-links were never checked. The pre-commit validator (`validate_before_commit.py`) checks for empty/placeholder hrefs but does NOT verify that internal link targets exist on disk. The `content_validator.py` has a `check_internal_links()` function that only counts links (warns if zero) but never validates targets.

**Fix Applied:** Fixed all 18 links — corrected 3 wrong-dated links to actual files, removed 15 dead links (kept anchor text intact).

**Prevention (CRITICAL):**
1. Add broken internal link check to `validate_before_commit.py` — for any `href="/blog/..."` in staged HTML files, verify the target file exists in `public/blog/`
2. Content generation agents MUST only link to posts that already exist on disk, never to planned/future posts
3. Add this rule to agent prompts: "Only link to blog posts that exist. Check `public/blog/` before adding cross-links."

---

## Validation Gap Summary

| Gap | Current State | Needed |
|-----|--------------|--------|
| Internal link target validation | Not checked | Pre-commit should verify href targets exist on disk |
| Image width/height | Not checked | Pre-commit should warn on images missing dimensions |
| Skip-nav presence | Not checked | Pre-commit should check for skip-nav in full pages |
| Title tag length | Not checked | Pre-commit should warn if >60 chars |
| JSON-LD presence | Not checked on non-blog pages | Pre-commit should check all public HTML for schema |
| Security headers | Can't set on GH Pages | Migrate to Cloudflare Pages |
| Sitemap sync | Manual process | Automate sitemap regen in publishing pipeline |

---

## Lessons Learned (Add to CLAUDE.md)

1. **Content agents must NOT generate cross-links to unpublished posts.** Links should only point to files that exist on disk at generation time.
2. **Pre-commit validator needs internal link validation.** Checking that hrefs aren't empty is not enough — targets must exist.
3. **Health checks must cover blog-to-blog cross-links**, not just homepage navigation links.
4. **GitHub Pages limitations are real.** Security headers, caching control, and HTTP→HTTPS redirect are all limited. Plan Cloudflare migration.

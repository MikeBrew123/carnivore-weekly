# Website Health Check Report: carnivoreweekly.com
**Date:** 2026-02-10
**Overall Score: 62/100**

## Executive Summary

CarnivoreWeekly.com is **fast and functional** — sub-100ms TTFB, gzip compression active, all internal links healthy. The bones are solid. However, the site has **critical security header gaps** (0/6 headers), a **stale sitemap** (18 ghost URLs pointing to archived files), **no HTTPS enforcement** on HTTP requests, and **zero image dimension attributes** causing layout shift. Blog posts are well-structured with proper schema markup, but the homepage/calculator are missing structured data for the calculator — your highest-traffic page. Fix the 5 critical items below and you jump to ~80.

---

## Results Table

### Section 1: Site Availability
| Check | Status | Detail |
|-------|--------|--------|
| HTTP Status | ✅ PASS | Homepage 200, www→non-www 301 redirect working |
| Response Time (TTFB) | ✅ PASS | 70-87ms TTFB — excellent (target: <200ms) |
| DNS Resolution | ✅ PASS | 4 GitHub Pages IPs, CNAME for www, GoDaddy NS |

### Section 2: Security
| Check | Status | Detail |
|-------|--------|--------|
| SSL Certificate | ✅ PASS | Let's Encrypt R13, valid until Mar 26 2026, not expiring within 30 days |
| HTTPS Enforcement | ❌ FAIL | `http://carnivoreweekly.com` returns 200 — should 301 redirect to HTTPS |
| Security Headers | ❌ FAIL | 0/6 security headers present. Missing: HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy |
| Mixed Content | ✅ PASS | 0 mixed content references |

### Section 3: Performance
| Check | Status | Detail |
|-------|--------|--------|
| Page Load Speed | ✅ PASS | Homepage: 120ms/57KB, Blog: 188ms/120KB, Calculator: 151ms/12KB |
| Compression | ✅ PASS | gzip active — 57KB → 12KB (79% reduction) |
| Caching Headers | ⚠️ WARN | Cache-Control: max-age=600 (10 min). Static assets should be longer |
| Image Optimization | ❌ FAIL | 0/16 homepage images have width/height attributes. All JPG/PNG — no WebP/AVIF |

### Section 4: SEO & Discoverability
| Check | Status | Detail |
|-------|--------|--------|
| Robots.txt | ✅ PASS | Well-configured. AI bots (GPTBot, PerplexityBot, Claude-Web) explicitly allowed |
| Sitemap | ⚠️ WARN | 80 URLs but 18 are ghost entries (archived files). Sitemap needs regeneration |
| Meta Tags (Homepage) | ✅ PASS | Title (53 chars), description (116 chars), canonical, 6 OG tags |
| Meta Tags (Blog) | ✅ PASS | Title, description, canonical, OG tags all present |
| Meta Tags (Calculator) | ⚠️ WARN | Title is 71 chars (target: <60). Otherwise complete |
| Heading Structure | ✅ PASS | 1 H1 per page across all checked pages |
| Internal Links | ✅ PASS | 22/22 homepage links return 200 |
| Broken Links | ✅ PASS | 0 broken internal links found |

### Section 5: Mobile & Accessibility
| Check | Status | Detail |
|-------|--------|--------|
| Viewport Meta Tag | ✅ PASS | Correct viewport tag on all pages |
| HTML Lang Attribute | ✅ PASS | `lang="en"` on all pages |
| Semantic HTML | ✅ PASS | nav, main, header, footer present on all pages |
| Image Alt Text | ✅ PASS | 0/16 homepage images missing alt text |
| Skip Navigation | ❌ FAIL | No skip-nav link found |
| Image Dimensions | ❌ FAIL | 0/16 images have width/height — causes Cumulative Layout Shift (CLS) |

### Section 6: Content & Functionality
| Check | Status | Detail |
|-------|--------|--------|
| Newsletter Form | ✅ PASS | Email input present on homepage |
| 404 Page | ⚠️ WARN | Returns 404 status (good) but shows default GitHub Pages 404 — not custom branded |
| Favicon | ✅ PASS | favicon.ico returns 200 |

### Section 7: Integrations & Automation
| Check | Status | Detail |
|-------|--------|--------|
| Content Freshness | ✅ PASS | Latest content: 2026-02-09 (yesterday). Publishing pipeline active |
| Google Analytics | ✅ PASS | 9 gtag/analytics references on homepage |
| Supabase Integration | ✅ PASS | Supabase JS client loaded |
| Structured Data (Homepage) | ✅ PASS | WebSite + Organization schema |
| Structured Data (Blog) | ✅ PASS | Blog schema on index, Article + Organization on posts |
| Structured Data (Calculator) | ❌ FAIL | No JSON-LD on calculator — your #1 traffic page has no schema |

---

## Priority Fixes

### Critical (Fix This Week)
| # | Issue | Effort | Why It Matters |
|---|-------|--------|---------------|
| 1 | **Add security headers** | Quick | 0/6 headers means the site is vulnerable to clickjacking, MIME sniffing, and protocol downgrade attacks — add via `_headers` file for GitHub Pages |
| 2 | **HTTPS enforcement** | Quick | HTTP serving full content instead of redirecting — visitors on http:// get no encryption and Google sees duplicate content |
| 3 | **Regenerate sitemap** | Quick | 18 ghost URLs (archived future-dated duplicates) still in sitemap — Google crawls dead pages, wastes crawl budget |

### High Priority (Fix This Month)
| # | Issue | Effort | Why It Matters |
|---|-------|--------|---------------|
| 4 | **Add width/height to all images** | Moderate | 0/16 images have dimensions — causes layout shift (CLS), a Core Web Vital that directly impacts Google rankings |
| 5 | **Add JSON-LD schema to calculator** | Moderate | Calculator is your #1 page (380 views/month) with zero structured data — missing rich result opportunities |
| 6 | **Custom 404 page** | Quick | GitHub Pages default 404 doesn't match brand or guide visitors back — create `404.html` in repo root |
| 7 | **Convert images to WebP** | Moderate | All images are JPG/PNG — WebP is 25-35% smaller with same quality |

### Medium Priority (Backlog)
| # | Issue | Effort | Why It Matters |
|---|-------|--------|---------------|
| 8 | **Add skip-navigation link** | Quick | Accessibility requirement for keyboard users — quick CSS/HTML addition |
| 9 | **Shorten calculator title tag** | Quick | 71 chars (target: <60) — Google truncates in search results |
| 10 | **Increase static asset cache time** | Quick | max-age=600 (10 min) is low for CSS/JS — increase to 1 day or 1 week |
| 11 | **Sitemap-to-JSON sync automation** | Significant | Sitemap has 75 blog posts, JSON has 57 — need automated sync to prevent future drift |

---

## Monitoring Recommendations

| Frequency | What to Check |
|-----------|---------------|
| **Daily** | Site uptime (HTTP 200), SSL not expired, TTFB < 200ms |
| **Weekly** | Sitemap URL validity, broken link scan, content freshness |
| **Monthly** | Security header audit, image optimization scan, Core Web Vitals (CLS/LCP/FID) |
| **Quarterly** | Full accessibility audit, schema validation, SEO competitive analysis |

---

## Score Breakdown

| Section | Max | Score | Notes |
|---------|-----|-------|-------|
| Site Availability | 15 | 15 | Perfect uptime, fast TTFB |
| Security | 20 | 8 | SSL good, but no HTTPS enforcement + 0 security headers |
| Performance | 20 | 14 | Fast but image optimization and caching need work |
| SEO & Discoverability | 20 | 14 | Strong meta/schema but stale sitemap |
| Mobile & Accessibility | 15 | 9 | Good semantics but no skip-nav, no image dimensions |
| Content & Functionality | 5 | 3 | Working but generic 404 |
| Integrations | 5 | 3 | Schema missing on calculator |
| **TOTAL** | **100** | **62** | |

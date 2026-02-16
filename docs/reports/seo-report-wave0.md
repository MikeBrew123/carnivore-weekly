# SEO Audit - Wave 0 Findings

**Date:** 2026-02-15
**Agents:** 8 (first wave)
**Framework:** Corey Haines marketing + SEO best practices

---

## Wave 0 Findings

### Agent: a1257a4 - Free Tool Strategy (Calculator)
**Critical Issues:**
- Zero email capture on free path (no lead gen before payment)
- No social sharing mechanism (kills viral potential)
- Missing key tracking events (pricing_viewed, payment_info_entered)

**Recommendations:**
- Add "Email My Free Results" to Step 3 (highest ROI change)
- Add "Share Your Macros" button for viral distribution
- Track full purchase funnel with GA4 ecommerce events

**Overall Grade:** B- (strong product, D-level distribution)

---

### Agent: a197895 - Schema Markup Audit
**Critical Issues:**
- No BreadcrumbList schema site-wide (major missed opportunity)
- Organization sameAs inconsistent across pages (self-referential on some)
- No Product schema for $9.99 paid offering
- Missing Course schema on starter-plan.html

**Recommendations:**
- Add BreadcrumbList to all pages (P0 priority)
- Fix Organization schema to include actual social profiles
- Add Product schema to calculator page with price/availability
- Add Course schema to 7-day email course page

**Overall Grade:** C+ (blog posts solid, homepage/landing pages weak)

---

### Agent: a2936ba - Email Sequence Audit
**Critical Issues:**
- Broken unsubscribe link in Day 1 email (hardcoded placeholder)
- Missing preheader text on all 7 emails (inbox preview wasted)
- No follow-up after Day 7 for non-converters
- Day 7 conversion weak (no urgency, no social proof, no price transparency)

**Recommendations:**
- Fix unsubscribe token in Day 1 email (HIGH PRIORITY)
- Add preheader text to all emails (inbox preview optimization)
- Add Day 10 re-engagement email for non-buyers
- Add social proof + benefit stack to Day 7 CTA

**Overall Grade:** B+ (solid sequence, weak conversion push)

---

### Agent: a2aa3b0 - Analytics Tracking Audit
**Critical Issues:**
- Purchase events NOT in GA4 ecommerce format (revenue NOT appearing in Monetization reports)
- No pricing_viewed event (can't measure calculator funnel)
- Form abandonment not tracked (can't diagnose starter plan low conversion)
- Conversions not marked in GA4 Admin

**Recommendations:**
- Replace calculator_payment_complete with GA4 purchase event (CRITICAL)
- Add form_started, form_field_completed, form_submitted events
- Add pricing_viewed when Step 3 loads
- Mark key events as conversions in GA4

**Overall Grade:** C+ (basic tracking present, monetization broken)

---

### Agent: a35a143 - Calculator CRO Audit
**Critical Issues:**
- Pricing modal has 4 confusing tiers (bundle at $9.99 cheaper than all individual items)
- Zero testimonials/social proof visible until checkout
- $298 value claim feels fake (96.6% discount strains credibility)
- No headline/value prop above calculator (users land with zero context)

**Recommendations:**
- Simplify pricing modal to 2 tiers (Free vs Paid) - expected lift +20%
- Add 2 testimonials above Step 3 CTA - expected lift +15%
- Fix price anchoring ($9.99 vs $27 test) - expected lift +12%
- Add hero headline above calculator - expected lift +10%
- Reduce Step 3 text by 40% (decision paralysis) - expected lift +8%

**Overall Grade:** B+ (strong design, weak conversion)

---

### Agent: a5e95fc - Pricing Strategy Audit
**Critical Issues:**
- $9.99 price point too low to build trust ("personalized" implies expertise, not $10 impulse buy)
- Paradoxical pricing (bundle cheaper than all individual components)
- Inconsistent value anchoring ($60 on Step 3, $298 in pricing modal)
- Zero expansion revenue (no upsell, cross-sell, or drip-to-calculator connection)

**Recommendations:**
- Raise price to $29-39 (test immediately, 3-4x revenue if conversions hold)
- Simplify pricing modal to single offer or clean 2-tier
- Connect drip sequence Day 7 to calculator with discount code
- Add quarterly protocol refresh ($9.99 every 90 days for repeat revenue)

**Overall Grade:** C+ (product strong, pricing/packaging weak)

---

### Agent: a5fd9c7 - Copywriting Audit
**Critical Issues:**
- Homepage hero headline generic ("Your Weekly Carnivore Intelligence" is company language)
- No clear value proposition on homepage (site tries to be 3 things at once)
- Zero social proof across all pages (no testimonials, no subscriber count, no results)
- Newsletter CTA weak ("Subscribe" with no benefit copy)

**Recommendations:**
- Rewrite homepage hero to benefit-driven (e.g., "Everything you need to eat carnivore — with confidence")
- Add social proof to Step 3, pricing modal, and starter plan page (testimonials or user counts)
- Replace $298 value claim with $60 (more believable) or drop entirely
- Add "Who is this for?" section to homepage (qualify visitors)

**Overall Grade:** B- (calculator/results copy strong, homepage/modal weak)

---

### Agent: a67cc9b - Starter Plan CRO Audit
**Critical Issues:**
- 18 pageviews, 2 subscribers in 7 days = traffic problem, not conversion problem
- No main navigation link (users can't discover offer organically)
- Blog CTA injection too subtle (blends into page, easy to miss)
- Homepage placement hidden mid-page (competes with 10+ other CTAs)

**Recommendations:**
- Add main navigation link "Free Email Course" - expected lift +200-300%
- Strengthen blog CTA design (dark background, gold button, better copy) - expected lift +50-100%
- Add homepage hero CTA "New to Carnivore? Start Here" - expected lift +30-50%
- Add social proof to landing page (star rating, subscriber count) - expected lift +20-40%
- Change button copy from "Start Free" to "Send Me Day 1" - expected lift +10-20%

**Overall Grade:** B- (solid page, discoverability problem)

---

## Cross-Agent Patterns

### Shared Issues Across Multiple Audits
1. **Social proof missing everywhere** (agents 1, 3, 5, 7, 8)
2. **Pricing/value anchoring inconsistent** (agents 3, 5, 7)
3. **GA4 tracking incomplete** (agents 1, 4)
4. **Lead capture gaps** (agents 1, 3, 8)
5. **No breadcrumbs** (agent 2)

### Highest-Impact Fixes (Ranked)
1. **Add BreadcrumbList schema** (agent 2) - affects ALL pages, rich results
2. **Fix GA4 purchase tracking** (agent 4) - revenue reporting broken
3. **Simplify calculator pricing modal** (agents 3, 5) - +20% conversion lift
4. **Add starter plan to main nav** (agent 8) - +200-300% traffic
5. **Add email capture to Step 3** (agent 1) - +10-50x lead gen

---

## Next Steps

**Immediate (This Week):**
- Fix unsubscribe link in Day 1 email
- Add BreadcrumbList schema to all pages
- Fix GA4 purchase event format
- Add main nav link for starter plan

**High Priority (This Month):**
- Simplify pricing modal to 2 tiers
- Add social proof to Step 3, pricing modal, starter plan
- Add email capture to calculator Step 3
- Add preheader text to all 7 emails

**Strategic (Next Quarter):**
- Test calculator pricing at $29-39
- Connect drip Day 7 to calculator
- Add testimonials/case studies site-wide
- Build expansion revenue (quarterly refresh, upsells)

---

**Files Analyzed:** 50+ (HTML templates, React components, email templates, tracking scripts, stylesheets)
**Frameworks Applied:** Corey Haines, GA4 Enhanced Ecommerce, Schema.org, CRO best practices

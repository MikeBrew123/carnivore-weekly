# Blog Page UX Analysis - January 3, 2026

## Executive Summary

Bento UX Analyzer assessment of `/blog.html` reveals a **clean grid layout with critical accessibility issues** that directly impact the 30-60 age demographic and undermine trust signals expected by contrarian health audiences.

**Overall Scores:**
- **Trust Score:** 6/10 — Good structure, missing credibility signals
- **Accessibility Score:** 4/10 — Multiple WCAG failures
- **Bento Layout Score:** 7/10 — Solid grid, needs featured content & mobile optimization

---

## TL;DR - Critical Findings

### ✅ What's Working
- Clean 4-column bento grid on desktop
- Clear blog card layout with dates, titles, author names
- Good header branding and page hierarchy
- 26 well-organized content elements
- Evidence-based messaging in footer

### 🚨 Critical Issues
- **53 elements with font-size < 16px** — Unreadable for target demographic
- **24 clickable elements < 44x44px** — Mobile interaction nightmare
- **9-screen mobile scroll depth** — Content feels cramped
- **No featured/hero card** — All posts visually equal, no guidance
- **Missing author credibility** — Who are these writers? Why trust them?

### ⚡ Quick Wins
1. Increase all body text to 16px minimum (18px preferred)
2. Make buttons and touch targets 44x44px or larger
3. Improve mobile layout (2-column grid instead of single column)
4. Add author micro-profiles with credentials

---

## Page Metrics

| Metric | Value |
|--------|-------|
| Content Elements | 26 |
| Desktop Scroll Depth | 3 screens |
| Mobile Scroll Depth | 9 screens ⚠️ |
| Blog Cards | 18+ cards in grid |
| Links | 39 |
| Buttons | 4 |
| Navigation Items | 5 |

---

## Accessibility Issues (WCAG Failures)

### Desktop Issues
- **53 elements with font-size < 16px**
  - Body text, labels, metadata all too small
  - Directly impacts reading comfort for 30-60 age group
  - Signals "low-effort, unprofessional" to skeptical audience

- **24 clickable elements < 44x44px**
  - Filter buttons (All, Sarah, Marcus, Chloe)
  - Blog card interactive areas
  - Makes clicking/tapping imprecise on touchscreen

### Mobile Issues
- **24 touch targets < 44x44px**
  - Makes phone navigation frustrating
  - Higher bounce rate for mobile users

- **49 elements with font-size < 14px**
  - Mobile readability severely compromised
  - Combined with small touch targets = terrible UX

**Impact on Target Demo:** Aging eyes struggle with small text. Lack of large touch targets creates perception of "not mobile-friendly" and erodes trust.

---

## Bento Grid Analysis

### Current State
✅ **Strengths:**
- Consistent 325px card width
- 4-column grid provides visual balance on desktop
- Clear visual hierarchy within cards (date, title, author, preview)
- Responsive grid layout attempted

⚠️ **Weaknesses:**
- All cards are visually uniform — no hierarchy between posts
- **No featured/hero card** to guide attention to important content
- **No visual differentiation** for popular or recent posts
- Mobile layout collapses and creates 9-screen scroll (too much)
- Insufficient white space between rows for easy scanning

### Recommendations

#### High Priority
1. **Create a featured post hero card** (2x1 or 2x2 size)
   - Highlight latest or most important blog post
   - Use larger card, different styling, stronger CTA
   - Shows curated content vs. just chronological dump

2. **Fix mobile layout**
   - Move from single-column to 2-column grid on medium screens (768px+)
   - Reduces 9-screen scroll depth to ~5 screens
   - Better content discoverability

3. **Increase card spacing**
   - Add more margin between rows
   - Helps 30-60 demographic scan content more easily
   - Improves breathing room overall

#### Medium Priority
4. **Add visual differentiation**
   - Most popular posts get subtle badge or visual treatment
   - Recent posts highlighted differently
   - Shows curation, not just bulk content

---

## Trust & Psychology Analysis

### Carnivore Audience Profile
Your visitors are:
- **Contrarian** — Skeptical of mainstream narratives
- **Research-obsessed** — Want depth, evidence, credentials
- **Community-seeking** — Need social proof, real people
- **Results-driven** — Demand data, testimonials, proof

### Current Trust Signals ✅
- "Evidence-based content" messaging (footer)
- Named authors (Sarah, Marcus, Chloe) — shows real people
- Post dates — shows active, current content
- Filter by author — acknowledges writer expertise

### Missing Trust Elements ⚠️
1. **No author credentials** — Who are these people? What's their background?
2. **No social proof** — "How many readers? Testimonials? Community size?"
3. **No "About Authors" CTA above fold** — Skeptics want to verify credibility upfront
4. **Author names on cards but no micro-bios** — Hover/tap reveals nothing

### Recommendations

#### High Priority
1. **Add author micro-profiles on each blog card**
   - 1-2 sentence bio + key credentials
   - Visible on hover (desktop) or expandable on mobile
   - Answers: "Who am I trusting? What's their expertise?"

2. **Surface social proof above fold**
   - "Trusted by 50K+ carnivore readers"
   - "200+ evidence-based articles"
   - Subscriber count, community metrics
   - Builds confidence before engaging with content

#### Medium Priority
3. **Create prominent "About Authors" CTA**
   - Link to fuller author bios with qualifications
   - Show education, credentials, real-world results
   - Provide transparency for contrarian audience

4. **Add "Most Popular" or "Most Cited" tags**
   - Shows what readers found valuable
   - For skeptical audiences, social proof via other readers matters
   - Validates content quality

---

## Visual Comparison Summary

### Desktop View
- Header is prominent and well-branded
- Blog grid is clean and organized
- But: Text is small, buttons are tiny, cards feel cramped

### Mobile View
- Content stacks vertically (expected)
- But: 9-screen scroll suggests poor responsive design
- Cards likely remain too wide, forcing excessive scrolling
- Touch targets even more problematic on small screen

---

## Priority Action Items

### 🔴 Do These First (2-3 hours, high impact)

1. **Increase all body text to 16px minimum**
   - Fixes 53 accessibility issues immediately
   - Improves perception of professionalism
   - Makes page feel intentional, not rushed

2. **Make all buttons and links 44x44px or larger**
   - WCAG requirement for touch accessibility
   - Critical for 30-60 demographic with less precise motor control
   - Fixes mobile frustration

3. **Optimize mobile grid**
   - Implement 2-column layout on tablets (768px+)
   - Keep 4-column on desktop
   - Single column on mobile with larger cards
   - Target: Reduce mobile scroll from 9 screens to 4-5 screens

### 🟡 Do These Next (1-2 hours, medium impact)

4. **Add author credibility signals**
   - Author bio snippet on card hover/expand
   - Link to full author page
   - Show credentials, expertise, results achieved

5. **Create featured post section**
   - Elevate latest or most important blog post
   - Use 2x1 or 2x2 card size
   - Different styling, stronger CTA
   - Guides reader attention

6. **Surface subscriber/community metrics**
   - If available: "Trusted by X readers"
   - Show post engagement counts
   - Adds social proof for skeptical audience

### 🟢 Do These Later (1 hour, low-medium impact)

7. **Visual differentiation for post importance**
   - Popular posts get subtle visual treatment
   - Recent posts highlighted
   - Helps with content discovery

8. **Improve card metadata hierarchy**
   - Make author name more prominent
   - Show post category/topic
   - Add read time estimate if relevant

---

## Implementation Notes

### CSS Changes Needed
- Body text: min 16px, line-height 1.5+
- All buttons/links: min 44px × 44px (including padding)
- Card margins: Increase between rows for breathing room
- Mobile breakpoint: Add 2-column grid at 768px+

### Content Changes
- Author micro-bios for each writer (2-3 sentences)
- Social proof metrics (subscriber count, community size)
- Create "featured" or "hero" post logic
- Link to full author bios/credentials

### Trust Signals to Add
- Credibility stamps (certifications, publications)
- Community size/growth metrics
- Reader testimonials
- Author expertise tags

---

## Accessibility Compliance Status

| Item | Current | Required | Status |
|------|---------|----------|--------|
| Min body font | 12-14px | 16px | ❌ FAIL |
| Touch targets | 30-36px | 44px | ❌ FAIL |
| Line height | Not measured | 1.5+ | ⚠️ CHECK |
| Color contrast | Not measured | 4.5:1 | ⚠️ CHECK |
| Responsive layout | Partial | Full 3-breakpoint | ⚠️ PARTIAL |

---

## Next Steps

1. **Confirm priority fixes** — Font size and button sizing are non-negotiable
2. **Schedule implementation** — Bento layout and trust signals can iterate
3. **Test with older users** — Have 50+ year olds review after changes
4. **Measure impact** — Track engagement, scroll depth, bounce rate post-update
5. **Document changes** — Log decisions in decisions.md and knowledge_entries

---

## Tools Used

- **Bento UX Analyzer** — Screenshot capture, accessibility metrics, content inventory
- **Framework:** Carnivore psychology, trust architecture, WCAG accessibility standards

**Report Generated:** January 3, 2026
**Analysis Scope:** Blog page (`/blog.html`)
**Audience Profile:** 30-60 age demographic, health-conscious, research-driven, skeptical of mainstream

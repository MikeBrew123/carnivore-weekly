# Calculator Form - Visual Standards Index

**Index Created:** January 3, 2026
**By:** Casey (Visual Director & QA)
**Total Documentation:** 2,325+ lines across 4 comprehensive documents
**Status:** ACTIVE - Ready for Step 1 development

---

## Document Quick Reference

### For Development (Alex)

**Start here:**
1. `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (8 min read)
   - Quick status and overview
   - What you need to know to start
   - Critical standards summary
   - Submission process

2. **Bookmark this during development:**
   `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (508 lines)
   - Step-by-step visual requirements
   - Desktop/Mobile/Tablet checklists
   - Color validation process
   - Font validation process
   - Red flags checklist
   - Quick commands

### For Complete Reference (Casey/Jordan/CEO)

**Full documentation:**
1. `/docs/FORM_VISUAL_STANDARDS.md` (1,031 lines)
   - Complete visual standards (89 sections)
   - All accessibility requirements
   - Form-specific standards (container, buttons, inputs)
   - Screenshot validation process
   - Baseline comparison methodology
   - Auto-fail red flags
   - Testing instructions

2. `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (314 lines)
   - Status overview
   - Quick reference for all standards
   - Workflow diagram
   - Color palette
   - Typography reference
   - Success metrics

### For Baseline Management (Casey)

**Baseline system:**
1. `/agents/visual_baselines/README.md` (7.9K)
   - Baseline file naming convention
   - When to update baseline
   - How to update baseline
   - Archive management
   - Current baseline status
   - Baseline validation checklist

2. `/agents/visual_baselines/` directory
   - Storage for all baseline screenshots
   - Archive subdirectory for historical versions
   - Organized by viewport and date

### For Memory & Tracking (Casey)

**Comprehensive log:**
1. `/agents/memory/casey_memory.log` (updated)
   - Visual standards summary
   - Baseline status tracking
   - Visual discovery notes
   - Process improvements
   - Team coordination notes
   - Long-term memory items

---

## Critical Standards Summary (Copy-Paste Reference)

### Viewports (Exact Dimensions)
```
Desktop: 1400x900px (form max-width 600px)
Tablet: 768x1024px (form 90% width)
Mobile: 375x812px (form full width, NO SCROLL)
```

### Colors (Exact Hex - Use Color Picker)
```
#1a120b - Background (dark brown)
#f4e4d4 - Text light (light tan)
#d4a574 - Accent tan
#ffd700 - Gold (titles)
#8b4513 - Brown border
#2c1810 - Brown light (inputs)
#ff6b6b - Error (red)
```

### Typography (Minimum Sizes)
```
H1: Playfair Display, 36-48px, bold, #ffd700
H2: Playfair Display, 24-28px, bold, #d4a574
Labels: Merriweather, 18-20px, bold, #f4e4d4
Input: Merriweather, 16-18px, regular, #f4e4d4
Helper: Merriweather, 14-16px, regular, #d4a574
```

### Accessibility Minimums
```
Labels: 18px (readable for 30-60 age group)
Touch targets: 44x44px (buttons, inputs, checkboxes)
Color contrast: 4.5:1 (WCAG AA)
Focus state: 2px visible outline (keyboard nav)
```

### Input Fields Standard
```
Height: 44-50px (touch-friendly)
Border: 2px solid #8b4513
Background: #2c1810
Text: #f4e4d4, Merriweather 16-18px
Focus: Gold border (#ffd700) + outline
Padding: 12-16px left/right, 12px top/bottom
```

### Buttons Standard
```
Height: 50-56px (minimum)
Width: 100% (container width)
Background: #8b4513
Text: #f4e4d4, Merriweather bold, 16-18px
Hover: #d4a574 background
Padding: 16px horizontal, 12px vertical
```

---

## What Each Document Contains

### 1. FORM_VISUAL_STANDARDS.md (1,031 lines)

**Comprehensive reference with:**
- Responsive design baseline (4 sections)
- Typography standards for 30-60 demographic (8 sections)
- Color accuracy standards (4 sections)
- Accessibility standards (6 sections)
- Form-specific visual standards (8 sections)
- Screenshot validation process (3 sections)
- Visual validation checklists for each step (7 checklists)
- Auto-fail red flags (21 critical violations)
- Testing instructions for Alex (5 sections)
- Validation report template (1 section)
- Summary for Alex (3 sections)
- Appendix with quick reference (3 sections)

**Use when:** Need complete details on any standard

### 2. FORM_BUILDER_VISUAL_CHECKLIST.md (508 lines)

**Quick reference for Alex with:**
- Before-you-start checklist
- Viewport sizes (bookmarkable)
- Color reference (copy-paste CSS)
- Typography quick reference
- Step-by-step checklist (Steps 1-6)
- Desktop/Mobile/Tablet checklists
- Color validation process
- Font validation process
- Responsive testing process
- After-building submission process
- Contact information

**Use when:** Building form, need quick checks

### 3. FORM_VISUAL_VALIDATION_SUMMARY.md (314 lines)

**Status overview with:**
- Quick status summary
- What Alex needs to know
- Before/during/what-Casey-checks workflow
- Validation workflow diagram
- Critical standards (non-negotiable)
- Color palette reference
- Typography reference
- Responsive breakpoints
- Validation checklist summary
- Red flags (auto-fail)
- Submission process
- Baseline management overview
- Success metrics

**Use when:** New to form project, need overview

### 4. FORM_VISUAL_STANDARDS_INDEX.md (This document)

**Navigation and reference index with:**
- Quick document reference
- Critical standards summary
- What each document contains
- Key metrics and numbers
- Roles and responsibilities
- Development workflow
- Validation authority

**Use when:** Need to find right document or refresh memory

---

## Key Metrics

**Documentation Coverage:**
- Total lines of documentation: 2,325+
- Total files: 4 comprehensive documents
- Total checklists: 12 specific checklists
- Total accessibility requirements: 23+
- Total red flags: 21+ auto-fail criteria
- Color palette size: 7 exact colors
- Font sizes: 6 distinct sizes (14px-48px)
- Breakpoints: 3 exact viewport sizes
- Form steps: 6 sequential steps

**Standard Breadth:**
- Typography standards: 6 elements with exact specs
- Color standards: 7 colors with exact hex + RGB
- Accessibility requirements: WCAG AA compliant
- Age demographic: 30-60 years (specific needs)
- Responsive coverage: Mobile, Tablet, Desktop (plus breakpoints)
- Touch target standards: 44x44px minimum (WCAG)
- Focus state requirements: 2px+ outline visible

---

## Roles & Responsibilities

### Alex (Developer)

**Use documents:**
1. `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (primary, during dev)
2. `/docs/FORM_VISUAL_STANDARDS.md` (reference, for questions)
3. `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (overview)

**Responsibilities:**
- Build form steps
- Take screenshots (exact dimensions)
- Verify colors with color picker
- Test responsive (no scroll at 375px)
- Submit to Casey with screenshots

### Casey (Visual QA)

**Use documents:**
1. `/docs/FORM_VISUAL_STANDARDS.md` (primary, validation)
2. `/agents/visual_baselines/README.md` (baseline mgmt)
3. `/agents/memory/casey_memory.log` (tracking)
4. `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (reporting)

**Responsibilities:**
- Validate each step visually
- Compare to baseline
- Verify colors with color picker
- Approve or flag issues
- Create baseline screenshots
- Track visual changes

### Jordan (Validator)

**Use documents:**
1. `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (status)
2. `/docs/FORM_VISUAL_STANDARDS.md` (reference)

**Responsibilities:**
- Functional validation (after Casey visual approval)
- HTML validation
- CSS validation
- Performance validation

### CEO (Design Authority)

**Use documents:**
1. `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (status)
2. `/docs/FORM_VISUAL_STANDARDS.md` (standards)
3. `/docs/style-guide.md` (brand standards master)

**Responsibilities:**
- Approve visual standards
- Approve design changes
- Approve baseline updates
- Design decision authority

---

## Development Workflow

```
Step 1: Alex reads FORM_VISUAL_VALIDATION_SUMMARY.md
        ↓
Step 2: Alex bookmarks FORM_BUILDER_VISUAL_CHECKLIST.md
        ↓
Step 3: Alex builds Step 1 (Form Container)
        ↓
Step 4: Alex takes 3 screenshots (exact dimensions)
        ↓
Step 5: Alex verifies colors with browser color picker
        ↓
Step 6: Alex submits screenshots to Casey
        ↓
Step 7: Casey validates against FORM_VISUAL_STANDARDS.md
        ↓
        ✅ APPROVED → Baseline set, move to Step 2
        🔴 ISSUES → Alex fixes, resubmits
```

---

## File Locations (Absolute Paths)

**Standards & Checklists:**
- `/Users/mbrew/Developer/carnivore-weekly/docs/FORM_VISUAL_STANDARDS.md`
- `/Users/mbrew/Developer/carnivore-weekly/docs/FORM_BUILDER_VISUAL_CHECKLIST.md`
- `/Users/mbrew/Developer/carnivore-weekly/docs/FORM_VISUAL_VALIDATION_SUMMARY.md`
- `/Users/mbrew/Developer/carnivore-weekly/docs/FORM_VISUAL_STANDARDS_INDEX.md` (this file)

**Baseline & Management:**
- `/Users/mbrew/Developer/carnivore-weekly/agents/visual_baselines/`
- `/Users/mbrew/Developer/carnivore-weekly/agents/visual_baselines/README.md`
- `/Users/mbrew/Developer/carnivore-weekly/agents/visual_baselines/archive/`

**Memory & Tracking:**
- `/Users/mbrew/Developer/carnivore-weekly/agents/memory/casey_memory.log`

**Brand Standards Master:**
- `/Users/mbrew/Developer/carnivore-weekly/docs/style-guide.md`

---

## Critical Standards (Non-Negotiable)

**Auto-Fail If Violated:**
1. Horizontal scroll on 375px viewport
2. Colors don't match exact hex values
3. Fonts not loading (system fonts visible)
4. Labels <18px on desktop
5. Touch targets <44px height
6. No visible focus state
7. Input borders missing or wrong color
8. Layout broken at any breakpoint

**Never Approve With These Issues**

---

## Quick Navigation Guide

**"I need to know the color palette..."**
→ `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (Color Palette section)
→ Or `/docs/FORM_VISUAL_STANDARDS.md` (Section 3)

**"I'm building Step 1, what do I check?"**
→ `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (Step 1 section)

**"What are all the visual red flags?"**
→ `/docs/FORM_VISUAL_STANDARDS.md` (Section 8)
→ Or `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (Red Flags section)

**"How do I validate colors?"**
→ `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (Color Validation Process)

**"What's the complete visual standard?"**
→ `/docs/FORM_VISUAL_STANDARDS.md` (entire document)

**"How do baselines work?"**
→ `/agents/visual_baselines/README.md` (entire document)

**"I need to submit screenshots to Casey, what's the process?"**
→ `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (Submission Process section)
→ Or `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (After Building section)

---

## Status & Authority

**Visual Standards Status:** ACTIVE - Ready for Step 1 development
**Set by:** Casey (Visual Director & QA)
**Approval Authority:** Visual validation binding before deployment
**Date Created:** January 3, 2026
**Last Updated:** January 3, 2026

**Authority Chain:**
1. Casey (visual standards validation) ✓ GATE
2. Jordan (functional validation) ✓ GATE
3. CEO (design approval) ✓ GATE

---

## Next Steps

1. **Alex:** Read `/docs/FORM_VISUAL_VALIDATION_SUMMARY.md` (10 min)
2. **Alex:** Review `/docs/FORM_BUILDER_VISUAL_CHECKLIST.md` (bookmark it)
3. **Alex:** Begin Step 1 development
4. **Casey:** Monitor and validate screenshots
5. **Team:** Follow workflow for each step

---

**Created by:** Casey (Visual Director & QA)
**Purpose:** Navigation guide for visual standards documentation
**Audience:** All team members (Alex, Casey, Jordan, CEO)
**Last Updated:** January 3, 2026

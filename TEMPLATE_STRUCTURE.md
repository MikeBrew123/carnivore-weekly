# index_template.html Structure Map

**Last Updated:** 2025-12-30 15:31:34
**Template Version:** 70796b7

> This document is auto-generated. Do not edit manually.
> Regenerate by running: `python3 scripts/document_template.py`

---

## Section Overview

| Section | Lines | CSS Classes | IDs | JS Functions |
|---------|-------|-------------|-----|--------------|
| ButcherBox Affiliate Banner | 905-913 | calculator-ad, section, sponsor-banner +2 | none | trackAffiliateClick |
| Weekly Summary + Calculator Ad | 913-936 | calculator-ad, divider, section +6 | none | trackAffiliateClick |
| Trending Topics | 936-962 | divider, mentioned-by, section +5 | none | filterVideosByCreator, filterVideosByTag |
| Top Videos + Filters | 962-1169 | creator, divider, insights-list +16 | none | filterVideosByCreator, filterVideosByTag, trackAffiliateClick |
| Key Insights | 1169-1187 | divider, insights-list, qa-accordion +3 | none | toggleAnswer |
| Community Voice + Q&A | 1187-1308 | ad-link, badge, caveats +14 | none | filterVideosByCreator, toggleAnswer, trackAffiliateClick |
| Recommended Watching | 1308-1391 | creator, disclaimer, section +9 | none | filterVideosByCreator |
| Medical Disclaimer | 1391-1413 | disclaimer, nav-menu | none | setActiveNavigation |
| Bottom Navigation Menu | 1413-1424 | nav-menu | none | setActiveNavigation |
| Footer | 1424-1612 | creator, feedback-btn, tag +2 | none | filterVideosByCreator, filterVideosByTag, setActiveNavigation, toggleAnswer |

---

## CSS Classes Used

- **`.ad-link`** — Used in: Community Voice + Q&A
- **`.badge`** — Used in: Community Voice + Q&A
- **`.calculator-ad`** — Used in: ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad
- **`.caveats`** — Used in: Community Voice + Q&A
- **`.citation`** — Used in: Community Voice + Q&A
- **`.citations`** — Used in: Community Voice + Q&A
- **`.creator`** — Used in: Top Videos + Filters, Recommended Watching +1 more
- **`.disclaimer`** — Used in: Recommended Watching, Medical Disclaimer
- **`.divider`** — Used in: Weekly Summary + Calculator Ad, Trending Topics +3 more
- **`.feedback-btn`** — Used in: Footer
- **`.inline-ad`** — Used in: Community Voice + Q&A
- **`.insights-list`** — Used in: Top Videos + Filters, Key Insights
- **`.mentioned-by`** — Used in: Trending Topics
- **`.nav-menu`** — Used in: Medical Disclaimer, Bottom Navigation Menu
- **`.qa-accordion`** — Used in: Key Insights, Community Voice + Q&A
- **`.qa-answer`** — Used in: Community Voice + Q&A
- **`.qa-item`** — Used in: Key Insights, Community Voice + Q&A
- **`.qa-question`** — Used in: Community Voice + Q&A
- **`.questions-list`** — Used in: Community Voice + Q&A
- **`.section`** — Used in: ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad +5 more
- **`.sentiment`** — Used in: Key Insights, Community Voice + Q&A
- **`.sponsor-banner`** — Used in: ButcherBox Affiliate Banner
- **`.stat`** — Used in: Top Videos + Filters
- **`.stat-label`** — Used in: Top Videos + Filters
- **`.stat-value`** — Used in: Top Videos + Filters
- **`.stats`** — Used in: Top Videos + Filters
- **`.summary`** — Used in: ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad +3 more
- **`.summary-image`** — Used in: Weekly Summary + Calculator Ad
- **`.summary-text`** — Used in: Weekly Summary + Calculator Ad
- **`.summary-with-image`** — Used in: ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad
- **`.tag`** — Used in: Trending Topics, Top Videos + Filters +2 more
- **`.topic-card`** — Used in: Weekly Summary + Calculator Ad, Trending Topics
- **`.trending-topics`** — Used in: Weekly Summary + Calculator Ad, Trending Topics
- **`.video-body`** — Used in: Top Videos + Filters, Recommended Watching
- **`.video-card`** — Used in: Trending Topics, Top Videos + Filters +3 more
- **`.video-content`** — Used in: Top Videos + Filters, Recommended Watching
- **`.video-grid`** — Used in: Trending Topics, Top Videos + Filters +3 more
- **`.video-header`** — Used in: Top Videos + Filters, Recommended Watching
- **`.video-summary`** — Used in: Top Videos + Filters
- **`.video-tags`** — Used in: Top Videos + Filters
- **`.video-thumbnail`** — Used in: Top Videos + Filters, Recommended Watching
- **`.watch-btn`** — Used in: Top Videos + Filters, Recommended Watching

---

## CSS IDs Used


---

## JavaScript Functions

- **`filterVideosByCreator()`** — Targets: .video-grid, [data-no-results]
- **`filterVideosByTag()`** — Targets: .video-grid, [data-no-results]
- **`gtag()`** — Targets: .video-grid, [data-no-results]
- **`setActiveNavigation()`** — Targets: .video-grid, [data-no-results]
- **`toggleAnswer()`** — Targets: .video-grid, [data-no-results]
- **`trackAffiliateClick()`** — Targets: .video-grid, [data-no-results]
- **`trackVideoClick()`** — Targets: .video-grid, [data-no-results]

---

## Template Variables

- **`analysis_date`** — Used 4 time(s)
- **`creator`** — Used 5 time(s)
- **`found_topics`** — Used 1 time(s)
- **`generation_timestamp`** — Used 1 time(s)
- **`insight`** — Used 1 time(s)
- **`key_insights`** — Used 1 time(s)
- **`qa_section`** — Used 1 time(s)
- **`recommended_watching`** — Used 1 time(s)
- **`story`** — Used 1 time(s)
- **`tag`** — Used 4 time(s)
- **`top_videos`** — Used 2 time(s)
- **`topic`** — Used 1 time(s)
- **`total_creators`** — Used 1 time(s)
- **`total_videos`** — Used 1 time(s)
- **`trending_topics`** — Used 1 time(s)
- **`weekly_summary`** — Used 1 time(s)

---

## Critical Dependencies

**Shared CSS Classes (Edit with Caution):**
- `.calculator-ad` → ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad
- `.creator` → Top Videos + Filters, Recommended Watching, Footer
- `.disclaimer` → Recommended Watching, Medical Disclaimer
- `.divider` → Weekly Summary + Calculator Ad, Trending Topics, Top Videos + Filters, Key Insights, Community Voice + Q&A
- `.insights-list` → Top Videos + Filters, Key Insights
- `.nav-menu` → Medical Disclaimer, Bottom Navigation Menu
- `.qa-accordion` → Key Insights, Community Voice + Q&A
- `.qa-item` → Key Insights, Community Voice + Q&A
- `.section` → ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad, Trending Topics, Top Videos + Filters, Key Insights, Community Voice + Q&A, Recommended Watching
- `.sentiment` → Key Insights, Community Voice + Q&A
- `.summary` → ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad, Top Videos + Filters, Community Voice + Q&A, Recommended Watching
- `.summary-with-image` → ButcherBox Affiliate Banner, Weekly Summary + Calculator Ad
- `.tag` → Trending Topics, Top Videos + Filters, Recommended Watching, Footer
- `.topic-card` → Weekly Summary + Calculator Ad, Trending Topics
- `.trending-topics` → Weekly Summary + Calculator Ad, Trending Topics
- `.video-body` → Top Videos + Filters, Recommended Watching
- `.video-card` → Trending Topics, Top Videos + Filters, Community Voice + Q&A, Recommended Watching, Footer
- `.video-content` → Top Videos + Filters, Recommended Watching
- `.video-grid` → Trending Topics, Top Videos + Filters, Community Voice + Q&A, Recommended Watching, Footer
- `.video-header` → Top Videos + Filters, Recommended Watching
- `.video-thumbnail` → Top Videos + Filters, Recommended Watching
- `.watch-btn` → Top Videos + Filters, Recommended Watching

**Safe Editing Checklist:**
Before editing a section:
- [ ] Check TEMPLATE_STRUCTURE.md to see which CSS classes are shared
- [ ] Verify no JS functions target this section's unique IDs
- [ ] Confirm all template variables used exist in the data
- [ ] Test the page after changes to verify visual consistency

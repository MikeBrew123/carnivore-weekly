# Archived Legacy Scripts

**Archived:** 2026-02-12 (Pipeline Lockdown Phase 2)

These scripts are **superseded by `blog_post_template_2026.html`** and must NOT be run against `public/`.

## Why Archived

These scripts were part of a batch-fix approach where 10+ scripts could independently modify blog HTML files. This created a competing-writer loop: the template generated correct HTML, then these scripts overwrote it with slightly different versions, causing recurring regressions in canonicals, schema, OG tags, and more.

The 2026 template now handles ALL structural elements (SEO, schema, OG/Twitter cards, GA4, reactions, mobile nav, layout). These scripts are no longer needed.

## Batch 1: Fully Redundant (template provides 100%)
- `fix-blog-seo.py` — OG, Twitter, GA4, canonical (template has all)
- `fix-h1-duplicates.py` — Template uses single H1
- `fix-header-tags.py` — Template uses `<div>` not `<header>`
- `fix-post-reactions-html.py` — Template has 2 reaction sections
- `add-schema-to-posts.py` — Template has Article schema
- `add_org_schema_to_blogs.py` — Template has Organization schema
- `add-mobile-nav-script.py` — Template includes mobile-nav.js

## Batch 2: One-Off Fixers (template prevents these issues)
- `fix-validation-issues.py` — Fixed link prefixes, schema issues
- `fix_remaining_issues.py` — Fixed heading skips, empty hrefs
- `fix_validation_issues.py` — Same category as above

## Batch 3: Standardizers (migration tools, no longer needed)
- `standardize-blog-posts.py` — Layout wrappers, wiki links, videos, comments
- `add-phase7-components.py` — TL;DR, pull quotes, key takeaways (content-level authoring)

## NOT Archived (Still Active)
- `regenerate-blog-posts.py` — Batch regeneration tool, useful for template migrations
- `generate_blog_pages.py` — Primary blog page generator
- `content_validator.py` — Validation (converted to warn-only in Phase 3)
- `generate_redirects.py` — Redirect HTML generation

## Recovery
If needed, these scripts are preserved here with full git history. They can be reviewed but should never be executed against production files.

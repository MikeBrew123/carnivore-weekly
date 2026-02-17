# Miscellaneous Archive

## Writer Agents System

Three AI writer personas with distinct voices, stored in `agents/*.md` and Supabase `writers` table.

**Sarah Chen**: Health/science editor. Warm, evidence-based. Opens with community observations, uses specific biomarker numbers.
**Marcus Rivera**: Performance coach. Direct, no-nonsense. Leads with math and protocols, definitive statements.
**Chloe Park**: Community manager. Conversational bestie. Immediate relatability, insider humor, trending references.

### Writer Memory System
- `writer_memory_log`: Append-only learning history per writer
- `writer_voice_snapshots`: Periodic voice calibration checkpoints
- `writer_content`: Published content tracking (writer_id, post_id, word_count)
- `writer_relationships`: Cross-writer topic awareness

## Blog Style Guide

- Readability: short paragraphs, subheadings every 200-300 words
- Formatting: bold key terms, bullet lists for protocols, numbered lists for steps
- Citations: PubMed links for studies, Amazon title-only links for books
- Length: 1,000-1,700 words per post

## Sarah Voice Positioning

Comprehensive positioning guide for Sarah's voice on the homepage. Sarah represents the science/health angle — educational but warm, making complex nutrition accessible.

## Batch 2 Test (2026-02-08)

3-post validation run with new content pipeline. All posts passed validation, rendered correctly, proper writer attribution. Confirmed pipeline works end-to-end.

## Leo Knowledge Entries

Leo (Database Architect) maintained a `knowledge_entries` table for storing database insights and decisions. Append-only, immutable records of architectural decisions and troubleshooting findings.

## Example Layout Metadata

Reference for blog post metadata structure, template variables, and content formatting patterns used across the site.

## Feature Audit (2026-01-11)

Full feature audit: identified working features, broken features, and missing features. Led to Phase 2 (self-healing validation) and subsequent cleanup phases.

## Upgrade Plan Page

Static HTML page at `public/upgrade-plan.html` — premium protocol sales page with pricing, features, and Stripe checkout integration.

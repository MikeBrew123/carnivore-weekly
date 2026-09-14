# Batch 2A preservation baseline — CW electrolyte safety

Recorded 2026-09-14 BEFORE any edit shipped. Window 2026-08-15 to 2026-09-13,
GSC page dimension, property sc-domain:carnivoreweekly.com.

| URL | Impressions | Clicks | Position |
|---|---|---|---|
| /blog/2026-05-18-carnivore-cheat-reentry-protocol.html | 155 | 4 | 7.0 |
| /blog/2026-04-11-diy-electrolytes-vs-lmnt-dr-hampton.html | 11 | 0 | 5.0 |

BOTH rank <= 15, so CLAUDE.md's preservation rule applies.

## What must not change
- URL and slug: unchanged on both.
- `<title>` and H1: unchanged on both.
- publish_date / date / scheduled_date: unchanged.
- Internal links: 2 per page, unchanged on both.
- Primary search intent: "DIY electrolytes vs LMNT" and "carnivore cheat re-entry".
- H2 count and order: 9 and 6 respectively, unchanged.

## What does change
- cheat-reentry: body only. No heading, title or meta change. Lowest-risk profile.
- diy-electrolytes: two H2 renames plus meta_description and seo.meta_description.
  - "The DIY Recipe From the Comments" -> "The DIY Side: Why People Mix Their Own"
  - "The Simple Protocol" -> "How to Shop This Aisle Without Guessing"
  - Meta drops "the DIY recipe" (a strong click promise) and adds label-reading plus
    the sodium-only vs potassium-containing distinction.
  - RISK: this is a CTR change on a position-5 page. At 11 impressions over 30 days the
    absolute exposure is small, but the relative risk is real and it needs Brew's word.

## Measurement window
- Baseline above: 2026-08-15 to 2026-09-13.
- Read date: **2026-10-14** (30 days post-deploy). Compare impressions, clicks, position.
- Do not make a second change to either page before that read.

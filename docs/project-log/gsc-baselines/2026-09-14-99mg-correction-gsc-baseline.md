# False 99 mg regulatory-claim correction — preservation baseline

Recorded 2026-09-14 BEFORE any edit. Window 2026-08-15 to 2026-09-13, GSC page
dimension, property sc-domain:carnivoreweekly.com.

| URL | Impressions | Clicks | Position | Protected (<=15)? |
|---|---|---|---|---|
| /blog/2026-04-27-carnivore-sleep-week-two-electrolytes.html | 12 | 0 | 7.7 | YES |
| /blog/2026-05-17-carnivore-electrolyte-problem.html | 12 | 0 | 8.9 | YES |
| /blog/2026-09-09-potassium-on-carnivore.html | 6 | 0 | 21.5 | no |
| /blog/2026-03-31-electrolytes-carnivore-protocol-dosing-sodium-magnesium.html | 0 | 0 | n/a | no traffic |

Query level, 2026-09-09 page: "how to get potassium on carnivore diet", 2 imp, 0 clicks, pos 50.5.

## What must not change
URLs, slugs, titles, H1s, publish dates, internal links: unchanged on all four.

## What changes, by page
- 2026-04-27 (pos 7.7): ONE body clause. No heading, meta or excerpt change. +28 chars.
- 2026-05-17 (pos 8.9): ONE body sentence inverted. No heading, meta or excerpt change. +106 chars.
- 2026-03-31 (no traffic): paragraph logic rebuilt, plus excerpt and seo description, which
  promised potassium dosing the body refuses to give. Not minimal, but zero impressions.
- 2026-09-09 (pos 21.5, NOT protected): H2 "Why every tablet is 99 mg" -> "Why the pills are so
  small", meta_description, excerpt, and the affected section rewritten. The old meta and excerpt
  stated the false claim outright ("they are a safety cap" / "a legal safety cap").

## Measurement window
Baseline above. Read date: **2026-10-14**. Compare impressions, clicks, position.
Do not make a second change to any of these four before that read.

## Process note
The Batch 2A baseline (2026-09-14-batch2a-gsc-baseline.md) was written to the main checkout
rather than the batch worktree, so it was never committed even though the 2A commit message
cites it. It is committed alongside this file. Record baselines IN THE WORKTREE THE COMMIT
COMES FROM.

## Why this lives here and not in docs/archive/reports-archive/
CLAUDE.md sends reports to `docs/archive/reports-archive/`, but `.gitignore:129` ignores
`archive/`, so anything written there is never committed. The Batch 2A baseline was lost
that way: its commit message cites a file that exists only as an untracked file on one
machine. GSC preservation baselines are a compliance artifact and must be version
controlled, so they live under `docs/project-log/gsc-baselines/`, which is tracked.

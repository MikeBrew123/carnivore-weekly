---
name: reader-question-refresh
description: Repeatable cycle that mines real reader questions from YouTube comments (+ cached Reddit), has Sarah, Marcus and Chloe each rewrite their 3 worst-performing CW posts around those questions, ships them in one batch and records a 28-day before/after read. Use when Brew says "run the reader question refresh", "writers fix their worst posts", or when the every-two-weeks cycle comes due. First run 2026-10-13.
---

# Reader-question refresh (writers fix their worst posts)

Origin: Brew, 2026-10-13. Read of the first run: `data/content-refresh-cohorts.json` cohort `writer-rewrites-2026-10-13`, read 2026-11-13. **Only repeat this cycle if that read says it worked.** Check the decision ledger first.

## Guardrails (from CLAUDE.md, do not skip)
- Check the ledgers (CW decision-ledger.md, todos.md, Decision Log) for open experiments. Never touch a page inside a live experiment, a control group, or a cohort whose 28-day read is still open.
- Posts in an overlapping cluster (2+ CW posts on one problem) are not rewritten. They are a CONSOLIDATE question for Brew (redirects need his approval).
- Never rewrite a page at position 15 or better without its own preservation plan. Worst performers almost never qualify, but check.
- URL and publish date never change. Writers produce content only; `/cw-blog-publish` renders and validates.
- One ship day per batch, one baseline, one read date. Do not overlap batches: start the next cycle only after the previous batch's read is recorded, or exclude its pages and its control group.

## Steps
1. **Mine questions** (about $1-3 API, no Apify): `python3 scripts/reader_question_mining.py run --out <scratchpad>/rq-YYYY-MM-DD` (raw comments stay out of the repo).
2. **Rank each writer's posts**: page-dimension GSC, last 90 days, CW posts published at least 60 days ago, excluding cluster pages and any page in an open cohort. Lowest impressions first; 10 per writer, saved to `<out>/writer_pages.json`.
3. **Brief the writers in parallel** (Agent tool: `sarah-health-coach`, `marcus-performance-coach`, `chloe-community-manager`) with the brief at `docs/project-log/reader-question-refresh-brief.md`, pointing them at the out folder. Each picks 3 and writes `picks.md` + one JSON per post (slug, title, meta_description, excerpt, content).
4. **Check every draft**: slug exists and is published, no em-dashes, no doses, no cure or reversal claims, internal links only to published CW posts, KD links as full https URLs, CW no-sweets guard, title under 60 characters, meta under 155. Flag topic swaps to Brew.
5. **Show Brew the 9 picks** (one line each) and ship on his yes.
6. **Ship in a worktree**: apply title, meta, seo.meta_description, excerpt, content and `date_modified`; run `generate_blog_pages.py --site cw` and `generate.py --type pages`, then `validate_before_commit.py` (0 critical); PR, merge, resubmit the sitemap.
7. **Baseline**: add a cohort to `data/content-refresh-cohorts.json` (pages, matched control group of untouched posts at 5 or fewer impressions, win rule, read date = ship + 31), then `python3 scripts/content_refresh_tracker.py baseline <cohort-id>`. Commit.
8. **Schedule the read on the Mini**: one-off task `content-refresh-read-<ship-date>` (copy `~/.claude/scheduled-tasks/content-refresh-28day-read/` on the Mini, change the cohort id and date) plus its LaunchAgent via `~/bin/oneoff-task.sh`.
9. **Log**: decision-ledger row, `docs/project-log/decisions.md` entry.

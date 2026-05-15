# Recurring Issues Log

**Protocol:** Before diagnosing any error, check this file. After fixing any error that took >15 min, log it here. If an issue reoccurs, append a new attempt — don't repeat past fixes, try a new angle.

Format per entry:
```
## ISSUE-NNN — One-line title
🟢 FIXED | 🟡 RECURRING | 🔴 OPEN — Last: YYYY-MM-DD

Pattern: One sentence — symptom + trigger.
Attempts:
- YYYY-MM-DD — what was tried → outcome (commit hash optional)
If recurs: next angle to try.
```

Keep entries under 15 lines. No bloat. No decision trees — just enough to recognize the pattern and pick the next angle.

---

## ISSUE-001 — Blog queue empty, no new posts publishing
🟢 FIXED — Last: 2026-05-01

Pattern: `autonomous_blog_generation.sh` had interactive `input()` prompts, never ran unattended. Queue ran dry whenever no one manually triggered it.
Attempts:
- 2026-05-01 — Added `--auto` flag to `generate_weekly_content.py`, created Sunday 8pm local scheduled task `weekly-blog-content-generation` → green.
If recurs: scheduled task probably didn't fire — check `crontab -l` and macOS scheduled-tasks log.

---

## ISSUE-002 — daily_publish.py runs but nothing commits
🟢 FIXED — Last: 2026-04-13

Pattern: Workflow ran green but new HTML files never committed. `git diff --name-only` missed untracked files.
Attempts:
- 2026-04-13 — Workflow does `git add -A` first, then `git diff --staged --name-only` (commit 208b5ab) → green.
If recurs: someone reverted to `git diff --name-only`. Restore `--staged`. Do not change this again.

---

## ISSUE-003 — Workflow references uncommitted script
🟢 FIXED — Last: 2026-04-05

Pattern: Script exists locally, referenced in workflow, never `git add`ed. Works local, fails CI.
Attempts:
- 2026-04-05 — Rule: any file referenced from `.github/workflows/` must be committed first.
If recurs: pre-push hook should catch this — verify it's installed (`ls .git/hooks/pre-push`).

---

## ISSUE-004 — Homepage stuck on stale week / wrong YouTube videos
🟢 FIXED — Last: 2026-04-05

Pattern: Two scripts both called YouTube API. Secondary burned quota first; main fell back to stale cache.
Attempts:
- 2026-04-05 — Deleted `generate_weekly_topics.py`. Single-agent architecture: one YouTube API call per weekly run.
If recurs: grep for any new caller of `youtube.search()` outside the main weekly pipeline.

---

## ISSUE-005 — Sitemap not updating after publish
🟢 FIXED — Last: 2026-04

Pattern: New posts live on site but missing from sitemap. Google couldn't discover them.
Attempts:
- 2026-04 — `generate_blog_pages.py` regenerates sitemap on every run; `daily_publish.py` calls it.
If recurs: confirm `daily_publish.py` still invokes `generate_blog_pages.py`. Weekly GSC routine (Fri 9am) catches stragglers.

---

## ISSUE-006 — GSC "Page with redirect" blocking indexing
🟢 FIXED — Last: 2026-05

Pattern: Meta-refresh stubs created to "fix" 404s. GitHub Pages can't do 301s. GSC sees meta-refresh as un-indexable redirect; orphan scan re-adds stubs to sitemap.
Attempts:
- 2026-05 — Deleted stubs; patched `generate_blog_pages.py` to skip meta-refresh files in orphan discovery.
If recurs: someone added a new meta-refresh stub. Don't. Update the source link instead.

---

## ISSUE-007 — Daily publish blocked by validator critical errors
🟡 RECURRING — Last: 2026-05-15

Pattern: Pre-commit validator finds new critical (broken link, missing meta, orphaned file in `public/`) → daily-publish workflow exits 1 → site goes silent for days. Each "unblocking" commit fixes one critical; next run trips on a different one.
Attempts:
- 2026-05-13 — Added skip-nav to calculator2 (449b12f). Fixed that critical, next run hit canonical missing on bride pages.
- 2026-05-14 — Added canonicals to bride pages (a410a49). Fixed that critical, next run hit missing meta descriptions.
- 2026-05-15 — Fixed broken `seven-dollar-survival-guide` link, added meta descriptions to bride/keto-bride, moved stray `bride-protocol-template.html` from `public/` to `templates/`. Installed `pre-push` hook running `validate_before_commit.py` so future pushes can't surface new criticals in CI.
If recurs: someone pushed with `--no-verify` (check `git reflog` and last pusher), or the validator was bypassed. Next angles: (1) make CI's validator warn-only for non-blog pages, (2) add a `daily-publish-failed` watchdog that pings when workflow fails (separate from blog-queue-watchdog which only checks post age).

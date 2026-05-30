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
🟡 RECURRING — Last: 2026-05-30

Pattern: Scheduled task fires but Claude Code agent session fails auth. Queue runs dry silently.
Attempts:
- 2026-05-01 — Added `--auto` flag, created Sunday 8pm scheduled task → worked ONCE (May 2 batch).
- 2026-05-26 — Recurred. All content since May 5 was manual sessions.
- 2026-05-30 — Restructured pipeline: moved Chloe research from GitHub Action into Claude Code task. Task now does full pipeline (research → write → build → push). Moved to Sun+Wed 4:30am PST. Enabled completion notifications. Removed `generate_weekly_topics.py` from `weekly-update.yml`. Auth issue still the risk — next test: Sunday June 1.
If recurs: Check notification result Sunday morning. If auth fails, consider API-based content generation script as fallback.

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
- 2026-05-16 — Hardcoded link in `index_template.html` pointed to non-existent post; uncommitted roundup image baked into `index.html`. Fixed both symptoms. Root fix: promoted broken `/blog/*.html` links from warning→critical in `full-validation-sweep.py` (caught on every push now, not just daily publish); `_get_roundup_image()` in `generate.py` now verifies image exists on disk before returning path (falls back to default if not committed).
If recurs: someone pushed with `--no-verify` (check `git reflog` and last pusher), or the validator was bypassed. Next angle: add a `daily-publish-failed` watchdog that pings when workflow fails.

---

## ISSUE-008 — New blog posts not being indexed by Google
🟢 FIXED — Last: 2026-05-15

Pattern: Weekly Indexing API requests submitted but posts stay "URL is unknown to Google." 131 URLs in sitemap, 0 indexed per GSC sitemap report. Root cause: posts had no inbound static links once they rolled off the homepage bento grid (~2 weeks). Googlebot had no crawl path to them.
Attempts:
- 2026-05-15 (months of weekly indexing API calls) — Requesting indexing weekly via `gsc-request-indexing.js` → no sustained effect. Google finds the URL but deprioritizes it with no inbound links.
- 2026-05-15 — Replaced JS-fetched related content (invisible to Googlebot) with 3 static `<a href>` related posts baked in at build time in `generate_blog_pages.py`. Tag/category matching algorithm. All 122 published posts rebuilt (5342b3d).
If recurs: check that `find_related_posts()` is still being called in `generate_blog_pages.py` (not reverted to `post.get("related_posts", [])`). Also verify new posts have tags set — posts with no tags fall back to recency-only matching.

---

## ISSUE-009 — Weekly refresh workflow only ran 2 of 9 pipeline steps
🟢 FIXED — Last: 2026-05-18

Pattern: `weekly-update.yml` was a stub that only ran `generate_weekly_topics.py` + `generate.py` (no --type flag). Missing: `youtube_collector.py`, `content_analyzer_optimized.py`, `add_sentiment.py`, `generate_commentary.py`, `generate_blog_pages.py`, `answer_questions.py`, `extract_wiki_keywords.py`, `sync_blog_posts_to_supabase.py`, and all `--type` variants. Homepage showed "Week of May 03" for 2+ weeks because `analyzed_content.json` was never refreshed. Git commit step only staged `data/weekly_topics.json` + `index.html`, discarding all other generated files.
Attempts:
- 2026-05-18 — Rewrote `weekly-update.yml` to mirror `run_weekly_update.sh`: all 9 data steps (continue-on-error), `generate.py --type all`, git add of `data/` + `public/` + generated root files. Also added blog_link existence check in `generate.py` to prevent hallucinated trending tag URLs (cfdcd56).
If recurs: diff `weekly-update.yml` against `run_weekly_update.sh` — they must stay in sync. If a new script is added to the local pipeline, it must also be added to the workflow.

---

## ISSUE-010 — Blog post images missing since April 2026
🟢 FIXED — Last: 2026-05-26

Pattern: `generate_post_images.py` (Replicate API) was never added to any pipeline. Images generated manually in sessions through March; when content went automated, image step was omitted. SKILL.md hardcodes `"image": ""`. 43 posts (all Apr+May) have no images.
Attempts:
- 2026-05-26 — Identified root cause. Fix: added image generation to SKILL.md Step 5, weekly_content_prompt.md Step 3, daily_publish.py (non-blocking fallback before HTML render), and GH Actions workflow (REPLICATE_API_TOKEN secret added). Commits: 0887dcb, a75720f.
If recurs: check that SKILL.md still includes the image generation step after any scheduled task edits.

---

## ISSUE-012 — Hermes crashes: 'NoneType' object is not iterable
🟢 FIXED — Last: 2026-05-27

Pattern: OpenAI Python SDK `parse_response()` does `for output in response.output:` with no null guard. ChatGPT Codex backend (`chatgpt.com/backend-api/codex`) returns `output: null` in stream `response.completed` events. SDK crashes at `openai/lib/_parsing/_responses.py:61`. Affects ALL SDK versions through 2.38.0.
Attempts:
- 2026-05-27 — `hermes update` (471 commits) → no fix. SDK bump 2.24→2.25→2.30→2.38 → same bug in all versions. Patched SDK line 61: `response.output` → `(response.output or [])`. Hermes operational.
If recurs: Re-apply patch after any `hermes update` or `pip install openai`. Filed: openai/openai-python, NousResearch/hermes-agent.

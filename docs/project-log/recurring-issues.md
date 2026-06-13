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

---

## ISSUE-013 — Weekly agent fails: nested `claude --print` "Not logged in"
🔴 OPEN — Last: 2026-05-31

Pattern: `run_weekly_agent.sh` Step 3 spawns a child `claude --print < weekly_agent_prompt.md`. In a scheduled/headless run the child CLI has no auth session and exits with "Not logged in · Please run /login". `set -e` aborts the script, so Steps 4 (build) and deploy never run — site NOT updated. The parent Claude Code session is authenticated; the spawned subprocess does not inherit those credentials.
Attempts:
- 2026-05-31 — Scheduled run hit this on first attempt. Did not retry (per task policy). No fix applied yet.
If recurs: the architecture (scheduled task → bash → nested `claude` CLI) is the root problem. Next angles: (a) provision a long-lived API key / `ANTHROPIC_API_KEY` env for the headless child; (b) have the scheduled task itself perform the agent analysis inline instead of shelling out to a second `claude`; (c) confirm `claude setup-token`/credentials file is readable in the cron environment.

---

## ISSUE-014 — Reddit collector 403 Blocked on all subreddits
🟡 RECURRING — Last: 2026-05-31

Pattern: `reddit_collector.py` hits `https://www.reddit.com/r/{sub}/top.json` → `403 Client Error: Blocked` for all 5 subreddits. Reddit blocks unauthenticated/UA-spoofed JSON scrapes. Non-fatal (script continues; agent works from YouTube only) but Reddit signal is lost from the weekly update.
Attempts:
- 2026-05-31 — Observed during scheduled run. No fix applied (non-fatal, and run aborted at Step 3 anyway).
If recurs: Reddit now requires OAuth for API access. Next angles: register a Reddit app for OAuth (client_id/secret), or route through an Apify Reddit actor (Apify MCP is available), or rotate user-agent/add auth headers.

---

## ISSUE-015 — Deploy fails: roundup image referenced but not committed
🟡 RECURRING — Last: 2026-06-13

Pattern: `generate.py` creates roundup image and references it in `index.html`. Image exists locally but isn't git-tracked — CI 404 check fails on every push.
Attempts:
- 2026-06-01 — Committed missing image. Added Check 10c to `validate_before_commit.py`: missing absolute-path images are now CRITICAL (blocks commit), relative-path images are WARNING.
- 2026-06-13 — Recurred. `roundup-2026-06-13.jpg` generated locally, never staged. Caused 7 consecutive GitHub Actions failures across daily-publish and validate-deploy workflows (runs 27478127932, 27480232244, 27480239150, 27480579637, 27480688139, 27480854061, 27481101418). Hermes caught it via pipeline monitoring and queued outbox notes. Fix: committed image (b34ac51c). Verification: next CI run on main.
Root cause: `generate.py` creates the image but does not `git add` it. The pre-push hook catches it locally, but commits pushed without running the hook (or before running `generate.py`) slip through.
Prevention: `generate.py` should auto-stage roundup images after creation. Add `subprocess.run(['git', 'add', path])` after the image write in `_get_roundup_image()`.
If recurs: apply the auto-stage fix above. This is the third time — manual discipline is not working.

---

## ISSUE-009 — Drip emails not sending (401 Unauthorized)
🟢 FIXED — Last: 2026-06-05

Pattern: `send_drip.py` in daily-publish.yml gets 401 from Supabase because GitHub secrets point to old project. `continue-on-error: true` hides the failure — runs report success.
Attempts:
- 2026-06-05 — Updated GitHub secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to KetoDial project `kwtdpvnjewtahuxjyltn`. Manual workflow run confirmed Day 1 sent to real subscriber.
If recurs: Check if Supabase keys were rotated or project changed again. Also verify RESEND_API_KEY is still valid.

---

## ISSUE-016 — Drip emails contain broken blog post links
🟢 FIXED — Last: 2026-06-07

Pattern: 4 of 7 drip email templates linked to blog post slugs that never existed or were renamed. Links were written once and never validated against actual `public/blog/` files.
Attempts:
- 2026-06-07 — Audited all 7 drip templates. Fixed 4 broken links:
  - Day 1: `beginners-complete-blueprint-30-days-carnivore.html` → `2026-01-02-beginners-blueprint.html`
  - Day 3: `2025-12-26-seven-dollar-survival-guide.html` → `2026-04-19-carnivore-five-dollars-day-protein-cost-analysis.html`
  - Day 5: `real-2-week-results-carnivore.html` → `2026-01-15-two-week-results-reddit.html`
  - Day 7: was fine (HTML-encoded `&amp;` not a real break)
If recurs: Run link audit before any drip template edit: `grep -oP 'href="https?://carnivoreweekly\.com(/[^"&]+)' data/drip-emails/*.html` and verify each path exists in `public/`.

---

## ISSUE-017 — No email open/click tracking on drip or newsletter
🟢 FIXED — Last: 2026-06-07

Pattern: Resend sends emails but no webhook was configured. Opens, clicks, bounces were invisible. Sending blind since drip launched.
Attempts:
- 2026-06-07 — Created `drip_events` table in Supabase. Added `/webhook/resend` endpoint to Cloudflare Worker (`calculator-api.js`). Registered webhook with Resend API (all events: sent, delivered, opened, clicked, bounced, complained). Added tags (`drip_day`, `sequence`) to `send_drip.py`. Deployed worker (v2026-06-07-resend-webhook). End-to-end verified: test email → sent + delivered events logged in Supabase.
If recurs: Check webhook still registered: `GET https://api.resend.com/webhooks` with Bearer token. Check worker is deployed: `curl .../version`. Check `drip_events` table exists.

---

## ISSUE-018 — CLAUDE.md email section outdated (referenced Beehiiv)
🟢 FIXED — Last: 2026-06-07

Pattern: Email & Newsletter section in CLAUDE.md still described Beehiiv as the platform, referenced `beehiiv_client.py` and `publish_to_beehiiv.py`. All email moved to Resend in-house but CLAUDE.md was never updated. Caused confusion across sessions.
Attempts:
- 2026-06-07 — Rewrote entire Email & Newsletter section. Documents: Resend as sole platform, drip sequence flow, newsletter send flow, open/click tracking via webhook, signup endpoints, Supabase tables. Marked Beehiiv and MailerLite as DEPRECATED.

---

## ISSUE-019 — GSC Merchant Listings structured data errors
🟢 FIXED — Last: 2026-06-10

Pattern: calculator.html had a Product schema with `shippingDetails` and `hasMerchantReturnPolicy` — physical goods fields on a digital product. Triggered Merchant Listing validation in GSC which requires GTIN/MPN and Google Merchant Center feed we don't have.
Root cause: Product schema was manually added to calculator.html with copy-pasted shipping/return fields from a physical product example. No template or generator involved, so no downstream risk.
Attempts:
- 2026-06-10 — Removed entire Product schema block from calculator.html. Digital product has no real aggregateRating data, so Product schema provides no rich result value. WebApplication schema (already present) covers the free calculator. Added schema validation to `validate_before_commit.py` — now flags Product schemas missing aggregateRating and Product schemas with shippingDetails/hasMerchantReturnPolicy as CRITICAL.
Prevention: Pre-commit validator now blocks Product schemas with Merchant Listing fields. Re-add Product schema only when Stripe review count >= 5.

---

## ISSUE-020 — GSC Product Snippets structured data errors
🟢 FIXED — Last: 2026-06-10

Pattern: Same Product schema on calculator.html was missing `aggregateRating` and `review` fields, required by Google for Product Snippet rich results.
Root cause: Same as ISSUE-019 — manually added Product schema without required fields.
Attempts:
- 2026-06-10 — Fixed alongside ISSUE-019 by removing the Product schema entirely. Pre-commit now blocks Product schemas without review data.
Prevention: Same validator gate as ISSUE-019.

---

## ISSUE-021 — GSC 404 errors from renamed/deleted blog posts
🟢 FIXED — Last: 2026-06-10

Pattern: 10 real 404s found via GSC URL Inspection API on pages with actual search impressions. Root cause: a batch of Feb 2026 posts had their dates changed to 2026-02-08 (from 02-10, 02-12, 02-13, etc.), creating dead URLs Google had already indexed. Two deleted posts (`acne-purge`, `carnivore-didnt-fix-everything-content`) and one no-date slug also 404ing. Initial sitemap-only scan found 0 errors — the 404s only surfaced when scanning pages with Google impressions via search analytics API.
Attempts:
- 2026-06-10 — First scan (sitemap URLs only): found 0 actual 404s, misdiagnosed as indexing-only issue. Second scan (search analytics pages with impressions): found 10 real 404s. Created meta-refresh redirects for all 10: 7 date-renamed posts → correct 02-08 URLs, 1 no-date slug → dated version, 2 deleted posts → /blog/. Also created 14 preventive redirects for old slug patterns. Fixed broken `/calculator/` link in 404.html. Updated `redirects.json` with all 27 mappings. Resubmitted sitemap to GSC.
Prevention: Pre-commit validator exempts redirect stubs. `redirects.json` tracks all mappings. **Key lesson:** always scan pages with impressions (search analytics API), not just sitemap URLs — the 404s are URLs Google crawled BEFORE they were renamed/deleted, and those old URLs aren't in the current sitemap.

---

## ISSUE-022 — 68% of site not indexed by Google (date clustering)
🟡 RECURRING — Last: 2026-06-10

Pattern: 19 posts batch-dated to 2026-02-08 triggered Google's content farming detection. This is the SECOND time batch-dating caused GSC problems — ISSUE-021 was also caused by the same batch rename. The root mistake: renaming many post dates to the same value in a single operation.
Attempts:
- 2026-06-10 — Resubmitted sitemap. Identified date clustering via API audit.
- 2026-06-10 — Redistributed 9 not-indexed 02-08 posts to Jan 10-27 (every 2 days). Renamed files, updated JSON-LD datePublished, blog_posts.json, sitemap. Created redirects from old URLs. Fixed 6 redirect chains. Added redirect-stub cleanup to sitemap generator. Resubmitted sitemap to GSC. Google Indexing API can't request indexing for regular pages (only JobPosting/BroadcastEvent). Must wait for natural recrawl.
Prevention:
- NEVER batch-rename blog post dates to the same value. Max 2 posts per date.
- NEVER rename a published post's slug/date without creating a redirect from the old URL.
- Added to CLAUDE.md Lessons Learned to prevent recurrence.
If recurs: Check indexing status in 2-4 weeks via `scripts/gsc_404_check.py`. If still rejected, investigate per-page quality signals.

---

## ISSUE-023 — Report generator calorie overshoot (portions + eggs + butter)
🟢 FIXED — Last: 2026-06-13

Pattern: `generateFullMealPlan()` sized meat portions for 100% of protein target, then added eggs (18g protein, 210 cal) and butter (100 cal/tbsp) on top. A 1,500 cal target produced ~2,300 cal plans. Same math error duplicated in `generateGroceryListByWeek()` (weekly meat calculated for 100% protein, eggs added separately). Also: `parseMeal` regex `^(\d+)\s*oz` failed on Pescatarian/Keto breakfasts ("3 Eggs + 6 oz Salmon"). Keto grocery list missing vegetables entirely.
Attempts:
- 2026-05-30 — Same calorie overshoot in KetoDial's meal plan engine. Rebuilt `buildMealPlanDays()` with protein-first scaling + fat knob + budget-aware dinners. Got to 91% pass rate (was ~30%). Logged in Obsidian daily note but **NOT in recurring-issues.md**. Fix was in KetoDial repo (commit 4d04ac3), not CW's generate-report.js. Session went in circles before fix landed — Brew had to bring in Claude Chat to assist.
- 2026-06-13 — Bug resurfaced (or persisted) when portions/grocery features were added (commit 3eb6f2c7). Four fixes in commit b413ca71: (1) subtract eggProteinG (18g for non-Lion) before meat sizing, (2) remove `^` anchor from parseMeal regex, (3) subtract eggProteinDaily in grocery protein calc, (4) add leafy greens/broccoli/avocados for Keto. Deployed to Cloudflare. Hermes verified all 4 PASS.
If recurs: The root cause is any code that adds protein sources without subtracting their contribution from the meat budget. Check: does `targetProtein` get reduced by ALL non-meat protein sources before `meatOzPerMeal` is calculated? Also check grocery list uses the same subtraction. **Do NOT go in circles** — if the fix isn't working after 2 attempts, stop and ask Brew to bring in a second opinion.

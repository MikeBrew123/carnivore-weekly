# CLAUDE.md — Carnivore Weekly (+ KetoDial)

## Error Protocol
**Error log:** `docs/project-log/recurring-issues.md`. On every error, without being asked:
1. Before diagnosing, check the log. If the symptom matches a tracked ISSUE, read its Attempts and pick a NEW angle. Never repeat a failed fix.
2. After fixing (>15 min, or any CI/workflow failure), add or update the entry (`## ISSUE-NNN — title`, status 🟢/🟡/🔴, Pattern, dated Attempts, "If recurs"). ≤15 lines per entry.
3. If it recurred, append a dated Attempt and set 🟡 RECURRING.

**Pre-push hook:** `scripts/install-hooks.sh` installs `validate_before_commit.py` before every push. Never `--no-verify`.

---

## Etsy Shop Edits: HARD CAP (Brew, 2026-08-18; in force 2026-08-19)
Standing authority (2026-08-10) lets any session change Brew's own Etsy shop and sites same-day, on one condition: every change gets a row in `/Users/mbrew/Documents/Brew-Vault/00-Core/Live-Changes-Log.md`. Third-party contact, public posting elsewhere, and anything that spends money still go to Brew first.

1. **At most 3 DISTINCT listing ids edited in any rolling 7-day window.** A 4th needs Brew's word or you wait.
2. **The Live Changes Log row is written BEFORE the Etsy call, never after.** The row is the counter. If the call fails, edit the row to say so.

Preflight before any write (read-only, exits 1 if the edit would break the cap; fails closed if the log is unreadable):
```bash
node etsy/edit-cap.mjs <listing-id> [more ids...]
```
A PreToolUse hook (`scripts/hooks/etsy-write-first-guard.sh`) enforces both rules mechanically: any Bash command running a script under `etsy/` that is not on its read-only allowlist (or any command sending a write to `openapi.etsy.com`: a non-GET method in method context like `-X PATCH` or `method: 'PUT'`, a body flag like `curl -d`, or a client call like `requests.post(`; a substring such as `--input-type` does not count, ISSUE-079) is blocked unless the log was modified in the last 30 minutes AND `edit-cap.mjs` passes for the listing ids in the command (no ids: the window must have headroom). Read-only scripts (`sales-summary`, `etsy-snapshot`, `recent-reviews`, `dump-listing`, `fetch-listings`, `audit-*`, `verify-*`, `taxonomy-*`, `edit-cap`, `token`, `etsy-oauth`) pass. Tests: `bash tests/test_etsy_write_guard_hook.sh`. New write scripts are blocked by default; add read-only ones to the allowlist in the hook.
**Second layer, in-process:** `etsy/token.mjs` installs `etsy/etsy-guard.mjs`, which wraps `fetch`. Any POST/PUT/PATCH/DELETE to `openapi.etsy.com` throws unless a Live Changes Log row dated today names that listing id (creates: any Etsy row today) and the cap has headroom. Rows tagged `[cap-exempt <deck>]` today lift both. This covers every script that imports `token.mjs`, however it is invoked.

**`updateListing` (`etsy/update-listings.mjs`, PATCH) is the dangerous call.** A full-object replace wiped 7 of 8 images on two listings on 2026-08-10. Send only the fields you mean to change, the way `etsy/starter-kit-keyword-apply.mjs` does (two-field payload plus assert). Cap-exempt batch jobs and A/B-test listing holds are tracked in the Live Changes Log and `docs/project-log/decisions.md`, not here.

**Mockups:** product mockup images MUST use the actual product screenshot composited into a generated empty scene (Pillow). Never an AI-generated fake of the product.

---

## Concurrency: one active mutating session per worktree (Brew, 2026-09-08)
**Assume another Claude session may be pointed at this checkout.** On 2026-09-08 two sessions shared `/Users/mbrew/Developer/carnivore-weekly` and the other one committed this session's uncommitted safety work inside its own commits (`api/medical-context.js` entered history via a commit about shopping lists).

- Before any multi-step work that will modify files, **create a worktree** (`git worktree add --detach <path> HEAD`) and work there. One active mutating session per working directory.
- **Never use bare `git stash` / `git stash pop`** — the stash stack is shared across worktrees and another session can pop yours. Use `git stash push -u -m "<unique-tag>"`, apply by SHA, then drop by tag.
- Submodules are NOT checked out in a new worktree. `git submodule update --init ketodial/public` before running any suite that reads the intake form, or its assertions fail for the wrong reason.
- A worktree's submodule follows the parent's committed gitlink, which may be **ahead of** the main checkout's submodule. Check both before applying a patch.
- Commits found in the log that you did not make are probably another session's legitimate work. **Do not revert, squash or reorganize them to tidy history.**

## Paid health reports: hard launch rule (Brew, 2026-09-08)
**No paid health-related report may launch or materially change unless EVERY production report-generation entry point is enumerated and covered by the safety boundary, or explicitly retired.** On 2026-09-07 three separate generations of "the same report generator" were found hiding in different places across two products. That is a process problem, not a content problem, and this rule exists to stop a fourth.

**Suppress, never substitute.** Where a safe answer would require clinical judgement (protein in CKD, vitamin K with warfarin, electrolytes with a diuretic), the software suppresses the recommendation and routes to a clinician. It never computes a gentler number. Product-routing language is allowed; new clinical guidance is not.

**Gate on the blunt signal, not a keyword list.** Declared medication or relevant condition means no quantitative protocol. Free-text medication fields fail open on brand names, misspellings and "the little white one for my heart." Keyword lists may only sharpen *what the reader is told*, never decide whether it is safe to print a number.

**A suppressed recommendation must not keep driving downstream output.** Hiding a number while it still sizes the meal plan is cosmetic safety. A suppressed value may only continue to influence generated quantities if that behaviour has been separately reviewed and intentionally approved. See `docs/project-log/decisions.md` 2026-09-08.

**Test rendered output, and mutation-test the test.** A passing suite is not evidence until you have broken each protection, watched the suite go red on a named assertion, and restored it. On 2026-09-07 a 445-assertion pass sat on top of six P0 defects.

## Content Quality
**NEVER publish user-facing content (blog, commentary, newsletter, video descriptions, social, marketing) without the writer agents (Sarah, Marcus, Chloe).** Humanization and soft-conversion rules live in the `copy-editor`, `ai-text-humanization`, and `soft-conversion` skills; `scripts/generate_commentary.py` applies them automatically, manual content runs them before publishing.

## Content Strategy: upgrade before you expand (Brew, 2026-09-07)
**We build search-driven resources around the problems people are already demonstrating that they want solved.** Search impressions are evidence of demand. Existing rankings are evidence of relevance. The first job is making sure the right CW page owns that intent and deserves to rank.

- **NEVER create a new URL simply because a keyword was found.**
- Before creating anything, determine whether an existing CW page already owns, or should own, that search intent. Check GSC at page level and query level, and check `data/blog_posts.json`.
- **Upgrade, consolidate, redirect, or restructure before expanding.**
- New pages are for genuinely distinct problems, never variations of an existing one.
- Do not fight Google: if one URL already ranks for a family of related queries, make that URL excellent instead of splitting the intent across several pages.
- **Write broadly enough to capture search demand, but design the experience for the core 45-70, majority-women audience.** Titles and topic selection follow demand and stay broad; depth, tone, tables and printability serve that reader.
- Before proposing a redirect, pull **page-level** GSC for both source and destination. Never redirect a page into one with weaker impressions, clicks, or position. Redirects on live ranking URLs are irreversible in practice and need Brew's approval.

**The philosophy, final form (Brew, 2026-09-07):** Find problems people are actually searching for. Find the page Google already trusts to answer them. Strengthen that page when the evidence supports it. Create a new page only when the problem is genuinely distinct and the evidence justifies starting from zero.

**NEVER rewrite a page ranking at position <=15 without a preservation plan and a before/after measurement window.** Page-one and page-two winners are destroyed by well-meaning editors. State what must not change, record the baseline (impressions, clicks, position, date), make one change, and set the read date before touching it. "It could be better" is not a reason.

**Evidence order for any content proposal:** query/problem -> existing CW URL -> impressions -> clicks -> position -> search intent -> demographic fit -> action. The action is one of exactly four: UPGRADE / CONSOLIDATE / NEW PAGE / LEAVE ALONE. No word counts, no article outlines, no "SEO opportunity" justified by a keyword alone.

**No product redesign recommendation may be based on database schema alone (Brew, 2026-09-07).** Trace the data the whole way: **input -> persistence -> calculation -> rendering -> delivery.** Empty columns are not proof a question is unasked; they may be written to a different table, after a paywall, or never read back. This rule exists because a schema-only read produced "the personalization layer collects nothing," and the forensic pass found it collects *after purchase* into `cw_assessment_sessions`. Those are completely different product problems with opposite fixes.

**Diagnose before fixing.** A page with high impressions and no clicks has an unknown cause: wrong intent, wrong format, bad title/snippet, weak authority, cannibalization, or Google not rating the domain for that term. Name the cause with evidence before proposing the fix. "Obvious SEO logic" is frequently wrong here (2026-09-07: the seasonings page's smallest sub-query outranked its head term by 10 positions).

**Protect the control group. Never run overlapping content experiments.** When an experiment is live, do not simultaneously create, upgrade, consolidate and prune. If traffic moves you will not know why. Naturally improving pages that nobody has touched are the most valuable measurement asset the site has: designate them, change nothing on them, not even an inbound link, and read them on a fixed date.

**Use the page dimension, not the query dimension, for any aggregate claim.** The GSC query view covers ~27% of impressions and ~18% of clicks on this property (measured 2026-09-07). Per-query rows are fine; totals computed from it are not.

## Blog Pipeline
**The One Rule:** writers produce CONTENT ONLY. `scripts/generate_blog_pages.py` produces HTML pages. Writers never open, edit, or create files in `public/blog/` or `templates/`.
The full 7-step procedure (Supabase pre-flight, `data/blog_posts.json` schema, render, validate, sync, commit) is the `cw-blog-publish` skill. **Invoke `/cw-blog-publish` before writing or fixing any post**; do not reconstruct the schema from memory. (The `weekly-blog-content-generation` and `kd-blog-content-generation` scheduled tasks carry their own inline copy of these steps; if the skill changes, update those task prompts too.)

PROHIBITED:
- Editing `templates/` during content generation
- Writing HTML pages by hand instead of `generate_blog_pages.py`
- Slugs without a `YYYY-MM-DD-` prefix, or future dates (Google penalizes; ISSUE-021)
- Parallel agents writing to `blog_posts.json`
- Cross-links to posts that are not live on that domain (ISSUE-038). Cross-site mentions use the full `https://ketodial.com/...` or `https://carnivoreweekly.com/...` URL, never a same-site-relative path.
- Skipping `scripts/validate_before_commit.py`

**Weekly cadence:** CW 9 posts/week + KD 6/week, published one per day by the `daily-publish.yml` GitHub Action at 9 AM EST (`scripts/daily_publish.py`, status `ready` + `publish_date <= today`). Content is generated unattended by the `weekly-blog-content-generation` (Sun+Wed 4:33am) and `kd-blog-content-generation` (Tue+Fri) scheduled tasks; manual top-up: paste `scripts/weekly_content_prompt.md`. `scripts/autonomous_blog_generation.sh` blocks on stdin and cannot run unattended.
**ALWAYS run BOTH** `generate_blog_pages.py --site cw|kd` AND `scripts/generate.py --type pages` before commit. Bare `generate_blog_pages.py` renders every site into `public/blog/` and pollutes the CW sitemap (ISSUE-035).

**Template:** `templates/blog_post_template_2026.html` is the only blog template (`blog_post_template.html` was deleted Feb 2026). Fix the template, never the output file. Same for `public/index.html`, `public/channels.html`, `public/archive.html`: sources are `templates/index_template.html`, `channels_template.html`, `archive_template.html`; `scripts/run_weekly_update.sh` regenerates them on Sundays. Manual edits to output files get logged under MANUAL EDITS LOG in `docs/project-log/current-status.md`.

### SEO / slug / date rules (ISSUE-021, ISSUE-022)
- Max 2 posts sharing any single `datePublished`. Never batch-rename dates to one value.
- Never rename a published slug or date without a redirect (`data/redirects.json` + meta-refresh stub). Never chain redirects.
- **Unpublishing or deleting a post requires the same redirect stub as a rename.** "Zero traffic today" is not a reason to skip it: an unpublished URL keeps drawing impressions and clicks for months (verified 2026-09-07 — commit `f0e31058` unpublished 5 posts on 2026-08-24 with no stubs, and one of them took a real click into a 404 nine days later). Retargeting pre-existing stubs is not enough; the canonical URL of every removed post needs its own stub.
- Google Indexing API only works for JobPosting/BroadcastEvent schema (formerly "Lesson #13", referenced by the `weekly-gsc-indexing` task). For normal pages: resubmit the sitemap and wait.
- Never trend a GA4 event across its own instrumentation date: run `python3 dashboard/ga4_event_history.py <event>` first. Raw GA4 sessions are bot-inflatable; trend calls use GSC clicks + calculator sessions.

---

## Email: all in-house via Resend
**Beehiiv and MailerLite are DEPRECATED (purged 2026-07-04 / 2026-05-26). Never use either.**
- Key: `secrets/api-keys.json` → `resend.key` (webhook secret: `resend.webhook_signing_secret`). Domain `carnivoreweekly.com`, DKIM/SPF/DMARC live.
- Drip: `scripts/send_drip.py --site cw|kd`, daily via `daily-publish.yml` (KD gated by the `KD_DRIP_ENABLED` repo variable). Templates `data/drip-emails/` and `data/drip-emails/kd/`. Newsletter: `scripts/generate_newsletter.py` then `scripts/send_newsletter.py --site cw|kd`.
- **Never write drip copy claiming a deadline Stripe does not enforce.** Day-7/28 sends mint single-use 48h promo codes via `mint_promo_code()`; mint failure falls back to static `DRIP50` with no expiry claim.
- **KD drip replies go to `ketodial@carnivoreweekly.com` (inbound catch-all → daily digest), never to iambrew@gmail.com.** KD promo copy says "enter code at checkout", never "auto-applies".
- **Resend quota alarm (deck 920ebe5a, 2026-09-11).** Free tier, 100/day, do not upgrade without Brew. A 429 `daily_quota_exceeded`/`monthly_quota_exceeded` is never retried: `scripts/resend_quota.py` writes a row to Supabase `email_send_refusals` (hand re-send, then set `resent_at`), and the workflow opens a GitHub issue and turns the run red. Drip refusals retry on the next daily run by themselves; newsletter refusals do not. A `rate_limit_exceeded` 429 still backs off and retries. Test: `python3 tests/test_resend_quota_alarm.py`.
- Never rich-text paste into an email editor. Never send a newsletter without `--test` first.
Tables, endpoints, and event tracking: `docs/project-log/current-status.md`.

---

## Database: one Supabase project, two sites
CW and KD share project `kwtdpvnjewtahuxjyltn` on purpose (shared writer team and cross-flowing audience). NOT the old `wnwkbbfuatdcfragrrpw`.
- Site-scoped tables carry `site` (`cw`/`kd`): `blog_posts`, `newsletter_subscribers`, `coach_members`, `content_signals`, `drip_subscribers`, `drip_events`, `drip_survey_*`. **Every query, send, or export against these filters by site** unless the task is explicitly cross-site. `drip_subscribers` unique key is `(email, site)`.
- Shared on purpose (no filter): `writers`, `writer_content`, `writer_memory_log`, `agent_memories`. `coach_*` tables are the KD Coach app; join into CW reporting only via `coach_members.site`.
- Any NEW per-site table gets a `site` column from day one and its scripts take `--site`.
- Stripe MCP is available for payments, products, refunds: use it directly.

---

## Documentation
- Reports → `docs/archive/reports-archive/YYYY-MM-DD-topic.md`; never leave one-offs in `docs/reports/`. Guides: update `docs/guides/`, never add new files.
- No API keys, secrets, or credentials in any `.md` file. Use `***REDACTED***`.

## Session Workflow (Beads)
Start: `bd ready`, then `bd list --status=in-progress`, then `bd update <id> --status=in_progress`. During: `bd create "..." --priority <1-5>`, `bd update <id> --status=done|blocked --comment "..."`.
End ("wrap up" / "end session", in addition to the root protocol): file remaining work as beads, close or block every in-progress task, then `bd sync && git add .beads/ && git commit -m "beads: end session" && git push`, and report completed / filed / `bd ready`. NEVER end a session without syncing. Beads is the source of truth for tasks, not markdown.

## Triggers (project-specific; root triggers still apply)
| Brew says | Do |
|---|---|
| "show reports" / "analytics" | `dashboard/generate-all-reports.sh` |
| "run the week" / "weekly ops" | Read `Brew-Vault/04-Systems/Projects/Carnivore-Weekly/Operator-Handbook.md`, run the weekly loop |
| "scoreboard" | Read `Brew-Vault/04-Systems/Projects/Carnivore-Weekly/reports/scoreboard.md`. Operating Rules at top are canonical. Act on reds. |

## Hard rules that were learned the hard way
- Amazon book links wrap only the title. Affiliate links use https://.
- Always absolute paths in Python scripts. Don't touch the `content_validator.py` double-slash regex (`[^:]` before `//`).
- New validators run against the full codebase. Pre-commit checks that link targets exist on disk.
- **Image spend: $1.00/day shared CW+KD cap (Brew, 2026-08-08).** Enforcer `scripts/image_budget.py` fails closed (`--status` to check). Any new script calling a paid image API MUST gate on it and add the model's real unit cost to `config/image-budget.json` first. `generate_post_images.py` is forward-looking and capped at 10/run; backlog sweeps need `--slug` or `--include-backlog`.

---

## KetoDial (ketodial.com)
Static site at `ketodial/public/` (GitHub Pages); Coach app at `ketodial/coach-app/` (Vercel). Same writers and voice rules as CW; every health-adjacent post needs the "Not a Doctor" blockquote; Etsy links use `?utm_source=ketodial&utm_medium=blog&utm_campaign={slug}`; max 25% of posts mention products.
- **Dual blog pipeline:** ~27 legacy posts are standalone HTML with inline content; new posts flow through `blog_posts.json` (`"site": "kd"`) → `scripts/daily_publish.py --site kd` → `ketodial/scripts/generate_kd_blog.py --only-new`.
- **NEVER bulk-regenerate KD blog HTML. Never drop `--only-new`.** A regeneration wiped all 26 legacy posts on 2026-06-12 (ISSUE-026). Edits to legacy posts are surgical (sed/python on specific tags, never inside `<div class="content">`). Enforced two ways: the PreToolUse hook `scripts/hooks/kd-regen-guard.sh` blocks `generate_kd_blog.py` without `--only-new`, and `.claude/rules/ketodial-legacy-blog.md` loads whenever a legacy post file is read.
- Recipes: the `kd-recipe-pipeline` skill (Apify scrape → card → Replicate image → publish). Never use source-site images; never publish below 4.5 stars.

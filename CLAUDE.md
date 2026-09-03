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
A PreToolUse hook (`scripts/hooks/etsy-write-first-guard.sh`) enforces both rules mechanically: any Bash command running a script under `etsy/` that is not on its read-only allowlist (or any `curl` to `openapi.etsy.com` with PATCH/POST/PUT/DELETE) is blocked unless the log was modified in the last 30 minutes AND `edit-cap.mjs` passes for the listing ids in the command (no ids: the window must have headroom). Read-only scripts (`sales-summary`, `etsy-snapshot`, `dump-listing`, `fetch-listings`, `audit-*`, `verify-*`, `taxonomy-*`, `edit-cap`, `token`, `etsy-oauth`) pass. New write scripts are blocked by default; add read-only ones to the allowlist in the hook.
**Second layer, in-process:** `etsy/token.mjs` installs `etsy/etsy-guard.mjs`, which wraps `fetch`. Any POST/PUT/PATCH/DELETE to `openapi.etsy.com` throws unless a Live Changes Log row dated today names that listing id (creates: any Etsy row today) and the cap has headroom. Rows tagged `[cap-exempt <deck>]` today lift both. This covers every script that imports `token.mjs`, however it is invoked.

**`updateListing` (`etsy/update-listings.mjs`, PATCH) is the dangerous call.** A full-object replace wiped 7 of 8 images on two listings on 2026-08-10. Send only the fields you mean to change, the way `etsy/starter-kit-keyword-apply.mjs` does (two-field payload plus assert). Cap-exempt batch jobs and A/B-test listing holds are tracked in the Live Changes Log and `docs/project-log/decisions.md`, not here.

**Mockups:** product mockup images MUST use the actual product screenshot composited into a generated empty scene (Pillow). Never an AI-generated fake of the product.

---

## Content Quality
**NEVER publish user-facing content (blog, commentary, newsletter, video descriptions, social, marketing) without the writer agents (Sarah, Marcus, Chloe).** Humanization and soft-conversion rules live in the `copy-editor`, `ai-text-humanization`, and `soft-conversion` skills; `scripts/generate_commentary.py` applies them automatically, manual content runs them before publishing.

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
- Google Indexing API only works for JobPosting/BroadcastEvent schema (formerly "Lesson #13", referenced by the `weekly-gsc-indexing` task). For normal pages: resubmit the sitemap and wait.
- Never trend a GA4 event across its own instrumentation date: run `python3 dashboard/ga4_event_history.py <event>` first. Raw GA4 sessions are bot-inflatable; trend calls use GSC clicks + calculator sessions.

---

## Email: all in-house via Resend
**Beehiiv and MailerLite are DEPRECATED (purged 2026-07-04 / 2026-05-26). Never use either.**
- Key: `secrets/api-keys.json` → `resend.key` (webhook secret: `resend.webhook_signing_secret`). Domain `carnivoreweekly.com`, DKIM/SPF/DMARC live.
- Drip: `scripts/send_drip.py --site cw|kd`, daily via `daily-publish.yml` (KD gated by the `KD_DRIP_ENABLED` repo variable). Templates `data/drip-emails/` and `data/drip-emails/kd/`. Newsletter: `scripts/generate_newsletter.py` then `scripts/send_newsletter.py --site cw|kd`.
- **Never write drip copy claiming a deadline Stripe does not enforce.** Day-7/28 sends mint single-use 48h promo codes via `mint_promo_code()`; mint failure falls back to static `DRIP50` with no expiry claim.
- **KD drip replies go to `ketodial@carnivoreweekly.com` (inbound catch-all → daily digest), never to iambrew@gmail.com.** KD promo copy says "enter code at checkout", never "auto-applies".
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

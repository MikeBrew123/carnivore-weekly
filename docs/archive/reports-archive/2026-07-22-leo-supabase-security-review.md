# Supabase Security and Health Review: CarnivoreWeekly

- **Date:** 2026-07-22
- **Reviewer:** Leo (database architect persona)
- **Status:** Review was read-only; an execution pass followed after Brew approved the Critical + two High fixes (2026-07-22 12:58 PDT). See the Execution Log at the end.
- **Project:** CarnivoreWeekly (`kwtdpvnjewtahuxjyltn`, us-east-2, Postgres 17.6, ACTIVE_HEALTHY)
- **Scope:** Security + performance advisors, RLS audit, grants audit, SECURITY DEFINER functions, views, extensions, health stats
- **Note on the SQL below:** the Findings sections were written as pre-execution recommendations (marked NOT EXECUTED). What was actually run afterward — and how it differs from these first drafts — is recorded in the Execution Log at the end. Where they differ, the Execution Log is authoritative.

---

## Do these 3 things first (plain language)

1. **Lock down `calculator_reports`.** Right now anyone on the internet with the site's public API key can download every unexpired calculator report, including the customer's email address, the secret access token that is supposed to protect the report, and the full report content. This is the paid-product table. One policy change fixes it (Finding 1).
2. **Hide IP addresses in `post_reactions`.** The public read policy on reactions exposes visitor IP addresses, browser fingerprints, and user agents to anyone. Replace the raw-table read with the aggregate-count view that already exists (Finding 2).
3. **Finish the grant revoke started on 2026-07-21.** The quarterly review revoked anon access on 4 tables, but roughly 60 other tables and all 13 views still grant anon and authenticated full write privileges (including TRUNCATE, which RLS does not cover). RLS is currently the only thing standing between the public API key and the data. Revoke the blanket grants and fix the default privileges so new tables do not get them either (Finding 3).

---

## Context: what was already done on 2026-07-21 (not re-reported as new)

- Verified every table in `public` has RLS enabled (confirmed again in this review: all 66 tables, RLS on).
- Revoked leftover anon/authenticated grants on `etsy_tokens`, `stripe_webhook_events`, `writer_inbox`, `project_status` (confirmed: these 4 no longer appear in the grants list).
- All 13 views converted to `security_invoker` (confirmed live: every view in `public` has `security_invoker=true/on`).
- Function `search_path` hardening landed for most functions (confirmed: all app functions have pinned `search_path`).
- 9 migrations committed; Brew enabled the Auth "Prevent use of leaked passwords" toggle.

**Discrepancy worth noting:** the security advisor still reports "Leaked Password Protection Disabled" as of this review. Either the advisor cache has not refreshed or the toggle did not save. Verify in Dashboard > Auth > Providers > Password. See Finding 8.

Also noting: migration `20260721170207_drop_unused_and_duplicate_indexes` ran, yet a duplicate index pair still exists on `calculator2_sessions`, and `20260721173533_revoke_anon_grants_internal_tables` only covered the 4 named tables. The 2026-07-21 pass was directionally right but incomplete; this review picks up the remainder.

---

## Findings by severity

Counts: **1 Critical, 2 High, 6 Medium, 5 Low.**

### CRITICAL

#### Finding 1: `calculator_reports` readable by anon, leaks email + access_token + report content

The table has policy `public_calculator_reports_read` (SELECT, role `public`, USING `is_expired = false AND expires_at > now()`), and anon holds SELECT. Via PostgREST, `GET /rest/v1/calculator_reports?select=email,access_token,report_html` returns **every unexpired report** for anyone holding the publishable anon key. This exposes:

- Customer emails (PII, paid customers).
- `access_token` values, which defeats the token-gating scheme entirely.
- Full generated report content (the paid product).

The intended pattern is: client presents a specific `access_token`, server returns only that row. The correct home for that lookup is a service-role edge function or a SECURITY DEFINER function taking the token as an argument, never a blanket SELECT policy.

**Fix (NOT EXECUTED):**

```sql
-- 1. Remove the public read policy
DROP POLICY "public_calculator_reports_read" ON public.calculator_reports;

-- 2. Revoke direct table access from client roles
REVOKE ALL ON public.calculator_reports FROM anon, authenticated;

-- 3. Replace with a token-scoped RPC (returns exactly one row, never the token itself)
CREATE OR REPLACE FUNCTION public.get_calculator_report(p_access_token text)
RETURNS TABLE (report_html text, generated_at timestamptz, expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.report_html, r.generated_at, r.expires_at
  FROM public.calculator_reports r
  WHERE r.access_token = p_access_token
    AND r.is_expired = false
    AND r.expires_at > now()
$$;
REVOKE EXECUTE ON FUNCTION public.get_calculator_report(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_calculator_report(text) TO anon;
```

Check first whether the site frontend reads `calculator_reports` directly with the anon key; if it does, swap it to `rpc/get_calculator_report` in the same deploy.

### HIGH

#### Finding 2: `post_reactions` public SELECT exposes ip_address, fingerprint, user_agent

Policy `reactions_public_read` (SELECT, `public`, USING true) plus anon SELECT grant means anyone can dump visitor IP addresses, browser fingerprints, and user agents. Same class of problem the 2026-07-21 `poll_votes_hide_pii_aggregate_view` migration fixed for `poll_votes`, but `post_reactions` was missed. The aggregate view `v_poll_results` pattern already exists; `v_post_reaction_counts` exists too and is the right public surface.

**Fix (NOT EXECUTED):**

```sql
DROP POLICY "reactions_public_read" ON public.post_reactions;
REVOKE SELECT ON public.post_reactions FROM anon, authenticated;
-- Public reads go through the aggregate view instead:
GRANT SELECT ON public.v_post_reaction_counts TO anon, authenticated;
-- (v_post_reaction_counts is security_invoker; it needs its own SELECT-safe
--  source. Either keep a column-limited policy on post_reactions that only
--  the view uses, or rebuild the view as SECURITY DEFINER-equivalent via a
--  function. Simplest: change the view to aggregate from a policy
--  "reactions_public_read_agg" USING (true) but revoke column-level access:
REVOKE SELECT (ip_address, fingerprint, user_agent) ON public.post_reactions FROM anon, authenticated;
```

Note: column-level REVOKE alone (last line) is the minimal fix if the site reads `post_reactions` directly today; PostgREST will then reject `select=*` for anon, so verify what columns the frontend requests.

#### Finding 3: Blanket anon/authenticated grants on ~60 tables and all views, plus default privileges that recreate them

`information_schema.role_table_grants` shows anon and authenticated hold DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on essentially every table and view in `public` (Supabase legacy default). Two sharp edges:

- **TRUNCATE is not subject to RLS.** PostgREST does not expose TRUNCATE, so exploitation requires a SQL path, but the grant should not exist on principle.
- **RLS is the single line of defense.** One future `USING (true)` policy typo on any table instantly exposes it, because the grants are already there. The 2026-07-21 incident on `etsy_tokens` etc. was exactly this pattern.

`pg_default_acl` confirms both `postgres` and `supabase_admin` default ACLs grant full DML to anon/authenticated on **future** tables and sequences too, so the problem regrows with every migration.

**Fix (NOT EXECUTED), tables-first, then defaults:**

```sql
-- Revoke write privileges everywhere; RLS-gated writes only need the
-- specific privilege the policy supports.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Then re-grant only what live policies actually use:
GRANT SELECT ON public.blog_posts, public.content_topics, public.topics,
  public.topic_polls, public.topic_product_mapping, public.recipes,
  public.recipe_ratings, public.poll_options, public.weekly_analysis,
  public.wiki_video_links, public.youtube_videos, public.payment_tiers,
  public.v_poll_results, public.v_post_reaction_counts,
  public.v_content_by_topic, public.v_topics_by_content,
  public.v_related_content TO anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers, public.waitlist,
  public.poll_votes, public.content_feedback, public.post_reactions,
  public.recipe_ratings, public.refund_requests, public.report_access_log,
  public.calculator_sessions_v2 TO anon;

-- Stop the regrowth (run for both grantor roles):
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
```

Caution: `supabase_admin` default ACLs cannot be altered from the `postgres` role; that part is platform-managed and acceptable to leave. Test the re-grant list against the live site before running the revoke in production, and run it as one migration so the window is atomic. Sequences: anon/authenticated currently hold USAGE on 9 sequences (`writers_id_seq`, `writer_*`, `calculator2_sessions_id_seq`, `site_features_id_seq`, `calculator_report_access_log_id_seq`); only keep USAGE where an anon INSERT policy needs the default `nextval` (calculator tables), revoke the writer/site_features ones.

### MEDIUM

#### Finding 4: 16 tables have RLS enabled but zero policies while anon grants remain

Advisor INFO on: `dev_issues`, `drip_subscribers`, `drip_survey_options`, `drip_survey_questions`, `drip_survey_responses`, `drip_survey_views`, `etsy_tokens`, `project_status`, `rejected_videos`, `site_features`, `sps_archives`, `sps_boards`, `sps_scan_counters`, `sps_secrets`, `stripe_webhook_events`, `writer_inbox`. Default-deny holds (no data returned), so this is not an active leak, but the tables are enumerable through PostgREST and the grants are pointless risk. Finding 3's blanket revoke resolves all of these. If a table is genuinely service-only, add an explicit `service_role` ALL policy for self-documentation, matching the pattern already used on `writer_content` etc.

#### Finding 5: sps_* stray-app surface: 6 SECURITY DEFINER RPCs callable by anon

Known context: the `sps_*` tables belong to an unrelated app from another Supabase account, not a CW schema bug. What this review adds: the exposure is not just the tables. Six SECURITY DEFINER functions (`sps_archive_get/put`, `sps_board_get/upsert/delete`, `sps_scan_allow`) are executable by anon and authenticated via `/rest/v1/rpc/...`. `sps_archive_put` is an unauthenticated write (storage abuse vector on the CW database), `sps_scan_allow` mutates counters per caller-supplied IP, and all are pinned only to `search_path=public` rather than an empty search_path. `sps_secrets` itself has no direct anon grants (good), but the RPCs are the app's intended access path and they run on CW's connection quota and disk.

**Recommendation:** migrate this app to its own Supabase project. Until then, no schema change (it would break the other app), but inventory which origins call these RPCs so the migration has a cutover list.

#### Finding 6: `is_coach_admin()` / `is_coach_owner()` executable by anon, and coach policies target role `public`

Advisor WARN. These SECURITY DEFINER helpers are referenced by coach RLS policies whose role is `{public}` rather than `{authenticated}`, which is why anon needs EXECUTE at all (policy expressions evaluate as the querying role). Anon can never be a coach admin, so every anon request against coach tables pays the function call for a guaranteed false.

**Fix (NOT EXECUTED):** recreate the eight coach policies (`admins_read_all`, `owner_manage_admins`, `admins_read_checkins`, `admins_manage_credits`, `admins_manage_notes`, `admins_manage_members`, `admins_manage_messages`, `admins_read_metrics`, `admins_read_safety`, `admins_update_safety`, `admins_read_stripe_events`, `admins_read_audit`) with `TO authenticated`, then:

```sql
REVOKE EXECUTE ON FUNCTION public.is_coach_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_owner() FROM anon;
```

This also clears most of the `multiple_permissive_policies` performance warnings (Finding 11) in the same pass, since the advisor counts the anon/authenticator/dashboard_user role fan-out of `public`-role policies.

#### Finding 7: Unrestricted public INSERT endpoints (8 tables)

Advisor WARNs `rls_policy_always_true` on INSERT for: `calculator_sessions_v2`, `content_feedback`, `newsletter_subscribers`, `poll_votes`, `post_reactions`, `recipe_ratings`, `refund_requests`, `waitlist`, `report_access_log`. Anonymous INSERT is intentional for these product surfaces, so this is accepted risk, but currently nothing bounds volume or shape. Concrete hardening, in order of value:

- `refund_requests`: this one gates money workflows. Move creation behind an edge function that validates a Stripe session/email match; a forged flood of refund requests creates operational noise at minimum.
- Add CHECK constraints for maximum field lengths on free-text columns (feedback text, emails) so a single INSERT cannot be megabytes.
- Rate limit at the edge (Cloudflare rules on `/rest/v1/*` POST, or move these inserts behind edge functions with Turnstile). Postgres cannot rate limit anon by itself.
- `poll_votes` and `recipe_ratings`: consider a unique constraint on (poll_id/recipe_id, fingerprint) to blunt ballot stuffing; currently duplicate votes are unconstrained.

#### Finding 8: Leaked password protection: advisor still reports disabled

Brew enabled the toggle 2026-07-21, yet the advisor (fetched today) still flags it. Verify the setting persisted in the dashboard; if it shows enabled, re-run advisors in a day and treat as cache lag. If it shows disabled, re-enable and save. No SQL applies.

#### Finding 9: `vector` extension installed in `public` schema

Advisor WARN. Standard fix is `extensions` schema, but moving pgvector relocates its types and operators, and `agent_memories` (embedding column) plus the pgvector-memory MCP depend on it. Low urgency, real migration cost. Recommended path when convenient:

```sql
-- Requires brief downtime for anything using vector types
ALTER EXTENSION vector SET SCHEMA extensions;
-- then verify agent_memories queries still resolve operators via search_path
```

Defer until a maintenance window; not exploitable in itself.

### LOW (performance and hygiene)

#### Finding 10: Duplicate index on `calculator2_sessions`

`calculator2_sessions_session_token_key` (unique constraint) and `idx_calculator2_sessions_token` are identical. Live stats: the redundant plain index has absorbed 13,001 scans; the planner will switch to the unique index once the duplicate is gone. The 2026-07-21 drop-duplicates migration missed this pair.

```sql
DROP INDEX CONCURRENTLY public.idx_calculator2_sessions_token;  -- NOT EXECUTED
```

#### Finding 11: 36 multiple-permissive-policy warnings

Concentrated on `coach_*` (fixed by Finding 6), and on `recipes` / `recipe_ratings` / `poll_options` / `refund_requests`, where a `service_role`-check policy written with role `public` overlaps the genuine public policy. The `auth.role() = 'service_role'` policies are redundant on Supabase (service_role bypasses RLS via BYPASSRLS on current projects, and every other table here already uses `TO service_role` policies instead). Consolidation pattern, per table:

```sql
-- Example for recipes (repeat for recipe_ratings, poll_options, refund_requests):
DROP POLICY "recipes_service" ON public.recipes;
CREATE POLICY "recipes_service" ON public.recipes
  FOR ALL TO service_role USING (true) WITH CHECK (true);  -- NOT EXECUTED
```

#### Finding 12: 10 unindexed foreign keys

On `coach_admin_audit_log`, `coach_safety_events` (3), `generated_reports`, `report_access_log`, `writer_memory_log` (2), `writers` (2). At the current 27 MB database size this is negligible; it matters when coach tables grow. Add covering indexes opportunistically in the next coach-feature migration, e.g.:

```sql
CREATE INDEX CONCURRENTLY idx_coach_safety_events_checkin_id
  ON public.coach_safety_events (checkin_id);  -- NOT EXECUTED, one per FK
```

#### Finding 13: 63 unused indexes

Spread across 30 tables. Caveat: index usage stats were effectively reset by the 2026-07-21 index rework, so "unused" reflects less than a day of traffic in some cases. Do not drop on this evidence. Re-check `pg_stat_user_indexes` after 30 days of normal traffic and drop what is still at zero scans, excluding unique/PK constraint indexes.

#### Finding 14: General health: green

- Database size 27 MB; largest table `youtube_videos` at 2.8 MB. No bloat concern.
- Dead tuples negligible everywhere (max 60 on `content_topics`). 56 of 66 tables never vacuumed simply because they have not crossed autovacuum thresholds at this size; normal.
- Connections: 14 total, 5 idle, 2 idle over an hour; consistent with Supabase pooling, no leak signature.
- Postgres 17.6 GA channel, project ACTIVE_HEALTHY.
- Extensions installed: only `pgcrypto`, `pg_stat_statements`, `supabase_vault`, `uuid-ossp`, `vector`, `plpgsql`. Minimal and appropriate.
- All 13 views are `security_invoker` and owned by `postgres`. No SECURITY DEFINER views.
- Function `search_path` pinning: every application function has `search_path` set (mostly empty-string, some `public, pg_temp`). The six `sps_*` functions pin only `public`; acceptable but note in the sps migration plan.

---

## Suggested sequencing

| Order | Action | Finding | Risk if deferred |
|---|---|---|---|
| 1 | calculator_reports policy + RPC | 1 | Active PII and paid-content leak |
| 2 | post_reactions column revoke | 2 | Active IP/fingerprint leak |
| 3 | Blanket grant revoke + default privileges | 3, 4 | One policy typo away from a leak |
| 4 | Coach policies to `authenticated`, revoke anon on helpers | 6, 11 | Minor info surface, advisor noise |
| 5 | Verify leaked-password toggle | 8 | Weak-password signups |
| 6 | refund_requests edge-function gate, length CHECKs, rate limits | 7 | Spam and ops noise |
| 7 | Drop duplicate index | 10 | Trivial write overhead |
| 8 | sps_* migration plan to own project | 5 | Shared blast radius continues |
| 9 | FK indexes with next coach migration | 12 | None at current size |
| 10 | Unused-index recheck in 30 days, vector schema move in a window | 13, 9 | None near-term |

All fixes above are drafted as SQL but **none were executed** in this review. Items 1 to 4 belong in reviewed migrations (Leo drafts, main session executes per standing workflow), with a frontend grep beforehand to confirm which tables the anon key actually touches.

---

## Execution Log (2026-07-22, post-approval)

Brew approved executing the Critical + two High findings only (live chat 12:58 PDT). Medium/Low left untouched. Each fix was sequenced to be atomic (fully done or fully untouched).

### High 2 (Finding 2) — post_reactions PII — DONE
- **Migration applied:** `20260722_post_reactions_hide_pii_columns` (Supabase MCP + repo file `supabase/migrations/20260722_post_reactions_hide_pii_columns.sql`).
- **Frontend check first:** `public/js/post-reactions.js` reads counts only via the `security_invoker` view `v_post_reaction_counts` (needs `post_slug`, `reaction_type`) and INSERTs with `Prefer: return=minimal` (no row read-back). So the read policy was **kept** (the view depends on it) and only PII columns were locked via column grants — dropping the policy would have broken the view.
- **Verified live:** anon `SELECT` on `ip_address` / `fingerprint` / `user_agent` = false; `post_slug` / `reaction_type` = true; `INSERT` = true. Reactions widget and count display unaffected.

### High 3 (Finding 3) — blanket grants — DONE (anon fully; authenticated scoped)
- **Migration applied:** `20260722_harden_anon_grants_and_default_privileges` (+ repo file same name).
- **Enumeration done first:** the entire browser-side anon-key surface is INSERT `post_reactions`; SELECT views `v_post_reaction_counts` + `v_related_content`; EXECUTE `rpc/get_related_content` (SECURITY INVOKER, reads `content_topics`+`topics`, both public-read). Everything else (newsletter, waitlist, polls, calculator, feedback, refunds) goes through the Cloudflare Worker with the **service_role** key. `get_related_content` and the anon-reachable views' underlying tables were cross-checked so the SELECT re-grant list is complete.
- **Executed:** revoked INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER from `anon` on all public tables; re-granted INSERT to the 9 tables that have a genuine anon/public INSERT policy; revoked TRUNCATE/REFERENCES/TRIGGER from `authenticated`; `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` so future tables/sequences/functions no longer auto-grant to anon/authenticated.
- **Deliberately NOT done:** full `authenticated` DML revoke. The coach feature's authenticated write matrix (member INSERTs on coach_checkins/messages/metrics; admin ALL via `is_coach_admin()`/`is_coach_owner()` on coach_admins/members/notes/credit_ledger/messages/safety_events) cannot be verified end-to-end from SQL without a real member/admin JWT, and coach is a live paid feature (8 members). Stripping authenticated DML risked silent breakage, so only the never-needed, RLS-bypassing TRUNCATE/REFERENCES/TRIGGER were pulled from authenticated. anon — the actual publishable-key threat — is fully locked to read + the 9 intended inserts.
- **Residual caveat:** `supabase_admin`-owned default ACLs still grant to anon/authenticated on future objects and cannot be altered from the `postgres` role (platform-managed). The `postgres`-owned defaults, which is what migrations use, are now clean.
- **Verified live:** anon intended INSERTs (post_reactions, newsletter_subscribers, poll_votes, calculator_sessions_v2, refund_requests) = true; anon public SELECT (blog_posts, v_related_content) = true; anon `writers` INSERT / `blog_posts` TRUNCATE / `coach_members` UPDATE = false; authenticated `blog_posts` TRUNCATE = false; authenticated `coach_checkins` INSERT = true.

### Critical (Finding 1) — calculator_reports — DB CHANGE STOPPED (deploy-gated); code shipped
- **Why stopped:** the fix requires the two server-side report READ endpoints in `api/calculator-api.js` (`handleReportStatus`, `handleReportContent`) to stop using the anon key. The GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys **only the static GitHub Pages site — it does not run `wrangler deploy`** for the Cloudflare Worker. Dropping the anon read policy before the Worker is redeployed would break every customer's existing report link, and a Cloudflare production deploy is a step I cannot perform or verify here. Per the stop-condition, the database was left **untouched** for this finding (anon SELECT on calculator_reports is still in place, so the live site keeps working).
- **What was shipped (code):** both `calculator_reports?access_token=eq.` reads in `api/calculator-api.js` switched from `SUPABASE_ANON_KEY` to `SUPABASE_SERVICE_ROLE_KEY` (server-side, token-gated; service role bypasses RLS so it survives the policy drop). All other calculator_reports access in that file already used the service role key. The remaining anon-key reads in the file are `payment_tiers` only (intentional public pricing).
- **What is staged (DB):** `supabase/migrations/20260722_PENDING_lock_calculator_reports_anon_read.sql` — **not applied**, clearly marked with the required order.
- **Follow-up to close the Critical (two steps, needs someone who can deploy the Worker):**
  1. `cd api && npx wrangler deploy`, then load one unexpired report via `/api/v1/calculator/report/<token>/content` to confirm it still renders.
  2. Apply the PENDING migration (drops `public_calculator_reports_read`, revokes anon/authenticated SELECT). Confirm `has_table_privilege('anon','public.calculator_reports','SELECT')` = false and report links still load.

### Security advisor — state after this pass
Re-ran `get_advisors(security)` after the two applied migrations. The lint list is **unchanged**, which is expected: the security advisor has no lint for table/column GRANT scope (Findings 2 and 3 are grant-level, not policy-level), and the Critical (Finding 1, the only policy change) was intentionally not applied. Remaining advisor items are all Medium/Low findings that were out of the approved scope: 16 `rls_enabled_no_policy` (Finding 4), 9 `rls_policy_always_true` INSERT (the intended public-insert endpoints, Finding 7), coach + sps `SECURITY DEFINER` execute warns (Findings 5/6), `vector` extension in public (Finding 9).

### Auth leaked-password protection — re-checked, STILL DISABLED
`auth_leaked_password_protection` still reports **disabled** as of this pass (~24h after Brew's 2026-07-21 enable). Either the toggle did not save or the advisor cache is very stale. I did not change Auth config (out of scope, and not doable via SQL). **Action for Brew:** re-open Dashboard > Authentication > Providers > Email/Password and confirm "Prevent use of leaked passwords" is actually on and saved; re-run advisors a day later to confirm the WARN clears.

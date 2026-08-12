-- APPLIED 2026-07-22 ~15:10 PDT (was deploy-gated; gate cleared same day)
-- Deploy sequence actually followed: Brew's first `wrangler deploy` hit the top-level
-- (development) worker; Claude re-deployed with --env production (carnivore-report-api-production,
-- version f1e355a2 -- the env the site actually calls), verified a real unexpired report
-- returned HTTP 200 on /status + /content, applied this migration via MCP apply_migration
-- (name: lock_calculator_reports_anon_read), then re-verified: report link still 200,
-- anon REST dump of calculator_reports now 401 permission-denied, has_table_privilege
-- false for anon and authenticated, old policy gone.
--
-- Original rationale (Critical fix, 2026-07-22 Leo security review, Finding 1):
--
-- calculator_reports is readable by the anon (publishable) key via the policy
-- public_calculator_reports_read (SELECT, USING is_expired=false AND expires_at>now()).
-- Anyone with the public key can GET /rest/v1/calculator_reports?select=email,access_token,report_html
-- and dump every unexpired report's customer email, secret access_token, and paid content.
--
-- The fix is safe ONLY AFTER the Cloudflare Worker in api/calculator-api.js is deployed.
-- That code change (committed 2026-07-22) switches the two server-side report READ
-- endpoints (handleReportStatus, handleReportContent) from the anon key to the
-- service_role key, which bypasses RLS. Until that Worker is live in production, the
-- current (old) Worker still reads calculator_reports with the anon key, so dropping the
-- policy/grant NOW would break every customer's report link.
--
-- GitHub Actions deploys only the static site (GitHub Pages), NOT the Worker, so this is
-- a manual step:
--   1. cd api && npm run deploy:production  # deploy the service-role read change
--      (this line originally read `npx wrangler deploy`, which is what hit the
--      wrong Worker above; the bare script was removed 2026-08-12)
--   2. verify one unexpired report link loads via /api/v1/calculator/report/<token>/content
--   3. THEN apply this migration.
--
-- After applying, confirm report links still work (they now flow through the service-role
-- Worker path) and that anon can no longer read the table:
--   SELECT has_table_privilege('anon','public.calculator_reports','SELECT');  -- expect false

DROP POLICY IF EXISTS public_calculator_reports_read ON public.calculator_reports;
REVOKE SELECT ON public.calculator_reports FROM anon, authenticated;

-- service_role retains full access via the existing service_role_all policy + platform grant.

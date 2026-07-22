-- !!! NOT APPLIED YET -- DEPLOY GATE !!!
-- Critical fix (2026-07-22 Leo security review, Finding 1)
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
--   1. cd api && npx wrangler deploy        # deploy the service-role read change
--   2. verify one unexpired report link loads via /api/v1/calculator/report/<token>/content
--   3. THEN apply this migration.
--
-- After applying, confirm report links still work (they now flow through the service-role
-- Worker path) and that anon can no longer read the table:
--   SELECT has_table_privilege('anon','public.calculator_reports','SELECT');  -- expect false

DROP POLICY IF EXISTS public_calculator_reports_read ON public.calculator_reports;
REVOKE SELECT ON public.calculator_reports FROM anon, authenticated;

-- service_role retains full access via the existing service_role_all policy + platform grant.

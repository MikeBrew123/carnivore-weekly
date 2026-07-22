-- APPLIED 2026-07-22 via Supabase MCP apply_migration.
-- High severity fix (2026-07-22 Leo security review, Finding 3)
-- The publishable anon key held INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on
-- ~60 tables it has no RLS policy for. TRUNCATE is not covered by RLS at all, and the
-- blanket write grants mean any future USING(true) policy typo instantly exposes a table.
--
-- Enumerated anon runtime surface (browser + policies + security_invoker view/function deps):
--   INSERT: calculator_sessions_v2, content_feedback, newsletter_subscribers, poll_votes,
--           post_reactions, recipe_ratings, refund_requests, report_access_log, waitlist
--   SELECT: intentional public content (blog_posts, recipes, topics, polls, views, etc.) -- left intact
--   No anon UPDATE/DELETE policy exists anywhere; the Cloudflare Worker performs all
--   privileged writes with the service_role key.
--
-- Scope note: anon is fully locked to read + the 9 intended inserts. authenticated (real
-- signed-in coach members/admins) keeps its DML because the coach RLS write matrix cannot be
-- verified end-to-end from SQL here; only the never-needed TRUNCATE/REFERENCES/TRIGGER are
-- pulled from authenticated. calculator_reports anon SELECT is intentionally left in place
-- (the live Worker read path still uses it; Finding 1 lockdown is gated on a Worker deploy).

-- 1. Remove all write privileges from anon everywhere
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. Remove only the never-needed, RLS-bypassing privileges from authenticated
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 3. Re-grant INSERT to anon only where an anon/public INSERT policy legitimately exists
GRANT INSERT ON public.calculator_sessions_v2  TO anon;
GRANT INSERT ON public.content_feedback        TO anon;
GRANT INSERT ON public.newsletter_subscribers  TO anon;
GRANT INSERT ON public.poll_votes              TO anon;
GRANT INSERT ON public.post_reactions          TO anon;
GRANT INSERT ON public.recipe_ratings          TO anon;
GRANT INSERT ON public.refund_requests         TO anon;
GRANT INSERT ON public.report_access_log       TO anon;
GRANT INSERT ON public.waitlist                TO anon;

-- 4. Stop the regrowth: future tables/sequences/functions owned by postgres no longer
--    auto-grant to anon/authenticated. (supabase_admin-owned defaults are platform-managed
--    and cannot be altered from this role; documented as a residual caveat.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- APPLIED 2026-07-22 via Supabase MCP apply_migration.
-- High severity fix (2026-07-22 Leo security review, Finding 2)
-- post_reactions public SELECT exposed ip_address, fingerprint, user_agent to anon.
-- The security_invoker view v_post_reaction_counts (used by the site) only needs
-- post_slug + reaction_type, and the browser INSERT uses Prefer: return=minimal
-- (no row read-back). So we keep the reactions_public_read policy (the view depends
-- on it) and instead remove client SELECT access to the PII columns via column grants.

REVOKE SELECT ON public.post_reactions FROM anon, authenticated;
GRANT SELECT (id, post_slug, reaction_type, reacted_at) ON public.post_reactions TO anon, authenticated;

-- INSERT privilege is unchanged so the reactions widget keeps working.

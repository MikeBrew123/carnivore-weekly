-- Gift codes for the "gift a report" product (sites cw, kd, pd). Designed 2026-10-11 by Leo.
-- NOT YET APPLIED. Main session applies via the Supabase MCP (project kwtdpvnjewtahuxjyltn).
--
-- Write path:  Cloudflare worker Stripe webhook (service role, PostgREST) inserts one row
--              per Stripe checkout session. Retries are absorbed by UNIQUE(stripe_session_id):
--              POST /gift_codes?on_conflict=stripe_session_id
--              Prefer: resolution=ignore-duplicates,return=representation
--              (an ignored duplicate returns [], so the worker then GETs by stripe_session_id).
-- Redeem path: PATCH /gift_codes?code=eq.X&site=eq.Y&status=eq.active
--              Prefer: return=representation
--              body {status:'redeemed', redeemed_at, redeemed_email}
--              A 200 with [] means invalid, wrong site, already redeemed or void.
--
-- Concurrency proof for the redeem PATCH (READ COMMITTED, PostgREST default):
--   1. UPDATE takes a ROW EXCLUSIVE table lock and a FOR UPDATE row lock on the match.
--   2. A concurrent second UPDATE on the same row blocks on that row lock.
--   3. When the first commits, the second re-fetches the newest row version and
--      re-evaluates the WHERE clause against it (EvalPlanQual). status is now
--      'redeemed', so status = 'active' is false and it updates zero rows.
--   4. If the first rolls back, the second proceeds on the original version.
--   Exactly one caller ever receives the row. No advisory lock or SERIALIZABLE needed.
--
-- Payment-source marking on the report rows needs NO schema change:
--   cw_assessment_sessions.stripe_payment_intent_id (varchar 255, nullable, unconstrained)
--   and calculator_sessions_v2.stripe_payment_intent_id can carry 'gift_<CODE>',
--   mirroring the existing 'free_coupon_<code>' marker on calculator_sessions_v2.

BEGIN;

CREATE TABLE IF NOT EXISTS public.gift_codes (
    id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    site                  text        NOT NULL,
    code                  text        NOT NULL,
    card_token            text        NOT NULL,
    stripe_session_id     text        NOT NULL,
    stripe_payment_intent text,
    amount_cents          integer,
    currency              text,
    buyer_email           text        NOT NULL,
    buyer_name            text,
    recipient_name        text,
    note                  text,
    status                text        NOT NULL DEFAULT 'active',
    created_at            timestamptz NOT NULL DEFAULT now(),
    email_sent_at         timestamptz,
    redeemed_at           timestamptz,
    redeemed_email        text,
    redeemed_session_id   text,
    void_reason           text,
    report_ref            text,   -- KD: public report-link reference (kg_...), never the session_token
    redeemed_items        text,   -- KD: comma list actually granted at redemption (offer-filtered)

    CONSTRAINT gift_codes_code_key              UNIQUE (code),
    CONSTRAINT gift_codes_card_token_key        UNIQUE (card_token),
    CONSTRAINT gift_codes_stripe_session_id_key UNIQUE (stripe_session_id),
    CONSTRAINT gift_codes_report_ref_key        UNIQUE (report_ref),

    CONSTRAINT gift_codes_site_check   CHECK (site IN ('cw', 'kd', 'pd')),
    CONSTRAINT gift_codes_status_check CHECK (status IN ('active', 'redeemed', 'void')),
    -- Stored uppercase, shape PREFIX-BODY (e.g. CW-ABCD2345).
    CONSTRAINT gift_codes_code_format  CHECK (code = upper(code) AND code ~ '^[A-Z0-9]+-[A-Z0-9]+$'),
    -- A guessable card URL leaks the code; demand real entropy.
    CONSTRAINT gift_codes_card_token_len CHECK (char_length(card_token) >= 16),
    CONSTRAINT gift_codes_note_len           CHECK (note IS NULL OR char_length(note) <= 280),
    CONSTRAINT gift_codes_recipient_name_len CHECK (recipient_name IS NULL OR char_length(recipient_name) <= 60),
    CONSTRAINT gift_codes_amount_nonneg      CHECK (amount_cents IS NULL OR amount_cents >= 0),
    CONSTRAINT gift_codes_currency_iso       CHECK (currency IS NULL OR char_length(currency) = 3),
    CONSTRAINT gift_codes_buyer_email_nonblank CHECK (char_length(btrim(buyer_email)) > 0),
    CONSTRAINT gift_codes_redeemed_has_timestamp CHECK (status <> 'redeemed' OR redeemed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_gift_codes_site_status ON public.gift_codes (site, status);

COMMENT ON TABLE public.gift_codes IS
    'Gift-a-report codes (cw/kd/pd). One row per Stripe checkout session. Service role only.';
COMMENT ON COLUMN public.gift_codes.redeemed_session_id IS
    'Assessment/session id created at redemption (cw_assessment_sessions.id or equivalent).';

-- ===== SECURITY: service role only =====
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
-- Deliberately no policies: anon and authenticated see nothing even if a grant reappears.
REVOKE ALL ON TABLE public.gift_codes FROM PUBLIC, anon, authenticated;
GRANT  ALL ON TABLE public.gift_codes TO service_role;

-- ===== OPTIONAL RPC: same atomic single-use guard as the PATCH =====
-- POST /rest/v1/rpc/claim_gift_code {p_code, p_site, p_email}; [] means not claimable.
CREATE OR REPLACE FUNCTION public.claim_gift_code(p_code text, p_site text, p_email text)
RETURNS SETOF public.gift_codes
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.gift_codes
       SET status         = 'redeemed',
           redeemed_at    = now(),
           redeemed_email = lower(btrim(p_email))
     WHERE code   = upper(btrim(p_code))
       AND site   = p_site
       AND status = 'active'
    RETURNING *;
$$;

-- Supabase default privileges grant EXECUTE on new public functions to anon and
-- authenticated; revoke explicitly, not just from PUBLIC.
REVOKE ALL     ON FUNCTION public.claim_gift_code(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_gift_code(text, text, text) TO service_role;

COMMIT;

-- ===== VERIFY (read-only, run after apply) =====
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.gift_codes'::regclass;              -- t
-- SELECT count(*) FROM pg_policies WHERE tablename = 'gift_codes';                            -- 0
-- SELECT has_table_privilege('anon', 'public.gift_codes', 'SELECT');                          -- f
-- SELECT has_function_privilege('anon', 'public.claim_gift_code(text,text,text)', 'EXECUTE'); -- f

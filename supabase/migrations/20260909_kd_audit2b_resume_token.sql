-- 20260909_kd_audit2b_resume_token.sql
--
-- Audit 2B (KetoDial): a dedicated credential for resuming a free calculator
-- session from the free-results email.
--
-- WHY THIS EXISTS. The first version of the email resume put the row's own
-- `session_token` into the clickable URL, in the fragment, with a code comment
-- claiming a fragment "is never sent to a server and never reaches analytics".
-- That guarantee was false twice over:
--
--   * Google Analytics `gtag('config', ...)` and the Pinterest tag both run in
--     <head>, and GA4's automatic page_view sends `page_location` including the
--     fragment. Both had already fired before ketodial.js could scrub it.
--   * Delivered KetoDial email is rewritten through click tracking. A previous
--     real send turned a `#calc` target into a tracking URL carrying `%23calc`
--     inside the redirect, so a fragment does not survive as a fragment once a
--     provider rewrites the link.
--
-- `session_token` is a WRITE credential: it PATCHes the intake row that the
-- Doctor's Report is generated from. It must never appear in a URL.
--
-- WHAT THIS COLUMN IS. An opaque, random, single-purpose reference that appears
-- in the emailed link INSTEAD. It is read-only on its own: the only thing that
-- accepts it is POST /resume, which returns a bounded projection of the row and
-- the session token in the RESPONSE BODY, where no click tracker, analytics tag
-- or Referer header can see it. It is not accepted by PATCH /session, so it
-- cannot be substituted for the ordinary write credential, and the tokens carry
-- distinct prefixes (kdr_ vs kd_) so a mix-up is visible rather than silent.
--
-- It grants no report access and no payment entitlement; /report and /purchase
-- are keyed on the Stripe session and unaffected by this column.
--
-- IDEMPOTENT AND NON-DESTRUCTIVE:
--   * IF NOT EXISTS on both columns
--   * the unique index is created only when absent
--   * NO backfill. A historical row has no resume token because no email ever
--     carried one, and inventing values would create credentials nobody issued.
--   * nothing is dropped, renamed or re-typed.
ALTER TABLE public.calculator_sessions_v2
  ADD COLUMN IF NOT EXISTS resume_token text;

ALTER TABLE public.calculator_sessions_v2
  ADD COLUMN IF NOT EXISTS resume_token_expires_at timestamptz;

-- Uniqueness is the lookup contract: POST /resume resolves a token to exactly one
-- session or to nothing. A partial index keeps the historical NULLs out of it.
CREATE UNIQUE INDEX IF NOT EXISTS calculator_sessions_v2_resume_token_key
  ON public.calculator_sessions_v2 (resume_token)
  WHERE resume_token IS NOT NULL;

COMMENT ON COLUMN public.calculator_sessions_v2.resume_token IS
  'Audit 2B: opaque single-purpose reference (kdr_...) carried in the free-results email link so the write-capable session_token never appears in a URL. Accepted only by POST /resume; never by PATCH /session. NULL on every row predating 2026-09-09.';

COMMENT ON COLUMN public.calculator_sessions_v2.resume_token_expires_at IS
  'Audit 2B: when the resume_token stops working. Set 30 days out at mint time. A token captured from click-tracking or analytics logs dies with it; readers must treat NULL or a past timestamp as unusable rather than as no expiry.';

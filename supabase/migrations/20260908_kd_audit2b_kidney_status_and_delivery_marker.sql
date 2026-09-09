-- 20260908_kd_audit2b_kidney_status_and_delivery_marker.sql
--
-- Audit 2B (KetoDial): the two columns the authoritative-intake work depends on.
--
-- Both were applied to production on 2026-09-08 via the Supabase MCP before this
-- file existed. That was the wrong order — production held schema the repository
-- could not reproduce — and this migration closes that gap. It is written to be a
-- no-op against the already-migrated production database and to build the same
-- schema from scratch on a fresh one.
--
-- IDEMPOTENT AND NON-DESTRUCTIVE, deliberately:
--   * IF NOT EXISTS on both columns
--   * the CHECK constraint is added only when absent, so re-running cannot fail and
--     cannot silently replace a constraint someone has since tightened
--   * NO backfill. `kidney_status` is a health answer; a default of 'no' would be a
--     safety answer nobody gave, and the worker refuses NULL rather than assuming.
--     `reports_delivered_at` is left NULL on historical rows because whether those
--     customers received anything is genuinely unknown.
--   * nothing is dropped, renamed, or re-typed.
--
-- ---------------------------------------------------------------------------
-- kidney_status — the early renal safety gate
-- ---------------------------------------------------------------------------
-- Asked once on step 1, BEFORE the free protein result, because protein needs change
-- with kidney function and that number is the first thing the page shows. It decides
-- both what we display and which products we are allowed to sell.
--
-- A dedicated column on purpose. The shortcut was to write the slug 'kidney' into the
-- existing `conditions` array, which the worker already reads as renal — but that
-- would make the Doctor's Report state "Kidney disease / CKD" as a REPORTED condition
-- for someone who answered "I'm not sure". Suppression must not become diagnosis.
--
-- NULL means the question was never asked (every session predating 2026-09-08).
-- ketodial/worker/intake.js treats NULL as unusable and fails closed; it never
-- defaults to 'no'.
ALTER TABLE public.calculator_sessions_v2
  ADD COLUMN IF NOT EXISTS kidney_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'calculator_sessions_v2'
      AND c.conname = 'calculator_sessions_v2_kidney_status_check'
  ) THEN
    ALTER TABLE public.calculator_sessions_v2
      ADD CONSTRAINT calculator_sessions_v2_kidney_status_check
      CHECK (kidney_status IS NULL OR kidney_status IN ('no', 'yes', 'unsure'));
  END IF;
END
$$;

-- KNOWN COSMETIC DIVERGENCE: production carries this constraint as
--   CHECK (kidney_status = ANY (ARRAY['no','yes','unsure']))
-- from the 2026-09-08 MCP application, i.e. without the explicit `IS NULL OR`.
-- The two are semantically identical — a CHECK passes when its expression is NULL,
-- and NULL rows are accepted on production today (verified) — so this migration does
-- NOT drop and recreate the live constraint for a cosmetic match. A fresh database
-- gets the explicit form, which is the clearer statement of intent.

COMMENT ON COLUMN public.calculator_sessions_v2.kidney_status IS
  'Audit 2B early renal safety gate: no | yes | unsure. Asked before the free protein result. NULL = never asked (pre-2026-09-08 sessions); readers must fail closed, never default to no.';

-- ---------------------------------------------------------------------------
-- reports_delivered_at — when the paid reports were actually emailed
-- ---------------------------------------------------------------------------
-- Separating purchase eligibility from report eligibility let a customer pay before
-- completing the optional health profile. Delivery then moves to whenever they finish
-- it, which created a state the product never had: PAID BUT NOT DELIVERED, recorded
-- nowhere.
--
-- This column makes that state queryable and makes late delivery idempotent at the
-- application level:
--
--   SELECT session_token, email, paid_at
--   FROM calculator_sessions_v2
--   WHERE source = 'ketodial'
--     AND payment_status = 'completed'
--     AND reports_delivered_at IS NULL;
--
-- THE source FILTER IS NOT OPTIONAL. calculator_sessions_v2 is shared with Carnivore
-- Weekly, whose worker never writes this column, so every historical CW purchase has
-- it NULL. Without the filter the query returned 6 CW rows dating back to 2026-07-05
-- — six customers nobody owes anything, presented as stuck fulfilments. Measured on
-- 2026-09-08.
--
-- NOTE the vocabulary: 'completed', not Stripe's 'paid'. calculator_sessions_v2 is
-- shared with Carnivore Weekly and its payment_status CHECK allows
-- pending|completed|failed|refunded. The KetoDial webhook wrote Stripe's 'paid'
-- straight through, PostgREST rejected the entire PATCH on that constraint, and the
-- amount, payment intent and timestamps were lost with it. Fixed in the worker on
-- 2026-09-08; the constraint was deliberately NOT widened to accommodate Stripe.
--
-- It is only ever written after Resend has accepted the message. A marker that lies
-- optimistically is worse than none: it hides the customer from the query above.
ALTER TABLE public.calculator_sessions_v2
  ADD COLUMN IF NOT EXISTS reports_delivered_at timestamptz;

COMMENT ON COLUMN public.calculator_sessions_v2.reports_delivered_at IS
  'Audit 2B: when paid reports were emailed, written only after Resend accepted the send. NULL on a paid row = not delivered yet (profile likely incomplete). Used for idempotent late delivery and to find stuck fulfilments.';

-- Finding the customers we owe should not be a sequential scan once this grows.
-- The predicate matches the query above, source filter included: a partial index
-- whose predicate is broader than the query still works, but one that omits a
-- column the query filters on cannot be used for that filter.
DROP INDEX IF EXISTS public.calculator_sessions_v2_paid_undelivered_idx;
CREATE INDEX IF NOT EXISTS calculator_sessions_v2_kd_paid_undelivered_idx
  ON public.calculator_sessions_v2 (paid_at)
  WHERE source = 'ketodial'
    AND payment_status = 'completed'
    AND reports_delivered_at IS NULL;

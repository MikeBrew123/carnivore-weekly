-- Migration: Refund request tracking
-- Purpose: Let calculator report buyers request a refund + tell us why, so we can
-- see if requests cluster around a fixable issue instead of just refunding blind.

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  product TEXT NOT NULL DEFAULT 'calculator_report',
  reason_category TEXT NOT NULL CHECK (reason_category IN (
    'not_as_described', 'technical_issue', 'no_longer_needed', 'duplicate_charge', 'other'
  )),
  reason_text TEXT NOT NULL CHECK (char_length(reason_text) >= 10 AND char_length(reason_text) <= 1000),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'denied', 'completed')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,

  fingerprint TEXT,
  ip_address INET,

  overall_rating SMALLINT CHECK (overall_rating BETWEEN 1 AND 5),
  meal_plan_feedback TEXT CHECK (meal_plan_feedback IN ('helpful', 'not_helpful', 'didnt_use')),
  doctor_script_feedback TEXT CHECK (doctor_script_feedback IN ('helpful', 'not_helpful', 'didnt_use')),
  adaptation_guide_feedback TEXT CHECK (adaptation_guide_feedback IN ('helpful', 'not_helpful', 'didnt_use')),
  technical_notes TEXT,
  additional_notes TEXT,

  CONSTRAINT email_format_refund CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);
CREATE INDEX idx_refund_requests_submitted ON public.refund_requests(submitted_at DESC);
CREATE INDEX idx_refund_requests_email ON public.refund_requests(email);

COMMENT ON TABLE public.refund_requests IS 'Buyer refund requests from the site footer form, with reason for pattern-spotting';
COMMENT ON COLUMN public.refund_requests.reason_category IS 'Bucketed reason for quick pattern-spotting across requests';

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY refund_requests_public_insert ON public.refund_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY refund_requests_service_all ON public.refund_requests
  FOR ALL USING (auth.role() = 'service_role');

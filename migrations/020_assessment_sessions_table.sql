-- Migration 020: Assessment Sessions Table
-- Date: 2026-01-04
-- Author: ALEX (Senior Infrastructure Architect)
-- Purpose: Store assessment form submissions and payment status
-- Philosophy: "Keep it simple. One table, clear schema, proper constraints."
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE: cw_assessment_sessions =====
-- Purpose: Track user assessment submissions and Stripe checkout sessions
-- Fields: email, form_data (JSONB), payment_status, stripe_session_id
-- Use case: Assessment wizard form data + payment processing
CREATE TABLE IF NOT EXISTS public.cw_assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,

    -- Assessment form data (entire form as JSONB)
    form_data JSONB NOT NULL,

    -- Payment status tracking
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT form_data_is_object CHECK (jsonb_typeof(form_data) = 'object'),
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT first_name_not_empty CHECK (length(trim(first_name)) > 0)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_email
    ON public.cw_assessment_sessions(email);

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_payment_status
    ON public.cw_assessment_sessions(payment_status);

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_stripe_session_id
    ON public.cw_assessment_sessions(stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_created_at
    ON public.cw_assessment_sessions(created_at DESC);

-- ===== AUDIT TRIGGER =====
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_cw_assessment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cw_assessment_sessions_updated_at
    ON public.cw_assessment_sessions;

CREATE TRIGGER trigger_cw_assessment_sessions_updated_at
BEFORE UPDATE ON public.cw_assessment_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_cw_assessment_sessions_updated_at();

-- ===== COMMENTS =====
COMMENT ON TABLE public.cw_assessment_sessions IS
    'Stores assessment form submissions and payment status tracking';

COMMENT ON COLUMN public.cw_assessment_sessions.form_data IS
    'Complete assessment form as JSONB object - includes all steps';

COMMENT ON COLUMN public.cw_assessment_sessions.payment_status IS
    'Payment status: pending, completed, failed, or refunded';

COMMENT ON COLUMN public.cw_assessment_sessions.stripe_session_id IS
    'Stripe checkout session ID - set after checkout session creation';

-- ===== SEED DATA (Optional: Remove if not needed) =====
-- INSERT INTO public.cw_assessment_sessions (email, first_name, form_data, payment_status)
-- VALUES (
--     'test@example.com',
--     'Test',
--     '{"age": 30, "sex": "male", "weight": 180, "height_feet": 6, "height_inches": 0}'::jsonb,
--     'pending'
-- ) ON CONFLICT (id) DO NOTHING;

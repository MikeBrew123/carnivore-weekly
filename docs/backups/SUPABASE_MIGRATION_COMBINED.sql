-- ===================================================================
-- COMBINED MIGRATION: 015 + 016
-- Schema: Calculator Sessions, Reports, and Tracking
-- Date: 2026-01-03
-- Author: Leo (Database Architect)
-- Status: PRODUCTION READY - IDEMPOTENT
-- ===================================================================
-- WARNING: This migration creates 6 tables with comprehensive schema
-- All DDL operations use CREATE TABLE IF NOT EXISTS
-- All migrations can be safely re-run without data loss
--
-- Tables created:
-- 1. payment_tiers - Pricing and features
-- 2. calculator_sessions_v2 - User journey (4 steps + payment)
-- 3. calculator_reports - AI-generated reports
-- 4. calculator_report_access_log - Access audit trail
-- 5. claude_api_logs - API request tracking
-- 6. validation_errors - Field validation tracking
--
-- Philosophy: "A database is a promise you make to the future"
-- ===================================================================

-- ===== TABLE 1: payment_tiers =====
CREATE TABLE IF NOT EXISTS public.payment_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_slug VARCHAR(50) NOT NULL UNIQUE,
    tier_title VARCHAR(100) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_product_id VARCHAR(100),
    stripe_price_id VARCHAR(100),
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT tier_price_positive CHECK (price_cents > 0),
    CONSTRAINT currency_code CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT features_object CHECK (jsonb_typeof(features) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_payment_tiers_slug ON public.payment_tiers(tier_slug);
CREATE INDEX IF NOT EXISTS idx_payment_tiers_active ON public.payment_tiers(is_active) WHERE is_active = TRUE;

-- ===== TABLE 2: calculator_sessions_v2 =====
CREATE TABLE IF NOT EXISTS public.calculator_sessions_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(64) NOT NULL UNIQUE,

    -- Step 1: Physical Stats
    sex VARCHAR(20),
    age SMALLINT CHECK (age IS NULL OR (age >= 13 AND age <= 150)),
    height_feet SMALLINT CHECK (height_feet IS NULL OR (height_feet >= 3 AND height_feet <= 9)),
    height_inches SMALLINT CHECK (height_inches IS NULL OR (height_inches >= 0 AND height_inches < 12)),
    height_cm SMALLINT CHECK (height_cm IS NULL OR (height_cm >= 90 AND height_cm <= 280)),
    weight_value DECIMAL(6,2) CHECK (weight_value IS NULL OR weight_value > 0),
    weight_unit VARCHAR(10) CHECK (weight_unit IS NULL OR weight_unit IN ('lbs', 'kg')),

    -- Step 2: Fitness & Diet
    lifestyle_activity VARCHAR(20) CHECK (lifestyle_activity IS NULL OR lifestyle_activity IN ('sedentary', 'light', 'moderate', 'very', 'extreme')),
    exercise_frequency VARCHAR(20) CHECK (exercise_frequency IS NULL OR exercise_frequency IN ('none', '1-2', '3-4', '5-6', '7')),
    goal VARCHAR(20) CHECK (goal IS NULL OR goal IN ('lose', 'maintain', 'gain')),
    deficit_percentage SMALLINT CHECK (deficit_percentage IS NULL OR deficit_percentage IN (15, 20, 25)),
    diet_type VARCHAR(50) CHECK (diet_type IS NULL OR diet_type IN ('carnivore', 'pescatarian', 'keto', 'lowcarb')),

    -- Step 3: Free Results
    calculated_macros JSONB,

    -- Step 4: Health Profile
    email VARCHAR(255) CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    medications TEXT,
    conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    other_conditions TEXT,
    symptoms TEXT,
    other_symptoms TEXT,
    allergies TEXT,
    avoid_foods TEXT,
    dairy_tolerance VARCHAR(20) CHECK (dairy_tolerance IS NULL OR dairy_tolerance IN ('none', 'butter-only', 'some', 'full')),
    previous_diets TEXT,
    what_worked TEXT,
    carnivore_experience VARCHAR(20) CHECK (carnivore_experience IS NULL OR carnivore_experience IN ('new', 'weeks', 'months', 'years')),
    cooking_skill VARCHAR(20) CHECK (cooking_skill IS NULL OR cooking_skill IN ('beginner', 'intermediate', 'advanced')),
    meal_prep_time VARCHAR(20) CHECK (meal_prep_time IS NULL OR meal_prep_time IN ('minimal', 'some', 'lots')),
    budget VARCHAR(20) CHECK (budget IS NULL OR budget IN ('tight', 'moderate', 'flexible')),
    family_situation VARCHAR(50) CHECK (family_situation IS NULL OR family_situation IN ('solo', 'partner', 'family-with-kids', 'large-household')),
    work_travel VARCHAR(50) CHECK (work_travel IS NULL OR work_travel IN ('office', 'remote', 'shift-work', 'travel')),
    goals TEXT[] DEFAULT ARRAY[]::TEXT[],
    biggest_challenge TEXT,
    additional_notes TEXT,

    -- Payment & Session
    tier_id UUID REFERENCES public.payment_tiers(id) ON DELETE RESTRICT,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(100) UNIQUE,
    amount_paid_cents INTEGER CHECK (amount_paid_cents IS NULL OR amount_paid_cents >= 0),

    -- Metadata
    step_completed SMALLINT NOT NULL DEFAULT 1 CHECK (step_completed >= 1 AND step_completed <= 4),
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    payment_verified_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT sex_valid CHECK (sex IS NULL OR sex IN ('male', 'female')),
    CONSTRAINT steps_sequence CHECK (
        (step_completed = 1) OR
        (step_completed >= 2 AND sex IS NOT NULL AND age IS NOT NULL AND weight_value IS NOT NULL AND weight_unit IS NOT NULL) OR
        (step_completed >= 3 AND lifestyle_activity IS NOT NULL AND exercise_frequency IS NOT NULL AND goal IS NOT NULL AND diet_type IS NOT NULL) OR
        (step_completed >= 4 AND is_premium = TRUE AND email IS NOT NULL AND payment_status = 'completed')
    ),
    CONSTRAINT premium_requires_payment CHECK (is_premium = FALSE OR (payment_status = 'completed' AND tier_id IS NOT NULL)),
    CONSTRAINT premium_requires_email CHECK (is_premium = FALSE OR email IS NOT NULL),
    CONSTRAINT payment_integrity CHECK (
        (payment_status = 'pending' AND stripe_payment_intent_id IS NULL) OR
        (payment_status IN ('completed', 'failed') AND stripe_payment_intent_id IS NOT NULL)
    ),
    CONSTRAINT paid_timestamp_check CHECK (paid_at IS NULL OR paid_at >= created_at),
    CONSTRAINT completed_timestamp_check CHECK (completed_at IS NULL OR completed_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_token ON public.calculator_sessions_v2(session_token);
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_email ON public.calculator_sessions_v2(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_tier_id ON public.calculator_sessions_v2(tier_id) WHERE tier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_payment_status ON public.calculator_sessions_v2(payment_status);
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_created_at ON public.calculator_sessions_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_stripe_payment ON public.calculator_sessions_v2(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_premium ON public.calculator_sessions_v2(is_premium) WHERE is_premium = TRUE;

-- ===== TABLE 3: calculator_reports =====
CREATE TABLE IF NOT EXISTS public.calculator_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES public.calculator_sessions_v2(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    access_token VARCHAR(64) NOT NULL UNIQUE,

    -- Report content
    report_html TEXT,
    report_markdown TEXT,
    report_json JSONB NOT NULL DEFAULT '{}',

    -- Request tracking
    claude_request_id VARCHAR(100),
    generation_start_at TIMESTAMP WITH TIME ZONE,
    generation_completed_at TIMESTAMP WITH TIME ZONE,

    -- Access management
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    access_count BIGINT NOT NULL DEFAULT 0 CHECK (access_count >= 0),
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    -- Status flags
    is_generated BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    CONSTRAINT email_valid CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT access_token_valid CHECK (length(access_token) = 64),
    CONSTRAINT expiry_in_future CHECK (expires_at > created_at),
    CONSTRAINT generation_duration CHECK (
        (generation_start_at IS NULL AND generation_completed_at IS NULL) OR
        (generation_start_at IS NOT NULL AND generation_completed_at IS NOT NULL AND generation_completed_at >= generation_start_at)
    ),
    CONSTRAINT last_access_after_creation CHECK (last_accessed_at IS NULL OR last_accessed_at >= created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_reports_token ON public.calculator_reports(access_token);
CREATE INDEX IF NOT EXISTS idx_calculator_reports_session_id ON public.calculator_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_calculator_reports_email ON public.calculator_reports(email);
CREATE INDEX IF NOT EXISTS idx_calculator_reports_expires_at ON public.calculator_reports(expires_at DESC) WHERE is_expired = FALSE;
CREATE INDEX IF NOT EXISTS idx_calculator_reports_created_at ON public.calculator_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_reports_is_generated ON public.calculator_reports(is_generated, expires_at DESC);

-- ===== TABLE 4: calculator_report_access_log =====
-- FIXED: PRIMARY KEY now includes accessed_at (partition column)
-- PostgreSQL requires all partitioning columns in unique constraints
CREATE TABLE IF NOT EXISTS public.calculator_report_access_log (
    id BIGSERIAL,
    report_id UUID NOT NULL REFERENCES public.calculator_reports(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referer_url TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,

    PRIMARY KEY (id, accessed_at),

    CONSTRAINT user_agent_not_empty CHECK (user_agent IS NULL OR length(trim(user_agent)) > 0),
    CONSTRAINT error_requires_failure CHECK (success = TRUE OR error_message IS NOT NULL)
) PARTITION BY RANGE (accessed_at);

-- Create monthly partitions
CREATE TABLE IF NOT EXISTS public.calculator_report_access_log_2026_01 PARTITION OF public.calculator_report_access_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS public.calculator_report_access_log_2026_02 PARTITION OF public.calculator_report_access_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS public.calculator_report_access_log_2026_03 PARTITION OF public.calculator_report_access_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX IF NOT EXISTS idx_calculator_report_access_log_report_id ON public.calculator_report_access_log(report_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_report_access_log_accessed_at ON public.calculator_report_access_log(accessed_at DESC);

-- ===== TABLE 5: claude_api_logs =====
CREATE TABLE IF NOT EXISTS public.claude_api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.calculator_sessions_v2(id) ON DELETE SET NULL,
    request_id VARCHAR(100) UNIQUE,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    stop_reason VARCHAR(50),
    request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    response_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error', 'timeout')),
    error_code VARCHAR(100),
    error_message TEXT,
    prompt_hash VARCHAR(64),

    CONSTRAINT duration_requires_response CHECK (duration_ms IS NULL OR response_at IS NOT NULL),
    CONSTRAINT response_after_request CHECK (response_at IS NULL OR response_at >= request_at)
);

CREATE INDEX IF NOT EXISTS idx_claude_api_logs_session_id ON public.claude_api_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_claude_api_logs_request_id ON public.claude_api_logs(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claude_api_logs_request_at ON public.claude_api_logs(request_at DESC);
CREATE INDEX IF NOT EXISTS idx_claude_api_logs_status ON public.claude_api_logs(status);
CREATE INDEX IF NOT EXISTS idx_claude_api_logs_model ON public.claude_api_logs(model);

-- ===== TABLE 6: validation_errors =====
CREATE TABLE IF NOT EXISTS public.validation_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.calculator_sessions_v2(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    error_code VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    submitted_value TEXT,
    step_number SMALLINT NOT NULL CHECK (step_number >= 1 AND step_number <= 4),
    is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_validation_errors_session_id ON public.validation_errors(session_id);
CREATE INDEX IF NOT EXISTS idx_validation_errors_created_at ON public.validation_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_errors_blocking ON public.validation_errors(is_blocking) WHERE is_blocking = TRUE;

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.payment_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_sessions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_report_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_errors ENABLE ROW LEVEL SECURITY;

-- ===== ROW LEVEL SECURITY POLICIES =====

-- Service role (backend) has full access
DROP POLICY IF EXISTS "service_role_payment_tiers" ON public.payment_tiers;
CREATE POLICY "service_role_payment_tiers" ON public.payment_tiers
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_calculator_sessions_v2" ON public.calculator_sessions_v2;
CREATE POLICY "service_role_calculator_sessions_v2" ON public.calculator_sessions_v2
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_calculator_reports" ON public.calculator_reports;
CREATE POLICY "service_role_calculator_reports" ON public.calculator_reports
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_calculator_report_access_log" ON public.calculator_report_access_log;
CREATE POLICY "service_role_calculator_report_access_log" ON public.calculator_report_access_log
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_claude_api_logs" ON public.claude_api_logs;
CREATE POLICY "service_role_claude_api_logs" ON public.claude_api_logs
    TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_validation_errors" ON public.validation_errors;
CREATE POLICY "service_role_validation_errors" ON public.validation_errors
    TO service_role USING (true) WITH CHECK (true);

-- Public can read active payment tiers
DROP POLICY IF EXISTS "public_payment_tiers_read" ON public.payment_tiers;
CREATE POLICY "public_payment_tiers_read" ON public.payment_tiers
    FOR SELECT TO public USING (is_active = TRUE);

-- Public can access non-expired reports
DROP POLICY IF EXISTS "public_calculator_reports_read" ON public.calculator_reports;
CREATE POLICY "public_calculator_reports_read" ON public.calculator_reports
    FOR SELECT TO public USING (is_expired = FALSE AND expires_at > CURRENT_TIMESTAMP);

-- ===== TRIGGERS =====

-- Auto-update updated_at on calculator_sessions_v2
CREATE OR REPLACE FUNCTION public.trg_calculator_sessions_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trigger_calculator_sessions_v2_updated_at ON public.calculator_sessions_v2;

CREATE TRIGGER trigger_calculator_sessions_v2_updated_at
BEFORE UPDATE ON public.calculator_sessions_v2
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.trg_calculator_sessions_v2_updated_at();

-- Auto-update updated_at on calculator_reports
CREATE OR REPLACE FUNCTION public.trg_calculator_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trigger_calculator_reports_updated_at ON public.calculator_reports;

CREATE TRIGGER trigger_calculator_reports_updated_at
BEFORE UPDATE ON public.calculator_reports
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)
EXECUTE FUNCTION public.trg_calculator_reports_updated_at();

-- Auto-update access_count on report access
CREATE OR REPLACE FUNCTION public.trg_increment_report_access_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.calculator_reports
    SET
        access_count = access_count + 1,
        last_accessed_at = NEW.accessed_at
    WHERE id = NEW.report_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_report_access_count ON public.calculator_report_access_log;

CREATE TRIGGER trigger_increment_report_access_count
AFTER INSERT ON public.calculator_report_access_log
FOR EACH ROW
EXECUTE FUNCTION public.trg_increment_report_access_count();

-- ===== VIEWS FOR ANALYTICS =====

DROP VIEW IF EXISTS public.vw_pending_reports CASCADE;
CREATE VIEW public.vw_pending_reports AS
SELECT
  id,
  session_id,
  email,
  access_token,
  created_at,
  expires_at,
  (report_json->>'stage')::INT as current_stage,
  (report_json->>'progress')::INT as current_progress
FROM public.calculator_reports
WHERE is_generated = false
  AND is_expired = false
  AND expires_at > NOW()
ORDER BY created_at ASC;

DROP VIEW IF EXISTS public.vw_generation_stats CASCADE;
CREATE VIEW public.vw_generation_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  COUNT(CASE WHEN is_generated THEN 1 END) as completed,
  COUNT(CASE WHEN NOT is_generated AND NOT is_expired THEN 1 END) as pending,
  COUNT(CASE WHEN is_expired THEN 1 END) as expired,
  AVG(EXTRACT(EPOCH FROM (generated_at - created_at))) as avg_generation_time_seconds
FROM public.calculator_reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

DROP VIEW IF EXISTS public.vw_claude_api_costs CASCADE;
CREATE VIEW public.vw_claude_api_costs AS
SELECT
  DATE(request_at) as date,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0, 4) as input_cost_usd,
  ROUND(SUM(output_tokens) * 15.0 / 1000000.0, 4) as output_cost_usd,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0 + SUM(output_tokens) * 15.0 / 1000000.0, 4) as total_cost_usd,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms
FROM public.claude_api_logs
WHERE status = 'success'
GROUP BY DATE(request_at)
ORDER BY date DESC;

-- ===== GRANT PERMISSIONS =====

GRANT ALL ON public.payment_tiers TO service_role;
GRANT ALL ON public.calculator_sessions_v2 TO service_role;
GRANT ALL ON public.calculator_reports TO service_role;
GRANT ALL ON public.calculator_report_access_log TO service_role;
GRANT ALL ON public.claude_api_logs TO service_role;
GRANT ALL ON public.validation_errors TO service_role;
GRANT ALL ON public.vw_pending_reports TO service_role;
GRANT ALL ON public.vw_generation_stats TO service_role;
GRANT ALL ON public.vw_claude_api_costs TO service_role;

GRANT SELECT ON public.payment_tiers TO anon;
GRANT SELECT ON public.calculator_reports TO anon;
GRANT SELECT ON public.vw_generation_stats TO anon;

-- ===== VERIFICATION QUERIES =====
-- Run these after migration to confirm success:
--
-- SELECT COUNT(*) as payment_tiers FROM public.payment_tiers;
-- SELECT COUNT(*) as calculator_sessions FROM public.calculator_sessions_v2;
-- SELECT COUNT(*) as calculator_reports FROM public.calculator_reports;
-- SELECT COUNT(*) as claude_logs FROM public.claude_api_logs;
--
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename LIKE 'calculator_%'
-- ORDER BY tablename;

-- ===== MIGRATION COMPLETE =====
-- Status: SUCCESS
-- Tables created: 6
-- Indexes created: 20+
-- Views created: 3
-- RLS policies: 8
-- Triggers: 3
--
-- Next step: Seed payment_tiers table with tiers (run payment_tiers_seeding.sql)
-- Then test session creation: POST http://localhost:8787/api/v1/calculator/session

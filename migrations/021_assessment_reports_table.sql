-- Migration 021: Assessment Reports Table
-- Date: 2026-01-04
-- Author: LEO (Database Architect)
-- Purpose: Store generated assessment reports with access tokens and expiration
-- Philosophy: "A database is a promise you make to the future. Don't break it."
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE: assessment_reports =====
-- Purpose: Store assessment reports linked to assessment sessions with secure access
-- Fields: assessment_id, email, access_token, report_html, report_json, expiration
-- Use case: Report generation, distribution, and access control via tokens
CREATE TABLE IF NOT EXISTS public.assessment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to assessment session
    assessment_id UUID NOT NULL REFERENCES public.cw_assessment_sessions(id) ON DELETE CASCADE,

    -- Report metadata
    email VARCHAR(255) NOT NULL,

    -- Secure access token for report retrieval
    access_token CHAR(64) NOT NULL UNIQUE,

    -- Report content
    report_html TEXT NOT NULL,
    report_json JSONB NOT NULL,

    -- Expiration tracking
    is_expired BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Audit timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT access_token_hex_format CHECK (access_token ~ '^[0-9a-f]{64}$'),
    CONSTRAINT report_json_is_object CHECK (jsonb_typeof(report_json) = 'object'),
    CONSTRAINT expires_at_in_future CHECK (expires_at > NOW()),
    CONSTRAINT expiration_logic CHECK (
        (is_expired = FALSE AND expires_at > NOW()) OR
        (is_expired = TRUE AND expires_at <= NOW())
    )
);

-- ===== INDEXES =====
-- Fast lookups by assessment_id
CREATE INDEX IF NOT EXISTS idx_assessment_reports_assessment_id
    ON public.assessment_reports(assessment_id);

-- Fast lookups by access_token (unique constraint already indexes this)
CREATE INDEX IF NOT EXISTS idx_assessment_reports_access_token
    ON public.assessment_reports(access_token);

-- Expiration tracking queries
CREATE INDEX IF NOT EXISTS idx_assessment_reports_expires_at
    ON public.assessment_reports(expires_at DESC);

-- Email lookups
CREATE INDEX IF NOT EXISTS idx_assessment_reports_email
    ON public.assessment_reports(email);

-- Active reports only
CREATE INDEX IF NOT EXISTS idx_assessment_reports_is_expired
    ON public.assessment_reports(is_expired)
    WHERE is_expired = FALSE;

-- ===== AUDIT TRIGGER =====
-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_assessment_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assessment_reports_updated_at
    ON public.assessment_reports;

CREATE TRIGGER trigger_assessment_reports_updated_at
BEFORE UPDATE ON public.assessment_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_assessment_reports_updated_at();

-- ===== ROW LEVEL SECURITY =====
-- Enable RLS on assessment_reports table
ALTER TABLE public.assessment_reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public access via valid access_token (stateless - no auth required)
CREATE POLICY IF NOT EXISTS assessment_reports_token_access ON public.assessment_reports
    FOR SELECT
    USING (
        -- Allow if accessed via valid, non-expired token
        is_expired = FALSE AND expires_at > NOW()
    );

-- Policy 2: Admin full access
CREATE POLICY IF NOT EXISTS assessment_reports_admin_full_access ON public.assessment_reports
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS assessment_reports_admin_insert ON public.assessment_reports
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS assessment_reports_admin_update ON public.assessment_reports
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS assessment_reports_admin_delete ON public.assessment_reports
    FOR DELETE
    USING (auth.jwt() ->> 'role' = 'admin');

-- ===== COMMENTS =====
COMMENT ON TABLE public.assessment_reports IS
    'Stores generated assessment reports with secure token-based access and expiration tracking';

COMMENT ON COLUMN public.assessment_reports.assessment_id IS
    'Foreign key reference to cw_assessment_sessions - identifies source assessment';

COMMENT ON COLUMN public.assessment_reports.access_token IS
    '64-character hex token for secure, stateless report retrieval - unique per report';

COMMENT ON COLUMN public.assessment_reports.report_html IS
    'Rendered HTML report content for email/web display';

COMMENT ON COLUMN public.assessment_reports.report_json IS
    'Structured report metadata and data - status, stage, generated_at, etc.';

COMMENT ON COLUMN public.assessment_reports.is_expired IS
    'Boolean flag for expired reports - synchronized with expires_at timestamp';

COMMENT ON COLUMN public.assessment_reports.expires_at IS
    'UTC timestamp when report access expires - immutable after creation';

-- Migration: Create Report System with Supabase Tables
-- Description: Creates user_sessions, generated_reports, and report_access_log tables with RLS
-- Date: 2026-01-01

-- User Sessions Table (track choices and macro data)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    path_choice TEXT CHECK (path_choice IN ('free', 'paid')),
    macro_data JSONB,
    payment_status TEXT CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    stripe_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at DESC);

-- Generated Reports Table (48-hour storage)
CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    access_token TEXT UNIQUE NOT NULL,
    report_html TEXT NOT NULL,
    questionnaire_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    access_count INT DEFAULT 0,
    last_accessed_at TIMESTAMPTZ
);

-- Indexes for generated_reports
CREATE INDEX IF NOT EXISTS idx_reports_access_token ON generated_reports(access_token);
CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON generated_reports(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_email ON generated_reports(email);

-- Report Access Log Table (analytics)
CREATE TABLE IF NOT EXISTS report_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES generated_reports(id) ON DELETE CASCADE,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Auto-update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_sessions timestamp
DROP TRIGGER IF EXISTS user_sessions_updated_at ON user_sessions;
CREATE TRIGGER user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_log ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for Cloudflare Worker)
DROP POLICY IF EXISTS service_role_all ON user_sessions;
CREATE POLICY service_role_all ON user_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS service_role_all ON generated_reports;
CREATE POLICY service_role_all ON generated_reports FOR ALL USING (true);

DROP POLICY IF EXISTS service_role_all ON report_access_log;
CREATE POLICY service_role_all ON report_access_log FOR ALL USING (true);

-- Allow public read access to reports by token (for retrieving reports)
DROP POLICY IF EXISTS public_read_reports ON generated_reports;
CREATE POLICY public_read_reports ON generated_reports
    FOR SELECT
    USING (true);

-- Allow anonymous access to log access
DROP POLICY IF EXISTS public_insert_access_log ON report_access_log;
CREATE POLICY public_insert_access_log ON report_access_log
    FOR INSERT
    WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO anon, authenticated;
GRANT SELECT, INSERT ON generated_reports TO anon, authenticated;
GRANT SELECT, INSERT ON report_access_log TO anon, authenticated;

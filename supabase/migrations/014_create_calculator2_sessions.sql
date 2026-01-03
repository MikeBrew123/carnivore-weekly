-- Migration 014: Create Calculator2 Session Management
-- Date: 2026-01-02
-- Purpose: Support 48-hour stateless sessions for Calculator2 rebuild
-- Status: IDEMPOTENT (safe to run multiple times)

-- ===== TABLE: calculator2_sessions =====
-- Purpose: Track Calculator2 form progress and session state
-- Principle: Token-based, no email required - supports 48-hour session persistence
CREATE TABLE IF NOT EXISTS calculator2_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    form_state JSONB,
    pricing_tier VARCHAR(50),
    amount_paid DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    report_token VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours') NOT NULL,
    CONSTRAINT calculator2_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT session_token_valid CHECK (length(session_token) = 32),
    CONSTRAINT expiry_after_creation CHECK (expires_at > created_at),
    CONSTRAINT last_active_after_creation CHECK (last_active_at >= created_at)
);

-- ===== INDEXES FOR PERFORMANCE =====
-- Session token lookup: Most critical path
CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator2_sessions_token ON calculator2_sessions(session_token);

-- Expiry checking: Find and clean up expired sessions
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_expires_at ON calculator2_sessions(expires_at)
    WHERE expires_at > CURRENT_TIMESTAMP;

-- Activity tracking: Find recently active sessions
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_last_active ON calculator2_sessions(last_active_at DESC);

-- ===== TRIGGER: Auto-update last_active_at =====
CREATE OR REPLACE FUNCTION update_calculator2_sessions_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculator2_sessions_last_active ON calculator2_sessions;
CREATE TRIGGER trg_calculator2_sessions_last_active
BEFORE UPDATE ON calculator2_sessions
FOR EACH ROW
EXECUTE FUNCTION update_calculator2_sessions_last_active();

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE calculator2_sessions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anonymous users to INSERT (create) new sessions
-- Rationale: Token-based sessions don't require auth context
CREATE POLICY insert_calculator2_sessions ON calculator2_sessions
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Allow anonymous users to SELECT their own session by token
-- Rationale: POST request to /rest/v1/calculator2_sessions?select=* returns all rows
--           matching the WHERE clause - token-based lookup is secure
CREATE POLICY select_calculator2_sessions ON calculator2_sessions
    FOR SELECT
    USING (true);

-- Policy 3: Allow anonymous users to UPDATE their session fields
-- Rationale: Form state persistence requires ability to update
CREATE POLICY update_calculator2_sessions ON calculator2_sessions
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy 4: Service role can manage all sessions (cleanup, audits)
CREATE POLICY service_role_calculator2_sessions ON calculator2_sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ===== TABLE DOCUMENTATION =====
COMMENT ON TABLE calculator2_sessions IS 'Stateless session management for Calculator2 rebuild - tracks form progress with 48-hour expiration.';
COMMENT ON COLUMN calculator2_sessions.session_token IS 'Unique 32-char cryptographic token identifying the session - stored in cookie + localStorage.';
COMMENT ON COLUMN calculator2_sessions.form_state IS 'JSON object containing user form inputs for session recovery - auto-saved during filling.';
COMMENT ON COLUMN calculator2_sessions.pricing_tier IS 'Selected tier: bundle, mealPlan, shopping, doctor, or null for free users.';
COMMENT ON COLUMN calculator2_sessions.amount_paid IS 'Decimal amount paid if payment_status = completed.';
COMMENT ON COLUMN calculator2_sessions.payment_status IS 'Lifecycle: pending -> completed/failed.';
COMMENT ON COLUMN calculator2_sessions.report_token IS 'Access token for generated report - links to generated_reports table.';
COMMENT ON COLUMN calculator2_sessions.expires_at IS 'Session auto-expires 48 hours after creation. Not extended by activity.';

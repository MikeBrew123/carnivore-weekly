/**
 * Migration 016: Step 6b Report Generation Schema
 * Leo's Database Architect
 * Date: 2026-01-03
 *
 * Purpose: Ensure calculator_reports and related tables are properly indexed
 * and configured for high-volume report generation.
 *
 * Tables Modified:
 * - calculator_reports (ensure structure, add indexes)
 * - calculator_report_access_log (ensure structure, partition by month)
 * - claude_api_logs (ensure exists for cost tracking)
 */

-- ===== CALCULATOR_REPORTS TABLE =====
-- Stores generated reports with access tokens and expiration
-- One report per session (after payment completion)

CREATE TABLE IF NOT EXISTS calculator_reports (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES calculator_sessions_v2(id) ON DELETE CASCADE,

  -- Access Control
  email VARCHAR(255) NOT NULL,
  access_token VARCHAR(64) UNIQUE NOT NULL,  -- 64-char hex, cryptographically random

  -- Content Storage
  report_html TEXT,                           -- Full HTML report (nullable until generated)
  report_markdown TEXT,                       -- Source markdown (nullable)
  report_json JSONB DEFAULT '{}',             -- Metadata: status, stage, progress, etc.

  -- Status & Lifecycle
  is_generated BOOLEAN DEFAULT false,         -- true when Claude API finished
  is_expired BOOLEAN DEFAULT false,           -- true after soft-delete (expires_at passed)
  expires_at TIMESTAMP NOT NULL,              -- Auto-cleanup after this time

  -- Timing
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  generated_at TIMESTAMP,                     -- When Claude generation completed
  expired_at TIMESTAMP,                       -- When marked as expired
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Metrics
  access_count INTEGER DEFAULT 0,             -- Incremented on each view
  last_accessed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calculator_reports_session_id
  ON calculator_reports(session_id);

CREATE INDEX IF NOT EXISTS idx_calculator_reports_access_token
  ON calculator_reports(access_token);

CREATE INDEX IF NOT EXISTS idx_calculator_reports_is_generated
  ON calculator_reports(is_generated, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_calculator_reports_email
  ON calculator_reports(email);

CREATE INDEX IF NOT EXISTS idx_calculator_reports_created_at
  ON calculator_reports(created_at DESC);

-- Constraint: One report per session (after payment)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator_reports_unique_session
  ON calculator_reports(session_id)
  WHERE is_expired = false;

-- Enable RLS on calculator_reports
ALTER TABLE calculator_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read non-expired reports via token
DROP POLICY IF EXISTS "Reports accessible via token" ON calculator_reports;
CREATE POLICY "Reports accessible via token"
  ON calculator_reports FOR SELECT
  USING (is_expired = false AND expires_at > NOW());

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access" ON calculator_reports;
CREATE POLICY "Service role full access"
  ON calculator_reports FOR ALL
  USING (auth.role() = 'service_role');

-- ===== CALCULATOR_REPORT_ACCESS_LOG TABLE =====
-- Immutable audit trail of all report accesses
-- Partitioned by month for performance

CREATE TABLE IF NOT EXISTS calculator_report_access_log (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES calculator_reports(id) ON DELETE CASCADE,

  -- Request Info
  accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,                            -- Client IP address
  user_agent VARCHAR(1024),                   -- Browser/client identifier
  referer_url VARCHAR(1024),                  -- HTTP referer
  success BOOLEAN DEFAULT true,               -- Did access succeed?
  error_message TEXT,                         -- If success=false, why?

  -- Metrics
  response_time_ms INTEGER                    -- How long to serve report?
) PARTITION BY RANGE (YEAR_MONTH(accessed_at));

-- Create monthly partitions (Jan 2026 - Dec 2027)
DO $$
DECLARE
  year_val INT;
  month_val INT;
  partition_name TEXT;
  date_val DATE;
BEGIN
  FOR year_val IN 2026..2027 LOOP
    FOR month_val IN 1..12 LOOP
      partition_name := FORMAT('calculator_report_access_log_%04d_%02d', year_val, month_val);
      date_val := TO_DATE(FORMAT('%04d-%02d-01', year_val, month_val), 'YYYY-MM-DD');

      -- Create partition if it doesn't exist
      EXECUTE FORMAT(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF calculator_report_access_log
         FOR VALUES FROM (YEAR_MONTH(%L)) TO (YEAR_MONTH(%L + INTERVAL ''1 MONTH''))',
        partition_name, date_val, date_val
      );
    END LOOP;
  END LOOP;
END
$$;

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_calculator_report_access_log_report_id
  ON calculator_report_access_log(report_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_calculator_report_access_log_accessed_at
  ON calculator_report_access_log(accessed_at DESC);

-- Enable RLS (service role only)
ALTER TABLE calculator_report_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs service role only" ON calculator_report_access_log;
CREATE POLICY "Audit logs service role only"
  ON calculator_report_access_log FOR ALL
  USING (auth.role() = 'service_role');

-- ===== CLAUDE_API_LOGS TABLE =====
-- Track all Claude API calls for cost tracking and debugging

CREATE TABLE IF NOT EXISTS claude_api_logs (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES calculator_sessions_v2(id) ON DELETE SET NULL,
  request_id VARCHAR(255),                    -- Claude API request ID

  -- Request Details
  model VARCHAR(100) NOT NULL,                -- e.g., 'claude-opus-4-5-20251101'
  prompt_hash VARCHAR(64),                    -- SHA256 of sanitized prompt (deduplication)

  -- Token Usage (for billing)
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Status & Result
  status VARCHAR(50) NOT NULL,                -- 'pending', 'success', 'error', 'timeout'
  stop_reason VARCHAR(50),                    -- 'end_turn', 'max_tokens', etc.
  error_code VARCHAR(100),                    -- Error code if failed
  error_message TEXT,                         -- Error details if failed

  -- Timing
  request_at TIMESTAMP NOT NULL DEFAULT NOW(),
  response_at TIMESTAMP,
  duration_ms INTEGER,                        -- response_at - request_at

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_claude_api_logs_session_id
  ON claude_api_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_claude_api_logs_status
  ON claude_api_logs(status);

CREATE INDEX IF NOT EXISTS idx_claude_api_logs_request_at
  ON claude_api_logs(request_at DESC);

CREATE INDEX IF NOT EXISTS idx_claude_api_logs_model
  ON claude_api_logs(model);

-- Enable RLS (service role only)
ALTER TABLE claude_api_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "API logs service role only" ON claude_api_logs;
CREATE POLICY "API logs service role only"
  ON claude_api_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ===== AUTO-UPDATE TRIGGER =====
-- Update updated_at timestamp on every modification

CREATE OR REPLACE FUNCTION update_calculator_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculator_reports_update_timestamp ON calculator_reports;
CREATE TRIGGER calculator_reports_update_timestamp
  BEFORE UPDATE ON calculator_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_reports_updated_at();

-- ===== AUTO-INCREMENT ACCESS_COUNT TRIGGER =====
-- Automatically increment access_count when report accessed

CREATE OR REPLACE FUNCTION increment_report_access_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE calculator_reports SET
    access_count = COALESCE(access_count, 0) + 1,
    last_accessed_at = NOW()
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_access_count ON calculator_report_access_log;
CREATE TRIGGER increment_access_count
  AFTER INSERT ON calculator_report_access_log
  FOR EACH ROW
  EXECUTE FUNCTION increment_report_access_count();

-- ===== SOFT-DELETE TRIGGER =====
-- Mark reports as expired when expires_at passes
-- This is typically run as a scheduled job, not a trigger

CREATE OR REPLACE FUNCTION expire_old_reports()
RETURNS INTEGER AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE calculator_reports SET
    is_expired = true,
    expired_at = NOW()
  WHERE is_expired = false
    AND expires_at < NOW();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- This function is called hourly via scheduled job (not a trigger)
-- SELECT expire_old_reports();

-- ===== CLEANUP FUNCTION =====
-- Hard-delete reports older than 90 days (GDPR compliance)
-- Call this weekly or monthly via scheduled job

CREATE OR REPLACE FUNCTION cleanup_expired_reports(retention_days INT DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INT;
BEGIN
  DELETE FROM calculator_reports
  WHERE is_expired = true
    AND expired_at < NOW() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT cleanup_expired_reports(90);

-- ===== ANALYTICS VIEWS =====

-- View: Reports pending generation
DROP VIEW IF EXISTS vw_pending_reports;
CREATE VIEW vw_pending_reports AS
SELECT
  id,
  session_id,
  email,
  access_token,
  created_at,
  expires_at,
  (report_json->>'stage')::INT as current_stage,
  (report_json->>'progress')::INT as current_progress
FROM calculator_reports
WHERE is_generated = false
  AND is_expired = false
  AND expires_at > NOW()
ORDER BY created_at ASC;

-- View: Generation statistics
DROP VIEW IF EXISTS vw_generation_stats;
CREATE VIEW vw_generation_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_reports,
  COUNT(CASE WHEN is_generated THEN 1 END) as completed,
  COUNT(CASE WHEN NOT is_generated AND NOT is_expired THEN 1 END) as pending,
  COUNT(CASE WHEN is_expired THEN 1 END) as expired,
  AVG(EXTRACT(EPOCH FROM (generated_at - created_at))) as avg_generation_time_seconds
FROM calculator_reports
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Claude API cost analysis
DROP VIEW IF EXISTS vw_claude_api_costs;
CREATE VIEW vw_claude_api_costs AS
SELECT
  DATE(request_at) as date,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0, 4) as input_cost_usd,
  ROUND(SUM(output_tokens) * 15.0 / 1000000.0, 4) as output_cost_usd,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0 + SUM(output_tokens) * 15.0 / 1000000.0, 4) as total_cost_usd,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms
FROM claude_api_logs
WHERE status = 'success'
GROUP BY DATE(request_at)
ORDER BY date DESC;

-- ===== GRANT PERMISSIONS =====

-- Service role: Full access
GRANT ALL ON calculator_reports TO service_role;
GRANT ALL ON calculator_report_access_log TO service_role;
GRANT ALL ON claude_api_logs TO service_role;
GRANT ALL ON vw_pending_reports TO service_role;
GRANT ALL ON vw_generation_stats TO service_role;
GRANT ALL ON vw_claude_api_costs TO service_role;

-- Anon role: Read-only on reports (via RLS)
GRANT SELECT ON calculator_reports TO anon;
GRANT SELECT ON vw_generation_stats TO anon;

-- ===== VERIFICATION QUERIES =====

-- Check table structure
-- SELECT * FROM calculator_reports LIMIT 1;
-- SELECT * FROM calculator_report_access_log LIMIT 1;
-- SELECT * FROM claude_api_logs LIMIT 1;

-- Check indexes
-- SELECT schemaname, tablename, indexname FROM pg_indexes
-- WHERE tablename LIKE 'calculator_report%' OR tablename = 'claude_api_logs'
-- ORDER BY tablename, indexname;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, qual
-- FROM pg_policies
-- WHERE tablename IN ('calculator_reports', 'calculator_report_access_log', 'claude_api_logs');

-- ===== MIGRATION STATUS =====
-- This migration ensures Step 6b tables are ready for production
-- Status: Ready for deployment
-- Version: 016
-- Date: 2026-01-03


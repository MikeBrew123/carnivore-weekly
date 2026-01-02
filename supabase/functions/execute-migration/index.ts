import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const MIGRATION_SQL = `
-- Migration 014: Create Calculator2 Session Management
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator2_sessions_token ON calculator2_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_expires_at ON calculator2_sessions(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_last_active ON calculator2_sessions(last_active_at DESC);

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

ALTER TABLE calculator2_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_calculator2_sessions ON calculator2_sessions
    FOR SELECT
    USING (session_token IS NOT NULL);

CREATE POLICY service_role_calculator2_sessions ON calculator2_sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
`;

export default async (req: Request) => {
  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Test: Check if table already exists
    const { error: checkError } = await supabase
      .from('calculator2_sessions')
      .select('id')
      .limit(1);

    if (!checkError || checkError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'calculator2_sessions table already exists',
          status: 'TABLE_EXISTS',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If we get here, table doesn't exist
    // Unfortunately, Supabase Edge Functions can't execute arbitrary SQL
    // But we can return the SQL for the user to run

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Table does not exist. Please run the migration SQL.',
        requiresManualExecution: true,
        migrationSql: MIGRATION_SQL.trim(),
        instructions: {
          step1: 'Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new',
          step2: 'Copy the SQL from the migrationSql field',
          step3: 'Paste it into the SQL editor',
          step4: 'Click RUN',
        },
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

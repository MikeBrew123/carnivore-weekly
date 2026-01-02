/**
 * Cloudflare Worker: Execute Database Migration
 * Executes the calculator2_sessions table migration via Supabase API
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const SUPABASE_URL = 'https://kwtdpvnjewtahuxjyltn.supabase.co';
    const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

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
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours') NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calculator2_sessions_token ON calculator2_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_expires_at ON calculator2_sessions(expires_at) WHERE expires_at > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_last_active ON calculator2_sessions(last_active_at DESC);

ALTER TABLE calculator2_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_calculator2_sessions ON calculator2_sessions
    FOR SELECT
    USING (session_token IS NOT NULL);

CREATE POLICY service_role_calculator2_sessions ON calculator2_sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
`;

    try {
      // Check if table already exists
      const checkResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/calculator2_sessions?limit=1`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (checkResponse.ok) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'calculator2_sessions table already exists',
            status: 'TABLE_EXISTS',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('Table does not exist, migration needed');
      console.log('Unfortunately, Supabase REST API does not support raw SQL execution');
      console.log('The table must be created via the SQL editor or direct psql connection');

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Table does not exist. Manual creation required.',
          reason: 'Supabase REST API does not support raw SQL execution',
          solution: 'Use Supabase SQL editor or psql with postgres credentials',
          migrationSql: MIGRATION_SQL.trim(),
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error.message,
          type: 'WORKER_ERROR',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

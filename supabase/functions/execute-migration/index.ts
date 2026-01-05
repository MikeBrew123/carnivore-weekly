import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Migration 020: Assessment Sessions Table
const ASSESSMENT_MIGRATION_SQL = `
-- Migration 020: Assessment Sessions Table
-- Date: 2026-01-04
-- Purpose: Store assessment form submissions and payment status

CREATE TABLE IF NOT EXISTS public.cw_assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    form_data JSONB NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT form_data_is_object CHECK (jsonb_typeof(form_data) = 'object'),
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'),
    CONSTRAINT first_name_not_empty CHECK (length(trim(first_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_email
    ON public.cw_assessment_sessions(email);

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_payment_status
    ON public.cw_assessment_sessions(payment_status);

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_stripe_session_id
    ON public.cw_assessment_sessions(stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_created_at
    ON public.cw_assessment_sessions(created_at DESC);

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

COMMENT ON TABLE public.cw_assessment_sessions IS
    'Stores assessment form submissions and payment status tracking';

COMMENT ON COLUMN public.cw_assessment_sessions.form_data IS
    'Complete assessment form as JSONB object - includes all steps';

COMMENT ON COLUMN public.cw_assessment_sessions.payment_status IS
    'Payment status: pending, completed, failed, or refunded';

COMMENT ON COLUMN public.cw_assessment_sessions.stripe_session_id IS
    'Stripe checkout session ID - set after checkout session creation';
`;

// Original Migration 014
const CALCULATOR2_MIGRATION_SQL = `
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
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const migrationTarget = body.migration || 'assessment'; // 'assessment' or 'calculator2'

    // Verify authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Check which migration to execute
    if (migrationTarget === 'assessment') {
      // Check if assessment table already exists
      const { error: checkError } = await supabase
        .from('cw_assessment_sessions')
        .select('id')
        .limit(1);

      if (!checkError || (checkError && checkError.code !== 'PGRST116')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'cw_assessment_sessions table already exists',
            status: 'TABLE_EXISTS',
            table: 'cw_assessment_sessions'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Table doesn't exist - cannot execute arbitrary SQL from Edge Function
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Assessment migration requires manual execution',
          requiresManualExecution: true,
          migrationSql: ASSESSMENT_MIGRATION_SQL.trim(),
          migrationFile: 'migrations/020_assessment_sessions_table.sql',
          instructions: {
            step1: 'Open Supabase dashboard: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new',
            step2: 'Copy the SQL from the migrationSql field',
            step3: 'Paste it into the SQL editor',
            step4: 'Click RUN to execute',
            step5: 'Verify table: SELECT COUNT(*) FROM cw_assessment_sessions;'
          }
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );

    } else if (migrationTarget === 'calculator2') {
      // Check if calculator2_sessions table already exists
      const { error: checkError } = await supabase
        .from('calculator2_sessions')
        .select('id')
        .limit(1);

      if (!checkError || (checkError && checkError.code !== 'PGRST116')) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'calculator2_sessions table already exists',
            status: 'TABLE_EXISTS',
            table: 'calculator2_sessions'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Table doesn't exist
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Calculator2 migration requires manual execution',
          requiresManualExecution: true,
          migrationSql: CALCULATOR2_MIGRATION_SQL.trim(),
          instructions: {
            step1: 'Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new',
            step2: 'Copy the SQL from the migrationSql field',
            step3: 'Paste it into the SQL editor',
            step4: 'Click RUN'
          }
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid migration target',
        validTargets: ['assessment', 'calculator2']
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

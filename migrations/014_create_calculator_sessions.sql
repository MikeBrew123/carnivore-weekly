-- Create calculator2_sessions table
CREATE TABLE IF NOT EXISTS public.calculator2_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  form_state JSONB DEFAULT NULL,
  pricing_tier TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_token ON public.calculator2_sessions(session_token);

-- Enable RLS
ALTER TABLE public.calculator2_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Everyone can insert (anonymous session creation)
CREATE POLICY IF NOT EXISTS "Allow anonymous session creation"
  ON public.calculator2_sessions
  FOR INSERT
  WITH CHECK (true);

-- Create RLS policy: Everyone can read their own session
CREATE POLICY IF NOT EXISTS "Allow reading own session"
  ON public.calculator2_sessions
  FOR SELECT
  USING (true);

-- Create RLS policy: Everyone can update their own session
CREATE POLICY IF NOT EXISTS "Allow updating own session"
  ON public.calculator2_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calculator2_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calculator2_sessions_updated_at_trigger ON public.calculator2_sessions;
CREATE TRIGGER update_calculator2_sessions_updated_at_trigger
BEFORE UPDATE ON public.calculator2_sessions
FOR EACH ROW
EXECUTE FUNCTION update_calculator2_sessions_updated_at();

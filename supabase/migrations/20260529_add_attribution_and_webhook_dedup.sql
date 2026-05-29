-- Add attribution tracking columns to calculator_sessions_v2
ALTER TABLE public.calculator_sessions_v2
  ADD COLUMN IF NOT EXISTS ga_client_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_content VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_term VARCHAR(200),
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_calc_sessions_v2_utm_source
  ON public.calculator_sessions_v2(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calc_sessions_v2_ga_client_id
  ON public.calculator_sessions_v2(ga_client_id) WHERE ga_client_id IS NOT NULL;

-- Webhook event dedup table
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(100) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  session_id UUID,
  amount_cents INTEGER
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No public policies — service_role only (same pattern as other internal tables)

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
  ON public.stripe_webhook_events(stripe_event_id);

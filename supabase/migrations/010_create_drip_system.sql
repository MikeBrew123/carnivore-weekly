-- Migration 010: Drip subscribers for 7-Day Carnivore Starter Plan
-- Purpose: Lead magnet email drip sequence tracking
-- Access: service_role only (n8n webhook pipeline)

-- 1. Create the drip_subscribers table
CREATE TABLE IF NOT EXISTS drip_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'starter-plan',
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  current_day INT DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  unsubscribed BOOLEAN DEFAULT FALSE,
  unsubscribe_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex')
);

-- 2. Partial index for the daily drip query (only active subscribers)
CREATE INDEX IF NOT EXISTS idx_drip_pending
  ON drip_subscribers (current_day, completed, unsubscribed)
  WHERE completed = FALSE AND unsubscribed = FALSE;

-- 3. Row Level Security — service_role bypass only, no anon access
ALTER TABLE drip_subscribers ENABLE ROW LEVEL SECURITY;
-- No anon or authenticated policies needed.
-- All access is via service_role (n8n) which bypasses RLS by default.

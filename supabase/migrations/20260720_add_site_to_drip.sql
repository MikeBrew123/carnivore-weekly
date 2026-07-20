-- Add site scoping to the drip system so KetoDial can run its own starter drip.
-- Per CLAUDE.md rule: drip_subscribers/drip_events were CW-only; a KD drip requires
-- a site column FIRST. Existing rows are all CW, so the default backfills correctly.

ALTER TABLE drip_subscribers ADD COLUMN IF NOT EXISTS site TEXT NOT NULL DEFAULT 'cw';
ALTER TABLE drip_events ADD COLUMN IF NOT EXISTS site TEXT NOT NULL DEFAULT 'cw';

-- The same person may legitimately be on both sites' drips.
ALTER TABLE drip_subscribers DROP CONSTRAINT IF EXISTS drip_subscribers_email_key;
ALTER TABLE drip_subscribers ADD CONSTRAINT drip_subscribers_email_site_key UNIQUE (email, site);

-- Daily send query now filters by site first.
DROP INDEX IF EXISTS idx_drip_pending;
CREATE INDEX IF NOT EXISTS idx_drip_pending
  ON drip_subscribers (site, current_day, completed, unsubscribed)
  WHERE completed = FALSE AND unsubscribed = FALSE;

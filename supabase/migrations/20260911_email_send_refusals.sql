-- 20260911_email_send_refusals.sql
--
-- Resend quota alarm (Brew, deck 920ebe5a, approved 2026-09-10: "watch it with
-- a 429 alarm, do not pay yet"). No plan change, no spend.
--
-- One row per email Resend REFUSED because the account hit its daily or
-- monthly sending quota (HTTP 429, daily_quota_exceeded / monthly_quota_exceeded).
-- Written by scripts/resend_quota.py from send_drip.py and send_newsletter.py.
-- Nothing reads this table to send email: it exists so a refused email is never
-- silently lost and can be re-sent BY HAND. Set resent_at when you do.
--
-- Drip rows: the subscriber's current_day was not advanced, so the next daily
-- drip run tries that day again on its own. Hand-send only if that also fails.
-- Newsletter rows: nothing retries these.
--
-- Holds subscriber email addresses, so it is service-role only.

CREATE TABLE IF NOT EXISTS public.email_send_refusals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refused_at    timestamptz NOT NULL DEFAULT now(),
  site          text NOT NULL,              -- cw | kd | kd_coach
  list_name     text NOT NULL,              -- drip | newsletter
  subscriber_id uuid,                       -- drip_subscribers.id or newsletter_subscribers.id
  email         text NOT NULL,
  template      text NOT NULL,              -- e.g. 30day-starter/day-7, newsletter/2026-09-13
  subject       text,
  http_status   integer NOT NULL DEFAULT 429,
  error_name    text NOT NULL,              -- Resend's error name
  error_message text,
  notes         text,
  run_url       text,                       -- the GitHub Actions run that hit the refusal
  resent_at     timestamptz,                -- set by hand after a manual re-send
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_refusals_refused_at_idx
  ON public.email_send_refusals (refused_at DESC);
CREATE INDEX IF NOT EXISTS email_send_refusals_unsent_idx
  ON public.email_send_refusals (site, list_name) WHERE resent_at IS NULL;

ALTER TABLE public.email_send_refusals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_send_refusals FROM anon, authenticated;
GRANT ALL ON public.email_send_refusals TO service_role;

COMMENT ON TABLE public.email_send_refusals IS
  'Emails Resend refused over the sending quota (HTTP 429). Record for hand re-send; never auto-retried. Deck 920ebe5a.';

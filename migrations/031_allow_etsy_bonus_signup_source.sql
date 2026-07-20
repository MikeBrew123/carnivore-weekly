-- 031: allow 'etsy-bonus' in newsletter_subscribers.signup_source
-- The /bonus pages (CW + KD free 30-day tracker) subscribe with
-- source 'etsy-bonus'; the old check constraint rejected it, which made
-- the worker's RPC upsert fail silently. Applied live 2026-07-19.
ALTER TABLE newsletter_subscribers DROP CONSTRAINT newsletter_subscribers_signup_source_check;
ALTER TABLE newsletter_subscribers ADD CONSTRAINT newsletter_subscribers_signup_source_check
CHECK (signup_source = ANY (ARRAY[
  'homepage', 'blog', 'blog_inline', 'calculator', 'cross_promo',
  'manual', 'direct', 'mailerlite_migration', 'etsy-bonus'
]::text[]));

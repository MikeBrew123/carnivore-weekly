-- Red-team fixes 2026-08-30 (applied via MCP apply_migration the same day;
-- this file records it in the repo's migration history).
-- 1. UI offers a 10% deficit; the old CHECK rejected it, 400ing the whole
--    step-2 PATCH (funnel data lost + backstop subscribe never ran).
ALTER TABLE public.calculator_sessions_v2
  DROP CONSTRAINT calculator_sessions_v2_deficit_percentage_check;
ALTER TABLE public.calculator_sessions_v2
  ADD CONSTRAINT calculator_sessions_v2_deficit_percentage_check
  CHECK (deficit_percentage IS NULL OR deficit_percentage = ANY (ARRAY[10, 15, 20, 25]));

-- 2. KD /email-plan opt-in sends signup_source='calculator-plan'; the old
--    CHECK rejected it and the worker swallowed the error (rows silently lost).
ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT newsletter_subscribers_signup_source_check;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_signup_source_check
  CHECK (signup_source = ANY (ARRAY['homepage','blog','blog_inline','calculator',
    'cross_promo','manual','direct','mailerlite_migration','etsy-bonus',
    'calculator-plan']::text[]));

-- 3. The upsert used to reactivate unsubscribed rows on any later signup path
--    (including the invisible step-2 server backstop). Unsubscribed stays
--    unsubscribed now.
CREATE OR REPLACE FUNCTION public.upsert_newsletter_subscriber(
  p_email text, p_site text, p_signup_source text DEFAULT 'calculator'::text,
  p_utm_source text DEFAULT NULL::text, p_utm_medium text DEFAULT NULL::text,
  p_utm_campaign text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  insert into public.newsletter_subscribers (email, site, status, signup_source, unsubscribed_at, utm_source, utm_medium, utm_campaign)
  values (p_email, p_site, 'active', p_signup_source, null, p_utm_source, p_utm_medium, p_utm_campaign)
  on conflict (email, site)
  do update set
    status = case when public.newsletter_subscribers.status = 'unsubscribed'
                  then public.newsletter_subscribers.status
                  else 'active' end,
    unsubscribed_at = case when public.newsletter_subscribers.status = 'unsubscribed'
                           then public.newsletter_subscribers.unsubscribed_at
                           else null end,
    signup_source = case when public.newsletter_subscribers.status = 'unsubscribed'
                         then public.newsletter_subscribers.signup_source
                         else p_signup_source end,
    updated_at = now();
end;
$function$;

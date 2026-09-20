-- Offer-button instrumentation for the free-results screen (deck add99e65, fix 2 of 3).
--
-- The money-path costing of 2026-09-18 found the one number nobody has: 158 people
-- reached the free-results page in 30 days and 4 bought, and we could not tell whether
-- the other 154 pressed the $29 button and backed out, or never pressed it at all.
-- Those two problems have opposite fixes. GA4 could not answer it either: begin_checkout
-- read 0 while the modal was opening, and calculator_payment_cancelled has never fired.
--
-- So the signal is written to the funnel row itself, next to free_results_viewed_at:
--   offer_clicked_at    first press of any $29 CTA (bridge card, final card, lock overlay)
--   offer_click_count   total presses, including re-opens after a dismiss
--   offer_click_surface which CTA was pressed first
--   offer_dismissed_at  first close of the payment modal without paying
--   offer_dismiss_count total unpaid closes
--
-- Read it as: free_results_viewed_at set + offer_clicked_at null = never pressed the
-- button. offer_clicked_at set + payment_status still pending = pressed and bailed.

alter table calculator_sessions_v2
  add column if not exists offer_clicked_at timestamptz,
  add column if not exists offer_click_count integer not null default 0,
  add column if not exists offer_click_surface text,
  add column if not exists offer_dismissed_at timestamptz,
  add column if not exists offer_dismiss_count integer not null default 0;

comment on column calculator_sessions_v2.offer_clicked_at is
  'First press of a $29 offer CTA on the free-results screen (recorded since 2026-09-20).';
comment on column calculator_sessions_v2.offer_dismissed_at is
  'First close of the payment modal without paying (recorded since 2026-09-20).';

-- Counters have to increment atomically, which PostgREST PATCH cannot do, and the
-- first-touch timestamps must never be overwritten by a later press. One function
-- does both so the worker makes a single call and cannot half-apply it.
create or replace function record_calculator_offer_event(
  p_session_token text,
  p_event text,
  p_surface text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if p_event = 'click' then
    update calculator_sessions_v2
       set offer_clicked_at   = coalesce(offer_clicked_at, now()),
           offer_click_surface = coalesce(offer_click_surface, p_surface),
           offer_click_count  = offer_click_count + 1,
           updated_at         = now()
     where session_token = p_session_token;
  elsif p_event = 'dismiss' then
    update calculator_sessions_v2
       set offer_dismissed_at = coalesce(offer_dismissed_at, now()),
           offer_dismiss_count = offer_dismiss_count + 1,
           updated_at         = now()
     where session_token = p_session_token;
  else
    raise exception 'unknown offer event: %', p_event;
  end if;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

comment on function record_calculator_offer_event(text, text, text) is
  'Records an offer-button press or an unpaid payment-modal close on the funnel row. Returns rows matched. Called by the CW worker at POST /api/v1/calculator/offer-event.';

revoke all on function record_calculator_offer_event(text, text, text) from public, anon;
grant execute on function record_calculator_offer_event(text, text, text) to service_role;

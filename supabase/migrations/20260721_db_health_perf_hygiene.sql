-- 2026-07-21 — Supabase health review: performance & policy hygiene
-- Applied via MCP against project kwtdpvnjewtahuxjyltn. Mirrors remote for repo/DB parity.
-- All changes are zero/low-behavior-change. See docs/archive/reports-archive/2026-07-21-supabase-health-review.md.

-- ── Part A: drop redundant duplicate RLS policies (each pair provably identical) ──
drop policy if exists rls_public_read_blog_posts on public.blog_posts;
drop policy if exists service_role_calculator_reports on public.calculator_reports;
drop policy if exists service_role_calculator_sessions_v2 on public.calculator_sessions_v2;
drop policy if exists rls_public_read_content_topics on public.content_topics;
drop policy if exists rls_public_read_payment_tiers on public.payment_tiers;
drop policy if exists rls_public_read_poll_options on public.poll_options;
drop policy if exists rls_public_read_poll_votes on public.poll_votes;
drop policy if exists rls_public_read_post_reactions on public.post_reactions;
drop policy if exists rls_public_read_topic_polls on public.topic_polls;
drop policy if exists rls_public_read_topic_product_mapping on public.topic_product_mapping;
drop policy if exists rls_public_read_topics on public.topics;
drop policy if exists rls_public_read_weekly_analysis on public.weekly_analysis;
drop policy if exists rls_public_read_wiki_video_links on public.wiki_video_links;
drop policy if exists rls_public_read_youtube_videos on public.youtube_videos;

-- ── Part B: wrap auth.*() as (select auth.*()) — initplan, evaluated once not per-row ──
alter policy members_insert_own_checkins on public.coach_checkins with check (((select auth.uid()) = member_id));
alter policy members_read_own_checkins   on public.coach_checkins using (((select auth.uid()) = member_id));
alter policy members_read_own            on public.coach_members  using (((select auth.uid()) = id));
alter policy members_insert_messages     on public.coach_messages with check ((((select auth.uid()) = member_id) and (direction = 'member'::text)));
alter policy members_read_sent_messages  on public.coach_messages using ((((select auth.uid()) = member_id) and (sent_at is not null)));
alter policy members_insert_own_metrics  on public.coach_metrics  with check (((select auth.uid()) = member_id));
alter policy members_read_own_metrics    on public.coach_metrics  using (((select auth.uid()) = member_id));
alter policy signals_service             on public.content_signals using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy poll_options_service_write  on public.poll_options   using (((select auth.role()) = 'service_role'::text));
alter policy ratings_service             on public.recipe_ratings using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy recipes_service             on public.recipes        using (((select auth.role()) = 'service_role'::text)) with check (((select auth.role()) = 'service_role'::text));
alter policy refund_requests_service_all on public.refund_requests using (((select auth.role()) = 'service_role'::text));

-- ── Part C: missing FK indexes (coach growth + drip survey churn) + access-path indexes ──
create index if not exists idx_coach_messages_reviewed_by_admin_id on public.coach_messages (reviewed_by_admin_id);
create index if not exists idx_coach_messages_checkin_id           on public.coach_messages (checkin_id);
create index if not exists idx_coach_credit_ledger_related_checkin on public.coach_credit_ledger (related_checkin_id);
create index if not exists idx_coach_credit_ledger_granted_by      on public.coach_credit_ledger (granted_by_admin_id);
create index if not exists idx_coach_credit_ledger_voided_by       on public.coach_credit_ledger (voided_by_admin_id);
create index if not exists idx_coach_member_notes_admin_id         on public.coach_member_notes (admin_id);
create index if not exists idx_drip_survey_options_question_id     on public.drip_survey_options (question_id);
create index if not exists idx_drip_survey_responses_option_id     on public.drip_survey_responses (option_id);
create index if not exists idx_drip_survey_responses_question_id   on public.drip_survey_responses (question_id);
create index if not exists idx_drip_subscribers_site_day on public.drip_subscribers (site, current_day) where completed = false;
create index if not exists idx_newsletter_subscribers_site on public.newsletter_subscribers (site);

-- drop one genuinely-unused index on write-heavy events table
drop index if exists public.drip_events_resend_id_event_type_singular_idx;

-- ── Part D: harden mutable search_path on 5 functions (2 pin directly, 3 recreated qualified) ──
alter function public.set_updated_at() set search_path = '';
alter function public.update_recipe_rating() set search_path = '';

create or replace function public.check_founding_cap(p_cap integer default 50)
 returns boolean language plpgsql security definer set search_path = ''
as $function$
declare current_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('founding_cap_check'));
  select count(*) into current_count
  from public.coach_members
  where founding_member = true and status in ('active','onboarding','test');
  return current_count < p_cap;
end;
$function$;

create or replace function public.consume_bonus_credit(p_member_id uuid)
 returns integer language plpgsql security definer set search_path = ''
as $function$
declare new_balance integer;
begin
  update public.coach_members
  set bonus_credit_balance = bonus_credit_balance - 1, updated_at = now()
  where id = p_member_id and bonus_credit_balance > 0
  returning bonus_credit_balance into new_balance;
  if not found then return null; end if;
  return new_balance;
end;
$function$;

create or replace function public.upsert_newsletter_subscriber(p_email text, p_site text, p_signup_source text default 'calculator'::text, p_utm_source text default null::text, p_utm_medium text default null::text, p_utm_campaign text default null::text)
 returns void language plpgsql security definer set search_path = ''
as $function$
begin
  insert into public.newsletter_subscribers (email, site, status, signup_source, unsubscribed_at, utm_source, utm_medium, utm_campaign)
  values (p_email, p_site, 'active', p_signup_source, null, p_utm_source, p_utm_medium, p_utm_campaign)
  on conflict (email, site)
  do update set status = 'active', signup_source = p_signup_source, unsubscribed_at = null, updated_at = now();
end;
$function$;

-- ── Part E: autovacuum tuning for tiny high-churn tables (fire on absolute row counts) ──
alter table public.drip_subscribers       set (autovacuum_vacuum_scale_factor=0.0, autovacuum_vacuum_threshold=25, autovacuum_analyze_scale_factor=0.0, autovacuum_analyze_threshold=25);
alter table public.newsletter_subscribers set (autovacuum_vacuum_scale_factor=0.0, autovacuum_vacuum_threshold=25, autovacuum_analyze_scale_factor=0.0, autovacuum_analyze_threshold=25);
alter table public.drip_survey_responses  set (autovacuum_vacuum_scale_factor=0.0, autovacuum_vacuum_threshold=25, autovacuum_analyze_scale_factor=0.0, autovacuum_analyze_threshold=25);
alter table public.cw_assessment_sessions set (autovacuum_vacuum_scale_factor=0.0, autovacuum_vacuum_threshold=25, autovacuum_analyze_scale_factor=0.0, autovacuum_analyze_threshold=25);

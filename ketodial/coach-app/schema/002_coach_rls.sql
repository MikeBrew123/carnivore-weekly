-- KetoDial Coach — Row Level Security Policies
-- Posture: deny-by-default. Every table has RLS enabled.
-- Members: own data only. Admins: role-based. Audit/ledger: append-only.

-- ============================================================
-- HELPER: check if current user is an active admin
-- ============================================================
create or replace function is_coach_admin()
returns boolean as $$
  select exists (
    select 1 from coach_admins
    where auth_user_id = auth.uid() and active = true
  );
$$ language sql security definer stable set search_path = public, pg_temp;

create or replace function is_coach_owner()
returns boolean as $$
  select exists (
    select 1 from coach_admins
    where auth_user_id = auth.uid() and active = true and role = 'owner'
  );
$$ language sql security definer stable set search_path = public, pg_temp;

-- ============================================================
-- 1. COACH_ADMINS
-- ============================================================
alter table coach_admins enable row level security;

-- admins can read their own row + other admins (for display names in UI)
create policy "admins_read_all" on coach_admins
  for select using (is_coach_admin());

-- only owner can insert/update admins
create policy "owner_manage_admins" on coach_admins
  for all using (is_coach_owner());

-- ============================================================
-- 2. COACH_MEMBERS
-- ============================================================
alter table coach_members enable row level security;

-- members read own row only
create policy "members_read_own" on coach_members
  for select using (auth.uid() = id);

-- members update own profile ONLY through RPC (not direct table access)
-- this prevents members from touching admin-only columns
-- NO direct UPDATE policy for members on coach_members

-- admins read/write all members
create policy "admins_manage_members" on coach_members
  for all using (is_coach_admin());

-- service role handles Stripe webhook inserts (bypasses RLS)

-- ============================================================
-- 3. COACH_MEMBER_NOTES (admin-only)
-- ============================================================
alter table coach_member_notes enable row level security;

create policy "admins_manage_notes" on coach_member_notes
  for all using (is_coach_admin());
-- members have zero access to this table

-- ============================================================
-- 4. COACH_CHECKINS
-- ============================================================
alter table coach_checkins enable row level security;

-- members read own check-ins
create policy "members_read_own_checkins" on coach_checkins
  for select using (auth.uid() = member_id);

-- members insert own check-ins
create policy "members_insert_own_checkins" on coach_checkins
  for insert with check (auth.uid() = member_id);

-- members cannot update or delete check-ins (immutable once submitted)

-- admins read all check-ins
create policy "admins_read_checkins" on coach_checkins
  for select using (is_coach_admin());

-- ============================================================
-- 5. COACH_MESSAGES
-- ============================================================
alter table coach_messages enable row level security;

-- members see only sent messages (via the view, but policy backs it up)
create policy "members_read_sent_messages" on coach_messages
  for select using (auth.uid() = member_id and sent_at is not null);

-- members can insert their own messages (direction must be 'member')
create policy "members_insert_messages" on coach_messages
  for insert with check (auth.uid() = member_id and direction = 'member');

-- members cannot update or delete messages

-- admins full access (review, edit, approve, send)
create policy "admins_manage_messages" on coach_messages
  for all using (is_coach_admin());

-- ============================================================
-- 6. COACH_MEMBER_MESSAGES VIEW
-- ============================================================
-- View inherits RLS from underlying coach_messages table.
-- The view already filters sent_at IS NOT NULL and excludes admin columns.
-- No additional policy needed on the view itself.

-- ============================================================
-- 7. COACH_CREDIT_LEDGER
-- ============================================================
alter table coach_credit_ledger enable row level security;

-- members have NO access to raw credit ledger
-- they see balance via coach_members.bonus_credit_balance
-- and curated history via coach_member_credit_history view

-- admins can read all + insert (grant credits)
create policy "admins_manage_credits" on coach_credit_ledger
  for all using (is_coach_admin());

-- credit consumption and voiding via service role (bypasses RLS)
-- voiding sets voided_at/voided_by, never deletes

-- ============================================================
-- 8. COACH_SAFETY_EVENTS (admin-only + service role)
-- ============================================================
alter table coach_safety_events enable row level security;

-- members have zero access
-- admins can read all safety events regardless of member status
create policy "admins_read_safety" on coach_safety_events
  for select using (is_coach_admin());

-- admins can update (resolve, add notes)
create policy "admins_update_safety" on coach_safety_events
  for update using (is_coach_admin());

-- inserts happen via service role (AI detection pipeline)

-- ============================================================
-- 9. COACH_METRICS
-- ============================================================
alter table coach_metrics enable row level security;

-- members read own metrics
create policy "members_read_own_metrics" on coach_metrics
  for select using (auth.uid() = member_id);

-- members insert own metrics (manual weight entries)
create policy "members_insert_own_metrics" on coach_metrics
  for insert with check (auth.uid() = member_id);

-- admins read all
create policy "admins_read_metrics" on coach_metrics
  for select using (is_coach_admin());

-- ============================================================
-- 10. COACH_ADMIN_AUDIT_LOG (append-only)
-- ============================================================
alter table coach_admin_audit_log enable row level security;

-- admins can read audit log
create policy "admins_read_audit" on coach_admin_audit_log
  for select using (is_coach_admin());

-- inserts via service role only (application layer appends on every admin action)
-- NO update or delete policies — audit log is immutable

-- ============================================================
-- COLUMN-LEVEL PROTECTION (defense in depth)
-- ============================================================
-- Even though RLS prevents member access to admin columns,
-- the member-facing view (coach_member_messages) provides
-- an additional layer by excluding:
--   ai_draft, ai_structured_output, review_status,
--   red_flag, red_flag_reason, reviewed_by_admin_id,
--   reviewed_at, was_edited, was_auto_sent, updated_at
--
-- Application code for member-facing queries should use
-- the view, not the table directly.

-- ============================================================
-- MEMBER PROFILE UPDATE RPC (enforces column allowlist)
-- ============================================================
create or replace function update_member_profile(
  p_display_name text default null,
  p_current_weight numeric default null,
  p_goal_weight numeric default null,
  p_activity_level text default null,
  p_diet_type text default null,
  p_timezone text default null
)
returns void as $$
begin
  update coach_members set
    display_name = coalesce(p_display_name, display_name),
    current_weight = coalesce(p_current_weight, current_weight),
    goal_weight = coalesce(p_goal_weight, goal_weight),
    activity_level = coalesce(p_activity_level, activity_level),
    diet_type = coalesce(p_diet_type, diet_type),
    timezone = coalesce(p_timezone, timezone),
    updated_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ============================================================
-- MEMBER-SAFE CREDIT HISTORY VIEW
-- ============================================================
create view coach_member_credit_history as
select
  member_id,
  credit_type,
  amount,
  case reason
    when 'signup_bonus' then 'Welcome bonus'
    when 'used' then 'Used for bonus check-in'
    when 'retention' then 'Loyalty bonus'
    when 'goodwill' then 'Bonus from your coach'
    when 'manual_admin_grant' then 'Bonus from your coach'
  end as description,
  related_checkin_id,
  case when voided_at is not null then true else false end as reversed,
  created_at
from coach_credit_ledger
where voided_at is null;
-- Members access this view filtered by auth.uid() = member_id via app layer

-- ============================================================
-- MEMBER INSERT POLICY HARDENING (coach_messages)
-- ============================================================
-- The insert policy constrains direction='member' but we also need
-- to prevent members from setting admin-only fields on insert.
-- This trigger rejects spoofed values on member-inserted messages.

create or replace function enforce_member_message_defaults()
returns trigger as $$
begin
  if new.direction = 'member' then
    new.ai_draft := null;
    new.ai_structured_output := null;
    new.was_edited := false;
    new.was_auto_sent := false;
    new.red_flag := false;
    new.red_flag_reason := null;
    new.review_status := 'pending';
    new.reviewed_by_admin_id := null;
    new.reviewed_at := null;
    new.sent_at := now();  -- member messages are visible immediately
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_member_message_defaults
  before insert on coach_messages
  for each row execute function enforce_member_message_defaults();

-- ============================================================
-- BONUS CREDIT BALANCE MAINTENANCE
-- ============================================================
-- bonus_credit_balance on coach_members is a cached value.
-- It must only be updated by service role via an RPC function,
-- never directly by the member.

create or replace function refresh_credit_balance(p_member_id uuid)
returns int as $$
declare
  v_balance int;
begin
  select coalesce(sum(amount), 0) into v_balance
  from coach_credit_ledger
  where member_id = p_member_id and voided_at is null;

  update coach_members
  set bonus_credit_balance = v_balance, updated_at = now()
  where id = p_member_id;

  return v_balance;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

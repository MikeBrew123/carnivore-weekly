-- KetoDial Coach — Database Schema v2
-- Incorporates Hermes PM review amendments (2026-06-01)
-- Review before executing. Nothing runs until approved.

-- ============================================================
-- 1. ADMIN USERS (Brew + Keren)
-- ============================================================
create table coach_admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id),
  email text not null,
  display_name text not null,
  role text not null check (role in ('owner', 'reviewer')),
  active boolean default true,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 2. MEMBERS
-- ============================================================
create table coach_members (
  id uuid primary key references auth.users(id),
  site text not null default 'ketodial' check (site in ('ketodial', 'carnivoreweekly')),

  -- lifecycle (product access, distinct from Stripe billing)
  status text not null default 'onboarding' check (status in (
    'onboarding', 'active', 'paused', 'cancelled', 'offboarded', 'refunded', 'test'
  )),

  -- stripe
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  subscription_status text default 'active' check (subscription_status in (
    'active', 'paused', 'cancelled', 'past_due', 'unpaid', 'trialing'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,

  -- tier
  tier text not null default 'weekly' check (tier in ('weekly', 'daily')),
  founding_member boolean default false,

  -- profile
  display_name text not null,
  email text not null,
  age int,
  sex text,
  height_cm numeric,
  start_weight numeric,
  current_weight numeric,
  goal_weight numeric,
  activity_level text,
  diet_type text check (diet_type in ('keto', 'carnivore', 'lowcarb')),
  diet_duration text,
  health_conditions text[],
  medications text,
  biggest_challenge text,
  success_vision text,
  referral_source text,
  timezone text default 'America/New_York',

  -- coaching
  risk_level text default 'green' check (risk_level in ('green', 'yellow', 'red')),
  coaching_mode text default 'ai_reviewed' check (coaching_mode in (
    'ai_reviewed', 'human_only', 'paused', 'referred_out'
  )),
  member_summary text,
  coach_notes text,         -- admin-only internal notes (never exposed to member)

  -- consent (with version tracking)
  waiver_consented_at timestamptz,
  waiver_version text default 'v1',
  ai_disclosure_consented_at timestamptz,
  ai_disclosure_version text default 'v1',
  response_time_consented_at timestamptz,
  response_time_version text default 'v1',
  consent_ip text,

  -- offboarding
  offboard_reason text check (offboard_reason in (
    'not_a_fit', 'medical_scope_boundary', 'too_demanding', 'refunded', 'cancelled'
  )),
  offboarded_at timestamptz,

  onboarded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 3. BONUS CREDIT LEDGER
-- ============================================================
create table coach_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references coach_members(id),
  credit_type text not null default 'bonus_checkin' check (credit_type in ('bonus_checkin')),
  amount int not null check (amount != 0),  -- +1 = granted, -1 = consumed, never 0
  reason text not null check (reason in (
    'signup_bonus', 'retention', 'goodwill', 'manual_admin_grant', 'used'
  )),
  granted_by_admin_id uuid references coach_admins(id),
  related_checkin_id uuid,    -- FK added after checkins table exists
  used_at timestamptz,
  voided_at timestamptz,
  voided_by_admin_id uuid references coach_admins(id),
  created_at timestamptz default now()
);

-- cached balance on member for fast UI queries
-- maintained by application logic: SUM(amount) from ledger WHERE voided_at IS NULL
alter table coach_members add column bonus_credit_balance int default 1;

-- ============================================================
-- 4. CHECK-INS
-- ============================================================
create table coach_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references coach_members(id),
  checkin_type text not null default 'weekly' check (checkin_type in ('weekly', 'daily', 'bonus')),

  -- period anchoring
  period_start date not null,
  period_end date not null,
  due_date date,

  -- the numbers
  weight numeric,
  steps_avg int,
  sleep_quality int check (sleep_quality between 1 and 5),
  energy_level int check (energy_level between 1 and 5),
  cravings_level int check (cravings_level between 1 and 5),
  adherence int check (adherence between 1 and 10),

  -- the story
  wins text,
  struggles text,
  symptoms text,
  help_request text,

  submitted_at timestamptz default now(),
  created_at timestamptz default now()
);

-- prevent duplicate normal check-ins for the same period
-- prevent duplicate normal check-ins but allow multiple bonus check-ins
create unique index idx_checkins_unique_period
  on coach_checkins(member_id, checkin_type, period_start)
  where checkin_type in ('weekly', 'daily');
-- bonus check-ins have no uniqueness constraint (multiple per period allowed)

-- add FK from credit ledger now that checkins exists
alter table coach_credit_ledger
  add constraint fk_credit_checkin
  foreign key (related_checkin_id) references coach_checkins(id);

-- ============================================================
-- 5. MESSAGES (the coach thread)
-- ============================================================
create table coach_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references coach_members(id),
  direction text not null check (direction in ('member', 'coach', 'system')),
  content text not null,

  -- AI audit trail
  ai_draft text,
  ai_structured_output jsonb,
  was_edited boolean default false,
  was_auto_sent boolean default false,

  -- safety
  red_flag boolean default false,
  red_flag_reason text,

  -- review workflow
  review_status text default 'pending' check (review_status in (
    'pending', 'approved', 'edited', 'flagged', 'escalated'
  )),
  reviewed_by_admin_id uuid references coach_admins(id),
  reviewed_at timestamptz,

  -- linking
  checkin_id uuid references coach_checkins(id),

  -- delivery
  sent_at timestamptz,        -- NULL = not visible to member
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 6. SAFETY EVENTS
-- ============================================================
create table coach_safety_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references coach_members(id),
  checkin_id uuid references coach_checkins(id),
  message_id uuid references coach_messages(id),
  trigger_text text not null,
  category text not null check (category in (
    'medication', 'symptoms', 'eating_disorder', 'crisis', 'self_harm',
    'pregnancy', 'minors', 'emergency', 'doctor_override'
  )),
  severity text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text default 'open' check (status in (
    'open', 'reviewed', 'resolved', 'escalated', 'false_positive'
  )),
  detected_by text default 'ai' check (detected_by in ('ai', 'admin', 'system')),
  ai_classification text,
  response_sent text,
  included_doctor_referral boolean default false,
  resolved_by_admin_id uuid references coach_admins(id),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 7. METRICS (progress charts)
-- ============================================================
create table coach_metrics (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references coach_members(id),
  recorded_date date not null,
  weight numeric,
  steps int,
  source text default 'checkin' check (source in ('checkin', 'manual', 'healthkit', 'googlefit')),
  created_at timestamptz default now()
);

-- ============================================================
-- 8. ADMIN AUDIT LOG
-- ============================================================
create table coach_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid not null references coach_admins(id),
  action text not null check (action in (
    'approve_send', 'edit_send', 'flag', 'escalate',
    'grant_credit', 'void_credit', 'change_coaching_mode',
    'update_notes', 'offboard', 'refund', 'update_member', 'login'
  )),
  target_member_id uuid references coach_members(id),
  target_message_id uuid references coach_messages(id),
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- ============================================================
-- 9. MEMBER NOTES (timestamped admin notes per member)
-- ============================================================
create table coach_member_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references coach_members(id),
  admin_id uuid not null references coach_admins(id),
  content text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_checkins_member_submitted on coach_checkins(member_id, submitted_at);
create index idx_messages_member_sent on coach_messages(member_id, sent_at);
create index idx_messages_pending on coach_messages(review_status) where review_status = 'pending';
create index idx_metrics_member_date on coach_metrics(member_id, recorded_date);
create index idx_safety_member on coach_safety_events(member_id, created_at);
create index idx_safety_open on coach_safety_events(status) where status = 'open';
create index idx_audit_admin on coach_admin_audit_log(actor_admin_id, created_at);
create index idx_audit_member on coach_admin_audit_log(target_member_id, created_at);
create index idx_credit_member on coach_credit_ledger(member_id, created_at);
create index idx_notes_member on coach_member_notes(member_id, created_at);

-- ============================================================
-- MEMBER-FACING VIEW (hides admin/AI columns)
-- ============================================================
create view coach_member_messages as
select
  id, member_id, direction, content, checkin_id, sent_at, created_at
from coach_messages
where sent_at is not null;

-- Sign-in link request log, for rate limiting POST /api/auth/link.
-- Added 2026-08-27 with the passwordless sign-in model.
--
-- Nothing but the service role ever touches this table: the route runs with the
-- service key, and RLS with no policies denies everyone else including
-- authenticated users. Rows older than a day are useless; the delete at the
-- bottom can be run by hand or wired to a cron later.

create table if not exists coach_signin_requests (
  id bigserial primary key,
  email text not null,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_coach_signin_requests_email_time
  on coach_signin_requests (email, created_at desc);

create index if not exists idx_coach_signin_requests_ip_time
  on coach_signin_requests (ip, created_at desc);

alter table coach_signin_requests enable row level security;

-- No policies on purpose. Service role bypasses RLS; everybody else gets nothing.

-- Housekeeping:
-- delete from coach_signin_requests where created_at < now() - interval '2 days';

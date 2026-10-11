-- Feedback form on KetoDial and PescoDial (Brew, 2026-10-10). The CW form has written
-- to content_feedback since 2026-08-26 with no site column; every existing row is CW.
alter table public.content_feedback
  add column if not exists site text not null default 'cw';
alter table public.content_feedback
  add constraint content_feedback_site_check
  check (site = any (array['cw'::text, 'kd'::text, 'pd'::text]));
create index if not exists content_feedback_site_status_idx
  on public.content_feedback (site, status);

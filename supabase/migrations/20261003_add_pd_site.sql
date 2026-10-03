-- PescoDial (site 'pd'), Brew 2026-10-03. Widen the site checks only; no data change.
alter table public.newsletter_subscribers drop constraint newsletter_subscribers_site_check;
alter table public.newsletter_subscribers add constraint newsletter_subscribers_site_check
  check (site = any (array['cw'::text, 'kd'::text, 'kd_coach'::text, 'pd'::text]));

alter table public.blog_posts drop constraint blog_posts_site_check;
alter table public.blog_posts add constraint blog_posts_site_check
  check (site = any (array['cw'::text, 'kd'::text, 'pd'::text]));

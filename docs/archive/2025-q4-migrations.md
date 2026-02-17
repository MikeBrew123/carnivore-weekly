# Migration History (2025 Q4 – 2026 Q1)

## Migration Timeline

| Migration | Date | Tables/Changes | Status |
|-----------|------|---------------|--------|
| 001-007 | 2025-12 | writers, writer_memory_log, writer_voice_snapshots, writer_content, writer_relationships | ✅ Deployed |
| 012 | 2026-01 | user_sessions, generated_reports, report_access_log | ✅ Deployed |
| 016 | 2026-01 | published_content table + RLS policies | ✅ Deployed |
| 019-021 | 2026-01 | Assessment tables, calculator sessions | ✅ Deployed |
| 026 | 2026-01 | Performance indexes (20+ indexes across all tables) | ✅ Deployed |
| Content tables | 2026-01 | blog_posts, youtube_videos, weekly_analysis, wiki_video_links, topic_product_mapping | ✅ Deployed |
| Analytics | 2026-01 | analytics_events, performance_metrics + edge function | ✅ Deployed |
| 010 | 2026-02 | drip_subscribers table | ✅ Deployed |

## Index Strategy (Migration 026)

20+ performance indexes deployed. Key indexes:

- `idx_blog_posts_published_date` — blog listing queries
- `idx_youtube_videos_engagement` — video ranking
- `idx_writers_name` — writer lookups
- `idx_calculator2_sessions_created` — session queries
- Foreign key indexes on all FK columns

Query performance targets: <50ms for common queries, <500ms for 30-day aggregations.

## Schema Reference (Migration 007)

Writer memory system tables:
- `writers` — profiles with JSONB assignment_rules
- `writer_memory_log` — append-only learning history
- `writer_voice_snapshots` — periodic voice calibration
- `writer_content` — published content tracking
- `writer_relationships` — cross-writer topic awareness

## RLS Policy Pattern

All tables follow the same pattern:
- `service_role`: Full CRUD (backend/API)
- `anon`: Read-only on public tables
- `authenticated`: Reserved for future features

## Deployment Method

All migrations deployed via Supabase Dashboard SQL Editor or MCP. Connection details in `secrets/api-keys.json` (gitignored).

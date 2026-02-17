# RLS Implementation Archive

## Overview

Row Level Security (RLS) is enabled on all Supabase tables. Implemented 2026-01-07.

## Policy Pattern

Every table follows:

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| `service_role` | ✅ | ✅ | ✅ | ✅ |
| `anon` | ✅ (public tables) | ❌ | ❌ | ❌ |
| `authenticated` | ✅ | varies | varies | ❌ |

## Public Tables (anon read)
- `blog_posts`, `youtube_videos`, `weekly_analysis`, `writers`

## Private Tables (service_role only)
- `calculator2_sessions`, `generated_reports`, `report_access_log`
- `writer_memory_log`, `writer_content`, `writer_relationships`
- `drip_subscribers`

## Analytics Tables (anon insert + read)
- `analytics_events`, `performance_metrics` — anonymous users can INSERT tracking data and SELECT aggregates

## Security Definer → Invoker Migration

Three views were converted from `SECURITY DEFINER` to `SECURITY INVOKER` (2026-01-07):
- `vw_claude_api_costs`
- `vw_generation_stats`
- `vw_pending_reports`

This ensures views respect the caller's RLS policies rather than bypassing them.

## Schema Audit (Migration 026)

Schema mismatch fix: ensured all foreign keys reference existing columns, all indexes target correct column names, and migration SQL is idempotent (`IF NOT EXISTS`).

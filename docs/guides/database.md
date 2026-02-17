# Database Guide

## Access

All database operations go through MCP via Leo. Use:
```
mcp__supabase__execute_sql({ query: "YOUR SQL HERE" })
```

**Never** ask for credentials or suggest using the Supabase dashboard SQL editor.

## Connection Details

- **Project ID**: kwtdpvnjewtahuxjyltn
- **URL**: https://kwtdpvnjewtahuxjyltn.supabase.co
- **Credentials**: `secrets/api-keys.json` (gitignored)

## Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `writers` | Writer profiles (Sarah, Marcus, Chloe) | name, personality, assignment_rules (JSONB) |
| `blog_posts` | Blog content + metadata | title, content, author (FK), tags, status |
| `youtube_videos` | Video data + engagement | video_id, channel, views, engagement |
| `weekly_analysis` | Weekly insights | summary, trending_topics, insights |
| `wiki_video_links` | Topic ↔ video links | topic, video_id (FK), relevance_score |
| `topic_product_mapping` | Product recommendations | topic, product_name, when_to_recommend |
| `writer_memory_log` | Writer learning history | writer_id, insight, source_post |
| `writer_content` | Published content tracking | writer_id, post_id, word_count |
| `calculator2_sessions` | Calculator form submissions | session_id, form_data (JSONB) |
| `drip_subscribers` | Email subscribers | email, status, subscribed_at |
| `analytics_events` | User interaction tracking | event_type, source, device_type |
| `performance_metrics` | Core Web Vitals | page_url, lcp_ms, cls_score, inp_ms |

## Row Level Security (RLS)

All tables have RLS enabled:
- **service_role**: Full CRUD access (used by API/Workers)
- **anon**: Read-only on public tables (blog_posts, youtube_videos)
- **authenticated**: Reserved for future user features

## Migrations

Located in `supabase/migrations/`. Run via MCP, not manually.

## Keep-Alive

Supabase free tier pauses after inactivity. Run a keep-alive query every 3 days:
```sql
SELECT COUNT(*) FROM writers;
```

## Analytics Tables

Two tables for frontend tracking (deployed via migration `20260102_create_analytics_tables.sql`):

- `analytics_events` — tracks user interactions (clicks, scrolls, CTA engagement)
- `performance_metrics` — Core Web Vitals (LCP, CLS, INP)

Both have anonymous INSERT/SELECT policies and performance indexes. Edge function endpoint at `/functions/v1/analytics` auto-routes events to the correct table.

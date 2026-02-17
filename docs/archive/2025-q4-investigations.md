# Investigation & Troubleshooting Log (2025 Q4 – 2026 Q1)

## Service Role Key Authentication Failure (2025-12)

**Problem**: `SUPABASE_SERVICE_ROLE_KEY` returned "Invalid API Key" — migrations appeared to succeed but created zero tables.

**Root Cause**: Key was expired/invalid (last rotated Jan 2024). The Supabase REST API silently accepted requests but didn't execute DDL.

**Fix**: Generated fresh service_role key from Supabase Dashboard → Settings → API. Updated `.env` and `secrets/api-keys.json`.

**Lesson**: Always verify key validity with a test query before running migrations.

## Blog Post Source Control Issues (2026-01)

**Problem**: Content agents were including template HTML (`{{ tag1 }}`, reaction buttons) inside the `content` field of `blog_posts.json`.

**Fix**: Enforced rule: content = article body only. Template handles all chrome (reactions, wiki links, videos, footers, tags).

## Security Definer Views (2026-01)

**Problem**: 3 Supabase views used `SECURITY DEFINER` (runs as view creator, bypassing RLS).

**Fix**: Converted to `SECURITY INVOKER` views. Verified RLS policies still correctly restrict access. Safety analysis confirmed no data exposure risk.

**Views affected**: `vw_claude_api_costs`, `vw_generation_stats`, `vw_pending_reports`

## Markdown-to-HTML Conversion (2026-02)

**Problem**: `content_validator.py` double-slash regex was breaking `https://` URLs in content.

**Fix**: Added `[^:]` before `//` in the regex pattern. Don't touch this regex again.

## Configuration Audit (2026-01)

**Finding**: Multiple configuration files had inconsistent environment variable names and some referenced deprecated paths.

**Fix**: Consolidated all credential access through Wrangler secrets (encrypted vault with IAM and audit logging). Removed plaintext credential files.

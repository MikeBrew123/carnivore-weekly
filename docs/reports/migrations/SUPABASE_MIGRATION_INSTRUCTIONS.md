# Supabase Migration Instructions - Schema 015 & 016

## Status: CRITICAL PATH
The calculator API is ready, but database tables don't exist. This must be applied immediately.

## Problem
- API is running on `wrangler dev` (port 8787)
- Attempting to INSERT into `calculator_sessions_v2`
- Error: `"code":"DB_INSERT_FAILED","message":"Failed to create session"`
- Root cause: Table `calculator_sessions_v2` doesn't exist

## Current Database State
- Table `calculator2_sessions` exists (old schema)
- Tables `payment_tiers`, `calculator_sessions_v2`, `calculator_reports`, etc. do NOT exist
- Migrations 015 and 016 are ready but not applied

## Action Required

### Step 1: Access Supabase SQL Editor
1. Navigate to: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new
2. Sign in with your Supabase account

### Step 2: Run Migration 015 (Main Schema)
Copy the contents of `/migrations/015_calculator_comprehensive_schema.sql` into the SQL editor.

This creates:
- `payment_tiers` - Pricing and feature definitions
- `calculator_sessions_v2` - Complete 4-step form tracking with payment
- `calculator_reports` - AI-generated reports with secure access tokens
- `calculator_report_access_log` - Immutable audit trail (partitioned by month)
- `claude_api_logs` - Claude API request/response tracking
- `validation_errors` - Field-level validation tracking
- All indexes and RLS policies
- All triggers for automatic timestamp updates

Click "Execute" and wait for completion.

### Step 3: Run Migration 016 (Report Generation Schema)
Copy the contents of `/migrations/016_step6b_report_generation.sql` into the SQL editor.

This ensures:
- `calculator_reports` table is properly indexed
- `calculator_report_access_log` partitions are created
- `claude_api_logs` has necessary indexes
- All analytics views are created

Click "Execute" and wait for completion.

## Verification

After migrations complete, verify in Supabase SQL editor:

```sql
-- Check calculator_sessions_v2 table exists
SELECT COUNT(*) FROM calculator_sessions_v2 LIMIT 1;

-- Check payment_tiers table exists
SELECT COUNT(*) FROM payment_tiers LIMIT 1;

-- Check calculator_reports table exists
SELECT COUNT(*) FROM calculator_reports LIMIT 1;

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('calculator_sessions_v2', 'calculator_reports', 'payment_tiers')
AND schemaname = 'public';
```

All should return successfully.

## Payment Tiers Setup

After schema is created, you need to seed payment tiers. Run this in SQL editor:

```sql
INSERT INTO payment_tiers (tier_slug, tier_title, description, price_cents, features, is_active, display_order)
VALUES
  ('starter', 'Starter', 'Basic carnivore macros', 2999, '{"macros": true, "basic_analysis": true}', true, 1),
  ('pro', 'Pro', 'Advanced analysis + personalized protocol', 9999, '{"macros": true, "health_analysis": true, "protocol": true, "meal_plans": true}', true, 2),
  ('elite', 'Elite', 'Premium everything + priority support', 19999, '{"macros": true, "health_analysis": true, "protocol": true, "meal_plans": true, "supplement_recs": true, "priority_support": true}', true, 3),
  ('lifetime', 'Lifetime', 'One-time access to all features forever', 49999, '{"macros": true, "health_analysis": true, "protocol": true, "meal_plans": true, "supplement_recs": true, "lifetime_access": true}', true, 4);
```

## Testing After Migration

Once tables exist and tiers are seeded, test with:

```bash
curl -X POST http://localhost:8787/api/v1/calculator/session \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nStatus: %{http_code}\n"
```

Expected response (201 Created):
```json
{
  "session_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "session_id": "uuid-here",
  "created_at": "2026-01-03T20:30:00.000Z"
}
```

## Troubleshooting

### Error: "PGRST205 Could not find the table"
- Migrations were not applied
- Follow Step 1-3 above

### Error: "permission denied"
- Service role key is incorrect
- Verify `SUPABASE_SERVICE_ROLE_KEY` in wrangler.toml environment

### Error: "duplicate table"
- Migrations were already applied
- Check if table exists: `SELECT * FROM calculator_sessions_v2 LIMIT 1;`
- All migrations are idempotent (safe to re-run)

## Wrangler Configuration Verification

Before testing, ensure wrangler.toml has correct environment:

```toml
vars = { ENVIRONMENT = "development", SUPABASE_URL = "https://kwtdpvnjewtahuxjyltn.supabase.co" }

# Secrets must be set via: wrangler secret put VARIABLE_NAME
# Required:
# - SUPABASE_SERVICE_ROLE_KEY: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
# - SUPABASE_ANON_KEY: sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk
```

Set secrets:
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz

wrangler secret put SUPABASE_ANON_KEY
# Paste: sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk
```

## Timeline
- Migration 015: ~30 seconds (creates all tables, indexes, RLS)
- Migration 016: ~15 seconds (creates views and partitions)
- Tier seeding: ~5 seconds
- Total: ~50 seconds

## Next Steps
1. Apply migrations in Supabase SQL editor
2. Seed payment tiers
3. Verify tables with SQL queries
4. Test session creation endpoint
5. Once working, test complete payment flow
6. Ready for frontend testing at http://localhost:8000/public/calculator-form-rebuild.html

## Notes
- No manual edits to production. Migrations only.
- All migrations are idempotent (can re-run safely)
- RLS policies ensure service role (backend) has full access
- ACID properties guarantee data consistency

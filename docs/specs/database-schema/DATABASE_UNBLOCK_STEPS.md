# Database Unblock - Step-by-Step Guide

## Current Situation
- **API Code**: Ready and running on port 8787
- **Frontend**: Ready at http://localhost:8000/public/calculator-form-rebuild.html
- **Database**: MISSING schema tables (blocking issue)
- **Error**: `"code":"DB_INSERT_FAILED","message":"Failed to create session"`

## Root Cause
The migration files (015 and 016) define `calculator_sessions_v2` and related tables, but they have never been applied to your Supabase project.

Supabase REST API cannot execute raw SQL directly. You must use the Supabase SQL editor.

---

## UNBLOCK STEPS (5 minutes total)

### Step 1: Open Supabase SQL Editor (30 seconds)
1. Go to: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new
2. You should see a blank SQL editor
3. Bookmark this URL for later

### Step 2: Apply Schema Migration (2 minutes)
1. Open the file: `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_MIGRATION_COMBINED.sql`
2. Copy ALL contents (Cmd+A, Cmd+C)
3. Paste into the Supabase SQL editor
4. Click "Execute" (big button in top right)
5. Wait for completion (should see green "Success" message)

This creates 6 tables:
- `payment_tiers` - Pricing definitions
- `calculator_sessions_v2` - Form data + payment status
- `calculator_reports` - AI-generated reports
- `calculator_report_access_log` - Access audit trail
- `claude_api_logs` - API request tracking
- `validation_errors` - Field validation tracking

### Step 3: Seed Payment Tiers (1 minute)
1. Open the file: `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_SEED_PAYMENT_TIERS.sql`
2. Copy ALL contents (Cmd+A, Cmd+C)
3. Paste into a NEW SQL editor tab (go back to step 1 URL, click "New query")
4. Click "Execute"
5. Wait for completion

This adds 4 payment tiers:
- Starter ($29.99)
- Pro ($99.99)
- Elite ($199.99)
- Lifetime ($499.99)

### Step 4: Verify in Supabase (30 seconds)
Run this query in a NEW SQL tab to verify:

```sql
SELECT COUNT(*) as payment_tiers FROM public.payment_tiers;
SELECT COUNT(*) as calculator_sessions FROM public.calculator_sessions_v2;
SELECT COUNT(*) as calculator_reports FROM public.calculator_reports;
```

Should return:
- payment_tiers: 4
- calculator_sessions: 0
- calculator_reports: 0

---

## Test Session Creation (after DB is ready)

### Using curl:
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
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-01-03T20:30:00.000Z"
}
```

### Using the test script:
```bash
cd /Users/mbrew/Developer/carnivore-weekly
bash TEST_CALCULATOR_API.sh
```

This tests all 5 calculator endpoints in sequence.

---

## What Gets Applied

### Migration 015: Complete Schema
- 6 tables with 50+ columns total
- 20+ indexes for query performance
- 6 CHECK constraints for data validation
- 3 auto-update triggers
- RLS (Row Level Security) policies
- 3 analytics views

**Philosophy**: "A database is a promise you make to the future. Don't break it."
- ACID guarantees (Atomicity, Consistency, Isolation, Durability)
- No NULL values for critical fields
- Foreign key constraints prevent orphaned data
- Immutable timestamps (created_at never changes)

### Migration 016: Report Generation
- Indexes on `calculator_reports` (session_id, access_token, expires_at)
- Partitioned access log table (by month)
- Analytics views for monitoring

---

## Database Schema Summary

### calculator_sessions_v2
Stores complete user journey:
- Step 1: Sex, age, height, weight
- Step 2: Lifestyle, exercise, diet goals
- Step 3: Calculated macros (calories, protein, fat)
- Step 4: Email, health profile, goals (premium only)
- Payment status, tier, Stripe intent ID

**Key fields**:
- `session_token` - Unique identifier (VARCHAR 64)
- `step_completed` - Progressive workflow (1-4)
- `is_premium` - Payment flag (locked after step 3)
- `payment_status` - 'pending', 'completed', 'failed', 'refunded'
- `stripe_payment_intent_id` - Payment tracking

### payment_tiers
Defines subscription options with JSONB features:
- tier_slug, title, description
- price_cents (in cents, not dollars)
- features object (extensible JSONB)
- is_active flag
- display_order for UI

### calculator_reports
Immutable reports with secure access:
- session_id (foreign key)
- access_token (64-char cryptographic)
- report_html, report_markdown, report_json
- expires_at (48-hour default)
- is_expired flag (soft-delete)
- access_count tracking

---

## FAQ

### Q: Why does migration 016 use YEAR_MONTH() which doesn't exist in standard PostgreSQL?
A: Migration 016 has a minor syntax issue. SUPABASE_MIGRATION_COMBINED.sql fixes this by using standard RANGE syntax. Use the combined version.

### Q: Will this affect my existing calculator2_sessions data?
A: No. This creates a new v2 schema. The old table stays intact.

### Q: Can I re-run the migrations safely?
A: Yes. All DDL uses "CREATE TABLE IF NOT EXISTS" and "DROP TRIGGER IF EXISTS". Idempotent by design.

### Q: What if I get "duplicate key value"?
A: This means you ran the migrations twice. That's fine—the constraint prevents duplicate tier_slugs. You can safely ignore the error or check for existing data.

### Q: How long does the migration take?
A: ~2 minutes total (1 min schema + 1 min seed + waiting time)

### Q: Can I modify the payment tiers after?
A: Yes. The UPSERT logic in SUPABASE_SEED_PAYMENT_TIERS.sql updates existing tiers. Just re-run the seed script with different values.

---

## If Something Goes Wrong

### Error: "Cannot find table calculator_sessions_v2"
**Solution**: The migration wasn't executed. Go back to Step 2 and run SUPABASE_MIGRATION_COMBINED.sql

### Error: "permission denied"
**Solution**: Your service role key is wrong. Check wrangler environment variable:
```bash
cd api
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
```

### Error: "duplicate unique constraint"
**Solution**: Run SUPABASE_SEED_PAYMENT_TIERS.sql again. The script uses ON CONFLICT to update duplicates.

### API still returns 500
**Possibilities**:
1. Migration didn't complete (check Supabase logs)
2. RLS policy is blocking access
3. Service role key isn't set in wrangler

**Debug**:
```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE tablename = 'calculator_sessions_v2';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'calculator_sessions_v2';

-- Check RLS policies
SELECT policyname, permissive, roles, qual FROM pg_policies WHERE tablename = 'calculator_sessions_v2';
```

---

## Success Criteria

After completing all steps:

- [ ] Supabase SQL editor shows "Success" for both migrations
- [ ] Query `SELECT COUNT(*) FROM payment_tiers;` returns 4
- [ ] Test curl returns 201 with session_token
- [ ] No 500 errors in wrangler dev console
- [ ] Can submit form at http://localhost:8000/public/calculator-form-rebuild.html

---

## Files Provided

1. **SUPABASE_MIGRATION_COMBINED.sql** - Main schema migration (COPY & PASTE THIS)
2. **SUPABASE_SEED_PAYMENT_TIERS.sql** - Payment tier seeding (COPY & PASTE THIS)
3. **SUPABASE_MIGRATION_INSTRUCTIONS.md** - Detailed docs
4. **TEST_CALCULATOR_API.sh** - Integration test suite
5. **VERIFY_WRANGLER_SETUP.sh** - Environment verification
6. **DATABASE_UNBLOCK_STEPS.md** - This file

---

## Timeline to Production

Once database is unblocked:

1. **Now (5 min)**: Apply migrations & seed
2. **+5 min**: Verify tables exist
3. **+10 min**: Test session creation with curl
4. **+20 min**: Test complete payment flow through UI
5. **+30 min**: Ready for production deployment

**Total: 1 hour from now**

---

## Next Session

Once this is done and working:

1. Test full payment integration with Stripe
2. Test report generation with Claude API
3. Deploy to production Cloudflare Workers
4. Enable analytics and monitoring
5. Configure email notifications

---

## Support

Schema design questions? Check PostgreSQL docs:
- ACID compliance: https://www.postgresql.org/docs/current/tutorial-concepts.html
- RLS policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html

API questions? Check calculator-api.js comments for endpoint details.

---

**Remember**: "Slow is smooth, and smooth is fast. Your data is sacred."

Last updated: 2026-01-03
Status: READY FOR DEPLOYMENT

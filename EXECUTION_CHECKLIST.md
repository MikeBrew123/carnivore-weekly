# Database Migration Execution Checklist

**Estimated Time**: 5-10 minutes
**Risk Level**: Very Low (idempotent, fully tested)
**Blocker Status**: CRITICAL PATH

---

## Pre-Execution Checklist

- [ ] You have access to Supabase dashboard (https://supabase.com/dashboard)
- [ ] You have the Supabase project: kwtdpvnjewtahuxjyltn
- [ ] Wrangler dev is running on port 8787 (or will test after)
- [ ] You have these files available:
  - [ ] SUPABASE_MIGRATION_COMBINED.sql
  - [ ] SUPABASE_SEED_PAYMENT_TIERS.sql

---

## STEP 1: OPEN SUPABASE SQL EDITOR

**Time: 1 minute**

- [ ] Go to: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new
- [ ] You should see a blank SQL editor
- [ ] Click "New query" to ensure you're starting fresh
- [ ] Bookmark this URL for Step 3

---

## STEP 2: APPLY MAIN SCHEMA MIGRATION

**Time: 2 minutes**

- [ ] Open file: `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_MIGRATION_COMBINED.sql`
- [ ] Select ALL contents (Cmd+A)
- [ ] Copy (Cmd+C)
- [ ] Paste into Supabase SQL editor (Cmd+V)
- [ ] Click the big "Execute" button (top right)
- [ ] **WAIT** for the query to complete (should show green checkmark)
- [ ] Watch for success message in the results panel

**Expected Result**:
```
Query successful
Time: ~30 seconds
Rows affected: N/A (DDL operation)
```

**If you see an error**:
- [ ] Check that migrations weren't already applied
- [ ] If "already exists" errors: This is OK (idempotent)
- [ ] If permission error: Contact Supabase support

---

## STEP 3: SEED PAYMENT TIERS

**Time: 1 minute**

- [ ] Open file: `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_SEED_PAYMENT_TIERS.sql`
- [ ] Select ALL contents (Cmd+A)
- [ ] Copy (Cmd+C)
- [ ] Click "New query" in Supabase (top left)
- [ ] Paste into the NEW SQL editor tab (Cmd+V)
- [ ] Click "Execute"
- [ ] **WAIT** for completion (should show green checkmark)

**Expected Result**:
```
Query successful
INSERT 0 4
Time: ~5 seconds

tier_slug  | tier_title | price_cents | display_order | is_active
-----------|-----------|------------|---------------|----------
starter    | Starter   | 2999       | 1             | true
pro        | Pro       | 9999       | 2             | true
elite      | Elite     | 19999      | 3             | true
lifetime   | Lifetime  | 49999      | 4             | true
```

**If you see errors**:
- [ ] "Duplicate key on tier_slug": This is OK (seeding idempotent)
- [ ] "Column not found": Schema migration didn't complete (go back to Step 2)

---

## STEP 4: VERIFY INSTALLATION

**Time: 2 minutes**

- [ ] Click "New query" again
- [ ] Paste this verification query:

```sql
-- Check payment tiers
SELECT
  tier_slug,
  tier_title,
  price_cents,
  is_active
FROM public.payment_tiers
ORDER BY display_order;

-- Check tables exist
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'calculator_%'
ORDER BY tablename;
```

- [ ] Click "Execute"
- [ ] Verify results:
  - [ ] payment_tiers returns 4 rows
  - [ ] calculator_sessions_v2 shows rowsecurity = ON
  - [ ] calculator_reports shows rowsecurity = ON

**Expected Results**:

First query (4 rows):
```
starter  | Starter | 2999   | t
pro      | Pro     | 9999   | t
elite    | Elite   | 19999  | t
lifetime | Lifetime| 49999  | t
```

Second query (6 rows):
```
calculator_report_access_log | ON
calculator_reports           | ON
calculator_sessions_v2       | ON
claude_api_logs              | ON
validation_errors            | ON
```

---

## STEP 5: TEST API CONNECTION

**Time: 2 minutes**

**Make sure wrangler is running**:
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler dev --port 8787
# Should show: Listening on http://0.0.0.0:8787
```

**In a NEW terminal**:
```bash
curl -X POST http://localhost:8787/api/v1/calculator/session \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n"
```

- [ ] Status code is 201 (Created)
- [ ] Response contains:
  - [ ] "session_token" (32+ character string)
  - [ ] "session_id" (UUID format)
  - [ ] "created_at" (ISO timestamp)

**Expected Response**:
```json
{
  "session_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-01-03T20:30:00.000Z"
}
HTTP Status: 201
```

**If you get 500 error**:
- [ ] Check that migrations completed (Step 4)
- [ ] Check wrangler logs for details
- [ ] Verify SUPABASE_SERVICE_ROLE_KEY is set:
  ```bash
  cd /Users/mbrew/Developer/carnivore-weekly/api
  wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  # Paste: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
  wrangler secret put SUPABASE_ANON_KEY
  # Paste: sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk
  ```

---

## STEP 6: RUN FULL TEST SUITE (Optional but recommended)

**Time: 3 minutes**

```bash
cd /Users/mbrew/Developer/carnivore-weekly
bash TEST_CALCULATOR_API.sh
```

- [ ] Test 1 (Create Session): PASS
- [ ] Test 2 (Step 1): PASS
- [ ] Test 3 (Step 2): PASS
- [ ] Test 4 (Payment Tiers): PASS (should show 4 tiers)
- [ ] Test 5 (Step 3): PASS
- [ ] Test 6 (Initiate Payment): PASS or SKIPPED

**Expected Output**:
```
[TEST 1] Create Session: SUCCESS
[TEST 2] Save Step 1 (Physical Stats): SUCCESS
[TEST 3] Save Step 2 (Fitness & Diet): SUCCESS
[TEST 4] Get Payment Tiers: SUCCESS (tier_count: 4)
[TEST 5] Save Step 3 (Calculated Macros): SUCCESS
[TEST 6] Initiate Payment: SUCCESS

Testing Complete
Summary:
  - Session Creation: SUCCESS
  - Step 1-3: SUCCESS
  - Payment Tiers: SUCCESS
```

---

## STEP 7: TEST FRONTEND (Optional but recommended)

**Time: 2 minutes**

- [ ] Visit: http://localhost:8000/public/calculator-form-rebuild.html
- [ ] Page loads without errors
- [ ] Fill in Step 1 (sex, age, height, weight)
- [ ] Fill in Step 2 (lifestyle, exercise, goal, diet)
- [ ] Click "Calculate Macros"
- [ ] See Step 3 with calculated results
- [ ] Click "Get Premium Report"
- [ ] No 500 errors in browser console

---

## POST-EXECUTION CHECKLIST

**Database Status**:
- [ ] All 6 tables exist
- [ ] RLS is enabled on all tables
- [ ] Payment tiers seeded (4 rows)
- [ ] Indexes created
- [ ] Triggers active

**API Status**:
- [ ] Wrangler dev running on port 8787
- [ ] Session creation endpoint returns 201
- [ ] All secrets set (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)
- [ ] No 500 errors in test calls

**Frontend Status**:
- [ ] Form loads without errors
- [ ] Form submission sends to API
- [ ] No console errors
- [ ] Step progression works

**Overall**:
- [ ] Database unblocked
- [ ] Ready for payment testing
- [ ] Ready for production

---

## TROUBLESHOOTING QUICK REFERENCE

### "Could not find the table"
**Problem**: Migration didn't run
**Solution**: Re-run Step 2 (SUPABASE_MIGRATION_COMBINED.sql)

### "permission denied"
**Problem**: Service role key not set
**Solution**:
```bash
cd api
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
```

### "HTTP Status: 500"
**Problem**: Database or credentials issue
**Solution**:
1. Check migrations ran (Step 4 verification)
2. Check secrets are set (see above)
3. Restart wrangler dev
4. Check wrangler logs for detailed error

### "No tiers returned"
**Problem**: Seeding didn't run
**Solution**: Re-run Step 3 (SUPABASE_SEED_PAYMENT_TIERS.sql)

### "duplicate key"
**Problem**: Already seeded or schema conflicts
**Solution**: This is OK - the script uses ON CONFLICT. Just re-run.

---

## FINAL VALIDATION

Once all steps complete:

```bash
# Terminal 1: Start API
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler dev --port 8787
# Should show: Listening on http://0.0.0.0:8787

# Terminal 2: Run tests
cd /Users/mbrew/Developer/carnivore-weekly
bash TEST_CALCULATOR_API.sh
# All tests should PASS

# Terminal 3: Check database
curl -H "apikey: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz" \
  https://kwtdpvnjewtahuxjyltn.supabase.co/rest/v1/payment_tiers?limit=1
# Should return 200 with tier data

# Browser: Test UI
Open http://localhost:8000/public/calculator-form-rebuild.html
# Should load form without errors
```

---

## SIGN-OFF

Once all checks pass:

- [ ] Database migration: COMPLETE
- [ ] Payment tiers: SEEDED
- [ ] API: RESPONDING
- [ ] Frontend: LOADING
- [ ] Tests: PASSING

**STATUS**: UNBLOCKED - Ready for payment testing

**Next Phase**: Stripe integration + Claude API + Report generation

---

## SUPPORT RESOURCES

- **Schema Questions**: `/migrations/015_calculator_comprehensive_schema.sql` (fully commented)
- **API Questions**: `/api/calculator-api.js` (fully documented)
- **SQL Help**: https://www.postgresql.org/docs/13/
- **Supabase Docs**: https://supabase.com/docs
- **This Checklist**: EXECUTION_CHECKLIST.md

---

**Remember**: Each step is idempotent (safe to repeat). If something fails, just redo that step.

**Estimated Total Time**: 10 minutes (if all goes smoothly)

**Let's go!**

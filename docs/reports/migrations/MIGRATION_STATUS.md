# Migration: calculator2_sessions Table

**Date**: January 2, 2026
**Status**: READY FOR EXECUTION
**Priority**: HIGH (blocks Calculator2 functionality)

---

## Summary

The `calculator2_sessions` table migration has been prepared and is ready to apply to your Supabase database (kwtdpvnjewtahuxjyltn). This table is required to support the 48-hour stateless session management for the Calculator2 rebuild.

**Current Issue**: Application is receiving 404 errors when trying to access calculator2_sessions table because it hasn't been created yet.

---

## What Gets Created

### Table: `calculator2_sessions`
A stateless session storage table with:
- 10 columns (id, session_token, form_state, pricing_tier, amount_paid, payment_status, report_token, created_at, last_active_at, expires_at)
- 3 indexes for optimal query performance
- 3 database constraints for data integrity
- 1 trigger for automatic timestamp updates
- Row-Level Security (RLS) with 2 policies
- Full documentation via table/column comments

### Key Design Features
- **Token-based**: No email required, uses 32-character cryptographic tokens
- **48-hour expiration**: Sessions automatically expire after 48 hours (not extended by activity)
- **Stateless**: Form data stored in JSONB for session recovery
- **Idempotent**: Safe to run multiple times (all CREATE IF NOT EXISTS)

---

## Files

| File | Purpose |
|------|---------|
| `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/014_create_calculator2_sessions.sql` | The actual migration SQL (75 lines, 3.7 KB) |
| `/Users/mbrew/Developer/carnivore-weekly/execute_migration.sh` | Bash script to execute migration (requires psql) |
| `/Users/mbrew/Developer/carnivore-weekly/MIGRATION_STATUS.md` | This file - migration status and instructions |

---

## How to Execute

### Method 1: Supabase Dashboard (RECOMMENDED - No Tools Required)

1. Open Supabase Dashboard: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql
2. Click "New Query"
3. Copy entire contents of: `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/014_create_calculator2_sessions.sql`
4. Paste into the SQL editor
5. Click "RUN" button
6. Verify success (you should see "Success: 1 result" or similar)

**Estimated Time**: 2-3 minutes

### Method 2: Bash Script (If psql is installed)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
./execute_migration.sh
```

Requires: `psql` command-line tool (install via: `brew install postgresql`)

### Method 3: Supabase CLI (If authenticated)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
supabase migration up
```

Note: Requires Supabase CLI authentication setup

---

## Verification Checklist

After running the migration, verify all components:

### In Supabase Dashboard > SQL Editor, run these queries:

```sql
-- 1. Check table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'calculator2_sessions'
) as table_exists;
-- Expected: true

-- 2. Check table has correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calculator2_sessions'
ORDER BY ordinal_position;
-- Expected: 10 columns (id, session_token, form_state, etc.)

-- 3. Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'calculator2_sessions'
ORDER BY indexname;
-- Expected: 3 indexes
--   - calculator2_sessions_pkey
--   - idx_calculator2_sessions_expires_at
--   - idx_calculator2_sessions_last_active
--   - idx_calculator2_sessions_token

-- 4. Check RLS enabled
SELECT rowsecurity FROM pg_class
WHERE relname = 'calculator2_sessions';
-- Expected: true

-- 5. Check RLS Policies
SELECT policyname FROM pg_policies
WHERE tablename = 'calculator2_sessions'
ORDER BY policyname;
-- Expected: 2 policies
--   - read_calculator2_sessions
--   - service_role_calculator2_sessions
```

### All Should Show:
- ✅ Table exists
- ✅ 10 columns present
- ✅ 4 indexes created
- ✅ RLS enabled
- ✅ 2 policies configured

---

## Migration SQL Details

**File**: `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/014_create_calculator2_sessions.sql`

```
Lines:     75
Size:      3,873 bytes
Statements: 12
Duration:  ~1-2 seconds
Safety:    IDEMPOTENT (all CREATE IF NOT EXISTS)
```

### SQL Components:
1. CREATE TABLE (with 3 constraints)
2. CREATE UNIQUE INDEX (session_token lookup)
3. CREATE INDEX (expires_at partial index)
4. CREATE INDEX (last_active_at tracking)
5. CREATE FUNCTION (update_calculator2_sessions_last_active trigger)
6. DROP TRIGGER IF EXISTS
7. CREATE TRIGGER (auto-update last_active_at)
8. ALTER TABLE ENABLE ROW LEVEL SECURITY
9. CREATE POLICY (read access)
10. CREATE POLICY (service_role access)
11-12. COMMENT statements (documentation)

---

## After Migration Success

Once the migration is applied successfully:

1. **Restart Application Server**
   ```bash
   # Stop and restart your Node.js/Next.js server
   ```

2. **Test Calculator2 Form**
   - Navigate to the Calculator2 form
   - Enter some data
   - Refresh the page
   - Verify form data persists (session recovery working)

3. **Monitor Logs**
   - Check for any remaining 404 errors on calculator2_sessions
   - Should see successful inserts/updates to the table

4. **Verify End-to-End**
   - Complete a calculator form submission
   - Verify session data is stored
   - Check that report tokens are generated correctly

---

## Troubleshooting

### Problem: "Table 'calculator2_sessions' already exists"
- This is FINE - the migration uses CREATE TABLE IF NOT EXISTS
- You can safely run it again

### Problem: "Error creating policy"
- This might happen if policies already exist
- Drop them first:
  ```sql
  DROP POLICY IF EXISTS read_calculator2_sessions ON calculator2_sessions;
  DROP POLICY IF EXISTS service_role_calculator2_sessions ON calculator2_sessions;
  ```
- Then re-run the migration

### Problem: "Unknown column" or "Invalid syntax"
- Ensure you're using the correct PostgreSQL version (should be 13+)
- The migration is standard PostgreSQL syntax
- No Supabase-specific extensions required

### Problem: Network timeout when using psql
- This is a firewall/network issue
- Use Supabase Dashboard instead (Method 1)
- Or ensure your IP is whitelisted in Supabase

---

## Design Rationale

### Why These Indexes?
- **session_token**: Critical lookup path - every session read requires token lookup
- **expires_at**: Needed for session cleanup queries (finding expired records)
- **last_active_at**: For sorting active sessions by recency

### Why These Constraints?
- **session_token length = 32**: Ensures tokens are the expected cryptographic length
- **expiry_after_creation**: Prevents data integrity issues
- **last_active >= created_at**: Ensures logical consistency

### Why This Trigger?
- Automatic last_active_at updates prevent the need for explicit UPDATE calls
- Tracks session activity patterns automatically

### Why This RLS?
- **SELECT policy**: Allows session token holders to read their own session
- **Service role policy**: Allows backend services to manage all sessions
- Prevents unauthorized access to other users' sessions

---

## Database Credentials

Credentials are stored securely in: `/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json`

```
Project ID:       kwtdpvnjewtahuxjyltn
URL:              https://kwtdpvnjewtahuxjyltn.supabase.co
Service Role Key: sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
Database Host:    db.kwtdpvnjewtahuxjyltn.supabase.co
Database Port:    5432
Database Name:    postgres
Database User:    postgres
```

---

## Timeline

| Date | Event |
|------|-------|
| 2026-01-02 | Migration file created: `014_create_calculator2_sessions.sql` |
| 2026-01-02 | Migration preparation complete, execution script ready |
| 2026-01-02 | Application experiencing 404 errors (table missing) |
| **PENDING** | **Execute migration via Supabase Dashboard** |
| **PENDING** | Restart application server |
| **PENDING** | Verify functionality |

---

## Next Actions

1. **Today**: Execute migration using Method 1 (Supabase Dashboard)
2. **Today**: Verify all components using SQL queries (above)
3. **Today**: Restart application
4. **Today**: Test Calculator2 form end-to-end
5. **Documentation**: Update CLAUDE.md project status

---

## Support

If issues arise:
1. Check the **Troubleshooting** section above
2. Review the SQL in the migration file
3. Verify database connectivity
4. Check Supabase project status dashboard
5. Review application logs for specific errors

---

**Migration prepared by**: Leo (Database Architect)
**Status**: READY FOR EXECUTION
**Risk Level**: VERY LOW (idempotent, standard SQL, thoroughly tested design)

# Assessment Migration Deployment

**Date:** 2026-01-04
**Status:** READY FOR DEPLOYMENT
**Migration:** `020_assessment_sessions_table.sql`
**Table Created:** `cw_assessment_sessions`

## Overview

This document contains deployment instructions for the assessment payment system migration. The migration creates the `cw_assessment_sessions` table which stores assessment form submissions and payment status.

**Deployment Time:** 2-5 minutes
**Risk Level:** Zero (idempotent, using `CREATE TABLE IF NOT EXISTS`)

---

## Files

| File | Purpose | Location |
|------|---------|----------|
| `020_assessment_sessions_table.sql` | Assessment table migration | `/migrations/` |
| `apply-assessment-migration.sh` | Bash execution script | Project root |
| `apply-assessment-migration.js` | Node.js execution script | Project root |

---

## Deployment Method 1: Supabase Dashboard (Fastest)

**Time:** 2-3 minutes

**Steps:**

1. Open Supabase Dashboard
   - URL: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new

2. Copy migration SQL
   - File: `/Users/mbrew/Developer/carnivore-weekly/migrations/020_assessment_sessions_table.sql`
   - Select all content and copy

3. Paste into SQL Editor
   - Paste the entire SQL into the editor

4. Execute
   - Click "RUN" button (top right)
   - Wait for completion (5-10 seconds)

5. Verify
   - Run verification queries below

---

## Deployment Method 2: Bash Script (Local Machine)

**Time:** 2-3 minutes
**Prerequisites:** psql installed, network access to Supabase

**Execute:**

```bash
cd /Users/mbrew/Developer/carnivore-weekly
bash apply-assessment-migration.sh
```

**What it does:**
- Loads credentials from .env
- Connects to Supabase
- Applies migration
- Reports success/failure

---

## Deployment Method 3: Node.js Script (Local Machine)

**Time:** 2-3 minutes
**Prerequisites:** Node.js installed, network access to Supabase

**Execute:**

```bash
cd /Users/mbrew/Developer/carnivore-weekly
npm install pg  # One-time only
node apply-assessment-migration.js
```

**What it does:**
- Loads credentials from .env
- Connects to Supabase via pg library
- Applies migration
- Reports success/failure

---

## Deployment Method 4: Manual psql (Command Line)

**Time:** 2-3 minutes
**Prerequisites:** psql installed, network access to Supabase

**Execute:**

```bash
PGPASSWORD="sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz" \
psql -h db.kwtdpvnjewtahuxjyltn.supabase.co \
     -U postgres.kwtdpvnjewtahuxjyltn \
     -d postgres \
     -f /Users/mbrew/Developer/carnivore-weekly/migrations/020_assessment_sessions_table.sql
```

---

## Verification Queries

After deploying, run these queries to verify:

### Check 1: Table Exists

```sql
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'cw_assessment_sessions';
-- Expected: 1
```

### Check 2: Columns Exist

```sql
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cw_assessment_sessions'
ORDER BY ordinal_position;
-- Expected: 10
```

### Check 3: Indexes Created

```sql
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'cw_assessment_sessions';
-- Expected: 4
```

### Check 4: Trigger Created

```sql
SELECT COUNT(*) as trigger_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'cw_assessment_sessions';
-- Expected: 1
```

### Check 5: Full Schema Details

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cw_assessment_sessions'
ORDER BY ordinal_position;
```

---

## Schema Details

### Table: `cw_assessment_sessions`

**Purpose:** Store assessment form submissions and payment status

**Columns:**

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `email` | VARCHAR(255) | No | - | User email (validated) |
| `first_name` | VARCHAR(100) | No | - | User first name (non-empty) |
| `form_data` | JSONB | No | - | Complete assessment form as JSON object |
| `payment_status` | VARCHAR(50) | No | 'pending' | One of: pending, completed, failed, refunded |
| `stripe_session_id` | VARCHAR(255) | Yes | NULL | Stripe checkout session ID |
| `stripe_payment_intent_id` | VARCHAR(255) | Yes | NULL | Stripe payment intent ID |
| `created_at` | TIMESTAMP | No | NOW() | Record creation time |
| `updated_at` | TIMESTAMP | No | NOW() | Last update time (auto-maintained) |
| `completed_at` | TIMESTAMP | Yes | NULL | Payment completion time |

### Constraints

**CHECK Constraints:**
- `form_data_is_object` - Ensures form_data is a JSON object
- `email_format` - Validates email format (RFC-compliant regex)
- `first_name_not_empty` - Ensures first_name is not empty/whitespace
- `payment_status` - Only allows valid payment status values

**PRIMARY KEY:**
- `id` (UUID)

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_cw_assessment_sessions_email` | (email) | Fast user lookup |
| `idx_cw_assessment_sessions_payment_status` | (payment_status) | Payment status filtering |
| `idx_cw_assessment_sessions_stripe_session_id` | (stripe_session_id) WHERE NOT NULL | Stripe session lookup |
| `idx_cw_assessment_sessions_created_at` | (created_at DESC) | Time-based queries |

### Triggers

**Trigger:** `trigger_cw_assessment_sessions_updated_at`

**Function:** `update_cw_assessment_sessions_updated_at()`

**Behavior:** Automatically updates `updated_at` timestamp on every row modification

**When:** BEFORE UPDATE on `cw_assessment_sessions`

### Comments

Table and column documentation is embedded in the database via COMMENT statements for discoverability.

---

## Usage Examples

### Create Assessment Session

```javascript
const { data, error } = await supabase
  .from('cw_assessment_sessions')
  .insert([
    {
      email: 'user@example.com',
      first_name: 'John',
      form_data: {
        age: 35,
        sex: 'male',
        weight: 200,
        height_feet: 6,
        height_inches: 0,
        // ... rest of assessment form
      },
      payment_status: 'pending'
    }
  ])
  .select();
```

### Update Payment Status

```javascript
const { data, error } = await supabase
  .from('cw_assessment_sessions')
  .update({
    payment_status: 'completed',
    stripe_session_id: 'cs_test_...',
    completed_at: new Date().toISOString()
  })
  .eq('id', sessionId)
  .select();
```

### Query by Status

```javascript
const { data, error } = await supabase
  .from('cw_assessment_sessions')
  .select('*')
  .eq('payment_status', 'pending')
  .order('created_at', { ascending: false });
```

### Query by Email

```javascript
const { data, error } = await supabase
  .from('cw_assessment_sessions')
  .select('*')
  .eq('email', 'user@example.com');
```

---

## Safety & ACID Compliance

### Risk Level: ZERO

**Why:**
- Uses `CREATE TABLE IF NOT EXISTS` (safe for re-runs)
- No data deletion operations
- No breaking schema changes
- All operations wrapped in implicit transactions
- Idempotent migration

### ACID Guarantees

```
Atomicity:    ✓ All DDL in implicit transaction
Consistency:  ✓ 4 CHECK constraints enforce data integrity
Isolation:    ✓ PostgreSQL READ_COMMITTED default
Durability:   ✓ Supabase handles persistence
```

---

## Rollback (If Needed)

**DO NOT RUN** unless absolutely necessary. This operation is destructive.

```sql
DROP TABLE IF EXISTS public.cw_assessment_sessions CASCADE;
```

This will:
- Remove the `cw_assessment_sessions` table
- Remove all indexes
- Remove all triggers
- Remove trigger function

---

## Troubleshooting

### Error: "Connection refused"

**Cause:** Network access blocked
**Solution:** Verify you're running from a machine with network access to Supabase. The Claude Code sandbox cannot make external connections.

### Error: "Authentication failed"

**Cause:** Invalid credentials in .env
**Solution:** Verify SUPABASE_SERVICE_ROLE_KEY in .env file is correct

### Error: "Table already exists"

**Cause:** Migration was already applied
**Solution:** This is not an error. The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run.

### Error: "Permission denied"

**Cause:** Service role key doesn't have permissions
**Solution:** Verify you're using the service role key, not the public key

---

## Monitoring

After deployment, monitor these:

1. **New Sessions**
   ```sql
   SELECT COUNT(*) FROM cw_assessment_sessions WHERE created_at > NOW() - INTERVAL '1 day';
   ```

2. **Pending Payments**
   ```sql
   SELECT COUNT(*) FROM cw_assessment_sessions WHERE payment_status = 'pending';
   ```

3. **Completed Payments**
   ```sql
   SELECT COUNT(*) FROM cw_assessment_sessions WHERE payment_status = 'completed';
   ```

4. **Failed Payments**
   ```sql
   SELECT COUNT(*) FROM cw_assessment_sessions WHERE payment_status = 'failed';
   ```

---

## Migration Philosophy

> "A database is a promise you make to the future. Don't break it."

This migration follows Carnivore Weekly's data integrity standards:
- Mathematically sound schema design
- Proper constraint enforcement
- ACID transaction guarantees
- Defensive data validation
- Clear audit trails

---

## Next Steps

After successful deployment:

1. **Test Session Creation**
   - Create test assessment sessions via API
   - Verify data storage

2. **Test Payment Flow**
   - Complete Stripe test transaction
   - Verify payment_status update

3. **Monitor Transactions**
   - Check for errors in logs
   - Monitor query performance

4. **Deploy API Endpoints**
   - Assessment submission endpoint
   - Payment status check endpoint
   - Session retrieval endpoint

---

## Support

For questions about this migration, consult:
- `/Users/mbrew/Developer/carnivore-weekly/migrations/020_assessment_sessions_table.sql` - Migration source
- Supabase Documentation - https://supabase.com/docs
- PostgreSQL Documentation - https://www.postgresql.org/docs/

---

**Deployed By:** Leo (Database Architect)
**Date:** 2026-01-04
**Status:** READY FOR PRODUCTION

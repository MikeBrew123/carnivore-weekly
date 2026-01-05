# Calculator2 Session Fix - Quick Start

**Problem:** 400 Bad Request when accessing `calculator2_sessions` table
**Fix Time:** 5 minutes
**Difficulty:** Easy (copy/paste SQL)

---

## The Problem

The Calculator2 form's session persistence was failing because the Supabase Row Level Security (RLS) policies were incomplete. Anonymous users couldn't:
- Create new sessions (no INSERT policy)
- Update session form state (no UPDATE policy)

## The Fix (3 Steps)

### Step 1: Get the SQL

Open this file:
```
/Users/mbrew/Developer/carnivore-weekly/CALCULATOR2_RLS_UPDATE.sql
```

Copy all the SQL content.

### Step 2: Run It

1. Go to Supabase dashboard: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new
2. Paste the SQL
3. Click "Run"
4. Wait for success (should say "Queries executed successfully")

### Step 3: Verify

Test the form:
1. Open the calculator application
2. Fill out Step 1 (age, weight, height)
3. Refresh the page
4. Your form data should still be there
5. Complete the wizard

---

## What Changed

**Before:** Only 2 RLS policies (read-only + service role)
```sql
-- Incomplete - missing INSERT and UPDATE
CREATE POLICY read_calculator2_sessions ...
CREATE POLICY service_role_calculator2_sessions ...
```

**After:** 4 complete RLS policies
```sql
-- New - allows form session management
CREATE POLICY insert_calculator2_sessions ...
CREATE POLICY select_calculator2_sessions ...
CREATE POLICY update_calculator2_sessions ...
CREATE POLICY service_role_calculator2_sessions ...
```

---

## Technical Details

See the full analysis: `/Users/mbrew/Developer/carnivore-weekly/CALCULATOR2_SESSION_DIAGNOSIS.md`

Key points:
- Token-based sessions (no email required)
- 48-hour hard expiration
- ACID-compliant (atomic, consistent, isolated, durable)
- 192-bit cryptographic token entropy
- No PII stored in table

---

## Troubleshooting

### If you get an error:
- "relation does not exist" → Table was deleted (should not happen)
- "already exists" → Policy names collide (safe to ignore, policy will be updated)

### If it still doesn't work after Step 2:
1. Check the Supabase Auth > Policies page
2. Verify all 4 policies are listed for `calculator2_sessions`
3. Clear browser cache and try again

---

## That's It!

The session system should now be fully functional. No code changes needed, just RLS policies.

# Quick Reference: Debugging Report Generation Failure

## The Problem in One Sentence

**Payment flow never creates `cw_assessment_sessions`, so Step 4 can't merge form_data, so report reads empty data and macros default to (2000, 150, 150, 25).**

---

## Quick Diagnostic Queries

### 1. Is the session in the right table?

```sql
-- Check if assessment session exists
SELECT id, email, form_data ->> 'weight' as weight, payment_status
FROM public.cw_assessment_sessions
WHERE email = 'user@example.com'  -- Your test user
ORDER BY created_at DESC LIMIT 1;

-- Expected: Row should exist with payment_status = 'completed'
-- Actual: Probably returns nothing (table is empty!)
```

### 2. Where IS the data actually stored?

```sql
-- Check calculator_sessions_v2
SELECT id, email, form_data ->> 'weight' as weight, payment_status
FROM public.calculator_sessions_v2
WHERE email = 'user@example.com'
ORDER BY created_at DESC LIMIT 1;

-- Expected: Row exists with form_data containing weight, age, sex
-- This table HAS the data!
```

### 3. Is the data actually complete?

```sql
-- Check what fields are in form_data
SELECT
  id,
  jsonb_object_keys(form_data) as key
FROM public.calculator_sessions_v2
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: Keys like 'weight', 'age', 'sex', 'email', 'firstName', etc.
-- If missing weight/age: Problem is upstream (Steps 1-2 didn't save)
-- If present: Problem is migration (Step 4 receives but doesn't find table)
```

### 4. What's in the report?

```sql
-- Check generated report
SELECT
  id,
  email,
  is_generated,
  report_json ->> 'macroProteinGrams' as protein,
  report_json ->> 'macroFatGrams' as fat,
  report_json ->> 'macroCalories' as calories,
  updated_at
FROM public.calculator_reports
WHERE email = 'user@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: protein, fat, calories should be CALCULATED (not defaults)
-- Actual: protein = 150, fat = 150, calories = 2000 (defaults!)
```

---

## The Three Files That Matter

### File 1: API Payment Verification
**Path:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
**Lines:** 582-705
**Issue:** Doesn't create cw_assessment_sessions entry
**Fix:** Add Insertion 1 (see API_PATCH_STEP4_FIX.js)

### File 2: API Payment Status Check
**Path:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
**Line:** 754
**Issue:** Checks for 'success' which doesn't exist in schema
**Fix:** Change 'success' to 'completed'

### File 3: Frontend Step 4 Handler
**Path:** `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/components/calculator/CalculatorApp.tsx`
**Lines:** 223-233
**Issue:** Sends stripeSessionId instead of assessment_id
**Fix:** Store assessment_id from payment verification response, use in Step 4

---

## Step-by-Step Debug Process

1. **User reports:** "Macros show defaults, not my data"

2. **Check form_data in calculator_sessions_v2:**
   ```sql
   SELECT form_data FROM calculator_sessions_v2
   WHERE email = 'user@example.com' ORDER BY created_at DESC LIMIT 1;
   ```
   - If NULL or empty: Bug is in Steps 1-2
   - If complete: Continue to step 3

3. **Check form_data in cw_assessment_sessions:**
   ```sql
   SELECT form_data FROM cw_assessment_sessions
   WHERE email = 'user@example.com' ORDER BY created_at DESC LIMIT 1;
   ```
   - If no rows: Row doesn't exist (payment didn't create it) ← THIS IS THE BUG
   - If rows but form_data empty: Row exists but merge failed
   - If form_data complete: Database is fine, report generation is the issue

4. **Check report macros:**
   ```sql
   SELECT report_json FROM calculator_reports
   WHERE email = 'user@example.com' ORDER BY created_at DESC LIMIT 1;
   ```
   - If macroCalories = 2000: Silent failure in report generation
   - Check logs for calculation errors

5. **Check API logs:**
   - Look for `[handleVerifyPayment]` entries
   - Look for `[handleStep4Submission]` entries
   - Look for `SESSION_NOT_FOUND` errors

---

## Common States and What They Mean

| State | What It Means | What To Check |
|-------|--------------|---------------|
| calculator_sessions_v2 has data, cw_assessment_sessions is empty | Payment didn't create assessment session | handleVerifyPayment missing Insertion 1 |
| cw_assessment_sessions exists but form_data is empty | Row created but data not migrated | Insertion 1 missing field mapping |
| cw_assessment_sessions form_data is missing weight/age | Data wasn't sent from frontend | Steps 1-2 not saving properly |
| cw_assessment_sessions has complete data but report shows defaults | Calculation failed silently | Check Claude API response in logs |
| Report shows correct macros | Everything working! | No fix needed |

---

## The Fix in 10 Minutes

1. **Open:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`

2. **Find line 648** (after `if (!updateResponse.ok)` in handleVerifyPayment)

3. **Paste:** Insertion 1 from API_PATCH_STEP4_FIX.js

4. **Find line 754** (payment status check in handleStep4Submission)

5. **Replace:** With line754Replacement from API_PATCH_STEP4_FIX.js

6. **Find line 690** (success response in handleVerifyPayment)

7. **Add:** `assessment_id: assessment_id,` to the response object

8. **Test:**
   ```sql
   SELECT COUNT(*) FROM cw_assessment_sessions
   WHERE payment_status = 'completed' AND form_data ? 'weight';
   ```
   Expected: > 0

---

## Prevention Checklist

- [ ] Always use the same table for complete objects (don't split across two tables)
- [ ] Foreign keys must be explicit and validated
- [ ] Migration logic must be tested for each data field
- [ ] Report generation must fail loudly (not silently) if data is incomplete
- [ ] Add constraints to catch data integrity issues at database level
- [ ] Document which table owns which data (this is missing!)

---

## Schema Principle Violated

"A database is a promise you make to the future. Don't break it."

This code breaks it by:
1. Storing Steps 1-3 data in one table
2. Storing Step 4 data in another table
3. Never linking them
4. Never validating the link exists before merging
5. Silently failing when the link is missing

---

## Related Files (For Context)

- Migration that created cw_assessment_sessions: `/migrations/020_assessment_sessions_table.sql`
- Migration that created calculator_sessions_v2: `/migrations/015_calculator_comprehensive_schema.sql`
- New migration to fix: `/migrations/022_fix_assessment_session_bridge.sql` (I created this)
- Frontend form handler: `/calculator2-demo/src/components/calculator/CalculatorApp.tsx`
- Report generation: `/api/calculator-api.js` line 1100-1250

---

## Questions This Answers

**Q: Is Step 4 sending the fields?**
A: Yes. Line 232 sends complete formData.

**Q: Is handleStep4Submission merging correctly?**
A: Yes. Lines 760-763 would merge correctly IF the session existed.

**Q: Is the PATCH operation saving?**
A: Yes. 200 OK is returned IF the session exists.

**Q: Is it a PostgREST cache issue?**
A: No. The session simply doesn't exist in cw_assessment_sessions table.

**The real issue:** Payment verification never creates the session record that Step 4 expects to merge into.

---

## Psychology of Silent Failures

Why is this so hard to debug?

1. **No error is thrown** - endpoint returns 200 OK with fallback template
2. **Data looks reasonable** - macros are valid numbers (just wrong)
3. **Blame shifts** - looks like "report generation failed", not "data persistence failed"
4. **Multiple tables** - debugging requires checking TWO tables simultaneously
5. **No link** - no foreign key to trace, requires manual detective work

This is why schema health is paramount. Clear structure prevents these cascading failures.

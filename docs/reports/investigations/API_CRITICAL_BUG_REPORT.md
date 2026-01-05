# CRITICAL BUG REPORT: Silent Report Generation Failure

## Executive Summary

Report generation fails silently because Step 4 submission expects data in `cw_assessment_sessions` table, but the payment flow (which uses `calculator_sessions_v2`) never migrates or creates the assessment session record. This is a **two-table schema fragmentation issue**.

---

## ROOT CAUSE ANALYSIS

### The Two-Table Problem

| Component | Table Used | What It Does |
|-----------|-----------|--------------|
| Steps 1-2 submission | `calculator_sessions_v2` | Stores form_data, payment_status |
| Payment flow | `calculator_sessions_v2` | Sets payment status, creates report record |
| Step 4 submission | `cw_assessment_sessions` | Expects to merge and save form_data |
| Report generation | `cw_assessment_sessions` | Reads form_data to calculate macros |

**The gap:** Payment completion updates `calculator_sessions_v2` but never creates a corresponding `cw_assessment_sessions` record.

### Step-by-Step Failure Flow

1. **User completes Steps 1-2:** Data saved to `calculator_sessions_v2.form_data`
2. **User pays:** `handleVerifyPayment()` (line 582-705) updates `calculator_sessions_v2` with `payment_status = 'completed'`
   - Problem: Does NOT create `cw_assessment_sessions` entry
   - Returns `access_token` but not `assessment_id`
3. **User enters Step 4:** Frontend calls `/api/v1/calculator/step/4` with `stripeSessionId` (which is actually `session.id` from Stripe)
4. **Step 4 handler** (line 710) tries to PATCH `cw_assessment_sessions?id=eq.{assessment_id}`
   - But this session doesn't exist! The ID is wrong. Frontend passes `stripeSessionId` thinking it's an assessment ID
5. **Database returns 0 rows:** No error thrown, PATCH succeeds with 0 updates
6. **Report generation** (line 1144) reads from non-existent session, gets empty `form_data`
7. **Macros default:** Because form_data is missing weight/age/sex, calculation fails silently

---

## Code Evidence

### Payment Verification - Creates Wrong Session Record

File: `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
Lines: 582-705

```javascript
// Line 638: Updates calculator_sessions_v2
payment_status: 'completed',

// Line 665: Creates report record linked to calculator_sessions_v2.id
session_id: session.id,  // This is calculator_sessions_v2.id, NOT cw_assessment_sessions.id!
```

**What it should do:**
```javascript
// Create cw_assessment_sessions entry with merged form_data
const assessmentResponse = await fetch(
  `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions`,
  {
    method: 'POST',
    headers: { /* auth */ },
    body: JSON.stringify({
      email: session.email,
      first_name: session.first_name || 'User',
      form_data: session.form_data || {},  // Migrate from calculator_sessions_v2
      payment_status: 'completed',
    }),
  }
);
const assessmentSession = await assessmentResponse.json();
```

### Step 4 Submission - Looks for Wrong Session

File: `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
Lines: 710-804

```javascript
// Line 719: Gets assessment_id from frontend
const { assessment_id, data: formData } = body;

// Line 730-737: Tries to fetch from cw_assessment_sessions
const sessionResponse = await fetch(
  `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${assessment_id}`,
  {
    headers: { /* auth */ },
  }
);

// Problem: assessment_id is actually stripeSessionId (from Stripe)
// which matches calculator_sessions_v2.id, NOT cw_assessment_sessions.id
// Result: Query returns 0 rows, but no error is thrown
```

### Payment Status Enum Mismatch

File: `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
Line: 754

```javascript
// WRONG: Checks for 'success' which doesn't exist in schema
if (session.payment_status !== 'pending' && session.payment_status !== 'success') {
  return createErrorResponse('PAYMENT_REQUIRED', 'Payment required to access step 4', 403);
}
```

File: `/Users/mbrew/Developer/carnivore-weekly/migrations/020_assessment_sessions_table.sql`
Line: 23-24

```sql
-- Schema only defines these values:
payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
```

**Fix:** Line 754 should be:
```javascript
if (session.payment_status !== 'pending' && session.payment_status !== 'completed') {
  // Allow both pending (free tier) and completed (paid)
}
```

---

## Why Macros Show Defaults

File: `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
Lines: 1140-1157

```javascript
// Line 1144: Tries to get form_data from session
let formData = session.form_data || session;

// If form_data is missing weight, age, sex:
const weightKg = formData.weight * 0.453592;  // weightKg = undefined * 0.453592 = NaN

// Macro calculation returns defaults (2000, 150, 150, 25)
if (isNaN(proteinGrams)) proteinGrams = 150;
if (isNaN(fatGrams)) fatGrams = 150;
// etc...
```

This fails **silently** because no exception is thrown, and the endpoint returns HTTP 200 with fallback template.

---

## The Fix (3 Parts)

### Part 1: Fix Payment Status Check (1 line)

**File:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
**Line:** 754

```diff
- if (session.payment_status !== 'pending' && session.payment_status !== 'success') {
+ if (session.payment_status !== 'pending' && session.payment_status !== 'completed') {
```

### Part 2: Create Assessment Session After Payment (Add to handleVerifyPayment)

**File:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
**After line:** 648 (after calculator_sessions_v2 update succeeds)

Add this block before creating report record:

```javascript
    // Create cw_assessment_sessions entry for Step 4 submission
    const assessmentResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          email: session.email || 'unknown@carnivoreweekly.com',
          first_name: session.first_name || 'Carnivore User',
          form_data: session.form_data || {},  // Migrate form_data from calculator_sessions_v2
          payment_status: 'completed',
          stripe_session_id: session.stripe_payment_intent_id,
        }),
      }
    );

    if (!assessmentResponse.ok) {
      console.error('[handleVerifyPayment] Failed to create assessment session');
      // Don't fail - assessment can be created later
    } else {
      const assessmentSessions = await assessmentResponse.json();
      if (assessmentSessions && assessmentSessions.length > 0) {
        assessment_id = assessmentSessions[0].id;
        console.log('[handleVerifyPayment] Created cw_assessment_sessions:', assessment_id);
      }
    }
```

### Part 3: Return Assessment ID to Frontend

**File:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
**Lines:** 690-697

Modify the success response to include the assessment_id:

```javascript
return createSuccessResponse({
  session_token,
  is_premium: true,
  payment_status: 'completed',
  access_token: accessToken,
  assessment_id: assessment_id,  // Add this line
  expires_at: expiresAt.toISOString(),
  message: 'Payment verified. Report generation started.',
}, 200);
```

Then update the frontend to use assessment_id instead of stripeSessionId in Step 4.

**File:** `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/components/calculator/CalculatorApp.tsx`
**Lines:** 223-228

Change from:
```javascript
assessment_id: stripeSessionId,  // This is wrong - it's not an assessment ID
```

To receive from payment verification response:
```javascript
assessment_id: assessmentIdFromPayment,  // From payment verification response
```

---

## SQL Verification Query

To verify the issue in production, run this query in Supabase:

```sql
-- Check for mismatched sessions
SELECT
  cs.id as calculator_session_id,
  cs.form_data ->> 'weight' as weight,
  cs.form_data ->> 'age' as age,
  cs.payment_status as calc_payment_status,
  cas.id as assessment_session_id,
  cas.form_data ->> 'weight' as assessment_weight,
  cas.payment_status as assess_payment_status
FROM calculator_sessions_v2 cs
LEFT JOIN cw_assessment_sessions cas
  ON cs.id = cas.stripe_session_id
WHERE cs.payment_status = 'completed'
LIMIT 10;
```

**Expected result:** Many rows where `assessment_session_id` is NULL - confirming the missing bridge.

---

## Testing the Fix

1. Create new test user
2. Complete Steps 1-2 with full profile data
3. Proceed to payment
4. Complete payment
5. Verify Step 4 submission accepts the data
6. Check that form_data includes weight, age, sex, etc.
7. Verify report macros are calculated correctly (not defaults)

---

## Summary

| Issue | Location | Root Cause | Fix |
|-------|----------|-----------|-----|
| Step 4 can't find session | Line 730 | Payment doesn't create cw_assessment_sessions | Create assessment record after payment verification |
| Form data not merged | Line 760 | Session doesn't exist, so merge fails silently | Migrate form_data from calculator_sessions_v2 |
| Wrong payment status check | Line 754 | Enum mismatch ('success' vs 'completed') | Change 'success' to 'completed' |
| Macros default silently | Line 1144 | Missing form_data causes NaN in calculations | Ensure form_data is complete before report generation |

Philosophy: "A database is a promise you make to the future. Don't break it." - This issue breaks the promise by using two unconnected tables. The fix ensures data flows correctly through the entire pipeline.

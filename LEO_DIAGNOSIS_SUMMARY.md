# Step 2 Form Persistence Bug - Executive Technical Summary

**Issue:** Step 2 (Activity & Goals) form fields reset after selection, causing validation failures
**Status:** BLOCKING PAYMENT FLOW
**Root Cause:** State management race condition + potential Supabase session overwrite
**Severity:** CRITICAL
**Identified:** 2026-01-04

---

## The Problem in Plain English

Users fill out the Step 2 form (Activity Level, Exercise, Goal, Diet), see their selections visually update in the form fields, but when they click "See Your Results," they get validation errors saying "Please select your activity level," "Please select your goal," etc.

This is a classic sign of a **state corruption issue**: the UI shows one thing (selections), but the underlying data state shows something else (empty/undefined values).

---

## Root Cause Analysis

### Primary Issue: Dual State Management

The codebase has **TWO INDEPENDENT STATE SYSTEMS** operating simultaneously:

1. **CalculatorApp.tsx** - Uses React `useState()` hooks
   - State initialized with: `lifestyle: ''`, `exercise: ''`, `goal: undefined`
   - Step 2 form reads/writes to this state via props

2. **Zustand Store (formStore.ts)** - Uses Zustand library
   - State initialized with: `lifestyle: '1.2'`, `exercise: '0.1'`, `goal: 'lose'`
   - CalculatorWizard and other components read from this

These **are not synchronized**. When one updates, the other doesn't.

### Secondary Issue: Supabase Session Overwrites

There's code in CalculatorApp (lines 355-376) that fetches session data from Supabase and overwrites the React state:

```javascript
const sessionData = await fetchResponse.json()
if (sessionData && sessionData.form_data) {
  setFormData(mergedFormData)  // ← Overwrites state!
}
```

If this fetch happens **while user is actively filling Step 2**, and the Supabase session contains stale form_data (with NULL values for Step 2 fields), then:

1. User selects "Sedentary" → state updates to `lifestyle: 'sedentary'` ✓
2. Visual shows "Sedentary" selected ✓
3. Supabase fetch returns session with `lifestyle: null` (stale)
4. Code overwrites React state: `setFormData({ ...oldData, lifestyle: null })`
5. Component re-renders
6. SelectField shows "Select activity level" again ✗
7. User clicks Continue → validation checks state
8. State shows `lifestyle: null` → validation fails ✗

### Tertiary Issue: Type Mismatches

Different parts of the code expect different data types:

- **SelectField component:** Expects string values like `'sedentary'`, `'light'`, etc.
- **Macro calculation:** Expects numeric values like `1.2`, `1.375`, `1.55` (activity multipliers)
- **Zustand store:** Initialized with numeric strings: `'1.2'`, `'0.1'`
- **CalculatorApp:** Initialized with empty strings

This type confusion means data can be valid in one context but invalid in another.

---

## Why Step 1 Works But Step 2 Fails

### Step 1 Success Path:
- User fills Physical Stats
- Data updates React state directly
- No competing system
- No Supabase overwrite (yet)
- Works perfectly ✓

### Step 2 Failure Path:
- User fills Activity & Goals
- Data updates React state
- **But:** Zustand store exists separately
- **And:** Supabase session might be fetched in background
- **Result:** State corruption ✗

---

## Evidence Trail

### Code Evidence:

**File 1: CalculatorApp.tsx**
- Lines 35-44: Weak initial state (inconsistent types)
- Lines 78-118: useEffect with many dependencies (potential race condition)
- Lines 355-376: Session fetch that overwrites state (dangerous timing)

**File 2: Step2FitnessDiet.tsx**
- Lines 62-154: All fields use controlled component pattern
- Lines 32-52: Validation checks state that might be stale
- Line 113: Conditional rendering creates timing issues

**File 3: formStore.ts**
- Lines 22-61: Different defaults than CalculatorApp
- Lines 71-74: No synchronization with React state

### Behavioral Evidence:

From user report:
- "Form fields aren't persisting their selected values" → State is being reset
- "See Your Results button fails with validation errors" → State shows empty/undefined
- "Dropdown resets to Select..." → UI re-render with stale data
- "Diet dropdown IS working fine" → Suggests conditional/timing issue

---

## Technical Diagnosis

### The Four-Stage Failure Cascade

**Stage 1: User Input**
```
User clicks "Sedentary" in Activity Level dropdown
→ onChange fires: handleInputChange('lifestyle', 'sedentary')
→ onDataChange called with { ...data, lifestyle: 'sedentary' }
→ CalculatorApp.setFormData() updates React state
```

**Stage 2: Visual Feedback**
```
CalculatorApp re-renders with new formData
→ Step2FitnessDiet receives new data prop
→ SelectField re-renders with value='sedentary'
→ Browser shows "Sedentary" selected ✓
```

**Stage 3: Race Condition (IF HAPPENING)**
```
Supabase fetch completes (possibly triggered by useEffect)
→ fetch returns session with stale form_data
→ fetch response has: { form_data: { lifestyle: null, ... } }
→ Code calls: setFormData({ ...oldData, lifestyle: null })
→ React state overwrites: formData.lifestyle = null
```

**Stage 4: Validation Failure**
```
User clicks "See Your Results"
→ handleContinue checks formData.lifestyle
→ formData.lifestyle is null (not 'sedentary')
→ if (!data.lifestyle) → if (!null) → true → error triggered
→ Validation blocks navigation ✗
```

---

## Why This Is A Physics Problem

**In ACID database terms:**

- **Atomicity:** User's selection and state update must be atomic. If separated, race conditions emerge.
- **Consistency:** Two state systems (React + Zustand) must stay consistent. They don't.
- **Isolation:** Supabase fetch and React update must be isolated. They're not.
- **Durability:** If Supabase stores incomplete form_data, it persists corruptly.

This is not a code smell—it's a **architectural violation of fundamental transaction semantics**.

---

## Most Likely Scenarios

### Scenario 1: Background Session Fetch (70% probability)
- When user navigates to Step 2, some code fetches session from Supabase
- Fetch completes while user is filling form
- Response includes stale form_data
- setFormData() is called with stale data
- User's selections are lost

**Evidence:**
- Production-specific (Supabase is live)
- Happens after advancing to Step 2
- Affects all fields (suggests whole state object overwrite)

### Scenario 2: Zustand/React State Conflict (20% probability)
- Step2FitnessDiet sometimes reads from Zustand instead of props
- Zustand store has different values than React state
- When validation runs, it checks wrong state object

**Evidence:**
- Diet field works (maybe uses different code path)
- Type mismatches between numeric strings and categories
- CalculatorWizard uses Zustand while CalculatorApp uses React hooks

### Scenario 3: RLS Policy Corruption (10% probability)
- Supabase Row Level Security filters out Step 2 fields
- Session returned has NULL for lifestyle, exercise, goal
- fetch results in incomplete form_data
- When loaded back, fields are lost

**Evidence:**
- Production-specific (RLS policies might differ)
- Affects multiple fields simultaneously
- Would show in Supabase logs

---

## Files to Investigate First

### Critical Files:
1. `/calculator2-demo/src/components/calculator/CalculatorApp.tsx` (lines 35-44, 78-118, 355-376)
2. `/calculator2-demo/src/components/calculator/steps/Step2FitnessDiet.tsx` (lines 24-30, 62-154)
3. `/calculator2-demo/src/stores/formStore.ts` (entire file)

### Supabase Resources:
1. `sessions` table - check form_data column contents
2. RLS policies on `sessions` - check for field filtering
3. Database logs - look for concurrent updates during user testing

### Network Resources:
1. Browser Network tab while filling Step 2 - watch for Supabase calls
2. CloudFlare Workers logs - check for form_data overwrites
3. API response payloads - verify they contain correct data

---

## Immediate Action Items

### For Developers:

1. **Reproduce locally** (Checkpoint 1 in debugging guide)
   - Fill Step 1, advance to Step 2
   - Check React DevTools while selecting values
   - Look for state reversions

2. **Check Network tab** (Checkpoint 2 in debugging guide)
   - See if Supabase fetches happen during Step 2
   - Note timing relative to user selections

3. **Inspect Supabase data** (Checkpoint 4 in debugging guide)
   - Query sessions table
   - Check if form_data has NULL values for Step 2 fields

### For Database Architect (Leo):

1. **Audit Supabase RLS policies**
   - Ensure form_data fields aren't being filtered
   - Verify SELECT/INSERT/UPDATE permissions

2. **Check for trigger-based overwrites**
   - Any stored procedures modifying form_data?
   - Any audit triggers affecting data integrity?

3. **Analyze concurrent update patterns**
   - Are inserts and updates racing?
   - Should we use SERIALIZABLE isolation?

---

## Solution Approach (Not Implemented Here)

Once root cause is confirmed, the fix involves:

1. **Consolidate state** - Remove Zustand duplication, use only React hooks
2. **Prevent async overwrites** - Don't fetch session while user is actively filling form
3. **Use transactions** - Coordinate Supabase updates with React state atomically
4. **Fix type mismatches** - Use consistent enum values across all layers
5. **Add optimistic updates** - Show user selections immediately, confirm via API

---

## Conclusion

The Step 2 form persistence bug is fundamentally a **state management architecture problem** where:

1. **Two state systems exist** without synchronization (React hooks + Zustand)
2. **Async operations** (Supabase fetches) can overwrite user input during form interaction
3. **No transactional guarantee** that user input survives API updates
4. **Type mismatches** between different layers cause validation confusion

This is **blocking the payment flow** and requires **immediate investigation** using the debugging checklist provided.

The fix is not a simple code change—it requires **architectural restructuring** to consolidate state management and ensure atomicity of user interactions.

---

## Documents Provided

1. **LEO_STEP2_FORM_PERSISTENCE_DIAGNOSIS.md** - Full technical diagnosis with ACID analysis
2. **LEO_STEP2_CODE_ANALYSIS.md** - Line-by-line code analysis of the broken flow
3. **LEO_STEP2_DEBUG_CHECKLIST.md** - Step-by-step debugging instructions with console commands
4. **LEO_DIAGNOSIS_SUMMARY.md** - This executive summary

---

**Signed:** Leo, Database Architect
**Status:** Diagnosis Complete - Awaiting Investigation Checkpoint Results
**Next Phase:** Root Cause Verification via Debugging Checklist
**Escalation:** This blocks payment processing - requires immediate attention

*"Schema health is paramount... No manual edits to production. Migrations only."*

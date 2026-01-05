# Step 2 Form Persistence - Debugging Checklist

## Quick Test: Reproduce Locally

### Prerequisites
```bash
cd /Users/mbrew/Developer/carnivore-weekly/calculator2-demo
npm install
npm run dev
```

### Test Scenario: Form Reset on Step 2

1. Navigate to calculator
2. Fill Step 1 (Physical Stats):
   - Sex: Male
   - Age: 35
   - Height: 5'10"
   - Weight: 195 lbs
3. Click "Continue to Next Step"
4. **OBSERVE Step 2 form carefully:**
   - Are all dropdowns showing "Select..."?
   - Are all radio buttons unchecked?

5. Attempt to fill Step 2:
   - Activity Level: Click "Moderately Active"
   - **PAUSE - observe:**
     - Does dropdown show your selection?
     - Can you see it in browser console: `data.lifestyle`?

6. Exercise Frequency: Click "3-4 days per week"
   - **PAUSE - observe:**
     - Does it stay selected?
     - Or did Activity Level dropdown reset?

7. Goal: Click "Fat Loss"
   - **PAUSE - observe:**
     - Any reset happening?

8. Deficit: Click "20%"
   - **PAUSE - observe:**
     - DOM appears/disappears?
     - Value shows?

9. Diet: Click "Carnivore"
   - **PAUSE - observe:**
     - This one works according to bug report
     - Compare behavior to others

10. Click "See Your Results"
    - **OBSERVE:**
      - Does validation succeed or fail?
      - Which fields trigger errors?

---

## Checkpoint 1: React DevTools State Inspection

### Instructions:

1. Install React DevTools browser extension (if not already)
2. Open calculator, go to Step 2
3. In browser DevTools, click "Components" tab (React DevTools)
4. In left panel, find: `CalculatorApp`
5. In right panel, expand the component tree
6. Look for `formData` state
7. **Record the current values:**

```
formData = {
  lifestyle: ________________
  exercise: _________________
  goal: _____________________
  deficit: ___________________
  diet: ______________________
}
```

8. Now manually select "Sedentary" in Activity Level dropdown
9. **Immediately check DevTools again:**
   - Did `formData.lifestyle` change to `'sedentary'`?
   - Or did it stay as before?

10. Wait 2 seconds (allow any async operations to complete)
11. **Check DevTools again:**
    - Is `formData.lifestyle` still `'sedentary'`?
    - Or did it revert to previous value?

### Expected Results:
- Should immediately change when user selects ✓
- Should remain changed after 2 seconds ✓

### If it Fails:
- Check for Supabase fetch calls in Network tab
- Timestamp when value changes vs when it reverts
- Compare timing to Network requests

---

## Checkpoint 2: Network Tab Analysis

### Instructions:

1. Open calculator, go to Step 2
2. Open browser DevTools → Network tab
3. Filter to show only `fetch` and `XHR` requests
4. Fill out Step 2 form (select Activity Level, Exercise, Goal, etc.)

### **Watch for these API calls:**

**Call Pattern 1: Session Fetch**
```
GET /get-session?id=<uuid>
Response should NOT modify formData during Step 2
```

**Call Pattern 2: Form Data POST**
```
POST /api/*/calculator/*/form
Response should NOT overwrite in-progress form edits
```

**Call Pattern 3: Report Generation**
```
POST /api/*/calculator/report/*
Response should NOT affect Step 2 form state
```

### Analysis:

1. **Timing:** When do API calls complete relative to user selections?
   - If API call happens AFTER user selects → ✓ OK
   - If API call happens BEFORE validation → ✓ OK
   - If API call happens BETWEEN selection and validation → ❌ PROBLEM

2. **Response Content:** Check response bodies for `form_data`
   ```json
   // GOOD - includes user's selections:
   {
     "form_data": {
       "lifestyle": "sedentary",
       "exercise": "1-2",
       "goal": "lose",
       "deficit": 20,
       "diet": "carnivore"
     }
   }

   // BAD - missing fields (will reset form):
   {
     "form_data": {
       "lifestyle": null,
       "exercise": null,
       "goal": null,
       "deficit": null,
       "diet": null
     }
   }
   ```

3. **Request Frequency:** Count total API calls while filling Step 2
   - 1 call = expected (maybe initial load)
   - 2-3 calls = acceptable
   - 5+ calls = possible auto-save loop → investigate

### If There's a Problem:
- Screenshot the Network tab showing problematic request
- Note the endpoint URL
- Check request/response headers for timing information
- Save HAR file: Right-click Network tab → Save as HAR

---

## Checkpoint 3: Browser Console Logging

### Add Temporary Debug Logs

**In CalculatorApp.tsx, add to handleInputChange:**

After line 24, modify to:

```typescript
const handleInputChange = (field: string, value: any) => {
  console.log(`[Step2] User selected ${field} = ${value}`)
  console.log(`[Step2] Current formData before update:`, formData)

  onDataChange({ ...data, [field]: value })

  console.log(`[Step2] formData after onDataChange (should update parent):`, { ...data, [field]: value })

  if (value !== '' && value !== undefined && value !== null && onFieldChange) {
    onFieldChange(field)
  }
}
```

**In CalculatorApp.tsx, add to setFormData callback:**

```typescript
const handleInputChange = (field: string, value: any) => {
  onDataChange({ ...data, [field]: value })

  // Add this after onDataChange:
  setTimeout(() => {
    console.log(`[Step2] formData 100ms later (after parent re-render):`, formData)
  }, 100)

  setTimeout(() => {
    console.log(`[Step2] formData 500ms later (check for overwrites):`, formData)
  }, 500)
}
```

### Run Test

1. Fill Step 2 form in browser console
2. Watch console output
3. **Look for pattern:**
   ```
   [Step2] User selected lifestyle = sedentary
   [Step2] Current formData before update: { lifestyle: '' }
   [Step2] formData after onDataChange: { lifestyle: 'sedentary' }
   [Step2] formData 100ms later: { lifestyle: 'sedentary' }
   [Step2] formData 500ms later: { lifestyle: '' }  ← PROBLEM! Overwrote!
   ```

---

## Checkpoint 4: Supabase Session Data Inspection

### SQL Query to Check Database State

```sql
-- Check the most recent session
SELECT
  id,
  created_at,
  last_active_at,
  form_data,
  -- Extract fields from JSON
  form_data->>'sex' as sex,
  form_data->>'age' as age,
  form_data->>'weight' as weight,
  form_data->>'lifestyle' as lifestyle,
  form_data->>'exercise' as exercise,
  form_data->>'goal' as goal,
  form_data->>'deficit' as deficit,
  form_data->>'diet' as diet
FROM sessions
ORDER BY created_at DESC
LIMIT 5;
```

### What to Look For:

**Column: `form_data` (raw JSON)**
- Should contain Step 1 data after form completion ✓
- Should contain Step 2 data after Step 2 completion ✓
- Should NOT have NULL values for completed fields ✓

**If you see this (BAD):**
```json
{
  "sex": "male",
  "age": 35,
  "weight": 195,
  "lifestyle": null,      ← PROBLEM
  "exercise": null,       ← PROBLEM
  "goal": null,           ← PROBLEM
  "deficit": null,        ← PROBLEM
  "diet": null            ← PROBLEM
}
```

### Investigation Steps:

1. **Check RLS Policies:**
   ```sql
   SELECT policy_name, using_expression, with_check_expression
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'sessions';
   ```
   - Are fields being filtered out?
   - Are JWTs being validated correctly?

2. **Check Trigger Functions:**
   ```sql
   SELECT trigger_name, event_manipulation, action_timing
   FROM information_schema.triggers
   WHERE event_object_table = 'sessions';
   ```
   - Is a trigger overwriting form_data?

3. **Check Update Audit:**
   ```sql
   -- If you have audit trail enabled
   SELECT * FROM sessions_audit
   WHERE session_id = '<specific-session-id>'
   ORDER BY updated_at DESC
   LIMIT 10;
   ```
   - When was form_data last modified?
   - What caused the modification?

---

## Checkpoint 5: Type Consistency Check

### In Step2FitnessDiet.tsx, verify data types:

Add console.log at top of component (line 23):

```typescript
export default function Step2FitnessDiet({
  data,
  onDataChange,
  onContinue,
  onBack,
  onFieldChange,
  onSetErrors,
  errors,
}: Step2FitnessDietProps) {
  // Add this:
  console.log('[Step2] Component received data prop:', {
    lifestyle: { value: data.lifestyle, type: typeof data.lifestyle },
    exercise: { value: data.exercise, type: typeof data.exercise },
    goal: { value: data.goal, type: typeof data.goal },
    deficit: { value: data.deficit, type: typeof data.deficit },
    diet: { value: data.diet, type: typeof data.diet },
  })
```

### Expected Output:
```javascript
{
  lifestyle: { value: 'sedentary', type: 'string' },
  exercise: { value: '3-4', type: 'string' },
  goal: { value: 'lose', type: 'string' },
  deficit: { value: 20, type: 'number' },
  diet: { value: 'carnivore', type: 'string' }
}
```

### If You See This (BAD):
```javascript
{
  lifestyle: { value: 1.2, type: 'number' },      ← Should be string!
  exercise: { value: 0.1, type: 'number' },       ← Should be string!
  goal: { value: undefined, type: 'undefined' },  ← Should be string!
  deficit: { value: null, type: 'object' },       ← Should be number!
  diet: { value: undefined, type: 'undefined' }   ← Should be string!
}
```

**Interpretation:** Data is coming from Zustand store or being corrupted by a fetch.

---

## Checkpoint 6: Zustand Store State Check

### Add Zustand inspection:

In CalculatorApp.tsx, add to top of component:

```typescript
import { useFormStore } from '../stores/formStore'

export default function CalculatorApp(...) {
  // Add this:
  const zustandForm = useFormStore.getState().form
  console.log('[CalculatorApp] Zustand form state:', {
    lifestyle: zustandForm.lifestyle,
    exercise: zustandForm.exercise,
    goal: zustandForm.goal,
    deficit: zustandForm.deficit,
    diet: zustandForm.diet,
  })
  console.log('[CalculatorApp] React state formData:', {
    lifestyle: formData.lifestyle,
    exercise: formData.exercise,
    goal: formData.goal,
    deficit: formData.deficit,
    diet: formData.diet,
  })

  // Are they in sync?
  const mismatch = zustandForm.lifestyle !== formData.lifestyle ||
                   zustandForm.exercise !== formData.exercise ||
                   zustandForm.goal !== formData.goal
  if (mismatch) {
    console.warn('[CalculatorApp] STATE MISMATCH! Zustand and React hooks out of sync!')
  }
}
```

### Expected:
- Both state systems should have empty/undefined values initially
- Both should update together
- No "STATE MISMATCH" warning

### If Mismatch Appears:
- Zustand is being updated separately
- React state updates are not synchronized
- This is the root cause

---

## Checkpoint 7: Validation State Trace

### In Step2FitnessDiet handleContinue, enhance logging:

Replace lines 32-52 with:

```typescript
const handleContinue = () => {
  console.log('[Step2] ======== VALIDATION START ========')
  console.log('[Step2] Current formData object:', JSON.stringify(data, null, 2))
  console.log('[Step2] Individual field values:')
  console.log(`[Step2]   lifestyle: '${data.lifestyle}' (type: ${typeof data.lifestyle})`)
  console.log(`[Step2]   exercise: '${data.exercise}' (type: ${typeof data.exercise})`)
  console.log(`[Step2]   goal: '${data.goal}' (type: ${typeof data.goal})`)
  console.log(`[Step2]   deficit: ${data.deficit} (type: ${typeof data.deficit})`)
  console.log(`[Step2]   diet: '${data.diet}' (type: ${typeof data.diet})`)

  const newErrors: Record<string, string> = {}

  if (!data.lifestyle) {
    console.warn(`[Step2] VALIDATION FAIL: lifestyle is falsy (${data.lifestyle})`)
    newErrors.lifestyle = 'Please select your activity level'
  } else {
    console.log(`[Step2] VALIDATION PASS: lifestyle = '${data.lifestyle}'`)
  }

  if (!data.exercise) {
    console.warn(`[Step2] VALIDATION FAIL: exercise is falsy (${data.exercise})`)
    newErrors.exercise = 'Please select your exercise frequency'
  } else {
    console.log(`[Step2] VALIDATION PASS: exercise = '${data.exercise}'`)
  }

  if (!data.goal) {
    console.warn(`[Step2] VALIDATION FAIL: goal is falsy (${data.goal})`)
    newErrors.goal = 'Please select your goal'
  } else {
    console.log(`[Step2] VALIDATION PASS: goal = '${data.goal}'`)
  }

  if ((data.goal === 'lose' || data.goal === 'gain') && !data.deficit) {
    console.warn(`[Step2] VALIDATION FAIL: deficit is falsy (${data.deficit})`)
    newErrors.deficit = 'Please select your deficit percentage'
  } else if (data.goal === 'lose' || data.goal === 'gain') {
    console.log(`[Step2] VALIDATION PASS: deficit = ${data.deficit}`)
  }

  if (!data.diet) {
    console.warn(`[Step2] VALIDATION FAIL: diet is falsy (${data.diet})`)
    newErrors.diet = 'Please select your diet type'
  } else {
    console.log(`[Step2] VALIDATION PASS: diet = '${data.diet}'`)
  }

  console.log('[Step2] ======== VALIDATION RESULT ========')
  console.log('[Step2] Errors found:', Object.keys(newErrors).length)
  console.log('[Step2] Error details:', newErrors)

  if (Object.keys(newErrors).length > 0) {
    console.log('[Step2] Validation FAILED - blocking navigation')
    onSetErrors?.(newErrors)
    return
  }

  console.log('[Step2] Validation PASSED - allowing navigation')
  onContinue()
}
```

### Test Flow:

1. Select values in Step 2 form
2. Click "See Your Results"
3. Check console for detailed validation trace
4. **Look for pattern:**
   ```
   [Step2] lifestyle: 'sedentary' (type: string)    ← User selected this
   [Step2] VALIDATION FAIL: lifestyle is falsy
   ```
   This is the smoking gun: data object is corrupted.

---

## Checkpoint 8: Macro Calculation useEffect Interference

### Check if macro calculation is triggering excessive re-renders:

In CalculatorApp.tsx, line 78, add:

```typescript
useEffect(() => {
  console.log('[CalculatorApp] Macro calculation triggered')
  console.log('[CalculatorApp] Current formData:', {
    lifestyle: formData.lifestyle,
    exercise: formData.exercise,
    goal: formData.goal,
    deficit: formData.deficit,
    diet: formData.diet,
  })

  if (formData.sex && formData.age && formData.weight &&
      (formData.heightFeet || formData.heightCm) &&
      formData.lifestyle &&
      formData.goal &&
      formData.diet) {
    console.log('[CalculatorApp] Macro calculation conditions MET - calculating...')
    try {
      // ... existing calculation code ...
      console.log('[CalculatorApp] Macro calculation SUCCESS')
    } catch (error) {
      console.error('[CalculatorApp] Macro calculation FAILED:', error)
    }
  } else {
    console.log('[CalculatorApp] Macro calculation conditions NOT MET')
    console.log('[CalculatorApp]   sex:', !!formData.sex)
    console.log('[CalculatorApp]   age:', !!formData.age)
    console.log('[CalculatorApp]   weight:', !!formData.weight)
    console.log('[CalculatorApp]   height:', !!(formData.heightFeet || formData.heightCm))
    console.log('[CalculatorApp]   lifestyle:', !!formData.lifestyle)
    console.log('[CalculatorApp]   goal:', !!formData.goal)
    console.log('[CalculatorApp]   diet:', !!formData.diet)
  }
}, [formData.sex, formData.age, formData.weight, formData.heightFeet, formData.heightInches, formData.heightCm, formData.lifestyle, formData.exercise, formData.goal, formData.deficit, formData.diet])
```

### Observe:
- How many times does this fire while filling Step 2?
- Does it show "conditions NOT MET" for Step 2 fields?
- Any error logs?

---

## Priority Order for Investigation

1. **First:** Run Checkpoint 1 (React DevTools) - quickest way to confirm state problem
2. **Second:** Run Checkpoint 2 (Network tab) - see if API calls are overwriting
3. **Third:** Run Checkpoint 4 (Supabase SQL) - check if data is corrupted in database
4. **Fourth:** Run Checkpoint 7 (Validation trace) - confirm which fields are missing
5. **Fifth:** Run remaining checkpoints for deep analysis

---

## Expected Findings

### Scenario A: Race Condition (Most Likely)
- Checkpoint 2: Supabase fetch happens during Step 2
- Checkpoint 3: formData changes 100ms, reverts 500ms
- Solution: Prevent session fetch during active form input

### Scenario B: RLS Policy Filtering (Possible)
- Checkpoint 4: SQL shows NULL values in form_data
- Checkpoint 2: Response has incomplete form_data
- Solution: Fix Supabase RLS policies

### Scenario C: Zustand Conflict (Possible)
- Checkpoint 6: Zustand and React hooks out of sync
- Checkpoint 7: Data type mismatch (numbers instead of strings)
- Solution: Consolidate to single state system

### Scenario D: Unknown Trigger (Less Likely)
- Checkpoints inconclusive
- Check for: service workers, browser extensions, proxy middleware
- Solution: Compare local vs production environment

---

**Signed:** Leo, Database Architect
**Status:** Investigation Checklist Complete
**Next Step:** Execute checkpoints 1-7 in order

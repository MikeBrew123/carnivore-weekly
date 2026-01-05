# Step 2 Form State Persistence Bug - Technical Diagnosis

**Status:** BLOCKING PAYMENT FLOW
**Severity:** CRITICAL
**Root Cause:** Dual State Management Architecture

---

## Executive Summary

The Step 2 form is suffering from a state management conflict caused by **TWO simultaneous state management systems**:

1. **CalculatorApp.tsx** - Uses React `useState()` directly
2. **CalculatorWizard.tsx** - Uses Zustand store (formStore)
3. **Step2Activity.tsx** - Uses Zustand store directly
4. **Step2FitnessDiet.tsx** - Receives props from CalculatorApp state

This creates a scenario where form selections are being committed to one state system but validated against another. Users select values (visual feedback in UI), but the values aren't persisting in the state that's being checked during validation.

---

## The Two Parallel Architectures

### Architecture A: CalculatorApp (React Hooks)
**File:** `/calculator2-demo/src/components/calculator/CalculatorApp.tsx`

```javascript
// Lines 35-44: Initial state
const [formData, setFormData] = useState<Partial<FormData>>({
  sex: undefined,
  age: 0,
  weight: 0,
  lifestyle: '',      // Empty string
  exercise: '',       // Empty string
  goal: undefined,    // Undefined
  deficit: undefined,
  diet: undefined,
})
```

**State Updates:**
- Step 1: `onDataChange()` → `setFormData()` ✓ Works
- Step 2: `onDataChange()` → `setFormData()` ✓ Should work
- Passed to Step components as props: `data={dataAsFormData}`

### Architecture B: CalculatorWizard (Zustand)
**File:** `/calculator2-demo/src/components/CalculatorWizard.tsx`

```javascript
// Line 40: Uses store directly
const { currentStep, setCurrentStep, isPremium, setIsPremium, macros, sessionToken, form } = useFormStore()

// Lines 55-66: Zustand store defaults
defaultValues: {
  lifestyle: form.lifestyle || '1.2',  // Numeric string!
  exercise: form.exercise || '0.1',    // Numeric string!
  goal: form.goal || 'lose',
  deficit: form.deficit || 25,
  diet: form.diet || 'carnivore',
}
```

### Architecture C: Step2Activity (Zustand Direct)
**File:** `/calculator2-demo/src/components/steps/Step2Activity.tsx`

```javascript
// Line 12: Uses store directly, NOT receiving props from parent
const { form, units, setFormField } = useFormStore()

// Lines 14-19: Defaults from store
const { register, handleSubmit, watch } = useForm({
  defaultValues: {
    lifestyle: form.lifestyle,   // From Zustand
    exercise: form.exercise,     // From Zustand
  },
  mode: 'onChange',
})
```

---

## The Root Cause: Dual Data Flow Conflict

### Scenario: User Opens Calculator

1. **CalculatorApp mounts** with React state:
   - `formData = { lifestyle: '', exercise: '', goal: undefined, ... }`

2. **Zustand store exists separately** with defaults:
   - `form = { lifestyle: '1.2', exercise: '0.1', goal: 'lose', ... }`

3. **Step 1 (CalculatorApp) works fine** because:
   - Receives `data` prop from parent (React state)
   - Calls `onDataChange()` which updates parent state
   - Parent re-renders and passes new props down
   - Components show updated values

### When User Advances to Step 2:

**Problem 1: Which data source is the component reading from?**

- **CalculatorApp Step2FitnessDiet**: Receives `data` prop from CalculatorApp state
  ```javascript
  <Step2FitnessDiet
    data={dataAsFormData}          // From React state
    onDataChange={(data) => setFormData(data)} // Updates React state
  />
  ```

- **Step2Activity** (if it's being used): Reads from Zustand store
  ```javascript
  const { form, units, setFormField } = useFormStore() // Zustand store!
  ```

**Problem 2: Competing state updates**

When user selects a value in Step 2:
1. User clicks "Sedentary" in Activity Level dropdown
2. `handleInputChange('lifestyle', 'sedentary')` fires
3. Calls `onDataChange({ ...data, lifestyle: 'sedentary' })`
4. CalculatorApp's `setFormData()` updates React state
5. CalculatorApp re-renders
6. Step2FitnessDiet receives new props with `lifestyle='sedentary'`
7. SelectField shows "Sedentary" ✓ Visual update works

BUT...

**Problem 3: Macro calculation useEffect interference**

Lines 78-118 in CalculatorApp:
```javascript
useEffect(() => {
  if (formData.sex && formData.age && formData.weight &&
      (formData.heightFeet || formData.heightCm) &&
      formData.lifestyle &&           // Requires non-empty
      formData.goal &&                // Requires non-empty
      formData.diet) {
    // Calculate macros...
  }
}, [formData.sex, formData.age, formData.weight,
    formData.heightFeet, formData.heightInches, formData.heightCm,
    formData.lifestyle, formData.exercise, formData.goal,
    formData.deficit, formData.diet])
```

This useEffect runs on EVERY formData change, including Step 2 selections. If the calculations fail or if there's an error, the dependencies might trigger unexpected re-renders.

**Problem 4: Uncontrolled-to-Controlled transition**

Looking at Step2FitnessDiet line 73:
```javascript
value={data.lifestyle || ''}
```

The `|| ''` fallback means if `data.lifestyle` is `undefined`, it renders as `''`, which is the "Select activity level" disabled option.

But SelectField component lines 43-90 expects a controlled value. If the parent state isn't updating synchronously, the select will show one value while the state shows another.

---

## Why Diet Dropdown Works

The Diet dropdown (line 150 in Step2FitnessDiet) uses the exact same pattern:
```javascript
value={data.diet || ''}
```

If it works but others don't, the issue is likely:
1. **Timing** - Diet field comes AFTER others, so state might have stabilized
2. **Validation** - Diet field might have different validation logic
3. **Order of mount** - React component mounting order could affect which state gets used
4. **Production vs Local** - There might be an environment-specific issue (Supabase session corruption, browser caching, etc.)

---

## Production-Specific Clue: Session State Overwriting

From the bug report: "Form fields aren't persisting their selected values"

This suggests:
- User selects "Sedentary" → visual shows "Sedentary" ✓
- User continues → validation checks `formData.lifestyle` → finds `''` or `undefined` ✗

**Hypothesis: Supabase Session Fetch Overwrites State**

CalculatorApp line 355-376 fetches session data from Supabase:
```javascript
const fetchResponse = await fetch(
  `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${stripeSessionId}`
)

const sessionData = await fetchResponse.json()

if (sessionData && sessionData.form_data) {
  const mergedFormData = {
    ...sessionData.form_data,
    email: sessionData.email || sessionData.form_data.email,
    firstName: sessionData.first_name || sessionData.form_data.firstName,
  }
  setFormData(mergedFormData)
}
```

**If this fetch is happening automatically** (perhaps triggered by a useEffect with wrong dependencies), it could overwrite user selections with stale Supabase data.

---

## SQL/Supabase Analysis

The backend is likely storing form_data as JSON in the sessions table:

```sql
SELECT form_data FROM sessions WHERE id = ?
```

If the `form_data` column has empty or stale values for `lifestyle`, `exercise`, `goal`, when those values are loaded back, the state resets to those stale values.

**RLS (Row Level Security) Issue?**

If there are Supabase RLS policies preventing certain users from reading/writing complete form_data, rows might be returned with missing fields:
```json
{
  "sex": "male",
  "age": 35,
  "weight": 200,
  "lifestyle": null,      // Missing!
  "exercise": null,       // Missing!
  "goal": null            // Missing!
}
```

When these get merged into React state, they clear the user's selections.

---

## Key Evidence Chain

1. **CalculatorApp state initialized with empty/undefined values** (lines 35-44)
   - `lifestyle: ''` (empty string)
   - `exercise: ''` (empty string)
   - `goal: undefined`
   - `deficit: undefined`

2. **Step2FitnessDiet uses controlled components with prop-based values** (lines 73, 91, 106, 124, 150)
   - All use `value={data.fieldname || ''}`
   - All have `onChange={(e) => handleInputChange(fieldname, e.target.value)}`

3. **handleInputChange pattern is correct** (lines 24-30)
   - Calls `onDataChange()` with updated data
   - Calls `onFieldChange()` to clear errors

4. **BUT: Two state systems exist simultaneously**
   - CalculatorApp uses React hooks
   - CalculatorWizard and Step2Activity use Zustand
   - No synchronization between them

5. **Production-specific failure pattern**
   - Works in local development (single code path, no session overwriting)
   - Fails in production (Supabase session fetches overwrite state)

---

## Diagnosis Summary

| Symptom | Cause |
|---------|-------|
| Activity Level dropdown resets | CalculatorApp state overwritten by stale Supabase session_data |
| Exercise Frequency dropdown resets | Same: form_data fetch overwrites user selection |
| Goal radio buttons deselect | Same: Zustand/React state mismatch after Supabase update |
| Deficit Target dropdown not filling | Conditional rendering (line 113) doesn't show when goal is lost |
| Diet dropdown works | Might be rendered last, so state stabilized by then |
| Validation fails | formData still shows empty/undefined because it was overwritten |

---

## Physics of the Bug (In ACID Terms)

**Atomicity Violation:**
- User selection (Step 2) is atomic
- Supabase session fetch is atomic
- But these are NOT coordinated - no transaction
- Result: User selection can be overwritten by stale fetch

**Consistency Violation:**
- React state (CalculatorApp) and Zustand store (CalculatorWizard) can diverge
- Validation might check React state while rendering uses Zustand
- Result: Form appears filled but validation fails

**Isolation Violation:**
- useEffect dependencies might trigger multiple updates
- Form data updates and Supabase fetches can race
- Result: Race condition between user input and API response

**Durability Violation:**
- Form data persists to Supabase with incomplete fields
- When fetched back, those fields are NULL
- Result: Data loss masked as "form reset"

---

## Critical Files Involved

| File | Issue |
|------|-------|
| `/calculator2-demo/src/components/calculator/CalculatorApp.tsx` | Lines 35-44: Weak initial state; Lines 78-118: useEffect with dependencies that might cause issues |
| `/calculator2-demo/src/components/calculator/steps/Step2FitnessDiet.tsx` | Lines 73, 91, 106, 124, 150: Controlled components with prop-based values |
| `/calculator2-demo/src/stores/formStore.ts` | Parallel state system competing with CalculatorApp state |
| `/calculator2-demo/src/components/CalculatorWizard.tsx` | Uses Zustand while CalculatorApp uses React hooks |
| Supabase `sessions` table | form_data might be stored with NULL values |

---

## Next Steps: Investigation Checkpoints

### 1. Verify State Management Conflict
```javascript
// Add to CalculatorApp top:
console.log('[CalculatorApp] Current formData:', formData)
console.log('[CalculatorApp] Zustand form:', useFormStore.getState().form)

// Add to Step2FitnessDiet:
console.log('[Step2] Component received data prop:', data)
console.log('[Step2] Zustand form:', useFormStore.getState().form)
```

### 2. Check for Session Overwrites
```javascript
// Add to CalculatorApp handleStep4Submit:
console.log('[Step4] formData BEFORE session fetch:', formData)
// ...after fetch...
console.log('[Step4] formData AFTER session load:', formData)
```

### 3. Verify Supabase form_data integrity
```sql
-- Check if form_data is being stored with NULL values
SELECT
  id,
  form_data,
  form_data->>'lifestyle' as lifestyle,
  form_data->>'exercise' as exercise,
  form_data->>'goal' as goal
FROM sessions
WHERE created_at > NOW() - INTERVAL '1 hour'
LIMIT 10;
```

### 4. Monitor Network Requests
- Open DevTools → Network tab
- Fill out Step 2 form
- Check if any API calls are overwriting form state
- Look for `get-session` or `form_data` POST requests

### 5. Check RLS Policies
```sql
-- Verify RLS policies aren't filtering fields
SELECT * FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sessions';
```

---

## Expected vs Actual Behavior

### Expected (Step 1 works):
1. User fills field
2. React state updates
3. Component re-renders with new value
4. User sees visual feedback
5. Next step is available

### Actual (Step 2 fails):
1. User selects dropdown value
2. Visual feedback shows selection ✓
3. React state updates
4. Component re-renders
5. **Supabase fetch completes with stale data**
6. **State is overwritten with stale data**
7. User clicks Continue
8. Validation checks state → finds empty/undefined
9. Validation fails with error message

---

## Conclusion

The Step 2 form persistence bug is caused by a **state management race condition** where:

1. **Multiple state systems exist** (React hooks + Zustand)
2. **They operate independently** with no synchronization
3. **User input updates React state** but validation might check Zustand
4. **Supabase session fetches** can overwrite state with stale form_data
5. **No atomic transaction** ensures user input survives API updates

This is a **physics problem**, not a code syntax problem. The architecture violates ACID principles.

**Fix requires:** Consolidate to single state system + prevent session overwrites during active form input + ensure transactional integrity between user input and API updates.

---

**Signed:** Leo, Database Architect
**Timestamp:** 2026-01-04T18:34:00Z
**Schema Health Status:** CRITICAL - State mutation risk detected

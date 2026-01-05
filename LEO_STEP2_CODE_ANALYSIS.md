# Step 2 Form State Persistence - Code-Level Analysis

## The Broken Flow: Line-by-Line

### Initialization Issue: CalculatorApp.tsx (Lines 35-44)

```typescript
// Current Implementation (BROKEN)
const [formData, setFormData] = useState<Partial<FormData>>({
  sex: undefined,
  age: 0,
  weight: 0,
  lifestyle: '',      // <-- PROBLEM: Empty string, not undefined
  exercise: '',       // <-- PROBLEM: Empty string, not undefined
  goal: undefined,    // <-- PROBLEM: Inconsistent type (undefined vs string)
  deficit: undefined,
  diet: undefined,
})
```

**Issue:** Inconsistent initialization:
- Step 1 fields: Numbers (age: 0, weight: 0)
- Step 2 Activity fields: Empty strings (lifestyle: '', exercise: '')
- Step 2 Goal fields: Undefined (goal: undefined)
- Step 2 Diet: Undefined (diet: undefined)

This creates a type mismatch where:
- FormData expects: `lifestyle: string`, `exercise: string`, `goal: 'lose' | 'maintain' | 'gain'`
- But state initializes with: `''`, `''`, `undefined`

When form validation checks these fields (lines 36-40), it uses:
```javascript
if (!data.lifestyle) newErrors.lifestyle = 'Please select...'
```

Empty string `''` is falsy → triggers error even if user just hasn't selected yet (intentional).
But if state gets overwritten with `''` by accident, it's indistinguishable from "user hasn't selected."

---

### The Controlled Component Chain: Step2FitnessDiet.tsx

#### SelectField for Activity Level (Lines 62-77)

```typescript
<SelectField
  name="lifestyle"
  label="Activity Level"
  options={[
    { value: '', label: 'Select activity level', disabled: true },
    { value: 'sedentary', label: '🪑 Sedentary (desk job, little exercise)' },
    { value: 'light', label: '🚶 Lightly Active (light exercise 1-3 days/week)' },
    // ... more options
  ]}
  value={data.lifestyle || ''}  // <-- LINE 73: Prop-based controlled value
  onChange={(e) => handleInputChange('lifestyle', e.target.value)}  // <-- Handler
  error={errors.lifestyle}
  required
/>
```

**How this SHOULD work:**

1. User clicks "Sedentary" option
2. Browser's native `<select>` fires `onChange` event
3. `e.target.value` = `'sedentary'`
4. Handler: `handleInputChange('lifestyle', 'sedentary')` is called
5. Handler implementation (lines 24-30):
   ```javascript
   const handleInputChange = (field: string, value: any) => {
     onDataChange({ ...data, [field]: value })  // <-- Update parent
     if (value !== '' && value !== undefined && value !== null && onFieldChange) {
       onFieldChange(field)  // <-- Clear error
     }
   }
   ```
6. `onDataChange()` is called with: `{ ...data, lifestyle: 'sedentary' }`
7. Parent (CalculatorApp) receives this via props callback (line 438):
   ```javascript
   onDataChange={(data) => setFormData(data as Partial<FormData>)}
   ```
8. Parent calls: `setFormData({ ...data, lifestyle: 'sedentary' })`
9. Parent re-renders with new state
10. Step2FitnessDiet receives new props: `data = { ...oldData, lifestyle: 'sedentary' }`
11. SelectField re-renders with new `value={data.lifestyle || ''}` = `'sedentary'`
12. Browser shows "Sedentary" selected ✓

**But WHAT IF:**
- Step 6 above completes
- User visually sees "Sedentary" selected ✓
- But BEFORE step 9 completes, Supabase fetch returns old data
- Parent re-renders with OLD state: `{ ...oldData, lifestyle: '' }`
- SelectField re-renders with `value={data.lifestyle || ''}` = `''`
- Browser resets to "Select activity level"
- User's selection is lost

---

### The Radio Button Problem: Goal Selection (Lines 98-110)

```typescript
<RadioGroup
  name="goal"
  label="What's Your Goal?"
  options={[
    { value: 'lose', label: 'Fat Loss', description: 'Lose weight while preserving muscle' },
    { value: 'maintain', label: 'Maintenance', description: 'Maintain current weight' },
    { value: 'gain', label: 'Muscle Gain', description: 'Build muscle mass' },
  ]}
  value={data.goal || ''}  // <-- LINE 106: Problem similar to SelectField
  onChange={(value) => handleInputChange('goal', value)}
  error={errors.goal}
  required
/>
```

**In RadioGroup.tsx (lines 46-82):**

```typescript
{options.map((option) => (
  <label key={option.value} style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '12px' }}>
    <input
      type="radio"
      name={name}
      value={option.value}
      checked={value === option.value}  // <-- LINE 53: Compares prop value with option
      onChange={(e) => onChange(e.target.value)}  // <-- Calls onChange handler
      required={required}
      style={{ marginTop: '4px', width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ffd700' }}
    />
    // ...
  </label>
))}
```

**The Problem:**

If `data.goal` is `undefined`:
- `value = data.goal || ''` = `''`
- No radio button has `value=""` in options
- Line 53: `checked = ('' === 'lose')` = `false`
- Line 53: `checked = ('' === 'maintain')` = `false`
- Line 53: `checked = ('' === 'gain')` = `false`
- **All radio buttons are unchecked**

User clicks "Fat Loss":
- `onChange` fires
- `handleInputChange('goal', 'lose')` is called
- Parent updates: `setFormData({ ...data, goal: 'lose' })`
- Parent re-renders
- Step2FitnessDiet receives: `data.goal = 'lose'`
- RadioGroup receives: `value = 'lose'`
- Line 53: `checked = ('lose' === 'lose')` = `true`
- Radio button shows selected ✓

**But if Supabase overwrites state AFTER visual update:**
- Parent receives stale data: `{ ...oldData, goal: undefined }`
- Step2FitnessDiet receives: `data.goal = undefined`
- RadioGroup receives: `value = undefined || '' = ''`
- Line 53: All checks become `false`
- **All radio buttons deselect**

---

### The Conditional Rendering Trap: Deficit Dropdown (Lines 113-129)

```typescript
{(data.goal === 'lose' || data.goal === 'gain') && (
  <SelectField
    name="deficit"
    label={data.goal === 'lose' ? 'Deficit Target' : 'Surplus Target'}
    options={[
      { value: '', label: `Select ${data.goal === 'lose' ? 'deficit' : 'surplus'}`, disabled: true },
      { value: '10', label: '10% (Conservative, sustainable)' },
      { value: '15', label: '15% (Moderate)' },
      { value: '20', label: '20% (Aggressive)' },
      { value: '25', label: '25% (Very aggressive)' },
    ]}
    value={data.deficit?.toString() || ''}  // <-- LINE 124: .toString() issue
    onChange={(e) => handleInputChange('deficit', parseInt(e.target.value) || '')}  // <-- parseInt issue
    error={errors.deficit}
    required
  />
)}
```

**Problems:**

1. **Line 124: Type coercion issue**
   ```javascript
   value={data.deficit?.toString() || ''}
   ```
   If `data.deficit = undefined`:
   - `undefined?.toString()` = `undefined`
   - `undefined || ''` = `''`
   - Correct behavior

   If `data.deficit = 20`:
   - `(20).toString()` = `'20'`
   - Correct

   But if state is corrupted and `data.deficit = 0`:
   - `(0).toString()` = `'0'`
   - But `'0'` is not an option
   - Dropdown shows "Select deficit"
   - Visual reset

2. **Line 125: parseInt issue**
   ```javascript
   onChange={(e) => handleInputChange('deficit', parseInt(e.target.value) || '')}
   ```
   If user selects '20':
   - `parseInt('20')` = `20`
   - Handler: `handleInputChange('deficit', 20)` ✓

   But if user clicks "Select deficit" (value=''):
   - `parseInt('')` = `NaN`
   - `NaN || ''` = `''`
   - Handler: `handleInputChange('deficit', '')`
   - State gets: `{ deficit: '' }` (type error!)
   - Should be: `{ deficit: undefined }` or `{ deficit: null }`

3. **Line 113: Conditional rendering**
   ```javascript
   {(data.goal === 'lose' || data.goal === 'gain') && (
   ```
   If `data.goal` is corrupted (undefined), the entire Deficit field DOM is removed.
   User might have selected a deficit, but the field unmounts.
   When state is corrected and `data.goal = 'lose'` again, the field remounts with no value.

---

### The Validation Flow: Step2FitnessDiet handleContinue (Lines 32-52)

```typescript
const handleContinue = () => {
  console.log('[Step2] Continue clicked. Current data:', data)  // <-- LINE 33
  const newErrors: Record<string, string> = {}

  if (!data.lifestyle) newErrors.lifestyle = 'Please select your activity level'  // <-- LINE 36
  if (!data.exercise) newErrors.exercise = 'Please select your exercise frequency'  // <-- LINE 37
  if (!data.goal) newErrors.goal = 'Please select your goal'  // <-- LINE 38
  if ((data.goal === 'lose' || data.goal === 'gain') && !data.deficit) {
    newErrors.deficit = 'Please select your deficit percentage'  // <-- LINE 39
  }
  if (!data.diet) newErrors.diet = 'Please select your diet type'  // <-- LINE 40

  console.log('[Step2] Validation errors:', newErrors)  // <-- LINE 42

  if (Object.keys(newErrors).length > 0) {
    console.log('[Step2] Validation failed, setting errors')
    onSetErrors?.(newErrors)  // <-- LINE 46
    return  // <-- LINE 47: Block navigation
  }

  console.log('[Step2] Validation passed, calling onContinue()')
  onContinue()  // <-- LINE 51: Allow navigation to Step 3
}
```

**The Bug Manifestation:**

When user clicks "See Your Results" button (line 206):
```javascript
<button onClick={handleContinue} ...>
  See Your Results
</button>
```

Validation logic:
1. Line 36: `if (!data.lifestyle)` → `if (!'')` → `if (true)` → Error triggered
2. But wait... user selected "Sedentary" visually
3. So `data.lifestyle` should be `'sedentary'`
4. But if Supabase overwrote it with `''`, then:
5. Line 36: `if (!'sedentary')` → `if (false)` → No error ✓
6. BUT if `data.lifestyle` shows as `''` or `undefined`:
7. Line 36: Triggers error ✗

**The user experience:**

User sees in UI:
- Activity Level: "Sedentary" visually shown as selected ✓
- Exercise: "1-2 days per week" visually shown ✓
- Goal: "Fat Loss" visually selected ✓
- Deficit: "20%" visually selected ✓
- Diet: "Carnivore" visually selected ✓

User clicks "See Your Results" → Gets error:
- "Please select your activity level" ❌
- "Please select your exercise frequency" ❌
- "Please select your goal" ❌
- "Please select your deficit percentage" ❌

**Why?** Because the `data` object passed to validation is stale/corrupted, even though the visual UI appears correct.

---

### The Macro Calculation useEffect: Potential Culprit (Lines 78-118)

```typescript
useEffect(() => {
  if (formData.sex && formData.age && formData.weight &&
      (formData.heightFeet || formData.heightCm) &&
      formData.lifestyle &&      // <-- Requires string that's truthy
      formData.goal &&           // <-- Requires string that's truthy
      formData.diet) {           // <-- Requires string that's truthy
    try {
      // Calculate BMR, TDEE, macros...
      setMacros(calculatedMacros)
    } catch (error) {
      console.error('Macro calculation error:', error)
    }
  }
}, [
  formData.sex, formData.age, formData.weight,
  formData.heightFeet, formData.heightInches, formData.heightCm,
  formData.lifestyle, formData.exercise, formData.goal,
  formData.deficit, formData.diet
])
```

**The Dependency Array Issue:**

Every time ANY of these dependencies change, the effect runs:
- formData.lifestyle changes from `''` to `'sedentary'` → Effect runs
- formData.goal changes from `undefined` to `'lose'` → Effect runs
- formData.deficit changes from `undefined` to `20` → Effect runs

This is correct for calculating macros, but if the effect throws an error (line 115), it's silently caught and logged, potentially leaving the component in an inconsistent state.

**More importantly:** If Supabase fetch overwrites formData while this effect is running:
1. User sets formData.lifestyle = 'sedentary'
2. Effect starts (dependencies changed)
3. Calculation begins
4. Supabase fetch completes (different task)
5. Overwrites formData with stale data: formData.lifestyle = ''
6. Component re-renders
7. Effect runs again (dependencies changed again!)
8. But now data is stale

This creates a race condition where the macro calculation and state update are competing.

---

### The Zustand Store Parallel System: Complication (formStore.ts)

```typescript
export const useFormStore = create<FormStore>((set) => ({
  form: defaultForm,  // <-- Has different defaults than CalculatorApp!

  setFormField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
    })),
}))
```

**Parallel Defaults:**

```javascript
// CalculatorApp.tsx:
lifestyle: '',      // Empty string
exercise: '',       // Empty string
goal: undefined

// formStore.ts defaultForm:
lifestyle: '1.2',   // Numeric string!
exercise: '0.1',    // Numeric string!
goal: 'lose',       // String value
```

**The Conflict:**

If Step2FitnessDiet sometimes reads from Zustand and sometimes from CalculatorApp props:
- Zustand says: `lifestyle = '1.2'` (numeric activity multiplier)
- CalculatorApp says: `lifestyle = 'sedentary'` (category string)
- Macro calculation expects numeric multiplier: `'1.2'`, `'1.375'`, etc.
- But SelectField options provide: `'sedentary'`, `'light'`, etc.

These are **incompatible data models**!

---

## Summary: The Cascade of Failures

```
User Action
    ↓
handleInputChange() executes
    ↓
onDataChange() with new value
    ↓
CalculatorApp.setFormData() updates React state
    ↓
Component re-renders with new props
    ↓
SelectField shows visual update ✓
    ↓
[RACE CONDITION START]
    ↓
Supabase fetch returns (if happening in background)
    ↓
Session data overwrites formData with stale values
    ↓
Component re-renders with OLD data
    ↓
SelectField resets to "Select..."
    ↓
User sees visual reset ❌
    ↓
[RACE CONDITION END]
    ↓
User clicks "See Your Results"
    ↓
handleContinue() checks formData
    ↓
formData shows stale/empty values
    ↓
Validation fails ✗
    ↓
Error messages appear
    ↓
Payment flow blocked ❌
```

---

## Conclusion

The Step 2 form persistence bug is fundamentally a **state management race condition** caused by:

1. **Dual state systems** (React hooks + Zustand) with conflicting data models
2. **Async Supabase fetches** that overwrite state without coordination
3. **Type mismatches** between different layers (numeric strings vs category strings)
4. **Race conditions** between user input and background API calls
5. **Conditional rendering** that unmounts/remounts fields, losing values

The fix requires:
- Unified state system
- Transactional coordination between user input and API updates
- Proper type consistency across layers
- Prevention of stale data overwrites during active form interaction

**Signed:** Leo, Database Architect
**Timestamp:** 2026-01-04T18:34:00Z

# State Management Architecture - Visual Diagrams

---

## Current Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CalculatorApp.tsx                         │
│                                                                   │
│  const [formData, setFormData] = useState(...)  ← REACT STATE    │
│  └─ sex, age, weight, lifestyle, exercise, goal, diet, deficit  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Step1PhysicalStats                                       │   │
│  │ Props: data, onDataChange                               │   │
│  │ onDataChange → setFormData (React state)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Step2FitnessDiet                                         │   │
│  │ Props: data, onDataChange                               │   │
│  │ onDataChange → setFormData (React state) ← USER TYPES   │   │
│  │                                                          │   │
│  │ When "Continue" clicked:                                │   │
│  │ 1. Validate Step2 fields                                │   │
│  │ 2. onContinue() → setCurrentStep(3)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Supabase Fetch (lines 355-376):                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ fetch(`get-session?id=${stripeSessionId}`)              │   │
│  │ ↓                                                        │   │
│  │ const sessionData = await response.json()               │   │
│  │ ↓                                                        │   │
│  │ setFormData(mergedFormData)  ← RACE CONDITION!          │   │
│  │                                                          │   │
│  │ PROBLEM: No guard against overwriting user input        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

        ↓ (UNUSED - Never synced with React state)

┌─────────────────────────────────────────────────────────────────┐
│                      formStore.ts (Zustand)                      │
│                                                                   │
│  const { form, setFormField, setForm } = useFormStore()         │
│                                                                   │
│  Used only by: Step1Basic, Step2Activity, Step4Health, etc.     │
│  NOT used by: CalculatorApp (uses useState instead)             │
│                                                                   │
│  Result: Two parallel state systems that don't talk             │
└─────────────────────────────────────────────────────────────────┘
```

### The Race Condition Timeline

```
Time  Event                           React State              Zustamd Store
────  ─────────────────────────────   ────────────────        ──────────────
T0    Page loads
      formData = {}                   Empty {}                Empty
      isDirty = false

T1    User selects lifestyle          formData.lifestyle      (not synced)
                                      = "moderate"

T2    User selects exercise           formData.exercise       (not synced)
                                      = "3-4"

T3    User selects goal               formData.goal           (not synced)
                                      = "lose"

T4    User selects deficit            formData.deficit        (not synced)
                                      = 15

T5    User selects diet               formData.diet           (not synced)
                                      = "carnivore"

T6    ✓ All Step 2 fields filled ✓    Complete data           (not synced)
      User ready to validate

T7    Background Supabase fetch       (form still complete)   (not synced)
      completes at this moment
      Returns stale data with NULLs
      for Step 2 fields (form
      was incomplete when saved)

T8    setFormData(mergedFormData)     ← OVERWRITES with      (not synced)
      is called with stale data         NULL Step 2 fields
                                       Step 2 fields WIPED!

T9    User clicks "Continue"          Validation checks
      Checks formData.lifestyle       = "" (NULL) ✗ ERROR
      formData.exercise               = "" (NULL) ✗ ERROR
      formData.goal                   = "" (NULL) ✗ ERROR
      formData.deficit                = "" (NULL) ✗ ERROR
      formData.diet                   = "" (NULL) ✗ ERROR

T10   ❌ VALIDATION FAILS ❌           Form data lost          User blocked
      Payment flow blocked            Page shows errors
```

---

## New Architecture (FIXED)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CalculatorApp.tsx                         │
│                                                                   │
│  const { form: formData, setForm: setFormData, isDirty,         │
│          markDirty, markClean } = useFormStore()                │
│  ↑ SINGLE SOURCE OF TRUTH - Zustand, not React state            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Step1PhysicalStats                                       │   │
│  │ Props: data, onDataChange                               │   │
│  │ onDataChange → setFormData (from Zustand)               │   │
│  │ Auto triggers: isDirty = true                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Step2FitnessDiet                                         │   │
│  │ Props: data, onDataChange                               │   │
│  │ onDataChange → setFormData (from Zustand) ← USER TYPES  │   │
│  │ Auto triggers: isDirty = true                           │   │
│  │                                                          │   │
│  │ When "Continue" clicked:                                │   │
│  │ 1. isDirty = true (user is editing)                     │   │
│  │ 2. Validate Step2 fields (all data in formData)         │   │
│  │ 3. onContinue() → setCurrentStep(3)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Supabase Fetch (GUARDED):                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ if (isDirty) {                                           │   │
│  │   markClean()                                            │   │
│  │   setCurrentStep(4)                                      │   │
│  │   return ← EXIT EARLY, DON'T FETCH                      │   │
│  │ }                                                        │   │
│  │                                                          │   │
│  │ // Only fetch if form is still clean (untouched)        │   │
│  │ fetch(`get-session?id=${stripeSessionId}`)              │   │
│  │ ↓                                                        │   │
│  │ const sessionData = await response.json()               │   │
│  │ ↓                                                        │   │
│  │ if (sessionData && !isDirty) {  ← CHECK AGAIN           │   │
│  │   setFormData(mergedFormData)                           │   │
│  │   markClean()                                            │   │
│  │ }                                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

        ↓ (NOW UNIFIED - Zustand is source of truth)

┌─────────────────────────────────────────────────────────────────┐
│                      formStore.ts (Zustand)                      │
│                                                                   │
│  interface FormStore {                                            │
│    form: FormData                                                 │
│    isDirty: boolean  ← NEW: Tracks if user is editing            │
│                                                                   │
│    setFormField(field, value)  → Sets isDirty = true auto       │
│    setForm(formUpdate)          → Sets isDirty = true auto      │
│    markDirty()                  → Sets isDirty = true            │
│    markClean()                  → Sets isDirty = false           │
│  }                                                                 │
│                                                                   │
│  Used by: CalculatorApp, Step1, Step2, Step3, Step4, etc.       │
│  Result: Unified state management + race condition guard         │
└─────────────────────────────────────────────────────────────────┘
```

### The Fixed Timeline

```
Time  Event                           Zustand State          isDirty Flag
────  ─────────────────────────────   ─────────────────────  ─────────────
T0    Page loads
      form = {}                       Empty                  false

T1    User selects lifestyle          form.lifestyle =       true
                                      "moderate"

T2    User selects exercise           form.exercise =        true
                                      "3-4"

T3    User selects goal               form.goal =            true
                                      "lose"

T4    User selects deficit            form.deficit =         true
                                      15

T5    User selects diet               form.diet =            true
                                      "carnivore"

T6    ✓ All Step 2 fields filled ✓    Complete form          true ← IMPORTANT
      isDirty = true (user editing)

T7    Background Supabase fetch       (form still complete)  (true)
      completes
      Returns stale data with NULLs

T8    Check guard: if (isDirty)?      Guard checks           true
      YES → Skip fetch!
      markClean()                     isDirty = false
      setCurrentStep(4)

T9    Supabase fetch is SKIPPED       Form preserved         false
      User data NOT overwritten

T10   ✓ VALIDATION PASSES ✓           Complete form data     false
      User proceeds to Step 3         Ready for next step
      Payment flow continues          ✅ SUCCESS

```

---

## Data Flow Comparison

### BEFORE (Broken - Two Systems)

```
User Types in Step 2
        ↓
Step2 Component
        ↓
onDataChange(updated)
        ↓
CalculatorApp.setFormData(updated)
        ↓
React State Updated
        ↓
Component Re-renders ✓
        ↓
BUT: Zustand store UNCHANGED (not synced)
        ↓
Supabase Fetch Completes
        ↓
Calls setFormData(staleData)
        ↓
React State OVERWRITTEN with stale data ✗
        ↓
Component Re-renders with blank fields ✗
```

### AFTER (Fixed - One System)

```
User Types in Step 2
        ↓
Step2 Component
        ↓
onDataChange(updated)
        ↓
CalculatorApp.setFormData(updated)
        ↓
Zustand Store Updated + isDirty = true
        ↓
Component Re-renders ✓
        ↓
Supabase Fetch Completes
        ↓
Check: if (isDirty) { skip fetch, return }
        ↓
isDirty is TRUE → Fetch SKIPPED ✓
        ↓
User Data PRESERVED ✓
        ↓
Validation Passes ✓
        ↓
Step 3 Results Page Loads ✓
```

---

## State Lifecycle

### Component Lifecycle with isDirty Flag

```
┌─────────────────────────────────────────────────────┐
│ Initial State                                       │
│ formData = {}                                       │
│ isDirty = false                                     │
│ currentStep = 1                                     │
│                                                     │
│ Ready for: Fresh start or Supabase restore        │
└─────────────────────────────────────────────────────┘
        ↓ (User starts typing in form)
┌─────────────────────────────────────────────────────┐
│ User Editing State                                  │
│ formData = { sex: "male", age: 30, ... }           │
│ isDirty = true ← LOCKED: No Supabase overwrites    │
│ currentStep = 2                                     │
│                                                     │
│ Protected from: Supabase restore, background updates│
└─────────────────────────────────────────────────────┘
        ↓ (User clicks "Continue" - validation passes)
┌─────────────────────────────────────────────────────┐
│ Form Submitted State                                │
│ formData = { complete step 2 data }                │
│ isDirty = false ← UNLOCKED: Safe for next operation│
│ currentStep = 3                                     │
│                                                     │
│ Ready for: Next step, Supabase operations           │
└─────────────────────────────────────────────────────┘
        ↓ (Click "Upgrade" → Success page → Continue)
┌─────────────────────────────────────────────────────┐
│ Premium Flow State                                  │
│ formData = { all step 2 data }                     │
│ isDirty = true ← User is on Step 4 health form    │
│ currentStep = 4                                     │
│                                                     │
│ Protected: Health form input not overwritten       │
└─────────────────────────────────────────────────────┘
        ↓ (User submits health profile)
┌─────────────────────────────────────────────────────┐
│ Report Generation State                             │
│ formData = { complete all 4 steps }               │
│ isDirty = false ← Form complete, generating report │
│ currentStep = "generating"                         │
│                                                     │
│ Ready for: Report download, completion screen      │
└─────────────────────────────────────────────────────┘
```

---

## Code Structure

### Before (Complex - Two Systems)

```
CalculatorApp
├─ useState: formData
├─ useState: currentStep
├─ useState: macros
├─ useState: errors
├─ useEffect: macro calculation
├─ useEffect: payment check
│
├─ Step1PhysicalStats
│  ├─ Props: data (from useState)
│  ├─ Props: onDataChange → setFormData
│  └─ Problem: Only updates React state
│
└─ Step2FitnessDiet
   ├─ Props: data (from useState)
   ├─ Props: onDataChange → setFormData
   └─ Problem: No guard against overwrites

formStore (Zustand)
├─ form: FormData
├─ setFormField: (never called by CalculatorApp)
├─ setForm: (never called by CalculatorApp)
└─ Problem: Unused, parallel state system
```

### After (Simple - One System)

```
CalculatorApp
├─ useFormStore: form, setForm, isDirty, markDirty, markClean
├─ useState: currentStep (UI only)
├─ useState: macros (UI only)
├─ useState: errors (UI only)
├─ useEffect: macro calculation
├─ useEffect: payment check
│
├─ Step1PhysicalStats
│  ├─ Props: data (from Zustand)
│  ├─ Props: onDataChange → setForm (to Zustand)
│  └─ Benefit: Auto triggers isDirty = true
│
└─ Step2FitnessDiet
   ├─ Props: data (from Zustand)
   ├─ Props: onDataChange → setForm (to Zustand)
   └─ Benefit: Guarded from overwrites

formStore (Zustand - SINGLE SOURCE)
├─ form: FormData
├─ isDirty: boolean ← Guard flag
├─ setFormField: (auto isDirty = true)
├─ setForm: (auto isDirty = true)
├─ markDirty: () => { isDirty = true }
├─ markClean: () => { isDirty = false }
└─ Benefit: Unified, guarded state system
```

---

## Guard Mechanism Detail

```
                    Supabase Fetch Triggered
                              │
                              ↓
                    ┌──────────────────────┐
                    │ if (isDirty) {       │
                    │                      │
                    │  markClean()         │
                    │  proceed()           │
                    │  return ← EXIT       │
                    │ }                    │
                    └──────────────────────┘
                         │           │
                    YES  │           │ NO
                         ↓           ↓
            ┌──────────────────┐   ┌──────────────────────┐
            │ User is editing  │   │ Form is clean        │
            │                  │   │ User hasn't started  │
            │ Skip fetch       │   │ editing yet          │
            │ Use local data   │   │                      │
            │ ✓ Data preserved │   │ Proceed with fetch   │
            │                  │   │ Restore from         │
            │                  │   │ Supabase             │
            │                  │   │ ✓ Session sync       │
            └──────────────────┘   └──────────────────────┘
```

---

## Summary

**Key Insight:** `isDirty` is a simple boolean semaphore that prevents Supabase from overwriting local user edits.

It's:
- Set to `true` when user types (automatic)
- Set to `false` after validation/transition (manual)
- Checked before any Supabase restore operation
- The only guard needed to prevent the race condition

**Result:** Single state system + guarded fetch = Atomic form transitions with zero data loss.


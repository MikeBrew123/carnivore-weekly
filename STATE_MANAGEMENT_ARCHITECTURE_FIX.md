# Calculator Step 2 Form Issue - Architecture Fix Plan

**Diagnosis Date:** 2026-01-04
**Severity:** Critical - Blocks payment flow
**Root Cause:** Race condition between React useState and Zustand store during Supabase session fetch

---

## Executive Summary

The calculator has TWO independent state systems that don't communicate:
1. **CalculatorApp.tsx**: Uses React `useState` for form data
2. **formStore.ts**: Uses Zustand for global state (unused by CalculatorApp)

When user fills Step 2, a background Supabase fetch completes and overwrites the React state with stale data (NULL Step 2 fields), causing validation to fail.

**The fix:** Consolidate to ONE state system (Zustand), guard Supabase fetches with a "dirty flag", prevent overwrites during user input.

---

## Current Architecture (Broken)

### State Systems (NOT Synchronized)

```
CalculatorApp.tsx (Parent)
├─ const [formData, setFormData] = useState<Partial<FormData>>({...})
│  └─ Controls Step 1, Step 2, Step 4 input
│  └─ Reads for validation & macro calculation
│  └─ PROBLEM: Only used locally, never syncs to Zustand
│
└─ Step2FitnessDiet.tsx (Child)
   └─ Receives formData via props
   └─ Calls onDataChange() which calls setFormData()
   └─ PROBLEM: Changes go only to React state, not persisted to Zustand

formStore.ts (Global Zustand Store - UNUSED by CalculatorApp)
├─ form: FormData
├─ setFormField()
├─ setForm()
└─ PROBLEM: Never receives CalculatorApp changes
   Never read by CalculatorApp
   Only used by other components (Step1Basic, Step2Activity, etc.)
```

### The Race Condition

```
Timeline:
T0: User opens calculator, React state initialized empty
T1: User fills Step 2 form (lifestyle, exercise, goal, diet, deficit)
    → React state updated via setFormData()
T2: "Continue" button clicked
T3: Supabase background fetch completes (from line 355-376 CalculatorApp.tsx)
    → Fetches session with stale form_data (NULL for Step 2 fields)
    → Calls setFormData(mergedFormData) with incomplete data
T4: React re-renders with BLANK Step 2 fields
T5: Validation runs against empty state → FAILS
T6: User blocked from proceeding to Step 3
```

### Why This Happens

**Line 355-376 in CalculatorApp.tsx:**
```typescript
// Fetches the saved session from Supabase using the stripeSessionId
// NO STATE INTEGRITY CHECK - will overwrite user input
const fetchResponse = await fetch(
  `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${stripeSessionId}`,
  { method: 'GET', headers: { 'Content-Type': 'application/json' } }
)

const sessionData = await fetchResponse.json()
if (sessionData && sessionData.form_data) {
  // THIS LINE OVERWRITES USER INPUT WITH STALE DATA
  const mergedFormData = {
    ...sessionData.form_data,
    email: sessionData.email || sessionData.form_data.email,
    firstName: sessionData.first_name || sessionData.form_data.firstName,
  }
  setFormData(mergedFormData)  // ← RACE CONDITION
}
```

**The problem:** This fetch has no guard preventing it from overwriting user input during form editing.

---

## Proposed Architecture (Fixed)

### Step 1: Consolidate State to Zustand Only

**Remove:** React `useState` from CalculatorApp.tsx
**Add:** All CalculatorApp components use `useFormStore()` hook

**Benefits:**
- Single source of truth across entire app
- Changes persist globally
- Easy to prevent race conditions
- Consistent with Step 4 components already using Zustand

### Step 2: Add "Dirty Flag" to Prevent Overwrites

Add to Zustand store:

```typescript
interface FormStore {
  form: FormData
  isDirty: boolean  // NEW: User is currently editing
  setFormField: (field: keyof FormData, value: unknown) => void
  markDirty: () => void  // User started editing
  markClean: () => void  // Done editing / saved
  // ... existing methods
}
```

**Logic:**
```
isDirty = true → User is filling the form
isDirty = false → Safe to load from Supabase
```

### Step 3: Guard Supabase Fetches

**Before fetching from Supabase, check:**
```typescript
// ONLY fetch if user hasn't modified form yet
if (!isDirty && sessionData && sessionData.form_data) {
  setForm(sessionData.form_data)
}

// DO NOT fetch if user is currently editing
if (isDirty) {
  console.log('Form already in progress - skipping Supabase restore')
  return
}
```

### Step 4: Atomic Validation Guard

**During Step 2 validation:**
```typescript
// Mark form as dirty when user starts typing
// Prevent Supabase updates while validating/transitioning
markDirty()

// Validate
const hasErrors = validateStep2(data)

// Only allow transition if validation passes AND no async operations pending
if (!hasErrors) {
  setCurrentStep(3)
}
```

---

## Code Changes Required

### File 1: `/calculator2-demo/src/stores/formStore.ts`

Add dirty flag tracking:

```typescript
interface FormStore {
  form: FormData
  macros: MacroResults | null
  currentStep: number
  units: 'imperial' | 'metric'
  isPremium: boolean
  sessionToken: string | null
  isDirty: boolean  // NEW

  setFormField: (field: keyof FormData, value: unknown) => void
  setMacros: (macros: MacroResults) => void
  setCurrentStep: (step: number) => void
  setUnits: (units: 'imperial' | 'metric') => void
  setIsPremium: (premium: boolean) => void
  setSessionToken: (token: string) => void
  setForm: (form: Partial<FormData>) => void
  resetForm: () => void
  markDirty: () => void  // NEW: Set isDirty = true
  markClean: () => void  // NEW: Set isDirty = false
}

// Usage in store:
markDirty: () => set({ isDirty: true }),
markClean: () => set({ isDirty: false }),

// Auto-mark dirty on any form change:
setFormField: (field, value) =>
  set((state) => ({
    form: { ...state.form, [field]: value },
    isDirty: true,  // NEW: Mark as dirty when user types
  })),

setForm: (formUpdate) =>
  set((state) => ({
    form: { ...state.form, ...formUpdate },
    isDirty: true,  // NEW: Mark as dirty
  })),
```

### File 2: `/calculator2-demo/src/components/calculator/CalculatorApp.tsx`

Replace React useState with Zustand:

```typescript
// REMOVE this:
// const [formData, setFormData] = useState<Partial<FormData>>({...})

// ADD this:
import { useFormStore } from '../../stores/formStore'

export default function CalculatorApp({...}) {
  // Use Zustand store instead of useState
  const {
    form: formData,
    setForm: setFormData,
    setFormField,
    isDirty,
    markDirty,
    markClean,
    setCurrentStep,
    isPremium,
    setIsPremium,
  } = useFormStore()

  // Existing macro calculation useEffect stays the same
  // Just change dependency: formData.sex → formData.sex (still works)

  // GUARD Supabase fetch with isDirty flag:
  const handleContinueToHealthProfile = async () => {
    if (!stripeSessionId) return

    // NEW: Skip fetch if form is already being edited
    if (isDirty) {
      console.log('Form already dirty - skipping Supabase restore')
      markClean()  // User proceeded, mark clean
      setCurrentStep(4)
      return
    }

    try {
      const fetchResponse = await fetch(
        `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${stripeSessionId}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      )

      const sessionData = await fetchResponse.json()

      // NEW: Only load if we haven't already modified the form
      if (sessionData && sessionData.form_data && !isDirty) {
        const mergedFormData = {
          ...sessionData.form_data,
          email: sessionData.email || sessionData.form_data.email,
          firstName: sessionData.first_name || sessionData.form_data.firstName,
        }
        setForm(mergedFormData)  // Uses Zustand now
        markClean()  // Data loaded, mark as clean
      }

      setCurrentStep(4)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error fetching session:', error)
    }
  }
}
```

### File 3: `/calculator2-demo/src/components/calculator/steps/Step2FitnessDiet.tsx`

No changes needed - still receives `data` and `onDataChange` props, but now connected to Zustand via CalculatorApp.

The validation logic stays the same:

```typescript
const handleContinue = () => {
  const newErrors: Record<string, string> = {}

  if (!data.lifestyle) newErrors.lifestyle = 'Please select your activity level'
  if (!data.exercise) newErrors.exercise = 'Please select your exercise frequency'
  if (!data.goal) newErrors.goal = 'Please select your goal'
  if ((data.goal === 'lose' || data.goal === 'gain') && !data.deficit)
    newErrors.deficit = 'Please select your deficit percentage'
  if (!data.diet) newErrors.diet = 'Please select your diet type'

  if (Object.keys(newErrors).length === 0) {
    onContinue()  // User proceeding = form is committed, safe to mark clean
  } else {
    onSetErrors?.(newErrors)
  }
}
```

---

## Migration Path (Step-by-Step)

### Step 1: Update Zustand Store (formStore.ts)
1. Add `isDirty: boolean` to interface
2. Add `markDirty()` and `markClean()` methods
3. Modify `setFormField()` and `setForm()` to set `isDirty: true`
4. Test: `npm test` (if tests exist)

**Status:** ✓ Can be done independently
**Risk:** Low - only adds new methods, doesn't change existing behavior

### Step 2: Refactor CalculatorApp.tsx
1. Remove `useState` hook for formData
2. Import `useFormStore()`
3. Replace all `setFormData` calls with Zustand setters
4. Update Supabase fetch to check `isDirty` flag
5. Add `markDirty()` when user starts editing
6. Add `markClean()` after successful transitions

**Status:** ✓ Can be done after Step 1
**Risk:** Medium - changes form state management, needs browser testing
**Testing:** Fill form → validate step 2 → proceed to step 3 → no data loss

### Step 3: Cleanup (Optional, Later)
1. Remove Zustand usage from Step5Preferences, Step4Health (already using it)
2. Ensure all step components consistently use Zustand (not mixing with useState)

**Status:** ✓ Nice-to-have, not critical
**Risk:** Low - visual consistency improvement only

---

## Validation Checklist

Before deploying the fix:

- [ ] Zustand store has `isDirty` flag
- [ ] `markDirty()` / `markClean()` methods exist in store
- [ ] CalculatorApp imports `useFormStore()`
- [ ] CalculatorApp no longer uses `useState` for formData
- [ ] Supabase fetch guarded with `if (!isDirty)` check
- [ ] Step 2 form fills without wiping data
- [ ] Step 2 validation passes with correct data
- [ ] Transition to Step 3 succeeds
- [ ] User can go back to Step 2, data is preserved
- [ ] Payment flow completes without validation errors
- [ ] No console errors during form fill/validation
- [ ] Mobile responsiveness (375px viewport) maintained

---

## Why This Fixes It

### Before (Broken)
```
User types in Step 2
↓
React state updated (locally)
↓
Supabase fetch completes in background
↓
setFormData() called with stale data
↓
React re-renders with BLANK Step 2 fields
↓
Validation fails
❌ User blocked from Step 3
```

### After (Fixed)
```
User types in Step 2
↓
markDirty() called → isDirty = true
↓
Zustand state updated
↓
Supabase fetch completes in background
↓
Check: if (!isDirty) { fetch }
↓
isDirty is TRUE → Skip restore
↓
User data preserved
↓
Validation passes
✅ User proceeds to Step 3
```

---

## Key Principles (KISS)

1. **Single state system:** One source of truth (Zustand)
2. **Dirty flag:** Simple boolean guard, no complex logic
3. **Minimal changes:** Only modify what's broken, leave validation intact
4. **No new dependencies:** Use existing Zustand library
5. **No backend changes:** Keep Supabase as-is, just guard the client

---

## Files to Modify

1. `/calculator2-demo/src/stores/formStore.ts` (Zustand store)
2. `/calculator2-demo/src/components/calculator/CalculatorApp.tsx` (State consolidation)
3. No changes needed to Step2FitnessDiet.tsx or other step components

---

## Testing Commands

```bash
# Navigate to calculator demo
cd /Users/mbrew/Developer/carnivore-weekly/calculator2-demo

# Run existing tests (if any)
npm test

# Manual browser test (start dev server)
npm run dev
# Then:
# 1. Fill Step 1, click Continue
# 2. Fill Step 2 completely, wait 2 seconds, click Continue
# 3. Verify Step 2 data is not wiped
# 4. Verify Step 3 Results page loads
# 5. Check browser console for no errors
```

---

## Deployment Safety

**Rollback:** If issues occur after deploy, revert to React useState approach (commits before this change)

**Monitoring:** Check browser console for race condition warnings during first 24 hours post-deploy

**Communication:** Notify team that Step 2→3 transition is now atomic (no data loss risk)

---

## Next Steps

1. **Leo:** Implement Zustand changes (formStore.ts)
2. **Leo:** Refactor CalculatorApp.tsx to use Zustand
3. **Casey:** Visual validation on all steps (brand colors, layout)
4. **Jordan:** Form data persistence test (Step 2 → 3 → 4 flow)
5. **Test:** Payment flow end-to-end (free tier + premium)
6. **Deploy:** Push to production when all tests pass

---

**Status:** Ready for implementation
**Owner:** Leo (technical architecture)
**Review:** Jordan (payment flow validation)
**Approval:** CEO (before deploy)

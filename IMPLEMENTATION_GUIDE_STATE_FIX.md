# State Management Fix - Implementation Guide

**Target:** Eliminate race condition in Step 2 form validation
**Timeline:** 2-3 hours implementation + testing
**Complexity:** Medium (state consolidation, careful with validation flow)

---

## Change 1: Update Zustand Store

**File:** `/calculator2-demo/src/stores/formStore.ts`

### What to change:

Add dirty flag tracking to prevent Supabase overwrites during user input.

```typescript
// ADD to FormStore interface (after sessionToken):
isDirty: boolean

// ADD these new methods to interface:
markDirty: () => void
markClean: () => void

// In create function, initialize:
isDirty: false,

// UPDATE setFormField to auto-mark dirty:
setFormField: (field, value) =>
  set((state) => ({
    form: { ...state.form, [field]: value },
    isDirty: true,  // ADD THIS LINE
  })),

// UPDATE setForm to auto-mark dirty:
setForm: (formUpdate) =>
  set((state) => ({
    form: { ...state.form, ...formUpdate },
    isDirty: true,  // ADD THIS LINE
  })),

// ADD these new methods:
markDirty: () => set({ isDirty: true }),
markClean: () => set({ isDirty: false }),
```

**Full updated section:**
```typescript
export const useFormStore = create<FormStore>((set) => ({
  form: defaultForm,
  macros: null,
  currentStep: 1,
  units: 'imperial',
  isPremium: false,
  sessionToken: null,
  isDirty: false,  // NEW

  setFormField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
      isDirty: true,  // NEW
    })),

  setMacros: (macros) => set({ macros }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setUnits: (units) => set({ units }),
  setIsPremium: (premium) => set({ isPremium: premium }),
  setSessionToken: (token) => set({ sessionToken: token }),

  setForm: (formUpdate) =>
    set((state) => ({
      form: { ...state.form, ...formUpdate },
      isDirty: true,  // NEW
    })),

  markDirty: () => set({ isDirty: true }),  // NEW
  markClean: () => set({ isDirty: false }),  // NEW

  resetForm: () => set({ form: defaultForm, currentStep: 1, macros: null, isDirty: false }),  // ADD isDirty reset
}))
```

---

## Change 2: Refactor CalculatorApp.tsx

**File:** `/calculator2-demo/src/components/calculator/CalculatorApp.tsx`

### Part A: Remove React useState, add Zustand import

**Line 1-2: Update imports**

Replace:
```typescript
import { useState, useEffect } from 'react'
```

With:
```typescript
import { useEffect } from 'react'  // Remove useState
import { useFormStore } from '../../stores/formStore'  // ADD THIS
```

### Part B: Replace useState with Zustand

**Around line 34-44: Remove the useState**

Remove this entire block:
```typescript
const [formData, setFormData] = useState<Partial<FormData>>({
  sex: undefined,
  age: 0,
  weight: 0,
  lifestyle: '',
  exercise: '',
  goal: undefined,
  deficit: undefined,
  diet: undefined,
})
```

Replace with:
```typescript
// Use Zustand store instead of React state
const {
  form: formData,
  setForm: setFormData,
  setFormField,
  isDirty,
  markDirty,
  markClean,
  setCurrentStep: setCurrentStepStore,
  isPremium: isPremiumStore,
  setIsPremium: setIsPremiumStore,
} = useFormStore()

// Keep existing UI state (not form data)
const [currentStep, setCurrentStep] = useState(1)
const [macros, setMacros] = useState<MacroResults | null>(null)
const [showPricingModal, setShowPricingModal] = useState(false)
const [isGenerating, setIsGenerating] = useState(false)
const [errors, setErrors] = useState<Record<string, string>>({})
const [isPremium, setIsPremium] = useState(false)
const [email, setEmail] = useState('')
```

Wait - we still need useState for UI state. Let me correct:

```typescript
// Form state now comes from Zustand
const { form: formData, setForm: setFormData, isDirty, markDirty, markClean } = useFormStore()

// UI state (non-form) still uses useState
const [currentStep, setCurrentStep] = useState(1)
const [macros, setMacros] = useState<MacroResults | null>(null)
const [showPricingModal, setShowPricingModal] = useState(false)
const [isGenerating, setIsGenerating] = useState(false)
const [errors, setErrors] = useState<Record<string, string>>({})
const [isPremium, setIsPremium] = useState(false)
const [email, setEmail] = useState('')
```

### Part C: Guard Supabase Fetch

**Around line 354-390: Add isDirty check**

Find the "Continue to Health Profile" button click handler. Update it:

```typescript
{showPricingModal && (
  <PricingModal
    email={email}
    onEmailChange={setEmail}
    formData={formData as FormData}
    onClose={() => setShowPricingModal(false)}
    onProceed={() => handlePaymentSuccess()}
  />
)}
```

Actually, the Supabase fetch happens in the success page button. Find it (around line 344-391):

```typescript
onClick={async () => {
  console.log('[Success Page] Continue to Health Profile clicked')
  console.log('[Success Page] stripeSessionId:', stripeSessionId)

  if (!stripeSessionId) {
    console.error('[Success Page] No stripe session ID')
    return
  }

  try {
    // Fetch the saved session from Supabase using the stripeSessionId
    console.log('[Success Page] Fetching session from Supabase:', stripeSessionId)

    // NEW: Guard with isDirty flag
    if (isDirty) {
      console.log('[Success Page] Form already dirty - skipping restore, proceeding to Step 4')
      markClean()
      setCurrentStep(4)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const fetchResponse = await fetch(
      `https://carnivore-report-api-production.iambrew.workers.dev/get-session?id=${stripeSessionId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    const sessionData = await fetchResponse.json()
    console.log('[Success Page] Session data:', sessionData)

    // NEW: Only restore if form is still clean (user hasn't edited)
    if (sessionData && sessionData.form_data && !isDirty) {
      const mergedFormData = {
        ...sessionData.form_data,
        email: sessionData.email || sessionData.form_data.email,
        firstName: sessionData.first_name || sessionData.form_data.firstName,
      }
      setFormData(mergedFormData)
      console.log('[Success Page] Form data restored with email:', mergedFormData.email)
      markClean()  // NEW: Data loaded, mark clean
    }

    setCurrentStep(4)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    console.error('[Success Page] Error fetching session:', error)
  }

  localStorage.removeItem('paymentStatus')
  localStorage.removeItem('stripeSessionId')
}}
```

### Part D: Mark form dirty when user starts editing

When should we mark dirty? When user types in any form field.

This is already handled by Zustand `setFormField()` (which sets isDirty: true automatically).

But for the initial CalculatorApp render, we don't need to do anything - it's clean by default.

**No additional changes needed here** - it happens automatically via `setForm()` calls in step components.

---

## Change 3: Verify Step Components Are Compatible

**No changes needed.** Step2FitnessDiet.tsx and other steps already use the pattern:

```typescript
const handleInputChange = (field: string, value: any) => {
  onDataChange({ ...data, [field]: value })  // Calls parent's onDataChange
}
```

And CalculatorApp passes the setter:
```typescript
<Step2FitnessDiet
  data={dataAsFormData}
  onDataChange={(data) => setFormData(data as Partial<FormData>)}  // This now uses Zustand
  // ...
/>
```

So the changes in CalculatorApp automatically apply to all step components.

---

## Summary of Changes

| File | Changes | Risk | Testing |
|------|---------|------|---------|
| formStore.ts | Add isDirty flag, markDirty/Clean methods | Low | Unit test store |
| CalculatorApp.tsx | Replace useState with Zustand, guard Supabase fetch | Medium | Fill Step 2 → Step 3 flow |
| Step2FitnessDiet.tsx | None | None | Visual validation |
| Step3FreeResults.tsx | None | None | Visual validation |
| Step4HealthProfile.tsx | None | None | Visual validation |

---

## Testing Sequence

### Test 1: Form Data Persistence (Critical)

```
1. Open calculator (fresh start)
2. Fill Step 1 completely
3. Click Continue
4. Fill Step 2:
   - Select "Moderately Active"
   - Select "3-4 days per week"
   - Select "Fat Loss"
   - Select "15% (Moderate)"
   - Select "Carnivore"
5. Wait 2 seconds (let any background fetches complete)
6. Click "See Your Results"
7. Verify:
   - Step 3 Results page loads
   - Profile card shows correct data
   - No console errors
   - Data is NOT wiped/blank
```

**Expected:** All fields filled, no validation errors, Step 3 renders
**If fails:** Check isDirty flag in browser console: `localStorage` or check store state

### Test 2: Back Button Navigation

```
1. From Step 3 Results
2. Click "Back"
3. Verify Step 2 form still has all data
4. Click Continue again
5. Verify Step 3 Results matches previous
```

**Expected:** Data persists when navigating back and forth
**If fails:** Zustand state not persisting correctly

### Test 3: Payment Flow

```
1. Complete Step 1-2
2. Click Upgrade on Step 3
3. Process payment (stripe test card)
4. Click "Continue to Health Profile"
5. Verify Step 4 Health Profile loads
6. Fill health profile completely
7. Click Submit
8. Verify report generates (ReportGeneratingScreen shows)
```

**Expected:** Entire flow completes without data loss
**If fails:** Supabase restore overwriting user data - check isDirty guard

### Test 4: Browser Console Check

After each test:
```javascript
// Check Zustand state
console.log('Form isDirty:', useFormStore.getState().isDirty)
console.log('Form data:', useFormStore.getState().form)
```

Expected: isDirty should be `true` while editing, data should have all Step 2 fields

---

## Rollback Plan

If something breaks:

1. Revert formStore.ts to remove isDirty
2. Revert CalculatorApp.tsx to use useState
3. Redeploy
4. No data loss - changes are local only

**Git commands:**
```bash
git checkout HEAD~1 src/stores/formStore.ts
git checkout HEAD~1 src/components/calculator/CalculatorApp.tsx
git commit -m "revert: roll back state management fix"
git push
```

---

## How to Know It's Working

✅ **Step 2 form fields remain filled after clicking Continue**
✅ **No validation errors when transitioning to Step 3**
✅ **Step 3 Results page shows correct user data**
✅ **Payment flow completes without form data loss**
✅ **No console errors** (check DevTools)
✅ **Back button preserves form state**

❌ **Step 2 fields disappear when clicking Continue** = isDirty flag not working
❌ **Validation errors on valid data** = Supabase fetch still overwriting
❌ **Form data blank on Step 3** = Race condition still exists

---

## Code Review Checklist

Before committing:

- [ ] formStore.ts compiles without errors
- [ ] CalculatorApp.tsx imports useFormStore
- [ ] CalculatorApp.tsx removes useState for formData
- [ ] Supabase fetch guarded with `if (isDirty)` check
- [ ] markClean() called after successful data load
- [ ] No console.log() debugging left behind
- [ ] All step components still receive correct props
- [ ] Macro calculation still works (unchanged logic)
- [ ] Error handling still works (unchanged logic)
- [ ] TypeScript compilation passes (`npm run build`)

---

## Implementation Order

1. **First:** Update formStore.ts (isolated change, low risk)
2. **Second:** Update CalculatorApp.tsx imports
3. **Third:** Replace useState with Zustand
4. **Fourth:** Add isDirty guard to Supabase fetch
5. **Fifth:** Compile and test (`npm run build`)
6. **Sixth:** Manual testing sequence above
7. **Seventh:** Git commit with clear message
8. **Eighth:** Request review from Jordan (payment flow validation)
9. **Ninth:** Deploy to production

---

## Expected Commit Message

```
fix: eliminate race condition in Step 2 form validation

- Consolidate form state from React useState to Zustand store
- Add isDirty flag to prevent Supabase overwrites during user input
- Guard session restore fetch with !isDirty check
- Ensure Step 2→3 transition preserves user data atomically

Fixes form fields wiping when user clicks Continue on Step 2.
Payment flow now completes without validation errors.
```

---

**Status:** Ready to implement
**Estimated Time:** 1-2 hours (code) + 30 min (testing) + 15 min (review/deploy)
**Risk Level:** Medium (state consolidation) but well-contained


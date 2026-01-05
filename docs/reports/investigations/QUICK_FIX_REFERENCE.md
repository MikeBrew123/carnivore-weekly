# Step 2 Race Condition Fix - Quick Reference Card

**Problem:** Step 2 form data wipes when clicking Continue → validation fails → payment flow blocked

**Root Cause:** Supabase fetch overwrites user input with stale data (no race condition guard)

**Solution:** Consolidate state to Zustand + add isDirty flag to prevent overwrites

---

## The 3 Changes (In Order)

### 1️⃣ formStore.ts - Add Dirty Flag

```typescript
// Add to FormStore interface:
isDirty: boolean

// Add to store creation:
isDirty: false,

// Update setFormField:
setFormField: (field, value) =>
  set((state) => ({
    form: { ...state.form, [field]: value },
    isDirty: true,  // ← NEW
  })),

// Update setForm:
setForm: (formUpdate) =>
  set((state) => ({
    form: { ...state.form, ...formUpdate },
    isDirty: true,  // ← NEW
  })),

// Add two new methods:
markDirty: () => set({ isDirty: true }),
markClean: () => set({ isDirty: false }),
```

### 2️⃣ CalculatorApp.tsx - Import Zustand

```typescript
// Line 1-2: Update imports
import { useEffect } from 'react'  // Remove useState
import { useFormStore } from '../../stores/formStore'  // ADD

// After other imports, after line 27, replace useState with Zustand:
const { form: formData, setForm: setFormData, isDirty, markClean } = useFormStore()

// Keep other useState hooks (UI state only):
const [currentStep, setCurrentStep] = useState(1)
// ... rest of useState
```

### 3️⃣ CalculatorApp.tsx - Guard Supabase Fetch

Find the "Continue to Health Profile" button (around line 344-391).

Inside the onClick handler, add guard at the top of try block:

```typescript
try {
  // NEW: Guard with isDirty flag
  if (isDirty) {
    console.log('[Success Page] Form already dirty - skipping restore')
    markClean()
    setCurrentStep(4)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return  // ← Exit early, don't fetch from Supabase
  }

  // Existing fetch code continues here
  const fetchResponse = await fetch(...)
  // ...
  if (sessionData && sessionData.form_data) {
    const mergedFormData = { ... }
    setFormData(mergedFormData)
    markClean()  // ← Mark clean after restore
  }
  // ...
}
```

---

## What This Does

| Before | After |
|--------|-------|
| User types Step 2 | User types Step 2 |
| Supabase fetch completes | isDirty = true (automatic) |
| `setFormData()` called with stale data | Supabase fetch completes |
| Step 2 fields wipe | `if (isDirty) return` ← Skip fetch |
| Validation fails ❌ | Data preserved ✅ |
| | Validation passes ✅ |

---

## Test It

```
1. Open calculator
2. Fill Step 1 → Continue
3. Fill Step 2 → Continue
4. Check: Do Step 2 fields remain filled?
   YES ✅ = Fix working
   NO ❌ = isDirty flag not working
5. Verify Step 3 Results page loads
```

---

## Files to Modify

- `/calculator2-demo/src/stores/formStore.ts`
- `/calculator2-demo/src/components/calculator/CalculatorApp.tsx`

**That's it.** No other files need changes.

---

## Why This Works (KISS Explanation)

**Old system:** Two state systems fighting each other
```
React state + Zustand store = Conflict
Supabase fetch overwrites React state = Data loss
```

**New system:** Single state system, guarded from overwrites
```
Zustand only = Single source of truth
isDirty flag = Tracks if user is editing
if (isDirty) skip restore = Prevents overwrites
```

---

## Debugging If It Fails

**Symptom:** Step 2 fields still wiping

**Check 1:** Does formStore.ts have isDirty?
```bash
grep -n "isDirty" /Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/stores/formStore.ts
```
Should show: isDirty: false, markDirty, markClean

**Check 2:** Does CalculatorApp.tsx import from Zustand?
```bash
grep -n "useFormStore" /Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/components/calculator/CalculatorApp.tsx
```
Should show: `const { form: formData, ... } = useFormStore()`

**Check 3:** Is Supabase fetch guarded?
```bash
grep -n "if (isDirty)" /Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/components/calculator/CalculatorApp.tsx
```
Should show: Guard before fetch

**Check 4:** Browser console during form fill
```javascript
console.log(useFormStore.getState().isDirty)
// When user is typing Step 2: should log `true`
// After clicking Continue: should log `false`
```

If isDirty is always false → Zustand setFormField not being called → Check onDataChange in Step2

---

## Rollback (If Needed)

```bash
cd /Users/mbrew/Developer/carnivore-weekly/calculator2-demo
git diff src/stores/formStore.ts  # Review changes
git diff src/components/calculator/CalculatorApp.tsx

# If problems, revert:
git checkout HEAD~1 src/stores/formStore.ts
git checkout HEAD~1 src/components/calculator/CalculatorApp.tsx
git commit -m "revert: roll back state fix"
git push
```

---

## Success Criteria

✅ Step 2 fields DO NOT wipe when clicking Continue
✅ Validation passes with correct data
✅ Step 3 Results page loads correctly
✅ Back button preserves all form data
✅ Payment flow completes end-to-end
✅ No console errors (check DevTools)

---

## Timeline

- **15 min:** Make formStore.ts changes
- **20 min:** Make CalculatorApp.tsx changes
- **10 min:** Compile (`npm run build`)
- **15 min:** Test manually (fill form, check results)
- **10 min:** Review code
- **5 min:** Commit and push

**Total: ~1 hour**

---

## Key Lines to Know

**formStore.ts:**
- Line where isDirty initialized: `isDirty: false,`
- setFormField method: Mark dirty on any change
- New methods: markDirty, markClean

**CalculatorApp.tsx:**
- Line 1-2: Remove useState, add useFormStore import
- Around line 35: Replace useState with Zustand hook
- Around line 356: Add `if (isDirty) return` guard
- Around line 376: Add `markClean()` after restore

---

## Words to Grep For (Finding The Code)

```bash
# Find the useState that needs replacing
grep -n "useState<Partial<FormData>>" CalculatorApp.tsx

# Find the Supabase fetch
grep -n "get-session" CalculatorApp.tsx

# Find where setFormData is called in fetch handler
grep -n "setFormData(mergedFormData)" CalculatorApp.tsx

# Verify formStore methods exist
grep -n "setFormField\|markDirty" formStore.ts
```

---

**Owner:** Leo (implementation)
**Review:** Jordan (validation)
**Deploy:** After all tests pass
**Status:** Ready to start


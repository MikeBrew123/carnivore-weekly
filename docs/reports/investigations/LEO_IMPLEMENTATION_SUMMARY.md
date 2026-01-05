# LEO's Implementation Summary: Fix form_data Retrieval

**Date**: 2026-01-05
**Status**: Analysis Complete - Ready for Implementation
**Priority**: Critical
**Author**: LEO (Database Architect)
**Location**: `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo`

---

## Problem Summary

When generating a report, the `form_data` fields are showing as undefined, causing macro calculations to use default values instead of actual user data.

**Root Cause**: The calculator API saves form data to individual columns in `calculator_sessions_v2` but never consolidates it as a `form_data` JSONB object. Report generation expects a complete, consolidated form_data object.

**Impact**:
- Reports don't personalize correctly
- Macro recommendations use defaults
- User experience broken after payment

---

## Current Architecture (Broken)

```
Two Separate Systems:

1. cw_assessment_sessions (Migration 020) ← HAS form_data JSONB
   - Contains complete form data
   - Is filled by some process (not calculator API)
   - Has 10+ sessions with all fields

2. calculator_sessions_v2 (Migration 015) ← NO form_data JSONB
   - Used by calculator API
   - Has individual columns (sex, age, weight_value, etc.)
   - Completely empty (0 rows)
   - Missing consolidated form_data for report generation
```

**Data Flow Problem**:
```
API writes to → calculator_sessions_v2 (empty, fragmented)
Reports expect → form_data JSONB (doesn't exist)
Result → undefined values, default macros
```

---

## Solution Architecture

Add `form_data` JSONB column to `calculator_sessions_v2` and consolidate form data at each step.

### Files to Create/Modify

1. **New Migration File** (already created)
   - Path: `/migrations/025_add_form_data_to_calculator_sessions.sql`
   - Action: Adds `form_data` JSONB column

2. **Update Calculator API** (needs modification)
   - Path: `/CalculatorBuild/calculator-api.js`
   - Functions to modify:
     - `handleSaveStep1()` (line ~150)
     - `handleSaveStep2()` (line ~216)
     - `handleSaveStep3()` (line ~272)
     - `handleStep4Submission()` (line ~574)

3. **Diagnostic Documents** (created for reference)
   - `/LEO_CALCULATOR_API_PATCH.md` - Detailed code changes
   - `/LEO_FORM_DATA_DEBUG_GUIDE.md` - Complete debug guide
   - `/LEO_DIAGNOSTICS.sql` - SQL verification queries

---

## Data File Locations (Absolute Paths)

All files are located at:

```
/Users/mbrew/Developer/carnivore-weekly/
├── migrations/
│   └── 025_add_form_data_to_calculator_sessions.sql
│
├── CalculatorBuild/
│   └── calculator-api.js (NEEDS MODIFICATION)
│
├── LEO_CALCULATOR_API_PATCH.md (Reference)
├── LEO_FORM_DATA_DEBUG_GUIDE.md (Reference)
├── LEO_DIAGNOSTICS.sql (Reference)
└── LEO_IMPLEMENTATION_SUMMARY.md (This file)
```

---

## Implementation Steps

### Phase 1: Database Migration (5 minutes)

```bash
# 1. Review migration
cat /Users/mbrew/Developer/carnivore-weekly/migrations/025_add_form_data_to_calculator_sessions.sql

# 2. Deploy to Supabase
# Option A: Via Supabase dashboard
#   - Go to SQL editor
#   - Copy migration content
#   - Execute

# Option B: Via Supabase CLI
supabase migration deploy 025

# 3. Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calculator_sessions_v2'
  AND column_name = 'form_data';
# Expected: Returns 1 row with data_type = 'jsonb'
```

### Phase 2: API Code Update (30 minutes)

**Critical**: Modify `/CalculatorBuild/calculator-api.js`

Four functions need updates. Each follows this pattern:

```javascript
// OLD: Individual columns only
body: JSON.stringify({
  sex: data.sex,
  age: data.age,
  weight_value: data.weight_value,
  // ... etc
})

// NEW: Add form_data consolidation
body: JSON.stringify({
  sex: data.sex,
  age: data.age,
  weight_value: data.weight_value,
  // ... existing fields ...

  // ADD THIS:
  form_data: {
    ...existingFormData,  // Merge with previous steps
    sex: data.sex,
    age: data.age,
    weight: data.weight_value,
    // ... all fields in camelCase
  }
})
```

**Detailed changes** in `/LEO_CALCULATOR_API_PATCH.md`

### Phase 3: Cloudflare Deployment (5 minutes)

```bash
# Deploy updated calculator-api.js to Cloudflare Workers
wrangler deploy --name calculator-api

# Or use your deployment script
npm run deploy:calculator-api
```

### Phase 4: Verification (10 minutes)

```bash
# Test with new form submission:
# 1. Start new session: POST /api/v1/calculator/session
# 2. Submit steps: POST /api/v1/calculator/step/1,2,3,4
# 3. Verify form_data saved

# Via SQL:
SELECT form_data
FROM public.calculator_sessions_v2
WHERE step_completed = 4
ORDER BY created_at DESC
LIMIT 1;

# Expected: Complete JSON object with all fields
```

---

## Key Concepts

### Field Naming Convention

API uses **snake_case**, form_data uses **camelCase**:

```javascript
// Database columns → form_data keys
sex → sex
age → age
weight_value → weight
height_feet → heightFeet
height_inches → heightInches
exercise_frequency → exercise
lifestyle_activity → lifestyle
diet_type → diet
first_name → firstName
last_name → lastName
avoid_foods → avoidFoods
dairy_tolerance → dairyTolerance
carnivore_experience → carnivoreExperience
cooking_skill → cookingSkill
meal_prep_time → mealPrepTime
family_situation → familySituation
work_travel → workTravel
biggest_challenge → biggestChallenge
calculated_macros → calculatedMacros
other_conditions → otherConditions
other_symptoms → otherSymptoms
additional_notes → additionalNotes
```

### The Merge Pattern (CRITICAL)

Each step must merge with existing form_data:

```javascript
// Step 1: Create initial
form_data: {
  sex: 'male',
  age: 30,
  weight: 180,
  heightFeet: 6,
  heightInches: 0
}

// Step 2: Merge with Step 1
form_data: {
  ...existingFormData,  // ← Spread existing data
  lifestyle: 'moderate',
  exercise: '3-4',
  goal: 'maintain',
  diet: 'carnivore'
}

// Step 3: Merge with Steps 1+2
form_data: {
  ...existingFormData,  // ← Includes all previous fields
  calculatedMacros: { ... }
}

// Step 4: Complete consolidation
form_data: {
  ...existingFormData,  // ← Includes EVERYTHING
  email: 'user@example.com',
  firstName: 'John',
  // ... all health/dietary/lifestyle fields
}
```

---

## Risk Assessment

**Risk Level**: LOW
**Reason**: Additive change (doesn't modify existing columns)

**Rollback Plan**:
```sql
-- If needed, drop the column
ALTER TABLE calculator_sessions_v2 DROP COLUMN form_data;
```

---

## Expected Behavior After Implementation

### Before Fix
```javascript
// Step 4 submission
report = generateReport(session);
// session.form_data = undefined
// Uses defaults:
// - Macros: 2000cal, 150p, 100f, 50c
// - Recommendations: Generic
```

### After Fix
```javascript
// Step 4 submission
report = generateReport(session);
// session.form_data = {
//   weight: 200,
//   age: 30,
//   height: "6'0\"",
//   calculatedMacros: {...},
//   // ... all other fields
// }
// Uses actual data:
// - Macros: Personalized based on user metrics
// - Recommendations: Tailored to conditions/goals
```

---

## Testing Checklist

Before marking complete:

- [ ] Migration 025 deployed successfully
- [ ] form_data column visible in calculator_sessions_v2
- [ ] calculator-api.js updated with form_data logic
- [ ] New API deployed to Cloudflare
- [ ] Test submission: Complete form → Step 4
- [ ] Verify form_data saved with all fields
- [ ] Verify macros calculated correctly
- [ ] Report generated with personalization
- [ ] Email delivered with correct data

---

## Monitoring Commands

### Check Migration Applied
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calculator_sessions_v2'
  AND column_name = 'form_data';
```

### Verify New Sessions Have form_data
```sql
SELECT
  session_token,
  step_completed,
  form_data,
  form_data ->> 'weight' as weight,
  form_data ->> 'calculatedMacros' as macros
FROM public.calculator_sessions_v2
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

### Check for Null form_data (Should be 0)
```sql
SELECT COUNT(*) as orphaned_sessions
FROM public.calculator_sessions_v2
WHERE step_completed = 4
  AND form_data IS NULL;
```

---

## Reference Documents

1. **Patch Details**: `/Users/mbrew/Developer/carnivore-weekly/LEO_CALCULATOR_API_PATCH.md`
   - Exact code changes for each function
   - Line numbers and context

2. **Debug Guide**: `/Users/mbrew/Developer/carnivore-weekly/LEO_FORM_DATA_DEBUG_GUIDE.md`
   - Complete architectural explanation
   - Field mapping reference
   - Troubleshooting guide

3. **SQL Queries**: `/Users/mbrew/Developer/carnivore-weekly/LEO_DIAGNOSTICS.sql`
   - 13 verification queries
   - Data completeness audits
   - Performance testing

---

## Deployment Order (CRITICAL)

**MUST follow this order:**

1. Deploy Migration 025 FIRST (adds column)
2. Deploy updated calculator-api.js SECOND (uses column)

**If reversed**: API will fail with "column form_data not found"

---

## Success Criteria

After implementation, these queries should return data:

```sql
-- Session exists with complete form_data
SELECT form_data
FROM public.calculator_sessions_v2
WHERE step_completed = 4
  AND form_data IS NOT NULL
LIMIT 1;

-- Result: JSON object with 25+ fields, not empty or null
```

---

## Philosophy

> "A database is a promise you make to the future. Don't break it."

This fix ensures:
- Data integrity (complete, consolidated form_data)
- Report reliability (no undefined values)
- User experience (personalized recommendations)
- ACID properties (atomic, consistent, isolated, durable)

---

## Deployment Contact

For questions during implementation:
- **Database Architecture**: Review `/LEO_FORM_DATA_DEBUG_GUIDE.md`
- **Code Changes**: Review `/LEO_CALCULATOR_API_PATCH.md`
- **SQL Verification**: Review `/LEO_DIAGNOSTICS.sql`

---

**Status**: Ready for Implementation
**Estimated Total Time**: 1 hour
**Dependencies**: None (backward compatible)
**Rollback Risk**: Very Low (additive only)


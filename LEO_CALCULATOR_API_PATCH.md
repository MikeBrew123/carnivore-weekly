# LEO's Calculator API Patch: Fix form_data Persistence

**Status**: Analysis Complete - Ready for Implementation
**Date**: 2026-01-05
**Author**: LEO (Database Architect)
**Affected File**: `/Users/mbrew/Developer/carnivore-weekly/CalculatorBuild/calculator-api.js`

## Problem Statement

The calculator API saves form submissions to `calculator_sessions_v2` table with individual columns, but:
1. **No consolidated `form_data` JSONB column exists** on `calculator_sessions_v2`
2. **Report generation needs complete form data** to personalize reports
3. **Data is incomplete when report generator tries to access it**

**Root Cause**: API saves Step 4 data as separate columns, but report generation expects a complete JSONB object containing all form fields.

## Schema Fix (Migration 025)

Added to: `/Users/mbrew/Developer/carnivore-weekly/migrations/025_add_form_data_to_calculator_sessions.sql`

```sql
ALTER TABLE public.calculator_sessions_v2
ADD COLUMN IF NOT EXISTS form_data JSONB;
```

## API Code Changes Required

### Location 1: handleSaveStep1() - Lines 150-211
Add form_data capture on first step:

```javascript
// In the PATCH body, add:
body: JSON.stringify({
  // ... existing fields ...
  form_data: {
    sex: data.sex,
    age: data.age,
    height_feet: data.height_feet,
    height_inches: data.height_inches,
    height_cm: data.height_cm,
    weight_value: data.weight_value,
    weight_unit: data.weight_unit
  },
})
```

### Location 2: handleSaveStep2() - Lines 216-267
Merge with existing form_data:

```javascript
// Fetch existing session first to get current form_data
const existingSession = sessions[0];
const currentFormData = existingSession.form_data || {};

body: JSON.stringify({
  // ... existing fields ...
  form_data: {
    ...currentFormData,
    lifestyle_activity: data.lifestyle_activity,
    exercise_frequency: data.exercise_frequency,
    goal: data.goal,
    deficit_percentage: data.deficit_percentage,
    diet_type: data.diet_type
  },
})
```

### Location 3: handleSaveStep3() - Lines 272-335
Merge step 3 calculated macros:

```javascript
const existingSession = sessions[0];
const currentFormData = existingSession.form_data || {};

body: JSON.stringify({
  calculated_macros: calculated_macros,
  form_data: {
    ...currentFormData,
    calculated_macros: calculated_macros
  },
  // ... rest of fields ...
})
```

### Location 4: handleStep4Submission() - Lines 574-688
**CRITICAL**: Add complete form_data consolidation:

```javascript
// After validation, before PATCH:
const currentFormData = session.form_data || {};

const updateBody = {
  // ... existing individual fields ...
  form_data: {
    ...currentFormData,
    // Contact info
    email: formData.email,
    first_name: formData.first_name,
    last_name: formData.last_name,
    // Health
    medications: formData.medications || null,
    conditions: formData.conditions || [],
    other_conditions: formData.other_conditions || null,
    symptoms: formData.symptoms || null,
    other_symptoms: formData.other_symptoms || null,
    // Dietary
    allergies: formData.allergies || null,
    avoid_foods: formData.avoid_foods || null,
    dairy_tolerance: formData.dairy_tolerance || null,
    // History
    previous_diets: formData.previous_diets || null,
    what_worked: formData.what_worked || null,
    carnivore_experience: formData.carnivore_experience || null,
    // Lifestyle
    cooking_skill: formData.cooking_skill || null,
    meal_prep_time: formData.meal_prep_time || null,
    budget: formData.budget || null,
    family_situation: formData.family_situation || null,
    work_travel: formData.work_travel || null,
    // Goals
    goals: formData.goals || [],
    biggest_challenge: formData.biggest_challenge || null,
    additional_notes: formData.additional_notes || null
  },
  // ... rest of update fields ...
};
```

## Report Generation Integration

Once this is fixed, the report generation can fetch session data like:

```javascript
// In report generation:
const { data: session } = await supabase
  .from('calculator_sessions_v2')
  .select('*')
  .eq('id', session_id)
  .single();

// Use consolidated form_data:
const reportData = session.form_data;
const macros = reportData.calculated_macros;
const demographics = {
  weight: reportData.weight_value,
  height: `${reportData.height_feet}'${reportData.height_inches}"`,
  age: reportData.age,
  sex: reportData.sex
};
```

## Implementation Steps

1. **Deploy Migration 025**
   ```bash
   # Apply migration to add form_data column
   supabase migration deploy 025
   ```

2. **Update calculator-api.js**
   - Modify handleSaveStep1, handleSaveStep2, handleSaveStep3, handleStep4Submission
   - Add form_data merging logic to each handler
   - Test with complete form submission

3. **Test Data Flow**
   ```
   Step 1 → form_data has: sex, age, weight, height
   Step 2 → form_data merged with: lifestyle, exercise, goal, diet
   Step 3 → form_data merged with: calculated_macros
   Step 4 → form_data merged with: email, health, dietary, lifestyle, goals
   ```

4. **Verify Report Generation**
   - Test /api/v1/calculator/report/{token}/status endpoint
   - Verify personalization works with complete form_data

## Data Consistency Rules (ACID)

- **Atomicity**: Each step update is atomic (all-or-nothing)
- **Consistency**: form_data is always an object, never null
- **Isolation**: Each session isolated by session_token
- **Durability**: JSONB stored in persistent PostgreSQL

## Rollback Plan

If needed, the form_data column can be dropped:
```sql
ALTER TABLE calculator_sessions_v2 DROP COLUMN form_data;
```

However, recommended approach is to keep both strategies:
- Individual columns for fast queries (performance)
- form_data JSONB for report generation (completeness)

---

**Next Steps**: Implementation and testing
**Estimated Effort**: 2 hours (code changes + testing)
**Risk Level**: Low (additive change, doesn't affect existing columns)

# LEO's Complete Form Data Debug Guide

## Executive Summary

Your form data is being lost because there's a **mismatch between where data is saved and where it's fetched for report generation**.

- **Data IS being collected correctly** (verified in `cw_assessment_sessions` table)
- **The API is NOT consolidating it as JSONB** on the reporting table
- **Report generator can't find what it needs** for personalization

---

## Current Database State Analysis

### Table 1: `cw_assessment_sessions` (Migration 020)
**Status**: Working correctly - Data exists

```sql
-- Schema
CREATE TABLE cw_assessment_sessions (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    first_name VARCHAR(100),
    form_data JSONB NOT NULL,  -- HAS JSONB FIELD
    payment_status VARCHAR(50),
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Actual Data** (Session: 286ec3ee-4d30-4b29-84bb-81bcd61e9fbd):
```json
{
  "id": "286ec3ee-4d30-4b29-84bb-81bcd61e9fbd",
  "email": "test@example.com",
  "first_name": "Friend",
  "form_data": {
    "weight": 200,
    "heightFeet": 6,
    "heightInches": 0,
    "age": 30,
    "sex": "male",
    "goal": "maintain",
    "diet": "carnivore",
    "exercise": "3-4",
    "lifestyle": "moderate",
    "allergies": "None",
    "conditions": ["none"],
    "medications": "None",
    "previousDiets": "Keto for 2 years",
    "carnivoreExperience": "Experienced (1+ years)",
    "cookingSkill": "Advanced",
    "mealPrepTime": "1-2 hours per week",
    "budget": "Moderate budget",
    "familySituation": "Living with family",
    "workTravel": "Minimal travel",
    "goals": ["weight_loss", "energy"],
    "biggestChallenge": "Staying consistent",
    "additionalNotes": "Dev test user - auto-filled data"
  },
  "payment_status": "completed",
  "created_at": "2026-01-05T00:43:51.694+00:00"
}
```

**Problem**: This table is NEVER USED by the calculator API

---

### Table 2: `calculator_sessions_v2` (Migration 015)
**Status**: Empty - Nothing saved here by API

```sql
-- Schema (NO form_data JSONB field exists!)
CREATE TABLE calculator_sessions_v2 (
    id UUID PRIMARY KEY,
    session_token VARCHAR(64) UNIQUE,

    -- Individual columns (Step 1)
    sex VARCHAR(20),
    age SMALLINT,
    height_feet SMALLINT,
    height_inches SMALLINT,
    height_cm SMALLINT,
    weight_value DECIMAL(6,2),
    weight_unit VARCHAR(10),

    -- Individual columns (Step 2)
    lifestyle_activity VARCHAR(20),
    exercise_frequency VARCHAR(20),
    goal VARCHAR(20),
    deficit_percentage SMALLINT,
    diet_type VARCHAR(50),

    -- Step 3
    calculated_macros JSONB,

    -- Step 4
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    medications TEXT,
    conditions TEXT[],
    -- ... 25+ other individual columns

    -- MISSING:
    -- form_data JSONB  <-- THIS DOESN'T EXIST

    -- Payment
    payment_status VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    step_completed SMALLINT,
    is_premium BOOLEAN
);
```

**Data in table**: ZERO sessions (completely empty)

**Problem**: API saves here, but there's no consolidated `form_data` column

---

## The Architecture Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT (BROKEN) FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Frontend Form Submission
         │
         ├─→ Step 1: POST /api/v1/calculator/step/1
         │   └─→ Saves individual columns to calculator_sessions_v2
         │       (sex, age, weight_value, etc.)
         │
         ├─→ Step 2: POST /api/v1/calculator/step/2
         │   └─→ Saves more individual columns
         │       (lifestyle_activity, exercise_frequency, etc.)
         │
         ├─→ Step 3: POST /api/v1/calculator/step/3
         │   └─→ Saves calculated_macros JSONB
         │
         └─→ Step 4: POST /api/v1/calculator/step/4
             └─→ Saves more individual columns
                 (email, first_name, medications, etc.)

Report Generation Attempt
         │
         └─→ GET /api/v1/calculator/report/{token}/status
             └─→ Tries to fetch session.form_data
                 ❌ FAILS: form_data doesn't exist on calculator_sessions_v2
                 ❌ FAILS: session is empty (never written to)
                 ❌ FAILS: Macros come back undefined
                 ❌ FAILS: Report uses default values
```

---

## The Fix

### Step 1: Add form_data Column to calculator_sessions_v2

**Migration**: `/migrations/025_add_form_data_to_calculator_sessions.sql`

```sql
ALTER TABLE public.calculator_sessions_v2
ADD COLUMN IF NOT EXISTS form_data JSONB;

COMMENT ON COLUMN public.calculator_sessions_v2.form_data IS
'Complete form submission as JSONB - includes all steps 1-4 for report generation';

CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_form_data
ON public.calculator_sessions_v2
USING gin (form_data);
```

### Step 2: Update calculator-api.js to Consolidate form_data

**Key Pattern**: Each step MERGES into form_data instead of replacing it

#### Change 1: handleSaveStep1 (lines 150-211)

**BEFORE**:
```javascript
body: JSON.stringify({
  sex: data.sex,
  age: data.age,
  height_feet: data.height_feet || null,
  height_inches: data.height_inches || null,
  height_cm: data.height_cm || null,
  weight_value: data.weight_value,
  weight_unit: data.weight_unit || 'lbs',
  step_completed: 2,
  updated_at: new Date().toISOString(),
})
```

**AFTER**:
```javascript
body: JSON.stringify({
  sex: data.sex,
  age: data.age,
  height_feet: data.height_feet || null,
  height_inches: data.height_inches || null,
  height_cm: data.height_cm || null,
  weight_value: data.weight_value,
  weight_unit: data.weight_unit || 'lbs',
  form_data: {
    sex: data.sex,
    age: data.age,
    heightFeet: data.height_feet || null,
    heightInches: data.height_inches || null,
    heightCm: data.height_cm || null,
    weight: data.weight_value,
    weightUnit: data.weight_unit || 'lbs'
  },
  step_completed: 2,
  updated_at: new Date().toISOString(),
})
```

#### Change 2: handleSaveStep2 (lines 216-267)

**CRITICAL**: Must merge with existing form_data!

```javascript
// After validation, fetch current session
const sessionResponse = await fetch(
  `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
  { headers: { ... } }
);

const sessions = await sessionResponse.json();
const existingFormData = sessions[0]?.form_data || {};

// Then PATCH with merged form_data:
body: JSON.stringify({
  lifestyle_activity: data.lifestyle_activity,
  exercise_frequency: data.exercise_frequency,
  goal: data.goal,
  deficit_percentage: data.deficit_percentage || null,
  diet_type: data.diet_type,
  form_data: {
    ...existingFormData,
    lifestyle: data.lifestyle_activity,
    exercise: data.exercise_frequency,
    goal: data.goal,
    deficitPercentage: data.deficit_percentage || null,
    diet: data.diet_type
  },
  step_completed: 3,
  updated_at: new Date().toISOString(),
})
```

#### Change 3: handleSaveStep3 (lines 272-335)

```javascript
const existingFormData = session.form_data || {};

body: JSON.stringify({
  calculated_macros: calculated_macros,
  form_data: {
    ...existingFormData,
    calculatedMacros: calculated_macros
  },
  step_completed: 3,
  updated_at: new Date().toISOString(),
})
```

#### Change 4: handleStep4Submission (lines 574-688)

**MOST CRITICAL**: Complete consolidation

```javascript
// After premium check, fetch session to get current form_data
const session = sessions[0];
const currentFormData = session.form_data || {};

// Merge all Step 4 data
const updateBody = {
  email: formData.email,
  first_name: formData.first_name,
  last_name: formData.last_name,
  medications: formData.medications || null,
  conditions: formData.conditions || [],
  // ... all other individual columns ...

  // CRITICAL: Consolidated form_data
  form_data: {
    ...currentFormData,
    email: formData.email,
    firstName: formData.first_name,
    lastName: formData.last_name,
    medications: formData.medications || null,
    conditions: formData.conditions || [],
    otherConditions: formData.other_conditions || null,
    symptoms: formData.symptoms || null,
    otherSymptoms: formData.other_symptoms || null,
    allergies: formData.allergies || null,
    avoidFoods: formData.avoid_foods || null,
    dairyTolerance: formData.dairy_tolerance || null,
    previousDiets: formData.previous_diets || null,
    whatWorked: formData.what_worked || null,
    carnivoreExperience: formData.carnivore_experience || null,
    cookingSkill: formData.cooking_skill || null,
    mealPrepTime: formData.meal_prep_time || null,
    budget: formData.budget || null,
    familySituation: formData.family_situation || null,
    workTravel: formData.work_travel || null,
    goals: formData.goals || [],
    biggestChallenge: formData.biggest_challenge || null,
    additionalNotes: formData.additional_notes || null
  },
  step_completed: 4,
  completed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// PATCH with complete body
const updateResponse = await fetch(
  `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
  {
    method: 'PATCH',
    headers: { ... },
    body: JSON.stringify(updateBody),
  }
);
```

---

## Field Name Mapping

The API uses snake_case, but form_data should use camelCase (matching frontend):

```javascript
// API columns → form_data camelCase
sex → sex
age → age
weight_value → weight
height_feet → heightFeet
height_inches → heightInches
lifestyle_activity → lifestyle
exercise_frequency → exercise
goal → goal
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
other_conditions → otherConditions
other_symptoms → otherSymptoms
calculated_macros → calculatedMacros
additional_notes → additionalNotes
```

---

## How Report Generation Will Work After Fix

```javascript
// In report generation endpoint
async function generatePersonalizedReport(sessionId, claudeKey) {
  // 1. Fetch session with complete form_data
  const { data: session } = await fetch(
    `/rest/v1/calculator_sessions_v2?id=eq.${sessionId}`
  ).then(r => r.json());

  const formData = session.form_data;  // ← NOW HAS ALL FIELDS

  // 2. Extract key data for personalization
  const demographics = {
    age: formData.age,
    sex: formData.sex,
    weight: formData.weight,
    height: `${formData.heightFeet}'${formData.heightInches}"`
  };

  const goals = {
    primary: formData.goals,
    challenge: formData.biggestChallenge
  };

  const health = {
    conditions: formData.conditions,
    allergies: formData.allergies,
    medications: formData.medications
  };

  const preferences = {
    diet: formData.diet,
    budget: formData.budget,
    mealPrepTime: formData.mealPrepTime,
    cookingSkill: formData.cookingSkill
  };

  const macros = formData.calculatedMacros;  // ← NOW HAS MACROS

  // 3. Generate personalized report using all data
  const report = await generateAllReports(
    { demographics, goals, health, preferences, macros },
    claudeKey
  );

  return report;
}
```

---

## Validation Checklist

After implementing the fix:

```sql
-- 1. Verify form_data column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calculator_sessions_v2'
AND column_name = 'form_data';

-- 2. Verify a session has complete form_data
SELECT id, session_token, form_data, step_completed
FROM calculator_sessions_v2
WHERE step_completed = 4
LIMIT 1;

-- 3. Check form_data structure
SELECT jsonb_object_keys(form_data) AS keys
FROM calculator_sessions_v2
WHERE form_data IS NOT NULL
LIMIT 1;

-- 4. Verify calculatedMacros present for Step 4 sessions
SELECT id, form_data ->> 'calculatedMacros' as macros
FROM calculator_sessions_v2
WHERE step_completed = 4;
```

---

## Why This Happens (Root Cause Analysis)

**Philosophy**: "A database is a promise you make to the future. Don't break it."

The original schema (Migration 015) was designed with two strategies:
1. **Individual columns** for query performance (indexed, queryable)
2. **Missing**: Consolidated JSONB for report generation completeness

When Step 4 submission happens:
- Data goes into individual columns ✓
- But form_data JSONB never gets created/merged ✗
- Report generator expects one consolidated object ✗
- Result: Report personaliation fails silently ✗

**The Fix**: Add form_data consolidation logic to every step handler. This ensures:
- Each step builds on previous data
- Final form_data is complete at Step 4
- Report generator has everything it needs
- ACID properties maintained (atomic, consistent, isolated, durable)

---

## Deployment Order

1. **First**: Deploy Migration 025 (adds column)
   ```bash
   supabase migration deploy 025
   ```

2. **Second**: Update calculator-api.js in Cloudflare
   ```bash
   wrangler deploy --name calculator-api
   ```

3. **Third**: Test with new form submission
   ```javascript
   // POST /api/v1/calculator/session
   // POST /api/v1/calculator/step/1
   // POST /api/v1/calculator/step/2
   // POST /api/v1/calculator/step/3
   // POST /api/v1/calculator/step/4

   // Verify form_data is complete
   SELECT form_data FROM calculator_sessions_v2 WHERE id = '{session_id}';
   ```

4. **Fourth**: Test report generation
   - Payment verification
   - Report generation endpoint
   - Email delivery

---

## Troubleshooting

**Q: Form_data is null after Step 4**
A: Ensure all four handlers have form_data merging logic

**Q: Form_data exists but is incomplete**
A: Check that each step is merging with existing data using spread operator

**Q: Report still shows undefined macros**
A: Verify calculatedMacros key is present in Step 3 handler

**Q: Column not found error**
A: Ensure Migration 025 was deployed before API update

---

## Performance Considerations

- **form_data JSONB column**: Minimal storage (~1KB per session)
- **GIN index**: Fast JSONB queries (< 1ms)
- **Backward compatible**: Individual columns still exist for queries
- **No impact**: Existing report logic unchanged

---

**Author**: LEO (Database Architect)
**Status**: Ready for Implementation
**Risk Level**: Low (additive change)
**Estimated Deploy Time**: 15 minutes

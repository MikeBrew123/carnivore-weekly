# LEO's Complete Debug & Fix Package

## What's the Problem?

Your report generation is showing undefined form data, causing macros to use default values instead of personalized calculations.

**Root Cause**: The calculator API saves form data to individual columns but doesn't consolidate it as a `form_data` JSONB object. Report generation expects a complete consolidated object.

---

## Files in This Package

### Analysis & Documentation
- **LEO_README.md** (this file)
  - Overview of the problem and solution
  
- **LEO_IMPLEMENTATION_SUMMARY.md**
  - Step-by-step deployment instructions
  - Testing checklist
  - Risk assessment
  
- **LEO_FORM_DATA_DEBUG_GUIDE.md**
  - Complete architectural explanation
  - Field mapping reference
  - Troubleshooting guide
  - Why this happened (root cause analysis)

- **LEO_CALCULATOR_API_PATCH.md**
  - Detailed code changes for each function
  - Line numbers and context
  - Implementation steps

### Implementation Files
- **migrations/025_add_form_data_to_calculator_sessions.sql**
  - Database migration (adds form_data JSONB column)
  - Deploy this FIRST

- **LEO_CODE_SNIPPETS.js**
  - Ready-to-use code for calculator-api.js
  - Copy/paste snippets for all 4 handler functions
  - Includes testing queries

### Diagnostic Queries
- **LEO_DIAGNOSTICS.sql**
  - 13 SQL queries to verify:
    - Schema integrity
    - Data completeness
    - Field presence
    - Performance

---

## Quick Start (TL;DR)

### Deploy Order (CRITICAL)
1. Deploy migration: `migrations/025_add_form_data_to_calculator_sessions.sql`
2. Update API: `/CalculatorBuild/calculator-api.js` with code from `LEO_CODE_SNIPPETS.js`
3. Test with new form submission

### What Gets Fixed
- Form data is now consolidated as JSONB
- Report generation gets complete data
- Macros personalize correctly
- No more undefined values

---

## Current State Analysis

### Two Separate Systems
- **cw_assessment_sessions** (has form_data JSONB) - Not used by API, but data shows structure works
- **calculator_sessions_v2** (missing form_data JSONB) - Used by API, completely empty

### Sample Data
Session ID: 286ec3ee-4d30-4b29-84bb-81bcd61e9fbd exists in cw_assessment_sessions with:
```json
{
  "weight": 200,
  "heightFeet": 6,
  "heightInches": 0,
  "age": 30,
  "sex": "male",
  "goal": "maintain",
  "diet": "carnivore",
  "exercise": "3-4",
  "lifestyle": "moderate",
  "calculatedMacros": { ... },
  "allergies": "None",
  "conditions": ["none"],
  // ... and 20+ other fields
}
```

This proves the JSONB approach works. We just need to implement it in calculator_sessions_v2.

---

## The Fix (High Level)

### Schema Change
Add one column to calculator_sessions_v2:
```sql
ALTER TABLE calculator_sessions_v2
ADD COLUMN form_data JSONB;
```

### API Logic Change
Each step merges its data into form_data instead of replacing it:

```javascript
// Step 1: Initial
form_data: {
  sex: 'male',
  age: 30,
  weight: 180
}

// Step 2: Merge
form_data: {
  ...existingFormData,
  lifestyle: 'moderate',
  exercise: '3-4',
  goal: 'maintain'
}

// Step 3: Merge
form_data: {
  ...existingFormData,
  calculatedMacros: { ... }
}

// Step 4: Merge
form_data: {
  ...existingFormData,
  email: 'user@example.com',
  firstName: 'John',
  // ... all other fields
}
```

---

## Implementation Overview

**Estimated Time**: 1 hour
**Risk Level**: Low (additive change only)
**Rollback**: Simple (can drop column if needed)

### Step 1: Database (5 min)
- Deploy migration 025
- Verify form_data column appears

### Step 2: API Code (30 min)
- Update calculator-api.js
- Modify 4 handler functions
- Add form_data consolidation logic

### Step 3: Deploy (5 min)
- Deploy to Cloudflare Workers
- Monitor logs

### Step 4: Verify (10 min)
- Test with complete form submission
- Check form_data saved correctly
- Verify report generates with personalization

---

## Testing After Implementation

### SQL Query to Verify
```sql
SELECT
  id,
  form_data ->> 'weight' as weight,
  form_data ->> 'age' as age,
  form_data ->> 'calculatedMacros' as macros
FROM public.calculator_sessions_v2
WHERE step_completed = 4
ORDER BY created_at DESC
LIMIT 1;
```

Expected: All fields populated (not null)

---

## Key Documents by Purpose

### "I need to understand the problem"
→ Read: **LEO_FORM_DATA_DEBUG_GUIDE.md**

### "I need to deploy this"
→ Read: **LEO_IMPLEMENTATION_SUMMARY.md**

### "I need exact code changes"
→ Read: **LEO_CODE_SNIPPETS.js** or **LEO_CALCULATOR_API_PATCH.md**

### "I need to verify it worked"
→ Read: **LEO_DIAGNOSTICS.sql**

### "I need the migration"
→ Use: **migrations/025_add_form_data_to_calculator_sessions.sql**

---

## Field Name Mapping Reference

API columns use snake_case, form_data uses camelCase:

| Column Name | form_data Key | Type |
|---|---|---|
| sex | sex | string |
| age | age | number |
| weight_value | weight | number |
| height_feet | heightFeet | number |
| height_inches | heightInches | number |
| lifestyle_activity | lifestyle | string |
| exercise_frequency | exercise | string |
| goal | goal | string |
| diet_type | diet | string |
| first_name | firstName | string |
| last_name | lastName | string |
| calculated_macros | calculatedMacros | object |
| avoid_foods | avoidFoods | string |
| dairy_tolerance | dairyTolerance | string |
| carnivore_experience | carnivoreExperience | string |
| cooking_skill | cookingSkill | string |
| meal_prep_time | mealPrepTime | string |
| family_situation | familySituation | string |
| work_travel | workTravel | string |
| biggest_challenge | biggestChallenge | string |
| other_conditions | otherConditions | string |
| other_symptoms | otherSymptoms | string |
| additional_notes | additionalNotes | string |

---

## Critical Success Factors

1. **Deploy migration BEFORE API update**
   - If reversed: "column not found" error

2. **Use spread operator for merge**
   ```javascript
   form_data: {
     ...existingFormData,  // ← This is critical
     newField: newValue
   }
   ```

3. **Maintain field naming consistency**
   - API columns: snake_case
   - form_data keys: camelCase

4. **Don't skip any step**
   - Step 1, 2, 3 all need form_data merging
   - Not just Step 4

---

## Troubleshooting

### Problem: "Column form_data not found"
**Solution**: Deploy migration 025 first

### Problem: Form data is null after Step 4
**Solution**: Check spread operator `...existingFormData` is present in all handlers

### Problem: Some fields missing in form_data
**Solution**: Verify all 4 handlers are updating form_data, not just Step 4

### Problem: Report still shows defaults
**Solution**: Check report generation is fetching from calculator_sessions_v2 and reading form_data

---

## Philosophy

> "A database is a promise you make to the future. Don't break it."

This fix ensures:
- **Data Integrity**: Complete, consolidated form_data on every submission
- **Report Reliability**: No more undefined values or default calculations
- **User Experience**: Personalized recommendations based on actual data
- **ACID Compliance**: Atomic (all-or-nothing), Consistent, Isolated, Durable

---

## Questions?

Refer to the appropriate document:

- **Architecture Q's**: LEO_FORM_DATA_DEBUG_GUIDE.md
- **Deployment Q's**: LEO_IMPLEMENTATION_SUMMARY.md  
- **Code Q's**: LEO_CODE_SNIPPETS.js
- **SQL Q's**: LEO_DIAGNOSTICS.sql

---

## Author
LEO - Database Architect & Supabase Specialist
"Slow is smooth, and smooth is fast. Your data is sacred."

---

**Status**: Analysis Complete, Ready for Implementation
**Last Updated**: 2026-01-05
**Estimated Deploy Time**: 1 hour

/**
 * LEO's Code Snippets for Calculator API fix
 * Fix form_data Persistence in calculator-api.js
 *
 * Instructions:
 * 1. Replace function bodies in calculator-api.js with these snippets
 * 2. Keep existing validation and error handling
 * 3. Update only the JSON body being sent to PATCH
 * 4. Deploy after Migration 025 is applied
 */

// =============================================================================
// SNIPPET 1: handleSaveStep1() - Lines ~150-211
// =============================================================================

async function handleSaveStep1(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests. Try again later.', 429);
    }

    // Basic validation
    if (!data.sex || !['male', 'female'].includes(data.sex)) {
      return createErrorResponse('VALIDATION_FAILED', 'Invalid sex value', 400);
    }
    if (!data.age || data.age < 13 || data.age > 150) {
      return createErrorResponse('VALIDATION_FAILED', 'Age must be between 13 and 150', 400);
    }

    // MODIFIED SECTION: Add form_data
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          // Existing individual columns
          sex: data.sex,
          age: data.age,
          height_feet: data.height_feet || null,
          height_inches: data.height_inches || null,
          height_cm: data.height_cm || null,
          weight_value: data.weight_value,
          weight_unit: data.weight_unit || 'lbs',

          // NEW: Add form_data consolidation
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
        }),
      }
    );

    if (!response.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 1', 500);
    }

    return createSuccessResponse({
      session_token,
      step_completed: 2,
      next_step: 3,
    });
  } catch (err) {
    console.error('handleSaveStep1 error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// =============================================================================
// SNIPPET 2: handleSaveStep2() - Lines ~216-267
// =============================================================================

async function handleSaveStep2(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests. Try again later.', 429);
    }

    // MODIFIED: Fetch existing session to get current form_data
    const fetchResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!fetchResponse.ok) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await fetchResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const existingFormData = sessions[0].form_data || {};

    // MODIFIED: Include form_data merge
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          // Existing individual columns
          lifestyle_activity: data.lifestyle_activity,
          exercise_frequency: data.exercise_frequency,
          goal: data.goal,
          deficit_percentage: data.deficit_percentage || null,
          diet_type: data.diet_type,

          // NEW: Merge form_data
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
        }),
      }
    );

    if (!response.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 2', 500);
    }

    return createSuccessResponse({
      session_token,
      step_completed: 3,
      next_step: 4,
    });
  } catch (err) {
    console.error('handleSaveStep2 error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// =============================================================================
// SNIPPET 3: handleSaveStep3() - Lines ~272-335
// =============================================================================

async function handleSaveStep3(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, calculated_macros } = body;

    if (!session_token || !calculated_macros) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and calculated_macros required', 400);
    }

    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests. Try again later.', 429);
    }

    // MODIFIED: Fetch existing data
    const fetchResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!fetchResponse.ok) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await fetchResponse.json();
    const session = sessions[0];
    const existingFormData = session.form_data || {};

    // Update session with macros AND form_data
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          calculated_macros,

          // NEW: Add macros to form_data
          form_data: {
            ...existingFormData,
            calculatedMacros: calculated_macros
          },

          step_completed: 3,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 3', 500);
    }

    // Fetch available payment tiers
    const tiersResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_tiers?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const tiers = tiersResponse.ok ? await tiersResponse.json() : [];

    return createSuccessResponse({
      session_token,
      step_completed: 3,
      calculated_macros,
      available_tiers: tiers,
      next_step: 4,
    });
  } catch (err) {
    console.error('handleSaveStep3 error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// =============================================================================
// SNIPPET 4: handleStep4Submission() - Lines ~574-688
// MOST CRITICAL: Complete form_data consolidation
// =============================================================================

async function handleStep4Submission(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data: formData } = body;

    if (!session_token || !formData) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data required', 400);
    }

    if (!formData.email || !isValidEmail(formData.email)) {
      return createErrorResponse('INVALID_EMAIL', 'Valid email required', 400);
    }

    if (!checkRateLimit(session_token, 3)) {
      return createErrorResponse('RATE_LIMIT', 'Too many submissions.', 429);
    }

    // Fetch session and verify premium
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];

    if (!session.is_premium || session.payment_status !== 'completed') {
      return createErrorResponse('PAYMENT_REQUIRED', 'Payment required to access step 4', 403);
    }

    // Validate form data
    const validationErrors = [];
    if (!formData.first_name || formData.first_name.length > 100) {
      validationErrors.push({ field: 'first_name', message: 'First name required (1-100 chars)' });
    }
    if (!formData.last_name || formData.last_name.length > 100) {
      validationErrors.push({ field: 'last_name', message: 'Last name required (1-100 chars)' });
    }

    if (validationErrors.length > 0) {
      return createErrorResponse('VALIDATION_FAILED', 'Form validation failed', 400, { errors: validationErrors });
    }

    // MODIFIED: Get existing form_data and merge completely
    const existingFormData = session.form_data || {};

    const completedFormData = {
      ...existingFormData,
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
    };

    // Update session with COMPLETE form_data
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          // Individual columns (for backward compatibility)
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          medications: formData.medications || null,
          conditions: formData.conditions || [],
          other_conditions: formData.other_conditions || null,
          symptoms: formData.symptoms || null,
          other_symptoms: formData.other_symptoms || null,
          allergies: formData.allergies || null,
          avoid_foods: formData.avoid_foods || null,
          dairy_tolerance: formData.dairy_tolerance || null,
          previous_diets: formData.previous_diets || null,
          what_worked: formData.what_worked || null,
          carnivore_experience: formData.carnivore_experience || null,
          cooking_skill: formData.cooking_skill || null,
          meal_prep_time: formData.meal_prep_time || null,
          budget: formData.budget || null,
          family_situation: formData.family_situation || null,
          work_travel: formData.work_travel || null,
          goals: formData.goals || [],
          biggest_challenge: formData.biggest_challenge || null,
          additional_notes: formData.additional_notes || null,

          // NEW: Complete consolidated form_data
          form_data: completedFormData,

          step_completed: 4,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 4 data', 500);
    }

    return createSuccessResponse({
      success: true,
      session_token,
      step_completed: 4,
      message: 'Step 4 submitted. Report generation queued.',
    }, 200);
  } catch (err) {
    console.error('handleStep4Submission error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// =============================================================================
// TESTING: Verify form_data is being saved
// =============================================================================

/**
 * Test Query (run in Supabase SQL editor)
 *
 * SELECT
 *   id,
 *   session_token,
 *   step_completed,
 *   form_data,
 *   form_data ->> 'weight' as weight,
 *   form_data ->> 'age' as age,
 *   form_data ->> 'calculatedMacros' as macros
 * FROM public.calculator_sessions_v2
 * WHERE step_completed = 4
 * ORDER BY created_at DESC
 * LIMIT 1;
 *
 * Expected Result:
 * - form_data is an object (not null)
 * - weight, age are populated
 * - macros object present
 */

export default {
  async fetch(request, env) {
    // ... CORS and routing logic unchanged ...
    // Replace the four handler functions above in place of originals
  },
};

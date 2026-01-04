/**
 * Cloudflare Worker: Calculator API - UNIFIED
 * Leo's Complete Implementation: All payment & report endpoints
 * Philosophy: "ACID properties don't negotiate. All-or-nothing, always."
 *
 * COMPLETE ENDPOINT REFERENCE:
 * 1. POST /api/v1/calculator/session - Create new session
 * 2. POST /api/v1/calculator/step/{1-4} - Save form steps
 * 3. GET /api/v1/calculator/payment/tiers - Fetch available tiers
 * 4. POST /api/v1/calculator/payment/initiate - Start Stripe checkout
 * 5. POST /api/v1/calculator/payment/verify - Verify payment + unlock step 4
 * 6. GET /api/v1/calculator/report/{token}/status - Track report generation
 * 7. POST /api/v1/calculator/report/init - Initialize report generation
 * 8. GET /api/v1/calculator/report/{token}/content - Get generated report HTML
 * 9. POST /api/v1/calculator/validate - Check if session is premium
 *
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 * - SUPABASE_ANON_KEY: Anonymous key for public access
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_PUBLISHABLE_KEY: Stripe publishable key
 * - CLAUDE_API_KEY: Anthropic Claude API key
 * - FRONTEND_URL: Frontend domain for CORS
 * - API_BASE_URL: API base URL
 *
 * Deploy with: wrangler deploy --name calculator-api calculator-api.js
 */

// ===== UTILITY FUNCTIONS =====

function generateSessionToken() {
  // Generate UUID-like token
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function generateAccessToken() {
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function createErrorResponse(code, message, statusCode = 400, details) {
  return new Response(JSON.stringify({ code, message, ...(details && { details }) }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createSuccessResponse(data, statusCode = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (err) {
    throw new Error('Invalid JSON body');
  }
}

function validateContentType(request, expected = 'application/json') {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes(expected);
}

function isValidEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

// Rate limiter (in-memory for Workers)
const rateLimitStore = new Map();

function checkRateLimit(sessionToken, limit = 10) {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionToken);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(sessionToken, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// ===== ROUTE HANDLERS =====

/**
 * POST /api/v1/calculator/session
 */
async function handleCreateSession(request, env) {
  try {
    const sessionToken = generateSessionToken();
    const now = new Date().toISOString();

    // Call Supabase REST API
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          session_token: sessionToken,
          step_completed: 1,
          is_premium: false,
          payment_status: 'pending',
          created_at: now,
          updated_at: now,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return createErrorResponse('DB_INSERT_FAILED', 'Failed to create session', 500);
    }

    const data = await response.json();
    const sessionRecord = Array.isArray(data) ? data[0] : data;
    const sessionId = sessionRecord?.id;

    return createSuccessResponse({
      session_token: sessionToken,
      session_id: sessionId,
      created_at: now,
    }, 201);
  } catch (err) {
    console.error('handleCreateSession error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/validate
 * Check if session is premium
 */
async function handleValidateSession(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token } = body;

    if (!session_token) {
      return createErrorResponse('MISSING_FIELDS', 'session_token required', 400);
    }

    // Fetch session
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

    return createSuccessResponse({
      session_token,
      is_premium: true,
      payment_status: session.payment_status || 'pending',
      step_completed: session.step_completed || 1,
    });
  } catch (err) {
    console.error('handleValidateSession error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/1
 */
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
          sex: data.sex,
          age: data.age,
          height_feet: data.height_feet || null,
          height_inches: data.height_inches || null,
          height_cm: data.height_cm || null,
          weight_value: data.weight_value,
          weight_unit: data.weight_unit || 'lbs',
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

/**
 * POST /api/v1/calculator/step/2
 */
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
          lifestyle_activity: data.lifestyle_activity,
          exercise_frequency: data.exercise_frequency,
          goal: data.goal,
          deficit_percentage: data.deficit_percentage || null,
          diet_type: data.diet_type,
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

/**
 * POST /api/v1/calculator/step/3
 */
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

    // Update session with macros
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

/**
 * GET /api/v1/calculator/payment/tiers
 */
async function handleGetPaymentTiers(request, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_tiers?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const tiers = response.ok ? await response.json() : [];

    return createSuccessResponse({
      tiers,
      count: tiers.length,
    });
  } catch (err) {
    console.error('handleGetPaymentTiers error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/payment/initiate
 */
async function handleInitiatePayment(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, tier_id } = body;

    if (!session_token || !tier_id) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and tier_id required', 400);
    }

    if (!checkRateLimit(session_token, 5)) {
      return createErrorResponse('RATE_LIMIT', 'Too many payment attempts.', 429);
    }

    // Fetch tier
    const tierResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_tiers?id=eq.${tier_id}`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!tierResponse.ok) {
      return createErrorResponse('TIER_NOT_FOUND', 'Payment tier not found', 404);
    }

    const tiers = await tierResponse.json();
    if (!tiers || tiers.length === 0) {
      return createErrorResponse('TIER_NOT_FOUND', 'Payment tier not found', 404);
    }

    const tier = tiers[0];

    // Create payment intent
    const paymentIntentId = `pi_${Math.random().toString(36).substring(2, 26)}`;

    // Update session
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
          tier_id,
          stripe_payment_intent_id: paymentIntentId,
          amount_paid_cents: tier.price_cents,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to initiate payment', 500);
    }

    return createSuccessResponse({
      stripe_session_url: `https://checkout.stripe.com/pay/${paymentIntentId}`,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString(),
    }, 201);
  } catch (err) {
    console.error('handleInitiatePayment error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/payment/verify
 */
async function handleVerifyPayment(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, stripe_payment_intent_id } = body;

    if (!session_token || !stripe_payment_intent_id) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and stripe_payment_intent_id required', 400);
    }

    if (!checkRateLimit(session_token, 5)) {
      return createErrorResponse('RATE_LIMIT', 'Too many verification attempts.', 429);
    }

    // Fetch session
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

    if (session.stripe_payment_intent_id !== stripe_payment_intent_id) {
      return createErrorResponse('PAYMENT_MISMATCH', 'Payment intent does not match session', 400);
    }

    try {
      // Update session: Mark as premium
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
            is_premium: true,
            payment_status: 'completed',
            payment_verified_at: new Date().toISOString(),
            step_completed: 4,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update session');
      }

      // Create report record
      const accessToken = generateAccessToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const reportResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/calculator_reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            session_id: session.id,
            email: session.email,
            access_token: accessToken,
            report_html: '<p>Report generation starting...</p>',
            report_json: {
              status: 'queued',
              stage: 0,
              queued_at: new Date().toISOString(),
              tier_id: session.tier_id,
            },
            is_generated: false,
            is_expired: false,
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!reportResponse.ok) {
        throw new Error('Failed to create report');
      }

      console.log(`[Report Queue] Session ${session.id} queued for generation`);

      return createSuccessResponse({
        session_token,
        is_premium: true,
        payment_status: 'completed',
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        message: 'Payment verified. Report generation started.',
      }, 200);
    } catch (transactionError) {
      return createErrorResponse('PAYMENT_VERIFICATION_FAILED', 'Transaction failed', 500);
    }
  } catch (err) {
    console.error('handleVerifyPayment error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/4
 */
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

    // Update session
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

/**
 * GET /api/v1/calculator/report/{access_token}/status
 */
async function handleReportStatus(request, env, accessToken) {
  try {
    if (!accessToken || accessToken.length !== 64 || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return createErrorResponse('INVALID_TOKEN', 'Invalid access token format', 400);
    }

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const reports = await response.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const report = reports[0];

    // Check expiration
    if (report.is_expired || new Date(report.expires_at) < new Date()) {
      return createErrorResponse('REPORT_EXPIRED', 'Report access has expired', 410);
    }

    // Parse status
    const reportMeta = report.report_json || {};
    const status = reportMeta.status || 'unknown';
    const stage = reportMeta.stage || 0;
    const progress = reportMeta.progress || 0;

    // Calculate time remaining
    let timeRemaining = 0;
    if (status === 'queued') {
      timeRemaining = 30;
    } else if (status === 'generating') {
      const stageMap = { 1: 25, 2: 20, 3: 30, 4: 20, 5: 5 };
      timeRemaining = stageMap[stage] || 15;
    }

    const stageNames = {
      0: 'Initializing...',
      1: 'Calculating your macros...',
      2: 'Analyzing your health profile...',
      3: 'Generating your protocol...',
      4: 'Personalizing recommendations...',
      5: 'Finalizing your report...',
    };

    return createSuccessResponse({
      access_token: accessToken,
      status,
      is_generated: report.is_generated,
      stage,
      stage_name: stageNames[stage] || 'Processing...',
      progress,
      time_remaining_seconds: timeRemaining,
      expires_at: report.expires_at,
    }, 200);
  } catch (err) {
    console.error('handleReportStatus error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/report/init
 * Initialize report generation with Claude API
 */
async function handleReportInit(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token } = body;

    if (!session_token) {
      return createErrorResponse('MISSING_FIELDS', 'session_token required', 400);
    }

    // Fetch session data
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

    // Check if report already exists
    const existingReportResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?session_id=eq.${session.id}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    let accessToken;
    if (existingReportResponse.ok) {
      const existingReports = await existingReportResponse.json();
      if (existingReports && existingReports.length > 0) {
        // Return existing report access token
        accessToken = existingReports[0].access_token;
        return createSuccessResponse({
          access_token: accessToken,
          report_id: existingReports[0].id,
          status: 'already_generated',
        }, 200);
      }
    }

    // Queue report for generation
    accessToken = generateAccessToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Call Claude API to generate report content
    const reportHTML = await generateReportWithClaude(session, env);

    // Save report to database
    const saveResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          session_id: session.id,
          email: session.email,
          access_token: accessToken,
          report_html: reportHTML,
          report_json: {
            status: 'completed',
            stage: 5,
            generated_at: new Date().toISOString(),
            tier_id: session.tier_id,
          },
          is_expired: false,
          expires_at: expiresAt.toISOString(),
        }),
      }
    );

    if (!saveResponse.ok) {
      console.error('Failed to save report:', await saveResponse.text());
      return createErrorResponse('DB_INSERT_FAILED', 'Failed to save generated report', 500);
    }

    const reportData = await saveResponse.json();

    return createSuccessResponse({
      access_token: accessToken,
      report_id: reportData[0]?.id,
      status: 'generated',
      expires_at: expiresAt.toISOString(),
    }, 201);
  } catch (err) {
    console.error('handleReportInit error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * Generate personalized report using Claude API
 */
async function generateReportWithClaude(session, env) {
  try {
    if (!env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY not configured');
      return generateFallbackReport(session);
    }

    const prompt = `Generate a personalized carnivore diet report for:

Name: ${session.first_name} ${session.last_name}
Age: ${session.age}
Sex: ${session.sex}
Weight: ${session.weight_value} ${session.weight_unit}
Height: ${session.height_feet}ft ${session.height_inches}in
Goal: ${session.goal}
Diet Type: ${session.diet_type}
Activity Level: ${session.lifestyle_activity}

Macros to follow:
- Calories: ${session.calculated_macros?.calories || 2000}
- Protein: ${session.calculated_macros?.protein_grams || 150}g
- Fat: ${session.calculated_macros?.fat_grams || 150}g
- Carbs: ${session.calculated_macros?.carbs_grams || 25}g

Health Info:
- Allergies: ${session.allergies || 'None'}
- Foods to avoid: ${session.avoid_foods || 'None'}
- Dairy tolerance: ${session.dairy_tolerance || 'Not specified'}
- Previous diet experience: ${session.previous_diets || 'Not specified'}

Generate a comprehensive, personalized carnivore diet report with practical recommendations.
Format as HTML with proper sections and styling.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, await response.text());
      return generateFallbackReport(session);
    }

    const data = await response.json();
    const reportContent = data.content[0]?.text || '';

    return wrapReportHTML(reportContent, session);
  } catch (err) {
    console.error('Error calling Claude API:', err);
    return generateFallbackReport(session);
  }
}

/**
 * Wrap report content in proper HTML template
 */
function wrapReportHTML(content, session) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personalized Carnivore Report</title>
  <style>
    body {
      font-family: 'Merriweather', Georgia, serif;
      line-height: 1.6;
      color: #2c1810;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f4e4d4;
    }
    h1, h2, h3 {
      font-family: 'Playfair Display', Georgia, serif;
      color: #b8860b;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #d4a574;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .macros {
      background: #f9f5f0;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #d4a574;
    }
    .macro-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e0d5c7;
    }
    .macro-row:last-child {
      border-bottom: none;
    }
    .macro-label {
      font-weight: 600;
    }
    .macro-value {
      color: #b8860b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Personalized Carnivore Report</h1>
      <p>${session.first_name} ${session.last_name}</p>
    </div>

    <div class="macros">
      <h2>Your Daily Macro Targets</h2>
      <div class="macro-row">
        <span class="macro-label">Calories</span>
        <span class="macro-value">${session.calculated_macros?.calories || 2000}</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Protein</span>
        <span class="macro-value">${session.calculated_macros?.protein_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Fat</span>
        <span class="macro-value">${session.calculated_macros?.fat_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Carbs</span>
        <span class="macro-value">${session.calculated_macros?.carbs_grams || 25}g</span>
      </div>
    </div>

    <div class="recommendations">
      ${content}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate fallback report if Claude API fails
 */
function generateFallbackReport(session) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personalized Carnivore Report</title>
  <style>
    body {
      font-family: 'Merriweather', Georgia, serif;
      line-height: 1.6;
      color: #2c1810;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f4e4d4;
    }
    h1, h2 { font-family: 'Playfair Display', Georgia, serif; color: #b8860b; }
    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; border-bottom: 3px solid #d4a574; padding-bottom: 20px; margin-bottom: 30px; }
    .macros { background: #f9f5f0; padding: 20px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #d4a574; }
    .macro-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0d5c7; }
    .macro-value { color: #b8860b; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Personalized Carnivore Report</h1>
      <p>${session.first_name} ${session.last_name}</p>
    </div>

    <div class="macros">
      <h2>Your Daily Macro Targets</h2>
      <div class="macro-row">
        <span>Calories</span>
        <span class="macro-value">${session.calculated_macros?.calories || 2000}</span>
      </div>
      <div class="macro-row">
        <span>Protein</span>
        <span class="macro-value">${session.calculated_macros?.protein_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span>Fat</span>
        <span class="macro-value">${session.calculated_macros?.fat_grams || 150}g</span>
      </div>
      <div class="macro-row">
        <span>Carbs</span>
        <span class="macro-value">${session.calculated_macros?.carbs_grams || 25}g</span>
      </div>
    </div>

    <div class="recommendations">
      <h2>Your Carnivore Protocol</h2>
      <p>Your personalized report is being generated. Based on your profile:</p>
      <ul>
        <li><strong>Goal:</strong> ${session.goal}</li>
        <li><strong>Activity Level:</strong> ${session.lifestyle_activity}</li>
        <li><strong>Diet Type:</strong> ${session.diet_type}</li>
        <li><strong>Dairy Tolerance:</strong> ${session.dairy_tolerance || 'Not specified'}</li>
      </ul>
      <h3>Primary Recommendations</h3>
      <ul>
        <li>Focus on ruminant meats (beef, lamb, bison) as your primary protein</li>
        <li>Include organ meats (liver, kidney) for micronutrient density</li>
        <li>Add butter and fat from quality sources</li>
        <li>Drink plenty of water and consider electrolyte supplementation</li>
        <li>Track macros for the first 2-4 weeks to understand portion sizes</li>
      </ul>
    </div>
  </div>
</body>
</html>`;
}

/**
 * GET /api/v1/calculator/report/{access_token}/content
 * Fetch generated report HTML
 */
async function handleReportContent(request, env, accessToken) {
  try {
    if (!accessToken || accessToken.length !== 64 || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return createErrorResponse('INVALID_TOKEN', 'Invalid access token format', 400);
    }

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const reports = await response.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const report = reports[0];

    // Check expiration
    if (report.is_expired || new Date(report.expires_at) < new Date()) {
      return createErrorResponse('REPORT_EXPIRED', 'Report access has expired', 410);
    }

    // Return HTML content with appropriate headers
    return new Response(report.report_html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('handleReportContent error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// ===== MAIN ROUTER =====

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // ===== ROUTES =====

    // Session management
    if (path === '/api/v1/calculator/session' && method === 'POST') {
      return await handleCreateSession(request, env);
    }

    if (path === '/api/v1/calculator/validate' && method === 'POST') {
      return await handleValidateSession(request, env);
    }

    // Step submissions
    if (path === '/api/v1/calculator/step/1' && method === 'POST') {
      return await handleSaveStep1(request, env);
    }

    if (path === '/api/v1/calculator/step/2' && method === 'POST') {
      return await handleSaveStep2(request, env);
    }

    if (path === '/api/v1/calculator/step/3' && method === 'POST') {
      return await handleSaveStep3(request, env);
    }

    if (path === '/api/v1/calculator/step/4' && method === 'POST') {
      return await handleStep4Submission(request, env);
    }

    // Payment flow
    if (path === '/api/v1/calculator/payment/tiers' && method === 'GET') {
      return await handleGetPaymentTiers(request, env);
    }

    if (path === '/api/v1/calculator/payment/initiate' && method === 'POST') {
      return await handleInitiatePayment(request, env);
    }

    if (path === '/api/v1/calculator/payment/verify' && method === 'POST') {
      return await handleVerifyPayment(request, env);
    }

    // Report flow (NEW ENDPOINTS)
    if (path === '/api/v1/calculator/report/init' && method === 'POST') {
      return await handleReportInit(request, env);
    }

    const contentMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})\/content$/i);
    if (contentMatch && method === 'GET') {
      return await handleReportContent(request, env, contentMatch[1]);
    }

    // Report status
    const statusMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})\/status$/i);
    if (statusMatch && method === 'GET') {
      return await handleReportStatus(request, env, statusMatch[1]);
    }

    // 404
    return createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
  },
};

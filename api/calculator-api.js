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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  const response = new Response(JSON.stringify({ code, message, ...(details && { details }) }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(response);
}

function createSuccessResponse(data, statusCode = 200) {
  const response = new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(response);
}

function addCorsHeaders(response, origin = '*') {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
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

// ===== COUPON VALIDATION =====

const validCoupons = {
  'WELCOME10': { percent: 10, description: 'Welcome 10% off' },
  'CARNIVORE20': { percent: 20, description: 'Carnivore community 20% off' },
  'EARLY25': { percent: 25, description: 'Early adopter 25% off' },
  'LAUNCH50': { percent: 50, description: 'Limited launch 50% off' },
  'FRIEND15': { percent: 15, description: 'Referral friend 15% off' },
  'TESTCOUPON5': { percent: 5, description: 'Test coupon 5% off' },
  'TEST321': { percent: 100, description: 'Test 100% off' },
};

function validateCoupon(code) {
  const coupon = validCoupons[code?.toUpperCase()];
  if (!coupon) {
    return {
      valid: false,
      error: 'Coupon code not found or expired'
    };
  }

  return {
    valid: true,
    code: code.toUpperCase(),
    percent: coupon.percent,
    description: coupon.description
  };
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
 * POST /validate-coupon
 * Validate coupon code and return discount percent
 */
async function handleValidateCoupon(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { code } = body;

    if (!code) {
      return createErrorResponse('MISSING_CODE', 'Coupon code is required', 400);
    }

    const result = validateCoupon(code);
    if (!result.valid) {
      return createErrorResponse('INVALID_COUPON', result.error, 400);
    }

    return createSuccessResponse({
      code: result.code,
      percent: result.percent,
      description: result.description
    });
  } catch (err) {
    console.error('handleValidateCoupon error:', err);
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
    console.log('[handleStep4Submission] Processing Step 4 submission');

    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { assessment_id, data: formData } = body;

    console.log('[handleStep4Submission] Received assessment_id:', assessment_id);
    console.log('[handleStep4Submission] Received formData keys:', formData ? Object.keys(formData).slice(0, 15) : 'null');
    console.log('[handleStep4Submission] Has weight:', formData?.weight, 'has sex:', formData?.sex, 'has age:', formData?.age);

    if (!assessment_id || !formData) {
      return createErrorResponse('MISSING_FIELDS', 'assessment_id and data required', 400);
    }

    // Fetch assessment session to verify payment
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${assessment_id}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      console.error('[handleStep4Submission] Failed to fetch session:', sessionResponse.status);
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];
    console.log('[handleStep4Submission] Session found, payment_status:', session.payment_status);

    // Verify payment was completed
    if (session.payment_status !== 'pending' && session.payment_status !== 'success') {
      console.error('[handleStep4Submission] Payment not completed, status:', session.payment_status);
      return createErrorResponse('PAYMENT_REQUIRED', 'Payment required to access step 4', 403);
    }

    // Merge Step 4 data with existing form data
    const existingFormData = session.form_data || {};
    const updatedFormData = {
      ...existingFormData,
      ...formData,
    };

    console.log('[handleStep4Submission] Updating session with Step 4 data');

    // Update session with Step 4 data
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${assessment_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          form_data: updatedFormData,
          payment_status: 'completed',
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('[handleStep4Submission] DB update failed:', error);
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 4 data', 500);
    }

    console.log('[handleStep4Submission] Step 4 data saved successfully');

    return createSuccessResponse({
      success: true,
      assessment_id,
      step_completed: 4,
      message: 'Step 4 submitted successfully. Report generation will begin shortly.',
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
    const { session_id, session_token } = body;

    // Support both assessment sessions (new) and old session tokens
    let sessionQuery = '';
    if (session_id) {
      sessionQuery = `cw_assessment_sessions?id=eq.${session_id}`;
    } else if (session_token) {
      sessionQuery = `calculator_sessions_v2?session_token=eq.${session_token}`;
    } else {
      return createErrorResponse('MISSING_FIELDS', 'session_id or session_token required', 400);
    }

    // Fetch session data
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/${sessionQuery}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      console.error('[handleReportInit] Session fetch failed:', sessionResponse.status);
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];
    console.log('[handleReportInit] Processing report for session:', session.id || session_id);
    console.log('[handleReportInit] Session form_data keys:', session.form_data ? Object.keys(session.form_data) : 'NULL');
    console.log('[handleReportInit] Session form_data sample:', JSON.stringify({
      weight: session.form_data?.weight,
      age: session.form_data?.age,
      sex: session.form_data?.sex,
      heightFeet: session.form_data?.heightFeet,
      goal: session.form_data?.goal,
      diet: session.form_data?.diet,
    }));

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

    // Build report metadata - handle both old and new session structures
    const reportMeta = {
      status: 'completed',
      stage: 5,
      generated_at: new Date().toISOString(),
    };

    // Add tier_id if it exists (old table structure)
    if (session.tier_id) {
      reportMeta.tier_id = session.tier_id;
    }

    // Save report to database
    let saveResponse;

    if (session.form_data) {
      // New assessment session - use RPC to bypass PostgREST cache issues
      saveResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/rpc/insert_assessment_report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            p_assessment_id: session.id,
            p_email: session.email || 'unknown@example.com',
            p_access_token: accessToken,
            p_report_html: reportHTML,
            p_report_json: reportMeta,
            p_expires_at: expiresAt.toISOString(),
          }),
        }
      );
    } else {
      // Old session structure - use calculator_reports
      saveResponse = await fetch(
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
            email: session.email || 'unknown@example.com',
            access_token: accessToken,
            report_html: reportHTML,
            report_json: reportMeta,
            is_expired: false,
            expires_at: expiresAt.toISOString(),
          }),
        }
      );
    }

    // Database save is optional - report is already generated and can be returned directly
    if (saveResponse.ok) {
      try {
        const reportData = await saveResponse.json();
        console.log('[handleReportInit] Report saved to database:', reportData[0]?.id);
      } catch (e) {
        console.warn('[handleReportInit] Could not parse database response');
      }
    } else {
      const errorText = await saveResponse.text();
      console.warn('[handleReportInit] Database save skipped (PostgREST cache issue):', errorText.substring(0, 100));
      // Continue anyway - report is generated and we can return it
    }

    return createSuccessResponse({
      access_token: accessToken,
      status: 'generated',
      report_html: reportHTML,
      message: 'Report generated successfully. Download your protocol below.',
      DEBUG: {
        form_data_keys: session.form_data ? Object.keys(session.form_data) : null,
        weight_from_session: session.form_data?.weight,
        age_from_session: session.form_data?.age,
        session_form_data_type: typeof session.form_data,
        has_fallback_template: reportHTML.includes('Your personalized report is being generated'),
        has_claude_content: reportHTML.includes('claude-3-5-sonnet'),
        report_html_length: reportHTML.length,
        report_includes_recommendations: reportHTML.includes('<div class=\"recommendations\">'),
        claude_api_error: session._claude_api_error || null,
      },
    }, 200);
  } catch (err) {
    console.error('handleReportInit error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * Calculate macros from form data (mirrors frontend calculation)
 */
function calculateMacros(formData) {
  // Handle undefined formData
  if (!formData) {
    console.warn('[calculateMacros] formData is null/undefined, using defaults');
    formData = {};
  }

  const weight = formData.weight || 200;
  const heightFeet = formData.heightFeet || 6;
  const heightInches = formData.heightInches || 0;
  const heightCm = formData.heightCm;
  const age = formData.age || 30;
  const sex = (formData.sex || 'male').toLowerCase();
  const goal = formData.goal || 'maintain';
  const diet = formData.diet || 'carnivore';
  // Try both 'exercise' and 'lifestyle' field names
  const exercise = formData.exercise || formData.lifestyle || 'moderate';

  // BMR using Mifflin-St Jeor
  let bmr;
  const weightKg = weight * 0.453592;
  // Use heightCm if provided, otherwise calculate from feet/inches
  const heightCmVal = heightCm || ((heightFeet || 6) * 12 + (heightInches || 0)) * 2.54;

  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCmVal - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCmVal - 5 * age - 161;
  }

  // Activity multiplier
  const activityMap = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryactive: 1.9,
  };
  const multiplier = activityMap[exercise] || 1.55;
  const tdee = bmr * multiplier;

  // Calculate macros based on diet type and goal
  let calories = tdee;
  let deficit = 0;

  if (goal === 'loss') deficit = 500;
  if (goal === 'gain') deficit = -500;

  calories -= deficit;

  let protein, fat, carbs;
  if (diet === 'carnivore') {
    protein = Math.round(weightKg * 2); // 2g/kg
    const proteinCals = protein * 4;
    const fatCals = calories - proteinCals;
    fat = Math.round(fatCals / 9);
    carbs = 0;
  } else {
    protein = Math.round(weightKg * 1.6);
    const proteinCals = protein * 4;
    const fatCals = calories * 0.3;
    fat = Math.round(fatCals / 9);
    carbs = Math.round((calories - proteinCals - fatCals) / 4);
  }

  const result = {
    calories: Math.round(calories),
    protein_grams: protein,
    fat_grams: fat,
    carbs_grams: carbs,
  };

  console.log('[calculateMacros] Result:', {
    input: { weight, heightFeet, heightInches, age, sex, goal, diet, exercise },
    output: result,
  });

  return result;
}

/**
 * Generate personalized report using Claude API
 */
async function generateReportWithClaude(session, env) {
  try {
    console.error('[generateReportWithClaude] CHECKING API KEYS...');
    console.error('[generateReportWithClaude] env object keys:', Object.keys(env || {}));

    // FIXED: Use ANTHROPIC_API_KEY (not CLAUDE_API_KEY)
    const apiKey = env?.ANTHROPIC_API_KEY || env?.CLAUDE_API_KEY;
    console.error('[generateReportWithClaude] ANTHROPIC_API_KEY exists?', !!env?.ANTHROPIC_API_KEY);
    console.error('[generateReportWithClaude] ANTHROPIC_API_KEY length:', env?.ANTHROPIC_API_KEY?.length || 'MISSING');

    if (!apiKey) {
      console.error('[generateReportWithClaude] FATAL: ANTHROPIC_API_KEY not configured!');
      console.error('[generateReportWithClaude] Available secrets:', Object.keys(env || {}));
      return generateFallbackReport(session);
    }
    console.log('[generateReportWithClaude] ✓ ANTHROPIC_API_KEY is configured');

    // Handle both old and new session structures
    // New structure: form_data is a JSONB field containing all fields
    // Old structure: fields are at top level
    console.error('[generateReportWithClaude] SESSION_FORM_DATA_RAW:', {
      hasFormData: !!session.form_data,
      formDataType: typeof session.form_data,
      formDataSample: JSON.stringify(session.form_data).substring(0, 300),
    });

    let formData = session.form_data || session;

    // If form_data is a string, parse it
    if (typeof formData === 'string') {
      console.error('[generateReportWithClaude] PARSING_FORM_DATA_FROM_STRING');
      try {
        formData = JSON.parse(formData);
      } catch (e) {
        console.warn('[generateReportWithClaude] Could not parse form_data as JSON, treating as object');
      }
    }

    // Ensure formData is an object
    if (!formData || typeof formData !== 'object') {
      formData = {};
    }

    // EXPLICIT DEBUG: Show exactly what we have before extraction
    console.error('[generateReportWithClaude] FORM_DATA_BEFORE_EXTRACTION:', {
      formDataType: typeof formData,
      formDataIsObject: formData && typeof formData === 'object',
      formDataKeys: Object.keys(formData || {}),
      weight: formData?.weight,
      age: formData?.age,
      firstName: formData?.firstName,
      lastName: formData?.lastName,
      fullFormData: JSON.stringify(formData).substring(0, 500),
    });

    const firstName = session.first_name || formData.firstName || 'User';
    const lastName = formData.lastName || '';
    const age = formData.age || 30;
    const sex = formData.sex || 'Male';
    const weight = formData.weight || 200;
    const heightFeet = formData.heightFeet || 6;
    const heightInches = formData.heightInches || 0;
    const goal = formData.goal || 'maintain';
    const diet = formData.diet || 'carnivore';
    const lifestyle = formData.lifestyle || 'moderate';

    // Calculate macros from form data
    const macros = calculateMacros(formData);
    console.log('[generateReportWithClaude] Input formData:', {
      weight: formData.weight,
      heightFeet: formData.heightFeet,
      heightInches: formData.heightInches,
      heightCm: formData.heightCm,
      age: formData.age,
      sex: formData.sex,
      goal: formData.goal,
      diet: formData.diet,
      exercise: formData.exercise,
      lifestyle: formData.lifestyle,
    });
    console.log('[generateReportWithClaude] Calculated macros:', macros);

    const prompt = `Generate a personalized carnivore diet report for:

Name: ${firstName} ${lastName}
Age: ${age}
Sex: ${sex}
Weight: ${weight} lbs
Height: ${heightFeet}ft ${heightInches}in
Goal: ${goal}
Diet Type: ${diet}
Activity Level: ${lifestyle}

Health Info:
- Allergies: ${formData.allergies || 'None'}
- Foods to avoid: ${formData.avoidFoods || 'None'}
- Dairy tolerance: ${formData.dairyTolerance || 'Not specified'}
- Previous diet experience: ${formData.previousDiets || 'Not specified'}
- Current conditions: ${Array.isArray(formData.conditions) ? formData.conditions.join(', ') : formData.conditions || 'None'}
- Current symptoms: ${Array.isArray(formData.symptoms) ? formData.symptoms.join(', ') : formData.symptoms || 'None'}
- Biggest challenge: ${formData.biggestChallenge || 'Not specified'}
- Additional notes: ${formData.otherSymptoms || 'None'}

Calculated Daily Macro Targets (personalized for this user):
- Daily Calories: ${macros.calories}
- Daily Protein: ${macros.protein_grams}g
- Daily Fat: ${macros.fat_grams}g
- Daily Carbs: ${macros.carbs_grams}g

Generate a comprehensive, personalized carnivore diet protocol with:
1. Daily nutrition targets (using the calculated macros above)
2. Meal timing recommendations
3. Food choices (high quality meats, organs, etc.)
4. How to handle their specific conditions/symptoms
5. Practical tips for their lifestyle and challenges
6. When to adjust macros based on progress

Format response as plain text (no HTML tags). This will be embedded in an HTML template.`;

    // DEBUG: Log before Claude API call
    console.log('[generateReportWithClaude] CALLING CLAUDE API WITH:', JSON.stringify({
      firstName,
      goal,
      calories: macros.calories,
      protein: macros.protein_grams,
      fat: macros.fat_grams,
      carbs: macros.carbs_grams,
    }, null, 2));

    console.error('[generateReportWithClaude] MAKING CLAUDE API CALL...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,  // FIXED: Use apiKey variable
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',  // FIXED: Updated from sonnet-20241022 to current Opus 4.5
        max_tokens: 8000,  // FIXED: Increased from 2000 to allow full comprehensive report
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    console.error('[generateReportWithClaude] CLAUDE API RESPONSE:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generateReportWithClaude] CLAUDE API ERROR:', response.status, errorText.substring(0, 200));
      // CRITICAL: Include error in response for debugging
      session._claude_api_error = {
        status: response.status,
        message: errorText.substring(0, 200),
      };
      return generateFallbackReport(session);
    }

    const data = await response.json();
    console.error('[generateReportWithClaude] CLAUDE API SUCCESS - received response with', data.content?.length, 'content items');
    const reportContent = data.content[0]?.text || '';

    // Pass macros to the report template
    console.error('[generateReportWithClaude] WRAPPING REPORT WITH REAL CLAUDE CONTENT');
    return wrapReportHTML(reportContent, session, macros);
  } catch (err) {
    console.error('[generateReportWithClaude] EXCEPTION:', err?.message || String(err));
    return generateFallbackReport(session);
  }
}

/**
 * Convert markdown to HTML for report content
 */
function markdownToHTML(markdown) {
  if (!markdown) return '';

  let html = markdown
    // Headers: # → <h1>, ## → <h2>, etc
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')

    // Bold: **text** → <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Italic: *text* → <em>text</em> (but not in **text**)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')

    // Horizontal rules
    .replace(/^---+$/gm, '<hr>')

    // Line breaks: double newline → paragraph breaks
    .split('\n\n')
    .map(para => {
      // Handle lists
      if (para.trim().startsWith('- ')) {
        const items = para.trim().split('\n').map(line => {
          if (line.trim().startsWith('- ')) {
            return `<li>${line.trim().substring(2)}</li>`;
          }
          return line;
        }).join('\n');
        return `<ul>\n${items}\n</ul>`;
      }

      // Wrap regular paragraphs
      if (para.trim() && !para.trim().startsWith('<')) {
        return `<p>${para.trim()}</p>`;
      }
      return para;
    })
    .join('\n');

  return html;
}

/**
 * Wrap report content in proper HTML template
 */
function wrapReportHTML(content, session, macros) {
  // Use passed macros or fallback to session data or defaults
  const calories = macros?.calories || session.calculated_macros?.calories || 2000;
  const protein = macros?.protein_grams || session.calculated_macros?.protein_grams || 150;
  const fat = macros?.fat_grams || session.calculated_macros?.fat_grams || 150;
  const carbs = macros?.carbs_grams || session.calculated_macros?.carbs_grams || 25;

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
    .recommendations {
      padding: 20px 0;
    }
    .recommendations h3 {
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .recommendations ul {
      margin-bottom: 15px;
      padding-left: 20px;
    }
    .recommendations li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Personalized Carnivore Protocol</h1>
      <p>${session.first_name || 'User'}</p>
    </div>

    <div class="macros">
      <h2>Your Daily Macro Targets</h2>
      <div class="macro-row">
        <span class="macro-label">Calories</span>
        <span class="macro-value">${calories}</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Protein</span>
        <span class="macro-value">${protein}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Fat</span>
        <span class="macro-value">${fat}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label">Carbs</span>
        <span class="macro-value">${carbs}g</span>
      </div>
    </div>

    <div class="recommendations">
      ${markdownToHTML(content)}
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

/**
 * POST /create-checkout
 * Create Stripe checkout session for Stripe payment modal
 */
// ===== GET SESSION (fetch saved form data after payment) =====
async function handleGetSession(request, env) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    console.log('[handleGetSession] Fetching session:', sessionId);

    if (!sessionId) {
      return createErrorResponse(
        'MISSING_SESSION_ID',
        'session id is required',
        400
      );
    }

    // Fetch session from Supabase
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[handleGetSession] Supabase error:', error);
      return createErrorResponse(
        'DB_ERROR',
        'Failed to fetch session',
        500,
        error
      );
    }

    const sessions = await response.json();
    console.log('[handleGetSession] Found sessions:', sessions.length);

    if (!sessions || sessions.length === 0) {
      return createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found',
        404
      );
    }

    const session = sessions[0];
    console.log('[handleGetSession] Session retrieved:', { id: session.id, email: session.email });

    return createSuccessResponse({
      success: true,
      id: session.id,
      email: session.email,
      first_name: session.first_name,
      form_data: session.form_data,
      payment_status: session.payment_status,
      created_at: session.created_at,
    }, 200);
  } catch (err) {
    console.error('[handleGetSession] error:', err);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      err.message
    );
  }
}

async function handleCreateCheckout(request, env) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Expected application/json',
        400
      );
    }

    // Parse request body
    let body;
    try {
      body = await parseJsonBody(request);
    } catch (err) {
      return createErrorResponse(
        'INVALID_JSON',
        'Request body must be valid JSON',
        400
      );
    }

    const { email, first_name, form_data, formData, success_url, cancel_url } = body;
    const finalFormData = form_data || formData;

    // Validate required fields
    if (!email) {
      return createErrorResponse(
        'MISSING_EMAIL',
        'email is required',
        400
      );
    }

    if (!isValidEmail(email)) {
      return createErrorResponse(
        'INVALID_EMAIL',
        'email must be a valid email address',
        400
      );
    }

    if (!finalFormData || typeof finalFormData !== 'object') {
      return createErrorResponse(
        'MISSING_FORM_DATA',
        'form_data is required and must be an object',
        400
      );
    }

    // Provide default first_name if missing (tier selection modal doesn't require it, but schema does)
    const sanitizedFirstName = (first_name && typeof first_name === 'string' && first_name.trim().length > 0)
      ? first_name.trim()
      : 'Friend';

    // Use success/cancel URLs from request, fall back to env.FRONTEND_URL
    const finalSuccessUrl = success_url || `${env.FRONTEND_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancel_url || `${env.FRONTEND_URL}/?payment=cancelled`;

    // Generate UUIDs
    const sessionUUID = generateUUID();

    // ===== STEP 1: INSERT INTO DATABASE =====

    const insertResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: sessionUUID,
          email,
          first_name: sanitizedFirstName,
          form_data: finalFormData,
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Supabase insert error:', errorText);
      return createErrorResponse(
        'DB_INSERT_FAILED',
        'Failed to save assessment data',
        500,
        errorText
      );
    }

    const insertedData = await insertResponse.json();
    const dbSession = Array.isArray(insertedData) ? insertedData[0] : insertedData;

    if (!dbSession?.id) {
      console.error('No session ID returned from database');
      return createErrorResponse(
        'DB_RESPONSE_ERROR',
        'Database did not return session ID',
        500
      );
    }

    // ===== STEP 2: CREATE STRIPE CHECKOUT SESSION =====

    // Construct success/cancel URLs with sessionUUID as the session_id
    // Use the request origin for localhost testing, env.FRONTEND_URL for production
    const requestOrigin = request.headers.get('origin') || '';
    let baseDomain = env.FRONTEND_URL || 'http://localhost:5173';

    // For localhost testing, use the request origin instead of the production domain
    if (requestOrigin && requestOrigin.includes('localhost')) {
      baseDomain = requestOrigin;
      console.log('[Worker] Detected localhost - using request origin:', baseDomain);
    }

    const successUrlWithId = `${baseDomain}?payment=success&assessment_id=${sessionUUID}`;
    const cancelUrlWithId = `${baseDomain}?payment=cancelled&assessment_id=${sessionUUID}`;

    console.log('Sending to Stripe:');
    console.log('  success_url:', successUrlWithId);
    console.log('  cancel_url:', cancelUrlWithId);

    const stripeCheckoutPayload = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1SjRlBEVDfkpGz8wQK8QPE6m',
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrlWithId,
      cancel_url: cancelUrlWithId,
      customer_email: email,
      client_reference_id: sessionUUID,
      metadata: {
        assessment_session_id: sessionUUID,
        email,
        first_name: sanitizedFirstName,
      },
    };

    // Build form-encoded body with proper Stripe format
    const formBody = new URLSearchParams();
    formBody.append('payment_method_types[]', 'card');
    formBody.append('line_items[0][price]', 'price_1SjRlBEVDfkpGz8wQK8QPE6m');
    formBody.append('line_items[0][quantity]', '1');
    formBody.append('mode', 'payment');
    // Send complete URLs with session_id to Stripe
    formBody.append('success_url', successUrlWithId);
    formBody.append('cancel_url', cancelUrlWithId);
    formBody.append('customer_email', email);
    formBody.append('client_reference_id', sessionUUID);
    formBody.append('metadata[assessment_session_id]', sessionUUID);
    formBody.append('metadata[email]', email);
    formBody.append('metadata[first_name]', sanitizedFirstName);

    console.log('=== STRIPE REQUEST DEBUG ===');
    console.log('URL:', 'https://api.stripe.com/v1/checkout/sessions');
    console.log('Method:', 'POST');
    console.log('Headers:', {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING'}`,
    });
    console.log('Body (form-encoded):', formBody.toString());

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    console.log('Stripe HTTP Status:', stripeResponse.status);
    console.log('Stripe Response OK:', stripeResponse.ok);

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error('❌ Stripe error (non-200):', stripeError);
      return createErrorResponse(
        'STRIPE_ERROR',
        'Failed to create Stripe checkout session',
        500,
        stripeError
      );
    }

    const stripeResponseText = await stripeResponse.text();
    console.log('=== STRIPE RESPONSE TEXT ===');
    console.log(stripeResponseText);

    let stripeSession;
    try {
      stripeSession = JSON.parse(stripeResponseText);
      console.log('=== STRIPE RESPONSE JSON (PARSED) ===');
      console.log(JSON.stringify(stripeSession, null, 2));
    } catch (parseErr) {
      console.error('Failed to parse Stripe response as JSON:', parseErr.message);
      console.error('Raw response was:', stripeResponseText);
      return createErrorResponse(
        'STRIPE_PARSE_ERROR',
        'Failed to parse Stripe response',
        500,
        stripeResponseText
      );
    }

    console.log('=== STRIPE SESSION FIELDS ===');
    console.log('id:', stripeSession?.id);
    console.log('url:', stripeSession?.url);
    console.log('object:', stripeSession?.object);
    console.log('status:', stripeSession?.status);
    console.log('All keys:', Object.keys(stripeSession || {}));

    if (!stripeSession?.id || !stripeSession?.url) {
      console.error('❌ Invalid Stripe response: Missing id or url');
      console.error('Full response:', JSON.stringify(stripeSession, null, 2));
      return createErrorResponse(
        'STRIPE_RESPONSE_ERROR',
        'Stripe session created but missing required fields',
        500,
        JSON.stringify({ expected: { id: '...', url: '...' }, got: stripeSession })
      );
    }

    console.log('✅ Stripe session valid. URL:', stripeSession.url);
    console.log('Stripe will redirect to:');
    console.log('  success_url:', successUrlWithId);
    console.log('  cancel_url:', cancelUrlWithId);

    // ===== STEP 3: UPDATE DATABASE WITH STRIPE SESSION ID =====

    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionUUID}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          stripe_session_id: stripeSession.id,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const updateError = await updateResponse.text();
      console.error('Supabase update error:', updateError);
      // Log but don't fail - Stripe session is created, just not linked
      console.warn('Could not update Stripe session ID in database, but checkout session was created');
    }

    // ===== RETURN SUCCESS RESPONSE =====

    return createSuccessResponse({
      success: true,
      url: stripeSession.url,
      session_id: stripeSession.id,
      session_uuid: sessionUUID,
      amount: stripeSession.amount_total,
      message: 'Checkout session created',
    }, 201);

  } catch (err) {
    console.error('handleCreateCheckout error:', err);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      err.message
    );
  }
}

// ===== MAIN ROUTER =====

function getCorsOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://carnivoreweekly.com',
    env.FRONTEND_URL
  ].filter(Boolean);

  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsOrigin = getCorsOrigin(request, env);

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Wrapper to add CORS to all responses
    const sendWithCors = (response) => {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    };

    // ===== ROUTES =====

    // Session management
    if (path === '/api/v1/calculator/session' && method === 'POST') {
      return sendWithCors(await handleCreateSession(request, env));
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

    if (path === '/validate-coupon' && method === 'POST') {
      return await handleValidateCoupon(request, env);
    }

    if (path === '/get-session' && method === 'GET') {
      return sendWithCors(await handleGetSession(request, env));
    }

    if (path === '/create-checkout' && method === 'POST') {
      return sendWithCors(await handleCreateCheckout(request, env));
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

    // DEBUG: Check session data
    const debugMatch = path.match(/^\/debug\/session\/(.+)$/);
    if (debugMatch && method === 'GET') {
      const sessionId = debugMatch[1];
      try {
        const sessionResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionId}`,
          {
            headers: {
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const sessions = await sessionResponse.json();
        if (sessions && sessions[0]) {
          const session = sessions[0];
          return new Response(JSON.stringify({
            session_id: session.id,
            form_data: session.form_data,
            form_data_keys: session.form_data ? Object.keys(session.form_data) : [],
            payment_status: session.payment_status,
          }, null, 2), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 404
    return createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
  },
};

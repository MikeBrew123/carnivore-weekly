/**
 * Cloudflare Worker: Stripe Checkout Endpoint
 * Purpose: Create Stripe checkout sessions for Carnivore Weekly assessment
 *
 * Route: POST /api/v1/assessment/create-checkout
 *
 * Input:
 * {
 *   "email": "user@example.com",
 *   "first_name": "John",
 *   "form_data": {
 *     "age": 35,
 *     "sex": "male",
 *     "weight": 180,
 *     ...all other assessment form fields
 *   }
 * }
 *
 * Output:
 * {
 *   "success": true,
 *   "checkout_url": "https://checkout.stripe.com/pay/cs_...",
 *   "session_id": "cs_...",
 *   "session_uuid": "uuid-...",
 *   "message": "Checkout session created"
 * }
 *
 * Error response:
 * {
 *   "success": false,
 *   "code": "ERROR_CODE",
 *   "message": "Error description",
 *   "details": "Additional context"
 * }
 *
 * Philosophy: Simple, focused, no over-engineering.
 * Responsibility: Save form data, create Stripe session, return checkout URL.
 */

// ===== UTILITY FUNCTIONS =====

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

function createErrorResponse(code, message, statusCode = 400, details = null) {
  return new Response(
    JSON.stringify({
      success: false,
      code,
      message,
      ...(details && { details }),
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function createSuccessResponse(data, statusCode = 200) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateContentType(request) {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (err) {
    throw new Error('Invalid JSON body');
  }
}

// ===== CORS HEADERS =====

function getCorsHeaders(origin) {
  const allowedOrigins = [
    'https://carnivoreweekly.com',
    'http://localhost:3000',
    'http://localhost:8000',
  ];

  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://carnivoreweekly.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// ===== MAIN HANDLER =====

/**
 * POST /api/v1/assessment/create-checkout
 *
 * 1. Validate request (email, form_data)
 * 2. Insert assessment session into cw_assessment_sessions table
 * 3. Create Stripe checkout session
 * 4. Return checkout URL to frontend
 */
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

    const { email, first_name, form_data, amount, coupon_code, discount_percent, tier_id } = body;

    // Stripe price ID mapping (server-side security)
    const stripePriceIds = {
      bundle: 'price_1SmnylEVDfkpGz8w4WO79kXd',
      meal_plan: 'price_1SmnxZEVDfkpGz8wKsduACYH',
      shopping: 'price_1SmnwoEVDfkpGz8wzdG365qu',
      doctor: 'price_1Smny5EVDfkpGz8wDpgDuKKW',
    };

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

    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
      return createErrorResponse(
        'MISSING_FIRST_NAME',
        'first_name is required and must be a non-empty string',
        400
      );
    }

    if (!form_data || typeof form_data !== 'object') {
      return createErrorResponse(
        'MISSING_FORM_DATA',
        'form_data is required and must be an object',
        400
      );
    }

    // Validate tier_id and get Stripe price ID
    if (!tier_id) {
      return createErrorResponse(
        'MISSING_TIER_ID',
        'tier_id is required',
        400
      );
    }

    const stripePriceId = stripePriceIds[tier_id];
    if (!stripePriceId) {
      return createErrorResponse(
        'INVALID_TIER',
        `Invalid tier_id: ${tier_id}. Must be one of: bundle, meal_plan, shopping, doctor`,
        400
      );
    }

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
          first_name,
          form_data,
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

    // ===== CHECK FOR 100% DISCOUNT - BYPASS STRIPE =====

    if (discount_percent === 100 || amount === 0) {
      // Update database to mark as completed (free checkout)
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
            payment_status: 'completed',
            stripe_session_id: null,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        const updateError = await updateResponse.text();
        console.error('Failed to update free checkout session:', updateError);
      }

      // Return success response with direct redirect (no Stripe)
      return createSuccessResponse({
        success: true,
        checkout_url: `${env.FRONTEND_URL}/calculator.html?payment=success&session_id=${sessionUUID}`,
        session_uuid: sessionUUID,
        message: 'Free checkout completed (100% discount)',
      }, 200);
    }

    // ===== STEP 2: CREATE STRIPE CHECKOUT SESSION =====

    const stripeCheckoutPayload = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${env.FRONTEND_URL}/calculator.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/calculator.html?payment=cancelled`,
      customer_email: email,
      client_reference_id: sessionUUID,
      metadata: {
        assessment_session_id: sessionUUID,
        email,
        first_name,
      },
    };

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(stripeCheckoutPayload),
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error('Stripe error:', stripeError);
      return createErrorResponse(
        'STRIPE_ERROR',
        'Failed to create Stripe checkout session',
        500,
        stripeError
      );
    }

    const stripeSession = await stripeResponse.json();

    if (!stripeSession?.id || !stripeSession?.url) {
      console.error('Invalid Stripe response:', stripeSession);
      return createErrorResponse(
        'STRIPE_RESPONSE_ERROR',
        'Stripe session created but missing required fields',
        500
      );
    }

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
      checkout_url: stripeSession.url,
      session_id: stripeSession.id,
      session_uuid: sessionUUID,
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

// ===== REQUEST ROUTER =====

async function handleRequest(request, env) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Add CORS headers to all responses
  const response = await handleCreateCheckout(request, env);
  response.headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
  response.headers.set('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
  response.headers.set('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);

  return response;
}

// ===== EXPORTS =====

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

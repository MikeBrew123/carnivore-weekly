/**
 * Cloudflare Worker: Calculator API
 * Leo's API Layer: REST endpoints for form submission, payment, and report access
 * Philosophy: "Every API call must be logged, validated, and idempotent"
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  Step1Data,
  Step2Data,
  Step4Data,
  MacroCalculation,
  PaymentTier,
  CalculatorSession,
  CreateSessionResponse,
  SaveStepResponse,
  PaymentInitiationResponse,
  GenerateReportResponse,
  GetReportResponse,
  ApiError,
} from '../types/calculator.types';
import {
  validateStep1,
  validateStep2,
  validateStep4,
  validateSessionToken,
  validateAccessToken,
  validateTierId,
  ValidationErrorCode,
} from '../validation/calculator.validation';

// ===== ENVIRONMENT SETUP =====

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  CLAUDE_API_KEY: string;
  FRONTEND_URL: string;
  API_BASE_URL: string;
}

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// ===== UTILITY FUNCTIONS =====

function generateSessionToken(): string {
  return randomUUID().replace(/-/g, '');
}

function generateAccessToken(): string {
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, any>
): Response {
  const error: ApiError = {
    code,
    message,
    ...(details && { details }),
  };

  return new Response(JSON.stringify(error), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createSuccessResponse(data: any, statusCode: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parseJsonBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch (err) {
    throw new Error('Invalid JSON body');
  }
}

function validateContentType(request: Request, expected: string = 'application/json'): boolean {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes(expected);
}

// ===== ROUTE HANDLERS =====

/**
 * POST /api/v1/calculator/session
 * Create new calculator session
 */
async function handleCreateSession(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const sessionToken = generateSessionToken();
    const now = new Date();

    const { data, error } = await supabase
      .from('calculator_sessions_v2')
      .insert({
        session_token: sessionToken,
        step_completed: 1,
        is_premium: false,
        payment_status: 'pending',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) {
      return createErrorResponse('DB_INSERT_FAILED', 'Failed to create session', 500, { detail: error.message });
    }

    const response: CreateSessionResponse = {
      session_token: sessionToken,
      session_id: data.id,
      created_at: now,
    };

    return createSuccessResponse(response, 201);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/1
 * Save Step 1 data (Physical Stats)
 */
async function handleSaveStep1(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    // Validate request structure
    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    // Validate session token
    const tokenValidation = validateSessionToken(session_token);
    if (!tokenValidation.isValid) {
      return createErrorResponse('INVALID_SESSION_TOKEN', tokenValidation.errors[0].message, 400);
    }

    // Validate step 1 data
    const dataValidation = validateStep1(data);
    if (!dataValidation.isValid) {
      const blockingError = dataValidation.errors.find((e) => e.is_blocking);
      return createErrorResponse(
        blockingError?.code || 'VALIDATION_FAILED',
        blockingError?.message || 'Validation failed',
        400,
        { errors: dataValidation.errors }
      );
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Update session with step 1 data
    const { error: updateError } = await supabase
      .from('calculator_sessions_v2')
      .update({
        sex: data.sex,
        age: data.age,
        height_feet: data.height_feet,
        height_inches: data.height_inches,
        height_cm: data.height_cm,
        weight_value: data.weight_value,
        weight_unit: data.weight_unit,
        step_completed: 2,
        updated_at: new Date(),
      })
      .eq('session_token', session_token);

    if (updateError) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 1', 500);
    }

    // Store validation errors (non-blocking ones)
    const nonBlockingErrors = dataValidation.errors.filter((e) => !e.is_blocking);
    if (nonBlockingErrors.length > 0) {
      const { data: session } = await supabase
        .from('calculator_sessions_v2')
        .select('id')
        .eq('session_token', session_token)
        .single();

      if (session) {
        await Promise.all(
          nonBlockingErrors.map((err) =>
            supabase.from('validation_errors').insert({
              session_id: session.id,
              field_name: err.field,
              error_code: err.code,
              error_message: err.message,
              submitted_value: String(data[err.field] || ''),
              step_number: 1,
              is_blocking: false,
            })
          )
        );
      }
    }

    const response: SaveStepResponse = {
      session_token,
      step_completed: 2,
      next_step: 3,
    };

    return createSuccessResponse(response);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/2
 * Save Step 2 data (Fitness & Diet)
 */
async function handleSaveStep2(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    const tokenValidation = validateSessionToken(session_token);
    if (!tokenValidation.isValid) {
      return createErrorResponse('INVALID_SESSION_TOKEN', tokenValidation.errors[0].message, 400);
    }

    const dataValidation = validateStep2(data);
    if (!dataValidation.isValid) {
      const blockingError = dataValidation.errors.find((e) => e.is_blocking);
      return createErrorResponse(
        blockingError?.code || 'VALIDATION_FAILED',
        blockingError?.message || 'Validation failed',
        400,
        { errors: dataValidation.errors }
      );
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Update session with step 2 data
    const { error: updateError } = await supabase
      .from('calculator_sessions_v2')
      .update({
        lifestyle_activity: data.lifestyle_activity,
        exercise_frequency: data.exercise_frequency,
        goal: data.goal,
        deficit_percentage: data.deficit_percentage || null,
        diet_type: data.diet_type,
        step_completed: 3,
        updated_at: new Date(),
      })
      .eq('session_token', session_token);

    if (updateError) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 2', 500);
    }

    const response: SaveStepResponse = {
      session_token,
      step_completed: 3,
      next_step: 4,
    };

    return createSuccessResponse(response);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/3
 * Save Step 3 data (Calculated Macros) and proceed to payment selection
 */
async function handleSaveStep3(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, calculated_macros } = body;

    if (!session_token || !calculated_macros) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and calculated_macros are required', 400);
    }

    const tokenValidation = validateSessionToken(session_token);
    if (!tokenValidation.isValid) {
      return createErrorResponse('INVALID_SESSION_TOKEN', tokenValidation.errors[0].message, 400);
    }

    // Validate macro calculation
    if (
      typeof calculated_macros.calories !== 'number' ||
      typeof calculated_macros.protein_grams !== 'number' ||
      calculated_macros.calories <= 0 ||
      calculated_macros.protein_grams <= 0
    ) {
      return createErrorResponse('INVALID_MACROS', 'Macro values must be positive numbers', 400);
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Update session with calculated macros
    const { error: updateError } = await supabase
      .from('calculator_sessions_v2')
      .update({
        calculated_macros,
        step_completed: 3,
        updated_at: new Date(),
      })
      .eq('session_token', session_token);

    if (updateError) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 3', 500);
    }

    // Fetch available payment tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('payment_tiers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (tiersError) {
      return createErrorResponse('DB_QUERY_FAILED', 'Failed to fetch payment tiers', 500);
    }

    const response = {
      session_token,
      step_completed: 3,
      calculated_macros,
      available_tiers: tiers,
      next_step: 4,
      message: 'Macros calculated successfully. Ready for premium tier selection or step 4.',
    };

    return createSuccessResponse(response);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/payment/initiate
 * Initiate Stripe payment checkout
 */
async function handleInitiatePayment(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, tier_id, success_url, cancel_url } = body;

    if (!session_token || !tier_id || !success_url || !cancel_url) {
      return createErrorResponse(
        'MISSING_FIELDS',
        'session_token, tier_id, success_url, and cancel_url are required',
        400
      );
    }

    const tokenValidation = validateSessionToken(session_token);
    if (!tokenValidation.isValid) {
      return createErrorResponse('INVALID_SESSION_TOKEN', tokenValidation.errors[0].message, 400);
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Validate tier
    const tierValidation = await validateTierId(tier_id, supabase);
    if (!tierValidation.isValid) {
      return createErrorResponse('INVALID_TIER', tierValidation.errors[0].message, 400);
    }

    // Fetch tier details
    const { data: tier, error: tierError } = await supabase
      .from('payment_tiers')
      .select('*')
      .eq('id', tier_id)
      .single();

    if (tierError || !tier) {
      return createErrorResponse('TIER_NOT_FOUND', 'Payment tier not found', 404);
    }

    // Fetch session to check state
    const { data: session, error: sessionError } = await supabase
      .from('calculator_sessions_v2')
      .select('id, email, step_completed')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    if (session.step_completed < 3) {
      return createErrorResponse(
        'INVALID_STEP',
        'Must complete steps 1-3 before payment',
        400
      );
    }

    // Create Stripe checkout session (simplified - real implementation would use Stripe SDK)
    const paymentIntentId = `pi_${randomUUID().replace(/-/g, '').substring(0, 24)}`;

    // Update session with payment intent
    const { error: updateError } = await supabase
      .from('calculator_sessions_v2')
      .update({
        tier_id: tier_id,
        stripe_payment_intent_id: paymentIntentId,
        amount_paid_cents: tier.price_cents,
        updated_at: new Date(),
      })
      .eq('session_token', session_token);

    if (updateError) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to initiate payment', 500);
    }

    // Create Claude API log entry for tracking
    await supabase.from('claude_api_logs').insert({
      session_id: session.id,
      model: 'payment-initiation',
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      status: 'pending',
      request_at: new Date(),
    });

    const response: PaymentInitiationResponse = {
      stripe_session_url: `https://checkout.stripe.com/pay/${paymentIntentId}`,
      payment_intent_id: paymentIntentId,
      created_at: new Date(),
    };

    return createSuccessResponse(response, 201);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/payment/verify
 * Verify Stripe payment and unlock step 4
 */
async function handleVerifyPayment(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, stripe_payment_intent_id } = body;

    if (!session_token || !stripe_payment_intent_id) {
      return createErrorResponse(
        'MISSING_FIELDS',
        'session_token and stripe_payment_intent_id are required',
        400
      );
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Update payment status (in real implementation, verify with Stripe API)
    const { error: updateError } = await supabase
      .from('calculator_sessions_v2')
      .update({
        payment_status: 'completed',
        is_premium: true,
        paid_at: new Date(),
        step_completed: 4,
        updated_at: new Date(),
      })
      .eq('session_token', session_token)
      .eq('stripe_payment_intent_id', stripe_payment_intent_id);

    if (updateError) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to verify payment', 500);
    }

    const response = {
      session_token,
      is_premium: true,
      payment_status: 'completed',
      next_step: 4,
      message: 'Payment verified. Ready for step 4 (Health Profile).',
    };

    return createSuccessResponse(response);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/4
 * Save Step 4 data (Health Profile) and generate report
 */
async function handleSaveStep4(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    const tokenValidation = validateSessionToken(session_token);
    if (!tokenValidation.isValid) {
      return createErrorResponse('INVALID_SESSION_TOKEN', tokenValidation.errors[0].message, 400);
    }

    const dataValidation = validateStep4(data, true);
    if (!dataValidation.isValid) {
      const blockingError = dataValidation.errors.find((e) => e.is_blocking);
      return createErrorResponse(
        blockingError?.code || 'VALIDATION_FAILED',
        blockingError?.message || 'Validation failed',
        400,
        { errors: dataValidation.errors }
      );
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('calculator_sessions_v2')
      .select('*')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    if (!session.is_premium || session.payment_status !== 'completed') {
      return createErrorResponse(
        'NOT_PREMIUM',
        'Step 4 requires completed payment',
        403
      );
    }

    // Update session with step 4 data
    const { error: updateError } = await supabase
      .from('calculator_sessions_v2')
      .update({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        medications: data.medications,
        conditions: data.conditions || [],
        other_conditions: data.other_conditions,
        symptoms: data.symptoms,
        other_symptoms: data.other_symptoms,
        allergies: data.allergies,
        avoid_foods: data.avoid_foods,
        dairy_tolerance: data.dairy_tolerance,
        previous_diets: data.previous_diets,
        what_worked: data.what_worked,
        carnivore_experience: data.carnivore_experience,
        cooking_skill: data.cooking_skill,
        meal_prep_time: data.meal_prep_time,
        budget: data.budget,
        family_situation: data.family_situation,
        work_travel: data.work_travel,
        goals: data.goals || [],
        biggest_challenge: data.biggest_challenge,
        additional_notes: data.additional_notes,
        step_completed: 4,
        completed_at: new Date(),
        updated_at: new Date(),
      })
      .eq('session_token', session_token);

    if (updateError) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 4', 500);
    }

    // Queue report generation (handled asynchronously)
    const accessToken = generateAccessToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { error: reportError } = await supabase
      .from('calculator_reports')
      .insert({
        session_id: session.id,
        email: data.email,
        access_token: accessToken,
        report_html: '<p>Report generation in progress...</p>',
        report_json: { status: 'generating', queued_at: new Date().toISOString() },
        expires_at: expiresAt,
        is_expired: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

    if (reportError) {
      return createErrorResponse('DB_INSERT_FAILED', 'Failed to create report record', 500);
    }

    const response: GenerateReportResponse = {
      access_token: accessToken,
      report_url: `${env.FRONTEND_URL}/report/${accessToken}`,
      expires_at: expiresAt,
      created_at: new Date(),
    };

    return createSuccessResponse(response, 201);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * GET /api/v1/calculator/report/:access_token
 * Retrieve generated report
 */
async function handleGetReport(
  request: Request,
  env: Env,
  accessToken: string
): Promise<Response> {
  try {
    const tokenValidation = validateAccessToken(accessToken);
    if (!tokenValidation.isValid) {
      return createErrorResponse('INVALID_TOKEN', tokenValidation.errors[0].message, 400);
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // Fetch report by token
    const { data: report, error } = await supabase
      .from('calculator_reports')
      .select('*')
      .eq('access_token', accessToken)
      .eq('is_expired', false)
      .single();

    if (error || !report) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found or has expired', 404);
    }

    // Log access
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    await supabase
      .from('calculator_report_access_log')
      .insert({
        report_id: report.id,
        accessed_at: new Date(),
        ip_address: clientIp,
        user_agent: userAgent,
        success: true,
      });

    const response: GetReportResponse = {
      report_html: report.report_html,
      report_json: report.report_json,
      generated_at: report.created_at,
      expires_at: report.expires_at,
    };

    return createSuccessResponse(response);
  } catch (err) {
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// ===== ROUTER =====

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method as RequestMethod;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': env.FRONTEND_URL,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // POST /api/v1/calculator/session
    if (path === '/api/v1/calculator/session' && method === 'POST') {
      return await handleCreateSession(request, env);
    }

    // POST /api/v1/calculator/step/1
    if (path === '/api/v1/calculator/step/1' && method === 'POST') {
      return await handleSaveStep1(request, env);
    }

    // POST /api/v1/calculator/step/2
    if (path === '/api/v1/calculator/step/2' && method === 'POST') {
      return await handleSaveStep2(request, env);
    }

    // POST /api/v1/calculator/step/3
    if (path === '/api/v1/calculator/step/3' && method === 'POST') {
      return await handleSaveStep3(request, env);
    }

    // POST /api/v1/calculator/payment/initiate
    if (path === '/api/v1/calculator/payment/initiate' && method === 'POST') {
      return await handleInitiatePayment(request, env);
    }

    // POST /api/v1/calculator/payment/verify
    if (path === '/api/v1/calculator/payment/verify' && method === 'POST') {
      return await handleVerifyPayment(request, env);
    }

    // POST /api/v1/calculator/step/4
    if (path === '/api/v1/calculator/step/4' && method === 'POST') {
      return await handleSaveStep4(request, env);
    }

    // GET /api/v1/calculator/report/:access_token
    const reportMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})$/i);
    if (reportMatch && method === 'GET') {
      return await handleGetReport(request, env, reportMatch[1]);
    }

    // 404
    return createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
  },
};

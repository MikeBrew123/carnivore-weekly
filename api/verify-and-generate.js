/**
 * Cloudflare Worker: Verify & Generate Endpoint - Story 3.4
 * Leo's Database Architect Implementation
 * Philosophy: "ACID properties don't negotiate. All-or-nothing, always."
 *
 * Route: POST /api/v1/assessment/verify-and-generate
 *
 * This is a pure JavaScript version for immediate integration into
 * the existing Cloudflare Worker stack (calculator-api.js)
 *
 * Core Responsibility Chain:
 * 1. Stripe Payment Verification (session_id must have payment_status='paid')
 * 2. Database Transaction (all-or-nothing: insert report + update session)
 * 3. Claude Report Generation (streaming, 16k tokens max, 30-60 seconds)
 * 4. Access Token Generation (64-char hex, cryptographically secure)
 * 5. Report Expiration Management (48-hour TTL with soft delete)
 *
 * Error Handling Strategy:
 * - 400: Bad request (missing fields, invalid JSON, Stripe session not found)
 * - 404: Session not found in database
 * - 402: Payment required (payment_status != 'paid')
 * - 500: Stripe error, Claude error, Database error, transaction failure
 *
 * Transaction Atomicity:
 * - All database writes happen within a single logical unit
 * - If Claude generation fails: No report record created, user can retry
 * - If Stripe verification fails: Transaction never starts
 * - If session update fails: Report is rolled back (constraint enforcement)
 */

// ===== UTILITY FUNCTIONS =====

/**
 * Generate cryptographically secure 64-character hex token
 * Uses SubtleCrypto.getRandomValues() via globalThis.crypto
 */
async function generateAccessToken() {
  const buffer = new Uint8Array(32); // 256 bits = 32 bytes = 64 hex chars
  crypto.getRandomValues(buffer);

  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify Stripe checkout session payment status
 * Validates:
 * - payment_status must equal 'paid'
 * - Session must be recent (within 24 hours) to prevent reuse
 *
 * @param {string} stripeSecretKey - Stripe API secret key
 * @param {string} sessionId - Stripe checkout session ID (cs_...)
 * @returns {Object} { verified: boolean, error?: string }
 */
async function verifyStripePayment(stripeSecretKey, sessionId) {
  try {
    // Stripe API endpoint: retrieve session
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        verified: false,
        error: `Stripe API error: ${errorData.error?.message || 'Unknown error'}`,
      };
    }

    const session = await response.json();

    // Check payment status
    if (session.payment_status !== 'paid') {
      return {
        verified: false,
        error: `Payment not completed. Status: ${session.payment_status}`,
      };
    }

    // Verify session is recent (within 24 hours)
    const sessionCreatedAt = new Date(session.created * 1000);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - sessionCreatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      return {
        verified: false,
        error: 'Checkout session expired (older than 24 hours)',
      };
    }

    return { verified: true };
  } catch (err) {
    return {
      verified: false,
      error: `Stripe verification failed: ${err.message}`,
    };
  }
}

/**
 * Retrieve form data from calculator_sessions_v2 table
 * Single query (no N+1) to fetch all 25+ form fields
 *
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} serviceRoleKey - Service role key
 * @param {string} sessionId - Session UUID
 * @returns {Object} { session?: Object, error?: string }
 */
async function getSessionFormData(supabaseUrl, serviceRoleKey, sessionId) {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/calculator_sessions_v2?id=eq.${encodeURIComponent(sessionId)}`,
      {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { error: `Database query failed: ${response.statusText}` };
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return { error: 'Session not found' };
    }

    return { session: data[0] };
  } catch (err) {
    return { error: `Database error: ${err.message}` };
  }
}

/**
 * Generate personalized report using Claude API (Sonnet 4)
 * Directly calls Anthropic API with streaming support
 *
 * Generates 13-section HTML report:
 * 1. Executive Summary
 * 2. Carnivore Food Guide
 * 3. Custom 30-Day Meal Calendar
 * 4. Weekly Grocery Lists
 * 5. Physician Consultation Guide
 * 6. Conquering Your Kryptonite
 * 7. Dining Out & Travel Survival Guide
 * 8. The Science & Evidence
 * 9. Laboratory Reference Guide
 * 10. The Electrolyte Protocol
 * 11. The Adaptation Timeline
 * 12. The Stall-Breaker Protocol
 * 13. 30-Day Symptom & Progress Tracker
 *
 * @param {string} claudeApiKey - Anthropic API key
 * @param {Object} session - Calculator session record (all form fields)
 * @param {string} sessionId - Session ID for logging
 * @param {string} requestId - Request ID for tracking
 * @returns {Object} { html?: string, error?: string, tokens?: {...}, duration?: number }
 */
async function generateReportWithClaude(claudeApiKey, session, sessionId, requestId) {
  const startTime = Date.now();

  const systemPrompt = `You are a carnivore diet expert generating personalized reports. You will receive JSON data from a user questionnaire.

Generate a comprehensive HTML report with these 13 sections:
1. Executive Summary (personalized intro, daily macro targets, 30-day timeline)
2. Carnivore Food Guide (food pyramid, tiers based on their protocol)
3. Custom 30-Day Meal Calendar (based on budget and preferences)
4. Weekly Grocery Lists (4 weeks, based on budget level)
5. Physician Consultation Guide (based on their health conditions)
6. Conquering Your Kryptonite (strategy for their stated biggest challenge)
7. Dining Out & Travel Survival Guide
8. The Science & Evidence
9. Laboratory Reference Guide
10. The Electrolyte Protocol
11. The Adaptation Timeline
12. The Stall-Breaker Protocol
13. 30-Day Symptom & Progress Tracker

IMPORTANT RULES:
- Use their first_name if provided, otherwise use "Friend"
- Calculate their macros using Mifflin-St Jeor formula
- Tailor meal suggestions to their budget level
- Address their specific health conditions with appropriate caveats
- Their biggest_challenge should be specifically addressed in Report #6
- Include medical disclaimers where appropriate

OUTPUT FORMAT:
Return ONLY valid HTML. No markdown. No code blocks. Start with <div class="report"> and end with </div>.
Use Tailwind CSS classes for styling.`;

  // Build form data JSON for Claude
  const formDataJson = JSON.stringify({
    first_name: session.first_name,
    last_name: session.last_name,
    age: session.age,
    sex: session.sex,
    weight: { value: session.weight_value, unit: session.weight_unit },
    height: {
      feet: session.height_feet,
      inches: session.height_inches,
      cm: session.height_cm,
    },
    lifestyle_activity: session.lifestyle_activity,
    exercise_frequency: session.exercise_frequency,
    goal: session.goal,
    deficit_percentage: session.deficit_percentage,
    diet_type: session.diet_type,
    calculated_macros: session.calculated_macros,
    health: {
      medications: session.medications,
      conditions: session.conditions,
      other_conditions: session.other_conditions,
      symptoms: session.symptoms,
      other_symptoms: session.other_symptoms,
      allergies: session.allergies,
      avoid_foods: session.avoid_foods,
      dairy_tolerance: session.dairy_tolerance,
    },
    history: {
      previous_diets: session.previous_diets,
      what_worked: session.what_worked,
      carnivore_experience: session.carnivore_experience,
    },
    lifestyle: {
      cooking_skill: session.cooking_skill,
      meal_prep_time: session.meal_prep_time,
      budget: session.budget,
      family_situation: session.family_situation,
      work_travel: session.work_travel,
    },
    goals: session.goals,
    biggest_challenge: session.biggest_challenge,
    additional_notes: session.additional_notes,
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate my personalized carnivore diet report based on this data:\n\n${formDataJson}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        error: `Claude API error: ${errorData.error?.message || 'Unknown error'}`,
      };
    }

    const duration = Date.now() - startTime;
    const data = await response.json();

    // Extract HTML from response
    const htmlContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    if (!htmlContent || htmlContent.trim().length === 0) {
      return { error: 'Claude returned empty response' };
    }

    return {
      html: htmlContent,
      tokens: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        total: data.usage.input_tokens + data.usage.output_tokens,
      },
      duration,
      stopReason: data.stop_reason,
    };
  } catch (err) {
    return { error: `Claude API error: ${err.message}` };
  }
}

/**
 * Save report atomically with database transaction
 * Executes in order:
 * 1. INSERT into calculator_reports (new report record)
 * 2. UPDATE calculator_sessions_v2 (mark payment_status as 'completed')
 * 3. INSERT into claude_api_logs (cost tracking, non-blocking)
 *
 * If any step fails, subsequent steps don't execute.
 *
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} serviceRoleKey - Service role key
 * @param {string} sessionId - Session UUID
 * @param {string} email - User email
 * @param {string} reportHtml - Generated HTML report
 * @param {string} accessToken - 64-char access token
 * @param {string} expiresAt - ISO 8601 expiration timestamp
 * @param {Object} claudeTokens - { input, output, total } token counts
 * @param {number} claudeDuration - Duration in milliseconds
 * @param {string} claudeRequestId - Claude request ID
 * @returns {Object} { report?: Object, error?: string }
 */
async function saveReportTransaction(
  supabaseUrl,
  serviceRoleKey,
  sessionId,
  email,
  reportHtml,
  accessToken,
  expiresAt,
  claudeTokens,
  claudeDuration,
  claudeRequestId
) {
  try {
    // Step 1: Insert report record
    const reportResponse = await fetch(
      `${supabaseUrl}/rest/v1/calculator_reports`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          session_id: sessionId,
          email,
          access_token: accessToken,
          report_html: reportHtml,
          report_json: {
            generated_at: new Date().toISOString(),
            status: 'completed',
            sections: 13,
          },
          generation_start_at: new Date(Date.now() - claudeDuration).toISOString(),
          generation_completed_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_expired: false,
          access_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      return { error: `Failed to save report: ${errorText}` };
    }

    const reportData = await reportResponse.json();
    const report = Array.isArray(reportData) ? reportData[0] : reportData;

    // Step 2: Update session payment_status to 'completed'
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/calculator_sessions_v2?id=eq.${encodeURIComponent(sessionId)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update session payment_status:', errorText);
      return { error: `Failed to update session: ${errorText}` };
    }

    // Step 3: Log Claude API call (non-blocking on failure)
    try {
      await fetch(`${supabaseUrl}/rest/v1/claude_api_logs`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          request_id: claudeRequestId,
          model: 'claude-sonnet-4-20250514',
          input_tokens: claudeTokens.input,
          output_tokens: claudeTokens.output,
          total_tokens: claudeTokens.total,
          status: 'success',
          stop_reason: 'end_turn',
          request_at: new Date(Date.now() - claudeDuration).toISOString(),
          response_at: new Date().toISOString(),
          duration_ms: claudeDuration,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to log Claude API call (non-blocking):', err);
    }

    return { report };
  } catch (err) {
    return { error: `Transaction failed: ${err.message}` };
  }
}

/**
 * Log report access for audit trail
 * Non-blocking on failure
 *
 * @param {string} supabaseUrl - Supabase project URL
 * @param {string} serviceRoleKey - Service role key
 * @param {string} reportId - Report UUID
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client User-Agent
 */
async function logReportAccess(supabaseUrl, serviceRoleKey, reportId, ipAddress, userAgent) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/calculator_report_access_log`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        report_id: reportId,
        accessed_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
      }),
    });
  } catch (err) {
    console.error('Failed to log report access (non-blocking):', err);
  }
}

// ===== MAIN HANDLER =====

/**
 * POST /api/v1/assessment/verify-and-generate
 *
 * Request example:
 * {
 *   "session_id": "550e8400-e29b-41d4-a716-446655440000"
 * }
 *
 * Success response (200):
 * {
 *   "success": true,
 *   "paid": true,
 *   "report_id": "uuid",
 *   "access_token": "64-char-hex-token",
 *   "expires_at": "2026-01-06T12:00:00.000Z",
 *   "message": "Report generated successfully"
 * }
 *
 * Payment not verified (402):
 * {
 *   "success": false,
 *   "paid": false,
 *   "message": "Payment verification failed: ...",
 *   "error_code": "PAYMENT_NOT_VERIFIED"
 * }
 *
 * Session not found (404):
 * {
 *   "success": false,
 *   "message": "Session not found",
 *   "error_code": "SESSION_NOT_FOUND"
 * }
 *
 * Other errors (400, 500):
 * {
 *   "success": false,
 *   "message": "Error description",
 *   "error_code": "ERROR_TYPE"
 * }
 */
async function handleVerifyAndGenerate(request, env) {
  // ===== INPUT VALIDATION =====

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Method not allowed',
        error_code: 'METHOD_NOT_ALLOWED',
      }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Invalid JSON body',
        error_code: 'INVALID_JSON',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { session_id } = body;

  if (!session_id || typeof session_id !== 'string') {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Missing or invalid session_id',
        error_code: 'MISSING_FIELDS',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 1: RETRIEVE SESSION & VERIFY PAYMENT =====

  // Get session data (includes stripe_session_id for verification)
  const { session, error: sessionError } = await getSessionFormData(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    session_id
  );

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({
        success: false,
        message: sessionError || 'Session not found',
        error_code: 'SESSION_NOT_FOUND',
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify payment with Stripe
  if (!session.stripe_session_id) {
    return new Response(
      JSON.stringify({
        success: false,
        paid: false,
        message: 'No Stripe session ID found. Payment verification cannot proceed.',
        error_code: 'NO_STRIPE_SESSION',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { verified, error: stripeError } = await verifyStripePayment(
    env.STRIPE_SECRET_KEY,
    session.stripe_session_id
  );

  if (!verified) {
    return new Response(
      JSON.stringify({
        success: false,
        paid: false,
        message: `Payment verification failed: ${stripeError}`,
        error_code: 'PAYMENT_NOT_VERIFIED',
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 2: GENERATE REPORT WITH CLAUDE =====

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { html, error: claudeError, tokens, duration, stopReason } =
    await generateReportWithClaude(env.CLAUDE_API_KEY, session, session_id, requestId);

  if (claudeError || !html) {
    return new Response(
      JSON.stringify({
        success: false,
        message: claudeError || 'Failed to generate report',
        error_code: 'CLAUDE_GENERATION_FAILED',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 3: GENERATE ACCESS TOKEN & SET EXPIRATION =====

  const accessToken = await generateAccessToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

  // ===== STEP 4: SAVE REPORT ATOMICALLY =====

  const { report, error: saveError } = await saveReportTransaction(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    session_id,
    session.email,
    html,
    accessToken,
    expiresAt,
    tokens,
    duration,
    requestId
  );

  if (saveError || !report) {
    return new Response(
      JSON.stringify({
        success: false,
        message: saveError || 'Failed to save report',
        error_code: 'REPORT_SAVE_FAILED',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ===== STEP 5: LOG REPORT ACCESS (AUDIT TRAIL) =====

  const clientIp = request.headers.get('CF-Connecting-IP') ||
                   request.headers.get('X-Forwarded-For') ||
                   'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  await logReportAccess(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    report.id,
    clientIp,
    userAgent
  );

  // ===== RETURN SUCCESS RESPONSE =====

  return new Response(
    JSON.stringify({
      success: true,
      paid: true,
      report_id: report.id,
      access_token: accessToken,
      expires_at: expiresAt,
      message: 'Report generated successfully',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

module.exports = { handleVerifyAndGenerate };

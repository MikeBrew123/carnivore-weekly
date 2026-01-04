/**
 * Async Report Generation Queue Handler
 * Leo's Background Job Service: Processes pending reports via Claude API
 * Philosophy: "Queue → Process → Store → Verify. No lost reports."
 *
 * Execution Options:
 * 1. Stripe webhook trigger (on payment.intent.succeeded)
 * 2. Scheduled Cron job (every 5 minutes, process max 10 reports)
 * 3. Supabase function trigger (on calculator_reports insert)
 */

import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CLAUDE_API_KEY: string;
}

interface ReportJob {
  id: string;
  session_id: string;
  email: string;
  access_token: string;
}

// ===== REPORT GENERATION PIPELINE =====

/**
 * Main queue processor: Fetches pending reports and generates them
 */
export async function processReportQueue(env: Env, maxReports: number = 10): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Step 1: Fetch pending reports (status='queued', limit to batch size)
    const { data: pendingReports, error: fetchError } = await supabase
      .from('calculator_reports')
      .select('id, session_id, email, access_token, report_json')
      .eq('is_generated', false)
      .eq('is_expired', false)
      .order('created_at', { ascending: true })
      .limit(maxReports);

    if (fetchError) {
      console.error('[Queue] Error fetching pending reports:', fetchError);
      return;
    }

    if (!pendingReports || pendingReports.length === 0) {
      console.log('[Queue] No pending reports to process');
      return;
    }

    console.log(`[Queue] Processing ${pendingReports.length} pending reports`);

    // Step 2: Process each report sequentially (prevent API rate limiting)
    for (const report of pendingReports) {
      try {
        await generateSingleReport(env, supabase, report);
      } catch (err) {
        console.error(`[Queue] Failed to generate report ${report.id}:`, err);
        // Continue to next report (error handling in generateSingleReport)
      }
    }

    console.log('[Queue] Report processing batch complete');
  } catch (err) {
    console.error('[Queue] Fatal error in processReportQueue:', err);
  }
}

/**
 * Generate a single report: Orchestrates all steps
 */
async function generateSingleReport(env: Env, supabase: any, report: any): Promise<void> {
  const reportId = report.id;
  const sessionId = report.session_id;
  const email = report.email;
  const accessToken = report.access_token;

  const startTime = Date.now();

  try {
    console.log(`[Report ${reportId}] Starting generation for ${email}`);

    // Step 1: Fetch full session data (all form fields)
    const { data: session, error: sessionError } = await supabase
      .from('calculator_sessions_v2')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message || 'unknown'}`);
    }

    // Update status: Calculating (Stage 1)
    await updateReportProgress(supabase, reportId, {
      status: 'generating',
      stage: 1,
      progress: 20,
    });

    // Step 2: Analyze health profile (Stage 2)
    await updateReportProgress(supabase, reportId, {
      status: 'generating',
      stage: 2,
      progress: 40,
    });

    // Step 3: Build prompt from session data
    const prompt = buildClaudePrompt(session);

    // Step 4: Call Claude API (Stage 3-4)
    const claudeResponse = await callClaudeAPI(env.CLAUDE_API_KEY, prompt);

    if (!claudeResponse.success) {
      throw new Error(`Claude API failed: ${claudeResponse.error}`);
    }

    // Update status: Generating (Stage 3)
    await updateReportProgress(supabase, reportId, {
      status: 'generating',
      stage: 3,
      progress: 60,
    });

    // Step 5: Convert markdown to HTML (Stage 4)
    const reportHTML = convertMarkdownToHTML(claudeResponse.markdown, session.first_name || 'User');

    // Update status: Personalizing (Stage 4)
    await updateReportProgress(supabase, reportId, {
      status: 'generating',
      stage: 4,
      progress: 80,
    });

    // Step 6: Extract structured JSON from markdown
    const reportJSON = extractReportMetadata(claudeResponse.markdown);

    // Update status: Finalizing (Stage 5)
    await updateReportProgress(supabase, reportId, {
      status: 'generating',
      stage: 5,
      progress: 95,
    });

    // Step 7: Store report in database (ATOMIC UPDATE)
    const duration = Date.now() - startTime;
    const { error: updateError } = await supabase
      .from('calculator_reports')
      .update({
        report_html: reportHTML,
        report_markdown: claudeResponse.markdown,
        report_json: {
          ...reportJSON,
          status: 'completed',
          generated_at: new Date().toISOString(),
          generation_duration_ms: duration,
          stage: 5,
          progress: 100,
        },
        is_generated: true,
        generated_at: new Date(),
        updated_at: new Date(),
      })
      .eq('id', reportId);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    // Step 8: Log Claude API usage
    await logClaudeUsage(supabase, sessionId, claudeResponse, duration);

    // Step 9: Mark complete (Stage 5 at 100%)
    await updateReportProgress(supabase, reportId, {
      status: 'completed',
      stage: 5,
      progress: 100,
    });

    // Step 10: Log access (system-generated)
    const clientIp = 'system-internal';
    const userAgent = 'report-generator';

    await supabase.from('calculator_report_access_log').insert({
      report_id: reportId,
      accessed_at: new Date(),
      ip_address: clientIp,
      user_agent: userAgent,
      success: true,
    });

    console.log(`[Report ${reportId}] Generation complete in ${duration}ms`);
  } catch (err) {
    console.error(`[Report ${reportId}] Generation failed:`, err);

    // Mark report as failed (but not expired)
    await updateReportProgress(supabase, reportId, {
      status: 'failed',
      error: String(err),
      progress: 0,
    });

    // Log error for debugging
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logClaudeError(supabase, sessionId, reportId, errorMsg);
  }
}

// ===== CLAUDE API INTEGRATION =====

/**
 * Call Claude API to generate personalized report
 */
async function callClaudeAPI(
  apiKey: string,
  userPrompt: string
): Promise<{ success: boolean; markdown: string; error?: string; tokens?: { input: number; output: number } }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 4000,
        system: `You are an expert nutrition strategist specializing in personalized carnivore diet implementation. Generate comprehensive, evidence-based recommendations specific to each individual's health status, goals, constraints, and lifestyle. Output in markdown format with clear sections. Be specific, practical, and actionable.`,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        markdown: '',
        error: `Claude API error (${response.status}): ${JSON.stringify(error)}`,
      };
    }

    const data = await response.json();
    const markdown = data.content[0]?.text || '';
    const tokens = {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
    };

    return {
      success: true,
      markdown,
      tokens,
    };
  } catch (err) {
    return {
      success: false,
      markdown: '',
      error: `Claude API call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Build Claude API prompt from session data
 */
function buildClaudePrompt(session: any): string {
  const heightStr = session.height_feet
    ? `${session.height_feet}'${session.height_inches}"`
    : `${session.height_cm}cm`;

  const macros = session.calculated_macros || {};

  return `
Generate a personalized carnivore diet report for:

## User Demographics
- Name: ${session.first_name} ${session.last_name}
- Age: ${session.age} years
- Sex: ${session.sex}
- Weight: ${session.weight_value} ${session.weight_unit}
- Height: ${heightStr}
- Email: ${session.email}

## Health Status
- Health Conditions: ${session.conditions?.join(', ') || 'None reported'}
- Other Conditions: ${session.other_conditions || 'None'}
- Current Medications: ${session.medications || 'None reported'}
- Symptoms: ${session.symptoms || 'None reported'}
- Other Symptoms: ${session.other_symptoms || 'None'}

## Dietary Profile
- Food Allergies: ${session.allergies || 'None reported'}
- Foods to Avoid: ${session.avoid_foods || 'None'}
- Dairy Tolerance: ${session.dairy_tolerance || 'Not specified'}
- Previous Diets: ${session.previous_diets || 'None'}
- What Worked: ${session.what_worked || 'Unknown'}
- Carnivore Experience: ${session.carnivore_experience || 'New'}

## Fitness & Activity
- Activity Level: ${session.lifestyle_activity || 'Not specified'}
- Exercise Frequency: ${session.exercise_frequency || 'Not specified'} days/week
- Goal: ${session.goal === 'lose' ? `Lose weight (${session.deficit_percentage}% deficit)` : session.goal === 'gain' ? 'Gain weight' : 'Maintain'}

## Lifestyle Factors
- Cooking Skill: ${session.cooking_skill || 'Not specified'}
- Meal Prep Time Available: ${session.meal_prep_time || 'Not specified'}
- Budget: ${session.budget || 'Not specified'}
- Family Situation: ${session.family_situation || 'Not specified'}
- Work/Travel: ${session.work_travel || 'Not specified'}

## Goals & Challenges
- Health Goals: ${session.goals?.join(', ') || 'Not specified'}
- Biggest Challenge: ${session.biggest_challenge || 'Not specified'}
- Additional Notes: ${session.additional_notes || 'None'}

## Macro Targets
- Daily Calories: ${macros.calories || '2000'}
- Protein: ${macros.protein_grams || '150'}g (${macros.protein_percentage || '30'}%)
- Fat: ${macros.fat_grams || '150'}g (${macros.fat_percentage || '70'}%)
- Carbs: ${macros.carbs_grams || '20'}g (${macros.carbs_percentage || '2'}%)
- Diet Type: ${session.diet_type || 'Carnivore'}

## Report Requirements
Create a comprehensive 2000-5000 word personalized report with:

1. Executive Summary (2-3 paragraphs)
2. Your Profile (demographics, BMR, TDEE)
3. Macro Strategy (rationale, body composition, examples)
4. Nutrition Optimization (condition-specific strategies)
5. Practical Implementation (meal planning, shopping, recipes)
6. Dairy Tolerance Roadmap (if applicable)
7. Monitoring & Adjustment (metrics, biofeedback)
8. Timeline & Milestones (weekly/monthly progress)
9. Q&A (address their specific challenges)
10. Resources & Next Steps

Use markdown formatting. Be specific, evidence-based, and actionable.
`;
}

/**
 * Convert markdown to styled HTML with print-friendly CSS
 */
function convertMarkdownToHTML(markdown: string, userName: string): string {
  // Basic markdown to HTML conversion (production would use marked or unified)
  let html = markdown
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Carnivore Diet Report - ${userName}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f9f7f4;
    }
    .header {
      border-bottom: 3px solid #8B0000;
      margin-bottom: 40px;
      padding-bottom: 20px;
    }
    h1 {
      color: #8B0000;
      font-size: 2.5em;
      margin: 20px 0;
    }
    h2 {
      color: #8B0000;
      font-size: 1.8em;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #8B0000;
      padding-left: 15px;
    }
    h3 {
      color: #555;
      font-size: 1.3em;
      margin-top: 20px;
    }
    p {
      margin: 15px 0;
    }
    ul, ol {
      margin: 15px 0;
      padding-left: 30px;
    }
    li {
      margin: 10px 0;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    .disclaimer {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 30px 0;
      font-size: 0.9em;
    }
    .footer {
      border-top: 1px solid #ddd;
      margin-top: 40px;
      padding-top: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
    }
    @media print {
      body {
        background: white;
      }
      .header {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Personalized Carnivore Diet Report</h1>
    <p><strong>Generated for:</strong> ${userName}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="content">
    ${html}
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute medical advice.
    Always consult with a healthcare provider before making significant dietary changes, especially if you have existing health conditions or take medications.
  </div>

  <div class="footer">
    <p>Generated by Carnivore Weekly Report Generator</p>
    <p>Report access expires in 48 hours.</p>
  </div>
</body>
</html>`;
}

/**
 * Extract structured metadata from markdown report
 */
function extractReportMetadata(markdown: string): Record<string, any> {
  return {
    sections_count: (markdown.match(/^##\s/gm) || []).length,
    has_summary: markdown.includes('Executive Summary') || markdown.includes('Summary'),
    has_macros: markdown.includes('Macro') || markdown.includes('calories'),
    content_length: markdown.length,
    generated_at: new Date().toISOString(),
  };
}

// ===== PROGRESS TRACKING =====

/**
 * Update report progress in database
 */
async function updateReportProgress(
  supabase: any,
  reportId: string,
  progress: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('calculator_reports')
    .update({
      report_json: progress,
      updated_at: new Date(),
    })
    .eq('id', reportId);

  if (error) {
    console.error(`[Progress] Failed to update report ${reportId}:`, error);
  }
}

// ===== LOGGING =====

/**
 * Log Claude API usage for cost tracking and debugging
 */
async function logClaudeUsage(
  supabase: any,
  sessionId: string,
  response: any,
  duration: number
): Promise<void> {
  const { error } = await supabase.from('claude_api_logs').insert({
    session_id: sessionId,
    model: 'claude-opus-4-5-20251101',
    input_tokens: response.tokens?.input || 0,
    output_tokens: response.tokens?.output || 0,
    total_tokens: (response.tokens?.input || 0) + (response.tokens?.output || 0),
    status: 'success',
    request_at: new Date(),
    response_at: new Date(Date.now() + duration),
    duration_ms: duration,
  });

  if (error) {
    console.error('[Logging] Failed to log Claude usage:', error);
  }
}

/**
 * Log errors during report generation
 */
async function logClaudeError(
  supabase: any,
  sessionId: string,
  reportId: string,
  errorMsg: string
): Promise<void> {
  const { error } = await supabase.from('claude_api_logs').insert({
    session_id: sessionId,
    model: 'claude-opus-4-5-20251101',
    status: 'error',
    error_message: errorMsg,
    request_at: new Date(),
  });

  if (error) {
    console.error('[Logging] Failed to log error:', error);
  }
}

// ===== CRON TRIGGER (Cloudflare Worker scheduled) =====

export async function handleCronTrigger(env: Env): Promise<Response> {
  await processReportQueue(env, 10);
  return new Response(JSON.stringify({ message: 'Report processing queue executed' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// ===== STRIPE WEBHOOK TRIGGER =====

export async function handleStripeWebhook(env: Env, body: any): Promise<Response> {
  const event = body;

  if (event.type === 'payment_intent.succeeded') {
    // Trigger report generation for this session
    console.log('[Webhook] Payment succeeded, queuing report generation');
    await processReportQueue(env, 1);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

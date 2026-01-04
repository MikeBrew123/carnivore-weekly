/**
 * Claude Report Generator Service
 * Leo's AI Integration Layer: Converts form data to personalized reports via Claude API
 * Philosophy: "Let the AI handle creativity; our job is orchestration and compliance"
 */

import { createClient } from '@supabase/supabase-js';
import { CalculatorSession } from '../types/calculator.types';

// ===== TYPES =====

export interface ReportGenerationRequest {
  sessionId: string;
  sessionData: CalculatorSession;
  accessToken: string;
}

export interface ReportGenerationResult {
  reportHtml: string;
  reportMarkdown: string;
  reportJson: Record<string, any>;
  claudeRequestId: string;
  generationDurationMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ===== CLAUDE API RESPONSE TYPES =====

interface ClaudeMessage {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ===== PROMPT CONSTRUCTION =====

/**
 * Build the prompt for Claude based on user's form responses
 */
function buildPrompt(session: CalculatorSession): string {
  const lines: string[] = [
    '# Personalized Carnivore Diet Report Generation',
    '',
    'You are a nutrition expert and health strategist specializing in carnivore diet personalization.',
    'Generate a comprehensive, actionable, personalized report based on the following user profile:',
    '',
    '## User Demographics',
    `- Sex: ${session.sex || 'Not specified'}`,
    `- Age: ${session.age || 'Not specified'} years old`,
    `- Weight: ${session.weight_value} ${session.weight_unit || 'units'}`,
    `- Height: ${session.height_cm ? `${session.height_cm}cm` : `${session.height_feet}'${session.height_inches}"`}`,
    '',
    '## Health Status & History',
    `- Current Health Conditions: ${session.conditions?.length ? session.conditions.join(', ') : 'None reported'}`,
    `- Current Medications: ${session.medications || 'None reported'}`,
    `- Current Symptoms: ${session.symptoms || 'None reported'}`,
    `- Food Allergies: ${session.allergies || 'None reported'}`,
    `- Foods to Avoid: ${session.avoid_foods || 'None reported'}`,
    `- Dairy Tolerance: ${session.dairy_tolerance || 'Not specified'}`,
    `- Previous Diet Experiences: ${session.previous_diets || 'Not provided'}`,
    `- What Has Worked Before: ${session.what_worked || 'Not provided'}`,
    `- Carnivore Diet Experience: ${session.carnivore_experience || 'New to carnivore'}`,
    '',
    '## Fitness & Activity',
    `- Activity Level: ${session.lifestyle_activity || 'Not specified'}`,
    `- Exercise Frequency: ${session.exercise_frequency || 'None'} days per week`,
    '',
    '## Dietary Goals & Preferences',
    `- Primary Goal: ${session.goal || 'Not specified'}`,
    `- Preferred Diet Type: ${session.diet_type || 'Not specified'}`,
    `- Caloric Deficit/Surplus: ${session.deficit_percentage || 'N/A'}%`,
    `- Calculated Daily Calories: ${session.calculated_macros?.calories || 'Not calculated'}`,
    `- Protein Target: ${session.calculated_macros?.protein_grams || 'Not calculated'}g`,
    `- Fat Target: ${session.calculated_macros?.fat_grams || 'Not calculated'}g`,
    `- Carb Target: ${session.calculated_macros?.carbs_grams || 'Not calculated'}g`,
    '',
    '## Lifestyle Factors',
    `- Cooking Skill Level: ${session.cooking_skill || 'Not specified'}`,
    `- Available Meal Prep Time: ${session.meal_prep_time || 'Not specified'}`,
    `- Food Budget: ${session.budget || 'Not specified'}`,
    `- Family Situation: ${session.family_situation || 'Not specified'}`,
    `- Work/Travel Situation: ${session.work_travel || 'Not specified'}`,
    '',
    '## Personal Goals & Challenges',
    `- Health Goals: ${session.goals?.length ? session.goals.join(', ') : 'Not specified'}`,
    `- Biggest Challenge: ${session.biggest_challenge || 'Not provided'}`,
    `- Additional Notes: ${session.additional_notes || 'None'}`,
    '',
    'Contact: ${session.first_name} ${session.last_name} <${session.email}>',
    '',
    '---',
    '',
    '## Report Requirements',
    '',
    'Generate a personalized report with the following sections:',
    '',
    '### 1. Executive Summary (2-3 paragraphs)',
    'Provide a personalized overview of this user\'s carnivore diet roadmap. Acknowledge their unique situation, goals, and constraints.',
    '',
    '### 2. Macro Strategy (detailed)',
    'Explain the calculated macronutrient targets in context of their:',
    '- Body composition and goals',
    '- Activity level and exercise frequency',
    '- Health conditions and medication interactions',
    'Provide specific meal examples from their preferred diet type.',
    '',
    '### 3. Nutrition Optimization (field-specific)',
    'Address their specific health conditions with dietary recommendations:',
    '- If diabetes: GI impact, blood sugar stability strategies',
    '- If hypertension: sodium considerations, potassium sources',
    '- If thyroid: selenium, iodine, autoimmune triggers',
    '- If autoimmune: inflammatory markers, elimination protocol',
    '- If gut health issues: microbiome support, healing timeline',
    '- If inflammation: omega-3, omega-6 balance, anti-inflammatory foods',
    '',
    '### 4. Practical Implementation (lifestyle-focused)',
    'Based on their cooking skill, budget, and time constraints:',
    '- Weekly meal planning strategy',
    '- Shopping list template',
    '- 5-10 easy recipes fitting their preferences',
    '- Budget optimization if needed',
    '- Batch prep strategies for their available time',
    '',
    '### 5. Dairy Tolerance Roadmap',
    `Current tolerance: ${session.dairy_tolerance}`,
    '- If none: alternatives and why they may help',
    '- If butter-only: why butter is tolerated, gradual introduction protocol',
    '- If some: types to prioritize, order of reintroduction',
    '- If full: selection criteria, quality considerations',
    '',
    '### 6. Monitoring & Adjustment Protocol',
    'Provide specific metrics to track:',
    '- Physical metrics (weight, waist circumference, energy)',
    '- Health markers (relevant labs based on conditions)',
    '- Performance metrics (if athletic goal)',
    '- Mental/mood markers (if mental health goal)',
    '- Biofeedback signals to watch for',
    '',
    '### 7. Timeline & Milestones',
    'Provide a realistic progression:',
    '- Weeks 1-2: Adaptation phase',
    '- Weeks 3-8: Optimization phase',
    '- Month 3+: Fine-tuning phase',
    'Explain what to expect and when',
    '',
    '### 8. Q&A: Addressing Their Specific Concerns',
    'Answer 5-7 anticipated questions based on their profile:',
    `- "Will I feel deprived eating only meat?" (address their specific challenge: "${session.biggest_challenge}")`,
    '- "How do I handle [their family situation]?"',
    '- "Will this help with [their specific goal]?"',
    '- Other relevant questions',
    '',
    '### 9. Resources & Next Steps',
    '- Books/studies to read',
    '- Community resources',
    '- When to consult healthcare providers',
    '- 30-day action plan',
    '',
    '---',
    '',
    'Generate the report in clear, actionable HTML format with proper heading hierarchy, lists, and formatting.',
    'Use encouraging but realistic language.',
    'Include specific meal examples and practical checklists.',
    'Make it feel personalized and address their exact situation.',
  ];

  return lines.join('\n');
}

// ===== CLAUDE API INTEGRATION =====

/**
 * Call Claude API to generate personalized report
 */
async function callClaudeApi(
  prompt: string,
  apiKey: string
): Promise<{
  content: string;
  requestId: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}> {
  const startTime = Date.now();

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
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: [
          {
            type: 'text',
            text: 'You are an expert nutrition strategist specializing in personalized carnivore diet implementation. Generate comprehensive, evidence-based recommendations that are specific to each individual\'s health status, goals, constraints, and lifestyle. Your reports should be actionable, encouraging, and scientifically grounded.',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = (await response.json()) as ClaudeMessage;
    const durationMs = Date.now() - startTime;

    return {
      content: data.content[0].text,
      requestId: data.id,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      stopReason: data.stop_reason,
    };
  } catch (err) {
    throw new Error(`Failed to call Claude API: ${String(err)}`);
  }
}

// ===== HTML GENERATION =====

/**
 * Convert markdown/text report to formatted HTML
 */
function generateReportHtml(markdownContent: string, session: CalculatorSession): string {
  // Simple markdown to HTML conversion for headers and lists
  let html = markdownContent
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.+?<\/li>)/s, '<ul>$&</ul>')
    .replace(/<\/ul>\s*<ul>/g, '') // Merge consecutive lists
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.match(/<[^>]+>/)) return match;
      return `<p>${match}</p>`;
    });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Carnivore Diet Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #8B0000;
      padding-bottom: 30px;
    }
    .header h1 {
      font-size: 2.5em;
      color: #8B0000;
      margin-bottom: 10px;
    }
    .user-info {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 0.95em;
    }
    .user-info p {
      margin: 5px 0;
    }
    h2 {
      font-size: 1.8em;
      color: #8B0000;
      margin-top: 40px;
      margin-bottom: 15px;
      border-left: 4px solid #8B0000;
      padding-left: 15px;
    }
    h3 {
      font-size: 1.3em;
      color: #2c3e50;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    p {
      margin-bottom: 15px;
      line-height: 1.8;
    }
    ul, ol {
      margin: 15px 0 15px 30px;
    }
    li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .metric-box {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #8B0000;
    }
    .metric-box strong {
      color: #8B0000;
      display: block;
      margin-bottom: 5px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .disclaimer {
      background: #fef3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 30px 0;
      border-radius: 4px;
      font-size: 0.95em;
    }
    .footer {
      text-align: center;
      color: #666;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Personalized Carnivore Diet Report</h1>
      <p style="color: #666; margin-top: 10px;">Your Custom Nutrition Strategy</p>
    </div>

    <div class="user-info">
      <p><strong>Generated for:</strong> ${session.first_name} ${session.last_name}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Age:</strong> ${session.age} | <strong>Sex:</strong> ${session.sex} | <strong>Weight:</strong> ${session.weight_value}${session.weight_unit}</p>
      <p><strong>Activity Level:</strong> ${session.lifestyle_activity} | <strong>Primary Goal:</strong> ${session.goal}</p>
    </div>

    ${html}

    <div class="disclaimer">
      <strong>Medical Disclaimer:</strong> This report is for educational purposes and should not replace professional medical advice.
      Please consult with your healthcare provider, especially if you have existing health conditions or are taking medications.
      Individual results vary based on genetics, metabolism, and adherence.
    </div>

    <div class="footer">
      <p>© 2026 Carnivore Weekly. All rights reserved.</p>
      <p>Report generated by AI nutritional analysis.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ===== JSON EXTRACTION =====

/**
 * Extract structured data from Claude's response
 */
function extractStructuredData(reportContent: string): Record<string, any> {
  // Extract key sections for structured data
  const sections = reportContent.split(/^###\s+/m);

  return {
    sections_count: sections.length,
    has_summary: reportContent.includes('Executive Summary'),
    has_macros: reportContent.includes('Macro'),
    has_implementation: reportContent.includes('Implementation'),
    has_timeline: reportContent.includes('Timeline'),
    content_length: reportContent.length,
    generated_at: new Date().toISOString(),
  };
}

// ===== MAIN GENERATOR FUNCTION =====

/**
 * Generate personalized carnivore diet report from session data
 */
export async function generatePersonalizedReport(
  supabaseUrl: string,
  supabaseServiceKey: string,
  claudeApiKey: string,
  request: ReportGenerationRequest
): Promise<ReportGenerationResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();

  try {
    // 1. Build prompt from session data
    const prompt = buildPrompt(request.sessionData);

    // 2. Call Claude API
    const claudeResult = await callClaudeApi(prompt, claudeApiKey);
    const reportMarkdown = claudeResult.content;

    // 3. Generate HTML version
    const reportHtml = generateReportHtml(reportMarkdown, request.sessionData);

    // 4. Extract structured data
    const reportJson = extractStructuredData(reportMarkdown);

    // 5. Update report record in database
    const generationDurationMs = Date.now() - startTime;

    const { error: updateError } = await supabase
      .from('calculator_reports')
      .update({
        report_html: reportHtml,
        report_markdown: reportMarkdown,
        report_json: reportJson,
        claude_request_id: claudeResult.requestId,
        generation_start_at: new Date(startTime),
        generation_completed_at: new Date(),
        is_expired: false,
        updated_at: new Date(),
      })
      .eq('access_token', request.accessToken);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    // 6. Log Claude API usage
    await supabase.from('claude_api_logs').insert({
      session_id: request.sessionId,
      request_id: claudeResult.requestId,
      model: 'claude-opus-4-5-20251101',
      input_tokens: claudeResult.inputTokens,
      output_tokens: claudeResult.outputTokens,
      total_tokens: claudeResult.inputTokens + claudeResult.outputTokens,
      stop_reason: claudeResult.stopReason,
      request_at: new Date(startTime),
      response_at: new Date(),
      duration_ms: generationDurationMs,
      status: 'success',
    });

    return {
      reportHtml,
      reportMarkdown,
      reportJson,
      claudeRequestId: claudeResult.requestId,
      generationDurationMs,
      inputTokens: claudeResult.inputTokens,
      outputTokens: claudeResult.outputTokens,
      totalTokens: claudeResult.inputTokens + claudeResult.outputTokens,
    };
  } catch (err) {
    // Log error
    const errorMsg = String(err);
    await supabase
      .from('calculator_reports')
      .update({
        report_json: { status: 'failed', error: errorMsg },
        updated_at: new Date(),
      })
      .eq('access_token', request.accessToken);

    const generationDurationMs = Date.now() - startTime;
    await supabase.from('claude_api_logs').insert({
      session_id: request.sessionId,
      model: 'claude-opus-4-5-20251101',
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      request_at: new Date(startTime),
      response_at: new Date(),
      duration_ms: generationDurationMs,
      status: 'error',
      error_message: errorMsg,
    });

    throw err;
  }
}

/**
 * Process report generation queue (background job)
 */
export async function processReportQueue(
  supabaseUrl: string,
  supabaseServiceKey: string,
  claudeApiKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch pending reports
  const { data: pendingReports, error } = await supabase
    .from('calculator_reports')
    .select('id, session_id, access_token')
    .eq('is_expired', false)
    .like('report_json', '%generating%')
    .limit(10);

  if (error) {
    console.error('Failed to fetch pending reports:', error);
    return;
  }

  if (!pendingReports || pendingReports.length === 0) {
    return;
  }

  // Process each report
  for (const report of pendingReports) {
    try {
      // Fetch full session data
      const { data: session, error: sessionError } = await supabase
        .from('calculator_sessions_v2')
        .select('*')
        .eq('id', report.session_id)
        .single();

      if (sessionError || !session) {
        console.error(`Session not found for report ${report.id}`);
        continue;
      }

      // Generate report
      await generatePersonalizedReport(
        supabaseUrl,
        supabaseServiceKey,
        claudeApiKey,
        {
          sessionId: report.session_id,
          sessionData: session as any,
          accessToken: report.access_token,
        }
      );

      console.log(`Successfully generated report ${report.id}`);
    } catch (err) {
      console.error(`Failed to generate report ${report.id}:`, err);
    }
  }
}

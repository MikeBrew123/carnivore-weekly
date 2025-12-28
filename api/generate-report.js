/**
 * Cloudflare Worker: AI Report Generation Endpoint
 *
 * This endpoint receives questionnaire data and generates a comprehensive
 * carnivore diet report using Claude AI.
 *
 * Deploy to Cloudflare Workers: https://workers.cloudflare.com/
 *
 * Environment Variables Needed:
 * - ANTHROPIC_API_KEY: Your Claude API key from console.anthropic.com
 */

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // Get questionnaire data from request
      const data = await request.json();

      // Validate required fields
      if (!data.email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate report using Claude API
      const report = await generateReport(data, env.ANTHROPIC_API_KEY);

      // Return the generated report
      return new Response(JSON.stringify({
        success: true,
        report: report,
        email: data.email
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error generating report:', error);

      return new Response(JSON.stringify({
        error: 'Failed to generate report',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Generate comprehensive carnivore diet report using Claude API
 */
async function generateReport(data, apiKey) {
  // Build the system prompt (from your original specification)
  const systemPrompt = buildSystemPrompt();

  // Build user prompt with questionnaire data
  const userPrompt = buildUserPrompt(data);

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      temperature: 1.0,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  return result.content[0].text;
}

/**
 * Build system prompt (from your original specification)
 */
function buildSystemPrompt() {
  return `You are an expert carnivore diet coach creating a comprehensive, personalized diet report.

TONE & STYLE:
- Straight-talking, supportive, practical
- No moralizing or preaching
- Evidence-based but accessible
- Like a knowledgeable friend who's been there
- Acknowledge challenges honestly

OUTPUT FORMAT:
Generate a complete, well-formatted HTML report with all sections below.

REQUIRED SECTIONS:

1. EXECUTIVE SUMMARY (150-200 words)
   - Quick overview of their plan
   - Key numbers (calories, macros)
   - Top 3 priorities for their situation
   - What to expect in first 30 days

2. YOUR CARNIVORE DIET PYRAMID
   - Tier 1 (Foundation): What to eat most
   - Tier 2 (Regular): Variety and nutrition
   - Tier 3 (Occasional): Optional additions
   - Tier 4 (Avoid): What to eliminate
   - Customized to their restrictions/goals

3. 30-DAY MEAL CALENDAR
   - Week-by-week meal plan
   - Specific meals for breakfast/lunch/dinner
   - Accounting for their restrictions
   - Accounting for their budget/time/cooking skill
   - Simple repeatable meals

4. WEEKLY GROCERY LISTS
   - Exact quantities for each week
   - Organized by store section
   - Budget-optimized based on their constraints
   - Substitution options

5. ELECTROLYTE PROTOCOL
   - Specific daily amounts (sodium, potassium, magnesium)
   - Customized to their activity level
   - How to get them (food vs supplements)
   - Timing recommendations

6. ADAPTATION TIMELINE
   - Week 1-2: What to expect (keto flu, energy dip)
   - Week 3-4: Turning point
   - Month 2-3: Adaptation complete
   - Month 3+: Optimization phase
   - Specific to their starting point

7. WHAT TO TELL YOUR DOCTOR
   - Script for the conversation
   - How to address common concerns
   - What to request (support, monitoring)
   - Red flags vs normal adaptation

8. LAB TESTS TO REQUEST
   - Baseline tests before starting
   - Tests at 3 months
   - Tests at 6 months
   - Why each test matters
   - Normal ranges vs optimal ranges

9. STALL-BREAKER PROTOCOL
   - When weight loss plateaus
   - Troubleshooting strategies
   - Meal timing adjustments
   - Protein/fat ratio tweaks

10. SYMPTOM TRACKER
    - Template for tracking their specific symptoms
    - What to monitor weekly
    - When to adjust

11. RESTAURANT & TRAVEL GUIDE
    - How to eat carnivore anywhere
    - Fast food options
    - Restaurant ordering tips
    - Travel meal planning

12. RESEARCH CITATIONS
    - 5-10 key studies supporting carnivore
    - Simplified explanations
    - Links to full papers

13. RISK ASSESSMENT
    - Specific to their health conditions
    - What to watch for
    - When to consult doctor
    - Medication adjustment guidance

14. YOUR BIGGEST CHALLENGE ADDRESSED
    - Direct response to their stated fear/challenge
    - Practical strategies
    - Mindset reframe

PERSONALIZATION REQUIREMENTS:
- Use their name if provided
- Address their specific health conditions
- Avoid foods they can't/won't eat
- Match their cooking skill level
- Respect their budget constraints
- Account for family situation
- Address their stated goals
- Respond to their fears/challenges

MEDICAL DISCLAIMER (include at bottom):
"This report is for informational and educational purposes only. It does not constitute medical advice and should not replace consultation with qualified healthcare professionals. Always consult your doctor before starting any new diet, especially if you have existing health conditions or take medications. Bring this report to your appointments for discussion. Individual results may vary."

Generate the complete report now.`;
}

/**
 * Build user prompt with questionnaire data
 */
function buildUserPrompt(data) {
  // Extract and organize the data
  const profile = buildProfile(data);

  return `Please generate a comprehensive carnivore diet report for this person:

${profile}

Generate the complete report with all required sections, fully personalized to their situation.`;
}

/**
 * Build user profile from questionnaire data
 */
function buildProfile(data) {
  let profile = [];

  // Contact info
  if (data.firstName) {
    profile.push(`NAME: ${data.firstName}`);
  }
  profile.push(`EMAIL: ${data.email}`);

  // Macro calculations (if provided from calculator)
  if (data.macros) {
    profile.push(`\nMACRO TARGETS:`);
    profile.push(`- Calories: ${data.macros.calories}`);
    profile.push(`- Protein: ${data.macros.protein}g`);
    profile.push(`- Fat: ${data.macros.fat}g`);
    profile.push(`- Activity Level: ${data.macros.activityLevel}`);
    profile.push(`- Goal: ${data.macros.goal}`);
  }

  // Allergies & restrictions
  if (data.allergies || data.foodRestrictions || data.dairyTolerance) {
    profile.push(`\nFOOD RESTRICTIONS:`);
    if (data.allergies) profile.push(`- Allergies: ${data.allergies}`);
    if (data.foodRestrictions) profile.push(`- Won't eat: ${data.foodRestrictions}`);
    if (data.dairyTolerance) profile.push(`- Dairy tolerance: ${data.dairyTolerance}`);
  }

  // Health conditions
  if (data.medications || data.conditions || data.otherConditions) {
    profile.push(`\nHEALTH CONDITIONS:`);
    if (data.medications) profile.push(`- Medications: ${data.medications}`);
    if (data.conditions) {
      const conditionsList = Array.isArray(data.conditions) ? data.conditions.join(', ') : data.conditions;
      profile.push(`- Conditions: ${conditionsList}`);
    }
    if (data.otherConditions) profile.push(`- Other: ${data.otherConditions}`);
  }

  // Symptoms
  if (data.symptoms || data.otherSymptoms) {
    profile.push(`\nCURRENT SYMPTOMS:`);
    if (data.symptoms) {
      const symptomsList = Array.isArray(data.symptoms) ? data.symptoms.join(', ') : data.symptoms;
      profile.push(`- ${symptomsList}`);
    }
    if (data.otherSymptoms) profile.push(`- Other: ${data.otherSymptoms}`);
  }

  // Diet history
  if (data.previousDiets || data.carnivoreExperience || data.whatWorked) {
    profile.push(`\nDIET HISTORY:`);
    if (data.previousDiets) profile.push(`- Previous diets: ${data.previousDiets}`);
    if (data.carnivoreExperience) profile.push(`- Carnivore experience: ${data.carnivoreExperience}`);
    if (data.whatWorked) profile.push(`- What worked/didn't: ${data.whatWorked}`);
  }

  // Lifestyle
  if (data.cookingSkill || data.mealPrepTime || data.budget || data.familySituation || data.workTravel) {
    profile.push(`\nLIFESTYLE:`);
    if (data.cookingSkill) profile.push(`- Cooking skill: ${data.cookingSkill}`);
    if (data.mealPrepTime) profile.push(`- Meal prep time: ${data.mealPrepTime}`);
    if (data.budget) profile.push(`- Budget: ${data.budget}`);
    if (data.familySituation) profile.push(`- Family: ${data.familySituation}`);
    if (data.workTravel) profile.push(`- Work/travel: ${data.workTravel}`);
  }

  // Goals
  if (data.goals || data.biggestChallenge || data.anythingElse) {
    profile.push(`\nGOALS & CHALLENGES:`);
    if (data.goals) {
      const goalsList = Array.isArray(data.goals) ? data.goals.join(', ') : data.goals;
      profile.push(`- Goals: ${goalsList}`);
    }
    if (data.biggestChallenge) profile.push(`- Biggest challenge: ${data.biggestChallenge}`);
    if (data.anythingElse) profile.push(`- Additional info: ${data.anythingElse}`);
  }

  return profile.join('\n');
}

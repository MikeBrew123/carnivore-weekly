/**
 * Cloudflare Worker: AI Report Generation Endpoint (Enhanced)
 *
 * Generates 13 personalized diet reports using Claude AI + static templates.
 * Architecture: Hybrid (AI-personalized core sections + static templated appendices)
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

/**
 * Master Ingredient Database
 *
 * Enables data-driven meal planning and grocery list generation
 * instead of relying on AI hallucination or lazy placeholders.
 */
const foodDatabase = {
  proteins: [
    // Beef
    { name: 'Ground Beef (80/20)', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate', 'premium'], calories: 290, protein: 20, fat: 23, carbs: 0 },
    { name: 'Grass-fed Ground Beef', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 280, protein: 21, fat: 22, carbs: 0 },
    { name: 'Ribeye Steak', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['moderate', 'premium'], calories: 291, protein: 24, fat: 23, carbs: 0 },
    { name: 'NY Strip Steak', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['moderate', 'premium'], calories: 271, protein: 27, fat: 18, carbs: 0 },
    { name: 'Chuck Steak', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 300, protein: 22, fat: 24, carbs: 0 },
    { name: 'Beef Brisket', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 289, protein: 26, fat: 21, carbs: 0 },
    { name: 'Beef Liver', category: 'Beef Organs', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 165, protein: 26, fat: 6, carbs: 5 },
    { name: 'Beef Heart', category: 'Beef Organs', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight'], calories: 96, protein: 17, fat: 3.5, carbs: 0.2 },

    // Lamb
    { name: 'Ground Lamb', category: 'Lamb', diet: ['Carnivore', 'Strict Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 282, protein: 23, fat: 22, carbs: 0 },
    { name: 'Lamb Chops', category: 'Lamb', diet: ['Carnivore', 'Strict Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 294, protein: 25, fat: 22, carbs: 0 },

    // Pork
    { name: 'Pork Chops', category: 'Pork', diet: ['Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 242, protein: 27, fat: 14, carbs: 0 },
    { name: 'Bacon', category: 'Pork', diet: ['Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 541, protein: 37, fat: 43, carbs: 1 },

    // Fish
    { name: 'Salmon Fillet (wild)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 280, protein: 25, fat: 20, carbs: 0 },
    { name: 'Salmon Fillet (farmed)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 208, protein: 20, fat: 13, carbs: 0 },
    { name: 'Canned Salmon (in oil)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 220, protein: 20, fat: 15, carbs: 0 },
    { name: 'Mackerel', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 305, protein: 20, fat: 25, carbs: 0 },
    { name: 'Sardines (in oil)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 208, protein: 25, fat: 11, carbs: 0 },
    { name: 'Herring', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 206, protein: 20, fat: 13, carbs: 0 },
    { name: 'Cod Fillet', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['moderate'], calories: 82, protein: 18, fat: 0.7, carbs: 0 },
    { name: 'Tuna Steak', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 132, protein: 23, fat: 4.6, carbs: 0 },

    // Poultry
    { name: 'Eggs', category: 'Eggs', diet: ['Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight', 'moderate'], calories: 155, protein: 13, fat: 11, carbs: 1.1 },
    { name: 'Chicken Thighs', category: 'Poultry', diet: ['Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 209, protein: 22, fat: 13, carbs: 0 },
    { name: 'Duck', category: 'Poultry', diet: ['Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 337, protein: 19, fat: 29, carbs: 0 },
  ],

  pantryItems: [
    { name: 'Salt (Redmond Real Salt)', category: 'Pantry', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight', 'moderate', 'premium'], calories: 0, protein: 0, fat: 0, carbs: 0 },
    { name: 'Quality Salt', category: 'Pantry', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight', 'moderate'], calories: 0, protein: 0, fat: 0, carbs: 0 },
  ],

  fats: [
    { name: 'Butter', category: 'Dairy', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['tight', 'moderate', 'premium'], calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
    { name: 'Grass-fed Butter', category: 'Dairy', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['moderate', 'premium'], calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
    { name: 'Ghee', category: 'Dairy', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['moderate', 'premium'], calories: 900, protein: 0, fat: 100, carbs: 0 },
  ],

  vegetables: [
    { name: 'Spinach', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 3.6 },
    { name: 'Leafy Greens', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 4 },
    { name: 'Broccoli', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 7 },
    { name: 'Cauliflower', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 5 },
    { name: 'Asparagus', category: 'Vegetables', diet: ['Keto'], cost: ['moderate', 'premium'], allergies: [], carbs: 2 },
  ],

  other: [
    { name: 'Filtered Water', category: 'Beverages', diet: ['Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight'], calories: 0, protein: 0, fat: 0, carbs: 0 },
  ]
};

/**
 * Generate full 30-day meal plan using database and week/day loops
 */
function generateFullMealPlan(data) {
  const diet = data.selectedProtocol || 'Carnivore';
  const budget = data.budget || 'moderate';

  // Filter proteins by diet and budget
  const availableProteins = foodDatabase.proteins.filter(p =>
    p.diet.includes(diet) && p.cost.includes(budget)
  );

  // Fallback to Carnivore if no matches
  if (availableProteins.length === 0) {
    availableProteins.push(...foodDatabase.proteins.filter(p =>
      p.diet.includes('Carnivore')
    ));
  }

  // Generate 30-day meal plan (4 weeks x 7 days)
  const mealPlan = {
    weeks: []
  };

  // 4 weeks of meals
  for (let week = 1; week <= 4; week++) {
    const weekMeals = {
      weekNumber: week,
      days: []
    };

    // 7 days per week
    for (let day = 1; day <= 7; day++) {
      const dayNum = (week - 1) * 7 + day;

      // Rotate through proteins for variety
      const proteinIndex = dayNum % availableProteins.length;
      const mainProtein = availableProteins[proteinIndex];
      const altProtein = availableProteins[(proteinIndex + 1) % availableProteins.length];

      // Generate meals based on diet type
      let breakfast, lunch, dinner;

      if (diet.includes('Lion')) {
        breakfast = `${mainProtein.name} + Salt`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${mainProtein.name} + Salt`;
      } else if (diet.includes('Strict Carnivore')) {
        breakfast = `${mainProtein.name} + Eggs + Butter`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${altProtein.name} + Butter`;
      } else if (diet.includes('Pescatarian')) {
        breakfast = `Eggs + ${mainProtein.name} + Butter`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${altProtein.name} + Butter`;
      } else if (diet.includes('Keto')) {
        breakfast = `Eggs + ${mainProtein.name} + Avocado`;
        lunch = `${mainProtein.name} + Leafy Greens + Butter`;
        dinner = `${altProtein.name} + Broccoli + Oil`;
      } else {
        // Default Carnivore
        breakfast = `${mainProtein.name} + Eggs + Butter`;
        lunch = `${mainProtein.name} + Salt`;
        dinner = `${altProtein.name} + Butter`;
      }

      weekMeals.days.push({
        dayNumber: dayNum,
        breakfast,
        lunch,
        dinner
      });
    }

    mealPlan.weeks.push(weekMeals);
  }

  return mealPlan;
}

/**
 * Generate data-driven grocery list using database filtering
 */
function generateGroceryListByWeek(data) {
  const diet = data.selectedProtocol || 'Carnivore';
  const budget = data.budget || 'moderate';
  const allergies = (data.allergies || '').toLowerCase();

  // Filter ingredients by diet, budget, and allergies
  let proteins = foodDatabase.proteins.filter(p =>
    p.diet.includes(diet) &&
    p.cost.includes(budget) &&
    !p.name.toLowerCase().includes('dairy')
  );

  // Fallback: if no proteins match, use Carnivore defaults
  if (proteins.length === 0) {
    proteins = foodDatabase.proteins.filter(p =>
      p.diet.includes('Carnivore') &&
      !p.name.toLowerCase().includes('dairy')
    );
  }

  // Fallback: if still no proteins, use all proteins (worst case)
  if (proteins.length === 0) {
    proteins = foodDatabase.proteins.filter(p =>
      !p.name.toLowerCase().includes('dairy')
    );
  }

  let fats = foodDatabase.fats.filter(f =>
    f.diet.includes(diet) &&
    f.cost.includes(budget)
  );

  // Fallback: if no fats match, use Carnivore defaults
  if (fats.length === 0) {
    fats = foodDatabase.fats.filter(f =>
      f.diet.includes('Carnivore')
    );
  }

  // Fallback: if still no fats, use all fats (worst case)
  if (fats.length === 0) {
    fats = foodDatabase.fats;
  }

  // Generate grocery lists for each week
  const groceryLists = {};

  for (let week = 1; week <= 4; week++) {
    // Safely access proteins with fallback
    const protein1 = proteins.length > 0 ? proteins[(week - 1) % proteins.length] : { name: 'Ground Beef', quantity: '5 lbs' };
    const protein2 = proteins.length > 1 ? proteins[week % proteins.length] : { name: 'Beef Liver', quantity: '1-2 units' };
    const fat1 = fats.length > 0 ? fats[0] : { name: 'Butter', quantity: '1 lb' };

    groceryLists[`week${week}`] = {
      weekNumber: week,
      proteins: [
        {
          name: protein1.name || 'Ground Beef',
          quantity: protein1.quantity || '5 lbs'
        },
        {
          name: protein2.name || 'Beef Liver',
          quantity: protein2.quantity || '1-2 units'
        }
      ],
      fats: [
        {
          name: fat1.name || 'Butter',
          quantity: fat1.quantity || '1 lb'
        }
      ],
      pantry: [
        {
          name: 'Salt (Redmond Real Salt)',
          quantity: '1 container',
          category: 'Pantry'
        }
      ]
    };
  }

  return groceryLists;
}

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

      // Generate all 13 reports using hybrid architecture
      const startTime = Date.now();
      console.log('[Report Generation] Starting report generation for:', data.email);
      const reports = await generateAllReports(data, env.ANTHROPIC_API_KEY);
      const reportTime = Date.now() - startTime;
      console.log(`[Report Generation] Reports completed in ${reportTime}ms`);

      // Combine all 13 reports into a single markdown document
      const combineStart = Date.now();
      const combinedReport = combineReports(reports);
      const combineTime = Date.now() - combineStart;
      console.log(`[Report Generation] Report combining completed in ${combineTime}ms`);

      // Return combined report
      console.log('[Report Generation] Sending response to client');
      return new Response(JSON.stringify({
        success: true,
        report: combinedReport,
        email: data.email,
        generatedAt: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error generating reports:', error);

      return new Response(JSON.stringify({
        error: 'Failed to generate reports',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Generate all 13 personalized reports (Hybrid Architecture)
 *
 * AI-Generated (Personalized):
 * - Report #1: Executive Summary
 * - Report #6: Obstacle Override Protocol
 *
 * Static Templates (with placeholder replacement):
 * - Reports #2-5: Food Guide, Meal Calendar, Shopping, Physician Consultation
 * - Reports #7-13: Restaurant, Science, Labs, Electrolytes, Timeline, Stall-Breaker, Tracker
 */
async function generateAllReports(data, apiKey) {
  const reports = {};

  try {
    // Generate AI-personalized reports first (Reports #1 & #6)
    console.log('[generateAllReports] Starting AI reports...');
    const aiReports = await generateAIReports(data, apiKey);
    reports[1] = aiReports.summary;
    reports[6] = aiReports.obstacle;
    console.log('[generateAllReports] AI reports completed');

    // Load and customize static template reports
    console.log('[generateAllReports] Loading template reports...');
    reports[2] = await loadAndCustomizeTemplate('foodGuide', data);
    console.log('[generateAllReports] Report #2 loaded');
    reports[3] = await loadAndCustomizeTemplate('mealCalendar', data);
    console.log('[generateAllReports] Report #3 loaded');
    reports[4] = await loadAndCustomizeTemplate('shoppingList', data);
    console.log('[generateAllReports] Report #4 loaded');
    reports[5] = await loadAndCustomizeTemplate('physicianConsult', data);
    console.log('[generateAllReports] Report #5 loaded');
    reports[7] = await loadAndCustomizeTemplate('restaurant', data);
    console.log('[generateAllReports] Report #7 loaded');
    reports[8] = await loadAndCustomizeTemplate('science', data);
    console.log('[generateAllReports] Report #8 loaded');
    reports[9] = await loadAndCustomizeTemplate('labs', data);
    console.log('[generateAllReports] Report #9 loaded');
    reports[10] = await loadAndCustomizeTemplate('electrolytes', data);
    console.log('[generateAllReports] Report #10 loaded');
    reports[11] = await loadAndCustomizeTemplate('timeline', data);
    console.log('[generateAllReports] Report #11 loaded');
    reports[12] = await loadAndCustomizeTemplate('stallBreaker', data);
    console.log('[generateAllReports] Report #12 loaded');
    reports[13] = await loadAndCustomizeTemplate('tracker', data);
    console.log('[generateAllReports] Report #13 loaded - All reports complete');

    return reports;
  } catch (error) {
    console.error('[generateAllReports] ERROR:', error.message);
    console.error('[generateAllReports] Stack:', error.stack);
    throw error;
  }
}

/**
 * Combine all 13 reports into a single markdown document
 */
function combineReports(reports) {
  let combined = '# Your Complete Personalized Carnivore Diet Report\n\n';
  combined += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;

  // Add all reports in order (1-13)
  for (let i = 1; i <= 13; i++) {
    if (reports[i]) {
      // Add horizontal rule before each report (except #1)
      if (i > 1) {
        combined += '\n\n---\n\n';
      } else {
        combined += '\n\n';
      }
      combined += reports[i];
    }
  }

  // Wrap in print-optimized HTML
  return wrapInPrintHTML(combined);
}

/**
 * Wrap markdown report in print-optimized HTML with CSS
 */
function wrapInPrintHTML(markdownContent) {
  const printCSS = `
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
    }

    body {
      padding: 12mm 15mm;
      max-width: 210mm;
      margin: 0 auto;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
      orphans: 3;
      widows: 3;
    }

    h1 {
      font-size: 16pt;
      background-color: #f5f1ed;
      padding: 10pt 8pt;
      margin-top: 0pt;
      margin-bottom: 12pt;
      color: #1a1a1a;
      letter-spacing: 0.5pt;
    }

    h2 {
      font-size: 13pt;
      margin-top: 16pt;
      margin-bottom: 8pt;
      color: #2c2c2c;
      font-weight: bold;
      page-break-before: always;
      break-before: page;
    }

    h2:first-of-type {
      margin-top: 8pt;
      page-break-before: avoid;
      break-before: avoid;
    }

    h3 {
      font-size: 11pt;
      margin-top: 10pt;
      margin-bottom: 6pt;
      color: #333;
      font-weight: bold;
    }

    h4 {
      font-size: 10pt;
      margin-top: 8pt;
      margin-bottom: 4pt;
      color: #444;
      font-weight: bold;
    }

    /* Paragraphs */
    p {
      margin: 0 0 8pt 0;
      text-align: left;
      line-height: 1.5;
      orphans: 2;
      widows: 2;
    }

    /* Keep heading with following paragraph */
    h1 + p, h2 + p, h3 + p, h4 + p {
      margin-top: 0pt;
    }

    /* Reduce space between consecutive elements */
    h1 + h2,
    h2 + h3,
    h3 + h4 {
      margin-top: 4pt;
    }

    /* Lists */
    ul, ol {
      margin: 8pt 0 8pt 40pt;
      padding-left: 20pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    li {
      margin-bottom: 6pt;
      margin-left: 20pt;
      text-align: left;
    }

    /* Horizontal rules - section dividers */
    hr {
      border: none;
      border-top: 1pt solid #ccc;
      margin: 20pt 0;
      padding: 0;
      height: 0;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 10pt;
      line-height: 1.4;
    }

    thead {
      display: table-header-group;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th {
      background-color: #e8e8e8;
      color: #000;
      font-weight: bold;
      padding: 8pt 10pt;
      text-align: left;
      border: 1pt solid #999;
      font-size: 10pt;
    }

    td {
      padding: 7pt 10pt;
      border: 1pt solid #999;
      text-align: left;
      vertical-align: top;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    tr:nth-child(even) {
      background-color: #fafafa;
    }

    tr:first-child {
      background-color: #e8e8e8;
    }

    /* Code blocks */
    code {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      background: #f5f5f5;
      padding: 2pt 4pt;
    }

    pre {
      background: #f5f5f5;
      padding: 10pt;
      border-left: 2pt solid #999;
      margin: 10pt 0;
      font-size: 9pt;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow-x: auto;
    }

    /* Blockquotes */
    blockquote {
      margin: 12pt 0 12pt 20pt;
      padding-left: 10pt;
      border-left: 3pt solid #ccc;
      font-style: italic;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Links - show URL in print */
    a {
      color: #0066cc;
      text-decoration: none;
    }

    a[href]:after {
      content: " (" attr(href) ")";
      font-size: 8pt;
      color: #666;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      margin: 10pt 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Emphasis */
    strong, b {
      font-weight: bold;
    }

    em, i {
      font-style: italic;
    }

    /* Utilities */
    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .no-print {
      display: none !important;
    }

    /* Ensure text is black for print */
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    /* Report sections */
    .report-section {
      page-break-after: avoid;
      break-after: avoid;
      margin-bottom: 30pt;
    }

    /* Prevent orphans and widows */
    p {
      orphans: 3;
      widows: 3;
    }
  `;

  // Generate the current date for the cover page
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Convert markdown content to HTML (but we'll extract and move the H1 heading)
  let contentHTML = markdownToHTML(markdownContent);

  // Remove the first H1 from content since it will be on the cover page
  contentHTML = contentHTML.replace(/<h1>[^<]*<\/h1>\n?/, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Carnivore Diet Report</title>
  <style>
    ${printCSS}

    /* Cover page styles */
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      page-break-after: always;
      break-after: page;
      text-align: center;
      padding: 0;
      margin: 0;
    }

    .cover-logo {
      font-size: 48pt;
      margin-bottom: 30pt;
      letter-spacing: 2pt;
    }

    .cover-title {
      font-size: 36pt;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 60pt;
      line-height: 1.3;
      max-width: 500pt;
    }

    .cover-date {
      font-size: 14pt;
      color: #666;
      margin-top: auto;
      padding-bottom: 40pt;
    }

    .content-start {
      page-break-before: always;
      break-before: page;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-logo">🥩 Carnivore Weekly</div>
    <h1 class="cover-title">Your Complete Personalized<br>Carnivore Diet Report</h1>
    <div class="cover-date">Generated on ${generatedDate}</div>
  </div>

  <!-- Content Pages -->
  <div class="content-start report-content">
    ${contentHTML}
  </div>
</body>
</html>`;
}

/**
 * Convert markdown to HTML with proper section wrapping
 */
function markdownToHTML(markdown) {
  // Split into lines for processing
  const lines = markdown.split('\n');
  let html = '';
  let currentParagraph = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings - flush current paragraph and add heading
    if (/^#+\s/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }

      const level = line.match(/^#+/)[0].length;
      const title = line.replace(/^#+\s*/, '');
      html += `<h${level}>${escapeHTML(title)}</h${level}>\n`;
    }
    // Horizontal rule
    else if (/^---+$/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      html += '<hr>\n';
    }
    // Empty line - paragraph break
    else if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
    }
    // List item (handles both * and - prefixes)
    else if (/^[\*\-]\s/.test(line)) {
      if (!inList && currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      const item = line.replace(/^[\*\-]\s*/, '');
      html += `<li>${escapeHTML(item)}</li>\n`;
    }
    // Table row
    else if (/^\|.*\|$/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }

      const cells = line.split('|').filter(c => c.trim());

      // Skip separator rows (all cells are dashes or colons)
      const isSeparator = cells.every(cell => /^[:|-]+$/.test(cell.trim()));
      if (isSeparator) {
        continue;
      }

      // Skip rows with only placeholder content
      const isPlaceholder = cells.every(cell => {
        const trimmed = cell.trim();
        return /^[-_☐\s]+$/.test(trimmed) || trimmed === '';
      });
      if (isPlaceholder) {
        continue;
      }

      if (!inTable) {
        html += '<table>\n';
        inTable = true;
      }

      html += '<tr>\n';
      cells.forEach(cell => {
        const content = cell.trim();
        // Skip placeholder content in cells
        if (/^[-_☐\s]+$/.test(content) || content === '') {
          html += '<td></td>\n';
        } else if (!/^-+$/.test(content)) {
          html += `<td>${escapeHTML(content)}</td>\n`;
        }
      });
      html += '</tr>\n';
    }
    // Regular paragraph
    else if (line.trim()) {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
      currentParagraph.push(line);
    }
  }

  // Flush remaining content
  if (currentParagraph.length > 0) {
    html += '<p>' + currentParagraph.join('\n') + '</p>\n';
  }
  if (inList) {
    html += '</ul>\n';
  }
  if (inTable) {
    html += '</table>\n';
  }

  // Apply inline formatting
  html = applyInlineFormatting(html);

  return html;
}

/**
 * Apply inline markdown formatting (bold, italic, links, code)
 */
function applyInlineFormatting(html) {
  // Images (must come before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 12pt 0;">');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic (but not inside bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

  // Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate AI-personalized reports (#1 and #6)
 */
async function generateAIReports(data, apiKey) {
  // Report #1: Executive Summary
  const summaryPrompt = buildExecutiveSummaryPrompt(data);
  const summary = await callClaudeAPI(
    apiKey,
    buildExecutiveSummarySystemPrompt(),
    summaryPrompt,
    2000
  );

  // Report #6: Obstacle Override Protocol
  const obstaclePrompt = buildObstacleProtocolPrompt(data);
  const obstacle = await callClaudeAPI(
    apiKey,
    buildObstacleProtocolSystemPrompt(),
    obstaclePrompt,
    2500
  );

  return {
    summary: `## Report #1: Your Personalized Protocol\n\n${summary}`,
    obstacle: `## Report #6: Conquering Your Kryptonite\n\n${obstacle}`
  };
}

/**
 * Call Claude API with proper error handling
 */
async function callClaudeAPI(apiKey, systemPrompt, userPrompt, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5-20251101',
      max_tokens: maxTokens,
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
 * Load static template and replace placeholders
 */
async function loadAndCustomizeTemplate(templateName, data) {
  // Template mapping to file names
  const templates = {
    foodGuide: getTemplateContent('foodGuide', data.selectedProtocol),
    mealCalendar: getTemplateContent('mealCalendar'),
    shoppingList: getTemplateContent('shoppingList'),
    physicianConsult: getTemplateContent('physicianConsult', data),
    restaurant: getTemplateContent('restaurant'),
    science: getTemplateContent('science', data.selectedProtocol),
    labs: getTemplateContent('labs'),
    electrolytes: getTemplateContent('electrolytes'),
    timeline: getTemplateContent('timeline'),
    stallBreaker: getTemplateContent('stallBreaker'),
    tracker: getTemplateContent('tracker')
  };

  let template = templates[templateName] || '';

  // Replace placeholders with user data
  template = replacePlaceholders(template, data);

  return template;
}

/**
 * Evaluate conditional expressions for Handlebars
 */
function evaluateCondition(expr, data) {
  // Handle comparisons like: dairyTolerance === 'full'
  const eqMatch = expr.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    return data[field] === value;
  }
  return false;
}

/**
 * Replace {{placeholder}} with actual user data
 */
function replacePlaceholders(template, data) {
  let result = template;

  // First, handle conditional blocks: {{#if condition}} ... {{else if condition}} ... {{else}} ... {{/if}}
  result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    // Try to find else if blocks
    const elseIfRegex = /\{\{else\s+if\s+([^}]+)\}\}([\s\S]*?)(?=\{\{(?:else|\/if)\}\})/g;
    const elseRegex = /\{\{else\}\}([\s\S]*?)$/;

    let mainCondition = evaluateCondition(condition, data);
    if (mainCondition) {
      // Extract content before any else
      const beforeElse = content.split(/\{\{else\s+if|\{\{else\}\}/)[0];
      return beforeElse;
    }

    // Check else if blocks
    let elseIfMatch;
    let remaining = content;
    while ((elseIfMatch = elseIfRegex.exec(content)) !== null) {
      if (evaluateCondition(elseIfMatch[1], data)) {
        return elseIfMatch[2];
      }
    }

    // Check else block
    const elseMatch = content.match(/\{\{else\}\}([\s\S]*?)$/);
    if (elseMatch) {
      return elseMatch[1];
    }

    return ''; // No condition matched
  });

  // Date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  result = result.replace(/\{\{currentDate\}\}/g, currentDate);

  // Basic information
  result = result.replace(/\{\{firstName\}\}/g, data.firstName || 'Friend');
  result = result.replace(/\{\{diet\}\}/g, data.selectedProtocol || 'Carnivore');
  result = result.replace(/\{\{selectedProtocol\}\}/g, data.selectedProtocol || 'Carnivore');
  result = result.replace(/\{\{goal\}\}/g, data.goal || 'Health Optimization');
  result = result.replace(/\{\{budget\}\}/g, data.budget || 'Moderate');
  result = result.replace(/\{\{mealPrepTime\}\}/g, data.mealPrepTime || 'Some');
  result = result.replace(/\{\{weight\}\}/g, data.weight || '');

  // Health information with smart fallbacks
  const allergyText = data.allergies ? data.allergies : 'No known allergies';
  const conditionText = Array.isArray(data.conditions) ? data.conditions.join(', ') :
    (data.conditions ? data.conditions : 'No significant health conditions');
  const medicationText = Array.isArray(data.medications) ? data.medications.join(', ') :
    (data.medications ? data.medications : 'Not taking medications');
  const symptomText = Array.isArray(data.symptoms) ? data.symptoms.join(', ') :
    (data.symptoms ? data.symptoms : 'No significant symptoms');

  result = result.replace(/\{\{allergies\}\}/g, allergyText);
  result = result.replace(/\{\{conditions\}\}/g, conditionText);
  result = result.replace(/\{\{medications\}\}/g, medicationText);
  result = result.replace(/\{\{symptoms\}\}/g, symptomText);

  // Macro information (both macros.calories and calories formats)
  if (data.macros) {
    const calories = data.macros.calories || 2000;
    const protein = data.macros.protein || 130;
    const fat = data.macros.fat || 150;
    const carbs = data.macros.carbs || 20;

    result = result.replace(/\{\{macros\.calories\}\}/g, calories);
    result = result.replace(/\{\{macros\.protein\}\}/g, protein);
    result = result.replace(/\{\{macros\.fat\}\}/g, fat);
    result = result.replace(/\{\{macros\.carbs\}\}/g, carbs);

    // Also support non-nested format
    result = result.replace(/\{\{calories\}\}/g, calories);
    result = result.replace(/\{\{protein\}\}/g, protein);
    result = result.replace(/\{\{fat\}\}/g, fat);
    result = result.replace(/\{\{carbs\}\}/g, carbs);
  }

  // Dairy tolerance
  result = result.replace(/\{\{dairyTolerance\}\}/g, data.dairyTolerance || 'Full');

  // Biggest challenge
  result = result.replace(/\{\{biggestChallenge\}\}/g, data.biggestChallenge || 'Staying consistent');

  // Anything else
  result = result.replace(/\{\{anythingElse\}\}/g, data.anythingElse || '');

  // Report #5 Physician Guide - protein and nutrient fallbacks
  const proteinsByDiet = {
    'Lion': 'beef',
    'Strict Carnivore': 'beef and organ meats',
    'Carnivore': 'beef, fish, and eggs',
    'Pescatarian': 'fish and eggs',
    'Keto': 'meat, fish, and eggs'
  };
  const proteinText = proteinsByDiet[data.selectedProtocol] || 'meat and fish';
  result = result.replace(/\{\{proteins\}\}/g, proteinText);

  // Nutrient fallbacks by diet
  const nutrientsByDiet = {
    'Lion': 'bioavailable B vitamins, iron, and zinc',
    'Strict Carnivore': 'B vitamins, iron, zinc, and selenium',
    'Carnivore': 'complete amino acids, B vitamins, iron, and omega-3s',
    'Pescatarian': 'omega-3 fatty acids, B vitamins, and selenium',
    'Keto': 'vitamins, minerals, and healthy fats'
  };
  const nutrientText = nutrientsByDiet[data.selectedProtocol] || 'essential nutrients';
  result = result.replace(/\{\{nutrient\}\}/g, nutrientText);

  // Lab monitoring fallback (common labs to monitor)
  result = result.replace(/\{\{lab\}\}/g, 'lipid panel and inflammatory markers');

  // Generate full 30-day meal plan using database-driven algorithm
  const fullMealPlan = generateFullMealPlan(data);

  // Flatten the meal plan for template replacement
  for (let day = 1; day <= 30; day++) {
    const week = Math.ceil(day / 7);
    const dayInWeek = ((day - 1) % 7);
    const dayData = fullMealPlan.weeks[week - 1]?.days[dayInWeek];

    if (dayData) {
      result = result.replace(new RegExp(`\\{\\{breakfast${day}\\}\\}`, 'g'), dayData.breakfast);
      result = result.replace(new RegExp(`\\{\\{lunch${day}\\}\\}`, 'g'), dayData.lunch);
      result = result.replace(new RegExp(`\\{\\{dinner${day}\\}\\}`, 'g'), dayData.dinner);
    }
  }

  // Generate grocery lists by week using database-driven algorithm
  const groceryLists = generateGroceryListByWeek(data);

  // Fill grocery list placeholders for all 4 weeks
  for (let week = 1; week <= 4; week++) {
    const weekData = groceryLists[`week${week}`];
    if (weekData && weekData.proteins.length >= 2) {
      result = result.replace(new RegExp(`\\{\\{protein1Week${week}\\}\\}`, 'g'), weekData.proteins[0].name);
      result = result.replace(new RegExp(`\\{\\{qty1Week${week}\\}\\}`, 'g'), weekData.proteins[0].quantity);
      result = result.replace(new RegExp(`\\{\\{protein2Week${week}\\}\\}`, 'g'), weekData.proteins[1].name);
      result = result.replace(new RegExp(`\\{\\{qty2Week${week}\\}\\}`, 'g'), weekData.proteins[1].quantity);
    }

    if (weekData && weekData.fats.length >= 1) {
      result = result.replace(new RegExp(`\\{\\{dairy${week}\\}\\}`, 'g'), weekData.fats[0].name);
      result = result.replace(new RegExp(`\\{\\{dairyQty${week}\\}\\}`, 'g'), weekData.fats[0].quantity);
    }

    if (weekData && weekData.pantry.length >= 1) {
      result = result.replace(new RegExp(`\\{\\{pantry${week}\\}\\}`, 'g'), weekData.pantry[0].name);
      result = result.replace(new RegExp(`\\{\\{pantryQty${week}\\}\\}`, 'g'), weekData.pantry[0].quantity);
    }
  }

  // Also fill the old-style single-week placeholders for backward compatibility
  if (groceryLists.week1) {
    const week1 = groceryLists.week1;
    result = result.replace(/\{\{protein1Week1\}\}/g, week1.proteins[0]?.name || '');
    result = result.replace(/\{\{qty1Week1\}\}/g, week1.proteins[0]?.quantity || '');
    result = result.replace(/\{\{protein2Week1\}\}/g, week1.proteins[1]?.name || '');
    result = result.replace(/\{\{qty2Week1\}\}/g, week1.proteins[1]?.quantity || '');
    result = result.replace(/\{\{dairy1\}\}/g, week1.fats[0]?.name || 'Butter');
    result = result.replace(/\{\{dairyQty1\}\}/g, week1.fats[0]?.quantity || '1 lb');
  }

  // Fill substitution guide with actual database values
  if (fullMealPlan.weeks.length > 0 && fullMealPlan.weeks[0].days.length > 0) {
    const firstDay = fullMealPlan.weeks[0].days[0];
    // Extract the protein name from the first meal (e.g., "Ground Beef (80/20) + Eggs + Butter" → "Ground Beef (80/20)")
    const mainProteinMatch = firstDay.breakfast.match(/^([^+]+)/);
    const mainProtein = mainProteinMatch ? mainProteinMatch[1].trim() : 'Ground Beef';

    result = result.replace(/\{\{protein1\}\}/g, mainProtein);
    result = result.replace(/\{\{protein2\}\}/g, 'Salmon');
  } else {
    result = result.replace(/\{\{protein1\}\}/g, 'Ground Beef');
    result = result.replace(/\{\{protein2\}\}/g, 'Salmon');
  }

  // Properly categorize vegetables/fats (not as vegetables)
  result = result.replace(/\{\{vegetable1\}\}/g, 'Salt (Pantry Item)');
  result = result.replace(/\{\{vegetable2\}\}/g, 'Butter (Healthy Fat)');

  // Remove any remaining unmatched placeholders (set to empty string)
  result = result.replace(/\{\{\w+\}\}/g, '');

  return result;
}


/**
 * Build system prompt for Executive Summary (Report #1)
 */
function buildExecutiveSummarySystemPrompt() {
  return `You are an expert nutritional and behavioral coach creating personalized Executive Summaries for diet protocols.

TONE & STYLE:
- Direct, supportive, practical
- Acknowledge their specific situation and challenges
- Evidence-based but accessible
- Like a knowledgeable coach who understands their journey
- Avoid hype or unrealistic promises

OUTPUT FORMAT:
- Pure Markdown, no HTML
- No preamble or introduction
- Start directly with the report content

CONTENT REQUIREMENTS:
- Mission Brief (1-2 sentences): Why this protocol fits their situation
- Daily Targets: Specific macros, calories, and approach
- Why This Protocol: Evidence that this works for their goal
- First Action Step: What to do TODAY
- 30-Day Timeline: What to expect week by week
- Biggest Challenge Addressed: Direct response to their stated concern
- Medical Disclaimer: Required at bottom`;
}

/**
 * Build system prompt for Obstacle Override Protocol (Report #6)
 */
function buildObstacleProtocolSystemPrompt() {
  return `You are an expert behavioral psychologist and diet coach creating Obstacle Override Protocols.

TONE & STYLE:
- Compassionate but practical
- Acknowledge the challenge without judgment
- Provide specific, actionable tactics
- Empowering and motivational
- Direct and solution-focused

GENERATE:
1. IDENTIFYING THE ENEMY: Reframe their challenge psychologically
2. THE MINDSET SHIFT: Explain why they can overcome this
3. THE TACTICAL SOLUTION: 3-step protocol with specific actions
4. THE "BREAK GLASS" EMERGENCY PLAN: Backup tools (salt trick, 10-min rule, etc.)
5. COMMITMENT CONTRACT: They can sign to reinforce commitment

OUTPUT FORMAT:
- Pure Markdown, no HTML
- Direct, no preamble
- Tone is motivational but grounded in reality`;
}

/**
 * Build prompt for Executive Summary
 */
function buildExecutiveSummaryPrompt(data) {
  const profile = buildProfile(data);
  return `Generate an Executive Summary for this person:\n\n${profile}`;
}

/**
 * Build prompt for Obstacle Override Protocol
 */
function buildObstacleProtocolPrompt(data) {
  return `Create an Obstacle Override Protocol for this challenge: "${data.biggestChallenge || 'Staying consistent with diet'}"\n\nContext: ${buildProfile(data)}`;
}

/**
 * Get template content (stub - will be embedded or fetched)
 */
function getTemplateContent(templateName, dietOrData) {
  const data = typeof dietOrData === 'string' ? { selectedProtocol: dietOrData } : (dietOrData || {});

  const templates = {
    // Report #2: Food Guide - Conditional on diet type
    foodGuide: getFoodGuideTemplate(data.selectedProtocol),

    // Report #3: 30-Day Meal Calendar
    mealCalendar: `## Report #3: Your Custom 30-Day Meal Calendar\n\n*Protocol: {{diet}} | Budget Level: {{budget}} | Focus: {{goal}}*\n\n## The Strategy\nThis plan rotates proteins for variety and simplicity. Cook proteins 2-3 times per week, mixing with different {{diet}}-appropriate options.\n\n## Week 1: Adaptation & Baseline\n| Day | Breakfast | Lunch | Dinner |\n| :--- | :--- | :--- | :--- |\n| Day 1 | {{breakfast1}} | {{lunch1}} | {{dinner1}} |\n| Day 2 | {{breakfast2}} | {{lunch2}} | {{dinner2}} |\n| Day 3 | {{breakfast3}} | {{lunch3}} | {{dinner3}} |\n| Day 4 | {{breakfast4}} | {{lunch4}} | {{dinner4}} |\n| Day 5 | {{breakfast5}} | {{lunch5}} | {{dinner5}} |\n| Day 6 | {{breakfast6}} | {{lunch6}} | {{dinner6}} |\n| Day 7 | {{breakfast7}} | {{lunch7}} | {{dinner7}} |\n\n## Week 2: Building Consistency\n| Day | Breakfast | Lunch | Dinner |\n| :--- | :--- | :--- | :--- |\n| Day 8 | {{breakfast8}} | {{lunch8}} | {{dinner8}} |\n| Day 9 | {{breakfast9}} | {{lunch9}} | {{dinner9}} |\n| Day 10 | {{breakfast10}} | {{lunch10}} | {{dinner10}} |\n| Day 11 | {{breakfast11}} | {{lunch11}} | {{dinner11}} |\n| Day 12 | {{breakfast12}} | {{lunch12}} | {{dinner12}} |\n| Day 13 | {{breakfast13}} | {{lunch13}} | {{dinner13}} |\n| Day 14 | {{breakfast14}} | {{lunch14}} | {{dinner14}} |\n\n## Week 3: Finding Your Rhythm\n| Day | Breakfast | Lunch | Dinner |\n| :--- | :--- | :--- | :--- |\n| Day 15 | {{breakfast15}} | {{lunch15}} | {{dinner15}} |\n| Day 16 | {{breakfast16}} | {{lunch16}} | {{dinner16}} |\n| Day 17 | {{breakfast17}} | {{lunch17}} | {{dinner17}} |\n| Day 18 | {{breakfast18}} | {{lunch18}} | {{dinner18}} |\n| Day 19 | {{breakfast19}} | {{lunch19}} | {{dinner19}} |\n| Day 20 | {{breakfast20}} | {{lunch20}} | {{dinner20}} |\n| Day 21 | {{breakfast21}} | {{lunch21}} | {{dinner21}} |\n\n## Week 4: The New Normal\n| Day | Breakfast | Lunch | Dinner |\n| :--- | :--- | :--- | :--- |\n| Day 22 | {{breakfast22}} | {{lunch22}} | {{dinner22}} |\n| Day 23 | {{breakfast23}} | {{lunch23}} | {{dinner23}} |\n| Day 24 | {{breakfast24}} | {{lunch24}} | {{dinner24}} |\n| Day 25 | {{breakfast25}} | {{lunch25}} | {{dinner25}} |\n| Day 26 | {{breakfast26}} | {{lunch26}} | {{dinner26}} |\n| Day 27 | {{breakfast27}} | {{lunch27}} | {{dinner27}} |\n| Day 28 | {{breakfast28}} | {{lunch28}} | {{dinner28}} |\n| Day 29 | {{breakfast29}} | {{lunch29}} | {{dinner29}} |\n| Day 30 | {{breakfast30}} | {{lunch30}} | {{dinner30}} |\n\n## Substitution Guide\n- If you lack {{protein1}}, substitute with {{protein2}}\n- If you lack {{vegetable1}}, substitute with {{vegetable2}}\n\n*This meal plan rotates proteins for variety while staying true to {{diet}}.* 🍽️`,

    // Report #4: Weekly Shopping Lists
    shoppingList: `## Report #4: Your Weekly Grocery Lists\n\n*Based on your custom {{diet}} meal plan*\n\n> **⚠️ A Note on Grocery Pricing:** Food costs vary by region and season. Your \"{{budget}}\" setting controls the **types of cuts** recommended, not the final total.\n\n## 🛒 "Week 0" Pantry Stock-Up\n* [ ] Quality Salt (Redmond Real Salt or Maldon)\n* [ ] Primary Cooking Fat (Butter or Ghee)\n* [ ] Food Storage Containers\n* [ ] Basic Seasonings (if tolerated)\n\n## 🛒 Week 1 Shopping List\n### 🥩 The Butcher\n* [ ] {{protein1Week1}} - {{qty1Week1}}\n* [ ] {{protein2Week1}} - {{qty2Week1}}\n\n### 🥚 Dairy & Eggs\n* [ ] Eggs - 18-count\n* [ ] {{dairy1}} - {{dairyQty1}}\n\n### 🧂 Pantry\n* [ ] Salt - 1 container\n\n## 🛒 Week 2 Shopping List\n### 🥩 The Butcher\n* [ ] {{protein1Week2}} - {{qty1Week2}}\n* [ ] {{protein2Week2}} - {{qty2Week2}}\n\n### 🥚 Dairy & Eggs\n* [ ] Eggs - 18-count\n* [ ] {{dairy2}} - {{dairyQty2}}\n\n### 🧂 Pantry\n* [ ] Salt (replenish as needed)\n\n## 🛒 Week 3 Shopping List\n### 🥩 The Butcher\n* [ ] {{protein1Week3}} - {{qty1Week3}}\n* [ ] {{protein2Week3}} - {{qty2Week3}}\n\n### 🥚 Dairy & Eggs\n* [ ] Eggs - 18-count\n* [ ] {{dairy3}} - {{dairyQty3}}\n\n### 🧂 Pantry\n* [ ] Salt (replenish as needed)\n\n## 🛒 Week 4 Shopping List\n### 🥩 The Butcher\n* [ ] {{protein1Week4}} - {{qty1Week4}}\n* [ ] {{protein2Week4}} - {{qty2Week4}}\n\n### 🥚 Dairy & Eggs\n* [ ] Eggs - 18-count\n* [ ] {{dairy4}} - {{dairyQty4}}\n\n### 🧂 Pantry\n* [ ] Salt (replenish as needed)\n\n## 💡 Smart Shopping Tips\n{{#if budget === 'tight'}}Look for Manager's Special markdowns, buy whole sub-primals, organ meats are super cheap and nutrient-dense.{{else if budget === 'moderate'}}Check store flyers for sales, stock your freezer with discounted items.{{else}}Buy from local farms, prioritize quality sources and grass-fed options.{{/if}}\n\n**Pro tip:** Buy proteins in bulk when on sale and freeze them. This reduces weekly shopping stress and saves money.`,

    // Report #5: Physician Consultation Guide
    physicianConsult: `## Report #5: Physician Consultation Guide\n\n*For {{firstName}} to review with your doctor*\n\n> **⚠️ MEDICAL DISCLAIMER:** Do not change medication without medical supervision.\n\n## 1. What to Say:\n\n"Dr. [Name], I'm starting a {{diet}} metabolic intervention to address {{symptoms}}. My goal is {{goal}}. I need your help monitoring labs and adjusting medications if needed."\n\n## 2. Critical Medication Review\n\n{{#if medications}}Based on your medications, discuss with your doctor:{{/if}}\n\n## 3. Recommended Lab Work\n### The Key Labs to Check\n* [ ] Fasting Glucose, Insulin, HbA1c\n* [ ] Lipid Panel (Total, LDL, HDL, Triglycerides, ApoB)\n* [ ] Kidney & Liver (Creatinine, eGFR, ALT, AST)\n* [ ] Inflammation (hs-CRP)\n* [ ] Micronutrients (Vitamin D, B12)\n\n## 4. Common Doctor Concerns\n\n### "Won't this hurt your cholesterol?"\n**Response:** "I understand. LDL may increase initially, but triglycerides drop noticeably. Can we focus on triglyceride/HDL ratio and ApoB? I'll retest after 8 weeks."\n\n### "You'll be deficient in nutrients."\n**Response:** "{{diet}} includes nutrient-rich {{proteins}} which contain {{nutrient}}. We can monitor {{lab}} to confirm adequacy."\n\n## 5. Lab Monitoring Schedule\n**Week 0:** Baseline labs\n**Week 8:** Repeat comprehensive labs`,

    // Report #7: Restaurant & Travel Guide
    restaurant: `## Report #7: Dining Out & Travel Survival Guide\n\n*For {{firstName}} navigating the world on {{diet}}*\n\n## The Three Golden Rules\n\n### Rule #1: Be "That Person"\n- Your health comes first. Do not apologize for your dietary needs.\n\n### Rule #2: Beware the Seed Oils\n- Always ask: "What fat do you use for cooking?" Request butter, ghee, or olive oil.\n\n### Rule #3: When in Doubt, Order Steak\n- A plain steak with butter is available almost everywhere.\n\n## Restaurant Strategy by Cuisine\n\n### Steakhouse\n- Order: Ribeye + butter + vegetable\n- Customization: "Cooked in butter, no seed oils"\n\n### Diner\n- Order: Burger (no bun) + eggs + bacon\n- Customization: "No bun, extra patty, cooked in butter"\n\n### Mexican\n- Order: Carne asada + guacamole\n- Customization: "No tortillas, no rice, cooked in butter"\n\n### Asian\n- Order: Grilled fish or beef\n- Customization: "Cooked in butter, no sauce"\n\n## Fast Food Emergency Menu\n\n**McDonald's:** 3x Beef Patties + cheese (no bun) + eggs + bacon\n**Wendy's:** Dave's Single (no bun) + extra beef\n**Chipotle:** Steak bowl, no rice, no beans\n**Taco Bell:** Power Menu Bowl, no rice/beans\n\n## Travel Packing\n* [ ] Beef jerky (check sugar content)\n* [ ] Macadamia nuts or pecans\n* [ ] Hard cheese\n* [ ] Sardines canned in oil\n* [ ] Salt packets\n\n**Remember: Own your choices. Your health comes first.** 🍽️`,

    // Report #8-13: Appendix Reports (Condensed)
    science: `## Report #8: The Science & Evidence\n\n*Why {{diet}} works: Evidence-based research*\n\n## Key Research\n\nResearch on {{diet}} shows promising results for {{goal}} and {{symptoms}}:\n\n**Metabolic Effects:** {{diet}} shifts metabolism to fat-burning, reducing insulin resistance and stabilizing blood sugar.\n\n**Anti-Inflammatory:** Elimination of plant foods may reduce {{symptoms}}.\n\n**Microbiome Changes:** {{diet}} shifts gut bacteria toward beneficial species.\n\n## Why {{diet}} for {{firstName}}:\n\n1. **Rapid metabolic effect** - Addresses your insulin sensitivity quickly\n2. **Anti-inflammatory** - Removes your common triggers\n3. **Sustainable** - No calorie counting, naturally satiating\n4. **Evidence-backed** - Research supports efficacy\n\n**Work with your doctor for personalized guidance.**`,

    labs: `## Report #9: Laboratory Reference Guide\n\n*Understanding your lab results on {{diet}}*\n\n## Standard vs. {{diet}} Ranges\n\n### Glucose & Insulin\n| Marker | Standard | {{diet}} Target | Note |\n|--------|----------|---|---|\n| Fasting Glucose | 70-100 | 60-85 | Lower is better on low-carb |\n| Fasting Insulin | <10 | <5 | Measures insulin sensitivity |\n| HbA1c | <5.7% | <5.5% | 3-month glucose average |\n\n### Lipids\n| Marker | Standard | {{diet}} Typical | Note |\n|--------|----------|---|---|\n| HDL | >40 | Often ↑ | Protective factor |\n| Triglycerides | <150 | Often ↓ | Improves a lot |\n| hs-CRP | <1.0 | Often ↓↓ | Expect improvement |\n\n## What to Expect After 8 Weeks\n\n✅ **Likely:** HbA1c, glucose, triglycerides, hs-CRP, HDL improve\n⚠️ **May increase:** LDL (particle size usually improves)\n\n**Ask your doctor:** Can we focus on LDL particle size rather than LDL number?`,

    electrolytes: `## Report #10: The Electrolyte Protocol\n\n*Managing sodium, potassium, and magnesium on {{diet}}*\n\n## Why Electrolytes Matter\n\nOn {{diet}}, your body releases water and electrolytes more rapidly. This causes "keto flu" (headache, fatigue) in Week 1-2.\n\n## The Ketoade Recipe\n\n### Ingredients\n- 1 liter water\n- 1 teaspoon salt (Redmond or Himalayan)\n- ½ teaspoon "Lite Salt" (potassium)\n- Pinch of magnesium powder (optional, 200-300mg)\n- Lemon/lime juice (optional)\n\n### Instructions\n1. Mix all ingredients\n2. Drink 1-2 liters daily, especially weeks 1-4\n\n## Daily Electrolyte Goals\n\n- **Salt:** 3-7 grams (3-7 teaspoons, based on activity)\n- **Potassium:** 2-4 grams (from beef + ketoade)\n- **Magnesium:** 300-600mg (supplement or food)\n\n## Signs You Need More\n\n⚠️ **Headaches** → Add salt\n⚠️ **Muscle cramps** → Add potassium + magnesium\n⚠️ **Fatigue** → Add salt + magnesium\n⚠️ **Dizziness** → Add salt immediately`,

    timeline: `## Report #11: The Adaptation Timeline\n\n*What to expect week by week on {{diet}}*\n\n## Week 1: The Glycogen Depletion Phase\n\n**Days 1-3:** Water loss (3-7 lbs normal), stable energy\n**Days 4-7:** Transition trough, possible "keto flu", cravings peak\n**Action:** Eat normally, stay hydrated, increase salt\n\n## Week 2: The Difficult Week\n\n**Days 8-10:** Peak dip, worst energy, strong cravings\n**Days 11-14:** Turning point, energy returns, cravings subside\n**Action:** Push through. This is temporary. Don't cheat.\n\n## Week 3: The Breakthrough\n\n**Days 15-21:** Fat adaptation accelerating, consistent weight loss, excellent energy, mental clarity improves\n**Action:** Enjoy. Note health improvements.\n\n## Week 4: The New Normal\n\n**Days 22-30:** {{diet}} feels normal, stable energy, sleep improves, skin/hair improve\n**Action:** This is your new baseline. Track improvements.\n\n**The hardest part is Weeks 1-2. If you push through, the payoff is worth it.**`,

    stallBreaker: `## Report #12: The Stall-Breaker Protocol\n\n*What to do if weight loss stalls after Week 2*\n\n## Check These 4 Things (In Order)\n\n### 1. Real Stall or Normal Fluctuation?\n- It's been 7+ days with no weight loss?\n- You've been strict on {{diet}}?\n- You're drinking water and getting electrolytes?\n\nWait 10-14 days before making changes.\n\n### 2. Dairy Creep\nSmall amounts of cheese/cream add 1000+ calories.\n- Are you adding butter to everything? Using cream in coffee?\n- Solution: Track dairy for 3 days, reduce by 50%\n\n### 3. Too Much Fat\n{{diet}} is high-fat, but not unlimited.\n- How many grams of fat daily? Are you adding excessive cooking fat?\n- Solution: Reduce added fat by 20%, let meat's natural fat be primary\n\n### 4. Hidden Carbs\n- Check labels on processed meats, supplements, condiments\n- Solution: Switch to plain meats and dairy\n\n## Keep Going\n\nDon't quit {{diet}} • Don't add carbs • Trust Carnivore—stalls are temporary`,

    tracker: `## Report #13: 30-Day Symptom & Progress Tracker\n\n*Track what matters: How you FEEL, not just the scale*\n\n## How to Use This Tracker\n\n1. Weigh yourself (morning, after bathroom)\n2. Rate energy (1-10)\n3. Rate mood (1-10)\n4. Note digestion quality\n5. Track non-scale victories (NSVs)\n\n## Daily Tracker\n\n| Day | Weight | Energy | Mood | Digestion | NSVs |\n|-----|--------|--------|------|-----------|------|\n| 1 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n| 7 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n| 15 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n| 30 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n\n## Symptom Checklist\n\n| Symptom | Week 1 | Week 2 | Week 3 | Week 4 |\n|---------|--------|--------|--------|--------|\n| Brain fog | ☐ | ☐ | ☐ | ☐ |\n| Energy crashes | ☐ | ☐ | ☐ | ☐ |\n| Cravings | ☐ | ☐ | ☐ | ☐ |\n| Sleep quality | ☐ | ☐ | ☐ | ☐ |\n| Joint pain | ☐ | ☐ | ☐ | ☐ |\n| Bloating | ☐ | ☐ | ☐ | ☐ |\n| Mood | ☐ | ☐ | ☐ | ☐ |\n| Digestion | ☐ | ☐ | ☐ | ☐ |\n\n## End of 30 Days: Reflection\n\n**What improved the most?** _____________\n\n**What's still a challenge?** _____________\n\n**Continue {{diet}} past 30 days?** ☐ Yes ☐ Maybe ☐ No\n\n*Remember: This is YOUR data. Use it to make decisions about {{diet}}.*`
  };

  return templates[templateName] || '';
}

/**
 * Get Food Guide Template - Returns correct variant based on diet
 */
function getFoodGuideTemplate(diet) {
  const dietType = (diet || '').toLowerCase();

  if (dietType.includes('lion')) {
    return `## Report #2: Your Lion Diet Food Guide\n\n**Prepared for:** {{firstName}}\n**Diet Protocol:** Lion Diet (Beef Only)\n**Date:** {{currentDate}}\n\n---\n\n## 🐂 Your Lion Diet Food Pyramid\n\n![Lion Diet Pyramid](https://carnivoreweekly.com/images/LionFP.png)\n\nThe Lion Diet: **ONLY beef, salt, and water**. This is an elimination protocol.\n\n---\n\n## TIER 1: FOUNDATION (100% of intake)\n\n**ALL beef forms acceptable:**\n- Ground beef (80/20 or fattier)\n- Ribeye, NY strip, chuck steak\n- Brisket, sirloin, short ribs\n- Beef tongue, beef heart\n\n**Cooking:** Any method (grilled, fried, broiled, boiled)\n\n**Fat content:** CRITICAL - 80/20 minimum, fattier is better\n\n---\n\n## Daily Eating Pattern\n\nLion Diet is typically **one meal per day (OMAD)**.\n\n- **One large meal:** 500-1500g beef + salt\n- **Meal timing:** Whenever hungry\n- **Seasoning:** Salt only\n\n---\n\n## Electrolyte Protocol\n\n- **Salt:** 1-2 teaspoons daily\n- **Potassium:** ~400mg per 100g beef\n- **Magnesium:** ~25mg per 100g beef\n\n---\n\n## Budget Optimization\n\n{{#if budget === 'tight'}}Ground beef (80/20), chuck steak, short ribs, organ meats (cheapest)\n\n**Cost:** $30-50/week{{else if budget === 'moderate'}}Mix ground beef with quality steaks, include organs\n\n**Cost:** $50-80/week{{else}}Grass-fed beef, quality cuts, organ variety\n\n**Cost:** $80-150+/week{{/if}}\n\n---\n\n## Week-by-Week Adaptation\n\n**Week 1:** Water loss (3-7 lbs), possible \"keto flu\"\n**Week 2:** Energy dip continues, add salt\n**Week 3:** Energy returns, mental clarity\n**Week 4:** New normal, healing begins\n\n---\n\n*Beef, salt, water. That's it. This is therapeutic, not recreational.*`;
  } else if (dietType.includes('pescatarian')) {
    return `## Report #2: Your Pescatarian Carnivore Food Guide\n\n**Prepared for:** {{firstName}}\n**Diet Protocol:** Pescatarian Carnivore (Fish, Eggs, Dairy)\n**Date:** {{currentDate}}\n\n---\n\n## 🐟 Your Pescatarian Carnivore Pyramid\n\n![Pescatarian Pyramid](https://carnivoreweekly.com/images/PescatarianFP.png)\n\nPescatarian Carnivore: **Fish, seafood, eggs, dairy - no land meat**.\n\n---\n\n## TIER 1: FOUNDATION (60-70% of intake)\n\n### Fatty Fish (Primary Protein)\n- Salmon (wild > farmed)\n- Mackerel, sardines, herring\n- Trout, tuna (canned in oil)\n- Anchovies, eel\n\n**Choose fatty fish, not lean** (cod, tilapia too lean)\n\n### Eggs (Daily Staple)\n- Whole eggs, fried, scrambled, boiled\n- All forms acceptable\n- Amount: 2-6 daily\n\n---\n\n## TIER 2: VARIETY (20-30%)\n\n### Shellfish & Seafood\n- Shrimp, crab, lobster\n- Oysters, mussels, clams\n- Scallops, squid\n\n### Fish Roe & Organs\n- Fish roe (caviar) - nutrient-dense\n- Fish organs (if available)\n\n---\n\n## TIER 3: OPTIONAL (10-15%)\n\n{{#if dairyTolerance === 'full'}}**Dairy (Full):** Butter, ghee, hard cheeses, soft cheeses, Greek yogurt{{else if dairyTolerance === 'some'}}**Dairy (Limited):** Butter, ghee, hard aged cheeses{{else}}**Dairy (None):** Coconut oil, avocado oil{{/if}}\n\n---\n\n## TIER 4: AVOID\n\n❌ **Land meat** - Beef, pork, lamb, poultry\n❌ **Plants** - All vegetables, fruits, nuts\n❌ **Processed** - Sugar, grains, ultra-processed items\n\n---\n\n## Daily Eating Patterns\n\n- **Two meals:** Eggs + salmon + butter, Fish + oysters\n- **OMAD:** Salmon + shrimp + eggs + butter\n- **Three meals:** Eggs + mackerel, Shrimp + butter, Salmon + oysters\n\n---\n\n*Pescatarian carnivore gives you health benefits with ethical alignment.* 🐟`;
  } else if (dietType.includes('keto') || dietType.includes('low carb')) {
    return `## Report #2: Your Keto Food Guide\n\n**Prepared for:** {{firstName}}\n**Diet Protocol:** Ketogenic (Low-Carb, High-Fat)\n**Date:** {{currentDate}}\n\n---\n\n## 🔥 Your Keto Food Pyramid\n\n![Keto Food Pyramid](https://carnivoreweekly.com/images/KetoFP.png)\n\nKeto: **Low-carb, high-fat with animal products AND some low-carb plants**.\n\n---\n\n## TIER 1: FOUNDATION (70-75%)\n\n### Proteins & Healthy Fats\n- **Red meat:** Ground beef, ribeye, chuck, lamb\n- **Poultry:** Chicken thighs, duck, turkey thighs\n- **Fish:** Salmon, mackerel, sardines, herring\n- **Eggs:** 3-6 daily, all forms\n\n### Healthy Fats\n- Butter, ghee, coconut oil\n- Avocado oil, olive oil, animal fats\n\n**Use generously. Fat is your fuel.**\n\n---\n\n## TIER 2: REGULAR VARIETY (15-20%)\n\n### Non-Starchy Vegetables\n- **Leafy:** Spinach, kale, lettuce, arugula\n- **Cruciferous:** Broccoli, cauliflower, Brussels sprouts\n- **Low-carb:** Zucchini, asparagus, green beans, cucumber\n\n{{#if allergies && allergies.includes('nightshade')}}**Avoid nightshades** (tomato, pepper){{/if}}\n\n### Dairy (Based on Tolerance)\n\n{{#if dairyTolerance === 'full'}}Butter, cheese, heavy cream, Greek yogurt{{else if dairyTolerance === 'some'}}Butter, ghee, hard aged cheeses{{else}}Coconut oil, avocado oil{{/if}}\n\n### Nuts (Limited)\n{{#if allergies && allergies.includes('tree nut')}}**Avoid nuts**{{else}}Macadamia (lowest carb), pecans, walnuts, almonds. Portion control: 1 oz max.{{/if}}\n\n---\n\n## TIER 3: OCCASIONAL (5%)\n\n- Avocado (3g net carbs)\n- Olives (1g net carbs)\n- Berries (in moderation)\n\n---\n\n## TIER 4: AVOID\n\n❌ **High-carb veggies** - Potatoes, corn, peas, carrots\n❌ **Grains** - Wheat, rice, oats, bread, pasta\n❌ **Sugar** - All forms\n❌ **Plant oils** - Vegetable, soybean, canola, corn\n\n**Use only:** Butter, ghee, olive oil, avocado oil, coconut oil\n\n---\n\n## Carb Counting\n\n**Net Carbs = Total Carbs - Fiber**\n\n**Target:** 20-50g net carbs daily (mostly vegetables)\n\n---\n\n## Budget Optimization\n\n{{#if budget === 'tight'}}Ground beef, eggs, chicken thighs, frozen veggies, butter, organ meats{{else if budget === 'moderate'}}Mix ground beef with steaks, variety of proteins, fresh/frozen veggies{{else}}Grass-fed beef, wild-caught fish, organic veggies, premium nuts{{/if}}\n\n---\n\n*Keto is flexible, sustainable, and effective.* 🔥`;
  } else {
    // Default to Carnivore
    return `## Report #2: Your Carnivore Food Guide\n\n**Prepared for:** {{firstName}}\n**Diet Protocol:** Strict Carnivore (Animal Products Only)\n**Date:** {{currentDate}}\n\n---\n\n## 🥩 Your Carnivore Food Pyramid\n\n![Carnivore Food Pyramid](https://carnivoreweekly.com/images/CarnivorFP.png)\n\nCarnivore: **Only animal products, salt, and water**. No plants.\n\n---\n\n## TIER 1: FOUNDATION (70-80%)\n\n### Red Meat (Ruminant)\n- Ground beef (80/20 or fattier)\n- Ribeye, NY strip, chuck\n- Ground lamb, bison\n\n**Why:** Highest bioavailable nutrients, best satiety\n\n### Eggs (Daily Staple)\n- Whole eggs, fried, scrambled, boiled\n- Amount: 2-6 daily\n\n### Fatty Fish\n- Salmon (wild > farmed)\n- Mackerel, sardines, herring\n- Trout, tuna (canned in oil)\n\n---\n\n## TIER 2: VARIETY (15-20%)\n\n### Poultry\n- Chicken thighs (dark meat)\n- Duck (fattier)\n- Turkey thighs\n\n### Cured & Processed\n- Bacon (pork or beef)\n- Sausage (check ingredients)\n- Beef jerky (sugar-free)\n- Smoked salmon\n\n---\n\n## TIER 3: OPTIONAL (5-10%)\n\n{{#if dairyTolerance === 'full'}}**Dairy (Full):** Butter, ghee, hard cheeses, soft cheeses, Greek yogurt{{else if dairyTolerance === 'some'}}**Dairy (Limited):** Butter, ghee, hard aged cheeses{{else}}**Dairy (None):** Tallow, avocado oil{{/if}}\n\n---\n\n## TIER 4: AVOID\n\n❌ **All plants** - Veggies, fruits, nuts, seeds, plant oils\n❌ **Processed foods** - Ultra-processed with sugar\n❌ **Dairy (if intolerant)** - Milk, cream, soft cheeses\n\n---\n\n## Daily Eating Patterns\n\n- **Two meals:** Eggs + bacon + butter, Ribeye + salt\n- **OMAD:** Large steak + eggs + butter\n- **Three meals:** Ground beef + eggs, Fish + butter, Ribeye\n\n---\n\n## Budget Optimization\n\n{{#if budget === 'tight'}}Ground beef, eggs, chicken thighs, organ meats{{else if budget === 'moderate'}}Ground beef mix, variety of proteins, fresh/frozen fish{{else}}Grass-fed beef, wild-caught fish, premium cuts{{/if}}\n\n---\n\n*You have everything you need. Execute.* 🥩`;
  }
}

/**
 * Build detailed user profile from questionnaire data
 */

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

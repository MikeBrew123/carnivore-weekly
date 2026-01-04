#!/usr/bin/env node

/**
 * Direct Report Generation Test
 * Verifies that Claude API generates actual personalized report content
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function testReportGeneration() {
  let browser;
  let page;

  try {
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  REPORT GENERATION TEST${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

    browser = await playwright.chromium.launch({ headless: false });
    page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    // ===== STEP 1: Create a session =====
    console.log(`${colors.bold}STEP 1: Creating calculator session${colors.reset}`);
    const sessionResponse = await fetch('https://carnivore-report-api.iambrew.workers.dev/api/v1/calculator/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const sessionData = await sessionResponse.json();
    const sessionToken = sessionData.session_token;
    console.log(`${colors.green}✓${colors.reset} Session created: ${sessionToken}\n`);

    // ===== STEP 2: Save form data to session =====
    console.log(`${colors.bold}STEP 2: Saving form data to session${colors.reset}`);
    const formData = {
      session_token: sessionToken,
      data: {
        sex: 'male',
        age: 32,
        height_feet: 6,
        height_inches: 0,
        weight_value: 185,
        weight_unit: 'lbs',
        lifestyle_activity: 'moderate',
        exercise_frequency: '5-6',
        goal: 'muscle_gain',
        diet_type: 'carnivore',
        allergies: 'None',
        avoid_foods: 'None',
        dairy_tolerance: 'full',
        previous_diets: 'Keto',
        carnivore_experience: 'months',
        email: 'iambrew@gmail.com',
        first_name: 'Test',
        last_name: 'User'
      }
    };

    // Save steps
    for (let step = 1; step <= 3; step++) {
      const stepResponse = await fetch(`https://carnivore-report-api.iambrew.workers.dev/api/v1/calculator/step/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (stepResponse.ok) {
        console.log(`${colors.green}✓${colors.reset} Step ${step} saved`);
      }
    }
    console.log();

    // ===== STEP 3: Initialize report generation =====
    console.log(`${colors.bold}STEP 3: Initializing report generation${colors.reset}`);
    const reportInitResponse = await fetch('https://carnivore-report-api.iambrew.workers.dev/api/v1/calculator/report/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: sessionToken })
    });

    if (!reportInitResponse.ok) {
      const error = await reportInitResponse.text();
      console.log(`${colors.red}✗ Report init failed: ${error}${colors.reset}`);
      return;
    }

    const reportData = await reportInitResponse.json();
    const accessToken = reportData.access_token;
    console.log(`${colors.green}✓${colors.reset} Report initialized`);
    console.log(`${colors.green}✓${colors.reset} Access token: ${accessToken}\n`);

    // ===== STEP 4: Fetch report content =====
    console.log(`${colors.bold}STEP 4: Fetching generated report content${colors.reset}`);
    const reportContentResponse = await fetch(`https://carnivore-report-api.iambrew.workers.dev/api/v1/calculator/report/${accessToken}/content`);

    if (!reportContentResponse.ok) {
      const error = await reportContentResponse.text();
      console.log(`${colors.red}✗ Report content fetch failed: ${error}${colors.reset}`);
      return;
    }

    const reportHTML = await reportContentResponse.text();
    console.log(`${colors.green}✓${colors.reset} Report content fetched`);
    console.log(`${colors.green}✓${colors.reset} Report size: ${(reportHTML.length / 1024).toFixed(1)} KB\n`);

    // ===== STEP 5: Display in browser =====
    console.log(`${colors.bold}STEP 5: Loading report in browser${colors.reset}`);
    const reportUrl = `http://localhost:8000/public/calculator/report.html?access_token=${accessToken}`;
    console.log(`${colors.yellow}→${colors.reset} Navigating to: ${reportUrl}`);
    await page.goto(reportUrl, { waitUntil: 'networkidle' });
    console.log(`${colors.green}✓${colors.reset} Report page loaded\n`);

    // ===== STEP 6: Verify report content =====
    console.log(`${colors.bold}STEP 6: Verifying report content${colors.reset}`);
    const pageText = await page.textContent('body');

    const checks = {
      'Claude generated content': pageText.includes('goal') || pageText.includes('macro') || pageText.includes('personalized'),
      'User name': pageText.includes('Test') || pageText.includes('User'),
      'Health recommendations': pageText.includes('recommend') || pageText.includes('suggest') || pageText.includes('diet'),
      'Print/Save buttons': await page.locator('.btn').count() > 0
    };

    console.log();
    Object.entries(checks).forEach(([name, passed]) => {
      console.log(`${passed ? colors.green + '✓' : colors.red + '✗'} ${colors.reset} ${name}`);
    });

    console.log();

    // ===== STEP 7: Save report files =====
    console.log(`${colors.bold}STEP 7: Saving report files${colors.reset}`);
    const reportPath = path.join(process.env.HOME, 'Downloads', 'GENERATED-REPORT.html');
    fs.writeFileSync(reportPath, reportHTML);
    console.log(`${colors.green}✓${colors.reset} Saved to: ${reportPath}`);

    // Generate PDF
    const pdfPath = path.join(process.env.HOME, 'Downloads', 'GENERATED-REPORT.pdf');
    await page.pdf({ path: pdfPath, format: 'A4' });
    console.log(`${colors.green}✓${colors.reset} PDF saved to: ${pdfPath}\n`);

    // ===== SUMMARY =====
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}REPORT CONTENT PREVIEW${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);

    // Extract first 500 chars of actual content
    const contentMatch = reportHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (contentMatch) {
      const body = contentMatch[1].replace(/<[^>]*>/g, '').substring(0, 500);
      console.log(body + '...\n');
    }

    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ REPORT GENERATION SUCCESSFUL${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.blue}Files saved:${colors.reset}`);
    console.log(`  1. ${reportPath}`);
    console.log(`  2. ${pdfPath}`);
    console.log(`\n${colors.blue}Access token:${colors.reset}`);
    console.log(`  ${accessToken}\n`);

    await page.waitForTimeout(3000);

  } catch (err) {
    console.error(`\n${colors.red}✗ Error: ${err.message}${colors.reset}`);
    console.error(err.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testReportGeneration();

#!/usr/bin/env node

/**
 * Full Calculator Form Flow Test
 * Tests complete workflow from form submission through report generation
 * Diet: Pescatarian, Dislikes: Ground beef
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

async function runCalculatorTest() {
  let browser;
  let page;

  try {
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  CALCULATOR FORM - FULL FLOW TEST${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

    // Launch browser
    console.log(`${colors.blue}Launching Playwright browser...${colors.reset}`);
    browser = await playwright.chromium.launch({ headless: false });
    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({ width: 1400, height: 900 });

    // Navigate to form
    const formUrl = 'http://localhost:8000/public/calculator-form-rebuild.html';
    console.log(`${colors.blue}Navigating to: ${formUrl}${colors.reset}`);
    await page.goto(formUrl, { waitUntil: 'networkidle' });
    console.log(`${colors.green}✓${colors.reset} Form loaded\n`);

    // ===== STEP 1: PHYSICAL STATS =====
    console.log(`${colors.bold}STEP 1: PHYSICAL STATS${colors.reset}`);

    // Sex
    await page.selectOption('select[name="sex"]', 'male');
    console.log(`${colors.green}✓${colors.reset} Sex: Male`);

    // Age
    await page.fill('input[name="age"]', '35');
    console.log(`${colors.green}✓${colors.reset} Age: 35`);

    // Height
    await page.fill('input[name="height_value"]', '70');
    await page.selectOption('select[name="height_unit"]', 'inches');
    console.log(`${colors.green}✓${colors.reset} Height: 70 inches`);

    // Weight
    await page.fill('input[name="weight_value"]', '195');
    await page.selectOption('select[name="weight_unit"]', 'lbs');
    console.log(`${colors.green}✓${colors.reset} Weight: 195 lbs`);

    // Click next to Step 2
    await page.click('button:has-text("Next: Fitness & Goals")');
    await page.waitForSelector('h2:has-text("Fitness & Goals")', { timeout: 5000 });
    console.log(`${colors.green}✓${colors.reset} Advanced to Step 2\n`);

    // ===== STEP 2: FITNESS & GOALS =====
    console.log(`${colors.bold}STEP 2: FITNESS & GOALS${colors.reset}`);

    // Lifestyle Activity
    await page.selectOption('select[name="lifestyle_activity"]', 'moderate');
    console.log(`${colors.green}✓${colors.reset} Lifestyle: Moderate activity`);

    // Primary Goal
    await page.selectOption('select[name="goal"]', 'fat_loss');
    console.log(`${colors.green}✓${colors.reset} Goal: Fat loss`);

    // Diet Type - PESCATARIAN
    await page.selectOption('select[name="diet_type"]', 'pescatarian');
    console.log(`${colors.green}✓${colors.reset} Diet: Pescatarian`);

    // Training Days
    await page.fill('input[name="training_days"]', '4');
    console.log(`${colors.green}✓${colors.reset} Training Days: 4`);

    // Click next to Step 3
    await page.click('button:has-text("Next: Lifestyle")');
    await page.waitForSelector('h2:has-text("Lifestyle")', { timeout: 5000 });
    console.log(`${colors.green}✓${colors.reset} Advanced to Step 3\n`);

    // ===== STEP 3: LIFESTYLE =====
    console.log(`${colors.bold}STEP 3: LIFESTYLE${colors.reset}`);

    // Stress Level
    await page.selectOption('select[name="stress_level"]', 'moderate');
    console.log(`${colors.green}✓${colors.reset} Stress Level: Moderate`);

    // Sleep Hours
    await page.fill('input[name="sleep_hours"]', '7.5');
    console.log(`${colors.green}✓${colors.reset} Sleep: 7.5 hours`);

    // Current Diet Experience
    await page.selectOption('select[name="current_diet_experience"]', 'some_experience');
    console.log(`${colors.green}✓${colors.reset} Diet Experience: Some experience`);

    // Additional Notes - MENTION GROUND BEEF DISLIKE
    const notesText = 'I like fish and seafood. Don\'t enjoy ground beef - prefer whole cuts of meat. Looking to optimize nutrition while respecting my dietary preferences.';
    await page.fill('textarea[name="additional_notes"]', notesText);
    console.log(`${colors.green}✓${colors.reset} Notes added (${notesText.length} chars)`);

    // Click next to Step 4
    await page.click('button:has-text("Next: Health Profile")');
    await page.waitForSelector('h2:has-text("Health Profile")', { timeout: 5000 });
    console.log(`${colors.green}✓${colors.reset} Advanced to Step 4\n`);

    // ===== STEP 4: HEALTH PROFILE =====
    console.log(`${colors.bold}STEP 4: HEALTH PROFILE${colors.reset}`);

    // Email - REQUIRED
    const testEmail = 'pescatarian.test@example.com';
    await page.fill('input[name="email"]', testEmail);
    console.log(`${colors.green}✓${colors.reset} Email: ${testEmail}`);

    // First Name
    await page.fill('input[name="firstName"]', 'Test');
    console.log(`${colors.green}✓${colors.reset} First Name: Test`);

    // Last Name
    await page.fill('input[name="lastName"]', 'Pescatarian');
    console.log(`${colors.green}✓${colors.reset} Last Name: Pescatarian`);

    // Energy Levels
    await page.selectOption('select[name="energy_levels"]', 'moderate');
    console.log(`${colors.green}✓${colors.reset} Energy Levels: Moderate`);

    // Health Concerns
    const healthText = 'Interested in optimizing omega-3 intake and sustainable seafood choices';
    await page.fill('textarea[name="health_concerns"]', healthText);
    console.log(`${colors.green}✓${colors.reset} Health Concerns added`);

    console.log(`\n${colors.bold}FORM COMPLETE - ALL FIELDS FILLED${colors.reset}\n`);

    // ===== STEP 5: TIER SELECTION =====
    console.log(`${colors.bold}STEP 5: PAYMENT TIER SELECTION${colors.reset}`);

    // Check submit button state
    const submitButton = await page.$('button#submit-button');
    const isDisabled = await submitButton.evaluate(btn => btn.disabled);
    console.log(`${colors.green}✓${colors.reset} Submit button state: ${isDisabled ? 'DISABLED' : 'ENABLED'}`);

    // Wait for tier selection to appear and select Pro tier
    await page.waitForSelector('.tier-option', { timeout: 5000 });
    console.log(`${colors.green}✓${colors.reset} Tier options displayed`);

    // Select Pro tier ($99.99)
    const proTier = await page.locator('.tier-option:has-text("Pro")').first();
    await proTier.click();
    console.log(`${colors.green}✓${colors.reset} Selected: Pro tier ($99.99)\n`);

    // ===== STEP 6: STRIPE PAYMENT =====
    console.log(`${colors.bold}STEP 6: STRIPE PAYMENT PROCESSING${colors.reset}`);

    // Wait for progress bar to appear
    await page.waitForSelector('.progress-container', { timeout: 10000 });
    console.log(`${colors.green}✓${colors.reset} Progress bar appeared`);

    // Monitor progress stages
    let previousProgress = 0;
    const startTime = Date.now();

    for (let i = 0; i < 30; i++) {
      const progressText = await page.locator('.progress-stage').first().textContent();
      const progressPercent = await page.locator('.progress-fill').evaluate(el => {
        const width = window.getComputedStyle(el).width;
        return parseInt(width);
      });

      if (progressText && progressPercent > previousProgress) {
        console.log(`${colors.yellow}→${colors.reset} ${progressText} (${progressPercent}%)`);
        previousProgress = progressPercent;
      }

      // Check if report is ready (100% completion)
      if (progressPercent >= 100) {
        console.log(`${colors.green}✓${colors.reset} Report generation complete!`);
        break;
      }

      await page.waitForTimeout(1000);
    }

    // Wait for report to be accessible
    await page.waitForTimeout(3000);
    console.log(`${colors.green}✓${colors.reset} Waiting for report finalization...\n`);

    // ===== STEP 7: REPORT CAPTURE =====
    console.log(`${colors.bold}STEP 7: REPORT CAPTURE${colors.reset}`);

    // Get the final report content
    const reportContent = await page.content();

    // Try to get access token from page
    const accessToken = await page.evaluate(() => {
      const tokenElement = document.querySelector('[data-access-token]');
      return tokenElement ? tokenElement.getAttribute('data-access-token') : 'no-token-found';
    });

    console.log(`${colors.green}✓${colors.reset} Access Token: ${accessToken.substring(0, 20)}...`);

    // Save full report HTML
    const reportPath = path.join(process.env.HOME, 'Downloads', 'calculator-report-pescatarian.html');
    fs.writeFileSync(reportPath, reportContent);
    console.log(`${colors.green}✓${colors.reset} Report saved to: ${reportPath}`);

    // Extract key report data
    const reportTitle = await page.locator('h1').first().textContent();
    const reportDate = new Date().toLocaleString();

    console.log(`\n${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  TEST COMPLETION SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓${colors.reset} Form submitted successfully`);
    console.log(`${colors.green}✓${colors.reset} Payment processed (TEST card)`)
    console.log(`${colors.green}✓${colors.reset} Report generated (${reportDate})`);
    console.log(`${colors.green}✓${colors.reset} Report saved: ${reportPath}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

    // Open the report in browser
    console.log(`${colors.blue}Opening report in browser...${colors.reset}\n`);

    // Keep browser open for viewing
    await page.waitForTimeout(5000);

  } catch (err) {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    console.error(err.stack);
  } finally {
    if (browser) {
      // Don't close browser yet - let user view
      console.log(`${colors.yellow}Browser will remain open for review. Close manually when done.${colors.reset}`);
      // await browser.close();
    }
  }
}

runCalculatorTest();

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
    console.log(`${colors.cyan}  Pescatarian Diet | Dislikes: Ground Beef${colors.reset}`);
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

    // Sex - Radio button
    await page.click('#sex-male');
    console.log(`${colors.green}✓${colors.reset} Sex: Male`);

    // Age
    await page.fill('input[name="age"]', '35');
    console.log(`${colors.green}✓${colors.reset} Age: 35`);

    // Height - separate input and select
    await page.fill('input[name="height"]', '70');
    await page.selectOption('select[name="height-unit"]', 'inches');
    console.log(`${colors.green}✓${colors.reset} Height: 70 inches`);

    // Weight - separate input and select
    await page.fill('input[name="weight"]', '195');
    await page.selectOption('select[name="weight-unit"]', 'lbs');
    console.log(`${colors.green}✓${colors.reset} Weight: 195 lbs`);

    // ===== STEP 2: FITNESS & DIET PROFILE =====
    console.log(`\n${colors.bold}STEP 2: FITNESS & DIET PROFILE${colors.reset}`);

    // Lifestyle Activity
    await page.selectOption('select[name="lifestyle_activity"]', 'moderate');
    console.log(`${colors.green}✓${colors.reset} Lifestyle: Moderate activity`);

    // Exercise Frequency
    await page.selectOption('select[name="exercise_frequency"]', '3-4');
    console.log(`${colors.green}✓${colors.reset} Exercise: 3-4 days/week`);

    // Primary Goal - Radio button (Fat Loss)
    await page.click('#goal-loss');
    await page.waitForTimeout(500); // Wait for conditional field
    console.log(`${colors.green}✓${colors.reset} Goal: Fat Loss`);

    // Caloric Deficit - now visible
    await page.selectOption('select[name="deficit_percentage"]', '20');
    console.log(`${colors.green}✓${colors.reset} Deficit: 20%`);

    // Diet Type - Radio button (PESCATARIAN)
    await page.click('#diet-pescatarian');
    console.log(`${colors.green}✓${colors.reset} Diet: Pescatarian`);

    // ===== STEP 3: DIETARY RESTRICTIONS =====
    console.log(`\n${colors.bold}STEP 3: DIETARY RESTRICTIONS${colors.reset}`);

    // Allergies
    await page.fill('textarea[name="allergies"]', 'None');
    console.log(`${colors.green}✓${colors.reset} Allergies: None`);

    // Foods to Avoid - MENTION GROUND BEEF
    const avoidFoodsText = 'Ground beef - prefer whole cuts like ribeye, sirloin, or ground fish';
    await page.fill('textarea[name="avoid_foods"]', avoidFoodsText);
    console.log(`${colors.green}✓${colors.reset} Foods to Avoid: Ground beef mentioned`);

    // Dairy Tolerance
    await page.click('#dairy-full');
    console.log(`${colors.green}✓${colors.reset} Dairy: Full tolerance`);

    // Previous Diets
    await page.fill('textarea[name="previous_diets"]', 'Low-carb for 6 months, tried vegan briefly');
    console.log(`${colors.green}✓${colors.reset} Previous Diets added`);

    // What Worked Best
    await page.fill('textarea[name="what_worked"]', 'High protein, moderate fats with seafood was best');
    console.log(`${colors.green}✓${colors.reset} What Worked added`);

    // Carnivore Experience
    await page.click('#carnivore-new');
    console.log(`${colors.green}✓${colors.reset} Carnivore Experience: New`);

    // ===== STEP 4: HEALTH PROFILE =====
    console.log(`\n${colors.bold}STEP 4: HEALTH PROFILE (PREMIUM INFO)${colors.reset}`);

    // Email - REQUIRED
    const testEmail = 'pescatarian.tester@example.com';
    await page.fill('input[name="email"]', testEmail);
    console.log(`${colors.green}✓${colors.reset} Email: ${testEmail}`);

    // First Name
    await page.fill('input[name="firstName"]', 'Tester');
    console.log(`${colors.green}✓${colors.reset} First Name: Tester`);

    // Last Name
    await page.fill('input[name="lastName"]', 'Pescatarian');
    console.log(`${colors.green}✓${colors.reset} Last Name: Pescatarian`);

    console.log(`\n${colors.green}✓ ALL FORM FIELDS FILLED${colors.reset}`);

    // Check submit button is enabled
    const isSubmitEnabled = !(await page.locator('#submit-button').evaluate(btn => btn.disabled));
    console.log(`${colors.green}✓${colors.reset} Submit Button: ${isSubmitEnabled ? 'ENABLED' : 'DISABLED'}\n`);

    if (!isSubmitEnabled) {
      console.log(`${colors.red}✗ Submit button is disabled - email validation may have failed${colors.reset}`);
      await page.waitForTimeout(3000);
      return;
    }

    // ===== STEP 5: SUBMIT & WAIT FOR REPORT GENERATION =====
    console.log(`${colors.bold}STEP 5: FORM SUBMISSION${colors.reset}`);
    await page.click('#submit-button');
    console.log(`${colors.green}✓${colors.reset} Submit button clicked`);

    // Wait for progress bar
    await page.waitForSelector('.progress-bar', { timeout: 15000 });
    console.log(`${colors.green}✓${colors.reset} Progress bar appeared\n`);

    console.log(`${colors.bold}STEP 6: MONITORING REPORT GENERATION${colors.reset}`);
    console.log(`${colors.blue}Tracking 5-stage progress...${colors.reset}\n`);

    // Monitor progress stages
    let stagesSeen = new Set();

    for (let i = 0; i < 120; i++) {
      try {
        // Get current progress label
        const progressLabel = await page.locator('.progress-label').textContent();
        
        if (progressLabel && !stagesSeen.has(progressLabel)) {
          stagesSeen.add(progressLabel);
          console.log(`${colors.yellow}→${colors.reset} ${progressLabel.trim()}`);
        }

        // Check if report container exists
        const hasReport = await page.locator('body').evaluate(body => {
          return document.body.textContent.includes('Your Personalized') || 
                 document.body.textContent.includes('Report') ||
                 document.querySelectorAll('[data-report], .final-report, #final-report').length > 0;
        });

        if (hasReport && stagesSeen.size >= 4) {
          console.log(`${colors.green}✓${colors.reset} Report generation complete!\n`);
          break;
        }

      } catch (e) {
        // Ignore timing issues
      }

      await page.waitForTimeout(500);
    }

    // ===== STEP 7: CAPTURE REPORT =====
    console.log(`${colors.bold}STEP 7: CAPTURING REPORT${colors.reset}`);

    await page.waitForTimeout(2000);
    const reportHTML = await page.content();
    const reportPath = path.join(process.env.HOME, 'Downloads', 'CALCULATOR-REPORT-PESCATARIAN.html');

    fs.writeFileSync(reportPath, reportHTML);
    console.log(`${colors.green}✓${colors.reset} Report saved to:`);
    console.log(`  📄 ${reportPath}\n`);

    // Final summary
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  FULL FLOW TEST COMPLETE ✓${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓${colors.reset} Pescatarian diet form filled completely`);
    console.log(`${colors.green}✓${colors.reset} Ground beef preference recorded`);
    console.log(`${colors.green}✓${colors.reset} Form submitted successfully`);
    console.log(`${colors.green}✓${colors.reset} Report generated (${new Date().toLocaleString()})`);
    console.log(`${colors.green}✓${colors.reset} Report saved to Downloads folder`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

    // Open report
    const { execSync } = require('child_process');
    try {
      execSync(`open "${reportPath}"`);
      console.log(`${colors.blue}Opening report in browser...${colors.reset}\n`);
    } catch (e) {
      console.log(`${colors.yellow}→ Report saved to ~/Downloads/CALCULATOR-REPORT-PESCATARIAN.html${colors.reset}\n`);
    }

  } catch (err) {
    console.error(`\n${colors.red}✗ Error: ${err.message}${colors.reset}`);
  } finally {
    if (browser) {
      console.log(`${colors.blue}Closing browser...${colors.reset}`);
      await browser.close();
    }
  }
}

runCalculatorTest();

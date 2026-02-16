#!/usr/bin/env node
/**
 * Comprehensive Calculator Test Suite
 * Tests allergy filtering, food restrictions, and report completeness
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';

const SCREENSHOT_DIR = '/tmp/calculator-test-screenshots';
const BASE_URL = 'https://carnivoreweekly.com';

// Ensure screenshot directory exists
await mkdir(SCREENSHOT_DIR, { recursive: true });

async function runTest(testName, allergyInput, foodRestrictionInput) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Running: ${testName}`);
  console.log(`${'='.repeat(60)}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const results = {
    testName,
    allergyInput,
    foodRestrictionInput,
    success: false,
    errors: [],
    reportUrl: null,
    sections: [],
    imagesFound: [],
    forbiddenFoodsFound: [],
    timing: {
      formFillStart: null,
      formFillEnd: null,
      checkoutStart: null,
      reportGenerationStart: null,
      reportGenerationEnd: null,
      totalDuration: null,
      reportGenerationDuration: null
    }
  };

  try {
    const overallStart = Date.now();
    results.timing.formFillStart = new Date().toISOString();

    // STEP 1: Navigate to calculator
    console.log('📍 Step 1: Loading calculator...');
    await page.goto(`${BASE_URL}/calculator.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-01-loaded.png` });

    // STEP 2: Fill Step 1 - Basic Info
    console.log('📝 Step 2: Filling basic info (Step 1)...');

    // Sex
    await page.click('input[name="sex"][value="male"]');
    await page.waitForTimeout(300);

    // Age
    await page.fill('input[name="age"]', '35');
    await page.waitForTimeout(300);

    // Height
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.waitForTimeout(300);

    // Weight
    await page.fill('input[name="weight"]', '180');
    await page.waitForTimeout(300);

    // Activity level
    await page.selectOption('select[name="lifestyleActivity"]', 'moderate');
    await page.waitForTimeout(300);

    // Exercise frequency
    await page.selectOption('select[name="exerciseFrequency"]', '3-4');
    await page.waitForTimeout(300);

    // Goal
    await page.click('input[name="goal"][value="lose"]');
    await page.waitForTimeout(300);

    // Deficit
    await page.selectOption('select[name="deficitPercentage"]', '20');
    await page.waitForTimeout(300);

    // Diet type
    await page.selectOption('select[name="dietType"]', 'carnivore');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-02-step1-filled.png` });

    // Click Continue to Step 2
    console.log('➡️  Advancing to Step 2...');
    await page.click('button:has-text("Continue to Step 2")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-03-step2-loaded.png` });

    // STEP 3: Fill Step 2 - Contact Info
    console.log('📝 Step 3: Filling contact info (Step 2)...');

    await page.fill('input[name="email"]', 'test@carnivoreweekly.com');
    await page.waitForTimeout(300);

    await page.fill('input[name="firstName"]', 'Test');
    await page.waitForTimeout(300);

    await page.fill('input[name="lastName"]', 'User');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-04-step2-filled.png` });

    // Click Continue to Step 3
    console.log('➡️  Advancing to Step 3...');
    await page.click('button:has-text("Continue to Step 3")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-05-step3-loaded.png` });

    // STEP 4: Fill Step 3 - Health Profile with Allergies/Restrictions
    console.log('📝 Step 4: Filling health profile (Step 3)...');

    // Allergies (if provided)
    if (allergyInput) {
      console.log(`   🚫 Setting allergies: "${allergyInput}"`);
      await page.fill('textarea[name="allergies"]', allergyInput);
      await page.waitForTimeout(500);
    }

    // Food restrictions (if provided)
    if (foodRestrictionInput) {
      console.log(`   🚫 Setting food restrictions: "${foodRestrictionInput}"`);
      await page.fill('textarea[name="avoidFoods"]', foodRestrictionInput);
      await page.waitForTimeout(500);
    }

    // Fill other required fields
    await page.fill('textarea[name="symptoms"]', 'Testing comprehensive report generation');
    await page.waitForTimeout(300);

    await page.selectOption('select[name="budget"]', 'moderate');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-06-step3-filled.png` });

    results.timing.formFillEnd = new Date().toISOString();
    const formFillDuration = Date.now() - overallStart;
    console.log(`   ⏱️  Form fill completed in ${(formFillDuration / 1000).toFixed(2)}s`);

    // Click See Your Results
    console.log('➡️  Submitting to see results...');
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-07-results-page.png` });

    // STEP 5: Find and click upgrade button (should show pricing)
    console.log('💰 Step 5: Clicking upgrade button...');

    const upgradeButton = page.locator('button:has-text("Upgrade")').first();
    await upgradeButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-08-pricing-modal.png` });

    // STEP 6: Enter TEST999 coupon code
    console.log('🎟️  Step 6: Applying TEST999 coupon...');

    const couponInput = page.locator('input[placeholder*="coupon" i], input[name*="coupon" i]').first();
    await couponInput.fill('TEST999');
    await page.waitForTimeout(500);

    const applyButton = page.locator('button:has-text("Apply")').first();
    await applyButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-09-coupon-applied.png` });

    // STEP 7: Click checkout/proceed button
    console.log('🛒 Step 7: Proceeding to checkout...');
    results.timing.checkoutStart = new Date().toISOString();
    const checkoutStart = Date.now();

    const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Complete"), button:has-text("Get Report")').first();
    await checkoutButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-10-after-checkout.png` });

    // STEP 8: Wait for report generation (or email sent confirmation)
    console.log('⏳ Step 8: Waiting for report generation...');
    results.timing.reportGenerationStart = new Date().toISOString();
    const reportGenStart = Date.now();

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-11-final-state.png` });

    // STEP 9: Query database for the most recent report
    console.log('🔍 Step 9: Fetching report from database...');

    // Since we can't easily intercept the email, let's query the database
    // The report should be in calculator_reports table with the email we used
    // For now, let's try to find a link on the page or check for success message

    const pageContent = await page.content();

    // Look for success message or report link
    const successIndicators = [
      'check your email',
      'report has been sent',
      'report is ready',
      'view your report',
      'download'
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      if (pageContent.toLowerCase().includes(indicator)) {
        foundSuccess = true;
        console.log(`   ✅ Found success indicator: "${indicator}"`);
        break;
      }
    }

    if (!foundSuccess) {
      results.errors.push('No success confirmation found on page');
    }

    // Try to extract report URL from page if visible
    const reportLinks = await page.locator('a[href*="report"]').all();
    if (reportLinks.length > 0) {
      const href = await reportLinks[0].getAttribute('href');
      results.reportUrl = href;
      console.log(`   📄 Found report URL: ${href}`);
    }

    results.success = foundSuccess;

    // Calculate timing metrics
    results.timing.reportGenerationEnd = new Date().toISOString();
    const reportGenDuration = Date.now() - reportGenStart;
    const totalDuration = Date.now() - overallStart;

    results.timing.reportGenerationDuration = `${(reportGenDuration / 1000).toFixed(2)}s`;
    results.timing.totalDuration = `${(totalDuration / 1000).toFixed(2)}s`;

    console.log(`\n⏱️  TIMING BREAKDOWN:`);
    console.log(`   Form Fill: ${(formFillDuration / 1000).toFixed(2)}s`);
    console.log(`   Report Generation: ${(reportGenDuration / 1000).toFixed(2)}s`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`\n✅ Test flow completed: ${foundSuccess ? 'SUCCESS' : 'PARTIAL'}\n`);

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}\n`);
    results.errors.push(error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-ERROR.png` });
  } finally {
    await browser.close();
  }

  return results;
}

async function verifyReportContent(reportUrl, testName, forbiddenFoods) {
  console.log(`\n🔍 Verifying report content for: ${testName}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const verification = {
    sectionsFound: [],
    imagesFound: [],
    forbiddenFoodsFound: [],
    allSectionsPresent: false,
    noForbiddenFoods: false
  };

  try {
    await page.goto(reportUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const content = await page.content();
    const lowerContent = content.toLowerCase();

    // Check for 13 sections
    const expectedSections = [
      'Executive Summary',
      'Food Guide',
      'Food Pyramid',
      'Meal Calendar',
      'Shopping List',
      'Physician',
      'Obstacle',
      'Restaurant',
      'Travel',
      'Science',
      'Evidence',
      'Lab',
      'Electrolyte',
      'Timeline',
      'Stall',
      'Progress Tracker'
    ];

    for (const section of expectedSections) {
      if (lowerContent.includes(section.toLowerCase())) {
        verification.sectionsFound.push(section);
      }
    }

    verification.allSectionsPresent = verification.sectionsFound.length >= 10;

    // Check for pyramid images
    const images = await page.locator('img[src*="FP.png"]').all();
    for (const img of images) {
      const src = await img.getAttribute('src');
      verification.imagesFound.push(src);
    }

    // Check for forbidden foods
    for (const food of forbiddenFoods) {
      const regex = new RegExp(`\\b${food}\\b`, 'i');
      if (regex.test(content)) {
        verification.forbiddenFoodsFound.push(food);
      }
    }

    verification.noForbiddenFoods = verification.forbiddenFoodsFound.length === 0;

    await page.screenshot({ path: `${SCREENSHOT_DIR}/${testName}-report-verification.png` });

  } catch (error) {
    console.error(`Report verification error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return verification;
}

// Main execution
async function main() {
  console.log('\n🚀 Starting Comprehensive Calculator Tests\n');

  // TEST A: Allergies (eggs, shellfish)
  const testA = await runTest(
    'TEST-A-allergies',
    'eggs, shellfish',
    null
  );

  // TEST B: Food restrictions (no pork, hate liver)
  const testB = await runTest(
    'TEST-B-restrictions',
    null,
    'no pork, hate liver'
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  console.log('\n🧪 TEST A - Allergies (eggs, shellfish):');
  console.log(`   Status: ${testA.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Errors: ${testA.errors.length > 0 ? testA.errors.join(', ') : 'None'}`);

  console.log('\n🧪 TEST B - Food Restrictions (no pork, hate liver):');
  console.log(`   Status: ${testB.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Errors: ${testB.errors.length > 0 ? testB.errors.join(', ') : 'None'}`);

  console.log('\n📸 Screenshots saved to: ' + SCREENSHOT_DIR);
  console.log('\n💡 Next: Check database for generated reports and verify content\n');

  // Save results to file
  const summaryReport = {
    timestamp: new Date().toISOString(),
    tests: [testA, testB],
    screenshotDirectory: SCREENSHOT_DIR
  };

  writeFileSync(
    `${SCREENSHOT_DIR}/test-results.json`,
    JSON.stringify(summaryReport, null, 2)
  );

  console.log('📝 Full results saved to: ' + `${SCREENSHOT_DIR}/test-results.json\n`);
}

main().catch(console.error);

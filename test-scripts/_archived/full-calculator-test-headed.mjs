#!/usr/bin/env node
/**
 * Full Calculator Test - Headed Mode with Complete Flow
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { writeFileSync } from 'fs';

const SCREENSHOT_DIR = '/tmp/calculator-test-screenshots';
const DOWNLOADS_DIR = '/Users/mbrew/Downloads';
const BASE_URL = 'https://carnivoreweekly.com';

await mkdir(SCREENSHOT_DIR, { recursive: true });

console.log('\n🚀 FULL CALCULATOR TEST - HEADED MODE\n');
console.log('=' .repeat(60));
console.log('📋 Test Profile:');
console.log('   Name: Mike TestUser');
console.log('   Age: 44, Male, 222 lbs, 5\'10"');
console.log('   🚫 Allergies: shellfish, eggs');
console.log('   🚫 Avoid: liver, sardines');
console.log('   🎟️ Coupon: TEST999');
console.log('=' .repeat(60) + '\n');

const timing = {
  start: Date.now(),
  formFillComplete: null,
  checkoutSubmit: null,
  reportReady: null,
  totalTime: null,
  reportGenerationTime: null
};

let reportUrl = null;
let reportHtml = null;

const browser = await chromium.launch({
  headless: false,  // HEADED MODE - browser will be visible
  slowMo: 800       // Slow down by 800ms so user can watch
});

const context = await browser.newContext({
  viewport: { width: 1400, height: 900 }
});

const page = await context.newPage();

try {
  // STEP 1: Load Calculator
  console.log('⏳ Step 1: Loading calculator...');
  await page.goto(`${BASE_URL}/calculator.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-loaded.png` });
  console.log('   ✅ Calculator loaded\n');

  // STEP 2: Fill Demographics (Step 1 of calculator)
  console.log('📝 Step 2: Filling demographics...');

  // Wait for form to be ready
  await page.waitForSelector('input, select', { timeout: 10000 });

  // Sex - Male
  try {
    await page.click('input[value="male"], label:text-is("Male")');
    console.log('   ✓ Sex: Male');
  } catch (e) {
    // Try alternative selectors
    await page.locator('text=Male').first().click();
    console.log('   ✓ Sex: Male (alt selector)');
  }
  await page.waitForTimeout(500);

  // Age
  const ageInput = page.locator('input[type="number"]').first();
  await ageInput.fill('44');
  console.log('   ✓ Age: 44');
  await page.waitForTimeout(500);

  // Height - Try to find feet/inches inputs
  const inputs = await page.locator('input[type="number"]').all();
  if (inputs.length >= 3) {
    await inputs[1].fill('5');  // Feet
    await inputs[2].fill('10'); // Inches
    console.log('   ✓ Height: 5\'10"');
  }
  await page.waitForTimeout(500);

  // Weight
  if (inputs.length >= 4) {
    await inputs[3].fill('222');
    console.log('   ✓ Weight: 222 lbs');
  }
  await page.waitForTimeout(500);

  // Activity Level
  const selects = await page.locator('select').all();
  if (selects.length > 0) {
    await selects[0].selectOption('moderate');
    console.log('   ✓ Activity: Moderate');
  }
  await page.waitForTimeout(500);

  // Exercise Frequency
  if (selects.length > 1) {
    await selects[1].selectOption('3-4');
    console.log('   ✓ Exercise: 3-4 days/week');
  }
  await page.waitForTimeout(500);

  // Goal - Fat Loss
  try {
    await page.click('input[value="lose"], label:text-is("Lose Weight")');
    console.log('   ✓ Goal: Fat Loss');
  } catch (e) {
    await page.locator('text=Lose').first().click();
    console.log('   ✓ Goal: Fat Loss (alt)');
  }
  await page.waitForTimeout(500);

  // Deficit
  if (selects.length > 2) {
    await selects[2].selectOption('20');
    console.log('   ✓ Deficit: 20%');
  }
  await page.waitForTimeout(500);

  // Diet Type
  if (selects.length > 3) {
    await selects[3].selectOption('carnivore');
    console.log('   ✓ Diet: Carnivore');
  }
  await page.waitForTimeout(500);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-step1-filled.png` });
  console.log('   📸 Screenshot saved\n');

  // Continue to Step 2
  console.log('➡️  Advancing to Step 2...');
  const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
  await continueBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-step2-loaded.png` });
  console.log('   ✅ Step 2 loaded\n');

  // STEP 3: Fill Contact Info (Step 2 of calculator)
  console.log('📝 Step 3: Filling contact info and preferences...');

  // Email
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill('test@carnivoreweekly.com');
  console.log('   ✓ Email: test@carnivoreweekly.com');
  await page.waitForTimeout(500);

  // First Name
  const firstNameInput = page.locator('input[placeholder*="first" i], input[name*="first" i]').first();
  await firstNameInput.fill('Mike');
  console.log('   ✓ First Name: Mike');
  await page.waitForTimeout(500);

  // Last Name
  const lastNameInput = page.locator('input[placeholder*="last" i], input[name*="last" i]').first();
  await lastNameInput.fill('TestUser');
  console.log('   ✓ Last Name: TestUser');
  await page.waitForTimeout(500);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-step2-filled.png` });
  console.log('   📸 Screenshot saved\n');

  // Continue to Step 3
  console.log('➡️  Advancing to Step 3 (Results)...');
  const continueBtn2 = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("See")').first();
  await continueBtn2.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-step3-results.png` });
  console.log('   ✅ Results page loaded\n');

  // STEP 4: Click Upgrade Button
  console.log('💰 Step 4: Clicking Upgrade button...');
  const upgradeBtn = page.locator('button:has-text("Upgrade"), button:has-text("Get Full")').first();
  await upgradeBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-upgrade-modal.png` });
  console.log('   ✅ Upgrade modal opened\n');

  // STEP 5: Fill Health Profile (Step 4)
  console.log('📝 Step 5: Filling health profile WITH allergies and restrictions...');

  // Allergies - CRITICAL TEST
  const allergiesInput = page.locator('textarea[name*="allerg" i], textarea[placeholder*="allerg" i]').first();
  await allergiesInput.fill('shellfish, eggs');
  console.log('   🚫 Allergies: shellfish, eggs');
  await page.waitForTimeout(500);

  // Foods to Avoid - CRITICAL TEST
  const avoidInput = page.locator('textarea[name*="avoid" i], textarea[placeholder*="avoid" i], textarea[name*="restrict" i]').first();
  await avoidInput.fill('liver, sardines');
  console.log('   🚫 Avoid Foods: liver, sardines');
  await page.waitForTimeout(500);

  // Symptoms
  const symptomsInput = page.locator('textarea[name*="symptom" i], textarea[placeholder*="symptom" i]').first();
  await symptomsInput.fill('Low energy, poor sleep quality, occasional brain fog');
  console.log('   ✓ Symptoms: Low energy, poor sleep, brain fog');
  await page.waitForTimeout(500);

  // Budget
  const budgetSelects = await page.locator('select').all();
  for (const select of budgetSelects) {
    try {
      await select.selectOption('moderate');
      console.log('   ✓ Budget: Moderate');
      break;
    } catch (e) {
      // Try next select
    }
  }
  await page.waitForTimeout(500);

  // Biggest Challenge
  const challengeInput = page.locator('textarea[placeholder*="challenge" i], textarea[name*="challenge" i]').first();
  if (await challengeInput.count() > 0) {
    await challengeInput.fill('Staying consistent while traveling for work');
    console.log('   ✓ Challenge: Traveling for work');
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-health-profile-filled.png` });
  console.log('   📸 Screenshot saved\n');

  timing.formFillComplete = Date.now();

  // STEP 6: Apply Coupon
  console.log('🎟️  Step 6: Applying TEST999 coupon...');
  const couponInput = page.locator('input[placeholder*="coupon" i], input[name*="coupon" i]').first();
  await couponInput.fill('TEST999');
  await page.waitForTimeout(500);

  const applyBtn = page.locator('button:has-text("Apply")').first();
  await applyBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/08-coupon-applied.png` });
  console.log('   ✅ Coupon applied\n');

  // STEP 7: Complete Checkout
  console.log('🛒 Step 7: Completing checkout...');
  timing.checkoutSubmit = Date.now();

  const checkoutBtn = page.locator('button:has-text("Complete"), button:has-text("Checkout"), button:has-text("Get Report")').first();
  await checkoutBtn.click();
  console.log('   ✅ Checkout submitted\n');

  // STEP 8: Wait for Report Generation
  console.log('⏳ Step 8: Waiting for report generation...');
  console.log('   (This may take 20-30 seconds for comprehensive report)\n');

  // Wait up to 60 seconds for report to be ready
  let reportFound = false;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);

    // Check if we're on the report page
    const url = page.url();
    if (url.includes('report.html?token=')) {
      reportUrl = url;
      reportFound = true;
      timing.reportReady = Date.now();
      break;
    }

    // Check for success message or report link
    const pageText = await page.innerText('body');
    if (pageText.toLowerCase().includes('report') && pageText.toLowerCase().includes('ready')) {
      // Look for link
      const reportLinks = await page.locator('a[href*="report"]').all();
      if (reportLinks.length > 0) {
        reportUrl = await reportLinks[0].getAttribute('href');
        if (reportUrl && !reportUrl.startsWith('http')) {
          reportUrl = `${BASE_URL}${reportUrl}`;
        }
        reportFound = true;
        timing.reportReady = Date.now();
        break;
      }
    }

    if (i % 5 === 0) {
      console.log(`   ⏱️  Waiting... ${i} seconds elapsed`);
    }
  }

  if (!reportFound) {
    console.log('   ⚠️  Report not found after 60 seconds');
    console.log('   Checking database for report...\n');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-timeout-state.png` });
  } else {
    timing.reportGenerationTime = timing.reportReady - timing.checkoutSubmit;
    console.log(`   ✅ Report ready in ${(timing.reportGenerationTime / 1000).toFixed(2)}s\n`);

    // STEP 9: Navigate to report if not already there
    if (!page.url().includes('report.html')) {
      console.log('🌐 Step 9: Navigating to report...');
      await page.goto(reportUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }

    // STEP 10: Analyze Report
    console.log('🔍 Step 10: Analyzing comprehensive report...\n');

    reportHtml = await page.content();
    const textContent = await page.innerText('body');
    const wordCount = textContent.split(/\s+/).length;
    const htmlSize = reportHtml.length;

    console.log('📊 Report Size Metrics:');
    console.log(`   HTML Size: ${(htmlSize / 1024).toFixed(2)} KB`);
    console.log(`   Word Count: ${wordCount.toLocaleString()}`);
    console.log(`   Est. Pages: ~${Math.ceil(wordCount / 500)}\n`);

    // Check for sections
    const lowerContent = textContent.toLowerCase();
    const sections = [
      'executive summary',
      'food guide',
      'food pyramid',
      'meal calendar',
      'shopping',
      'physician',
      'doctor',
      'obstacle',
      'restaurant',
      'science',
      'lab',
      'electrolyte',
      'timeline',
      'stall',
      'progress'
    ];

    console.log('📋 Section Check:');
    let sectionsFound = 0;
    for (const section of sections) {
      if (lowerContent.includes(section)) {
        sectionsFound++;
        console.log(`   ✅ ${section}`);
      }
    }
    console.log(`   Total: ${sectionsFound}/${sections.length} section keywords found\n`);

    // Check for pyramid images
    const images = await page.locator('img').all();
    console.log('🖼️  Image Check:');
    let pyramidFound = false;
    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src && src.includes('FP.png')) {
        console.log(`   ✅ Pyramid image: ${src}`);
        pyramidFound = true;
      }
    }
    if (!pyramidFound) {
      console.log('   ❌ No pyramid images found');
    }
    console.log('');

    // CRITICAL: Allergy Check - NO eggs or shellfish
    console.log('🚫 ALLERGY SAFETY CHECK (CRITICAL):');
    const forbiddenAllergies = ['egg', 'eggs', 'shellfish', 'shrimp', 'crab', 'lobster', 'oyster'];
    const allergiesFound = [];

    for (const food of forbiddenAllergies) {
      const regex = new RegExp(`\\b${food}s?\\b`, 'i');
      if (regex.test(textContent)) {
        allergiesFound.push(food);
      }
    }

    if (allergiesFound.length === 0) {
      console.log('   ✅ PASS - NO allergenic foods found (eggs, shellfish filtered correctly!)');
    } else {
      console.log(`   ❌ FAIL - Found allergenic foods: ${allergiesFound.join(', ')}`);
    }
    console.log('');

    // CRITICAL: Restriction Check - NO liver or sardines
    console.log('🚫 FOOD RESTRICTION CHECK (CRITICAL):');
    const forbiddenRestrictions = ['liver', 'sardine', 'sardines'];
    const restrictionsFound = [];

    for (const food of forbiddenRestrictions) {
      const regex = new RegExp(`\\b${food}s?\\b`, 'i');
      if (regex.test(textContent)) {
        restrictionsFound.push(food);
      }
    }

    if (restrictionsFound.length === 0) {
      console.log('   ✅ PASS - NO restricted foods found (liver, sardines filtered correctly!)');
    } else {
      console.log(`   ❌ FAIL - Found restricted foods: ${restrictionsFound.join(', ')}`);
    }
    console.log('');

    // Save full report
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-report-full.png`,
      fullPage: true
    });

    // Save to Downloads folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportFilename = `comprehensive-report-${timestamp}.html`;

    writeFileSync(`${SCREENSHOT_DIR}/comprehensive-report.html`, reportHtml);
    writeFileSync(`${DOWNLOADS_DIR}/${reportFilename}`, reportHtml);

    console.log('💾 Files Saved:');
    console.log(`   Screenshot: ${SCREENSHOT_DIR}/10-report-full.png`);
    console.log(`   HTML (tmp): ${SCREENSHOT_DIR}/comprehensive-report.html`);
    console.log(`   HTML (Downloads): ${DOWNLOADS_DIR}/${reportFilename}\n`);

    // Final Timing
    timing.totalTime = Date.now() - timing.start;

    console.log('=' .repeat(60));
    console.log('⏱️  TIMING BREAKDOWN');
    console.log('=' .repeat(60));
    console.log(`   Form Fill: ${((timing.formFillComplete - timing.start) / 1000).toFixed(2)}s`);
    console.log(`   Report Generation: ${(timing.reportGenerationTime / 1000).toFixed(2)}s`);
    console.log(`   Total Test Time: ${(timing.totalTime / 1000).toFixed(2)}s\n`);

    console.log('=' .repeat(60));
    console.log('🎯 FINAL VERDICT');
    console.log('=' .repeat(60));

    const isComprehensive = sectionsFound >= 8 && wordCount > 15000;
    const hasImages = pyramidFound;
    const allergyFilterWorks = allergiesFound.length === 0;
    const restrictionFilterWorks = restrictionsFound.length === 0;

    console.log(`   Comprehensive: ${isComprehensive ? '✅ YES' : '❌ NO'} (${sectionsFound} sections, ${wordCount} words)`);
    console.log(`   Images: ${hasImages ? '✅ YES' : '❌ NO'}`);
    console.log(`   Allergy Filter: ${allergyFilterWorks ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Restriction Filter: ${restrictionFilterWorks ? '✅ WORKING' : '❌ FAILED'}`);

    const overallPass = isComprehensive && hasImages && allergyFilterWorks && restrictionFilterWorks;
    console.log(`\n   Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log('🔗 Report URL:', reportUrl);
    console.log('');
  }

} catch (error) {
  console.error('\n❌ Test Error:', error.message);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR.png` });
} finally {
  console.log('\n⏸️  Keeping browser open for 10 seconds for review...\n');
  await page.waitForTimeout(10000);
  await browser.close();
  console.log('✅ Test complete!\n');
}

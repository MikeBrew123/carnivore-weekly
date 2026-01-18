#!/usr/bin/env node
/**
 * Real User Flow Test - Use actual webpage like a real user
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'https://carnivoreweekly.com/calculator.html';
const DOWNLOADS = '/Users/mbrew/Downloads';
const timestamp = Date.now();

console.log('\n🧪 REAL USER FLOW TEST\n');
console.log('='.repeat(60));

const browser = await chromium.launch({
  headless: false,
  slowMo: 300
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 }
});

const page = await context.newPage();

// Capture console logs and errors
page.on('console', msg => {
  const type = msg.type();
  if (type === 'error' || type === 'warning') {
    console.log(`   [BROWSER ${type.toUpperCase()}]:`, msg.text());
  }
});

page.on('pageerror', error => {
  console.log(`   [PAGE ERROR]: ${error.message}`);
});

try {
  // Open calculator
  console.log('\n📂 Opening calculator...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('   ✅ Page loaded');

  // STEP 1: Demographics
  console.log('\n📝 Step 1: Demographics');

  await page.click('input[name="sex"][value="male"]');
  console.log('   ✅ Sex: Male');

  await page.fill('input[name="age"]', '44');
  console.log('   ✅ Age: 44');

  await page.fill('input[name="weight"]', '222');
  console.log('   ✅ Weight: 222');

  await page.fill('input[name="heightFeet"]', '6');
  await page.fill('input[name="heightInches"]', '0');
  console.log('   ✅ Height: 6\'0"');

  await page.click('button:has-text("Continue to Next Step")');
  console.log('   ✅ Continue clicked');
  await page.waitForTimeout(2000);

  // STEP 2: Activity & Goals
  console.log('\n📝 Step 2: Activity & Goals');

  await page.selectOption('select[name="lifestyle"]', 'moderate');
  console.log('   ✅ Lifestyle: Moderate');

  await page.selectOption('select[name="exercise"]', '3-4');
  console.log('   ✅ Exercise: 3-4 days/week');

  // Click first goal radio (should be "lose")
  const goalRadios = await page.locator('input[name="goal"]').all();
  if (goalRadios.length > 0) {
    await goalRadios[0].click();
    console.log('   ✅ Goal: Weight loss');
  }

  // CRITICAL: Fill deficit field (was missing!)
  await page.selectOption('select[name="deficit"]', '15');
  console.log('   ✅ Deficit: 15% (Moderate)');

  await page.selectOption('select[name="diet"]', 'carnivore');
  console.log('   ✅ Diet: Carnivore');

  await page.click('button:has-text("See Your Results")');
  console.log('   ✅ See Results clicked');
  await page.waitForTimeout(2000);

  // STEP 3: Check what page we're on
  console.log('\n📝 Step 3: Checking current page...');

  const currentElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      placeholder: el.placeholder
    }));
  });

  console.log('   Found', currentElements.length, 'elements');

  // Check for email input (contact page)
  const hasEmail = currentElements.some(el => el.type === 'email');
  const hasTextarea = currentElements.some(el => el.tag === 'TEXTAREA');
  const hasUpgradeButton = await page.locator('button:has-text("Upgrade")').count() > 0;

  if (hasEmail) {
    // Contact info step
    console.log('\n📝 Contact Info Step');

    await page.fill('input[type="email"]', 'test@carnivoreweekly.com');
    console.log('   ✅ Email entered');

    const textInputs = await page.locator('input[type="text"]').all();
    if (textInputs.length >= 2) {
      await textInputs[0].fill('Test');
      await textInputs[1].fill('User');
      console.log('   ✅ Name: Test User');
    }

    await page.click('button:has-text("Continue")');
    console.log('   ✅ Continue clicked');
    await page.waitForTimeout(2000);
  }

  // Check for upgrade button (results page)
  const upgradeCount = await page.locator('button:has-text("Upgrade")').count();
  if (upgradeCount > 0) {
    console.log('\n📊 Results Page');
    await page.click('button:has-text("Upgrade")');
    console.log('   ✅ Upgrade clicked');
    await page.waitForTimeout(2000);

    // Pricing modal should appear - look for $9.99 Complete Protocol Bundle
    console.log('\n💰 Pricing Modal');
    const bundleButtons = await page.locator('button:has-text("$9.99"), button:has-text("Complete Protocol")').all();
    if (bundleButtons.length > 0) {
      await bundleButtons[0].click();
      console.log('   ✅ Selected $9.99 Complete Protocol Bundle');
      await page.waitForTimeout(2000);
    } else {
      // Fallback: Click first "Choose Plan" button
      const choosePlan = await page.locator('button:has-text("Choose Plan")').first();
      await choosePlan.click();
      console.log('   ✅ Selected plan (fallback)');
      await page.waitForTimeout(2000);
    }
  }

  // STEP 4: Checkout with Coupon
  console.log('\n💳 Step 4: Checkout');

  // Check if we're at checkout (email + coupon inputs)
  const emailInput = await page.locator('input[type="email"]').first();
  const couponInput = await page.locator('input[placeholder*="coupon" i]').first();

  if (await emailInput.isVisible()) {
    await emailInput.fill('test@carnivoreweekly.com');
    console.log('   ✅ Email: test@carnivoreweekly.com');

    await couponInput.fill('TEST999');
    console.log('   ✅ Coupon: TEST999');

    await page.click('button:has-text("Apply")');
    console.log('   ✅ Apply clicked');
    await page.waitForTimeout(2000);

    // Click payment button (should be $0 after coupon)
    const payButton = await page.locator('button:has-text("Pay"), button:has-text("Complete"), button:has-text("Proceed")').first();
    await payButton.click();
    console.log('   ✅ Payment submitted');
    await page.waitForTimeout(3000);
  }

  // STEP 5: Payment Success → Health Profile
  console.log('\n✅ Step 5: Payment Success');

  await page.screenshot({ path: `${DOWNLOADS}/step5-payment-success.png` });

  // Click "Continue to Health Profile" button
  const healthProfileBtn = await page.locator('button:has-text("Continue to Health Profile"), button:has-text("Health Profile")').first();
  if (await healthProfileBtn.isVisible().catch(() => false)) {
    await healthProfileBtn.click();
    console.log('   ✅ Continue to Health Profile clicked');
    await page.waitForTimeout(2000);
  }

  // STEP 6: Health Profile with ALLERGIES
  console.log('\n📝 Step 6: Health Profile');
  console.log('   🚫 Adding allergies: shellfish, eggs');
  console.log('   🚫 Adding restrictions: liver, sardines');

  await page.screenshot({ path: `${DOWNLOADS}/step6-health-profile-top.png` });

  // DEBUG: Check all form fields and their required status
  const formDebug = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    return inputs.map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      required: el.required,
      value: el.value?.substring(0, 30),
      placeholder: el.placeholder,
      visible: el.offsetParent !== null
    })).filter(el => el.visible);
  });

  console.log('\n   📋 Form Fields Status:');
  const requiredFields = formDebug.filter(f => f.required);
  const emptyRequired = requiredFields.filter(f => !f.value || f.value === '');

  if (emptyRequired.length > 0) {
    console.log(`   ⚠️  ${emptyRequired.length} REQUIRED fields are empty:`);
    emptyRequired.forEach(f => {
      console.log(`      - ${f.tag} ${f.name || f.placeholder || f.type}`);
    });
  } else {
    console.log(`   ✅ All ${requiredFields.length} required fields filled`);
  }

  const textareas = await page.locator('textarea').all();
  const textInputs = await page.locator('input[type="text"]').all();
  console.log(`   Found ${textareas.length} textareas and ${textInputs.length} text inputs\n`);

  // Find allergy and restriction fields by label or placeholder
  const allergyField = await page.locator('textarea[placeholder*="allergi" i], textarea').nth(textareas.length >= 4 ? 3 : 0);
  const restrictionField = await page.locator('textarea[placeholder*="avoid" i], textarea[placeholder*="restrict" i], textarea').nth(textareas.length >= 5 ? 4 : 1);

  // Use .pressSequentially() instead of .fill() to trigger React onChange events
  try {
    await allergyField.click();
    await allergyField.clear();
    await allergyField.pressSequentially('shellfish, eggs', { delay: 50 });
    console.log('   ✅ Allergies entered (with onChange events)');
  } catch (e) {
    console.log('   ⚠️  Could not fill allergies:', e.message);
  }

  try {
    await restrictionField.click();
    await restrictionField.clear();
    await restrictionField.pressSequentially('liver, sardines', { delay: 50 });
    console.log('   ✅ Restrictions entered (with onChange events)');
  } catch (e) {
    console.log('   ⚠️  Could not fill restrictions:', e.message);
  }

  // Scroll to bottom to find submit button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  await page.screenshot({ path: `${DOWNLOADS}/step6-health-profile-bottom.png`, fullPage: true });

  // DEBUG: Find exact button text
  const buttonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons
      .filter(btn => btn.offsetParent !== null) // Only visible
      .map(btn => ({
        text: btn.textContent?.trim(),
        type: btn.type,
        disabled: btn.disabled,
        className: btn.className
      }));
  });

  console.log('   📍 Visible buttons on page:');
  buttonInfo.forEach((btn, i) => {
    console.log(`      ${i + 1}. "${btn.text}" (type: ${btn.type}, disabled: ${btn.disabled})`);
  });

  const submitButtonText = buttonInfo.find(btn =>
    btn.text?.includes('Generate') || btn.text?.includes('Protocol') || btn.text?.includes('Create')
  )?.text;

  if (submitButtonText) {
    console.log(`   🎯 Target button: "${submitButtonText}"\n`);
  }

  // Give React time to update state after filling fields
  await page.waitForTimeout(1000);

  // Set up network listener BEFORE clicking
  let apiCallDetected = false;
  const responsePromise = page.waitForResponse(
    resp => {
      if (resp.url().includes('/api/v1/calculator/report/init')) {
        apiCallDetected = true;
        return true;
      }
      return false;
    },
    { timeout: 10000 }
  ).catch(() => null);

  // Try multiple methods to trigger React form submission
  console.log('   🔄 Attempting form submission...');

  // Method 1: Click by exact text match
  if (submitButtonText) {
    try {
      await Promise.all([
        responsePromise,
        page.locator(`button:has-text("${submitButtonText}")`).click()
      ]);
      console.log(`   ✅ Clicked "${submitButtonText}" button`);
      await page.waitForTimeout(3000);

      if (apiCallDetected) {
        console.log('   ✅ API call detected immediately after click!');
      }
    } catch (e) {
      console.log(`   ⚠️  Click failed: ${e.message}`);
    }
  }

  // Wait for report API call and generation
  console.log('\n⏳ Waiting for report generation...\n');

  const startTime = Date.now();
  let reportUrl = '';
  let reportFound = false;
  let apiCalled = false;

  // Listen for /report/init API call
  const reportInitPromise = page.waitForResponse(
    resp => resp.url().includes('/api/v1/calculator/report/init'),
    { timeout: 30000 }
  ).then(() => {
    apiCalled = true;
    console.log('   ✅ Report generation API called');
    return true;
  }).catch(() => {
    console.log('   ⚠️  No /report/init API call detected in 30s');
    return false;
  });

  // Wait for either API call or timeout
  await Promise.race([
    reportInitPromise,
    page.waitForTimeout(30000)
  ]);

  if (!apiCalled) {
    console.log('   ❌ Form submission did not trigger API call');
    console.log('   Current URL:', page.url());
  }

  // Now wait for redirect to report page
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);

    const url = page.url();
    if (url.includes('report.html')) {
      reportUrl = url;
      reportFound = true;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ REPORT GENERATED in ${elapsed}s!`);
      console.log(`📄 URL: ${url}`);
      break;
    }

    if (i % 10 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s elapsed...`);
    }
  }

  // If no auto-redirect, check if report was generated and manually navigate
  if (!reportFound) {
    console.log('\n⚠️  No auto-redirect after 30s');
    console.log('Current URL:', page.url());

    // Extract session ID from URL
    const currentUrl = page.url();
    const sessionMatch = currentUrl.match(/session_id=([a-f0-9-]+)/);

    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      console.log(`Session ID: ${sessionId}`);
      console.log('Checking if report was generated in background...');

      // Try navigating to potential report URL (will fail if doesn't exist)
      // The actual token would be in the database - we'll let the page handle it
      await page.waitForTimeout(5000); // Give report more time to generate

      // Reload to see if redirect happens now
      await page.reload();
      await page.waitForTimeout(3000);

      const newUrl = page.url();
      if (newUrl.includes('report.html')) {
        reportUrl = newUrl;
        reportFound = true;
        console.log(`\n✅ REPORT FOUND after reload!`);
        console.log(`📄 URL: ${newUrl}`);
      }
    }
  }

  if (!reportFound) {
    console.log('\n❌ REPORT NOT GENERATED - Test Failed');
    await browser.close();
    process.exit(1);
  }

  // Analyze report
  console.log('\n🔍 Analyzing Report...\n');

  await page.waitForTimeout(2000);

  const htmlContent = await page.content();
  const textContent = await page.innerText('body');

  // Save files
  const htmlFile = `${DOWNLOADS}/report-real-user-${timestamp}.html`;
  const pdfFile = `${DOWNLOADS}/report-real-user-${timestamp}.pdf`;

  writeFileSync(htmlFile, htmlContent);
  console.log(`💾 Saved HTML: ${htmlFile}`);

  await page.pdf({
    path: pdfFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' }
  });
  console.log(`💾 Saved PDF: ${pdfFile}`);

  // Analysis
  const htmlSize = htmlContent.length;
  const wordCount = textContent.split(/\s+/).length;

  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORT ANALYSIS');
  console.log('='.repeat(60));

  console.log('\n📏 SIZE:');
  console.log(`   HTML: ${(htmlSize / 1024).toFixed(2)} KB`);
  console.log(`   Words: ${wordCount.toLocaleString()}`);
  console.log(`   Pages: ~${Math.ceil(wordCount / 500)}`);

  // Section count
  console.log('\n📋 SECTIONS:');
  let sectionCount = 0;
  for (let i = 1; i <= 13; i++) {
    if (textContent.includes(`Report #${i}`)) {
      sectionCount++;
      console.log(`   ✅ Report #${i}`);
    } else {
      console.log(`   ❌ Report #${i} MISSING`);
    }
  }
  console.log(`\n   Total: ${sectionCount}/13`);

  // CRITICAL: Allergy check
  console.log('\n🚫 ALLERGY SAFETY CHECK:');
  const allergies = ['egg', 'eggs', 'shellfish', 'shrimp', 'crab', 'lobster', 'oyster'];
  const foundAllergies = [];

  for (const food of allergies) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'gi');
    if (regex.test(textContent)) {
      foundAllergies.push(food);
    }
  }

  if (foundAllergies.length === 0) {
    console.log('   ✅ PASS - NO allergenic foods');
  } else {
    console.log(`   ❌ FAIL - Found: ${foundAllergies.join(', ')}`);
  }

  // CRITICAL: Restriction check
  console.log('\n🚫 RESTRICTION CHECK:');
  const restrictions = ['liver', 'sardine', 'sardines'];
  const foundRestrictions = [];

  for (const food of restrictions) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'gi');
    if (regex.test(textContent)) {
      foundRestrictions.push(food);
    }
  }

  if (foundRestrictions.length === 0) {
    console.log('   ✅ PASS - NO restricted foods');
  } else {
    console.log(`   ❌ FAIL - Found: ${foundRestrictions.join(', ')}`);
  }

  // Final verdict
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL VERDICT');
  console.log('='.repeat(60));

  const isComprehensive = sectionCount >= 10 && wordCount > 15000;
  const allergyPass = foundAllergies.length === 0;
  const restrictionPass = foundRestrictions.length === 0;
  const overallPass = isComprehensive && allergyPass && restrictionPass;

  console.log(`\n   📄 Comprehensive: ${isComprehensive ? '✅ YES' : '❌ NO'}`);
  console.log(`   🚫 Allergy Filter: ${allergyPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   🚫 Restriction Filter: ${restrictionPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\n   🏁 Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n📁 FILES:');
  console.log(`   ${htmlFile}`);
  console.log(`   ${pdfFile}`);

  console.log('\n' + '='.repeat(60));
  console.log(overallPass ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(60) + '\n');

  console.log('🎬 Browser stays open for 30s for review...');
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  await page.screenshot({ path: `${DOWNLOADS}/error-${timestamp}.png` });
  await page.waitForTimeout(10000);
} finally {
  await browser.close();
  console.log('\n✅ Test complete\n');
}

#!/usr/bin/env node
/**
 * Complete flow: Payment → Health Profile → Pause before Generate
 */

import { chromium } from 'playwright';
import os from 'os';

const screenshotDir = `${os.homedir()}/Downloads`;

console.log('\n🧪 COMPLETE FLOW TEST\n');
console.log('='.repeat(60));

const browser = await chromium.launch({
  headless: false,
  slowMo: 500
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 }
});

const page = await context.newPage();

// Set longer timeout for report generation
page.setDefaultTimeout(300000); // 5 minutes

try {
  // STEP 1: Open calculator
  console.log('\n📂 Opening calculator...');
  await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('   ✅ Page loaded');

  // STEP 2: Demographics
  console.log('\n📝 Step 1: Demographics');
  await page.click('input[name="sex"][value="male"]');
  await page.fill('input[name="age"]', '44');
  await page.fill('input[name="weight"]', '222');
  await page.fill('input[name="heightFeet"]', '6');
  await page.fill('input[name="heightInches"]', '0');
  console.log('   ✅ Demographics filled');

  await page.click('button:has-text("Continue to Next Step")');
  await page.waitForTimeout(2000);

  // STEP 3: Activity & Goals
  console.log('\n📝 Step 2: Activity & Goals');
  await page.selectOption('select[name="lifestyle"]', 'moderate');
  await page.selectOption('select[name="exercise"]', '3-4');

  const goalRadios = await page.locator('input[name="goal"]').all();
  if (goalRadios.length > 0) {
    await goalRadios[0].click();
  }

  await page.selectOption('select[name="deficit"]', '15');
  await page.selectOption('select[name="diet"]', 'keto');
  console.log('   ✅ Activity & Goals filled');

  await page.click('button:has-text("See Your Results")');
  await page.waitForTimeout(2000);

  // STEP 4: Results → Upgrade
  console.log('\n📊 Step 3: Results Page');
  await page.click('button:has-text("Upgrade")');
  console.log('   ✅ Upgrade clicked');
  await page.waitForTimeout(2000);

  // STEP 5: Pricing Modal → Select Plan
  console.log('\n💰 Pricing Modal');
  const choosePlan = await page.locator('button:has-text("Choose Plan")').first();
  await choosePlan.click();
  console.log('   ✅ Plan selected');
  await page.waitForTimeout(2000);

  // STEP 6: Checkout with TEST999 coupon
  console.log('\n💳 Step 4: Checkout');

  const emailInput = await page.locator('input[type="email"]').first();
  await emailInput.fill('test@carnivoreweekly.com');
  console.log('   ✅ Email: test@carnivoreweekly.com');

  const couponInput = await page.locator('input[placeholder*="coupon" i]').first();
  await couponInput.fill('TEST999');
  console.log('   ✅ Coupon: TEST999');

  await page.click('button:has-text("Apply")');
  console.log('   ✅ Apply clicked');
  await page.waitForTimeout(2000);

  const payButton = await page.locator('button:has-text("Pay"), button:has-text("Complete"), button:has-text("Proceed")').first();
  await payButton.click();
  console.log('   ✅ Payment submitted ($0 with coupon)');
  await page.waitForTimeout(3000);

  // 📸 Screenshot after payment
  await page.screenshot({ path: `${screenshotDir}/payment-success.png`, fullPage: true });
  console.log('   📸 Payment success page');

  // STEP 7: Payment Success → Continue to Health Profile
  console.log('\n✅ Step 5: Payment Success');
  const healthProfileBtn = await page.locator('button:has-text("Continue to Health Profile"), button:has-text("Health Profile")').first();
  await healthProfileBtn.click();
  console.log('   ✅ Continue to Health Profile clicked');
  await page.waitForTimeout(2000);

  // STEP 8: Fill Health Profile
  console.log('\n📝 Step 6: Health Profile');
  console.log('   Filling contact information...');

  // Email should already be filled
  const profileEmail = await page.locator('input[type="email"]').first();
  const emailValue = await profileEmail.inputValue();
  if (!emailValue || emailValue === '') {
    await profileEmail.fill('test@carnivoreweekly.com');
    console.log('   ✅ Email: test@carnivoreweekly.com');
  } else {
    console.log('   ✅ Email already filled');
  }

  // Fill name fields
  const textInputs = await page.locator('input[type="text"]').all();
  if (textInputs.length >= 2) {
    await textInputs[0].fill('Test');
    await textInputs[1].fill('User');
    console.log('   ✅ Name: Test User');
  }

  // Fill health fields
  console.log('   Filling health information...');

  const textareas = await page.locator('textarea').all();
  console.log(`   Found ${textareas.length} textareas`);

  if (textareas.length >= 1) {
    await textareas[0].click();
    await textareas[0].fill('Currently taking metformin for blood sugar');
    console.log('   ✅ Medications filled');
  }

  if (textareas.length >= 2) {
    await textareas[1].click();
    await textareas[1].fill('Low energy, brain fog, digestive issues');
    console.log('   ✅ Current symptoms filled');
  }

  if (textareas.length >= 3) {
    await textareas[2].click();
    await textareas[2].fill('eggs, shellfish');
    console.log('   ✅ Allergies: eggs, shellfish');
  }

  if (textareas.length >= 4) {
    await textareas[3].click();
    await textareas[3].fill('liver, sardines');
    console.log('   ✅ Foods to avoid: liver, sardines');
  }

  if (textareas.length >= 5) {
    await textareas[4].click();
    await textareas[4].fill('Tried keto before, lost weight but gained it back');
    console.log('   ✅ Diet history filled');
  }

  if (textareas.length >= 6) {
    await textareas[5].click();
    await textareas[5].fill('Keto worked for weight loss but hard to maintain');
    console.log('   ✅ What worked filled');
  }

  if (textareas.length >= 7) {
    await textareas[6].click();
    await textareas[6].fill('Stress eating in evenings, trouble sticking to meal plans');
    console.log('   ✅ Challenges filled');
  }

  if (textareas.length >= 8) {
    await textareas[7].click();
    await textareas[7].fill('Desk job, sedentary most of the day');
    console.log('   ✅ Lifestyle details filled');
  }

  // Check health conditions
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  if (checkboxes.length >= 3) {
    await checkboxes[0].check();
    await checkboxes[1].check();
    await checkboxes[2].check();
    console.log('   ✅ Selected 3 health conditions');
  }

  await page.waitForTimeout(1000);

  // Scroll to bottom to show the submit button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // 📸 Screenshot of filled health profile
  await page.screenshot({ path: `${screenshotDir}/health-profile-filled.png`, fullPage: true });
  console.log('   📸 Health profile filled');

  console.log('\n' + '='.repeat(60));
  console.log('🛑 PAUSED - Browser ready for manual click');
  console.log('='.repeat(60));
  console.log('\n✋ DO NOT CLOSE THIS WINDOW\n');
  console.log('Instructions:\n');
  console.log('   1. Click "Generate My Protocol" button');
  console.log('   2. Wait for report to load (30-60 seconds)');
  console.log('   3. Use Cmd+P to save as PDF to ~/Downloads/');
  console.log('   4. Verify the report manually:\n');
  console.log('📋 Verification checklist:');
  console.log('   [ ] NO eggs in shopping lists (all 4 weeks)');
  console.log('   [ ] NO shellfish anywhere (proteins, shopping, meals)');
  console.log('   [ ] NO liver or sardines (foods to avoid)');
  console.log('   [ ] Logo appears on title page');
  console.log('   [ ] Meal portions vary (not all 200g)\n');
  console.log('Press Ctrl+C when done to close the browser.\n');

  // Keep browser open for manual verification
  await page.waitForTimeout(600000); // 10 minutes

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  await page.screenshot({ path: `${screenshotDir}/ERROR-complete-flow.png`, fullPage: true });
  await page.waitForTimeout(10000);
} finally {
  console.log('\n✅ Closing browser...\n');
  await browser.close();
}

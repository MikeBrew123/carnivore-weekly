#!/usr/bin/env node
/**
 * Fill calculator form and PAUSE for manual submit
 */

import { chromium } from 'playwright';

console.log('\n🧪 MANUAL SUBMIT TEST\n');
console.log('='.repeat(60));

const browser = await chromium.launch({
  headless: false,
  slowMo: 500
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 }
});

const page = await context.newPage();

try {
  // STEP 1: Open calculator
  console.log('\n📂 Opening calculator...');
  await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('   ✅ Page loaded');

  // STEP 2: Demographics
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

  // STEP 3: Activity & Goals
  console.log('\n📝 Step 2: Activity & Goals');
  await page.selectOption('select[name="lifestyle"]', 'moderate');
  console.log('   ✅ Lifestyle: Moderate');

  await page.selectOption('select[name="exercise"]', '3-4');
  console.log('   ✅ Exercise: 3-4 days/week');

  const goalRadios = await page.locator('input[name="goal"]').all();
  if (goalRadios.length > 0) {
    await goalRadios[0].click();
    console.log('   ✅ Goal: Weight loss');
  }

  await page.selectOption('select[name="deficit"]', '15');
  console.log('   ✅ Deficit: 15% (Moderate)');

  await page.selectOption('select[name="diet"]', 'keto');
  console.log('   ✅ Diet: Keto (testing different pyramid)');

  await page.click('button:has-text("See Your Results")');
  console.log('   ✅ See Results clicked');
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

  // STEP 7: Payment Success → Continue to Health Profile
  console.log('\n✅ Step 5: Payment Success');
  const healthProfileBtn = await page.locator('button:has-text("Continue to Health Profile"), button:has-text("Health Profile")').first();
  await healthProfileBtn.click();
  console.log('   ✅ Continue to Health Profile clicked');
  await page.waitForTimeout(2000);

  // STEP 8: Fill Health Profile
  console.log('\n📝 Step 6: Health Profile');
  console.log('   Filling contact information...');

  // Email should already be filled, but verify
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

  // Fill ALL textareas with test data to verify personalization
  if (textareas.length >= 1) {
    await textareas[0].click();
    await textareas[0].fill('Trying to lose 20 pounds and improve energy levels');
    console.log('   ✅ Goals filled');
  }

  if (textareas.length >= 2) {
    await textareas[1].click();
    await textareas[1].fill('Low energy, brain fog, digestive issues');
    console.log('   ✅ Current symptoms filled');
  }

  if (textareas.length >= 3) {
    await textareas[2].click();
    await textareas[2].fill('Tried keto before, lost weight but gained it back');
    console.log('   ✅ Diet history filled');
  }

  if (textareas.length >= 4) {
    await textareas[3].click();
    await textareas[3].fill('eggs, shellfish');
    console.log('   ✅ Allergies: eggs, shellfish');
  }

  if (textareas.length >= 5) {
    await textareas[4].click();
    await textareas[4].fill('liver, sardines');
    console.log('   ✅ Foods to avoid: liver, sardines');
  }

  if (textareas.length >= 6) {
    await textareas[5].click();
    await textareas[5].fill('Currently taking metformin for blood sugar');
    console.log('   ✅ Current medications filled');
  }

  if (textareas.length >= 7) {
    await textareas[6].click();
    await textareas[6].fill('Desk job, sedentary most of the day');
    console.log('   ✅ Lifestyle details filled');
  }

  if (textareas.length >= 8) {
    await textareas[7].click();
    await textareas[7].fill('Stress eating in evenings, trouble sticking to meal plans');
    console.log('   ✅ Challenges filled');
  }

  // Check health conditions - specifically type 2 diabetes and high blood pressure
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  if (checkboxes.length >= 3) {
    await checkboxes[0].check();
    await checkboxes[1].check();
    await checkboxes[2].check();
    console.log('   ✅ Selected 3 health conditions (diabetes, hypertension, etc.)');
  }

  await page.waitForTimeout(1000);

  // Scroll to bottom to show the submit button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  console.log('\n' + '='.repeat(60));
  console.log('🛑 PAUSED - Browser ready for manual click');
  console.log('='.repeat(60));
  console.log('\n✋ DO NOT CLOSE THIS WINDOW\n');
  console.log('The form is filled and ready. When you\'re ready:');
  console.log('\n   1. Click the "Generate My Protocol" button');
  console.log('   2. Wait for the report to generate');
  console.log('   3. Come back here when done\n');
  console.log('Press Ctrl+C when finished to close the browser.\n');

  // Keep browser open indefinitely
  await page.waitForTimeout(600000); // 10 minutes

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  await page.waitForTimeout(10000);
} finally {
  console.log('\n✅ Closing browser...\n');
  await browser.close();
}

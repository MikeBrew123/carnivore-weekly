#!/usr/bin/env node
/**
 * Inspect DOM then fill calculator form - USING ACTUAL SELECTORS FOUND
 */

import { chromium } from 'playwright';

const URL = 'https://carnivoreweekly.com/calculator.html';

console.log('\n🧪 FILLING CALCULATOR WITH TEST DATA...\n');

const browser = await chromium.launch({
  headless: false,
  slowMo: 300
});

const context = await browser.newContext({
  viewport: { width: 1400, height: 900 }
});

const page = await context.newPage();

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // STEP 1: Demographics
  console.log('📝 Step 1: Demographics...');

  await page.click('input[name="sex"][value="male"]');
  await page.fill('input[name="age"]', '44');
  await page.fill('input[name="weight"]', '222');
  await page.fill('input[name="heightFeet"]', '6');
  await page.fill('input[name="heightInches"]', '0');

  // Activity level - inspect for actual selectors
  const activityInputs = await page.locator('input[type="radio"]').all();
  console.log(`   Found ${activityInputs.length} radio buttons`);

  // Goal - inspect for actual selectors
  const goalRadios = await page.locator('input[value*="lose"]').count();
  console.log(`   Found ${goalRadios} "lose" radio buttons`);

  if (goalRadios > 0) {
    await page.click('input[value*="lose"]');
  }

  console.log('✅ Step 1 filled');

  // Continue button
  await page.click('button:has-text("Continue to Next Step")');
  await page.waitForTimeout(2000);

  // STEP 2: Contact Info
  console.log('\n📝 Step 2: Contact Info...');

  const inputs2 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(input => ({
      type: input.type,
      name: input.name,
      placeholder: input.placeholder
    }));
  });
  console.log('   Inputs on Step 2:', inputs2);

  await page.fill('input[type="email"]', 'test@carnivoreweekly.com');

  // Try to find name fields
  const nameInputs = await page.locator('input[type="text"]').all();
  if (nameInputs.length >= 2) {
    await nameInputs[0].fill('Test');
    await nameInputs[1].fill('User');
  }

  console.log('✅ Step 2 filled');

  await page.click('button:has-text("Continue"), button:has-text("See")');
  await page.waitForTimeout(2000);

  // STEP 3: Results page
  console.log('\n📊 Step 3: Viewing Results...');

  const upgradeBtn = await page.locator('button:has-text("Upgrade")').count();
  if (upgradeBtn > 0) {
    await page.click('button:has-text("Upgrade")');
    await page.waitForTimeout(2000);
  }

  // STEP 4: Health Profile
  console.log('\n📝 Step 4: Health Profile...');

  const inputs4 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea')).map(input => ({
      type: input.type,
      name: input.name,
      placeholder: input.placeholder,
      tagName: input.tagName
    }));
  });
  console.log('   Inputs on Step 4:', inputs4);

  // Find allergy and avoid fields
  const textareas = await page.locator('textarea').all();
  if (textareas.length >= 2) {
    await textareas[0].fill('shellfish, eggs');
    await textareas[1].fill('liver, sardines');
  }

  console.log('✅ Step 4 filled');

  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(2000);

  // STEP 5: Coupon
  console.log('\n🎟️  Step 5: Applying coupon...');

  await page.fill('input[placeholder*="coupon" i], input[name*="coupon"]', 'TEST999');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(2000);

  console.log('✅ Coupon applied');

  // STEP 6: Checkout
  console.log('\n💳 Step 6: Completing checkout...');

  await page.click('button:has-text("Complete")');
  console.log('✅ Checkout submitted!');

  console.log('\n⏳ Waiting for report (max 120 seconds)...\n');

  const startTime = Date.now();
  let reportFound = false;

  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);

    const url = page.url();
    if (url.includes('report.html')) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n✅ REPORT GENERATED in ${elapsed}s!`);
      console.log('📄 URL:', url);
      reportFound = true;
      break;
    }

    if (i % 10 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s elapsed...`);
    }
  }

  if (!reportFound) {
    console.log('\n⚠️  Report not found after 120 seconds');
    console.log('Current URL:', page.url());
  }

  console.log('\n🎬 Browser stays open for 30s for review...');
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  await page.screenshot({ path: '/tmp/calculator-error.png' });
  await page.waitForTimeout(10000);
} finally {
  await browser.close();
  console.log('\n✅ Test complete\n');
}

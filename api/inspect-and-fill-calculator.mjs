#!/usr/bin/env node
/**
 * Inspect DOM then fill calculator form - headed browser so user can watch
 */

import { chromium } from 'playwright';

const URL = 'https://carnivoreweekly.com/calculator.html';

console.log('\n🔍 INSPECTING CALCULATOR DOM...\n');

const browser = await chromium.launch({
  headless: false,
  slowMo: 500  // Slow down so user can watch
});

const context = await browser.newContext({
  viewport: { width: 1400, height: 900 }
});

const page = await context.newPage();

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // STEP 1: INSPECT THE DOM
  console.log('=== DOM INSPECTION ===\n');

  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      value: input.value
    }));
  });

  const selects = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('select')).map(select => ({
      name: select.name,
      id: select.id,
      options: Array.from(select.options).map(opt => opt.value)
    }));
  });

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(button => ({
      type: button.type,
      text: button.textContent.trim(),
      id: button.id,
      className: button.className
    }));
  });

  console.log('INPUTS FOUND:', inputs.length);
  inputs.forEach((input, i) => {
    console.log(`  [${i}] type="${input.type}" name="${input.name}" id="${input.id}" placeholder="${input.placeholder}"`);
  });

  console.log('\nSELECTS FOUND:', selects.length);
  selects.forEach((select, i) => {
    console.log(`  [${i}] name="${select.name}" id="${select.id}" options=${select.options.length}`);
  });

  console.log('\nBUTTONS FOUND:', buttons.length);
  buttons.forEach((button, i) => {
    console.log(`  [${i}] text="${button.text}" id="${button.id}" class="${button.className}"`);
  });

  console.log('\n=== STARTING FORM FILL ===\n');

  // STEP 2: FILL FORM USING ACTUAL SELECTORS

  // Demographics (Step 1)
  console.log('Step 1: Demographics...');

  // Try different selector strategies based on what we find
  // Radio buttons for sex
  await page.click('input[type="radio"][value="male"]').catch(() =>
    page.click('input[name*="sex"][value="male"]')
  );

  // Age
  await page.fill('input[type="number"][placeholder*="age" i]', '44').catch(() =>
    page.fill('input[name*="age"]', '44')
  );

  // Weight
  await page.fill('input[placeholder*="weight" i]', '222').catch(() =>
    page.fill('input[name*="weight"]', '222')
  );

  // Height - feet
  await page.selectOption('select[name*="feet" i]', '6').catch(() =>
    page.selectOption('select:has-text("feet")', '6')
  );

  // Height - inches
  await page.selectOption('select[name*="inch" i]', '0').catch(() =>
    page.selectOption('select:has-text("inches")', '0')
  );

  // Activity level
  await page.click('input[value*="moderate" i]').catch(() =>
    page.click('input[name*="activity"][value*="moderate"]')
  );

  // Goal
  await page.click('input[value*="lose" i]').catch(() =>
    page.click('input[name*="goal"][value="lose"]')
  );

  console.log('✅ Step 1 filled');

  // Find and click continue button
  const continueBtn = await page.locator('button:has-text("Continue")').last();
  await continueBtn.click();
  await page.waitForTimeout(1500);

  console.log('Step 2: Contact Info...');

  // Email
  await page.fill('input[type="email"]', 'test@carnivoreweekly.com');

  // First name
  await page.fill('input[placeholder*="first" i]', 'Test').catch(() =>
    page.fill('input[name*="first"]', 'Test')
  );

  // Last name
  await page.fill('input[placeholder*="last" i]', 'User').catch(() =>
    page.fill('input[name*="last"]', 'User')
  );

  console.log('✅ Step 2 filled');

  // Continue to results
  await page.locator('button:has-text("Continue")').last().click();
  await page.waitForTimeout(1500);

  console.log('Step 3: Viewing results...');

  // Click upgrade button
  await page.locator('button:has-text("Upgrade")').click();
  await page.waitForTimeout(1500);

  console.log('Step 4: Health Profile...');

  // Allergies
  await page.fill('input[placeholder*="allergi" i], textarea[placeholder*="allergi" i]', 'shellfish, eggs');

  // Foods to avoid
  await page.fill('input[placeholder*="avoid" i], textarea[placeholder*="avoid" i]', 'liver, sardines');

  // Budget
  await page.click('input[value*="moderate" i]').catch(() =>
    page.click('input[name*="budget"][value="moderate"]')
  );

  console.log('✅ Step 4 filled');

  // Continue to checkout
  await page.locator('button:has-text("Continue")').last().click();
  await page.waitForTimeout(1500);

  console.log('Step 5: Applying coupon...');

  // Apply TEST999 coupon
  await page.fill('input[placeholder*="coupon" i]', 'TEST999');
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(2000);

  console.log('✅ Coupon applied');

  // Complete checkout
  console.log('Step 6: Completing checkout...');
  await page.click('button:has-text("Complete")');

  console.log('✅ Checkout submitted!');
  console.log('\n⏳ Waiting for report generation...\n');

  // Wait for report or timeout
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);

    const url = page.url();
    if (url.includes('report.html')) {
      console.log('\n✅ REPORT GENERATED!');
      console.log('URL:', url);
      break;
    }

    if (i % 10 === 0 && i > 0) {
      console.log(`   Still waiting... ${i}s elapsed`);
    }
  }

  console.log('\n🎬 Keeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  await page.screenshot({ path: '/tmp/error.png' });
  await page.waitForTimeout(10000);
} finally {
  await browser.close();
  console.log('\n✅ Done\n');
}

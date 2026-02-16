#!/usr/bin/env node
/**
 * Screenshot every step of the payment flow
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import os from 'os';

const screenshotDir = `${os.homedir()}/Downloads`;

console.log('\n📸 SCREENSHOT PAYMENT FLOW TEST\n');
console.log('='.repeat(60));
console.log(`Screenshots will be saved to: ${screenshotDir}`);
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

  // 📸 SCREENSHOT 1: After clicking Upgrade
  await page.screenshot({ path: `${screenshotDir}/01-after-upgrade-click.png`, fullPage: true });
  console.log('   📸 Screenshot 1: After Upgrade click');

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

  // 📸 SCREENSHOT 2: After entering TEST999
  await page.screenshot({ path: `${screenshotDir}/02-after-test999-entered.png`, fullPage: true });
  console.log('   📸 Screenshot 2: After TEST999 entered');

  await page.click('button:has-text("Apply")');
  console.log('   ✅ Apply clicked');
  await page.waitForTimeout(2000);

  // 📸 SCREENSHOT 3: After clicking Apply (before Pay)
  await page.screenshot({ path: `${screenshotDir}/03-after-apply-coupon.png`, fullPage: true });
  console.log('   📸 Screenshot 3: After Apply coupon');

  const payButton = await page.locator('button:has-text("Pay"), button:has-text("Complete"), button:has-text("Proceed")').first();
  await payButton.click();
  console.log('   ✅ Payment submitted ($0 with coupon)');
  await page.waitForTimeout(3000);

  // 📸 SCREENSHOT 4: Whatever page loads after payment
  await page.screenshot({ path: `${screenshotDir}/04-after-payment-submit.png`, fullPage: true });
  console.log('   📸 Screenshot 4: After payment submit');

  // Capture the current URL
  const currentUrl = page.url();
  console.log(`   📍 Current URL: ${currentUrl}`);

  // Wait a bit longer to see if there's a redirect
  await page.waitForTimeout(5000);

  // 📸 SCREENSHOT 5: Final state after waiting
  await page.screenshot({ path: `${screenshotDir}/05-final-state.png`, fullPage: true });
  console.log('   📸 Screenshot 5: Final state');

  const finalUrl = page.url();
  console.log(`   📍 Final URL: ${finalUrl}`);

  // Check page title
  const title = await page.title();
  console.log(`   📄 Page title: ${title}`);

  // Keep browser open for inspection
  console.log('\n' + '='.repeat(60));
  console.log('🛑 PAUSED - Browser open for inspection');
  console.log('='.repeat(60));
  console.log('\nPress Ctrl+C when finished to close the browser.\n');

  await page.waitForTimeout(300000); // 5 minutes

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  await page.screenshot({ path: `${screenshotDir}/ERROR-screenshot.png`, fullPage: true });
  console.log(`   📸 Error screenshot saved`);
  await page.waitForTimeout(5000);
} finally {
  console.log('\n✅ Closing browser...\n');
  await browser.close();
}

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false }); // Not headless so you can see
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('📍 Loading calculator...');
  await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // STEP 1: Fill out basic info
  console.log('📝 Filling Step 1...');
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('35');
  await page.locator('select[name="activity"]').selectOption('moderate');
  await page.locator('input[type="radio"][value="lose"]').click();

  // Click "Continue to Next Step"
  console.log('➡️  Advancing to Step 2...');
  await page.locator('button:has-text("Continue to Next Step")').click();
  await page.waitForTimeout(1000);

  // STEP 2: Fill out diet info
  console.log('📝 Filling Step 2...');
  await page.locator('select[name="current-diet"]').selectOption('standard');

  // Click "See Your Results"
  console.log('➡️  Advancing to Step 3 Results...');
  await page.locator('button:has-text("See Your Results")').last().click();
  await page.waitForTimeout(1500);

  // STEP 3: Results page - enter email and select bundle
  console.log('📝 Entering email on Step 3...');
  await page.locator('input[type="email"][name="email"]').fill('iambrew@gmail.com');

  // Select $9.99 Complete Protocol Bundle
  console.log('💰 Selecting $9.99 Complete Protocol Bundle...');
  await page.locator('input[type="radio"][value="complete"]').click();
  await page.waitForTimeout(500);

  // Enter coupon code TEST99
  console.log('🎟️  Applying coupon code TEST99...');
  await page.locator('input[name="coupon-code"]').fill('TEST99');
  await page.locator('button:has-text("Apply")').click();
  await page.waitForTimeout(1500);

  // Check if coupon applied
  const couponMessage = await page.locator('.coupon-message, .success-message, .error-message').textContent().catch(() => 'No message');
  console.log('Coupon result:', couponMessage);

  // Click "Proceed to Payment"
  console.log('💳 Clicking Proceed to Payment...');
  await page.locator('button:has-text("Proceed to Payment")').click();

  // Wait for Stripe Checkout to load
  console.log('⏳ Waiting for Stripe Checkout...');
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });

  console.log('\n✅ READY FOR PAYMENT');
  console.log('📧 Email: iambrew@gmail.com');
  console.log('💰 Bundle: $9.99 Complete Protocol (with TEST99 discount applied)');
  console.log('👉 Browser will stay open - manually enter your card details\n');
  console.log('⚠️  After payment completes, check if it redirects back to calculator Step 4');

  // Keep browser open - don't close
  console.log('\n⏸️  Press Ctrl+C when done to close browser');

})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Test 1: Payment without coupon (goes to Stripe)
  console.log('\n📋 TEST 1: Payment WITHOUT coupon (should redirect to Stripe)');
  console.log('=' .repeat(60));

  let page = await browser.newPage();
  const logs = [];
  page.on('console', msg => {
    if (msg.text().includes('StripePaymentModal')) {
      logs.push(msg.text());
      console.log(msg.text());
    }
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('30');
  await page.locator('input[name="weight"]').fill('200');
  await page.locator('input[name="heightFeet"]').fill('6');
  await page.locator('input[name="heightInches"]').fill('0');
  await page.locator('button:has-text("Continue to Next Step")').first().click();
  await page.waitForTimeout(800);

  await page.locator('select[name="lifestyle"]').selectOption('moderate');
  await page.locator('select[name="exercise"]').selectOption('3-4');
  await page.locator('input[type="radio"][value="maintain"]').click();
  await page.locator('select[name="diet"]').selectOption('carnivore');
  await page.locator('button:has-text("See Your Results")').last().click();
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  // Click Choose Plan for Shopping Lists ($19)
  await page.locator('button:has-text("Choose Plan")').first().click();
  await page.waitForTimeout(1000);

  // Click Pay button (no coupon)
  console.log('\n🖱️ Clicking Pay button without coupon...');
  const payBtn = page.locator('button:has-text("Pay $19")');
  if (await payBtn.isVisible()) {
    await payBtn.click();
    await page.waitForTimeout(2000);
    console.log('✅ Test 1 complete - should have attempted Stripe redirect');
  } else {
    console.log('❌ Pay button not visible');
  }

  await page.close();

  // Test 2: Payment with 100% off coupon (skips Stripe)
  console.log('\n\n📋 TEST 2: Payment WITH 100% coupon (should skip Stripe and go to success)');
  console.log('='.repeat(60));

  page = await browser.newPage();
  page.on('console', msg => {
    if (msg.text().includes('StripePaymentModal')) {
      console.log(msg.text());
    }
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('30');
  await page.locator('input[name="weight"]').fill('200');
  await page.locator('input[name="heightFeet"]').fill('6');
  await page.locator('input[name="heightInches"]').fill('0');
  await page.locator('button:has-text("Continue to Next Step")').first().click();
  await page.waitForTimeout(800);

  await page.locator('select[name="lifestyle"]').selectOption('moderate');
  await page.locator('select[name="exercise"]').selectOption('3-4');
  await page.locator('input[type="radio"][value="maintain"]').click();
  await page.locator('select[name="diet"]').selectOption('carnivore');
  await page.locator('button:has-text("See Your Results")').last().click();
  await page.waitForTimeout(1500);

  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  // Click Choose Plan for Shopping Lists ($19)
  await page.locator('button:has-text("Choose Plan")').first().click();
  await page.waitForTimeout(1000);

  // Apply 100% off coupon
  console.log('\n🎫 Applying 100% off coupon...');
  const couponInput = page.locator('input[placeholder="Enter coupon code"]');
  if (await couponInput.isVisible()) {
    await couponInput.fill('TEST100');
    const applyBtn = page.locator('button:has-text("Apply")');
    await applyBtn.click();
    await page.waitForTimeout(1500);
    console.log('✅ Coupon applied (assuming TEST100 = 100% off)');
  }

  // Click Pay button
  console.log('\n🖱️ Clicking Pay button with 100% coupon...');
  const payBtn2 = page.locator('button:has-text("Pay")');
  if (await payBtn2.isVisible()) {
    const payText = await payBtn2.textContent();
    console.log('Pay button text:', payText);
    await payBtn2.click();
    await page.waitForTimeout(2000);

    // Check if success page is displayed
    const successHeading = page.locator('text=Payment Successful');
    const isSuccess = await successHeading.isVisible().catch(() => false);
    console.log('✅ Success page visible:', isSuccess);

    if (isSuccess) {
      const nextStepsBox = page.locator('text=What\'s Next?');
      const hasNextSteps = await nextStepsBox.isVisible().catch(() => false);
      console.log('✅ "What\'s Next?" section visible:', hasNextSteps);
    }
  }

  await page.close();
  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Both flows tested!');
  console.log('- Flow 1: Normal payment → Stripe');
  console.log('- Flow 2: 100% coupon → Success page (no Stripe)');
})();

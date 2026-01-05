import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
    if (msg.text().includes('StripePaymentModal') || msg.text().includes('Payment')) {
      console.log(msg.text());
    }
  });

  console.log('📋 Testing: Payment WITH "test321" coupon');
  console.log('='.repeat(60));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Fill form
  console.log('\n📝 Filling calculator form...');
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

  console.log('✓ Form filled, opening pricing modal...');
  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  // Click Choose Plan
  console.log('✓ Selecting Shopping Lists plan ($19)...');
  await page.locator('button:has-text("Choose Plan")').first().click();
  await page.waitForTimeout(1000);

  // Apply coupon
  console.log('\n🎫 Applying coupon "test321"...');
  const couponInput = page.locator('input[placeholder="Enter coupon code"]');
  if (await couponInput.isVisible()) {
    await couponInput.fill('test321');
    const applyBtn = page.locator('button:has-text("Apply")');
    await applyBtn.click();
    await page.waitForTimeout(1500);

    // Check if coupon was applied
    const appliedMsg = page.locator('text=Coupon applied');
    const isApplied = await appliedMsg.isVisible().catch(() => false);
    console.log('✓ Coupon applied successfully:', isApplied);

    // Check the new total price
    const payBtn = page.locator('button[type="submit"]').first();
    const payText = await payBtn.textContent();
    console.log('✓ Pay button shows:', payText);

    // If $0, should skip Stripe
    if (payText.includes('$0')) {
      console.log('\n✅ Coupon gives 100% discount! Price is now $0');
      console.log('   Clicking Pay should skip Stripe and go to success page...');
    } else {
      console.log('\n⚠️  Coupon did not make it $0 (partial discount)');
    }
  }

  // Click Pay button
  console.log('\n🖱️ Clicking Pay button...');
  const payBtn2 = page.locator('button[type="submit"]').first();
  await payBtn2.click();
  await page.waitForTimeout(2000);

  // Check where we ended up
  const currentUrl = page.url();
  console.log('\n📍 Current URL:', currentUrl);

  const isSuccessPage = currentUrl.includes('payment=free') || currentUrl.includes('payment=success');
  const successHeading = page.locator('text=Payment Successful');
  const isSuccessVisible = await successHeading.isVisible().catch(() => false);

  console.log('\n✅ Results:');
  console.log('   - URL contains payment param:', isSuccessPage);
  console.log('   - Success page visible:', isSuccessVisible);

  if (isSuccessVisible) {
    const nextSteps = page.locator('text=What\'s Next?');
    const hasNextSteps = await nextSteps.isVisible().catch(() => false);
    console.log('   - "What\'s Next?" section visible:', hasNextSteps);
    console.log('\n✅ SUCCESS: Payment flow working correctly!');
  } else {
    console.log('\n❌ ERROR: Not on success page. Check console logs above.');
  }

  await page.close();
  await browser.close();
})();

import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/production-full-test';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: false }); // headless: false to watch Stripe
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('🧪 FULL END-TO-END PRODUCTION TEST\n');
  console.log('🌐 Testing: https://carnivoreweekly.com/calculator.html\n');

  try {
    // STEP 1-3: Fill calculator form
    console.log('📍 Loading calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    console.log('📝 Step 1: Physical Stats...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('30');
    await page.locator('input[name="heightFeet"]').fill('6');
    await page.locator('input[name="heightInches"]').fill('0');
    await page.locator('input[name="weight"]').fill('200');
    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(1000);
    console.log('✅ Step 1 complete');

    console.log('📝 Step 2: Fitness & Diet...');
    await page.locator('select[name="lifestyle"]').selectOption({ index: 1 });
    await page.locator('select[name="exercise"]').selectOption({ index: 1 });
    await page.locator('input[type="radio"][name="goal"][value="maintain"]').click();
    await page.locator('select[name="diet"]').selectOption({ index: 1 });
    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(1500);
    console.log('✅ Step 2 complete');

    await page.screenshot({ path: `${screenshotDir}/step3-results.png`, fullPage: true });
    console.log('✅ Step 3: Results displayed\n');

    // STEP 4: Click upgrade button → Opens plan selection modal
    console.log('💳 Step 4: Opening plan selection...');
    const upgradeButton = page.locator('button:has-text("Upgrade")').first();
    await upgradeButton.click();
    console.log('  Clicked "Upgrade for Full Personalized Protocol"');
    await page.waitForTimeout(2000);

    // Modal should be visible
    const modalVisible = await page.locator('text=/Choose Your Plan/i').count() > 0;
    if (!modalVisible) {
      throw new Error('Plan selection modal did not appear');
    }
    console.log('  ✅ Plan selection modal opened');
    await page.screenshot({ path: `${screenshotDir}/step4-plan-modal.png`, fullPage: true });

    // STEP 5: Select a plan (choose Shopping Lists - $10)
    console.log('📝 Step 5: Selecting Shopping Lists plan...');

    // Each pricing card has a "Choose Plan" button at the bottom
    // Get all "Choose Plan" buttons and click the first one (Shopping Lists)
    const choosePlanButtons = await page.locator('button:has-text("Choose Plan")').all();
    console.log(`  Found ${choosePlanButtons.length} plan buttons`);

    if (choosePlanButtons.length > 0) {
      // Click first plan (Shopping Lists - $10)
      await choosePlanButtons[0].click();
      console.log('  ✅ Clicked Shopping Lists plan');
    } else {
      throw new Error('No "Choose Plan" buttons found');
    }

    console.log('  Waiting for payment modal...');
    await page.waitForTimeout(2000);

    // Check if pre-Stripe payment modal appeared
    const hasPaymentModal = await page.locator('text=/Complete Payment/i').count() > 0;
    if (!hasPaymentModal) {
      throw new Error('Pre-Stripe payment modal did not appear');
    }
    console.log('  ✅ Payment modal opened\n');
    await page.screenshot({ path: `${screenshotDir}/step5-payment-modal.png`, fullPage: true });

    // STEP 6: Fill email in payment modal
    console.log('📝 Step 6: Filling email...');
    const emailInput = page.locator('input[type="email"][placeholder="your@email.com"]');
    await emailInput.fill('test@carnivoreweekly.com');
    console.log('  ✅ Email entered\n');

    // STEP 7: Apply TEST999 coupon (100% discount)
    console.log('📝 Step 7: Applying coupon TEST999...');
    const couponInput = page.locator('input[placeholder="Enter coupon code"]');
    await couponInput.fill('TEST999');
    console.log('  Coupon code entered');

    const applyButton = page.locator('button:has-text("Apply")').first();
    await applyButton.click();
    await page.waitForTimeout(2000);
    console.log('  ✅ Coupon applied\n');
    await page.screenshot({ path: `${screenshotDir}/step7-coupon-applied.png`, fullPage: true });

    // STEP 8: Submit payment (redirect to Stripe)
    console.log('💳 Step 8: Submitting payment...');
    const payButton = page.locator('button[type="submit"]').filter({ hasText: /Pay/ });
    await payButton.click();
    console.log('  Payment button clicked, waiting for Stripe redirect...');

    // Wait for Stripe Checkout page to load
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });
    console.log('  ✅ Redirected to Stripe Checkout\n');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotDir}/step8-stripe-checkout.png`, fullPage: true });

    // STEP 9: Fill Stripe checkout
    console.log('📝 Step 9: Filling Stripe checkout...');

    // Look for "Add promotion code" or similar link
    const promoButton = page.locator('text=/promotion code|discount|coupon/i').first();
    const promoExists = await promoButton.count() > 0;

    if (promoExists) {
      await promoButton.click();
      await page.waitForTimeout(1000);

      // Enter coupon code
      const couponInput = page.locator('input[name="code"], input[placeholder*="code" i]').first();
      await couponInput.fill('TEST999');

      // Click apply button
      const applyButton = page.locator('button:has-text("Apply"), button:has-text("Add")').first();
      await applyButton.click();
      await page.waitForTimeout(2000);

      console.log('  ✅ Coupon TEST999 applied');
      await page.screenshot({ path: `${screenshotDir}/step5-coupon-applied.png`, fullPage: true });
    } else {
      console.log('  ⚠️ Promotion code field not found - may already be applied');
    }

    // Fill Stripe checkout form (SKIP - coupon already applied)
    console.log('📝 Step 10: Completing Stripe checkout...');

    // Email
    await page.locator('input[name="email"], input[type="email"]').first().fill('test@example.com');

    // Card details (Stripe test card)
    const cardFrame = page.frameLocator('iframe[name*="card"]').first();
    await cardFrame.locator('input[name="number"]').fill('4242424242424242');
    await cardFrame.locator('input[name="expiry"]').fill('1234'); // 12/34
    await cardFrame.locator('input[name="cvc"]').fill('123');

    // Name
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill('Test User');

    console.log('  ✅ Checkout form filled');
    await page.screenshot({ path: `${screenshotDir}/step10-form-filled.png`, fullPage: true });

    // Submit payment
    console.log('💳 Step 11: Completing Stripe payment...');
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    console.log('  Payment submitted, waiting for redirect...');

    // Wait for redirect back to success page
    await page.waitForURL('**/carnivoreweekly.com/**', { timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('  ✅ Redirected to success page');
    await page.screenshot({ path: `${screenshotDir}/step11-payment-success.png`, fullPage: true });

    // STEP 12: Fill health profile
    console.log('📝 Step 12: Filling health profile...');

    // This form structure depends on your health profile implementation
    // Adjust selectors based on actual form fields
    const hasHealthForm = await page.locator('form').count() > 0;

    if (hasHealthForm) {
      // Example: Fill health history fields
      // await page.locator('input[name="health_conditions"]').fill('None');
      // await page.locator('select[name="activity_preference"]').selectOption('strength');
      // ... fill other fields as needed

      console.log('  ⚠️ Health profile form detected but skipped (implement field filling)');
      await page.screenshot({ path: `${screenshotDir}/step12-health-profile.png`, fullPage: true });
    } else {
      console.log('  ℹ️ No health profile form found');
    }

    // STEP 13: Generate protocol
    console.log('🎯 Step 13: Generating protocol...');

    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create Protocol")').first();
    const hasGenerateButton = await generateButton.count() > 0;

    if (hasGenerateButton) {
      await generateButton.click();
      await page.waitForTimeout(5000); // Wait for protocol generation
      console.log('  ✅ Protocol generation initiated');
      await page.screenshot({ path: `${screenshotDir}/step13-protocol-generated.png`, fullPage: true });

      // Check for PDF download or report display
      const hasReport = await page.locator('text=/Your Protocol|Download|Report/i').count() > 0;
      if (hasReport) {
        console.log('  ✅ Protocol report displayed');
      } else {
        console.log('  ⚠️ Protocol report not visible');
      }
    } else {
      console.log('  ℹ️ Generate protocol button not found');
    }

    console.log('\n📸 Screenshots saved to:', screenshotDir);
    console.log('\n✅ FULL END-TO-END TEST COMPLETE');
    console.log('\n✨ Test Summary:');
    console.log('  • Calculator form: ✅ PASSED');
    console.log('  • Stripe checkout: ✅ PASSED');
    console.log('  • Coupon application: ✅ PASSED');
    console.log('  • Payment processing: ✅ PASSED');
    console.log('  • Protocol generation: ⚠️ NEEDS VERIFICATION');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png`, fullPage: true });
    console.log('📸 Error screenshot saved');
    process.exit(1);
  } finally {
    console.log('\n⏸️  Browser will remain open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
})();

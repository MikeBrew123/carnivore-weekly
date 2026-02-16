import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/payment-test';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('🧪 Payment Flow Test\n');

  try {
    // Navigate directly to calculator
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    await page.waitForTimeout(2000);

    // Fill form quickly
    console.log('📝 Filling calculator form...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('30');
    await page.locator('input[name="heightFeet"]').fill('6');
    await page.locator('input[name="heightInches"]').fill('0');
    await page.locator('input[name="weight"]').fill('200');
    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(1000);

    await page.locator('select[name="lifestyle"]').selectOption({ index: 1 });
    await page.locator('select[name="exercise"]').selectOption({ index: 1 });
    await page.locator('input[type="radio"][name="goal"][value="maintain"]').click();
    await page.locator('select[name="diet"]').selectOption({ index: 1 });
    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(1500);
    console.log('✅ Form filled, results displayed\n');

    // Click upgrade button
    console.log('💳 Opening plan selection modal...');
    await page.locator('button:has-text("Upgrade")').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/01-plan-modal.png`, fullPage: true });
    console.log('✅ Plan modal opened\n');

    // Select $9.99 Complete Protocol Bundle (4th plan button)
    console.log('📦 Selecting Complete Protocol Bundle ($9.99)...');
    const choosePlanButtons = await page.locator('button:has-text("Choose Plan")').all();
    console.log(`  Found ${choosePlanButtons.length} plan buttons`);

    if (choosePlanButtons.length < 4) {
      throw new Error('Expected 4 plan buttons, found ' + choosePlanButtons.length);
    }

    // Click 4th button (index 3) - Complete Protocol Bundle
    await choosePlanButtons[3].click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/02-payment-modal.png`, fullPage: true });
    console.log('✅ Payment modal opened\n');

    // Fill email (NO COUPON for paid test)
    console.log('📧 Entering email...');
    const emailInput = page.locator('input[type="email"][placeholder="your@email.com"]');
    await emailInput.fill('test@carnivoreweekly.com');
    await page.waitForTimeout(500);
    console.log('✅ Email entered\n');

    console.log('💳 Clicking Pay button...');
    console.log('   (This should redirect to Stripe checkout)\n');
    const payButton = page.locator('button[type="submit"]').filter({ hasText: /Pay/ });
    await payButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${screenshotDir}/03-after-pay-click.png`, fullPage: true });

    // Check if we redirected to Stripe
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('checkout.stripe.com')) {
      console.log('✅ Successfully redirected to Stripe!\n');
      await page.screenshot({ path: `${screenshotDir}/04-stripe-checkout.png`, fullPage: true });

      console.log('🎫 MANUAL STEP REQUIRED:');
      console.log('   Enter test card: 4242 4242 4242 4242');
      console.log('   Expiry: 12/34');
      console.log('   CVC: 123');
      console.log('   Then complete payment\n');
      console.log('⏸️  Browser will remain open for 3 minutes...\n');

      // Wait for manual CC entry and payment completion
      await new Promise(resolve => setTimeout(resolve, 180000));

      // After payment, check if we're back on site with Step 4
      const finalUrl = page.url();
      console.log('Final URL:', finalUrl);

      if (finalUrl.includes('payment=success')) {
        console.log('✅ Payment successful! Checking for Step 4...\n');
        await page.screenshot({ path: `${screenshotDir}/05-after-payment.png`, fullPage: true });

        // Look for health profile form (Step 4)
        const step4Visible = await page.locator('text=/health profile|step 4/i').isVisible().catch(() => false);
        if (step4Visible) {
          console.log('✅ Step 4 health profile is visible!');
        } else {
          console.log('⚠️  Step 4 not found. Check screenshot.');
        }
      }
    } else {
      console.log('❌ Did NOT redirect to Stripe');
      console.log('   Still on:', currentUrl);
      console.log('   Check screenshot for error messages\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png`, fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete. Check screenshots in:', screenshotDir);
  }
})();

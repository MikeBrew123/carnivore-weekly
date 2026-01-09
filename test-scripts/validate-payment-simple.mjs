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
    console.log('💳 Opening upgrade modal...');
    await page.locator('button:has-text("Upgrade")').first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/modal-opened.png`, fullPage: true });
    console.log('✅ Modal opened\n');

    // Try multiple approaches to click plan card
    console.log('🎯 Attempting to select plan...');

    // Approach 1: Click on the $10 text
    let clicked = false;
    try {
      await page.locator('text="$10"').click({ timeout: 3000 });
      clicked = true;
      console.log('  ✅ Clicked via $10 text');
    } catch (e) {
      console.log('  ❌ $10 text click failed');
    }

    // Approach 2: Click on "Shopping Lists" heading
    if (!clicked) {
      try {
        await page.locator('text="Shopping Lists"').first().click({ timeout: 3000 });
        clicked = true;
        console.log('  ✅ Clicked via Shopping Lists heading');
      } catch (e) {
        console.log('  ❌ Shopping Lists heading click failed');
      }
    }

    // Approach 3: Click on parent div containing plan info
    if (!clicked) {
      try {
        const planCard = page.locator('div').filter({ hasText: /Shopping Lists.*\\$10/i }).first();
        await planCard.click({ timeout: 3000 });
        clicked = true;
        console.log('  ✅ Clicked via plan card div');
      } catch (e) {
        console.log('  ❌ Plan card div click failed');
      }
    }

    if (!clicked) {
      console.log('\n⚠️  Could not auto-click plan. Browser will stay open for manual testing.');
      console.log('   Please click a plan manually and complete checkout with TEST999 coupon.\n');
      await page.screenshot({ path: `${screenshotDir}/manual-intervention-needed.png`, fullPage: true });

      // Wait for user to complete manually
      console.log('⏸️  Waiting 2 minutes for manual completion...');
      await new Promise(resolve => setTimeout(resolve, 120000));
    } else {
      console.log('\n⏳ Waiting for Stripe redirect...');
      await page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });
      console.log('✅ Redirected to Stripe Checkout\n');
      await page.screenshot({ path: `${screenshotDir}/stripe-checkout.png`, fullPage: true });

      console.log('🎫 Apply TEST999 coupon manually in the browser.');
      console.log('⏸️  Browser will remain open for 2 minutes...');
      await new Promise(resolve => setTimeout(resolve, 120000));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png`, fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Test complete. Check screenshots in:', screenshotDir);
  }
})();

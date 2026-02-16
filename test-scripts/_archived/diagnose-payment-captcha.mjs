import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/payment-diagnosis';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('Step 1: Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/01-calculator-loaded.png` });

    console.log('Step 2: Filling Step 1...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('35');
    await page.locator('button:has-text("Continue")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${screenshotDir}/02-step1-complete.png` });

    console.log('Step 3: Filling Step 2...');
    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/03-step2-complete.png` });

    console.log('Step 4: Entering email and selecting bundle...');
    await page.locator('input[type="email"]').fill('iambrew@gmail.com');
    await page.locator('input[type="radio"][value="bundle"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/04-bundle-selected.png` });

    console.log('Step 5: Applying TEST99 coupon...');
    await page.locator('input[name="coupon-code"]').fill('TEST99');
    await page.locator('button:has-text("Apply")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/05-coupon-applied.png` });

    console.log('Step 6: Clicking Proceed to Payment...');
    await page.locator('button:has-text("Proceed to Payment")').click();

    console.log('Step 7: Waiting for redirect...');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    await page.screenshot({ path: `${screenshotDir}/06-after-proceed.png`, fullPage: true });

    // Check if we're on Stripe
    if (currentUrl.includes('checkout.stripe.com')) {
      console.log('✅ On Stripe checkout page');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${screenshotDir}/07-stripe-checkout.png`, fullPage: true });

      // Check for CAPTCHA
      const hasCaptcha = await page.locator('iframe[src*="turnstile"], iframe[src*="recaptcha"], .cf-turnstile, .g-recaptcha').count();
      if (hasCaptcha > 0) {
        console.log('❌ CAPTCHA DETECTED ON STRIPE PAGE');
        await page.screenshot({ path: `${screenshotDir}/08-captcha-detected.png`, fullPage: true });
      }
    } else if (currentUrl.includes('carnivoreweekly.com')) {
      console.log('⚠️  Still on carnivoreweekly.com - checking for CAPTCHA');
      const hasCaptcha = await page.locator('iframe[src*="turnstile"], iframe[src*="recaptcha"], .cf-turnstile, .g-recaptcha').count();
      if (hasCaptcha > 0) {
        console.log('❌ CAPTCHA DETECTED ON CARNIVORE WEEKLY PAGE');
        await page.screenshot({ path: `${screenshotDir}/08-captcha-detected.png`, fullPage: true });
      }
    }

    console.log('\n📸 Screenshots saved to:', screenshotDir);
    console.log('✅ Diagnosis complete - browser will stay open for manual card entry');
    console.log('🔍 Check screenshots to see where CAPTCHA appears');
    console.log('\nPress Ctrl+C when done');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png`, fullPage: true });
    throw error;
  }
})();

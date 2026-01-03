import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Fill form
    console.log('📝 Filling measurements...');
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');

    // Continue through steps
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1000);

    for (let i = 0; i < 4; i++) {
      const btn = await page.$('button:has-text("Continue"), button:has-text("Next")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }

    // See Results
    console.log('📊 Clicking See Results...');
    await page.click('button:has-text("See Results")');
    await page.waitForTimeout(1500);

    // Click upgrade
    console.log('💳 Clicking Upgrade button...');
    await page.click('button:has-text("Upgrade")');
    await page.waitForTimeout(2000);

    // Check if "Choose Plan" buttons appeared (these are on the pricing cards)
    console.log('\n✅ Checking for pricing cards...');
    const chooseButtons = await page.$$('button:has-text("Choose Plan")');
    console.log(`Found ${chooseButtons.length} "Choose Plan" buttons`);

    if (chooseButtons.length > 0) {
      console.log('✅ PRICING MODAL SUCCESSFULLY RENDERED!');
      console.log(`Pricing cards are available for selection`);

      // Try clicking first pricing card
      console.log('\n🎯 Attempting to click first pricing card...');
      await chooseButtons[0].click();
      await page.waitForTimeout(1500);

      // Check if Stripe payment modal appeared
      const stripeElements = await page.evaluate(() => {
        return {
          hasStripeFrame: !!document.querySelector('iframe[src*="stripe"]'),
          hasStripeContainer: !!document.querySelector('[class*="stripe"]'),
          hasPayButton: !!Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pay'))
        };
      });

      console.log('\nStripe payment check:');
      console.log(`  Stripe frame: ${stripeElements.hasStripeFrame}`);
      console.log(`  Stripe container: ${stripeElements.hasStripeContainer}`);
      console.log(`  Pay button: ${stripeElements.hasPayButton}`);

      if (stripeElements.hasPayButton || stripeElements.hasStripeFrame) {
        console.log('\n✅✅✅ PAYMENT FLOW IS WORKING! User can now complete payment.');
      } else {
        console.log('\n⚠️  Payment modal elements not found yet. Stripe might be loading async.');
      }
    } else {
      console.log('❌ No pricing cards found - modal might not be rendering');
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/fixed-payment-flow.png', fullPage: true });
    console.log('\n📸 Screenshot saved');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

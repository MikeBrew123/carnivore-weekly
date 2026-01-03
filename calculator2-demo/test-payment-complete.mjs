import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('✓ Page loaded');
    await page.waitForTimeout(2000);

    // STEP 1: Fill measurements
    console.log('\n📝 STEP 1: Filling measurements...');
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');
    console.log('✓ Measurements filled: age=35, height=5\'10", weight=200lbs');

    // Click continue
    console.log('\n➡️  Clicking continue...');
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1500);

    // STEP 2+: Skip through remaining steps
    console.log('📊 Advancing through wizard...');
    for (let i = 0; i < 4; i++) {
      const btn = await page.$('button:has-text("Continue"), button:has-text("Next")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(800);
      }
    }

    // CRITICAL: Click "See Results" to show the results with upgrade button
    console.log('\n✅ Clicking "See Results" to show upgrade option...');
    const seeResultsBtn = await page.$('button:has-text("See Results")');
    if (seeResultsBtn) {
      await seeResultsBtn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Results loaded');
    }

    // Now look for upgrade button
    console.log('\n💳 Looking for upgrade button...');
    const upgradeBtn = await page.$('button:has-text("Upgrade"), button:has-text("Choose Plan"), button:has-text("Get Full Report")');

    if (upgradeBtn) {
      console.log('✓ Upgrade button found!');
      const upgradeText = await upgradeBtn.evaluate(el => el.textContent);
      console.log(`  Button text: "${upgradeText.trim()}"`);

      console.log('\n🖱️  Clicking upgrade button...');
      await upgradeBtn.click();
      await page.waitForTimeout(2500);

      // Check if modal appeared
      const modal = await page.$('[role="dialog"], [class*="Modal"]');
      if (modal) {
        console.log('✅ PRICING MODAL APPEARED!');

        // Look for pricing cards
        const cards = await page.$$('button[class*="pricing"], [class*="PricingCard"], [class*="card"]');
        console.log(`Found ${cards.length} pricing elements`);

        if (cards.length > 0) {
          console.log('\n🎯 Testing pricing card click...');
          const card = cards[0];
          const cardText = await card.evaluate(el => el.textContent.substring(0, 100));
          console.log(`Card content: "${cardText}..."`);

          // Try clicking it
          try {
            await card.click({ force: true, timeout: 5000 });
            console.log('✅ PRICING CARD CLICKED SUCCESSFULLY!');

            // Check if anything changed
            await page.waitForTimeout(1000);
            const checkoutBtn = await page.$('button:has-text("Checkout"), button:has-text("Pay")');
            if (checkoutBtn) {
              console.log('✅ Checkout button appeared - form is working!');
            }
          } catch (e) {
            console.log(`❌ Click failed: ${e.message}`);
          }
        }

        // Take screenshot of modal
        await page.screenshot({ path: '/tmp/pricing-modal.png' });
        console.log('📸 Modal screenshot saved');
      } else {
        console.log('❌ Modal did not appear');
      }
    } else {
      console.log('❌ Upgrade button not found');
      const allBtns = await page.$$eval('button', btns =>
        btns.map(b => b.textContent.trim()).filter(t => t && t.length < 100)
      );
      console.log('Available buttons:', allBtns.slice(0, 10));
    }

    console.log('\n✅ Payment flow test completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

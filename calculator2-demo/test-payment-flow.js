const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    console.log('✓ Page loaded');

    // Wait for form to be ready
    await page.waitForSelector('input[name="sex"], input[name="age"]', { timeout: 5000 });

    console.log('\n📝 Step 1: Filling form with test data...');
    // Fill in sex (male)
    await page.selectOption('select[name="sex"]', 'male').catch(() => {
      // Try radio button if select doesn't exist
      return page.click('input[value="male"]');
    });

    // Fill in age
    await page.fill('input[name="age"]', '35');

    // Fill in height
    await page.fill('input[name="height"]', '70'); // 5'10" = 70 inches

    // Fill in weight
    await page.fill('input[name="weight"]', '200');

    console.log('✓ Form fields filled');

    // Try clicking next button
    console.log('\n➡️  Clicking Next button...');
    const nextButton = await page.$('button:has-text("Next")');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Next button clicked');
    }

    // Continue through steps
    for (let i = 0; i < 2; i++) {
      console.log(`\n➡️  Advancing to next step (${i + 2})...`);
      const btn = await page.$('button:has-text("Next")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Look for upgrade button or pricing button
    console.log('\n💳 Looking for Upgrade/Pricing button...');
    let upgradeBtn = await page.$('button:has-text("Upgrade")');
    if (!upgradeBtn) {
      upgradeBtn = await page.$('button:has-text("Choose")');
    }
    if (!upgradeBtn) {
      upgradeBtn = await page.$('[role="button"]:has-text("Upgrade")');
    }

    if (upgradeBtn) {
      console.log('✓ Upgrade button found, clicking...');
      await upgradeBtn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️  No upgrade button found, looking for pricing modal...');
    }

    // Check if pricing modal is visible
    const pricingModal = await page.$('[class*="modal"], [class*="Modal"], [role="dialog"]');
    if (pricingModal) {
      console.log('✓ Pricing modal is visible');

      // Take screenshot of modal
      await page.screenshot({ path: '/tmp/payment-modal.png', fullPage: false });
      console.log('✓ Screenshot saved to /tmp/payment-modal.png');

      // Try clicking a pricing card
      console.log('\n🎯 Attempting to click pricing card...');
      const pricingCards = await page.$$('[class*="card"], [class*="pricing"], [class*="tier"]');
      console.log(`Found ${pricingCards.length} potential pricing cards`);

      if (pricingCards.length > 1) {
        // Get the second card (usually the mid-tier)
        const card = pricingCards[1];
        
        // Try clicking it
        const box = await card.boundingBox();
        if (box) {
          console.log(`Card position: ${box.x}, ${box.y} (${box.width}x${box.height})`);
          await card.click({ force: true });
          await page.waitForTimeout(500);
          console.log('✓ Card clicked successfully');
        }
      }
    } else {
      console.log('❌ Pricing modal not found');
    }

    // Check for any errors in console
    console.log('\n📊 Final page state:');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Check form submission status
    const errors = await page.evaluate(() => {
      return {
        consoleErrors: [],
        networkErrors: [],
        formValid: document.querySelector('form')?.checkValidity() ?? 'N/A'
      };
    });

    console.log('✓ Payment flow test completed');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
  }
})();

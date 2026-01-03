import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading and filling form...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Fill form
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1000);

    // Skip steps
    for (let i = 0; i < 4; i++) {
      const btn = await page.$('button:has-text("Continue"), button:has-text("Next")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }

    // See Results
    await page.click('button:has-text("See Results")');
    await page.waitForTimeout(1500);

    // Check DOM BEFORE upgrade click
    console.log('\n📋 DOM state BEFORE clicking upgrade:');
    const beforeDom = await page.evaluate(() => {
      return {
        allElements: document.querySelectorAll('*').length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t),
        modals: document.querySelectorAll('[role="dialog"]').length,
        divs: document.querySelectorAll('div').length
      };
    });
    console.log(`  All elements: ${beforeDom.allElements}`);
    console.log(`  Modals: ${beforeDom.modals}`);
    console.log(`  Buttons: ${beforeDom.buttons.slice(0, 5).join(', ')}`);

    // Click upgrade
    console.log('\n🖱️  Clicking upgrade button...');
    await page.click('button:has-text("Upgrade")');

    // Wait and check multiple times
    for (let wait of [500, 1000, 1500, 2000]) {
      await page.waitForTimeout(500);

      const afterDom = await page.evaluate(() => {
        return {
          allElements: document.querySelectorAll('*').length,
          modals: document.querySelectorAll('[role="dialog"]').length,
          overlays: document.querySelectorAll('[style*="position"], [class*="modal"], [class*="overlay"]').length,
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t),
          // Check for Framer Motion elements
          motionDivs: document.querySelectorAll('[style*="transform"], [class*="motion"]').length
        };
      });

      console.log(`\n⏱️  After ${wait}ms:`);
      console.log(`  All elements: ${afterDom.allElements} (${afterDom.allElements - beforeDom.allElements > 0 ? '+' : ''}${afterDom.allElements - beforeDom.allElements})`);
      console.log(`  Modals: ${afterDom.modals}`);
      console.log(`  Motion elements: ${afterDom.motionDivs}`);
      console.log(`  Buttons: ${afterDom.buttons.slice(0, 5).join(', ')}`);

      if (afterDom.modals > 0 || (afterDom.allElements > beforeDom.allElements)) {
        console.log('✅ DOM changed - modal might be rendering!');
        break;
      }
    }

    // Try finding pricing-related content
    console.log('\n🔍 Searching for pricing content...');
    const pricingContent = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasPricingText: text.includes('pricing') || text.includes('Pricing') || text.includes('PRICING'),
        hasCardText: text.includes('card') || text.includes('Card'),
        hasPriceText: text.includes('$') || text.includes('price'),
        textPreview: text.substring(0, 500)
      };
    });
    console.log(`  Has pricing text: ${pricingContent.hasPricingText}`);
    console.log(`  Has card text: ${pricingContent.hasCardText}`);
    console.log(`  Has price text: ${pricingContent.hasPriceText}`);

    // Take screenshot
    await page.screenshot({ path: '/tmp/modal-dom-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

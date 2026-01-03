import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ level: msg.type(), text: msg.text() });
  });

  // Capture network errors
  const networkErrors = [];
  page.on('response', resp => {
    if (!resp.ok()) {
      networkErrors.push({
        status: resp.status(),
        url: resp.url(),
        statusText: resp.statusText()
      });
    }
  });

  try {
    console.log('🔄 Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Fill form
    console.log('📝 Filling form...');
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1000);

    // Skip through steps
    for (let i = 0; i < 4; i++) {
      const btn = await page.$('button:has-text("Continue"), button:has-text("Next")');
      if (btn) await btn.click();
      await page.waitForTimeout(500);
    }

    // Click See Results
    await page.click('button:has-text("See Results")');
    await page.waitForTimeout(1500);

    console.log('\n🔍 Checking page state before clicking upgrade...');
    const beforeState = await page.evaluate(() => {
      return {
        allDivs: document.querySelectorAll('div').length,
        allButtons: document.querySelectorAll('button').length,
        modals: document.querySelectorAll('[role="dialog"]').length,
        hasPortal: !!document.getElementById('portal') || !!document.querySelector('[id*="portal"]'),
        bodyHTML: document.body.innerHTML.substring(0, 500)
      };
    });
    console.log('Before upgrade click:');
    console.log(`  Modals: ${beforeState.modals}`);
    console.log(`  Portal elements: ${beforeState.hasPortal}`);

    // Click upgrade
    console.log('\n🖱️  Clicking upgrade button...');
    const upgradeBtn = await page.$('button:has-text("Upgrade")');
    if (upgradeBtn) {
      await upgradeBtn.click();
    }
    await page.waitForTimeout(2000);

    console.log('\n🔍 Checking page state after clicking upgrade...');
    const afterState = await page.evaluate(() => {
      // Check all possible modal/dialog elements
      return {
        modals: document.querySelectorAll('[role="dialog"]').length,
        dropdowns: document.querySelectorAll('[role="menu"], [role="listbox"]').length,
        overlays: document.querySelectorAll('[class*="overlay"], [class*="Overlay"]').length,
        portals: document.querySelectorAll('[id*="portal"], [class*="portal"]').length,
        allDivs: document.querySelectorAll('div').length,
        allButtons: document.querySelectorAll('button').length,
        hasStripe: !!document.querySelector('iframe[name*="stripe"]'),
        visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length
      };
    });

    console.log('After upgrade click:');
    console.log(`  Modals: ${afterState.modals}`);
    console.log(`  Overlays: ${afterState.overlays}`);
    console.log(`  Portals: ${afterState.portals}`);
    console.log(`  Visible elements: ${afterState.visibleElements}`);

    // Check if URL changed (might be redirecting to payment)
    const currentUrl = page.url();
    console.log(`\nCurrent URL: ${currentUrl}`);

    // Check for any visible elements with "pricing" or "card" in class
    const pricingElements = await page.$$eval('*', els =>
      els.filter(el => {
        const classes = el.className;
        const text = el.textContent;
        return (classes && (classes.includes('pricing') || classes.includes('card') || classes.includes('modal'))) ||
               (text && (text.includes('Pricing') || text.includes('Card')));
      }).slice(0, 5).map(el => ({
        tag: el.tagName,
        classes: el.className,
        text: el.textContent.substring(0, 100)
      }))
    );

    if (pricingElements.length > 0) {
      console.log('\nFound pricing-related elements:');
      pricingElements.forEach(el => {
        console.log(`  ${el.tag}: ${el.classes}`);
      });
    } else {
      console.log('\nNo pricing-related elements found');
    }

    // Take screenshot regardless
    await page.screenshot({ path: '/tmp/diagnostic-after-upgrade.png', fullPage: true });
    console.log('\n📸 Screenshot saved to /tmp/diagnostic-after-upgrade.png');

    // Report any console errors
    if (consoleLogs.length > 0) {
      console.log('\n⚠️  Console messages:');
      consoleLogs.filter(l => l.level === 'error').forEach(l => {
        console.log(`  ERROR: ${l.text}`);
      });
    }

    // Report network errors
    if (networkErrors.length > 0) {
      console.log('\n❌ Network errors:');
      networkErrors.slice(0, 5).forEach(e => {
        console.log(`  ${e.status}: ${e.url}`);
      });
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();

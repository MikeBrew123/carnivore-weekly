import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ level: msg.type(), text: msg.text() });
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  try {
    console.log('Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Inject a test listener before filling form
    await page.evaluate(() => {
      window.upgradeClicked = false;
      window.modalShowed = false;

      // Hook into the window to detect state changes
      const originalSetState = React.useState;
      window.addEventListener('click', (e) => {
        if (e.target?.textContent?.includes('Upgrade')) {
          window.upgradeClicked = true;
          console.log('[TEST] Upgrade button clicked detected');
        }
      });
    });

    // Fill form
    console.log('Filling form...');
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

    // Click See Results
    await page.click('button:has-text("See Results")');
    await page.waitForTimeout(1500);

    // Check button before click
    console.log('\n🔍 Checking upgrade button before click...');
    const buttonBefore = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Upgrade'));
      return {
        exists: !!btn,
        textContent: btn?.textContent || 'N/A',
        clickable: btn ? window.getComputedStyle(btn).pointerEvents !== 'none' : false,
        disabled: btn?.disabled || false,
        onclick: !!btn?.onclick
      };
    });
    console.log('Button state:', buttonBefore);

    // Click upgrade
    console.log('\n🖱️  Clicking upgrade button...');
    const upgradeBtn = await page.$('button:has-text("Upgrade")');
    if (upgradeBtn) {
      // Get its properties before clicking
      const btnInfo = await upgradeBtn.evaluate(btn => ({
        className: btn.className,
        innerHTML: btn.innerHTML.substring(0, 100),
        onclick: !!btn.onclick,
        listeners: true // Can't easily detect listeners in real DOM
      }));
      console.log('Button properties:', btnInfo);

      // Try different click methods
      console.log('Method 1: Regular click...');
      await upgradeBtn.click();
    }

    await page.waitForTimeout(2000);

    // Check if modal appeared
    console.log('\n🔍 Checking page after click...');
    const afterClick = await page.evaluate(() => {
      const modals = document.querySelectorAll('[role="dialog"]');
      const upgradeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Upgrade'));
      return {
        modalsFound: modals.length,
        upgradeBtnStillVisible: !!upgradeBtn,
        pricingElements: document.querySelectorAll('[class*="pricing"], [class*="Pricing"]').length,
        testFlags: {
          upgradeClicked: window.upgradeClicked,
          modalShowed: window.modalShowed
        }
      };
    });
    console.log('After click state:', afterClick);

    // Look for price cards with different selectors
    const cards = await page.evaluate(() => {
      return {
        byRole: document.querySelectorAll('[role="button"][class*="card"]').length,
        byClass: document.querySelectorAll('[class*="Card"], [class*="card"]').length,
        byPricing: document.querySelectorAll('[class*="pricing"]').length
      };
    });
    console.log('Cards found:', cards);

    // Check all console errors
    const errors = consoleLogs.filter(l => l.level === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Console errors:');
      errors.forEach(e => console.log(`  ${e.text}`));
    }

    await page.screenshot({ path: '/tmp/upgrade-handler-test.png', fullPage: true });

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();

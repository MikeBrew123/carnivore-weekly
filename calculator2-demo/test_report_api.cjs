const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture network requests
  page.on('response', response => {
    const url = response.url();
    if (url.includes('carnivore-report') || url.includes('workers.dev')) {
      console.log(`\n📡 API Response: ${response.status()} ${url}`);
      response.text().then(text => {
        if (text && text.length < 500) {
          console.log(`   Body: ${text}`);
        } else if (text) {
          console.log(`   Body (first 500 chars): ${text.substring(0, 500)}...`);
        }
      }).catch(() => {});
    }
  });

  page.on('request', request => {
    const url = request.url();
    if (url.includes('carnivore-report') || url.includes('workers.dev')) {
      console.log(`\n📨 API Request: ${request.method()} ${url}`);
      const postData = request.postDataJSON();
      if (postData) {
        console.log(`   Payload keys: ${Object.keys(postData).join(', ')}`);
      }
    }
  });

  console.log('\n✅ TESTING REPORT GENERATION API\n');
  console.log('Email: iambrew@gmail.com\n');

  try {
    // Navigate to calculator
    console.log('📍 Opening calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 1
    console.log('📝 Filling basic info...');
    const selects = page.locator('select');
    await selects.first().selectOption('male');
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('35');
    await inputs.nth(1).fill('5');
    await inputs.nth(2).fill('10');
    await inputs.nth(3).fill('200');
    let btn = page.locator('button:has-text("Continue")').first();
    await btn.click();
    await page.waitForTimeout(2000);

    // Step 2
    const moderateBtn = page.locator('button').filter({hasText: /moderate|normal|average/i}).first();
    if (await moderateBtn.isVisible()) {
      await moderateBtn.click();
      await page.waitForTimeout(1500);
    }
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }

    // Step 3
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }

    // Results & Upgrade
    console.log('💳 Starting upgrade flow...');
    const seeResults = page.locator('button:has-text("See Results")').first();
    if (await seeResults.isVisible()) {
      await seeResults.click();
      await page.waitForTimeout(2000);
    }

    const upgrade = page.locator('button').filter({hasText: /Upgrade/}).first();
    if (await upgrade.isVisible()) {
      await upgrade.click();
      await page.waitForTimeout(2000);
    }

    const chooseButtons = page.locator('button:has-text("Choose Plan")');
    if (await chooseButtons.count() > 0) {
      await chooseButtons.nth(0).click();
      await page.waitForTimeout(2000);
    }

    const couponField = page.locator('input[placeholder="Enter coupon code"]');
    if (await couponField.isVisible()) {
      await couponField.fill('test321');
      await page.waitForTimeout(800);
      const applyBtn = page.locator('button:has-text("Apply")').first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    const payBtn = page.locator('button').filter({hasText: /Pay|Checkout/}).first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ Payment processed');
    }

    // Step 4 - Health
    console.log('\n📝 Filling health info...');
    await page.waitForTimeout(1500);

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('iambrew@gmail.com');
      console.log('✓ Email entered');
    }

    const firstNameInput = page.locator('input[placeholder="e.g., John"], input[placeholder*="First"]').first();
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('Mike');
    }

    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }

    // Step 5 - Submit (this should trigger the API)
    console.log('\n📝 Submitting Step 5 (will trigger report API)...');
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      console.log('⏳ Waiting for report generation API...');
      await page.waitForTimeout(5000);
    }

    // Check what happened
    const currentUrl = page.url();
    console.log(`\nFinal URL: ${currentUrl}`);

    const pageTitle = page.locator('h1, h2, h3, title');
    const titleCount = await pageTitle.count();
    if (titleCount > 0) {
      const title = await pageTitle.first().textContent();
      console.log(`Page title: ${title}`);
    }

    // Check browser console for errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        logs.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('API TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nCheck above for API responses and network logs');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();

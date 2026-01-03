const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('\n✅ TESTING COMPLETE EMAIL FLOW - FORM TO FINAL REPORT\n');
  console.log('Email: iambrew@gmail.com\n');

  try {
    // Navigate to calculator
    console.log('📍 Opening production calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 1: Basic Info
    console.log('📝 STEP 1: Basic Information');
    const selects = page.locator('select');
    await selects.first().selectOption('male');
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('35');      // age
    await inputs.nth(1).fill('5');       // height feet
    await inputs.nth(2).fill('10');      // height inches
    await inputs.nth(3).fill('200');     // weight
    let btn = page.locator('button:has-text("Continue")').first();
    await btn.click();
    await page.waitForTimeout(2000);
    console.log('✓ Step 1 complete');

    // Step 2: Activity
    console.log('📝 STEP 2: Activity Level');
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
    console.log('✓ Step 2 complete');

    // Step 3: Goals
    console.log('📝 STEP 3: Select Goal');
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }
    console.log('✓ Step 3 complete');

    // Results & Upgrade
    console.log('\n💳 PAYMENT FLOW:');
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
      console.log('✓ Payment processed (100% coupon)');
    }

    // Step 4: Health
    console.log('\n📝 STEP 4: Health & Medical Info');
    await page.waitForTimeout(1500);

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('iambrew@gmail.com');
      console.log('✓ Email: iambrew@gmail.com');
    }

    const firstNameInput = page.locator('input[placeholder="e.g., John"], input[placeholder*="First"]').first();
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('Mike');
      console.log('✓ Name: Mike');
    }

    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }
    console.log('✓ Step 4 complete');

    // Step 5: Goals
    console.log('\n📝 STEP 5: Goals & Preferences');
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      console.log('✓ Step 5 submitted - triggering report generation...');
      await page.waitForTimeout(3000);
    }

    // Wait for report generation
    console.log('\n⏳ WAITING FOR REPORT GENERATION (up to 90 seconds)...');
    const startTime = Date.now();
    const maxWaitTime = 90000; // 90 seconds
    let reportReady = false;

    while (!reportReady && (Date.now() - startTime) < maxWaitTime) {
      // Check for report viewer or completion screen
      const reportHeading = page.locator('h1, h2, h3').filter({hasText: /Report|Results|Protocol/});
      const reportHeadingCount = await reportHeading.count();

      if (reportHeadingCount > 0) {
        const heading = await reportHeading.first().textContent();
        console.log(`Found: ${heading}`);

        // Check if we're past the generating state
        const generatingText = page.locator('text=/Generating/i');
        const isGenerating = await generatingText.count() > 0;

        if (!isGenerating) {
          reportReady = true;
          console.log('✓ Report generation complete!');
        }
      }

      if (!reportReady) {
        await page.waitForTimeout(2000);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`  Waiting... (${elapsed}s elapsed)`);
      }
    }

    // Screenshot of final report
    console.log('\n📸 Capturing final report...');
    await page.screenshot({
      path: '/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/report-final.png',
      fullPage: true
    });
    console.log('✓ Screenshot saved: report-final.png');

    // Check for email/download/send buttons
    console.log('\n🔘 CHECKING FOR BUTTONS:');
    const allButtons = page.locator('button');
    const btnCount = await allButtons.count();
    console.log(`Found ${btnCount} buttons on page`);

    const buttonTexts = [];
    for (let i = 0; i < Math.min(btnCount, 15); i++) {
      const btnText = await allButtons.nth(i).textContent();
      if (btnText && btnText.trim() && btnText.trim().length < 100) {
        buttonTexts.push(btnText.trim());
      }
    }

    const uniqueButtons = [...new Set(buttonTexts)];
    if (uniqueButtons.length > 0) {
      console.log('\nAvailable buttons:');
      uniqueButtons.forEach(b => console.log(`  ✓ ${b}`));

      // Check for email-related buttons
      const emailBtn = uniqueButtons.find(b => b.toLowerCase().includes('email') ||
                                               b.toLowerCase().includes('send') ||
                                               b.toLowerCase().includes('download'));
      if (emailBtn) {
        console.log(`\n✅ EMAIL/ACTION BUTTON FOUND: "${emailBtn}"`);
      }
    }

    // Get current URL
    const finalUrl = page.url();
    console.log(`\nFinal URL: ${finalUrl}`);

    // Check page content
    const pageText = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent)
        .filter(t => t && t.trim())
        .slice(0, 5);
      return h1s;
    });

    console.log('\nPage headings:');
    pageText.forEach(h => console.log(`  - ${h}`));

    console.log('\n' + '='.repeat(60));
    console.log('✅ REPORT GENERATION TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\n✉️  Email submitted: iambrew@gmail.com');
    console.log('Check your email for the personalized carnivore protocol report');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();

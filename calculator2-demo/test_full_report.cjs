const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('\n✅ TESTING FULL FORM TO REPORT WITH EMAIL\n');
  console.log('Email: iambrew@gmail.com\n');

  try {
    // Step 1: Navigate to production calculator
    console.log('📍 Opening calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ===== STEP 1: BASIC INFO =====
    console.log('📝 STEP 1: Filling Basic Information');
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
    console.log('✓ Step 1 complete\n');

    // ===== STEP 2: ACTIVITY LEVEL =====
    console.log('📝 STEP 2: Filling Activity Level');
    const moderateBtn = page.locator('button').filter({hasText: /moderate|normal|average/i}).first();
    if (await moderateBtn.isVisible()) {
      await moderateBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ Selected moderate activity');
    }

    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }
    console.log('✓ Step 2 complete\n');

    // ===== STEP 3: GOALS =====
    console.log('📝 STEP 3: Selecting Goal');
    const goalBtn = page.locator('button').filter({hasText: /fat loss|loss|weight loss/i}).first();
    if (await goalBtn.isVisible()) {
      await goalBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ Selected fat loss goal');
    }

    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }
    console.log('✓ Step 3 complete\n');

    // ===== VIEW RESULTS & UPGRADE =====
    console.log('📊 VIEWING RESULTS & UPGRADING');
    const seeResults = page.locator('button:has-text("See Results")').first();
    if (await seeResults.isVisible()) {
      await seeResults.click();
      await page.waitForTimeout(2000);
      console.log('✓ Results viewed');
    }

    const upgrade = page.locator('button').filter({hasText: /Upgrade/}).first();
    if (await upgrade.isVisible()) {
      await upgrade.click();
      await page.waitForTimeout(2000);
      console.log('✓ Upgrade modal opened');
    }

    // Select tier and apply coupon
    const chooseButtons = page.locator('button:has-text("Choose Plan")');
    if (await chooseButtons.count() > 0) {
      await chooseButtons.nth(0).click();
      await page.waitForTimeout(2000);
      console.log('✓ Tier selected');
    }

    const couponField = page.locator('input[placeholder="Enter coupon code"]');
    if (await couponField.isVisible()) {
      await couponField.fill('test321');
      await page.waitForTimeout(800);
      const applyBtn = page.locator('button:has-text("Apply")').first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForTimeout(2000);
        console.log('✓ Coupon applied');
      }
    }

    // Process payment
    const payBtn = page.locator('button').filter({hasText: /Pay|Checkout/}).first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ Payment processed\n');
    }

    // ===== STEP 4: HEALTH & MEDICAL INFO =====
    console.log('📝 STEP 4: Filling Health & Medical Info');
    await page.waitForTimeout(1500);

    // Fill email
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('iambrew@gmail.com');
      console.log('✓ Email entered: iambrew@gmail.com');
    }

    // Fill first name (optional)
    const firstNameInput = page.locator('input[placeholder="e.g., John"], input[placeholder*="First"]').first();
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('Mike');
      console.log('✓ First name entered: Mike');
    }

    // Fill medications (optional)
    const medicationsInput = page.locator('textarea, input[placeholder*="Medication"]').first();
    if (await medicationsInput.isVisible()) {
      await medicationsInput.fill('None');
      console.log('✓ Medications: None');
    }

    // Check health condition checkboxes
    const healthCheckboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await healthCheckboxes.count();
    if (checkboxCount > 0) {
      // Check first checkbox as example
      await healthCheckboxes.first().check();
      console.log('✓ Health condition selected');
    }

    // Fill allergies (optional)
    const allergiesInputs = page.locator('textarea, input[placeholder*="Allergies"]');
    if (await allergiesInputs.count() > 0) {
      await allergiesInputs.first().fill('None');
      console.log('✓ Allergies: None');
    }

    // Fill foods to avoid (optional)
    const avoidFoodsInputs = page.locator('textarea, input[placeholder*="Foods"]');
    if (await avoidFoodsInputs.count() > 1) {
      await avoidFoodsInputs.nth(1).fill('None');
      console.log('✓ Foods to avoid: None');
    }

    console.log('✓ Step 4 complete\n');

    // Click Continue to Step 5
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
    }

    // ===== STEP 5: GOALS/ADDITIONAL INFO =====
    console.log('📝 STEP 5: Completing Goals/Final Info');

    // Look for any remaining fields or selections needed
    const step5Buttons = page.locator('button');
    const step5BtnCount = await step5Buttons.count();
    console.log(`Found ${step5BtnCount} buttons on Step 5`);

    // Try to fill any text inputs
    const step5Inputs = page.locator('input[type="text"], textarea');
    const inputCount = await step5Inputs.count();
    console.log(`Found ${inputCount} text inputs`);

    // Click Continue if available
    btn = page.locator('button:has-text("Continue"), button:has-text("Submit"), button:has-text("Get Report")').first();
    if (await btn.isVisible()) {
      const btnText = await btn.textContent();
      console.log(`Clicking: ${btnText}`);
      await btn.click();
      await page.waitForTimeout(2500);
      console.log('✓ Step 5 complete\n');
    }

    // ===== FINAL REPORT =====
    console.log('📋 CHECKING FOR REPORT & EMAIL BUTTON\n');
    await page.waitForTimeout(1500);

    // Take screenshot of report
    await page.screenshot({
      path: '/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/final-report.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: final-report.png\n');

    // Check for report content
    const reportHeadings = page.locator('h1, h2, h3');
    const headingCount = await reportHeadings.count();
    const headingTexts = [];
    for (let i = 0; i < Math.min(headingCount, 5); i++) {
      const text = await reportHeadings.nth(i).textContent();
      if (text && text.trim()) {
        headingTexts.push(text.trim());
      }
    }
    console.log('Report headings:');
    headingTexts.forEach(h => console.log(`  - ${h}`));

    // Check for macro calculations/results
    const macroTexts = page.locator('text=/calories|protein|fat|macro/i');
    const macroCount = await macroTexts.count();
    console.log(`\nFound ${macroCount} macro-related text elements`);

    // Check for buttons at the end
    console.log('\n🔘 AVAILABLE BUTTONS:');
    const allButtons = page.locator('button');
    const allBtnCount = await allButtons.count();
    console.log(`Total buttons: ${allBtnCount}`);

    const buttonTexts = [];
    for (let i = 0; i < Math.min(allBtnCount, 10); i++) {
      const btnText = await allButtons.nth(i).textContent();
      if (btnText && btnText.trim() && btnText.trim().length < 50) {
        buttonTexts.push(btnText.trim());
      }
    }

    const uniqueButtons = [...new Set(buttonTexts)];
    console.log('\nButton labels found:');
    uniqueButtons.forEach(b => console.log(`  ✓ ${b}`));

    // Look specifically for email/download/send buttons
    const emailBtn = page.locator('button').filter({hasText: /email|send|download|pdf/i}).first();
    if (await emailBtn.isVisible()) {
      const emailBtnText = await emailBtn.textContent();
      console.log(`\n✅ EMAIL/ACTION BUTTON FOUND: "${emailBtnText}"`);
      console.log('Ready to test email functionality');
    } else {
      console.log('\n⚠️  No explicit email/download button found');
      console.log('Checking page text for instructions...');

      const bodyText = await page.textContent();
      if (bodyText.includes('email')) {
        console.log('Page mentions "email" - feature may be auto-triggered');
      }
    }

    // Check for any success messages
    const successMessages = page.locator('text=/success|sent|complete|received/i');
    const msgCount = await successMessages.count();
    if (msgCount > 0) {
      console.log(`\n✅ Success message detected`);
      for (let i = 0; i < Math.min(msgCount, 3); i++) {
        const msg = await successMessages.nth(i).textContent();
        if (msg && msg.trim().length < 200) {
          console.log(`  "${msg.trim()}"`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('REPORT TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\nEmail used: iambrew@gmail.com');
    console.log('Check your email for report delivery');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }

  await page.waitForTimeout(3000);
  await browser.close();
})();

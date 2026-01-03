const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('\n✅ TESTING EMAIL FUNCTION IN PAYMENT FLOW\n');

  try {
    // Step 1: Navigate to production calculator
    console.log('📍 Opening calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Step 2: Fill Step 1 (Basic Info)
    console.log('📝 Filling Step 1: Basic Information');
    const selects = page.locator('select');
    await selects.first().selectOption('male');

    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('35');      // age
    await inputs.nth(1).fill('5');       // height feet
    await inputs.nth(2).fill('10');      // height inches
    await inputs.nth(3).fill('200');     // weight

    // Continue to Step 2
    let btn = page.locator('button:has-text("Continue")').first();
    await btn.click();
    await page.waitForTimeout(2000);
    console.log('✓ Step 1 complete');

    // Step 3: Fill Step 2 (Activity)
    console.log('📝 Filling Step 2: Activity Level');

    // Try to find and click activity buttons or options
    const buttons = page.locator('button');
    const btnCount = await buttons.count();
    console.log(`Found ${btnCount} buttons on Step 2`);

    // Look for activity level buttons (often labeled like "Light", "Moderate", "Heavy")
    const moderateBtn = page.locator('button').filter({hasText: /moderate|normal|average/i}).first();
    if (await moderateBtn.isVisible()) {
      await moderateBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ Selected activity level');
    } else {
      // Try clicking second button as fallback
      const allBtns = page.locator('button');
      if (await allBtns.nth(1).isVisible()) {
        await allBtns.nth(1).click();
        await page.waitForTimeout(1500);
        console.log('✓ Selected an option');
      }
    }

    // Click Continue
    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Step 2 complete');
    }

    // Step 4: Fill Step 3 (Goals)
    console.log('📝 Filling Step 3: Select Goal');

    const goalBtn = page.locator('button').filter({hasText: /muscle|building|bulk|fat loss|loss|weight loss/i}).first();
    if (await goalBtn.isVisible()) {
      await goalBtn.click();
      await page.waitForTimeout(1500);
      console.log('✓ Selected goal');
    }

    btn = page.locator('button:has-text("Continue")').first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(2000);
      console.log('✓ Step 3 complete');
    }

    // Step 5: View Results and click Upgrade
    console.log('📊 Viewing Results');
    const seeResults = page.locator('button:has-text("See Results")').first();
    if (await seeResults.isVisible()) {
      await seeResults.click();
      await page.waitForTimeout(2000);
      console.log('✓ Results page loaded');
    }

    // Click Upgrade button
    console.log('💳 Clicking Upgrade button');
    const upgrade = page.locator('button').filter({hasText: /Upgrade/}).first();
    if (await upgrade.isVisible()) {
      await upgrade.click();
      await page.waitForTimeout(2000);
      console.log('✓ Upgrade modal opened');
    }

    // Step 6: Select pricing tier
    console.log('💰 Selecting pricing tier');
    const chooseButtons = page.locator('button:has-text("Choose Plan")');
    const chooseCount = await chooseButtons.count();
    console.log(`Found ${chooseCount} pricing tiers`);

    if (chooseCount > 0) {
      await chooseButtons.nth(0).click(); // Select first tier
      await page.waitForTimeout(2000);
      console.log('✓ Tier selected');
    }

    // Step 7: Apply coupon code for 100% discount
    console.log('🎟️ Applying coupon code "test321"');
    await page.waitForTimeout(1000);

    const couponField = page.locator('input[placeholder="Enter coupon code"]');
    if (await couponField.isVisible()) {
      await couponField.fill('test321');
      await page.waitForTimeout(800);

      // Look for apply button
      const applyBtn = page.locator('button:has-text("Apply")').first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForTimeout(2000);
        console.log('✓ Coupon applied');
      }
    } else {
      console.log('⚠️  Coupon field not found');
    }

    // Step 8: Click Pay button (should be $0.00)
    console.log('💰 Processing free payment (100% coupon)');
    const payBtn = page.locator('button').filter({hasText: /Pay|Checkout/}).first();
    if (await payBtn.isVisible()) {
      await payBtn.click();
      await page.waitForTimeout(3000);
      console.log('✓ Payment button clicked');
    }

    // Step 9: Wait for redirect to Step 4 (Health form)
    console.log('⏳ Waiting for Step 4 (Health & Medical Info)...');
    await page.waitForTimeout(2000);

    // Take a screenshot to see what we landed on
    await page.screenshot({
      path: '/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/step4-initial.png',
      fullPage: true
    });

    // Check if we're on Step 4
    const pageTitle = page.locator('h1, h2, h3');
    const titles = [];
    const titleCount = await pageTitle.count();
    for (let i = 0; i < Math.min(titleCount, 3); i++) {
      titles.push(await pageTitle.nth(i).textContent());
    }
    console.log(`Page titles/headings: ${titles.join(' | ')}`);

    // Step 10: Check for email field
    console.log('\n📧 CHECKING EMAIL FIELD IN STEP 4:');

    // Try multiple selectors for email field
    let emailInput = page.locator('input[type="email"]');
    let emailCount = await emailInput.count();

    if (emailCount === 0) {
      emailInput = page.locator('input[placeholder*="email" i]');
      emailCount = await emailInput.count();
    }

    if (emailCount === 0) {
      emailInput = page.locator('input[name*="email" i]');
      emailCount = await emailInput.count();
    }

    console.log(`Found ${emailCount} email input field(s)`);

    if (emailCount > 0) {
      console.log('✅ Email field detected in Step 4');

      // Fill in the email address
      console.log(`📝 Entering email: iambrew@gmail.com`);
      await emailInput.first().fill('iambrew@gmail.com');
      await page.waitForTimeout(500);

      // Get the value to verify it was entered
      const enteredEmail = await emailInput.first().inputValue();
      if (enteredEmail === 'iambrew@gmail.com') {
        console.log(`✅ Email successfully entered: ${enteredEmail}`);
      } else {
        console.log(`❌ Email not entered correctly. Got: ${enteredEmail}`);
      }

      // Check for any email validation messages
      const emailError = page.locator('text=/error|invalid|required/i');
      const hasError = await emailError.isVisible().catch(() => false);
      if (!hasError) {
        console.log('✅ No email validation errors');
      } else {
        const errText = await emailError.textContent();
        console.log(`⚠️  Email validation message: ${errText}`);
      }
    } else {
      console.log('❌ NO EMAIL FIELD FOUND IN STEP 4');
      console.log('This needs to be implemented - email field is not present');

      // List what inputs ARE present
      const allInputs = page.locator('input');
      const inputCount = await allInputs.count();
      console.log(`\nFound ${inputCount} total input fields on this step`);

      // Try to get labels to understand what fields are there
      const labels = page.locator('label');
      const labelCount = await labels.count();
      console.log(`Found ${labelCount} labels`);

      if (labelCount > 0) {
        console.log('\nVisible form labels:');
        for (let i = 0; i < Math.min(labelCount, 8); i++) {
          const label = labels.nth(i);
          const text = await label.textContent();
          if (text && text.trim()) {
            console.log(`  - ${text.trim()}`);
          }
        }
      }
    }

    // Step 11: Take screenshot of Step 4
    console.log('\n📸 Taking final screenshot of Step 4 form...');
    await page.screenshot({
      path: '/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/step4-email-test.png',
      fullPage: true
    });
    console.log('✓ Screenshots saved');

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  }

  await page.waitForTimeout(2000);
  await browser.close();
})();

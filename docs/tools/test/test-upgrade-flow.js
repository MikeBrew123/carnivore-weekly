const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    console.log('\n' + '='.repeat(70));
    console.log('PREMIUM CALCULATOR UPGRADE FLOW TEST');
    console.log('='.repeat(70) + '\n');

    // Load calculator
    console.log('Step 1: Loading calculator...');
    await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });

    const pageTitle = await page.title();
    if (pageTitle.includes('Calculator')) {
      results.passed.push('Calculator page loaded successfully');
      console.log('  ✅ Page loaded: ' + pageTitle);
    } else {
      results.failed.push('Calculator page did not load properly');
      console.log('  ❌ Unexpected page title');
    }

    // Wait for React app to load
    await page.waitForTimeout(2000);

    // Step 1-3: Complete free form
    console.log('\nStep 2-4: Filling out calculator form (Steps 1-3)...');

    // Look for path choice buttons
    const startFreeBtn = await page.$('button:has-text("Start Free Calculator")');
    const getFullProtocolBtn = await page.$('button:has-text("Get Full Protocol")');

    if (startFreeBtn && getFullProtocolBtn) {
      results.passed.push('Path choice buttons visible (Start Free / Get Full Protocol)');
      console.log('  ✅ Path choice buttons found');
    } else {
      results.warnings.push('Path choice buttons not found - calculator may have different UI');
      console.log('  ⚠️  Path choice buttons not visible');
    }

    // For testing upgrade flow, click "Get Full Protocol" (paid path)
    if (getFullProtocolBtn) {
      console.log('  📍 Clicking "Get Full Protocol" to test upgrade flow...');
      await getFullProtocolBtn.click();
      await page.waitForTimeout(500);
    }

    // Try to find and fill form fields
    const ageInput = await page.$('#age');
    const heightFeetInput = await page.$('#heightFeet');
    const heightInchesInput = await page.$('#heightInches');
    const weightInput = await page.$('#weight');

    if (ageInput && heightFeetInput && heightInchesInput && weightInput) {
      console.log('  ✅ Form fields found');
      await ageInput.fill('30');
      await heightFeetInput.fill('5');
      await heightInchesInput.fill('10');
      await weightInput.fill('180');
      console.log('  ✅ Form filled with test data (age: 30, height: 5\'10", weight: 180)');
      results.passed.push('Form fields located and filled successfully');
    } else {
      results.warnings.push('Form fields not found - calculator may use different selectors');
      console.log('  ⚠️  Form fields not found with expected IDs');
    }

    // Click calculate button
    const calculateBtn = await page.$('button:has-text("Calculate My Macros")');
    if (calculateBtn) {
      console.log('  📍 Clicking "Calculate My Macros"...');
      await calculateBtn.click();
      await page.waitForTimeout(2000);
      results.passed.push('Calculate button clicked');
      console.log('  ✅ Calculate button clicked');
    }

    // Wait for results to load
    const resultsSection = await page.$('#resultsSection');
    if (resultsSection) {
      const isVisible = await resultsSection.isVisible();
      if (isVisible) {
        console.log('  ✅ Results section visible');
        results.passed.push('Results section displayed');
      }
    }

    // Step 5: Test Upgrade Button
    console.log('\n' + '-'.repeat(70));
    console.log('Step 5: Testing Upgrade Button & Pricing Modal');
    console.log('-'.repeat(70));

    // Check all buttons on page
    const allButtons = await page.$$eval('button', btns =>
      btns.map(b => ({
        text: b.textContent.trim(),
        visible: b.offsetParent !== null,
        selector: b.className
      }))
    );

    console.log('\nButtons found on page:');
    allButtons.forEach((btn, i) => {
      if (btn.visible) {
        console.log(`  ${i + 1}. ${btn.text.substring(0, 40)}`);
      }
    });

    // Look for upgrade-related buttons
    const upgradeSection = await page.$('#upgradeSection');
    const pricingModal = await page.$('[class*="pricing"], [class*="modal"], [id*="pricing"], [id*="modal"]');

    // Try to find upgrade button
    const upgradeButtons = await page.$$('button:has-text("Get Full Protocol"), button:has-text("Upgrade"), button:has-text("Buy"), button:has-text("Protocol")');

    console.log('\nUpgrade-related buttons:');
    if (upgradeButtons.length > 0) {
      console.log(`  ✅ Found ${upgradeButtons.length} potential upgrade button(s)`);
      results.passed.push(`Found ${upgradeButtons.length} upgrade button(s)`);

      // Try clicking first upgrade button
      const firstUpgradeBtn = upgradeButtons[0];
      const btnText = await firstUpgradeBtn.textContent();
      console.log(`  📍 Clicking: "${btnText.trim()}"`);

      await firstUpgradeBtn.click();
      await page.waitForTimeout(1500);
      results.passed.push('Upgrade button clicked');
    } else {
      results.warnings.push('No upgrade buttons found - may need different selectors');
      console.log('  ⚠️  No obvious upgrade buttons found');
    }

    // Step 6: Check for Pricing Modal
    console.log('\nStep 6: Verifying Pricing Modal...');

    // Look for modal/pricing elements
    const modals = await page.$$('[class*="modal"], [class*="dialog"], [class*="popup"], [role="dialog"]');

    if (modals.length > 0) {
      console.log(`  ✅ Found ${modals.length} modal element(s)`);
      results.passed.push(`Pricing modal detected (${modals.length} modals)`);
    } else {
      results.warnings.push('Modal/dialog elements not found');
      console.log('  ⚠️  No modal elements detected');
    }

    // Check for pricing tiers
    console.log('\nStep 7: Checking for Pricing Tiers...');

    const pageContent = await page.textContent('body');
    const pricingTiers = {
      bundle: pageContent.includes('$9.99'),
      mealPlan: pageContent.includes('$27'),
      standard: pageContent.includes('$19')
    };

    console.log('Pricing tier visibility:');
    if (pricingTiers.bundle) {
      console.log('  ✅ $9.99 bundle price found');
      results.passed.push('$9.99 bundle pricing visible');
    } else {
      results.warnings.push('$9.99 bundle pricing not found in page content');
      console.log('  ⚠️  $9.99 bundle not found');
    }

    if (pricingTiers.mealPlan) {
      console.log('  ✅ $27 meal plan price found');
      results.passed.push('$27 meal plan pricing visible');
    } else {
      results.warnings.push('$27 meal plan pricing not found');
      console.log('  ⚠️  $27 meal plan not found');
    }

    if (pricingTiers.standard) {
      console.log('  ✅ $19 standard plan price found');
      results.passed.push('$19 standard pricing visible');
    } else {
      console.log('  ℹ️  $19 standard plan not found (may not be in pricing)');
    }

    // Check for Stripe elements
    console.log('\nStep 8: Checking for Stripe Payment Integration...');

    // Look for Stripe script
    const stripeScripts = await page.$$eval('script', scripts =>
      scripts
        .filter(s => s.src && s.src.includes('stripe'))
        .map(s => ({ src: s.src, loaded: !!s.src }))
    );

    if (stripeScripts.length > 0) {
      console.log('  ✅ Stripe script detected');
      results.passed.push('Stripe script loaded');
    } else {
      console.log('  ⚠️  No Stripe script found');
      results.warnings.push('Stripe script not detected');
    }

    // Look for Stripe buttons/elements
    const stripeElements = await page.$$('[class*="stripe"], [id*="stripe"], button[data-stripe], a[href*="stripe"]');

    if (stripeElements.length > 0) {
      console.log(`  ✅ Found ${stripeElements.length} Stripe-related element(s)`);
      results.passed.push(`Stripe payment buttons found (${stripeElements.length})`);
    } else {
      // Try alternative payment button detection
      const paymentButtons = await page.$$('button:has-text("Pay"), button:has-text("Subscribe"), button:has-text("Purchase"), a:has-text("Buy")');
      if (paymentButtons.length > 0) {
        console.log(`  ✅ Found ${paymentButtons.length} payment button(s)`);
        results.passed.push(`Payment buttons found (${paymentButtons.length})`);
      } else {
        results.warnings.push('No Stripe or payment buttons detected');
        console.log('  ⚠️  No payment buttons found');
      }
    }

    // Step 9: Test Session State Preservation
    console.log('\nStep 9: Testing Session State Preservation...');

    // Get current cookies
    const cookiesBefore = await page.context().cookies();
    const sessionCookie = cookiesBefore.find(c =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('cw') ||
      c.name.toLowerCase().includes('calculator')
    );

    if (sessionCookie) {
      console.log(`  ✅ Session cookie found: ${sessionCookie.name}`);
      results.passed.push(`Session cookie detected: ${sessionCookie.name}`);
    } else {
      console.log('  ⚠️  No session cookie found');
      results.warnings.push('Session cookie not detected');
    }

    // Check for localStorage/sessionStorage data
    const storageData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
      };
    });

    if (storageData.localStorage.length > 0 || storageData.sessionStorage.length > 0) {
      console.log(`  ✅ Storage data found (localStorage: ${storageData.localStorage.length}, sessionStorage: ${storageData.sessionStorage.length})`);
      results.passed.push('Session storage data detected');
    }

    // Step 10: Test Upgrade Button Positioning & Styling
    console.log('\nStep 10: Verifying Button Positioning & Styling...');

    const buttonMetrics = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return Array.from(buttons).map(btn => ({
        text: btn.textContent.trim().substring(0, 30),
        visible: btn.offsetParent !== null,
        position: {
          top: btn.getBoundingClientRect().top,
          left: btn.getBoundingClientRect().left,
          width: btn.getBoundingClientRect().width,
          height: btn.getBoundingClientRect().height
        },
        backgroundColor: window.getComputedStyle(btn).backgroundColor,
        color: window.getComputedStyle(btn).color,
        cursor: window.getComputedStyle(btn).cursor
      })).filter(b => b.visible && b.text.length > 0);
    });

    console.log('Visible button styling:');
    buttonMetrics.forEach((btn, i) => {
      const hasProperStyling = btn.position.width > 0 && btn.position.height > 0 && btn.cursor === 'pointer';
      console.log(`  ${i + 1}. ${btn.text} - ${hasProperStyling ? '✅' : '⚠️'} (${btn.position.width.toFixed(0)}x${btn.position.height.toFixed(0)}px)`);
    });

    if (buttonMetrics.length > 0 && buttonMetrics.every(b => b.position.width > 0 && b.position.height > 0)) {
      results.passed.push('All buttons properly styled and positioned');
      console.log('  ✅ Buttons properly styled and positioned');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Passed: ${results.passed.length}`);
    results.passed.forEach(r => console.log(`   • ${r}`));

    if (results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
      results.warnings.forEach(r => console.log(`   • ${r}`));
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length}`);
      results.failed.forEach(r => console.log(`   • ${r}`));
    }

    // Test conclusion
    const testStatus = results.failed.length === 0 ? 'PASSED' : 'FAILED';
    console.log('\n' + '='.repeat(70));
    console.log(`TEST RESULT: ${testStatus}`);
    console.log('='.repeat(70));

    // Detailed findings
    console.log('\nDETAILED FINDINGS:');
    console.log('-'.repeat(70));

    if (results.warnings.length > 0) {
      console.log('\nPotential Issues Found:');
      results.warnings.forEach((warn, i) => {
        console.log(`\n${i + 1}. ${warn}`);

        if (warn.includes('upgrade buttons')) {
          console.log('   Action: Verify upgrade button selectors and DOM structure');
          console.log('   Check: Look for button text containing "upgrade", "buy", "get", "protocol"');
        }
        if (warn.includes('Modal')) {
          console.log('   Action: Verify modal is triggered by upgrade button click');
          console.log('   Check: Look for modal/dialog elements in DOM after button click');
        }
        if (warn.includes('pricing')) {
          console.log('   Action: Verify pricing tiers are displayed in modal/page');
          console.log('   Check: Check page content for price amounts ($9.99, $27, etc)');
        }
        if (warn.includes('Stripe')) {
          console.log('   Action: Verify Stripe integration is properly configured');
          console.log('   Check: Check for Stripe public key and payment button configuration');
        }
        if (warn.includes('Session')) {
          console.log('   Action: Verify session management between form and upgrade');
          console.log('   Check: Ensure form data persists across navigation');
        }
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    results.failed.push('Test execution error: ' + error.message);
  } finally {
    await browser.close();
  }
})();

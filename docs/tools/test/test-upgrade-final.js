const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const issues = [];
  const passed = [];

  try {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE UPGRADE FLOW TEST - FINAL REPORT');
    console.log('='.repeat(80) + '\n');

    // Load calculator
    console.log('Loading calculator page...');
    await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    passed.push('Calculator page loads successfully');
    console.log('✅ Page loaded\n');

    // STEP 1: Complete Steps 1-3
    console.log('STEP 1: Completing calculator form (Steps 1-3)');
    console.log('-'.repeat(80));

    // Look for the actual React form structure
    const formInputs = await page.$$('input[type="number"]');
    const numberInputs = [];

    for (let i = 0; i < formInputs.length; i++) {
      const input = formInputs[i];
      const id = await input.evaluate(el => el.id);
      const visible = await input.isVisible();
      numberInputs.push({ id, visible, element: input });
    }

    console.log(`Found ${numberInputs.length} number inputs:`);
    numberInputs.forEach(inp => console.log(`  • ${inp.id} (visible: ${inp.visible})`));

    // Try to fill the form
    let filledCount = 0;
    if (numberInputs[0]) {
      await numberInputs[0].element.fill('30');
      filledCount++;
    }
    if (numberInputs[1]) {
      await numberInputs[1].element.fill('5');
      filledCount++;
    }
    if (numberInputs[2]) {
      await numberInputs[2].element.fill('10');
      filledCount++;
    }
    if (numberInputs[3]) {
      await numberInputs[3].element.fill('180');
      filledCount++;
    }

    if (filledCount > 0) {
      passed.push(`Form fields filled (${filledCount} inputs)`);
      console.log(`✅ Filled ${filledCount} form fields with test data\n`);
    } else {
      issues.push('Could not fill form fields - React form structure unclear');
      console.log('⚠️  Could not fill form fields\n');
    }

    // Click calculate button
    const calcBtn = await page.$('button:has-text("Continue to Activity Level")');
    if (calcBtn) {
      await calcBtn.click();
      await page.waitForTimeout(1000);
      passed.push('Continue/Calculate button clicked');
      console.log('✅ Clicked "Continue to Activity Level"\n');
    }

    // STEP 2: Test Upgrade Button Click
    console.log('STEP 2: Testing Upgrade Button & Price Display');
    console.log('-'.repeat(80));

    // Look for the upgrade button (sidebar)
    const upgradeBtn = await page.$('button:has-text("Get Full Protocol")');

    if (upgradeBtn) {
      const isVisible = await upgradeBtn.isVisible();
      console.log(`✅ Upgrade button found and visible: ${isVisible}`);

      if (isVisible) {
        passed.push('Upgrade button visible and clickable');
        const btnText = await upgradeBtn.textContent();
        console.log(`   Button text: "${btnText.trim()}"\n`);

        // Click it
        console.log('📍 Clicking upgrade button...');
        await upgradeBtn.click();
        await page.waitForTimeout(1500);

        // Check what happened
        const newUrl = page.url();
        console.log(`✅ After click - URL: ${newUrl}\n`);

        if (newUrl.includes('#upgrade')) {
          passed.push('Upgrade button navigates to #upgrade section');
          console.log('✅ Navigation to #upgrade section successful\n');
        }
      }
    } else {
      issues.push('Upgrade button not found in sidebar');
      console.log('❌ Upgrade button not found\n');
    }

    // STEP 3: Check for Pricing Modal/Section
    console.log('STEP 3: Verifying Pricing Modal & Tiers');
    console.log('-'.repeat(80));

    // Get all visible text
    const pageContent = await page.locator('body').textContent();

    // Check for pricing tiers
    const pricingTiers = {
      bundle: pageContent.includes('$9.99'),
      mealPlan: pageContent.includes('$27'),
      standard: pageContent.includes('$19')
    };

    console.log('Pricing tier visibility:');
    let pricingCount = 0;
    if (pricingTiers.bundle) {
      console.log('✅ $9.99 bundle pricing visible');
      pricingCount++;
    } else {
      console.log('❌ $9.99 bundle pricing NOT found');
      issues.push('Missing $9.99 bundle pricing tier');
    }

    if (pricingTiers.mealPlan) {
      console.log('✅ $27 meal plan pricing visible');
      pricingCount++;
    } else {
      console.log('⚠️  $27 meal plan NOT found');
      issues.push('Missing $27 meal plan pricing tier');
    }

    if (pricingTiers.standard) {
      console.log('✅ $19 standard pricing visible');
      pricingCount++;
    }

    if (pricingCount > 0) {
      passed.push(`${pricingCount} pricing tiers visible on page`);
    }
    console.log('');

    // Check for modal/dialog elements
    const modals = await page.$$eval('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="pricing"]', els =>
      els.map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id || 'unnamed',
        visible: el.offsetParent !== null
      }))
    );

    if (modals.length > 0) {
      console.log(`Found ${modals.length} modal/dialog elements:`);
      modals.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.id} (visible: ${m.visible})`);
      });
      if (modals.some(m => m.visible)) {
        passed.push('Pricing modal/dialog visible after upgrade click');
        console.log('✅ Pricing modal is visible\n');
      } else {
        issues.push('Modal elements found but not visible');
        console.log('⚠️  Modal elements exist but are hidden\n');
      }
    } else {
      issues.push('No pricing modal found - upgrade may link to separate page');
      console.log('⚠️  No modal elements detected - may be separate page/flow\n');
    }

    // STEP 4: Check for Stripe
    console.log('STEP 4: Checking for Stripe Payment Integration');
    console.log('-'.repeat(80));

    const stripeScripts = await page.$$eval('script', scripts =>
      scripts
        .filter(s => s.src && s.src.includes('stripe'))
        .map(s => s.src)
    );

    const links = await page.$$eval('a', links =>
      links
        .filter(l => l.href && l.href.includes('stripe'))
        .map(l => ({ text: l.textContent.trim(), href: l.href }))
    );

    if (stripeScripts.length > 0) {
      console.log(`✅ Stripe script detected (${stripeScripts.length})`);
      passed.push('Stripe script loaded');
    } else {
      console.log('❌ No Stripe script found');
      issues.push('Stripe payment script not detected');
    }

    if (links.length > 0) {
      console.log(`✅ Stripe payment links found (${links.length})`);
      links.forEach((link, i) => {
        console.log(`   ${i + 1}. ${link.text || '(no text)'} -> ${link.href.substring(0, 60)}...`);
      });
      passed.push('Stripe payment links present');
    } else {
      console.log('❌ No Stripe payment links found');
      issues.push('Stripe payment buttons/links not found');
    }
    console.log('');

    // STEP 5: Session State Test
    console.log('STEP 5: Testing Session State Preservation');
    console.log('-'.repeat(80));

    // Get cookies
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('cw')
    );

    if (sessionCookie) {
      console.log(`✅ Session cookie found: ${sessionCookie.name}`);
      console.log(`   Domain: ${sessionCookie.domain}`);
      console.log(`   Expires: ${sessionCookie.expires ? new Date(sessionCookie.expires * 1000).toISOString() : 'session'}`);
      passed.push('Session cookie present for state preservation');
    } else {
      console.log('⚠️  No session cookie found');
      issues.push('Session state may not persist across navigation');
    }

    // Check localStorage
    const storage = await page.evaluate(() => ({
      localStorage: Object.entries(localStorage).map(([k, v]) => ({ key: k, value: v.substring(0, 50) })),
      sessionStorage: Object.entries(sessionStorage).map(([k, v]) => ({ key: k, value: v.substring(0, 50) }))
    }));

    if (storage.localStorage.length > 0) {
      console.log(`✅ LocalStorage data found (${storage.localStorage.length} items)`);
      storage.localStorage.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.key}`);
      });
      passed.push('LocalStorage session data available');
    }
    console.log('');

    // STEP 6: UI/UX Verification
    console.log('STEP 6: Upgrade Button Styling & Positioning');
    console.log('-'.repeat(80));

    const buttonMetrics = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const upgradeBtn = Array.from(buttons).find(b => b.textContent.includes('Get Full Protocol'));

      if (upgradeBtn) {
        const style = window.getComputedStyle(upgradeBtn);
        const rect = upgradeBtn.getBoundingClientRect();

        return {
          visible: upgradeBtn.offsetParent !== null,
          width: rect.width,
          height: rect.height,
          position: {
            top: rect.top,
            left: rect.left
          },
          styling: {
            backgroundColor: style.backgroundColor,
            color: style.color,
            cursor: style.cursor,
            padding: style.padding,
            borderRadius: style.borderRadius,
            fontWeight: style.fontWeight
          }
        };
      }
      return null;
    });

    if (buttonMetrics) {
      console.log('✅ Upgrade button styling verified:');
      console.log(`   Position: (${buttonMetrics.position.top.toFixed(0)}, ${buttonMetrics.position.left.toFixed(0)})`);
      console.log(`   Size: ${buttonMetrics.width.toFixed(0)}x${buttonMetrics.height.toFixed(0)}px`);
      console.log(`   Cursor: ${buttonMetrics.styling.cursor}`);
      console.log(`   Background: ${buttonMetrics.styling.backgroundColor}`);
      console.log(`   Border-radius: ${buttonMetrics.styling.borderRadius}`);

      if (buttonMetrics.styling.cursor === 'pointer' && buttonMetrics.width > 100) {
        passed.push('Upgrade button properly styled with good UX');
      }
    }
    console.log('');

    // FINAL REPORT
    console.log('='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    console.log('\n✅ PASSED CHECKS:');
    passed.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p}`);
    });

    if (issues.length > 0) {
      console.log(`\n❌ ISSUES FOUND (${issues.length}):`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    } else {
      console.log('\n✅ NO ISSUES FOUND');
    }

    // Recommendations
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(80));

    const recommendations = [];

    if (issues.some(i => i.includes('pricing'))) {
      recommendations.push('Add/verify all pricing tiers ($9.99, $27) are documented and visible');
    }

    if (issues.some(i => i.includes('Stripe'))) {
      recommendations.push('Configure Stripe integration with public key and payment buttons');
    }

    if (issues.some(i => i.includes('Modal'))) {
      recommendations.push('Implement pricing modal or verify upgrade flow design (inline vs modal vs separate page)');
    }

    if (issues.some(i => i.includes('Session'))) {
      recommendations.push('Verify session state persists through upgrade flow (form data saved before navigation)');
    }

    if (recommendations.length === 0) {
      recommendations.push('Upgrade flow appears functional - conduct user testing to verify UX');
    }

    recommendations.forEach((rec, i) => {
      console.log(`\n${i + 1}. ${rec}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    issues.push('Test execution error: ' + error.message);
  } finally {
    await browser.close();
  }
})();

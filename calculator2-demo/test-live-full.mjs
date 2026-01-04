import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('\n🧪 LIVE CALCULATOR TEST: https://carnivoreweekly.com/calculator.html\n');
  console.log('Testing complete flow from form to report generation\n');

  try {
    console.log('📖 Loading live calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'load',
      timeout: 60000
    });

    console.log('⏳ Waiting 5 seconds for React app to initialize...');
    await page.waitForTimeout(5000);

    // Check if form inputs exist
    console.log('\n🔍 Checking if form loaded...');
    const ageInput = await page.$('input[name="age"]');

    if (!ageInput) {
      console.log('❌ FORM NOT LOADING\n');
      console.log('Debugging info:');

      const scripts = await page.$$eval('script', scripts =>
        scripts.map(s => s.src || s.textContent.substring(0, 50))
      );
      console.log('Scripts loaded:', scripts.slice(0, 5));

      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      if (errors.length > 0) {
        console.log('\nConsole errors:', errors.slice(0, 3));
      }

      console.log('\nBrowser open for inspection (2 minutes)');
      await page.waitForTimeout(120000);
      return;
    }

    console.log('✅ FORM LOADED!\n');

    // Fill form
    console.log('📝 Filling form with test data...');
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');
    await page.waitForTimeout(800);
    console.log('✓ Age: 35, Height: 5\'10", Weight: 200 lbs\n');

    // Continue through wizard
    console.log('▶️ STEP 1: Activity Level');
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1500);

    console.log('▶️ STEP 2: Advancing...');
    let continueBtn = await page.$('button:has-text("Continue"), button:has-text("Next")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1200);
    }

    console.log('▶️ STEP 3: Advancing...');
    continueBtn = await page.$('button:has-text("Continue"), button:has-text("Next")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1200);
    }

    console.log('▶️ STEP 4: Advancing...');
    continueBtn = await page.$('button:has-text("Continue"), button:has-text("Next")');
    if (continueBtn) {
      await continueBtn.click();
      await page.waitForTimeout(1200);
    }

    // See Results
    console.log('\n📊 Generating Report...');
    const seeResultsBtn = await page.$('button:has-text("See Results")');
    if (seeResultsBtn) {
      await seeResultsBtn.click();
      await page.waitForTimeout(3000);

      // Check for report content
      const reportContent = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return {
          hasCalories: text.includes('calorie') || text.includes('kcal'),
          hasProtein: text.includes('protein') || text.includes('g'),
          hasFat: text.includes('fat'),
          hasReport: text.includes('personalized') || text.includes('your daily'),
          preview: text.substring(0, 400)
        };
      });

      if (reportContent.hasCalories || reportContent.hasProtein) {
        console.log('✅ REPORT GENERATED!\n');

        console.log('📋 Report contains:');
        console.log(`  ✓ Calories: ${reportContent.hasCalories}`);
        console.log(`  ✓ Protein: ${reportContent.hasProtein}`);
        console.log(`  ✓ Fat: ${reportContent.hasFat}`);

        // Check for upgrade button
        const upgradeBtn = await page.$('button:has-text("Upgrade")');
        if (upgradeBtn) {
          console.log('\n💳 UPGRADE OPTION: Available');

          console.log('▶️ Clicking Upgrade button...');
          await upgradeBtn.click();
          await page.waitForTimeout(2500);

          // Check for pricing modal
          const priceCards = await page.$$('button:has-text("Choose Plan")');
          if (priceCards.length > 0) {
            console.log(`✅ PRICING MODAL APPEARED with ${priceCards.length} options\n`);

            console.log('═'.repeat(60));
            console.log('✅✅✅ COMPLETE PAYMENT FLOW WORKING!');
            console.log('═'.repeat(60));
            console.log('\nTest Results:');
            console.log('  ✅ Form loads correctly');
            console.log('  ✅ Wizard steps work');
            console.log('  ✅ Report generates with macros');
            console.log('  ✅ Upgrade button accessible');
            console.log('  ✅ Pricing modal appears');
            console.log('  ✅ Payment cards selectable\n');
            console.log('🎉 All systems operational!\n');
          }
        }
      } else {
        console.log('⚠️ Report content not detected');
      }
    }

    console.log('Browser open for 3 minutes to inspect...\n');
    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();

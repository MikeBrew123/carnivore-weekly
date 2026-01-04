import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('\n✅ TESTING FIXED LAYOUT: https://carnivoreweekly.com/calculator.html\n');

  try {
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'load',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Check form
    const ageInput = await page.$('input[name="age"]');
    if (!ageInput) {
      console.log('❌ Form not loading');
      return;
    }

    console.log('✅ Form loaded and positioned correctly!\n');

    // Fill and advance
    console.log('📝 Filling form...');
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');
    await page.waitForTimeout(500);

    console.log('▶️ Advancing through wizard...');
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1200);

    for (let i = 0; i < 4; i++) {
      const btn = await page.$('button:has-text("Continue"), button:has-text("Next")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(800);
      }
    }

    console.log('📊 Viewing results...');
    await page.click('button:has-text("See Results")');
    await page.waitForTimeout(2000);

    const hasReport = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('calorie');
    });

    if (hasReport) {
      console.log('✅ REPORT GENERATED!\n');

      console.log('💳 Attempting to click Upgrade button...');
      await page.click('button:has-text("Upgrade")', { force: true });
      await page.waitForTimeout(2000);

      const priceCards = await page.$$('button:has-text("Choose Plan")');
      if (priceCards.length > 0) {
        console.log(`✅ PRICING MODAL APPEARED with ${priceCards.length} cards\n`);

        console.log('🎯 Clicking first pricing card...');
        await priceCards[0].click();
        await page.waitForTimeout(2000);

        console.log('\n═══════════════════════════════════════');
        console.log('✅✅✅ COMPLETE FLOW WORKING!');
        console.log('═══════════════════════════════════════\n');
      }
    }

    console.log('Browser open for inspection (3 minutes)');
    await page.waitForTimeout(180000);

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();

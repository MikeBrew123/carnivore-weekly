import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const screenshotDir = '/tmp/embedded-calculator-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    console.log('🧪 Embedded Calculator Flow Test\n');

    console.log('📍 Loading embedded calculator page...');
    await page.goto('http://localhost:8877/public/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');

    // Step 1: Fill physical stats
    console.log('📝 Step 1: Filling Physical Stats...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('30');
    await page.locator('input[name="heightFeet"]').fill('6');
    await page.locator('input[name="heightInches"]').fill('0');
    await page.locator('input[name="weight"]').fill('200');

    await page.screenshot({ path: `${screenshotDir}/step1-filled.png` });
    console.log('✅ Step 1 filled');

    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(1000);
    console.log('✅ Advanced to Step 2\n');

    // Step 2: Fill fitness & diet
    console.log('📝 Step 2: Filling Fitness & Diet...');

    // Check what fields are on Step 2
    const step2Fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select'));
      return inputs.map(el => ({
        tag: el.tagName.toLowerCase(),
        name: el.name || 'N/A',
        type: el.type || 'N/A'
      }));
    });

    console.log('Step 2 fields:', step2Fields.length);

    // Try to find and fill activity level
    const hasActivityLevel = await page.locator('[name="activityLevel"], [name="lifestyle"]').count() > 0;
    if (hasActivityLevel) {
      await page.locator('[name="activityLevel"], [name="lifestyle"]').first().selectOption('moderate');
    }

    // Try to find goal radio buttons
    const hasGoalMaintain = await page.locator('input[type="radio"][value="maintain"]').count() > 0;
    if (hasGoalMaintain) {
      await page.locator('input[type="radio"][value="maintain"]').click();
    }

    // Try to find diet select
    const hasDiet = await page.locator('[name="currentDiet"], [name="diet"]').count() > 0;
    if (hasDiet) {
      await page.locator('[name="currentDiet"], [name="diet"]').first().selectOption('carnivore');
    }

    await page.screenshot({ path: `${screenshotDir}/step2-filled.png` });
    console.log('✅ Step 2 filled');

    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(1500);
    console.log('✅ Advanced to Step 3\n');

    // Step 3: Validate results
    console.log('🎨 Step 3: Validating Results Page...');

    const hasHeading = await page.locator('text=/Your Personalized/i').count() > 0;
    const hasProfile = await page.locator('text=/Sex:/i').count() > 0;
    const hasMacros = await page.locator('text=/Daily Calories/i').count() > 0;
    const hasUpgradeButton = await page.locator('button:has-text("Upgrade")').count() > 0;
    const hasBackButton = await page.locator('button:has-text("Back")').count() > 0;

    console.log('  Main heading:', hasHeading ? '✅' : '❌');
    console.log('  Profile summary:', hasProfile ? '✅' : '❌');
    console.log('  Macros display:', hasMacros ? '✅' : '❌');
    console.log('  Upgrade button:', hasUpgradeButton ? '✅' : '❌');
    console.log('  Back button:', hasBackButton ? '✅' : '❌');

    await page.screenshot({ path: `${screenshotDir}/step3-results.png`, fullPage: true });
    console.log('\n📸 Screenshots saved to:', screenshotDir);

    const allGood = hasHeading && hasProfile && hasMacros && hasUpgradeButton && hasBackButton;

    console.log('\n' + (allGood ? '✅ EMBEDDED CALCULATOR VALIDATION PASSED' : '❌ VALIDATION FAILED'));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png` });
  } finally {
    await browser.close();
  }
})();

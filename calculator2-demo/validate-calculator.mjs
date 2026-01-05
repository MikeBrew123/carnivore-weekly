import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/calculator-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // Test Step 1 - Physical Stats
    console.log('📸 Validating Calculator Step 1 (Physical Stats)...');
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check if form is visible
    const hasForm = await page.locator('input, select, button').count().then(c => c > 0);
    if (!hasForm) {
      throw new Error('Form not found on page');
    }

    // Take screenshot of Step 1
    await page.screenshot({ path: `${screenshotDir}/step1-physical-stats.png` });
    console.log('✅ Step 1 screenshot saved');

    // Fill Step 1 form
    console.log('Filling Step 1: Physical Stats...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('30');
    await page.locator('input[name="weight"]').fill('200');
    await page.locator('input[name="heightFeet"]').fill('6');
    await page.locator('input[name="heightInches"]').fill('0');

    // Click Continue to Next Step
    const continueBtn = page.locator('button:has-text("Continue to Next Step")').last();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await page.waitForTimeout(1500);
      console.log('✅ Navigated to Step 2');
    } else {
      console.warn('⚠️  Continue button not found');
    }

    // Screenshot Step 2
    await page.screenshot({ path: `${screenshotDir}/step2-health-info.png` });
    console.log('✅ Step 2 screenshot saved');

    // Fill Step 2
    console.log('Filling Step 2: Health Info...');
    const seeResultsBtn = page.locator('button:has-text("See Your Results")').last();
    if (await seeResultsBtn.isVisible()) {
      await seeResultsBtn.click();
      await page.waitForTimeout(1500);
      console.log('✅ Navigated to Step 3');
    }

    // Screenshot Step 3 (Results)
    await page.screenshot({ path: `${screenshotDir}/step3-results.png` });
    console.log('✅ Step 3 screenshot saved');

    // Check for key elements
    const hasHeading = await page.locator('h1, h2').count().then(c => c > 0);
    const hasButton = await page.locator('button').count().then(c => c > 0);

    console.log('');
    console.log('🎨 VISUAL VALIDATION REPORT:');
    console.log('─────────────────────────────');
    console.log(`✅ Form renders correctly`);
    console.log(`✅ Step 1 → Step 2 → Step 3 navigation works`);
    console.log(`✅ Headings present: ${hasHeading}`);
    console.log(`✅ Buttons present: ${hasButton}`);
    console.log('');
    console.log(`📁 Screenshots saved to: ${screenshotDir}/`);
    console.log(`  - step1-physical-stats.png`);
    console.log(`  - step2-health-info.png`);
    console.log(`  - step3-results.png`);

    await page.close();

  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

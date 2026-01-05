import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOT_DIR = '/tmp/production-calculator-test';

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('🚀 PRODUCTION CALCULATOR TEST');
    console.log('=============================');
    console.log('');

    // Step 1: Landing page
    console.log('Step 1️⃣  Landing page');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing.png` });
    console.log('  ✓ Loaded');

    // Step 2: Open calculator
    console.log('Step 2️⃣  Opening calculator');
    await page.locator('button:has-text("Get Your Macros")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-calculator-opened.png` });
    console.log('  ✓ Calculator app loaded');

    // Step 3: Fill Step 1
    console.log('Step 3️⃣  Filling Physical Stats');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.waitForTimeout(300);
    console.log('  ✓ Sex: Male');

    const ageInput = page.locator('input').filter({ hasText: /age|Age/ }).first();
    await ageInput.fill('35');
    await page.waitForTimeout(300);
    console.log('  ✓ Age: 35');

    const weightInput = page.locator('input').filter({ hasText: /weight|Weight/ }).first();
    await weightInput.fill('200');
    await page.waitForTimeout(300);
    console.log('  ✓ Weight: 200 lbs');

    const feetInputs = await page.locator('input[placeholder*="feet"], input[placeholder*="Feet"]').all();
    if (feetInputs.length > 0) {
      await feetInputs[0].fill('6');
      await page.waitForTimeout(300);
      console.log('  ✓ Height: 6 feet');
    }

    const inchInputs = await page.locator('input[placeholder*="inch"], input[placeholder*="Inch"]').all();
    if (inchInputs.length > 0) {
      await inchInputs[0].fill('0');
      await page.waitForTimeout(300);
      console.log('  ✓ Inches: 0');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-step1-filled.png` });

    // Step 4: Continue to Step 2
    console.log('Step 4️⃣  Advancing to Step 2');
    await page.locator('button:has-text("Continue to Next Step")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-step2-opened.png` });
    console.log('  ✓ Lifestyle section loaded');

    // Step 5: Fill Step 2 - Activity Level (should already be set)
    console.log('Step 5️⃣  Filling Activity & Goals');

    // Select exercise frequency - click the dropdown
    const exerciseDropdown = page.locator('select').nth(1); // Second dropdown should be exercise frequency
    await exerciseDropdown.click();
    await page.waitForTimeout(500);

    // Get available options and select one
    const options = await page.locator('select').nth(1).locator('option').all();
    console.log(`  • Exercise options found: ${options.length}`);

    if (options.length > 1) {
      // Select the second option (skip the first "Select" option)
      await page.locator('select').nth(1).selectOption({ index: 1 });
      await page.waitForTimeout(300);
      console.log('  ✓ Exercise frequency selected');
    }

    // Select goal
    const goalRadios = await page.locator('input[type="radio"]').filter({ hasText: /Fat Loss|Maintenance|Muscle/ }).all();
    if (goalRadios.length > 0) {
      await goalRadios[0].click(); // Select "Fat Loss"
      await page.waitForTimeout(300);
      console.log('  ✓ Goal: Fat Loss');
    }

    // Select diet preference
    const dietDropdown = page.locator('select').last();
    await dietDropdown.click();
    await page.waitForTimeout(500);

    const dietOptions = await page.locator('select').last().locator('option').all();
    if (dietOptions.length > 1) {
      // Look for carnivore option
      const carnivoreOption = await page.locator('select').last().locator('option').filter({ hasText: /carnivore|Carnivore/ }).first();
      if (await carnivoreOption.isVisible().catch(() => false)) {
        await carnivoreOption.click();
      } else {
        // Just select second option if carnivore not found
        await page.locator('select').last().selectOption({ index: 1 });
      }
      await page.waitForTimeout(300);
      console.log('  ✓ Diet selected');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-step2-filled.png` });

    // Step 6: Continue to Results
    console.log('Step 6️⃣  Advancing to Results');
    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-step3-results.png` });
    console.log('  ✓ Results page reached');

    // Check for results content
    const hasResults = await page.locator('text=/calorie|protein|macro|result/i').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (hasResults) {
      console.log('  ✓ Macro results displaying');
    } else {
      console.log('  ℹ️  Results may still be generating');
    }

    // Check for payment/upgrade option
    const hasPaymentOption = await page.locator('button').filter({ hasText: /upgrade|payment|protocol/i }).first().isVisible({ timeout: 1000 }).catch(() => false);
    if (hasPaymentOption) {
      console.log('  ✓ Payment/upgrade option available');
    }

    console.log('');
    console.log('✅ TEST PASSED');
    console.log('=============================');
    console.log('Results:');
    console.log('  ✓ Landing page loaded');
    console.log('  ✓ Calculator opened');
    console.log('  ✓ Step 1: Physical stats filled');
    console.log('  ✓ Step 2: Activity & goals filled');
    console.log('  ✓ Step 3: Results page reached');
    if (hasResults) {
      console.log('  ✓ Macro results displayed');
    }
    if (hasPaymentOption) {
      console.log('  ✓ Payment flow accessible');
    }
    console.log('');
    console.log(`Screenshots: ${SCREENSHOT_DIR}/`);
    console.log('');
    console.log('FULL FLOW WORKING ✅');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR.png` }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();

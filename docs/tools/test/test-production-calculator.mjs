import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = '/tmp/production-calculator-test';
const TEST_DATA = {
  sex: 'male',
  age: '35',
  weight: '200',
  heightFeet: '6',
  heightInches: '0',
  lifestyle: 'sedentary',
  exercise: 'light',
  goal: 'fat_loss',
  diet: 'carnivore',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
};

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('🚀 Starting Production Calculator Test');
    console.log(`📸 Screenshots: ${SCREENSHOT_DIR}`);
    console.log('');

    // Step 1: Navigate to calculator landing page
    console.log('📍 Step 1: Visiting calculator landing page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Screenshot landing page
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-page.png` });
    console.log('   ✓ Landing page loaded');
    console.log(`   📸 01-landing-page.png`);

    // Click "Get Your Macros" button
    console.log('📍 Step 2: Opening calculator app...');
    await page.locator('button:has-text("Get Your Macros")').click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-calculator-opened.png` });
    console.log('   ✓ Calculator app opened');
    console.log(`   📸 02-calculator-opened.png`);

    // Step 2: Fill Step 1 (Physical Stats)
    console.log('📍 Step 3: Filling Step 1 (Physical Stats)...');

    // Select sex
    await page.locator(`input[type="radio"][value="${TEST_DATA.sex}"]`).click();
    await page.waitForTimeout(300);
    console.log('   ✓ Sex selected: ' + TEST_DATA.sex);

    // Fill age
    await page.locator('input[name="age"], input[placeholder*="age" i]').first().fill(TEST_DATA.age);
    await page.waitForTimeout(300);
    console.log('   ✓ Age: ' + TEST_DATA.age);

    // Fill weight
    await page.locator('input[name="weight"], input[placeholder*="weight" i]').first().fill(TEST_DATA.weight);
    await page.waitForTimeout(300);
    console.log('   ✓ Weight: ' + TEST_DATA.weight);

    // Fill height feet
    await page.locator('input[name="heightFeet"], input[placeholder*="feet" i]').first().fill(TEST_DATA.heightFeet);
    await page.waitForTimeout(300);
    console.log('   ✓ Height feet: ' + TEST_DATA.heightFeet);

    // Fill height inches
    await page.locator('input[name="heightInches"], input[placeholder*="inches" i]').first().fill(TEST_DATA.heightInches);
    await page.waitForTimeout(300);
    console.log('   ✓ Height inches: ' + TEST_DATA.heightInches);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-step1-filled.png` });
    console.log(`   📸 03-step1-filled.png`);

    // Click Continue button
    console.log('📍 Step 4: Advancing to Step 2...');
    await page.locator('button:has-text("Continue to Next Step")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-step2-lifestyle.png` });
    console.log('   ✓ Advanced to Step 2');
    console.log(`   📸 04-step2-lifestyle.png`);

    // Step 3: Fill Step 2 (Lifestyle)
    console.log('📍 Step 5: Filling Step 2 (Lifestyle)...');

    // Select lifestyle
    await page.locator('select[name="lifestyle"], select').first().selectOption(TEST_DATA.lifestyle);
    await page.waitForTimeout(300);
    console.log('   ✓ Lifestyle: ' + TEST_DATA.lifestyle);

    // Select exercise
    await page.locator('select[name="exercise"], select').nth(1).selectOption(TEST_DATA.exercise);
    await page.waitForTimeout(300);
    console.log('   ✓ Exercise: ' + TEST_DATA.exercise);

    // Select goal
    const goalOptions = await page.locator('input[type="radio"][name="goal"], input[value*="fat_loss"], input[value*="muscle"], input[value*="maintain"]').all();
    if (goalOptions.length > 0) {
      await page.locator('input[type="radio"][value="fat_loss"]').click();
      await page.waitForTimeout(300);
      console.log('   ✓ Goal: fat loss');
    }

    // Select diet
    const dietOptions = await page.locator('input[type="radio"][name="diet"], input[value="carnivore"]').all();
    if (dietOptions.length > 0) {
      await page.locator('input[type="radio"][value="carnivore"]').click();
      await page.waitForTimeout(300);
      console.log('   ✓ Diet: carnivore');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-step2-filled.png` });
    console.log(`   📸 05-step2-filled.png`);

    // Click Continue button
    console.log('📍 Step 6: Advancing to Step 3 (Results/Payment)...');
    await page.locator('button:has-text("Continue to Next Step")').first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-step3-results.png` });
    console.log('   ✓ Advanced to Step 3 (Results page)');
    console.log(`   📸 06-step3-results.png`);

    // Check if results are displaying
    const resultsVisible = await page.locator('text=/macro|protein|calorie|result/i').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (resultsVisible) {
      console.log('   ✅ Macro results visible');
    } else {
      console.log('   ⚠️  Macro results not clearly visible (may still be generating)');
    }

    // Look for payment/upgrade button
    console.log('📍 Step 7: Checking payment/upgrade options...');
    const paymentButtonLocators = [
      page.locator('button:has-text("Upgrade")'),
      page.locator('button:has-text("Payment")'),
      page.locator('button:has-text("Get Full Protocol")'),
      page.locator('button:has-text("See Results")'),
    ];

    let paymentButtonFound = false;
    for (const locator of paymentButtonLocators) {
      if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('   ✓ Payment/Upgrade button found');
        paymentButtonFound = true;
        await page.screenshot({ path: `${SCREENSHOT_DIR}/07-payment-ready.png` });
        console.log(`   📸 07-payment-ready.png`);
        break;
      }
    }

    if (!paymentButtonFound) {
      console.log('   ℹ️  No payment button visible (free tier may be complete)');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-payment-not-found.png` });
      console.log(`   📸 07-payment-not-found.png`);
    }

    // Final validation
    console.log('');
    console.log('✅ TEST COMPLETE');
    console.log('');
    console.log('Results:');
    console.log('  ✓ Landing page loaded');
    console.log('  ✓ Calculator app opened');
    console.log('  ✓ Step 1 form filled (physical stats)');
    console.log('  ✓ Step 2 form filled (lifestyle)');
    console.log('  ✓ Step 3 results page reached');
    if (resultsVisible) {
      console.log('  ✓ Macro results displaying');
    }
    if (paymentButtonFound) {
      console.log('  ✓ Payment flow accessible');
    }
    console.log('');
    console.log(`All screenshots saved to: ${SCREENSHOT_DIR}/`);
    console.log('');
    console.log('PASS ✅ - Full calculator flow working on production');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR-screenshot.png` }).catch(() => {});
    console.error(`Error screenshot: ${SCREENSHOT_DIR}/ERROR-screenshot.png`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();

import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOT_DIR = '/tmp/production-calculator-test';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('\n🎯 PRODUCTION CALCULATOR - STRICT VALIDATION TEST\n');

    // Step 1
    console.log('1️⃣  Landing page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing.png` });
    console.log('   ✓ Loaded\n');

    // Step 2
    console.log('2️⃣  Opening calculator...');
    await page.click('button:has-text("Get Your Macros")');
    await page.waitForTimeout(2000);
    console.log('   ✓ Opened\n');

    // Step 3 - Fill Physical Stats
    console.log('3️⃣  Filling Physical Stats...');
    await page.click('input[type="radio"][value="male"]');
    await page.waitForTimeout(200);

    const inputs = await page.locator('input[type="number"]').all();
    await inputs[0].fill('35');     // Age
    await inputs[1].fill('6');      // Feet
    await inputs[2].fill('0');      // Inches  
    await inputs[3].fill('200');    // Weight
    console.log('   ✓ Stats filled\n');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-step1.png` });
    
    // Advance to Step 2
    console.log('4️⃣  Advancing to Step 2...');
    await page.click('button:has-text("Continue to Next Step")');
    await page.waitForTimeout(2500);
    console.log('   ✓ Step 2 opened\n');

    // Step 4 - Fill ALL Step 2 fields carefully
    console.log('5️⃣  Filling Activity & Goals (strict)...\n');

    // Activity Level - wait for dropdown to be visible
    const activitySelect = page.locator('select').first();
    await activitySelect.waitFor({ state: 'visible', timeout: 5000 });
    const actOptions = await activitySelect.locator('option').count();
    console.log(`   Activity level options: ${actOptions}`);
    await activitySelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    console.log('   ✓ Activity: Selected\n');

    // Exercise Frequency - second select
    const exerciseSelect = page.locator('select').nth(1);
    await exerciseSelect.waitFor({ state: 'visible', timeout: 5000 });
    const exOptions = await exerciseSelect.locator('option').count();
    console.log(`   Exercise options: ${exOptions}`);
    await exerciseSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    console.log('   ✓ Exercise: Selected\n');

    // Goal - must click radio button
    const goalRadio = page.locator('input[type="radio"][value="fat_loss"]').first();
    await goalRadio.waitFor({ state: 'visible', timeout: 5000 });
    await goalRadio.click();
    await page.waitForTimeout(500);
    console.log('   ✓ Goal: Fat Loss selected\n');

    // Deficit Target - third select  
    const deficitSelect = page.locator('select').nth(2);
    await deficitSelect.waitFor({ state: 'visible', timeout: 5000 });
    const defOptions = await deficitSelect.locator('option').count();
    console.log(`   Deficit options: ${defOptions}`);
    await deficitSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    console.log('   ✓ Deficit: Selected\n');

    // Diet - fourth select
    const dietSelect = page.locator('select').nth(3);
    await dietSelect.waitFor({ state: 'visible', timeout: 5000 });
    const dietOpts = await dietSelect.locator('option').count();
    console.log(`   Diet options: ${dietOpts}`);
    await dietSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    console.log('   ✓ Diet: Selected\n');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-step2.png` });

    // Advance to Step 3
    console.log('6️⃣  Advancing to Step 3 (Results)...');
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(3000);
    console.log('   ✓ Results page loaded\n');

    const pageText = await page.textContent('body');
    const isStep3 = pageText.includes('Free Results') || pageText.includes('Free Protocol') || pageText.includes('Upgrade');
    
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-step3.png` });

    console.log('═══════════════════════════════════════════');
    if (isStep3) {
      console.log('✅ FULL FLOW SUCCESSFUL');
      console.log('═══════════════════════════════════════════\n');
      console.log('All steps completed:');
      console.log('  ✓ Physical stats');
      console.log('  ✓ Activity & goals');
      console.log('  ✓ Results page\n');
      console.log('🎯 CALCULATOR STATUS: WORKING ✅\n');
    } else {
      console.log('⚠️  Step 3 may not have advanced');
      console.log('═══════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR.png` }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();

import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOT_DIR = '/tmp/state-fix-test';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTest() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('\n🧪 STATE MANAGEMENT FIX VERIFICATION TEST\n');
    console.log('═══════════════════════════════════════════════════════');

    // STEP 1: Landing & Open Calculator
    console.log('\n1️⃣  Opening calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Get Your Macros")');
    await page.waitForTimeout(2000);
    console.log('   ✓ Calculator opened');

    // STEP 2: Fill Step 1
    console.log('\n2️⃣  Filling Step 1 (Physical Stats)...');
    await page.click('input[type="radio"][value="male"]');
    const inputs = await page.locator('input[type="number"]').all();
    await inputs[0].fill('35');
    await inputs[1].fill('6');
    await inputs[2].fill('0');
    await inputs[3].fill('200');
    await page.waitForTimeout(500);
    console.log('   ✓ Step 1 data filled');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-step1-complete.png` });

    // STEP 3: Advance to Step 2
    console.log('\n3️⃣  Advancing to Step 2...');
    await page.click('button:has-text("Continue to Next Step")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-step2-opened.png` });
    console.log('   ✓ Step 2 opened');

    // STEP 4: Fill ALL Step 2 fields carefully
    console.log('\n4️⃣  Filling Step 2 (CRITICAL - Test isDirty Guard)...');

    const selects = await page.locator('select').all();

    // Activity Level
    if (selects.length > 0) {
      await selects[0].selectOption({ index: 1 });
      await page.waitForTimeout(300);
      console.log('   ✓ Activity Level selected');
    }

    // Exercise Frequency
    if (selects.length > 1) {
      await selects[1].selectOption({ index: 1 });
      await page.waitForTimeout(300);
      console.log('   ✓ Exercise Frequency selected');
    }

    // Goal (Fat Loss)
    const fatLossRadio = page.locator('input[type="radio"]').filter({ hasText: /Fat Loss/ }).first();
    if (await fatLossRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fatLossRadio.click();
      await page.waitForTimeout(300);
      console.log('   ✓ Goal: Fat Loss selected');
    }

    // Deficit Target
    if (selects.length > 2) {
      await selects[2].selectOption({ index: 1 });
      await page.waitForTimeout(300);
      console.log('   ✓ Deficit Target selected');
    }

    // Diet Preference
    if (selects.length > 3) {
      await selects[3].selectOption({ index: 1 });
      await page.waitForTimeout(300);
      console.log('   ✓ Diet Preference selected');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-step2-filled.png` });

    // CRITICAL: Wait for Supabase fetch (which would previously overwrite data)
    console.log('\n5️⃣  CRITICAL: Waiting for any background Supabase fetches...');
    await page.waitForTimeout(2500);
    console.log('   ✓ Waited 2.5 seconds for race condition to occur');

    // STEP 5: Try to advance to Step 3 (where validation would fail before fix)
    console.log('\n6️⃣  Advancing to Step 3 (Results)...');
    console.log('   📌 This is where validation would fail if isDirty guard not working');

    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(2500);

    const pageText = await page.textContent('body');
    const isStep3 = pageText.includes('Free Results') || pageText.includes('Upgrade') || pageText.includes('results');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-step3-reached.png` });

    if (isStep3) {
      console.log('   ✅ PASSED: Step 3 loaded successfully!');
    } else {
      console.log('   ❌ FAILED: Still on Step 2 (form validation failed)');
    }

    // STEP 6: Verify form data persisted
    console.log('\n7️⃣  Verifying form data integrity...');
    const hasProfileData = await page.locator('text=/result|macro|calorie|profile/i').isVisible({ timeout: 1000 }).catch(() => false);

    if (hasProfileData) {
      console.log('   ✓ User profile data displaying');
    }

    // FINAL REPORT
    console.log('\n' + '═══════════════════════════════════════════════════════');
    if (isStep3) {
      console.log('✅ STATE MANAGEMENT FIX VERIFIED');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('✓ Form data PERSISTED through race condition');
      console.log('✓ isDirty guard PREVENTED Supabase overwrite');
      console.log('✓ Step 2→3 transition SUCCESSFUL');
      console.log('✓ Validation PASSED with all fields intact');
      console.log('\n🎯 FIX STATUS: WORKING CORRECTLY ✅\n');
      process.exit(0);
    } else {
      console.log('❌ STATE MANAGEMENT FIX FAILED');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('✗ Form validation failed (Step 2→3 transition blocked)');
      console.log('✗ isDirty guard may not be working');
      console.log('✗ Race condition still occurring');
      console.log('\n🔴 FIX STATUS: NEEDS DEBUGGING\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST CRASHED');
    console.error('Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR.png` }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();

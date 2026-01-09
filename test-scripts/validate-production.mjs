import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/production-calculator-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('🧪 PRODUCTION Calculator Validation\n');
  console.log('🌐 Testing: https://carnivoreweekly.com/calculator.html\n');

  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    // 1. Load production calculator page
    console.log('📍 Loading production calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');

    // 2. Check if React app mounted
    const rootInfo = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        childCount: root ? root.children.length : 0,
        innerHTML: root ? root.innerHTML.substring(0, 200) : '',
        offsetWidth: root ? root.offsetWidth : 0,
        offsetHeight: root ? root.offsetHeight : 0
      };
    });

    console.log('=== ROOT ELEMENT STATUS ===');
    console.log('Exists:', rootInfo.exists);
    console.log('Children:', rootInfo.childCount);
    console.log('Size:', `${rootInfo.offsetWidth}x${rootInfo.offsetHeight}`);
    console.log('Has content:', rootInfo.innerHTML.length > 0 ? 'YES' : 'NO\n');

    if (rootInfo.childCount === 0) {
      console.log('❌ React app NOT mounted\n');

      // Check for network errors
      console.log('=== CONSOLE ERRORS ===');
      if (errors.length > 0) {
        errors.forEach(err => console.log(`❌ ${err}`));
      }

      consoleMessages.filter(m => m.type === 'error').forEach(msg => {
        console.log(`❌ [console.error] ${msg.text}`);
      });

      await page.screenshot({ path: `${screenshotDir}/failed-mount.png`, fullPage: true });
      console.log('\n📸 Screenshot saved: failed-mount.png');

      process.exit(1);
    }

    console.log('✅ React app mounted\n');

    // 3. Take initial screenshot
    await page.screenshot({ path: `${screenshotDir}/step1-initial.png` });

    // 4. Check if form is visible
    const hasForm = await page.locator('input[type="radio"][value="male"]').count() > 0;
    if (!hasForm) {
      console.log('❌ Calculator form NOT visible');
      await page.screenshot({ path: `${screenshotDir}/no-form.png`, fullPage: true });
      process.exit(1);
    }

    console.log('✅ Calculator form visible\n');

    // 5. Fill Step 1 (Physical Stats)
    console.log('📝 Step 1: Filling Physical Stats...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('30');
    await page.locator('input[name="heightFeet"]').fill('6');
    await page.locator('input[name="heightInches"]').fill('0');
    await page.locator('input[name="weight"]').fill('200');
    console.log('✅ Step 1 filled');

    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(1000);
    console.log('✅ Advanced to Step 2\n');

    await page.screenshot({ path: `${screenshotDir}/step2-initial.png` });

    // 6. Fill Step 2 (Fitness & Diet)
    console.log('📝 Step 2: Filling Fitness & Diet...');

    // Check what options are available
    const lifestyleOptions = await page.locator('select[name="lifestyle"] option').allTextContents();
    const exerciseOptions = await page.locator('select[name="exercise"] option').allTextContents();
    const dietOptions = await page.locator('select[name="diet"] option').allTextContents();

    console.log(`Lifestyle options: ${lifestyleOptions.join(', ')}`);
    console.log(`Exercise options: ${exerciseOptions.join(', ')}`);
    console.log(`Diet options: ${dietOptions.join(', ')}`);

    // Select valid options
    await page.locator('select[name="lifestyle"]').selectOption({ index: 1 }); // First real option
    await page.locator('select[name="exercise"]').selectOption({ index: 1 }); // First real option
    await page.locator('input[type="radio"][name="goal"][value="maintain"]').click();
    await page.locator('select[name="diet"]').selectOption({ index: 1 }); // First real option

    console.log('✅ Step 2 filled');

    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(1500);
    console.log('✅ Advanced to Step 3\n');

    await page.screenshot({ path: `${screenshotDir}/step3-results.png`, fullPage: true });

    // 7. Validate results page
    console.log('🎨 Step 3: Validating Results Page...');

    const hasHeading = await page.locator('text=/Your Personalized/i').count() > 0;
    const hasProfile = await page.locator('text=/Sex:/i').count() > 0;
    const hasMacros = await page.locator('text=/Daily Calories/i').count() > 0;
    const hasBackButton = await page.locator('button:has-text("Back")').count() > 0;

    console.log('  Main heading:', hasHeading ? '✅' : '❌');
    console.log('  Profile summary:', hasProfile ? '✅' : '❌');
    console.log('  Macros display:', hasMacros ? '✅' : '❌');
    console.log('  Back button:', hasBackButton ? '✅' : '❌');

    const allGood = hasHeading && hasProfile && hasMacros && hasBackButton;

    console.log('\n📸 Screenshots saved to:', screenshotDir);

    if (allGood) {
      console.log('\n✅ PRODUCTION CALCULATOR VALIDATION PASSED');
      console.log('\n✨ All checks passed:');
      console.log('  • React app mounts correctly');
      console.log('  • Form navigation works (Steps 1→2→3)');
      console.log('  • Results page renders correctly');
      console.log('  • All key elements present');
      console.log('  • Production deployment successful');
    } else {
      console.log('\n❌ PRODUCTION VALIDATION FAILED');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png`, fullPage: true });
    console.log('📸 Error screenshot saved');
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

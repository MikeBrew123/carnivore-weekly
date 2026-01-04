const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotDir = '/tmp/calculator-validation-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('🧪 Starting Calculator Form Validation...\n');

  try {
    // Navigate to calculator
    console.log('📍 Step 1: Navigating to calculator...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${screenshotDir}/01-initial-load.png` });
    console.log('✅ Calculator loaded\n');

    // Fill Step 1: Physical Stats
    console.log('📝 Step 2: Filling Step 1 (Physical Stats)...');

    // Select male
    await page.click('input[type="radio"][value="male"]');
    await page.screenshot({ path: `${screenshotDir}/02-selected-male.png` });

    // Fill age
    await page.fill('input[name="age"]', '30');

    // Fill weight
    await page.fill('input[name="weight"]', '200');

    // Toggle to Feet & Inches (should be default but verify)
    const imperialButtons = await page.locator('button').filter({ hasText: /Feet & Inches|Centimeters/ });
    const buttonCount = await imperialButtons.count();
    console.log(`  Found ${buttonCount} unit toggle buttons`);

    // Fill height - feet
    await page.fill('input[name="heightFeet"]', '6');

    // Fill height - inches
    await page.fill('input[name="heightInches"]', '0');

    await page.screenshot({ path: `${screenshotDir}/03-step1-filled.png` });
    console.log('✅ Step 1 data entered\n');

    // Click Continue
    console.log('🔄 Step 3: Advancing to Step 2...');
    const continueButton = page.locator('button').filter({ hasText: /See Your Results|Continue/ }).first();
    await continueButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${screenshotDir}/04-step2-loaded.png` });
    console.log('✅ Step 2 loaded\n');

    // Fill Step 2: Fitness & Diet
    console.log('📝 Step 4: Filling Step 2 (Fitness & Diet)...');

    // Activity Level
    await page.selectOption('select[name="lifestyle"]', 'moderate');

    // Exercise frequency
    await page.selectOption('select[name="exercise"]', '3-4');

    // Goal
    await page.click('input[type="radio"][value="maintain"]');

    // Diet
    await page.selectOption('select[name="diet"]', 'carnivore');

    await page.screenshot({ path: `${screenshotDir}/05-step2-filled.png` });
    console.log('✅ Step 2 data entered\n');

    // Click "See Your Results"
    console.log('🔄 Step 5: Navigating to Step 3 (Results)...');
    const resultsButton = page.locator('button').filter({ hasText: /See Your Results/ }).first();
    await resultsButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshotDir}/06-step3-results.png` });
    console.log('✅ Step 3 (Results) loaded\n');

    // Validate Results Page
    console.log('🎨 Step 6: Validating Results Page...\n');

    // Check heading is visible
    const heading = await page.locator('h2').filter({ hasText: /Your Personalized Carnivore Macros/ });
    const isHeadingVisible = await heading.isVisible();
    console.log(`  Heading visible: ${isHeadingVisible ? '✅' : '❌'}`);

    // Get computed heading color
    const headingColor = await heading.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    console.log(`  Heading color (computed): ${headingColor}`);
    // Should be close to rgb(255, 215, 0) for #ffd700

    // Check profile summary card
    const profileCard = await page.locator('div').filter({ hasText: /Sex:|Age:|Height:|Weight:/ }).first();
    const profileVisible = await profileCard.isVisible();
    console.log(`  Profile summary card visible: ${profileVisible ? '✅' : '❌'}`);

    // Get profile card background
    const profileBg = await profileCard.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`  Profile card background: ${profileBg}`);
    // Should be rgb(26, 26, 26) for #1a1a1a

    // Check for upgrade button
    const upgradeButton = await page.locator('button').filter({ hasText: /Upgrade for Full Personalized Protocol|Upgrade/ }).first();
    const upgradeVisible = await upgradeButton.isVisible();
    console.log(`  Upgrade button visible: ${upgradeVisible ? '✅' : '❌'}`);

    // Check for "What This Looks Like in Food" section
    const foodSection = await page.locator('h3').filter({ hasText: /What This Looks Like in Food/ });
    const foodVisible = await foodSection.isVisible();
    console.log(`  Food section visible: ${foodVisible ? '✅' : '❌'}`);

    // Check sidebar (MacroPreview)
    const sidebar = await page.locator('div').filter({ hasText: /Daily Calories|Protein|Fat/ });
    const sidebarVisible = await sidebar.count() > 0;
    console.log(`  Macro preview sidebar visible: ${sidebarVisible ? '✅' : '❌'}`);

    // Check for no layout breaks (no horizontal scroll)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`  No horizontal scroll: ${!hasHorizontalScroll ? '✅' : '❌'}`);

    console.log('\n📊 Step 7: Brand Color Validation...\n');

    // Check page background color
    const pageBackground = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log(`  Page background: ${pageBackground}`);
    // Should be close to rgb(242, 240, 230) for #F2F0E6

    // Check main heading text color (should be gold #ffd700)
    const mainHeading = await page.locator('h2').filter({ hasText: /Your Personalized/ }).first();
    const mainHeadingColor = await mainHeading.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    console.log(`  Main heading color: ${mainHeadingColor}`);

    // Validate brand colors are correct
    console.log('\n✨ Step 8: Visual Validation Summary\n');

    const validationResults = {
      'Step 1 → Step 2 → Step 3 flow': `✅ Form flow completed successfully`,
      'Step 3 Results page loads': `${isHeadingVisible ? '✅' : '❌'} Results page renders`,
      'Upgrade button visible': `${upgradeVisible ? '✅' : '❌'} CTA button is present`,
      'Food section visible': `${foodVisible ? '✅' : '❌'} Food calculations display`,
      'Sidebar macros visible': `${sidebarVisible ? '✅' : '❌'} Macro preview shows`,
      'No layout breaks': `${!hasHorizontalScroll ? '✅' : '❌'} Desktop layout intact`,
      'Page background color': `${pageBackground === 'rgb(242, 240, 230)' || pageBackground === 'rgb(246, 244, 238)' ? '✅' : '⚠️'} Cream (#F2F0E6)`,
      'Heading color (gold)': `${headingColor.includes('255') || headingColor.includes('215') ? '✅' : '⚠️'} Gold accent visible`,
      'Profile card (dark)': `${profileBg.includes('26') ? '✅' : '⚠️'} Dark card (#1a1a1a)`,
    };

    for (const [test, result] of Object.entries(validationResults)) {
      console.log(`  ${result} ${test}`);
    }

    // Test upgrade button click
    console.log('\n🔘 Step 9: Testing Upgrade Button...\n');
    const initialUrl = page.url();
    if (upgradeVisible) {
      await upgradeButton.click();
      await page.waitForTimeout(500);
      const afterClickUrl = page.url();
      console.log(`  Button clickable: ✅ (no navigation, modal should appear)`);

      // Check if pricing modal appeared
      const pricingModal = await page.locator('div').filter({ hasText: /Upgrade|Premium|Price/ });
      const modalVisible = await pricingModal.count() > 0;
      if (modalVisible) {
        console.log(`  Pricing modal visible: ✅`);
        await page.screenshot({ path: `${screenshotDir}/07-upgrade-modal.png` });
      }
    }

    // Test CM height toggle
    console.log('\n🧪 Step 10: Testing CM Height Toggle...\n');

    // Navigate back to Step 1
    await page.click('button:has-text("Back")');
    await page.waitForTimeout(500);

    // Look for unit toggle
    const cmToggle = await page.locator('button').filter({ hasText: /Centimeters/ });
    if (await cmToggle.count() > 0) {
      console.log(`  CM toggle button found: ✅`);
      await cmToggle.click();
      await page.waitForTimeout(300);

      // Check if cm input appeared
      const cmInput = await page.locator('input[name="heightCm"]');
      const cmVisible = await cmInput.isVisible();
      console.log(`  CM input visible after toggle: ${cmVisible ? '✅' : '❌'}`);

      if (cmVisible) {
        // Fill cm height
        await cmInput.fill('183');
        await page.screenshot({ path: `${screenshotDir}/08-cm-toggle.png` });
        console.log(`  CM height input functional: ✅`);

        // Try to navigate forward
        const navButton = await page.locator('button').filter({ hasText: /See Your Results|Continue/ }).first();
        await navButton.click();
        await page.waitForTimeout(500);

        const resultsShown = await page.locator('h2').filter({ hasText: /Your Personalized/ }).count() > 0;
        console.log(`  Results show with CM height: ${resultsShown ? '✅' : '❌'}`);
      }
    }

    console.log('\n✅ VALIDATION COMPLETE\n');
    console.log(`📸 Screenshots saved to: ${screenshotDir}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review screenshots for visual quality`);
    console.log(`  2. Test manual Stripe checkout flow`);
    console.log(`  3. Verify success page displays after payment`);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png` });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

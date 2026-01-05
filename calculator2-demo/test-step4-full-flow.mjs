import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOT_DIR = '/tmp/step4-button-test';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testStep4FullFlow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('\n🎯 FULL FLOW TO STEP 4 - FINAL BUTTON TEST\n');
    console.log('═══════════════════════════════════════════════════════════════');

    // Navigate to calculator
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Click "Get Your Macros"
    await page.click('button:has-text("Get Your Macros")');
    await page.waitForTimeout(2000);
    console.log('✅ Step 1: Calculator opened');

    // Fill Step 1
    await page.click('input[type="radio"][value="male"]');
    const inputs = await page.locator('input[type="number"]').all();
    await inputs[0].fill('42');
    await inputs[1].fill('5');
    await inputs[2].fill('11');
    await inputs[3].fill('215');
    console.log('✅ Step 1: Physical stats filled');

    // Go to Step 2
    await page.click('button:has-text("Continue to Next Step")');
    await page.waitForTimeout(2000);
    console.log('✅ Step 2: Advanced');

    // Fill Step 2
    const selects = await page.locator('select').all();
    if (selects.length > 0) await selects[0].selectOption({ index: 1 });
    if (selects.length > 1) await selects[1].selectOption({ index: 1 });
    if (selects.length > 2) await selects[2].selectOption({ index: 1 });
    if (selects.length > 3) await selects[3].selectOption({ index: 1 });
    console.log('✅ Step 2: Fitness & diet filled');

    // Go to Step 3
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(2500);
    console.log('✅ Step 3: Results page loaded');

    // Click "Upgrade for Full Personalized Protocol" to open pricing modal
    console.log('\n📝 Opening pricing modal...');
    await page.click('button:has-text("Upgrade for Full Personalized Protocol")');
    await page.waitForTimeout(2000);
    console.log('✅ Pricing modal opened');

    // Select the Bundle tier ($9.99) - the last card
    const pricingCards = await page.locator('.pricing-card-container').all();
    console.log(`   Found ${pricingCards.length} pricing cards`);

    // Click the "Choose Plan" button on the Bundle card (last one)
    const bundleCard = pricingCards[pricingCards.length - 1];
    const bundleButton = bundleCard.locator('button:has-text("Choose Plan")');

    if (await bundleButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✅ Bundle card "Choose Plan" button found');
      await bundleButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Bundle tier selected');
    } else {
      console.log('⚠️  Bundle button not visible');
    }

    // Wait for Step 4 to appear (Stripe payment modal or Step 4 form)
    await page.waitForTimeout(1500);

    // Check for "Generate My Protocol" button
    const submitButton = await page.locator('button:has-text("Generate My Protocol")').first();
    const isVisible = await submitButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      console.log('\n✅ STEP 4: "Generate My Protocol" button found!');

      // Get button styling
      const buttonInfo = await submitButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          background: styles.background,
          backgroundImage: styles.backgroundImage,
          color: styles.color,
          padding: styles.padding,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          borderRadius: styles.borderRadius,
          fontWeight: styles.fontWeight,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

      console.log('\n📋 Submit Button Styling:');
      console.log(`  Position: ${buttonInfo.width}px × ${buttonInfo.height}px`);
      console.log(`  Font: ${buttonInfo.fontFamily}`);
      console.log(`  Font Weight: ${buttonInfo.fontWeight}`);
      console.log(`  Font Size: ${buttonInfo.fontSize}`);
      console.log(`  Color: ${buttonInfo.color}`);
      console.log(`  Background: ${buttonInfo.background}`);
      console.log(`  Background Image: ${buttonInfo.backgroundImage}`);
      console.log(`  Border Radius: ${buttonInfo.borderRadius}`);

      // Validate styling matches gold CTA
      const hasGoldGradient = buttonInfo.background.includes('ffd700') ||
                             buttonInfo.background.includes('rgb(255, 215, 0)') ||
                             buttonInfo.backgroundImage.includes('ffd700');
      const isDarkText = buttonInfo.color.includes('1a120b') ||
                        buttonInfo.color.includes('rgb(26, 18, 11)');
      const isPlayfair = buttonInfo.fontFamily.includes('Playfair');

      console.log('\n✅ GOLD CTA VALIDATION:');
      console.log(`  ${hasGoldGradient ? '✅' : '❌'} Gold gradient detected`);
      console.log(`  ${isDarkText ? '✅' : '❌'} Dark brown text (#1a120b)`);
      console.log(`  ${isPlayfair ? '✅' : '❌'} Playfair Display font`);

      // Take screenshot
      await page.screenshot({ path: `${SCREENSHOT_DIR}/step4-final-button.png`, fullPage: false });
      console.log(`\n📸 Screenshot: ${SCREENSHOT_DIR}/step4-final-button.png`);

      if (hasGoldGradient && isDarkText && isPlayfair) {
        console.log('\n🎉 BUTTON STYLING COMPLETE AND CORRECT');
      }
    } else {
      console.log('\n⚠️  "Generate My Protocol" button not found');
      console.log('   This may indicate the Stripe payment modal is still open.');
      console.log('   Taking screenshot of current state...');
      await page.screenshot({ path: `${SCREENSHOT_DIR}/step4-current-state.png`, fullPage: false });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Test complete');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png`, fullPage: false }).catch(() => {});
  } finally {
    await browser.close();
  }
}

testStep4FullFlow();

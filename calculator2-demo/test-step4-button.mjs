import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOT_DIR = '/tmp/step4-button-test';
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testStep4Button() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('\n🎯 STEP 4 FINAL BUTTON TEST\n');
    
    // Navigate to calculator
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Click "Get Your Macros"
    await page.click('button:has-text("Get Your Macros")');
    await page.waitForTimeout(2000);
    console.log('✅ Calculator opened');

    // Fill Step 1
    await page.click('input[type="radio"][value="male"]');
    const inputs = await page.locator('input[type="number"]').all();
    await inputs[0].fill('42');
    await inputs[1].fill('5');
    await inputs[2].fill('11');
    await inputs[3].fill('215');
    console.log('✅ Step 1 filled');

    // Go to Step 2
    await page.click('button:has-text("Continue to Next Step")');
    await page.waitForTimeout(2000);
    console.log('✅ Step 2 opened');

    // Fill Step 2
    const selects = await page.locator('select').all();
    if (selects.length > 0) await selects[0].selectOption({ index: 1 });
    if (selects.length > 1) await selects[1].selectOption({ index: 1 });
    if (selects.length > 2) await selects[2].selectOption({ index: 1 });
    if (selects.length > 3) await selects[3].selectOption({ index: 1 });
    console.log('✅ Step 2 filled');

    // Go to Step 3
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(2500);
    console.log('✅ Step 3 (Results) loaded');

    // Close pricing modal if it opened and click "Back" or skip to Step 4
    // The flow goes: Step 1 → Step 2 → Step 3 (Results) → Step 4 (Health Profile)
    // We need to navigate to Step 4 somehow - checking if there's a "Continue" or "Next" button
    
    const continueButtons = await page.locator('button:has-text("Continue")').all();
    if (continueButtons.length > 0) {
      console.log(`Found ${continueButtons.length} Continue button(s)`);
      await continueButtons[continueButtons.length - 1].click();
      await page.waitForTimeout(2000);
      console.log('✅ Navigated to Step 4');
    } else {
      console.log('⚠️  No Continue button found - checking page structure');
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} total buttons`);
      
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        if (text && text.includes('Generate') || text.includes('Protocol')) {
          console.log(`Found button: "${text}"`);
          break;
        }
      }
    }

    // Look for the "Generate My Protocol" button
    const submitButton = await page.locator('button:has-text("Generate My Protocol")').first();
    const isVisible = await submitButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      console.log('✅ "Generate My Protocol" button found');
      
      // Get button styling
      const buttonStyle = await submitButton.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          color: styles.color,
          padding: styles.padding,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          borderRadius: styles.borderRadius,
        };
      });
      
      console.log('\n📋 Button Styling:');
      console.log(`  Background: ${buttonStyle.background}`);
      console.log(`  Color: ${buttonStyle.color}`);
      console.log(`  Padding: ${buttonStyle.padding}`);
      console.log(`  Font: ${buttonStyle.fontFamily}`);
      console.log(`  Border Radius: ${buttonStyle.borderRadius}`);
      
      // Check for gold gradient
      if (buttonStyle.background.includes('ffd700') || buttonStyle.background.includes('rgb(255, 215, 0)')) {
        console.log('  ✅ Gold gradient detected');
      } else if (buttonStyle.background.includes('gradient')) {
        console.log('  ✅ Gradient detected');
      }
      
      // Take screenshot of Step 4
      await page.screenshot({ path: `${SCREENSHOT_DIR}/step4-button.png`, fullPage: false });
      console.log(`\n📸 Screenshot saved: ${SCREENSHOT_DIR}/step4-button.png`);
    } else {
      console.log('⚠️  "Generate My Protocol" button not found - may be on different step');
      const pageTitle = await page.locator('h2, h1').first().textContent();
      console.log(`Current page heading: ${pageTitle}`);
      
      // Take screenshot anyway
      await page.screenshot({ path: `${SCREENSHOT_DIR}/step4-button.png`, fullPage: false });
      console.log(`\n📸 Screenshot saved for debugging: ${SCREENSHOT_DIR}/step4-button.png`);
    }

    console.log('\n✅ Step 4 button test complete');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testStep4Button();

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = '/Users/mbrew/Developer/carnivore-weekly/screenshots/height-field-testing';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testHeight() {
  const browser = await chromium.launch();

  try {
    console.log('Testing Height field implementation...\n');

    // Test 1: Desktop 1400px
    console.log('Capturing desktop (1400px) - Feet & Inches...');
    const page1 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page1.goto('http://localhost:5173');
    await page1.waitForLoadState('domcontentloaded');
    await page1.waitForTimeout(2000); // Wait for React to fully render

    await page1.screenshot({ path: path.join(screenshotsDir, '1-desktop-feet-inches.png') });
    console.log('✓ Saved: 1-desktop-feet-inches.png');
    await page1.close();

    // Test 2: Click centimeters on desktop
    console.log('Capturing desktop (1400px) - Switching to Centimeters...');
    const page2 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page2.goto('http://localhost:5173');
    await page2.waitForLoadState('domcontentloaded');
    await page2.waitForTimeout(2000);

    // Try to click CM radio
    const cmRadio = await page2.$('input[value="cm"]');
    if (cmRadio) {
      await cmRadio.click();
      await page2.waitForTimeout(500); // Animation
      console.log('✓ Clicked centimeters radio');
    }

    await page2.screenshot({ path: path.join(screenshotsDir, '2-desktop-centimeters.png') });
    console.log('✓ Saved: 2-desktop-centimeters.png');
    await page2.close();

    // Test 3: Mobile 375px
    console.log('Capturing mobile (375px) - Feet & Inches...');
    const page3 = await browser.newPage({ viewport: { width: 375, height: 1200 } });
    await page3.goto('http://localhost:5173');
    await page3.waitForLoadState('domcontentloaded');
    await page3.waitForTimeout(2000);

    await page3.screenshot({ path: path.join(screenshotsDir, '3-mobile-feet-inches.png') });
    console.log('✓ Saved: 3-mobile-feet-inches.png');
    await page3.close();

    // Test 4: Mobile centimeters
    console.log('Capturing mobile (375px) - Centimeters...');
    const page4 = await browser.newPage({ viewport: { width: 375, height: 1200 } });
    await page4.goto('http://localhost:5173');
    await page4.waitForLoadState('domcontentloaded');
    await page4.waitForTimeout(2000);

    const mobileCmRadio = await page4.$('input[value="cm"]');
    if (mobileCmRadio) {
      await mobileCmRadio.click();
      await page4.waitForTimeout(500);
      console.log('✓ Clicked centimeters radio');
    }

    await page4.screenshot({ path: path.join(screenshotsDir, '4-mobile-centimeters.png') });
    console.log('✓ Saved: 4-mobile-centimeters.png');
    await page4.close();

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${screenshotsDir}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testHeight();

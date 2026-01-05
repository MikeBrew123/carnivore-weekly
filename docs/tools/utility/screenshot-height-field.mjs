import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = '/Users/mbrew/Developer/carnivore-weekly/screenshots/height-field-testing';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshots() {
  const browser = await chromium.launch();

  try {
    // Desktop (1400px) - Feet & Inches
    console.log('📸 Capturing desktop (1400px) - Feet & Inches...');
    const desktopFeetPage = await browser.newPage({
      viewport: { width: 1400, height: 1600 }
    });
    await desktopFeetPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await desktopFeetPage.screenshot({
      path: path.join(screenshotsDir, '1-desktop-1400px-feet-inches.png'),
      fullPage: true
    });
    console.log('✅ Saved: 1-desktop-1400px-feet-inches.png');
    await desktopFeetPage.close();

    // Desktop (1400px) - Centimeters
    console.log('📸 Capturing desktop (1400px) - Centimeters...');
    const desktopCmPage = await browser.newPage({
      viewport: { width: 1400, height: 1600 }
    });
    await desktopCmPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    // Click the Centimeters radio button
    await desktopCmPage.click('input[value="cm"]');
    await desktopCmPage.waitForTimeout(500); // Wait for animation
    await desktopCmPage.screenshot({
      path: path.join(screenshotsDir, '2-desktop-1400px-centimeters.png'),
      fullPage: true
    });
    console.log('✅ Saved: 2-desktop-1400px-centimeters.png');
    await desktopCmPage.close();

    // Mobile (375px) - Feet & Inches
    console.log('📸 Capturing mobile (375px) - Feet & Inches...');
    const mobileFeetPage = await browser.newPage({
      viewport: { width: 375, height: 812 }
    });
    await mobileFeetPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await mobileFeetPage.screenshot({
      path: path.join(screenshotsDir, '3-mobile-375px-feet-inches.png'),
      fullPage: true
    });
    console.log('✅ Saved: 3-mobile-375px-feet-inches.png');
    await mobileFeetPage.close();

    // Mobile (375px) - Centimeters
    console.log('📸 Capturing mobile (375px) - Centimeters...');
    const mobileCmPage = await browser.newPage({
      viewport: { width: 375, height: 812 }
    });
    await mobileCmPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    // Click the Centimeters radio button
    await mobileCmPage.click('input[value="cm"]');
    await mobileCmPage.waitForTimeout(500); // Wait for animation
    await mobileCmPage.screenshot({
      path: path.join(screenshotsDir, '4-mobile-375px-centimeters.png'),
      fullPage: true
    });
    console.log('✅ Saved: 4-mobile-375px-centimeters.png');
    await mobileCmPage.close();

    // Test interactive features - Focus states
    console.log('📸 Capturing desktop - Focus on Height Feet input...');
    const focusPage = await browser.newPage({
      viewport: { width: 1400, height: 1600 }
    });
    await focusPage.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await focusPage.click('input#heightFeet');
    await focusPage.type('input#heightFeet', '5');
    await focusPage.screenshot({
      path: path.join(screenshotsDir, '5-desktop-focus-feet-input.png'),
      fullPage: true
    });
    console.log('✅ Saved: 5-desktop-focus-feet-input.png');
    await focusPage.close();

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${screenshotsDir}`);

  } catch (error) {
    console.error('❌ Error taking screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshots();

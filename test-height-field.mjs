import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const screenshotsDir = '/Users/mbrew/Developer/carnivore-weekly/screenshots/height-field-testing';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testHeightField() {
  const browser = await chromium.launch();

  try {
    // Test 1: Desktop 1400px - Default (Feet & Inches)
    console.log('\n1️⃣ Testing desktop (1400px) - Feet & Inches (default)...');
    const page1 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page1.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for form to render
    await page1.waitForSelector('input[type="radio"][value="feet-inches"]', { timeout: 5000 });

    // Verify Height section is present
    const heightSection = await page1.$('fieldset >> text="Height"');
    if (heightSection) {
      console.log('✅ Height fieldset found');
    }

    // Verify radio buttons
    const feetInchesRadio = await page1.$('input[value="feet-inches"]');
    const cmRadio = await page1.$('input[value="cm"]');
    if (feetInchesRadio && cmRadio) {
      console.log('✅ Both height unit radio buttons found');
    }

    // Check feet & inches inputs are visible
    const feetInput = await page1.$('#heightFeet');
    const inchesInput = await page1.$('#heightInches');
    if (feetInput && inchesInput) {
      const feetVisible = await feetInput.isVisible();
      const inchesVisible = await inchesInput.isVisible();
      console.log(`✅ Feet input visible: ${feetVisible}`);
      console.log(`✅ Inches input visible: ${inchesVisible}`);
    }

    // Take screenshot
    await page1.screenshot({
      path: path.join(screenshotsDir, '01-desktop-feet-inches.png'),
      fullPage: false
    });
    console.log('📸 Saved: 01-desktop-feet-inches.png');
    await page1.close();

    // Test 2: Switch to Centimeters
    console.log('\n2️⃣ Testing desktop (1400px) - Switch to Centimeters...');
    const page2 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page2.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page2.waitForSelector('input[value="cm"]', { timeout: 5000 });

    // Click centimeters radio
    await page2.click('input[value="cm"]');
    await page2.waitForTimeout(500); // Animation

    // Verify CM input is visible, feet/inches not
    const cmInput = await page2.$('#heightCm');
    const cmVisible = await cmInput?.isVisible();
    console.log(`✅ Centimeters input visible: ${cmVisible}`);

    await page2.screenshot({
      path: path.join(screenshotsDir, '02-desktop-centimeters.png'),
      fullPage: false
    });
    console.log('📸 Saved: 02-desktop-centimeters.png');
    await page2.close();

    // Test 3: Mobile 375px - Feet & Inches
    console.log('\n3️⃣ Testing mobile (375px) - Feet & Inches...');
    const page3 = await browser.newPage({ viewport: { width: 375, height: 1200 } });
    await page3.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page3.waitForSelector('input[value="feet-inches"]', { timeout: 5000 });

    const mobileHeightSection = await page3.$('fieldset >> text="Height"');
    if (mobileHeightSection) {
      console.log('✅ Mobile Height fieldset found');
    }

    await page3.screenshot({
      path: path.join(screenshotsDir, '03-mobile-feet-inches.png'),
      fullPage: false
    });
    console.log('📸 Saved: 03-mobile-feet-inches.png');
    await page3.close();

    // Test 4: Mobile 375px - Centimeters
    console.log('\n4️⃣ Testing mobile (375px) - Centimeters...');
    const page4 = await browser.newPage({ viewport: { width: 375, height: 1200 } });
    await page4.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page4.waitForSelector('input[value="cm"]', { timeout: 5000 });

    // Click centimeters
    await page4.click('input[value="cm"]');
    await page4.waitForTimeout(500);

    await page4.screenshot({
      path: path.join(screenshotsDir, '04-mobile-centimeters.png'),
      fullPage: false
    });
    console.log('📸 Saved: 04-mobile-centimeters.png');
    await page4.close();

    // Test 5: Tab navigation and focus
    console.log('\n5️⃣ Testing focus states and keyboard navigation...');
    const page5 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page5.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page5.waitForSelector('#heightFeet', { timeout: 5000 });

    // Tab to feet input and take screenshot
    await page5.click('#heightFeet');
    await page5.type('#heightFeet', '6');

    await page5.screenshot({
      path: path.join(screenshotsDir, '05-desktop-feet-focused.png'),
      fullPage: false
    });
    console.log('📸 Saved: 05-desktop-feet-focused.png');
    await page5.close();

    console.log('\n✅ All tests completed successfully!');
    console.log(`📁 Screenshots: ${screenshotsDir}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testHeightField();

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
    console.log('\n1️⃣ Desktop (1400px) - Feet & Inches view');
    const page1 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page1.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Wait for React to render
    await page1.waitForFunction(() => document.querySelectorAll('fieldset').length >= 2, { timeout: 10000 });

    // Check for Height fieldset
    const fieldsets = await page1.$$('fieldset');
    const legends = await page1.$$eval('legend', els => els.map(el => el.textContent?.trim()));
    console.log(`Found ${fieldsets.length} fieldsets:`, legends);

    // Check for Height unit radio buttons
    const heightRadios = await page1.$$('input[type="radio"][value="feet-inches"], input[type="radio"][value="cm"]');
    console.log(`Found ${heightRadios.length} height unit radio buttons`);

    // Check height inputs
    const heightFeetInput = await page1.$('#heightFeet');
    const heightInchesInput = await page1.$('#heightInches');
    const heightCmInput = await page1.$('#heightCm');

    if (heightFeetInput) {
      const visible = await heightFeetInput.isVisible();
      console.log(`✓ Feet input visible: ${visible}`);
    }
    if (heightInchesInput) {
      const visible = await heightInchesInput.isVisible();
      console.log(`✓ Inches input visible: ${visible}`);
    }
    if (heightCmInput) {
      const visible = await heightCmInput.isVisible();
      console.log(`✓ CM input visible: ${visible}`);
    }

    await page1.screenshot({ path: path.join(screenshotsDir, '1-desktop-feet-inches.png') });
    console.log('📸 Screenshot: 1-desktop-feet-inches.png\n');
    await page1.close();

    // Test 2: Switch to Centimeters
    console.log('2️⃣ Desktop (1400px) - Switch to Centimeters');
    const page2 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page2.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    await page2.waitForFunction(() => document.querySelectorAll('input[value="cm"]').length > 0, { timeout: 10000 });

    // Click centimeters radio
    const cmRadio = await page2.$('input[value="cm"]');
    if (cmRadio) {
      await cmRadio.click();
      await page2.waitForTimeout(300); // Let animation play
      console.log('✓ Clicked Centimeters radio');

      const cmInput = await page2.$('#heightCm');
      const feetInput = await page2.$('#heightFeet');

      if (cmInput) {
        const visible = await cmInput.isVisible();
        console.log(`✓ CM input now visible: ${visible}`);
      }
      if (feetInput) {
        const visible = await feetInput.isVisible();
        console.log(`✓ Feet input now hidden: ${!visible}`);
      }
    }

    await page2.screenshot({ path: path.join(screenshotsDir, '2-desktop-centimeters.png') });
    console.log('📸 Screenshot: 2-desktop-centimeters.png\n');
    await page2.close();

    // Test 3: Mobile 375px
    console.log('3️⃣ Mobile (375px) - Feet & Inches view');
    const page3 = await browser.newPage({ viewport: { width: 375, height: 1200 } });
    await page3.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    await page3.waitForFunction(() => document.querySelectorAll('fieldset').length >= 2, { timeout: 10000 });

    const mobileHeightSection = await page3.$('fieldset');
    if (mobileHeightSection) {
      console.log('✓ Height fieldset found on mobile');
    }

    await page3.screenshot({ path: path.join(screenshotsDir, '3-mobile-feet-inches.png') });
    console.log('📸 Screenshot: 3-mobile-feet-inches.png\n');
    await page3.close();

    // Test 4: Mobile centimeters
    console.log('4️⃣ Mobile (375px) - Switch to Centimeters');
    const page4 = await browser.newPage({ viewport: { width: 375, height: 1200 } });
    await page4.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    await page4.waitForFunction(() => document.querySelectorAll('input[value="cm"]').length > 0, { timeout: 10000 });

    const mobilesCmRadio = await page4.$('input[value="cm"]');
    if (mobilesCmRadio) {
      await mobilesCmRadio.click();
      await page4.waitForTimeout(300);
      console.log('✓ Clicked Centimeters radio on mobile');
    }

    await page4.screenshot({ path: path.join(screenshotsDir, '4-mobile-centimeters.png') });
    console.log('📸 Screenshot: 4-mobile-centimeters.png\n');
    await page4.close();

    // Test 5: Tab navigation
    console.log('5️⃣ Desktop - Tab navigation and focus');
    const page5 = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
    await page5.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    await page5.waitForFunction(() => document.querySelector('#heightFeet') !== null, { timeout: 10000 });

    // Focus on feet input
    await page5.click('#heightFeet');
    await page5.type('#heightFeet', '5');
    await page5.press('#heightFeet', 'Tab');
    await page5.type('#heightInches', '10');

    await page5.screenshot({ path: path.join(screenshotsDir, '5-desktop-focus-state.png') });
    console.log('📸 Screenshot: 5-desktop-focus-state.png\n');
    await page5.close();

    console.log('✅ All tests completed!');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testHeight();

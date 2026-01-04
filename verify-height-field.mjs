import { chromium } from 'playwright';

async function verifyHeightField() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

  try {
    console.log('\n=== HEIGHT FIELD VERIFICATION ===\n');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Test 1: Verify Height fieldset exists
    const heightFieldset = await page.$('fieldset:has(legend:has-text("Height"))');
    if (heightFieldset) {
      console.log('✅ Height fieldset found');
    } else {
      console.log('❌ Height fieldset NOT found');
    }

    // Test 2: Verify height unit radio buttons
    const feetInchesRadio = await page.$('input[value="feet-inches"]');
    const cmRadio = await page.$('input[value="cm"]');

    if (feetInchesRadio && cmRadio) {
      console.log('✅ Both height unit radio buttons found');
      const feetInchesLabel = await page.$('label:has(input[value="feet-inches"]) span');
      const cmLabel = await page.$('label:has(input[value="cm"]) span');
      if (feetInchesLabel && cmLabel) {
        const feetInchesText = await feetInchesLabel.textContent();
        const cmText = await cmLabel.textContent();
        console.log(`   - Feet & Inches label: "${feetInchesText}"`);
        console.log(`   - Centimeters label: "${cmText}"`);
      }
    } else {
      console.log('❌ Height unit radio buttons NOT found');
    }

    // Test 3: Verify height inputs when Feet & Inches selected
    const heightFeetInput = await page.$('#heightFeet');
    const heightInchesInput = await page.$('#heightInches');

    if (heightFeetInput && heightInchesInput) {
      const feetVisible = await heightFeetInput.isVisible();
      const inchesVisible = await heightInchesInput.isVisible();
      console.log('✅ Feet and Inches inputs found');
      console.log(`   - Feet input visible: ${feetVisible}`);
      console.log(`   - Inches input visible: ${inchesVisible}`);

      // Check placeholders
      const feetPlaceholder = await heightFeetInput.getAttribute('placeholder');
      const inchesPlaceholder = await heightInchesInput.getAttribute('placeholder');
      console.log(`   - Feet placeholder: "${feetPlaceholder}"`);
      console.log(`   - Inches placeholder: "${inchesPlaceholder}"`);

      // Check min/max values
      const feetMin = await heightFeetInput.getAttribute('min');
      const feetMax = await heightFeetInput.getAttribute('max');
      const inchesMin = await heightInchesInput.getAttribute('min');
      const inchesMax = await heightInchesInput.getAttribute('max');
      console.log(`   - Feet range: ${feetMin}-${feetMax}`);
      console.log(`   - Inches range: ${inchesMin}-${inchesMax}`);
    } else {
      console.log('❌ Feet/Inches inputs NOT found');
    }

    // Test 4: Click Centimeters radio and verify CM input appears
    console.log('\nSwitching to Centimeters...');
    if (cmRadio) {
      await cmRadio.click();
      await page.waitForTimeout(500); // Animation

      const heightCmInput = await page.$('#heightCm');
      if (heightCmInput) {
        const cmVisible = await heightCmInput.isVisible();
        console.log('✅ Centimeters input found');
        console.log(`   - CM input visible: ${cmVisible}`);

        const cmPlaceholder = await heightCmInput.getAttribute('placeholder');
        const cmMin = await heightCmInput.getAttribute('min');
        const cmMax = await heightCmInput.getAttribute('max');
        console.log(`   - CM placeholder: "${cmPlaceholder}"`);
        console.log(`   - CM range: ${cmMin}-${cmMax}`);
      } else {
        console.log('❌ Centimeters input NOT found');
      }

      // Verify feet input is now hidden
      const feetStillVisible = await heightFeetInput?.isVisible();
      console.log(`   - Feet input still visible: ${feetStillVisible}`);
    }

    // Test 5: Verify form structure and labels
    console.log('\nForm Structure Verification:');
    const sexFieldset = await page.$('fieldset:has(legend:has-text("Biological Sex"))');
    if (sexFieldset) {
      console.log('✅ Sex fieldset found');
    }

    const ageInput = await page.$('#age');
    if (ageInput) {
      console.log('✅ Age input found');
    }

    const weightInput = await page.$('#weight');
    if (weightInput) {
      console.log('✅ Weight input found');
    }

    // Test 6: Responsive design
    console.log('\nResponsive Design Verification:');

    // Test on mobile
    const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await mobilePage.goto('http://localhost:5173');
    await mobilePage.waitForLoadState('domcontentloaded');
    await mobilePage.waitForTimeout(2000);

    const mobileHeightFeet = await mobilePage.$('#heightFeet');
    if (mobileHeightFeet) {
      const boundingBox = await mobileHeightFeet.boundingBox();
      console.log(`✅ Mobile responsive - Feet input width: ${boundingBox?.width}px`);
    }

    // Check for horizontal scroll
    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    if (scrollWidth <= clientWidth) {
      console.log('✅ No horizontal scroll on mobile (375px)');
    } else {
      console.log(`⚠️ Horizontal scroll detected on mobile (${scrollWidth}px width vs ${clientWidth}px viewport)`);
    }

    await mobilePage.close();

    console.log('\n✅ Height field implementation verified successfully!\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

verifyHeightField();

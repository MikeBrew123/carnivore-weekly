import { chromium } from 'playwright';

async function testHeight() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    console.log('Waiting for React root...');
    await page.waitForFunction(() => document.getElementById('root')?.children.length > 0, { timeout: 10000 });

    console.log('Waiting for fieldsets...');
    await page.waitForSelector('fieldset', { timeout: 5000 });

    const fieldsets = await page.$$('fieldset');
    console.log(`Found ${fieldsets.length} fieldsets`);

    const legends = await page.$$eval('legend', els => els.map(el => el.textContent));
    console.log('Fieldset legends:', legends);

    const radioInputs = await page.$$('input[type="radio"]');
    console.log(`Found ${radioInputs.length} radio inputs`);

    const radioValues = await page.$$eval('input[type="radio"]', els => els.map(el => el.value));
    console.log('Radio values:', radioValues);

    // Check for height fields
    const heightFeetInput = await page.$('#heightFeet');
    const heightCmInput = await page.$('#heightCm');

    if (heightFeetInput) {
      const visible = await heightFeetInput.isVisible();
      console.log(`Height Feet input visible: ${visible}`);
    } else {
      console.log('Height Feet input NOT FOUND');
    }

    if (heightCmInput) {
      const visible = await heightCmInput.isVisible();
      console.log(`Height CM input visible: ${visible}`);
    } else {
      console.log('Height CM input NOT FOUND');
    }

    // Get page content
    const content = await page.content();
    if (content.includes('heightFeet')) {
      console.log('✅ heightFeet found in HTML');
    }
    if (content.includes('Height')) {
      console.log('✅ "Height" label found in HTML');
    }

    // Take screenshot
    await page.screenshot({ path: '/Users/mbrew/Developer/carnivore-weekly/test-debug-height.png' });
    console.log('📸 Screenshot saved to test-debug-height.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testHeight();

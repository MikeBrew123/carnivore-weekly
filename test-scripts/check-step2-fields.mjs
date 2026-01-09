import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    await page.goto('http://localhost:8877/public/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    await page.waitForTimeout(2000);

    // Fill Step 1
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('30');
    await page.locator('input[name="heightFeet"]').fill('6');
    await page.locator('input[name="heightInches"]').fill('0');
    await page.locator('input[name="weight"]').fill('200');
    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(1000);

    // Now on Step 2 - check all fields
    const step2Fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select'));
      return inputs.map(el => ({
        tag: el.tagName.toLowerCase(),
        name: el.name || 'N/A',
        type: el.type || 'N/A',
        id: el.id || el.name || 'N/A',
        required: el.hasAttribute('required')
      }));
    });

    console.log('=== STEP 2 FORM FIELDS ===');
    step2Fields.forEach((field, i) => {
      const req = field.required ? ' [REQUIRED]' : '';
      console.log(`${i + 1}. <${field.tag}> name="${field.name}" type="${field.type}"${req}`);
    });

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();

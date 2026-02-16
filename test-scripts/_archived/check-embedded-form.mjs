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

    // Get all form field names
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map(el => ({
        tag: el.tagName.toLowerCase(),
        type: el.type || 'N/A',
        name: el.name || 'N/A',
        id: el.id || 'N/A',
        value: el.value || ''
      }));
    });

    console.log('=== FORM FIELDS FOUND ===');
    formFields.forEach((field, i) => {
      console.log(`${i + 1}. <${field.tag}> type="${field.type}" name="${field.name}" id="${field.id}"`);
    });

    // Try clicking male radio button
    const maleCount = await page.locator('input[type="radio"][value="male"]').count();
    console.log('\n=== RADIO BUTTONS ===');
    console.log('Male radio buttons found:', maleCount);

    if (maleCount > 0) {
      await page.locator('input[type="radio"][value="male"]').first().click();
      console.log('✅ Clicked male radio button');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();

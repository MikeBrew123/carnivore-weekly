const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/public/calculator.html';
const SCREENSHOT_DIR = '/Users/mbrew/Developer/carnivore-weekly/casey-screenshots';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1400, height: 900 }
];

async function captureForm() {
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      console.log(`\nCapturing form for ${viewport.name} (${viewport.width}x${viewport.height})...`);

      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Wait for React app to load
      await page.waitForSelector('input[type="number"], select, input[type="radio"], button', { timeout: 8000 }).catch(e => {
        console.log('  Warning: Form elements not found immediately, proceeding anyway');
      });

      // Wait a bit more for full rendering
      await page.waitForTimeout(2000);

      // Scroll to the form (past the header and intro)
      const formElements = await page.$$('input[type="number"], select, input[type="radio"]');
      if (formElements.length > 0) {
        // Scroll to first form element
        await formElements[0].scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
      }

      // Get information about form elements found
      const elementCount = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="number"], input[type="text"], select, input[type="radio"]');
        return inputs.length;
      });
      console.log(`  Found ${elementCount} form elements`);

      // List form fields
      const fields = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="number"], input[type="text"], select, input[type="radio"]'));
        return inputs.map(input => ({
          type: input.tagName,
          inputType: input.type,
          name: input.name,
          id: input.id,
          label: input.previousElementSibling?.textContent || 'no label'
        }));
      });
      console.log(`  Fields found:`, fields.slice(0, 5));

      // Take screenshot of form area
      const screenshotPath = path.join(SCREENSHOT_DIR, `form-step1-${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  Saved: ${screenshotPath}`);

      // Also get the form root element and take full page
      const fullPagePath = path.join(SCREENSHOT_DIR, `form-full-${viewport.name}.png`);
      await page.screenshot({ path: fullPagePath, fullPage: true });
      console.log(`  Saved full page: ${fullPagePath}`);

      await page.close();
    }

    console.log('\nForm capture complete!');

  } finally {
    await browser.close();
  }
}

captureForm().catch(console.error);

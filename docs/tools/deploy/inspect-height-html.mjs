import { chromium } from 'playwright';

async function inspectHeight() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Get the height section HTML
    const heightHtml = await page.locator('fieldset').nth(1).innerHTML();
    console.log('\n=== HEIGHT FIELDSET HTML ===\n');
    console.log(heightHtml.substring(0, 1000)); // First 1000 chars

    // Check if radio buttons exist
    const radioCount = await page.locator('input[type="radio"][value="feet-inches"], input[type="radio"][value="cm"]').count();
    console.log(`\nHeight unit radio buttons found: ${radioCount}`);

    // Get the legend text
    const legends = await page.locator('legend').allTextContents();
    console.log('\nFieldset legends:');
    legends.forEach((legend, i) => {
      console.log(`  ${i + 1}. ${legend}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectHeight();

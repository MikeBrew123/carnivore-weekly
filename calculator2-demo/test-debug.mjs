import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Testing live site: https://carnivoreweekly.com/calculator.html\n');
    
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check for React root element
    const rootDiv = await page.$('#root');
    if (!rootDiv) {
      console.log('❌ React #root div not found!');
      return;
    }

    console.log('✓ React root found');
    
    // Check what's in the root
    const rootHTML = await rootDiv.innerHTML();
    console.log('Root contains:', rootHTML.substring(0, 300));
    
    // Look for form inputs
    const inputs = await page.locator('input[type="number"]').count();
    console.log(`✓ Found ${inputs} number inputs`);
    
    if (inputs > 0) {
      console.log('✅ Form is visible and loaded');
    } else {
      console.log('❌ Form inputs not found');
    }

    console.log('\nOpen for 30 seconds...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();

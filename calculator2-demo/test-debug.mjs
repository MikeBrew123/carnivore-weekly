import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Debugging Step 1 form fields...\n');
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle' 
    });
    await page.waitForTimeout(2000);
    
    // Fill sex and age first
    await page.locator('input[type="radio"][value="male"]').check();
    await page.locator('input[type="number"]').first().fill('35');
    await page.locator('input[type="number"]').nth(1).fill('180');
    await page.waitForTimeout(1000);
    
    // Check what form elements exist
    const selects = await page.locator('select').count();
    console.log(`Select elements found: ${selects}`);
    
    const inputs = await page.locator('input').count();
    console.log(`Input elements found: ${inputs}`);
    
    const buttons = await page.locator('button').count();
    console.log(`Button elements found: ${buttons}`);
    
    // Check if there's a height unit toggle
    const heightToggle = await page.locator('button:has-text("ft"), button:has-text("cm")').count();
    console.log(`Height unit toggle buttons: ${heightToggle}`);
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/step1-debug.png', fullPage: false });
    console.log('\n📸 Screenshot saved: /tmp/step1-debug.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Diagnosing calculator state...\n');
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Check what's in #calculator-app
    const calculatorHTML = await page.locator('#calculator-app').innerHTML().catch(() => 'NOT FOUND');
    console.log('Calculator app element exists:', calculatorHTML !== 'NOT FOUND');
    
    // Check for buttons
    const buttons = await page.locator('button').count();
    console.log(`Total buttons found: ${buttons}`);
    
    if (buttons > 0) {
      console.log('\nFirst 5 button texts:');
      for (let i = 0; i < Math.min(5, buttons); i++) {
        const text = await page.locator('button').nth(i).textContent();
        console.log(`  ${i + 1}. "${text}"`);
      }
    }
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/calculator-diagnostic.png', fullPage: false });
    console.log('\n📸 Screenshot: /tmp/calculator-diagnostic.png');
    
    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();

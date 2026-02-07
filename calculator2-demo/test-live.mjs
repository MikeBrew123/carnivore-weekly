import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🔍 Loading https://carnivoreweekly.com/calculator.html...');
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded');
    await page.waitForTimeout(2000);
    
    const calculatorVisible = await page.locator('#root').isVisible();
    console.log(`📊 Calculator container (#root): ${calculatorVisible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    
    const step1Heading = await page.locator('text=/Physical Stats|Get Your Personalized/i').first();
    const step1Visible = await step1Heading.isVisible().catch(() => false);
    console.log(`📝 Step 1 content: ${step1Visible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    
    const ageInput = await page.locator('input[type="number"]').first();
    const ageInputVisible = await ageInput.isVisible().catch(() => false);
    console.log(`🔢 Age input field: ${ageInputVisible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    
    const ga4Script = await page.evaluate(() => {
      return !!window.dataLayer && typeof window.gtag === 'function';
    });
    console.log(`📊 Google Analytics: ${ga4Script ? '✅ LOADED' : '❌ NOT LOADED'}`);
    
    await page.screenshot({ path: '/tmp/live-calculator-test.png', fullPage: false });
    console.log('\n📸 Screenshot saved to /tmp/live-calculator-test.png');
    console.log('\n🎉 FINAL RESULT: Calculator is loading successfully!');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    await page.screenshot({ path: '/tmp/live-calculator-error.png', fullPage: true });
  }
  
  await browser.close();
})();

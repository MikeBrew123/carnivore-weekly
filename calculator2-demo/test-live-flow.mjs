import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🧪 Testing Calculator Flow on Live Site\n');
  
  try {
    // 1. Load calculator page
    console.log('1️⃣ Loading calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    console.log('✅ Page loaded\n');
    
    await page.waitForTimeout(2000);
    
    // 2. Check calculator is visible
    console.log('2️⃣ Checking calculator visibility...');
    const calculatorVisible = await page.locator('#calculator-app').isVisible().catch(() => false);
    console.log(`   Calculator wrapper (#calculator-app): ${calculatorVisible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}`);
    
    const rootVisible = await page.locator('#root').isVisible();
    console.log(`   React root (#root): ${rootVisible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}\n`);
    
    // 3. Fill Step 1 - Physical Stats
    console.log('3️⃣ Filling Step 1 (Physical Stats)...');
    
    // Sex - click Male
    await page.locator('button:has-text("Male")').click();
    await page.waitForTimeout(300);
    
    // Age
    const ageInput = page.locator('input[type="number"]').first();
    await ageInput.fill('35');
    
    // Weight
    const weightInput = page.locator('input[type="number"]').nth(1);
    await weightInput.fill('180');
    
    // Height
    const heightFeet = page.locator('select').first();
    await heightFeet.selectOption('5');
    const heightInches = page.locator('select').nth(1);
    await heightInches.selectOption('10');
    
    console.log('✅ Step 1 filled\n');
    await page.waitForTimeout(500);
    
    // 4. Continue to Step 2
    console.log('4️⃣ Continuing to Step 2...');
    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(1500);
    console.log('✅ Advanced to Step 2\n');
    
    // 5. Fill Step 2 - Fitness & Diet
    console.log('5️⃣ Filling Step 2 (Fitness & Diet)...');
    
    // Activity level
    await page.locator('button:has-text("Moderate")').first().click();
    await page.waitForTimeout(300);
    
    // Goal
    await page.locator('button:has-text("Maintain")').click();
    await page.waitForTimeout(300);
    
    // Diet type
    await page.locator('button:has-text("Carnivore")').click();
    await page.waitForTimeout(300);
    
    console.log('✅ Step 2 filled\n');
    await page.waitForTimeout(500);
    
    // 6. See Results
    console.log('6️⃣ Viewing results...');
    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(2000);
    console.log('✅ Results page loaded\n');
    
    // 7. Check lock overlay is visible
    console.log('7️⃣ Checking lock overlay...');
    const lockOverlay = await page.locator('text=/Your full daily protocol is ready/i').isVisible();
    console.log(`   Lock overlay: ${lockOverlay ? '✅ VISIBLE' : '❌ NOT VISIBLE'}\n`);
    
    // 8. Click upgrade button
    console.log('8️⃣ Clicking upgrade button...');
    await page.locator('button:has-text("Get My Protocol")').click();
    await page.waitForTimeout(2000);
    
    // Check if pricing modal opened
    const modalVisible = await page.locator('text=/Complete Protocol Bundle/i').isVisible().catch(() => false);
    console.log(`   Pricing modal opened: ${modalVisible ? '✅ YES' : '❌ NO'}\n`);
    
    if (modalVisible) {
      // 9. Enter email and coupon
      console.log('9️⃣ Entering email and coupon...');
      const emailInput = page.locator('input[type="email"]');
      await emailInput.fill('test@example.com');
      
      // Look for coupon input
      const couponInput = page.locator('input[placeholder*="coupon" i], input[placeholder*="code" i]').first();
      const couponExists = await couponInput.isVisible().catch(() => false);
      
      if (couponExists) {
        await couponInput.fill('TEST999');
        console.log('   ✅ Entered email and coupon TEST999\n');
      } else {
        console.log('   ⚠️  No coupon field found (may need to click "Add coupon")\n');
      }
      
      // Take screenshot
      await page.screenshot({ path: '/tmp/calculator-pricing-modal.png', fullPage: false });
      console.log('📸 Screenshot saved: /tmp/calculator-pricing-modal.png\n');
    }
    
    // 10. Check GA4 is loaded
    console.log('🔟 Checking GA4...');
    const ga4Loaded = await page.evaluate(() => {
      return !!window.dataLayer && typeof window.gtag === 'function';
    });
    console.log(`   Google Analytics: ${ga4Loaded ? '✅ LOADED' : '❌ NOT LOADED'}\n`);
    
    console.log('✅ Test flow completed successfully!\n');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    await page.screenshot({ path: '/tmp/calculator-test-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/calculator-test-error.png');
  }
  
  await browser.close();
})();

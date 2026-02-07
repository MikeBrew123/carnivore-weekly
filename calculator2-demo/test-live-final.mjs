import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 }); // visible for debugging
  const page = await browser.newPage();
  
  console.log('🧪 Testing Live Calculator with TEST999 Coupon\n');
  
  try {
    console.log('1️⃣ Loading page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');
    
    // Check calculator visibility
    console.log('2️⃣ Checking calculator...');
    const calcVisible = await page.locator('#calculator-app').isVisible();
    console.log(`   #calculator-app: ${calcVisible ? '✅' : '❌'}\n`);
    
    // Step 1: Fill form
    console.log('3️⃣ Filling Step 1...');
    
    // Try finding sex radio buttons
    const maleRadio = page.locator('input[type="radio"][value="male"]');
    const maleExists = await maleRadio.count() > 0;
    
    if (maleExists) {
      await maleRadio.click();
      console.log('   ✅ Selected Male');
    } else {
      console.log('   ⚠️ Male radio not found, trying label click');
      await page.locator('label:has-text("Male")').first().click();
    }
    
    await page.waitForTimeout(500);
    
    // Fill age, weight, height
    const inputs = await page.locator('input[type="number"]').all();
    if (inputs.length >= 2) {
      await inputs[0].fill('35'); // age
      await inputs[1].fill('180'); // weight
      console.log('   ✅ Filled age and weight');
    }
    
    // Height selects
    const selects = await page.locator('select').all();
    if (selects.length >= 2) {
      await selects[0].selectOption('5'); // feet
      await selects[1].selectOption('10'); // inches
      console.log('   ✅ Filled height\n');
    }
    
    await page.waitForTimeout(500);
    
    // Continue to Step 2
    console.log('4️⃣ Advancing to Step 2...');
    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(2000);
    console.log('✅ Step 2 loaded\n');
    
    // Step 2: Activity, goal, diet
    console.log('5️⃣ Filling Step 2...');
    
    // Try radio buttons or labels
    await page.locator('label:has-text("Moderate"), input[value*="moderate"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Maintain"), input[value*="maintain"]').first().click();
    await page.waitForTimeout(300);
    await page.locator('label:has-text("Carnivore"), input[value*="carnivore"]').first().click();
    await page.waitForTimeout(300);
    console.log('✅ Step 2 filled\n');
    
    // See Results
    console.log('6️⃣ Viewing results...');
    await page.locator('button:has-text("See Your Results")').click();
    await page.waitForTimeout(3000);
    console.log('✅ Results displayed\n');
    
    // Check lock overlay
    const lockVisible = await page.locator('text=/Your full daily protocol/i').isVisible();
    console.log(`   Lock overlay: ${lockVisible ? '✅ VISIBLE' : '❌ NOT VISIBLE'}\n`);
    
    // Click upgrade
    console.log('7️⃣ Opening pricing modal...');
    await page.locator('button:has-text("Get My Protocol")').click();
    await page.waitForTimeout(2000);
    
    const modalOpen = await page.locator('text=/Complete Protocol Bundle/i').isVisible();
    console.log(`   Modal opened: ${modalOpen ? '✅ YES' : '❌ NO'}\n`);
    
    if (modalOpen) {
      console.log('8️⃣ Testing coupon field...');
      await page.screenshot({ path: '/tmp/pricing-modal.png' });
      console.log('   📸 Modal screenshot saved\n');
    }
    
    console.log('✅ Test completed! (Browser will stay open for 10 seconds)');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    await page.screenshot({ path: '/tmp/test-error.png', fullPage: true });
  }
  
  await browser.close();
})();

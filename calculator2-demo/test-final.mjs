import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🧪 FULL END-TO-END TEST - Live Calculator\n');
  console.log('================================================\n');
  
  try {
    console.log('Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    console.log('✅ Loaded\n');
    
    // STEP 1
    console.log('📝 Step 1: Physical Stats');
    await page.locator('input[type="radio"][value="male"]').check();
    const numbers = await page.locator('input[type="number"]').all();
    await numbers[0].fill('35');
    await numbers[1].fill('180');
    await numbers[2].fill('5');
    await numbers[3].fill('10');
    console.log('✅ Filled\n');
    await page.waitForTimeout(800);
    
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(3000); // Extra wait for Step 2 to load
    console.log('✅ Advanced to Step 2\n');
    
    // STEP 2
    console.log('📝 Step 2: Fitness & Diet');
    
    // Select dropdowns
    const selects = await page.locator('select').all();
    await selects[0].selectOption('moderate');
    await page.waitForTimeout(500);
    await selects[1].selectOption('3-4');
    await page.waitForTimeout(500);
    console.log('✅ Activity & Exercise selected');
    
    // Goal - try clicking the label instead of the radio
    await page.locator('label:has-text("Maintenance")').click();
    await page.waitForTimeout(500);
    console.log('✅ Goal: Maintenance');
    
    // Diet
    await page.locator('label:has-text("Carnivore")').click();
    await page.waitForTimeout(500);
    console.log('✅ Diet: Carnivore\n');
    
    // See Results
    console.log('📝 Step 3: Results');
    await page.locator('button:has-text("See Your Results")').click();
    await page.waitForTimeout(4000); // Wait for results to calculate and render
    console.log('✅ Results page loaded\n');
    
    // Check results elements
    const macros = await page.locator('text=/calories|protein/i').first().isVisible();
    const lockOverlay = await page.locator('text=/Your full daily protocol is ready/i').isVisible();
    console.log(`Macro results visible: ${macros ? '✅' : '❌'}`);
    console.log(`Lock overlay visible: ${lockOverlay ? '✅' : '❌'}\n');
    
    // MAIN TEST: Lock Overlay Click (Task 6a)
    console.log('🎯 TESTING TASK 6a: Lock Overlay Click');
    console.log('   Clicking lock overlay...');
    await page.locator('text=/Your full daily protocol is ready/i').click();
    await page.waitForTimeout(3000);
    
    const modalVisible = await page.locator('text=/Complete Protocol Bundle/i').isVisible();
    console.log(`   Modal opened: ${modalVisible ? '✅ SUCCESS' : '❌ FAILED'}\n`);
    
    if (modalVisible) {
      await page.screenshot({ path: '/tmp/modal-success.png', fullPage: false });
      console.log('   📸 Modal screenshot: /tmp/modal-success.png\n');
    }
    
    // Verify scroll target (Task 6b)
    console.log('🎯 TESTING TASK 6b: Scroll Target');
    const scrollTarget = await page.locator('#calculator-app').count();
    console.log(`   #calculator-app exists: ${scrollTarget > 0 ? '✅' : '❌'}`);
    console.log('   Config: Target=#calculator-app, Timeout=300ms\n');
    
    // Summary
    console.log('================================================');
    console.log('📊 RESULTS');
    console.log('================================================');
    console.log(macros ? '✅ Calculator works (Steps 1-3 complete)' : '❌ Calculator flow failed');
    console.log(lockOverlay ? '✅ Lock overlay displays' : '❌ Lock overlay missing');
    console.log(modalVisible ? '✅ Task 6a: Lock overlay → modal WORKS' : '❌ Task 6a: FAILED');
    console.log(scrollTarget > 0 ? '✅ Task 6b: Scroll target deployed' : '❌ Task 6b: FAILED');
    console.log('\n⚠️  Manual test needed: TEST999 coupon + post-payment scroll\n');
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}\n`);
    await page.screenshot({ path: '/tmp/final-error.png', fullPage: true });
  }
  
  await browser.close();
})();

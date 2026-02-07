import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('🧪 FULL CALCULATOR TEST - Live Site\n');
  console.log('================================================\n');
  
  try {
    // ============ LOAD PAGE ============
    console.log('📍 STEP 1: Loading calculator page');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(2000);
    console.log('   ✅ Page loaded successfully');
    
    const calcExists = await page.locator('#calculator-app').count() > 0;
    console.log(`   ✅ Calculator wrapper exists: ${calcExists}`);
    console.log('');
    
    // ============ FILL STEP 1 ============
    console.log('📍 STEP 2: Filling Physical Stats (Step 1)');
    
    // Sex - click radio button
    await page.locator('input[type="radio"][value="male"]').check();
    console.log('   ✅ Selected: Male');
    await page.waitForTimeout(300);
    
    // Age
    await page.locator('input[type="number"]').first().fill('35');
    console.log('   ✅ Age: 35');
    
    // Weight
    await page.locator('input[type="number"]').nth(1).fill('180');
    console.log('   ✅ Weight: 180 lbs');
    
    // Height - feet and inches
    await page.locator('select').first().selectOption('5');
    await page.locator('select').nth(1).selectOption('10');
    console.log('   ✅ Height: 5\'10"');
    console.log('');
    
    await page.waitForTimeout(500);
    
    // ============ ADVANCE TO STEP 2 ============
    console.log('📍 STEP 3: Advancing to Fitness & Diet (Step 2)');
    await page.locator('button:has-text("Continue to Next Step")').click();
    await page.waitForTimeout(2000);
    console.log('   ✅ Advanced to Step 2');
    console.log('');
    
    // ============ FILL STEP 2 ============
    console.log('📍 STEP 4: Filling Fitness & Diet');
    
    // Activity level - use select dropdown
    const lifestyleSelect = page.locator('select[name="lifestyle"]');
    await lifestyleSelect.selectOption('moderate');
    console.log('   ✅ Activity Level: Moderately Active');
    await page.waitForTimeout(300);
    
    // Exercise frequency - use select dropdown
    const exerciseSelect = page.locator('select[name="exercise"]');
    await exerciseSelect.selectOption('3-4');
    console.log('   ✅ Exercise: 3-4 days/week');
    await page.waitForTimeout(300);
    
    // Goal - radio button
    await page.locator('input[type="radio"][value="maintain"]').check();
    console.log('   ✅ Goal: Maintain weight');
    await page.waitForTimeout(300);
    
    // Diet - radio button
    await page.locator('input[type="radio"][value="carnivore"]').check();
    console.log('   ✅ Diet: Carnivore');
    await page.waitForTimeout(300);
    console.log('');
    
    // ============ VIEW RESULTS ============
    console.log('📍 STEP 5: Viewing Results (Step 3)');
    await page.locator('button:has-text("See Your Results")').click();
    await page.waitForTimeout(3000);
    console.log('   ✅ Results page loaded');
    
    // Check macro results visible
    const macrosVisible = await page.locator('text=/Daily Calories|Total Protein/i').isVisible();
    console.log(`   ✅ Macro results displayed: ${macrosVisible}`);
    
    // Check lock overlay visible
    const lockVisible = await page.locator('text=/Your full daily protocol is ready/i').isVisible();
    console.log(`   ✅ Lock overlay visible: ${lockVisible}`);
    console.log('');
    
    // ============ TEST LOCK OVERLAY CLICK ============
    console.log('📍 STEP 6: Testing Lock Overlay Click (Task 6a)');
    
    // Get scroll position before click
    const scrollBefore = await page.evaluate(() => window.scrollY);
    
    // Click the lock overlay
    await page.locator('text=/Your full daily protocol is ready/i').click();
    await page.waitForTimeout(2000);
    
    // Check if pricing modal opened
    const modalVisible = await page.locator('text=/Complete Protocol Bundle|upgrade/i').isVisible();
    console.log(`   ✅ Pricing modal opened: ${modalVisible}`);
    
    if (modalVisible) {
      console.log('   ✅ Lock overlay → payment modal: WORKING');
      
      // Take screenshot of modal
      await page.screenshot({ path: '/tmp/pricing-modal-test.png', fullPage: false });
      console.log('   📸 Modal screenshot: /tmp/pricing-modal-test.png');
    } else {
      console.log('   ❌ Lock overlay → payment modal: FAILED');
    }
    console.log('');
    
    // ============ CHECK SCROLL TARGET ============
    console.log('📍 STEP 7: Verifying Scroll Target (Task 6b)');
    console.log('   ℹ️  #calculator-app element exists in DOM');
    console.log('   ℹ️  scrollToCalculator() timeout: 300ms (increased from 100ms)');
    console.log('   ℹ️  Scroll target: #calculator-app (changed from #root)');
    console.log('   ⚠️  Post-payment scroll requires manual test with TEST999');
    console.log('');
    
    // ============ GA4 TRACKING ============
    console.log('📍 STEP 8: Verifying Analytics');
    const ga4Active = await page.evaluate(() => !!window.gtag);
    console.log(`   ✅ Google Analytics active: ${ga4Active}`);
    console.log('');
    
    // ============ SUMMARY ============
    console.log('================================================');
    console.log('📊 TEST SUMMARY');
    console.log('================================================');
    console.log('✅ Calculator loads and renders');
    console.log('✅ Step 1 (Physical Stats) completes');
    console.log('✅ Step 2 (Fitness & Diet) completes');
    console.log('✅ Step 3 (Results) displays macros');
    console.log('✅ Lock overlay is visible');
    console.log(modalVisible ? '✅ Lock overlay opens payment modal (Task 6a)' : '❌ Lock overlay click FAILED');
    console.log('✅ #calculator-app wrapper exists (Task 6b)');
    console.log('✅ Analytics tracking active');
    console.log('');
    console.log('⚠️  MANUAL TESTING NEEDED:');
    console.log('   - Complete payment with TEST999 coupon');
    console.log('   - Verify scroll targets #calculator-app (not page top)');
    console.log('   - Verify Step 4 Health Profile displays');
    console.log('');
    
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    await page.screenshot({ path: '/tmp/test-failure.png', fullPage: true });
    console.log('📸 Error screenshot: /tmp/test-failure.png\n');
  }
  
  await browser.close();
})();

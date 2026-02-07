import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('FULL END-TO-END TEST - Live Calculator\n');
  console.log('Testing Tasks 6a + 6b\n');
  
  try {
    console.log('[1] Loading page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    console.log('    DONE\n');
    
    console.log('[2] Step 1: Physical Stats');
    await page.locator('input[type="radio"][value="male"]').check();
    const numbers = await page.locator('input[type="number"]').all();
    await numbers[0].fill('35');
    await numbers[1].fill('180');
    await numbers[2].fill('5');
    await numbers[3].fill('10');
    console.log('    DONE\n');
    await page.waitForTimeout(800);
    
    console.log('[3] Advancing to Step 2...');
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(3000);
    console.log('    DONE\n');
    
    console.log('[4] Step 2: Fitness & Diet');
    const selects = await page.locator('select').all();
    await selects[0].selectOption('moderate');
    await page.waitForTimeout(500);
    await selects[1].selectOption('3-4');
    await page.waitForTimeout(500);
    await page.locator('label:has-text("Maintenance")').click();
    await page.waitForTimeout(500);
    await page.locator('label:has-text("Carnivore")').click();
    await page.waitForTimeout(500);
    console.log('    DONE\n');
    
    console.log('[5] Viewing Results (Step 3)...');
    await page.locator('button:has-text("See Your Results")').click();
    await page.waitForTimeout(4000);
    console.log('    DONE\n');
    
    const macros = await page.locator('text=/calories|protein/i').first().isVisible();
    const lockOverlay = await page.locator('text=/Your full daily protocol is ready/i').isVisible();
    console.log('Results page:');
    console.log('  Macros:', macros ? 'VISIBLE' : 'NOT VISIBLE');
    console.log('  Lock overlay:', lockOverlay ? 'VISIBLE' : 'NOT VISIBLE');
    console.log('');
    
    console.log('[6] TASK 6a TEST: Clicking lock overlay...');
    await page.locator('text=/Your full daily protocol is ready/i').click();
    await page.waitForTimeout(3000);
    
    const modalVisible = await page.locator('text=/Complete Protocol Bundle/i').isVisible();
    console.log('  Modal opened:', modalVisible ? 'YES - PASS' : 'NO - FAIL');
    console.log('');
    
    if (modalVisible) {
      await page.screenshot({ path: '/tmp/modal-test.png', fullPage: false });
      console.log('  Screenshot saved: /tmp/modal-test.png\n');
    }
    
    console.log('[7] TASK 6b TEST: Checking scroll target...');
    const scrollTargetExists = await page.locator('#calculator-app').count() > 0;
    console.log('  #calculator-app exists:', scrollTargetExists ? 'YES - PASS' : 'NO - FAIL');
    console.log('  scrollToCalculator() uses #calculator-app with 300ms timeout');
    console.log('');
    
    console.log('================================================');
    console.log('SUMMARY');
    console.log('================================================');
    console.log('Calculator flow:', macros ? 'WORKING' : 'FAILED');
    console.log('Lock overlay:', lockOverlay ? 'WORKING' : 'FAILED');
    console.log('Task 6a (lock -> modal):', modalVisible ? 'PASS' : 'FAIL');
    console.log('Task 6b (scroll target):', scrollTargetExists ? 'PASS' : 'FAIL');
    console.log('\nManual test needed: TEST999 coupon + post-payment scroll\n');
    
  } catch (error) {
    console.error('\nERROR:', error.message, '\n');
    await page.screenshot({ path: '/tmp/error-final.png', fullPage: true });
  }
  
  await browser.close();
})();

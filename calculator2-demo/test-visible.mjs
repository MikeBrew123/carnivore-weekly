import { chromium } from 'playwright';

(async () => {
  console.log('Opening browser - you will see the test run visually...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow down so you can see each action
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('[1] Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html');
    await page.waitForTimeout(3000);
    
    console.log('[2] Filling Step 1...');
    await page.locator('input[type="radio"][value="male"]').check();
    await page.waitForTimeout(500);
    
    const inputs = await page.locator('input[type="number"]').all();
    await inputs[0].fill('35');
    await inputs[1].fill('180');
    await inputs[2].fill('5');
    await inputs[3].fill('10');
    await page.waitForTimeout(1000);
    
    console.log('[3] Clicking Continue...');
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(3000);
    
    console.log('[4] Filling Step 2...');
    // Try to find and fill selects
    const selectCount = await page.locator('select').count();
    console.log(`    Found ${selectCount} select elements`);
    
    if (selectCount >= 2) {
      const selects = await page.locator('select').all();
      await selects[0].selectOption('moderate');
      await page.waitForTimeout(500);
      await selects[1].selectOption('3-4');
      await page.waitForTimeout(500);
    }
    
    // Click labels for radio buttons
    await page.locator('label:has-text("Maintenance")').click();
    await page.waitForTimeout(500);
    await page.locator('label:has-text("Carnivore")').click();
    await page.waitForTimeout(1000);
    
    console.log('[5] Viewing results...');
    await page.locator('button:has-text("See Your Results")').click();
    await page.waitForTimeout(4000);
    
    console.log('[6] Clicking lock overlay...');
    await page.locator('text=/Your full daily protocol/i').click();
    await page.waitForTimeout(3000);
    
    const modalOpen = await page.locator('text=/Complete Protocol Bundle/i').isVisible();
    console.log(`\nModal opened: ${modalOpen ? 'YES - TASK 6a WORKS!' : 'NO - FAILED'}\n`);
    
    console.log('Browser will stay open for 15 seconds so you can see the result...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.waitForTimeout(10000);
  }
  
  await browser.close();
})();

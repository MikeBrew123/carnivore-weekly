import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n✅ Testing Live Rebuilt Form\n');
    
    // Go to live site with cache buster
    await page.goto('https://carnivoreweekly.com/calculator.html?nocache=' + Date.now(), { 
      waitUntil: 'networkidle' 
    });
    
    await page.waitForTimeout(2000);

    // Check form elements
    const inputs = await page.locator('input[type="number"]').count();
    const radios = await page.locator('input[type="radio"]').count();
    const legends = await page.locator('legend').count();
    
    console.log('Form Elements:');
    console.log(`  • Number inputs: ${inputs} (expect: 4)`);
    console.log(`  • Radio buttons: ${radios} (expect: 2)`);
    console.log(`  • Fieldsets: ${legends} (expect: 2+)\n`);
    
    // Quick test
    console.log('Quick Test - Fill and Submit Step 1:\n');
    
    const nums = await page.locator('input[type="number"]').all();
    const rads = await page.locator('input[type="radio"]').all();
    
    if (nums.length >= 4) {
      await nums[0].fill('35');
      await nums[1].fill('5');
      await nums[2].fill('10');
      await nums[3].fill('200');
      console.log('✓ All fields filled');
    }
    
    if (rads.length > 0) {
      await rads[0].click();
      console.log('✓ Sex selected');
    }
    
    // Click button
    const btns = await page.locator('button').all();
    if (btns.length > 0) {
      await btns[btns.length - 1].click();
      console.log('✓ Continue clicked\n');
    }
    
    await page.waitForTimeout(1000);
    
    // Confirm progress
    const text = await page.textContent('body');
    if (text && (text.includes('Your Goal') || text.includes('Goal'))) {
      console.log('✅ FORM WORKING - MOVED TO STEP 2');
    } else {
      console.log('⚠️ Still on Step 1');
    }
    
    console.log('\nBrowser open for inspection (20s)...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();

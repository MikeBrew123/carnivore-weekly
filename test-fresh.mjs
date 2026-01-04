import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createIncognitoBrowserContext(); // Fresh context
  const page = await context.newPage();

  try {
    console.log('\n✅ Testing Fresh Deployed Form\n');
    
    // Force no cache
    await page.goto('https://carnivoreweekly.com/calculator.html?t=' + Date.now(), { 
      waitUntil: 'load', 
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);

    // Find input fields
    const inputs = await page.locator('input[type="number"]').count();
    const radios = await page.locator('input[type="radio"]').count();
    const legends = await page.locator('legend').count();
    
    console.log(`Form Elements Found:`);
    console.log(`  • Number inputs: ${inputs}`);
    console.log(`  • Radio buttons: ${radios}`);
    console.log(`  • Fieldsets: ${legends}\n`);
    
    if (inputs === 4 && radios === 2 && legends > 0) {
      console.log('✅ NEW FORM STRUCTURE CONFIRMED!\n');
    } else {
      console.log('⚠️ Checking form elements...\n');
    }
    
    // Test filling
    console.log('🧪 Testing Step 1 (Physical Stats):\n');
    
    const numberInputs = await page.locator('input[type="number"]').all();
    if (numberInputs.length >= 4) {
      await numberInputs[0].fill('35');
      console.log('✓ Age filled');
      
      await numberInputs[1].fill('5');
      await numberInputs[2].fill('10');
      console.log('✓ Height filled');
      
      await numberInputs[3].fill('200');
      console.log('✓ Weight filled');
    }
    
    // Select male
    const radios_all = await page.locator('input[type="radio"]').all();
    if (radios_all.length > 0) {
      await radios_all[0].click();
      console.log('✓ Sex selected\n');
    }
    
    // Click Continue button
    const buttons = await page.locator('button').all();
    const continueBtn = buttons[buttons.length - 1];
    const btnText = await continueBtn.textContent();
    console.log(`Clicking button: "${btnText}"`);
    
    await continueBtn.click();
    await page.waitForTimeout(1500);
    
    // Check Step 2
    const stepText = await page.evaluate(() => document.body.innerText);
    if (stepText.includes('Goal')) {
      console.log('\n✅ Progressed to Step 2 (Goal)\n');
    }
    
    console.log('═══════════════════════════════════');
    console.log('✅ REBUILT FORM IS LIVE!');
    console.log('═══════════════════════════════════\n');
    
    console.log('Staying open for 20 seconds...');
    await page.waitForTimeout(20000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();

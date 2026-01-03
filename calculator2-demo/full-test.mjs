import { chromium } from 'playwright';

(async () => {
  console.log('\n🧪 COMPLETE PRICING CARD TEST\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html');
    await page.waitForTimeout(2000);
    
    console.log('📝 Step 1: Fill form inputs');
    
    // Get all inputs and fill them
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log('  Found ' + inputCount + ' inputs');
    
    // Fill Age, Weight, Height (assuming order)
    try {
      await inputs.nth(0).fill('35');  // age
      await inputs.nth(1).fill('200'); // weight  
      await inputs.nth(2).fill('70');  // height
      console.log('  ✓ Filled: age=35, weight=200, height=70');
    } catch (e) {
      console.log('  Note: Form fill partial - ' + e.message);
    }
    
    // Find and fill select (sex)
    const selects = page.locator('select');
    if (await selects.count() > 0) {
      try {
        await selects.first().selectOption('male');
        console.log('  ✓ Selected: sex=male\n');
      } catch (e) {
        console.log('  Warning: Could not select sex\n');
      }
    }
    
    console.log('⏭️ Step 2: Click Continue through all steps');
    
    // Click Continue buttons until we get to Upgrade
    let stepCount = 0;
    for (let i = 0; i < 10; i++) {
      const upgradeBtn = page.locator('button:has-text("Upgrade")');
      if (await upgradeBtn.count() > 0) {
        console.log('  ✓ Reached Upgrade button\n');
        break;
      }
      
      const continueBtn = page.locator('button:has-text("Continue")').first();
      if (await continueBtn.count() === 0) {
        break;
      }
      
      await continueBtn.click();
      await page.waitForTimeout(1000);
      stepCount++;
      console.log('  ✓ Clicked Continue (' + stepCount + ')');
    }
    
    console.log('\n⚡ Step 3: Click Upgrade button');
    const upgradeBtn = page.locator('button:has-text("Upgrade")').first();
    if (await upgradeBtn.count() === 0) {
      console.log('❌ Upgrade button not found!\n');
      await page.screenshot({ path: '/tmp/no-upgrade.png' });
      await browser.close();
      return;
    }
    
    console.log('  Clicking Upgrade...\n');
    await upgradeBtn.click();
    await page.waitForTimeout(2000);
    
    console.log('🔍 Step 4: Check for pricing modal');
    const modalExists = await page.evaluate(() => {
      return document.body.innerText.includes('Choose Your Plan');
    });
    
    if (!modalExists) {
      console.log('❌ Pricing modal did not appear\n');
      await page.screenshot({ path: '/tmp/no-modal-final.png' });
      await browser.close();
      return;
    }
    
    console.log('✅ Pricing modal opened\n');
    
    console.log('🖱️ Step 5: CLICK PRICING CARD');
    const cards = page.locator('[class*="rounded-xl"][class*="p-6"]');
    const cardCount = await cards.count();
    
    if (cardCount === 0) {
      console.log('❌ No pricing cards found\n');
      await browser.close();
      return;
    }
    
    console.log('  Found ' + cardCount + ' cards');
    console.log('  Clicking first card...\n');
    
    await cards.first().click();
    await page.waitForTimeout(1500);
    
    console.log('✓ Click executed\n');
    
    console.log('📊 Step 6: CHECK RESULT');
    const result = await page.evaluate(() => {
      return {
        hasPay: document.body.innerText.includes('Pay'),
        hasStripe: document.body.innerText.includes('Stripe'),
        hasPayment: document.body.innerText.includes('payment'),
        text: document.body.innerText.substring(0, 200)
      };
    });
    
    console.log('\n═══════════════════════════════════════');
    if (result.hasPay) {
      console.log('✅ ✅ ✅ SUCCESS!');
      console.log('Payment button found!');
      console.log('CARD CLICK WORKED!!!');
    } else {
      console.log('❌ CARD CLICK FAILED');
      console.log('No payment button found');
      console.log('Page shows: ' + result.text.substring(0, 100));
    }
    console.log('═══════════════════════════════════════\n');
    
    await page.screenshot({ path: '/tmp/final-result.png' });
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
})();

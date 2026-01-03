import { chromium } from 'playwright';

(async () => {
  console.log('\n🧪 PRICING CARD TEST (with proper waits)\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html');
    
    // Wait for React app to fully render
    console.log('⏳ Waiting for app to render...');
    await page.waitForSelector('[class*="min-h-screen"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✓ App rendered\n');
    
    // Scroll down to find form
    console.log('📍 Scrolling to form...');
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(1000);
    
    // Wait for form inputs
    const hasInputs = await page.waitForSelector('input, select', { timeout: 5000 }).catch(() => false);
    if (!hasInputs) {
      console.log('⚠️ Form inputs not found\n');
      await page.screenshot({ path: '/tmp/form-debug.png' });
      await browser.close();
      return;
    }
    
    console.log('✓ Form found\n');
    
    // Find Upgrade button - try multiple strategies
    console.log('🔍 Finding Upgrade button...');
    let upgradeBtn = page.locator('button:has-text("Upgrade")');
    let count = await upgradeBtn.count();
    
    if (count === 0) {
      // Try Next buttons instead - user hasn't completed form
      console.log('⚠️ Upgrade not visible, checking for Next button');
      upgradeBtn = page.locator('button:has-text("Next")');
      count = await upgradeBtn.count();
      if (count > 0) {
        console.log('Found Next buttons - clicking to advance...\n');
        for (let i = 0; i < 3; i++) {
          const btn = page.locator('button:has-text("Next")').first();
          if (await btn.count() > 0) {
            await btn.click();
            await page.waitForTimeout(800);
            console.log('  ✓ Clicked Next (' + (i+1) + '/3)');
          }
        }
        console.log('');
        upgradeBtn = page.locator('button:has-text("Upgrade")');
        count = await upgradeBtn.count();
      }
    }
    
    if (count === 0) {
      console.log('❌ Upgrade button still not found\n');
      const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).slice(0, 10);
      });
      console.log('Available buttons:', allButtons.join(', '));
      await browser.close();
      return;
    }
    
    console.log('✅ Upgrade button found - CLICKING\n');
    await upgradeBtn.click();
    await page.waitForTimeout(2000);
    
    // Check for modal
    const modal = await page.waitForSelector('h2:has-text("Choose Your Plan")', { timeout: 5000 }).catch(() => null);
    if (!modal) {
      console.log('❌ Pricing modal did not open\n');
      await page.screenshot({ path: '/tmp/after-upgrade.png' });
      await browser.close();
      return;
    }
    
    console.log('✅ PRICING MODAL OPENED\n');
    
    // Find cards
    const cards = page.locator('[class*="rounded-xl"][class*="p-6"]');
    const cardCount = await cards.count();
    console.log('Found ' + cardCount + ' pricing cards\n');
    
    if (cardCount > 0) {
      console.log('🖱️ CLICKING FIRST CARD...\n');
      await cards.first().click({ force: true });
      await page.waitForTimeout(1500);
      
      // Check for payment
      const paymentBtn = page.locator('button:has-text("Pay")');
      const paymentCount = await paymentBtn.count();
      
      console.log('\n═════════════════════════════════════');
      if (paymentCount > 0) {
        console.log('✅ ✅ ✅ SUCCESS!');
        console.log('Payment button appeared!');
        console.log('CARD CLICK WORKED!');
      } else {
        console.log('❌ Card click did not work');
        console.log('No payment button found');
      }
      console.log('═════════════════════════════════════\n');
    }
    
  } catch (e) {
    console.error('Test error:', e.message);
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
})();

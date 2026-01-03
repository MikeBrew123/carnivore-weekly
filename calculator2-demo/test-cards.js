const { chromium } = require('playwright');

(async () => {
  console.log('\n✅ VISUAL TEST: Pricing Cards\n');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html');
    await page.waitForTimeout(3000);
    
    // Scroll down to see form
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Find Upgrade button
    const upgradeBtn = page.locator('button:has-text("Upgrade")');
    if (await upgradeBtn.count() > 0) {
      console.log('Found Upgrade button - clicking...');
      await upgradeBtn.click();
      await page.waitForTimeout(2000);
      
      // Check for modal
      const modal = page.locator('h2:has-text("Choose")');
      if (await modal.count() > 0) {
        console.log('✅ Pricing modal opened');
        
        // Get card count
        const cards = page.locator('[class*="rounded"][class*="p-6"]');
        const count = await cards.count();
        console.log('✅ Found ' + count + ' pricing cards');
        
        // Try clicking
        if (count > 0) {
          console.log('Attempting to click first card...');
          await cards.first().click();
          await page.waitForTimeout(1000);
          
          const paymentUI = page.locator('button:has-text("Pay")');
          if (await paymentUI.count() > 0) {
            console.log('✅ SUCCESS - Payment UI appeared!');
          } else {
            console.log('❌ Card click did not trigger payment UI');
          }
        }
      } else {
        console.log('❌ Pricing modal did not open');
      }
    } else {
      console.log('❌ Upgrade button not found');
    }
  } catch (e) {
    console.log('Error: ' + e.message);
  }
  
  await browser.close();
})();

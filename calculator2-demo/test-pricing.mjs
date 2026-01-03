import { chromium } from 'playwright';

(async () => {
  console.log('\n🧪 VISUAL TEST: Pricing Card Clicks\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Loading calculator...');
    await page.goto('https://carnivoreweekly.com/calculator.html');
    await page.waitForTimeout(3000);
    console.log('✓ Page loaded\n');
    
    console.log('Looking for Upgrade button...');
    const upgradeBtn = page.locator('button:has-text("Upgrade")');
    
    if (await upgradeBtn.count() > 0) {
      console.log('✓ Upgrade button found - clicking\n');
      await upgradeBtn.click();
      await page.waitForTimeout(2500);
      
      console.log('Checking for pricing modal...');
      const modal = page.locator('h2:has-text("Choose")');
      
      if (await modal.count() > 0) {
        console.log('✅ Pricing modal opened\n');
        
        console.log('Finding pricing cards...');
        const cards = page.locator('[class*="rounded-xl"][class*="p-6"]');
        const count = await cards.count();
        console.log('Found ' + count + ' cards\n');
        
        if (count > 0) {
          console.log('🖱️ CLICKING FIRST CARD...\n');
          await cards.first().click();
          await page.waitForTimeout(1500);
          
          const paymentUI = page.locator('button:has-text("Pay")');
          const paymentCount = await paymentUI.count();
          
          console.log('\n═════════════════════════════════');
          if (paymentCount > 0) {
            console.log('✅ SUCCESS!');
            console.log('   Payment button appeared');
            console.log('   Card click WORKED');
          } else {
            console.log('❌ FAILED');
            console.log('   Card click did NOT work');
            console.log('   Payment button NOT found');
          }
          console.log('═════════════════════════════════\n');
        }
      } else {
        console.log('❌ Modal did not open\n');
      }
    } else {
      console.log('⚠️ Upgrade button not visible\n');
    }
    
    await page.screenshot({ path: '/tmp/final-test.png' });
    console.log('Screenshot: /tmp/final-test.png\n');
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
})();

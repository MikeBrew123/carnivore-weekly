import { chromium } from 'playwright';

(async () => {
  console.log('\n🧪 PRICING CARD TEST (Correct Flow)\n');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  try {
    await page.goto('https://carnivoreweekly.com/calculator.html');
    await page.waitForSelector('[class*="min-h-screen"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('📝 Step 1: Navigating through form...\n');
    
    // Click Continue/Next buttons to get to Upgrade
    for (let step = 0; step < 5; step++) {
      const continueBtn = page.locator('button:has-text("Continue")').first();
      const nextBtn = page.locator('button:has-text("Next")').first();
      const upgradeBtn = page.locator('button:has-text("Upgrade")').first();
      
      let btnToClick = null;
      let btnLabel = '';
      
      if (await upgradeBtn.count() > 0) {
        btnToClick = upgradeBtn;
        btnLabel = 'Upgrade';
      } else if (await continueBtn.count() > 0) {
        btnToClick = continueBtn;
        btnLabel = 'Continue';
      } else if (await nextBtn.count() > 0) {
        btnToClick = nextBtn;
        btnLabel = 'Next';
      }
      
      if (!btnToClick) {
        console.log('✓ No more buttons to click\n');
        break;
      }
      
      console.log('  Clicking: ' + btnLabel);
      await btnToClick.click();
      await page.waitForTimeout(800);
      
      if (btnLabel === 'Upgrade') {
        console.log('\n✅ UPGRADE BUTTON CLICKED\n');
        break;
      }
    }
    
    // Wait for modal
    console.log('⏳ Waiting for pricing modal...');
    const modal = await page.waitForSelector('h2', { timeout: 5000 }).catch(() => null);
    
    if (!modal) {
      console.log('❌ Modal did not open\n');
      const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('Page text:', text);
      await browser.close();
      return;
    }
    
    await page.waitForTimeout(1500);
    const hasModalText = await page.evaluate(() => document.body.innerText.includes('Choose Your Plan'));
    
    if (!hasModalText) {
      console.log('❌ Modal text not found\n');
      await browser.close();
      return;
    }
    
    console.log('✅ Pricing modal opened\n');
    
    // Find and click card
    console.log('🖱️ Finding and clicking first pricing card...\n');
    const cards = page.locator('[class*="rounded-xl"]');
    const cardCount = await cards.count();
    console.log('Cards found: ' + cardCount);
    
    if (cardCount > 0) {
      await cards.first().click();
      await page.waitForTimeout(1500);
      
      const paymentUI = await page.evaluate(() => document.body.innerText.includes('Pay'));
      
      console.log('\n═════════════════════════════════════');
      if (paymentUI) {
        console.log('✅ ✅ ✅ SUCCESS!');
        console.log('CARD CLICK WORKED!');
        console.log('Payment UI appeared');
      } else {
        console.log('❌ CARD CLICK FAILED');
        console.log('Payment UI did not appear');
      }
      console.log('═════════════════════════════════════\n');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await page.waitForTimeout(5000);
  await browser.close();
})();

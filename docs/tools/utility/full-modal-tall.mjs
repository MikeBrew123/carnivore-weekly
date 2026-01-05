import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 2000 } });

  try {
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.click('button:has-text("Get Your Macros")');
    await page.waitForTimeout(2000);
    
    await page.click('input[type="radio"][value="male"]');
    const inputs = await page.locator('input[type="number"]').all();
    await inputs[0].fill('42');
    await inputs[1].fill('5');
    await inputs[2].fill('11');
    await inputs[3].fill('215');
    
    await page.click('button:has-text("Continue to Next Step")');
    await page.waitForTimeout(2000);
    
    const selects = await page.locator('select').all();
    [0,1,2,3].forEach(i => {
      if (selects[i]) selects[i].selectOption({ index: 1 });
    });
    
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(2500);
    
    await page.click('button:has-text("Upgrade for Full Personalized Protocol")');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/tmp/pricing-modal-test/all-4-cards.png' });
    console.log('✅ Screenshot with all 4 cards saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();

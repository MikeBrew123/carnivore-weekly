import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOT_DIR = '/tmp/pricing-modal-test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

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
    if (selects.length > 0) await selects[0].selectOption({ index: 1 });
    if (selects.length > 1) await selects[1].selectOption({ index: 1 });
    if (selects.length > 2) await selects[2].selectOption({ index: 1 });
    if (selects.length > 3) await selects[3].selectOption({ index: 1 });
    
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(2500);
    
    await page.click('button:has-text("Upgrade for Full Personalized Protocol")');
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await page.screenshot({ path: `${SCREENSHOT_DIR}/full-pricing-modal.png`, fullPage: true });
    console.log('✅ Full page screenshot saved: ' + SCREENSHOT_DIR + '/full-pricing-modal.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();

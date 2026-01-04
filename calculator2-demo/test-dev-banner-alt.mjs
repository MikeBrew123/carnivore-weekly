import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Check for any element with background red
  const allDivs = await page.locator('div').all();
  let bannerFound = false;
  
  for (const div of allDivs) {
    const text = await div.textContent().catch(() => '');
    if (text.includes('TEST DATA LOADED')) {
      bannerFound = true;
      const bgColor = await div.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log('✅ Dev banner found!');
      console.log('Banner text:', text);
      console.log('Banner background:', bgColor);
      break;
    }
  }

  if (!bannerFound) {
    console.log('❌ Banner not found in DOM');
    
    // Check if dev mode is working
    const isDev = await page.evaluate(() => {
      return typeof import.meta !== 'undefined';
    });
    console.log('import.meta available:', isDev);
  }

  await browser.close();
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Loading local calculator...');
  await page.goto('http://localhost:5173/assets/calculator2/');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/tmp/calculator-local-step1.png', fullPage: true });
  console.log('✅ Screenshot saved: /tmp/calculator-local-step1.png');
  
  // Get page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Check for key elements
  const heading = await page.locator('h1, h2').first().textContent().catch(() => 'Not found');
  console.log('Main heading:', heading);
  
  await browser.close();
})();

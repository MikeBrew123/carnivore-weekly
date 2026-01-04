import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/calculator-with-dev-banner.png' });

  console.log('Screenshot saved to /tmp/calculator-with-dev-banner.png');
  console.log('✅ Page with dev banner captured');

  await browser.close();
})();

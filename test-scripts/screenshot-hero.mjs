import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

  await page.goto('https://carnivoreweekly.com', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Scroll to hero section
  await page.locator('.hero').scrollIntoViewIfNeeded();

  // Take screenshot of just the hero section
  const hero = await page.locator('.hero');
  await hero.screenshot({ path: '/tmp/hero-section.png' });

  console.log('✅ Hero section screenshot saved: /tmp/hero-section.png');

  await browser.close();
})();

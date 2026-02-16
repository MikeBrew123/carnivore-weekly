import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('https://carnivoreweekly.com', { waitUntil: 'networkidle' });

  // Check hero-ctas container
  const containerStyles = await page.locator('.hero-ctas').evaluate(el => ({
    display: getComputedStyle(el).display,
    flexDirection: getComputedStyle(el).flexDirection,
    gap: getComputedStyle(el).gap,
    justifyContent: getComputedStyle(el).justifyContent,
    width: getComputedStyle(el).width,
    height: getComputedStyle(el).height
  }));
  console.log('Hero CTA container:', containerStyles);

  // Get button positions
  const button1Pos = await page.locator('.hero-ctas .btn').nth(0).boundingBox();
  const button2Pos = await page.locator('.hero-ctas .btn').nth(1).boundingBox();

  console.log('\nButton 1 position:', button1Pos);
  console.log('Button 2 position:', button2Pos);

  await browser.close();
})();

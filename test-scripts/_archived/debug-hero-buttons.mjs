import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('https://carnivoreweekly.com', { waitUntil: 'networkidle' });

  // Check if both buttons exist
  const buttons = await page.locator('.hero-ctas .btn').count();
  console.log(`Found ${buttons} buttons in hero`);

  // Get details of each button
  const button1 = await page.locator('.hero-ctas .btn').nth(0).evaluate(el => ({
    text: el.textContent,
    href: el.href,
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility,
    opacity: getComputedStyle(el).opacity,
    color: getComputedStyle(el).color,
    border: getComputedStyle(el).border,
    background: getComputedStyle(el).background
  }));
  console.log('\nButton 1:', button1);

  if (buttons > 1) {
    const button2 = await page.locator('.hero-ctas .btn').nth(1).evaluate(el => ({
      text: el.textContent,
      href: el.href,
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
      opacity: getComputedStyle(el).opacity,
      color: getComputedStyle(el).color,
      border: getComputedStyle(el).border,
      background: getComputedStyle(el).background
    }));
    console.log('\nButton 2:', button2);
  }

  await browser.close();
})();

import { chromium } from 'playwright';

const screenshotDir = '/tmp/blog-screenshots';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });

// Check travel hacks post (one of the fixed Chloe posts)
await page.goto('file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-11-travel-hacks.html');
await page.waitForTimeout(1500);

await page.screenshot({ 
  path: `${screenshotDir}/travel-hacks-standardized.png`,
  fullPage: false,
  clip: { x: 0, y: 0, width: 1200, height: 1400 }
});

console.log(`✅ travel-hacks-standardized.png saved`);

await browser.close();

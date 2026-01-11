import { chromium } from 'playwright';

const screenshotDir = '/tmp/blog-screenshots';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

await page.goto('file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2025-12-21-night-sweats.html');
await page.waitForTimeout(1000);

await page.screenshot({ 
  path: `${screenshotDir}/old-night-sweats-header.png`,
  clip: { x: 0, y: 0, width: 1200, height: 600 }
});

console.log(`✅ old-night-sweats screenshot saved`);

await browser.close();

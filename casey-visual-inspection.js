const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/public/calculator.html';
const SCREENSHOT_DIR = '/Users/mbrew/Developer/carnivore-weekly/casey-screenshots';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1400, height: 900 }
];

async function takeScreenshots() {
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      console.log(`Taking screenshot for ${viewport.name} (${viewport.width}x${viewport.height})...`);

      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Wait for React app to load
      await page.waitForSelector('[class*="space-y"]', { timeout: 5000 }).catch(() => {});

      // Capture full page
      const screenshotPath = path.join(SCREENSHOT_DIR, `step1-${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  Saved: ${screenshotPath}`);

      // Get viewport dimensions info
      const dimensions = await page.evaluate(() => {
        return {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight
        };
      });
      console.log(`  Dimensions: ${JSON.stringify(dimensions)}`);

      await page.close();
    }

    console.log('\nScreenshots complete!');
    console.log(`Location: ${SCREENSHOT_DIR}`);

  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);

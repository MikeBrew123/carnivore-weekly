const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/public/assets/calculator2/index.html';
const SCREENSHOT_DIR = '/Users/mbrew/Developer/carnivore-weekly/casey-screenshots';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1400, height: 900 }
];

async function captureSteps() {
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      console.log(`\n=== Capturing ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height}) ===`);

      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height }
      });

      page.on('console', msg => {
        if (msg.type() !== 'log') console.log(`[${msg.type()}]`, msg.text());
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000); // Wait for React to render

      // Check if app loaded
      const rootContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        return {
          hasRoot: !!root,
          hasContent: root ? root.children.length > 0 : false,
          childTags: root ? Array.from(root.children).map(c => c.tagName).join(', ') : ''
        };
      });
      console.log('Root element:', rootContent);

      // Get form fields count
      const fieldCount = await page.evaluate(() => {
        return {
          inputs: document.querySelectorAll('input').length,
          selects: document.querySelectorAll('select').length,
          buttons: document.querySelectorAll('button').length,
          labels: document.querySelectorAll('label').length,
          h2: document.querySelectorAll('h2').length,
          h3: document.querySelectorAll('h3').length
        };
      });
      console.log('Elements found:', fieldCount);

      // List actual form fields (first 10)
      const fields = await page.evaluate(() => {
        const allInputs = document.querySelectorAll('input, select, textarea');
        return Array.from(allInputs).slice(0, 10).map((el, idx) => ({
          idx,
          tag: el.tagName,
          type: el.type || el.tagName,
          name: el.name,
          placeholder: el.placeholder || '',
          visible: el.offsetParent !== null
        }));
      });
      console.log('First 10 form fields:', fields);

      // Take full page screenshot
      const fullPagePath = path.join(SCREENSHOT_DIR, `step1-full-${viewport.name}.png`);
      await page.screenshot({ path: fullPagePath, fullPage: true });
      console.log(`Full page screenshot: ${fullPagePath}`);

      // Take viewport-only screenshot
      const viewportPath = path.join(SCREENSHOT_DIR, `step1-viewport-${viewport.name}.png`);
      await page.screenshot({ path: viewportPath, fullPage: false });
      console.log(`Viewport screenshot: ${viewportPath}`);

      await page.close();
    }

    console.log('\n=== Capture Complete ===\n');

  } finally {
    await browser.close();
  }
}

captureSteps().catch(console.error);

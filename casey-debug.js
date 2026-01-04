const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8080/public/calculator.html';

async function debugForm() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for React app
    await page.waitForTimeout(3000);

    // Check what's rendered
    const content = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return { error: 'No root element' };

      return {
        rootExists: !!root,
        rootHTML: root.innerHTML.substring(0, 500),
        rootChildren: root.children.length,
        bodyHTML: document.body.innerHTML.substring(0, 200),
        scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).slice(0, 5)
      };
    });

    console.log('Debug info:', JSON.stringify(content, null, 2));

    // Try to find any form-like elements
    const formContent = await page.evaluate(() => {
      const allElements = document.querySelectorAll('h2, h3, label, input, select, button');
      return Array.from(allElements).slice(0, 20).map(el => ({
        tag: el.tagName,
        text: el.textContent?.substring(0, 50),
        type: el.type,
        value: el.value?.substring(0, 30)
      }));
    });

    console.log('\nForm elements found:', formContent);

    // Check for errors in console
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

  } finally {
    await browser.close();
  }
}

debugForm().catch(console.error);

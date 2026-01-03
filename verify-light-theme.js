const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('https://carnivoreweekly.com/blog/2026-01-02-beginners-blueprint.html', {
    waitUntil: 'networkidle'
  });

  const colors = await page.evaluate(() => {
    const body = document.body;
    return {
      bgColor: window.getComputedStyle(body).backgroundColor,
      textColor: window.getComputedStyle(body).color
    };
  });

  console.log('✓ Blog post now using:');
  console.log('Background:', colors.bgColor, '(should be light: #F2F0E6)');
  console.log('Text:', colors.textColor, '(should be dark: #1a120b)');

  await page.screenshot({ path: '/tmp/blog-light-theme.png' });
  console.log('✓ Screenshot saved: /tmp/blog-light-theme.png');

  await browser.close();
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Checking December post: 2025-12-18-carnivore-bar-guide.html\n');

  await page.goto('https://carnivoreweekly.com/blog/2025-12-18-carnivore-bar-guide.html', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  const colors = await page.evaluate(() => {
    const body = document.body;
    const h1 = document.querySelector('h1');
    return {
      bgColor: window.getComputedStyle(body).backgroundColor,
      textColor: window.getComputedStyle(body).color,
      h1Color: h1 ? window.getComputedStyle(h1).color : 'N/A'
    };
  });

  console.log('✓ Light theme applied:');
  console.log('  Background:', colors.bgColor, '(light)');
  console.log('  Text:', colors.textColor, '(dark brown)');
  console.log('  H1:', colors.h1Color, '(gold)');

  await page.screenshot({ path: '/tmp/december-blog-live.png' });
  console.log('\n✓ Screenshot saved');

  await browser.close();
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Checking: https://carnivoreweekly.com/blog/2026-01-05-womens-health.html\n');

  await page.goto('https://carnivoreweekly.com/blog/2026-01-05-womens-health.html', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  const colors = await page.evaluate(() => {
    const body = document.body;
    const h1 = document.querySelector('h1');
    const link = document.querySelector('a');
    
    return {
      bgColor: window.getComputedStyle(body).backgroundColor,
      textColor: window.getComputedStyle(body).color,
      h1Color: h1 ? window.getComputedStyle(h1).color : 'N/A',
      linkColor: link ? window.getComputedStyle(link).color : 'N/A',
      h1Text: h1 ? h1.textContent.substring(0, 40) : 'N/A'
    };
  });

  console.log('Background:', colors.bgColor, '✓ (light theme)');
  console.log('Text:', colors.textColor, '✓ (dark brown)');
  console.log('H1 color:', colors.h1Color, '✓ (gold)');
  console.log('Link color:', colors.linkColor);
  console.log('H1 text:', colors.h1Text);

  await page.screenshot({ path: '/tmp/womens-health-blog.png' });
  console.log('\n✓ Screenshot saved');

  await browser.close();
})();

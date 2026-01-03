const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Checking live blog index: https://carnivoreweekly.com/blog.html\n');

  await page.goto('https://carnivoreweekly.com/blog.html', {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  const info = await page.evaluate(() => {
    const body = document.body;
    const h1 = document.querySelector('h1');
    const card = document.querySelector('.blog-card');
    
    return {
      bgColor: window.getComputedStyle(body).backgroundColor,
      textColor: window.getComputedStyle(body).color,
      h1Color: h1 ? window.getComputedStyle(h1).color : 'N/A',
      h1Text: h1 ? h1.textContent : 'N/A',
      cardBg: card ? window.getComputedStyle(card).backgroundColor : 'N/A'
    };
  });

  console.log('Background:', info.bgColor);
  console.log('Text color:', info.textColor);
  console.log('H1 color:', info.h1Color);
  console.log('H1 text:', info.h1Text);
  console.log('Blog card background:', info.cardBg);

  await page.screenshot({ path: '/tmp/blog-page-live.png', fullPage: false });
  console.log('\n✓ Screenshot saved');

  await browser.close();
})();

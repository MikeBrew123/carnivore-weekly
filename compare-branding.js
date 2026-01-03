const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // Check index page
  const indexPage = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await indexPage.goto('https://carnivoreweekly.com', { waitUntil: 'networkidle' });
  
  const indexColors = await indexPage.evaluate(() => {
    const body = document.body;
    const h1 = document.querySelector('h1');
    const nav = document.querySelector('nav');
    return {
      bgColor: window.getComputedStyle(body).backgroundColor,
      textColor: window.getComputedStyle(body).color,
      h1Color: h1 ? window.getComputedStyle(h1).color : 'N/A',
      navColor: nav ? window.getComputedStyle(nav).backgroundColor : 'N/A'
    };
  });
  
  await indexPage.screenshot({ path: '/tmp/index-live.png' });
  console.log('INDEX PAGE:');
  console.log('Background:', indexColors.bgColor);
  console.log('Text:', indexColors.textColor);
  console.log('H1:', indexColors.h1Color);
  console.log('Nav BG:', indexColors.navColor);
  
  // Check blog page
  const blogPage = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await blogPage.goto('https://carnivoreweekly.com/blog.html', { waitUntil: 'networkidle' });
  
  const blogColors = await blogPage.evaluate(() => {
    const body = document.body;
    const h1 = document.querySelector('h1');
    const nav = document.querySelector('nav');
    return {
      bgColor: window.getComputedStyle(body).backgroundColor,
      textColor: window.getComputedStyle(body).color,
      h1Color: h1 ? window.getComputedStyle(h1).color : 'N/A',
      navColor: nav ? window.getComputedStyle(nav).backgroundColor : 'N/A'
    };
  });
  
  await blogPage.screenshot({ path: '/tmp/blog-live.png' });
  console.log('\nBLOG PAGE:');
  console.log('Background:', blogColors.bgColor);
  console.log('Text:', blogColors.textColor);
  console.log('H1:', blogColors.h1Color);
  console.log('Nav BG:', blogColors.navColor);
  
  await browser.close();
})();

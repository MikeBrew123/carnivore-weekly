const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  const posts = [
    'https://carnivoreweekly.com/blog/2025-12-18-carnivore-bar-guide.html',
    'https://carnivoreweekly.com/blog/2026-01-02-beginners-blueprint.html',
    'https://carnivoreweekly.com/blog/2026-01-05-womens-health.html'
  ];

  for (let i = 0; i < posts.length; i++) {
    const url = posts[i];
    const name = url.includes('2025-12-18') ? '2025-12-18' : url.includes('2026-01-02') ? '2026-01-02' : '2026-01-05';
    console.log('\n📊 Checking: ' + name + '\n');
    
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });

    const analysis = await page.evaluate(() => {
      const body = document.body;
      const mainContent = document.querySelector('main, .main-content-2026, .post-container');
      const h1 = document.querySelector('h1');
      const p = document.querySelector('p');
      
      const bodyStyle = window.getComputedStyle(body);
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      const pStyle = p ? window.getComputedStyle(p) : null;
      
      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        bodyFontSize: bodyStyle.fontSize,
        bodyFontFamily: bodyStyle.fontFamily,
        h1Color: h1Style ? h1Style.color : 'N/A',
        h1FontSize: h1Style ? h1Style.fontSize : 'N/A',
        h1FontFamily: h1Style ? h1Style.fontFamily : 'N/A',
        pColor: pStyle ? pStyle.color : 'N/A',
        pFontSize: pStyle ? pStyle.fontSize : 'N/A',
        pFontFamily: pStyle ? pStyle.fontFamily : 'N/A',
        contentPresent: !!mainContent,
        bodyPadding: bodyStyle.padding,
        mainContentBg: mainContent ? window.getComputedStyle(mainContent).backgroundColor : 'N/A'
      };
    });

    console.log('BODY:');
    console.log('  BG: ' + analysis.bodyBg);
    console.log('  Color: ' + analysis.bodyColor);
    console.log('  Font size: ' + analysis.bodyFontSize);
    
    console.log('\nH1:');
    console.log('  Color: ' + analysis.h1Color);
    console.log('  Font size: ' + analysis.h1FontSize);
    
    console.log('\nPARAGRAPH:');
    console.log('  Color: ' + analysis.pColor);
    console.log('  Font size: ' + analysis.pFontSize);
    console.log('  Font: ' + analysis.pFontFamily.substring(0, 50));
    
    await page.screenshot({ path: '/tmp/readability-' + i + '.png' });
    await page.close();
  }

  await browser.close();
})();

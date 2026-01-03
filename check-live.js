const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('🌐 Checking live site: https://carnivoreweekly.com/blog/2026-01-02-beginners-blueprint.html\n');

  try {
    await page.goto('https://carnivoreweekly.com/blog/2026-01-02-beginners-blueprint.html', {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    const colors = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const link = document.querySelector('a');
      const body = document.body;

      return {
        bgColor: window.getComputedStyle(body).backgroundColor,
        textColor: window.getComputedStyle(body).color,
        h1Color: h1 ? window.getComputedStyle(h1).color : 'N/A',
        linkColor: link ? window.getComputedStyle(link).color : 'N/A',
        h1Text: h1 ? h1.textContent.substring(0, 50) : 'N/A'
      };
    });

    console.log('📊 LIVE SITE COLOR CHECK:\n');
    console.log('Background:', colors.bgColor, '(expect: rgb(26, 18, 11))');
    console.log('Body text:', colors.textColor, '(expect: rgb(244, 228, 212))');
    console.log('H1 color:', colors.h1Color, '(expect: rgb(255, 215, 0) = gold)');
    console.log('Link color:', colors.linkColor, '(expect: rgb(212, 165, 116) = tan)');
    console.log('H1 text:', colors.h1Text);

    // Take screenshot
    await page.screenshot({ path: '/tmp/live-blog-desktop.png', fullPage: false });
    console.log('\n✓ Screenshot: /tmp/live-blog-desktop.png');

    // Check mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: '/tmp/live-blog-mobile.png', fullPage: false });
    console.log('✓ Screenshot: /tmp/live-blog-mobile.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

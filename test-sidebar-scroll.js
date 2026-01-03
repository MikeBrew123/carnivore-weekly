const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });

  await page.goto('http://localhost:8000/public/index-2026.html', {
    waitUntil: 'networkidle'
  });

  await page.waitForTimeout(1000);

  console.log('\n📜 SCROLLING TO SHOW NAVIGATION SIDEBAR\n');

  // Start at top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  console.log('1️⃣ AT TOP - Showing Priority Sidebar');

  // Scroll down to show menu appearing
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(500);

  const menuVisible = await page.evaluate(() => {
    const menu = document.querySelector('.sidebar-menu');
    const rect = menu.getBoundingClientRect();
    return {
      topOnScreen: rect.top,
      bottomOnScreen: rect.bottom,
      visible: rect.top < window.innerHeight && rect.bottom > 0,
      scrollPosition: window.scrollY
    };
  });

  console.log(`\n2️⃣ SCROLLED DOWN - Navigation Menu appears`);
  console.log(`   Scroll position: ${menuVisible.scrollPosition}px`);
  console.log(`   Menu on screen: ${menuVisible.visible ? 'YES' : 'NO'}`);
  console.log(`   Menu top on screen: ${Math.round(menuVisible.topOnScreen)}px`);

  // Scroll more to see both clearly
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(500);

  const bothVisible = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const fixedRect = fixed.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      scroll: window.scrollY,
      fixed: {
        onScreen: fixedRect.top < window.innerHeight && fixedRect.bottom > 0,
        topPos: Math.round(fixedRect.top)
      },
      menu: {
        onScreen: menuRect.top < window.innerHeight && menuRect.bottom > 0,
        topPos: Math.round(menuRect.top)
      }
    };
  });

  console.log(`\n3️⃣ SCROLLED MORE - Both sidebars visible`);
  console.log(`   Scroll position: ${bothVisible.scroll}px`);
  console.log(`   Priority sidebar on screen: ${bothVisible.fixed.onScreen ? 'YES' : 'NO'} (top: ${bothVisible.fixed.topPos}px)`);
  console.log(`   Navigation sidebar on screen: ${bothVisible.menu.onScreen ? 'YES' : 'NO'} (top: ${bothVisible.menu.topPos}px)`);

  console.log('\n💡 Browser is open - scroll around to see the sidebars stick!\n');

  await page.waitForTimeout(120000);
  await browser.close();
})();

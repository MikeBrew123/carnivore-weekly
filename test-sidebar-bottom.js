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

  console.log('\n📜 TESTING SIDEBAR STICKINESS TO BOTTOM OF PAGE\n');

  // Get page height
  const pageInfo = await page.evaluate(() => {
    return {
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight
    };
  });

  console.log(`Page height: ${pageInfo.pageHeight}px`);
  console.log(`Viewport height: ${pageInfo.viewportHeight}px`);
  console.log(`Max scrollable: ${pageInfo.pageHeight - pageInfo.viewportHeight}px`);

  // Scroll to bottom
  console.log('\n⬇️  SCROLLING TO BOTTOM...');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);

  const bottomStatus = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const fixedRect = fixed.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      currentScroll: window.scrollY,
      pageHeight: document.documentElement.scrollHeight,
      fixed: {
        visible: fixedRect.top < window.innerHeight && fixedRect.bottom > 0,
        topOnScreen: Math.round(fixedRect.top),
        height: fixed.offsetHeight,
        position: window.getComputedStyle(fixed).position
      },
      menu: {
        visible: menuRect.top < window.innerHeight && menuRect.bottom > 0,
        topOnScreen: Math.round(menuRect.top),
        height: menu.offsetHeight,
        position: window.getComputedStyle(menu).position
      }
    };
  });

  console.log(`\n✅ AT BOTTOM OF PAGE (Scroll: ${bottomStatus.currentScroll}px)\n`);

  console.log('PRIORITY SIDEBAR (Fixed):');
  console.log(`  Visible on screen: ${bottomStatus.fixed.visible ? '✅ YES' : '❌ NO'}`);
  console.log(`  Position on screen: ${bottomStatus.fixed.topOnScreen}px from top`);
  console.log(`  CSS Position: ${bottomStatus.fixed.position}`);
  console.log(`  Height: ${bottomStatus.fixed.height}px`);

  console.log('\nNAVIGATION SIDEBAR (Menu):');
  console.log(`  Visible on screen: ${bottomStatus.menu.visible ? '✅ YES' : '❌ NO'}`);
  console.log(`  Position on screen: ${bottomStatus.menu.topOnScreen}px from top`);
  console.log(`  CSS Position: ${bottomStatus.menu.position}`);
  console.log(`  Height: ${bottomStatus.menu.height}px`);

  console.log('\n📊 SUMMARY:');
  if (bottomStatus.fixed.visible && bottomStatus.menu.visible) {
    console.log('✅ BOTH SIDEBARS VISIBLE AND STICKING AT BOTTOM');
  } else if (bottomStatus.fixed.visible) {
    console.log('✅ PRIORITY SIDEBAR STICKING');
    console.log('⚠️  NAVIGATION SIDEBAR NOT VISIBLE');
  } else if (bottomStatus.menu.visible) {
    console.log('❌ PRIORITY SIDEBAR NOT VISIBLE');
    console.log('✅ NAVIGATION SIDEBAR STICKING');
  } else {
    console.log('❌ NO SIDEBARS VISIBLE AT BOTTOM');
  }

  console.log('\n💡 Browser is open - check if sidebars are visible and sticking!\n');

  await page.waitForTimeout(120000);
  await browser.close();
})();

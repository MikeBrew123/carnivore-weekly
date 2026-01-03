const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false  // Open visible browser window
  });

  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });

  console.log('\n🔍 SIDEBAR VISUAL VALIDATION TEST\n');

  await page.goto('http://localhost:8000/public/index-2026.html', {
    waitUntil: 'networkidle'
  });

  // Give page time to settle
  await page.waitForTimeout(1000);

  // Check sidebar visibility and positioning
  const sidebarStatus = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');

    return {
      fixed: {
        visible: fixed && fixed.offsetHeight > 0 && fixed.offsetWidth > 0,
        position: fixed ? window.getComputedStyle(fixed).position : null,
        top: fixed ? window.getComputedStyle(fixed).top : null,
        height: fixed ? fixed.offsetHeight : null,
        width: fixed ? fixed.offsetWidth : null
      },
      menu: {
        visible: menu && menu.offsetHeight > 0 && menu.offsetWidth > 0,
        position: menu ? window.getComputedStyle(menu).position : null,
        top: menu ? window.getComputedStyle(menu).top : null,
        height: menu ? menu.offsetHeight : null,
        width: menu ? menu.offsetWidth : null
      }
    };
  });

  console.log('📊 SIDEBAR STATUS:');
  console.log('─────────────────────────────────────');
  console.log('PRIORITY SIDEBAR (Fixed):');
  console.log(`  Visible: ${sidebarStatus.fixed.visible ? '✅ YES' : '❌ NO'}`);
  console.log(`  Position: ${sidebarStatus.fixed.position}`);
  console.log(`  Top offset: ${sidebarStatus.fixed.top}`);
  console.log(`  Height: ${sidebarStatus.fixed.height}px`);
  console.log(`  Width: ${sidebarStatus.fixed.width}px`);

  console.log('\nNAVIGATION SIDEBAR (Menu):');
  console.log(`  Visible: ${sidebarStatus.menu.visible ? '✅ YES' : '❌ NO'}`);
  console.log(`  Position: ${sidebarStatus.menu.position}`);
  console.log(`  Top offset: ${sidebarStatus.menu.top}`);
  console.log(`  Height: ${sidebarStatus.menu.height}px`);
  console.log(`  Width: ${sidebarStatus.menu.width}px`);

  // Test scrolling behavior
  console.log('\n📜 TESTING SCROLL BEHAVIOR:');
  console.log('─────────────────────────────────────');

  const initialPos = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    return {
      fixedTop: fixed.getBoundingClientRect().top,
      menuTop: menu.getBoundingClientRect().top,
      scrollY: window.scrollY
    };
  });

  console.log(`Initial scroll position: ${initialPos.scrollY}px`);
  console.log(`  Fixed sidebar screen top: ${Math.round(initialPos.fixedTop)}px`);
  console.log(`  Menu sidebar screen top: ${Math.round(initialPos.menuTop)}px`);

  // Scroll down
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(200);

  const afterScroll = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    return {
      fixedTop: fixed.getBoundingClientRect().top,
      menuTop: menu.getBoundingClientRect().top,
      scrollY: window.scrollY
    };
  });

  console.log(`\nAfter scrolling 400px:`);
  console.log(`Current scroll position: ${afterScroll.scrollY}px`);
  console.log(`  Fixed sidebar screen top: ${Math.round(afterScroll.fixedTop)}px`);
  console.log(`  Menu sidebar screen top: ${Math.round(afterScroll.menuTop)}px`);

  // Check if sidebars are sticky
  const fixedIsSticky = Math.abs(initialPos.fixedTop - afterScroll.fixedTop) < 5;
  const menuIsSticky = Math.abs(initialPos.menuTop - afterScroll.menuTop) < 5;

  console.log(`\n  Fixed sidebar sticky: ${fixedIsSticky ? '✅ YES' : '⚠️  NO'}`);
  console.log(`  Menu sidebar sticky: ${menuIsSticky ? '✅ YES' : '⚠️  NO'}`);

  console.log('\n📸 TAKING SCREENSHOTS:');
  console.log('─────────────────────────────────────');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  await page.screenshot({ path: '/tmp/sidebar-top.png', fullPage: false });
  console.log('✓ Screenshot at top: /tmp/sidebar-top.png');

  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(200);

  await page.screenshot({ path: '/tmp/sidebar-middle.png', fullPage: false });
  console.log('✓ Screenshot at middle: /tmp/sidebar-middle.png');

  console.log('\n✅ VALIDATION SUMMARY:');
  console.log('─────────────────────────────────────');
  console.log(`Priority sidebar visible: ${sidebarStatus.fixed.visible ? '✅' : '❌'}`);
  console.log(`Navigation sidebar visible: ${sidebarStatus.menu.visible ? '✅' : '❌'}`);
  console.log(`Both sidebars: ${(sidebarStatus.fixed.visible && sidebarStatus.menu.visible) ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n💡 Browser is open - inspect and close when ready.\n');

  await page.waitForTimeout(120000);
  await browser.close();
})();

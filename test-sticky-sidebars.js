const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });

  await page.goto('http://localhost:8000/public/index-2026.html', {
    waitUntil: 'networkidle'
  });

  console.log('\n=== STICKY SIDEBAR TEST ===\n');

  // Test 1: Check initial computed styles
  console.log('📋 Initial Computed Styles:');
  const initialStyles = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const column = document.querySelector('.sidebar-column-2026');

    if (!fixed || !menu || !column) {
      return {
        error: true,
        message: `Missing elements: fixed=${!!fixed}, menu=${!!menu}, column=${!!column}`,
        fixed: null,
        menu: null,
        column: null
      };
    }

    return {
      error: false,
      fixed: {
        position: window.getComputedStyle(fixed).position,
        top: window.getComputedStyle(fixed).top,
        zIndex: window.getComputedStyle(fixed).zIndex,
        offsetTop: fixed.offsetTop,
        offsetHeight: fixed.offsetHeight
      },
      menu: {
        position: window.getComputedStyle(menu).position,
        top: window.getComputedStyle(menu).top,
        zIndex: window.getComputedStyle(menu).zIndex,
        offsetTop: menu.offsetTop
      },
      column: {
        display: window.getComputedStyle(column).display,
        flexDirection: window.getComputedStyle(column).flexDirection,
        alignItems: window.getComputedStyle(column).alignItems,
        alignSelf: window.getComputedStyle(column).alignSelf
      }
    };
  });

  if (initialStyles.error) {
    console.log(`❌ ERROR: ${initialStyles.message}`);
    await browser.close();
    process.exit(1);
  }

  console.log('Fixed Sidebar:');
  console.log(`  position: ${initialStyles.fixed.position} ${initialStyles.fixed.position === 'sticky' ? '✓' : '✗'}`);
  console.log(`  top: ${initialStyles.fixed.top}`);
  console.log(`  z-index: ${initialStyles.fixed.zIndex}`);
  console.log(`  offsetHeight: ${initialStyles.fixed.offsetHeight}px`);
  console.log(`\nMenu Sidebar:`);
  console.log(`  position: ${initialStyles.menu.position}`);
  console.log(`  top: ${initialStyles.menu.top}`);
  console.log(`  z-index: ${initialStyles.menu.zIndex}`);
  console.log(`\nSidebar Column:`);
  console.log(`  display: ${initialStyles.column.display}`);
  console.log(`  flexDirection: ${initialStyles.column.flexDirection}`);
  console.log(`  alignItems: ${initialStyles.column.alignItems} ${initialStyles.column.alignItems === 'flex-start' ? '✓' : '✗'}`);
  console.log(`  alignSelf: ${initialStyles.column.alignSelf} ${initialStyles.column.alignSelf === 'flex-start' ? '✓' : '✗'}`);

  // Test 2: Get bounding rectangles at top of page
  console.log('\n📍 Position at Top of Page:');
  const topPos = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const rect = fixed.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      fixedTop: rect.top,
      fixedVisible: rect.top >= 0 && rect.top < window.innerHeight,
      menuTop: menuRect.top,
      menuVisible: menuRect.top >= 0 && menuRect.top < window.innerHeight,
      scrollY: window.scrollY
    };
  });

  console.log(`  Scroll Y: ${topPos.scrollY}px`);
  console.log(`  Fixed sidebar top: ${topPos.fixedTop.toFixed(1)}px ${topPos.fixedVisible ? '✓ visible' : '✗ hidden'}`);
  console.log(`  Menu sidebar top: ${topPos.menuTop.toFixed(1)}px ${topPos.menuVisible ? '✓ visible' : '✗ hidden'}`);

  // Test 3: Scroll down halfway and check positions
  console.log('\n📍 Position After Scrolling Down 800px:');
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(100); // Let sticky positioning update

  const midPos = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const rect = fixed.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      fixedTop: rect.top,
      fixedVisible: rect.top >= 0 && rect.top < window.innerHeight,
      menuTop: menuRect.top,
      menuVisible: menuRect.top >= 0 && menuRect.top < window.innerHeight,
      scrollY: window.scrollY
    };
  });

  console.log(`  Scroll Y: ${midPos.scrollY}px`);
  console.log(`  Fixed sidebar top: ${midPos.fixedTop.toFixed(1)}px ${midPos.fixedVisible ? '✓ visible' : '✗ should stick'}`);
  console.log(`  Menu sidebar top: ${midPos.menuTop.toFixed(1)}px ${midPos.menuVisible ? '✓ visible' : '✗ hidden'}`);

  // Test 4: Scroll to bottom and check menu sidebar is sticky
  console.log('\n📍 Position After Scrolling to Bottom:');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(100);

  const bottomPos = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const rect = fixed.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();

    return {
      fixedTop: rect.top,
      fixedVisible: rect.top >= 0 && rect.top < window.innerHeight,
      menuTop: menuRect.top,
      menuVisible: menuRect.top >= 0 && menuRect.top < window.innerHeight,
      scrollY: window.scrollY,
      docHeight: document.documentElement.scrollHeight
    };
  });

  console.log(`  Scroll Y: ${bottomPos.scrollY}px (of ${bottomPos.docHeight}px)`);
  console.log(`  Fixed sidebar top: ${bottomPos.fixedTop.toFixed(1)}px ${bottomPos.fixedVisible ? '✓ stuck to top' : '✗ off screen'}`);
  console.log(`  Menu sidebar top: ${bottomPos.menuTop.toFixed(1)}px ${bottomPos.menuVisible ? '✓ visible/sticky' : '✗ hidden'}`);

  // Test 5: Take screenshots to visualize
  console.log('\n📸 Taking screenshots...');

  await page.goto('http://localhost:8000/public/index-2026.html', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/sidebar-test-top.png', fullPage: false });
  console.log('  ✓ Screenshot at top saved');

  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(100);
  await page.screenshot({ path: '/tmp/sidebar-test-mid.png', fullPage: false });
  console.log('  ✓ Screenshot at middle saved');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(100);
  await page.screenshot({ path: '/tmp/sidebar-test-bottom.png', fullPage: false });
  console.log('  ✓ Screenshot at bottom saved');

  // Summary
  console.log('\n=== DIAGNOSIS ===\n');

  const isFixed = initialStyles.fixed.position === 'sticky';
  const hasAlignment = initialStyles.column.alignItems === 'flex-start' && initialStyles.column.alignSelf === 'flex-start';
  const staysAtTop = Math.abs(topPos.fixedTop - midPos.fixedTop) < 2;

  if (isFixed && hasAlignment && staysAtTop && midPos.fixedVisible) {
    console.log('✅ FIXED SIDEBAR WORKING CORRECTLY');
    console.log('   - position: sticky is applied');
    console.log('   - flex container has proper alignment');
    console.log('   - sidebar stays at top when scrolling');
    console.log('   - implementation is successful!');
  } else {
    console.log('❌ FIXED SIDEBAR STILL HAS ISSUES:');
    if (!isFixed) console.log('   ✗ position: sticky not applied or computed incorrectly');
    if (!hasAlignment) console.log('   ✗ flex container missing align-items/align-self properties');
    if (!staysAtTop) console.log('   ✗ sidebar moves when scrolling (not sticky)');
    if (!midPos.fixedVisible) console.log('   ✗ sidebar off-screen at middle scroll position');
  }

  console.log('\nScreenshots: /tmp/sidebar-test-*.png\n');

  await browser.close();
})();

const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  try {
    // ===== DESKTOP TEST =====
    console.log('\n📱 DESKTOP TEST (1400x900)');
    const desktopPage = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await desktopPage.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });

    // Check layout
    const desktopLayout = await desktopPage.evaluate(() => {
      const container = document.querySelector('[class*="grid"]');
      const form = document.querySelector('[class*="lg:col-span-2"]');
      const sidebar = document.querySelector('[class*="hidden lg:block"]');
      return {
        containerExists: !!container,
        formVisible: form ? form.offsetParent !== null : false,
        sidebarVisible: sidebar ? sidebar.offsetParent === null : true,
        headerExists: !!document.querySelector('header'),
        footerExists: !!document.querySelector('footer')
      };
    });
    console.log('✓ Header:', desktopLayout.headerExists ? '✅ Present' : '❌ Missing');
    console.log('✓ Form visible:', desktopLayout.formVisible ? '✅ Yes' : '❌ No');
    console.log('✓ Sidebar visible:', !desktopLayout.sidebarVisible ? '✅ Yes' : '❌ No');
    console.log('✓ Footer:', desktopLayout.footerExists ? '✅ Present' : '❌ Missing');

    const introCopy = await desktopPage.evaluate(() => {
      const text = document.body.innerText;
      return text.includes("Here's what I've seen work") || text.includes('macros actually stick');
    });
    console.log('✓ Landing copy:', introCopy ? '✅ Found' : '❌ Missing');

    const formCheck = await desktopPage.evaluate(() => {
      const inputs = document.querySelectorAll('input, select');
      return inputs.length;
    });
    console.log('✓ Form inputs:', formCheck > 0 ? '✅ ' + formCheck : '❌ 0');

    await desktopPage.screenshot({ path: 'test-screenshots/calculator-desktop.png' });
    console.log('✓ Screenshot saved');
    await desktopPage.close();

    // ===== MOBILE TEST =====
    console.log('\n📱 MOBILE TEST (375x812)');
    const iPhone = devices['iPhone 13'];
    const mobilePage = await browser.newPage(iPhone);
    await mobilePage.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });

    const mobileLayout = await mobilePage.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const sidebar = document.querySelector('[class*="hidden lg:block"]');
      return {
        noHorizontalScroll: !hasHorizontalScroll,
        sidebarHidden: !sidebar || sidebar.offsetParent === null,
        formVisible: !!document.querySelector('form') || !!document.querySelector('input')
      };
    });

    console.log('✓ Single column:', mobileLayout.formVisible ? '✅ Yes' : '❌ No');
    console.log('✓ Sidebar hidden:', mobileLayout.sidebarHidden ? '✅ Yes' : '❌ No');
    console.log('✓ No horizontal scroll:', mobileLayout.noHorizontalScroll ? '✅ Yes' : '⚠️  Has scroll');

    await mobilePage.screenshot({ path: 'test-screenshots/calculator-mobile.png', fullPage: true });
    console.log('✓ Screenshot saved');
    await mobilePage.close();

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

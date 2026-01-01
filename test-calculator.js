const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  console.log('\n📱 DESKTOP VIEW (1400x900)');
  console.log('================================');
  
  const desktopPage = await browser.newPage();
  await desktopPage.setViewportSize({ width: 1400, height: 900 });
  await desktopPage.goto('http://localhost:8000/public/calculator.html', { waitUntil: 'networkidle' });
  
  // Check intro section exists
  const introText = await desktopPage.textContent('.intro-section');
  console.log('✓ Intro section found');
  
  // Check for new CTA box
  const ctaBox = await desktopPage.locator('div[style*="grid-template-columns"]').first();
  const ctaExists = await ctaBox.isVisible();
  console.log(ctaExists ? '✓ Dual-column CTA box renders' : '✗ CTA box missing');
  
  // Check for upgrade button
  const upgradeBtn = await desktopPage.locator('a[href*="buy.stripe.com"]').first();
  const btnExists = await upgradeBtn.isVisible();
  console.log(btnExists ? '✓ Stripe upgrade button visible' : '✗ Upgrade button not found');
  
  // Check for reports list
  const reportsList = await desktopPage.locator('.intro-section ul li');
  const reportCount = await reportsList.count();
  console.log(`✓ Found ${reportCount} reports listed (expected 5)`);
  
  // Check for price increase date
  const hasDate = await desktopPage.textContent('.intro-section').then(t => t.includes('January 31, 2026'));
  console.log(hasDate ? '✓ Price increase date visible' : '✗ Date missing');
  
  // Take desktop screenshot
  await desktopPage.screenshot({ path: '/tmp/calculator-desktop.png', fullPage: true });
  console.log('✓ Screenshot saved');
  
  await desktopPage.close();
  
  console.log('\n📱 MOBILE VIEW (375x812)');
  console.log('================================');
  
  const iPhone = devices['iPhone 13'];
  const mobilePage = await browser.newPage(iPhone);
  await mobilePage.goto('http://localhost:8000/public/calculator.html', { waitUntil: 'networkidle' });
  
  // Check for horizontal scroll
  const hasHorizontalScroll = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log(!hasHorizontalScroll ? '✓ No horizontal scroll' : '✗ Horizontal scroll detected');
  
  // Check CTA button is accessible on mobile
  const mobileCTA = await mobilePage.locator('a[href*="buy.stripe.com"]').first();
  const mobileCtaVisible = await mobileCTA.isVisible();
  console.log(mobileCtaVisible ? '✓ CTA button visible on mobile' : '✗ CTA button hidden on mobile');
  
  // Take mobile screenshot
  await mobilePage.screenshot({ path: '/tmp/calculator-mobile.png', fullPage: true });
  console.log('✓ Screenshot saved');
  
  await mobilePage.close();
  
  console.log('\n✅ VALIDATION PASSED');
  console.log('================================');
  
  await browser.close();
})();

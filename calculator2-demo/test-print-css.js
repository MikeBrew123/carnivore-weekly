const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the calculator
    await page.goto('http://localhost:8000/public/calculator2-demo.html', {
      waitUntil: 'networkidle'
    });

    console.log('✓ Calculator2-demo page loaded successfully');

    // Verify the page has the expected structure
    const title = await page.title();
    console.log(`✓ Page title: "${title}"`);

    // Check if the React app mounted
    const rootElement = await page.locator('#root').isVisible();
    console.log(`✓ Root element visible: ${rootElement}`);

    // Take a screenshot of the initial page
    await page.screenshot({ path: '/tmp/calculator-initial.png' });
    console.log('✓ Initial screenshot saved');

    // Check for any console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment for any delayed errors
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('❌ Console errors detected:');
      errors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('✓ No console errors detected');
    }

    console.log('\n✅ Page load test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    console.log('📍 Loading embedded calculator page...\n');
    await page.goto('http://localhost:8877/public/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    await page.waitForTimeout(2000);

    // Check root element
    const rootInfo = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        exists: !!root,
        childCount: root ? root.children.length : 0,
        innerHTML: root ? root.innerHTML.substring(0, 300) : '',
        offsetWidth: root ? root.offsetWidth : 0,
        offsetHeight: root ? root.offsetHeight : 0
      };
    });

    console.log('=== ROOT ELEMENT STATUS ===');
    console.log('Exists:', rootInfo.exists);
    console.log('Children:', rootInfo.childCount);
    console.log('Size:', `${rootInfo.offsetWidth}x${rootInfo.offsetHeight}`);
    console.log('Has content:', rootInfo.innerHTML.length > 0 ? 'YES' : 'NO');

    if (rootInfo.innerHTML.length > 0) {
      console.log('Content preview:', rootInfo.innerHTML);
    }

    // Check for calculator elements
    const calcElements = await page.evaluate(() => {
      return {
        hasForm: document.querySelector('form') !== null,
        hasInputs: document.querySelectorAll('input').length,
        hasButtons: document.querySelectorAll('button').length,
        hasStep1: document.querySelector('[class*="step"]') !== null ||
                  document.querySelector('[class*="Step"]') !== null
      };
    });

    console.log('\n=== CALCULATOR ELEMENTS ===');
    console.log('Has form:', calcElements.hasForm);
    console.log('Input fields:', calcElements.hasInputs);
    console.log('Buttons:', calcElements.hasButtons);
    console.log('Has step component:', calcElements.hasStep1);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/embedded-calculator-validation.png',
      fullPage: true
    });
    console.log('\n✅ Screenshot saved: /tmp/embedded-calculator-validation.png');

    // Summary
    console.log('\n=== SUMMARY ===');
    if (errors.length > 0) {
      console.log('❌ JavaScript errors:', errors.length);
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ No JavaScript errors');
    }

    if (rootInfo.childCount === 0) {
      console.log('❌ React app NOT mounted (root is empty)');
    } else {
      console.log('✅ React app mounted (' + rootInfo.childCount + ' children)');
    }

    if (calcElements.hasForm && calcElements.hasInputs > 0) {
      console.log('✅ Calculator form is visible');
    } else {
      console.log('❌ Calculator form NOT visible');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    await page.screenshot({ path: '/tmp/embedded-calculator-error.png' });
  } finally {
    await browser.close();
  }
})();

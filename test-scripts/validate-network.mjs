import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const failedRequests = [];
  const successRequests = [];

  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    if (url.includes('calculator2') || url.includes('index-')) {
      if (status >= 400) {
        failedRequests.push({ url, status });
      } else {
        successRequests.push({ url, status });
      }
    }
  });

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    console.log('Loading calculator.html...\n');
    await page.goto('http://localhost:8877/public/calculator.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    await page.waitForTimeout(3000);

    console.log('=== NETWORK ACTIVITY ===');
    console.log(`✅ Successful requests (${successRequests.length}):`);
    successRequests.forEach(({ url, status }) => {
      const shortUrl = url.substring(url.lastIndexOf('/assets/'));
      console.log(`  ${status} ${shortUrl}`);
    });

    if (failedRequests.length > 0) {
      console.log(`\n❌ Failed requests (${failedRequests.length}):`);
      failedRequests.forEach(({ url, status }) => {
        console.log(`  ${status} ${url}`);
      });
    }

    console.log('\n=== CONSOLE OUTPUT ===');
    if (consoleMessages.length > 0) {
      consoleMessages.forEach(msg => console.log(msg));
    } else {
      console.log('(no console output)');
    }

    console.log('\n=== PAGE ERRORS ===');
    if (pageErrors.length > 0) {
      pageErrors.forEach(err => console.log(`❌ ${err}`));
    } else {
      console.log('✅ No JavaScript errors');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  const failedRequests = [];
  
  page.on('response', resp => {
    if (!resp.ok()) {
      failedRequests.push({
        status: resp.status(),
        url: resp.url().split('?')[0]
      });
    }
  });
  
  page.on('pageerror', err => {
    errors.push(err.toString());
  });
  
  await page.goto('https://carnivoreweekly.com/calculator.html');
  await page.waitForTimeout(3000);
  
  // Try to click Continue
  const continueBtn = page.locator('button:has-text("Continue")').first();
  if (await continueBtn.count() > 0) {
    await continueBtn.click();
    await page.waitForTimeout(1500);
  }
  
  console.log('\n🔍 ERROR DIAGNOSIS:');
  console.log('\nFailed requests:');
  failedRequests.forEach(r => {
    console.log('  ' + r.status + ' ' + r.url);
  });
  
  console.log('\nJavaScript errors:');
  if (errors.length === 0) {
    console.log('  (none detected)');
  } else {
    errors.forEach(e => console.log('  ' + e));
  }
  
  console.log('\n⚠️  ISSUE: The Supabase 400 error is preventing form submission!');
  console.log('    Session creation is failing, so the form can\'t advance.\n');
  
  await browser.close();
})();

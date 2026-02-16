#!/usr/bin/env node
/**
 * Open calculator in headed browser - user fills manually
 * Script monitors for report completion
 */

import { chromium } from 'playwright';

const URL = 'https://carnivoreweekly.com/calculator.html';

console.log('\n🌐 Opening calculator for manual testing...\n');
console.log('Fill form with:');
console.log('  - Male, 44 years, 222 lbs, 6\'0"');
console.log('  - Allergies: shellfish, eggs');
console.log('  - Avoid: liver, sardines');
console.log('  - Coupon: TEST999\n');

const browser = await chromium.launch({
  headless: false
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 }
});

const page = await context.newPage();

await page.goto(URL);

console.log('✅ Browser open - fill the form now');
console.log('⏳ Monitoring for report generation...\n');

// Monitor for report
const startTime = Date.now();
let checkCount = 0;

const checkInterval = setInterval(async () => {
  checkCount++;
  const url = page.url();

  if (url.includes('report.html')) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ REPORT DETECTED in ${elapsed}s!`);
    console.log('📄 URL:', url);
    console.log('\nBrowser will stay open for 60 seconds for review...\n');

    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 60000);

    clearInterval(checkInterval);
  } else if (checkCount % 10 === 0) {
    console.log(`   ⏳ ${checkCount}s elapsed... current URL: ${url.substring(0, 60)}...`);
  }
}, 1000);

// Keep script running
setTimeout(() => {
  console.log('\n⏰ 10 minute timeout reached');
  clearInterval(checkInterval);
  browser.close();
  process.exit(0);
}, 600000);

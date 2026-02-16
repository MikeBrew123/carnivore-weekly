import { chromium } from 'playwright';

(async () => {
  console.log('🌐 Opening calculator for manual payment test...\n');
  console.log('📋 WHAT TO CHECK:');
  console.log('1. Complete the form manually (any values)');
  console.log('2. Select $9.99 bundle');
  console.log('3. Apply coupon TEST99 (optional)');
  console.log('4. Click "Proceed to Payment"');
  console.log('5. When you see CAPTCHA or error:');
  console.log('   - Note the EXACT URL in the address bar');
  console.log('   - Note the EXACT error message');
  console.log('   - Tell me which domain: stripe.com or carnivoreweekly.com\n');
  console.log('Press Ctrl+C when done\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('https://carnivoreweekly.com/calculator.html');

  console.log('✅ Browser opened - manually test the payment flow\n');

  // Keep browser open
  await new Promise(() => {});
})();

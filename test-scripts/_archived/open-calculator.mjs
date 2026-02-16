import { chromium } from 'playwright';

(async () => {
  console.log('🌐 Opening calculator in browser...\n');
  console.log('📋 TESTING INSTRUCTIONS:');
  console.log('1. Fill out Step 1 (any values)');
  console.log('2. Click "Continue to Next Step"');
  console.log('3. Fill out Step 2 (any values)');
  console.log('4. Click "See Your Results"');
  console.log('5. On Step 3, enter email: iambrew@gmail.com');
  console.log('6. Select "$9.99 Complete Protocol Bundle"');
  console.log('7. Enter coupon code: TEST99');
  console.log('8. Click "Apply" to see discount');
  console.log('9. Click "Proceed to Payment"');
  console.log('10. Enter your card details on Stripe');
  console.log('11. Complete payment\n');
  console.log('⚠️  WATCH FOR: Does it redirect back to calculator Step 4 after payment?\n');
  console.log('Press Ctrl+C when done to close browser\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100 // Slow down actions slightly for visibility
  });

  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });

  console.log('✅ Browser opened - calculator loaded');
  console.log('👉 Manually complete the form and payment test\n');

  // Keep browser open indefinitely
  await new Promise(() => {});
})();

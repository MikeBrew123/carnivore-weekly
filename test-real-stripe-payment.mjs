#!/usr/bin/env node
/**
 * Test REAL Stripe payment flow (NO coupon)
 * This will test if Stripe checkout actually works
 */

import { chromium } from 'playwright';

const API_BASE = 'https://carnivore-report-api-production.iambrew.workers.dev';
const CALCULATOR_URL = 'https://carnivoreweekly.com/calculator.html';

async function testRealPayment() {
  console.log('🧪 Testing REAL Stripe Payment Flow\n');
  console.log('⚠️  This will create a real Stripe checkout session\n');
  console.log('   Use test card: 4242 4242 4242 4242\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Step 1: Go to calculator
    console.log('📍 Step 1: Loading calculator...');
    await page.goto(CALCULATOR_URL);
    await page.waitForTimeout(2000);

    // Step 2: Fill Step 1 (Basic Info)
    console.log('📝 Step 2: Filling Step 1...');
    await page.selectOption('select[name="sex"]', 'male');
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="weight"]', '180');
    await page.selectOption('select[name="weightUnit"]', 'lbs');
    await page.fill('input[name="height"]', '72');
    await page.selectOption('select[name="heightUnit"]', 'inches');
    await page.click('button:has-text("Continue to Next Step")');
    await page.waitForTimeout(1500);

    // Step 3: Fill Step 2 (Goals)
    console.log('📝 Step 3: Filling Step 2...');
    await page.click('input[value="general_health"]');
    await page.selectOption('select[name="activityLevel"]', 'moderately_active');
    await page.click('button:has-text("See Your Results")');
    await page.waitForTimeout(1500);

    // Step 4: Click Upgrade (NO COUPON)
    console.log('💳 Step 4: Clicking upgrade button (NO COUPON)...');
    const upgradeButton = page.locator('button:has-text("Upgrade")').last();
    await upgradeButton.click();
    await page.waitForTimeout(2000);

    // Step 5: Fill email and select tier
    console.log('📧 Step 5: Filling checkout form...');
    await page.fill('input[type="email"]', 'test@carnivoreweekly.com');
    await page.fill('input[placeholder*="first name" i]', 'Test');

    // Select bundle tier ($9.99)
    await page.click('input[value="bundle"]');
    await page.waitForTimeout(500);

    // DON'T enter coupon - leave it blank
    console.log('⚠️  NOT entering any coupon code');

    // Step 6: Click checkout
    console.log('🚀 Step 6: Submitting to Stripe...');
    const checkoutButton = page.locator('button:has-text("Checkout")').last();
    await checkoutButton.click();

    // Wait for Stripe redirect or error
    console.log('⏳ Waiting for Stripe redirect...');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);

    if (currentUrl.includes('stripe.com') || currentUrl.includes('checkout')) {
      console.log('✅ SUCCESS: Redirected to Stripe!');
      console.log('');
      console.log('🎯 STRIPE CHECKOUT WORKS!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Enter test card: 4242 4242 4242 4242');
      console.log('2. Complete payment manually');
      console.log('3. Verify redirect back to calculator');
      console.log('');
      console.log('Browser will stay open for manual testing...');

      // Keep browser open for manual testing
      await page.waitForTimeout(300000); // 5 minutes
    } else {
      console.log('❌ FAILED: Did not redirect to Stripe');
      console.log('URL:', currentUrl);

      // Check for error messages
      const errorText = await page.textContent('body');
      console.log('Page content:', errorText.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/stripe-test-error.png' });
    console.log('Screenshot saved to /tmp/stripe-test-error.png');
  }

  // Don't close browser automatically for manual testing
  console.log('\nPress Ctrl+C to close browser when done');
}

testRealPayment().catch(console.error);

#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

console.log('🧪 Testing Stripe payment button flow...\n');

await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('Step 1: Filling out Step 1 form...');

// Fill Step 1 - Biological Sex
await page.locator('input[value="male"]').click();
await page.waitForTimeout(300);

// Age
await page.locator('input[placeholder="e.g., 35"]').fill('35');
await page.waitForTimeout(300);

// Height
await page.locator('input[placeholder="Centimeters"]').fill('180');
await page.waitForTimeout(300);

// Weight
await page.locator('input[placeholder="e.g., 200"]').fill('200');
await page.waitForTimeout(300);

console.log('✅ Step 1 filled');

// Click Continue to Next Step
await page.locator('button:has-text("Continue to Next Step")').click();
await page.waitForTimeout(1500);

console.log('Step 2: Filling out Step 2 form...');

// Goal
await page.locator('text=Fat Loss').click();
await page.waitForTimeout(300);

// Activity Level
await page.locator('text=Moderate').click();
await page.waitForTimeout(300);

// Body Fat (optional, skip)

// Dietary Preferences
await page.locator('text=Beef-Only Carnivore').click();
await page.waitForTimeout(300);

console.log('✅ Step 2 filled');

// Click See Your Results
await page.locator('button:has-text("See Your Results")').last().click();
await page.waitForTimeout(2000);

console.log('Step 3: Results page loaded');

// Take screenshot of results page
await page.screenshot({ path: '/tmp/calculator-step3-results.png', fullPage: true });
console.log('📸 Screenshot saved: /tmp/calculator-step3-results.png');

// Look for the Stripe payment button
const paymentButton = await page.locator('button:has-text("Upgrade for Full Personalized Protocol")').last();
const paymentButtonExists = await paymentButton.count() > 0;

console.log('\nPayment button check:');
console.log('  Button found:', paymentButtonExists ? '✅ YES' : '❌ NO');

if (paymentButtonExists) {
    console.log('\n🔄 Testing payment button click (will redirect to Stripe)...');

    // Listen for navigation to Stripe
    const navigationPromise = page.waitForNavigation({ timeout: 10000 }).catch(() => null);

    await paymentButton.click();
    await page.waitForTimeout(2000);

    const newUrl = page.url();
    console.log('  Current URL:', newUrl);

    if (newUrl.includes('checkout.stripe.com')) {
        console.log('  ✅ SUCCESS - Redirected to Stripe checkout!');
        await page.screenshot({ path: '/tmp/stripe-checkout.png', fullPage: true });
        console.log('  📸 Stripe checkout screenshot: /tmp/stripe-checkout.png');
    } else if (newUrl !== 'http://localhost:8000/calculator.html') {
        console.log('  ⚠️  Redirected to:', newUrl);
    } else {
        console.log('  ❌ FAIL - No redirect occurred');
        console.log('  Checking console for errors...');

        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        if (errors.length > 0) {
            console.log('  Console errors:', errors);
        }
    }
} else {
    console.log('❌ Payment button not found - cannot test redirect');
}

await page.waitForTimeout(3000);
await browser.close();

console.log('\n✅ Test complete');

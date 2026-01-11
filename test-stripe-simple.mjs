#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

console.log('🧪 Testing Stripe payment button (manual form fill simulation)...\n');

await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('Step 1: Filling Step 1...');

// Step 1 - Basic info
await page.locator('input[value="male"]').click();
await page.locator('input[name="age"]').fill('35');
await page.locator('input[name="heightFeet"]').fill('5');
await page.locator('input[name="heightInches"]').fill('10');
await page.locator('input[name="weight"]').fill('200');
await page.waitForTimeout(300);

console.log('✅ Step 1 complete\n');

// Submit Step 1
await page.locator('button:has-text("Continue to Next Step")').click();
await page.waitForTimeout(2000);

console.log('Step 2: Filling Step 2...');

// Step 2 - Goals & Activity
// Activity level dropdown
await page.locator('select').first().selectOption({ index: 2 }); // Select moderate
await page.waitForTimeout(300);

// Exercise frequency dropdown
const selects = await page.locator('select').all();
if (selects.length > 1) {
    await selects[1].selectOption({ index: 2 }); // Select a frequency
    await page.waitForTimeout(300);
}

// Goal radio button
await page.locator('input[value="fatLoss"]').click();
await page.waitForTimeout(300);

// Diet type dropdown (if exists)
const allSelects = await page.locator('select').all();
if (allSelects.length > 2) {
    await allSelects[2].selectOption({ index: 1 }); // Select a diet type
    await page.waitForTimeout(300);
}

console.log('✅ Step 2 complete\n');

// Submit Step 2
await page.locator('button:has-text("See Your Results")').last().click();
await page.waitForTimeout(2500);

console.log('Step 3: Results page loaded\n');

// Screenshot of results
await page.screenshot({ path: '/tmp/calculator-step3-mobile.png', fullPage: true });
console.log('📸 Results screenshot: /tmp/calculator-step3-mobile.png\n');

// Find payment button
const paymentButtons = await page.locator('button').all();
let upgradeButton = null;

for (const btn of paymentButtons) {
    const text = await btn.textContent();
    if (text.includes('Upgrade')) {
        upgradeButton = btn;
        break;
    }
}

if (upgradeButton) {
    console.log('✅ Payment button found\n');
    console.log('🔄 Clicking payment button (will redirect to Stripe)...\n');

    // Click and wait for redirect
    await upgradeButton.click();
    await page.waitForTimeout(3000);

    const finalUrl = page.url();
    console.log('Current URL:', finalUrl);

    if (finalUrl.includes('checkout.stripe.com')) {
        console.log('\n✅ SUCCESS - Redirected to Stripe checkout!\n');
        await page.screenshot({ path: '/tmp/stripe-checkout-mobile.png', fullPage: true });
        console.log('📸 Stripe screenshot: /tmp/stripe-checkout-mobile.png');
    } else {
        console.log('\n⚠️ URL did not redirect to Stripe');
        console.log('Final URL:', finalUrl);
    }
} else {
    console.log('❌ Payment button not found');
}

await page.waitForTimeout(2000);
await browser.close();

console.log('\n✅ Test complete');

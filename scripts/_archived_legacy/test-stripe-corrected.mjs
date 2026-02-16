#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

console.log('🧪 Testing Stripe payment button flow...\n');

await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('Step 1: Filling out Step 1 form...');

// Fill Step 1 - Biological Sex (click Male radio)
await page.locator('input[value="male"]').click();
await page.waitForTimeout(300);

// Age
await page.locator('input[name="age"]').fill('35');
await page.waitForTimeout(300);

// Height - using feet/inches (default mode)
await page.locator('input[name="heightFeet"]').fill('5');
await page.waitForTimeout(300);

await page.locator('input[name="heightInches"]').fill('10');
await page.waitForTimeout(300);

// Weight
await page.locator('input[name="weight"]').fill('200');
await page.waitForTimeout(300);

console.log('✅ Step 1 filled');

// Click Continue to Next Step
await page.locator('button:has-text("Continue to Next Step")').click();
await page.waitForTimeout(1500);

console.log('Step 2: Waiting for Step 2 to load...');

// Wait for Step 2 to be visible (look for goal selection)
await page.waitForTimeout(1500);

// Take screenshot of Step 2
await page.screenshot({ path: '/tmp/calculator-step2.png', fullPage: true });
console.log('📸 Step 2 screenshot: /tmp/calculator-step2.png');

// Try to find and click options for Step 2
try {
    // Goal - look for clickable elements
    const goalOptions = await page.locator('text=/Fat Loss|Muscle Gain|Maintenance/').count();
    console.log(`  Found ${goalOptions} goal options`);

    if (goalOptions > 0) {
        await page.locator('text=Fat Loss').first().click();
        await page.waitForTimeout(500);
        console.log('  ✅ Selected: Fat Loss');
    }

    // Activity Level
    const activityOptions = await page.locator('text=/Moderate|Sedentary|Active/').count();
    console.log(`  Found ${activityOptions} activity options`);

    if (activityOptions > 0) {
        await page.locator('text=Moderate').first().click();
        await page.waitForTimeout(500);
        console.log('  ✅ Selected: Moderate activity');
    }

    // Dietary Preferences
    const dietOptions = await page.locator('text=/Beef-Only|Standard Carnivore/').count();
    console.log(`  Found ${dietOptions} diet options`);

    if (dietOptions > 0) {
        await page.locator('text=Beef-Only').first().click();
        await page.waitForTimeout(500);
        console.log('  ✅ Selected: Beef-Only');
    }

    console.log('✅ Step 2 filled');

    // Click See Your Results button
    const resultsButton = page.locator('button:has-text("See Your Results")').last();
    await resultsButton.click();
    await page.waitForTimeout(2000);

    console.log('Step 3: Results page loaded');

    // Take screenshot of results page
    await page.screenshot({ path: '/tmp/calculator-step3-results.png', fullPage: true });
    console.log('📸 Results screenshot: /tmp/calculator-step3-results.png');

    // Look for the Stripe payment button
    const paymentButton = page.locator('button:has-text("Upgrade")').first();
    const paymentButtonExists = await paymentButton.count() > 0;

    console.log('\nPayment button check:');
    console.log('  Button found:', paymentButtonExists ? '✅ YES' : '❌ NO');

    if (paymentButtonExists) {
        console.log('\n🔄 Clicking payment button (should redirect to Stripe)...');

        await paymentButton.click();
        await page.waitForTimeout(3000);

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
        }
    } else {
        console.log('❌ Payment button not found - cannot test redirect');
    }

} catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: '/tmp/calculator-error.png', fullPage: true });
    console.log('📸 Error screenshot: /tmp/calculator-error.png');
}

await page.waitForTimeout(2000);
await browser.close();

console.log('\n✅ Test complete');

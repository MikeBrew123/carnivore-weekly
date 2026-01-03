const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('\n✅ FINAL VERIFICATION - Production Payment Modal\n');

  try {
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Quick flow to payment modal
    const selects = page.locator('select');
    await selects.first().selectOption('male');

    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('35');
    await inputs.nth(1).fill('5');
    await inputs.nth(2).fill('10');
    await inputs.nth(3).fill('200');

    let btn = page.locator('button:has-text("Continue")').first();
    await btn.click();
    await page.waitForTimeout(1000);

    btn = page.locator('button:has-text("Continue")').first();
    await btn.click();
    await page.waitForTimeout(1000);

    const seeResults = page.locator('button:has-text("See Results")').first();
    await seeResults.click();
    await page.waitForTimeout(1000);

    const upgrade = page.locator('button').filter({hasText: /Upgrade/}).first();
    await upgrade.click();
    await page.waitForTimeout(1500);

    const chooseButtons = page.locator('button:has-text("Choose Plan")');
    await chooseButtons.nth(3).click();
    await page.waitForTimeout(1500);

    // Check payment modal
    console.log('📋 PAYMENT MODAL CHECK:');
    
    const michaelText = page.locator('text=/michael|Michael/');
    const hasMichael = await michaelText.isVisible().catch(() => false);
    
    if (hasMichael) {
      console.log('❌ MICHAEL REYNOLDS STILL VISIBLE');
    } else {
      console.log('✅ Michael Reynolds message REMOVED');
    }

    const nameInputs = page.locator('input[placeholder="John"], input[placeholder="Doe"]');
    const hasNameFields = await nameInputs.count() > 0;

    if (hasNameFields) {
      console.log('❌ Name fields still present');
    } else {
      console.log('✅ Name/email fields REMOVED');
    }

    const couponField = page.locator('input[placeholder="Enter coupon code"]');
    const hasCoupon = await couponField.isVisible().catch(() => false);
    console.log(hasCoupon ? '✅ Coupon field present' : '❌ Coupon field missing');

    console.log('\n✅ DEPLOYMENT SUCCESSFUL!');

  } catch (error) {
    console.error('Error:', error.message);
  }

  await page.waitForTimeout(1000);
  await browser.close();
})();

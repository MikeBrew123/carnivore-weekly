import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Fill form
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('30');
  await page.locator('input[name="weight"]').fill('200');
  await page.locator('input[name="heightFeet"]').fill('6');
  await page.locator('input[name="heightInches"]').fill('0');
  await page.locator('button:has-text("Continue to Next Step")').first().click();
  await page.waitForTimeout(800);

  await page.locator('select[name="lifestyle"]').selectOption('moderate');
  await page.locator('select[name="exercise"]').selectOption('3-4');
  await page.locator('input[type="radio"][value="maintain"]').click();
  await page.locator('select[name="diet"]').selectOption('carnivore');
  await page.locator('button:has-text("See Your Results")').last().click();
  await page.waitForTimeout(1500);

  // Upgrade
  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  // Select plan
  await page.locator('button:has-text("Choose Plan")').first().click();
  await page.waitForTimeout(1000);

  // Apply coupon
  console.log('Applying test321 coupon...');
  await page.locator('input[placeholder="Enter coupon code"]').fill('test321');
  await page.locator('button:has-text("Apply")').click();
  await page.waitForTimeout(2000);

  // Get final price
  const payBtn = page.locator('button[type="submit"]');
  const payText = await payBtn.last().textContent();
  console.log('Pay button shows:', payText);

  // Click pay
  console.log('\nClicking Pay...');
  await payBtn.last().click();
  await page.waitForTimeout(3000);

  // Check final URL and page content
  const url = page.url();
  console.log('Final URL:', url);
  
  const successVisible = await page.locator('text=Payment Successful').isVisible().catch(() => false);
  console.log('Success page visible:', successVisible);

  if (successVisible) {
    console.log('\n✅ SUCCESS! User redirected to success page correctly');
  } else {
    console.log('\n❌ Still on wrong page');
  }

  await browser.close();
})();

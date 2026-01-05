import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Fill and submit form to get to modal
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

  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  await page.locator('button:has-text("Choose Plan")').first().click();
  await page.waitForTimeout(1000);

  // Apply coupon
  await page.locator('input[placeholder="Enter coupon code"]').fill('test321');
  await page.locator('button:has-text("Apply")').click();
  await page.waitForTimeout(2000);

  // Click pay
  const payBtn = page.locator('button[type="submit"]');
  const payText = await payBtn.last().textContent();
  console.log('Pay button:', payText);

  await payBtn.last().click();
  
  // Wait for navigation and logs
  await page.waitForTimeout(3000);

  console.log('\n📋 Console logs from page:');
  consoleLogs.forEach(log => {
    if (log.includes('CalculatorApp') || log.includes('StripePaymentModal') || log.includes('Setting location')) {
      console.log(log);
    }
  });

  const finalUrl = page.url();
  console.log('\nFinal URL:', finalUrl);
  console.log('Has payment param:', finalUrl.includes('payment='));

  await browser.close();
})();

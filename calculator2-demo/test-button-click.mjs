import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'log') console.log(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Loading calculator...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  console.log('Filling form...');
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

  console.log('\n🖱️ Clicking Upgrade button...');
  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  console.log('\n📋 LOOKING FOR CHOOSE PLAN BUTTONS...');
  const chooseBtns = page.locator('button:has-text("Choose Plan")');
  const count = await chooseBtns.count();
  console.log(`Found ${count} "Choose Plan" buttons`);

  if (count > 0) {
    console.log('\n🖱️ Clicking first "Choose Plan" button...');
    consoleLogs.length = 0; // Clear logs
    await chooseBtns.first().click();
    await page.waitForTimeout(1500);

    console.log('\n📋 Console logs after button click:');
    const relevantLogs = consoleLogs.filter(log =>
      log.text.includes('PricingCard') ||
      log.text.includes('PricingModal') ||
      log.text.includes('StripePayment')
    );

    if (relevantLogs.length > 0) {
      relevantLogs.forEach(log => console.log(`  ${log.text}`));
    } else {
      console.log('  (No relevant logs found - button click may not be firing)');
    }

    // Check if StripePaymentModal is visible
    const stripeModal = page.locator('text=Complete Payment');
    const isVisible = await stripeModal.isVisible().catch(() => false);
    console.log(`\n💳 StripePaymentModal visible: ${isVisible}`);

    if (!isVisible) {
      // Check if it's in the DOM but hidden
      const inDOM = await stripeModal.count().catch(() => 0);
      console.log(`   (In DOM but hidden: ${inDOM > 0})`);
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/button-click-test.png' });
    console.log('\n📸 Screenshot saved: /tmp/button-click-test.png');
  }

  await browser.close();
})();

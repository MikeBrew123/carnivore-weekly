import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  console.log('\n📍 Loading calculator...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  console.log('📝 Filling Step 1...');
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('30');
  await page.locator('input[name="weight"]').fill('200');
  await page.locator('input[name="heightFeet"]').fill('6');
  await page.locator('input[name="heightInches"]').fill('0');

  console.log('🔄 Advancing to Step 2...');
  await page.locator('button:has-text("Continue to Next Step")').first().click();
  await page.waitForTimeout(800);

  console.log('📝 Filling Step 2...');
  await page.locator('select[name="lifestyle"]').selectOption('moderate');
  await page.locator('select[name="exercise"]').selectOption('3-4');
  await page.locator('input[type="radio"][value="maintain"]').click();
  await page.locator('select[name="diet"]').selectOption('carnivore');

  console.log('🔄 Advancing to Step 3...');
  await page.locator('button:has-text("See Your Results")').last().click();
  await page.waitForTimeout(1500);

  console.log('\n🔘 Looking for Upgrade button...');
  const upgradeBtn = page.locator('button:has-text("Upgrade")');
  const btnCount = await upgradeBtn.count();
  console.log(`Found ${btnCount} button(s) with "Upgrade" text`);

  if (btnCount > 0) {
    console.log('\n🖱️ Clicking Upgrade button...');
    await upgradeBtn.first().click();
    await page.waitForTimeout(1000);

    console.log('\n📋 Console logs:');
    const upgradeRelatedLogs = consoleLogs.filter(log =>
      log.text.includes('Upgrade') || log.text.includes('Modal') || log.text.includes('showPricingModal')
    );

    if (upgradeRelatedLogs.length > 0) {
      upgradeRelatedLogs.forEach(log => {
        console.log(`  ✓ ${log.text}`);
      });
    } else {
      console.log('  (No upgrade-related logs captured)');
    }

    // Check if PricingModal appeared
    const pricingModal = page.locator('div').filter({ hasText: 'Upgrade' });
    const modalVisible = await pricingModal.isVisible().catch(() => false);
    console.log(`\nPricing modal visible: ${modalVisible}`);

    // Take screenshot
    await page.screenshot({ path: '/tmp/upgrade-button-test.png' });
    console.log('Screenshot saved');
  } else {
    console.log('❌ Upgrade button not found!');
  }

  await browser.close();
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('📍 Loading calculator...');
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

  console.log('🖱️ Clicking Upgrade button...');
  const upgradeBtn = page.locator('button:has-text("Upgrade")');
  const btnCount = await upgradeBtn.count();
  console.log(`Found ${btnCount} Upgrade button(s)`);

  if (btnCount > 0) {
    await upgradeBtn.first().click();
    await page.waitForTimeout(1000);

    // Verify modal is visible
    const modal = page.locator('text=Choose Your Plan');
    const isVisible = await modal.isVisible();
    console.log(`✅ Pricing modal visible: ${isVisible}`);

    // Check header styling
    const header = page.locator('text=Choose Your Plan');
    const headerColor = await header.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log(`Header text color: ${headerColor} (should be gold/yellow)`);

    // Check if sale banner is dark
    const saleBanner = page.locator('text=NEW YEARS SALE');
    const bannerBgColor = await saleBanner.evaluate((el) => {
      return window.getComputedStyle(el.parentElement).backgroundColor;
    });
    console.log(`Sale banner background: ${bannerBgColor} (should be dark brown)`);

    // Check product card styling
    const cards = page.locator('div').filter({ hasText: 'Shopping Lists' });
    const cardCount = await cards.count();
    console.log(`✅ Found ${cardCount} product card(s)`);

    if (cardCount > 0) {
      const cardBgColor = await cards.first().evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log(`Product card background: ${cardBgColor} (should be very dark #1a1a1a)`);
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/pricing-modal-styled.png' });
    console.log('📸 Screenshot saved: /tmp/pricing-modal-styled.png');

    // Check button styling
    const chooseBtn = page.locator('button:has-text("Choose Plan")').first();
    const btnBgColor = await chooseBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const btnTextColor = await chooseBtn.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log(`Choose Plan button - BG: ${btnBgColor}, Text: ${btnTextColor}`);

    console.log('\n✅ Styling validation complete!');
  } else {
    console.log('❌ Upgrade button not found');
  }

  await browser.close();
})();

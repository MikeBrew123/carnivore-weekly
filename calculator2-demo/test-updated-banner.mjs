import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
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

  // Click upgrade
  await page.locator('button:has-text("Upgrade")').first().click();
  await page.waitForTimeout(1000);

  // Check banner text
  const bannerText = await page.locator('text=Limited Launch Pricing').textContent();
  console.log(`✅ Banner text: "${bannerText}"`);

  // Check for emojis (should be none)
  const hasEmojis = await page.locator('text=🎉').count();
  console.log(`✅ Emojis found: ${hasEmojis} (should be 0)`);

  // Screenshot
  await page.screenshot({ path: '/tmp/pricing-final.png' });
  console.log('📸 Final screenshot saved');

  await browser.close();
})();

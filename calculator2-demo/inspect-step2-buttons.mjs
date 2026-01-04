import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Fill and advance to Step 2
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('30');
  await page.locator('input[name="weight"]').fill('200');
  await page.locator('input[name="heightFeet"]').fill('6');
  await page.locator('input[name="heightInches"]').fill('0');
  await page.locator('button:has-text("Continue to Next Step")').first().click();
  await page.waitForTimeout(800);

  // Get all buttons on Step 2
  const buttons = await page.locator('button').all();
  console.log(`Found ${buttons.length} buttons on Step 2:\n`);

  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const isDisabled = await buttons[i].isDisabled();
    const isVisible = await buttons[i].isVisible();
    console.log(`Button ${i}: "${text}" (disabled: ${isDisabled}, visible: ${isVisible})`);
  }

  await browser.close();
})();

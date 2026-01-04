import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Fill Step 1
  console.log('Filling Step 1...');
  await page.locator('input[type="radio"][value="male"]').click();
  await page.locator('input[name="age"]').fill('30');
  await page.locator('input[name="weight"]').fill('200');
  await page.locator('input[name="heightFeet"]').fill('6');
  await page.locator('input[name="heightInches"]').fill('0');

  // Advance to Step 2
  console.log('\nAdvancing to Step 2...');
  await page.locator('button:has-text("Continue to Next Step")').first().click();
  await page.waitForTimeout(800);

  // Fill Step 2
  console.log('\nFilling Step 2...');
  await page.locator('select[name="lifestyle"]').selectOption('moderate');
  console.log('  - Activity level set to moderate');

  await page.locator('select[name="exercise"]').selectOption('3-4');
  console.log('  - Exercise frequency set to 3-4');

  await page.locator('input[type="radio"][value="maintain"]').click();
  console.log('  - Goal set to maintain');

  await page.locator('select[name="diet"]').selectOption('carnivore');
  console.log('  - Diet set to carnivore');

  await page.waitForTimeout(500);

  // Check form state
  console.log('\nChecking form state before button click:');
  const formState = await page.evaluate(() => {
    const lifestyle = document.querySelector('select[name="lifestyle"]')?.value;
    const exercise = document.querySelector('select[name="exercise"]')?.value;
    const goal = document.querySelector('input[name="goal"]:checked')?.value;
    const deficit = document.querySelector('select[name="deficit"]')?.value;
    const diet = document.querySelector('select[name="diet"]')?.value;
    return { lifestyle, exercise, goal, deficit, diet };
  });

  console.log('Form state:', formState);

  // Check button and try to click
  console.log('\nAttempting button click...');
  const button = page.locator('button:has-text("See Your Results")').last();
  const buttonText = await button.textContent();
  console.log('Button text:', buttonText);

  // Use direct click with force
  await button.click({ force: true });
  await page.waitForTimeout(1500);

  // Check result
  const heading = await page.locator('h2').first().textContent();
  console.log('\nAfter button click:');
  console.log('Current heading:', heading);

  const isResults = heading?.includes('Your Personalized');
  if (isResults) {
    console.log('\n✅ Successfully navigated to Step 3 (Results)');
  } else {
    console.log('\n❌ Did not navigate to results page');
    console.log('Checking for error messages...');

    const errorDivs = await page.locator('[class*="error"], [class*="Error"]').all();
    if (errorDivs.length > 0) {
      for (const div of errorDivs) {
        const text = await div.textContent();
        console.log('Error found:', text);
      }
    }
  }

  await browser.close();
})();

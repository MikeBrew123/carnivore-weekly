import { chromium } from 'playwright';

const screenshotDir = '/tmp/calculator-test-screenshots';

async function testPricingCards() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Opening calculator on localhost...');
    await page.goto('http://localhost:5175/assets/calculator2/');
    await page.waitForTimeout(2000);

    console.log('Filling Step 1...');
    await page.locator('input[type="radio"][value="male"]').click();
    await page.locator('input[name="age"]').fill('35');
    await page.locator('input[name="heightFeet"]').fill('5');
    await page.locator('input[name="heightInches"]').fill('10');
    await page.locator('input[name="weight"]').fill('200');
    await page.waitForTimeout(500);

    console.log('Continue to Step 2...');
    await page.locator('button:has-text("Continue")').last().click();
    await page.waitForTimeout(2000);

    console.log('Filling Step 2...');
    await page.locator('select[name="lifestyle"]').selectOption('moderate');
    await page.locator('select[name="exercise"]').selectOption('3-4');
    await page.locator('input[type="radio"][value="lose"]').click();
    await page.locator('select[name="deficit"]').selectOption('15');
    await page.locator('select[name="diet"]').selectOption('carnivore');
    await page.waitForTimeout(500);

    console.log('See Results...');
    await page.locator('button:has-text("See Your Results")').last().click();
    await page.waitForTimeout(2000);

    console.log('Click Upgrade button...');
    const upgradeButton = page.locator('button:has-text("Upgrade for Full Personalized Protocol")').last();
    await upgradeButton.click();
    await page.waitForTimeout(2000);

    console.log('Taking screenshot of pricing modal...');
    await page.screenshot({ path: `${screenshotDir}/pricing-cards-local-test.png`, fullPage: true });

    console.log('Measuring card heights...');
    const cardHeights = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.pricing-card-container'));
      return cards.map((card, i) => ({
        index: i,
        height: card.offsetHeight,
        computedHeight: window.getComputedStyle(card).height
      }));
    });

    console.log('Card heights:', JSON.stringify(cardHeights, null, 2));

    console.log('\n✅ Test completed!');
    console.log(`Screenshot saved to: ${screenshotDir}/pricing-cards-local-test.png`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: `${screenshotDir}/ERROR-pricing-test.png`, fullPage: true });
  } finally {
    await browser.close();
  }
}

testPricingCards().catch(console.error);

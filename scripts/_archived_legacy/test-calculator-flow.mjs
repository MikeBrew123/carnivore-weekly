import { chromium } from 'playwright';

const screenshotDir = '/tmp/calculator-test-screenshots';

async function testCalculatorFlow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('1. Opening calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/01-landing.png`, fullPage: true });

    // Click "Start Calculator" or similar button to load the React app
    console.log('2. Looking for calculator start button...');
    const startButton = page.locator('button:has-text("Get Started"), button:has-text("Start"), a[href*="calculator2"]').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }

    // Wait for React app to load
    await page.waitForSelector('text=Sex', { timeout: 10000 });
    await page.screenshot({ path: `${screenshotDir}/02-step1-loaded.png`, fullPage: true });

    console.log('3. Filling Step 1 (Physical Stats)...');

    // Sex - click Male radio button
    const maleRadio = page.locator('input[type="radio"][value="male"]');
    await maleRadio.scrollIntoViewIfNeeded();
    await maleRadio.click();
    await page.waitForTimeout(500);

    // Age
    const ageInput = page.locator('input[name="age"]');
    await ageInput.scrollIntoViewIfNeeded();
    await ageInput.fill('35');
    await page.waitForTimeout(500);

    // Make sure "Feet & Inches" is selected (default)
    const feetInchesButton = page.locator('button:has-text("Feet & Inches")');
    if (await feetInchesButton.isVisible()) {
      await feetInchesButton.scrollIntoViewIfNeeded();
      await feetInchesButton.click();
      await page.waitForTimeout(500);
    }

    // Height - feet (number input)
    const heightFeetInput = page.locator('input[name="heightFeet"]');
    await heightFeetInput.scrollIntoViewIfNeeded();
    await heightFeetInput.fill('5');
    await page.waitForTimeout(500);

    // Height - inches (number input)
    const heightInchesInput = page.locator('input[name="heightInches"]');
    await heightInchesInput.scrollIntoViewIfNeeded();
    await heightInchesInput.fill('10');
    await page.waitForTimeout(500);

    // Weight
    const weightInput = page.locator('input[name="weight"]');
    await weightInput.scrollIntoViewIfNeeded();
    await weightInput.fill('200');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${screenshotDir}/03-step1-filled.png`, fullPage: true });

    console.log('4. Clicking Continue to Step 2...');
    const continueBtn1 = page.locator('button:has-text("Continue"), button:has-text("Next")').last();
    await continueBtn1.scrollIntoViewIfNeeded();
    await continueBtn1.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/04-step2-loaded.png`, fullPage: true });

    console.log('5. Filling Step 2 (Fitness & Diet)...');

    // Lifestyle Activity - Moderately active (3-5 days/week)
    const lifestyleSelect = page.locator('select[name="lifestyle"]');
    await lifestyleSelect.scrollIntoViewIfNeeded();
    await lifestyleSelect.selectOption('moderate');
    await page.waitForTimeout(500);

    // Exercise Frequency - 3-4 days/week
    const exerciseSelect = page.locator('select[name="exercise"]');
    await exerciseSelect.scrollIntoViewIfNeeded();
    await exerciseSelect.selectOption('3-4');
    await page.waitForTimeout(500);

    // Goal - Fat Loss (radio button)
    const loseRadio = page.locator('input[type="radio"][value="lose"]');
    await loseRadio.scrollIntoViewIfNeeded();
    await loseRadio.click();
    await page.waitForTimeout(500);

    // Deficit - 15% (Moderate) - appears after selecting "lose" goal
    const deficitSelect = page.locator('select[name="deficit"]');
    await deficitSelect.scrollIntoViewIfNeeded();
    await deficitSelect.selectOption('15');
    await page.waitForTimeout(500);

    // Diet Type - Carnivore
    const dietSelect = page.locator('select[name="diet"]');
    await dietSelect.scrollIntoViewIfNeeded();
    await dietSelect.selectOption('carnivore');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${screenshotDir}/05-step2-filled.png`, fullPage: true });

    console.log('6. Clicking See Your Results...');
    const seeResultsBtn = page.locator('button:has-text("See Your Results"), button:has-text("Continue")').last();
    await seeResultsBtn.scrollIntoViewIfNeeded();
    await seeResultsBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/06-step3-results.png`, fullPage: true });

    console.log('7. Clicking Upgrade for Full Personalized Protocol...');
    const upgradeButton = page.locator('button:has-text("Upgrade for Full Personalized Protocol"), button:has-text("Upgrade")').last();
    await upgradeButton.scrollIntoViewIfNeeded();
    await upgradeButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/07-pricing-modal.png`, fullPage: true });

    console.log('8. Selecting pricing tier (Complete Protocol Bundle)...');
    const bundleCard = page.locator('text=Complete Protocol Bundle').locator('..').locator('..').locator('button').first();
    await bundleCard.scrollIntoViewIfNeeded();
    await bundleCard.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/08-payment-modal.png`, fullPage: true });

    console.log('9. Entering test coupon: TEST999...');
    const couponInput = page.locator('input[placeholder*="coupon" i], input[placeholder*="promo" i]');
    if (await couponInput.isVisible()) {
      await couponInput.scrollIntoViewIfNeeded();
      await couponInput.fill('TEST999');
      await page.waitForTimeout(500);

      const applyButton = page.locator('button:has-text("Apply")');
      if (await applyButton.isVisible()) {
        await applyButton.scrollIntoViewIfNeeded();
        await applyButton.click();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: `${screenshotDir}/09-coupon-applied.png`, fullPage: true });
    }

    console.log('10. Looking for Stripe checkout or payment confirmation...');
    // Check if there's a "Complete Payment" or similar button
    const completePaymentBtn = page.locator('button:has-text("Complete Payment"), button:has-text("Pay"), button:has-text("Continue to Step 4")').first();
    if (await completePaymentBtn.isVisible({ timeout: 5000 })) {
      await completePaymentBtn.scrollIntoViewIfNeeded();
      await completePaymentBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${screenshotDir}/10-payment-processing.png`, fullPage: true });
    }

    console.log('11. Waiting for Step 4 (Health Profile)...');
    await page.waitForSelector('text=Complete Your Health Profile, text=Health Profile', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/11-step4-loaded.png`, fullPage: true });

    console.log('12. Filling Step 4 (Health Profile)...');

    // Email
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill('test@example.com');
    await page.waitForTimeout(500);

    // First Name
    const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="first name" i]');
    await firstNameInput.scrollIntoViewIfNeeded();
    await firstNameInput.fill('TestUser');
    await page.waitForTimeout(500);

    // Last Name
    const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="last name" i]');
    await lastNameInput.scrollIntoViewIfNeeded();
    await lastNameInput.fill('Testing');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${screenshotDir}/12-step4-filled.png`, fullPage: true });

    console.log('13. Clicking Generate My Protocol...');
    const generateBtn = page.locator('button:has-text("Generate My Protocol"), button:has-text("Generate")').last();
    await generateBtn.scrollIntoViewIfNeeded();
    await generateBtn.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${screenshotDir}/13-generating-report.png`, fullPage: true });

    console.log('14. Waiting for report generation (up to 30 seconds)...');
    await page.waitForSelector('text=Your Protocol is Ready, text=View Your Report', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${screenshotDir}/14-report-ready.png`, fullPage: true });

    console.log('15. Testing View Report button...');
    const viewReportBtn = page.locator('button:has-text("View Your Report"), button:has-text("View Report")').first();

    // Store current page count
    const pagesBefore = context.pages().length;

    await viewReportBtn.scrollIntoViewIfNeeded();
    await viewReportBtn.click();
    await page.waitForTimeout(3000);

    // Check if new window opened
    const pagesAfter = context.pages().length;
    if (pagesAfter > pagesBefore) {
      const reportPage = context.pages()[pagesAfter - 1];
      await reportPage.waitForTimeout(2000);
      await reportPage.screenshot({ path: `${screenshotDir}/15-report-opened.png`, fullPage: true });

      // Check for Save as PDF button
      const pdfButton = reportPage.locator('button:has-text("Save as PDF")');
      if (await pdfButton.isVisible()) {
        console.log('✓ Save as PDF button is visible');
      } else {
        console.log('✗ Save as PDF button NOT visible');
      }

      await reportPage.close();
    } else {
      console.log('✗ Report did not open in new window');
    }

    await page.screenshot({ path: `${screenshotDir}/16-after-view-report.png`, fullPage: true });

    console.log('17. Testing Email Report button...');
    const emailReportBtn = page.locator('button:has-text("Email My Report"), button:has-text("Email Report")').first();
    if (await emailReportBtn.isVisible()) {
      await emailReportBtn.scrollIntoViewIfNeeded();
      await emailReportBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${screenshotDir}/17-email-clicked.png`, fullPage: true });

      // Check if button shows success state
      const emailSent = await page.locator('button:has-text("Email Sent"), button:has-text("✓")').isVisible();
      if (emailSent) {
        console.log('✓ Email button shows success state');
      } else {
        console.log('? Email button state unclear');
      }
    } else {
      console.log('✗ Email Report button not found');
    }

    console.log('18. Testing Start Over button...');
    const startOverBtn = page.locator('button:has-text("Start Over")').first();
    if (await startOverBtn.isVisible()) {
      console.log('✓ Start Over button found');
      await startOverBtn.scrollIntoViewIfNeeded();
      await startOverBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${screenshotDir}/18-start-over-clicked.png`, fullPage: true });

      // Check if redirected to calculator landing
      const currentUrl = page.url();
      console.log('Current URL after Start Over:', currentUrl);
    } else {
      console.log('✗ Start Over button not found');
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`Screenshots saved to: ${screenshotDir}`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: `${screenshotDir}/ERROR-${Date.now()}.png`, fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testCalculatorFlow().catch(console.error);

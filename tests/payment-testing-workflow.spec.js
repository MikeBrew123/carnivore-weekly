/**
 * Payment Testing Workflow for Calculator Form
 *
 * Tests the complete payment flow:
 * 1. Fill calculator form with test data
 * 2. Submit form
 * 3. Select payment tier
 * 4. Go through Stripe checkout with TEST321 promo code
 * 5. Verify payment success and report generation begins
 *
 * Prerequisites:
 * - HTTP server running on http://localhost:8000
 * - Wrangler dev server running on http://localhost:8787
 * - Stripe test promo code TEST321 configured
 */

const { test, expect } = require('@playwright/test');

test.describe('Calculator Payment Flow with TEST321 Promo Code', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    // Note: This uses test.beforeAll which may not be available in all Playwright versions
    // Consider using test.beforeEach instead if needed
  });

  test('should complete full payment workflow with TEST321 promo code', async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Step 1: Navigate to calculator form
    console.log('Step 1: Navigating to calculator form...');
    await page.goto('http://localhost:8000/public/calculator-form-rebuild.html', {
      waitUntil: 'networkidle',
    });

    // Step 2: Fill form with test data
    console.log('Step 2: Filling form with test data...');

    // Step 1 Fields: Health & Symptoms
    await page.fill('#medications', 'Test medication 1');

    // Check some condition checkboxes
    const conditionCheckboxes = await page.$$('[name="conditions"]');
    if (conditionCheckboxes.length > 0) {
      await conditionCheckboxes[0].check();
    }

    await page.fill('#other-conditions', 'Other condition text');

    // Check some symptom checkboxes
    const symptomCheckboxes = await page.$$('[name="symptoms"]');
    if (symptomCheckboxes.length > 0) {
      await symptomCheckboxes[0].check();
    }

    await page.fill('#other-symptoms', 'Other symptom text');

    // Step 2 Fields: Diet & Lifestyle
    console.log('  - Filling Step 2 (Diet & Lifestyle)...');
    await page.fill('#previous-diets', 'Keto, Low-Carb');

    // Fill lifestyle dropdowns
    const lifestyleSelect = await page.$('#lifestyle');
    if (lifestyleSelect) {
      await page.selectOption('#lifestyle', { label: 'Moderate' });
    }

    await page.fill('#what-worked', 'High fat, moderate protein worked best');

    // Step 3 Fields: Goals & Priorities
    console.log('  - Filling Step 3 (Goals & Priorities)...');

    // Check some goal checkboxes
    const goalCheckboxes = await page.$$('[name="goals"]');
    if (goalCheckboxes.length > 0) {
      await goalCheckboxes[0].check();
    }

    await page.fill('#biggest-challenge', 'Staying consistent with meal prep');
    await page.fill('#additional-notes', 'Very interested in optimizing the carnivore approach.');

    // Step 4 Fields: Contact & Allergies (REQUIRED email)
    console.log('  - Filling Step 4 (Contact & Allergies)...');
    await page.fill('#email', 'test@example.com');
    await page.fill('#first-name', 'Test');
    await page.fill('#last-name', 'User');
    await page.fill('#allergies', 'None known');
    await page.fill('#avoid-foods', 'Processed foods, seed oils');

    // Step 3: Submit form
    console.log('Step 3: Submitting form...');
    const submitButton = await page.$('#submit-button');

    // Verify submit button is enabled
    const isDisabled = await submitButton.evaluate(btn => btn.disabled);
    expect(!isDisabled).toBeTruthy();

    // Watch for new pages (Stripe redirect)
    const [stripePopup] = await Promise.all([
      context.waitForEvent('page'), // Wait for Stripe page
      submitButton.click(),
    ]);

    // Step 4: Handle payment tier selection
    console.log('Step 4: Waiting for payment tier selection...');

    // Wait for modal to appear
    const tierButton = await page.waitForSelector('.tier-option-button', { timeout: 10000 });
    expect(tierButton).toBeTruthy();

    // Select first tier (e.g., "Bundle $9.99")
    const tierOptions = await page.$$('.tier-option-button');
    console.log(`  - Found ${tierOptions.length} tier options`);

    if (tierOptions.length > 0) {
      await tierOptions[0].click();
    }

    // Step 5: Stripe Checkout with Promo Code
    console.log('Step 5: Entering Stripe checkout and applying TEST321 promo...');

    // Wait for Stripe session to complete
    await stripePopup.waitForLoadState('networkidle');

    const stripeUrl = stripePopup.url();
    console.log(`  - Stripe redirect URL: ${stripeUrl}`);
    expect(stripeUrl).toContain('stripe.com');

    // Try to find and fill promo code field
    const promoCodeInput = await stripePopup.$('input[placeholder*="Promo"]') ||
                           await stripePopup.$('input[aria-label*="Promo"]') ||
                           await stripePopup.$('[data-test="discount-input"]');

    if (promoCodeInput) {
      console.log('  - Found promo code input, entering TEST321...');
      await promoCodeInput.fill('TEST321');
      await promoCodeInput.press('Enter');

      // Wait for promo to apply
      await stripePopup.waitForTimeout(2000);
    } else {
      console.log('  - Warning: Promo code input not found in Stripe form');
    }

    // Step 6: Enter test card details
    console.log('Step 6: Entering test card details...');

    // Fill card number (iframe may be present)
    const cardFrames = await stripePopup.$$('iframe[src*="stripePaymentForm"]');

    if (cardFrames.length > 0) {
      const cardFrame = cardFrames[0];
      const cardInput = await cardFrame.$('[data-testid="CardNumberField"]') ||
                       await cardFrame.$('input[placeholder*="4242"]');

      if (cardInput) {
        await cardInput.fill('4242 4242 4242 4242');
      }
    } else {
      // Try direct input
      const cardInput = await stripePopup.$('[name="cardNumber"]') ||
                       await stripePopup.$('input[placeholder*="4242"]');
      if (cardInput) {
        await cardInput.fill('4242 4242 4242 4242');
      }
    }

    // Fill expiry and CVC (these may be in separate fields)
    const expiryInput = await stripePopup.$('[name="exp-date"]') ||
                        await stripePopup.$('[data-testid="CardExpiryField"]');
    if (expiryInput) {
      await expiryInput.fill('12/25');
    }

    const cvcInput = await stripePopup.$('[name="cvc"]') ||
                     await stripePopup.$('[data-testid="CardCvcField"]');
    if (cvcInput) {
      await cvcInput.fill('123');
    }

    // Step 7: Submit payment
    console.log('Step 7: Submitting payment...');
    const payButton = await stripePopup.$('button[type="submit"]') ||
                      await stripePopup.$('button:has-text("Pay")');

    if (payButton) {
      await payButton.click();

      // Wait for payment to process
      await stripePopup.waitForTimeout(5000);
    }

    // Step 8: Verify payment success
    console.log('Step 8: Verifying payment success...');

    // Should redirect back to calculator with payment=success
    await page.waitForNavigation({ url: /payment=success/, timeout: 15000 });

    const finalUrl = page.url();
    console.log(`  - Final URL: ${finalUrl}`);
    expect(finalUrl).toContain('payment=success');

    // Step 9: Verify progress bar and report generation
    console.log('Step 9: Monitoring report generation progress...');

    const progressBar = await page.$('.progress-bar');
    expect(progressBar).toBeTruthy();

    // Monitor progress bar updates
    for (let i = 0; i < 30; i++) {
      const progressText = await page.$('.progress-stage-name');
      if (progressText) {
        const stageName = await progressText.textContent();
        const progressValue = await page.$('.progress-percentage');
        const percentage = await progressValue?.textContent();

        console.log(`  - Stage: ${stageName} | Progress: ${percentage}`);
      }

      // Check if report is ready (100%)
      const progress = await page.$('.progress-percentage');
      const percentageText = await progress?.textContent();
      if (percentageText?.includes('100')) {
        console.log('  - Report generation complete!');
        break;
      }

      await page.waitForTimeout(2000);
    }

    // Step 10: Verify report page loaded
    console.log('Step 10: Verifying report page...');

    const reportUrl = page.url();
    expect(reportUrl).toContain('/calculator/report');
    expect(reportUrl).toContain('access_token=');

    // Verify report content is visible
    const reportContent = await page.$('.report-content');
    expect(reportContent).toBeTruthy();

    console.log('✅ Payment workflow complete!');
    console.log(`✅ Report access token: ${new URL(reportUrl).searchParams.get('access_token')}`);

    await context.close();
  });
});

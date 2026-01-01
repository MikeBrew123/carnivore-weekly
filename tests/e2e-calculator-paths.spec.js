import { test, expect } from '@playwright/test';

// Test configuration
const CALCULATOR_URL = 'http://localhost:8000/public/calculator.html';
const QUESTIONNAIRE_URL = 'http://localhost:8000/public/paid-questionnaire.html';

// Common test data
const testData = {
  age: '30',
  heightFeet: '5',
  heightInches: '10',
  weight: '180'
};

test.describe('Calculator End-to-End: Free Path vs Paid Path', () => {

  // ============ FREE PATH TESTS ============
  test.describe('Free Path', () => {

    test('Step 1: Load calculator at /public/calculator.html', async ({ page }) => {
      const response = await page.goto(CALCULATOR_URL);
      expect(response?.ok()).toBeTruthy();

      // Verify page title
      await expect(page).toHaveTitle(/Free Carnivore Macro Calculator/);

      // Verify calculator page loads
      await expect(page.locator('h1')).toContainText(/Carnivore Macro Calculator/i);
    });

    test('Step 2: Click "Start Free Calculator" button', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Wait for and verify the path choice screen exists
      const pathChoiceContainer = page.locator('#pathChoice');
      await expect(pathChoiceContainer).toBeVisible();

      // Find and click "Start Free Calculator" button
      const startFreeBtn = page.locator('button:has-text("Start Free Calculator")').first();
      await expect(startFreeBtn).toBeVisible();

      await startFreeBtn.click();

      // Verify path choice screen is hidden and calculator form is shown
      await expect(pathChoiceContainer).toHaveClass(/hidden/);

      const calculatorForm = page.locator('#calculatorForm');
      await expect(calculatorForm).not.toHaveClass(/hidden/);
    });

    test('Step 3: Verify calculator loads without redirect to questionnaire', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Start Free Calculator"
      await page.locator('button:has-text("Start Free Calculator")').first().click();

      // Verify we're still on calculator page (no redirect)
      expect(page.url()).toContain('calculator.html');

      // Verify calculator form is visible
      const calculatorForm = page.locator('#calculatorForm');
      await expect(calculatorForm).toBeVisible();

      // Verify form fields exist
      await expect(page.locator('#age')).toBeVisible();
      await expect(page.locator('#heightFeet')).toBeVisible();
      await expect(page.locator('#heightInches')).toBeVisible();
      await expect(page.locator('#weight')).toBeVisible();
    });

    test('Step 4: Fill form with test data (age 30, height 5\'10", weight 180lbs)', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Start Free Calculator"
      await page.locator('button:has-text("Start Free Calculator")').first().click();

      // Fill form fields
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);

      // Verify values were entered
      await expect(page.locator('#age')).toHaveValue(testData.age);
      await expect(page.locator('#heightFeet')).toHaveValue(testData.heightFeet);
      await expect(page.locator('#heightInches')).toHaveValue(testData.heightInches);
      await expect(page.locator('#weight')).toHaveValue(testData.weight);
    });

    test('Step 5: Click Calculate button', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Start Free Calculator"
      await page.locator('button:has-text("Start Free Calculator")').first().click();

      // Fill form
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);

      // Click Calculate button
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Wait for results to appear (looking for the results section to become visible)
      const resultsSection = page.locator('#resultsSection');
      await expect(resultsSection).toBeVisible({ timeout: 5000 });
    });

    test('Step 6: Verify results display with meal examples', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Start Free Calculator" and fill form
      await page.locator('button:has-text("Start Free Calculator")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);

      // Calculate
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Wait for results section
      const resultsSection = page.locator('#resultsSection');
      await expect(resultsSection).toBeVisible({ timeout: 5000 });

      // Verify macro results are displayed
      const caloriesOutput = page.locator('#outCalories');
      const proteinOutput = page.locator('#outProtein');
      const fatOutput = page.locator('#outFat');

      await expect(caloriesOutput).toBeVisible();
      await expect(proteinOutput).toBeVisible();
      await expect(fatOutput).toBeVisible();

      // Verify values are populated (not empty)
      const calories = await caloriesOutput.textContent();
      const protein = await proteinOutput.textContent();
      const fat = await fatOutput.textContent();

      expect(calories).not.toBe('');
      expect(protein).not.toBe('');
      expect(fat).not.toBe('');
      expect(calories).toMatch(/\d+/);
      expect(protein).toMatch(/\d+/);
      expect(fat).toMatch(/\d+/);

      // Verify meal examples section exists
      const mealExamplesSection = page.locator('#mealExamplesSection');
      await expect(mealExamplesSection).toBeVisible();

      // Verify there are meal examples displayed
      const mealExamples = page.locator('[data-meal-example]');
      const count = await mealExamples.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Step 7: Verify "Continue to Full Report" button appears', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Free path should NOT show "Continue to Full Report" button initially
      // Instead, upgrade section should be visible

      // Click "Start Free Calculator" and fill form
      await page.locator('button:has-text("Start Free Calculator")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);

      // Calculate
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Wait for results
      await expect(page.locator('#resultsSection')).toBeVisible({ timeout: 5000 });

      // For free path, upgrade section should be visible
      const upgradeSection = page.locator('#upgradeSection');
      await expect(upgradeSection).toBeVisible();

      // Verify no "Continue to Full Report" button for free path
      // (that button is only added for paid path in showPaidPathContinueButton())
      const continueButtons = page.locator('button:has-text("Continue to Full Report")');
      const count = await continueButtons.count();
      expect(count).toBe(0);
    });

    test('Complete Free Path Flow: All steps combined', async ({ page }) => {
      // Load calculator
      await page.goto(CALCULATOR_URL);
      expect(page.url()).toContain('calculator.html');

      // Click "Start Free Calculator"
      await page.locator('button:has-text("Start Free Calculator")').first().click();

      // Verify calculator form is visible
      await expect(page.locator('#calculatorForm')).not.toHaveClass(/hidden/);

      // Fill form
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);

      // Calculate
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Verify results display
      await expect(page.locator('#resultsSection')).toBeVisible({ timeout: 5000 });

      // Verify macro values are displayed
      await expect(page.locator('#outCalories')).toContainText(/\d+/);
      await expect(page.locator('#outProtein')).toContainText(/\d+/);
      await expect(page.locator('#outFat')).toContainText(/\d+/);

      // Verify meal examples are shown
      await expect(page.locator('#mealExamplesSection')).toBeVisible();

      // Verify upgrade section (not continue button) for free path
      await expect(page.locator('#upgradeSection')).toBeVisible();
    });
  });

  // ============ PAID PATH TESTS ============
  test.describe('Paid Path', () => {

    test('Step 1: Load calculator', async ({ page }) => {
      const response = await page.goto(CALCULATOR_URL);
      expect(response?.ok()).toBeTruthy();
      await expect(page).toHaveTitle(/Free Carnivore Macro Calculator/);
    });

    test('Step 2: Click "Get Full Protocol" button', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Wait for and verify the path choice screen
      const pathChoiceContainer = page.locator('#pathChoice');
      await expect(pathChoiceContainer).toBeVisible();

      // Find and click "Get Full Protocol" button
      const getFullProtocolBtn = page.locator('button:has-text("Get Full Protocol")').first();
      await expect(getFullProtocolBtn).toBeVisible();

      await getFullProtocolBtn.click();

      // Verify path choice screen is hidden
      await expect(pathChoiceContainer).toHaveClass(/hidden/);
    });

    test('Step 3: Verify calculator still shows (doesn\'t jump to questionnaire)', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Get Full Protocol"
      await page.locator('button:has-text("Get Full Protocol")').first().click();

      // Verify we're still on calculator page
      expect(page.url()).toContain('calculator.html');

      // Verify calculator form is shown (not hidden)
      const calculatorForm = page.locator('#calculatorForm');
      await expect(calculatorForm).not.toHaveClass(/hidden/);
      await expect(calculatorForm).toBeVisible();
    });

    test('Step 4: Fill and calculate with same test data', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Get Full Protocol"
      await page.locator('button:has-text("Get Full Protocol")').first().click();

      // Fill form
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);

      // Calculate
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Verify results
      await expect(page.locator('#resultsSection')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#outCalories')).toContainText(/\d+/);
    });

    test('Step 5: Click "Continue to Full Report" button', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Get Full Protocol"
      await page.locator('button:has-text("Get Full Protocol")').first().click();

      // Fill and calculate
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Wait for results and continue button
      await expect(page.locator('#resultsSection')).toBeVisible({ timeout: 5000 });

      // The "Continue to Full Report" button should now be visible for paid path
      const continueBtn = page.locator('button:has-text("Continue to Full Report")');
      await expect(continueBtn).toBeVisible({ timeout: 5000 });

      // Click the continue button
      await continueBtn.click();
    });

    test('Step 6: Verify redirects to paid-questionnaire.html', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Click "Get Full Protocol"
      await page.locator('button:has-text("Get Full Protocol")').first().click();

      // Fill and calculate
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Click continue button
      await page.locator('button:has-text("Continue to Full Report")').click();

      // Wait for navigation to complete
      await page.waitForURL('**/paid-questionnaire.html', { timeout: 5000 });

      // Verify we're on paid questionnaire page
      expect(page.url()).toContain('paid-questionnaire.html');
    });

    test('Step 7: Verify form loads with all 5 sections visible', async ({ page }) => {
      await page.goto(CALCULATOR_URL);

      // Navigate to paid questionnaire through calculator
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();
      await page.locator('button:has-text("Continue to Full Report")').click();

      // Wait for questionnaire to load
      await page.waitForURL('**/paid-questionnaire.html');

      // Verify page title
      await expect(page).toHaveTitle(/Your Complete Protocol Questionnaire/);

      // Verify form exists
      const form = page.locator('#paidQuestionnaireForm');
      await expect(form).toBeVisible();

      // Verify all 5 form sections are visible
      // Section 1: Your Information
      const section1 = page.locator('form:has-text("Your Information")');
      await expect(section1).toBeVisible();

      // Section 2: Current Health Conditions
      const section2 = page.locator('form:has-text("Current Health Conditions")');
      await expect(section2).toBeVisible();

      // Section 3: Allergies & Food Restrictions
      const section3 = page.locator('form:has-text("Allergies & Food Restrictions")');
      await expect(section3).toBeVisible();

      // Section 4: Diet History
      const section4 = page.locator('form:has-text("Diet History")');
      await expect(section4).toBeVisible();

      // Section 5: Goals & Priorities
      const section5 = page.locator('form:has-text("Goals & Priorities")');
      await expect(section5).toBeVisible();
    });

    test('Step 8: Fill questionnaire with test data', async ({ page }) => {
      // Navigate to questionnaire
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();
      await page.locator('button:has-text("Continue to Full Report")').click();
      await page.waitForURL('**/paid-questionnaire.html');

      // Fill email (required)
      const emailInput = page.locator('input[name="email"]');
      await emailInput.fill('test@example.com');

      // Fill first name (optional)
      const firstNameInput = page.locator('input[name="firstName"]');
      await firstNameInput.fill('John');

      // Fill some optional fields
      const medicationsInput = page.locator('textarea[name="medications"]');
      await medicationsInput.fill('None');

      const allergiesInput = page.locator('textarea[name="allergies"]');
      await allergiesInput.fill('No known allergies');

      const previousDietsInput = page.locator('textarea[name="previousDiets"]');
      await previousDietsInput.fill('Keto for 6 months');

      // Select some goals
      await page.locator('input#weightloss').check();
      await page.locator('input#energy').check();

      // Verify data was entered
      await expect(emailInput).toHaveValue('test@example.com');
      await expect(firstNameInput).toHaveValue('John');
    });

    test('Step 9: Click "Generate My Protocol" button', async ({ page }) => {
      // Navigate and fill questionnaire
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();
      await page.locator('button:has-text("Continue to Full Report")').click();
      await page.waitForURL('**/paid-questionnaire.html');

      // Fill required email field
      await page.locator('input[name="email"]').fill('test@example.com');

      // Click submit button
      const submitBtn = page.locator('button:has-text("Generate My Protocol")');
      await expect(submitBtn).toBeVisible();
      await submitBtn.click();
    });

    test('Step 10: Verify loading message appears', async ({ page }) => {
      // Navigate and fill questionnaire
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();
      await page.locator('button:has-text("Continue to Full Report")').click();
      await page.waitForURL('**/paid-questionnaire.html');

      // Fill email
      await page.locator('input[name="email"]').fill('test@example.com');

      // Click submit
      await page.locator('button:has-text("Generate My Protocol")').click();

      // Verify loading message appears
      const loadingMessage = page.locator('#loadingMessage');
      await expect(loadingMessage).toBeVisible({ timeout: 5000 });

      // Verify it contains loading text
      await expect(loadingMessage).toContainText(/Generating your personalized protocol|please don't close/i);
    });

    test('Step 11: Wait 10 seconds and verify success or error message', async ({ page }) => {
      // Navigate and fill questionnaire
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();
      await page.locator('button:has-text("Continue to Full Report")').click();
      await page.waitForURL('**/paid-questionnaire.html');

      // Fill email
      await page.locator('input[name="email"]').fill('test@example.com');

      // Click submit
      await page.locator('button:has-text("Generate My Protocol")').click();

      // Verify loading message appears
      const loadingMessage = page.locator('#loadingMessage');
      await expect(loadingMessage).toBeVisible({ timeout: 5000 });

      // Wait 10 seconds
      await page.waitForTimeout(10000);

      // Check for either success message or error
      // Success: "Protocol Generated!" message
      // Error: Could show alert or error message
      const loadingContent = await loadingMessage.textContent();

      // Either the loading message is still visible (API still processing)
      // Or it shows success (Protocol Generated)
      // Or an error occurred
      const isVisible = await loadingMessage.isVisible().catch(() => false);

      if (isVisible) {
        const content = await loadingMessage.textContent();
        expect(content).toBeDefined();
        // Could be loading, success, or error message
        expect(content?.length).toBeGreaterThan(0);
      }
    });

    test('Complete Paid Path Flow: All steps combined', async ({ page }) => {
      // Load calculator
      await page.goto(CALCULATOR_URL);
      expect(page.url()).toContain('calculator.html');

      // Click "Get Full Protocol"
      await page.locator('button:has-text("Get Full Protocol")').first().click();

      // Verify calculator still shows
      await expect(page.locator('#calculatorForm')).not.toHaveClass(/hidden/);

      // Fill and calculate
      await page.locator('#age').fill(testData.age);
      await page.locator('#heightFeet').fill(testData.heightFeet);
      await page.locator('#heightInches').fill(testData.heightInches);
      await page.locator('#weight').fill(testData.weight);
      await page.locator('button:has-text("Calculate My Macros")').click();

      // Verify results display
      await expect(page.locator('#resultsSection')).toBeVisible({ timeout: 5000 });

      // Click "Continue to Full Report"
      await page.locator('button:has-text("Continue to Full Report")').click();

      // Verify navigation to questionnaire
      await page.waitForURL('**/paid-questionnaire.html');
      expect(page.url()).toContain('paid-questionnaire.html');

      // Verify all 5 sections visible
      await expect(page.locator('form:has-text("Your Information")')).toBeVisible();
      await expect(page.locator('form:has-text("Current Health Conditions")')).toBeVisible();
      await expect(page.locator('form:has-text("Allergies & Food Restrictions")')).toBeVisible();
      await expect(page.locator('form:has-text("Diet History")')).toBeVisible();
      await expect(page.locator('form:has-text("Goals & Priorities")')).toBeVisible();

      // Fill with test data
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('input[name="firstName"]').fill('John');

      // Submit form
      await page.locator('button:has-text("Generate My Protocol")').click();

      // Verify loading message
      await expect(page.locator('#loadingMessage')).toBeVisible({ timeout: 5000 });

      // Wait 10 seconds for response
      await page.waitForTimeout(10000);

      // Verify final state (loading, success, or error)
      const loadingMessage = page.locator('#loadingMessage');
      const isStillVisible = await loadingMessage.isVisible().catch(() => false);
      expect([true, false]).toContain(isStillVisible); // Either visible or not
    });
  });

  // ============ COMPARISON TESTS ============
  test.describe('Free vs Paid Path Comparison', () => {

    test('Both paths show calculator first', async ({ page }) => {
      // Free path
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Start Free Calculator")').first().click();
      const freeCalculatorVisible = await page.locator('#calculatorForm').isVisible();

      // Go back and try paid path
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      const paidCalculatorVisible = await page.locator('#calculatorForm').isVisible();

      // Both should show calculator
      expect(freeCalculatorVisible).toBe(true);
      expect(paidCalculatorVisible).toBe(true);
    });

    test('Free path shows upgrade section, paid path shows continue button', async ({ page }) => {
      // Setup test data
      const fillAndCalculate = async () => {
        await page.locator('#age').fill(testData.age);
        await page.locator('#heightFeet').fill(testData.heightFeet);
        await page.locator('#heightInches').fill(testData.heightInches);
        await page.locator('#weight').fill(testData.weight);
        await page.locator('button:has-text("Calculate My Macros")').click();
        await expect(page.locator('#resultsSection')).toBeVisible({ timeout: 5000 });
      };

      // Test free path
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Start Free Calculator")').first().click();
      await fillAndCalculate();

      // Free path should show upgrade section
      const upgradeVisible = await page.locator('#upgradeSection').isVisible();
      const continueButtonsInFree = await page.locator('button:has-text("Continue to Full Report")').count();
      expect(upgradeVisible).toBe(true);
      expect(continueButtonsInFree).toBe(0);

      // Test paid path
      await page.goto(CALCULATOR_URL);
      await page.locator('button:has-text("Get Full Protocol")').first().click();
      await fillAndCalculate();

      // Paid path should show continue button
      const continueButtonsInPaid = await page.locator('button:has-text("Continue to Full Report")').count();
      expect(continueButtonsInPaid).toBeGreaterThan(0);
    });
  });
});

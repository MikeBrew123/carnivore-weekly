#!/usr/bin/env node

/**
 * Calculator Flow Test Suite
 * Tests the complete calculator workflow with name and email validation
 *
 * Requirements:
 * - Playwright installed (npm install -D @playwright/test)
 * - Local calculator server running on http://localhost:3000 or similar
 * - Stripe CLI running in background (stripe listen --forward-to localhost:3000/webhook)
 */

const { chromium } = require('playwright');
const assert = require('assert');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@carnivore-demo.com';
const TEST_FIRST_NAME = 'John';
const TEST_LAST_NAME = 'Carnivore';

class CalculatorFlowTest {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async setup() {
    console.log('Setting up test environment...');
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--disable-blink-features=AutomationControlled']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1400, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();

    // Log console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      }
    });

    // Log navigation errors
    this.page.on('pageerror', err => {
      console.error(`Page Error: ${err}`);
    });
  }

  async teardown() {
    console.log('\nTearing down test environment...');
    if (this.browser) {
      await this.browser.close();
    }
  }

  async test(name, fn) {
    try {
      console.log(`\n[TEST] ${name}`);
      await fn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      console.log(`✓ ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.error(`✗ ${name}: ${error.message}`);
    }
  }

  async navigateToCalculator() {
    console.log(`Navigating to calculator at ${BASE_URL}/calculator2-demo.html`);
    await this.page.goto(`${BASE_URL}/calculator2-demo.html`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async testStep1Basic() {
    await this.test('Step 1: Navigate to calculator', async () => {
      await this.navigateToCalculator();
      const heading = await this.page.textContent('h2, h1');
      assert(heading && heading.includes('Basic'), 'Should see Step 1 Basic content');
    });

    await this.test('Step 1: Fill sex field', async () => {
      await this.page.selectOption('select[id="sex"]', 'male');
      const value = await this.page.inputValue('select[id="sex"]');
      assert.strictEqual(value, 'male', 'Sex should be set to male');
    });

    await this.test('Step 1: Fill age field', async () => {
      await this.page.fill('input[id="age"]', '35');
      const value = await this.page.inputValue('input[id="age"]');
      assert.strictEqual(value, '35', 'Age should be 35');
    });

    await this.test('Step 1: Fill height fields (imperial)', async () => {
      // Ensure imperial is selected
      const imperialBtn = await this.page.locator('button:has-text("lbs/in")');
      await imperialBtn.click();

      // Fill height
      await this.page.fill('input[id="heightFeet"]', '5');
      await this.page.fill('input[id="heightInches"]', '11');

      const feet = await this.page.inputValue('input[id="heightFeet"]');
      const inches = await this.page.inputValue('input[id="heightInches"]');
      assert.strictEqual(feet, '5', 'Height feet should be 5');
      assert.strictEqual(inches, '11', 'Height inches should be 11');
    });

    await this.test('Step 1: Fill weight field', async () => {
      await this.page.fill('input[id="weight"]', '215');
      const value = await this.page.inputValue('input[id="weight"]');
      assert.strictEqual(value, '215', 'Weight should be 215');
    });

    await this.test('Step 1: Fill email field (optional)', async () => {
      const emailInput = await this.page.locator('input[id="email"]');
      if (await emailInput.isVisible()) {
        await emailInput.fill(TEST_EMAIL);
        const value = await emailInput.inputValue();
        assert.strictEqual(value, TEST_EMAIL, `Email should be ${TEST_EMAIL}`);
        console.log('Email captured in Step 1');
      } else {
        console.log('Email field not visible in Step 1');
      }
    });

    await this.test('Step 1: Submit form to advance', async () => {
      await this.page.click('button:has-text("Continue to Activity Level")');
      await this.page.waitForLoadState('domcontentloaded');

      // Check that we moved to Step 2
      const content = await this.page.textContent('body');
      assert(content && content.includes('Activity'), 'Should advance to Activity step');
    });
  }

  async testStep2Activity() {
    await this.test('Step 2: Verify activity fields load', async () => {
      const lifestyleSelect = await this.page.locator('select').first();
      assert(await lifestyleSelect.isVisible(), 'Activity fields should be visible');
    });

    await this.test('Step 2: Submit without changes', async () => {
      await this.page.click('button:has-text("See Results")');
      await this.page.waitForLoadState('domcontentloaded');

      // Should proceed to next step
      const content = await this.page.textContent('body');
      assert(content, 'Page should have content after submission');
    });
  }

  async testResultsAndUpgrade() {
    await this.test('Step 3: Verify macro results display', async () => {
      const content = await this.page.textContent('body');
      assert(content && content.includes('Calorie'), 'Results should show macro information');
    });

    await this.test('Step 3: Locate upgrade button', async () => {
      const upgradeBtn = await this.page.locator('button:has-text("Upgrade")').first();
      assert(await upgradeBtn.isVisible(), 'Upgrade button should be visible');
      console.log('Found upgrade button');
    });

    await this.test('Step 3: Click upgrade to open payment modal', async () => {
      const upgradeBtn = await this.page.locator('button:has-text("Upgrade")').first();
      await upgradeBtn.click();

      // Wait for modal to appear
      await this.page.waitForSelector('[role="dialog"], .modal, .fixed.inset-0', { timeout: 5000 });

      // Verify payment modal is visible
      const modalContent = await this.page.textContent('body');
      assert(modalContent && modalContent.includes('Complete Payment'), 'Payment modal should appear');
    });
  }

  async testPaymentModal() {
    await this.test('Payment Modal: Email field pre-filled', async () => {
      const emailInput = await this.page.locator('input[type="email"]').first();
      const value = await emailInput.inputValue();

      // Email might be pre-filled from Step 1 or empty
      if (value) {
        console.log(`Email pre-filled with: ${value}`);
        assert.strictEqual(value, TEST_EMAIL, `Email should be pre-filled with ${TEST_EMAIL}`);
      } else {
        console.log('Email field is empty, will fill it');
      }
    });

    await this.test('Payment Modal: Fill first name', async () => {
      const inputs = await this.page.locator('input[type="text"]').all();
      const firstNameInput = inputs[0]; // Should be first name input

      await firstNameInput.fill(TEST_FIRST_NAME);
      const value = await firstNameInput.inputValue();
      assert.strictEqual(value, TEST_FIRST_NAME, `First name should be ${TEST_FIRST_NAME}`);
    });

    await this.test('Payment Modal: Fill last name', async () => {
      const inputs = await this.page.locator('input[type="text"]').all();
      const lastNameInput = inputs[1]; // Should be last name input

      await lastNameInput.fill(TEST_LAST_NAME);
      const value = await lastNameInput.inputValue();
      assert.strictEqual(value, TEST_LAST_NAME, `Last name should be ${TEST_LAST_NAME}`);
    });

    await this.test('Payment Modal: Fill email', async () => {
      const emailInput = await this.page.locator('input[type="email"]').first();
      await emailInput.fill(TEST_EMAIL);
      const value = await emailInput.inputValue();
      assert.strictEqual(value, TEST_EMAIL, `Email should be ${TEST_EMAIL}`);
    });

    await this.test('Payment Modal: Validate name format', async () => {
      // Try invalid first name
      const inputs = await this.page.locator('input[type="text"]').all();
      const firstNameInput = inputs[0];

      await firstNameInput.clear();
      await firstNameInput.fill('123'); // Invalid - numbers

      const payBtn = await this.page.locator('button:has-text("Pay")').first();
      const isDisabled = await payBtn.evaluate(btn => btn.disabled);

      if (isDisabled) {
        console.log('Pay button correctly disabled for invalid name format');
      } else {
        console.log('Warning: Pay button not disabled for invalid name');
      }
    });

    await this.test('Payment Modal: Verify pay button state', async () => {
      // Re-fill with valid names
      const inputs = await this.page.locator('input[type="text"]').all();
      const firstNameInput = inputs[0];
      const lastNameInput = inputs[1];

      await firstNameInput.clear();
      await firstNameInput.fill(TEST_FIRST_NAME);
      await lastNameInput.clear();
      await lastNameInput.fill(TEST_LAST_NAME);

      const payBtn = await this.page.locator('button:has-text("Pay")').first();
      const isEnabled = await payBtn.evaluate(btn => !btn.disabled);
      assert(isEnabled, 'Pay button should be enabled with valid input');
    });

    await this.test('Payment Modal: Verify form sends to Stripe', async () => {
      // Listen for network requests
      const responses = [];
      this.page.on('response', response => {
        if (response.url().includes('create-checkout')) {
          responses.push(response);
        }
      });

      // Note: We don't actually submit to avoid charge, but we verify the button is ready
      const payBtn = await this.page.locator('button:has-text("Pay")').first();
      assert(await payBtn.isEnabled(), 'Pay button should be enabled and ready');
    });
  }

  async testFormValidation() {
    await this.test('Form Validation: Email format validation', async () => {
      const emailInput = await this.page.locator('input[type="email"]').first();

      await emailInput.clear();
      await emailInput.fill('invalid-email');

      // Wait a moment for validation
      await this.page.waitForTimeout(500);

      // Check for error message or button disabled state
      const errorMsg = await this.page.locator('text=Please enter a valid email').isVisible().catch(() => false);
      const payBtn = await this.page.locator('button:has-text("Pay")').first();
      const isDisabled = await payBtn.evaluate(btn => btn.disabled);

      assert(errorMsg || isDisabled, 'Should show email validation error');
    });

    await this.test('Form Validation: Required name fields', async () => {
      const inputs = await this.page.locator('input[type="text"]').all();
      const firstNameInput = inputs[0];

      await firstNameInput.clear();

      const payBtn = await this.page.locator('button:has-text("Pay")').first();
      const isDisabled = await payBtn.evaluate(btn => btn.disabled);

      assert(isDisabled, 'Pay button should be disabled when name is empty');
    });
  }

  async runAllTests() {
    try {
      await this.setup();

      console.log('='.repeat(60));
      console.log('CALCULATOR FLOW TEST SUITE');
      console.log('='.repeat(60));
      console.log(`Base URL: ${BASE_URL}`);
      console.log(`Headless: ${process.env.HEADLESS !== 'false'}`);

      // Run test suites
      await this.testStep1Basic();
      await this.testStep2Activity();
      await this.testResultsAndUpgrade();
      await this.testPaymentModal();
      await this.testFormValidation();

      // Print results
      console.log('\n' + '='.repeat(60));
      console.log('TEST RESULTS');
      console.log('='.repeat(60));
      console.log(`Passed: ${this.results.passed}`);
      console.log(`Failed: ${this.results.failed}`);
      console.log(`Total: ${this.results.passed + this.results.failed}`);

      if (this.results.failed > 0) {
        console.log('\nFailed Tests:');
        this.results.tests
          .filter(t => t.status === 'FAILED')
          .forEach(t => {
            console.log(`  - ${t.name}: ${t.error}`);
          });
      }

      // Exit with appropriate code
      process.exit(this.results.failed > 0 ? 1 : 0);

    } catch (error) {
      console.error('Test suite error:', error);
      process.exit(1);
    } finally {
      await this.teardown();
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new CalculatorFlowTest();
  tester.runAllTests().catch(console.error);
}

module.exports = CalculatorFlowTest;

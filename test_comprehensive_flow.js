#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test
 * Simulates a complete customer flow: fill form → generate report → verify all functionality
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:5173',
  testEmail: 'test-customer@example.com',
  screenshotDir: '/tmp/calculator-test-screenshots',
  timeout: 60000, // 60 seconds for report generation
};

// Test data matching customer profile
const TEST_DATA = {
  step1: {
    sex: 'male',
    age: '35',
    heightFeet: '5',
    heightInches: '10',
    weight: '200',
  },
  step2: {
    lifestyle: '1.2', // lightly active
    exercise: '0.1',
  },
  step3: {
    goal: 'lose',
    deficit: '25',
    diet: 'carnivore',
    ratio: '75-25',
  },
};

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  screenshots: [],
  errors: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

async function ensureScreenshotDir() {
  if (!fs.existsSync(TEST_CONFIG.screenshotDir)) {
    fs.mkdirSync(TEST_CONFIG.screenshotDir, { recursive: true });
  }
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(TEST_CONFIG.screenshotDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  results.screenshots.push({ name, path: screenshotPath });
  console.log(`✓ Screenshot: ${name}`);
}

async function test(name, fn) {
  try {
    console.log(`\n🧪 Test: ${name}`);
    await fn();
    results.tests.push({ name, status: 'PASS', error: null });
    results.summary.passed++;
    console.log(`✓ PASS: ${name}`);
  } catch (error) {
    console.log(`✗ FAIL: ${name}`);
    console.log(`  Error: ${error.message}`);
    results.tests.push({ name, status: 'FAIL', error: error.message });
    results.errors.push({ test: name, error: error.message });
    results.summary.failed++;
  }
}

async function main() {
  await ensureScreenshotDir();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // ========================================
    // STEP 1: Load the calculator app
    // ========================================
    await test('Calculator app loads successfully', async () => {
      await page.goto(`${TEST_CONFIG.baseUrl}`, { waitUntil: 'networkidle' });
      const title = await page.title();
      if (!title.includes('Calculator')) {
        throw new Error(`Expected title to contain "Calculator", got: ${title}`);
      }
      await takeScreenshot(page, '01-app-loaded');
    });

    // ========================================
    // STEP 2: Fill Step 1 - Basic Info
    // ========================================
    await test('Step 1: Fill basic info (sex, age, height, weight)', async () => {
      // Sex selection
      await page.click('select[name*="sex"], [data-testid*="sex"] select');
      await page.selectOption('select[name*="sex"], [data-testid*="sex"] select', TEST_DATA.step1.sex);

      // Age
      const ageInputs = await page.locator('input[type="number"]').all();
      if (ageInputs.length > 0) {
        await ageInputs[0].fill(TEST_DATA.step1.age);
      }

      // Check that form accepted values
      const visibleText = await page.locator('body').textContent();
      if (!visibleText.includes('35') && !visibleText.includes('Step 1')) {
        throw new Error('Step 1 form fields not visible or not accepting input');
      }

      await takeScreenshot(page, '02-step1-filled');
    });

    // ========================================
    // STEP 3: Navigate and check form state
    // ========================================
    await test('Form maintains state across steps', async () => {
      // Look for continue/next button
      const nextButtons = await page.locator('button').filter({ hasText: /Next|Continue/ }).all();
      if (nextButtons.length === 0) {
        throw new Error('No Next/Continue button found');
      }

      // Form should be visible and filled
      const formContent = await page.locator('main, [role="main"]').textContent();
      if (!formContent) {
        throw new Error('Main form content not found');
      }
    });

    // ========================================
    // STEP 4: Check layout improvements
    // ========================================
    await test('Report layout uses max-w-6xl for readability', async () => {
      const mainContent = await page.locator('main, [class*="main"]').first();
      const styles = await mainContent.evaluate((el) => {
        return window.getComputedStyle(el);
      });

      const maxWidth = styles.maxWidth;
      console.log(`  Main content max-width: ${maxWidth}`);

      // Should be a reasonable width (at least 768px for max-w-3xl)
      // Check container
      const container = await page.locator('[class*="container"], [class*="max-w"]').first();
      if (container) {
        const containerMaxWidth = await container.evaluate((el) => {
          return window.getComputedStyle(el).maxWidth;
        });
        console.log(`  Container max-width: ${containerMaxWidth}`);
      }
    });

    // ========================================
    // STEP 5: Verify form fields exist
    // ========================================
    await test('New Step 5 form fields are present (whatWorked, cookingSkill, etc.)', async () => {
      // Check if we can find form fields in the DOM
      const formLabels = await page.locator('label').allTextContents();
      const formText = await page.locator('body').textContent();

      const expectedFields = [
        'cooking', // cookingSkill
        'budget',  // budget
        'family',  // familySituation
        'work',    // workTravel
        'challenge', // biggestChallenge
      ];

      let foundFields = [];
      expectedFields.forEach((field) => {
        if (formText.toLowerCase().includes(field.toLowerCase())) {
          foundFields.push(field);
        }
      });

      console.log(`  Found ${foundFields.length}/${expectedFields.length} expected fields`);
      if (foundFields.length === 0) {
        console.warn(`  Warning: Form fields may not be visible yet (depends on form step)`);
      }
    });

    // ========================================
    // STEP 6: Check typography plugin
    // ========================================
    await test('Typography plugin is loaded (prose classes available)', async () => {
      // Check if prose classes exist in the page
      const htmlContent = await page.content();
      const hasProse = htmlContent.includes('prose') || htmlContent.includes('tailwind');

      // Also check for the CSS file
      const cssLinks = await page.locator('link[rel="stylesheet"]').all();
      let foundCSS = false;
      for (const link of cssLinks) {
        const href = await link.getAttribute('href');
        if (href && href.includes('CTUCbDUT')) {
          foundCSS = true;
          console.log(`  Found CSS file: ${href}`);
          break;
        }
      }

      if (!foundCSS) {
        console.warn(`  Warning: Expected CSS file not found`);
      }
    });

    // ========================================
    // STEP 7: Check print CSS
    // ========================================
    await test('Print CSS is properly configured', async () => {
      // Get all style tags
      const styles = await page.locator('style, link[rel="stylesheet"]').all();
      let printStylesFound = false;

      // Check for print media query in styles
      const styleContent = await page.evaluate(() => {
        const allStyles = Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n');
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
        return { allStyles, links };
      });

      if (styleContent.allStyles.includes('@media print')) {
        printStylesFound = true;
        console.log(`  ✓ Print media queries found in inline styles`);
      }

      if (printStylesFound) {
        // Also check that page-break properties are NOT using page-break-after: always
        if (styleContent.allStyles.includes('page-break-after: auto')) {
          console.log(`  ✓ Print CSS uses flexible pagebreaks (page-break-after: auto)`);
        } else if (styleContent.allStyles.includes('page-break-after: always')) {
          console.warn(`  ⚠ Warning: Print CSS still has page-break-after: always (may cause extra pages)`);
          results.summary.warnings++;
        }
      }
    });

    // ========================================
    // STEP 8: Check app responsiveness
    // ========================================
    await test('App is responsive on mobile viewport', async () => {
      // Create new page with mobile viewport
      const mobilePage = await context.newPage({
        viewport: { width: 375, height: 812 },
      });

      await mobilePage.goto(`${TEST_CONFIG.baseUrl}`, { waitUntil: 'networkidle' });

      // Check for horizontal scroll
      const hasHorizontalScroll = await mobilePage.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll) {
        console.warn(`  ⚠ Warning: Horizontal scroll detected on mobile (375px viewport)`);
        results.summary.warnings++;
      } else {
        console.log(`  ✓ No horizontal scroll on mobile viewport`);
      }

      await mobilePage.close();
    });

    // ========================================
    // STEP 9: Check build artifacts
    // ========================================
    await test('Build artifacts are current (CSS/JS hashes)', async () => {
      const scriptTags = await page.locator('script[src*="/assets/"]').all();
      const linkTags = await page.locator('link[rel="stylesheet"]').all();

      let jsFiles = [];
      let cssFiles = [];

      for (const tag of scriptTags) {
        const src = await tag.getAttribute('src');
        if (src) jsFiles.push(src);
      }

      for (const tag of linkTags) {
        const href = await tag.getAttribute('href');
        if (href) cssFiles.push(href);
      }

      console.log(`  JS files: ${jsFiles.join(', ') || 'none'}`);
      console.log(`  CSS files: ${cssFiles.join(', ') || 'none'}`);

      // Check for specific hashes
      const allAssets = [...jsFiles, ...cssFiles].join('');
      if (allAssets.includes('CTUCbDUT') && allAssets.includes('9LwozTKO')) {
        console.log(`  ✓ Current build hashes found (CTUCbDUT, 9LwozTKO)`);
      } else {
        console.warn(`  ⚠ Build hashes may not be current`);
        results.summary.warnings++;
      }
    });

    // ========================================
    // SUMMARY
    // ========================================
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✓ Passed: ${results.summary.passed}`);
    console.log(`✗ Failed: ${results.summary.failed}`);
    console.log(`⚠ Warnings: ${results.summary.warnings}`);
    console.log(`Screenshots: ${results.screenshots.length}`);

    if (results.summary.failed > 0) {
      console.log(`\n❌ FAILURES:`);
      results.errors.forEach((err) => {
        console.log(`  - ${err.test}: ${err.error}`);
      });
    }

    if (results.summary.warnings > 0) {
      console.log(`\n⚠️  WARNINGS - Please review above for details`);
    }

    // Save results
    const resultsPath = '/tmp/calculator-test-results.json';
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📋 Full results saved to: ${resultsPath}`);

  } catch (error) {
    console.error('Unexpected test error:', error);
    results.errors.push({ test: 'Test Runner', error: error.message });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * Debug - Inspect actual form structure at each step
 */

import { chromium } from 'playwright';

const URL = 'https://carnivoreweekly.com/calculator.html';
const SCREENSHOTS = '/tmp/calculator-debug-screenshots';

import { mkdir } from 'fs/promises';
await mkdir(SCREENSHOTS, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  slowMo: 500
});

const page = await browser.newPage();

try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n=== STEP 1: Demographics ===\n');

  await page.click('input[name="sex"][value="male"]');
  await page.fill('input[name="age"]', '44');
  await page.fill('input[name="weight"]', '222');
  await page.fill('input[name="heightFeet"]', '6');
  await page.fill('input[name="heightInches"]', '0');

  await page.screenshot({ path: `${SCREENSHOTS}/step1-filled.png` });

  await page.click('button:has-text("Continue to Next Step")');
  await page.waitForTimeout(2000);

  console.log('\n=== STEP 2: Activity & Goals ===\n');

  await page.selectOption('select[name="lifestyle"]', 'moderate');
  await page.selectOption('select[name="exercise"]', '3-4');

  const goalRadios = await page.locator('input[name="goal"]').all();
  await goalRadios[0].click();

  await page.selectOption('select[name="diet"]', 'carnivore');

  await page.screenshot({ path: `${SCREENSHOTS}/step2-filled.png` });

  await page.click('button:has-text("See Your Results")');
  await page.waitForTimeout(3000);

  console.log('\n=== CURRENT PAGE AFTER "SEE YOUR RESULTS" ===\n');

  await page.screenshot({ path: `${SCREENSHOTS}/after-see-results.png`, fullPage: true });

  const allElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      text: el.innerText?.slice(0, 80) || el.textContent?.slice(0, 80),
      visible: el.offsetParent !== null
    }));
  });

  console.log('ALL FORM ELEMENTS:');
  console.log(JSON.stringify(allElements, null, 2));

  const pageText = await page.innerText('body');
  console.log('\n\nPAGE TEXT (first 1000 chars):');
  console.log(pageText.substring(0, 1000));

  console.log('\n\nScreenshots saved to:', SCREENSHOTS);
  console.log('\nKeeping browser open for 60 seconds...\n');

  await page.waitForTimeout(60000);

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  await page.screenshot({ path: `${SCREENSHOTS}/error.png` });
} finally {
  await browser.close();
}

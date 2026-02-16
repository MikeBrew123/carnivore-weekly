#!/usr/bin/env node
/**
 * Automated Calculator Test - Inspect REAL selectors, then fill
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SCREENSHOT_DIR = '/tmp/calculator-screenshots';
const URL = 'https://carnivoreweekly.com/calculator.html';

await mkdir(SCREENSHOT_DIR, { recursive: true });

console.log('\n🧪 AUTOMATED CALCULATOR TEST\n');

const browser = await chromium.launch({
  headless: false,
  slowMo: 200
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 }
});

const page = await context.newPage();

try {
  console.log('📂 Opening calculator...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // STEP 1: INSPECT ALL FORM ELEMENTS
  console.log('\n🔍 INSPECTING FORM ELEMENTS...\n');

  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      class: el.className,
      placeholder: el.placeholder,
      text: el.innerText?.slice(0, 50) || el.textContent?.slice(0, 50),
      value: el.value
    }));
  });

  console.log('Found', elements.length, 'form elements:');
  console.log(JSON.stringify(elements, null, 2));

  await page.screenshot({ path: `${SCREENSHOT_DIR}/00-initial-load.png` });

  // STEP 2: FILL DEMOGRAPHICS (Step 1)
  console.log('\n📝 STEP 1: Demographics\n');

  // Find sex radio buttons
  const sexRadios = elements.filter(el => el.name === 'sex');
  console.log('Sex radios:', sexRadios);

  if (sexRadios.length > 0) {
    await page.click('input[name="sex"][value="male"]');
    console.log('✓ Selected Male');
  }

  // Age
  await page.fill('input[name="age"]', '44');
  console.log('✓ Age: 44');

  // Weight
  await page.fill('input[name="weight"]', '222');
  console.log('✓ Weight: 222');

  // Height
  await page.fill('input[name="heightFeet"]', '6');
  await page.fill('input[name="heightInches"]', '0');
  console.log('✓ Height: 6\'0"');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-demographics-filled.png` });

  // Look for all radio buttons to find activity/goal
  const allRadios = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
      name: r.name,
      value: r.value,
      label: r.parentElement?.textContent?.trim() || ''
    }));
  });
  console.log('\nAll radio buttons:', JSON.stringify(allRadios, null, 2));

  // Click Continue button
  const continueBtn = await page.locator('button:has-text("Continue")').first();
  await continueBtn.click();
  console.log('✓ Clicked Continue');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-step2-loaded.png` });

  // STEP 3: Inspect Step 2 elements
  console.log('\n📝 STEP 2: Activity & Goals\n');

  const step2Elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      placeholder: el.placeholder,
      text: el.innerText?.slice(0, 50) || el.textContent?.slice(0, 50)
    }));
  });

  console.log('Step 2 elements:', JSON.stringify(step2Elements, null, 2));

  // This is actually activity/goal/diet selection, not contact info

  // Lifestyle activity
  await page.selectOption('select[name="lifestyle"]', 'moderate');
  console.log('✓ Lifestyle: Moderate');

  // Exercise frequency
  await page.selectOption('select[name="exercise"]', '3-4');
  console.log('✓ Exercise: 3-4 days/week');

  // Goal - find the "lose" radio button
  const goalRadios = await page.locator('input[name="goal"]').all();
  if (goalRadios.length >= 1) {
    await goalRadios[0].click(); // First one is likely "lose"
    console.log('✓ Goal: Weight loss');
  }

  // Diet type
  await page.selectOption('select[name="diet"]', 'carnivore');
  console.log('✓ Diet: Carnivore');

  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-activity-filled.png` });

  // Continue to results/contact
  await page.locator('button:has-text("See Your Results")').click();
  console.log('✓ See Your Results');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-results-or-contact.png` });

  // STEP 4: Check what's on this page - might be contact info or results
  console.log('\n📊 STEP 3: Results/Contact Page\n');

  const step3Elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      placeholder: el.placeholder,
      text: el.innerText?.slice(0, 50) || el.textContent?.slice(0, 50)
    }));
  });

  console.log('Step 3 elements:', JSON.stringify(step3Elements, null, 2));

  // Check if there's email input (contact info step)
  const hasEmail = step3Elements.some(el => el.type === 'email');

  if (hasEmail) {
    console.log('Found contact info form...');
    await page.fill('input[type="email"]', 'test@carnivoreweekly.com');
    console.log('✓ Email');

    const textInputs = await page.locator('input[type="text"]').all();
    if (textInputs.length >= 2) {
      await textInputs[0].fill('Test');
      await textInputs[1].fill('User');
      console.log('✓ Name: Test User');
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-contact-filled.png` });

    await page.locator('button:has-text("Continue")').click();
    console.log('✓ Continue after contact');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-after-contact.png` });
  }

  const upgradeBtn = await page.locator('button:has-text("Upgrade")').count();
  if (upgradeBtn > 0) {
    await page.locator('button:has-text("Upgrade")').click();
    console.log('✓ Clicked Upgrade');
    await page.waitForTimeout(2000);
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-health-profile.png` });

  // STEP 5: Health Profile
  console.log('\n📝 STEP 4: Health Profile\n');

  const step4Elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      placeholder: el.placeholder,
      text: el.innerText?.slice(0, 50) || el.textContent?.slice(0, 50)
    }));
  });

  console.log('Step 4 elements:', JSON.stringify(step4Elements, null, 2));

  // Fill allergies and avoid foods
  const textareas = await page.locator('textarea').all();
  console.log(`Found ${textareas.length} textareas`);

  if (textareas.length >= 2) {
    await textareas[0].fill('shellfish, eggs');
    console.log('✓ Allergies: shellfish, eggs');

    await textareas[1].fill('liver, sardines');
    console.log('✓ Avoid: liver, sardines');
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-health-filled.png` });

  // Continue to checkout
  await page.locator('button:has-text("Continue")').first().click();
  console.log('✓ Continue to checkout');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/07-checkout-page.png` });

  // STEP 6: Apply coupon
  console.log('\n🎟️  STEP 5: Coupon & Checkout\n');

  const couponInput = await page.locator('input[placeholder*="coupon" i], input[name*="coupon"]').first();
  await couponInput.fill('TEST999');
  console.log('✓ Entered TEST999');

  await page.locator('button:has-text("Apply")').click();
  console.log('✓ Clicked Apply');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${SCREENSHOT_DIR}/08-coupon-applied.png` });

  // Complete checkout
  await page.locator('button:has-text("Complete")').click();
  console.log('✓ Checkout submitted!');

  const checkoutTime = Date.now();

  // STEP 7: Wait for report
  console.log('\n⏳ Waiting for report generation...\n');

  let reportFound = false;
  let reportUrl = '';

  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);

    const url = page.url();
    if (url.includes('report.html')) {
      const elapsed = ((Date.now() - checkoutTime) / 1000).toFixed(2);
      console.log(`\n✅ REPORT GENERATED in ${elapsed}s!`);
      console.log('📄 URL:', url);
      reportUrl = url;
      reportFound = true;
      break;
    }

    if (i % 10 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s elapsed...`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/wait-${i}s.png` });
    }
  }

  if (reportFound) {
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-report-page.png`,
      fullPage: true
    });

    // Get report stats
    const reportText = await page.innerText('body');
    const wordCount = reportText.split(/\s+/).length;
    const htmlContent = await page.content();
    const htmlSize = htmlContent.length;

    console.log('\n📊 REPORT STATS:');
    console.log('   HTML Size:', (htmlSize / 1024).toFixed(2), 'KB');
    console.log('   Word Count:', wordCount.toLocaleString());
    console.log('   Est. Pages:', Math.ceil(wordCount / 500));
    console.log('   URL:', reportUrl);

    // Check for allergy filtering
    const lowerText = reportText.toLowerCase();
    const forbiddenFoods = ['eggs', 'egg', 'shellfish', 'shrimp', 'crab', 'lobster'];
    const found = forbiddenFoods.filter(food => {
      const regex = new RegExp(`\\b${food}s?\\b`, 'i');
      return regex.test(reportText);
    });

    console.log('\n🚫 ALLERGY CHECK:');
    if (found.length === 0) {
      console.log('   ✅ NO allergenic foods found');
    } else {
      console.log('   ❌ Found:', found.join(', '));
    }

  } else {
    console.log('\n⚠️  Report not generated after 120s');
    console.log('Current URL:', page.url());
    await page.screenshot({ path: `${SCREENSHOT_DIR}/timeout.png` });
  }

  console.log('\n🎬 Keeping browser open for 30s...');
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png` });
  await page.waitForTimeout(10000);
} finally {
  await browser.close();
  console.log('\n✅ Test complete\n');
  console.log('Screenshots saved to:', SCREENSHOT_DIR);
}

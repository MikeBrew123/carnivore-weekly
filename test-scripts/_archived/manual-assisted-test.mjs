#!/usr/bin/env node
/**
 * Manual-Assisted Calculator Test
 * Browser opens, you fill the form, script monitors for report
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { writeFileSync } from 'fs';

const SCREENSHOT_DIR = '/tmp/calculator-test-screenshots';
const DOWNLOADS_DIR = '/Users/mbrew/Downloads';
const BASE_URL = 'https://carnivoreweekly.com';

await mkdir(SCREENSHOT_DIR, { recursive: true });

console.log('\n🚀 MANUAL-ASSISTED CALCULATOR TEST\n');
console.log('=' .repeat(60));
console.log('📋 INSTRUCTIONS:');
console.log('   1. Browser will open to calculator');
console.log('   2. YOU fill out the form with:');
console.log('      - Sex: Male, Age: 44, Weight: 222 lbs, Height: 5\'10"');
console.log('      - 🚫 Allergies: shellfish, eggs');
console.log('      - 🚫 Avoid Foods: liver, sardines');
console.log('      - Use coupon: TEST999');
console.log('   3. Complete checkout');
console.log('   4. Script will detect when report is ready');
console.log('   5. Script will analyze and save report\n');
console.log('⏰ Report generation timer starts when you submit checkout');
console.log('=' .repeat(60) + '\n');

const browser = await chromium.launch({
  headless: false,
  slowMo: 100
});

const context = await browser.newContext({
  viewport: { width: 1400, height: 900 }
});

const page = await context.newPage();

const timing = {
  checkoutSubmit: null,
  reportReady: null,
  reportGenerationTime: null
};

try {
  // Open calculator
  console.log('🌐 Opening calculator...\n');
  await page.goto(`${BASE_URL}/calculator.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('✅ Calculator loaded!');
  console.log('\n👉 PLEASE FILL OUT THE FORM NOW:');
  console.log('   Step 1: Demographics (age, weight, etc.)');
  console.log('   Step 2: Contact info');
  console.log('   Step 3: Click "See Results", then "Upgrade"');
  console.log('   Step 4: Health profile WITH allergies & restrictions');
  console.log('   Step 5: Apply TEST999 coupon');
  console.log('   Step 6: Complete checkout\n');
  console.log('⏳ Waiting for you to complete the form and submit checkout...\n');

  // Monitor for checkout submission
  let reportUrl = null;
  let checkoutDetected = false;

  // Wait up to 10 minutes for user to fill form and submit
  for (let i = 0; i < 600; i++) {
    await page.waitForTimeout(1000);

    const url = page.url();

    // Detect if we're on report page
    if (url.includes('report.html?token=')) {
      if (!checkoutDetected) {
        checkoutDetected = true;
        timing.checkoutSubmit = Date.now();
        console.log('✅ Checkout detected! Report URL found.');
        console.log('⏱️  Starting report generation timer...\n');
      }

      reportUrl = url;
      timing.reportReady = Date.now();
      timing.reportGenerationTime = timing.reportReady - timing.checkoutSubmit;
      console.log(`✅ Report ready in ${(timing.reportGenerationTime / 1000).toFixed(2)}s!\n`);
      break;
    }

    // Check page content for report link
    if (!checkoutDetected) {
      const pageText = await page.innerText('body').catch(() => '');

      // Detect checkout submission
      if (pageText.toLowerCase().includes('generating') ||
          pageText.toLowerCase().includes('creating your report') ||
          pageText.toLowerCase().includes('please wait')) {
        if (!checkoutDetected) {
          checkoutDetected = true;
          timing.checkoutSubmit = Date.now();
          console.log('✅ Checkout submitted! Report generation started.');
          console.log('⏱️  Timer started...\n');
        }
      }

      // Check for report link
      const reportLinks = await page.locator('a[href*="report.html"]').all();
      if (reportLinks.length > 0) {
        const href = await reportLinks[0].getAttribute('href');
        if (href && href.includes('token=')) {
          reportUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

          if (!checkoutDetected) {
            timing.checkoutSubmit = Date.now();
          }
          timing.reportReady = Date.now();
          timing.reportGenerationTime = timing.reportReady - timing.checkoutSubmit;

          console.log(`✅ Report link found in ${(timing.reportGenerationTime / 1000).toFixed(2)}s!\n`);
          await page.goto(reportUrl, { waitUntil: 'networkidle' });
          break;
        }
      }
    }

    // Progress indicator every 30 seconds
    if (i > 0 && i % 30 === 0) {
      console.log(`   ⏳ Still waiting... ${i} seconds elapsed`);
      if (!checkoutDetected) {
        console.log('      (Fill form and submit when ready)');
      } else {
        console.log('      (Report generating...)');
      }
    }
  }

  if (!reportUrl) {
    console.log('\n⚠️  No report found after 10 minutes');
    console.log('   Please check manually or wait longer\n');
    await page.waitForTimeout(30000);
    await browser.close();
    process.exit(0);
  }

  // ANALYZE REPORT
  console.log('🔍 Analyzing comprehensive report...\n');

  const reportHtml = await page.content();
  const textContent = await page.innerText('body');
  const wordCount = textContent.split(/\s+/).length;
  const htmlSize = reportHtml.length;

  console.log('📊 REPORT SIZE METRICS:');
  console.log(`   HTML Size: ${(htmlSize / 1024).toFixed(2)} KB`);
  console.log(`   Word Count: ${wordCount.toLocaleString()}`);
  console.log(`   Est. Print Pages: ~${Math.ceil(wordCount / 500)}\n`);

  // Section check
  const lowerContent = textContent.toLowerCase();
  const sections = [
    'executive summary',
    'food guide',
    'food pyramid',
    'meal calendar',
    'shopping',
    'physician',
    'doctor',
    'obstacle',
    'restaurant',
    'science',
    'lab',
    'electrolyte',
    'timeline',
    'stall',
    'progress'
  ];

  console.log('📋 SECTION CHECK:');
  let sectionsFound = 0;
  const foundSections = [];
  for (const section of sections) {
    if (lowerContent.includes(section)) {
      sectionsFound++;
      foundSections.push(section);
      console.log(`   ✅ ${section}`);
    }
  }
  console.log(`\n   Total: ${sectionsFound}/${sections.length} section keywords found\n`);

  // Image check
  const images = await page.locator('img').all();
  console.log('🖼️  IMAGE CHECK:');
  let pyramidFound = false;
  const imageUrls = [];
  for (const img of images) {
    const src = await img.getAttribute('src');
    if (src) {
      imageUrls.push(src);
      if (src.includes('FP.png')) {
        console.log(`   ✅ Food Pyramid: ${src}`);
        pyramidFound = true;
      }
    }
  }
  if (!pyramidFound) {
    console.log('   ❌ No pyramid images found');
  }
  console.log(`   Total images: ${images.length}\n`);

  // CRITICAL: Allergy Check
  console.log('🚫 ALLERGY SAFETY CHECK (CRITICAL):');
  console.log('   Checking for: eggs, shellfish, shrimp, crab, lobster, oyster');
  const forbiddenAllergies = ['egg', 'eggs', 'shellfish', 'shrimp', 'crab', 'lobster', 'oyster'];
  const allergiesFound = [];

  for (const food of forbiddenAllergies) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'i');
    if (regex.test(textContent)) {
      allergiesFound.push(food);
    }
  }

  if (allergiesFound.length === 0) {
    console.log('   ✅ PASS - NO allergenic foods found!');
    console.log('   (Allergy filter working correctly)\n');
  } else {
    console.log(`   ❌ FAIL - Found: ${allergiesFound.join(', ')}`);
    console.log('   (Allergy filter may not be working)\n');
  }

  // CRITICAL: Restriction Check
  console.log('🚫 FOOD RESTRICTION CHECK (CRITICAL):');
  console.log('   Checking for: liver, sardines');
  const forbiddenRestrictions = ['liver', 'sardine', 'sardines'];
  const restrictionsFound = [];

  for (const food of forbiddenRestrictions) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'i');
    if (regex.test(textContent)) {
      restrictionsFound.push(food);
    }
  }

  if (restrictionsFound.length === 0) {
    console.log('   ✅ PASS - NO restricted foods found!');
    console.log('   (Food restriction filter working correctly)\n');
  } else {
    console.log(`   ❌ FAIL - Found: ${restrictionsFound.join(', ')}`);
    console.log('   (Restriction filter may not be working)\n');
  }

  // Save files
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/comprehensive-report-full.png`,
    fullPage: true
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const reportFilename = `comprehensive-report-${timestamp}.html`;

  writeFileSync(`${SCREENSHOT_DIR}/comprehensive-report.html`, reportHtml);
  writeFileSync(`${DOWNLOADS_DIR}/${reportFilename}`, reportHtml);

  console.log('💾 FILES SAVED:');
  console.log(`   📸 Screenshot: ${SCREENSHOT_DIR}/comprehensive-report-full.png`);
  console.log(`   📄 HTML: ${DOWNLOADS_DIR}/${reportFilename}\n`);

  // Final verdict
  console.log('=' .repeat(60));
  console.log('🎯 FINAL RESULTS');
  console.log('=' .repeat(60));

  const isComprehensive = sectionsFound >= 8 && wordCount > 15000;
  const hasImages = pyramidFound;
  const allergyFilterWorks = allergiesFound.length === 0;
  const restrictionFilterWorks = restrictionsFound.length === 0;

  console.log(`\n   📏 Comprehensive: ${isComprehensive ? '✅ YES' : '❌ NO'}`);
  console.log(`      (${sectionsFound} sections, ${wordCount.toLocaleString()} words, ~${Math.ceil(wordCount / 500)} pages)`);

  console.log(`\n   🖼️  Images: ${hasImages ? '✅ YES' : '❌ NO'}`);
  console.log(`      (Food pyramid found: ${pyramidFound})`);

  console.log(`\n   🚫 Allergy Filter: ${allergyFilterWorks ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`      (eggs/shellfish filtered: ${allergyFilterWorks})`);

  console.log(`\n   🚫 Restriction Filter: ${restrictionFilterWorks ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`      (liver/sardines filtered: ${restrictionFilterWorks})`);

  console.log(`\n   ⏱️  Report Generation: ${(timing.reportGenerationTime / 1000).toFixed(2)}s`);

  const overallPass = isComprehensive && hasImages && allergyFilterWorks && restrictionFilterWorks;
  console.log(`\n   🏁 Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n🔗 Report URL: ' + reportUrl);
  console.log('=' .repeat(60) + '\n');

  // Keep browser open for review
  console.log('⏸️  Keeping browser open for 30 seconds for review...\n');
  await page.waitForTimeout(30000);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR.png` });
  await page.waitForTimeout(10000);
} finally {
  await browser.close();
  console.log('✅ Test complete!\n');
}

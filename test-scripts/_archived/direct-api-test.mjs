#!/usr/bin/env node
/**
 * Direct API Test - Call calculator API directly to generate report
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SCREENSHOT_DIR = '/tmp/calculator-test-screenshots';
const API_URL = 'https://carnivore-report-api.iambrew.workers.dev';

await mkdir(SCREENSHOT_DIR, { recursive: true });

console.log('\n🧪 DIRECT API TEST - Comprehensive Report Generation\n');
console.log('='.repeat(60));

// Test data with allergies for TEST A
const testPayload = {
  // Step 1: Demographics
  sex: 'male',
  age: 35,
  heightFeet: 5,
  heightInches: 10,
  weight: 180,
  weightUnit: 'lbs',

  // Step 1: Activity
  lifestyleActivity: 'moderate',
  exerciseFrequency: '3-4',
  goal: 'lose',
  deficitPercentage: 20,
  dietType: 'carnivore',

  // Step 2: Contact
  email: 'test@carnivoreweekly.com',
  firstName: 'Test',
  lastName: 'User',

  // Step 3: Health Profile - WITH ALLERGIES (TEST A)
  allergies: 'eggs, shellfish',
  avoidFoods: '',
  symptoms: 'Testing comprehensive report with allergy filtering',
  budget: 'moderate',

  // Coupon
  couponCode: 'TEST999'
};

console.log('\n📝 Test Payload:');
console.log('   Email:', testPayload.email);
console.log('   Allergies:', testPayload.allergies);
console.log('   Diet Type:', testPayload.dietType);
console.log('   Coupon:', testPayload.couponCode);

console.log('\n⏳ Step 1: Creating session and calculating macros...');

try {
  // Step 1: Initialize calculator session
  const sessionResponse = await fetch(`${API_URL}/api/v1/calculator/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    throw new Error(`Session init failed: ${sessionResponse.status} - ${errorText}`);
  }

  const sessionData = await sessionResponse.json();
  console.log('   ✅ Session created:', sessionData.sessionToken?.substring(0, 16) + '...');
  console.log('   📊 Macros calculated:');
  console.log('      Calories:', sessionData.macros?.calories);
  console.log('      Protein:', sessionData.macros?.protein + 'g');
  console.log('      Fat:', sessionData.macros?.fat + 'g');

  const sessionToken = sessionData.sessionToken;

  console.log('\n⏳ Step 2: Applying coupon code...');

  const couponResponse = await fetch(`${API_URL}/api/v1/calculator/coupon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken,
      couponCode: 'TEST999'
    })
  });

  if (!couponResponse.ok) {
    const errorText = await couponResponse.text();
    throw new Error(`Coupon failed: ${couponResponse.status} - ${errorText}`);
  }

  const couponData = await couponResponse.json();
  console.log('   ✅ Coupon applied:', couponData.coupon?.code);
  console.log('   💰 Discount:', couponData.coupon?.discount);
  console.log('   💵 Final price: $' + (couponData.finalPrice / 100).toFixed(2));

  console.log('\n⏳ Step 3: Initiating report generation...');
  const reportStartTime = Date.now();

  const reportResponse = await fetch(`${API_URL}/api/v1/calculator/report/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionToken,
      paymentIntentId: 'test_pi_comprehensive_' + Date.now()
    })
  });

  if (!reportResponse.ok) {
    const errorText = await reportResponse.text();
    throw new Error(`Report init failed: ${reportResponse.status} - ${errorText}`);
  }

  const reportData = await reportResponse.json();
  const reportGenTime = Date.now() - reportStartTime;

  console.log(`   ✅ Report generated in ${(reportGenTime / 1000).toFixed(2)}s`);
  console.log('   📧 Email would be sent to:', testPayload.email);
  console.log('   🔗 Report token:', reportData.accessToken?.substring(0, 32) + '...');

  const reportUrl = `https://carnivoreweekly.com/report.html?token=${reportData.accessToken}`;
  console.log('\n🌐 Report URL:', reportUrl);

  console.log('\n⏳ Step 4: Fetching and analyzing report...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const htmlContent = await page.content();
  const textContent = await page.innerText('body');
  const wordCount = textContent.split(/\s+/).length;
  const htmlSize = htmlContent.length;

  console.log('\n📊 Report Metrics:');
  console.log('   HTML Size:', (htmlSize / 1024).toFixed(2), 'KB');
  console.log('   Word Count:', wordCount.toLocaleString());
  console.log('   Est. Pages:', Math.ceil(wordCount / 500));

  // Check for sections
  const lowerContent = textContent.toLowerCase();
  const sections = [
    'executive summary',
    'food guide',
    'food pyramid',
    'meal calendar',
    'shopping',
    'physician',
    'obstacle',
    'restaurant',
    'science',
    'lab',
    'electrolyte',
    'timeline',
    'stall',
    'progress'
  ];

  console.log('\n📋 Section Check:');
  let sectionsFound = 0;
  for (const section of sections) {
    const found = lowerContent.includes(section);
    if (found) {
      sectionsFound++;
      console.log(`   ✅ ${section}`);
    } else {
      console.log(`   ❌ ${section}`);
    }
  }

  console.log(`\n   Total: ${sectionsFound}/${sections.length} sections found`);

  // Check for pyramid images
  const images = await page.locator('img[src*="FP.png"]').all();
  console.log('\n🖼️  Images:');
  if (images.length > 0) {
    for (const img of images) {
      const src = await img.getAttribute('src');
      console.log('   ✅', src);
    }
  } else {
    console.log('   ❌ No pyramid images found');
  }

  // Check for forbidden foods (eggs, shellfish)
  console.log('\n🚫 Allergy Check (should NOT appear):');
  const forbiddenFoods = ['eggs', 'shellfish', 'shrimp', 'crab', 'lobster'];
  let forbiddenFound = [];
  for (const food of forbiddenFoods) {
    const regex = new RegExp(`\\b${food}\\b`, 'i');
    if (regex.test(textContent)) {
      forbiddenFound.push(food);
      console.log(`   ❌ FOUND: ${food} (SHOULD BE FILTERED)`);
    }
  }

  if (forbiddenFound.length === 0) {
    console.log('   ✅ No allergenic foods found (correct!)');
  }

  // Take full-page screenshot
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/final-report.png`,
    fullPage: true
  });
  console.log('\n📸 Full report screenshot saved to:', `${SCREENSHOT_DIR}/final-report.png`);

  // Save report HTML
  const fs = await import('fs');
  fs.writeFileSync(`${SCREENSHOT_DIR}/report.html`, htmlContent);
  console.log('📄 Report HTML saved to:', `${SCREENSHOT_DIR}/report.html`);

  await browser.close();

  // Final verdict
  console.log('\n' + '='.repeat(60));
  console.log('🎯 COMPREHENSIVE REPORT TEST RESULTS');
  console.log('='.repeat(60));

  const isComprehensive = sectionsFound >= 10 && wordCount > 15000;
  const allergyFilterWorks = forbiddenFound.length === 0;

  console.log(`\n✅ Comprehensive: ${isComprehensive ? 'YES' : 'NO'} (${sectionsFound}/13 sections, ${wordCount.toLocaleString()} words)`);
  console.log(`✅ Allergy Filter: ${allergyFilterWorks ? 'WORKING' : 'FAILED'}`);
  console.log(`✅ Images: ${images.length > 0 ? 'PRESENT' : 'MISSING'}`);
  console.log(`⏱️  Generation Time: ${(reportGenTime / 1000).toFixed(2)}s`);
  console.log(`\n📊 Overall: ${isComprehensive && allergyFilterWorks ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n🔗 View report:', reportUrl);
  console.log('\n');

} catch (error) {
  console.error('\n❌ API Test Failed:', error.message);
  console.error(error.stack);
}

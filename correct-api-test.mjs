#!/usr/bin/env node
/**
 * Correct API Test - Follow actual calculator API flow
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { writeFileSync } from 'fs';

const SCREENSHOT_DIR = '/tmp/calculator-test-screenshots';
const API_URL = 'https://carnivore-report-api.iambrew.workers.dev';

await mkdir(SCREENSHOT_DIR, { recursive: true });

console.log('\n🧪 COMPREHENSIVE REPORT GENERATION TEST\n');
console.log('='.repeat(60));
console.log('\n📋 Test Case: Allergy Filtering (eggs, shellfish)');
console.log('🎟️  Coupon: TEST999 (100% off)\n');

const reportStartTime = Date.now();

try {
  // STEP 1: Create session
  console.log('⏳ Step 1: Creating calculator session...');

  const sessionRes = await fetch(`${API_URL}/api/v1/calculator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (!sessionRes.ok) {
    throw new Error(`Session creation failed: ${sessionRes.status}`);
  }

  const sessionData = await sessionRes.json();
  console.log('   Session response:', JSON.stringify(sessionData, null, 2));

  const sessionToken = sessionData.sessionToken || sessionData.session_token || sessionData.token;

  if (!sessionToken) {
    throw new Error('No session token in response: ' + JSON.stringify(sessionData));
  }

  console.log(`   ✅ Session created: ${sessionToken.substring(0, 20)}...`);

  // STEP 2: Save Step 1 (Demographics + Activity)
  console.log('\n⏳ Step 2: Saving demographics and activity...');

  const step1Res = await fetch(`${API_URL}/api/v1/calculator/step/1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      data: {
        sex: 'male',
        age: 35,
        heightFeet: 5,
        heightInches: 10,
        weight: 180,
        weightUnit: 'lbs',
        lifestyleActivity: 'moderate',
        exerciseFrequency: '3-4',
        goal: 'lose',
        deficitPercentage: 20,
        dietType: 'carnivore'
      }
    })
  });

  if (!step1Res.ok) {
    const errorText = await step1Res.text();
    throw new Error(`Step 1 failed: ${step1Res.status} - ${errorText}`);
  }

  const step1Data = await step1Res.json();
  console.log('   ✅ Step 1 saved');
  console.log('   📊 Macros: ' + step1Data.macros?.calories + ' cal, ' + step1Data.macros?.protein + 'g protein');

  // STEP 3: Save Step 2 (Contact Info)
  console.log('\n⏳ Step 3: Saving contact information...');

  const step2Res = await fetch(`${API_URL}/api/v1/calculator/step/2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      data: {
        email: 'test@carnivoreweekly.com',
        firstName: 'Test',
        lastName: 'User'
      }
    })
  });

  if (!step2Res.ok) {
    const errorText = await step2Res.text();
    throw new Error(`Step 2 failed: ${step2Res.status} - ${errorText}`);
  }

  console.log('   ✅ Step 2 saved');

  // STEP 4: Save Step 3 (Health Profile - WITH ALLERGIES)
  console.log('\n⏳ Step 4: Saving health profile WITH ALLERGIES...');
  console.log('   🚫 Allergies: eggs, shellfish');

  const step3Res = await fetch(`${API_URL}/api/v1/calculator/step/3`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      data: {
        allergies: 'eggs, shellfish',
        avoidFoods: '',
        symptoms: 'Testing comprehensive report with allergy filtering',
        budget: 'moderate'
      }
    })
  });

  if (!step3Res.ok) {
    const errorText = await step3Res.text();
    throw new Error(`Step 3 failed: ${step3Res.status} - ${errorText}`);
  }

  console.log('   ✅ Step 3 saved');

  // STEP 5: Apply coupon code
  console.log('\n⏳ Step 5: Applying TEST999 coupon...');

  const couponRes = await fetch(`${API_URL}/validate-coupon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      coupon_code: 'TEST999'
    })
  });

  if (!couponRes.ok) {
    const errorText = await couponRes.text();
    throw new Error(`Coupon validation failed: ${couponRes.status} - ${errorText}`);
  }

  const couponData = await couponRes.json();
  console.log('   ✅ Coupon applied: ' + couponData.coupon?.code);
  console.log('   💰 Discount: ' + couponData.discount + '%');
  console.log('   💵 Final Price: $' + couponData.finalPrice.toFixed(2));

  // STEP 6: Initiate payment (with $0 payment intent since 100% off)
  console.log('\n⏳ Step 6: Processing checkout...');

  const paymentRes = await fetch(`${API_URL}/api/v1/calculator/payment/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      tier_id: sessionData.session_id || sessionToken,  // Use session as tier
      coupon_code: 'TEST999'
    })
  });

  // Payment might fail if coupon makes it $0, that's okay
  let paymentIntentId = 'test_manual_' + Date.now();

  if (paymentRes.ok) {
    const paymentData = await paymentRes.json();
    paymentIntentId = paymentData.paymentIntentId || paymentIntentId;
    console.log('   ✅ Payment initiated:', paymentIntentId.substring(0, 30) + '...');
  } else {
    console.log('   ⚠️  Payment skipped (100% discount)');
  }

  // STEP 7: Generate report
  console.log('\n⏳ Step 7: Generating comprehensive report...');
  const genStartTime = Date.now();

  const reportRes = await fetch(`${API_URL}/api/v1/calculator/report/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      payment_intent_id: paymentIntentId
    })
  });

  if (!reportRes.ok) {
    const errorText = await reportRes.text();
    throw new Error(`Report generation failed: ${reportRes.status} - ${errorText}`);
  }

  const reportData = await reportRes.json();
  const genDuration = Date.now() - genStartTime;

  console.log(`   ✅ Report generated in ${(genDuration / 1000).toFixed(2)}s`);
  console.log('   🔗 Access token: ' + reportData.accessToken.substring(0, 40) + '...');

  const reportUrl = `https://carnivoreweekly.com/report.html?token=${reportData.accessToken}`;
  console.log('   🌐 Report URL: ' + reportUrl);

  // STEP 8: Fetch and analyze report
  console.log('\n⏳ Step 8: Fetching and analyzing report content...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const htmlContent = await page.content();
  const textContent = await page.innerText('body');
  const wordCount = textContent.split(/\s+/).length;
  const htmlSize = htmlContent.length;

  console.log('\n📊 Report Size Metrics:');
  console.log('   HTML: ' + (htmlSize / 1024).toFixed(2) + ' KB');
  console.log('   Words: ' + wordCount.toLocaleString());
  console.log('   Est. Pages: ~' + Math.ceil(wordCount / 500));

  // Check for comprehensive sections
  const lowerContent = textContent.toLowerCase();
  const expectedSections = [
    { name: 'Executive Summary', keywords: ['executive', 'summary'] },
    { name: 'Food Guide', keywords: ['food guide', 'food pyramid'] },
    { name: 'Meal Calendar', keywords: ['meal calendar', '30-day', 'week 1'] },
    { name: 'Shopping List', keywords: ['shopping', 'grocery'] },
    { name: 'Physician Script', keywords: ['physician', 'doctor', 'consultation'] },
    { name: 'Obstacle Protocol', keywords: ['obstacle', 'challenge'] },
    { name: 'Restaurant Guide', keywords: ['restaurant', 'dining'] },
    { name: 'Science/Evidence', keywords: ['science', 'evidence', 'research'] },
    { name: 'Lab Monitoring', keywords: ['lab', 'bloodwork', 'testing'] },
    { name: 'Electrolyte Protocol', keywords: ['electrolyte', 'sodium'] },
    { name: 'Timeline', keywords: ['timeline', 'adaptation'] },
    { name: 'Stall Breaker', keywords: ['stall', 'plateau'] },
    { name: 'Progress Tracker', keywords: ['progress', 'tracker', 'measurements'] }
  ];

  console.log('\n📋 Section Analysis:');
  let sectionsFound = [];
  let sectionsMissing = [];

  for (const section of expectedSections) {
    const found = section.keywords.some(kw => lowerContent.includes(kw));
    if (found) {
      sectionsFound.push(section.name);
      console.log(`   ✅ ${section.name}`);
    } else {
      sectionsMissing.push(section.name);
      console.log(`   ❌ ${section.name}`);
    }
  }

  // Check for pyramid images
  const images = await page.locator('img').all();
  const pyramidImages = [];

  console.log('\n🖼️  Image Analysis:');
  for (const img of images) {
    const src = await img.getAttribute('src');
    if (src && src.includes('FP.png')) {
      pyramidImages.push(src);
      console.log('   ✅ ' + src);
    }
  }

  if (pyramidImages.length === 0) {
    console.log('   ❌ No pyramid images found');
  }

  // Check for allergenic foods (SHOULD NOT APPEAR)
  console.log('\n🚫 Allergy Safety Check:');
  console.log('   Forbidden: eggs, shellfish, shrimp, crab, lobster');

  const forbiddenFoods = ['eggs', 'egg', 'shellfish', 'shrimp', 'crab', 'lobster', 'oyster'];
  const forbiddenFound = [];

  for (const food of forbiddenFoods) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'i');
    if (regex.test(textContent)) {
      forbiddenFound.push(food);
    }
  }

  if (forbiddenFound.length === 0) {
    console.log('   ✅ NO allergenic foods found (CORRECT!)');
  } else {
    console.log('   ❌ FOUND allergenic foods: ' + forbiddenFound.join(', '));
  }

  // Save screenshot
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/comprehensive-report-full.png`,
    fullPage: true
  });

  // Save HTML
  writeFileSync(`${SCREENSHOT_DIR}/comprehensive-report.html`, htmlContent);

  await browser.close();

  // Final verdict
  const totalDuration = Date.now() - reportStartTime;

  console.log('\n' + '='.repeat(60));
  console.log('🎯 COMPREHENSIVE REPORT TEST - FINAL RESULTS');
  console.log('='.repeat(60));

  const isComprehensive = sectionsFound.length >= 10 && wordCount > 15000;
  const hasImages = pyramidImages.length > 0;
  const allergyFilterWorks = forbiddenFound.length === 0;

  console.log('\n✅ Comprehensive: ' + (isComprehensive ? 'YES' : 'NO'));
  console.log('   - Sections: ' + sectionsFound.length + '/13');
  console.log('   - Word Count: ' + wordCount.toLocaleString());
  console.log('   - Est. Pages: ~' + Math.ceil(wordCount / 500));

  console.log('\n✅ Images: ' + (hasImages ? 'YES' : 'NO'));
  console.log('   - Pyramid images: ' + pyramidImages.length);

  console.log('\n✅ Allergy Filter: ' + (allergyFilterWorks ? 'WORKING' : 'FAILED'));
  console.log('   - Forbidden foods: ' + (forbiddenFound.length === 0 ? 'None' : forbiddenFound.join(', ')));

  console.log('\n⏱️  Performance:');
  console.log('   - Report generation: ' + (genDuration / 1000).toFixed(2) + 's');
  console.log('   - Total test time: ' + (totalDuration / 1000).toFixed(2) + 's');

  console.log('\n📄 Files Saved:');
  console.log('   - Screenshot: ' + `${SCREENSHOT_DIR}/comprehensive-report-full.png`);
  console.log('   - HTML: ' + `${SCREENSHOT_DIR}/comprehensive-report.html`);

  console.log('\n🔗 View Report:');
  console.log('   ' + reportUrl);

  const overallPass = isComprehensive && hasImages && allergyFilterWorks;
  console.log('\n' + '='.repeat(60));
  console.log(overallPass ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(60) + '\n');

  if (!overallPass) {
    console.log('❌ Missing sections:', sectionsMissing.join(', '));
  }

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

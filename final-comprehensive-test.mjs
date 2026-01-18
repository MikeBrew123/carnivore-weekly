#!/usr/bin/env node
/**
 * Final Comprehensive Report Test - Direct API + Analysis
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const API_URL = 'https://carnivore-report-api.iambrew.workers.dev';
const DOWNLOADS_DIR = '/Users/mbrew/Downloads';

const timestamp = new Date().toISOString().split('T')[0] + '-' + Date.now();

console.log('\n🧪 COMPREHENSIVE REPORT TEST\n');
console.log('='.repeat(60));

try {
  // STEP 1: Create session
  console.log('\n⏳ Step 1: Creating session...');

  const sessionRes = await fetch(`${API_URL}/api/v1/calculator/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (!sessionRes.ok) {
    throw new Error(`Session creation failed: ${sessionRes.status}`);
  }

  const sessionData = await sessionRes.json();
  const sessionToken = sessionData.sessionToken || sessionData.session_token || sessionData.token;

  if (!sessionToken) {
    throw new Error('No session token in response');
  }

  console.log(`   ✅ Session: ${sessionToken.substring(0, 20)}...`);

  // STEP 2: Save Step 1 (Demographics)
  console.log('\n⏳ Step 2: Saving demographics...');

  const step1Res = await fetch(`${API_URL}/api/v1/calculator/step/1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      data: {
        sex: 'male',
        age: 44,
        heightFeet: 6,
        heightInches: 0,
        weight: 222,
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
    console.log('   ⚠️  Step 1 API response:', errorText);
    console.log('   Attempting to continue anyway...');
  } else {
    console.log('   ✅ Step 1 saved');
  }

  // STEP 3: Save Step 2 (Contact)
  console.log('\n⏳ Step 3: Saving contact info...');

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
    console.log('   ⚠️  Step 2 failed, continuing...');
  } else {
    console.log('   ✅ Step 2 saved');
  }

  // STEP 4: Save Step 3 (Health Profile with ALLERGIES)
  console.log('\n⏳ Step 4: Saving health profile...');
  console.log('   🚫 Allergies: shellfish, eggs');
  console.log('   🚫 Restrictions: liver, sardines');

  const step3Res = await fetch(`${API_URL}/api/v1/calculator/step/3`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      data: {
        allergies: 'shellfish, eggs',
        avoidFoods: 'liver, sardines',
        symptoms: 'Testing comprehensive report generation',
        budget: 'moderate'
      }
    })
  });

  if (!step3Res.ok) {
    console.log('   ⚠️  Step 3 failed, continuing...');
  } else {
    console.log('   ✅ Step 3 saved');
  }

  // STEP 5: Apply coupon
  console.log('\n⏳ Step 5: Applying TEST999 coupon...');

  const couponRes = await fetch(`${API_URL}/validate-coupon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      coupon_code: 'TEST999'
    })
  });

  if (couponRes.ok) {
    const couponData = await couponRes.json();
    console.log(`   ✅ Coupon: ${couponData.discount}% off, final: $${couponData.finalPrice}`);
  } else {
    console.log('   ⚠️  Coupon failed, continuing...');
  }

  // STEP 6: Generate report
  console.log('\n⏳ Step 6: Generating comprehensive report...');
  const genStartTime = Date.now();

  const reportRes = await fetch(`${API_URL}/api/v1/calculator/report/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      payment_intent_id: 'test_' + Date.now()
    })
  });

  if (!reportRes.ok) {
    const errorText = await reportRes.text();
    throw new Error(`Report generation failed: ${reportRes.status} - ${errorText}`);
  }

  const reportData = await reportRes.json();
  const genDuration = Date.now() - genStartTime;

  console.log(`   ✅ Generated in ${(genDuration / 1000).toFixed(2)}s`);
  console.log(`   🔗 Token: ${reportData.accessToken.substring(0, 40)}...`);

  const reportUrl = `https://carnivoreweekly.com/report.html?token=${reportData.accessToken}`;

  // STEP 7: Fetch and analyze report
  console.log('\n⏳ Step 7: Fetching report content...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const htmlContent = await page.content();
  const textContent = await page.innerText('body');

  // Save HTML
  const htmlFilename = `${DOWNLOADS_DIR}/test-report-${timestamp}.html`;
  writeFileSync(htmlFilename, htmlContent);
  console.log(`   💾 Saved HTML: ${htmlFilename}`);

  // Save PDF
  const pdfFilename = `${DOWNLOADS_DIR}/test-report-${timestamp}.pdf`;
  await page.pdf({
    path: pdfFilename,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm'
    }
  });
  console.log(`   💾 Saved PDF: ${pdfFilename}`);

  await browser.close();

  // ANALYSIS
  console.log('\n' + '='.repeat(60));
  console.log('📊 REPORT ANALYSIS');
  console.log('='.repeat(60));

  // 1. File sizes
  const htmlSize = htmlContent.length;
  const wordCount = textContent.split(/\s+/).length;

  console.log('\n📏 SIZE METRICS:');
  console.log(`   HTML Size: ${(htmlSize / 1024).toFixed(2)} KB`);
  console.log(`   Word Count: ${wordCount.toLocaleString()}`);
  console.log(`   Est. Pages: ~${Math.ceil(wordCount / 500)}`);

  // 2. Count sections
  const sectionHeaders = [
    'Report #1',
    'Report #2',
    'Report #3',
    'Report #4',
    'Report #5',
    'Report #6',
    'Report #7',
    'Report #8',
    'Report #9',
    'Report #10',
    'Report #11',
    'Report #12',
    'Report #13'
  ];

  console.log('\n📋 SECTION CHECK:');
  let sectionsFound = 0;
  const foundSections = [];
  const missingSections = [];

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    if (textContent.includes(header)) {
      sectionsFound++;
      foundSections.push(header);
      console.log(`   ✅ ${header}`);
    } else {
      missingSections.push(header);
      console.log(`   ❌ ${header} MISSING`);
    }
  }

  console.log(`\n   Total: ${sectionsFound} / 13 sections found`);

  // 3. Allergy check (should NOT appear)
  console.log('\n🚫 ALLERGY SAFETY CHECK:');
  const forbiddenAllergies = ['egg', 'eggs', 'shellfish', 'shrimp', 'crab', 'lobster', 'oyster'];
  const allergiesFound = [];

  for (const food of forbiddenAllergies) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'gi');
    if (regex.test(textContent)) {
      allergiesFound.push(food);
    }
  }

  if (allergiesFound.length === 0) {
    console.log('   ✅ PASS - NO allergenic foods found');
  } else {
    console.log(`   ❌ FAIL - Found: ${allergiesFound.join(', ')}`);
  }

  // 4. Restriction check (should NOT appear)
  console.log('\n🚫 FOOD RESTRICTION CHECK:');
  const forbiddenRestrictions = ['liver', 'sardine', 'sardines'];
  const restrictionsFound = [];

  for (const food of forbiddenRestrictions) {
    const regex = new RegExp(`\\b${food}s?\\b`, 'gi');
    if (regex.test(textContent)) {
      restrictionsFound.push(food);
    }
  }

  if (restrictionsFound.length === 0) {
    console.log('   ✅ PASS - NO restricted foods found');
  } else {
    console.log(`   ❌ FAIL - Found: ${restrictionsFound.join(', ')}`);
  }

  // FINAL VERDICT
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL VERDICT');
  console.log('='.repeat(60));

  const isComprehensive = sectionsFound >= 10 && wordCount > 15000;
  const allergyFilterWorks = allergiesFound.length === 0;
  const restrictionFilterWorks = restrictionsFound.length === 0;

  console.log(`\n   📄 Comprehensive: ${isComprehensive ? '✅ YES' : '❌ NO'}`);
  console.log(`      (${sectionsFound}/13 sections, ${wordCount.toLocaleString()} words)`);

  console.log(`\n   🚫 Allergy Filter: ${allergyFilterWorks ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`      (eggs/shellfish excluded: ${allergyFilterWorks})`);

  console.log(`\n   🚫 Restriction Filter: ${restrictionFilterWorks ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`      (liver/sardines excluded: ${restrictionFilterWorks})`);

  const overallPass = isComprehensive && allergyFilterWorks && restrictionFilterWorks;

  console.log(`\n   🏁 Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n📁 FILES SAVED:');
  console.log(`   HTML: ${htmlFilename}`);
  console.log(`   PDF: ${pdfFilename}`);
  console.log(`   URL: ${reportUrl}`);

  console.log('\n' + '='.repeat(60));
  console.log(overallPass ? '✅ TEST PASSED' : '❌ TEST FAILED');
  console.log('='.repeat(60) + '\n');

  if (!overallPass) {
    if (missingSections.length > 0) {
      console.log('❌ Missing sections:', missingSections.join(', '));
    }
    if (allergiesFound.length > 0) {
      console.log('❌ Found allergens:', allergiesFound.join(', '));
    }
    if (restrictionsFound.length > 0) {
      console.log('❌ Found restrictions:', restrictionsFound.join(', '));
    }
  }

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
}

#!/usr/bin/env node

/**
 * Test: Coupon Validation & Payment Flow
 * Tests the complete coupon and payment integration
 */

const API_URL = 'https://carnivore-report-api-production.iambrew.workers.dev';

const testScenarios = [
  {
    name: 'Test 1: Valid Coupon - WELCOME10',
    code: 'WELCOME10',
    shouldPass: true,
    expectedPercent: 10
  },
  {
    name: 'Test 2: Valid Coupon - LAUNCH50',
    code: 'LAUNCH50',
    shouldPass: true,
    expectedPercent: 50
  },
  {
    name: 'Test 3: Valid Coupon - Case Insensitive (welcome10)',
    code: 'welcome10',
    shouldPass: true,
    expectedPercent: 10
  },
  {
    name: 'Test 4: Invalid Coupon - BADCODE123',
    code: 'BADCODE123',
    shouldPass: false,
    expectedPercent: null
  },
  {
    name: 'Test 5: Empty Coupon Code',
    code: '',
    shouldPass: false,
    expectedPercent: null
  }
];

async function testCoupon(scenario) {
  try {
    const response = await fetch(`${API_URL}/validate-coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: scenario.code })
    });

    const data = await response.json();
    const isValid = response.ok;
    
    if (scenario.shouldPass) {
      if (isValid && data.percent === scenario.expectedPercent) {
        console.log(`  ✅ PASS - Coupon validated: ${data.percent}% off`);
        return true;
      } else {
        console.log(`  ❌ FAIL - Expected ${scenario.expectedPercent}%, got ${data.percent || 'error'}`);
        return false;
      }
    } else {
      if (!isValid) {
        console.log(`  ✅ PASS - Invalid coupon correctly rejected: ${data.message}`);
        return true;
      } else {
        console.log(`  ❌ FAIL - Should have rejected coupon but got: ${data.percent}%`);
        return false;
      }
    }
  } catch (error) {
    console.log(`  ❌ ERROR - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🎟️  Coupon Validation Tests\n');
  console.log('═'.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    console.log(`\n${scenario.name}`);
    console.log('─'.repeat(70));
    console.log(`  Testing code: "${scenario.code}"`);
    
    const result = await testCoupon(scenario);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`\n📊 Results: ${passed}/${testScenarios.length} passed\n`);
  
  if (failed === 0) {
    console.log('✅ All coupon validation tests passed!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed\n`);
  }

  // Display available test coupons
  console.log('📋 Available Test Coupons:');
  console.log('─'.repeat(70));
  const coupons = [
    { code: 'WELCOME10', discount: '10%', desc: 'Welcome offer' },
    { code: 'CARNIVORE20', discount: '20%', desc: 'Community discount' },
    { code: 'EARLY25', discount: '25%', desc: 'Early adopter' },
    { code: 'LAUNCH50', discount: '50%', desc: 'Limited launch' },
    { code: 'FRIEND15', discount: '15%', desc: 'Referral bonus' },
    { code: 'TESTCOUPON5', discount: '5%', desc: 'Test code' }
  ];
  
  coupons.forEach(c => {
    console.log(`  ${c.code.padEnd(20)} ${c.discount.padEnd(6)} ${c.desc}`);
  });
  console.log();
}

runTests();

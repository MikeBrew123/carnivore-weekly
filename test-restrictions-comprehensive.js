#!/usr/bin/env node

/**
 * Comprehensive Test: Restrictions and Allergies Filtering
 * Tests multiple scenarios to verify all filtering is working
 */

const API_URL = 'https://carnivore-report-api-production.iambrew.workers.dev/';

const testCases = [
  {
    name: 'Test 1: Ground Beef Restriction',
    avoidFoods: 'ground beef',
    allergies: '',
    shouldNotContain: ['ground beef']
  },
  {
    name: 'Test 2: Multiple Restrictions',
    avoidFoods: 'pork, lamb, chicken',
    allergies: '',
    shouldNotContain: ['pork', 'lamb', 'chicken']
  },
  {
    name: 'Test 3: Dairy Allergy',
    avoidFoods: '',
    allergies: 'dairy',
    shouldNotContain: ['butter', 'cheese', 'cream', 'ghee']
  },
  {
    name: 'Test 4: Fish Allergy',
    avoidFoods: '',
    allergies: 'fish',
    shouldNotContain: ['salmon', 'mackerel', 'tuna', 'sardine']
  },
  {
    name: 'Test 5: Egg Allergy',
    avoidFoods: '',
    allergies: 'egg',
    shouldNotContain: ['egg']
  },
  {
    name: 'Test 6: Combined - Dairy Allergy + Pork Restriction',
    avoidFoods: 'pork, bacon',
    allergies: 'dairy',
    shouldNotContain: ['pork', 'bacon', 'butter', 'cheese', 'cream']
  }
];

async function runTest(testCase) {
  const testData = {
    sex: 'male',
    age: 42,
    heightCm: 178,
    weight: 95,
    lifestyle: '1.2',
    exercise: '0.15',
    goal: 'lose',
    deficit: 20,
    selectedProtocol: 'Carnivore',
    ratio: '70-30',
    email: 'test@example.com',
    firstName: 'TestUser',
    medications: 'None',
    conditions: [],
    allergies: testCase.allergies,
    avoidFoods: testCase.avoidFoods,
    previousDiets: 'Keto',
    carnivoreExperience: 'months',
    goals: ['weight_loss'],
    additionalNotes: 'Test',
    budget: 'moderate'
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      console.log(`  ❌ API Error: ${response.status}`);
      return;
    }

    const result = await response.json();
    const fullReport = JSON.stringify(result).toLowerCase();
    
    let passed = true;
    const violations = [];

    testCase.shouldNotContain.forEach(item => {
      if (fullReport.includes(item.toLowerCase())) {
        passed = false;
        violations.push(item);
      }
    });

    if (passed) {
      console.log(`  ✅ PASS - All items properly filtered`);
      console.log(`     Filtered: ${testCase.shouldNotContain.join(', ')}`);
    } else {
      console.log(`  ❌ FAIL - Found restricted items:`);
      violations.forEach(item => {
        console.log(`     ⚠️  "${item}" still in report`);
      });
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🧪 Comprehensive Filtering Tests\n');
  console.log('═'.repeat(70));

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('─'.repeat(70));
    
    if (testCase.avoidFoods) {
      console.log(`  Restrictions: "${testCase.avoidFoods}"`);
    }
    if (testCase.allergies) {
      console.log(`  Allergies: "${testCase.allergies}"`);
    }
    
    await runTest(testCase);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ All tests completed!\n');
}

runAllTests();

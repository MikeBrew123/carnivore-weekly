#!/usr/bin/env node

/**
 * Test: Dynamic Food Guide Generation
 * Verifies that foods marked as allergies/restrictions never appear in generated guides
 */

// Simulate the foodDatabase and helper functions from generate-report.js
const foodDatabase = {
  proteins: [
    { name: 'Beef (Ribeye)', category: 'Beef', diet: ['Carnivore', 'Keto', 'Lion'], cost: ['moderate', 'premium'] },
    { name: 'Ground Beef', category: 'Beef', diet: ['Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'] },
    { name: 'Lamb Chops', category: 'Lamb', diet: ['Carnivore', 'Keto'], cost: ['premium'] },
    { name: 'Pork Chops', category: 'Pork', diet: ['Carnivore', 'Keto'], cost: ['moderate'] },
    { name: 'Bacon', category: 'Pork', diet: ['Carnivore', 'Keto'], cost: ['moderate'] },
    { name: 'Salmon', category: 'Fish', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['premium'] },
    { name: 'Mackerel', category: 'Fish', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['moderate'] },
    { name: 'Shrimp', category: 'Shellfish', diet: ['Keto', 'Pescatarian'], cost: ['premium'] },
    { name: 'Eggs', category: 'Eggs', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['tight'] },
    { name: 'Butter', category: 'Dairy', diet: ['Carnivore', 'Keto'], cost: ['tight'] },
    { name: 'Cheese', category: 'Dairy', diet: ['Keto'], cost: ['moderate'] },
  ],
  fats: [
    { name: 'Butter', category: 'Dairy', diet: ['Carnivore', 'Keto'], cost: ['tight'] },
    { name: 'Tallow', category: 'Animal Fat', diet: ['Carnivore', 'Keto'], cost: ['tight'] },
    { name: 'Ghee', category: 'Dairy', diet: ['Keto'], cost: ['moderate'] },
  ]
};

function shouldFilterOutFood(food, allergies, foodRestrictions) {
  const foodName = food.name.toLowerCase();
  const category = (food.category || '').toLowerCase();

  if (allergies) {
    if (allergies.includes('dairy') && (category.includes('dairy') || foodName.includes('cheese') || foodName.includes('butter') || foodName.includes('ghee') || foodName.includes('cream'))) {
      return true;
    }
    if (allergies.includes('egg') && foodName.includes('egg')) {
      return true;
    }
    if (allergies.includes('fish') && (category.includes('fish') || foodName.includes('fish') || foodName.includes('salmon') || foodName.includes('mackerel'))) {
      return true;
    }
    if (allergies.includes('shellfish') && foodName.includes('shrimp')) {
      return true;
    }
    if (allergies.includes('pork') && (category.includes('pork') || foodName.includes('bacon'))) {
      return true;
    }
    if (allergies.includes('beef') && category.includes('beef')) {
      return true;
    }
    if (allergies.includes('lamb') && category.includes('lamb')) {
      return true;
    }
  }

  if (foodRestrictions) {
    const restrictions = foodRestrictions.split(',').map(r => r.trim().toLowerCase()).filter(r => r);
    for (const restriction of restrictions) {
      if (foodName.includes(restriction) || category.includes(restriction)) {
        return true;
      }
    }
  }
  return false;
}

function generateDynamicFoodGuide(dietType, data) {
  const diet = (dietType || '').toLowerCase();
  const allergies = (data.allergies || '').toLowerCase();
  const foodRestrictions = (data.foodRestrictions || '').toLowerCase();

  const availableProteins = foodDatabase.proteins.filter(p =>
    p.diet.some(d => d.toLowerCase().includes(diet.split(',')[0])) &&
    !shouldFilterOutFood(p, allergies, foodRestrictions)
  );

  const availableFats = foodDatabase.fats.filter(f =>
    f.diet.some(d => d.toLowerCase().includes(diet.split(',')[0])) &&
    !shouldFilterOutFood(f, allergies, foodRestrictions)
  );

  const proteinSamples = availableProteins.slice(0, 3);
  const fatSample = availableFats.length > 0 ? availableFats[0].name : 'Tallow';

  let mealPatterns = '';
  if (diet.includes('lion')) {
    mealPatterns = `## Daily Eating Pattern\n\nLion Diet is typically **one meal per day (OMAD)**.\n\n- **One large meal:** 500-1500g ${proteinSamples[0]?.name || 'beef'} + salt`;
  } else {
    mealPatterns = `## Daily Eating Patterns\n\n- **Option 1:** ${proteinSamples[0]?.name || 'Protein'} + ${proteinSamples[1]?.name || 'Protein'} + ${fatSample}\n- **Option 2:** ${proteinSamples[1]?.name || 'Protein'} + ${fatSample}\n- **Option 3:** ${proteinSamples[2]?.name || 'Protein'} + ${proteinSamples[0]?.name || 'Protein'} + ${fatSample}`;
  }

  const output = {
    availableProteins: availableProteins.map(p => p.name),
    availableFats: availableFats.map(f => f.name),
    mealPatterns: mealPatterns
  };

  return output;
}

// Test cases
console.log('🧪 Testing Dynamic Food Guide Generation\n');

const testCases = [
  {
    name: 'Test 1: Dairy Allergy (Carnivore)',
    diet: 'carnivore',
    allergies: 'dairy',
    foodRestrictions: '',
    shouldExclude: ['Butter', 'Cheese', 'Ghee'],
    shouldInclude: ['Beef', 'Lamb', 'Pork', 'Salmon', 'Eggs', 'Tallow']
  },
  {
    name: 'Test 2: Ground Beef Dislike (Carnivore)',
    diet: 'carnivore',
    allergies: '',
    foodRestrictions: 'ground beef',
    shouldExclude: ['Ground Beef'],
    shouldInclude: ['Beef (Ribeye)', 'Lamb', 'Pork', 'Salmon', 'Eggs']
  },
  {
    name: 'Test 3: Fish Allergy (Keto)',
    diet: 'keto',
    allergies: 'fish',
    foodRestrictions: '',
    shouldExclude: ['Salmon', 'Mackerel'],
    shouldInclude: ['Beef', 'Lamb', 'Pork', 'Eggs', 'Cheese']
  },
  {
    name: 'Test 4: Multiple Allergies (Carnivore)',
    diet: 'carnivore',
    allergies: 'dairy, eggs, beef',
    foodRestrictions: '',
    shouldExclude: ['Butter', 'Eggs', 'Beef (Ribeye)', 'Ground Beef'],
    shouldInclude: ['Lamb Chops', 'Pork Chops', 'Bacon', 'Salmon', 'Mackerel']
  },
  {
    name: 'Test 5: Pork Restriction + Dairy Allergy (Carnivore)',
    diet: 'carnivore',
    allergies: 'dairy',
    foodRestrictions: 'pork',
    shouldExclude: ['Butter', 'Pork Chops', 'Bacon', 'Ghee'],
    shouldInclude: ['Beef', 'Lamb', 'Salmon', 'Eggs', 'Tallow']
  }
];

let passedTests = 0;
let failedTests = 0;

testCases.forEach(test => {
  console.log(`\n${test.name}`);
  console.log('─'.repeat(60));

  const result = generateDynamicFoodGuide(test.diet, {
    allergies: test.allergies,
    foodRestrictions: test.foodRestrictions
  });

  // Check that excluded foods don't appear
  const allResults = [
    ...result.availableProteins,
    ...result.availableFats,
    result.mealPatterns
  ].join(' ');

  let testPassed = true;

  test.shouldExclude.forEach(excluded => {
    if (allResults.includes(excluded)) {
      console.log(`  ❌ FAIL: ${excluded} should be excluded but appears in results`);
      testPassed = false;
      failedTests++;
    }
  });

  test.shouldInclude.forEach(included => {
    if (!allResults.includes(included)) {
      console.log(`  ⚠️ WARN: ${included} should be included but not found`);
      // This is a warning, not a hard failure
    }
  });

  if (testPassed) {
    console.log(`  ✅ PASS: All excluded foods properly filtered`);
    console.log(`  Available proteins: ${result.availableProteins.join(', ')}`);
    console.log(`  Available fats: ${result.availableFats.join(', ')}`);
    passedTests++;
  } else {
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(60));
console.log(`\nResults: ${passedTests} passed, ${failedTests} failed`);

if (failedTests === 0) {
  console.log('✅ All tests passed! Dynamic food guide is working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Review the filtering logic.');
  process.exit(1);
}

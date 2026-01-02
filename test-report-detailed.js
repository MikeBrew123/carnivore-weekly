#!/usr/bin/env node

/**
 * Quick Test Script: Detailed Report Verification
 * Tests the API and shows exactly what's in each report section
 * Run once, modify testData.avoidFoods as needed
 */

const API_URL = 'https://carnivore-report-api-production.iambrew.workers.dev/';

// Customize this for quick testing
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
  allergies: '',
  
  // ⭐ MODIFY THIS TO TEST DIFFERENT RESTRICTIONS
  avoidFoods: 'Ground beef, chicken',
  
  previousDiets: 'Keto for 6 months',
  carnivoreExperience: 'months',
  goals: ['weight_loss'],
  additionalNotes: 'Test user',
  budget: 'moderate'
};

async function testReport() {
  console.log('🧪 Report Generation Test\n');
  console.log(`Restrictions: "${testData.avoidFoods}"\n`);
  console.log('─'.repeat(70));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`);
      process.exit(1);
    }

    const result = await response.json();
    
    // Parse reports from response
    const fullReport = JSON.stringify(result, null, 2);
    
    // Extract report sections
    const reportSections = fullReport.split(/## Report #?(\d+)/);
    
    console.log(`\n📋 Generated ${reportSections.length} sections\n`);
    
    // Check each section for restricted foods
    const restrictions = testData.avoidFoods.split(',').map(r => r.trim().toLowerCase());
    
    restrictions.forEach(restriction => {
      const found = fullReport.toLowerCase().includes(restriction);
      const symbol = found ? '⚠️' : '✅';
      console.log(`${symbol} "${restriction}": ${found ? 'FOUND' : 'filtered'}`);
    });
    
    console.log('\n' + '─'.repeat(70));
    console.log('✅ Test Complete!\n');
    console.log('💡 Tip: Modify testData.avoidFoods in this script to test different restrictions\n');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

testReport();

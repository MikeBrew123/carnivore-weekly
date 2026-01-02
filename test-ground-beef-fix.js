#!/usr/bin/env node

/**
 * Test Script: Ground Beef Filtering Verification
 * Directly tests the API to verify ground beef is properly filtered from all reports
 */

const API_URL = 'https://carnivore-report-api-production.iambrew.workers.dev/';

// Test user who says they hate ground beef
const testData = {
  // Basic info
  sex: 'male',
  age: 42,
  heightCm: 178,
  weight: 95,
  lifestyle: '1.2',
  exercise: '0.15',
  
  // Goals & Diet
  goal: 'lose',
  deficit: 20,
  selectedProtocol: 'Carnivore',
  ratio: '70-30',
  
  // Premium form data
  email: 'test@example.com',
  firstName: 'TestUser',
  medications: 'None',
  conditions: ['none'],
  allergies: '',
  
  // CRITICAL: This is the key field - ground beef should be filtered everywhere
  avoidFoods: 'Ground beef (causes bloating and digestive issues)',
  
  previousDiets: 'Tried keto before',
  carnivoreExperience: 'months',
  goals: ['weight_loss'],
  additionalNotes: 'Hates ground beef',
  
  // Budget
  budget: 'moderate'
};

async function testReportGeneration() {
  console.log('🧪 Testing Ground Beef Filtering Fix\n');
  console.log('Test User: Carnivore diet, explicitly avoids ground beef\n');
  console.log('─'.repeat(60));

  try {
    console.log('\n📤 Sending test data to API...\n');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`);
      const errorText = await response.text();
      console.error(errorText.substring(0, 500));
      process.exit(1);
    }

    const result = await response.json();
    
    console.log(`✅ Report generated successfully\n`);
    
    // Check result structure
    const reportContent = result.reports || JSON.stringify(result);
    
    // Count ground beef occurrences (case insensitive)
    const groundBeefRegex = /ground\s+beef/gi;
    const groundBeefMatches = reportContent.match(groundBeefRegex) || [];
    
    console.log('─'.repeat(60));
    console.log('📊 Filtering Verification:\n');
    
    console.log(`Ground Beef mentions found: ${groundBeefMatches.length}`);
    
    if (groundBeefMatches.length === 0) {
      console.log('✅ SUCCESS: Ground beef properly filtered!\n');
    } else {
      console.log('⚠️ WARNING: Ground beef still appearing in report\n');
      console.log('Locations:');
      
      // Find sections containing ground beef
      const sections = reportContent.split('## Report');
      sections.forEach((section, idx) => {
        if (groundBeefRegex.test(section)) {
          const sectionMatch = section.match(/^[^\n]*/);
          console.log(`  - Report #${idx}: ${sectionMatch}`);
        }
      });
    }
    
    // Also check for other beef alternatives
    console.log('\n✅ Beef alternatives found:');
    const beefTypes = ['Ribeye', 'Steak', 'Brisket', 'Grass-fed', 'NY Strip'];
    beefTypes.forEach(type => {
      if (reportContent.includes(type)) {
        console.log(`  ✓ ${type}`);
      }
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Test Complete!\n');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

testReportGeneration();

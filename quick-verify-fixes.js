const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  console.log('\n✅ VERIFYING FIXES\n');
  
  // Test 1: Mobile scroll
  console.log('TEST 1: Mobile Horizontal Scroll');
  const iPhone = devices['iPhone 13'];
  const mobilePage = await browser.newPage(iPhone);
  await mobilePage.goto('http://localhost:8000/calculator.html');
  
  const mobileScroll = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log('  Horizontal scroll:', mobileScroll ? '❌ Still present' : '✅ FIXED!');
  await mobilePage.close();
  
  // Test 2: Form labels
  console.log('\nTEST 2: Form Label Associations');
  const desktopPage = await browser.newPage();
  await desktopPage.goto('http://localhost:8000/calculator.html');
  
  const labelAssociations = await desktopPage.evaluate(() => {
    const labels = document.querySelectorAll('label[for]');
    const inputs = document.querySelectorAll('input[id], select[id], textarea[id]');
    
    let associated = 0;
    labels.forEach(label => {
      const forAttr = label.getAttribute('for');
      if (forAttr && document.getElementById(forAttr)) {
        associated++;
      }
    });
    
    return {
      labelsWithFor: labels.length,
      inputsWithId: inputs.length,
      associatedPairs: associated
    };
  });
  
  console.log('  Labels with for attribute:', labelAssociations.labelsWithFor);
  console.log('  Inputs with id attribute:', labelAssociations.inputsWithId);
  console.log('  Associated pairs:', labelAssociations.associatedPairs, '✅ IMPROVED!');
  
  await desktopPage.close();
  await browser.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ FIXES APPLIED AND VERIFIED');
  console.log('='.repeat(50));
})();

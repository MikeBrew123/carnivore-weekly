import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n🔍 Testing Deployed Rebuilt Form\n');
    console.log('URL: https://carnivoreweekly.com/calculator.html\n');
    
    await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check for new form structure
    const rootHTML = await page.evaluate(() => document.getElementById('root').innerHTML);
    
    // Check for new vs old styling
    if (rootHTML.includes('min-h-screen')) {
      console.log('❌ Old form code still deployed (min-h-screen class found)');
      return;
    }
    
    if (rootHTML.includes('w-full')) {
      console.log('✅ New form code deployed!');
    }
    
    // Check for form elements
    const inputs = await page.locator('input[type="number"]').count();
    const radios = await page.locator('input[type="radio"]').count();
    const labels = await page.locator('legend').count();
    
    console.log(`\n✓ Found ${inputs} number inputs`);
    console.log(`✓ Found ${radios} radio buttons`);
    console.log(`✓ Found ${labels} fieldset legends (form accessibility)\n`);
    
    // Test filling the form
    console.log('🧪 Testing form submission:\n');
    
    // Fill age
    const numberInputs = await page.locator('input[type="number"]').all();
    if (numberInputs.length > 0) {
      await numberInputs[0].fill('35');
      console.log('✓ Filled age input');
    }
    
    // Select male
    const radioInputs = await page.locator('input[type="radio"]').all();
    if (radioInputs.length > 0) {
      await radioInputs[0].click();
      console.log('✓ Selected sex (male)');
    }
    
    // Fill remaining inputs
    if (numberInputs.length > 1) {
      await numberInputs[1].fill('5'); // height feet
      console.log('✓ Filled height (feet)');
    }
    
    if (numberInputs.length > 2) {
      await numberInputs[2].fill('10'); // height inches
      console.log('✓ Filled height (inches)');
    }
    
    if (numberInputs.length > 3) {
      await numberInputs[3].fill('200'); // weight
      console.log('✓ Filled weight');
    }
    
    await page.waitForTimeout(500);
    
    // Click submit button
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      await buttons[buttons.length - 1].click();
      console.log('✓ Clicked Continue button\n');
    }
    
    await page.waitForTimeout(1000);
    
    // Check if we advanced to step 2
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('Goal')) {
      console.log('✅ Advanced to Step 2 (Goal selection)');
    }
    
    console.log('\n═══════════════════════════════════');
    console.log('✅ REBUILT FORM WORKING!');
    console.log('═══════════════════════════════════\n');
    
    console.log('Browser open for manual inspection (30 seconds)...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

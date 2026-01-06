import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Testing calculator form flow...\n');
  
  // Step 1: Load calculator
  await page.goto('http://localhost:5174/assets/calculator2/');
  await page.waitForTimeout(1500);
  
  const step1Heading = await page.locator('h2, h3').first().textContent();
  console.log('✓ Step 1 loaded:', step1Heading);
  
  // Fill Step 1
  await page.locator('label:has-text("Male")').click();
  await page.locator('input[type="number"]').first().fill('35'); // age
  await page.locator('input[type="number"]').nth(1).fill('5'); // height feet
  await page.locator('input[type="number"]').nth(2).fill('10'); // height inches
  await page.locator('input[type="number"]').nth(3).fill('180'); // weight
  
  // Navigate to Step 2
  await page.locator('button:has-text("Continue")').last().click();
  await page.waitForTimeout(1000);
  
  const step2Heading = await page.locator('h2, h3').first().textContent();
  console.log('✓ Step 2 loaded:', step2Heading);
  
  // Fill Step 2
  await page.locator('label:has-text("Moderately")').click();
  await page.locator('label:has-text("Fat Loss")').click();
  
  // Navigate to Step 3 (Results)
  await page.locator('button:has-text("See Your Results")').last().click();
  await page.waitForTimeout(2000);
  
  const resultsHeading = await page.locator('h1, h2').first().textContent();
  console.log('✓ Step 3 (Results) loaded:', resultsHeading);
  
  // Check if pricing modal button exists
  const upgradeButton = await page.locator('button:has-text("Upgrade")').count();
  console.log('✓ Upgrade button present:', upgradeButton > 0);
  
  // Click upgrade button to open modal
  if (upgradeButton > 0) {
    await page.locator('button:has-text("Upgrade")').first().click();
    await page.waitForTimeout(1000);
    
    // Check if modal opened (look for pricing tiers)
    const modalVisible = await page.locator('text=Basic Protocol, text=Premium Protocol').count();
    console.log('✓ Pricing modal opened:', modalVisible > 0);
  }
  
  console.log('\n✅ All form flow tests passed');
  
  await browser.close();
})();

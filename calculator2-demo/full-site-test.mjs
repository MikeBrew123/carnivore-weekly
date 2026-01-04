import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('\n🧪 COMPLETE FLOW TEST: https://carnivoreweekly.com/calculator.html\n');

  try {
    console.log('1️⃣  Loading page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('2️⃣  Waiting for React app...');
    await page.waitForTimeout(5000);
    
    // Check if form exists
    const formExists = await page.$('input[name="age"]');
    if (!formExists) {
      console.log('❌ FORM NOT LOADING\n');
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Page text:', pageText.substring(0, 300));
      return;
    }
    
    console.log('✅ Form loaded!\n');
    
    console.log('3️⃣  Filling form data...');
    await page.waitForSelector('input[name="age"]', { timeout: 5000 });
    
    await page.fill('input[name="age"]', '35');
    await page.fill('input[name="heightFeet"]', '5');
    await page.fill('input[name="heightInches"]', '10');
    await page.fill('input[name="weight"]', '200');
    await page.waitForTimeout(1000);
    console.log('✓ Data filled\n');
    
    console.log('4️⃣  Clicking: Continue to Activity Level');
    await page.click('button:has-text("Continue to Activity Level")');
    await page.waitForTimeout(1500);
    
    console.log('5️⃣  Advancing through steps...');
    for (let i = 0; i < 5; i++) {
      const btn = await page.$('button:has-text("Continue"), button:has-text("Next")');
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }
    
    console.log('6️⃣  Clicking: See Results');
    const seeBtn = await page.$('button:has-text("See Results")');
    if (seeBtn) {
      await seeBtn.click();
      await page.waitForTimeout(3000);
      
      const hasReport = await page.evaluate(() => {
        return document.body.textContent.toLowerCase().includes('calor') ||
               document.body.textContent.includes('protein') ||
               document.body.textContent.includes('macro');
      });
      
      if (hasReport) {
        console.log('✅ REPORT GENERATED!\n');
        
        // Screenshot the report
        await page.screenshot({ path: '/tmp/live-report.png', fullPage: true });
        
        const text = await page.evaluate(() => document.body.innerText);
        console.log('Report preview (first 300 chars):');
        console.log(text.substring(0, 300));
        
        console.log('\n✅✅✅ FULL FLOW COMPLETE - FORM IS WORKING!\n');
      } else {
        console.log('⚠️  No report data found');
      }
    }
    
    console.log('Browser staying open for 3 minutes to inspect...\n');
    await page.waitForTimeout(180000);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
})();

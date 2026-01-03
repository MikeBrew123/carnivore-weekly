import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://carnivoreweekly.com/calculator.html');
  await page.waitForTimeout(2000);
  
  // Fill form
  const inputs = page.locator('input');
  await inputs.nth(0).fill('35');
  await inputs.nth(1).fill('200');
  await inputs.nth(2).fill('70');
  await page.locator('select').first().selectOption('male');
  
  // Click Continue until no more Continue buttons
  let finalState = {};
  for (let i = 0; i < 15; i++) {
    const continueBtn = page.locator('button:has-text("Continue")').first();
    if (await continueBtn.count() === 0) {
      break;
    }
    await continueBtn.click();
    await page.waitForTimeout(800);
  }
  
  // Get final state
  finalState = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()).slice(0, 5);
    const stepText = document.body.innerText.match(/Step \d+ of \d+/)?.[0] || 'no step text';
    
    return {
      step: stepText,
      headings,
      buttons: [...new Set(buttons)], // unique buttons
      url: window.location.href
    };
  });
  
  console.log('\n📊 FINAL STATE:');
  console.log('Step:', finalState.step);
  console.log('Headings:', finalState.headings);
  console.log('Unique buttons:', finalState.buttons);
  console.log('URL:', finalState.url);
  
  await browser.close();
})();

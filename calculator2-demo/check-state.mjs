import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://carnivoreweekly.com/calculator.html');
  await page.waitForTimeout(3000);
  
  // Get current page state
  const state = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()).slice(0, 3);
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
    const inputs = document.querySelectorAll('input, select').length;
    
    return {
      headings,
      buttons,
      inputCount: inputs,
      title: document.title
    };
  });
  
  console.log('\n📊 CURRENT PAGE STATE:');
  console.log('Headings:', state.headings);
  console.log('Buttons:', state.buttons);
  console.log('Form inputs: ' + state.inputCount);
  console.log('Title:', state.title);
  console.log('');
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/current-state.png' });
  console.log('Screenshot saved to /tmp/current-state.png\n');
  
  await browser.close();
})();

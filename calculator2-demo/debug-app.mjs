import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Capture console messages and errors
  const logs = [];
  const errors = [];
  
  page.on('console', msg => {
    console.log('[PAGE LOG]', msg.text());
    logs.push(msg.text());
  });
  
  page.on('pageerror', err => {
    console.error('[PAGE ERROR]', err.toString());
    errors.push(err.toString());
  });
  
  page.on('response', resp => {
    if (!resp.ok() && resp.url().includes('calculator')) {
      console.error('[FAILED REQUEST]', resp.status(), resp.url());
    }
  });
  
  await page.goto('https://carnivoreweekly.com/calculator.html');
  await page.waitForTimeout(3000);
  
  // Check if root element has content
  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      exists: !!root,
      hasChildren: root?.children.length || 0,
      innerHTML: root?.innerHTML.substring(0, 100) || 'none'
    };
  });
  
  console.log('\n=== APP STATUS ===');
  console.log('Root element exists:', rootContent.exists);
  console.log('Root has children:', rootContent.hasChildren);
  console.log('Root content:', rootContent.innerHTML);
  console.log('Errors captured:', errors.length);
  console.log('Logs captured:', logs.length);
  
  if (errors.length > 0) {
    console.log('\nERRORS:');
    errors.forEach(e => console.log('  -', e));
  }
  
  await browser.close();
})();

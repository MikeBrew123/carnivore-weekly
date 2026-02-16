import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 2400 } });

  console.log('📍 Loading https://carnivoreweekly.com...');
  await page.goto('https://carnivoreweekly.com', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('📸 Taking full page screenshot...');
  await page.screenshot({ 
    path: '/tmp/carnivore-homepage.png', 
    fullPage: true
  });

  console.log('✅ Screenshot saved: /tmp/carnivore-homepage.png');

  await browser.close();
})();

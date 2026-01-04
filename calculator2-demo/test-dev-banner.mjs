import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  // Check for dev banner
  const banner = page.locator('div:has-text("TEST DATA LOADED")');
  const bannerVisible = await banner.isVisible().catch(() => false);
  
  if (bannerVisible) {
    console.log('✅ Dev banner is visible');
    const bannerColor = await banner.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Banner color:', bannerColor);
  } else {
    console.log('❌ Dev banner NOT visible');
  }

  // Check for test data in form
  const ageInput = page.locator('input[name="age"]');
  const ageValue = await ageInput.inputValue().catch(() => '');
  console.log('Age field value:', ageValue || '(empty)');
  
  if (ageValue === '30') {
    console.log('✅ Test data is prefilled (age = 30)');
  } else {
    console.log('❌ Test data not prefilled');
  }

  await browser.close();
})();

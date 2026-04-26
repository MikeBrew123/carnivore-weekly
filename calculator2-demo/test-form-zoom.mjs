import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

async function zoomForm(url, label) {
  console.log(`\n=== ${label}: ${url} ===`);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3500);

  // Find the form container — "Let's Start with Your Basics" section
  const form = await page.locator('form').first();
  if (await form.count() > 0) {
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await form.screenshot({ path: `/tmp/cw-test-screenshots/${label}_FORM.png` });
    console.log(`  📸 /tmp/cw-test-screenshots/${label}_FORM.png`);

    // Also try to get form HTML structure
    const inputs = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const fields = [];
      form.querySelectorAll('input, select, textarea, [role="combobox"], [role="listbox"]').forEach(el => {
        fields.push({
          tag: el.tagName,
          type: el.type || el.getAttribute('role'),
          name: el.name || el.id,
          value: el.value || el.getAttribute('aria-activedescendant'),
          ariaLabel: el.getAttribute('aria-label'),
          innerText: el.innerText?.slice(0, 60),
        });
      });
      return fields;
    });
    console.log(`  Form fields:`, JSON.stringify(inputs, null, 2));
  } else {
    console.log('  ❌ No form found');
  }
  await page.close();
}

await zoomForm('https://carnivoreweekly.com/calculator.html', 'NO_PARAMS');
await zoomForm('https://carnivoreweekly.com/calculator.html?mode=keto', 'MODE_KETO');
await zoomForm('https://carnivoreweekly.com/calculator.html?mode=pescatarian', 'MODE_PESC');
await browser.close();

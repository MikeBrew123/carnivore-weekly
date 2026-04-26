import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function clickThrough(url, label) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Fill Step 1 minimally and click Continue
  try {
    // Click Male radio
    const male = page.locator('button:has-text("Male"), label:has-text("Male"), [role="radio"][value="male"]').first();
    await male.click({ timeout: 3000 }).catch(()=>{});

    // Fill age
    await page.locator('input[type="number"], input[placeholder*="30"]').first().fill('35').catch(()=>{});
    // Fill all number inputs with valid defaults
    const numberInputs = await page.locator('input[type="number"]').all();
    for (let i = 0; i < numberInputs.length; i++) {
      try {
        const placeholder = await numberInputs[i].getAttribute('placeholder') || '';
        const val = placeholder.match(/\d+/)?.[0] || (i === 0 ? '35' : i === 1 ? '5' : i === 2 ? '10' : '180');
        await numberInputs[i].fill(val);
      } catch {}
    }
    await page.waitForTimeout(500);

    // Click Continue to Next Step
    const continueBtn = page.locator('button:has-text("Continue to Next Step")').last();
    await continueBtn.click({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // Screenshot step 2
    await page.locator('#calculator-slot').screenshot({ path: `/tmp/cw-test-screenshots/STEP2_${label}.png` });
    console.log(`  📸 /tmp/cw-test-screenshots/STEP2_${label}.png`);

    // Check which diet button has the active state
    const dietState = await page.evaluate(() => {
      const keywords = ['keto', 'carnivore', 'pescatarian', 'low carb', 'low-carb'];
      const buttons = [...document.querySelectorAll('button, label, [role="radio"]')];
      return buttons
        .filter(b => {
          const t = b.textContent?.toLowerCase() || '';
          return keywords.some(k => t.includes(k)) && t.length < 60;
        })
        .map(b => ({
          text: b.textContent?.trim(),
          ariaChecked: b.getAttribute('aria-checked'),
          dataState: b.getAttribute('data-state'),
          selected: b.getAttribute('aria-checked') === 'true' || b.getAttribute('data-state') === 'checked' || b.className?.includes('selected') || b.className?.includes('active'),
        }));
    });
    console.log(`  [${label}] Diet buttons on Step 2:`);
    dietState.forEach(d => console.log(`    - "${d.text}" selected=${d.selected}`));
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
  await c.close();
}

console.log('=== ?mode=keto — should have Keto selected on Step 2 ===');
await clickThrough('https://carnivoreweekly.com/calculator.html?mode=keto', 'keto');

console.log('\n=== No params — default (no diet preselected) ===');
await clickThrough('https://carnivoreweekly.com/calculator.html', 'noparam');

await browser.close();

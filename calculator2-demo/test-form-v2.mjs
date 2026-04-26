import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  // Clear storage between runs
  storageState: undefined
});

async function test(url, label) {
  console.log(`\n=== ${label} ===`);
  const page = await ctx.newPage();
  await page.clearCookies().catch(()=>{});
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Check for any input
  const inputCount = await page.locator('input, select, [role="combobox"], [role="radiogroup"]').count();
  console.log(`  Inputs/selects/comboboxes: ${inputCount}`);

  // Check localStorage for persisted state
  const storage = await page.evaluate(() => {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      try { all[k] = JSON.parse(localStorage.getItem(k)); } catch { all[k] = localStorage.getItem(k); }
    }
    return all;
  });
  console.log(`  LocalStorage keys:`, Object.keys(storage));
  for (const [k, v] of Object.entries(storage)) {
    const s = JSON.stringify(v);
    if (s.includes('keto') || s.includes('carnivore') || s.includes('diet')) {
      console.log(`    ${k}:`, s.slice(0, 300));
    }
  }

  // Scroll to calculator slot
  await page.evaluate(() => {
    const el = document.querySelector('#calculator-slot');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);

  // Screenshot of the calculator section only
  const slot = page.locator('#calculator-slot');
  if (await slot.count() > 0) {
    await slot.screenshot({ path: `/tmp/cw-test-screenshots/${label}_SLOT.png` });
    console.log(`  📸 /tmp/cw-test-screenshots/${label}_SLOT.png`);
  }

  await page.close();
}

// Important: use separate contexts to avoid localStorage bleed between runs
async function freshTest(url, label) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await c.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  const storage = await page.evaluate(() => {
    const all = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      try { all[k] = JSON.parse(localStorage.getItem(k)); } catch { all[k] = localStorage.getItem(k); }
    }
    return all;
  });

  // Extract diet from zustand storage
  let diet = null;
  for (const [k, v] of Object.entries(storage)) {
    const s = JSON.stringify(v);
    const m = s.match(/"diet"\s*:\s*"([^"]+)"/);
    if (m) { diet = m[1]; break; }
  }

  await page.evaluate(() => document.querySelector('#calculator-slot')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  const slot = page.locator('#calculator-slot');
  await slot.screenshot({ path: `/tmp/cw-test-screenshots/FRESH_${label}_SLOT.png` });

  console.log(`\n[FRESH] ${label}: diet="${diet}"`);
  console.log(`  📸 FRESH_${label}_SLOT.png`);
  await c.close();
  return diet;
}

console.log('### FRESH CONTEXT TESTS (clean localStorage each time) ###');
const noParam = await freshTest('https://carnivoreweekly.com/calculator.html', 'no_param');
const keto = await freshTest('https://carnivoreweekly.com/calculator.html?mode=keto', 'keto');
const pesc = await freshTest('https://carnivoreweekly.com/calculator.html?mode=pescatarian', 'pesc');
const lowcarb = await freshTest('https://carnivoreweekly.com/calculator.html?mode=lowcarb', 'lowcarb');
const invalid = await freshTest('https://carnivoreweekly.com/calculator.html?mode=notreal', 'invalid');

console.log(`\n=== SUMMARY ===`);
console.log(`  no_param: ${noParam}`);
console.log(`  ?mode=keto: ${keto}  ${keto === 'keto' ? '✅' : '❌'}`);
console.log(`  ?mode=pescatarian: ${pesc}  ${pesc === 'pescatarian' ? '✅' : '❌'}`);
console.log(`  ?mode=lowcarb: ${lowcarb}  ${lowcarb === 'lowcarb' ? '✅' : '❌'}`);
console.log(`  ?mode=notreal (invalid): ${invalid}  ${invalid !== 'keto' && invalid !== 'pescatarian' && invalid !== 'lowcarb' ? '✅' : '❌'}`);

await browser.close();

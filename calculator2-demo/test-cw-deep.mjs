import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const dir = '/tmp/cw-test-screenshots';
try { mkdirSync(dir, { recursive: true }); } catch {}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

async function inspectCalc(url, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`URL: ${url}`);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Scroll to the calculator form
  await page.evaluate(() => {
    const el = document.querySelector('#calculator-slot, [id*="calculator"], form');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(1000);

  // Full-page screenshot to see everything
  const shot = `${dir}/${label.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}_FULL.png`;
  await page.screenshot({ path: shot, fullPage: true });
  console.log(`  📸 ${shot}`);

  // Try multiple strategies to find selected diet
  const strategies = await page.evaluate(() => {
    const results = {};

    // Strategy 1: aria-checked radio buttons
    const radios = [...document.querySelectorAll('[role="radio"], input[type="radio"]')];
    results.radios = radios
      .filter(r => r.getAttribute('aria-checked') === 'true' || r.checked)
      .map(r => ({ value: r.getAttribute('value') || r.getAttribute('data-value') || r.id, text: r.textContent?.trim()?.slice(0, 40) }));

    // Strategy 2: buttons with data-state="checked" (shadcn/radix pattern)
    const dataStateChecked = [...document.querySelectorAll('[data-state="checked"], [aria-pressed="true"]')];
    results.dataState = dataStateChecked.map(b => ({
      value: b.getAttribute('value') || b.getAttribute('data-value') || b.id,
      text: b.textContent?.trim()?.slice(0, 40)
    }));

    // Strategy 3: look for any element with keto/carnivore/etc. text that's visually highlighted
    const dietKeywords = ['keto', 'carnivore', 'pescatarian', 'low carb', 'lowcarb'];
    const allButtons = [...document.querySelectorAll('button, label, [role="button"]')];
    results.highlighted = allButtons
      .filter(b => {
        const text = b.textContent?.toLowerCase() || '';
        return dietKeywords.some(k => text.includes(k));
      })
      .slice(0, 10)
      .map(b => {
        const style = getComputedStyle(b);
        return {
          text: b.textContent?.trim()?.slice(0, 30),
          classes: b.className?.slice(0, 80),
          ariaChecked: b.getAttribute('aria-checked'),
          dataState: b.getAttribute('data-state'),
          ariaPressed: b.getAttribute('aria-pressed'),
          bgColor: style.backgroundColor,
        };
      });

    // Strategy 4: zustand store (if exposed to window)
    if (window.__CW_STATE__ || window.useCalcStore) {
      results.store = 'found';
    }

    return results;
  });

  console.log(`  Strategies:`, JSON.stringify(strategies, null, 2));
  await page.close();
  return strategies;
}

try {
  await inspectCalc('https://carnivoreweekly.com/calculator.html', 'no-params');
  await inspectCalc('https://carnivoreweekly.com/calculator.html?mode=keto', 'mode-keto');
  await inspectCalc('https://carnivoreweekly.com/calculator.html?mode=pescatarian', 'mode-pescatarian');
  await inspectCalc('https://carnivoreweekly.com/calculator.html?mode=invalid', 'mode-invalid');
} finally {
  await browser.close();
}

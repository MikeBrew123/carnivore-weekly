import { chromium } from 'playwright';

const tests = [
  {
    name: 'NEW: Keto landing page',
    url: 'https://carnivoreweekly.com/keto-macro-calculator.html',
    checks: {
      title: /Keto Macro Calculator/i,
      h1: /Keto Macro Calculator/i,
      hasCtaToCalculator: true,
      expectedCtaHref: /calculator\.html\?mode=keto/,
    }
  },
  {
    name: 'ORIGINAL: Calculator (no params — carnivore default)',
    url: 'https://carnivoreweekly.com/calculator.html',
    checks: {
      title: /Carnivore Macro Calculator/i,
      dietSelected: 'carnivore',
    }
  },
  {
    name: 'NEW: Calculator with ?mode=keto (preselect test)',
    url: 'https://carnivoreweekly.com/calculator.html?mode=keto',
    checks: {
      dietSelected: 'keto',
    }
  },
  {
    name: 'EDGE: Calculator with ?mode=invalid (fallback test)',
    url: 'https://carnivoreweekly.com/calculator.html?mode=thisdoesnotexist',
    checks: {
      dietSelected: /carnivore|keto|pescatarian|lowcarb/,
    }
  }
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 Test/Playwright'
});

let passed = 0, failed = 0;
const screenshotDir = '/tmp/cw-test-screenshots';
const { mkdirSync } = await import('fs');
try { mkdirSync(screenshotDir, { recursive: true }); } catch {}

for (const t of tests) {
  console.log(`\n=== ${t.name} ===`);
  console.log(`URL: ${t.url}`);
  const page = await context.newPage();
  try {
    const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`  HTTP: ${resp?.status()}`);
    if (resp?.status() !== 200) { console.log('  ❌ Non-200 response'); failed++; await page.close(); continue; }

    await page.waitForTimeout(2500); // let React hydrate

    const title = await page.title();
    console.log(`  Title: "${title}"`);

    if (t.checks.title) {
      const ok = t.checks.title.test(title);
      console.log(`  ${ok ? '✅' : '❌'} Title matches expected pattern`);
      ok ? passed++ : failed++;
    }

    if (t.checks.h1) {
      const h1Text = await page.locator('h1').first().innerText().catch(() => '(no h1)');
      const ok = t.checks.h1.test(h1Text);
      console.log(`  H1: "${h1Text.slice(0, 80)}"`);
      console.log(`  ${ok ? '✅' : '❌'} H1 matches`);
      ok ? passed++ : failed++;
    }

    if (t.checks.hasCtaToCalculator) {
      const ctas = await page.locator('a[href*="calculator.html"]').all();
      console.log(`  Found ${ctas.length} CTA link(s) to calculator`);
      const hrefs = await Promise.all(ctas.map(c => c.getAttribute('href')));
      console.log(`  CTA hrefs: ${JSON.stringify(hrefs.slice(0, 3))}`);
      const matchesExpected = hrefs.some(h => t.checks.expectedCtaHref.test(h || ''));
      console.log(`  ${matchesExpected ? '✅' : '❌'} At least one CTA uses ?mode=keto`);
      matchesExpected ? passed++ : failed++;
    }

    if (t.checks.dietSelected) {
      // Try to find the diet select and read its value
      const selects = await page.locator('select').all();
      let foundDiet = null;
      for (const sel of selects) {
        const opts = await sel.locator('option').all();
        const values = await Promise.all(opts.map(o => o.getAttribute('value')));
        if (values.some(v => v === 'keto' || v === 'carnivore' || v === 'pescatarian' || v === 'lowcarb')) {
          foundDiet = await sel.inputValue();
          break;
        }
      }
      // Fallback: check via inspecting window.__FORM_STATE__ or visible text
      if (!foundDiet) {
        // Maybe it's a custom component — check body text
        const bodyText = await page.locator('body').innerText();
        if (/ketogenic|keto diet/i.test(bodyText)) foundDiet = '(inferred keto from text)';
      }
      console.log(`  Diet selected: ${foundDiet}`);
      const expected = t.checks.dietSelected;
      const ok = foundDiet && (expected instanceof RegExp ? expected.test(foundDiet) : foundDiet === expected);
      console.log(`  ${ok ? '✅' : '❌'} Diet matches expected (${expected})`);
      ok ? passed++ : failed++;
    }

    const shot = `${screenshotDir}/${t.name.replace(/[^a-z0-9]/gi, '_').slice(0, 50)}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    console.log(`  📸 ${shot}`);

    // Check console errors
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(500);
    if (errors.length) console.log(`  ⚠️ Console errors: ${errors.slice(0, 2).join(' | ')}`);

  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    failed++;
  }
  await page.close();
}

console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);

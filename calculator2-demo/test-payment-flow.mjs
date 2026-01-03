import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🔄 Loading calculator page...');
    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('✓ Page loaded, waiting for React app...');

    // Wait longer for React to render and check multiple times
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000);
      const inputs = await page.$$(
       'input, select, [role="combobox"], [role="radio"]'
      );
      if (inputs.length > 0) {
        console.log(`✓ Found ${inputs.length} form elements after ${(i + 1) * 1000}ms`);
        break;
      }
    }

    // Check what's actually on the page
    console.log('\n📋 Inspecting page structure...');
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        inputCount: document.querySelectorAll('input').length,
        buttonCount: document.querySelectorAll('button').length,
        hasReact: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        h1: document.querySelector('h1')?.textContent || 'none',
        mainContent: document.body.textContent.substring(0, 200)
      };
    });

    console.log('Page title:', pageInfo.title);
    console.log('H1:', pageInfo.h1);
    console.log('Inputs found:', pageInfo.inputCount);
    console.log('Buttons found:', pageInfo.buttonCount);

    // List all buttons
    const buttons = await page.$$eval('button', buttons =>
      buttons.map((b, i) => ({
        index: i,
        text: b.textContent.trim().substring(0, 50),
        type: b.type,
        class: b.className.substring(0, 100)
      })).slice(0, 15)
    );
    console.log('\n🔘 Buttons found:');
    buttons.forEach(b => {
      if (b.text) console.log(`  [${b.index}] "${b.text}"`);
    });

    // List all text inputs
    const inputs = await page.$$eval('input[type="text"], input:not([type]), input[type="number"]', inputs =>
      inputs.map((i, idx) => ({
        index: idx,
        name: i.name || i.placeholder || i.id,
        type: i.type,
        value: i.value.substring(0, 20)
      })).slice(0, 15)
    );
    console.log('\n📝 Text inputs found:');
    inputs.forEach(i => {
      console.log(`  [${i.index}] ${i.name} (${i.type})`);
    });

    // Look for form with name or id patterns
    const forms = await page.$$eval('form', forms =>
      forms.map(f => ({
        name: f.name,
        id: f.id,
        childCount: f.children.length
      }))
    );
    console.log('\n📋 Forms found:', forms.length);
    forms.forEach((f, i) => {
      console.log(`  Form ${i}: id="${f.id}" name="${f.name}" children=${f.childCount}`);
    });

    // Try to find step indicators (common in wizards)
    const stepIndicators = await page.$$eval('[class*="step"], [data-step], .step', els =>
      els.map(e => ({
        text: e.textContent.trim().substring(0, 50),
        class: e.className
      })).slice(0, 5)
    ).catch(() => []);

    if (stepIndicators.length > 0) {
      console.log('\n📍 Step indicators found:');
      stepIndicators.forEach(s => {
        if (s.text) console.log(`  "${s.text}"`);
      });
    }

    // Take screenshot of current state
    await page.screenshot({ path: '/tmp/calculator-page.png', fullPage: true });
    console.log('\n✅ Screenshot saved to /tmp/calculator-page.png');

    // Also save page HTML for debugging
    const html = await page.content();
    fs.writeFileSync('/tmp/calculator-page.html', html);
    console.log('✅ HTML saved to /tmp/calculator-page.html');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
})();

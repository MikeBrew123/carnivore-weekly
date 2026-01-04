import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  page.on('response', resp => {
    if (!resp.ok()) {
      networkErrors.push(`${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    console.log('🔍 Diagnosing live calculator...\n');

    await page.goto('https://carnivoreweekly.com/calculator.html', {
      waitUntil: 'domcontentloaded'
    });

    await page.waitForTimeout(5000);

    // Check DOM structure
    const structure = await page.evaluate(() => {
      return {
        title: document.title,
        inputsFound: document.querySelectorAll('input').length,
        formElementsFound: {
          age: !!document.querySelector('input[name="age"]'),
          height: !!document.querySelector('input[name="height"], input[name="heightFeet"]'),
          weight: !!document.querySelector('input[name="weight"]')
        },
        reactRoot: !!document.getElementById('root') || !!document.getElementById('app'),
        appContainer: !!document.querySelector('[class*="app"], [data-testid="app"]'),
        elementCount: document.querySelectorAll('*').length,
        bodyHTML: document.body.innerHTML.substring(0, 1000),
        visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length,
        allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t).slice(0, 10)
      };
    });

    console.log('📊 Page Structure:');
    console.log(`  Title: ${structure.title}`);
    console.log(`  Inputs found: ${structure.inputsFound}`);
    console.log(`  React root: ${structure.reactRoot}`);
    console.log(`  App container: ${structure.appContainer}`);
    console.log(`  Total elements: ${structure.elementCount}`);
    console.log(`  Visible elements: ${structure.visibleElements}`);

    console.log('\n🔎 Form Fields:');
    console.log(`  Age input: ${structure.formElementsFound.age}`);
    console.log(`  Height input: ${structure.formElementsFound.height}`);
    console.log(`  Weight input: ${structure.formElementsFound.weight}`);

    console.log('\n🔘 Buttons found:');
    structure.allButtons.forEach(b => console.log(`  - ${b}`));

    if (errors.length > 0) {
      console.log('\n❌ Console Errors:');
      errors.forEach(e => console.log(`  ${e}`));
    }

    if (networkErrors.length > 0) {
      console.log('\n🌐 Network Errors:');
      networkErrors.slice(0, 5).forEach(e => console.log(`  ${e}`));
    }

    // Check if build is deployed
    console.log('\n📦 Checking build files:');
    const resources = await page.evaluate(() => {
      return {
        scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent.substring(0, 50)).filter(s => s),
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href)
      };
    });

    console.log(`  Script tags: ${resources.scripts.length}`);
    resources.scripts.slice(0, 3).forEach(s => console.log(`    - ${s.substring(0, 100)}`));

    console.log(`  Stylesheets: ${resources.stylesheets.length}`);
    resources.stylesheets.slice(0, 3).forEach(s => console.log(`    - ${s.substring(0, 100)}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('\n' + '='.repeat(70));
    console.log('DETAILED UPGRADE FLOW INSPECTION');
    console.log('='.repeat(70) + '\n');

    // Load calculator
    await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('Step 1: Initial page load inspection');
    console.log('-'.repeat(70));

    // Get initial page structure
    const initialButtons = await page.$$eval('button', btns =>
      btns.map(b => ({
        text: b.textContent.trim(),
        id: b.id,
        className: b.className,
        onclick: b.getAttribute('onclick')
      }))
    );

    console.log('Buttons on initial load:');
    initialButtons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text.substring(0, 40)}"`);
      if (btn.id) console.log(`     ID: ${btn.id}`);
      if (btn.className) console.log(`     Class: ${btn.className.substring(0, 50)}`);
      if (btn.onclick) console.log(`     Onclick: ${btn.onclick.substring(0, 50)}`);
    });

    // Find upgrade button
    const upgradeBtn = await page.$('button:has-text("Get Full Protocol")');
    console.log('\nStep 2: Clicking upgrade button...');

    if (upgradeBtn) {
      console.log('  ✅ Upgrade button found');

      // Get button details
      const btnDetails = await upgradeBtn.evaluate(el => ({
        text: el.textContent,
        href: el.getAttribute('href'),
        onclick: el.getAttribute('onclick'),
        disabled: el.disabled
      }));
      console.log(`  Button details:`, JSON.stringify(btnDetails, null, 2));

      // Click it
      await upgradeBtn.click();
      console.log('  ✅ Button clicked');

      // Wait for any response
      await page.waitForTimeout(1500);

      // Check if page URL changed
      const newUrl = page.url();
      console.log(`\nStep 3: After button click`);
      console.log(`  Current URL: ${newUrl}`);

      // Look for any new modals/dialogs
      const dialogs = await page.$$eval('[role="dialog"], [class*="modal"], [class*="Modal"], .pricing-modal, #pricing, [data-testid*="modal"]', els =>
        els.map(el => ({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          visible: el.offsetParent !== null,
          innerHTML: el.innerHTML.substring(0, 200)
        }))
      );

      console.log(`\n  Modals/Dialogs found: ${dialogs.length}`);
      dialogs.forEach((dialog, i) => {
        console.log(`    ${i + 1}. ${dialog.tag}#${dialog.id || 'none'} - Visible: ${dialog.visible}`);
      });

      // Look for overlays
      const overlays = await page.$$eval('[class*="overlay"], [class*="backdrop"], [class*="Overlay"]', els =>
        els.map(el => ({
          className: el.className,
          visible: el.offsetParent !== null
        }))
      );

      console.log(`\n  Overlays found: ${overlays.length}`);
      overlays.forEach((overlay, i) => {
        console.log(`    ${i + 1}. ${overlay.className} - Visible: ${overlay.visible}`);
      });

      // Look for pricing/payment sections
      console.log(`\nStep 4: Checking for pricing content`);

      const pageText = await page.textContent('body');
      const hasPricing = pageText.includes('$');
      const pricingTexts = await page.$$eval('*', els =>
        els
          .filter(el => {
            const text = el.textContent || '';
            return text.includes('$') && text.length < 100;
          })
          .map(el => ({
            tag: el.tagName,
            text: el.textContent.trim().substring(0, 80),
            visible: el.offsetParent !== null
          }))
          .slice(0, 15)
      );

      console.log(`  Elements with "$" symbol:`);
      pricingTexts.forEach((el, i) => {
        console.log(`    ${i + 1}. ${el.tag}: "${el.text}" - ${el.visible ? '✅' : '❌'}`);
      });

      // Check for Stripe
      console.log(`\nStep 5: Checking for payment integration`);

      const scripts = await page.$$eval('script', scripts =>
        scripts
          .map(s => ({
            src: s.src || 'inline',
            async: s.async,
            type: s.type
          }))
          .filter(s => s.src && (s.src.includes('stripe') || s.src.includes('payment')))
      );

      console.log(`  Payment scripts: ${scripts.length}`);
      scripts.forEach((script, i) => {
        console.log(`    ${i + 1}. ${script.src}`);
      });

      // Look for form elements that might be payment-related
      const forms = await page.$$eval('form', forms =>
        forms.map(f => ({
          id: f.id,
          action: f.action,
          className: f.className,
          children: f.children.length
        }))
      );

      console.log(`\n  Forms on page: ${forms.length}`);
      forms.forEach((form, i) => {
        console.log(`    ${i + 1}. ${form.id || 'unnamed'} (${form.children} fields)`);
        if (form.action) console.log(`       Action: ${form.action}`);
      });

      // Check all visible content
      console.log(`\nStep 6: Page visibility analysis`);

      const hiddenElements = await page.$$eval('*', els =>
        els
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
          })
          .slice(0, 10)
          .map(el => ({
            tag: el.tagName,
            className: el.className,
            text: el.textContent?.substring(0, 50) || ''
          }))
      );

      console.log(`  Hidden elements (first 10): ${hiddenElements.length}`);

      // Full DOM inspection around buttons
      console.log(`\nStep 7: Full page content scan`);

      const allText = await page.locator('body').textContent();
      const lines = allText.split('\n').filter(l => l.trim());

      console.log('Page text (first 30 lines):');
      lines.slice(0, 30).forEach((line, i) => {
        const preview = line.trim().substring(0, 70);
        console.log(`  ${i + 1}. ${preview}${preview.length < line.length ? '...' : ''}`);
      });

      // Save full HTML for inspection
      const html = await page.content();
      console.log(`\n  Total page size: ${html.length} bytes`);

      // Check if there's a separate pricing page or link
      const links = await page.$$eval('a', links =>
        links
          .map(l => ({
            href: l.href,
            text: l.textContent.trim().substring(0, 40)
          }))
          .filter(l => l.href && (l.href.includes('price') || l.href.includes('upgrade') || l.href.includes('buy') || l.href.includes('plan')))
      );

      console.log(`\n  Upgrade/pricing links: ${links.length}`);
      links.forEach((link, i) => {
        console.log(`    ${i + 1}. "${link.text}" -> ${link.href}`);
      });

    } else {
      console.log('  ❌ Upgrade button not found');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();

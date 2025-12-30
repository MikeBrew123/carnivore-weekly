const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const pages = [
    { name: 'index', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/index.html' },
    { name: 'calculator', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/calculator.html' },
    { name: 'wiki', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/wiki.html' },
    { name: 'about', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/about.html' },
    { name: 'channels', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/channels.html' },
    { name: 'archive', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/archive.html' }
  ];

  console.log('Checking header heights across pages...\n');
  console.log('PAGE\t\tHEADER HEIGHT\tHEADER PADDING\tH1 HEIGHT\tP HEIGHT');
  console.log('─'.repeat(80));

  for (const page of pages) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const browserPage = await context.newPage();

    try {
      await browserPage.goto(page.url, { waitUntil: 'networkidle' });

      const headerInfo = await browserPage.evaluate(() => {
        const header = document.querySelector('header');
        const h1 = document.querySelector('header h1');
        const p = document.querySelector('header p');
        const container = document.querySelector('header .container');

        if (!header) return null;

        const headerRect = header.getBoundingClientRect();
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;
        const pRect = p ? p.getBoundingClientRect() : null;
        const styles = window.getComputedStyle(header);

        return {
          headerHeight: headerRect.height,
          headerPadding: styles.padding,
          minHeight: styles.minHeight,
          h1Height: h1Rect ? h1Rect.height : 0,
          h1Text: h1 ? h1.textContent : '',
          pHeight: pRect ? pRect.height : 0,
          pText: p ? p.textContent : '',
          containerWidth: container ? window.getComputedStyle(container).maxWidth : 'N/A'
        };
      });

      if (headerInfo) {
        console.log(`${page.name.padEnd(12)}\t${Math.round(headerInfo.headerHeight)}px\t\t${headerInfo.minHeight}\t\t${Math.round(headerInfo.h1Height)}px\t\t${Math.round(headerInfo.pHeight)}px`);
        console.log(`  → min-height: ${headerInfo.minHeight}`);
        console.log(`  → h1: "${headerInfo.h1Text.substring(0, 30)}${headerInfo.h1Text.length > 30 ? '...' : ''}"`);
        console.log(`  → p: "${headerInfo.pText.substring(0, 50)}${headerInfo.pText.length > 50 ? '...' : ''}"`);
        console.log('');
      }
    } catch (error) {
      console.error(`Error checking ${page.name}: ${error.message}`);
    }

    await context.close();
  }

  // Take screenshots for visual comparison
  console.log('\nTaking screenshots...');
  const screenshotPages = [
    { name: 'index', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/index.html' },
    { name: 'calculator', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/calculator.html' },
    { name: 'wiki', url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/wiki.html' }
  ];

  for (const page of screenshotPages) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const browserPage = await context.newPage();
    await browserPage.goto(page.url, { waitUntil: 'networkidle' });
    await browserPage.screenshot({ path: `/tmp/${page.name}-header.png` });
    console.log(`✓ Screenshot saved: /tmp/${page.name}-header.png`);
    await context.close();
  }

  await browser.close();
  console.log('\nDone!');
})();

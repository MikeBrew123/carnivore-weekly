#!/usr/bin/env node
import { chromium } from 'playwright';
import { resolve } from 'path';

const browser = await chromium.launch();
const context = await browser.newContext();
const file = (f) => 'file://' + resolve('products/templates/' + f);

// 1. Landscape US Letter (11 x 8.5 in)
console.log('Converting landscape US Letter...');
const p1 = await context.newPage();
await p1.goto(file('diet-food-list-landscape.html'));
await p1.pdf({
  path: 'products/pdfs/diet-food-list-landscape-letter.pdf',
  landscape: true,
  width: '11in',
  height: '8.5in',
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  printBackground: true
});
console.log('  ✅ diet-food-list-landscape-letter.pdf');

// 2. Landscape A4 (297 x 210 mm)
console.log('Converting landscape A4...');
await p1.pdf({
  path: 'products/pdfs/diet-food-list-landscape-a4.pdf',
  landscape: true,
  width: '297mm',
  height: '210mm',
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  printBackground: true
});
console.log('  ✅ diet-food-list-landscape-a4.pdf');

// 3. Mockup screenshot of landscape
await p1.setViewportSize({ width: 1100, height: 850 });
await p1.goto(file('diet-food-list-landscape.html'));
await p1.screenshot({ path: 'products/mockups/mockup-landscape.png', fullPage: true });
console.log('  ✅ mockup-landscape.png');

// 4. Portrait pages (4 individual diet pages)
console.log('Converting portrait pages...');
const p2 = await context.newPage();
await p2.goto(file('diet-food-list-pages.html'));
await p2.pdf({
  path: 'products/pdfs/diet-food-list-pages.pdf',
  width: '8.5in',
  height: '11in',
  margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' },
  printBackground: true
});
console.log('  ✅ diet-food-list-pages.pdf');

// 5. Mockup screenshot of portrait first page
await p2.setViewportSize({ width: 850, height: 1100 });
await p2.goto(file('diet-food-list-pages.html'));
await p2.screenshot({ path: 'products/mockups/mockup-portrait.png', fullPage: false });
console.log('  ✅ mockup-portrait.png');

await browser.close();
console.log('\nDone! 3 PDFs + 2 mockups ready in products/pdfs/ and products/mockups/');

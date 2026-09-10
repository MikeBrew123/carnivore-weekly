#!/usr/bin/env node
/**
 * Rebuild the Keto Food List Bundle PDFs from their HTML templates.
 *
 * Run from etsy/:  node build-keto-bundle.mjs [outDir]
 *
 * The bundle Etsy sells (keto-food-list-bundle.pdf) is the three component
 * PDFs concatenated in this order: eat/limit/avoid, grocery checklist, then
 * the eight additional pages. Before 2026-09-10 there was no script for this;
 * the May 31 artifacts were built by hand, which is how the corrected
 * potassium figure sat in the template while the shipped PDF kept the old one.
 *
 * Page setup matches the May 31 artifacts: US Letter, zero printer margin
 * (the templates carry their own .page padding), backgrounds on.
 */
import { chromium } from 'playwright';
import { resolve } from 'path';
import { execFileSync } from 'child_process';

const OUT = resolve(process.argv[2] || 'products/pdfs');
const PARTS = ['keto-eat-limit-avoid', 'keto-grocery-checklist', 'keto-bundle-pages'];

const browser = await chromium.launch();
const ctx = await browser.newContext();
for (const name of PARTS) {
  const page = await ctx.newPage();
  await page.goto('file://' + resolve('products/templates/' + name + '.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: `${OUT}/${name}.pdf`,
    width: '8.5in',
    height: '11in',
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    printBackground: true
  });
  console.log('  built ' + name + '.pdf');
  await page.close();
}
await browser.close();

// Concatenate with poppler's pdfunite (already on this machine alongside
// pdftotext, which is what verifies the result). No extra npm dependency.
execFileSync('pdfunite', [
  ...PARTS.map((n) => `${OUT}/${n}.pdf`),
  `${OUT}/keto-food-list-bundle.pdf`
], { stdio: 'inherit' });
console.log('  built keto-food-list-bundle.pdf');

#!/usr/bin/env node
/**
 * Build the rebuilt red Carnivore Diet food list as a print-quality PDF.
 *
 * Background: listing 4464217679 advertises the red-and-white 10-section chart
 * in all eight photos, but ships fridge-card-carnivore.pdf, the old
 * cream-and-sepia 8-section design (typos included). The vault report
 * reports/carnivore-chart-mismatch-2026-08-11.md has the full trail.
 *
 * The red chart had no source file. This rebuilds it from scratch at true
 * letter size so the delivered file finally matches the photos:
 *   - all copy is real, selectable, vector text (not an upscaled JPEG)
 *   - 8.5 x 11 in exactly, which is what the listing description promises
 *   - only the eight watercolour illustrations are raster, lifted from the
 *     original artwork by products/templates/build_carnivore_red_chart_art.py
 *
 * PREPARE ONLY. This script writes files to disk. It does not touch Etsy.
 *
 * Run from etsy/:
 *   python3 products/templates/build_carnivore_red_chart_art.py
 *   node build-carnivore-red-chart.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const TEMPLATE = 'file://' + resolve('products/templates/fridge-card-carnivore-red.html');
const PDF_OUT = 'products/pdfs/fridge-card-carnivore-red.pdf';
const PNG_OUT = 'products/product-images/fridge-card-carnivore-red.png';

// 8.5 x 11 in at 300 DPI. Chromium lays out CSS at 96 DPI, so the preview PNG
// is rendered at deviceScaleFactor 300/96 to land on a true 2550 x 3300.
const CSS_W = 816;
const CSS_H = 1056;
const DPI_SCALE = 300 / 96;

mkdirSync('products/pdfs', { recursive: true });
mkdirSync('products/product-images', { recursive: true });

const browser = await chromium.launch();

// --- 1. the PDF a buyer downloads -------------------------------------------
const pdfContext = await browser.newContext();
const page = await pdfContext.newPage();
await page.goto(TEMPLATE, { waitUntil: 'networkidle' });
await page.pdf({
  path: PDF_OUT,
  width: '8.5in',
  height: '11in',
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  printBackground: true,
});
console.log(`  ✅ ${PDF_OUT}`);

// --- 2. a 300 DPI preview raster for listing images and eyeball checks -------
const shotContext = await browser.newContext({
  viewport: { width: CSS_W, height: CSS_H },
  deviceScaleFactor: DPI_SCALE,
});
const shot = await shotContext.newPage();
await shot.goto(TEMPLATE, { waitUntil: 'networkidle' });
await shot.screenshot({ path: PNG_OUT });
console.log(`  ✅ ${PNG_OUT}`);

await browser.close();

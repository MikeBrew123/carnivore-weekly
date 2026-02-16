#!/usr/bin/env node
import { chromium } from 'playwright';

const htmlFile = process.argv[2];
const pdfFile = process.argv[3];

if (!htmlFile || !pdfFile) {
  console.error('Usage: node generate-pdf-from-html.mjs <input.html> <output.pdf>');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`file://${htmlFile}`, { waitUntil: 'networkidle' });

await page.pdf({
  path: pdfFile,
  format: 'A4',
  printBackground: true,
  margin: {
    top: '15mm',
    right: '15mm',
    bottom: '15mm',
    left: '15mm'
  }
});

await browser.close();
console.log(`✅ PDF saved: ${pdfFile}`);

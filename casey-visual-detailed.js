const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8080/public/assets/calculator2/index.html';
const SCREENSHOT_DIR = '/Users/mbrew/Developer/carnivore-weekly/casey-screenshots';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1400, height: 900 }
];

async function visualInspection() {
  const browser = await chromium.launch();

  try {
    for (const viewport of viewports) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`VISUAL INSPECTION: ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height})`);
      console.log(`${'='.repeat(70)}\n`);

      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);

      // Get computed styles for form elements
      const styleInfo = await page.evaluate(() => {
        const computedStyles = {};

        // Get h2 heading
        const h2 = document.querySelector('h2');
        if (h2) {
          const style = window.getComputedStyle(h2);
          computedStyles.h2 = {
            text: h2.textContent,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            fontFamily: style.fontFamily
          };
        }

        // Get p text
        const p = document.querySelector('p');
        if (p) {
          const style = window.getComputedStyle(p);
          computedStyles.p = {
            text: p.textContent.substring(0, 50),
            color: style.color,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight
          };
        }

        // Get labels
        const labels = Array.from(document.querySelectorAll('label')).slice(0, 3);
        computedStyles.labels = labels.map(label => {
          const style = window.getComputedStyle(label);
          return {
            text: label.textContent,
            color: style.color,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight
          };
        });

        // Get input elements
        const inputs = Array.from(document.querySelectorAll('input[type="number"], input[type="radio"]')).slice(0, 3);
        computedStyles.inputs = inputs.map(input => {
          const style = window.getComputedStyle(input);
          const rect = input.getBoundingClientRect();
          return {
            type: input.type,
            name: input.name,
            width: rect.width,
            height: rect.height,
            color: style.color,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            fontSize: style.fontSize
          };
        });

        // Get buttons
        const buttons = Array.from(document.querySelectorAll('button')).slice(0, 2);
        computedStyles.buttons = buttons.map(btn => {
          const style = window.getComputedStyle(btn);
          const rect = btn.getBoundingClientRect();
          return {
            text: btn.textContent,
            width: rect.width,
            height: rect.height,
            backgroundColor: style.backgroundColor,
            color: style.color,
            padding: style.padding,
            minHeight: Math.ceil(rect.height)
          };
        });

        return computedStyles;
      });

      console.log('TYPOGRAPHY:');
      console.log(JSON.stringify(styleInfo.h2, null, 2));
      console.log('\nBODY TEXT:');
      console.log(JSON.stringify(styleInfo.p, null, 2));
      console.log('\nLABELS (first 3):');
      styleInfo.labels.forEach((label, idx) => {
        console.log(`  ${idx + 1}. ${label.text}`);
        console.log(`     Color: ${label.color}, Size: ${label.fontSize}, Weight: ${label.fontWeight}`);
      });
      console.log('\nINPUT FIELDS (first 3):');
      styleInfo.inputs.forEach((input, idx) => {
        console.log(`  ${idx + 1}. ${input.type} (${input.name})`);
        console.log(`     Size: ${input.width}x${input.height}, BG: ${input.backgroundColor}`);
        console.log(`     Border: ${input.borderColor}, Font Size: ${input.fontSize}`);
      });
      console.log('\nBUTTONS (first 2):');
      styleInfo.buttons.forEach((btn, idx) => {
        console.log(`  ${idx + 1}. "${btn.text}"`);
        console.log(`     Size: ${btn.width}x${btn.height}, BG: ${btn.backgroundColor}`);
        console.log(`     Touch target: ${Math.ceil(btn.height)}px (${Math.ceil(btn.height) >= 44 ? 'PASS' : 'FAIL'} - needs 44px+)`);
      });

      // Check for horizontal scroll
      const scrollInfo = await page.evaluate(() => {
        return {
          windowWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          overflowAmount: document.documentElement.scrollWidth - window.innerWidth
        };
      });

      console.log('\nRESPONSIVE CHECK:');
      console.log(`  Window: ${scrollInfo.windowWidth}px`);
      console.log(`  Document: ${scrollInfo.documentWidth}px`);
      console.log(`  Horizontal scroll: ${scrollInfo.hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);
      if (scrollInfo.overflowAmount > 0) {
        console.log(`  Overflow: ${scrollInfo.overflowAmount}px`);
      }

      // Take screenshot
      const screenshotPath = path.join(SCREENSHOT_DIR, `step1-detailed-${viewport.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\nScreenshot: ${screenshotPath}`);

      await page.close();
    }

    console.log(`\n${'='.repeat(70)}\n`);

  } finally {
    await browser.close();
  }
}

visualInspection().catch(console.error);

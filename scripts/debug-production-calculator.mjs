#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

console.log('🔍 Debugging PRODUCTION calculator at carnivoreweekly.com...\n');

await page.goto('https://carnivoreweekly.com/calculator.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('📊 Computed styles for #root and parents:\n');

const debugInfo = await page.evaluate(() => {
    const root = document.getElementById('root');
    const introCopy = document.querySelector('.intro-copy');
    const calculatorMain = document.querySelector('.calculator-main');
    const mainContent = document.querySelector('.main-content-2026');
    const layoutWrapper = document.querySelector('.layout-wrapper-2026');
    const body = document.body;

    const getComputedInfo = (element, name) => {
        if (!element) return { name, found: false };

        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
            name,
            found: true,
            // Position
            left: rect.left,
            right: rect.right,
            width: rect.width,
            // Margins
            marginLeft: computed.marginLeft,
            marginRight: computed.marginRight,
            marginTop: computed.marginTop,
            marginBottom: computed.marginBottom,
            // Padding
            paddingLeft: computed.paddingLeft,
            paddingRight: computed.paddingRight,
            // Display/alignment
            display: computed.display,
            textAlign: computed.textAlign,
            justifyContent: computed.justifyContent,
            alignItems: computed.alignItems,
            // Width
            maxWidth: computed.maxWidth,
            // Transform
            transform: computed.transform
        };
    };

    return {
        viewport: {
            width: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth
        },
        root: getComputedInfo(root, '#root'),
        rootFirstChild: root?.firstElementChild ? getComputedInfo(root.firstElementChild, '#root > first child') : null,
        introCopy: getComputedInfo(introCopy, '.intro-copy'),
        calculatorMain: getComputedInfo(calculatorMain, '.calculator-main'),
        mainContent: getComputedInfo(mainContent, '.main-content-2026'),
        layoutWrapper: getComputedInfo(layoutWrapper, '.layout-wrapper-2026'),
        body: getComputedInfo(body, 'body')
    };
});

console.log('Viewport:');
console.log(`  Width: ${debugInfo.viewport.width}px`);
console.log(`  ScrollWidth: ${debugInfo.viewport.scrollWidth}px`);
console.log('');

Object.entries(debugInfo).forEach(([key, info]) => {
    if (key === 'viewport' || !info || !info.found) return;

    console.log(`${info.name}:`);
    console.log(`  Position: left=${info.left.toFixed(1)}px, right=${info.right.toFixed(1)}px, width=${info.width.toFixed(1)}px`);
    console.log(`  Margins: L=${info.marginLeft} R=${info.marginRight} T=${info.marginTop} B=${info.marginBottom}`);
    console.log(`  Padding: L=${info.paddingLeft} R=${info.paddingRight}`);
    console.log(`  Display: ${info.display}, text-align: ${info.textAlign}`);
    if (info.justifyContent !== 'normal') console.log(`  justify-content: ${info.justifyContent}`);
    if (info.alignItems !== 'normal') console.log(`  align-items: ${info.alignItems}`);
    console.log(`  max-width: ${info.maxWidth}`);
    if (info.transform !== 'none') console.log(`  transform: ${info.transform}`);

    // Calculate gap on left vs right
    const leftGap = info.left;
    const rightGap = debugInfo.viewport.width - info.right;
    console.log(`  GAP: left=${leftGap.toFixed(1)}px, right=${rightGap.toFixed(1)}px`);

    console.log('');
});

// Take screenshot
await page.screenshot({ path: '/tmp/production-calculator-mobile.png', fullPage: true });
console.log('📸 Screenshot saved: /tmp/production-calculator-mobile.png');

await browser.close();

console.log('\n✅ Debug complete - check computed styles above');

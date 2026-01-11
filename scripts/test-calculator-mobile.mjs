#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

await page.goto('http://localhost:8000/calculator.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

console.log('📱 Testing calculator mobile layout at 375px viewport...\n');

// Check for horizontal overflow
const overflow = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;

    return {
        hasOverflow: scrollWidth > clientWidth,
        scrollWidth,
        clientWidth,
        difference: scrollWidth - clientWidth
    };
});

console.log('Overflow check:');
console.log('  Scroll width:', overflow.scrollWidth);
console.log('  Client width:', overflow.clientWidth);
console.log('  Difference:', overflow.difference + 'px');
console.log('  Status:', overflow.hasOverflow ? '❌ OVERFLOW DETECTED' : '✅ NO OVERFLOW');

// Get calculator container info
const containerInfo = await page.evaluate(() => {
    const root = document.getElementById('root');
    const calculatorMain = document.querySelector('.calculator-main');
    const layoutWrapper = document.querySelector('.layout-wrapper-2026');
    const mainContent = document.querySelector('.main-content-2026');
    const introCopy = document.querySelector('.intro-copy');

    const getInfo = (el, name) => {
        if (!el) return { name, found: false };
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        return {
            name,
            found: true,
            width: rect.width,
            left: rect.left,
            right: rect.right,
            paddingLeft: styles.paddingLeft,
            paddingRight: styles.paddingRight,
            marginLeft: styles.marginLeft,
            marginRight: styles.marginRight
        };
    };

    return {
        root: getInfo(root, '#root'),
        calculatorMain: getInfo(calculatorMain, '.calculator-main'),
        layoutWrapper: getInfo(layoutWrapper, '.layout-wrapper-2026'),
        mainContent: getInfo(mainContent, '.main-content-2026'),
        introCopy: getInfo(introCopy, '.intro-copy')
    };
});

console.log('\nContainer measurements:');
Object.entries(containerInfo).forEach(([key, info]) => {
    if (info.found) {
        console.log(`\n  ${info.name}:`);
        console.log(`    Width: ${info.width.toFixed(1)}px`);
        console.log(`    Left: ${info.left.toFixed(1)}px`);
        console.log(`    Right: ${info.right.toFixed(1)}px`);
        console.log(`    Padding: ${info.paddingLeft} / ${info.paddingRight}`);
        console.log(`    Margin: ${info.marginLeft} / ${info.marginRight}`);
    } else {
        console.log(`\n  ${info.name}: NOT FOUND`);
    }
});

// Take screenshot
await page.screenshot({ path: '/tmp/calculator-mobile-375px.png', fullPage: true });
console.log('\n📸 Screenshot saved: /tmp/calculator-mobile-375px.png');

await browser.close();

console.log('\n' + (overflow.hasOverflow ? '❌ FAIL - Layout issues detected' : '✅ PASS - Layout looks good'));

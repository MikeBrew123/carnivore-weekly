#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
const page = await context.newPage();

await page.goto('http://localhost:8000/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

console.log('📱 Testing mobile header at 375px viewport...\n');

// Check for horizontal overflow
const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
});

console.log('Horizontal overflow:', hasOverflow ? '❌ FOUND' : '✅ NONE');

// Get header dimensions and styles
const headerInfo = await page.evaluate(() => {
    const h1 = document.querySelector('.header-2026 h1');
    const subtitle = document.querySelector('.header-2026 .subtitle');
    const logo = document.querySelector('.logo');

    return {
        h1FontSize: h1 ? window.getComputedStyle(h1).fontSize : 'not found',
        subtitleFontSize: subtitle ? window.getComputedStyle(subtitle).fontSize : 'not found',
        logoWidth: logo ? window.getComputedStyle(logo).width : 'not found',
        logoRight: logo ? window.getComputedStyle(logo).right : 'not found'
    };
});

console.log('\nHeader element sizes:');
console.log('  H1 font-size:', headerInfo.h1FontSize);
console.log('  Subtitle font-size:', headerInfo.subtitleFontSize);
console.log('  Logo width:', headerInfo.logoWidth);
console.log('  Logo right position:', headerInfo.logoRight);

// Take screenshot
await page.screenshot({ path: '/tmp/mobile-header-375px.png', fullPage: true });
console.log('\n📸 Screenshot saved: /tmp/mobile-header-375px.png');

await browser.close();

console.log('\n' + (hasOverflow ? '❌ FAIL - Horizontal overflow detected' : '✅ PASS - No overflow'));

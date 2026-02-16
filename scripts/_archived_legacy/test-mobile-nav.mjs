#!/usr/bin/env node
/**
 * Test mobile navigation on various pages
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000';

const TEST_PAGES = [
    { url: '/index.html', name: 'Homepage' },
    { url: '/channels.html', name: 'Channels' },
    { url: '/blog.html', name: 'Blog Index' }
];

async function testMobilePage(page, testPage) {
    console.log(`\n📱 Testing: ${testPage.name}`);

    try {
        await page.goto(`${BASE_URL}${testPage.url}`, {
            waitUntil: 'networkidle',
            timeout: 10000
        });

        // Wait for JavaScript to initialize
        await page.waitForTimeout(1000);

        // Check if hamburger button exists
        const hamburger = await page.locator('.hamburger-menu-btn').count();
        console.log(`  ${hamburger > 0 ? '✅' : '❌'} Hamburger button: ${hamburger > 0 ? 'Found' : 'NOT FOUND'}`);

        if (hamburger === 0) {
            console.log(`  ❌ FAILED - No hamburger button`);
            return false;
        }

        // Check if hamburger is visible
        const hamburgerVisible = await page.locator('.hamburger-menu-btn').isVisible();
        console.log(`  ${hamburgerVisible ? '✅' : '❌'} Hamburger visible: ${hamburgerVisible}`);

        // Check if nav exists
        const nav = await page.locator('.nav-menu-2026').count();
        console.log(`  ${nav > 0 ? '✅' : '❌'} Navigation: ${nav > 0 ? 'Found' : 'NOT FOUND'}`);

        // Test clicking hamburger
        console.log(`  🖱️  Clicking hamburger button...`);
        await page.locator('.hamburger-menu-btn').click();
        await page.waitForTimeout(500);

        // Check if menu has mobile-visible class
        const hasVisibleClass = await page.locator('.nav-menu-2026.mobile-visible').count() > 0;
        console.log(`  ${hasVisibleClass ? '✅' : '❌'} Menu opened: ${hasVisibleClass}`);

        // Check if nav is now visible
        const navVisible = await page.locator('.nav-menu-2026').isVisible();
        console.log(`  ${navVisible ? '✅' : '❌'} Menu visible after click: ${navVisible}`);

        // Close menu by clicking hamburger again
        await page.locator('.hamburger-menu-btn').click();
        await page.waitForTimeout(500);

        const isClosed = await page.locator('.nav-menu-2026.mobile-visible').count() === 0;
        console.log(`  ${isClosed ? '✅' : '❌'} Menu closed: ${isClosed}`);

        if (hamburgerVisible && hasVisibleClass && navVisible && isClosed) {
            console.log(`  ✅ ALL TESTS PASSED`);
            return true;
        } else {
            console.log(`  ❌ SOME TESTS FAILED`);
            return false;
        }

    } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🧪 TESTING MOBILE NAVIGATION\n');
    console.log('=' .repeat(60));
    console.log('Testing at 375px width (mobile viewport)\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 } // iPhone SE size
    });
    const page = await context.newPage();

    const results = [];

    for (const testPage of TEST_PAGES) {
        const passed = await testMobilePage(page, testPage);
        results.push({ name: testPage.name, passed });
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY\n');

    const passedTests = results.filter(r => r.passed).length;
    console.log(`Total pages tested: ${results.length}`);
    console.log(`Passed: ${passedTests}/${results.length}`);

    if (passedTests === results.length) {
        console.log('\n✅ ALL MOBILE NAVIGATION TESTS PASSED!');
        process.exit(0);
    } else {
        console.log('\n❌ SOME TESTS FAILED');
        console.log('\nFailed pages:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}`);
        });
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
});

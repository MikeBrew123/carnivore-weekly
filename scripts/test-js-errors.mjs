#!/usr/bin/env node
/**
 * Test blog posts for JavaScript console errors
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000';

const TEST_POSTS = [
    '/blog/2026-01-11-travel-hacks.html',
    '/blog/2026-01-10-dating-carnivore.html',
    '/blog/2025-12-23-adhd-connection.html'
];

async function testBlogPost(page, url) {
    const errors = [];
    const warnings = [];

    // Capture console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        } else if (msg.type() === 'warning') {
            warnings.push(msg.text());
        }
    });

    // Capture page errors
    page.on('pageerror', error => {
        errors.push(error.message);
    });

    console.log(`\n📄 Testing: ${url}`);

    try {
        await page.goto(`${BASE_URL}${url}`, {
            waitUntil: 'networkidle',
            timeout: 10000
        });

        // Wait for JavaScript to initialize
        await page.waitForTimeout(2000);

        // Check if key elements loaded
        const hasReactions = await page.locator('.post-reactions').count() > 0;
        const hasRelatedContent = await page.locator('.related-content').count() > 0;

        console.log(`  ✅ Page loaded`);
        console.log(`  ${hasReactions ? '✅' : '❌'} Post reactions component found`);
        console.log(`  ${hasRelatedContent ? '✅' : '❌'} Related content component found`);

        if (errors.length > 0) {
            console.log(`  ❌ ERRORS (${errors.length}):`);
            errors.forEach(err => console.log(`     - ${err}`));
        } else {
            console.log(`  ✅ No console errors`);
        }

        if (warnings.length > 0) {
            console.log(`  ⚠️  WARNINGS (${warnings.length}):`);
            warnings.forEach(warn => console.log(`     - ${warn}`));
        }

        return { url, errors, warnings, hasReactions, hasRelatedContent };

    } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}`);
        return { url, errors: [error.message], warnings, hasReactions: false, hasRelatedContent: false };
    }
}

async function main() {
    console.log('🧪 TESTING BLOG POSTS FOR JAVASCRIPT ERRORS\n');
    console.log('=' .repeat(60));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const results = [];

    for (const url of TEST_POSTS) {
        const result = await testBlogPost(page, url);
        results.push(result);
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY\n');

    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const passedTests = results.filter(r => r.errors.length === 0).length;

    console.log(`Total posts tested: ${results.length}`);
    console.log(`Passed (no errors): ${passedTests}/${results.length}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Total warnings: ${totalWarnings}`);

    if (totalErrors === 0) {
        console.log('\n✅ ALL TESTS PASSED - No JavaScript errors detected!');
        process.exit(0);
    } else {
        console.log('\n❌ TESTS FAILED - JavaScript errors found');
        console.log('\nFailed posts:');
        results.filter(r => r.errors.length > 0).forEach(r => {
            console.log(`  - ${r.url} (${r.errors.length} errors)`);
        });
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
});

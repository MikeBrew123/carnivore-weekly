#!/usr/bin/env node
/**
 * Screenshot mobile navigation before and after opening
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8000';

async function main() {
    console.log('📸 Capturing mobile navigation screenshots...\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 375, height: 667 }
    });
    const page = await context.newPage();

    // Screenshot 1: Mobile homepage with hamburger closed
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/mobile-nav-closed.png' });
    console.log('✅ Saved: /tmp/mobile-nav-closed.png (hamburger visible, menu hidden)');

    // Screenshot 2: Mobile homepage with hamburger open
    await page.locator('.hamburger-menu-btn').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/mobile-nav-open.png' });
    console.log('✅ Saved: /tmp/mobile-nav-open.png (menu slide-out visible)');

    await browser.close();
    console.log('\n✅ Screenshots complete!');
}

main().catch(console.error);

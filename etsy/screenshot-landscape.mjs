#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1080 } });
await page.goto('file:///Users/mbrew/Developer/carnivore-weekly/etsy/products/diet-food-list-landscape.html');
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/landscape-screenshot.jpg', type: 'jpeg', quality: 95 });
console.log('done');
await browser.close();

import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/blog-screenshots';
await fs.promises.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

const posts = [
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-10-dating-carnivore.html', name: 'chloe-dating' },
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-11-travel-hacks.html', name: 'chloe-travel' },
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-12-animal-based-debate.html', name: 'chloe-debate' },
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2025-12-19-night-sweats.html', name: 'old-night-sweats' }
];

for (const post of posts) {
  await page.goto(post.url);
  await page.waitForTimeout(1000);
  
  // Screenshot just the header area
  await page.screenshot({ 
    path: `${screenshotDir}/${post.name}-header.png`,
    clip: { x: 0, y: 0, width: 1200, height: 600 }
  });
  
  console.log(`✅ ${post.name} screenshot saved`);
}

await browser.close();
console.log(`\n📁 Screenshots saved to: ${screenshotDir}`);

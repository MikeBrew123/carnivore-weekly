import { chromium } from 'playwright';

const screenshotDir = '/tmp/blog-screenshots';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

const posts = [
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-10-dating-carnivore.html', name: 'chloe-dating-fixed' },
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-11-travel-hacks.html', name: 'chloe-travel-fixed' },
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2026-01-12-animal-based-debate.html', name: 'chloe-debate-fixed' },
  { url: 'file:///Users/mbrew/Developer/carnivore-weekly/public/blog/2025-12-21-night-sweats.html', name: 'old-night-sweats-compare' }
];

for (const post of posts) {
  await page.goto(post.url);
  await page.waitForTimeout(1000);
  
  await page.screenshot({ 
    path: `${screenshotDir}/${post.name}.png`,
    clip: { x: 0, y: 0, width: 1200, height: 600 }
  });
  
  console.log(`✅ ${post.name}`);
}

await browser.close();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto('http://localhost:8000/public/index.html', { waitUntil: 'networkidle' });
  
  // Get all text content to see what's actually displaying
  const content = await page.evaluate(() => {
    return {
      // Check main sections
      hasButchersWisdom: document.body.textContent.includes("Butcher's Wisdom"),
      hasPrimeCuts: document.body.textContent.includes("Prime Cuts"),
      hasCommunityVoice: document.body.textContent.includes("Community Voice"),
      hasSarah: document.body.textContent.includes("Sarah"),
      hasWeeklyRoundup: document.body.textContent.includes("This Week"),
      
      // Get text snippets
      weeklyRoundupText: Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Roundup'))?.textContent,
      videoCounts: document.querySelectorAll('.video-card').length,
      successStories: document.body.textContent.match(/Lost \d+ lbs/g),
      
      // Check for empty sections
      emptyVideoGrid: document.querySelector('#top-videos-grid')?.children.length,
      
      // Check all h2s
      headings: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.substring(0, 50))
    };
  });

  console.log('📊 HOMEPAGE DIAGNOSTIC\n');
  console.log('Sections Found:');
  console.log(`  Butcher's Wisdom: ${content.hasButchersWisdom ? '✅' : '❌'}`);
  console.log(`  Prime Cuts: ${content.hasPrimeCuts ? '✅' : '❌'}`);
  console.log(`  Community Voice: ${content.hasCommunityVoice ? '✅' : '❌'}`);
  console.log(`  Sarah content: ${content.hasSarah ? '✅' : '❌'}`);
  console.log(`  Weekly Roundup: ${content.hasWeeklyRoundup ? '✅' : '❌'}`);
  
  console.log('\nContent Count:');
  console.log(`  Video cards: ${content.videoCounts}`);
  console.log(`  Success stories: ${content.successStories ? content.successStories.length : 0}`);
  console.log(`  Video grid children: ${content.emptyVideoGrid}`);
  
  console.log('\nAll Headings Found:');
  content.headings.forEach((h, i) => console.log(`  ${i+1}. ${h}`));
  
  await browser.close();
})();

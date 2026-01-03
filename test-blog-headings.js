const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('🔍 BLOG POST HEADING VALIDATION\n');
  console.log('URL: https://carnivoreweekly.com/blog/2025-12-18-carnivore-bar-guide.html\n');

  await page.goto('https://carnivoreweekly.com/blog/2025-12-18-carnivore-bar-guide.html', {
    waitUntil: 'networkidle'
  });

  // Get all headings and their styling
  const headingData = await page.evaluate(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings).map(h => {
      const style = window.getComputedStyle(h);
      return {
        tag: h.tagName,
        text: h.textContent.trim(),
        color: style.color,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        class: h.className,
        offsetHeight: h.offsetHeight,
        offsetWidth: h.offsetWidth
      };
    });
  });

  console.log(`📊 Found ${headingData.length} headings\n`);

  headingData.forEach((h, i) => {
    console.log(`${i + 1}. <${h.tag}> ${h.class ? `(class="${h.class}")` : ''}`);
    console.log(`   Text: "${h.text}"`);
    console.log(`   Color: ${h.color}`);
    console.log(`   Font Size: ${h.fontSize}`);
    console.log(`   Font Family: ${h.fontFamily}`);
    console.log(`   Font Weight: ${h.fontWeight}`);
    console.log(`   Display: ${h.display}`);
    console.log(`   Visibility: ${h.visibility}`);
    console.log(`   Opacity: ${h.opacity}`);
    console.log(`   Dimensions: ${h.offsetWidth}px × ${h.offsetHeight}px`);
    console.log();
  });

  // Check for visibility issues
  console.log('━'.repeat(60));
  console.log('\n⚠️  VISIBILITY ANALYSIS\n');

  const issues = [];
  headingData.forEach((h, i) => {
    if (h.display === 'none') {
      issues.push(`Heading ${i + 1}: Hidden with display:none`);
    }
    if (h.visibility === 'hidden') {
      issues.push(`Heading ${i + 1}: Hidden with visibility:hidden`);
    }
    if (parseFloat(h.opacity) === 0) {
      issues.push(`Heading ${i + 1}: Hidden with opacity:0`);
    }
    if (h.offsetHeight === 0) {
      issues.push(`Heading ${i + 1}: Zero height (${h.text})`);
    }
    if (h.offsetWidth === 0) {
      issues.push(`Heading ${i + 1}: Zero width (${h.text})`);
    }
  });

  if (issues.length > 0) {
    console.log('❌ VISIBILITY ISSUES FOUND:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('✅ All headings are visible and have proper dimensions');
  }

  // Take screenshots at different sections
  console.log('\n📸 Capturing screenshots...\n');

  await page.screenshot({
    path: '/tmp/blog-hero.png',
    clip: { x: 0, y: 250, width: 1400, height: 400 }
  });
  console.log('✓ Captured hero/title section');

  await page.screenshot({
    path: '/tmp/blog-content.png',
    clip: { x: 0, y: 500, width: 1400, height: 400 }
  });
  console.log('✓ Captured content section with headings');

  await page.screenshot({
    path: '/tmp/blog-middle.png',
    clip: { x: 0, y: 800, width: 1400, height: 400 }
  });
  console.log('✓ Captured middle section');

  console.log('\n✅ Validation complete\n');

  await browser.close();
})();

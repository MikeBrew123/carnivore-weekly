#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';

const screenshotDir = '/tmp/blog-redesign-validation';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('🔍 Testing Blog Landing Page Redesign...\n');

  try {
    // Navigate to page
    await page.goto('http://localhost:8000/blog-redesign.html', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('✅ Page loaded successfully\n');

    // Test 1: Hero Section
    console.log('Testing Hero Section...');
    const heroSection = await page.locator('.blog-hero').count();
    const heroTitle = await page.locator('.blog-hero h1').textContent();
    const featuredPost = await page.locator('.featured-post-card').count();

    console.log(`  ${heroSection === 1 ? '✅' : '❌'} Hero section present`);
    console.log(`  ${heroTitle?.includes('Insights') ? '✅' : '❌'} Hero title: "${heroTitle}"`);
    console.log(`  ${featuredPost === 1 ? '✅' : '❌'} Featured post card present`);

    await page.screenshot({ path: `${screenshotDir}/01-hero-section.png` });

    // Test 2: Category Sections
    console.log('\nTesting Category Sections...');
    const healthSection = await page.locator('text=Health & Healing').count();
    const performanceSection = await page.locator('text=Performance & Optimization').count();
    const communitySection = await page.locator('text=Community & Lifestyle').count();
    const postGrids = await page.locator('.post-grid').count();

    console.log(`  ${healthSection >= 1 ? '✅' : '❌'} Health & Healing section`);
    console.log(`  ${performanceSection >= 1 ? '✅' : '❌'} Performance & Optimization section`);
    console.log(`  ${communitySection >= 1 ? '✅' : '❌'} Community & Lifestyle section`);
    console.log(`  ${postGrids >= 3 ? '✅' : '❌'} Post grids present: ${postGrids}`);

    await page.screenshot({ path: `${screenshotDir}/02-category-sections.png`, fullPage: true });

    // Test 3: Author Spotlights
    console.log('\nTesting Author Spotlights...');
    const authorCards = await page.locator('.author-card').count();
    const sarahCard = await page.locator('text=Sarah').count();
    const marcusCard = await page.locator('text=Marcus').count();
    const chloeCard = await page.locator('text=Chloe').count();

    console.log(`  ${authorCards === 3 ? '✅' : '❌'} Author cards present: ${authorCards}/3`);
    console.log(`  ${sarahCard >= 1 ? '✅' : '❌'} Sarah card`);
    console.log(`  ${marcusCard >= 1 ? '✅' : '❌'} Marcus card`);
    console.log(`  ${chloeCard >= 1 ? '✅' : '❌'} Chloe card`);

    // Test 4: Newsletter Signup
    console.log('\nTesting Newsletter Section...');
    const newsletterSection = await page.locator('.newsletter-section').count();
    const newsletterForm = await page.locator('.newsletter-form').count();
    const emailInput = await page.locator('input[type="email"]').count();

    console.log(`  ${newsletterSection === 1 ? '✅' : '❌'} Newsletter section present`);
    console.log(`  ${newsletterForm === 1 ? '✅' : '❌'} Newsletter form present`);
    console.log(`  ${emailInput >= 1 ? '✅' : '❌'} Email input field present`);

    // Test 5: Popular Posts Section
    console.log('\nTesting Popular Posts Section...');
    const popularSection = await page.locator('text=Popular This Month').count();

    console.log(`  ${popularSection >= 1 ? '✅' : '❌'} Popular posts section present`);

    // Test 6: Brand Colors
    console.log('\nTesting Brand Colors...');
    const heroBg = await page.evaluate(() => {
      const hero = document.querySelector('.blog-hero');
      return window.getComputedStyle(hero).background;
    });

    console.log(`  ${heroBg?.includes('gradient') ? '✅' : '❌'} Hero gradient background`);

    // Test 7: Layout Integrity
    console.log('\nTesting Layout Integrity...');
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    console.log(`  ${!hasHorizontalScroll ? '✅' : '❌'} No horizontal scroll`);

    // Test 8: Mobile Responsiveness
    console.log('\nTesting Mobile View...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    const mobileHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    console.log(`  ${!mobileHorizontalScroll ? '✅' : '❌'} Mobile: No horizontal scroll`);

    await page.screenshot({ path: `${screenshotDir}/03-mobile-view.png`, fullPage: true });

    // Test 9: Navigation Links
    console.log('\nTesting Navigation...');
    await page.setViewportSize({ width: 1400, height: 900 });
    const navLinks = await page.locator('nav a').count();

    console.log(`  ${navLinks >= 5 ? '✅' : '❌'} Navigation links present: ${navLinks}`);

    // Final Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));

    const checks = [
      heroSection === 1,
      featuredPost === 1,
      postGrids >= 3,
      authorCards === 3,
      newsletterSection === 1,
      !hasHorizontalScroll,
      !mobileHorizontalScroll
    ];

    const passed = checks.filter(Boolean).length;
    const total = checks.length;

    console.log(`✅ Passed: ${passed}/${total} checks`);
    console.log(`📁 Screenshots: ${screenshotDir}/`);

    if (passed === total) {
      console.log('\n🎉 ALL CHECKS PASSED - READY TO COMMIT');
    } else {
      console.log('\n⚠️  SOME CHECKS FAILED - REVIEW NEEDED');
      process.exitCode = 1;
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: `${screenshotDir}/error.png` });
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

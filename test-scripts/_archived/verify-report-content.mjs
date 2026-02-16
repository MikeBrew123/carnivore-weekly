#!/usr/bin/env node
/**
 * Verify Report Content - Analyze generated reports for completeness
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const SCREENSHOT_DIR = '/tmp/calculator-test-screenshots';
const REPORT_URL = 'https://carnivoreweekly.com/report.html';

// Expected sections in comprehensive report
const EXPECTED_SECTIONS = [
  { name: 'Executive Summary', keywords: ['executive', 'summary', 'overview'] },
  { name: 'Food Guide/Pyramid', keywords: ['food guide', 'food pyramid', 'tier'] },
  { name: 'Meal Calendar', keywords: ['meal calendar', '30-day', 'week 1', 'week 2'] },
  { name: 'Shopping List', keywords: ['shopping', 'grocery', 'budget'] },
  { name: 'Physician Script', keywords: ['physician', 'doctor', 'consultation', 'medical'] },
  { name: 'Obstacle Protocol', keywords: ['obstacle', 'challenge', 'problem'] },
  { name: 'Restaurant Guide', keywords: ['restaurant', 'dining', 'eating out', 'travel'] },
  { name: 'Science/Evidence', keywords: ['science', 'evidence', 'research', 'studies'] },
  { name: 'Lab Monitoring', keywords: ['lab', 'bloodwork', 'testing', 'biomarker'] },
  { name: 'Electrolyte', keywords: ['electrolyte', 'sodium', 'potassium', 'magnesium'] },
  { name: 'Timeline', keywords: ['timeline', 'week 1', 'week 2', 'week 3', 'adaptation'] },
  { name: 'Stall Breaker', keywords: ['stall', 'plateau', 'troubleshoot'] },
  { name: 'Progress Tracker', keywords: ['progress', 'tracker', 'measurements', 'tracking'] }
];

// Expected pyramid images
const EXPECTED_IMAGES = [
  'CarnivorFP.png',
  'KetoFP.png',
  'LionFP.png',
  'PescatarianFP.png'
];

await mkdir(SCREENSHOT_DIR, { recursive: true });

async function analyzeReport(accessToken) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Analyzing Report: ${accessToken.substring(0, 16)}...`);
  console.log(`${'='.repeat(60)}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const analysis = {
    accessToken,
    htmlSize: 0,
    sectionsFound: [],
    sectionsMissing: [],
    imagesFound: [],
    estimatedPageCount: 0,
    wordCount: 0,
    success: false
  };

  try {
    const reportUrl = `${REPORT_URL}?token=${accessToken}`;
    console.log(`📄 Loading: ${reportUrl}`);

    await page.goto(reportUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Get full page content
    const htmlContent = await page.content();
    const textContent = await page.innerText('body');

    analysis.htmlSize = htmlContent.length;
    analysis.wordCount = textContent.split(/\s+/).length;

    console.log(`\n📊 Basic Metrics:`);
    console.log(`   HTML Size: ${(analysis.htmlSize / 1024).toFixed(2)} KB`);
    console.log(`   Word Count: ${analysis.wordCount.toLocaleString()}`);

    // Estimate page count (roughly 500 words per page)
    analysis.estimatedPageCount = Math.ceil(analysis.wordCount / 500);
    console.log(`   Estimated Pages (500 words/page): ${analysis.estimatedPageCount}`);

    // Check for sections
    console.log(`\n📋 Section Analysis:`);
    const lowerContent = textContent.toLowerCase();

    for (const section of EXPECTED_SECTIONS) {
      const found = section.keywords.some(keyword =>
        lowerContent.includes(keyword.toLowerCase())
      );

      if (found) {
        analysis.sectionsFound.push(section.name);
        console.log(`   ✅ ${section.name}`);
      } else {
        analysis.sectionsMissing.push(section.name);
        console.log(`   ❌ ${section.name}`);
      }
    }

    // Check for images
    console.log(`\n🖼️  Image Analysis:`);
    const images = await page.locator('img').all();

    for (const img of images) {
      const src = await img.getAttribute('src');
      if (src) {
        analysis.imagesFound.push(src);

        // Check if it's a pyramid image
        const isPyramid = EXPECTED_IMAGES.some(name => src.includes(name));
        if (isPyramid) {
          console.log(`   ✅ Food Pyramid: ${src}`);
        }
      }
    }

    if (images.length === 0) {
      console.log(`   ❌ No images found`);
    }

    // Screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/report-${accessToken.substring(0, 16)}.png`,
      fullPage: true
    });

    // Success criteria
    const hasMinimumSections = analysis.sectionsFound.length >= 10;
    const hasPyramidImage = analysis.imagesFound.some(src =>
      EXPECTED_IMAGES.some(name => src.includes(name))
    );
    const hasReasonableSize = analysis.htmlSize > 15000; // >15KB

    analysis.success = hasMinimumSections && hasPyramidImage && hasReasonableSize;

    console.log(`\n✅ Report Analysis Complete`);
    console.log(`   Sections Found: ${analysis.sectionsFound.length}/${EXPECTED_SECTIONS.length}`);
    console.log(`   Pyramid Images: ${hasPyramidImage ? 'YES' : 'NO'}`);
    console.log(`   Adequate Size: ${hasReasonableSize ? 'YES' : 'NO'}`);
    console.log(`   Overall: ${analysis.success ? 'PASS ✅' : 'FAIL ❌'}`);

  } catch (error) {
    console.error(`\n❌ Analysis failed: ${error.message}`);
    analysis.error = error.message;
  } finally {
    await browser.close();
  }

  return analysis;
}

// Main execution
async function main() {
  console.log('\n🚀 Report Content Verification\n');

  // Report from database (generated ~2 hours ago)
  const testToken = '8e20e4f2675f317afb707360ed9bd8f0f99ebcc061741c84303452b2c449fb03';

  const analysis = await analyzeReport(testToken);

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(JSON.stringify(analysis, null, 2));
  console.log('\n📸 Screenshots saved to: ' + SCREENSHOT_DIR + '\n');
}

main().catch(console.error);

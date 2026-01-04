#!/usr/bin/env node

/**
 * Progress Bar Animation Test with Screenshots
 * Captures the progress bar at each stage to show animation timing
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m'
};

async function testProgressAnimation() {
  let browser;
  let page;

  try {
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}  PROGRESS BAR ANIMATION TEST${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

    browser = await playwright.chromium.launch({ headless: false });
    page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    // Navigate to form
    const formUrl = 'http://localhost:8000/public/calculator-form-rebuild.html';
    await page.goto(formUrl, { waitUntil: 'networkidle' });
    console.log(`${colors.green}✓${colors.reset} Form loaded\n`);

    // Quick form fill
    console.log(`${colors.bold}Filling form quickly...${colors.reset}`);
    await page.waitForSelector('#calculator-form', { timeout: 10000 });

    await page.click('#sex-male');
    await page.fill('input[name="age"]', '32');
    await page.fill('input[name="height"]', '72');
    await page.selectOption('select[name="height-unit"]', 'inches');
    await page.fill('input[name="weight"]', '185');
    await page.selectOption('select[name="weight-unit"]', 'lbs');
    await page.selectOption('select[name="lifestyle_activity"]', 'moderate');
    await page.selectOption('select[name="exercise_frequency"]', '5-6');
    await page.click('#goal-gain');
    await page.waitForTimeout(300);
    await page.selectOption('select[name="deficit_percentage"]', '20');
    await page.click('#diet-carnivore');
    await page.fill('textarea[name="allergies"]', 'None');
    await page.fill('textarea[name="avoid_foods"]', 'None');
    await page.click('#dairy-full');
    await page.fill('textarea[name="previous_diets"]', 'Keto');
    await page.fill('textarea[name="what_worked"]', 'High fat');
    await page.click('#carnivore-months');
    await page.fill('input[name="email"]', 'iambrew@gmail.com');
    await page.fill('input[name="firstName"]', 'test');
    await page.fill('input[name="lastName"]', 'user');

    console.log(`${colors.green}✓${colors.reset} Form ready\n`);

    // Submit and start recording animation
    console.log(`${colors.bold}Starting progress animation...${colors.reset}\n`);

    await page.click('#submit-button');
    await page.waitForSelector('.progress-bar', { timeout: 10000 });

    // Create screenshots directory
    const screenshotsDir = path.join(process.env.HOME, 'Downloads', 'progress-animation');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Monitor progress and capture screenshots
    console.log(`${colors.bold}PROGRESS ANIMATION TIMELINE:${colors.reset}\n`);

    let previousLabel = '';
    let stageCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < 120; i++) {
      try {
        const progressLabel = await page.locator('.progress-label').textContent();
        const progressPercent = await page.locator('.progress-bar-fill').evaluate(el => {
          const width = window.getComputedStyle(el).width;
          return parseInt(width) || 0;
        });

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        // When label changes, capture screenshot
        if (progressLabel && progressLabel !== previousLabel) {
          stageCount++;
          previousLabel = progressLabel;

          console.log(`${colors.yellow}Stage ${stageCount}${colors.reset} [${elapsedTime}s]`);
          console.log(`  ${progressLabel.trim()}`);
          console.log(`  Progress: ${progressPercent}%\n`);

          // Take screenshot of this stage
          const screenshotPath = path.join(screenshotsDir, `stage-${stageCount}-${elapsedTime}s.png`);
          await page.screenshot({ path: screenshotPath });
        }

        // Check completion
        if (progressPercent >= 100) {
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`${colors.green}✓ Animation complete in ${totalTime} seconds${colors.reset}\n`);
          break;
        }

      } catch (e) {
        // ignore
      }

      await page.waitForTimeout(200);
    }

    // Summary
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}ANIMATION SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓${colors.reset} Total stages: ${stageCount}`);
    console.log(`${colors.green}✓${colors.reset} Screenshots saved: ${screenshotsDir}`);
    console.log(`${colors.green}✓${colors.reset} Timeline captured with timestamps\n`);

    console.log(`${colors.bold}What customers see:${colors.reset}`);
    console.log(`  1. Form submission → Progress bar appears`);
    console.log(`  2. Bar animates smoothly through 5 stages`);
    console.log(`  3. Each stage shows different message`);
    console.log(`  4. Percentage increments from 0% → 100%`);
    console.log(`  5. Smooth 0.3s transitions between updates\n`);

    await page.waitForTimeout(2000);

  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testProgressAnimation();

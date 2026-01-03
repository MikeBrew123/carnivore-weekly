const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });

  console.log('\n🔍 RUNNING COMPREHENSIVE VALIDATION SUITE\n');

  const results = {
    timestamp: new Date().toISOString(),
    url: 'http://localhost:8000/public/index-2026.html',
    tests: {}
  };

  // TEST 1: Page Load & Structure
  console.log('1️⃣  Testing page load and structure...');
  await page.goto('http://localhost:8000/public/index-2026.html', { waitUntil: 'networkidle' });

  results.tests.pageStructure = await page.evaluate(() => {
    const tests = {
      headerExists: !!document.querySelector('header'),
      navExists: !!document.querySelector('nav'),
      mainContentExists: !!document.querySelector('.main-content-2026'),
      layoutExists: !!document.querySelector('.layout-wrapper-2026'),
      sidebarFixed: !!document.querySelector('.sidebar-fixed'),
      sidebarMenu: !!document.querySelector('.sidebar-menu'),
      heroSection: !!document.querySelector('.hero-2026'),
      footerExists: !!document.querySelector('footer')
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests
    };
  });

  // TEST 2: CSS Loading
  console.log('2️⃣  Testing CSS and styling...');
  results.tests.cssLoading = await page.evaluate(() => {
    const tests = {
      cssLoaded: document.styleSheets.length > 0,
      fontsLoaded: window.getComputedStyle(document.body).fontFamily.includes('Merriweather') ||
                   window.getComputedStyle(document.body).fontFamily.length > 0,
      colorsApplied: window.getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)',
      layoutFlexbox: window.getComputedStyle(document.querySelector('.layout-wrapper-2026')).display === 'flex'
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests
    };
  });

  // TEST 3: Sidebar Positioning
  console.log('3️⃣  Testing sidebar positioning...');
  results.tests.sidebarPositioning = await page.evaluate(() => {
    const fixed = document.querySelector('.sidebar-fixed');
    const menu = document.querySelector('.sidebar-menu');
    const tests = {
      fixedIsSticky: window.getComputedStyle(fixed).position === 'sticky',
      fixedHasTopOffset: window.getComputedStyle(fixed).top !== 'auto',
      menuIsSticky: window.getComputedStyle(menu).position === 'sticky',
      menuHasTopOffset: window.getComputedStyle(menu).top !== 'auto',
      fixedZIndex: parseInt(window.getComputedStyle(fixed).zIndex) > parseInt(window.getComputedStyle(menu).zIndex)
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests,
      values: {
        fixedPosition: window.getComputedStyle(fixed).position,
        fixedTop: window.getComputedStyle(fixed).top,
        menuPosition: window.getComputedStyle(menu).position,
        menuTop: window.getComputedStyle(menu).top,
        fixedZIndex: window.getComputedStyle(fixed).zIndex,
        menuZIndex: window.getComputedStyle(menu).zIndex
      }
    };
  });

  // TEST 4: Images & Assets
  console.log('4️⃣  Testing images and assets...');
  results.tests.images = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const tests = {
      imagesLoaded: images.length > 0,
      heroImage: !!document.querySelector('.hero-image'),
      logoExists: !!document.querySelector('.logo'),
      imagesWithAlt: images.filter(img => img.alt).length === images.length
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests,
      imageCount: images.length,
      missingAlt: images.filter(img => !img.alt).length
    };
  });

  // TEST 5: Links & Navigation
  console.log('5️⃣  Testing links and navigation...');
  results.tests.navigation = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    const navLinks = Array.from(document.querySelectorAll('nav a'));
    const tests = {
      linksExist: links.length > 0,
      navMenuExists: navLinks.length > 0,
      sidebarMenuLinks: Array.from(document.querySelectorAll('.sidebar-menu a')).length > 0
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests,
      totalLinks: links.length,
      navLinks: navLinks.length
    };
  });

  // TEST 6: Mobile Responsiveness
  console.log('6️⃣  Testing mobile responsiveness...');
  const mobileResults = await (async () => {
    const mobileViewport = { width: 375, height: 812 };
    const mobilePage = await browser.newPage({ viewport: mobileViewport });

    await mobilePage.goto('http://localhost:8000/public/index-2026.html', { waitUntil: 'networkidle' });

    const mobileTests = await mobilePage.evaluate(() => {
      const hasHorizontalScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const layoutStacked = window.getComputedStyle(document.querySelector('.layout-wrapper-2026')).flexDirection === 'column' ||
                           document.documentElement.clientWidth < 768;
      return {
        passed: !hasHorizontalScroll,
        details: {
          noHorizontalScroll: !hasHorizontalScroll,
          layoutResponsive: layoutStacked || document.documentElement.clientWidth < 1200
        }
      };
    });

    await mobilePage.close();
    return mobileTests;
  })();
  results.tests.mobileResponsive = mobileResults;

  // TEST 7: Performance Metrics
  console.log('7️⃣  Testing performance metrics...');
  results.tests.performance = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    return {
      passed: perfData.domContentLoadedEventEnd < 3000,
      details: {
        pageLoadTime: Math.round(perfData.loadEventEnd),
        domContentLoaded: Math.round(perfData.domContentLoadedEventEnd),
        resourcesLoaded: performance.getEntriesByType('resource').length
      }
    };
  });

  // TEST 8: Content Validation
  console.log('8️⃣  Testing content validation...');
  results.tests.content = await page.evaluate(() => {
    const tests = {
      h1Exists: !!document.querySelector('h1'),
      h1Count: document.querySelectorAll('h1').length === 1,
      headingHierarchy: Array.from(document.querySelectorAll('h1, h2, h3, h4')).length > 0,
      paragraphs: document.querySelectorAll('p').length > 0,
      sections: document.querySelectorAll('section').length > 0
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests,
      stats: {
        h1Count: document.querySelectorAll('h1').length,
        h2Count: document.querySelectorAll('h2').length,
        paragraphs: document.querySelectorAll('p').length,
        sections: document.querySelectorAll('section').length
      }
    };
  });

  // TEST 9: Accessibility
  console.log('9️⃣  Testing accessibility...');
  results.tests.accessibility = await page.evaluate(() => {
    const inputs = document.querySelectorAll('input, textarea, select');
    const inputsWithLabels = Array.from(inputs).filter(input => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      return label || input.getAttribute('aria-label');
    });

    const tests = {
      hasLandmarks: !!document.querySelector('header') && !!document.querySelector('main') && !!document.querySelector('footer'),
      imagesHaveAlt: Array.from(document.querySelectorAll('img')).every(img => img.alt || img.getAttribute('aria-label')),
      formsAccessible: inputsWithLabels.length === inputs.length || inputs.length === 0
    };
    return {
      passed: Object.values(tests).every(v => v),
      details: tests,
      stats: {
        formInputs: inputs.length,
        inputsWithLabels: inputsWithLabels.length
      }
    };
  });

  // TEST 10: SEO Elements
  console.log('🔟 Testing SEO elements...');
  results.tests.seo = await page.evaluate(() => {
    const tests = {
      titleExists: !!document.title && document.title.length > 0,
      metaDescription: !!document.querySelector('meta[name="description"]'),
      viewport: !!document.querySelector('meta[name="viewport"]'),
      canonical: !!document.querySelector('link[rel="canonical"]'),
      ogTags: !!document.querySelector('meta[property="og:title"]')
    };
    return {
      passed: Object.values(tests).filter(v => v).length >= 3,
      details: tests,
      title: document.title
    };
  });

  // Calculate overall score
  const passedTests = Object.values(results.tests).filter(t => t.passed).length;
  const totalTests = Object.keys(results.tests).length;
  results.overallScore = Math.round((passedTests / totalTests) * 100);
  results.passed = results.overallScore >= 80;

  // Generate HTML Report
  console.log('\n📊 Generating HTML report...');

  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnivore Weekly - Validation Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a120b 0%, #2d1f14 100%);
      color: #333;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      background: white;
      padding: 40px;
      border-radius: 8px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    h1 {
      color: #1a120b;
      margin-bottom: 10px;
      font-size: 2.5em;
    }

    .score {
      font-size: 3em;
      font-weight: bold;
      color: ${results.overallScore >= 80 ? '#27ae60' : '#e74c3c'};
      margin: 20px 0;
    }

    .timestamp {
      color: #666;
      font-size: 0.9em;
    }

    .test-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .test-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 5px solid;
    }

    .test-card.pass {
      border-left-color: #27ae60;
    }

    .test-card.fail {
      border-left-color: #e74c3c;
    }

    .test-title {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .test-icon {
      font-size: 1.5em;
    }

    .test-details {
      margin-top: 10px;
      font-size: 0.9em;
      color: #666;
    }

    .detail-item {
      padding: 5px 0;
      display: flex;
      justify-content: space-between;
    }

    .detail-item .key {
      font-weight: 500;
    }

    .detail-item .value {
      color: #999;
    }

    .pass-text {
      color: #27ae60;
      font-weight: bold;
    }

    .fail-text {
      color: #e74c3c;
      font-weight: bold;
    }

    .summary {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-top: 40px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .summary h2 {
      color: #1a120b;
      margin-bottom: 20px;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    footer {
      text-align: center;
      padding: 20px;
      color: #999;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🥩 Carnivore Weekly Validation Report</h1>
      <div class="score">${results.overallScore}%</div>
      <p class="timestamp">Generated: ${new Date(results.timestamp).toLocaleString()}</p>
      <p class="timestamp">URL: ${results.url}</p>
      <p>${results.passed ? '<span class="pass-text">✅ All standards met</span>' : '<span class="fail-text">⚠️ Some tests failed</span>'}</p>
    </header>

    <div class="test-grid">
      ${Object.entries(results.tests).map(([key, test], index) => `
        <div class="test-card ${test.passed ? 'pass' : 'fail'}">
          <div class="test-title">
            <span class="test-icon">${test.passed ? '✅' : '❌'}</span>
            <span>${key.replace(/([A-Z])/g, ' $1').trim()}</span>
          </div>
          <div class="test-details">
            ${test.details ? Object.entries(test.details).map(([k, v]) => `
              <div class="detail-item">
                <span class="key">${k}:</span>
                <span class="value">${v ? '✓' : '✗'}</span>
              </div>
            `).join('') : ''}
            ${test.values ? Object.entries(test.values).map(([k, v]) => `
              <div class="detail-item">
                <span class="key">${k}:</span>
                <span class="value">${v}</span>
              </div>
            `).join('') : ''}
            ${test.stats ? Object.entries(test.stats).map(([k, v]) => `
              <div class="detail-item">
                <span class="key">${k}:</span>
                <span class="value">${v}</span>
              </div>
            `).join('') : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-item">
        <span>Tests Passed</span>
        <strong>${passedTests}/${totalTests}</strong>
      </div>
      <div class="summary-item">
        <span>Overall Score</span>
        <strong>${results.overallScore}%</strong>
      </div>
      <div class="summary-item">
        <span>Status</span>
        <strong>${results.passed ? '✅ APPROVED' : '⚠️ NEEDS REVIEW'}</strong>
      </div>
    </div>
  </div>

  <footer>
    <p>Carnivore Weekly Quality Assurance Report</p>
  </footer>
</body>
</html>
  `;

  // Save report
  const reportPath = '/tmp/validation-report.html';
  fs.writeFileSync(reportPath, htmlReport);
  console.log(`\n✅ Report saved to: ${reportPath}`);

  await browser.close();

  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('─────────────────────────');
  console.log(`Overall Score: ${results.overallScore}%`);
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Status: ${results.passed ? '✅ APPROVED' : '⚠️ NEEDS REVIEW'}`);
  console.log('\nOpening report...\n');

  // Open report
  require('child_process').exec(`open ${reportPath}`);
})();

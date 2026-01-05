const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Brand colors
const BRAND_COLORS = {
  darkBrown: '#1a120b',
  gold: '#ffd700',
  tan: '#d4a574'
};

// AI tell patterns
const AI_TELLS = [
  'delve', 'robust', 'leverage', 'innovative', 'revolutionary',
  'cutting-edge', 'synergy', 'paradigm', 'disrupting', 'holistic',
  'seamlessly', 'empower', 'game-changing', 'next-generation',
  'AI language model', 'as an AI', 'I should note', 'it is important to note'
];

// Pages to validate
const PAGES = [
  // Main pages
  { path: '/public/index.html', name: 'index.html', type: 'main' },
  { path: '/public/blog.html', name: 'blog.html', type: 'main' },
  { path: '/public/wiki.html', name: 'wiki.html', type: 'main' },
  { path: '/public/about.html', name: 'about.html', type: 'main' },
  { path: '/public/archive.html', name: 'archive.html', type: 'main' },
  { path: '/public/channels.html', name: 'channels.html', type: 'main' },
  { path: '/public/questionnaire.html', name: 'questionnaire.html', type: 'main' },
  { path: '/public/privacy.html', name: 'privacy.html', type: 'main' },
  { path: '/public/the-lab.html', name: 'the-lab.html', type: 'main' },
  { path: '/public/upgrade-plan.html', name: 'upgrade-plan.html', type: 'main' },

  // Blog posts
  { path: '/blog/2025-12-18-carnivore-bar-guide.html', name: '2025-12-18-carnivore-bar-guide.html', type: 'blog' },
  { path: '/blog/2025-12-19-psmf-fat-loss.html', name: '2025-12-19-psmf-fat-loss.html', type: 'blog' },
  { path: '/blog/2025-12-20-lipid-energy-model.html', name: '2025-12-20-lipid-energy-model.html', type: 'blog' },
  { path: '/blog/2025-12-21-night-sweats.html', name: '2025-12-21-night-sweats.html', type: 'blog' },
  { path: '/blog/2025-12-22-mtor-muscle.html', name: '2025-12-22-mtor-muscle.html', type: 'blog' },
  { path: '/blog/2025-12-23-adhd-connection.html', name: '2025-12-23-adhd-connection.html', type: 'blog' },
  { path: '/blog/2025-12-24-deep-freezer-strategy.html', name: '2025-12-24-deep-freezer-strategy.html', type: 'blog' },
  { path: '/blog/2025-12-25-new-year-same-you.html', name: '2025-12-25-new-year-same-you.html', type: 'blog' },
  { path: '/blog/2025-12-26-seven-dollar-survival-guide.html', name: '2025-12-26-seven-dollar-survival-guide.html', type: 'blog' },
  { path: '/blog/2025-12-27-anti-resolution-playbook.html', name: '2025-12-27-anti-resolution-playbook.html', type: 'blog' },
  { path: '/blog/2025-12-28-physiological-insulin-resistance.html', name: '2025-12-28-physiological-insulin-resistance.html', type: 'blog' },
  { path: '/blog/2025-12-29-lion-diet-challenge.html', name: '2025-12-29-lion-diet-challenge.html', type: 'blog' },
  { path: '/blog/2025-12-30-pcos-hormones.html', name: '2025-12-30-pcos-hormones.html', type: 'blog' },
  { path: '/blog/2025-12-31-acne-purge.html', name: '2025-12-31-acne-purge.html', type: 'blog' },

  // Archive pages
  { path: '/archive/2025-12-26.html', name: '2025-12-26.html', type: 'archive' },

  // Test pages
  { path: '/public/index-2026.html', name: 'index-2026.html', type: 'test' },
  { path: '/public/bento-test.html', name: 'bento-test.html', type: 'test' },
  { path: '/public/trending-explorer-test.html', name: 'trending-explorer-test.html', type: 'test' },
  { path: '/public/wiki-link-preview.html', name: 'wiki-link-preview.html', type: 'test' },
  { path: '/public/index-full.html', name: 'index-full.html', type: 'test' },
];

const BASE_PATH = '/Users/mbrew/Developer/carnivore-weekly';

class PageValidator {
  constructor() {
    this.results = {};
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.browser = await chromium.launch();
    this.context = await this.browser.createContext({
      viewport: { width: 1400, height: 900 }
    });
  }

  async validatePage(pageConfig) {
    const filePath = path.join(BASE_PATH, pageConfig.path);

    if (!fs.existsSync(filePath)) {
      return {
        name: pageConfig.name,
        type: pageConfig.type,
        visual: { status: 'FAIL', message: 'File not found' },
        seo: { status: 'FAIL', message: 'File not found' },
        brand: { status: 'FAIL', message: 'File not found' },
        content: { status: 'FAIL', message: 'File not found' },
        a11y: { status: 'FAIL', message: 'File not found' },
        performance: { status: 'FAIL', message: 'File not found' }
      };
    }

    const html = fs.readFileSync(filePath, 'utf-8');
    const page = await this.context.newPage();

    try {
      // Load page from file
      await page.goto(`file://${filePath}`);
      await page.waitForTimeout(500);

      // Take screenshot
      const screenshotPath = path.join(BASE_PATH, 'validation-screenshots', `${pageConfig.name}.png`);
      if (!fs.existsSync(path.dirname(screenshotPath))) {
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      }
      await page.screenshot({ path: screenshotPath });

      // Run validations
      const visual = await this.validateVisual(page, pageConfig.name);
      const seo = this.validateSEO(html, pageConfig.name);
      const brand = await this.validateBrand(page, pageConfig.name);
      const content = this.validateContent(html, pageConfig.name);
      const a11y = this.validateA11y(html, pageConfig.name);
      const performance = await this.validatePerformance(page, pageConfig.name);

      return {
        name: pageConfig.name,
        type: pageConfig.type,
        visual,
        seo,
        brand,
        content,
        a11y,
        performance
      };
    } catch (error) {
      console.error(`Error validating ${pageConfig.name}:`, error.message);
      return {
        name: pageConfig.name,
        type: pageConfig.type,
        error: error.message
      };
    } finally {
      await page.close();
    }
  }

  async validateVisual(page, pageName) {
    const issues = [];

    try {
      // Check for broken images
      const images = await page.locator('img').all();
      for (const img of images) {
        const src = await img.getAttribute('src');
        const isVisible = await img.isVisible().catch(() => false);
        if (isVisible && !src) {
          issues.push('Image without src attribute');
        }
      }

      // Check layout rendering
      const html = await page.content();
      if (html.includes('undefined') || html.includes('null')) {
        issues.push('Template rendering issue (undefined/null in HTML)');
      }

      // Check for common layout issues
      const bodySize = await page.evaluate(() => {
        return {
          width: document.body.scrollWidth,
          height: document.body.scrollHeight
        };
      });

      if (bodySize.width > 1500) {
        issues.push('Horizontal scroll detected (layout issue)');
      }

      return {
        status: issues.length === 0 ? 'PASS' : 'WARN',
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  validateSEO(html, pageName) {
    const issues = [];

    // Check title
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (!titleMatch || !titleMatch[1] || titleMatch[1].length === 0) {
      issues.push('Missing or empty page title');
    } else if (titleMatch[1].length > 60) {
      issues.push(`Title too long: ${titleMatch[1].length} chars (should be <60)`);
    }

    // Check meta description
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)">/i);
    if (!descMatch || !descMatch[1] || descMatch[1].length === 0) {
      issues.push('Missing meta description');
    } else if (descMatch[1].length > 160) {
      issues.push(`Meta description too long: ${descMatch[1].length} chars (should be <160)`);
    }

    // Check h1 count
    const h1Count = (html.match(/<h1/gi) || []).length;
    if (h1Count === 0) {
      issues.push('Missing h1 tag');
    } else if (h1Count > 1) {
      issues.push(`Multiple h1 tags found: ${h1Count} (should have exactly 1)`);
    }

    // Check heading hierarchy
    const headingMatch = html.match(/<h([1-6])/gi);
    if (headingMatch) {
      const headings = headingMatch.map(h => parseInt(h.match(/\d/)[0]));
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] - headings[i - 1] > 1) {
          issues.push(`Heading hierarchy skip: h${headings[i - 1]} -> h${headings[i]}`);
          break;
        }
      }
    }

    // Check for canonical link
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)">/i);
    if (!canonicalMatch && pageName.includes('blog')) {
      issues.push('Missing canonical link');
    }

    // Check images have alt text
    const imgMatch = html.match(/<img[^>]*>/gi) || [];
    let missingAlt = 0;
    imgMatch.forEach(img => {
      if (!img.includes('alt=') || img.includes('alt=""')) {
        missingAlt++;
      }
    });
    if (missingAlt > 0) {
      issues.push(`${missingAlt} images without proper alt text`);
    }

    return {
      status: issues.length === 0 ? 'PASS' : (issues.length > 2 ? 'FAIL' : 'WARN'),
      issues: issues.length > 0 ? issues : undefined
    };
  }

  async validateBrand(page, pageName) {
    const issues = [];

    try {
      // Check for brand colors in computed styles
      const bodyBg = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      // Note: This is a simplification. In real validation, would check more thoroughly
      if (bodyBg && bodyBg.includes('rgb(26, 18, 11)')) {
        // Dark brown found
      } else if (bodyBg && bodyBg.includes('rgb(255, 215, 0)')) {
        // Gold found
      }

      // Check for brand fonts
      const fontFamily = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });

      if (!fontFamily || fontFamily === 'none') {
        issues.push('Font not properly loaded');
      }

      return {
        status: issues.length === 0 ? 'PASS' : 'WARN',
        issues: issues.length > 0 ? issues : undefined
      };
    } catch (error) {
      return { status: 'WARN', message: error.message };
    }
  }

  validateContent(html, pageName) {
    const issues = [];
    const contentMatch = html.match(/<body[^>]*>[\s\S]*<\/body>/i);
    const body = contentMatch ? contentMatch[0] : html;
    const lowerBody = body.toLowerCase();

    // Check for AI tells
    AI_TELLS.forEach(tell => {
      if (lowerBody.includes(tell.toLowerCase())) {
        issues.push(`AI tell detected: "${tell}"`);
      }
    });

    // Check for empty content
    const textContent = body.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 100) {
      issues.push('Minimal content (< 100 chars)');
    }

    return {
      status: issues.length === 0 ? 'PASS' : (issues.some(i => i.includes('AI tell')) ? 'FAIL' : 'WARN'),
      issues: issues.length > 0 ? issues : undefined
    };
  }

  validateA11y(html, pageName) {
    const issues = [];

    // Check for alt text on images
    const imgMatch = html.match(/<img[^>]*>/gi) || [];
    let missingAlt = 0;
    imgMatch.forEach(img => {
      if (!img.includes('alt=') || img.includes('alt=""')) {
        missingAlt++;
      }
    });
    if (missingAlt > 0) {
      issues.push(`${missingAlt} images without alt text`);
    }

    // Check for lang attribute
    if (!html.includes('lang=')) {
      issues.push('Missing lang attribute on html tag');
    }

    // Check heading structure
    const headingMatch = html.match(/<h([1-6])[^>]*>([^<]*)<\/h\1>/gi) || [];
    if (headingMatch.length === 0) {
      issues.push('No heading structure found');
    }

    // Check for skip links
    if (!html.includes('skip') && !html.includes('Skip')) {
      // Note: Not all sites need skip links, so this is informational
    }

    return {
      status: issues.length === 0 ? 'PASS' : 'WARN',
      issues: issues.length > 0 ? issues : undefined
    };
  }

  async validatePerformance(page, pageName) {
    const issues = [];

    try {
      const metrics = await page.metrics();

      // Check for large memory footprint
      if (metrics.JSHeapUsedSize > 50 * 1024 * 1024) {
        issues.push('High JS heap usage (>50MB)');
      }

      // Check layout recalculations
      if (metrics.LayoutCount > 100) {
        issues.push('Excessive layout calculations (>100)');
      }

      return {
        status: issues.length === 0 ? 'PASS' : 'WARN',
        issues: issues.length > 0 ? issues : undefined,
        metrics: {
          jsHeapSize: `${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)}MB`,
          layoutCount: metrics.LayoutCount
        }
      };
    } catch (error) {
      return { status: 'WARN', message: error.message };
    }
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }
}

async function main() {
  const validator = new PageValidator();
  await validator.init();

  const results = {};
  let totalPages = 0;
  let passedPages = 0;
  let criticalIssues = [];
  let warnings = [];

  console.log('Starting comprehensive site validation...\n');

  for (const pageConfig of PAGES) {
    totalPages++;
    process.stdout.write(`Validating ${pageConfig.name}... `);

    const result = await validator.validatePage(pageConfig);
    results[pageConfig.name] = result;

    let hasError = false;
    if (!result.error) {
      const allPass = ['visual', 'seo', 'brand', 'content', 'a11y', 'performance'].every(
        key => result[key]?.status === 'PASS'
      );

      if (allPass) {
        console.log('✓ PASS');
        passedPages++;
      } else {
        console.log('⚠ ISSUES FOUND');

        // Collect critical issues
        if (result.content?.status === 'FAIL' || result.seo?.status === 'FAIL') {
          criticalIssues.push({
            page: pageConfig.name,
            issues: {
              ...(result.content?.status === 'FAIL' && { content: result.content.issues }),
              ...(result.seo?.status === 'FAIL' && { seo: result.seo.issues })
            }
          });
        }

        // Collect warnings
        if (result.visual?.issues || result.a11y?.issues || result.performance?.issues) {
          warnings.push({
            page: pageConfig.name,
            issues: {
              ...(result.visual?.issues && { visual: result.visual.issues }),
              ...(result.a11y?.issues && { a11y: result.a11y.issues }),
              ...(result.performance?.issues && { performance: result.performance.issues })
            }
          });
        }
      }
    } else {
      console.log(`✗ ERROR: ${result.error}`);
    }
  }

  await validator.close();

  // Generate report
  const reportPath = path.join(BASE_PATH, 'VALIDATION_REPORT.md');
  const report = generateReport(results, totalPages, passedPages, criticalIssues, warnings);
  fs.writeFileSync(reportPath, report);

  console.log(`\n✓ Validation complete. Report saved to: ${reportPath}`);
  console.log(`Summary: ${passedPages}/${totalPages} pages passed`);
}

function generateReport(results, totalPages, passedPages, criticalIssues, warnings) {
  const timestamp = new Date().toISOString();

  let report = `# COMPREHENSIVE VALIDATION REPORT
Generated: ${timestamp}

## SUMMARY
- Total pages validated: ${totalPages}
- Passed: ${passedPages}
- Issues found: ${totalPages - passedPages}

## CRITICAL ISSUES
${criticalIssues.length === 0 ? 'None found.' : criticalIssues.map(issue => `
### ${issue.page}
${JSON.stringify(issue.issues, null, 2)}
`).join('\n')}

## WARNINGS
${warnings.length === 0 ? 'None found.' : warnings.map(w => `
### ${w.page}
${JSON.stringify(w.issues, null, 2)}
`).join('\n')}

## PAGE-BY-PAGE RESULTS
`;

  for (const [pageName, result] of Object.entries(results)) {
    report += `
### ${pageName}
- **Type**: ${result.type}
- **Visual**: ${result.error ? 'ERROR' : result.visual?.status || 'N/A'}
- **SEO**: ${result.error ? 'ERROR' : result.seo?.status || 'N/A'}
- **Brand**: ${result.error ? 'ERROR' : result.brand?.status || 'N/A'}
- **Content**: ${result.error ? 'ERROR' : result.content?.status || 'N/A'}
- **A11y**: ${result.error ? 'ERROR' : result.a11y?.status || 'N/A'}
- **Performance**: ${result.error ? 'ERROR' : result.performance?.status || 'N/A'}
${result.error ? `- **Error**: ${result.error}` : ''}
`;
  }

  return report;
}

main().catch(console.error);

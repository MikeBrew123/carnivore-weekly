#!/usr/bin/env node

/**
 * Lighthouse Performance Audit
 * Extracts Core Web Vitals metrics and compares against targets
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:8000/index.html';

// Target thresholds
const TARGETS = {
  lcp: 2500,    // Largest Contentful Paint (ms) - target: ≤2.5s
  cls: 0.1,     // Cumulative Layout Shift - target: <0.1
  inp: 200      // Interaction to Next Paint (ms) - target: ≤200ms
};

async function runAudit() {
  console.log('\n=== LIGHTHOUSE PERFORMANCE AUDIT ===\n');
  console.log(`URL: ${URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  let chrome;
  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance']
    };

    // Run Lighthouse
    const runnerResult = await lighthouse(URL, options);
    const report = JSON.parse(runnerResult.report);

    // Extract metrics
    console.log('📊 CORE WEB VITALS RESULTS\n');
    console.log('─'.repeat(50));

    const results = {
      timestamp: new Date().toISOString(),
      url: URL,
      metrics: {},
      passed: [],
      failed: []
    };

    // LCP - Largest Contentful Paint
    const lcpAudit = report.audits['largest-contentful-paint'];
    const lcpValue = lcpAudit?.numericValue || null;
    const lcpPass = lcpValue !== null && lcpValue <= TARGETS.lcp;
    results.metrics.lcp = {
      value: lcpValue,
      unit: 'ms',
      target: TARGETS.lcp,
      pass: lcpPass,
      status: lcpPass ? 'PASS' : 'FAIL'
    };
    console.log(`LCP (Largest Contentful Paint):`);
    console.log(`  Current: ${lcpValue ? lcpValue.toFixed(0) : 'N/A'}ms`);
    console.log(`  Target:  ${TARGETS.lcp}ms`);
    console.log(`  Status:  ${lcpPass ? '✅ PASS' : '❌ FAIL'}\n`);
    if (lcpPass) results.passed.push('LCP'); else results.failed.push('LCP');

    // CLS - Cumulative Layout Shift
    const clsAudit = report.audits['cumulative-layout-shift'];
    const clsValue = clsAudit?.numericValue || null;
    const clsPass = clsValue !== null && clsValue < TARGETS.cls;
    results.metrics.cls = {
      value: clsValue,
      target: TARGETS.cls,
      pass: clsPass,
      status: clsPass ? 'PASS' : 'FAIL'
    };
    console.log(`CLS (Cumulative Layout Shift):`);
    console.log(`  Current: ${clsValue !== null ? clsValue.toFixed(3) : 'N/A'}`);
    console.log(`  Target:  < ${TARGETS.cls}`);
    console.log(`  Status:  ${clsPass ? '✅ PASS' : '❌ FAIL'}\n`);
    if (clsPass) results.passed.push('CLS'); else results.failed.push('CLS');

    // INP - Interaction to Next Paint
    const inpAudit = report.audits['interaction-to-next-paint'];
    const inpValue = inpAudit?.numericValue || null;
    const inpPass = inpValue !== null && inpValue <= TARGETS.inp;
    results.metrics.inp = {
      value: inpValue,
      unit: 'ms',
      target: TARGETS.inp,
      pass: inpPass,
      status: inpPass ? 'PASS' : 'FAIL'
    };
    console.log(`INP (Interaction to Next Paint):`);
    console.log(`  Current: ${inpValue ? inpValue.toFixed(0) : 'N/A'}ms`);
    console.log(`  Target:  ${TARGETS.inp}ms`);
    console.log(`  Status:  ${inpPass ? '✅ PASS' : '❌ FAIL'}\n`);
    if (inpPass) results.passed.push('INP'); else results.failed.push('INP');

    // Overall Performance Score
    const perfScore = Math.round(report.categories.performance.score * 100);
    console.log(`─`.repeat(50));
    console.log(`\n📈 LIGHTHOUSE PERFORMANCE SCORE: ${perfScore}/100\n`);

    // Summary
    console.log('📋 SUMMARY\n');
    console.log(`Metrics Passed: ${results.passed.length}/3`);
    console.log(`Metrics Failed: ${results.failed.length}/3`);

    if (results.failed.length > 0) {
      console.log(`\nFailed metrics:`);
      results.failed.forEach(m => console.log(`  ❌ ${m}`));
    }

    if (results.passed.length === 3) {
      console.log('\n✅ AUDIT PASSED - All Core Web Vitals within target range!');
      results.overall = 'PASS';
    } else {
      console.log('\n❌ AUDIT FAILED - Some metrics exceed targets');
      results.overall = 'FAIL';
    }

    // Save results
    const reportPath = '/tmp/lighthouse-audit-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Full results saved to: ${reportPath}\n`);

    return results;

  } catch (error) {
    console.error('Audit error:', error);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

// Run the audit
runAudit().then(results => {
  process.exit(results.overall === 'PASS' ? 0 : 1);
});

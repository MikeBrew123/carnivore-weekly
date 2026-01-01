#!/usr/bin/env node

/**
 * Lighthouse Threshold Checker
 * Validates Core Web Vitals and performance scores against required thresholds
 *
 * Usage: node scripts/check-lighthouse-thresholds.js <report-json>
 */

const fs = require('fs');
const path = require('path');

// Validation thresholds
const THRESHOLDS = {
  lighthouseScore: 90,
  lcp: 2500,      // Largest Contentful Paint (ms)
  cls: 0.1,       // Cumulative Layout Shift
  fid: 100,       // First Input Delay (ms)
  fcp: 1800,      // First Contentful Paint (ms)
  tbt: 200        // Total Blocking Time (ms)
};

function validateThresholds(reportPath) {
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Report file not found: ${reportPath}`);
    process.exit(1);
  }

  let report;
  try {
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    report = JSON.parse(reportContent);
  } catch (error) {
    console.error(`❌ Failed to parse report: ${error.message}`);
    process.exit(1);
  }

  console.log('\n📊 LIGHTHOUSE VALIDATION REPORT');
  console.log('================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Check Lighthouse overall score
  const performanceScore = report.categories.performance.score * 100;
  console.log(`Lighthouse Performance Score: ${Math.round(performanceScore)}/100`);

  if (performanceScore < THRESHOLDS.lighthouseScore) {
    results.failed.push({
      metric: 'Lighthouse Score',
      value: Math.round(performanceScore),
      threshold: THRESHOLDS.lighthouseScore,
      status: 'FAIL'
    });
  } else if (performanceScore < THRESHOLDS.lighthouseScore + 5) {
    results.warnings.push({
      metric: 'Lighthouse Score',
      value: Math.round(performanceScore),
      threshold: THRESHOLDS.lighthouseScore,
      status: 'WARN'
    });
  } else {
    results.passed.push('Lighthouse Score');
  }

  // Check Core Web Vitals
  console.log('\n📈 CORE WEB VITALS');
  console.log('------------------');

  const cwvMetrics = {
    'Largest Contentful Paint (LCP)': {
      audit: 'largest-contentful-paint',
      threshold: THRESHOLDS.lcp,
      unit: 'ms',
      max: true
    },
    'Cumulative Layout Shift (CLS)': {
      audit: 'cumulative-layout-shift',
      threshold: THRESHOLDS.cls,
      unit: '',
      max: true
    },
    'First Contentful Paint (FCP)': {
      audit: 'first-contentful-paint',
      threshold: THRESHOLDS.fcp,
      unit: 'ms',
      max: true
    },
    'First Input Delay (FID)': {
      audit: 'first-input-delay',
      threshold: THRESHOLDS.fid,
      unit: 'ms',
      max: true
    },
    'Total Blocking Time (TBT)': {
      audit: 'total-blocking-time',
      threshold: THRESHOLDS.tbt,
      unit: 'ms',
      max: true
    }
  };

  Object.entries(cwvMetrics).forEach(([name, config]) => {
    const audit = report.audits[config.audit];
    if (!audit) {
      console.log(`⚠️  ${name}: Not available`);
      return;
    }

    const value = audit.numericValue || 0;
    const displayValue = config.unit ? `${value.toFixed(2)}${config.unit}` : value.toFixed(3);
    const threshold = config.threshold;

    console.log(`${name}: ${displayValue}`);

    if (config.max && value > threshold) {
      results.failed.push({
        metric: name,
        value: displayValue,
        threshold: `${threshold}${config.unit}`,
        status: 'FAIL'
      });
    } else if (config.max && value > threshold * 0.9) {
      results.warnings.push({
        metric: name,
        value: displayValue,
        threshold: `${threshold}${config.unit}`,
        status: 'WARN'
      });
    } else {
      results.passed.push(name);
    }
  });

  // Summary
  console.log('\n📋 SUMMARY');
  console.log('----------');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED METRICS:');
    results.failed.forEach(item => {
      console.log(`   - ${item.metric}: ${item.value} (required: ${item.threshold})`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNING METRICS:');
    results.warnings.forEach(item => {
      console.log(`   - ${item.metric}: ${item.value} (target: ${item.threshold})`);
    });
  }

  // Save results
  const outputPath = path.join(path.dirname(reportPath), 'threshold-validation.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    results,
    overall: results.failed.length === 0 ? 'PASS' : 'FAIL'
  }, null, 2));

  console.log(`\n📄 Results saved to: ${outputPath}`);

  // Exit with appropriate code
  if (results.failed.length > 0) {
    console.error('\n❌ VALIDATION FAILED - Some metrics did not meet thresholds');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.warn('\n⚠️  VALIDATION PASSED WITH WARNINGS - Some metrics are close to thresholds');
    process.exit(0);
  } else {
    console.log('\n✅ VALIDATION PASSED - All metrics meet thresholds');
    process.exit(0);
  }
}

// Run validation
const reportPath = process.argv[2] || 'lighthouse-report.json';
validateThresholds(reportPath);

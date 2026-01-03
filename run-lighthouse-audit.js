#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Runner
 * Runs audit and extracts Core Web Vitals
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:8000/index.html';
const REPORT_PATH = '/tmp/lighthouse-report.json';
const VALIDATION_SCRIPT = '/Users/mbrew/Developer/carnivore-weekly/scripts/check-lighthouse-thresholds.js';

console.log('Starting Lighthouse Performance Audit...\n');
console.log(`URL: ${URL}`);
console.log(`Report: ${REPORT_PATH}\n`);

// Run Lighthouse
const lighthouseCmd = `npx lighthouse ${URL} --only-categories=performance --output=json --output-path=${REPORT_PATH} --quiet`;

exec(lighthouseCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Error running Lighthouse:', error.message);
    process.exit(1);
  }

  console.log('Lighthouse audit completed.\n');

  // Now validate with threshold checker
  const validationCmd = `node ${VALIDATION_SCRIPT} ${REPORT_PATH}`;

  exec(validationCmd, (error2, stdout2, stderr2) => {
    console.log(stdout2);
    if (stderr2) console.error(stderr2);

    // Exit with appropriate code
    process.exit(error2 ? 1 : 0);
  });
});

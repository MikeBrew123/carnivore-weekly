#!/usr/bin/env node
/**
 * tests/regen-report.mjs
 *
 *     node tests/regen-report.mjs <inputs.json> <out.html>
 *
 * Regenerates one customer's report from stored questionnaire inputs, through the
 * production generator and the production renderer, and writes the HTML for PDF
 * inspection. Nothing here edits the output: it calls generateAllReports() and
 * wrapInPrintHTML() the way handleReportInit() does.
 *
 * NO CUSTOMER DATA LIVES IN THIS FILE. This repository is public. The inputs
 * file is a local JSON copy of a row's form_data from cw_assessment_sessions and
 * must be kept outside the repo. Pass its path as the first argument.
 *
 * Optional key in the inputs file:
 *
 *   "_expectedMacros": { "calories": 1463, "protein_grams": 109, "fat_grams": 114 }
 *
 * When present, the macros are checked before a single token is spent and the run
 * aborts on any mismatch. Use it whenever a report has been reviewed with the
 * customer, so a drifted or stale input set cannot quietly produce different
 * numbers from the ones they were promised.
 *
 * A NOTE ON STORED INPUTS, learned 2026-09-09: a correction agreed with a
 * customer by email is not necessarily in the database. One session still
 * carried the contradictory goal that caused the original complaint, so a
 * regeneration straight from stored data reproduced the wrong calorie target.
 * If you override a stored field, say so in the inputs file and set
 * _expectedMacros, then get the stored row corrected separately.
 */

import fs from 'node:fs';
import {
  __test_generateAllReports as generateAllReports,
  __test_wrapInPrintHTML as wrapInPrintHTML,
  __test_calculateMacros as calculateMacros
} from '../api/calculator-api.js';

const [inputsPath, OUT] = process.argv.slice(2);
if (!inputsPath || !OUT) {
  console.error('usage: node tests/regen-report.mjs <inputs.json> <out.html>');
  process.exit(1);
}

// secrets/ is gitignored and therefore absent from a worktree. Read the canonical
// file in place rather than copying a credential to a second location on disk.
const SECRETS = process.env.CW_SECRETS
  || '/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json';
const anthropic = JSON.parse(fs.readFileSync(SECRETS, 'utf8')).anthropic || {};
const apiKey = anthropic.key || anthropic.api_key;
if (!apiKey) throw new Error(`no anthropic key in ${SECRETS}`);

const { _expectedMacros: expected, ...form } = JSON.parse(fs.readFileSync(inputsPath, 'utf8'));

const macros = calculateMacros(form);
if (expected) {
  for (const [k, v] of Object.entries(expected)) {
    if (macros[k] !== v) {
      throw new Error(`macro drift: ${k} is ${macros[k]}, expected ${v}. Refusing to generate.`);
    }
  }
  console.log('macros match the reviewed figures:', expected);
}

// Match handleReportInit() exactly: macros hang off data.macros, not the top
// level. The prompt builder reads data.macros.protein_grams, so a harness that
// spreads them flat leaves the model with no numbers and it invents ranges
// ("~1,400-1,700") instead of stating the customer's targets.
const data = { ...form, sessionToken: 'regen' };
data.macros = macros;

const reports = await generateAllReports(data, apiKey);

// Section assembly, also verbatim from handleReportInit(): numeric 1..13.
let markdown = '';
for (let i = 1; i <= 13; i++) {
  if (reports[i]) {
    if (i > 1) markdown += '\n\n---\n\n';
    markdown += reports[i];
  }
}

fs.writeFileSync(OUT, wrapInPrintHTML(markdown, data));
console.log(`wrote ${OUT} (${Object.keys(reports).length} sections)`);
console.log('Now run: node tests/verify-rendered-report.mjs ' + OUT);

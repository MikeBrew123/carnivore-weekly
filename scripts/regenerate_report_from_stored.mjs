#!/usr/bin/env node
/**
 * scripts/regenerate_report_from_stored.mjs
 *
 * Regenerate a paid report for ONE session, from what the database actually holds.
 *
 * Usage:
 *   node scripts/regenerate_report_from_stored.mjs <session-id> --out <file.html> [--stub]
 *
 * WHY THIS EXISTS
 * ---------------
 * Judith's corrected report on 2026-09-08 was produced by hand-editing a rendered
 * HTML file. That file drifted from the database, and the next regeneration from
 * stored inputs would have reproduced the original broken report, because the
 * correction lived only in the artifact. A regeneration that does not read the
 * canonical row proves nothing about what the product will do next time.
 *
 * So this script reads the session row over the Supabase REST API and pushes it
 * through the SAME functions the worker calls: buildReportData -> calculateMacros ->
 * generateAllReports -> wrapInPrintHTML. It has no override flags and no way to
 * inject a value. If the stored row is wrong, the output is wrong, visibly.
 *
 * --stub replaces the Anthropic call with a placeholder so the deterministic sections
 * can be checked without spending tokens. Never ship a --stub render to a customer.
 */
import fs from 'fs';
import path from 'path';

const SECRETS = '/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json';

const args = process.argv.slice(2);
const sessionId = args.find(a => !a.startsWith('--'));
const out = args[args.indexOf('--out') + 1];
const stub = args.includes('--stub');
if (!sessionId || args.indexOf('--out') === -1) {
  console.error('usage: regenerate_report_from_stored.mjs <session-id> --out <file.html> [--stub]');
  process.exit(2);
}

const secrets = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));
const SUPABASE_URL = secrets.supabase.url;
const SERVICE_KEY = secrets.supabase.service_role_key;
const ANTHROPIC_KEY = secrets.anthropic.key;

// --- 1. Read the canonical row. -------------------------------------------------
const url = `${SUPABASE_URL}/rest/v1/cw_assessment_sessions` +
            `?id=eq.${encodeURIComponent(sessionId)}&select=*`;
const res = await fetch(url, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
});
if (!res.ok) { console.error(`Supabase read failed: ${res.status} ${await res.text()}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== 1) { console.error(`expected 1 row, got ${rows.length}`); process.exit(1); }
const session = rows[0];

console.log(`session   ${session.id}`);
console.log(`email     ${session.email}`);
console.log(`payment   ${session.payment_status}`);
console.log(`goal      ${JSON.stringify(session.form_data?.goal)}`);
console.log(`goals     ${JSON.stringify(session.form_data?.goals)}`);
console.log(`confirmed ${JSON.stringify(session.form_data?.primaryGoalConfirmed)}`);

// --- 2. Stub the model only when asked. -----------------------------------------
if (stub) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, o) => String(u).includes('anthropic.com')
    ? { ok: true, json: async () => ({ content: [{ text: '[AI SECTION STUBBED]' }] }) }
    : realFetch(u, o);
}

// --- 3. The real production path. Same functions the worker calls. --------------
const api = await import(path.resolve('api/calculator-api.js'));
const data = api.__test_buildReportData(session);
data.macros = api.__test_calculateMacros(session.form_data);

// generateAllReports calls assertReportInputsCoherent() first and throws
// GOAL_CONFLICT_UNRESOLVED on a contradiction. That is the point: a stored row that
// still argues with itself must fail here, loudly, rather than render.
let sections;
try {
  sections = await api.__test_generateAllReports(data, ANTHROPIC_KEY);
} catch (err) {
  console.error(`\nGENERATION REFUSED: ${err.code || err.name}: ${err.message}`);
  if (err.code === 'GOAL_CONFLICT_UNRESOLVED') {
    console.error('The stored row still contradicts itself. Fix the row, not this script.');
  }
  process.exit(1);
}

// Assemble exactly the way handleReportInit does: sections 1..13, joined by rules.
// Duplicated shape, not duplicated logic: if the worker ever changes its assembly this
// must change with it, so keep the loop identical and the bound read off the sections.
let reportMarkdown = '';
for (let i = 1; i <= 13; i++) {
  if (!sections[i]) continue;
  if (i > 1) reportMarkdown += '\n\n---\n\n';
  reportMarkdown += sections[i];
}
const html = api.__test_wrapInPrintHTML(reportMarkdown, data);
fs.writeFileSync(out, html);
console.log(`\nmacros    ${data.macros.calories} kcal, ${data.macros.protein_grams}g protein, ${data.macros.fat_grams}g fat`);
console.log(`sections  ${Object.keys(sections).join(',')}`);
console.log(`written   ${out}  (${html.length} bytes)${stub ? '  [STUBBED, not for a customer]' : ''}`);

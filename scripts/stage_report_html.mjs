#!/usr/bin/env node
/**
 * scripts/stage_report_html.mjs
 *
 * Upload corrected report HTML into public.calculator_report_staging so a single
 * atomic SQL statement can archive the old content and promote the new one.
 *
 *   node scripts/stage_report_html.mjs <report-id> <session-id> <file.html> \
 *        --reason "..." [--actor "..."]
 *
 * WHY STAGING RATHER THAN A DIRECT PATCH.
 * calculator_reports has UNIQUE(session_id) and UNIQUE(access_token), and the
 * access_token IS the customer's link, so the live row must be updated in place rather
 * than replaced. Doing that safely means archiving the old content and writing the new
 * content in ONE indivisible statement. A two-step "insert archive, then PATCH the row"
 * leaves a window where the PATCH lands after a failed archive, which is unrecoverable
 * content loss. It is also a full-object PATCH, the same class of call that wiped seven
 * images off two Etsy listings on 2026-08-10.
 *
 * So the bytes cross the wire once, over a transport built for them, and the database
 * verifies length and sha256 before anything live is touched.
 *
 * This script ONLY stages. It never touches the live row.
 */
import fs from 'fs';
import crypto from 'crypto';

const SECRETS = '/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json';
const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !String(args[i - 1] || '').startsWith('--'));
const [reportId, sessionId, file] = positional;
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i > -1 ? args[i + 1] : dflt; };
const reason = opt('reason');
const actor = opt('actor', 'operator');
// Never defaulted and never committed: this repo is public, and scripts/check-pii.sh
// blocks a customer address appearing in it. Pass it at call time.
const email = opt('email');

if (!reportId || !sessionId || !file || !reason || !email) {
  console.error('usage: stage_report_html.mjs <report-id> <session-id> <file.html> \\');
  console.error('         --reason "..." --email <customer email> [--actor "..."]');
  process.exit(2);
}

const { supabase } = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));
const html = fs.readFileSync(file, 'utf8');

// Postgres length() counts CHARACTERS; JavaScript .length counts UTF-16 code units.
// One astral character makes them disagree and the staging CHECK would reject a
// perfectly good upload for the wrong reason.
const charLength = [...html].length;
const sha256 = crypto.createHash('sha256').update(html, 'utf8').digest('hex');

// Refuse to stage something that is not a finished, correct report. Staging is one
// statement away from a paying customer's live URL.
const required = ['A Note Before You Start', '1,463', '109g', '114g', 'prolapse', 'clinician'];
const forbidden = ['Stall-Breaker', 'consistent weight loss', 'healing benefits appear',
                   'Ground Beef (80/20) + Grass-fed Ground Beef', '{{', 'undefined', 'NaN'];
const missing = required.filter(s => !html.includes(s));
const present = forbidden.filter(s => html.includes(s));
if (missing.length || present.length || charLength < 20000) {
  console.error('REFUSING TO STAGE.');
  if (missing.length) console.error('  missing required: ' + missing.join(', '));
  if (present.length) console.error('  forbidden present: ' + present.join(', '));
  if (charLength < 20000) console.error(`  suspiciously short: ${charLength} chars`);
  process.exit(1);
}

const res = await fetch(`${supabase.url}/rest/v1/calculator_report_staging`, {
  method: 'POST',
  headers: {
    apikey: supabase.service_role_key,
    Authorization: `Bearer ${supabase.service_role_key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    target_report_id: reportId,
    session_id: sessionId,
    email,
    report_html: html,
    content_sha256: sha256,
    content_length: charLength,
    source_note: `${file} (regenerated from stored corrected inputs)`,
    authorised_by: actor,
    supersede_reason: reason,
  }),
});
if (!res.ok) { console.error(`stage failed: ${res.status} ${await res.text()}`); process.exit(1); }
const [row] = await res.json();
console.log(`staged      ${row.staging_id}`);
console.log(`target      report ${reportId} / session ${sessionId}`);
console.log(`content     ${charLength} chars, sha256 ${sha256}`);
console.log(`local file  ${file}`);
console.log(`gate        ${required.length} required present, ${forbidden.length} forbidden absent`);

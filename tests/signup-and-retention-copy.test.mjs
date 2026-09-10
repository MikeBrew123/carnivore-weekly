/**
 * Customer-facing copy guards (audit 2026-09-10).
 *
 * Two classes of drift, both found live:
 *
 * 1. SIGNUP DISCLOSURE. The blog CTA that renders on every post said "No signup
 *    required", while calculator step 1 hard-blocks with "Email is required to
 *    receive your results" and subscribeCore() enrols the address in a 30-day
 *    starter series plus the weekly list. Step 1's own helper text mentioned
 *    only the weekly email, so the starter series arrived unannounced.
 *
 * 2. REPORT RETENTION. Sales copy said "$29 — Yours forever" while terms.html
 *    says on-screen access is time-limited (currently 48 hours) and the reader
 *    must email/download a copy to keep it. The customer keeps their downloaded
 *    copy forever; we do not host it forever. Those are different promises.
 *
 * Run: node tests/signup-and-retention-copy.test.mjs
 */
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = (p) => resolve(fileURLToPath(new URL('../' + p, import.meta.url)));

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const read = (p) => readFile(root(p), 'utf8');

console.log('\n=== Signup disclosure ===\n');

// Every shipped page, not an allowlist. The first version of this guard
// checked four hand-picked files and missed public/desserts.html, whose
// sidebar said "Totally free, no signup" directly above a link into the
// email-gated calculator.
// 'public/**/*.html' matches only NESTED pages: it returns 273 files and none of
// the 298 top-level ones, so calculator.html, desserts.html, index.html, terms
// and privacy were never scanned while the output cheerfully reported hundreds
// of files (reviewer, 2026-09-10). Both patterns, and both tsx depths.
const SHIPPED = execSync(
  "git ls-files 'public/*.html' 'public/**/*.html' 'public/js/*.js' "
    + "'calculator2-demo/src/*.tsx' 'calculator2-demo/src/**/*.tsx'",
  { cwd: root('.'), encoding: 'utf8' }
).split('\n').filter(Boolean);

// The scan is worthless if the glob silently stops matching. Assert the pages
// this batch actually edited are in it.
for (const must of ['public/calculator.html', 'public/desserts.html', 'public/terms.html', 'public/privacy.html', 'public/index.html']) {
  check(`scan covers ${must}`, SHIPPED.includes(must), `SHIPPED has ${SHIPPED.length} files`);
}

// Deliberately narrow: the claim is "you will not have to give us an email".
// Not "no email drip" on the paid blog FAQ, which is about delivery latency
// after purchase, and is true.
const NO_SIGNUP = /\bno\s+(signup|sign[-\s]?up)\b|\bno\s+email\s+(required|needed|gate)\b|\bwithout\s+signing\s+up\b/i;
const offenders = [];
for (const file of [...SHIPPED, 'data/blog_posts.json']) {
  const src = await read(file);
  if (!NO_SIGNUP.test(src)) continue;
  // Only a problem when the same page routes the reader into the calculator.
  if (!/calculator\.html|Step1PhysicalStats|calculator-cta/.test(src + file)) continue;
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('<!--')) continue;
    if (NO_SIGNUP.test(line)) offenders.push(`${file}: ${trimmed.slice(0, 90)}`);
  }
}
check(
  `no shipped calculator surface claims signup is not needed (scanned ${SHIPPED.length} files)`,
  offenders.length === 0,
  offenders.join(' | ')
);

// The mirror of the above: having removed "no signup required", the batch must
// not replace it with "emailed to you", which is equally untrue on CW. Paid
// report delivery IS emailed, so lines about the paid report are not hits.
const EMAILED_RESULTS = /\b(results?|macros|numbers)\b[^.]{0,40}\bemailed\b|\bemailed to you\b|\bemail your results\b|\bsend your results\b/i;
const PAID_CONTEXT = /paid|purchase|\$29|protocol|report|receipt|order/i;
const emailOffenders = [];
for (const file of [...SHIPPED, 'data/blog_posts.json']) {
  const src = await read(file);
  if (!EMAILED_RESULTS.test(src)) continue;
  if (!/calculator\.html|Step1PhysicalStats|calculator-cta|FreeCalculator/.test(src + file)) continue;
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('<!--')) continue;
    if (!EMAILED_RESULTS.test(line)) continue;
    if (PAID_CONTEXT.test(line)) continue;  // paid-report delivery is emailed, and that is true
    emailOffenders.push(`${file}: ${trimmed.slice(0, 90)}`);
  }
}
check(
  'no shipped calculator surface claims FREE results are emailed',
  emailOffenders.length === 0,
  emailOffenders.join(' | ')
);

const step1 = await read('calculator2-demo/src/components/calculator/steps/Step1PhysicalStats.tsx');
const helpMatch = step1.match(/helpText="([^"]*email[^"]*)"/i);
check('Step 1 has email helper text', !!helpMatch);

if (helpMatch) {
  const help = helpMatch[1];
  // Carnivore Weekly does NOT email free results. /api/v1/calculator/email-report
  // 404s REPORT_NOT_FOUND unless a PAID report row exists, subscribeCore only
  // enrols in the newsletter and drip, and no CW drip template carries macros
  // (day-1 says "No macros to track"). KetoDial has /email-plan; CW has no
  // equivalent. This assertion used to REQUIRE the false claim, which made a
  // truthfulness suite enforce an untruth (reviewer, 2026-09-10).
  check('Step 1 does NOT claim free results are emailed',
    !/email your results|send your results|results (are |will be )?emailed/i.test(help), help);
  check('Step 1 says the email is what lets them continue',
    /enter your email to continue|email to continue/i.test(help), help);
  check('Step 1 says the results appear in the calculator',
    /appear here|in the calculator|on this page/i.test(help), help);
  check('Step 1 discloses the starter email series', /starter series|starter email series/i.test(help), help);
  check('Step 1 says a regular email follows', /weekly|regular newsletter|newsletter/i.test(help), help);
  // Routing is diet-based and intentional: a CW visitor who picks keto or
  // low-carb is enrolled on KetoDial's list, and a pescatarian gets the
  // newsletter with no starter series. The disclosure must not promise
  // Carnivore Weekly branding it may not send, or a series it may not start.
  check('Step 1 ties the emails to the diet chosen, not to CW branding',
    /matched to the diet you choose/i.test(help), help);
  check('Step 1 does not promise Carnivore Weekly branded email unconditionally',
    !/Carnivore Weekly email|weekly Carnivore Weekly/i.test(help), help);
  check('Step 1 hedges the starter series for the pescatarian branch',
    /usually/i.test(help), help);
  check('Step 1 offers unsubscribe', /unsubscribe/i.test(help), help);
  check('Step 1 does not imply an account is created', !/create an account|sign up for an account/i.test(help), help);
}

// The privacy policy is the long-form version of the same promise and must stay
// consistent with it.
const privacy = await read('public/privacy.html');
check(
  'Privacy policy still describes the email series and the weekly newsletter',
  /welcome email series|First Weeks on Carnivore/i.test(privacy) && /weekly Carnivore Weekly newsletter/i.test(privacy)
);
check(
  'Privacy policy still promises unsubscribe does not affect results',
  /unsubscribing never affects your calculator results/i.test(privacy)
);

console.log('\n=== Report retention ===\n');

// Repo-wide, and including the blog source of truth. A four-file allowlist
// here missed "One payment, one document, yours forever" on the calculator
// guide post, which links straight to /calculator.html.
// \b after "access" so "a permanent accessory" in a CGM post is not a hit.
const FOREVER = /yours forever|lifetime access\b|permanent access\b|forever access\b/i;
const foreverOffenders = [];
for (const file of [...SHIPPED, 'data/blog_posts.json']) {
  const src = await read(file);
  if (!FOREVER.test(src)) continue;
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (FOREVER.test(line)) foreverOffenders.push(`${file}: ${trimmed.slice(0, 90)}`);
  }
}
check(
  `no shipped surface promises the report is hosted forever (scanned ${SHIPPED.length + 1} files)`,
  foreverOffenders.length === 0,
  foreverOffenders.join(' | ')
);

// Terms remain the authority on the access window and must still say it is
// limited. They must NOT name a figure the code does not implement: both Terms
// and the delivery screen said "currently 48 hours" while every code path writes
// expires_at 365 days out (calculator-api.js), so the one number in the batch's
// own truthfulness fix was itself untrue.
const app = await read('calculator2-demo/src/components/calculator/CalculatorApp.tsx');
const terms = await read('public/terms.html');
check('Terms still state that on-screen access is time-limited', /time-limited/i.test(terms));
const api = await read('api/calculator-api.js');
// Generalised: ANY stated window, not just the "48 hours" that was wrong once.
// The code writes expires_at as N days; if the copy names a figure, it has to be
// one the code actually implements.
const WINDOW = /\b(\d+)\s*(hour|hours|day|days)\b/gi;
const statedWindows = [];
const windowSurfaces = [...SHIPPED.map((f) => [f, null]), ['delivery screen', app]];
for (const [file, preloaded] of windowSurfaces) {
  const text = preloaded !== null ? preloaded : await read(file);
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')
        || trimmed.startsWith('<!--') || trimmed.startsWith('/*')) continue;
    // Only lines that are actually about REPORT ACCESS. Without this the scan
    // trips on refund windows ("30 days"), plan lengths, URL-encoded %20Days in
    // blog slugs, and this batch's own code comments.
    if (/%[0-9a-f]{2}/i.test(line)) continue;
    if (/refund|money-back|guarantee|challenge|meal plan|protocol|within \d+ days/i.test(line)) continue;
    if (!/\b(report|online copy|report link)\b/i.test(line)) continue;
    if (!/\b(expire|expires|access|available|open|time-limited)\b/i.test(line)) continue;
    WINDOW.lastIndex = 0;
    let m;
    while ((m = WINDOW.exec(line))) statedWindows.push(`${file}: "${m[0]}"`);
  }
}
const implementedDays = [...api.matchAll(/(\d+)\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/g)].map((m) => m[1]);
check(
  `no surface names a retention window the code does not implement (code writes ${implementedDays.join('/') || 'no'} day expiry)`,
  statedWindows.every((w) => implementedDays.some((d) => w.includes(`${d} day`))),
  statedWindows.join(' | ')
);

// The delivery screen — where it actually matters — must say it too, rather
// than leaving the reader to find it in the Terms after buying.
check(
  'Delivery screen tells the buyer the online copy is time-limited',
  /online copy is time-limited/i.test(app)
);
check(
  'Delivery screen tells the buyer their saved copy is theirs to keep',
  /yours to keep/i.test(app)
);

console.log(`\n${failures === 0 ? 'All copy assertions passed.' : failures + ' FAILED'}\n`);
if (failures > 0) process.exit(1);

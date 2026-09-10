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
const SHIPPED = execSync(
  "git ls-files 'public/**/*.html' 'public/js/*.js' 'calculator2-demo/src/**/*.tsx'",
  { cwd: root('.'), encoding: 'utf8' }
).split('\n').filter(Boolean);

// Deliberately narrow: the claim is "you will not have to give us an email".
// Not "no email drip" on the paid blog FAQ, which is about delivery latency
// after purchase, and is true.
const NO_SIGNUP = /\bno\s+(signup|sign[-\s]?up)\b|\bno\s+email\s+(required|needed|gate)\b|\bwithout\s+signing\s+up\b/i;
const offenders = [];
for (const file of SHIPPED) {
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

const step1 = await read('calculator2-demo/src/components/calculator/steps/Step1PhysicalStats.tsx');
const helpMatch = step1.match(/helpText="([^"]*email[^"]*)"/i);
check('Step 1 has email helper text', !!helpMatch);

if (helpMatch) {
  const help = helpMatch[1];
  check('Step 1 says the results are emailed', /email your results|send your results/i.test(help), help);
  check('Step 1 discloses the starter email series', /starter series|starter email series/i.test(help), help);
  check('Step 1 says a regular email follows', /weekly|regular newsletter|newsletter/i.test(help), help);
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

const SALES_SURFACES = [
  'public/calculator.html',
  'calculator2-demo/src/components/ui/PricingModal.tsx',
  'calculator2-demo/src/components/calculator/steps/Step3FreeResults.tsx',
  'calculator2-demo/src/components/ui/StripePaymentModal.tsx',
];

for (const file of SALES_SURFACES) {
  const src = await read(file);
  check(
    `${file}: no "yours forever" / "lifetime access" claim`,
    !/yours forever|lifetime access|permanent access|forever access/i.test(src),
    'implies we host the report indefinitely'
  );
}

// Terms remain the authority on the access window, and must still state it.
const terms = await read('public/terms.html');
check(
  'Terms still state the time-limited on-screen access window',
  /time-limited/i.test(terms) && /48 hours/i.test(terms)
);

// The delivery screen — where it actually matters — must say it too, rather
// than leaving the reader to find it in the Terms after buying.
const app = await read('calculator2-demo/src/components/calculator/CalculatorApp.tsx');
check(
  'Delivery screen tells the buyer the online copy is time-limited',
  /limited time \(currently 48 hours\)/i.test(app)
);
check(
  'Delivery screen tells the buyer their saved copy is theirs to keep',
  /yours to keep/i.test(app)
);

console.log(`\n${failures === 0 ? 'All copy assertions passed.' : failures + ' FAILED'}\n`);
if (failures > 0) process.exit(1);

#!/usr/bin/env node
/**
 * tests/resume-late-return.mjs
 *
 *     node tests/resume-late-return.mjs [--headed]
 *
 * THE LATE RETURN, in a real browser, against the SHIPPED bundle.
 *
 * The server suite (tests/paid-resume-email.test.mjs) proves the email is sent and
 * where it points. It cannot prove the thing the customer actually experiences: that
 * following that link, days later, in a browser whose payment state has expired,
 * still lands them on their paid assessment with Step 4 in front of them.
 *
 * So this loads public/calculator.html exactly as it is served, with the bundle
 * public/calculator.html itself names, seeds localStorage with a payment state stamped
 * seven hours ago (past the six-hour TTL the app deliberately enforces), and follows
 * the resume link. The worker is intercepted; no production call is made and no
 * customer row is read.
 *
 * Exits non-zero on any failure.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const PUBLIC = path.join(ROOT, 'public');
const { chromium } = await import(path.join(ROOT, 'node_modules', 'playwright', 'index.mjs'));

const ASSESSMENT_ID = '11111111-2222-4333-8444-555555555555';
const RESUME_PATH = `/calculator.html?payment=success&session_id=${ASSESSMENT_ID}#payment-success`;
const SEVEN_HOURS_AGO = Date.now() - 7 * 60 * 60 * 1000;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const file = path.join(PUBLIC, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let passed = 0;
const failures = [];
const check = (label, ok, detail = '') => ok ? passed++ : failures.push({ label, detail });

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const page = await browser.newPage();
const apiCalls = [];
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));

// The worker, intercepted. The paid assessment is what a returning buyer's row looks
// like: payment completed, steps 1 to 3 answered, Step 4 still empty.
await page.route('**/carnivore-report-api-production.iambrew.workers.dev/**', async route => {
  const url = route.request().url();
  apiCalls.push(url);
  if (url.includes('/get-session')) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: ASSESSMENT_ID,
      email: 'paid-buyer@example.invalid',
      first_name: 'Paid',
      payment_status: 'completed',
      diet_type: 'Carnivore',
      form_data: {
        sex: 'female', age: 54, heightFeet: 5, heightInches: 5, weight: 186, goalWeight: 150,
        goal: 'lose', deficit: 20, diet: 'Carnivore', lifestyle: 'sedentary', exercise: '1-2',
        email: 'paid-buyer@example.invalid', firstName: 'Paid',
      },
    })});
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

// Payment state from a session that has aged out. This is the state the app clears on
// purpose, and the whole reason a server-sent link had to exist.
await page.addInitScript(([savedAt]) => {
  localStorage.setItem('paymentStatus', 'success');
  localStorage.setItem('stripeSessionId', 'an-old-expired-id');
  localStorage.setItem('paymentStateSavedAt', String(savedAt));
  // A later, abandoned run left behind on this browser, under the key and shape the
  // store really uses. It belongs to no assessment, so the paid row must win.
  localStorage.setItem('carnivore-calculator-form', JSON.stringify({
    state: {
      form: { weight: 999, age: 30, sex: 'male', goal: 'gain', email: 'someone-else@example.invalid' },
      currentStep: 1, isPremium: false, assessmentId: null,
    },
    version: 0,
  }));
}, [SEVEN_HOURS_AGO]);

const requests = [];
page.on('request', r => requests.push(r.url().replace(base, '')));
await page.goto(base + RESUME_PATH, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
if (process.env.DEBUG_RESUME) {
  console.log('--- requests ---'); console.log(requests.join('\n'));
  console.log('--- root html len ---',
    await page.evaluate(() => (document.getElementById('root')||{}).innerHTML?.length ?? -1));
}

const bodyText = await page.evaluate(() => {
  const root = document.getElementById('root');
  return (root && (root.innerText || root.textContent)) || document.body.innerText;
});
const stored = await page.evaluate(() => ({
  status: localStorage.getItem('paymentStatus'),
  id: localStorage.getItem('stripeSessionId'),
  savedAt: Number(localStorage.getItem('paymentStateSavedAt') || 0),
}));

check('the app mounts from the emailed link with no fresh payment state',
  bodyText.length > 200, `only ${bodyText.length} chars rendered`);
check('the expired local state did NOT send them back to a fresh calculator',
  !/Step 1 of/i.test(bodyText) || /Payment received/i.test(bodyText), bodyText.slice(0, 200));
check('the paid screen is shown',
  /Payment received\. One step left\./i.test(bodyText), bodyText.slice(0, 300));
check('the link\'s assessment id replaced the stale one',
  stored.id === ASSESSMENT_ID, `localStorage holds ${stored.id}`);
check('the payment state is re-stamped, so the six-hour window restarts',
  stored.savedAt > SEVEN_HOURS_AGO, `savedAt ${stored.savedAt}`);
const restoredForm = await page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('carnivore-calculator-form') || '{}').state?.form || {}; }
  catch { return {}; }
});
check('the paid row beats a stale local run that belongs to no assessment',
  restoredForm.weight === 186 && restoredForm.sex === 'female' && restoredForm.goal === 'lose',
  JSON.stringify({ weight: restoredForm.weight, sex: restoredForm.sex, goal: restoredForm.goal }));
check('the address the resume email went to is the one shown back to them',
  restoredForm.email === 'paid-buyer@example.invalid', String(restoredForm.email));

check('the paid assessment was restored from the server, not from the browser',
  apiCalls.some(u => u.includes('/get-session') && u.includes(ASSESSMENT_ID)),
  apiCalls.join(' | ').slice(0, 200));

for (const [claim, why] of [
  ['being generated', 'nothing generates before Step 4'],
  ['Check your email for your download link', 'no download link is emailed'],
  ['may take 1-2 minutes', 'nothing is in progress'],
]) {
  check(`the screen does not say "${claim}"`, !bodyText.includes(claim), why);
}
check('it names the health profile as what is left',
  /health profile/i.test(bodyText), '');
check('it tells them a link was emailed',
  /emailed you a link/i.test(bodyText), '');

// ...and Step 4 is genuinely reachable, which is the point of coming back.
const cta = page.getByRole('button', { name: /health profile/i }).first();
check('the way into Step 4 is on the screen', await cta.count() > 0, '');
if (await cta.count() > 0) {
  await cta.click();
  await page.waitForTimeout(2000);
  if (process.env.DEBUG_RESUME) {
    console.log('--- store after click ---', JSON.stringify(await page.evaluate(() => {
      try { const st = JSON.parse(localStorage.getItem('carnivore-calculator-form') || '{}').state;
        return { currentStep: st.currentStep, isPremium: st.isPremium, assessmentId: st.assessmentId, hasWeight: st.form?.weight }; }
      catch { return null; }
    })));
    console.log('--- console ---', consoleErrors.slice(-5).join(' | ') || '(none)');
    console.log('--- step4 text ---', (await page.evaluate(() => { const r=document.getElementById('root'); return (r&&(r.innerText||r.textContent))||''; })).slice(0, 700));
  }
  const step4 = await page.evaluate(() => {
    const root = document.getElementById('root');
    return (root && (root.innerText || root.textContent)) || '';
  });
  // The health profile's own heading, not the step-indicator label above it.
  check('Step 4 opens for the returning buyer',
    /Tell us more about you/i.test(step4), step4.slice(0, 300));
  check('and it is the health profile, not a re-run of the earlier steps',
    !/Physical Stats[\s\S]{0,40}(Your height|Your weight|How old)/i.test(step4), '');
  // "Already paid" is a state, not a word count: the pricing modal's markup lives in
  // the tree whether or not it is shown, so assert the flag the flow actually reads.
  const premium = await page.evaluate(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('carnivore-calculator-form') || '{}');
      return raw?.state?.isPremium === true;
    } catch { return false; }
  });
  check('the returning buyer is recognised as already paid',
    premium === true, 'the app would ask them to buy the report a second time');
}

if (process.env.DEBUG_RESUME) {
  console.log('--- console errors ---'); console.log(consoleErrors.join('\n') || '(none)');
  console.log('--- api calls ---'); console.log(apiCalls.join('\n') || '(none)');
  console.log('--- body ---'); console.log(bodyText.slice(0, 1500));
}
await browser.close();
server.close();

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  console.log(`\nresume-late-return: ${passed} passed, ${failures.length} FAILED`);
  process.exit(1);
}
console.log(`resume-late-return: ${passed} passed, 0 failed`);
console.log('');
console.log('A buyer who comes back a day later, from the emailed link, with expired');
console.log('browser state, lands on their paid assessment with Step 4 in front of them.');

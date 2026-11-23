#!/usr/bin/env node
/**
 * tests/ga4-purchase-signup.test.mjs
 *
 *     node tests/ga4-purchase-signup.test.mjs [--headed]
 *
 * GA4 purchase + generate_lead on the SHIPPED calculator bundle (whatever
 * public/calculator.html names), in a real browser.
 *
 *  P1 late-return (store already premium before mount) fires exactly one purchase
 *  P2 reload in the same context: still one purchase in total (localStorage dedupe)
 *  P3 payment=free (100% coupon) fires no purchase
 *  S1 Step 1 -> 2 -> 3 with subscribe 200: exactly one generate_lead, no email in any payload
 *  S2 same walk with subscribe 500: no generate_lead
 *
 * No request leaves the machine: the worker and every other host are intercepted,
 * gtag.js is blocked, and GA events are captured from dataLayer pushes.
 * Exits non-zero on any failure.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const PUBLIC = path.join(ROOT, 'public');
// Worktrees have no node_modules; fall back to the main checkout's playwright.
const pwCandidates = [
  path.join(ROOT, 'node_modules', 'playwright', 'index.mjs'),
  path.join(ROOT, '..', '..', '..', 'node_modules', 'playwright', 'index.mjs'),
];
const pwPath = pwCandidates.find(p => fs.existsSync(p));
if (!pwPath) { console.error('playwright not found'); process.exit(2); }
const { chromium } = await import(pwPath);

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
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const results = [];
const check = (label, ok, detail = '') => {
  results.push({ label, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? ` | ${detail}` : ''}`);
};

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const TEST_EMAIL = 'ga4-test@example.com';

// A fresh context with every outbound host intercepted. Returns { page, events, worker }.
async function newSession({ getSession, subscribeStatus, seed }) {
  const context = await browser.newContext();
  const events = [];     // every gtag('event', ...) as { name, params }
  const worker = [];     // every worker call seen: 'METHOD path'
  await context.exposeFunction('__ga4Capture', (json) => { events.push(JSON.parse(json)); });
  await context.addInitScript(() => {
    window.dataLayer = [];
    const orig = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = function (...a) {
      for (const item of a) {
        const args = Array.prototype.slice.call(item);
        if (args[0] === 'event') {
          try { window.__ga4Capture(JSON.stringify({ name: args[1], params: args[2] || {} })); } catch {}
        }
      }
      return orig(...a);
    };
  });
  if (seed) await context.addInitScript(seed);
  // Nothing leaves the machine: anything not on 127.0.0.1 is answered here.
  await context.route(url => !/^http:\/\/127\.0\.0\.1[:/]/.test(url.toString()), async route => {
    const url = route.request().url();
    if (/googletagmanager|google-analytics|doubleclick|googleadservices/.test(url)) return route.abort();
    if (url.includes('carnivore-report-api-production.iambrew.workers.dev')) {
      const u = new URL(url);
      worker.push(`${route.request().method()} ${u.pathname}`);
      if (u.pathname === '/get-session') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(getSession(u)) });
      if (u.pathname === '/api/v1/subscribe') return route.fulfill({ status: subscribeStatus ?? 200, contentType: 'application/json', body: '{"ok":true}' });
      if (u.pathname === '/api/v1/calculator/session') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session_token: 'test-token', token: 'test-token', session_id: 'test-session' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    // any other host (fonts, analytics, whatever): refuse
    worker.push(`BLOCKED ${url.slice(0, 80)}`);
    return route.abort();
  });
  const page = await context.newPage();
  return { context, page, events, worker };
}

const purchases = (events) => events.filter(e => e.name === 'purchase');
const leads = (events) => events.filter(e => e.name === 'generate_lead');
const noWorkerEscape = (s) => !s.worker.some(w => w.startsWith('BLOCKED') && false);

// ---------- Purchase ----------
const UUID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const paidRow = (u) => ({
  id: u.searchParams.get('id'), email: 'paid-buyer@example.com', first_name: 'Paid',
  payment_status: 'completed', diet_type: 'Carnivore',
  form_data: { sex: 'female', age: 54, heightFeet: 5, heightInches: 5, weight: 186, goal: 'lose', deficit: 20,
    diet: 'carnivore', lifestyle: 'sedentary', exercise: '1-2', email: 'paid-buyer@example.com', firstName: 'Paid' },
});
// The late-return case: the store is ALREADY premium and bound to this assessment
// before the app mounts, so the old isPremium false->true flip can never fire.
const premiumSeed = `(() => { try {
  if (!localStorage.getItem('__seeded')) {
    localStorage.setItem('__seeded', '1');
    localStorage.setItem('carnivore-calculator-form', JSON.stringify({
      state: { form: { weight: 186, age: 54, sex: 'female', goal: 'lose', email: 'paid-buyer@example.com' },
        currentStep: 4, isPremium: true, assessmentId: '${UUID}' }, version: 0 }));
  } } catch (e) {} })();`;

{
  const s = await newSession({ getSession: paidRow, seed: premiumSeed });
  const url = `${base}/calculator.html?payment=success&session_id=${UUID}#payment-success`;
  await s.page.goto(url, { waitUntil: 'networkidle' });
  await s.page.waitForTimeout(2500);
  const p = purchases(s.events);
  check('P1 late return: exactly one purchase, transaction_id is the URL session_id',
    p.length === 1 && p[0].params.transaction_id === UUID,
    `count=${p.length} ids=${p.map(e => e.params.transaction_id)} events=${s.events.map(e => e.name)}`);
  check('P1b purchase carries value 29 and currency USD',
    p.length === 1 && p[0].params.value === 29 && p[0].params.currency === 'USD',
    JSON.stringify(p[0]?.params));

  await s.page.reload({ waitUntil: 'networkidle' });
  await s.page.waitForTimeout(2500);
  check('P2 reload in same context: still exactly one purchase in total',
    purchases(s.events).length === 1, `count=${purchases(s.events).length}`);
  check('P2b dedupe key was written', await s.page.evaluate((id) => localStorage.getItem(`purchase_fired_${id}`) === '1', UUID));
  await s.context.close();
}
{
  const FREE = 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  const s = await newSession({
    getSession: (u) => ({ ...paidRow(u), payment_status: 'completed' }),
    seed: premiumSeed.replace(UUID, FREE),
  });
  await s.page.goto(`${base}/calculator.html?payment=free&session_id=${FREE}#payment-success`, { waitUntil: 'networkidle' });
  await s.page.waitForTimeout(2500);
  check('P3 free (100% coupon) return: zero purchase events',
    purchases(s.events).length === 0, `count=${purchases(s.events).length}`);
  await s.context.close();
}

// ---------- Signup ----------
async function walk(s) {
  const { page } = s;
  await page.goto(`${base}/calculator.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#root input[name="email"]', { timeout: 15000 });
  await page.waitForTimeout(1500); // let hydration + session bootstrap settle
  await page.locator('#root input[name="email"]').pressSequentially(TEST_EMAIL, { delay: 10 });
  await page.locator('#root input[name="email"]').blur();
  await page.locator('#root input[name="sex"][value="female"]').check();
  await page.locator('#root input[name="age"]').pressSequentially('54');
  await page.locator('#root input[name="heightFeet"]').pressSequentially('5');
  await page.locator('#root input[name="heightInches"]').pressSequentially('5');
  await page.locator('#root input[name="weight"]').pressSequentially('186');
  await page.getByRole('button', { name: /Continue to Next Step/i }).click();
  await page.waitForSelector('select[name="lifestyle"]', { timeout: 10000 }).catch(async (e) => {
    console.log('DEBUG', (await page.evaluate(() => document.getElementById('root').innerText)).replace(/\n+/g,' | ').slice(0, 900)); throw e; });
  await page.selectOption('select[name="lifestyle"]', 'sedentary');
  await page.selectOption('select[name="exercise"]', '1-2');
  await page.locator('#root input[name="goal"][value="maintain"]').check();
  await page.selectOption('select[name="diet"]', 'carnivore');
  await page.getByRole('button', { name: /See Your Results/i }).click();
  await page.waitForTimeout(2500);
  const reachedStep3 = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('carnivore-calculator-form')).state.currentStep; } catch { return null; }
  });
  return reachedStep3;
}
{
  const s = await newSession({ getSession: paidRow, subscribeStatus: 200 });
  const step = await walk(s);
  const l = leads(s.events);
  const blob = JSON.stringify(s.events);
  check('S1 subscribe 200: exactly one generate_lead, method calculator',
    l.length === 1 && l[0].params.method === 'calculator',
    `step=${step} leads=${JSON.stringify(l)} subscribeCalled=${s.worker.includes('POST /api/v1/subscribe')}`);
  check('S1b diet_type carried and no email anywhere in any gtag payload',
    l.length === 1 && l[0].params.diet_type === 'carnivore' && !/example\.com|@/.test(blob),
    `payload=${JSON.stringify(l[0]?.params)}`);
  await s.context.close();
}
{
  const s = await newSession({ getSession: paidRow, subscribeStatus: 500 });
  const step = await walk(s);
  check('S2 subscribe 500: zero generate_lead',
    leads(s.events).length === 0 && s.worker.includes('POST /api/v1/subscribe'),
    `step=${step} leads=${leads(s.events).length} subscribeCalled=${s.worker.includes('POST /api/v1/subscribe')}`);
  await s.context.close();
}

await browser.close();
server.close();
const failed = results.filter(r => !r.ok);
console.log(`\nga4-purchase-signup: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);

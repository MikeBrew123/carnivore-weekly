#!/usr/bin/env node
/**
 * tests/etsy-coupon-autoapply.test.mjs
 *
 *     node tests/etsy-coupon-autoapply.test.mjs [--headed]
 *
 * The Etsy print card links calculator.html?coupon=ETSY50. On the SHIPPED bundle
 * (whatever public/calculator.html names), in a real browser:
 *
 *  E1 ?coupon=ETSY50: modal shows the discount applied and create-checkout carries
 *     coupon_code ETSY50, without anyone pressing Apply
 *  E2 ?coupon=etsy50 (lowercase): same
 *  W1 ?coupon=WEEK1-TEST1 (day-7 drip): prefilled but NOT auto-applied, exactly as
 *     before (no validate-coupon call, create-checkout coupon_code null)
 *  N1 no coupon param: no validate-coupon call
 *
 * Nothing leaves the machine: the worker is fully intercepted, gtag/GA blocked,
 * every other host refused. Exits non-zero on any failure.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const PUBLIC = path.join(ROOT, 'public');
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

// Response shape of the real worker's POST /validate-coupon for ETSY50
// (handleValidateCoupon -> validateCoupon, Stripe coupon ETSY50, 50% off once).
const ETSY_OK = (code) => ({ code, stripe_coupon_id: 'ETSY50', percent: 50, amount_off: 0, description: code });

async function newSession() {
  const context = await browser.newContext();
  const worker = { validate: [], checkout: [], blocked: [] };
  await context.route(url => !/^http:\/\/127\.0\.0\.1[:/]/.test(url.toString()), async route => {
    const url = route.request().url();
    if (/googletagmanager|google-analytics|doubleclick|googleadservices/.test(url)) return route.abort();
    if (url.includes('carnivore-report-api-production.iambrew.workers.dev')) {
      const u = new URL(url);
      const json = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (u.pathname === '/validate-coupon') {
        const body = JSON.parse(route.request().postData() || '{}');
        worker.validate.push(body.code);
        return /^ETSY50R?$/.test(body.code) ? json(200, ETSY_OK(body.code))
          : json(400, { code: 'INVALID_COUPON', message: 'Coupon code not found or expired' });
      }
      if (u.pathname === '/create-checkout') {
        worker.checkout.push(JSON.parse(route.request().postData() || '{}'));
        // Refuse so the page never navigates; the request body is what we assert on.
        return json(500, { message: 'test stub: checkout not created' });
      }
      if (u.pathname === '/api/v1/calculator/session') return json(200, { session_token: 'test-token', token: 'test-token', session_id: 'test-session' });
      return json(200, {});
    }
    worker.blocked.push(url.slice(0, 80));
    return route.abort();
  });
  const page = await context.newPage();
  return { context, page, worker };
}

// Same walk as tests/ga4-purchase-signup.test.mjs, to the free results.
async function walk(page, query) {
  await page.goto(`${base}/calculator.html${query}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#root input[name="email"]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.locator('#root input[name="email"]').pressSequentially('etsy-coupon-test@example.com', { delay: 10 });
  await page.locator('#root input[name="email"]').blur();
  await page.locator('#root input[name="sex"][value="female"]').check();
  await page.locator('#root input[name="age"]').pressSequentially('54');
  await page.locator('#root input[name="heightFeet"]').pressSequentially('5');
  await page.locator('#root input[name="heightInches"]').pressSequentially('5');
  await page.locator('#root input[name="weight"]').pressSequentially('186');
  await page.getByRole('button', { name: /Continue to Next Step/i }).click();
  await page.waitForSelector('select[name="lifestyle"]', { timeout: 10000 });
  await page.selectOption('select[name="lifestyle"]', 'sedentary');
  await page.selectOption('select[name="exercise"]', '1-2');
  await page.locator('#root input[name="goal"][value="maintain"]').check();
  await page.selectOption('select[name="diet"]', 'carnivore');
  await page.getByRole('button', { name: /See Your Results/i }).click();
  await page.waitForFunction(() => /Your Personalized/.test(document.getElementById('root').innerText), null, { timeout: 20000 });
}

// Open the payment modal the way payment-modal-dismiss.test.mjs does.
async function openModal(page) {
  await page.evaluate(() => {
    const R = document.getElementById('root');
    [...R.querySelectorAll('button')].find((b) => /Get My 30-Day Plan for \$29/.test(b.innerText)).click();
  });
  await page.waitForSelector('#payment-coupon, button:has-text("Pay $")', { timeout: 15000 });
  await page.waitForTimeout(1500); // let any auto-apply round trip settle
}

async function modalState(page) {
  return page.evaluate(() => {
    const txt = document.body.innerText;
    const pay = [...document.querySelectorAll('button')].find(b => /^Pay \$/.test(b.innerText.trim()));
    const input = document.getElementById('payment-coupon');
    return { applied: /Coupon applied: ETSY50/.test(txt), pay: pay ? pay.innerText.trim() : null, input: input ? input.value : null };
  });
}

async function pressPay(page, s) {
  await page.locator('button', { hasText: /^Pay \$/ }).click();
  for (let i = 0; i < 30 && s.worker.checkout.length === 0; i++) await page.waitForTimeout(200);
  return s.worker.checkout[0];
}

for (const [id, param] of [['E1', 'ETSY50'], ['E2', 'etsy50']]) {
  const s = await newSession();
  await walk(s.page, `?coupon=${param}&utm_source=etsy&utm_medium=print&utm_campaign=cw_coupon_card`);
  await openModal(s.page);
  const st = await modalState(s.page);
  const co = await pressPay(s.page, s);
  check(`${id} ?coupon=${param}: applied without Apply, Pay $14.50, one validate-coupon call`,
    st.applied && st.pay === 'Pay $14.50' && s.worker.validate.length === 1 && s.worker.validate[0] === 'ETSY50',
    JSON.stringify({ st, validate: s.worker.validate }));
  check(`${id} create-checkout carries coupon_code ETSY50, amount 1450`,
    co && co.coupon_code === 'ETSY50' && co.amount === 1450 && co.discount_percent === 50,
    JSON.stringify(co && { coupon_code: co.coupon_code, amount: co.amount, discount_percent: co.discount_percent }));
  await s.context.close();
}

{
  const s = await newSession();
  await walk(s.page, '?coupon=WEEK1-TEST1');
  await openModal(s.page);
  const st = await modalState(s.page);
  const co = await pressPay(s.page, s);
  check('W1 ?coupon=WEEK1-TEST1: prefilled, not auto-applied, no validate-coupon call, Pay $29.00',
    st.input === 'WEEK1-TEST1' && !/Coupon applied/.test(await s.page.evaluate(() => document.body.innerText))
      && s.worker.validate.length === 0 && st.pay === 'Pay $29.00',
    JSON.stringify({ st, validate: s.worker.validate }));
  check('W1 create-checkout coupon_code null, amount 2900',
    co && co.coupon_code === null && co.amount === 2900,
    JSON.stringify(co && { coupon_code: co.coupon_code, amount: co.amount }));
  await s.context.close();
}

{
  const s = await newSession();
  await walk(s.page, '');
  await openModal(s.page);
  const st = await modalState(s.page);
  check('N1 no coupon param: no validate-coupon call, Pay $29.00',
    s.worker.validate.length === 0 && st.pay === 'Pay $29.00',
    JSON.stringify({ st, validate: s.worker.validate }));
  await s.context.close();
}

await browser.close();
server.close();
const failed = results.filter(r => !r.ok);
console.log(`\netsy-coupon-autoapply: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);

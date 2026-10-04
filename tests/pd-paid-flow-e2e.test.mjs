#!/usr/bin/env node
// PescoDial paid flow, site side, in a real browser with the worker MOCKED
// (nothing reaches Stripe or Supabase). Renders the site with --paid-preview into
// a temp dir and walks: results -> upgrade -> checkout -> back from Stripe ->
// payment confirmed (after one 'pending' poll) -> health form -> report shown ->
// email copy. Asserts the request bodies match the worker contract:
//  A. create-checkout sends email + form_data with a pesco-* diet and NO price;
//  B. after the redirect the page polls get-session until paid, then asks the questions;
//  C. step/4 sends assessment_id + answers (blood thinner and pregnancy folded into text);
//  D. report/init is called with the assessment id and the report HTML is shown;
//  E. email-report sends only the session id (the worker emails the stored owner address);
//  F. a 422 refusal from checkout keeps the reader on results with the message;
//  G. the deployed render (no --paid-preview) has the upgrade card only when PAID_REPORT_LIVE is on;
//  H. a valid code is sent as coupon_code (no price); an invalid one stops before checkout.
// Run: node tests/pd-paid-flow-e2e.test.mjs
import http from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const repo = new URL('..', import.meta.url).pathname;
const out = mkdtempSync(path.join(tmpdir(), 'pd-paid-'));
execFileSync('python3', [path.join(repo, 'pescodial/scripts/generate_pd_site.py'), '--out', out, '--paid-preview'], { stdio: 'pipe' });
const server = http.createServer((req, res) => {
  let p = path.join(out, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }); res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
let failed = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' ' + x}`); if (!ok) failed++; };

async function toResults(page) {
  await page.goto(base + '/calculator/');
  await page.check('input[name="style"][value="keto"]', { force: true });
  await page.click('form[data-step="1"] button[type="submit"]');
  await page.check('input[name="sex"][value="f"]', { force: true });
  await page.fill('#age', '62'); await page.fill('#ft', '5'); await page.fill('#in', '4');
  await page.fill('#weight', '175'); await page.fill('#goalweight', '150');
  await page.check('input[name="goal"][value="lose"]', { force: true });
  await page.check('input[name="activity"][value="1.375"]', { force: true });
  await page.click('form[data-step="2"] button[type="submit"]');
  await page.fill('form[data-step="3"] input[type="email"]', 'buyer@example.com');
  await page.click('form[data-step="3"] button[type="submit"]');
  await page.waitForSelector('[data-step="4"]:not([hidden])');
}

const browser = await chromium.launch();
const calls = { checkout: [], session: 0, step4: [], init: [], email: [] };
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('**/api/v1/subscribe', r => r.fulfill({ status: 200, body: '{}' }));
await page.route('**/create-checkout', r => {
  calls.checkout.push(JSON.parse(r.request().postData()));
  r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, url: `${base}/calculator/?payment=success&session_id=11111111-2222-3333-4444-555555555555#payment-success`, session_uuid: '11111111-2222-3333-4444-555555555555' }) });
});
await page.route('**/get-session?**', r => {
  calls.session++;
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'x', email: 'buyer@example.com', form_data: { diet: 'pesco-keto' }, payment_status: calls.session > 1 ? 'completed' : 'pending' }) });
});
await page.route('**/api/v1/calculator/step/4', r => { calls.step4.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }); });
await page.route('**/api/v1/calculator/report/init', r => { calls.init.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'a'.repeat(64), status: 'generated', report_html: '<html><body><h1 id="t">PD REPORT FIXTURE</h1></body></html>' }) }); });
await page.route('**/api/v1/calculator/email-report', r => { calls.email.push(JSON.parse(r.request().postData())); r.fulfill({ status: 200, body: '{}' }); });

await toResults(page);
await page.click('[data-checkout]');
await page.waitForSelector('[data-step="5"]:not([hidden])', { timeout: 20000 });
const co = calls.checkout[0] || {};
check('A. checkout body: email + pesco form_data, no price', co.email === 'buyer@example.com' && co.form_data && co.form_data.diet === 'pesco-keto'
  && co.form_data.age === 62 && !('amount' in co) && !('discount_percent' in co), JSON.stringify(co));
check('B. polled get-session until paid, then asked questions', calls.session >= 2);
await page.fill('#pd-first', 'Fixture');
await page.check('input[name="conditions"][value="kidney-disease"]', { force: true });
await page.check('input[name="bloodthinner"]', { force: true });
await page.check('input[name="pregnant"]', { force: true });
await page.fill('#pd-allergies', 'shellfish');
await page.click('form[data-step="5"] button[type="submit"]');
await page.waitForSelector('[data-state="report"]:not([hidden])', { timeout: 20000 });
const s4 = calls.step4[0] || {};
check('C. step/4 body', s4.assessment_id === '11111111-2222-3333-4444-555555555555' && s4.data.conditions.includes('kidney-disease')
  && /blood thinner/.test(s4.data.medications) && /pregnant/.test(s4.data.otherConditions) && s4.data.allergies === 'shellfish', JSON.stringify(s4));
const frameText = await page.frameLocator('[data-report-frame]').locator('#t').textContent();
check('D. report/init called and report shown', (calls.init[0] || {}).session_id === '11111111-2222-3333-4444-555555555555' && frameText === 'PD REPORT FIXTURE');
await page.click('[data-report-email]');
await page.waitForTimeout(300);
check('E. email copy sends only the session id', (calls.email[0] || {}).session_id === '11111111-2222-3333-4444-555555555555' && !('email' in (calls.email[0] || {})), JSON.stringify(calls.email));
await page.close();

const p2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await p2.route('**/api/v1/subscribe', r => r.fulfill({ status: 200, body: '{}' }));
await p2.route('**/create-checkout', r => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'CALORIE_TARGET_SUPPRESSED', message: 'We cannot generate a self-guided calorie target from these inputs.' }) }));
await toResults(p2);
await p2.click('[data-checkout]');
await p2.waitForTimeout(500);
check('F. checkout refusal shows the message on results', (await p2.isVisible('[data-step="4"]')) && /cannot generate/.test(await p2.textContent('[data-checkout-error]')));
await p2.close();

const p3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
const co3 = [];
await p3.route('**/api/v1/subscribe', r => r.fulfill({ status: 200, body: '{}' }));
await p3.route('**/validate-coupon', r => { const b = JSON.parse(r.request().postData()); r.fulfill({ status: b.code === 'ETSY50' ? 200 : 400, contentType: 'application/json', body: JSON.stringify(b.code === 'ETSY50' ? { code: 'ETSY50', percent: 50 } : { code: 'INVALID_COUPON' }) }); });
await p3.route('**/create-checkout', r => { co3.push(JSON.parse(r.request().postData())); r.fulfill({ status: 422, contentType: 'application/json', body: '{"message":"stop here"}' }); });
await toResults(p3);
await p3.fill('[data-coupon]', 'nope'); await p3.click('[data-checkout]'); await p3.waitForTimeout(400);
const invalidStopped = co3.length === 0 && /not valid/.test(await p3.textContent('[data-checkout-error]'));
await p3.fill('[data-coupon]', 'etsy50'); await p3.click('[data-checkout]'); await p3.waitForTimeout(400);
check('H. codes: valid sent as coupon_code without a price, invalid stops', invalidStopped && co3.length === 1 && co3[0].coupon_code === 'ETSY50' && !('amount' in co3[0]) && !('discount_percent' in co3[0]), JSON.stringify(co3));
await p3.close();

const live = readFileSync(path.join(repo, 'pescodial/public/index.html'), 'utf8');
const PAID_LIVE = /^PAID_REPORT_LIVE = True/m.test(readFileSync(path.join(repo, 'pescodial/scripts/generate_pd_site.py'), 'utf8'));
check('G. deployed render has the upgrade card only when PAID_REPORT_LIVE', live.includes('data-checkout') === PAID_LIVE);
await browser.close(); server.close();
process.exit(failed ? 1 : 0);

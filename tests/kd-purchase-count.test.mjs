#!/usr/bin/env node
// KetoDial: kd_payment_complete is counted once, only for a real fresh paid sale
// (2026-11-23 tracking fix), and the free-results /session POST carries landing_page
// and ga_client_id. Real browser (Playwright) against the checked-out
// ketodial/public served locally. NOTHING reaches production: every request that is
// not the local server is either fulfilled with a stub (the worker, any workers.dev)
// or aborted (GTM, GA, fonts, everything else); gtag/pintrk are recorded, not sent.
// Run: node tests/kd-purchase-count.test.mjs
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const repo = new URL('..', import.meta.url).pathname;
const pub = path.join(repo, 'ketodial/public');
const server = http.createServer((req, res) => {
  let p = path.join(pub, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(p)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }); res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + extra}`); if (!ok) failed++; };
const leaks = [];

const browser = await chromium.launch();

// Opens a page whose purchase endpoint answers with `purchase` ({status, body}).
async function open(ctx, purchase) {
  const page = await ctx.newPage();
  page.sessionPosts = [];
  await page.addInitScript(() => {
    window.dataLayer = [];            // the page's own gtag() pushes here; we read it back
    window.pintrk = function () {};   // stub, nothing sent
  });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (/workers\.dev$/.test(u.hostname)) {
      const p = u.pathname;
      if (p.startsWith('/purchase/')) return route.fulfill({ status: purchase.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(purchase.body) });
      if (p === '/session' && route.request().method() === 'POST') {
        page.sessionPosts.push(JSON.parse(route.request().postData() || '{}'));
        return route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"token":"kd_stub"}' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    }
    // googletagmanager, google-analytics, fonts, anything else: blocked.
    return route.abort();
  });
  return page;
}
const events = page => page.evaluate(() =>
  (window.dataLayer || []).filter(a => a[0] === 'event' && a[1] === 'kd_payment_complete').map(a => a[2]));
async function settle(page) { await page.waitForLoadState('load'); await page.waitForTimeout(800); }

const PAID = { paid: true, gift: false, fresh: true, amount_cents: 1099, currency: 'USD', profileComplete: true };
const SUCCESS = '/?success=true&session_id=cs_test_a';

// K1 + K2: one context so localStorage survives the reload
{
  const ctx = await browser.newContext();
  const page = await open(ctx, { status: 200, body: PAID });
  await page.goto(base + SUCCESS); await settle(page);
  const ev = await events(page);
  check('K1. paid+fresh sale fires exactly one kd_payment_complete (cs_test_a, 10.99 USD)',
    ev.length === 1 && ev[0].transaction_id === 'cs_test_a' && ev[0].value === 10.99 && ev[0].currency === 'USD', JSON.stringify(ev));
  const first = ev.length;
  await page.reload(); await settle(page);
  const after = await events(page); // dataLayer resets on reload, so also check storage
  const stored = await page.evaluate(() => localStorage.getItem('kd_purchase_fired_cs_test_a'));
  check('K2. reload in same context: still one in total (no second fire)', first + after.length === 1 && stored === '1', `first=${first} after=${after.length} stored=${stored}`);
  await ctx.close();
}

async function zero(name, path_, purchase) {
  const ctx = await browser.newContext();
  const page = await open(ctx, purchase);
  await page.goto(base + path_); await settle(page);
  const ev = await events(page);
  check(name, ev.length === 0, JSON.stringify(ev));
  await ctx.close();
}
await zero('K3. gift (gift:true, fresh:false) -> zero', SUCCESS, { status: 200, body: { ...PAID, gift: true, fresh: false, amount_cents: 0 } });
await zero('K4. stale link (fresh:false) -> zero', SUCCESS, { status: 200, body: { ...PAID, fresh: false } });
await zero('K5. made-up id (/purchase 404 {error}) -> zero', '/?success=true&session_id=cs_made_up', { status: 404, body: { error: 'not found' } });
await zero('K6. ?finish=cs_test_a (no success=true) -> zero', '/?finish=cs_test_a', { status: 200, body: PAID });

// K7: free-results /session POST carries landing_page and ga_client_id
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await ctx.addCookies([{ name: '_ga', value: 'GA1.1.1234567890.1700000000', url: base }]);
  const page = await open(ctx, { status: 404, body: { error: 'none' } });
  await page.goto(base + '/'); await settle(page);
  await page.fill('#age', '45'); await page.fill('#heightFt', '5'); await page.fill('#heightIn', '8');
  await page.fill('#weight', '180'); await page.fill('#emailOpt', 'tracking-test@example.com');
  await page.click('[data-seg="kidney"] [data-val="no"]');
  await page.click('#freeBtn');
  await page.waitForTimeout(1000);
  const post = page.sessionPosts[0] || {};
  check("K7. /session POST has landing_page '/' and ga_client_id '1234567890.1700000000'",
    post.landing_page === '/' && post.ga_client_id === '1234567890.1700000000', JSON.stringify({ n: page.sessionPosts.length, lp: post.landing_page, ga: post.ga_client_id }));
  await ctx.close();
}

await browser.close(); server.close();
process.exit(failed ? 1 : 0);

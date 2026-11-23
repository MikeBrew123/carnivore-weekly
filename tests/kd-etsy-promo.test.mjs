#!/usr/bin/env node
// KetoDial: the Etsy print-card link (?promo=ETSY25) reaches /checkout as `promo`,
// survives the #calc hash and a navigation, the legacy /calculator.html keeps the
// query string, and no GA4 event name changes. Real browser (Playwright) against the
// checked-out ketodial/public served locally. NOTHING reaches production: the worker
// (any workers.dev) is fulfilled with stubs, ketodial.com is fulfilled with an empty
// page, Stripe.js is replaced by a stub, everything else is aborted.
// Run: node tests/kd-etsy-promo.test.mjs
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
const browser = await chromium.launch();
const CORS = { 'access-control-allow-origin': '*' };

async function open(ctx) {
  const page = await ctx.newPage();
  page.checkoutPosts = [];
  page.prodHits = [];
  await page.addInitScript(() => {
    window.dataLayer = [];            // the page's own gtag() pushes here; we read it back
    window.pintrk = function () {};   // stub, nothing sent
    // Stripe.js is blocked; this stands in so startCheckout reaches its /checkout POST.
    window.Stripe = function () {
      return { initEmbeddedCheckout: () => Promise.resolve({ mount() {}, destroy() {} }) };
    };
  });
  await page.route('**/*', route => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (u.hostname === 'ketodial.com') {   // legacy redirect target: record, never fetch
      page.prodHits.push(req.url());
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' });
    }
    if (/workers\.dev$/.test(u.hostname)) {
      const p = u.pathname;
      if (p === '/session' && req.method() === 'POST')
        return route.fulfill({ status: 201, contentType: 'application/json', headers: CORS, body: '{"token":"kd_stub0123456789"}' });
      if (p === '/checkout' && req.method() === 'POST') {
        page.checkoutPosts.push(JSON.parse(req.postData() || '{}'));
        return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{"clientSecret":"cs_test_stub_secret"}' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: '{}' });
    }
    return route.abort();   // GTM, GA, Stripe.js, fonts, everything else
  });
  return page;
}
const eventNames = page => page.evaluate(() =>
  [...new Set((window.dataLayer || []).filter(a => a && a[0] === 'event').map(a => a[1]))].sort());

// Free calculator -> Full Protocol CTA on the upgrade card -> /checkout POST.
async function runFunnel(firstUrl, thenUrl) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await open(ctx);
  await page.goto(base + firstUrl); await page.waitForLoadState('load');
  // A navigation without the query: the promo must come from sessionStorage.
  if (thenUrl) { await page.goto(base + thenUrl); await page.waitForLoadState('load'); }
  await page.waitForTimeout(500);
  await page.fill('#age', '52'); await page.fill('#heightFt', '5'); await page.fill('#heightIn', '6');
  await page.fill('#weight', '180'); await page.fill('#emailOpt', 'promo-test@example.com');
  await page.click('[data-seg="kidney"] [data-val="no"]');
  await page.click('#freeBtn');
  await page.waitForSelector('#kdUpgradeCta', { state: 'visible', timeout: 5000 });
  const ctaText = (await page.textContent('#kdUpgradeCta')) || '';
  await page.click('#kdUpgradeCta');
  await page.waitForTimeout(1500);
  const out = { posts: page.checkoutPosts, events: await eventNames(page), ctaText,
                stored: await page.evaluate(() => sessionStorage.getItem('kd_promo')) };
  await ctx.close();
  return out;
}

// P1: printed link, lower-case code, then a navigation that drops the query.
const promoRun = await runFunnel(
  '/?promo=etsy25&utm_source=etsy&utm_medium=print&utm_campaign=kd_coupon_card#calc', '/#calc');
const p1 = promoRun.posts[0] || {};
check("P1a. the CTA is the Full Protocol (sanity: we clicked the right product)",
  /Full Protocol/.test(promoRun.ctaText), promoRun.ctaText);
check("P1b. /checkout POST carries promo 'ETSY25' and items ['protocol']",
  promoRun.posts.length === 1 && p1.promo === 'ETSY25' && JSON.stringify(p1.items) === '["protocol"]',
  JSON.stringify(promoRun.posts));
check("P1c. kept in sessionStorage as kd_promo", promoRun.stored === 'ETSY25', String(promoRun.stored));

// P3: no promo param -> no promo key in the body.
const plainRun = await runFunnel('/#calc');
const p3 = plainRun.posts[0] || {};
check('P3. no promo param -> no promo in the /checkout body',
  plainRun.posts.length === 1 && !('promo' in p3) && JSON.stringify(p3.items) === '["protocol"]',
  JSON.stringify(plainRun.posts));

// P4: the set of GA4 event names is identical with and without the promo.
check('P4. GA4 event names identical with and without ?promo',
  promoRun.events.length > 0 && JSON.stringify(promoRun.events) === JSON.stringify(plainRun.events),
  `\n promo: ${promoRun.events.join(',')}\n plain: ${plainRun.events.join(',')}`);

// P2: legacy printed URL keeps its query string and lands on #calc.
{
  const ctx = await browser.newContext();
  const page = await open(ctx);
  await page.goto(base + '/calculator.html?promo=ETSY25&utm_source=etsy');
  await page.waitForURL(/ketodial\.com/, { timeout: 5000 }).catch(() => {});
  check('P2. calculator.html?promo=ETSY25&utm_source=etsy -> https://ketodial.com/?promo=ETSY25&utm_source=etsy#calc',
    page.url() === 'https://ketodial.com/?promo=ETSY25&utm_source=etsy#calc', page.url());
  // Without a query the old target is unchanged.
  await page.goto(base + '/calculator.html');
  await page.waitForURL(u => String(u) !== base + '/calculator.html', { timeout: 5000 }).catch(() => {});
  check('P2b. bare calculator.html -> https://ketodial.com/#calc (unchanged)',
    page.url() === 'https://ketodial.com/#calc', page.url());
  await ctx.close();
}

await browser.close(); server.close();
process.exit(failed ? 1 : 0);

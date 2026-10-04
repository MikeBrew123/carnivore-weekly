#!/usr/bin/env node
// PescoDial analytics (GA4 G-FWZ3VJ6D32): runs only on www.pescodial.com and never
// sends PII. Serves the rendered site AS www.pescodial.com through Playwright routing
// (no real network), runs the calculator, and inspects window.dataLayer.
//  A. on a preview host, gtag is never requested and nothing is queued;
//  B. on the live host, the funnel events fire in order;
//  C. no event or config carries an email, name or health answer; Google Signals off.
// Run: python3 pescodial/scripts/generate_pd_site.py && node tests/pd-analytics.test.mjs
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const pub = new URL('../pescodial/public/', import.meta.url).pathname;
const serve = route => {
  const u = new URL(route.request().url());
  let p = path.join(pub, decodeURIComponent(u.pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!existsSync(p)) return route.fulfill({ status: 404, body: '' });
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream';
  return route.fulfill({ status: 200, contentType: type, body: readFileSync(p) });
};
let failed = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' ' + x}`); if (!ok) failed++; };
const browser = await chromium.launch();
async function run(host) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const gtagRequests = [];
  await page.route('https://www.googletagmanager.com/**', r => { gtagRequests.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
  await page.route('**/api/v1/subscribe', r => r.fulfill({ status: 200, body: '{}' }));
  await page.route(`https://${host}/**`, serve);
  await page.goto(`https://${host}/`);
  await page.check('input[name="style"][value="keto"]', { force: true });
  await page.click('form[data-step="1"] button[type="submit"]');
  await page.check('input[name="sex"][value="f"]', { force: true });
  await page.fill('#age', '58'); await page.fill('#ft', '5'); await page.fill('#in', '5');
  await page.fill('#weight', '180'); await page.fill('#goalweight', '150');
  await page.check('input[name="goal"][value="lose"]', { force: true });
  await page.check('input[name="activity"][value="1.2"]', { force: true });
  await page.click('form[data-step="2"] button[type="submit"]');
  await page.fill('form[data-step="3"] input[type="email"]', 'secret.person@example.com');
  await page.click('form[data-step="3"] button[type="submit"]');
  await page.waitForSelector('[data-step="4"]:not([hidden])');
  const dl = await page.evaluate(() => JSON.stringify((window.dataLayer || []).map(a => Array.from(a))));
  await page.close();
  return { gtagRequests, dl: JSON.parse(dl), raw: dl };
}
const prev = await run('pescodial.pages.dev');
check('A. preview host: no gtag request, nothing queued', prev.gtagRequests.length === 0 && prev.dl.length === 0, JSON.stringify(prev));
const live = await run('www.pescodial.com');
const events = live.dl.filter(a => a[0] === 'event').map(a => a[1]);
check('B. live host loads gtag and fires the funnel in order', live.gtagRequests.length === 1 &&
  JSON.stringify(events) === JSON.stringify(['calc_style_chosen', 'calc_numbers_entered', 'calc_results_viewed', 'generate_lead']), JSON.stringify(events));
const cfg = live.dl.find(a => a[0] === 'config');
check('C1. Google Signals and ad personalisation off', cfg && cfg[2].allow_google_signals === false && cfg[2].allow_ad_personalization_signals === false);
check('C2. no email, name or health data in any analytics payload', !/secret\.person|@example\.com|medication|warfarin|kidney/i.test(live.raw), live.raw.slice(0, 300));
await browser.close();
process.exit(failed ? 1 : 0);

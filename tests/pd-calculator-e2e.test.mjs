#!/usr/bin/env node
// PescoDial calculator, end to end in a real browser (Playwright, from the repo's
// devDependencies). Serves the RENDERED site (pescodial/public), clicks through
// every style, and checks:
//  A. the numbers on screen equal the shared engine's output for the same inputs;
//  B. the doctor line sits above the numbers;
//  C. sign-up posts {site:'pd', diet_type:'pesco-...'} (intercepted, nothing sent);
//  D. underweight + lose never reaches a weight-loss target (panel or goal error);
//  E. the paid upgrade card shows exactly when PAID_REPORT_LIVE is on.
// Run: python3 pescodial/scripts/generate_pd_site.py && node tests/pd-calculator-e2e.test.mjs
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { chromium } from 'playwright';

const repo = new URL('..', import.meta.url).pathname;
const pub = path.join(repo, 'pescodial/public');
const PAID_LIVE = /^PAID_REPORT_LIVE = True/m.test(readFileSync(path.join(repo, 'pescodial/scripts/generate_pd_site.py'), 'utf8'));
const server = http.createServer((req, res) => {
  let p = path.join(pub, decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(p)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }); res.end(readFileSync(p));
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const sb = { window: {} }; vm.createContext(sb);
vm.runInContext(readFileSync(path.join(pub, 'js/pd-macros.js'), 'utf8') + ';window.PDMacros=PDMacros;', sb);
const engine = sb.window.PDMacros.calculateMacrosCanonical;

let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + extra}`); if (!ok) failed++; };

const browser = await chromium.launch();
const STYLES = { med: 'pesco-mediterranean', lowcarb: 'pesco-lowcarb', keto: 'pesco-keto', carn: 'pesco-carnivore' };
for (const [style, diet] of Object.entries(STYLES)) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const posts = [];
  await page.route('**/api/v1/subscribe', r => { posts.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, body: '{"success":true}' }); });
  await page.goto(base + '/');
  await page.check(`input[name="style"][value="${style}"]`, { force: true });
  await page.click('form[data-step="1"] button[type="submit"]');
  // Brew 2026-10-04: activity descriptions wrapped one word per line (desc in the radio column).
  const descW = await page.evaluate(() => [...document.querySelectorAll('[data-field="activity"] .choice-desc')].map(e => e.getBoundingClientRect().width));
  check(`G. ${style} activity descriptions use the wide column`, descW.length === 3 && descW.every(w => w > 150), descW.join(','));
  await page.check('input[name="sex"][value="f"]', { force: true });
  await page.fill('#age', '58'); await page.fill('#ft', '5'); await page.fill('#in', '5');
  await page.fill('#weight', '180'); await page.fill('#goalweight', '150');
  await page.check('input[name="goal"][value="lose"]', { force: true });
  await page.check('input[name="activity"][value="1.2"]', { force: true });
  await page.click('form[data-step="2"] button[type="submit"]');
  await page.fill('form[data-step="3"] input[type="email"]', 'e2e@example.com');
  await page.click('form[data-step="3"] button[type="submit"]');
  await page.waitForSelector('[data-step="4"]:not([hidden])');
  const want = engine({ diet, sex: 'female', age: 58, weight: 180, heightCm: 165.1, lifestyle: 'sedentary', goal: 'lose', goalWeight: 150 });
  const got = await page.evaluate(() => Object.fromEntries(['kcal', 'protein', 'fat', 'carbs'].map(k => [k, document.querySelector(`[data-r="${k}"]`).textContent.replace(/,/g, '')])));
  check(`A. ${style} numbers match engine`, +got.kcal === want.calories && +got.protein === want.protein && +got.fat === want.fat && +got.carbs === want.carbs,
        JSON.stringify({ got, want: { kcal: want.calories, protein: want.protein, fat: want.fat, carbs: want.carbs } }));
  const order = await page.evaluate(() => { const s4 = document.querySelector('[data-step="4"]').innerHTML; return s4.indexOf('Talk to your doctor') < s4.indexOf('data-r="kcal"'); });
  check(`B. ${style} doctor line above numbers`, order);
  check(`C. ${style} sign-up is PescoDial`, posts.length === 1 && posts[0].site === 'pd' && posts[0].diet_type === diet, JSON.stringify(posts));
  check(`E. ${style} upgrade card ${PAID_LIVE ? 'shown' : 'hidden'} per PAID_REPORT_LIVE`, ((await page.locator('.upgrade').count()) > 0) === PAID_LIVE);
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('**/api/v1/subscribe', r => r.fulfill({ status: 200, body: '{}' }));
await page.goto(base + '/');
await page.click('form[data-step="1"] button[type="submit"]');
await page.check('input[name="sex"][value="f"]', { force: true });
await page.fill('#age', '40'); await page.fill('#ft', '5'); await page.fill('#in', '6');
await page.fill('#weight', '105'); await page.fill('#goalweight', '100');
await page.check('input[name="goal"][value="lose"]', { force: true });
await page.check('input[name="activity"][value="1.375"]', { force: true });
await page.click('form[data-step="2"] button[type="submit"]');
// Either the underweight panel or the goal-weight error must stop the reader:
// no path reaches the email step or a weight-loss number.
const blocked = (await page.isVisible('[data-state="underweight"]')) || (await page.isVisible('#goalweight-err'));
check('D. underweight + lose cannot reach a weight-loss target', blocked && !(await page.isVisible('form[data-step="3"]')));
// Brew 2026-10-04: Maintain must not ask for a goal weight; the current weight is the goal.
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/api/v1/subscribe', r => r.fulfill({ status: 200, body: '{"success":true}' }));
  await page.goto(base + '/');
  await page.check('input[name="style"][value="med"]', { force: true });
  await page.click('form[data-step="1"] button[type="submit"]');
  const hiddenAtStart = await page.isVisible("#goalweight"); // Lose is the default, so the box starts visible
  await page.check('input[name="goal"][value="lose"]', { force: true });
  const shownForLose = await page.isVisible('#goalweight');
  await page.fill('#goalweight', '150'); // typed for Lose, then changed her mind: must be ignored
  await page.check('input[name="goal"][value="maintain"]', { force: true });
  const hiddenForMaintain = !(await page.isVisible('#goalweight'));
  check('H. goal weight box shows only for Lose', hiddenAtStart && shownForLose && hiddenForMaintain, JSON.stringify({ hiddenAtStart, shownForLose, hiddenForMaintain }));
  check('H2. no "enter your current weight" hint', !(await page.content()).includes('enter your current weight'));
  await page.check('input[name="sex"][value="f"]', { force: true });
  await page.fill('#age', '58'); await page.fill('#ft', '5'); await page.fill('#in', '5'); await page.fill('#weight', '180');
  await page.check('input[name="activity"][value="1.2"]', { force: true });
  await page.click('form[data-step="2"] button[type="submit"]');
  await page.fill('form[data-step="3"] input[type="email"]', 'maintain@example.com');
  await page.click('form[data-step="3"] button[type="submit"]');
  await page.waitForSelector('[data-step="4"]:not([hidden])', { timeout: 5000 }).catch(() => {});
  const want = engine({ diet: 'pesco-mediterranean', sex: 'female', age: 58, weight: 180, heightCm: 165.1, lifestyle: 'sedentary', goal: 'maintain', goalWeight: 180 });
  const got = await page.evaluate(() => (document.querySelector('[data-step="4"]')?.innerText || ''));
  check('H3. Maintain reaches results with maintenance calories', got.replace(/,/g, '').includes(String(want.calories)), `want ${want.calories}`);
  check('H4. Maintain protein uses current weight, not a leftover goal weight', got.includes(String(want.protein)), `want ${want.protein}`);
  await page.close();
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);

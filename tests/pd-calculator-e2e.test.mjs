#!/usr/bin/env node
// PescoDial calculator, end to end in a real browser (Playwright, from the repo's
// devDependencies). Serves the RENDERED site (pescodial/public), clicks through
// every style, and checks:
//  A. the numbers on screen equal the shared engine's output for the same inputs;
//  B. the doctor line sits above the numbers;
//  C. sign-up posts {site:'pd', diet_type:'pesco-...'} (intercepted, nothing sent);
//  D. underweight + lose never reaches a weight-loss target (panel or goal error);
//  E. the paid upgrade card shows exactly when PAID_REPORT_LIVE is on.
//  R1-R27. one named check per fixed item of the 2026-10-04 review
//     (~/Downloads/PescoDial-Calculator-Review/REVIEW.md); P0s are R1, R2, R3.
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
  check(`G. ${style} activity descriptions use the wide column`, descW.length === 4 && descW.every(w => w > 150), descW.join(','));
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
  const order = await page.evaluate(() => { const s4 = document.querySelector('[data-step="4"]').innerHTML; return s4.indexOf('check with your doctor') < s4.indexOf('data-r="kcal"'); });
  check(`B. ${style} doctor line above numbers`, order);
  check(`C. ${style} sign-up is PescoDial`, posts.length === 1 && posts[0].site === 'pd' && posts[0].diet_type === diet, JSON.stringify(posts));
  const basis = await page.textContent('[data-r="basis"]');
  check(`R7. ${style} Lose explainer numbers come from the engine`, basis.includes(want.tdee.toLocaleString('en-US') + ' calories a day')
    && basis.includes('target of ' + want.calories.toLocaleString('en-US') + ' is 20% less') && basis.includes('goal weight of 150 lb'), basis);
  const fishHead = await page.textContent('[data-r="fishhead"]');
  check(`R8. ${style} fish heading fits the style`, fishHead === (style === 'keto' || style === 'carn' ? 'Fish or seafood every day' : 'About 5 fish meals a week'), fishHead);
  if (style === 'carn') check('R20. no butter in the Carnivore sample day', !/butter/i.test(await page.textContent('[data-r="sample"]')));
  if (style !== 'med') {
    const g = await page.evaluate(() => { const r = el => el.getBoundingClientRect(); const s = document.querySelectorAll('.results-grid > .stat');
      return { noFiber: document.querySelector('.results-grid').classList.contains('no-fiber'), carbsW: r(s[3]).width, calW: r(s[0]).width, fiberHidden: s[4].hidden }; });
    check(`R19. ${style} no empty slot when Fiber is hidden`, g.noFiber && g.fiberHidden && Math.abs(g.carbsW - g.calW) < 2, JSON.stringify(g));
  }
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
  const basis = await page.textContent('[data-r="basis"]');
  check('R7. Maintain explainer uses the engine maintenance number and current weight', basis.includes(want.tdee.toLocaleString('en-US') + " calories a day, so that's your target") && basis.includes('current weight of 180 lb'), basis);
  await page.close();
}

// ===== 2026-10-04 review fixes (one named check per item) =====
async function step2(page, { w = 390, style = 'med' } = {}) {
  await page.goto(base + '/calculator/');
  await page.check(`input[name="style"][value="${style}"]`, { force: true });
  await page.click('form[data-step="1"] button[type="submit"]');
}
async function fillImp(page, o) {
  const v = Object.assign({ age: '58', sex: 'f', ft: '5', inch: '5', weight: '180', goal: 'lose', goalweight: '150', act: '1.2' }, o);
  await page.check(`input[name="sex"][value="${v.sex}"]`, { force: true });
  await page.fill('#age', v.age); await page.fill('#ft', v.ft); await page.fill('#in', v.inch);
  await page.fill('#weight', v.weight);
  await page.check(`input[name="goal"][value="${v.goal}"]`, { force: true });
  if (v.goal === 'lose') await page.fill('#goalweight', v.goalweight);
  await page.check(`input[name="activity"][value="${v.act}"]`, { force: true });
}
async function newPage(w = 390, h = 844) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.subs = [];
  await p.route('**/api/v1/subscribe', r => { p.subs.push(1); r.fulfill({ status: 200, body: '{}' }); });
  return p;
}
async function toResults(page, o) {
  await fillImp(page, o);
  await page.click('form[data-step="2"] button[type="submit"]');
  await page.fill('#email', 'e2e@example.com');
  await page.click('form[data-step="3"] button[type="submit"]');
  await page.waitForSelector('[data-step="4"]:not([hidden])', { timeout: 5000 });
}

// R1 (P0). Start over after metric entry: the unit UI matches the toggle and imperial entry works.
{
  const p = await newPage();
  await step2(p);
  await p.check('input[name="units"][value="met"]', { force: true });
  await p.check('input[name="sex"][value="f"]', { force: true });
  await p.fill('#age', '58'); await p.fill('#cm', '165'); await p.fill('#weight', '82'); await p.fill('#goalweight', '68');
  await p.check('input[name="activity"][value="1.2"]', { force: true });
  await p.click('form[data-step="2"] button[type="submit"]');
  await p.fill('#email', 'e2e@example.com');
  await p.click('form[data-step="3"] button[type="submit"]');
  await p.waitForSelector('[data-step="4"]:not([hidden])');
  await p.click('[data-restart]');
  await p.click('form[data-step="1"] button[type="submit"]');
  const st = await p.evaluate(() => ({
    imp: document.querySelector('input[name="units"][value="imp"]').checked,
    ftVisible: !!document.querySelector('#ft').offsetParent, cmVisible: !!document.querySelector('#cm').offsetParent,
    unit: document.querySelector('[data-wunit]').textContent, summary: !document.querySelector('.error-summary').hidden }));
  let reached = false;
  if (st.ftVisible) {
    try { await fillImp(p, {}); await p.click('form[data-step="2"] button[type="submit"]', { timeout: 3000 }); reached = await p.isVisible('form[data-step="3"]'); } catch (e) { /* stuck: reached stays false */ }
  }
  check('R1. Start over restores ft/lb fields to match the toggle, and imperial entry gets through', st.imp && st.ftVisible && !st.cmVisible && st.unit === 'lb' && !st.summary && reached, JSON.stringify({ st, reached }));
  await p.close();
}
// R2 (P0). Underweight + Lose goes to the underweight panel, never a "lowest goal" above her weight.
for (const gw of ['100', '']) {
  const p = await newPage();
  await step2(p);
  await fillImp(p, { age: '40', ft: '5', inch: '5', weight: '105', goalweight: gw, act: '1.375' });
  await p.click('form[data-step="2"] button[type="submit"]');
  const panel = await p.isVisible('[data-state="underweight"]');
  const lowest = /lowest goal we can use/.test(await p.evaluate(() => document.querySelector('.calc').innerText));
  check(`R2. underweight + Lose (goal ${gw || 'blank'}) shows the underweight panel, no "lowest goal" message`, panel && !lowest && !(await p.isVisible('form[data-step="3"]')), JSON.stringify({ panel, lowest }));
  await p.close();
}
// R3 (P0). The "nottarget" refusal is decided at step 2: no email asked, no sign-up sent.
{
  const p = await newPage();
  await step2(p);
  await fillImp(p, { age: '80', ft: '4', inch: '10', weight: '110', goalweight: '100', act: '1.2' });
  await p.click('form[data-step="2"] button[type="submit"]');
  await p.waitForTimeout(200);
  const panel = await p.isVisible('[data-state="nottarget"]');
  const emailShown = await p.isVisible('form[data-step="3"]');
  check('R3. nottarget shows before the email step and nothing is sent to /subscribe', panel && !emailShown && p.subs.length === 0, JSON.stringify({ panel, emailShown, subs: p.subs.length }));
  check('R13. nottarget panel has no maintain button (suppress, never substitute)', (await p.locator('[data-state="nottarget"] [data-maintain]').count()) === 0);
  await p.close();
}
// R6. Switching units converts typed values both ways.
{
  const p = await newPage();
  await step2(p);
  await p.fill('#ft', '5'); await p.fill('#in', '5'); await p.fill('#weight', '180'); await p.fill('#goalweight', '150');
  await p.check('input[name="units"][value="met"]', { force: true });
  const met = await p.evaluate(() => ['cm', 'weight', 'goalweight'].map(i => document.getElementById(i).value));
  await p.check('input[name="units"][value="imp"]', { force: true });
  const imp = await p.evaluate(() => ['ft', 'in', 'weight', 'goalweight'].map(i => document.getElementById(i).value));
  check('R6. units toggle converts height and both weights (and back)', met.join() === '165,81.6,68' && imp.join() === '5,5,180,150', JSON.stringify({ met, imp }));
  await p.close();
}
// R10. No sideways scroll at 320px, or at 200% text on a 390px phone; the unit toggle never breaks mid-label.
for (const [w, zoom] of [[320, 1], [390, 2]]) {
  const p = await newPage(w);
  await step2(p);
  if (zoom > 1) await p.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await fillImp(p, {});
  const s2 = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth,
    toggle: [...document.querySelectorAll('.toggle span')].map(e => e.getClientRects().length), }));
  await p.click('form[data-step="2"] button[type="submit"]');
  await p.fill('#email', 'e2e@example.com');
  await p.click('form[data-step="3"] button[type="submit"]');
  await p.waitForSelector('[data-step="4"]:not([hidden])');
  const s4 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const lineH = await p.evaluate(() => [...document.querySelectorAll('.toggle span')].every(e => e.getBoundingClientRect().height < parseFloat(getComputedStyle(e).fontSize) * 3.2));
  check(`R10. ${w}px at ${zoom * 100}% text: no horizontal overflow on step 2 or results, toggle labels on one line`, s2.over <= 0 && s4 <= 0 && lineH, JSON.stringify({ s2, s4, lineH }));
  await p.close();
}
// R11. A bad code keeps her at the code box: error visible, focus in the box, no checkout panel, no checkout call.
if (PAID_LIVE) {
  const p = await newPage();
  let co = 0;
  await p.route('**/validate-coupon', r => r.fulfill({ status: 400, contentType: 'application/json', body: '{"code":"INVALID_COUPON"}' }));
  await p.route('**/create-checkout', r => { co++; r.fulfill({ status: 500, body: '{}' }); });
  await step2(p); await toResults(p, {});
  await p.fill('[data-coupon]', 'nope');
  await p.click('[data-checkout]');
  await p.waitForFunction(() => document.querySelector('[data-checkout-error]').textContent.length > 0, null, { timeout: 3000 }).catch(() => {});
  const st = await p.evaluate(() => { const e = document.querySelector('[data-checkout-error]'); const r = e.getBoundingClientRect();
    return { focus: document.activeElement && document.activeElement.id, errVisible: e.offsetParent !== null && r.top >= 0 && r.bottom <= innerHeight,
      wait: !document.querySelector('[data-state="checkout-wait"]').hidden, invalid: document.querySelector('#pd-code').getAttribute('aria-invalid') }; });
  check('R11. bad discount code: error on screen, focus in the code box, no jump, no checkout', st.focus === 'pd-code' && st.errVisible && !st.wait && st.invalid === 'true' && co === 0, JSON.stringify({ st, co }));
  await p.close();
}
// R12. Back (and every step change) brings the calculator top into view and focuses the step heading.
{
  const p = await newPage();
  await step2(p);
  const s2 = await p.evaluate(() => ({ f: document.activeElement.textContent.trim(), top: document.querySelector('.calc').getBoundingClientRect().top }));
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.click('form[data-step="2"] [data-back="1"]');
  const s1 = await p.evaluate(() => ({ f: document.activeElement.textContent.trim(), top: document.querySelector('.calc').getBoundingClientRect().top }));
  check('R12. step changes and Back scroll the calculator into view and focus the heading',
    s2.f === 'Your numbers' && s2.top >= 0 && s2.top < 100 && s1.f === 'Choose your eating style' && s1.top >= 0 && s1.top < 100, JSON.stringify({ s2, s1 }));
  await p.close();
}
// R15. Inches left blank is an error asking for inches; a typed 0 is accepted.
{
  const p = await newPage();
  await step2(p);
  await fillImp(p, { inch: '' });
  await p.click('form[data-step="2"] button[type="submit"]');
  const msg = await p.isVisible('#height-err') ? await p.textContent('#height-err') : '';
  const stayed = !(await p.isVisible('form[data-step="3"]'));
  await p.fill('#in', '0');
  await p.click('form[data-step="2"] button[type="submit"]');
  const zeroOk = await p.isVisible('form[data-step="3"]');
  check('R15. blank inches asks for inches, 0 is accepted', msg === "Enter inches too, even if it's 0." && stayed && zeroOk, JSON.stringify({ msg, stayed, zeroOk }));
  await p.close();
}
// R26. Errors are announced: aria-invalid on inputs and fieldsets, radio errors linked by aria-describedby.
{
  const p = await newPage();
  await step2(p);
  await p.click('form[data-step="2"] button[type="submit"]');
  const a = await p.evaluate(() => ({
    age: document.querySelector('#age').getAttribute('aria-invalid'), ageDesc: document.querySelector('#age').getAttribute('aria-describedby'),
    sexSet: document.querySelector('[data-field="sex"]').getAttribute('aria-invalid'), sexDesc: document.querySelector('input[name="sex"]').getAttribute('aria-describedby'),
    actDesc: document.querySelector('input[name="activity"]').getAttribute('aria-describedby') }));
  await p.fill('#age', '58'); await p.click('form[data-step="2"] button[type="submit"]');
  const cleared = await p.evaluate(() => !document.querySelector('#age').hasAttribute('aria-invalid'));
  check('R26. aria-invalid and aria-describedby on errored fields, cleared when fixed',
    a.age === 'true' && /age-err/.test(a.ageDesc) && a.sexSet === 'true' && /sex-err/.test(a.sexDesc) && /activity-err/.test(a.actDesc) && cleared, JSON.stringify({ a, cleared }));
  await p.close();
}
// R7 floor + swapped basis, R22, R24, R27, R14, em dashes.
{
  const p = await newPage();
  await step2(p);
  await toResults(p, { age: '60', ft: '5', inch: '0', weight: '130', goalweight: '115' });
  const want = engine({ diet: 'pesco-mediterranean', sex: 'female', age: 60, weight: 130, heightCm: 152.4, lifestyle: 'sedentary', goal: 'lose', goalWeight: 115 });
  const basis = await p.textContent('[data-r="basis"]');
  check('R7. floor explainer: engine maintenance number and floor', want.floorApplied && basis.includes(want.tdee.toLocaleString('en-US') + ' calories a day')
    && basis.includes('kept you at 1,200') && basis.includes('goal weight of 115 lb') && !/self-guided/.test(basis), basis);
  const r = await p.evaluate(() => ({ bars: document.querySelector('.steps').hidden, label: /Step 4 of 4/.test(document.querySelector('.calc').innerText),
    up: document.querySelector('#up-title') && document.querySelector('#up-title').textContent,
    kcal: document.querySelector('.stat-wide dd').innerText.replace(/\s+/g, ' ').trim() }));
  check('R22. no step label or progress bar on results', r.bars && !r.label, JSON.stringify(r));
  if (PAID_LIVE) check('R24. results card heading is sentence case', r.up === 'Your full 7-day plan', r.up);
  check('R27. calories read with a space before the unit, in a dl', /^[\d,]+ a day$/.test(r.kcal) && (await p.locator('dl.results-grid dt').count()) === 5, r.kcal);
  await p.close();
}
{
  const p = await newPage();
  await step2(p);
  await toResults(p, { ft: '5', inch: '5', weight: '260', goalweight: '220' });
  const want = engine({ diet: 'pesco-mediterranean', sex: 'female', age: 58, weight: 260, heightCm: 165.1, lifestyle: 'sedentary', goal: 'lose', goalWeight: 220 });
  const basis = await p.textContent('[data-r="basis"]');
  const lb = Math.round(want.proteinBasisKg / 0.453592);
  check('R7. substituted protein basis names the weight the engine used', basis.includes(`based on ${lb} lb, a weight in the healthy range`) && !basis.includes('220 lb'), `${basis} (want ${lb})`);
  await p.close();
}
{
  const html = readFileSync(path.join(pub, 'calculator/index.html'), 'utf8');
  check('R14. no "email your results" promise on step 3', !/email your results|send your results/i.test(html) && html.includes('Your results show on the next screen'));
  check('R29. privacy link by the email box', html.includes('<a href="/privacy/">Privacy policy</a>'));
  const files = ['calculator/index.html', 'index.html', 'js/calculator.js', 'css/site.css'];
  const dashed = files.filter(f => readFileSync(path.join(pub, f), 'utf8').includes('—'));
  check('No em dashes in the rendered calculator pages, script or styles', dashed.length === 0, dashed.join(','));
}
await browser.close(); server.close();
process.exit(failed ? 1 : 0);

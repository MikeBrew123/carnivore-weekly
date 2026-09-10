#!/usr/bin/env node
/**
 * tests/step1-units-and-errors.test.mjs
 *
 * STEP 1 IN A REAL BROWSER (mobile audit 2026-09-10).
 *
 * Drives the BUILT calculator (public/calculator.html + public/assets/calculator2)
 * at 375, 390 and 430 px phone widths, plus 1280 desktop for context, and checks
 * what the reader actually sees:
 *   - switching units keeps her measurements (converted), and re-tapping the
 *     selected unit changes nothing;
 *   - a missing height shows a message at the height fields, focus lands on
 *     the field to fix, and it is on screen;
 *   - the email message says "Email is required to continue";
 *   - 182 cm and a valid imperial Step 1 both still move on to Step 2;
 *   - nothing overflows sideways.
 *
 * Run:  (cd calculator2-demo && npm run build) && node tests/step1-units-and-errors.test.mjs
 * Optional: SHOT_DIR=/some/dir saves a screenshot of each state.
 *
 * Every non-GET request is answered locally, so no session, step save or
 * subscribe reaches the production worker. Analytics are blocked.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC = join(REPO, 'public');
const PLAYWRIGHT = join(REPO, 'calculator2-demo', 'node_modules', '@playwright', 'test');
if (!existsSync(PLAYWRIGHT)) {
  console.log('\nstep1-units-and-errors: SKIPPED, run `npm ci` in calculator2-demo first.\n');
  process.exit(0);
}
const { chromium } = createRequire(import.meta.url)(PLAYWRIGHT);

const PORT = 8921;
const SHOT_DIR = process.env.SHOT_DIR;
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let filePath = join(PUBLIC, urlPath);
      if (!filePath.startsWith(PUBLIC)) { res.writeHead(403).end(); return; }
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
      if (!existsSync(filePath)) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
      res.end(await readFile(filePath));
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

const failures = [];
let passed = 0;
function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failures.push(name); console.error(`  ✗ ${name}${detail ? `  [${detail}]` : ''}`); }
}

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const VIEWPORTS = [
  { name: '375', width: 375, height: 812, mobile: true },
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '430', width: 430, height: 932, mobile: true },
  { name: '1280', width: 1280, height: 800, mobile: false },
];

async function openStep1(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    ...(vp.mobile ? { userAgent: IPHONE_UA } : {}),
  });
  await context.route('**/*', (route) => {
    const req = route.request();
    if (/googletagmanager|google-analytics|clarity\.ms|doubleclick|facebook/.test(req.url())) return route.abort();
    if (req.method() !== 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, session_token: 'step1-test' }) });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('dialog', (d) => d.dismiss());
  await page.goto(`http://localhost:${PORT}/calculator.html?test=step1-units`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root #email', { timeout: 20000 });
  return { context, page };
}

const values = (page) => page.evaluate(() => Object.fromEntries(
  ['email', 'age', 'heightFeet', 'heightInches', 'heightCm', 'weight', 'weightKg']
    .map((id) => { const el = document.getElementById(id); return [id, el ? el.value : null]; })
));

async function fillBasics(page, { email = true, height = true, weight = true } = {}) {
  if (email) await page.fill('#email', 'reader@example.com');
  await page.locator('#root input[name="sex"][value="female"]').check();
  await page.fill('#age', '58');
  if (height) { await page.fill('#heightFeet', '5'); await page.fill('#heightInches', '4'); }
  if (weight) await page.fill('#weight', '185');
}

const unitButton = (page, label) => page.locator('#height-group').getByRole('button', { name: label, exact: true });
const continueButton = (page) => page.getByRole('button', { name: 'Continue to Next Step' });
const reachedStep2 = (page) => page.getByText('Your Activity & Goals').waitFor({ timeout: 8000 }).then(() => true, () => false);

async function shot(page, name, selector) {
  if (!SHOT_DIR) return;
  await page.waitForTimeout(400); // let the 0.2s unit-control transition settle
  if (selector) {
    await page.locator(selector).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const box = await page.locator(selector).boundingBox();
    const vp = page.viewportSize();
    const y = Math.max(0, box.y - 90);
    await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), clip: { x: 0, y, width: vp.width, height: Math.min(vp.height - y, box.height + 260) } });
  } else {
    await page.screenshot({ path: join(SHOT_DIR, `${name}.png`) });
  }
}

const server = await startServer();
const browser = await chromium.launch();

try {
  for (const vp of VIEWPORTS) {
    const tag = `[${vp.name}px]`;
    console.log(`\n=== ${vp.name}px ===`);

    // -- Unit switching ----------------------------------------------------
    {
      const { context, page } = await openStep1(browser, vp);
      await fillBasics(page);

      const boxes = await Promise.all(['ft / in', 'cm'].map((label) => unitButton(page, label).boundingBox()));
      check(`${tag} unit buttons are at least 44px tall`, boxes.every((b) => b && b.height >= 44),
        boxes.map((b) => b && Math.round(b.height)).join(' / '));
      await shot(page, `${vp.name}-1-imperial-filled`, '#height-group');

      await unitButton(page, 'ft / in').click();
      let v = await values(page);
      check(`${tag} re-tapping the selected "ft / in" keeps 5 ft 4 in`, v.heightFeet === '5' && v.heightInches === '4', JSON.stringify(v));
      check(`${tag} re-tapping the selected "ft / in" keeps 185 lbs`, v.weight === '185', JSON.stringify(v));

      await unitButton(page, 'cm').click();
      v = await values(page);
      check(`${tag} "cm" shows the height converted to 163 cm`, v.heightCm === '163', JSON.stringify(v));
      check(`${tag} "cm" shows the weight converted to 84 kg`, v.weightKg === '84', JSON.stringify(v));
      check(`${tag} "cm" is announced as pressed`, (await unitButton(page, 'cm').getAttribute('aria-pressed')) === 'true');
      await shot(page, `${vp.name}-2-metric-converted`, '#height-group');

      await unitButton(page, 'cm').click();
      v = await values(page);
      check(`${tag} re-tapping the selected "cm" keeps 163 cm and 84 kg`, v.heightCm === '163' && v.weightKg === '84', JSON.stringify(v));

      await unitButton(page, 'ft / in').click();
      v = await values(page);
      check(`${tag} back to "ft / in" shows 5 ft 4 in`, v.heightFeet === '5' && v.heightInches === '4', JSON.stringify(v));
      check(`${tag} back to "ft / in" shows 185 lbs`, v.weight === '185', JSON.stringify(v));
      check(`${tag} email and age survive the switches`, v.email === 'reader@example.com' && v.age === '58', JSON.stringify(v));

      const layout = await page.evaluate(() => {
        const group = document.getElementById('height-group');
        const label = document.getElementById('height-label').getBoundingClientRect();
        const control = group.querySelector('[aria-label="Measurement units"]').getBoundingClientRect();
        const inches = document.getElementById('heightInches').getBoundingClientRect();
        const mid = (r) => (r.top + r.bottom) / 2;
        return {
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          sameRow: Math.abs(mid(label) - mid(control)) < 12,
          controlRight: Math.round(control.right),
          inputsRight: Math.round(inches.right),
          placeholders: ['heightFeet', 'heightInches', 'weight'].map((id) => document.getElementById(id).placeholder),
        };
      });
      check(`${tag} no horizontal overflow`, layout.overflowX <= 0, `scrollWidth - innerWidth = ${layout.overflowX}`);
      check(`${tag} unit control sits on the Height label row`, layout.sameRow);
      check(`${tag} unit control does not stick out past the inputs`, layout.controlRight <= layout.inputsRight + 1,
        `control right ${layout.controlRight}, inputs right ${layout.inputsRight}`);
      check(`${tag} feet, inches and weight placeholders are not numbers`,
        layout.placeholders.every((p) => p && !/\d/.test(p)), layout.placeholders.join(' | '));
      await context.close();
    }

    // -- Missing height ----------------------------------------------------
    {
      const { context, page } = await openStep1(browser, vp);
      await fillBasics(page, { height: false });
      await continueButton(page).click();
      await page.waitForTimeout(1200); // smooth scroll plus its fallback window

      const st = await page.evaluate(() => {
        const r = (el) => el.getBoundingClientRect();
        const err = document.getElementById('height-error');
        const group = document.getElementById('height-group');
        const feet = document.getElementById('heightFeet');
        const inches = document.getElementById('heightInches');
        return {
          onStep1: !!feet,
          text: err ? err.textContent.trim() : null,
          visible: !!err && r(err).height > 0 && getComputedStyle(err).visibility !== 'hidden',
          inGroup: !!err && group.contains(err),
          gap: err ? Math.round(r(err).top - Math.max(r(feet).bottom, r(inches).bottom)) : null,
          errOnScreen: !!err && r(err).top >= 0 && r(err).bottom <= window.innerHeight,
          groupOnScreen: r(group).top >= 0 && r(group).bottom <= window.innerHeight,
          active: document.activeElement ? document.activeElement.id : null,
          aria: [feet, inches].map((el) => `${el.getAttribute('aria-invalid')}:${el.getAttribute('aria-describedby')}`),
        };
      });
      check(`${tag} missing height: stays on Step 1`, st.onStep1 && !(await page.getByText('Your Activity & Goals').count()));
      check(`${tag} missing height: "Please enter your height" is visible`, st.text === 'Please enter your height' && st.visible, String(st.text));
      check(`${tag} missing height: the message sits directly under the height inputs`,
        st.inGroup && st.gap !== null && st.gap >= 0 && st.gap <= 24, `gap ${st.gap}px`);
      check(`${tag} missing height: feet and inches are aria-invalid and described by the message`,
        st.aria.every((a) => a === 'true:height-error'), st.aria.join(' , '));
      check(`${tag} missing height: focus moves to the Feet input`, st.active === 'heightFeet', `active: ${st.active}`);
      check(`${tag} missing height: the height fields and the message are on screen`, st.groupOnScreen && st.errOnScreen,
        `group ${st.groupOnScreen}, message ${st.errOnScreen}`);
      await shot(page, `${vp.name}-3-missing-height`);

      await page.fill('#heightFeet', '5');
      check(`${tag} typing a height clears the message`, (await page.locator('#height-error').count()) === 0);
      await context.close();
    }

    // -- Missing email -------------------------------------------------------
    {
      const { context, page } = await openStep1(browser, vp);
      await fillBasics(page, { email: false });
      await continueButton(page).click();
      await page.waitForTimeout(1200);
      const st = await page.evaluate(() => {
        const email = document.getElementById('email');
        // div.w-full, not .w-full: the input itself also carries that class
        const msg = email.closest('div.w-full').querySelector('p.text-red-500');
        const r = email.getBoundingClientRect();
        return {
          text: msg ? msg.textContent.trim() : null,
          active: document.activeElement ? document.activeElement.id : null,
          onScreen: r.top >= 0 && r.bottom <= window.innerHeight,
        };
      });
      check(`${tag} missing email: message reads "Email is required to continue"`, st.text === 'Email is required to continue', String(st.text));
      check(`${tag} missing email: focus moves to the email input, on screen`, st.active === 'email' && st.onScreen, JSON.stringify(st));
      await context.close();
    }

    // -- Metric 182 cm (used to be rejected against a hidden inches field) ----
    {
      const { context, page } = await openStep1(browser, vp);
      await page.fill('#email', 'reader@example.com');
      await page.locator('#root input[name="sex"][value="female"]').check();
      await page.fill('#age', '58');
      await unitButton(page, 'cm').click();
      await page.fill('#heightCm', '182');
      await page.fill('#weightKg', '84');
      await continueButton(page).click();
      check(`${tag} metric 182 cm / 84 kg continues to Step 2`, await reachedStep2(page));
      await context.close();
    }

    // -- Valid imperial Step 1 -------------------------------------------------
    {
      const { context, page } = await openStep1(browser, vp);
      await fillBasics(page);
      await continueButton(page).click();
      check(`${tag} valid imperial Step 1 continues to Step 2`, await reachedStep2(page));
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\nstep1-units-and-errors: ${passed} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);

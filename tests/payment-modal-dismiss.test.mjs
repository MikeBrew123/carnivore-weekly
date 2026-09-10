/**
 * Payment-modal dismissal guard (audit 2026-09-10, P0).
 *
 * The $29 payment modal was rendered inside <AnimatePresence>. Its exit
 * animation ran to opacity 0 but the node was never unmounted, leaving a
 * full-screen position:fixed overlay at z-index 10000 with pointer-events:auto.
 * The page looked normal and was completely dead: every tap landed on the
 * invisible overlay, including a second attempt to press the $29 CTA. A
 * customer who opened the offer, read it, and closed it to think could not buy
 * without reloading the page.
 *
 * This test drives the real funnel in a real browser and asserts that after
 * dismissal the CTA is the element that actually receives a click at its own
 * coordinates — hit-testing, not merely "the overlay looks gone".
 *
 * Run: node tests/payment-modal-dismiss.test.mjs
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../public', import.meta.url)));
const PORT = 8913;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.ico': 'image/x-icon',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let filePath = join(ROOT, urlPath);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
      if (!existsSync(filePath)) { res.writeHead(404).end('not found'); return; }
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// Drive the calculator to the free-results screen.
async function reachResults(page) {
  await page.goto(`http://localhost:${PORT}/calculator.html?test=modal-dismiss`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root #email', { timeout: 20000 });

  await page.evaluate(() => {
    const set = (el, v) => {
      const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const R = document.getElementById('root');
    set(R.querySelector('#email'), 'qa-modal-dismiss@example.com');
    R.querySelector('input[value="female"]').click();
    set(R.querySelector('#age'), '58');
    set(R.querySelector('#heightFeet'), '5');
    set(R.querySelector('#heightInches'), '4');
    set(R.querySelector('#weight'), '186');
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const R = document.getElementById('root');
    [...R.querySelectorAll('button')].find((b) => /Continue/i.test(b.innerText)).click();
  });

  await page.waitForFunction(() => /Your Activity/.test(document.getElementById('root').innerText), null, { timeout: 15000 });
  await page.evaluate(() => {
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const R = document.getElementById('root');
    const s = [...R.querySelectorAll('select')];
    set(s[0], 'light');
    set(s[1], '1-2');
    R.querySelector('input[value="lose"]').click();
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const set = (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const R = document.getElementById('root');
    const s = [...R.querySelectorAll('select')];
    set(s[2], '15');
    set(s[3], 'carnivore');
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const R = document.getElementById('root');
    [...R.querySelectorAll('button')].find((b) => /See Your Results/.test(b.innerText)).click();
  });
  await page.waitForFunction(() => /Your Personalized/.test(document.getElementById('root').innerText), null, { timeout: 20000 });
}

// One open -> close -> "can I still click the CTA?" cycle.
async function cycle(page, via) {
  await page.evaluate(() => {
    const R = document.getElementById('root');
    [...R.querySelectorAll('button')].find((b) => /Get My 30-Day Plan for \$29/.test(b.innerText)).click();
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll('body *')].some(
      (e) => getComputedStyle(e).position === 'fixed' && getComputedStyle(e).zIndex === '10000'
    ), null, { timeout: 15000 }
  );

  const opened = true;
  await page.evaluate((v) => {
    const ov = [...document.querySelectorAll('body *')].find(
      (e) => getComputedStyle(e).position === 'fixed' && getComputedStyle(e).zIndex === '10000'
    );
    const btns = [...ov.querySelectorAll('button')];
    const target = v === 'Cancel'
      ? btns.find((b) => /Cancel/.test(b.innerText))
      : btns.find((b) => b.innerText.trim() === '✕');
    target.click();
  }, via);
  await page.waitForTimeout(1500);

  return page.evaluate(() => {
    const R = document.getElementById('root');
    const overlay = [...document.querySelectorAll('body *')].find(
      (e) => getComputedStyle(e).position === 'fixed' && getComputedStyle(e).zIndex === '10000'
    );
    const cta = [...R.querySelectorAll('button')].find((b) => /Get My 30-Day Plan for \$29/.test(b.innerText));
    cta.scrollIntoView({ block: 'center' });
    const r = cta.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    return {
      overlayPresent: !!overlay,
      overlayBlocksTap: overlay ? overlay.contains(hit) : false,
      ctaReceivesClick: hit === cta,
      hitTag: hit ? hit.tagName : null,
    };
  }).then((res) => ({ ...res, opened, via }));
}

/**
 * Source guard.
 *
 * The runtime assertions below cannot be relied on alone: headless Chromium
 * completes the exit animation and unmounts the node, so the production race
 * (overlay stuck at opacity 0 with pointer-events:auto) does NOT reproduce
 * here — this suite passes against the original defective code. Verified by
 * mutation on 2026-09-10: restoring <AnimatePresence> and dropping the `key`
 * left every runtime assertion green.
 *
 * So the deterministic guard is structural: the payment modal must be rendered
 * by plain conditional rendering, never wrapped in <AnimatePresence>, whose
 * exit bookkeeping is what stranded the overlay in real browsers.
 */
async function checkSources() {
  console.log('Source guard');
  const callSites = [
    '../calculator2-demo/src/components/calculator/CalculatorApp.tsx',
    '../calculator2-demo/src/components/ui/PricingModal.tsx',
  ];
  for (const rel of callSites) {
    const path = resolve(fileURLToPath(new URL(rel, import.meta.url)));
    const src = await readFile(path, 'utf8');
    const name = rel.split('/').pop();

    // Strip comments so the explanatory notes don't trip the guard.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    check(
      `${name}: renders StripePaymentModal without <AnimatePresence>`,
      !/<AnimatePresence>[\s\S]{0,600}StripePaymentModal/.test(code),
      'payment modal is wrapped in AnimatePresence again'
    );
    check(
      `${name}: StripePaymentModal has a stable key`,
      /<StripePaymentModal[\s\S]{0,120}key=/.test(code),
      'missing key prop'
    );
  }
  console.log('');
}

await checkSources();

const server = await startServer();
const browser = await chromium.launch();

console.log('\n=== Payment modal dismissal ===\n');

for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const label = `${viewport.width}x${viewport.height}`;
  console.log(`Viewport ${label}`);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await reachResults(page);

  // Repeated cycles: the original defect left one dead overlay per dismissal.
  for (const via of ['✕', 'Cancel', '✕']) {
    const r = await cycle(page, via);
    check(`${label}: modal opens (closed via ${via})`, r.opened);
    check(`${label}: overlay unmounted after ${via}`, !r.overlayPresent);
    check(`${label}: dismissed overlay does not swallow the tap (${via})`, !r.overlayBlocksTap);
    check(`${label}: CTA receives the click after ${via}`, r.ctaReceivesClick, `hit=${r.hitTag}`);
  }

  await context.close();
  console.log('');
}

await browser.close();
server.close();

if (failures > 0) {
  console.error(`\n${failures} FAILED\n`);
  process.exit(1);
}
console.log('All payment-modal dismissal assertions passed.\n');

/**
 * KetoDial: the immediate upgrade offer under the free macro result.
 *
 * WHY THIS FILE EXISTS
 * The paid picker was already above the optional profile in the DOM, but the page
 * still READ like the old architecture: the loudest control under a customer's
 * results said "Step 1 of 2 complete", and the products were four blocks further
 * down, past the plate breakdown, an email confirmation and a row of share buttons.
 * The highest-intent moment was being spent asking for more homework.
 *
 * WHAT IS ACTUALLY TESTED
 * Not "does this string appear somewhere in the file". Two things:
 *
 *  1. MECHANISM. The real featuredOffer() / productAvailable() / renderUpgradeCard()
 *     source is lifted out of the shipped ketodial.js and EXECUTED against a DOM
 *     stub. The assertions below are about what that code actually produces for
 *     kidney no / yes / unsure — the price, the item set, and the rendered copy.
 *     A copy of the logic written into this file would prove nothing.
 *
 *  2. HIERARCHY. The position of the upgrade card among its SIBLINGS in
 *     index.html, by parsing the element order, not by searching for text.
 *
 * The safety rule this must never soften: the card derives its offer from the same
 * productAvailable() the detailed picker uses. If someone gives the card its own
 * product list, GROUP U fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(REPO, 'ketodial', 'public', 'ketodial.js');
const HTML = path.join(REPO, 'ketodial', 'public', 'index.html');

let checks = 0;
const failures = [];
function check(group, name, ok, detail) {
  checks++;
  if (!ok) failures.push({ group, name, detail: detail || '' });
}

const js = fs.readFileSync(JS, 'utf8');
const html = fs.readFileSync(HTML, 'utf8');

// ---------------------------------------------------------------------------
// Lift the REAL offer machinery out of the shipped file and run it.
// ---------------------------------------------------------------------------
// The region from `var PRODUCTS=` up to `function toggleProduct(` holds PRODUCTS,
// PROTEIN_ANCHORED, productAvailable, featuredOffer, the bullet copy and
// renderUpgradeCard. Everything else it touches is injected below, so nothing in
// this file re-implements a rule.
const start = js.indexOf('var PRODUCTS=');
const end = js.indexOf('function toggleProduct(');
if (start < 0 || end < 0 || end <= start) {
  console.error('FATAL: could not locate the offer machinery in ketodial.js.');
  console.error('       Looked for `var PRODUCTS=` ... `function toggleProduct(`.');
  process.exit(1);
}
const REGION = js.slice(start, end);
const PRODUCT_REGION_FOR_RESUME = REGION;

for (const needed of ['featuredOffer', 'renderUpgradeCard', 'productAvailable', 'PROTEIN_ANCHORED']) {
  check('U', `the extracted region still contains ${needed}()`, REGION.includes(needed),
    'the sandbox below would silently test nothing');
}

/** Minimal element stub: only what renderUpgradeCard actually touches. */
function makeEl() {
  return {
    dataset: {}, hidden: true, innerHTML: '',
    classList: { _s: new Set(), contains(c) { return this._s.has(c); },
                 add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); } },
    addEventListener() {},
  };
}

/**
 * Build a live sandbox for one kidney answer and return what the page would render.
 * `kidneyStatus` is the ONLY thing that varies, exactly as on the real page.
 */
function renderFor(kidney) {
  const card = makeEl();
  const results = makeEl();
  results.classList.add('show');
  const planNote = makeEl(); planNote.textContent = '';
  const els = { '#kdUpgradeCard': card, '#freeResults': results,
                '#planSentDetail': planNote };
  const events = [];
  const $ = (sel) => els[sel] || makeEl();
  const money = (n) => '$' + n.toFixed(2);
  const track = (e, p) => events.push({ event: e, params: p });
  const kidneyStatus = () => kidney;
  const proteinSuppressed = () => kidneyStatus() !== 'no';
  const factory = new Function(
    '$', 'money', 'track', 'kidneyStatus', 'proteinSuppressed',
    'render', 'beginCheckout', 'scrollToEl',
    REGION + '\n return { featuredOffer, productAvailable, renderUpgradeCard,' +
             ' renderPlanSentNote, PRODUCTS, selected };'
  );
  const api = factory($, money, track, kidneyStatus, proteinSuppressed,
                      () => {}, () => {}, () => {});
  api.renderUpgradeCard();
  api.renderPlanSentNote();
  const text = card.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { ...api, card, text, events, planNote: planNote.textContent,
           offer: api.featuredOffer() };
}

// ===========================================================================
// GROUP U — ONE MEDICAL RULE, NOT TWO.
// ===========================================================================
{
  check('U', 'the card declares no product list of its own',
    !/UC_(PRODUCTS|OFFER|PRICES)\s*=/.test(js) &&
    (js.match(/var PROTEIN_ANCHORED=/g) || []).length === 1,
    'a second catalogue would drift from productAvailable()');

  // featuredOffer must ASK productAvailable rather than branch on the answer itself.
  const fo = REGION.slice(REGION.indexOf('function featuredOffer'),
                          REGION.indexOf('var UC_BULLETS'));
  // BOTH candidate lists must go through the gate. An earlier version of this
  // assertion only required ONE `.filter(productAvailable)` anywhere in the
  // function, and a mutation that hard-coded the bundle branch on
  // proteinSuppressed() sailed through it because the other branch still filtered.
  check('U', 'every candidate list in featuredOffer() is filtered by productAvailable()',
    (fo.match(/\.filter\(productAvailable\)/g) || []).length === 2,
    fo.slice(0, 300));
  // proteinSuppressed() IS the kidney answer. Naming it here is the same second
  // rule as reading the chips directly, and behaviour alone cannot distinguish the
  // two while they happen to agree — which is exactly why this is asserted on the
  // source and not on the output.
  check('U', 'featuredOffer() consults no kidney signal of its own',
    !/kidneyStatus/.test(fo) && !/proteinSuppressed/.test(fo) &&
    !/'unsure'|'yes'|'no'/.test(fo),
    'the offer would carry its own copy of the renal rule, free to drift');
}

// ===========================================================================
// GROUP V — KIDNEY "NO": THE FULL PROTOCOL, IMMEDIATELY.
// ===========================================================================
{
  const r = renderFor('no');
  check('V', 'the offer is the Full Protocol', r.offer.items.join(',') === 'protocol',
    r.offer.items.join(','));
  check('V', 'the price is $10.99', r.offer.price === 10.99, String(r.offer.price));
  check('V', 'the CTA carries the price', /Get the Full Protocol for \$10\.99/.test(r.text),
    r.text.slice(0, 200));
  check('V', 'the Meal Plan is still sellable', r.productAvailable('meal') === true, '');
  check('V', 'the card names the Meal Plan and the grocery list',
    /7-Day Meal Plan/.test(r.text) && /grocery list/i.test(r.text), r.text);
  check('V', 'the saving is the real arithmetic, not a round number',
    r.offer.list === 15.97 && r.offer.save === 4.98, `${r.offer.list}/${r.offer.save}`);
  check('V', 'no renal referral is shown to someone who answered no',
    !/renal dietitian/i.test(r.text), r.text);
  check('V', 'the card is revealed, not left hidden', r.card.hidden === false, '');
  check('V', 'the confirmation still explains the protein floor to a normal reader',
    /protein floor/i.test(r.planNote) && !/Step \d/i.test(r.planNote), r.planNote);
  check('V', 'a view event fires with the offer and the answer',
    r.events.some(e => e.event === 'kd_upgrade_card_viewed' &&
                       e.params.offer === 'protocol' && e.params.kidney === 'no'),
    JSON.stringify(r.events));
}

// ===========================================================================
// GROUP W — KIDNEY "YES" AND "UNSURE": DOCTOR + STARTER, NO TEASE.
// ===========================================================================
for (const answer of ['yes', 'unsure']) {
  const r = renderFor(answer);
  check('W', `[${answer}] the offer is Doctor + Starter only`,
    r.offer.items.join(',') === 'doctor,starter', r.offer.items.join(','));
  check('W', `[${answer}] the total is $9.98`, r.offer.price === 9.98, String(r.offer.price));
  check('W', `[${answer}] the CTA carries $9.98 and not $10.99`,
    /Get both reports for \$9\.98/.test(r.text) && !/10\.99/.test(r.text), r.text.slice(0, 200));

  // The instruction was: do not tease or advertise what we cannot sell them. Naming
  // the Meal Plan in order to explain its absence is still naming it.
  check('W', `[${answer}] the card never says "Meal Plan"`, !/Meal Plan/i.test(r.text), r.text);
  check('W', `[${answer}] the card never says "Full Protocol"`,
    !/Full Protocol/i.test(r.text), r.text);
  check('W', `[${answer}] no grocery list is promised`, !/grocery list/i.test(r.text), r.text);

  check('W', `[${answer}] the meal plan is not purchasable`,
    r.productAvailable('meal') === false, '');
  check('W', `[${answer}] neither bundle is purchasable`,
    r.productAvailable('essentials') === false && r.productAvailable('protocol') === false, '');
  check('W', `[${answer}] Doctor and Starter both remain purchasable`,
    r.productAvailable('doctor') === true && r.productAvailable('starter') === true, '');

  // No invented discount. Doctor + Starter is two full-price reports.
  check('W', `[${answer}] no saving is claimed`,
    r.offer.save === 0 && !/Save \$/i.test(r.text), r.text);

  // The email-sent confirmation used to be static markup asserting "that's how we
  // set your protein floor" to EVERY reader, directly under a result that withheld
  // exactly that number.
  check('W', `[${answer}] the confirmation does not claim a protein floor was set`,
    !/protein floor/i.test(r.planNote), r.planNote);
  check('W', `[${answer}] the confirmation points at no retired step number`,
    !/Step \d/i.test(r.planNote), r.planNote);

  check('W', `[${answer}] the protein referral is present and routes to a clinician`,
    /renal dietitian/i.test(r.text) && /Protein needs can vary with kidney function/i.test(r.text),
    r.text);
}

// ===========================================================================
// GROUP X — "I'M NOT SURE" IS NOT A DIAGNOSIS.
// ===========================================================================
{
  const unsure = renderFor('unsure');
  const yes = renderFor('yes');
  check('X', 'the unsure card never says "kidney disease"',
    !/kidney disease/i.test(unsure.text), unsure.text);
  check('X', 'the unsure card never says diagnosed, CKD or dialysis',
    !/diagnos|CKD|dialysis/i.test(unsure.text), unsure.text);
  // Suppression must be as strong for unsure as for yes: same products, same price.
  check('X', 'unsure is gated exactly as hard as yes',
    unsure.offer.items.join(',') === yes.offer.items.join(',') &&
    unsure.offer.price === yes.offer.price,
    `${unsure.offer.items} vs ${yes.offer.items}`);
}

// ===========================================================================
// GROUP Y — NO HIDDEN PATH BACK TO A BLOCKED PRODUCT.
// ===========================================================================
{
  const r = renderFor('yes');
  // The CTA seeds the picker's own `selected` set, so it is subject to the same
  // guard. Prove the guard is on the write, not merely on what is displayed.
  r.selected.clear();
  r.offer.items.forEach(k => { if (r.productAvailable(k)) r.selected.add(k); });
  check('Y', 'the CTA can only select products that passed the gate',
    !r.selected.has('meal') && !r.selected.has('protocol') && !r.selected.has('essentials'),
    [...r.selected].join(','));
  check('Y', 'the rendered card contains no control targeting a blocked product',
    !/data-product="(meal|essentials|protocol)"/.test(r.card.innerHTML), r.card.innerHTML);

  // render() removes blocked cards from the catalogue rather than disabling them,
  // and it must also drop anything already selected.
  const renderFn = js.slice(js.indexOf('function render(){'));
  check('Y', 'render() still deselects a product that became unavailable',
    /if\(!ok\)\s*selected\.delete\(card\.dataset\.product\);/.test(renderFn), '');
  check('Y', 'the picker click handler refuses a blocked product before toggling',
    /if\(!productAvailable\(key\)\)\s*return;[\s\S]{0,80}toggleProduct\(key\);/.test(js), '');
}

// ===========================================================================
// GROUP Z — THE HIERARCHY, BY SIBLING ORDER RATHER THAN BY TEXT SEARCH.
// ===========================================================================
{
  // Walk the direct children of #freeResults and record their identity in order.
  const frStart = html.indexOf('<div class="flowstep" id="freeResults">');
  check('Z', '#freeResults exists', frStart > -1, '');
  const seg = html.slice(frStart);
  const order = [];
  let depth = 0;
  const tagRe = /<div\b[^>]*>|<\/div>/g;
  let m;
  while ((m = tagRe.exec(seg))) {
    if (m[0] === '</div>') { depth--; if (depth === 0) break; continue; }
    if (depth === 1) {
      const id = /id="([^"]+)"/.exec(m[0]);
      const cls = /class="([^"]+)"/.exec(m[0]);
      order.push(id ? id[1] : (cls ? cls[1] : '?'));
    }
    depth++;
  }
  const at = (n) => order.indexOf(n);
  check('Z', 'the results card is first', at('result-card') === 0, order.join(' > '));
  check('Z', 'the upgrade card comes immediately after the results card',
    at('kdUpgradeCard') === 1, order.join(' > '));
  check('Z', 'the plate breakdown is BELOW the paid offer',
    at('result-card rc-plate') > at('kdUpgradeCard'), order.join(' > '));
  check('Z', 'the optional profile prompt is BELOW the paid offer',
    at('optional-card') > at('kdUpgradeCard'), order.join(' > '));
  check('Z', 'the email confirmation is BELOW the paid offer',
    at('planEmailBox') > at('kdUpgradeCard'), order.join(' > '));
  check('Z', 'the share row is BELOW the paid offer',
    at('kd-calc-share') > at('kdUpgradeCard'), order.join(' > '));
  check('Z', 'the share row is below the optional prompt too',
    at('kd-calc-share') > at('optional-card'), order.join(' > '));

  // #freeResults itself precedes the detailed picker and the profile form.
  check('Z', 'the whole results block precedes the detailed picker',
    frStart < html.indexOf('id="reportPicker"'), '');
  check('Z', 'the whole results block precedes the profile form',
    frStart < html.indexOf('id="step2"'), '');
}

// ===========================================================================
// GROUP AA — THE OLD "YOU ARE HALF FINISHED" FRAMING IS GONE.
// ===========================================================================
{
  check('AA', 'no "Step 1 of 2 complete" label survives',
    !/Step 1 of 2/i.test(html), '');
  check('AA', 'no progress bar sits under the free result',
    !/class="continue-card"/.test(html) && !/class="prog"/.test(html), '');
  check('AA', 'the profile prompt offers both timings rather than one step order',
    /Personalize your reports now or after checkout/.test(html), '');
  check('AA', 'the profile prompt says it is not required in order to buy',
    /Not required before purchase/.test(html), '');
  check('AA', 'the prompt tells them they may do it after paying',
    /after you buy/i.test(html), '');
  check('AA', 'the picker intro sells the reports rather than shrugging',
    /Turn your numbers into a plan you can actually use\./.test(html) &&
    !/Pick what's useful\. Skip what's not\./.test(html), '');
  // No dark patterns were introduced with the new copy.
  for (const bad of ['hurry', 'expires', 'only \\d+ left', 'countdown', 'act now']) {
    check('AA', `the new copy contains no "${bad}" urgency`,
      !new RegExp(bad, 'i').test(html), '');
  }
}

// ===========================================================================
// GROUP AB — CHECKOUT IS ONE PATH, AND NEEDS NO PROFILE.
// ===========================================================================
{
  check('AB', 'the upgrade CTA and the total bar share one checkout function',
    /function beginCheckout\(btn\)/.test(js) &&
    /checkoutBtn\.addEventListener\('click',function\(\)\{ beginCheckout\(checkoutBtn\); \}\)/.test(js) &&
    /beginCheckout\(this\)/.test(js),
    'a second checkout path could skip the session checkpoint');
  check('AB', 'both paths still wait for the authoritative writes to settle',
    (js.match(/writesSettled\(\)\.then/g) || []).length === 1 &&
    js.indexOf('writesSettled().then') > js.indexOf('function beginCheckout'),
    'checkout could race the session write it is about to be validated against');
  check('AB', 'checkout falls back to the step-1 email, so no profile is required',
    /\$\('#emailOpt'\)&&\$\('#emailOpt'\)\.value\.trim\(\)/.test(js), '');
  check('AB', 'the upgrade CTA drives the picker selection rather than its own order',
    /selected\.clear\(\);[\s\S]{0,200}o\.items\.forEach[\s\S]{0,120}selected\.add\(k\)/.test(js), '');
  check('AB', 'step 1 still requires an email before results exist',
    /Email is required/.test(js) && /#emailOpt/.test(js), '');
}

// ===========================================================================
// GROUP AC — THE NEW FUNNEL IS MEASURABLE, WITHOUT PII.
// ===========================================================================
{
  const required = ['kd_upgrade_card_viewed', 'kd_upgrade_cta_clicked',
                    'kd_see_individual_reports', 'kd_optional_profile_clicked',
                    'kd_report_selected', 'kd_checkout_opened', 'kd_payment_complete'];
  for (const e of required) {
    check('AC', `${e} is emitted`, new RegExp(`track\\('${e}'`).test(js), '');
  }
  // The renal CTA is distinguishable from the normal one by its offer dimension.
  check('AC', 'the CTA event carries which offer was shown',
    /track\('kd_upgrade_cta_clicked',\{offer:o\.items\.join\(','\),price:o\.price,kidney:kidneyStatus\(\)\}\)/.test(js),
    'the renal and normal CTAs would be indistinguishable in reporting');
  // No email, name or free-text health answer may ride along.
  const trackCalls = js.match(/track\('kd_[a-z_]+',\{[^}]*\}/g) || [];
  for (const c of trackCalls) {
    check('AC', `no PII in ${c.slice(0, 34)}…`,
      !/email:\s*[a-z]|name:|value\.trim\(\)|medications|conditions/.test(c) ||
      /email_provided/.test(c),
      c);
  }
}

// ---------------------------------------------------------------------------
// A wider sandbox: the whole product + checkout region, executed.
// ---------------------------------------------------------------------------
// GROUP AD needs the REAL click path — the CTA handler that renderUpgradeCard()
// attaches, beginCheckout(), busyButton() and startCheckout() — so the extraction
// runs from `var PRODUCTS=` to the checkout-close wiring. Nothing about the busy
// state is re-implemented here; the assertions observe the shipped code.
const CK_END = js.indexOf('  // Close checkout modal');
if (CK_END < 0 || CK_END <= start) {
  console.error('FATAL: could not locate the checkout region in ketodial.js.');
  process.exit(1);
}
const CHECKOUT_REGION = js.slice(start, CK_END);

/** A DOM node stub that actually dispatches clicks, so a test can press a button. */
function node(id) {
  const el = {
    id, dataset: {}, hidden: false, disabled: false, style: {},
    _text: '', _html: '', _on: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
                 contains(c) { return this._s.has(c); }, toggle(c, on) { on ? this.add(c) : this.remove(c); } },
    querySelector() { return null; },
    addEventListener(ev, fn) { (el._on[ev] = el._on[ev] || []).push(fn); },
    click() { (el._on.click || []).forEach(fn => fn.call(el, {})); },
  };
  Object.defineProperty(el, 'textContent', {
    get() { return el._text; },
    set(v) { el._text = String(v); el._html = String(v); },
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    // Assigning innerHTML replaces children, so any button inside is a NEW element.
    set(v) { el._html = String(v); el._text = String(v).replace(/<[^>]+>/g, ''); el._kids = {}; },
  });
  return el;
}

/**
 * Build a live checkout sandbox. `stripe` decides what initEmbeddedCheckout does,
 * which is how the failure path is exercised without special-casing anything.
 */
function checkoutSandbox({ kidney = 'no', stripeFails = false, createFails = false } = {}) {
  const els = {};
  const get = (sel) => (els[sel] = els[sel] || node(sel));
  const card = get('#kdUpgradeCard');
  const results = get('#freeResults');
  results.classList.add('show');
  const overlay = get('#checkoutOverlay');
  const pickerBtn = get('#checkoutBtn');

  // renderUpgradeCard writes innerHTML then looks the CTA up again, so the lookup
  // has to return whatever the current render produced — a fresh element each time,
  // exactly as in a browser.
  let ctaGeneration = 0;
  const $ = (sel) => {
    if (sel === '#kdUpgradeCta' || sel === '#kdSeeAllReports') {
      const key = sel + ':' + ctaGeneration;
      if (!els[key]) {
        els[key] = node(sel);
        // Adopt the label the real renderUpgradeCard just wrote, so the assertions
        // compare against the shipped copy rather than an empty string.
        const m = new RegExp('id="' + sel.slice(1) + '"[^>]*>([^<]*)<').exec(card._html || '');
        if (m) els[key].textContent = m[1].replace(/&amp;/g, '&');
      }
      return els[key];
    }
    return get(sel);
  };
  const $all = () => [];
  const mounted = [];
  const alerts = [];
  const stripe = {
    initEmbeddedCheckout: () => stripeFails
      ? Promise.reject(new Error('stripe mount failed'))
      : Promise.resolve({ mount: (t) => mounted.push(t), destroy: () => mounted.pop() }),
  };
  const g = {
    Stripe: () => stripe,
    fetch: () => Promise.resolve({ json: () => Promise.resolve(
      createFails ? { error: 'no_session', message: 'could not create session' }
                  : { clientSecret: 'cs_test_stub' }) }),
    alert: (m) => alerts.push(String(m)),
    console: { error() {}, warn() {}, log() {} },
  };
  const factory = new Function(
    '$', '$all', 'money', 'track', 'kidneyStatus', 'proteinSuppressed', 'scrollToEl',
    'updateSession', 'writesSettled', 'emailReq', 'nameReq', 'sessionToken',
    'Stripe', 'fetch', 'alert', 'console', 'API_BASE',
    'var embeddedCheckout=null, stripeInstance=null;\n' +
    CHECKOUT_REGION +
    '\n return { beginCheckout, startCheckout, busyButton, renderUpgradeCard, render, selected,' +
    ' productAvailable, featuredOffer, closeOverlay:function(){ checkoutOverlay.classList.remove("show");' +
    ' if(embeddedCheckout){ embeddedCheckout.destroy(); embeddedCheckout=null; } },' +
    ' bumpCta:function(){} };'
  );
  const api = factory(
    $, $all, (n) => '$' + n.toFixed(2), () => {}, () => kidney, () => kidney !== 'no',
    () => {}, () => Promise.resolve(), () => Promise.resolve(),
    { value: 'x@example.invalid' }, { value: 'Test' }, 'kd_stub_token',
    g.Stripe, g.fetch, g.alert, g.console, 'https://api.test'
  );
  api.renderUpgradeCard();
  return { api, $, card, overlay, pickerBtn, mounted, alerts,
           cta: () => $('#kdUpgradeCta') };
}

// ===========================================================================
// GROUP AD — THE FEATURED CTA SURVIVES A CHECKOUT THE CUSTOMER CLOSES.
// ---------------------------------------------------------------------------
// startCheckout() used to reset `checkoutBtn` — the PICKER's button — on both its
// success and failure paths. The featured card's CTA is a different element, so it
// stayed disabled and stuck on "Loading checkout…", and renderUpgradeCard() skips
// repainting when the offer has not changed, so render() could not rescue it. Open
// checkout, close it without paying, and the buy button was dead.
// ===========================================================================
{
  const s = checkoutSandbox();
  const cta = s.cta();
  const original = cta.textContent;
  check('AD', 'the CTA starts enabled with its price label',
    cta.disabled === false && /Get the Full Protocol for \$10\.99/.test(original), original);

  // 1 + 2. Click it; it must go busy.
  cta.click();
  check('AD', 'clicking the CTA puts it into a busy state',
    cta.disabled === true && /Loading checkout/.test(cta.textContent), cta.textContent);

  // 3. Let the promise chain run: session create, then Stripe mount.
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));

  check('AD', 'Stripe was actually mounted', s.mounted.length === 1, JSON.stringify(s.mounted));
  check('AD', 'the overlay was opened', s.overlay.classList.contains('show'), '');

  // 4. The ORIGINATING button is restored, with its real label.
  check('AD', 'the featured CTA is enabled again after a successful mount',
    cta.disabled === false, `disabled=${cta.disabled}`);
  check('AD', 'and it carries its original label, not "Loading checkout…"',
    cta.textContent === original, `${cta.textContent} != ${original}`);

  // 5 + 6. Close checkout without paying. The CTA must still be usable.
  s.api.closeOverlay();
  check('AD', 'closing checkout leaves the featured CTA usable',
    cta.disabled === false && cta.textContent === original, cta.textContent);
  check('AD', 'the overlay is closed', !s.overlay.classList.contains('show'), '');

  // 7 + 8. Click again; checkout opens again.
  cta.click();
  check('AD', 'a repeat click goes busy again', cta.disabled === true, '');
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
  await new Promise(r => setTimeout(r, 0));
  check('AD', 'checkout can be opened a second time', s.mounted.length === 1, JSON.stringify(s.mounted));
  check('AD', 'and the CTA is restored again', cta.disabled === false && cta.textContent === original,
    cta.textContent);
  check('AD', 'no error was shown to the customer on the happy path',
    s.alerts.length === 0, s.alerts.join(' | '));
}

// ===========================================================================
// GROUP AE — EVERY FAILURE PATH GIVES THE ORIGINATING BUTTON BACK.
// ===========================================================================
{
  // Stripe fails to mount.
  const s = checkoutSandbox({ stripeFails: true });
  const cta = s.cta();
  const original = cta.textContent;
  cta.click();
  for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
  check('AE', 'a failed Stripe mount re-enables the featured CTA', cta.disabled === false,
    `disabled=${cta.disabled}`);
  check('AE', 'a failed Stripe mount restores the original label',
    cta.textContent === original, cta.textContent);
  check('AE', 'the overlay is not left hanging open',
    !s.overlay.classList.contains('show'), '');
  check('AE', 'the customer is told', s.alerts.length === 1, s.alerts.join(' | '));

  // The session could not be created at all.
  const s2 = checkoutSandbox({ createFails: true });
  const cta2 = s2.cta();
  const original2 = cta2.textContent;
  cta2.click();
  for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
  check('AE', 'a failed session create re-enables the featured CTA', cta2.disabled === false,
    `disabled=${cta2.disabled}`);
  check('AE', 'a failed session create restores the original label',
    cta2.textContent === original2, cta2.textContent);
  check('AE', 'nothing was mounted', s2.mounted.length === 0, '');

  // The renal CTA is the same mechanism, not a special case.
  const s3 = checkoutSandbox({ kidney: 'unsure' });
  const cta3 = s3.cta();
  const original3 = cta3.textContent;
  check('AE', 'the renal CTA is the $9.98 one', /Get both reports for \$9\.98/.test(original3),
    original3);
  cta3.click();
  for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
  check('AE', 'the renal CTA is restored the same way',
    cta3.disabled === false && cta3.textContent === original3, cta3.textContent);
  check('AE', 'the renal purchase still carries only the safe products',
    [...s3.api.selected].sort().join(',') === 'doctor,starter',
    [...s3.api.selected].join(','));

  // The picker's own button goes through the identical helper.
  const s4 = checkoutSandbox();
  s4.api.selected.clear(); s4.api.selected.add('doctor');
  s4.pickerBtn.textContent = 'Continue to checkout · $5.99';
  s4.api.beginCheckout(s4.pickerBtn);
  check('AE', 'the picker button also goes busy', s4.pickerBtn.disabled === true, '');
  for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
  check('AE', 'the picker button is restored by the same helper',
    s4.pickerBtn.disabled === false, `disabled=${s4.pickerBtn.disabled}`);
}

// ===========================================================================
// GROUP AF — NO PROMISE OF DELIVERY THE PAY-FIRST PATH CANNOT KEEP.
// ---------------------------------------------------------------------------
// The architecture deliberately lets a customer buy before completing the profile.
// The webhook then sends the finish-profile email instead of reports. So "Instant
// PDF delivery" and "yours straight away" were false for exactly the path that was
// built on purpose, printed on the button that takes the money.
// ===========================================================================
{
  const BAD = [
    [/instant/i, 'instant'],
    [/straight away/i, 'straight away'],
    [/right away/i, 'right away'],
    [/immediately/i, 'immediately'],
    [/within (?:seconds|minutes)/i, 'within seconds/minutes'],
    [/in seconds/i, 'in seconds'],
  ];
  for (const answer of ['no', 'yes', 'unsure']) {
    const r = renderFor(answer);
    for (const [re, label] of BAD) {
      check('AF', `[${answer}] the featured card does not promise "${label}"`,
        !re.test(r.text), r.text.slice(0, 260));
    }
    check('AF', `[${answer}] the trust row states when delivery happens`,
      /Delivered after personalization/.test(r.text), r.text.slice(0, 260));
    check('AF', `[${answer}] it still says one-time purchase and no subscription`,
      /One-time purchase/.test(r.text) && /No subscription/.test(r.text), r.text);
  }

  // The same claim was printed twice more on the same purchase path.
  check('AF', 'the picker trust row no longer promises instant delivery',
    !/Instant PDF delivery/.test(html), '');
  check('AF', 'nothing on the page offers an instant download of a paid report',
    !/download them instantly/i.test(html), '');

  // Optional BEFORE purchase; required before personalized reports exist.
  check('AF', 'the profile card no longer calls itself simply optional',
    !/Optional: make your reports fit you better/.test(html) &&
    /Personalize your reports now or after checkout/.test(html), '');
  check('AF', 'it says the details are needed before the reports are built',
    /before we can build your personalized reports/i.test(html), '');
  check('AF', 'it still says the profile is not required in order to buy',
    /Not required before purchase/.test(html), '');
  check('AF', 'and it still invites them to buy whenever they are ready',
    /Buy whenever you're ready/.test(html), '');
  check('AF', 'the profile form does not describe itself as mostly optional',
    !/Most are optional/.test(html), '');
  check('AF', 'the confirmation line no longer calls the profile optional details',
    !/optional details/i.test(js), '');
}

// ===========================================================================
// GROUP AG — THE EMAIL LINK CARRIES NO WRITE CREDENTIAL, AND WIDENS NOTHING.
// ---------------------------------------------------------------------------
// The first version put the row's own session_token in the link fragment and a
// comment claimed a fragment never reaches a server or analytics. Both halves were
// false: GA's gtag('config') and the Pinterest tag run in <head> and had already
// read window.location, and delivered email is rewritten through click tracking,
// which turns a `#calc` target into a tracking URL carrying `%23calc` in the
// redirect. Fragment placement bought nothing. What actually protects the row is
// that the URL never carries the session token, and that the resume credential it
// does carry is stripped in <head> before any third-party tag can report it. The
// resume credential is exchangeable for write access; it is not read-only.
// ===========================================================================
{
  const resume = js.slice(js.indexOf('function resumeFromEmail()'),
                          js.indexOf('resumeFromEmail();', js.indexOf('function resumeFromEmail()')));
  check('AG', 'the resume handler exists', resume.length > 0, '');

  // The URL read and the scrub now happen in the inline <head> script, above every
  // third-party tag; GROUP AK pins that ordering. Here we only pin that the app
  // consumes the captured value and re-checks its shape before using it.
  check('AG', 'the captured reference is shape-checked before use',
    /var ref=window\.__kdResumeRef/.test(resume) &&
    /\^kdr_\[0-9a-f\]\{16,96\}\$/.test(resume), resume.slice(0, 400));
  check('AG', 'nothing in the URL is treated as a session token',
    !/sessionToken\s*=\s*(ref|urlParams|hash)/.test(resume), resume);

  // The write credential arrives in the response body instead.
  check('AG', 'the session token comes from the exchange response',
    /sessionToken=d\.session_token/.test(resume), resume);
  check('AG', 'the exchange is a POST, so a prefetch or click tracker cannot spend it',
    /API_BASE\+'\/resume',\{[\s\S]{0,60}method:'POST'/.test(resume), resume.slice(0, 800));

  // Both gates on what a resumed page may select.
  check('AG', 'a resumed selection is re-checked against productAvailable()',
    /allowed\.indexOf\(k\)>-1&&productAvailable\(k\)/.test(resume),
    'the page would select whatever the response claimed');
  check('AG', 'the bundle path is gated too',
    /allowed\.indexOf\('protocol'\)>-1&&productAvailable\('protocol'\)/.test(resume), resume);
  check('AG', 'the kidney chip is set from the server response, not the link',
    /d\.kidney_status/.test(resume), resume.slice(0, 600));

  // The scrub moved to <head> so it lands before GA and Pinterest read the URL.
  check('AG', 'the scrub happens in the head capture, not here',
    /history\.replaceState/.test(html) && !/history\.replaceState/.test(resume),
    'a scrub in ketodial.js runs long after the analytics tags have already reported');
  check('AG', 'and the code does not claim the fragment was ever a guarantee',
    !/never (?:sent to a server|reaches analytics)/i.test(js),
    'a comment is asserting a property the implementation does not provide');

  // No health value is ever read out of the URL.
  check('AG', 'no health value is taken from the URL',
    !/(conditions|medications|macros|proteinG|weight|height|kidney)\s*=\s*(urlParams|params|hash|ref)/i.test(resume),
    resume);
}

// ---------------------------------------------------------------------------
// A resume sandbox: session plumbing + product machinery + the resume handler.
// ---------------------------------------------------------------------------
// GROUP AH proves the behaviour, not the wording. Three real slices of the shipped
// ketodial.js are concatenated and executed: the session block (sessionToken,
// sessionReady, pendingWrites, updateSession, writesSettled), the product block, and
// resumeFromEmail(). Only the browser is faked.
const SESSION_REGION = js.slice(js.indexOf("  var API_BASE='https"),
                                js.indexOf('  function scrollToEl(el,extra){'));
const RESUME_REGION = js.slice(js.indexOf('  function resumeFromEmail(){'),
                               js.indexOf('  resumeFromEmail();'));
for (const [name, region] of [['session', SESSION_REGION], ['resume', RESUME_REGION]]) {
  check('AH', `the ${name} region was located`, region.length > 100, `${region.length} chars`);
}

function resumeSandbox({ kidney = 'no', resumeFails = false } = {}) {
  const calls = [];
  const els = {};
  const mk = (id) => ({
    id, dataset: {}, hidden: false, disabled: false, style: {}, textContent: '', innerHTML: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
                 contains(c) { return this._s.has(c); }, toggle(c, on) { on ? this.add(c) : this.remove(c); } },
    querySelector: () => null, addEventListener() {}, click() {},
  });
  const get = (sel) => (els[sel] = els[sel] || mk(sel));
  // The kidney chips have to behave like real ones: resume sets .on, and
  // kidneyStatus() reads it back.
  const chips = { no: mk('no'), yes: mk('yes'), unsure: mk('unsure') };
  Object.entries(chips).forEach(([v, el]) => { el.dataset.val = v; });
  const $ = (sel) => {
    const m = /\[data-seg="kidney"\] \[data-val="(\w+)"\]/.exec(sel);
    if (m) return chips[m[1]] || null;
    if (sel === '[data-seg="kidney"] .on') return Object.values(chips).find(c => c.classList.contains('on')) || null;
    return get(sel);
  };
  const $all = (sel) => (sel === '[data-seg="kidney"] .chip' ? Object.values(chips) : []);

  const allowed = kidney === 'no'
    ? ['doctor', 'meal', 'starter', 'essentials', 'protocol']
    : ['doctor', 'starter'];
  const macros = { calories: 2663, fatG: 207, carbG: 33, tdee: 3329, deficitPct: 20 };
  if (kidney === 'no') macros.proteinG = 166;

  const fetchStub = (url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, method: opts.method || 'GET',
                 body: opts.body ? JSON.parse(opts.body) : null });
    if (u.endsWith('/resume')) {
      if (resumeFails) return Promise.resolve({ ok: false, json: () => Promise.resolve(null) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({
        session_token: 'kd_originalrow0123456789abcd', macros, goal: 'lose',
        kidney_status: kidney, allowed, suppressProtein: kidney !== 'no',
      }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  const factory = new Function(
    '$', '$all', 'fetch', 'money', 'track', 'scrollToEl', 'animateGauge', 'window',
    'history', 'freeResults', 'step2',
    SESSION_REGION +
    '\n var lastMacros=null;' +
    '\n function kidneyStatus(){ var b=$(\'[data-seg="kidney"] .on\'); return b?b.dataset.val:""; }' +
    '\n function proteinSuppressed(){ return kidneyStatus()!=="no"; }' +
    '\n' + PRODUCT_REGION_FOR_RESUME +
    '\n' + RESUME_REGION +
    '\n return { resumeFromEmail, updateSession, writesSettled, selected, productAvailable,' +
    ' kidneyStatus, getToken:function(){return sessionToken;},' +
    ' getReady:function(){return sessionReady;}, getMacros:function(){return lastMacros;} };'
  );
  // The reference arrives the way the real page supplies it: captured by the inline
  // <head> script and left in window.__kdResumeRef, with the URL ALREADY scrubbed.
  const REF = 'kdr_' + 'ab12cd34ef56'.repeat(2);
  const win = { location: { search: '?utm_campaign=free_results', pathname: '/' },
                __kdResumeRef: REF };
  const scrubbed = [];
  const hist = { replaceState: (a, b, u) => { scrubbed.push(u); } };
  const freeResults = mk('#freeResults');
  const step2 = mk('#step2');
  const api = factory($, $all, fetchStub, (n) => '$' + n.toFixed(2), () => {}, () => {},
                      () => {}, win, hist, freeResults, step2);
  return { api, calls, chips, freeResults, $, scrubbed, REF };
}

// ===========================================================================
// GROUP AH — A RESUMED SESSION IS A WRITABLE CONTINUATION OF THE ORIGINAL ROW.
// ---------------------------------------------------------------------------
// updateSession() returns early unless sessionReady is set. The first resume set
// only sessionToken, so every later profile save was a silent no-op: the customer
// filled in their conditions and medications, the page looked like it saved, and
// nothing reached the row the Doctor's Report is generated from.
// ===========================================================================
{
  const s = resumeSandbox({ kidney: 'no' });
  s.api.resumeFromEmail();
  // A crash is not a named failure. If the handler never reached the network — for
  // instance because it went back to reading the live URL, which the head script has
  // already scrubbed — say so here rather than dying on calls[0] below.
  const exchange = s.calls.find(c => c.url.endsWith('/resume'));
  check('AH', 'the resume exchange is actually attempted', !!exchange,
    'nothing was sent: the captured reference was not picked up');
  check('AH', 'the exchange is a POST, not a GET',
    !!exchange && exchange.method === 'POST',
    JSON.stringify(s.calls.map(c => `${c.method} ${c.url}`)));
  check('AH', 'the resume credential is what is sent, not a session token',
    !!exchange && /^kdr_/.test(exchange.body.resume_token),
    JSON.stringify(exchange && exchange.body));

  await new Promise(r => setTimeout(r, 0));
  await s.api.getReady();

  check('AH', 'the ORIGINAL row token is adopted',
    s.api.getToken() === 'kd_originalrow0123456789abcd', String(s.api.getToken()));
  check('AH', 'sessionReady is established, so writes are no longer discarded',
    !!s.api.getReady(), 'updateSession() would return early and save nothing');
  check('AH', 'the kidney chip is set from the server answer', s.chips.no.classList.contains('on'), '');

  // The real profile save.
  s.calls.length = 0;
  await s.api.updateSession({ conditions: ['diabetes-t2'], medications: 'metformin 500mg',
                              cooking_skill: 'beginner', budget: 'moderate', step_completed: 2 });
  const patch = s.calls.find(c => c.url.endsWith('/session') && c.method === 'PATCH');
  check('AH', 'the profile PATCH actually happens', !!patch,
    JSON.stringify(s.calls.map(c => `${c.method} ${c.url}`)));
  check('AH', 'it addresses the ORIGINAL session, not a new one',
    patch && patch.body.token === 'kd_originalrow0123456789abcd', JSON.stringify(patch && patch.body));
  check('AH', 'the conditions and medications are in the write',
    patch && patch.body.conditions[0] === 'diabetes-t2' &&
    patch.body.medications === 'metformin 500mg', JSON.stringify(patch && patch.body));
  check('AH', 'so are the preferences',
    patch && patch.body.cooking_skill === 'beginner' && patch.body.budget === 'moderate', '');
  check('AH', 'and the profile is marked complete', patch && patch.body.step_completed === 2, '');

  // Checkout must then be willing to proceed against that same row. Asserted on the
  // outcome, not by letting a rejection escape as an unhandled error: a crash is not
  // a named failure.
  let settled = false, settleErr = null;
  try { await s.api.writesSettled(); settled = true; } catch (e) { settleErr = e.message; }
  check('AH', 'writesSettled() resolves, so checkout proceeds on the resumed row',
    settled, String(settleErr));
  check('AH', 'exactly one session row was ever addressed',
    new Set(s.calls.filter(c => c.body && c.body.token).map(c => c.body.token)).size === 1,
    JSON.stringify(s.calls.map(c => c.body && c.body.token)));
  check('AH', 'no second session was created',
    !s.calls.some(c => c.url.endsWith('/session') && c.method === 'POST'),
    JSON.stringify(s.calls.map(c => `${c.method} ${c.url}`)));
}

// ===========================================================================
// GROUP AI — THE RESUMED OFFER STILL COMES FROM THE SERVER.
// ===========================================================================
for (const kidney of ['yes', 'unsure']) {
  const s = resumeSandbox({ kidney });
  s.api.resumeFromEmail();
  await new Promise(r => setTimeout(r, 0));
  await s.api.getReady();

  check('AI', `[${kidney}] the chip reflects the stored answer`,
    s.chips[kidney].classList.contains('on') && !s.chips.no.classList.contains('on'), '');
  check('AI', `[${kidney}] only the safe products are selected`,
    [...s.api.selected].sort().join(',') === 'doctor,starter', [...s.api.selected].join(','));
  check('AI', `[${kidney}] the meal plan is not purchasable on the resumed page`,
    s.api.productAvailable('meal') === false, '');
  check('AI', `[${kidney}] no protein target arrived to be rendered`,
    !('proteinG' in (s.api.getMacros() || {})), JSON.stringify(s.api.getMacros()));
}

// A failed exchange must leave checkout refusing rather than racing an unknown row.
{
  const s = resumeSandbox({ resumeFails: true });
  s.api.resumeFromEmail();
  await new Promise(r => setTimeout(r, 0));
  await s.api.getReady();
  check('AI', 'a failed exchange adopts no token', !s.api.getToken(), String(s.api.getToken()));
  let refused = false;
  try { await s.api.writesSettled(); } catch { refused = true; }
  check('AI', 'and checkout refuses rather than proceeding blind', refused, '');
}

// ===========================================================================
// GROUP AJ — RECOMPUTING AFTER A RESUME REWRITES THE SAME ROW.
// ---------------------------------------------------------------------------
// A resumed page holds the authoritative session. Pressing the results button again
// must PATCH that row, not POST a new one: a second row splits the intake, and the
// half the Doctor's Report gets built from is then whichever half checkout happened
// to reference. The branch itself is lifted out of the shipped file and executed.
// ===========================================================================
{
  const from = js.indexOf('      if(resumedSession&&sessionToken){');
  const marker = ".catch(function(e){console.warn('KD session create failed:',e);});";
  const to = js.indexOf(marker, from) + marker.length;
  // A crash is not a named failure. If the guard is gone, say which assertion
  // noticed rather than dying in new Function() with a syntax error.
  const located = from > -1 && to > from;
  check('AJ', 'the resumed-recompute guard is present in the shipped file', located,
    'if(resumedSession&&sessionToken) is missing, so a resumed recompute would open a second row');
  const BRANCH = located ? js.slice(from, to) + '\n      }' : 'return { posts: posts, patches: patches };';

  const runBranch = (resumed) => {
    const posts = [], patches = [];
    const d = { sex: 'female', age: 58, goal: 'lose', activity: 1.2, heightCm: 167.6,
                weightLbs: 190, weightKg: 86.2 };
    const fn = new Function(
      'resumedSession', 'sessionToken', 'updateSession', 'fetch', 'API_BASE', 'd',
      'lastMacros', 'kidneyStatus', 'emailField', 'utmData', 'document', 'window',
      'posts', 'patches',
      BRANCH + '\n return { posts: posts, patches: patches };'
    );
    return fn(
      resumed, resumed ? 'kd_originalrow0123456789abcd' : null,
      (payload) => { patches.push(payload); return Promise.resolve(); },
      (url, opts) => { posts.push({ url: String(url), body: JSON.parse(opts.body) });
                       return Promise.resolve({ json: () => Promise.resolve({ token: 'kd_brandnew' }) }); },
      'https://api.test', d,
      { calories: 2663, fatG: 207, proteinG: 166, carbG: 33, tdee: 3329 },
      () => 'no', { value: 'x@example.invalid' },
      { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null },
      { referrer: '' }, { innerWidth: 390 }, posts, patches);
  };

  const resumed = located ? runBranch(true) : { posts: [{ url: 'NOT RUN' }], patches: [] };
  check('AJ', 'a resumed recompute creates NO new session',
    resumed.posts.length === 0, JSON.stringify(resumed.posts.map(p => p.url)));
  check('AJ', 'it PATCHes instead', resumed.patches.length === 1, String(resumed.patches.length));
  check('AJ', 'and the PATCH carries the recomputed step-1 answers',
    !!resumed.patches[0] && resumed.patches[0].goal === 'lose' &&
    resumed.patches[0].age === 58 && resumed.patches[0].kidney_status === 'no' &&
    resumed.patches[0].macros.calories === 2663,
    JSON.stringify(resumed.patches[0]));

  const fresh = located ? runBranch(false) : { posts: [], patches: [] };
  check('AJ', 'a first-time visitor still creates a session',
    fresh.posts.length === 1 && fresh.posts[0].url.endsWith('/session'),
    JSON.stringify(fresh.posts.map(p => p.url)));
  check('AJ', 'and does not PATCH one that does not exist yet',
    fresh.patches.length === 0, String(fresh.patches.length));

  // The worker has to accept those step-1 fields, or the PATCH silently drops them.
  const workerSrc = fs.readFileSync(
    path.join(REPO, 'ketodial', 'worker', 'index.js'), 'utf8');
  for (const f of ['goal', 'age', 'sex', 'height_cm', 'weight_value', 'lifestyle_activity']) {
    check('AJ', `PATCH /session accepts ${f}, so the recompute is not silently dropped`,
      workerSrc.includes("setIfSent('" + f + "'"), '');
  }
  check('AJ', 'PATCH /session accepts the recomputed macros',
    /setIfSent\('calculated_macros', b\.macros\)/.test(workerSrc), '');
}

// ===========================================================================
// GROUP AK — THE RESUME CREDENTIAL IS STRIPPED BEFORE ANY THIRD-PARTY TAG RUNS.
// ---------------------------------------------------------------------------
// `kdr_...` is an EXCHANGEABLE credential, not a read-only one: it cannot PATCH a
// session, but whoever holds it can POST /resume and get the session token, which
// can. So it must not reach GA or Pinterest. Both initialize in <head>, and
// ketodial.js loads at the end of the body, so the strip has to happen in an inline
// script above them. This group pins that ORDER in the shipped document.
// ===========================================================================
{
  // Positions of the executable scripts, in document order.
  const at = (needle) => html.indexOf(needle);
  const capture = at('window.__kdResumeRef=ref');
  const scrub = html.indexOf('history.replaceState', capture);
  const gaTag = at('googletagmanager.com/gtag/js');
  // The executable call, not the comment above that explains why it matters.
  const gaConfig = at("gtag('config',");
  const pinterest = at("pintrk('load'");
  // The actual script element, not the several comments that name the file.
  const appJs = html.search(/<script[^>]*src="[^"]*ketodial\.js/);

  check('AK', 'the capture exists in the document head', capture > -1, '');
  check('AK', 'it scrubs the URL immediately after capturing', scrub > capture, `${capture}/${scrub}`);

  check('AK', 'the capture runs BEFORE the GA script tag', capture < gaTag,
    `capture at ${capture}, gtag.js at ${gaTag}`);
  check('AK', 'the scrub completes BEFORE gtag config sends page_location',
    scrub < gaConfig, `scrub at ${scrub}, gtag config at ${gaConfig}`);
  check('AK', 'the scrub completes BEFORE the Pinterest tag loads',
    scrub < pinterest, `scrub at ${scrub}, pintrk at ${pinterest}`);
  check('AK', 'and long before ketodial.js, which used to do this far too late',
    scrub < appJs, `scrub at ${scrub}, app at ${appJs}`);

  // The capture must be synchronous. An async or deferred script would let the tags
  // below it run first and the ordering above would prove nothing.
  const head = html.slice(0, gaTag);
  const captureTag = head.lastIndexOf('<script', capture);
  const openTag = head.slice(captureTag, head.indexOf('>', captureTag) + 1);
  check('AK', 'the capture script is synchronous and inline',
    !/\basync\b|\bdefer\b|\bsrc=/.test(openTag), openTag);
  check('AK', 'it is first-party inline code, not a third-party include',
    !/https?:\/\//.test(openTag), openTag);

  // Only `r` is removed; attribution survives.
  const captureBlock = html.slice(captureTag, html.indexOf('</script>', captureTag));
  // BOTH branches must delete it. An earlier version counted occurrences, so
  // dropping the delete from the branch that actually retains the credential still
  // passed on the strength of the malformed-value branch.
  check('AK', 'the branch that RETAINS the reference also removes it from the URL',
    /window\.__kdResumeRef=ref;\s*q\.delete\('r'\)/.test(captureBlock), captureBlock);
  check('AK', 'the malformed-value branch removes it too',
    /test\(ref\)\)\{\s*q\.delete\('r'\)/.test(captureBlock), captureBlock);
  check('AK', 'and no UTM parameter is deleted', !/delete\('utm_/.test(captureBlock), captureBlock);
  check('AK', 'the UTM parameters are preserved by rebuilding from the same object',
    /q\.toString\(\)/.test(captureBlock), captureBlock);
  check('AK', 'the reference is shape-checked before it is retained',
    /\^kdr_\[0-9a-f\]\{16,96\}\$/.test(captureBlock), captureBlock);

  // Nowhere durable.
  for (const sink of ['localStorage', 'sessionStorage', 'document.cookie']) {
    check('AK', `the capture never puts the credential in ${sink}`,
      !captureBlock.includes(sink), captureBlock);
  }

  // And the app consumes it from the ephemeral holder rather than the URL.
  const resume = js.slice(js.indexOf('function resumeFromEmail()'),
                          js.indexOf('resumeFromEmail();', js.indexOf('function resumeFromEmail()')));
  check('AK', 'resumeFromEmail reads the captured reference, not the live URL',
    /var ref=window\.__kdResumeRef/.test(resume) && !/urlParams\.get\('r'\)/.test(resume),
    resume.slice(0, 400));
  check('AK', 'and clears it, so it lives only for this navigation',
    /delete window\.__kdResumeRef|__kdResumeRef=undefined/.test(resume), resume.slice(0, 500));
}

// ===========================================================================
// GROUP AL — THE CODE DOES NOT CLAIM A GUARANTEE IT DOES NOT PROVIDE.
// ---------------------------------------------------------------------------
// Twice now a comment in this feature asserted something false: first that a URL
// fragment never reaches a server or analytics, then that the kdr_ credential is
// read-only. Both were wrong, and both survived review because a comment is not
// executable. This group makes the claim itself testable.
// ===========================================================================
{
  const sources = {
    'ketodial.js': js,
    'index.html': html,
    'worker/index.js': fs.readFileSync(path.join(REPO, 'ketodial', 'worker', 'index.js'), 'utf8'),
    'resume migration': fs.readFileSync(path.join(REPO, 'supabase', 'migrations',
      '20260909_kd_audit2b_resume_token.sql'), 'utf8'),
  };
  // Phrases that would be asserting the credential is harmless. Each is only a
  // problem when it is a CLAIM; the corrected comments say "NOT read-only" and
  // "Exchangeable, not read-only", so the negation has to be allowed through.
  const claims = [
    /(?<!NOT )(?<!not )\bis read-only\b/i,
    /\bcannot write to anything\b/i,
    /\bcannot write anything\b/i,
    /\bunable to confer\b/i,
    /\bharmless if seen\b/i,
    /fragment[^.]{0,80}never (?:sent to a server|reaches analytics)/i,
    /never (?:sent to a server|reaches analytics)[^.]{0,80}fragment/i,
  ];
  for (const [name, src] of Object.entries(sources)) {
    // A phrase inside double quotes is being REPORTED, not asserted: the corrected
    // comments quote the old false claim in order to say it was wrong. Blank those
    // spans out so the audit flags assertions rather than history.
    const asserted = src.replace(/"[^"\n]{0,200}"/g, '""');
    for (const re of claims) {
      const m = re.exec(asserted);
      check('AL', `${name} does not claim ${re.source.slice(0, 34)}`, !m,
        m ? asserted.slice(Math.max(0, m.index - 90), m.index + 90) : '');
    }
  }
  // And it states the accurate model somewhere the next reader will find it.
  check('AL', 'the exchangeable nature is written down',
    /exchange it for the authoritative session/i.test(sources['worker/index.js']) &&
    /possession lets the holder POST \/resume and\s*\* exchange it/i.test(js) === false
      ? /exchange it for the authoritative session credential/i.test(js) ||
        /POST \/resume and\s+\*\s+exchange it/i.test(js)
      : true,
    'no source explains that the credential is exchangeable for write access');
  check('AL', 'the residual is recorded rather than argued away',
    /click-tracking logs|click tracking logs/i.test(js) &&
    /30-day/i.test(js), 'the 30-day reusable window is not acknowledged');
}

// ---------------------------------------------------------------------------
if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED\n`);
  for (const f of failures) {
    console.log(`  [${f.group}] ${f.name}`);
    if (f.detail) console.log(`      ${String(f.detail).slice(0, 300)}`);
  }
  console.log('');
  process.exit(1);
}
const groups = {
  U: 'one medical rule, not two',
  V: 'kidney no: the Full Protocol, immediately',
  W: 'kidney yes/unsure: Doctor + Starter, no tease',
  X: '"I\'m not sure" is not a diagnosis',
  Y: 'no hidden path back to a blocked product',
  Z: 'the hierarchy, by sibling order',
  AA: 'the "half finished" framing is gone',
  AB: 'checkout is one path, and needs no profile',
  AC: 'the new funnel is measurable, without PII',
  AD: 'the featured CTA survives a checkout the customer closes',
  AE: 'every failure path gives the originating button back',
  AF: 'no promise of delivery the pay-first path cannot keep',
  AG: 'the email resume link cannot widen what is on offer',
  AH: 'a resumed session is a writable continuation of the original row',
  AI: 'the resumed offer still comes from the server',
  AJ: 'recomputing after a resume rewrites the same row',
  AK: 'the resume credential is stripped before any third-party tag runs',
  AL: 'the code does not claim a guarantee it does not provide',
};
for (const [k, v] of Object.entries(groups)) console.log(`PASS  ${k}  ${v}`);
console.log(`\n${checks} assertions passed.`);

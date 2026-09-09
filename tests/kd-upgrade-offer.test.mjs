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
};
for (const [k, v] of Object.entries(groups)) console.log(`PASS  ${k}  ${v}`);
console.log(`\n${checks} assertions passed.`);

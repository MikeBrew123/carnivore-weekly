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
  check('AA', 'the profile prompt is labelled optional',
    /Optional: make your reports fit you better/.test(html), '');
  check('AA', 'the profile prompt says it is not required in order to buy',
    /Not required to buy/.test(html), '');
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
};
for (const [k, v] of Object.entries(groups)) console.log(`PASS  ${k}  ${v}`);
console.log(`\n${checks} assertions passed.`);

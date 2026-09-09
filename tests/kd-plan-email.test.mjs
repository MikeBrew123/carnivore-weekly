/**
 * KetoDial: the free-results email, as actually delivered.
 *
 * These are RENDERED-OUTPUT tests. Nothing here greps the worker source. Each case
 * drives the real POST /email-plan through the worker's own fetch handler with
 * Supabase and Resend stubbed, and asserts on the exact payload that would have gone
 * to Resend: the subject line, the reply_to, the tags and the HTML body.
 *
 * WHAT THE PASS FIXED. The delivered email spent the reader's highest-intent moment
 * on four screens of free education and an outbound link to the recipe index, and
 * only then mentioned that we sell anything. Its buy button pointed at
 * ketodial.com/#calc, i.e. back at an empty form, so a customer who had already given
 * us their stats and decided to buy was asked to do the calculator again to find the
 * checkout. It also called the personalization profile "the optional Step 3 details"
 * and, for a renal reader, named the meal plan in order to explain the refusal.
 *
 * WHAT MUST NOT REGRESS. The renal suppression already shipped: no protein figure in
 * the subject or the body, no protein instruction, no meal plan, no Full Protocol, no
 * bundle containing the meal plan, and "I'm not sure" never rendered as a diagnosis.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_JS = path.join(REPO, 'ketodial', 'worker', 'index.js');

let checks = 0;
const failures = [];
function check(group, name, ok, detail) {
  checks++;
  if (!ok) failures.push({ group, name, detail: detail || '' });
}

const worker = (await import('file://' + WORKER_JS + '?planEmail=' + Date.now())).default;

const MACROS = { calories: 2663, fatG: 207, proteinG: 166, carbG: 33, tdee: 3329, deficitPct: 20 };
const TOKEN = 'kd_planemailtest0123456789abc';

/**
 * Send one free-results email and hand back exactly what Resend would have received.
 * The stub returns a real-shaped session row so the worker reads its macros and the
 * kidney answer from "the database" rather than from the request body, which is the
 * behaviour the renal gate depends on.
 */
async function deliver({ kidney, goal = 'lose', age = 58, activity = 1.2, token = TOKEN,
                         rowMissing = false } = {}) {
  const realFetch = globalThis.fetch;
  let sent = null;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.resend.com')) {
      sent = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ id: 'stub' }) };
    }
    if (u.includes('calculator_sessions_v2')) {
      if ((opts.method || 'GET') !== 'GET') return { ok: true, json: async () => [] };
      if (rowMissing) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => [{
        session_token: token, kidney_status: kidney, goal,
        calculated_macros: MACROS,
      }] };
    }
    if (u.includes('/rpc/')) return { ok: true, json: async () => ({}) };
    throw new Error('unexpected call to ' + u);
  };
  try {
    await worker.fetch(new Request('https://kd.test/email-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'plan@example.invalid', token, goal, age, activity,
                             macros: MACROS }),
    }), { SUPABASE_URL: 'https://stub.invalid', SUPABASE_SERVICE_ROLE_KEY: 'stub',
          RESEND_API_KEY: 'stub' });
  } finally { globalThis.fetch = realFetch; }
  if (!sent) return null;
  const html = sent.html || '';
  return {
    sent, html,
    subject: sent.subject || '',
    // Visible copy only, with tags and attribute values removed, so an assertion
    // cannot be satisfied by a colour code or a URL.
    text: html.replace(/<[^>]+>/g, ' ').replace(/&#10003;/g, '')
              .replace(/&rsquo;/g, "'").replace(/&middot;/g, '·')
              .replace(/\s+/g, ' ').trim(),
    at: (needle) => html.indexOf(needle),
    hrefs: [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]),
  };
}

// ===========================================================================
// GROUP EA — THE NORMAL EMAIL PUTS THE OFFER WHERE THE INTENT IS.
// ===========================================================================
{
  const e = await deliver({ kidney: 'no' });
  check('EA', 'the email was sent at all', !!e, 'nothing reached Resend');

  check('EA', 'the subject keeps calories, protein and net carbs',
    e.subject === 'Your keto plan: 2,663 kcal · 166g protein · 33g net carbs', e.subject);

  // 1. The thing they asked for.
  for (const [label, value] of [['Daily calories', '2,663 kcal'], ['Fat', '207 g'],
                                ['Protein', '166 g'], ['Net carbs', '33 g'],
                                ['Your TDEE (maintenance)', '3,329 kcal']]) {
    check('EA', `the ${label} row is present with its real figure`,
      e.text.includes(label) && e.text.includes(value), e.text.slice(0, 400));
  }

  // 2 + 3. One explanation, then the offer — measured by position in the document,
  // not by presence.
  const offerAt = e.at('Want us to turn these numbers into your actual plan?');
  const recipeAt = e.at('Browse keto recipes');
  const guidanceAt = e.at('Hit the protein number first');
  const macrosAt = e.at('Daily calories');
  check('EA', 'the offer exists', offerAt > -1, '');
  check('EA', 'the offer comes AFTER the numbers', offerAt > macrosAt, `${offerAt} vs ${macrosAt}`);
  check('EA', 'the offer comes BEFORE the recipe link', offerAt < recipeAt,
    `offer at ${offerAt}, recipes at ${recipeAt}`);
  check('EA', 'the offer comes BEFORE the how-to-use education', offerAt < guidanceAt,
    `offer at ${offerAt}, guidance at ${guidanceAt}`);
  check('EA', 'only ONE explanation paragraph precedes the offer',
    e.at('past 50 the body needs more protein') > offerAt,
    'the age paragraph is still above the sale');

  // The concrete value, in customer language.
  check('EA', 'the price is $10.99', /\$10\.99/.test(e.text), '');
  check('EA', 'the CTA says what it does and what it costs',
    e.text.includes('Get my Full Protocol for $10.99'), e.text.slice(offerAt, offerAt + 400));
  check('EA', 'it explains free versus paid in customer language',
    /Your macros tell you the targets/.test(e.text) &&
    /what to eat, what to buy/.test(e.text), '');
  for (const item of ['7-Day Meal Plan', 'grocery list', 'Keto Starter Kit', "Doctor's Report"]) {
    check('EA', `the offer names the ${item}`, e.text.includes(item), '');
  }
  check('EA', 'the saving is the real arithmetic', /\$15\.97/.test(e.text) && /\$4\.98/.test(e.text), '');
  check('EA', 'the lower-emphasis option is present',
    /Single reports start at \$3\.99/.test(e.text), '');
  check('EA', 'no fake urgency',
    !/hurry|expires|limited time|act now|only \d+ left|24 hours/i.test(e.text), e.text);
}

// ===========================================================================
// GROUP EB — TRUTHFUL FULFILMENT, AND NO INTERNAL STEP NUMBERS.
// ===========================================================================
for (const kidney of ['no', 'yes', 'unsure']) {
  const e = await deliver({ kidney });
  check('EB', `[${kidney}] the reassurance line states when delivery happens`,
    e.text.includes('One-time purchase · Delivered after personalization · No subscription'),
    e.text.slice(0, 200));
  for (const [re, label] of [[/instant/i, 'instant'], [/straight away/i, 'straight away'],
                             [/immediately|immediate delivery/i, 'immediate'],
                             [/in seconds|within seconds|within minutes/i, 'in seconds']]) {
    check('EB', `[${kidney}] the email never promises "${label}" delivery`, !re.test(e.text),
      e.text.slice(0, 300));
  }
  check('EB', `[${kidney}] it says what we need before building the reports`,
    /Before we build your personalized reports, we'll need a few details/.test(e.text), '');
  check('EB', `[${kidney}] no numbered funnel step is shown to the customer`,
    !/Step \d/i.test(e.text), e.text);
  check('EB', `[${kidney}] the profile is not called simply optional`,
    !/optional Step|the optional details/i.test(e.text), e.text);
}

// ===========================================================================
// GROUP EC — THE BUY BUTTON RESUMES THE SESSION.
// ===========================================================================
{
  const e = await deliver({ kidney: 'no' });
  const cta = e.hrefs.find(h => h.includes('protocol_cta'));
  check('EC', 'the primary CTA has its own link', !!cta, e.hrefs.join('\n'));
  check('EC', 'the CTA resumes the saved session rather than restarting the calculator',
    cta.includes('#resume=' + TOKEN) && !cta.includes('#calc'), cta);
  check('EC', 'the token travels in the FRAGMENT, never the query string',
    cta.split('#')[0].indexOf(TOKEN) === -1, cta);

  // Nothing about the person may ride in the URL.
  for (const h of e.hrefs) {
    const q = h.split('#')[0];
    check('EC', `no health or intake data in ${q.slice(0, 60)}`,
      !/kidney|condition|medication|protein|calor|weight|height|age=|email=/i.test(q) ||
      /unsubscribe/i.test(q), q);
  }

  // Every buy link resumes; the recipe link does not need the token and must not
  // carry it.
  const recipes = e.hrefs.find(h => h.includes('/recipes/'));
  check('EC', 'the recipe link goes to the recipe index', !!recipes && recipes.includes('/recipes/'),
    String(recipes));
  check('EC', 'the recipe link carries no session token', !recipes.includes(TOKEN), recipes);

  // With no token there is nothing to resume, and the link degrades honestly.
  const noTok = await deliver({ kidney: 'no', token: '', rowMissing: true });
  const fallback = noTok.hrefs.find(h => h.includes('protocol_cta') || h.includes('doctor_starter_cta'));
  check('EC', 'with no session to resume the CTA falls back to the calculator',
    !fallback || fallback.includes('#calc'), String(fallback));
}

// ===========================================================================
// GROUP ED — RENAL YES AND UNSURE: SAME POSITION, SAFE OFFER.
// ===========================================================================
for (const kidney of ['yes', 'unsure']) {
  const e = await deliver({ kidney });

  check('ED', `[${kidney}] no protein figure in the subject`,
    e.subject === 'Your keto plan: 2,663 kcal · 33g net carbs' && !/166/.test(e.subject),
    e.subject);
  check('ED', `[${kidney}] no protein target in the body`, !/\b166\s*g\b/.test(e.text), e.text);
  check('ED', `[${kidney}] the protein row routes to a clinician`,
    /Ask your doctor or renal dietitian/.test(e.text), '');
  check('ED', `[${kidney}] no "hit protein first" instruction`,
    !/Hit the protein number first/i.test(e.text), '');
  check('ED', `[${kidney}] no high-protein age explanation`,
    !/past 50 the body needs more protein/i.test(e.text), '');

  check('ED', `[${kidney}] the Meal Plan is not offered`, !/Meal Plan/i.test(e.text), e.text);
  check('ED', `[${kidney}] the Full Protocol is not offered`, !/Full Protocol/i.test(e.text), e.text);
  check('ED', `[${kidney}] no bundle price appears`, !/\$10\.99|\$7\.99|\$15\.97/.test(e.text), e.text);

  check('ED', `[${kidney}] the safe offer is Doctor + Starter at $9.98`,
    /\$9\.98/.test(e.text) && /Keto Starter Kit/.test(e.text) && /Doctor's Report/.test(e.text),
    e.text);
  check('ED', `[${kidney}] the CTA is the two-report one`,
    /Get both reports for \$9\.98/.test(e.text), '');

  // Same high-conversion position as the normal offer.
  const offerAt = e.at('Get the reports we can personalize safely');
  check('ED', `[${kidney}] the offer sits above the education and the recipe link`,
    offerAt > -1 && offerAt < e.at('Browse keto recipes') &&
    offerAt < e.at('Use fat to stay full'), `offer at ${offerAt}`);

  const cta = e.hrefs.find(h => h.includes('doctor_starter_cta'));
  check('ED', `[${kidney}] the CTA resumes the session`, !!cta && cta.includes('#resume=' + TOKEN),
    String(cta));
  check('ED', `[${kidney}] no link asks for the protocol`,
    !e.hrefs.some(h => /protocol_cta/.test(h)), e.hrefs.join('\n'));
}

// ===========================================================================
// GROUP EE — "I'M NOT SURE" IS NOT A DIAGNOSIS.
// ===========================================================================
{
  const e = await deliver({ kidney: 'unsure' });
  for (const bad of ['kidney disease', 'diagnosed', 'CKD', 'dialysis', 'renal failure',
                     'chronic kidney']) {
    check('EE', `the unsure email never says "${bad}"`,
      !new RegExp(bad, 'i').test(e.text), e.text);
  }
  check('EE', 'it refers only to kidney function, neutrally',
    /kidney function/i.test(e.text), e.text);

  // And it is gated exactly as hard as an explicit yes.
  const yes = await deliver({ kidney: 'yes' });
  check('EE', 'unsure gets the same subject as yes', e.subject === yes.subject, e.subject);
  check('EE', 'unsure gets the same offer as yes',
    /\$9\.98/.test(e.text) && !/\$10\.99/.test(e.text), '');
}

// ===========================================================================
// GROUP EF — SENDER, REPLY-TO AND TAGS.
// ===========================================================================
{
  const e = await deliver({ kidney: 'no' });
  check('EF', 'replies go to the KetoDial catch-all',
    e.sent.reply_to === 'ketodial@carnivoreweekly.com', String(e.sent.reply_to));
  check('EF', 'replies never go to a personal inbox',
    !/gmail\.com/i.test(JSON.stringify(e.sent.reply_to || '')), String(e.sent.reply_to));
  check('EF', 'the from address is the KetoDial sender',
    e.sent.from === 'KetoDial <ketodial@carnivoreweekly.com>', String(e.sent.from));

  const tag = (n) => (e.sent.tags || []).find(t => t.name === n);
  check('EF', 'the send is tagged as a plan email for kd',
    tag('email_type')?.value === 'plan' && tag('site')?.value === 'kd', JSON.stringify(e.sent.tags));
  check('EF', 'the send records which OFFER it carried',
    tag('offer')?.value === 'protocol', JSON.stringify(e.sent.tags));

  const renal = await deliver({ kidney: 'yes' });
  const rtag = (renal.sent.tags || []).find(t => t.name === 'offer');
  check('EF', 'the renal send is separable in reporting',
    rtag?.value === 'doctor_starter', JSON.stringify(renal.sent.tags));
  // The tag names a product, not a health answer, and no kidney value leaves.
  check('EF', 'no tag carries the kidney answer itself',
    !JSON.stringify(renal.sent.tags).match(/kidney|unsure|renal/i), JSON.stringify(renal.sent.tags));

  // Analytics on the links: campaign identifies the send, content the thing clicked.
  const contents = e.hrefs.map(h => (/utm_content=([a-z_]+)/.exec(h) || [])[1]).filter(Boolean);
  check('EF', 'every link is attributed to the free-results campaign',
    e.hrefs.every(h => /unsubscribe/.test(h) || /utm_campaign=free_results/.test(h)),
    e.hrefs.join('\n'));
  check('EF', 'the protocol CTA, single reports and recipes are separable',
    ['protocol_cta', 'single_reports', 'recipes'].every(c => contents.includes(c)),
    contents.join(','));
  check('EF', 'no utm parameter names the kidney answer',
    !e.hrefs.some(h => /utm_[a-z]+=[^&#]*(kidney|renal|unsure|ckd)/i.test(h)), e.hrefs.join('\n'));
}

// ===========================================================================
// GROUP EG — THE RESUME ENDPOINT IS A PROJECTION, NOT AN ENTITLEMENT.
// ===========================================================================
{
  const call = async (token, row) => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes('calculator_sessions_v2')) {
        return { ok: true, json: async () => (row ? [row] : []) };
      }
      throw new Error('unexpected ' + url);
    };
    try {
      const res = await worker.fetch(new Request('https://kd.test/resume/' + token),
        { SUPABASE_URL: 'https://stub.invalid', SUPABASE_SERVICE_ROLE_KEY: 'stub' });
      return { status: res.status, body: await res.json() };
    } finally { globalThis.fetch = realFetch; }
  };
  const ROW = (kidney) => ({
    session_token: TOKEN, kidney_status: kidney, goal: 'lose', calculated_macros: MACROS,
    email: 'someone@example.invalid', name: 'Real Person',
    conditions: ['diabetes-t2'], medications: 'metformin 500mg',
    payment_status: 'completed', stripe_payment_intent_id: 'pi_secret',
  });

  const no = await call(TOKEN, ROW('no'));
  check('EG', 'a valid token returns the projection', no.status === 200, String(no.status));
  check('EG', 'it returns the macros already printed in the email',
    no.body.macros.calories === 2663 && no.body.macros.proteinG === 166, JSON.stringify(no.body.macros));

  // The bounded part: nothing about the person beyond what the email already held.
  const serialized = JSON.stringify(no.body);
  for (const leak of ['someone@example.invalid', 'Real Person', 'diabetes-t2', 'metformin',
                      'pi_secret', 'completed']) {
    check('EG', `the projection does not leak ${leak}`, !serialized.includes(leak), serialized);
  }

  check('EG', 'the server states which products are allowed',
    no.body.allowed.includes('protocol') && no.body.allowed.includes('meal'),
    JSON.stringify(no.body.allowed));

  for (const k of ['yes', 'unsure']) {
    const r = await call(TOKEN, ROW(k));
    check('EG', `[${k}] the server withholds the protein-anchored products`,
      !r.body.allowed.includes('meal') && !r.body.allowed.includes('protocol') &&
      !r.body.allowed.includes('essentials'), JSON.stringify(r.body.allowed));
    check('EG', `[${k}] Doctor and Starter remain allowed`,
      r.body.allowed.includes('doctor') && r.body.allowed.includes('starter'),
      JSON.stringify(r.body.allowed));
    check('EG', `[${k}] the projection says protein is suppressed`,
      r.body.suppressProtein === true, JSON.stringify(r.body));
  }

  // Absence is not a negative answer.
  const unanswered = await call(TOKEN, ROW(null));
  check('EG', 'an unanswered kidney question fails closed',
    unanswered.body.kidney_status === null && unanswered.body.suppressProtein === true &&
    !unanswered.body.allowed.includes('meal'), JSON.stringify(unanswered.body));

  const missing = await call('kd_nosuchtoken000000', null);
  check('EG', 'an unknown token is a plain 404', missing.status === 404, String(missing.status));
  const short = await call('x', null);
  check('EG', 'a malformed reference is rejected before any lookup', short.status === 400,
    String(short.status));
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
  EA: 'the normal email puts the offer where the intent is',
  EB: 'truthful fulfilment, and no internal step numbers',
  EC: 'the buy button resumes the session',
  ED: 'renal yes and unsure: same position, safe offer',
  EE: '"I\'m not sure" is not a diagnosis',
  EF: 'sender, reply-to and tags',
  EG: 'the resume endpoint is a projection, not an entitlement',
};
for (const [k, v] of Object.entries(groups)) console.log(`PASS  ${k}  ${v}`);
console.log(`\n${checks} assertions passed.`);

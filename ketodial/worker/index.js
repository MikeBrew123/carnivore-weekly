/**
 * KetoDial API Worker
 *
 * Handles:
 *   POST /checkout     — Create Stripe Checkout Session
 *   POST /webhook      — Stripe webhook → generate reports → email customer
 *   GET  /report/:id   — Serve generated report
 *
 * SOURCE OF TRUTH (changed 2026-09-08)
 * -----------------------------------
 * The customer's questionnaire lives in `calculator_sessions_v2`, keyed by
 * `session_token`. Stripe metadata carries ONLY that token — a 32-character
 * reference, never the serialized form.
 *
 * It used to carry the form itself, as
 * `metadata[form_data] = JSON.stringify(formData).slice(0, 490)`, because Stripe
 * caps a metadata value at 500 characters. The KetoDial form's fixed fields take
 * 307 of those, so a customer with four medications and a sentence in the
 * free-text box overflowed, the truncated JSON failed to parse,
 * `safeParseJSON(...) || {}` handed the generators an empty object, and the
 * generators filled the gap with constants — printing BMI 26.0 on a Doctor's
 * Report for a customer whose BMI was 32.3. Payload length tracks medical
 * complexity, so the loss concentrated on exactly the customers the safety gate
 * exists to protect.
 *
 *   validated intake -> calculator_sessions_v2 (authoritative)
 *                    -> Stripe metadata[session_token] (bounded reference)
 *                    -> loadAuthoritativeIntake() + validateIntake() at report time
 *                    -> deriveKdMedicalContext()
 *                    -> generators
 *
 * Nothing on that path invents a customer fact. If the intake is missing,
 * incomplete, implausible or unreferenced, report generation FAILS CLOSED and the
 * customer is routed to a human.
 *
 * Env vars (wrangler secrets):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
 */

import {
  generateDoctorReport,
  generateMealPlan,
  generateStarterKit,
} from './reports.js';
import { IntakeError, loadAuthoritativeIntake, loadIntakeForPurchase, toStoredVocabulary } from './intake.js';
import { deriveKdMedicalContext, allowedProducts } from './reports.js';

const PRICE_MAP_LIVE = {
  doctor: 'price_1TcvcxEVDfkpGz8w3XZgaWjN',
  meal: 'price_1TcvcyEVDfkpGz8wIVkjBfBA',
  starter: 'price_1TcvczEVDfkpGz8wNMsXPD4d',
  essentials: 'price_1Tcvd0EVDfkpGz8wft66SJ6g',
  protocol: 'price_1Tcvd0EVDfkpGz8wCtiZSJT6',
};

/**
 * Price IDs, overridable per environment.
 *
 * The live IDs above are the default, so production behaviour is unchanged when
 * PRICE_MAP_JSON is unset — which it is in production. The override exists so an
 * integration test can drive the REAL handleCheckout against Stripe TEST mode
 * instead of asserting against a stub: live price IDs do not resolve in test mode,
 * and a checkout test that never reaches Stripe proves nothing about the metadata
 * shape, which is the thing this product got wrong.
 */
function priceMap(env) {
  if (env && env.PRICE_MAP_JSON) {
    try { return JSON.parse(env.PRICE_MAP_JSON); } catch { /* fall through to live */ }
  }
  return PRICE_MAP_LIVE;
}

// Bundle → individual items mapping
const BUNDLE_EXPAND = {
  essentials: ['meal', 'starter'],
  protocol: ['doctor', 'meal', 'starter'],
};

// ---------------------------------------------------------------------------
// ENVIRONMENT SURFACES
// ---------------------------------------------------------------------------
// Three strings were hardcoded to production: the Stripe return URL, and the report
// link base in two places. That is fine for production and fatal for a genuine
// TEST-mode end-to-end — after paying in test mode the browser would be redirected
// to the live site, and the report links in the email would point at the live
// worker, so the "test" would finish by exercising production surfaces with test
// data.
//
// EACH DEFAULTS EXACTLY TO THE STRING IT REPLACED. With neither variable set the
// worker behaves byte-for-byte as before; tests/kd-intake-authority.test.mjs pins
// those defaults so an override cannot quietly become the production value.
//
// This is the only change made solely to enable the test, and it changes no
// behaviour when unset.

/** The site the customer is sent back to. Defaults to production. */
function appBaseUrl(env) {
  return (env && env.RETURN_URL_BASE) || 'https://ketodial.com';
}

/** Where Stripe returns the customer after checkout. */
function returnUrl(env) {
  return `${appBaseUrl(env)}/?success=true&session_id={CHECKOUT_SESSION_ID}`;
}

/** The origin report links are built against. */
function reportBaseUrl(env) {
  return (env && env.REPORT_BASE_URL) || 'https://ketodial-api.iambrew.workers.dev';
}

/** The only three answers the early kidney-safety question can produce. */
const KIDNEY_ANSWERS = new Set(['no', 'yes', 'unsure']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/checkout' && request.method === 'POST') {
      return handleCheckout(request, env);
    }
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    if (url.pathname === '/session' && request.method === 'POST') {
      return handleSession(request, env);
    }
    if (url.pathname === '/session' && request.method === 'PATCH') {
      return handleSessionUpdate(request, env);
    }
    // POST-PAYMENT FULFILMENT. A customer may pay after step 1 and finish the
    // optional profile afterwards; these two resolve a paid Stripe session back to
    // its authoritative row so that is possible without the browser having to carry
    // a session token across the Stripe redirect (it cannot — the page reloads).
    if (url.pathname.startsWith('/resume/') && request.method === 'GET') {
      return handleResume(decodeURIComponent(url.pathname.split('/resume/')[1] || ''), env);
    }
    if (url.pathname.startsWith('/purchase/') && request.method === 'GET') {
      return handlePurchaseStatus(url.pathname.split('/purchase/')[1], env);
    }
    if (url.pathname === '/fulfill' && request.method === 'POST') {
      return handleFulfill(request, env);
    }
    if (url.pathname === '/email-plan' && request.method === 'POST') {
      return handleEmailPlan(request, env);
    }
    if (url.pathname.startsWith('/report/') && request.method === 'GET') {
      const sessionId = url.pathname.split('/report/')[1];
      const reportType = url.searchParams.get('type') || 'all';
      return handleReport(sessionId, reportType, env);
    }

    return jsonResponse(404, { error: 'Not found' });
  },
};

// ──────────────────────────────────────────────
// SESSION — save calculator data to Supabase
// ──────────────────────────────────────────────
async function handleSession(request, env) {
  try {
    const b = await request.json();
    const token = 'kd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 29);
    const row = {
      source: 'ketodial',
      session_token: token,
      sex: b.sex || null,
      age: b.age || null,
      goal: b.goal || null,
      // Printed on the Doctor's Report as "Activity". It was computed client-side to
      // derive TDEE and then never persisted, so the report could only have shown a
      // value it invented. Store it or do not print it.
      lifestyle_activity: b.lifestyle_activity || null,
      // The early renal gate, answered before the free protein result is shown.
      // Not `|| null` on a falsy check by accident: 'no' is a real answer and the
      // only one that unlocks a personalized protein target.
      kidney_status: KIDNEY_ANSWERS.has(b.kidney_status) ? b.kidney_status : null,
      height_cm: b.height_cm || null,
      weight_value: b.weight_value || null,
      weight_unit: b.weight_unit || 'lbs',
      diet_type: 'keto',
      step_completed: 1,
      email: b.email || null,
      calculated_macros: b.macros || null,
      referrer: b.referrer || null,
      device_type: b.device_type || null,
      landing_page: '/',
      utm_source: b.utm_source || null,
      utm_medium: b.utm_medium || null,
      utm_campaign: b.utm_campaign || null,
      utm_content: b.utm_content || null,
      utm_term: b.utm_term || null,
    };
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.text();
      return jsonResponse(500, { error: err });
    }
    if (b.email && b.newsletter_opt_in) {
      const cleanEmail = b.email.trim().toLowerCase();
      try {
        const nlRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/upsert_newsletter_subscriber`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            p_email: cleanEmail,
            p_site: 'kd',
            p_signup_source: 'calculator',
            p_utm_source: b.utm_source || null,
            p_utm_medium: b.utm_medium || null,
            p_utm_campaign: b.utm_campaign || null,
          }),
        });
        if (!nlRes.ok) console.log('newsletter upsert failed:', await nlRes.text());
      } catch (e) { console.log('newsletter upsert error:', e.message); }

      // No welcome email here anymore (Brew, 2026-08-30). The plan email
      // auto-sends seconds after this call, so the standalone welcome meant two
      // emails in the same minute — and drip day-1 made three inside 24h. The
      // welcome content (newsletter confirmation + unsubscribe link) now rides
      // inside the plan email; drip day-1 waits 48h via send_drip.py.
    }
    return jsonResponse(200, { ok: true, token });
  } catch (e) {
    return jsonResponse(500, { error: e.message });
  }
}

// ──────────────────────────────────────────────
// SESSION UPDATE — track step progression
// ──────────────────────────────────────────────
async function handleSessionUpdate(request, env) {
  try {
    const b = await request.json();

    // TWO WAYS TO NAME THE SAME ROW.
    // Before payment the browser holds the session token. AFTER payment it does not
    // and cannot: Stripe redirects back to a freshly loaded page where
    // `sessionToken` starts null, and nothing persists it. The only handle the
    // customer carries through that redirect is the Stripe session id in the return
    // URL — so the server resolves it, rather than the browser trying to.
    //
    // The token is deliberately NOT handed back to the browser. Holding the Stripe
    // session id already grants report access; it does not need to grant more.
    let token = b.token;
    if (!token && b.stripe_session_id) {
      const resolved = await resolvePaidCheckout(b.stripe_session_id, env);
      if (resolved.error) return jsonResponse(resolved.status, { error: resolved.error });
      token = resolved.token;
    }
    if (!token) return jsonResponse(400, { error: 'Missing token' });
    b.token = token;

    // "ANSWERED NOTHING" IS NOT "NEVER ASKED".
    // These were all `if (b.medications)` until 2026-09-08. An empty string and an
    // empty array are falsy, so a customer who ticked no conditions and takes no
    // medications had those answers silently dropped and the columns stayed NULL —
    // indistinguishable, later, from a row whose medical intake was lost. Live rows
    // confirm it: conditions [] stored, medications/symptoms/budget all NULL.
    // intake.js treats a NULL medical column as LOST and refuses to generate, so a
    // falsy guard here is a refused report for a customer whose data was fine.
    // Presence, not truthiness.
    const updates = {};
    const setIfSent = (key, value) => { if (value !== undefined) updates[key] = value; };

    setIfSent('step_completed', b.step_completed);
    setIfSent('email', b.email);
    setIfSent('first_name', b.first_name);
    setIfSent('payment_status', b.payment_status);
    setIfSent('conditions', b.conditions);
    setIfSent('symptoms', b.symptoms);
    setIfSent('medications', b.medications);
    // TRANSLATED, NOT PASSED THROUGH. These five columns carry CHECK constraints
    // written for Carnivore Weekly's vocabulary, and KetoDial's selects submit their
    // option TEXT. Every KD value violates one, so this PATCH has been returning 500
    // in production and taking conditions, medications, symptoms and
    // step_completed=2 down with it. See THE VOCABULARY BRIDGE in intake.js.
    // An unmappable preference is OMITTED, never allowed to fail the whole write:
    // losing a preference costs personalization, losing the write costs the
    // customer's medications.
    setIfSent('cooking_skill', toStoredVocabulary('cooking_skill', b.cooking_skill));
    setIfSent('meal_prep_time', toStoredVocabulary('meal_prep_time', b.meal_prep_time));
    setIfSent('budget', toStoredVocabulary('budget', b.budget));
    setIfSent('family_situation', toStoredVocabulary('family_situation', b.family_situation));
    setIfSent('biggest_challenge', b.biggest_challenge);
    setIfSent('previous_diets', b.previous_diets);
    setIfSent('dairy_tolerance', toStoredVocabulary('dairy_tolerance', b.dairy_tolerance));
    setIfSent('lifestyle_activity', b.lifestyle_activity);
    // A customer may go back and change this. Only the three real answers are
    // accepted; anything else leaves the stored value alone rather than clearing it.
    if (KIDNEY_ANSWERS.has(b.kidney_status)) updates.kidney_status = b.kidney_status;
    updates.updated_at = new Date().toISOString();

    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${b.token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(updates),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      // Loud on purpose. This write silently 500ed in production for months because
      // the only caller swallows failures; the log line is what makes it findable.
      console.error(`Session update REJECTED for ${b.token}: ${err}`);
      return jsonResponse(500, { error: err });
    }
    return jsonResponse(200, { ok: true });
  } catch (e) {
    return jsonResponse(500, { error: e.message });
  }
}

// ──────────────────────────────────────────────
// EMAIL PLAN — send free macro results by email
// ──────────────────────────────────────────────
function buildPlanEmail(m, goal, p) {
  // p: optional personalization {age, sex, activity, newsletterOptIn, unsubUrl,
  // suppressProtein, token}.
  // Every line is derived only from inputs the user actually gave us — the
  // "you told us X, so Y" framing is the point (Brew, 2026-08-30): make
  // answering questions feel worthwhile without asking any new ones for free.
  //
  // THE RENAL GATE REACHES THIS EMAIL TOO.
  // The page suppresses the protein figure for a reader who answered Yes or "I'm
  // not sure" to the kidney question — and then the calculator auto-sent this email
  // seconds later carrying the number in the subject line, a Protein row, "hit the
  // protein number first", copy explaining why we set their protein high, and an
  // upsell to the meal plan we had just refused to sell them.
  //
  // ORDER MATTERS AS MUCH AS CONTENT (2026-09-08).
  // The reader has finished the calculator, asked for this email and opened it. That
  // is the highest-intent moment we get. The email used to spend it on four screens
  // of free education and an outbound link to the recipe index, and only then
  // mention that we sell anything. The offer now sits directly under the numbers,
  // with one line of explanation; the education and the recipe link keep every word
  // they had, below it.
  p = p || {};
  const suppressProtein = !!p.suppressProtein;
  const goalLabel = { lose: 'fat loss', gain: 'muscle gain', maintain: 'maintenance' }[goal] || 'your goal';

  // The single most relevant sentence goes above the offer. The rest go below it.
  let leadLine = '';
  const moreLines = [];
  if (suppressProtein) {
    leadLine = `You told us about your kidney function, so this plan does not set you a protein target. How much protein is right for you depends on things a questionnaire cannot see, and picking a lower number would be the same clinical decision made quietly. <b>Ask your doctor or a renal dietitian what your protein intake should be.</b>`;
  } else if (goal === 'lose') {
    leadLine = `You told us you want to lose weight, so we set your protein high on purpose. It protects your muscle while your calories run under your TDEE, so more of what comes off is fat.`;
  } else if (goal === 'gain') {
    leadLine = `You told us you want to gain, so we paired a high protein target with a small calorie surplus over your TDEE. That's enough to build muscle without turning into a bulk you'll have to diet off later.`;
  } else if (goal === 'maintain') {
    leadLine = `You told us you want to maintain, so your calories sit right at your TDEE. Carbs stay the lever: keep them under your target and your weight holds steady while your body runs on fat.`;
  }
  // Explains why the protein target is HIGH — meaningless and unsafe when there is
  // no protein target.
  if (!suppressProtein && Number(p.age) >= 50) {
    moreLines.push(`You told us your age, and past 50 the body needs more protein to hold onto muscle, so your target runs higher than the generic keto advice you'll see online.`);
  }
  if (Number(p.activity) && Number(p.activity) <= 1.3) {
    moreLines.push(`You told us your days are mostly low-activity right now, so we set your calorie line from your real routine, not an optimistic one, and that's exactly why it'll work.`);
  } else if (Number(p.activity) >= 1.7) {
    moreLines.push(`You told us you train hard, so your fat intake is set to carry those sessions while your carbs stay low enough to keep you in ketosis, even on heavy days.`);
  }
  moreLines.push(suppressProtein
    ? `Use fat to stay full and keep net carbs (total carbs minus fiber) under target. Take the protein question to your doctor or a renal dietitian before you change how you eat.`
    : `Hit the protein number first, use fat to stay full, and keep net carbs (total carbs minus fiber) under target. Give it two weeks before you judge anything.`);

  const panel = (lines, marginTop) => lines.length
    ? `<div style="margin:${marginTop} 28px 4px;padding:14px 18px;background:rgba(56,189,248,.05);border-left:3px solid #38bdf8;border-radius:0 10px 10px 0">` +
      lines.map((l, i) => `<p style="margin:${i === lines.length - 1 ? '0' : '0 0 10px'};color:#bcd4e3;font-size:13.5px;line-height:1.6">${l}</p>`).join('') +
      `</div>`
    : '';

  const newsletterLine = p.newsletterOptIn
    ? `<p style="margin:16px 0 0;color:#9fb8c9;font-size:12.5px;line-height:1.6">You're also on The Weekly Dial-In, one practical keto email a week, no hype, and you can leave anytime.</p>`
    : '';
  const unsubLink = p.unsubUrl
    ? ` <a href="${p.unsubUrl}" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a>`
    : '';
  const row = (k, v, color) =>
    `<tr><td style="padding:10px 14px;border-bottom:1px solid #1e3a52;color:#9fb8c9;font-size:13px">${k}</td>` +
    `<td style="padding:10px 14px;border-bottom:1px solid #1e3a52;color:${color || '#e2eef7'};font-size:15px;font-weight:700;text-align:right">${v}</td></tr>`;

  /**
   * Every outbound link. The session token rides in the URL FRAGMENT so it is never
   * sent to a server, never lands in a Referer header and never reaches the analytics
   * or Stripe scripts the page loads; the client scrubs it from history on arrival.
   * utm_content names the PRODUCT that was clicked, never the health state that
   * chose it, so nothing derived from the kidney answer leaves for external
   * analytics under its own name.
   */
  const link = (content, path) => {
    const q = `utm_source=plan_email&utm_medium=email&utm_campaign=free_results&utm_content=${content}`;
    // Only the buy links resume a session. The recipe index has nothing to resume,
    // and sending the token to a page that does not need it would widen its exposure
    // for no reason.
    if (path) return `https://ketodial.com${path}?${q}`;
    return p.token
      ? `https://ketodial.com/?${q}#resume=${encodeURIComponent(p.token)}`
      : `https://ketodial.com/?${q}#calc`;
  };

  const bullet = (t) =>
    `<tr><td style="padding:0 0 8px;color:#38bdf8;font-size:14px;vertical-align:top;width:18px">&#10003;</td>` +
    `<td style="padding:0 0 8px;color:#dbeafe;font-size:14px;line-height:1.5">${t}</td></tr>`;

  // TRUTHFUL FULFILMENT WORDING. A customer may buy before completing the
  // personalization profile — that path is deliberate — and the webhook then sends
  // the finish-profile email instead of reports. "Instant PDF delivery" was false
  // for exactly the path we built on purpose.
  const reassurance = `<p style="margin:12px 0 0;color:#8fb3c9;font-size:12px;line-height:1.5">One-time purchase &middot; Delivered after personalization &middot; No subscription</p>`;
  const personalizationNote = `<p style="margin:10px 0 0;color:#8fb3c9;font-size:12px;line-height:1.55">Buy whenever you're ready. Before we build your personalized reports, we'll need a few details about your cooking style, budget, preferences and health context.</p>`;
  const singleReports = `<p style="margin:14px 0 0;color:#6da6c9;font-size:12px;line-height:1.5">Only want one piece? <a href="${link('single_reports')}" style="color:#6da6c9;text-decoration:underline">Single reports start at $3.99.</a></p>`;

  const offerBlock = suppressProtein
    // The Full Protocol contains the protein-anchored meal plan, which this customer
    // cannot be sold. Offer the two that remain deliverable. The meal plan is not
    // named at all: describing what someone cannot have is still advertising it.
    ? `<div style="margin:18px 28px 24px;padding:20px 22px;background:rgba(56,189,248,.08);border:1px solid #2b5f80;border-radius:14px">
      <p style="margin:0 0 8px;color:#6da6c9;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Your next step</p>
      <p style="margin:0 0 10px;color:#fff;font-size:19px;font-weight:800;line-height:1.3">Get the reports we can personalize safely</p>
      <p style="margin:0 0 14px;color:#bcd4e3;font-size:14px;line-height:1.6">Your numbers above tell you the targets. These two reports turn them into what to do next, and they are the ones we can build for you without setting a personalized protein target.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 14px">
        ${bullet('The Keto Starter Kit, walking you through your first 14 days')}
        ${bullet('A Doctor&rsquo;s Report for your next appointment, with the labs to ask about and what to discuss')}
      </table>
      <p style="margin:0 0 14px;color:#fff;font-size:26px;font-weight:800;line-height:1">$9.98 <span style="font-size:13px;font-weight:600;color:#9fb8c9">for both</span></p>
      <a href="${link('doctor_starter_cta')}" style="display:block;background:#38bdf8;color:#062234;font-weight:800;font-size:16px;padding:15px 20px;border-radius:12px;text-decoration:none;text-align:center">Get both reports for $9.98</a>
      ${reassurance}
      ${personalizationNote}
      ${singleReports}
    </div>`
    : `<div style="margin:18px 28px 24px;padding:20px 22px;background:rgba(56,189,248,.08);border:1px solid #2b5f80;border-radius:14px">
      <p style="margin:0 0 8px;color:#6da6c9;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Your next step</p>
      <p style="margin:0 0 10px;color:#fff;font-size:19px;font-weight:800;line-height:1.3">Want us to turn these numbers into your actual plan?</p>
      <p style="margin:0 0 14px;color:#bcd4e3;font-size:14px;line-height:1.6">Your macros tell you the targets. The Full Protocol tells you what to eat, what to buy, how to get through the first two weeks, and gives you a summary you can take to your doctor.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 14px">
        ${bullet('A personalized 7-Day Meal Plan built around the numbers above')}
        ${bullet('The grocery list for that week')}
        ${bullet('The Keto Starter Kit, walking you through your first 14 days')}
        ${bullet('A Doctor&rsquo;s Report for your next appointment')}
      </table>
      <p style="margin:0 0 14px;color:#fff;font-size:26px;font-weight:800;line-height:1">$10.99 <span style="font-size:13px;font-weight:600;color:#9fb8c9;text-decoration:line-through">$15.97</span> <span style="font-size:13px;font-weight:700;color:#6ee7b7">save $4.98</span></p>
      <a href="${link('protocol_cta')}" style="display:block;background:#38bdf8;color:#062234;font-weight:800;font-size:16px;padding:15px 20px;border-radius:12px;text-decoration:none;text-align:center">Get my Full Protocol for $10.99</a>
      ${reassurance}
      ${personalizationNote}
      ${singleReports}
    </div>`;

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#e7edf3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="background:#0b1620;border-radius:16px;overflow:hidden">
    <div style="padding:26px 28px 18px;border-bottom:1px solid #1e3a52">
      <span style="font-weight:800;font-size:19px;color:#fff">Keto<span style="color:#38bdf8">Dial</span></span>
      <p style="margin:10px 0 0;color:#6da6c9;font-size:11px;letter-spacing:.14em;text-transform:uppercase">Your personalized keto plan</p>
    </div>
    <div style="padding:22px 28px 8px">
      <p style="margin:0 0 6px;color:#e2eef7;font-size:15px;line-height:1.55">These targets came from your own stats, not averages, and they're tuned for ${goalLabel}.</p>
    </div>
    <table style="width:100%;border-collapse:collapse;padding:0 28px" cellpadding="0" cellspacing="0">
      ${row('Daily calories', `${Number(m.calories).toLocaleString()} kcal`, '#38bdf8')}
      ${row('Fat', `${m.fatG} g`)}
      ${suppressProtein
        ? row('Protein', 'Ask your doctor or renal dietitian')
        : row('Protein', `${m.proteinG} g`)}
      ${row('Net carbs', `${m.carbG} g`)}
      ${row('Your TDEE (maintenance)', `${Number(m.tdee).toLocaleString()} kcal`)}
    </table>
    ${panel(leadLine ? [leadLine] : [], '14px')}
    ${offerBlock}
    ${panel(moreLines, '0')}
    <div style="padding:16px 28px 26px">
      <a href="${link('recipes', '/recipes/')}" style="display:inline-block;background:transparent;border:1px solid #38bdf8;color:#38bdf8;font-weight:700;font-size:13px;padding:9px 16px;border-radius:10px;text-decoration:none">Browse keto recipes with these macros</a>
    </div>
  </div>
  ${newsletterLine}
  <p style="margin:16px 8px 0;color:#94a3b8;font-size:11px;line-height:1.6">Estimates are for general nutrition information only, not medical advice. Consult a qualified healthcare provider before starting any diet. You received this email because you asked for your results at ketodial.com.${unsubLink}</p>
</div>
</body></html>`;
}

async function handleEmailPlan(request, env) {
  try {
    const b = await request.json();
    const email = (b.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(400, { error: 'Valid email required' });
    }
    if (!env.RESEND_API_KEY) {
      return jsonResponse(500, { error: 'Email not configured' });
    }

    // AUTHORITATIVE MACROS AND AUTHORITATIVE KIDNEY ANSWER, FROM THE SAME ROW.
    // The client used to hand us both the numbers and nothing else, so this email
    // could not know about the kidney gate and printed a protein target the page had
    // just withheld. Reading the saved session fixes both problems at once: the
    // figures are the ones we stored, and kidney_status comes with them.
    //
    // The token exists before the auto-send in the normal flow. If it does not — a
    // stale page, or a session write that failed — fall back to the client's macros
    // and SUPPRESS, because an unknown kidney answer is not a negative one.
    let m = b.macros || {};
    let kidneyStatus;
    if (b.token) {
      const row = await readSessionRow(b.token, env);
      if (row) {
        kidneyStatus = row.kidney_status;
        const stored = row.calculated_macros;
        if (stored && stored.calories && stored.proteinG) m = stored;
      }
    }
    if (!m.calories || !m.fatG || !m.proteinG || m.carbG == null || !m.tdee) {
      return jsonResponse(400, { error: 'Macros required' });
    }
    // Anything that is not an explicit 'no' suppresses, absence included. Same
    // fail-closed shape as deriveKdMedicalContext.
    const suppressProtein = kidneyStatus !== 'no';

    // Attach email to the calculator session if we have a token
    if (b.token) {
      fetch(`${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${b.token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ email, updated_at: new Date().toISOString() }),
      }).catch(() => {});
    }

    // Optional newsletter subscribe (no welcome send — the plan email is enough for one day)
    if (b.newsletter_opt_in) {
      fetch(`${env.SUPABASE_URL}/rest/v1/rpc/upsert_newsletter_subscriber`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          p_email: email,
          p_site: 'kd',
          p_signup_source: 'calculator-plan',
          p_utm_source: b.utm_source || null,
          p_utm_medium: b.utm_medium || null,
          p_utm_campaign: b.utm_campaign || null,
        }),
      }).catch(() => {});
    }

    const unsubUrl = `https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe?email=${encodeURIComponent(email)}&site=kd`;
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'KetoDial <ketodial@carnivoreweekly.com>',
        to: [email],
        // KetoDial replies go to the inbound catch-all, never a personal inbox.
        reply_to: 'ketodial@carnivoreweekly.com',
        subject: suppressProtein
          ? `Your keto plan: ${Number(m.calories).toLocaleString()} kcal · ${m.carbG}g net carbs`
          : `Your keto plan: ${Number(m.calories).toLocaleString()} kcal · ${m.proteinG}g protein · ${m.carbG}g net carbs`,
        html: buildPlanEmail(m, b.goal, {
          age: b.age,
          sex: b.sex,
          activity: b.activity,
          newsletterOptIn: !!b.newsletter_opt_in,
          unsubUrl,
          suppressProtein,
          // Lets the buy button resume this exact session instead of dropping the
          // reader back at an empty calculator. Travels in the URL fragment.
          token: b.token || null,
        }),
        // Same tag shape as the CW welcome sender so the /webhook/resend
        // open/click tracking can segment plan emails in drip_events.
        tags: [
          { name: 'email_type', value: 'plan' },
          { name: 'site', value: 'kd' },
          // Which OFFER the email carried, so protocol and doctor+starter sends are
          // separable in reporting. Names the product, not the health answer behind
          // it: no kidney status leaves for external analytics under its own name.
          { name: 'offer', value: suppressProtein ? 'doctor_starter' : 'protocol' },
        ],
      }),
    });
    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.log('plan email send failed:', err);
      return jsonResponse(502, { error: 'Send failed' });
    }
    return jsonResponse(200, { sent: true });
  } catch (e) {
    return jsonResponse(500, { error: e.message });
  }
}

// ──────────────────────────────────────────────
// CHECKOUT
// ──────────────────────────────────────────────
async function handleCheckout(request, env) {
  try {
    const body = await request.json();
    const { items, email, name, token } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonResponse(400, { error: 'No items selected' });
    }

    // PURCHASE ELIGIBILITY, NOT REPORT ELIGIBILITY. See the two-boundary note in
    // intake.js. This checks that the session is real, the body data behind the
    // price is sane, and the kidney answer was explicitly given — and deliberately
    // does NOT require the step-2 profile, which this page presents ABOVE the
    // picker and labels optional. Requiring it here turned "safety changes the
    // offer" into "safety blocks the sale", which is the opposite of the rule.
    let checkoutIntake;
    try {
      checkoutIntake = await loadIntakeForPurchase(token, env);
    } catch (err) {
      if (err instanceof IntakeError) {
        console.error('Checkout blocked, purchase intake not usable:', err.code, err.missing.join('|'));
        return jsonResponse(409, {
          error: 'incomplete_intake',
          code: err.code,
          message: err.customerMessage,
        });
      }
      // Store unreachable: transient, and not the customer's fault. Do not sell them
      // something we cannot currently prove we can deliver.
      console.error('Checkout blocked, intake store unavailable:', err.message);
      return jsonResponse(503, {
        error: 'intake_store_unavailable',
        message: 'We are having trouble reaching our own records right now. Please try again ' +
                 'in a few minutes — nothing has been charged.',
      });
    }

    // SAFETY CHANGES THE OFFER, NOT THE ABILITY TO PURCHASE.
    // The browser has already removed the protein-anchored items from the picker for
    // this customer, so reaching here with one is either a stale page or someone
    // calling the endpoint directly. Either way we decline THAT ITEM and say what is
    // still available — we do not block the purchase, disable the button, or ask for
    // a second health intake. The customer buys what we can actually deliver.
    const offer = allowedProducts(deriveKdMedicalContext(checkoutIntake));
    const unavailable = items.filter(i => !offer.allowed.includes(i));
    if (unavailable.length) {
      console.log(`Checkout offer adjusted for ${token}: declined ${unavailable.join(',')} (${offer.reason})`);
      return jsonResponse(409, {
        error: 'product_unavailable',
        code: offer.reason,
        unavailable,
        available: offer.allowed,
        message: 'Because you told us about your kidney function, KetoDial does not build a ' +
                 'personalized protein-anchored meal plan for you. The other reports are ' +
                 'unaffected — please refresh to see what is available.',
      });
    }

    const PRICE_MAP = priceMap(env);
    const line_items = items.map(key => ({
      price: PRICE_MAP[key],
      quantity: 1,
    }));

    const sessionParams = new URLSearchParams();
    sessionParams.append('mode', 'payment');
    sessionParams.append('ui_mode', 'embedded');
    sessionParams.append('return_url', returnUrl(env));
    sessionParams.append('allow_promotion_codes', 'true');

    line_items.forEach((item, i) => {
      sessionParams.append(`line_items[${i}][price]`, item.price);
      sessionParams.append(`line_items[${i}][quantity]`, '1');
    });

    if (email) sessionParams.append('customer_email', email);

    sessionParams.append('metadata[customer_name]', name || '');
    sessionParams.append('metadata[items]', items.join(','));
    // THE ONLY INTAKE REFERENCE IN STRIPE. 32 characters, bounded by construction,
    // and it points at calculator_sessions_v2 rather than trying to be it.
    //
    // `metadata[form_data]` used to live here as
    // `JSON.stringify(formData).slice(0, 490)`. It is gone, and it must not come
    // back: Stripe's 500-character cap silently amputated the questionnaire of any
    // customer with more than about 183 characters of free text, and free-text
    // length tracks medical complexity.
    sessionParams.append('metadata[session_token]', token);

    const session = await stripeAPI('checkout/sessions', sessionParams, env);

    if (session.error) return jsonResponse(500, { error: session.error.message });
    return jsonResponse(200, { clientSecret: session.client_secret, sessionId: session.id });
  } catch (err) {
    return jsonResponse(500, { error: 'Internal server error' });
  }
}

// ──────────────────────────────────────────────
// WEBHOOK
// ──────────────────────────────────────────────
async function handleWebhook(request, env) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');

  // ---------------------------------------------------------------------
  // SIGNATURE VERIFICATION, FAILING CLOSED.
  // ---------------------------------------------------------------------
  // This was `if (env.STRIPE_WEBHOOK_SECRET && sig) { ...verify... }`, so a request
  // that simply OMITTED the stripe-signature header skipped verification entirely.
  // Anyone able to POST here could forge a checkout.session.completed carrying any
  // session_token and (a) write payment_status onto that customer's row and
  // (b) trigger a report email to an address of their choosing.
  //
  // An unverifiable event is not an event. All three of these reject.
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error('WEBHOOK REJECTED: STRIPE_WEBHOOK_SECRET is not configured.');
    return jsonResponse(500, { error: 'Webhook not configured' });
  }
  if (!sig) {
    console.error('WEBHOOK REJECTED: no stripe-signature header.');
    return jsonResponse(400, { error: 'Missing signature' });
  }
  // Verification must never throw out of the handler. A malformed header or a
  // misconfigured secret is a rejection, not a 500 with a stack trace — and an
  // exception escaping here would be an unhandled crash on an unauthenticated
  // endpoint. Anything other than a clean `true` rejects.
  let signatureOk = false;
  try {
    signatureOk = await verifyWebhookSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('WEBHOOK REJECTED: signature verification threw:', e.message);
  }
  if (!signatureOk) {
    console.error('WEBHOOK REJECTED: invalid signature.');
    return jsonResponse(400, { error: 'Invalid signature' });
  }

  let event;
  try { event = JSON.parse(payload); }
  catch { return jsonResponse(400, { error: 'Malformed event' }); }

  // ---------------------------------------------------------------------
  // COMPLETED IS NOT PAID.
  // ---------------------------------------------------------------------
  // A Checkout Session can complete before the money arrives — Stripe's delayed and
  // asynchronous payment methods do exactly that, and report settlement later via
  // checkout.session.async_payment_succeeded. Treating `completed` as `paid` writes
  // payment_status='completed' to Supabase and emails paid reports for a payment that
  // has not settled and may never.
  //
  // One shared path for both events, entered only when the Session says `paid`.
  if (event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;

    if (session.payment_status !== 'paid') {
      // Acknowledge so Stripe stops retrying, and do nothing else.
      // checkout.session.async_payment_succeeded is what brings this session back.
      console.log(`Session ${session.id} is ${event.type} but payment_status=` +
        `${session.payment_status}; awaiting settlement. No writeback, no delivery.`);
      return jsonResponse(200, { received: true, awaiting_payment: true });
    }

    // Product filter: this Stripe account also receives CW calculator and coach
    // subscription checkouts. A KD report checkout always carries metadata.items.
    if (!session.metadata?.items) {
      console.log('Skipping non-KD checkout.session.completed:', session.id);
      return jsonResponse(200, { received: true, skipped: true });
    }

    const email = session.customer_email || session.customer_details?.email;
    const name = session.metadata?.customer_name || 'there';
    const items = (session.metadata?.items || '').split(',').filter(Boolean);

    // Write the purchase back to the calculator session so revenue + paid
    // conversion are queryable in calculator_sessions_v2 (Stripe was the only
    // source of truth before this). Keyed by the session_token we stamp into
    // metadata at checkout. Runs regardless of the email/report path below.
    const sessionToken = session.metadata?.session_token;
    if (sessionToken) {
      try {
        const nowIso = new Date().toISOString();
        const wb = await fetch(
          `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${sessionToken}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
              'Prefer': 'return=minimal',
            },
            // STRIPE'S VOCABULARY IS NOT THE DATABASE'S.
            // Stripe Checkout says payment_status='paid'; calculator_sessions_v2
            // allows pending|completed|failed|refunded. This wrote 'paid' straight
            // through, PostgREST rejected the WHOLE patch on the CHECK constraint,
            // and every field below it — the amount, the payment intent, the
            // timestamps — was lost with it. Verified against the real table.
            //
            // is_premium is also gone, and not by oversight: `premium_requires_payment`
            // requires is_premium=false OR (payment_status='completed' AND tier_id IS
            // NOT NULL). tier_id is a Carnivore Weekly tier, and KetoDial has no value
            // for it, so is_premium=true is unsatisfiable here. Leaving the column
            // alone is honest; inventing a tier id to satisfy a constraint would not be.
            body: JSON.stringify({
              payment_status: 'completed',
              amount_paid_cents: session.amount_total ?? null,
              paid_at: nowIso,
              payment_verified_at: nowIso,
              stripe_payment_intent_id: session.payment_intent || null,
              step_completed: 4,
              updated_at: nowIso,
            }),
          }
        );
        // Loud: a lost writeback means this customer is invisible to the
        // paid-but-undelivered query, which is the one that finds people we owe.
        if (!wb.ok) console.error(`PAYMENT WRITEBACK FAILED for ${sessionToken}:`, await wb.text());
        else console.log(`Payment written back for ${sessionToken}: ${session.amount_total} cents`);
      } catch (e) {
        console.error('Payment writeback error:', e.message);
      }
    } else {
      console.log('No session_token in metadata; payment not linked to session:', session.id);
    }

    if (!email || items.length === 0) {
      console.error('Missing email or items in session:', session.id);
      return jsonResponse(200, { received: true });
    }

    // AUTHORITATIVE INTAKE, OR NO REPORT. handleCheckout validated this before the
    // payment existed, so reaching here with an unusable intake means something
    // changed in between. The two causes need opposite handling:
    //
    //   transient (store unreachable)  -> 500, let Stripe retry; the data is fine
    //   definitively unusable          -> 200 + loud log; retrying forever fixes nothing
    //
    // Collapsing those into one branch is how an outage becomes a refused report, or
    // how a permanently broken row becomes an infinite retry loop.
    let intake;
    try {
      intake = await loadAuthoritativeIntake(session.metadata?.session_token, env);
    } catch (err) {
      if (err instanceof IntakeError) {
        // AN UNFINISHED PROFILE IS NOT A DEAD END. The customer paid; they simply
        // bought before filling in the optional profile, which the page invites.
        // Going silent here — log, 200, no email — is how a paying customer ends up
        // with nothing and no idea why. Send them the one short step instead.
        if (err.code === 'INTAKE_PROFILE_NOT_COMPLETED') {
          console.log(`Profile incomplete for paid session ${session.id}; sending finish-your-reports email.`);
          try {
            await sendFinishProfileEmail(email, name, session.id, env);
          } catch (e) {
            console.error(`Could not send finish-profile email for ${session.id}:`, e.message);
          }
          return jsonResponse(200, { received: true, awaiting_profile: true });
        }
        console.error(
          `NO REPORT SENT — intake unusable for paid session ${session.id} (${email}): ` +
          `${err.code} [${err.missing.join(', ')}]. Needs a human; do not backfill.`);
        return jsonResponse(200, { received: true, report_withheld: err.code });
      }
      console.error(`Intake store unavailable for paid session ${session.id}, asking Stripe to retry:`, err.message);
      return jsonResponse(500, { error: 'intake_store_unavailable' });
    }

    // Expand bundles to individual report types
    const reportTypes = new Set();
    items.forEach(item => {
      if (BUNDLE_EXPAND[item]) {
        BUNDLE_EXPAND[item].forEach(r => reportTypes.add(r));
      } else {
        reportTypes.add(item);
      }
    });

    // Generate report links
    const baseUrl = reportBaseUrl(env);
    const reportLinks = Array.from(reportTypes).map(type => ({
      type,
      name: REPORT_NAMES[type],
      url: `${baseUrl}/report/${session.id}?type=${type}`,
    }));

    // Send email via Resend
    // ORDER MATTERS AND SO DOES THE FAILURE PATH. Nothing is marked delivered until
    // Resend has accepted the message. A send failure asks Stripe to retry rather
    // than reporting a success that did not happen; the deterministic idempotency
    // key makes that retry safe.
    try {
      await sendReportEmail(email, name, reportLinks, intake, env, session.id);
    } catch (e) {
      console.error(`REPORT EMAIL NOT SENT for paid session ${session.id} (${email}):`, e.message);
      return jsonResponse(500, { error: 'report_email_failed' });
    }
    if (sessionToken) {
      const marked = await markDelivered(sessionToken, env);
      if (!marked) {
        // The customer HAS their reports; only our record of it failed. Do not ask
        // Stripe to retry — that would be correct for the marker and pointless for
        // the customer. The log line is the recovery path.
        console.error(`Reports delivered for ${session.id} but the marker did not write. ` +
          `Re-running /fulfill within 24h is a no-op at Resend (key ${'kd-report/' + session.id}); ` +
          `after that window the customer would receive a second copy.`);
      }
    }

    console.log(`Reports sent to ${email} for session ${session.id}: ${Array.from(reportTypes).join(', ')}`);
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    // Nothing to undo: we never wrote a payment or delivered anything for a session
    // that was not `paid`. Logged so a failed settlement is visible rather than silent.
    console.log(`Async payment FAILED for session ${event.data.object?.id}; nothing was delivered.`);
    return jsonResponse(200, { received: true, payment_failed: true });
  }

  return jsonResponse(200, { received: true });
}

// ──────────────────────────────────────────────
// POST-PAYMENT FULFILMENT
// ──────────────────────────────────────────────
//
// Splitting purchase eligibility from report eligibility (2026-09-08) let a customer
// buy after step 1 and finish the optional profile later. That was the right call for
// conversion, and it opened a hole this section closes: the webhook ran the full
// report validator, found the profile incomplete, logged NO REPORT SENT and returned
// 200 — so a paying customer received nothing and was told nothing.
//
//   pay -> profile complete   -> deliver immediately (webhook, unchanged)
//   pay -> profile incomplete -> email a "one short step" link tied to THAT paid
//                                session -> customer finishes the profile against
//                                the original row -> deliver
//
// Everything hangs off one mapping the server already had:
//     Stripe session_id -> metadata.session_token -> calculator_sessions_v2

/**
 * Resolve a Stripe checkout session to the authoritative row behind it.
 *
 * Returns `{ error, status }` instead of throwing so callers can shape their own
 * response. Requires the session to be PAID: this is the key that unlocks writing to
 * someone's row after checkout, so an unpaid or unknown id must not resolve.
 */
async function resolvePaidCheckout(stripeSessionId, env) {
  if (!stripeSessionId || !/^cs_[A-Za-z0-9_]+$/.test(stripeSessionId)) {
    return { error: 'Invalid checkout reference', status: 400 };
  }
  const session = await stripeAPI(`checkout/sessions/${stripeSessionId}`, null, env, 'GET');
  if (session.error || !session.metadata) {
    return { error: 'Checkout session not found', status: 404 };
  }
  if (session.payment_status !== 'paid') {
    return { error: 'Payment not completed', status: 403 };
  }
  const token = session.metadata.session_token;
  if (!token) {
    // A purchase with no session reference. Nothing to attach a profile to, and we
    // will not invent one.
    return { error: 'This purchase is not linked to a saved questionnaire', status: 409 };
  }
  return { token, session };
}

/** The individual report types a set of purchased items expands to. */
function expandItems(items) {
  const out = new Set();
  for (const item of items) {
    if (BUNDLE_EXPAND[item]) BUNDLE_EXPAND[item].forEach(r => out.add(r));
    else if (item) out.add(item);
  }
  return [...out];
}

/**
 * GET /purchase/:stripeSessionId
 *
 * What the success screen needs in order to be honest: what was actually bought, and
 * whether the reports can be generated yet. The screen used to hardcode all three
 * report links regardless of the order, so a renal customer who was correctly
 * prevented from BUYING the meal plan was still shown a link to open it — which then
 * 403s. Telling someone they own something they were deliberately not sold is worse
 * than the 403.
 */
/**
 * Resume an unpaid calculator session from the free-results email.
 *
 * WHY THIS EXISTS. The email's buy button used to land on ketodial.com/#calc, i.e.
 * back at an empty form. A customer who had already given us their stats, read their
 * numbers and decided to buy was asked to do the whole calculator again to find the
 * checkout. That is the opposite of not making it hard to spend money.
 *
 * WHAT IT DELIBERATELY IS NOT. It is not an entitlement. The response carries a
 * BOUNDED PROJECTION of the row — the macros already printed in the email, the goal,
 * and the kidney answer — and nothing else. No email address, no name, no conditions,
 * no medications, no payment fields. `allowed` is computed here by the same
 * allowedProducts() the checkout uses, so the page never decides for itself what a
 * resumed customer may buy, and a hand-edited URL cannot widen it: /checkout re-reads
 * the row and re-derives eligibility regardless of what the page did.
 *
 * THE TOKEN TRAVELS IN THE URL FRAGMENT, NOT THE QUERY STRING. Fragments are never
 * sent to a server, never appear in a Referer header and never reach the analytics or
 * Stripe scripts the landing page loads. The client scrubs it from history on arrival.
 * Bearer-token-in-a-link is the same model /purchase/<stripe_session_id> already uses.
 */
async function handleResume(token, env) {
  if (!token || token.length < 8 || token.length > 128) {
    return jsonResponse(400, { error: 'bad_reference' });
  }
  const row = await readSessionRow(token, env);
  // Deliberately identical response for "no such token" and "unusable row": a probe
  // learns nothing about which tokens exist.
  if (!row) return jsonResponse(404, { error: 'not_found' });

  const m = row.calculated_macros;
  if (!m || !m.calories || !m.proteinG) return jsonResponse(404, { error: 'not_found' });

  // Absence is not a negative answer. Same fail-closed shape as everywhere else.
  const kidney = row.kidney_status === 'no' ? 'no'
               : (row.kidney_status === 'yes' || row.kidney_status === 'unsure') ? row.kidney_status
               : null;
  const ctx = deriveKdMedicalContext({
    kidneyStatus: kidney || 'unsure',
    conditions: [], medications: '',
  });
  const products = allowedProducts(ctx);

  return jsonResponse(200, {
    token,
    macros: {
      calories: m.calories, fatG: m.fatG, proteinG: m.proteinG,
      carbG: m.carbG, tdee: m.tdee, deficitPct: m.deficitPct,
    },
    goal: row.goal || null,
    kidney_status: kidney,
    // The authority for what this page may offer. Not a hint.
    allowed: products.allowed,
    suppressProtein: !!ctx.restrictProteinTarget,
  });
}

async function handlePurchaseStatus(stripeSessionId, env) {
  const resolved = await resolvePaidCheckout(stripeSessionId, env);
  if (resolved.error) return jsonResponse(resolved.status, { error: resolved.error });

  const purchased = expandItems((resolved.session.metadata.items || '').split(','));

  let profileComplete = true;
  let missing = [];
  try {
    await loadAuthoritativeIntake(resolved.token, env);
  } catch (err) {
    if (err instanceof IntakeError) {
      profileComplete = false;
      missing = err.missing;
      if (err.code !== 'INTAKE_PROFILE_NOT_COMPLETED') {
        // Something worse than an unfinished profile. Say so rather than sending the
        // customer round a form that will not fix it.
        return jsonResponse(200, {
          paid: true, purchased, profileComplete: false, recoverable: false,
          message: err.customerMessage,
        });
      }
    } else {
      return jsonResponse(503, { error: 'Temporarily unavailable, please retry' });
    }
  }

  return jsonResponse(200, { paid: true, purchased, profileComplete, recoverable: !profileComplete, missing });
}

/**
 * POST /fulfill  { stripe_session_id }
 *
 * Deliver the reports for a paid session. Called after a late profile completion.
 * Idempotent via `reports_delivered_at`, so a double click does not send twice.
 */
async function handleFulfill(request, env) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse(400, { error: 'Bad request' }); }

  const resolved = await resolvePaidCheckout(body.stripe_session_id, env);
  if (resolved.error) return jsonResponse(resolved.status, { error: resolved.error });

  const { token, session } = resolved;

  let intake;
  try {
    intake = await loadAuthoritativeIntake(token, env);
  } catch (err) {
    if (err instanceof IntakeError) {
      return jsonResponse(409, { error: 'profile_incomplete', code: err.code, message: err.customerMessage });
    }
    return jsonResponse(503, { error: 'Temporarily unavailable, please retry' });
  }

  const row = await readSessionRow(token, env);
  if (row && row.reports_delivered_at) {
    return jsonResponse(200, { ok: true, alreadyDelivered: true, links: reportLinksFor(session, env) });
  }

  const email = session.customer_email || session.customer_details?.email || (row && row.email);
  if (!email) return jsonResponse(409, { error: 'no_email', message: 'We have no email address for this purchase.' });

  const links = reportLinksFor(session, env);
  try {
    await sendReportEmail(email, session.metadata.customer_name || 'there', links, intake, env, session.id);
  } catch (e) {
    // NOT DELIVERED, so nothing is marked. Retryable, and safe to retry: the
    // deterministic idempotency key means a duplicate attempt is one message.
    console.error(`REPORT EMAIL NOT SENT for ${session.id}:`, e.message);
    return jsonResponse(502, {
      error: 'delivery_failed', retryable: true,
      message: 'We could not send your reports just now. Please try again in a moment — ' +
               'you will not be charged again.',
    });
  }

  const marked = await markDelivered(token, env);
  return jsonResponse(200, { ok: true, links, deliveryRecorded: marked });
}

/** The report links for a paid session, honouring what was actually purchased. */
function reportLinksFor(session, env) {
  const baseUrl = reportBaseUrl(env);
  return expandItems((session.metadata.items || '').split(',')).map(type => ({
    type, name: REPORT_NAMES[type], url: `${baseUrl}/report/${session.id}?type=${type}`,
  }));
}

async function readSessionRow(token, env) {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                   Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Accept: 'application/json' } });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch { return null; }
}

/**
 * Record that the reports were emailed. Returns true only if the row actually says so.
 *
 * This used to swallow both the network error AND a non-2xx PostgREST response, so a
 * rejected PATCH looked exactly like a successful one. A marker that lies in the
 * optimistic direction is worse than no marker: it hides the customer from the
 * paid-but-undelivered query. A prompt retry is safe — inside Resend's 24-hour
 * idempotency window the duplicate is a no-op — so failing loudly here is cheap.
 */
async function markDelivered(token, env) {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                   Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ reports_delivered_at: new Date().toISOString() }),
      });
    if (!res.ok) {
      console.error(`DELIVERY MARKER NOT WRITTEN for ${token}: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`DELIVERY MARKER NOT WRITTEN for ${token}:`, e.message);
    return false;
  }
}

// ──────────────────────────────────────────────
// REPORT GENERATION
// ──────────────────────────────────────────────
const REPORT_NAMES = {
  doctor: "Doctor's Report",
  meal: '7-Day Meal Plan',
  starter: 'Keto Starter Kit',
};

async function handleReport(sessionId, reportType, env) {
  // Fetch session from Stripe to get form data
  const session = await stripeAPI(`checkout/sessions/${sessionId}`, null, env, 'GET');

  if (session.error || !session.metadata) {
    return new Response('Report not found. Please check your email for the correct link.', {
      status: 404, headers: { 'Content-Type': 'text/html' }
    });
  }

  // Verify payment was completed
  if (session.payment_status !== 'paid') {
    return new Response('Payment not completed.', { status: 403, headers: { 'Content-Type': 'text/html' } });
  }

  const name = session.metadata.customer_name || 'Friend';
  const purchasedItems = (session.metadata.items || '').split(',');

  // Check if this report type was purchased
  const allReports = new Set();
  purchasedItems.forEach(item => {
    if (BUNDLE_EXPAND[item]) BUNDLE_EXPAND[item].forEach(r => allReports.add(r));
    else allReports.add(item);
  });

  if (reportType !== 'all' && !allReports.has(reportType)) {
    return new Response('This report was not included in your purchase.', {
      status: 403, headers: { 'Content-Type': 'text/html' }
    });
  }

  // AUTHORITATIVE INTAKE, OR NO REPORT.
  // This used to be `safeParseJSON(session.metadata.form_data) || {}`, and that `|| {}`
  // is the whole defect: a truncated questionnaire became an empty object, and the
  // generators turned an empty object into a confident document about a 75 kg,
  // 170 cm person. There is no fallback here now, by design.
  let intake;
  try {
    intake = await loadAuthoritativeIntake(session.metadata.session_token, env);
  } catch (err) {
    if (err instanceof IntakeError) {
      console.error(`Report refused for ${sessionId}: ${err.code} [${err.missing.join(', ')}]`);
      return new Response(intakeErrorPage(err, env), {
        status: 422,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    console.error(`Intake store unavailable serving report ${sessionId}:`, err.message);
    return new Response(intakeErrorPage(null, env), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // Generate the appropriate report. A generator may still refuse (requireFacts),
  // which is a bug rather than a data problem — surface it as one, never as a
  // half-filled report.
  let html;
  try {
    switch (reportType) {
      case 'doctor': html = generateDoctorReport(name, intake); break;
      case 'meal': html = generateMealPlan(name, intake); break;
      case 'starter': html = generateStarterKit(name, intake); break;
      default: html = generateAllReports(name, intake, allReports); break;
    }
  } catch (err) {
    if (err instanceof IntakeError) {
      console.error(`Generator refused for ${sessionId}: ${err.code} [${err.missing.join(', ')}] ` +
        '— validateIntake() passed but a generator still lacked a fact. Fix the contract, not the data.');
      return new Response(intakeErrorPage(err, env), {
        status: 422,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    throw err;
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * What a customer sees instead of a report when the intake cannot be trusted.
 *
 * It says what happened, says plainly that we did NOT guess, and gives one route to
 * a human. It does not apologise its way around the fact that they paid, and it does
 * not offer a "basic version" — a report built from assumed details is the thing this
 * whole change exists to prevent.
 *
 * @param {IntakeError|null} err null means a transient store failure, which is worth
 *                               telling the customer to simply retry.
 */
function intakeErrorPage(err, env) {
  const appBase = appBaseUrl(env);
  const transient = !err;
  const profilePending = !transient && err.code === 'INTAKE_PROFILE_NOT_COMPLETED';
  const heading = transient
    ? 'We cannot reach your report right now'
    : profilePending
      ? 'One short step and your reports are ready'
      : 'We have not generated this report';
  const message = transient
    ? 'This is a temporary problem on our side, not a problem with your purchase or your ' +
      'answers. Please refresh in a few minutes. If it is still not working, email us.'
    : err.customerMessage;
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KetoDial — ${transient ? 'Temporarily unavailable' : 'Report not generated'}</title>
<meta name="robots" content="noindex, nofollow" />
<style>
  body{margin:0;background:#f7f6f3;color:#1a1a1a;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .wrap{max-width:560px;margin:12vh auto;padding:0 24px}
  .card{background:#fff;border:1px solid #e3e0da;border-radius:14px;padding:32px}
  h1{font-size:22px;margin:0 0 14px;line-height:1.3}
  p{margin:0 0 14px;color:#333}
  a{color:#0b6b5e;font-weight:600}
  .foot{margin-top:22px;padding-top:16px;border-top:1px solid #eeece7;font-size:13px;color:#666}
</style></head><body>
<div class="wrap"><div class="card">
  <h1>${heading}</h1>
  <p>${message}</p>
  ${profilePending
    ? `<p><a href="${appBase}/#step2">Go back to the calculator and finish the health
       profile</a>, then reopen this link.</p>
       <p><b>Nothing is wrong with your purchase.</b> The reports are personalised from that
       profile, and we will not invent the answers to it.</p>`
    : `<p><b>Your payment is safe and your answers are not lost.</b> We would rather show you
       nothing than show you a report built on details we had to assume.</p>`}
  <p>Email <a href="mailto:ketodial@carnivoreweekly.com">ketodial@carnivoreweekly.com</a>
  with your receipt and we will put this right by hand.</p>
  <div class="foot">KetoDial${err ? ` · reference: ${err.code}` : ''}</div>
</div></div>
</body></html>`;
}

// ──────────────────────────────────────────────
// REPORT TEMPLATES (imported from ./reports.js)
// ──────────────────────────────────────────────
function generateAllReports(name, d, reportTypes) {
  let content = '';
  if (reportTypes.has('doctor')) content += generateDoctorReport(name, d);
  if (reportTypes.has('meal')) content += generateMealPlan(name, d);
  if (reportTypes.has('starter')) content += generateStarterKit(name, d);
  return content;
}

// ──────────────────────────────────────────────
// EMAIL
// ──────────────────────────────────────────────
/**
 * The macro line in the delivery email.
 *
 * A reader who declared kidney disease is told, inside the report, that we are not
 * setting them a protein target. Emailing them one anyway would undo that in the
 * first thing they read. And because energy, fat, protein and carbohydrate are one
 * closed system, blanking only the protein term would still state it by subtraction —
 * so the whole line goes, exactly as the macro panel does in the Doctor's Report.
 */
function targetsLine(d) {
  const ctx = deriveKdMedicalContext(d);
  if (ctx.restrictProteinTarget) {
    return 'inside your report \u2014 your protein target is a question for your doctor or a renal dietitian, ' +
           'so we have not set one for you.';
  }
  return `${d.calories} kcal \u00b7 ${d.fatG}g fat \u00b7 ${d.proteinG}g protein \u00b7 ${d.carbG}g net carbs`;
}

/**
 * "One short step to finish your reports."
 *
 * Sent when someone pays before completing the optional profile. It is the ONLY
 * thing standing between that customer and silence, so it says plainly that the
 * payment worked, what is missing, and gives one link that resumes against THEIR
 * paid session. No apology for a mistake they did not make, and no suggestion that
 * anything is wrong with their order.
 */
async function sendFinishProfileEmail(email, name, stripeSessionId, env) {
  // Same base as the Stripe return URL. This was hardcoded to production, so the
  // harness could not follow the one link that proves the pay-first recovery works
  // without bouncing into the live site. Defaults to production when unset.
  const link = `${appBaseUrl(env)}/?finish=${encodeURIComponent(stripeSessionId)}`;
  const html = `
<div style="max-width:560px;margin:0 auto;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0f172a">
  <h1 style="font-size:22px;margin:0 0 14px">One short step to finish your reports</h1>
  <p style="line-height:1.6">Hi ${escapeHtmlBasic(name)}, your payment went through — thank you.</p>
  <p style="line-height:1.6">Your reports are built around the short health profile on the calculator
  page, and it has not been filled in yet. It takes about a minute, and we would rather ask than
  guess at your details.</p>
  <p style="margin:26px 0">
    <a href="${link}" style="background:#0f172a;color:#fff;padding:13px 22px;border-radius:8px;
       text-decoration:none;font-weight:600;display:inline-block">Finish my reports</a>
  </p>
  <p style="line-height:1.6;font-size:14px;color:#475569">That link is tied to this purchase, so your
  answers attach to the right order. As soon as you are done, your reports are emailed straight to you.</p>
  <p style="line-height:1.6;font-size:14px;color:#475569">Stuck, or would rather we did it for you?
  Reply to this email or write to ketodial@carnivoreweekly.com.</p>
</div>`;
  return resendSend({
    from: 'KetoDial <ketodial@carnivoreweekly.com>',
    to: [email],
    reply_to: 'ketodial@carnivoreweekly.com',
    subject: 'One short step to finish your KetoDial reports',
    html,
  }, idempotencyKey.finish(stripeSessionId), env);
}

function escapeHtmlBasic(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Deterministic Resend idempotency keys.
 *
 * `reports_delivered_at` is read-then-write, so two concurrent /fulfill requests can
 * both see NULL and both send. The database marker is the durable application state;
 * this is what stops the duplicate at the point of sending. Keys are derived from the
 * Stripe Checkout Session so a retry produces the SAME key — a random key per attempt
 * would defeat the entire mechanism, which is why they are built here rather than at
 * each call site.
 */
// Resend retains an idempotency key for 24 HOURS, not forever, so this is the
// short-window protection and `reports_delivered_at` is the durable one. Inside the
// window a retry is genuinely the same message; outside it the database marker is
// what stops a second send. Saying "a resend is always safe" would be wrong, and
// treating the key as long-term state would be worse.
const idempotencyKey = {
  report: (stripeSessionId) => `kd-report/${stripeSessionId}`,
  finish: (stripeSessionId) => `kd-finish/${stripeSessionId}`,
};

/**
 * POST to Resend and INSIST ON AN ANSWER.
 *
 * sendReportEmail used to log a non-2xx response and return normally, so the callers
 * went on to write `reports_delivered_at` — permanently recording a delivery that
 * never happened, on the one column that answers "who paid and got nothing".
 * A send either succeeds or throws.
 */
async function resendSend(payload, idemKey, env) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_NOT_CONFIGURED');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      // Deterministic, so a retry of the same delivery is the same message.
      'Idempotency-Key': idemKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RESEND_REJECTED ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

async function sendReportEmail(email, name, reportLinks, formData, env, stripeSessionId) {
  const linkList = reportLinks.map(r =>
    `<tr><td style="padding:8px 0"><a href="${r.url}" style="color:#38bdf8;font-weight:600;text-decoration:none">${r.name}</a></td><td style="padding:8px 0;text-align:right"><a href="${r.url}" style="background:#0f172a;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View Report</a></td></tr>`
  ).join('');

  const html = `
<div style="max-width:560px;margin:0 auto;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0f172a">
<div style="background:#0b1620;padding:28px 24px;border-radius:14px 14px 0 0;text-align:center">
<h1 style="color:#fff;font-size:22px;margin:0">Your KetoDial reports are ready</h1>
<p style="color:#6da6c9;font-size:14px;margin-top:8px">Hi ${name}, here are your personalized keto reports.</p>
</div>
<div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 14px 14px">
<p style="font-size:15px;color:#475569;margin-bottom:16px">Click any report below to view it in your browser. You can print or save as PDF from there.</p>
<table style="width:100%;border-collapse:collapse">
${linkList}
</table>
<div style="margin-top:20px;padding:14px;background:#f1f5f9;border-radius:10px;font-size:13px;color:#64748b">
<strong>Your daily targets:</strong> ${targetsLine(formData)}
</div>
<p style="margin-top:20px;font-size:13px;color:#94a3b8">These links are unique to your purchase and don't expire. Bookmark them for easy access.</p>
<div style="margin-top:20px;padding:16px 18px;background:#0b1620;border-radius:12px">
<p style="margin:0 0 8px;color:#6da6c9;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Want a human in your corner?</p>
<p style="margin:0 0 10px;color:#bcd4e3;font-size:13px;line-height:1.6">Your reports tell you what to do. KetoDial Coach is a weekly accountability check-in by text to make sure it actually happens. It's in early beta right now, which means a small group and real attention.</p>
<a href="https://coach.ketodial.com/?utm_source=report_email&utm_medium=email&utm_campaign=coach_beta" style="color:#38bdf8;font-size:13px;font-weight:700;text-decoration:none">Take a look at Coach &rsaquo;</a>
</div>
</div>
<p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">© 2026 KetoDial — ketodial.com</p>
</div>`;

  // Throws on rejection. The caller must not mark delivery until this returns.
  return resendSend({
    from: 'KetoDial <reports@carnivoreweekly.com>',
    to: [email],
    subject: `${name}, your KetoDial reports are ready`,
    html: html,
  }, idempotencyKey.report(stripeSessionId), env);
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
async function stripeAPI(endpoint, params, env, method) {
  const opts = {
    method: method || 'POST',
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
  };
  if (params) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = params.toString();
  }
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, opts);
  return res.json();
}

/**
 * How far out of date a signed event may be, in seconds.
 *
 * Stripe's own libraries default to 300s and document the reason: without a
 * tolerance a captured payload-plus-signature stays valid forever, so anyone who
 * once observed a legitimate event can replay it indefinitely. Stripe's retries
 * carry a FRESH timestamp and signature, so a real retry is never rejected by this.
 */
const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Verify a Stripe webhook signature.
 *
 * Two things this did wrong, both fixed here:
 *
 *  1. It never looked at `t`. A valid payload and signature captured today stayed
 *     valid next week — the replay attack Stripe calls out by name.
 *
 *  2. `parts[k] = v` kept only the LAST v1. Stripe sends one v1 per active signing
 *     secret, so during a secret rotation the header carries several and the one
 *     matching your current secret may not be last. Rotating the webhook secret
 *     would have started rejecting genuine events. All v1 values are collected and
 *     any match is accepted.
 *
 * Returns false rather than throwing; the caller also guards, because an exception
 * escaping an unauthenticated endpoint is its own problem.
 */
async function verifyWebhookSignature(payload, sig, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  let timestamp = null;
  const signatures = [];
  for (const part of String(sig).split(',')) {
    const idx = part.indexOf('=');
    if (idx < 1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === 't' && timestamp === null) timestamp = v;
    else if (k === 'v1' && v) signatures.push(v);
  }
  if (timestamp === null || signatures.length === 0) return false;

  // REPLAY WINDOW.
  //
  // The shape check below is DEFENCE IN DEPTH, not load-bearing, and mutation
  // testing is what established that: removing it changes no behaviour, because
  // every input it rejects is already rejected downstream — 'abc' fails
  // Number.isFinite, and '', '-1', '12.5' and '1e9' all land outside the tolerance
  // bound. It is kept because "a timestamp is a string of digits" is worth stating
  // where a reader will see it, but no test can distinguish its presence, and
  // inventing one that appeared to would be worse than saying so here.
  if (!/^\d+$/.test(timestamp)) return false;
  const t = Number(timestamp);
  if (!Number.isFinite(t)) return false;
  if (Math.abs(nowSeconds - t) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');
  return signatures.some(candidate => timingSafeEqualHex(candidate, expected));
}

/** Constant-time-ish hex compare, so a wrong signature leaks no timing information. */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

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
    if (!b.token) return jsonResponse(400, { error: 'Missing token' });

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
  // p: optional personalization {age, sex, activity, newsletterOptIn, unsubUrl}.
  // Every line is derived only from inputs the user actually gave us — the
  // "you told us X, so Y" framing is the point (Brew, 2026-08-30): make
  // answering questions feel worthwhile without asking any new ones for free.
  p = p || {};
  const goalLabel = { lose: 'fat loss', gain: 'muscle gain', maintain: 'maintenance' }[goal] || 'your goal';
  const valueLines = [];
  if (goal === 'lose') {
    valueLines.push(`You told us you want to lose weight, so we set your protein high on purpose. It protects your muscle while your calories run under your TDEE, so more of what comes off is fat.`);
  } else if (goal === 'gain') {
    valueLines.push(`You told us you want to gain, so we paired a high protein target with a small calorie surplus over your TDEE. That's enough to build muscle without turning into a bulk you'll have to diet off later.`);
  } else if (goal === 'maintain') {
    valueLines.push(`You told us you want to maintain, so your calories sit right at your TDEE. Carbs stay the lever: keep them under your target and your weight holds steady while your body runs on fat.`);
  }
  if (Number(p.age) >= 50) {
    valueLines.push(`You told us your age, and past 50 the body needs more protein to hold onto muscle, so your target runs higher than the generic keto advice you'll see online.`);
  }
  if (Number(p.activity) && Number(p.activity) <= 1.3) {
    valueLines.push(`You told us your days are mostly low-activity right now, so we set your calorie line from your real routine, not an optimistic one, and that's exactly why it'll work.`);
  } else if (Number(p.activity) >= 1.7) {
    valueLines.push(`You told us you train hard, so your fat intake is set to carry those sessions while your carbs stay low enough to keep you in ketosis, even on heavy days.`);
  }
  const valueBlock = valueLines.length
    ? `<div style="margin:0 28px 4px;padding:14px 18px;background:rgba(56,189,248,.05);border-left:3px solid #38bdf8;border-radius:0 10px 10px 0">` +
      valueLines.map((l, i) => `<p style="margin:${i === valueLines.length - 1 ? '0' : '0 0 10px'};color:#bcd4e3;font-size:13.5px;line-height:1.6">${l}</p>`).join('') +
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
      ${row('Protein', `${m.proteinG} g`)}
      ${row('Net carbs', `${m.carbG} g`)}
      ${row('Your TDEE (maintenance)', `${Number(m.tdee).toLocaleString()} kcal`)}
    </table>
    ${valueBlock}
    <div style="padding:20px 28px 26px">
      <p style="margin:0 0 16px;color:#9fb8c9;font-size:13px;line-height:1.6">Hit the protein number first, use fat to stay full, and keep net carbs (total carbs minus fiber) under target. Give it two weeks before you judge anything.</p>
      <a href="https://ketodial.com/recipes/?utm_source=plan_email&utm_medium=email&utm_campaign=plan_delivery" style="display:inline-block;background:transparent;border:1px solid #38bdf8;color:#38bdf8;font-weight:700;font-size:13px;padding:9px 16px;border-radius:10px;text-decoration:none">Browse keto recipes with these macros</a>
    </div>
    <div style="margin:0 28px 26px;padding:18px 20px;background:rgba(56,189,248,.07);border:1px solid #1e3a52;border-radius:12px">
      <p style="margin:0 0 8px;color:#6da6c9;font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Turn these numbers into a plan</p>
      <p style="margin:0 0 10px;color:#bcd4e3;font-size:13px;line-height:1.6">These free numbers are the floor. The optional Step 3 details, your budget, how you like to cook, whether dairy agrees with you, are what turn the paid reports into a plan built for your actual kitchen.</p>
      <p style="margin:0 0 14px;color:#bcd4e3;font-size:13px;line-height:1.6">The Full Protocol is all three reports for $10.99: a 7-day meal plan built around your exact macros, a starter kit that walks you through the first 14 days, and a doctor-ready report you can hand over at your next appointment. One-time payment, no subscription, yours to keep.</p>
      <a href="https://ketodial.com/?utm_source=plan_email&utm_medium=email&utm_campaign=protocol_upsell#calc" style="display:inline-block;background:#38bdf8;color:#062234;font-weight:700;font-size:14px;padding:11px 22px;border-radius:10px;text-decoration:none">Get the Full Protocol</a>
      <p style="margin:12px 0 0;color:#6da6c9;font-size:12px;line-height:1.5">Only want one piece? <a href="https://ketodial.com/?utm_source=plan_email&utm_medium=email&utm_campaign=protocol_upsell#calc" style="color:#6da6c9;text-decoration:underline">Single reports start at $3.99.</a></p>
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
    const m = b.macros || {};
    if (!m.calories || !m.fatG || !m.proteinG || m.carbG == null || !m.tdee) {
      return jsonResponse(400, { error: 'Macros required' });
    }
    if (!env.RESEND_API_KEY) {
      return jsonResponse(500, { error: 'Email not configured' });
    }

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
        reply_to: 'iambrew@gmail.com',
        subject: `Your keto plan: ${Number(m.calories).toLocaleString()} kcal · ${m.proteinG}g protein · ${m.carbG}g net carbs`,
        html: buildPlanEmail(m, b.goal, {
          age: b.age,
          sex: b.sex,
          activity: b.activity,
          newsletterOptIn: !!b.newsletter_opt_in,
          unsubUrl,
        }),
        // Same tag shape as the CW welcome sender so the /webhook/resend
        // open/click tracking can segment plan emails in drip_events.
        tags: [
          { name: 'email_type', value: 'plan' },
          { name: 'site', value: 'kd' },
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
    sessionParams.append('return_url', 'https://ketodial.com/?success=true&session_id={CHECKOUT_SESSION_ID}');
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

  // Verify webhook signature
  if (env.STRIPE_WEBHOOK_SECRET && sig) {
    const valid = await verifyWebhookSignature(payload, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) return jsonResponse(400, { error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

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
            body: JSON.stringify({
              payment_status: 'paid',
              amount_paid_cents: session.amount_total ?? null,
              paid_at: nowIso,
              payment_verified_at: nowIso,
              stripe_payment_intent_id: session.payment_intent || null,
              is_premium: true,
              step_completed: 4,
              updated_at: nowIso,
            }),
          }
        );
        if (!wb.ok) console.error('Payment writeback failed:', await wb.text());
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
    const baseUrl = 'https://ketodial-api.iambrew.workers.dev';
    const reportLinks = Array.from(reportTypes).map(type => ({
      type,
      name: REPORT_NAMES[type],
      url: `${baseUrl}/report/${session.id}?type=${type}`,
    }));

    // Send email via Resend
    await sendReportEmail(email, name, reportLinks, intake, env);

    console.log(`Reports sent to ${email} for session ${session.id}: ${Array.from(reportTypes).join(', ')}`);
  }

  return jsonResponse(200, { received: true });
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
      return new Response(intakeErrorPage(err), {
        status: 422,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    console.error(`Intake store unavailable serving report ${sessionId}:`, err.message);
    return new Response(intakeErrorPage(null), {
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
      return new Response(intakeErrorPage(err), {
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
function intakeErrorPage(err) {
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
    ? `<p><a href="https://ketodial.com/#step2">Go back to the calculator and finish the health
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

async function sendReportEmail(email, name, reportLinks, formData, env) {
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

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'KetoDial <reports@carnivoreweekly.com>',
      to: [email],
      subject: `${name}, your KetoDial reports are ready`,
      html: html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
  }
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

async function verifyWebhookSignature(payload, sig, secret) {
  // Simple timestamp + signature check
  const parts = {};
  sig.split(',').forEach(p => {
    const [k, v] = p.split('=');
    parts[k] = v;
  });
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig_bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig_bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * KetoDial API Worker
 *
 * Handles:
 *   POST /checkout     — Create Stripe Checkout Session
 *   POST /webhook      — Stripe webhook → generate reports → email customer
 *   GET  /report/:id   — Serve generated report (fetches from Stripe metadata)
 *
 * Env vars (wrangler secrets):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
 */

import {
  generateDoctorReport,
  generateMealPlan,
  generateStarterKit,
} from './reports.js';

const PRICE_MAP = {
  doctor: 'price_1TcvcxEVDfkpGz8w3XZgaWjN',
  meal: 'price_1TcvcyEVDfkpGz8wIVkjBfBA',
  starter: 'price_1TcvczEVDfkpGz8wNMsXPD4d',
  essentials: 'price_1Tcvd0EVDfkpGz8wft66SJ6g',
  protocol: 'price_1Tcvd0EVDfkpGz8wCtiZSJT6',
};

// Bundle → individual items mapping
const BUNDLE_EXPAND = {
  essentials: ['meal', 'starter'],
  protocol: ['doctor', 'meal', 'starter'],
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
    return jsonResponse(200, { ok: true, token });
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
    const { items, email, name, formData } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonResponse(400, { error: 'No items selected' });
    }

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
    if (formData) {
      sessionParams.append('metadata[form_data]', JSON.stringify(formData).slice(0, 490));
    }

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
    const email = session.customer_email || session.customer_details?.email;
    const name = session.metadata?.customer_name || 'there';
    const items = (session.metadata?.items || '').split(',').filter(Boolean);
    const formData = safeParseJSON(session.metadata?.form_data);

    if (!email || items.length === 0) {
      console.error('Missing email or items in session:', session.id);
      return jsonResponse(200, { received: true });
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
    await sendReportEmail(email, name, reportLinks, formData, env);

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
  const formData = safeParseJSON(session.metadata.form_data) || {};
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

  // Generate the appropriate report
  let html;
  switch (reportType) {
    case 'doctor': html = generateDoctorReport(name, formData); break;
    case 'meal': html = generateMealPlan(name, formData); break;
    case 'starter': html = generateStarterKit(name, formData); break;
    default: html = generateAllReports(name, formData, allReports); break;
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
<strong>Your daily targets:</strong> ${formData.calories || '—'} kcal · ${formData.fatG || '—'}g fat · ${formData.proteinG || '—'}g protein · ${formData.carbG || '—'}g net carbs
</div>
<p style="margin-top:20px;font-size:13px;color:#94a3b8">These links are unique to your purchase and don't expire. Bookmark them for easy access.</p>
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

function safeParseJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

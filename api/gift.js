// Gift a report (Brew, 2026-10-11). One module for CW, KetoDial and PescoDial.
//
// A buyer pays for someone else's report. The Stripe webhook mints a single-use code,
// stores it in Supabase `gift_codes`, and emails the buyer a card they can forward or
// print. The recipient enters the code in the normal calculator, so every safety check
// on the self-purchase path runs for them unchanged.
//
// WHY NOT A STRIPE 100%-OFF PROMOTION CODE: the CW free path skips Stripe, so Stripe's
// max_redemptions is never enforced there (bead c47q), and the KD webhook drops
// sessions whose payment_status is 'no_payment_required'. Our own row, claimed with
// one conditional UPDATE, is single-use by construction.

import GIFT_COPY from './gift-copy.js';

export { GIFT_COPY };

// No 0/O, 1/I/L: the code is read off paper by someone who did not buy it.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const GIFT_CODE_RE = /^(CW|KD|PD)-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
const CARD_TOKEN_RE = /^[a-f0-9]{32}$/;
export const KD_GIFT_REF_RE = /^kg_[a-f0-9]{32}$/;

export const GIFT_BRANDS = {
  cw: {
    name: 'Carnivore Weekly',
    from: 'Carnivore Weekly <reports@carnivoreweekly.com>',
    replyTo: 'sarah@carnivoreweekly.com',
    site: 'https://carnivoreweekly.com',
    redeemPath: '/gift/redeem/',
    giftPath: '/gift/',
    amountCents: 2900,
    bg: '#F2F0E6', paper: '#fffdf7', ink: '#1a120b', soft: '#5c4433', accent: '#8b4513',
    rule: '#d4a574', accentInk: '#ffffff',
    serif: "Georgia, 'Times New Roman', serif",
    sans: "Georgia, 'Times New Roman', serif",
  },
  kd: {
    name: 'KetoDial',
    from: 'KetoDial <ketodial@ketodial.com>',
    replyTo: 'ketodial@carnivoreweekly.com',
    site: 'https://ketodial.com',
    redeemPath: '/gift/redeem/',
    giftPath: '/gift/',
    amountCents: 1099,
    bg: '#e7edf3', paper: '#ffffff', ink: '#0f172a', soft: '#475569', accent: '#0b1620',
    rule: '#38bdf8', accentInk: '#ffffff',
    serif: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    sans: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  pd: {
    name: 'PescoDial',
    from: 'PescoDial <reports@pescodial.com>',
    replyTo: 'pescodial@carnivoreweekly.com',
    // www, not the apex: the apex is a forward that drops path and query.
    site: 'https://www.pescodial.com',
    redeemPath: '/gift/redeem/',
    giftPath: '/gift/',
    amountCents: 2900,
    bg: '#f7f0e3', paper: '#fffbf4', ink: '#1f2328', soft: '#4a4f57', accent: '#b04f2c',
    rule: '#d8ccb6', accentInk: '#ffffff',
    serif: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    sans: "'Atkinson Hyperlegible', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
};

// ---------------------------------------------------------------------------
// Minting
// ---------------------------------------------------------------------------

export function mintGiftCode(site, rand = crypto.getRandomValues.bind(crypto)) {
  const prefix = String(site).toUpperCase();
  if (!GIFT_BRANDS[site]) throw new Error(`unknown gift site ${site}`);
  // Rejection sampling: 256 is not a multiple of 31, so plain modulo would bias.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let body = '';
  while (body.length < 8) {
    const buf = rand(new Uint8Array(16));
    for (const b of buf) {
      if (b < limit && body.length < 8) body += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return `${prefix}-${body}`;
}

export function randomHex(bytes = 16) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeGiftCode(raw) {
  // Forgive spaces, lower case and a missing or doubled dash ("cw abcd2345").
  const s = String(raw || '').toUpperCase().replace(/[\s‐-―]+/g, '').replace(/-+/g, '-');
  const m = /^(CW|KD|PD)-?([A-Z0-9]{8})$/.exec(s);
  return m ? `${m[1]}-${m[2]}` : s;
}

export function looksLikeGiftCode(raw) {
  return /^(CW|KD|PD)-[A-Z0-9]{8}$/.test(normalizeGiftCode(raw));
}

export function giftSiteOfCode(code) {
  const m = GIFT_CODE_RE.exec(code || '');
  return m ? m[1].toLowerCase() : null;
}

// ---------------------------------------------------------------------------
// Input cleaning (buyer-supplied text that ends up on a card)
// ---------------------------------------------------------------------------

export function cleanGiftText(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fill(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : vars[k]));
}

// ---------------------------------------------------------------------------
// Supabase (PostgREST, service role)
// ---------------------------------------------------------------------------

function sbHeaders(env, extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function sbJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

export async function getGiftBy(env, column, value) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/gift_codes?${column}=eq.${encodeURIComponent(value)}&limit=1`,
    { headers: sbHeaders(env, { Accept: 'application/json' }) });
  if (!res.ok) throw new Error(`gift lookup failed: ${res.status}`);
  const rows = await sbJson(res);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/**
 * Insert one gift row per Stripe checkout session. Idempotent: a webhook retry
 * collides on stripe_session_id and gets the original row back, never a second code.
 */
export async function insertGiftOnce(env, row) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/gift_codes?on_conflict=stripe_session_id`, {
      method: 'POST',
      headers: sbHeaders(env, { Prefer: 'resolution=ignore-duplicates,return=representation' }),
      body: JSON.stringify(row),
    });
    if (res.ok) {
      const rows = await sbJson(res);
      if (Array.isArray(rows) && rows.length) return { row: rows[0], created: true };
      const existing = await getGiftBy(env, 'stripe_session_id', row.stripe_session_id);
      if (existing) return { row: existing, created: false };
      throw new Error('gift insert ignored but no row found');
    }
    const body = await res.text();
    // A code or card-token collision (1 in ~10^12) gets fresh randomness and another go.
    if (res.status === 409 && /code_key|card_token_key/.test(body)) {
      row = { ...row, code: mintGiftCode(row.site), card_token: randomHex(16) };
      continue;
    }
    throw new Error(`gift insert failed: ${res.status} ${body.slice(0, 200)}`);
  }
  throw new Error('gift insert failed after retries');
}

/**
 * The single-use guard. One conditional UPDATE: the second of two concurrent claims
 * re-checks status='active' after the first commits and matches nothing.
 * Returns the claimed row, or null when the code is unknown, used, void or for
 * another site.
 */
export async function claimGift(env, code, site, email) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/gift_codes?code=eq.${encodeURIComponent(code)}` +
    `&site=eq.${encodeURIComponent(site)}&status=eq.active`, {
      method: 'PATCH',
      headers: sbHeaders(env, { Prefer: 'return=representation' }),
      body: JSON.stringify({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemed_email: String(email || '').trim().toLowerCase() || null,
      }),
    });
  if (!res.ok) throw new Error(`gift claim failed: ${res.status}`);
  const rows = await sbJson(res);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/** Record what a claimed code produced. */
export async function attachRedemption(env, id, fields) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/gift_codes?id=eq.${id}`, {
    method: 'PATCH', headers: sbHeaders(env, { Prefer: 'return=minimal' }),
    body: JSON.stringify(fields),
  });
  return res.ok;
}

/**
 * Give a claimed code back when the redemption could not be completed, so a failure
 * on our side never burns the recipient's gift. Guarded on the row still having no
 * redemption attached.
 */
export async function releaseGift(env, id) {
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/gift_codes?id=eq.${id}&status=eq.redeemed&redeemed_session_id=is.null`, {
        method: 'PATCH', headers: sbHeaders(env, { Prefer: 'return=minimal' }),
        body: JSON.stringify({ status: 'active', redeemed_at: null, redeemed_email: null }),
      });
    return res.ok;
  } catch { return false; }
}

/** Refund: an unredeemed gift stops working. A redeemed one is left alone. */
export async function voidGiftForPaymentIntent(env, paymentIntent, reason) {
  if (!paymentIntent) return 0;
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/gift_codes?stripe_payment_intent=eq.${encodeURIComponent(paymentIntent)}&status=eq.active`, {
      method: 'PATCH', headers: sbHeaders(env, { Prefer: 'return=representation' }),
      body: JSON.stringify({ status: 'void', void_reason: reason || 'refunded' }),
    });
  if (!res.ok) throw new Error(`gift void failed: ${res.status}`);
  const rows = await sbJson(res);
  return Array.isArray(rows) ? rows.length : 0;
}

/** What a code box should say about a code, without claiming it. */
export async function describeGiftCode(env, rawCode, expectedSite) {
  const code = normalizeGiftCode(rawCode);
  if (!GIFT_CODE_RE.test(code)) return { ok: false, reason: 'invalid', code };
  const row = await getGiftBy(env, 'code', code);
  if (!row || row.status === 'void') return { ok: false, reason: 'invalid', code };
  if (expectedSite && row.site !== expectedSite) return { ok: false, reason: 'wrong_site', code, site: row.site };
  if (row.status === 'redeemed') return { ok: false, reason: 'used', code };
  return { ok: true, code, site: row.site, recipient_name: row.recipient_name || '' };
}

export function giftErrorMessage(reason, site) {
  const copy = GIFT_COPY[site] || GIFT_COPY.cw;
  if (reason === 'used') return copy.redeem_page.error_used;
  if (reason === 'wrong_site') return 'This gift code belongs to one of our other sites. Please use the link on your gift card.';
  return copy.redeem_page.error_invalid;
}

// ---------------------------------------------------------------------------
// Checkout (one hosted Stripe page per gift; existing checkouts are untouched)
// ---------------------------------------------------------------------------

/**
 * Validate a gift purchase request. Returns { error } or the cleaned fields.
 * Buyer and recipient names are required: the card reads "From ..." and is addressed.
 */
export function parseGiftPurchase(body, isPlausibleEmail) {
  const site = String(body && body.site || '').toLowerCase();
  if (!GIFT_BRANDS[site]) return { error: 'Unknown site' };
  const buyer_email = String(body.buyer_email || '').trim().toLowerCase();
  if (!buyer_email || (isPlausibleEmail ? !isPlausibleEmail(buyer_email) : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer_email))) {
    return { error: 'Please enter a valid email address so we can send you the gift card.' };
  }
  const buyer_name = cleanGiftText(body.buyer_name, 60);
  const recipient_name = cleanGiftText(body.recipient_name, 60);
  const note = cleanGiftText(body.note, 280);
  if (!buyer_name) return { error: 'Please add your name. It goes on the card.' };
  if (!recipient_name) return { error: 'Please add their first name. The card is addressed to them.' };
  return { site, buyer_email, buyer_name, recipient_name, note };
}

/**
 * Build the Stripe Checkout form body for a gift. The price is server-side only.
 * `linePrefix` lets each worker supply its own existing price (CW price id, KD
 * protocol price id) or PescoDial's inline price_data with branding.
 */
export function giftCheckoutForm(g, lineItemFields, extraFields = {}) {
  const brand = GIFT_BRANDS[g.site];
  const f = new URLSearchParams();
  f.append('mode', 'payment');
  f.append('payment_method_types[]', 'card');
  for (const [k, v] of Object.entries(lineItemFields)) f.append(k, v);
  f.append('line_items[0][quantity]', '1');
  f.append('customer_email', g.buyer_email);
  f.append('success_url', `${brand.site}${brand.giftPath}?bought=1&cs={CHECKOUT_SESSION_ID}`);
  f.append('cancel_url', `${brand.site}${brand.giftPath}?cancelled=1`);
  // Gifts take no discount codes: a 50% drip code on a gift is a pricing decision
  // nobody has made.
  f.append('metadata[kind]', 'gift');
  f.append('metadata[gift_site]', g.site);
  f.append('metadata[buyer_name]', g.buyer_name);
  f.append('metadata[recipient_name]', g.recipient_name);
  if (g.note) f.append('metadata[note]', g.note);
  f.append('payment_intent_data[metadata][kind]', 'gift');
  f.append('payment_intent_data[metadata][gift_site]', g.site);
  for (const [k, v] of Object.entries(extraFields)) f.append(k, v);
  return f;
}

export async function createStripeCheckout(env, form) {
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const json = await sbJson(res);
  if (!res.ok || !json || !json.url) {
    throw new Error(`stripe gift checkout failed: ${res.status} ${JSON.stringify(json && json.error || {}).slice(0, 200)}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Webhook: a paid gift checkout becomes a code and a card
// ---------------------------------------------------------------------------

export function isGiftCheckout(obj) {
  return !!(obj && obj.metadata && obj.metadata.kind === 'gift' && GIFT_BRANDS[obj.metadata.gift_site]);
}

/**
 * Idempotent end to end: the row is keyed on the Stripe session, and the email is
 * keyed on the row (Resend idempotency key + email_sent_at). Safe on every retry.
 * Returns { ok, code, emailed } or throws to make Stripe retry.
 */
export async function fulfillGiftCheckout(env, obj) {
  const site = obj.metadata.gift_site;
  if (obj.payment_status && obj.payment_status !== 'paid') {
    return { ok: false, reason: `payment_status=${obj.payment_status}` };
  }
  const buyerEmail = (obj.customer_email || obj.customer_details?.email || '').trim().toLowerCase();
  if (!buyerEmail) throw new Error(`gift ${obj.id}: no buyer email`);

  const { row } = await insertGiftOnce(env, {
    site,
    code: mintGiftCode(site),
    card_token: randomHex(16),
    stripe_session_id: obj.id,
    stripe_payment_intent: obj.payment_intent || null,
    amount_cents: obj.amount_total ?? null,
    currency: obj.currency || null,
    buyer_email: buyerEmail,
    buyer_name: cleanGiftText(obj.metadata.buyer_name, 60) || null,
    recipient_name: cleanGiftText(obj.metadata.recipient_name, 60) || null,
    note: cleanGiftText(obj.metadata.note, 280) || null,
  });

  if (row.email_sent_at) return { ok: true, code: row.code, emailed: false, already: true };

  const email = buildGiftEmail(row, env);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `gift-card/${row.id}`,
    },
    body: JSON.stringify({
      from: GIFT_BRANDS[site].from,
      to: [row.buyer_email],
      reply_to: GIFT_BRANDS[site].replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: 'type', value: 'gift_card' }, { name: 'site', value: site }],
    }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    await alertUndelivered(env, row, detail);
    throw new Error(`gift card email failed: ${res.status} ${detail}`);
  }
  await attachRedemption(env, row.id, { email_sent_at: new Date().toISOString() });
  return { ok: true, code: row.code, emailed: true };
}

async function alertUndelivered(env, row, detail) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
        to: ['iambrew@gmail.com'],
        subject: `🚨 PAID BUT UNDELIVERED: ${row.site.toUpperCase()} gift card for ${row.buyer_email}`,
        html: `<p>Gift ${esc(row.code)} (Stripe ${esc(row.stripe_session_id)}) is paid and saved, but the card email failed. Stripe will retry. Card page: ${esc(cardUrl(row))}</p><pre>${esc(detail)}</pre>`,
      }),
    });
  } catch (_) { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Rendering: the card, the buyer's email, the printable page
// ---------------------------------------------------------------------------

export function redeemUrl(row) {
  const b = GIFT_BRANDS[row.site];
  return `${b.site}${b.redeemPath}?code=${encodeURIComponent(row.code)}`;
}

export function cardUrl(row) {
  return `https://carnivore-report-api-production.iambrew.workers.dev/gift/card/${row.card_token}`;
}

function displayRedeemUrl(row) {
  const b = GIFT_BRANDS[row.site];
  return `${b.site.replace(/^https:\/\/(www\.)?/, '')}${b.redeemPath.replace(/\/$/, '')}`;
}

/**
 * The card itself: a table so it survives Gmail, Apple Mail and Outlook, and so it
 * still reads correctly after a forward strips the outer email chrome.
 */
export function renderGiftCard(row) {
  const b = GIFT_BRANDS[row.site];
  const c = GIFT_COPY[row.site].card;
  const vars = {
    recipient_name: esc(row.recipient_name || ''),
    buyer_name: esc(row.buyer_name || ''),
    code: esc(row.code),
    url: esc(displayRedeemUrl(row)),
  };
  const title = row.recipient_name ? fill(c.title, vars) : esc(c.title_no_name);
  const from = row.buyer_name ? fill(c.line_from, vars) : '';
  const note = row.note
    ? `<tr><td style="padding:4px 32px 8px 32px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
           <td style="border-left:3px solid ${b.rule};padding:4px 0 4px 16px;font-family:${b.serif};font-size:17px;line-height:1.55;color:${b.ink};font-style:italic;">
             ${esc(row.note).replace(/\n/g, '<br>')}
           </td></tr></table>
       </td></tr>`
    : '';
  const link = esc(redeemUrl(row));
  return `
<table role="presentation" class="gift-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:${b.paper};border:1px solid ${b.rule};border-radius:14px;border-collapse:separate;">
  <tr><td style="height:8px;background:${b.accent};border-radius:13px 13px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px 32px 4px 32px;font-family:${b.sans};font-size:14px;color:${b.soft};">A gift from ${esc(b.name)}</td></tr>
  <tr><td style="padding:6px 32px 6px 32px;font-family:${b.serif};font-size:28px;line-height:1.25;font-weight:700;color:${b.ink};">${title}</td></tr>
  ${from ? `<tr><td style="padding:0 32px 14px 32px;font-family:${b.sans};font-size:15px;color:${b.soft};">${from}</td></tr>` : ''}
  ${note}
  <tr><td style="padding:10px 32px 18px 32px;font-family:${b.sans};font-size:16px;line-height:1.6;color:${b.ink};">${esc(c.body)}</td></tr>
  <tr><td align="center" style="padding:4px 32px 8px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border:2px dashed ${b.rule};border-radius:10px;"><tr>
      <td style="padding:14px 26px;font-family:'Courier New',Courier,monospace;font-size:26px;letter-spacing:4px;font-weight:700;color:${b.ink};">${vars.code}</td>
    </tr></table>
    <div style="font-family:${b.sans};font-size:12px;color:${b.soft};padding-top:6px;">Your gift code</div>
  </td></tr>
  <tr><td align="center" style="padding:16px 32px 10px 32px;">
    <a href="${link}" style="display:inline-block;background:${b.accent};color:${b.accentInk};font-family:${b.sans};font-size:17px;font-weight:700;text-decoration:none;padding:14px 30px;border-radius:8px;">${esc(c.cta_label)}</a>
  </td></tr>
  <tr><td style="padding:6px 32px 28px 32px;font-family:${b.sans};font-size:14px;line-height:1.5;color:${b.soft};text-align:center;">${fill(esc(c.redeem_instructions), vars)}</td></tr>
</table>`;
}

export function buildGiftEmail(row) {
  const b = GIFT_BRANDS[row.site];
  const e = GIFT_COPY[row.site].buyer_email;
  const rn = row.recipient_name || 'them';
  const vars = { recipient_name: esc(rn) };
  const subject = fill(e.subject, { recipient_name: rn });
  const printLink = esc(cardUrl(row));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${b.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(e.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${b.bg};"><tr><td style="padding:24px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;"><tr>
    <td style="padding:0 6px 18px 6px;font-family:${b.sans};font-size:16px;line-height:1.6;color:${b.ink};">
      ${row.buyer_name ? `<p style="margin:0 0 12px 0;">Hi ${esc(row.buyer_name)},</p>` : ''}
      <p style="margin:0 0 12px 0;">${fill(esc(e.intro), vars)}</p>
      <p style="margin:0;font-size:14px;color:${b.soft};">Printing it? <a href="${printLink}" style="color:${b.accent};">Open the printable card</a>.</p>
    </td></tr></table>
  ${renderGiftCard(row)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;"><tr>
    <td style="padding:18px 6px 0 6px;font-family:${b.sans};font-size:14px;line-height:1.6;color:${b.soft};">
      <p style="margin:0 0 8px 0;">${esc(e.after_card)}</p>
      <p style="margin:0;">${esc(b.name)}</p>
    </td></tr></table>
</td></tr></table>
</body></html>`;
  const c = GIFT_COPY[row.site].card;
  const text = [
    row.buyer_name ? `Hi ${row.buyer_name},` : '',
    fill(e.intro, { recipient_name: rn }),
    '',
    '----- GIFT CARD -----',
    row.recipient_name ? fill(c.title, { recipient_name: row.recipient_name }) : c.title_no_name,
    row.buyer_name ? fill(c.line_from, { buyer_name: row.buyer_name }) : '',
    row.note ? `"${row.note}"` : '',
    '',
    c.body,
    '',
    `Gift code: ${row.code}`,
    `Start here: ${redeemUrl(row)}`,
    '---------------------',
    '',
    `Printable card: ${cardUrl(row)}`,
    '',
    e.after_card,
    b.name,
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  return { subject, html, text };
}

/** Hosted card: same card, a print button, and a print stylesheet that drops the rest. */
export function renderGiftCardPage(row) {
  const b = GIFT_BRANDS[row.site];
  const title = row.recipient_name ? `A gift for ${row.recipient_name}` : 'A gift for you';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)} · ${esc(b.name)}</title>
<style>
  body{margin:0;background:${b.bg};padding:24px 14px;}
  .bar{max-width:560px;margin:0 auto 16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;font-family:${b.sans};}
  .bar button,.bar a{font:inherit;font-size:15px;padding:10px 18px;border-radius:8px;border:1px solid ${b.rule};background:${b.paper};color:${b.ink};cursor:pointer;text-decoration:none;}
  @media print{body{background:#fff;padding:0}.bar{display:none}.gift-card{border:1px solid #999 !important;}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head>
<body>
  <div class="bar"><button type="button" onclick="window.print()">Print this card</button><a href="${esc(redeemUrl(row))}">Use the code now</a></div>
  ${renderGiftCard(row)}
</body></html>`;
}

// ---------------------------------------------------------------------------
// Read-only endpoints shared by all three sites (served by the CW worker)
// ---------------------------------------------------------------------------

/** GET /gift/card/:token */
export async function handleGiftCardPage(env, token) {
  if (!CARD_TOKEN_RE.test(token || '')) return new Response('Not found', { status: 404 });
  const row = await getGiftBy(env, 'card_token', token);
  if (!row || row.status === 'void') return new Response('This gift card is not available.', { status: 404 });
  return new Response(renderGiftCardPage(row), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/**
 * GET /gift/status?cs=cs_...  The buyer's thank-you page shows the card link as soon
 * as the webhook has minted it, so a slow inbox never leaves them waiting. The Stripe
 * session id is only ever in the buyer's own success URL.
 */
export async function giftStatusForCheckout(env, cs) {
  if (!/^cs_(live|test)_[A-Za-z0-9_]{1,200}$/.test(cs || '')) return { status: 400, body: { error: 'bad_reference' } };
  const row = await getGiftBy(env, 'stripe_session_id', cs);
  if (!row) return { status: 200, body: { ready: false } };
  return {
    status: 200,
    body: {
      ready: true,
      card_url: cardUrl(row),
      emailed: !!row.email_sent_at,
      buyer_email: row.buyer_email,
      recipient_name: row.recipient_name || '',
    },
  };
}

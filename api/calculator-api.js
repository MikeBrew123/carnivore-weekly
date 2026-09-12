/**
 * Cloudflare Worker: Calculator API - UNIFIED
 * Leo's Complete Implementation: All payment & report endpoints
 * Philosophy: "ACID properties don't negotiate. All-or-nothing, always."
 *
 * COMPLETE ENDPOINT REFERENCE:
 * 1. POST /api/v1/calculator/session - Create new session
 * 2. POST /api/v1/calculator/step/{1-4} - Save form steps
 * 3. GET /api/v1/calculator/payment/tiers - Fetch available tiers
 * 4. POST /api/v1/calculator/payment/initiate - Start Stripe checkout
 * 5. POST /api/v1/calculator/payment/verify - Verify payment + unlock step 4
 * 6. GET /api/v1/calculator/report/{token}/status - Track report generation
 * 7. POST /api/v1/calculator/report/init - Initialize report generation
 * 8. GET /api/v1/calculator/report/{token}/content - Get generated report HTML
 * 9. POST /api/v1/calculator/validate - Check if session is premium
 *
 * ETSY INTEGRATION ENDPOINTS:
 * 10. GET /etsy/callback - OAuth callback handler
 * 11. POST /api/v1/etsy/refresh - Refresh access token
 * 12. GET /api/v1/etsy/shop - Get shop info
 * 13. POST /api/v1/etsy/listings - Create listing
 *
 * Environment Variables Required:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 * - SUPABASE_ANON_KEY: Anonymous key for public access
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_PUBLISHABLE_KEY: Stripe publishable key
 * - CLAUDE_API_KEY: Anthropic Claude API key
 * - FRONTEND_URL: Frontend domain for CORS
 * - API_BASE_URL: API base URL
 * - ETSY_CLIENT_ID: Etsy API key
 * - ETSY_CLIENT_SECRET: Etsy shared secret
 * - ETSY_REDIRECT_URI: OAuth callback URL
 *
 * Deploy with: cd api && npm run deploy:production   (wrangler deploy --env production)
 * A bare `wrangler deploy` targets the top-level (development) Worker, not the
 * production one the live site calls. Use npm run deploy:dev for that on purpose.
 */

import {
  deriveMedicalContext,
  buildMedicalContextBanner,
  buildAdaptationOutlook,
  assertNoDeterministicOutcomes,
  assertNoAdvocacy,
  buildElectrolyteProtocol,
  buildMedicalSafetyRules,
  buildProteinTargetNote,
  buildMealPlanMedicalNote,
  withMedicalFoodExclusions,
  humanizeList,
  buildSymptomDisclosure,
  assertNoConditionClaimFrames,
  assertNoUnfoundedClearance,
} from './medical-context.js';
import { resolveGoal, detectGoalConflict } from './goal-semantics.js';

// Version marker for deployment verification
const DEPLOY_VERSION = "v2026-06-07-resend-webhook";

// ===== CANARY TOKENS (honeytokens) =====
//
// A canary token is a credential with no power that exists only to be stolen.
// Nothing legitimate ever sends one, so a single hit means someone found a
// planted key or URL and tried it. Placements are minted by
// scripts/canary_mint.py and recorded in secrets/canary-tokens.json (gitignored).
//
// DO NOT "fix", rotate, or remove these. They are inert by design and grant
// nothing. See docs/guides/canary-tokens.md.
//
// Two shapes, both matched on prefix so planting a new one needs no redeploy:
//   cw_live_sk_<placement>_<random>   a fake API key   -> fires when USED
//   /api/v1/hooks/cwc_<placement>_..  a fake webhook   -> fires when FETCHED
//
// Everything here is wrapped so a canary can never break a real request.

const CANARY_KEY_PREFIX = 'cw_live_sk_';
const CANARY_URL_PREFIX = 'cwc_';

function findCanaryToken(request, url) {
  // Header and query string only. Bodies are deliberately not read: consuming
  // the stream here would break every downstream handler.
  const probes = [
    request.headers.get('Authorization') || '',
    request.headers.get('X-Api-Key') || '',
    url.searchParams.get('key') || '',
    url.searchParams.get('api_key') || '',
    url.searchParams.get('token') || '',
  ];
  for (const p of probes) {
    const i = p.indexOf(CANARY_KEY_PREFIX);
    if (i !== -1) return p.slice(i).split(/[^A-Za-z0-9_]/)[0];
  }
  return null;
}

function canaryPlacement(token) {
  // cw_live_sk_ghpub_a1b2c3  ->  ghpub        (where we planted it)
  const rest = token.replace(CANARY_KEY_PREFIX, '').replace(CANARY_URL_PREFIX, '');
  const label = rest.split('_')[0];
  return label || 'unknown';
}

// --- Is this us being helpful, or somebody else? ---
//
// The useful question is not "what user agent is this" but "could this request
// have come from where we planted the token". A key planted on the Mac can only
// legitimately be used from the Mac. The same key arriving from a datacenter in
// another country means the file left the machine, which is the whole point of
// planting it.
//
// Tunable without a redeploy via wrangler secret/vars:
//   CANARY_TRUSTED_IPS   comma-separated exact IPs (home, VPS)
//   CANARY_HOME_ASNS     comma-separated ASNs we consider "our own line"

const CANARY_DEFAULT_HOME_ASNS = ['852'];        // TELUS (Brew's ISP)
const CANARY_LOCAL_ONLY = ['mac', 'vault', 'env', 'laptop'];  // placement prefixes that must never travel
const CANARY_PUBLIC = ['ghpub'];                 // planted somewhere public on purpose

// Hosting/cloud networks. A bait file on a laptop has no business calling from
// one of these, so it is a strong signal on its own.
const CANARY_HOSTING = /amazon|aws|google|azure|microsoft|digitalocean|linode|akamai|hetzner|ovh|scaleway|vultr|contabo|alibaba|tencent|oracle|choopa|leaseweb|m247|datacamp|cogent|hostinger|namecheap|godaddy|cloudflare|fastly|censys|shodan|internet-measurement|driftnet|palo alto|recyber|binaryedge/i;

// Runtimes that scripts and agents use. Not incriminating by itself: our own
// tooling looks exactly like this. It only matters next to the origin.
const CANARY_TOOL_UA = /curl|wget|python|node|undici|axios|got\/|okhttp|java|go-http|libwww|powershell|httpie|insomnia|postman|claude|anthropic/i;
const CANARY_SCANNER_UA = /zgrab|masscan|nmap|nuclei|sqlmap|dirbuster|gobuster|feroxbuster|censys|shodan|internet-?measurement|expanse|paloalto|bot\b|spider|crawler/i;

function classifyCaller(request, cf, env, placement) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const asn = String(cf.asn || '');
  const org = cf.asOrganization || '';
  const country = cf.country || '';

  const trustedIps = String(env.CANARY_TRUSTED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  const homeAsns = String(env.CANARY_HOME_ASNS || '').split(',').map(s => s.trim()).filter(Boolean);
  const homeAsnList = homeAsns.length ? homeAsns : CANARY_DEFAULT_HOME_ASNS;

  const p = (placement || '').toLowerCase();
  const isLocalOnly = CANARY_LOCAL_ONLY.some(x => p.startsWith(x));
  const isPublic = CANARY_PUBLIC.some(x => p.startsWith(x));

  const onTrustedIp = trustedIps.includes(ip);
  const onHomeAsn = homeAsnList.includes(asn);
  const fromHosting = CANARY_HOSTING.test(org);
  const scannerUa = CANARY_SCANNER_UA.test(ua);
  const toolUa = CANARY_TOOL_UA.test(ua);

  const why = [];
  let verdict;

  if (isPublic) {
    // Planted in the open. A hit is a measurement, not an incident.
    verdict = 'EXPECTED';
    why.push('this token was planted somewhere public on purpose, so anyone can find it');
    if (fromHosting) why.push(`fetched from hosting infrastructure (${org}) — consistent with an automated harvester`);
    if (scannerUa) why.push(`scanner user agent (${ua.slice(0, 60)})`);
  } else if (onTrustedIp) {
    verdict = 'INTERNAL';
    why.push(`came from a known address of yours (${ip})`);
    why.push(toolUa ? 'tool or agent user agent, which is what your own scripts look like'
                    : 'user agent is not a known tool, worth a glance');
  } else if (onHomeAsn && !fromHosting) {
    verdict = 'PROBABLY INTERNAL';
    why.push(`came from your own ISP (AS${asn} ${org}), so most likely your machine on a new address`);
    why.push('confirm the IP looks like yours before dismissing it');
  } else if (isLocalOnly) {
    verdict = 'EXTERNAL';
    why.push('this token was only ever readable on your own machine, and this request did not come from it');
    why.push(`origin: ${ip} · ${org || 'unknown network'} · ${country}`);
    if (fromHosting) why.push('hosting network, so the file is being used from a server, not a laptop');
    why.push('treat as the file having left the machine');
  } else if (fromHosting || scannerUa) {
    verdict = 'EXTERNAL';
    why.push(`hosting network or scanner signature (${org || ua.slice(0, 40)})`);
  } else {
    verdict = 'UNCLEAR';
    why.push(`unrecognised origin: ${ip} · ${org || 'unknown network'} · ${country}`);
    why.push('not one of your known addresses, but not obviously hostile either');
  }

  return { verdict, why, onTrustedIp, onHomeAsn, fromHosting, scannerUa, toolUa };
}

async function alertCanary(env, ctx, detail) {
  try {
    if (!env.RESEND_API_KEY) return;

    // One alert per token+IP per hour, so a scanner hammering the endpoint
    // cannot turn into a thousand emails.
    const bucket = `canary:alert:${detail.token}:${detail.ip}`;
    if (env.ETSY_AUTH_KV) {
      const seen = await env.ETSY_AUTH_KV.get(bucket);
      if (seen) return;
      await env.ETSY_AUTH_KV.put(bucket, '1', { expirationTtl: 3600 });
    }

    const rows = Object.entries(detail)
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-family:monospace;font-size:12px;vertical-align:top">${k}</td><td style="padding:4px 0;font-family:monospace;font-size:12px">${String(v ?? '').slice(0, 400).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</td></tr>`)
      .join('');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Canary <canary@carnivoreweekly.com>',
        to: ['iambrew@gmail.com'],
        subject: `CANARY [${detail.verdict}] ${detail.placement} - ${detail.ip} ${detail.asn_org ? '(' + detail.asn_org + ')' : ''}`.trim(),
        html:
          `<div style="font-family:system-ui,sans-serif;max-width:640px">` +
          `<h2 style="color:${detail.verdict === 'EXTERNAL' ? '#b91c1c' : detail.verdict === 'INTERNAL' ? '#0f766e' : '#b45309'};margin:0 0 6px">Canary tripped &mdash; ${detail.verdict}</h2>` +
          `<p style="color:#475569;line-height:1.6;margin:0 0 14px">${detail.reasoning}</p>` +
          `<p style="color:#475569;line-height:1.5;margin:0 0 18px;font-size:13px">A planted credential was used. The token grants nothing, so no data was exposed by this request.</p>` +
          `<table style="border-collapse:collapse;width:100%">${rows}</table>` +
          `<p style="color:#94a3b8;font-size:12px;margin-top:20px;line-height:1.5">The token grants nothing and no data was exposed by this request. Placement map: secrets/canary-tokens.json. Runbook: docs/guides/canary-tokens.md</p>` +
          `</div>`,
      }),
    });
  } catch (e) {
    // A canary must never take the API down with it.
    console.error('[canary] alert failed:', e && e.message);
  }
}

function canaryTripped(request, url, env, ctx) {
  try {
    const isHook = url.pathname.startsWith('/api/v1/hooks/');
    const token = isHook
      ? url.pathname.split('/api/v1/hooks/')[1].split('/')[0]
      : findCanaryToken(request, url);

    if (!token) return null;
    if (!token.startsWith(CANARY_KEY_PREFIX) && !token.startsWith(CANARY_URL_PREFIX)) return null;

    const cf = request.cf || {};
    const placement = canaryPlacement(token);
    const call = classifyCaller(request, cf, env, placement);
    const detail = {
      verdict: call.verdict,
      reasoning: call.why.join('; '),
      placement,
      token: token.slice(0, 48),
      kind: isHook ? 'url fetched' : 'key used',
      ip: request.headers.get('CF-Connecting-IP') || 'unknown',
      country: cf.country || 'unknown',
      asn: cf.asOrganization ? `${cf.asOrganization} (AS${cf.asn})` : 'unknown',
      asn_org: cf.asOrganization || '',
      method: request.method,
      url: url.toString(),
      user_agent: request.headers.get('User-Agent') || 'none',
      referer: request.headers.get('Referer') || 'none',
      at: new Date().toISOString(),
    };

    console.log('[canary]', JSON.stringify(detail));
    const send = alertCanary(env, ctx, detail);
    if (ctx && ctx.waitUntil) ctx.waitUntil(send);

    // Answer exactly like the real thing would to an unauthorised caller, so a
    // prober learns nothing and has no reason to think they were seen.
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[canary] check failed:', e && e.message);
    return null;
  }
}

// ===== UTILITY FUNCTIONS =====

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateSessionToken() {
  // Generate UUID-like token
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

function generateAccessToken() {
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function createErrorResponse(code, message, statusCode = 400, details) {
  const response = new Response(JSON.stringify({ code, message, ...(details && { details }) }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(response);
}

function createSuccessResponse(data, statusCode = 200) {
  const response = new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
  return addCorsHeaders(response);
}

function addCorsHeaders(response, origin = '*') {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch (err) {
    throw new Error('Invalid JSON body');
  }
}

function validateContentType(request, expected = 'application/json') {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes(expected);
}

function isValidEmail(email) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

// ===== SIGNUP EMAIL DELIVERABILITY =====
// A syntactically valid address can still be undeliverable forever. Two real
// signups were lost to this, one at 'gmail.vom' and one at 'yagoo.com': both
// passed every check we had, then bounced for weeks while the user assumed
// they had subscribed (ISSUE-067). The addresses themselves were removed from
// this repo on 2026-09-03; the domains are the part that matters here.
//
// Domains sorted by real subscriber counts, so the near-miss check is weighted
// toward what people here actually type.
const COMMON_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'aol.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'proton.me', 'protonmail.com', 'duck.com', 'comcast.net',
  'bellsouth.net', 'sbcglobal.net', 'msn.com', 'live.com', 'me.com',
  'yahoo.ca', 'shaw.ca', 'rogers.com', 'telus.net', 'verizon.net',
];

function levenshtein(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99; // cheap bail, we only care about <=2
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

// Returns the corrected address, or null when nothing is obviously close.
function suggestEmailFix(email) {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null;

  let best = null;
  let bestDist = 99;
  for (const candidate of COMMON_EMAIL_DOMAINS) {
    const d = levenshtein(domain, candidate);
    // Distance 1 is a confident single-character slip (gmail.vom, yagoo.com).
    // Allow 2 only on longer domains, where two edits still read unambiguously
    // and a short domain like "duck.com" can't be dragged to something else.
    if (d < bestDist && (d === 1 || (d === 2 && candidate.length >= 10))) {
      best = candidate;
      bestDist = d;
    }
  }
  return best ? `${local}@${best}` : null;
}

// True = domain can plausibly receive mail (or we could not find out).
// FAILS OPEN on any DNS trouble: a signup must never be lost to our own
// resolver having a bad minute. Accepts an A record with no MX because RFC 5321
// still allows delivery there, and all four addresses that triggered this had
// neither.
async function domainHasMailRecords(domain) {
  const ask = async (type) => {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' } },
    );
    if (!res.ok) throw new Error(`DoH ${type} ${res.status}`);
    const body = await res.json();
    // Status 3 = NXDOMAIN, the domain itself does not exist.
    return { nx: body.Status === 3, hits: (body.Answer || []).filter(a => a.type === (type === 'MX' ? 15 : 1)) };
  };
  try {
    const mx = await ask('MX');
    if (mx.hits.length > 0) return true;
    if (mx.nx) return false;
    const a = await ask('A');
    return a.hits.length > 0;
  } catch (err) {
    console.warn(`DNS check failed for ${domain}, allowing signup:`, String(err));
    return true;
  }
}

// Single gate for anything that enrolls an address. Returns null when the
// address is fine, or an error response describing the problem.
// Blocking is decided ONLY by DNS, never by the near-miss guess: a real domain
// that happens to sit one character from gmail.com still resolves, so it passes.
// The guess only makes the message actionable.
async function checkEmailDeliverable(email) {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  if (await domainHasMailRecords(domain)) return null;

  const suggestion = suggestEmailFix(email);
  return createErrorResponse(
    'UNDELIVERABLE_EMAIL',
    suggestion
      ? `Did you mean ${suggestion}? We can't deliver to ${domain}.`
      : `We can't deliver mail to ${domain}. Please check the spelling.`,
    400,
    suggestion ? { suggestion } : undefined,
  );
}

// Rate limiter (in-memory for Workers)
const rateLimitStore = new Map();

function checkRateLimit(sessionToken, limit = 10) {
  const now = Date.now();
  const entry = rateLimitStore.get(sessionToken);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(sessionToken, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

// ===== COUPON VALIDATION (STRIPE INTEGRATION) =====

// Map user-facing promotion codes to Stripe coupon IDs
// To add new codes: Create coupon in Stripe Dashboard, then add mapping here
const stripeCouponMap = {
  // TEST999/TEST95 removed 2026-08-05 (Brew's Jul 17 retire-test-coupons decision;
  // their Stripe coupons DjCf14wH/ZnZXGHka no longer exist in live mode)
  'WELCOME10': 'kFK8x4SZ',    // 10% off once ($26.10)
  'WELCOME5': 'WELCOME5',     // $5 off once ($24) — drip Day 3 welcome offer
  'CARNIVORE20': 'R0cRj1NP',  // 20% off once ($23.20)
  'CARNIVORE50': '0yWiiOLv',  // 25% off once ($21.75) — name says 50 but it's actually 25% off 😏
  'THANKYOU25': 'ks9WVZAP',   // 25% off once ($21.75) — thank-you code for readers who report site issues
  'ETSY50': '52fYA51M',       // 50% off forever ($14.50) — Etsy cross-sell coupon
  'DRIP50': '52fYA51M',       // 50% off ($14.50) — Day 7 drip graduation reward
  // TEST99 removed - $0.10 below Stripe's 50 cent minimum
  'EARLY25': null,            // TODO: Create in Stripe
  'LAUNCH50': null,           // TODO: Create in Stripe
  'FRIEND15': null,           // TODO: Create in Stripe
};

/**
 * Validate coupon code via Stripe API
 * @param {string} code - User-entered promo code
 * @param {object} env - Environment variables (contains STRIPE_SECRET_KEY)
 * @returns {Promise<object>} - Validation result
 */
async function validateCoupon(code, env) {
  const upperCode = code?.toUpperCase();
  const stripeCouponId = stripeCouponMap[upperCode];

  if (!stripeCouponId) {
    // Not in the static map — check Stripe promotion codes. The drip
    // sequence mints per-subscriber codes (WEEK1-XXXX / GRAD-XXXX) with a
    // real expires_at; Stripe flips active=false at expiry, so the
    // active=true filter is the expiry enforcement.
    return await validatePromotionCode(upperCode, env);
  }

  try {
    // Fetch coupon from Stripe to verify it's active
    const stripeResponse = await fetch(`https://api.stripe.com/v1/coupons/${stripeCouponId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      },
    });

    if (!stripeResponse.ok) {
      console.error('Stripe coupon fetch failed:', await stripeResponse.text());
      return {
        valid: false,
        error: 'Coupon code not found or expired'
      };
    }

    const coupon = await stripeResponse.json();

    // Check if coupon is still valid
    if (!coupon.valid) {
      return {
        valid: false,
        error: 'Coupon has expired'
      };
    }

    return {
      valid: true,
      code: upperCode,
      stripe_coupon_id: stripeCouponId,
      percent: coupon.percent_off || 0,
      amount_off: coupon.amount_off || 0,
      currency: coupon.currency,
      description: coupon.name || upperCode
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      valid: false,
      error: 'Unable to validate coupon'
    };
  }
}

/**
 * Validate a Stripe promotion code (minted per-subscriber by the drip
 * sender) by looking it up via the Stripe API. Expired or fully-redeemed
 * codes come back active=false, so filtering active=true rejects them.
 * @param {string} upperCode - Uppercased user-entered code
 * @param {object} env - Environment variables (contains STRIPE_SECRET_KEY)
 * @returns {Promise<object>} - Same shape as validateCoupon, plus
 *   stripe_promotion_code_id when valid
 */
async function validatePromotionCode(upperCode, env) {
  if (!upperCode || !/^[A-Z0-9-]{4,40}$/.test(upperCode)) {
    return { valid: false, error: 'Coupon code not found or expired' };
  }

  try {
    const params = new URLSearchParams({ code: upperCode, active: 'true', limit: '1' });
    // Stripe-Version pinned: newer account-default versions changed the
    // promotion_code shape (no embedded coupon). The drip minter
    // (scripts/send_drip.py) pins the same version.
    const resp = await fetch(`https://api.stripe.com/v1/promotion_codes?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2024-06-20',
      },
    });

    if (!resp.ok) {
      console.error('Stripe promotion code lookup failed:', await resp.text());
      return { valid: false, error: 'Coupon code not found or expired' };
    }

    const { data } = await resp.json();
    const promo = data && data[0];
    if (!promo || !promo.active || !promo.coupon || !promo.coupon.valid) {
      return { valid: false, error: 'Coupon code not found or expired' };
    }

    return {
      valid: true,
      code: upperCode,
      stripe_promotion_code_id: promo.id,
      stripe_coupon_id: promo.coupon.id,
      percent: promo.coupon.percent_off || 0,
      amount_off: promo.coupon.amount_off || 0,
      currency: promo.coupon.currency,
      description: promo.coupon.name || upperCode,
      expires_at: promo.expires_at || null
    };
  } catch (error) {
    console.error('Error validating promotion code:', error);
    return { valid: false, error: 'Unable to validate coupon' };
  }
}

// ===== ROUTE HANDLERS =====

/**
 * POST /api/v1/calculator/session
 */
async function handleCreateSession(request, env) {
  try {
    const sessionToken = generateSessionToken();
    const now = new Date().toISOString();

    // Parse optional attribution data from request body
    let attribution = {};
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json();
        attribution = {
          ga_client_id: body.ga_client_id || null,
          utm_source: body.utm_source || null,
          utm_medium: body.utm_medium || null,
          utm_campaign: body.utm_campaign || null,
          utm_content: body.utm_content || null,
          utm_term: body.utm_term || null,
          referrer: body.referrer || null,
          landing_page: body.landing_page || null,
          device_type: body.device_type || null,
          // Persist email at creation when the client sends it (the calculator now
          // includes it in the create payload). This stops emailless funnel rows,
          // which also let the Stripe webhook's email-fallback match the row and
          // mark it paid — the cause of revenue under-counting in the v2 funnel.
          ...(body.email ? { email: body.email } : {}),
        };
      }
    } catch (_) { /* no body is fine */ }

    // Call Supabase REST API
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          session_token: sessionToken,
          step_completed: 1,
          is_premium: false,
          payment_status: 'pending',
          created_at: now,
          updated_at: now,
          ...attribution,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', response.status, errorText);
      return createErrorResponse('DB_INSERT_FAILED', `Failed to create session: ${response.status}`, 500);
    }

    const data = await response.json();
    const sessionRecord = Array.isArray(data) ? data[0] : data;
    const sessionId = sessionRecord?.id;

    return createSuccessResponse({
      session_token: sessionToken,
      session_id: sessionId,
      created_at: now,
    }, 201);
  } catch (err) {
    console.error('handleCreateSession error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/validate
 * Check if session is premium
 */
async function handleValidateSession(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token } = body;

    if (!session_token) {
      return createErrorResponse('MISSING_FIELDS', 'session_token required', 400);
    }

    // Fetch session
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];

    return createSuccessResponse({
      session_token,
      is_premium: true,
      payment_status: session.payment_status || 'pending',
      step_completed: session.step_completed || 1,
    });
  } catch (err) {
    console.error('handleValidateSession error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/survey
 * EXP-004 micro-survey: record what the user says they want next after the free
 * results (offer-message fit signal for the $29 report). Body: { session_token, next_step }.
 */
async function handleSaveSurvey(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }
    const body = await parseJsonBody(request);
    const { session_token, next_step } = body || {};
    if (!session_token || !next_step) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and next_step required', 400);
    }
    // Whitelist the options so the column stays clean and can't be written arbitrarily.
    const ALLOWED = ['eat_this_week', 'fat_protein_target', 'lose_without_stalling', 'meal_plan_grocery', 'starting_from_zero', 'not_sure'];
    if (!ALLOWED.includes(next_step)) {
      return createErrorResponse('INVALID_VALUE', 'next_step not recognized', 400);
    }
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(session_token)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ survey_next_step: next_step, updated_at: new Date().toISOString() }),
      }
    );
    if (!res.ok) {
      console.warn('[handleSaveSurvey] PATCH failed:', res.status, await res.text());
      return createErrorResponse('DB_UPDATE_FAILED', `Failed to save survey: ${res.status}`, 500);
    }
    return createSuccessResponse({ saved: true });
  } catch (err) {
    console.error('handleSaveSurvey error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/results-viewed
 * Record the first render of the free-results screen. Body: { session_token }.
 * Sets free_results_viewed_at once (never overwritten) so the funnel can
 * distinguish "saw free results and left" from "abandoned mid-form" —
 * step_completed=3 alone cannot (2026-08-01 root-cause verdict).
 */
async function handleResultsViewed(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }
    const body = await parseJsonBody(request);
    const { session_token } = body || {};
    if (!session_token) {
      return createErrorResponse('MISSING_FIELDS', 'session_token required', 400);
    }
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(session_token)}&free_results_viewed_at=is.null`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ free_results_viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
      }
    );
    if (!res.ok) {
      console.warn('[handleResultsViewed] PATCH failed:', res.status, await res.text());
      return createErrorResponse('DB_UPDATE_FAILED', `Failed to record results view: ${res.status}`, 500);
    }
    return createSuccessResponse({ saved: true });
  } catch (err) {
    console.error('handleResultsViewed error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/1
 */
async function handleSaveStep1(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests. Try again later.', 429);
    }

    // Basic validation
    if (!data.sex || !['male', 'female'].includes(data.sex)) {
      return createErrorResponse('VALIDATION_FAILED', 'Invalid sex value', 400);
    }
    if (!data.age || data.age < 13 || data.age > 150) {
      return createErrorResponse('VALIDATION_FAILED', 'Age must be between 13 and 150', 400);
    }
    // Email is mandatory on CW as of 2026-06-29; enforce here so stale cached
    // frontends can't write email-less sessions (frontend saves are fire-and-forget)
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return createErrorResponse('VALIDATION_FAILED', 'Email is required', 400);
    }

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          sex: data.sex,
          age: data.age,
          height_feet: data.height_feet || null,
          height_inches: data.height_inches || null,
          height_cm: data.height_cm || null,
          weight_value: data.weight_value,
          weight_unit: data.weight_unit || 'lbs',
          email: data.email || null,
          step_completed: 2,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 1', 500);
    }

    return createSuccessResponse({
      session_token,
      step_completed: 2,
      next_step: 3,
    });
  } catch (err) {
    console.error('handleSaveStep1 error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/2
 */
async function handleSaveStep2(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, data } = body;

    if (!session_token || !data) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and data are required', 400);
    }

    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests. Try again later.', 429);
    }

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}&select=email`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          lifestyle_activity: data.lifestyle_activity,
          exercise_frequency: data.exercise_frequency,
          goal: data.goal,
          deficit_percentage: data.deficit_percentage || null,
          diet_type: data.diet_type,
          step_completed: 3,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 2', 500);
    }

    // Server-side drip enrollment — see subscribeCore. Never fails the step save.
    try {
      const rows = await response.json();
      const email = rows && rows[0] && rows[0].email;
      if (email && isValidEmail(email.trim())) {
        const clean = email.trim().toLowerCase();
        // The step save already succeeded and must not be undone. We just
        // decline to enroll a dead address into the drip. The client-side
        // check in Step 1 should have caught this already; this is the
        // backstop for anything that bypasses it.
        const domain = clean.slice(clean.lastIndexOf('@') + 1);
        if (await domainHasMailRecords(domain)) {
          await subscribeCore(env, clean, 'calculator', data.diet_type, null);
        } else {
          console.warn(`[handleSaveStep2] skipped drip enrollment, undeliverable domain: ${domain}`);
        }
      }
    } catch (err) {
      console.warn('[handleSaveStep2] enrollment hook failed (non-fatal):', String(err));
    }

    return createSuccessResponse({
      session_token,
      step_completed: 3,
      next_step: 4,
    });
  } catch (err) {
    console.error('handleSaveStep2 error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/3
 */
async function handleSaveStep3(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, calculated_macros } = body;

    if (!session_token || !calculated_macros) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and calculated_macros required', 400);
    }

    if (!checkRateLimit(session_token, 10)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests. Try again later.', 429);
    }

    // Update session with macros
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          calculated_macros,
          step_completed: 3,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 3', 500);
    }

    // Fetch available payment tiers
    const tiersResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_tiers?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const tiers = tiersResponse.ok ? await tiersResponse.json() : [];

    return createSuccessResponse({
      session_token,
      step_completed: 3,
      calculated_macros,
      available_tiers: tiers,
      next_step: 4,
    });
  } catch (err) {
    console.error('handleSaveStep3 error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * GET /api/v1/calculator/payment/tiers
 */
async function handleGetPaymentTiers(request, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_tiers?is_active=eq.true&order=display_order.asc`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    const tiers = response.ok ? await response.json() : [];

    return createSuccessResponse({
      tiers,
      count: tiers.length,
    });
  } catch (err) {
    console.error('handleGetPaymentTiers error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /validate-coupon
 * Validate coupon code and return discount percent
 */
async function handleValidateCoupon(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { code } = body;

    if (!code) {
      return createErrorResponse('MISSING_CODE', 'Coupon code is required', 400);
    }

    // Validate via Stripe API (async)
    const result = await validateCoupon(code, env);
    if (!result.valid) {
      return createErrorResponse('INVALID_COUPON', result.error, 400);
    }

    return createSuccessResponse({
      code: result.code,
      stripe_coupon_id: result.stripe_coupon_id,
      percent: result.percent,
      amount_off: result.amount_off,
      description: result.description
    });
  } catch (err) {
    console.error('handleValidateCoupon error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/payment/initiate
 */
async function handleInitiatePayment(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, tier_id } = body;

    if (!session_token || !tier_id) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and tier_id required', 400);
    }

    if (!checkRateLimit(session_token, 5)) {
      return createErrorResponse('RATE_LIMIT', 'Too many payment attempts.', 429);
    }

    // Fetch tier
    const tierResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/payment_tiers?id=eq.${tier_id}`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!tierResponse.ok) {
      return createErrorResponse('TIER_NOT_FOUND', 'Payment tier not found', 404);
    }

    const tiers = await tierResponse.json();
    if (!tiers || tiers.length === 0) {
      return createErrorResponse('TIER_NOT_FOUND', 'Payment tier not found', 404);
    }

    const tier = tiers[0];

    // Create payment intent
    // ===== PAYMENT BOUNDARY (second route) =====
    // This legacy endpoint records a payment intent rather than charging, and the live
    // calculator does not call it. It is guarded anyway: it is named a payment
    // initiation path, calculator_sessions_v2 carries `goal` and `goals` directly, and
    // an unguarded second door is how the first fix stops applying.
    // `select=*` on purpose: naming a column that does not exist makes PostgREST
    // return 400, and a guard that skips itself on a failed read is not a guard.
    const initiateSessionRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}&select=*`,
      { headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      } }
    );
    if (!initiateSessionRes.ok) {
      console.error('[handleInitiatePayment] cannot read session to validate goals');
      return createErrorResponse('SESSION_LOOKUP_FAILED', 'Could not validate this session', 500);
    }
    const initiateRows = await initiateSessionRes.json();
    const initiateRow = Array.isArray(initiateRows) ? initiateRows[0] : initiateRows;
    if (!initiateRow) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }
    {
      // primary_goal_confirmed does not exist on this legacy table today, so it reads
      // as undefined and an unresolved contradiction blocks. That is the correct
      // default: absence of a recorded decision is not a decision.
      const conflict = detectGoalConflict({
        goal: initiateRow.goal,
        goals: initiateRow.goals,
        primaryGoalConfirmed: initiateRow.primary_goal_confirmed === true,
      });
      if (conflict.blocking) {
        console.warn('[handleInitiatePayment] refusing payment initiation:', conflict.message);
        return createErrorResponse('GOAL_CONFLICT_UNRESOLVED', conflict.message, 422, {
          field: 'goal',
          primaryGoal: conflict.primary,
          primaryGoalLabel: conflict.primaryLabel,
          conflictingMotivations: conflict.conflicting,
          resolution: 'CONFIRM_PRIMARY_GOAL',
          charged: false,
        });
      }
    }

    // The same eligibility rules as the checkout boundary. This handler records
    // an intent rather than charging, and the live client does not call it, but
    // two payment-named doors enforcing different rule sets is exactly how the
    // first fix stops applying (this handler's own goal-conflict comment above
    // makes the argument). Adult-only, and nothing that depends on a target we
    // refused to compute.
    const initiateEligibility = checkTargetEligibility(initiateRow.form_data || initiateRow);
    if (initiateEligibility) {
      console.warn('[handleInitiatePayment] refusing payment initiation:', initiateEligibility.code);
      return createErrorResponse(
        initiateEligibility.code,
        initiateEligibility.message,
        422,
        initiateEligibility.validation
      );
    }

    const paymentIntentId = `pi_${Math.random().toString(36).substring(2, 26)}`;

    // Update session
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          tier_id,
          stripe_payment_intent_id: paymentIntentId,
          amount_paid_cents: tier.price_cents,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to initiate payment', 500);
    }

    return createSuccessResponse({
      stripe_session_url: `https://checkout.stripe.com/pay/${paymentIntentId}`,
      payment_intent_id: paymentIntentId,
      created_at: new Date().toISOString(),
    }, 201);
  } catch (err) {
    console.error('handleInitiatePayment error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/payment/verify
 */
async function handleVerifyPayment(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_token, stripe_payment_intent_id } = body;

    if (!session_token || !stripe_payment_intent_id) {
      return createErrorResponse('MISSING_FIELDS', 'session_token and stripe_payment_intent_id required', 400);
    }

    if (!checkRateLimit(session_token, 5)) {
      return createErrorResponse('RATE_LIMIT', 'Too many verification attempts.', 429);
    }

    // Fetch session
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];

    if (session.stripe_payment_intent_id !== stripe_payment_intent_id) {
      return createErrorResponse('PAYMENT_MISMATCH', 'Payment intent does not match session', 400);
    }

    try {
      // Update session: Mark as premium
      const updateResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${session_token}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            is_premium: true,
            payment_status: 'completed',
            payment_verified_at: new Date().toISOString(),
            step_completed: 4,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update session');
      }

      // Create report record
      const accessToken = generateAccessToken();
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const reportResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/calculator_reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            session_id: session.id,
            email: session.email,
            access_token: accessToken,
            report_html: '<p>Report generation starting...</p>',
            report_json: {
              status: 'queued',
              stage: 0,
              queued_at: new Date().toISOString(),
              tier_id: session.tier_id,
            },
            is_generated: false,
            is_expired: false,
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!reportResponse.ok) {
        throw new Error('Failed to create report');
      }

      console.log(`[Report Queue] Session ${session.id} queued for generation`);

      return createSuccessResponse({
        session_token,
        is_premium: true,
        payment_status: 'completed',
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        message: 'Payment verified. Report generation started.',
      }, 200);
    } catch (transactionError) {
      return createErrorResponse('PAYMENT_VERIFICATION_FAILED', 'Transaction failed', 500);
    }
  } catch (err) {
    console.error('handleVerifyPayment error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /api/v1/calculator/step/4
 */
async function handleStep4Submission(request, env) {
  try {
    console.log('[handleStep4Submission] Processing Step 4 submission');

    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { assessment_id, data: formData } = body;

    console.log('[handleStep4Submission] Received assessment_id:', assessment_id);
    console.log('[handleStep4Submission] Received formData keys:', formData ? Object.keys(formData).slice(0, 15) : 'null');
    console.log('[handleStep4Submission] Has weight:', formData?.weight, 'has sex:', formData?.sex, 'has age:', formData?.age);

    if (!assessment_id || !formData) {
      return createErrorResponse('MISSING_FIELDS', 'assessment_id and data required', 400);
    }

    // Fetch assessment session to verify payment
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${assessment_id}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      console.error('[handleStep4Submission] Failed to fetch session:', sessionResponse.status);
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];
    console.log('[handleStep4Submission] Session found, payment_status:', session.payment_status);

    // Verify payment was completed
    if (session.payment_status !== 'completed' && session.payment_status !== 'success') {
      console.error('[handleStep4Submission] Payment not completed, status:', session.payment_status);
      return createErrorResponse('PAYMENT_REQUIRED', 'Payment required to access step 4', 403);
    }

    // Merge Step 4 data with existing form data
    const existingFormData = session.form_data || {};
    const updatedFormData = {
      ...existingFormData,
      ...formData,
    };

    console.log('[handleStep4Submission] Updating session with Step 4 data');
    console.log('[handleStep4Submission] Step 4 firstName:', formData.firstName, 'Step 4 lastName:', formData.lastName);

    // Prepare update payload - include first_name and last_name if provided
    const updatePayload = {
      form_data: updatedFormData,
      payment_status: 'completed',
      updated_at: new Date().toISOString(),
    };

    // Update the first_name column if firstName was provided in Step 4
    if (formData.firstName && typeof formData.firstName === 'string' && formData.firstName.trim().length > 0) {
      updatePayload.first_name = formData.firstName.trim();
      console.log('[handleStep4Submission] Updating first_name to:', formData.firstName.trim());
    }

    // Note: lastName is stored in form_data JSONB, not as separate column

    // Update session with Step 4 data
    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${assessment_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('[handleStep4Submission] DB update failed:', error);
      return createErrorResponse('DB_UPDATE_FAILED', 'Failed to save step 4 data', 500);
    }

    console.log('[handleStep4Submission] Step 4 data saved successfully');

    return createSuccessResponse({
      success: true,
      assessment_id,
      step_completed: 4,
      message: 'Step 4 submitted successfully. Report generation will begin shortly.',
    }, 200);
  } catch (err) {
    console.error('handleStep4Submission error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * GET /api/v1/calculator/report/{access_token}/status
 */
async function handleReportStatus(request, env, accessToken) {
  try {
    if (!accessToken || accessToken.length !== 64 || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return createErrorResponse('INVALID_TOKEN', 'Invalid access token format', 400);
    }

    // Security (2026-07-22, Leo review Finding 1): this token-gated read runs
    // server-side, so it uses the service role key rather than the anon key. This
    // lets us drop the public anon SELECT policy on calculator_reports (which
    // otherwise let anyone with the publishable key dump every report's email,
    // access_token and content) without breaking customer report links.
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const reports = await response.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const report = reports[0];

    // Check expiration
    if (report.is_expired || new Date(report.expires_at) < new Date()) {
      return createErrorResponse('REPORT_EXPIRED', 'Report access has expired', 410);
    }

    // Parse status
    const reportMeta = report.report_json || {};
    const status = reportMeta.status || 'unknown';
    const stage = reportMeta.stage || 0;
    const progress = reportMeta.progress || 0;

    // Calculate time remaining
    let timeRemaining = 0;
    if (status === 'queued') {
      timeRemaining = 30;
    } else if (status === 'generating') {
      const stageMap = { 1: 25, 2: 20, 3: 30, 4: 20, 5: 5 };
      timeRemaining = stageMap[stage] || 15;
    }

    const stageNames = {
      0: 'Initializing...',
      1: 'Calculating your macros...',
      2: 'Analyzing your health profile...',
      3: 'Generating your protocol...',
      4: 'Personalizing recommendations...',
      5: 'Finalizing your report...',
    };

    return createSuccessResponse({
      access_token: accessToken,
      status,
      is_generated: report.is_generated,
      stage,
      stage_name: stageNames[stage] || 'Processing...',
      progress,
      time_remaining_seconds: timeRemaining,
      expires_at: report.expires_at,
    }, 200);
  } catch (err) {
    console.error('handleReportStatus error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// What a reader is told when report generation fails for a reason they cannot act on.
// Deliberately says nothing about WHY: the reasons are gate text, model corrections and
// database errors. It states what is true and what they can do, and nothing else. It
// promises no email, because nothing here sends one.
const REPORT_GENERATION_FAILED_MESSAGE =
  'We could not finish building your report. Your payment is safe and your answers ' +
  'are saved. Please try again, and if it happens a second time use the feedback ' +
  'button on the site so we can finish it for you.';

/**
 * POST /api/v1/calculator/report/init
 * Initialize report generation with Claude API
 */
async function handleReportInit(request, env) {
  console.log('=== REPORT GENERATION REQUESTED ===');

  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_id, session_token } = body;
    console.log('Session identifier:', session_id || session_token?.substring(0, 20) + '...');

    // Support both assessment sessions (new) and old session tokens
    let sessionQuery = '';
    if (session_id) {
      sessionQuery = `cw_assessment_sessions?id=eq.${session_id}`;
    } else if (session_token) {
      sessionQuery = `calculator_sessions_v2?session_token=eq.${session_token}`;
    } else {
      return createErrorResponse('MISSING_FIELDS', 'session_id or session_token required', 400);
    }

    // Fetch session data
    const sessionResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/${sessionQuery}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      console.error('[handleReportInit] Session fetch failed:', sessionResponse.status);
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const sessions = await sessionResponse.json();
    if (!sessions || sessions.length === 0) {
      return createErrorResponse('SESSION_NOT_FOUND', 'Session not found', 404);
    }

    const session = sessions[0];
    console.log('[handleReportInit] Processing report for session:', session.id || session_id);
    console.log('[handleReportInit] Session form_data keys:', session.form_data ? Object.keys(session.form_data) : 'NULL');
    console.log('[handleReportInit] Session form_data sample:', JSON.stringify({
      weight: session.form_data?.weight,
      age: session.form_data?.age,
      sex: session.form_data?.sex,
      heightFeet: session.form_data?.heightFeet,
      goal: session.form_data?.goal,
      diet: session.form_data?.diet,
    }));

    // Check if report already exists
    const existingReportResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?session_id=eq.${session.id}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    let accessToken;
    if (existingReportResponse.ok) {
      const existingReports = await existingReportResponse.json();
      if (existingReports && existingReports.length > 0) {
        // Return existing report access token
        accessToken = existingReports[0].access_token;
        return createSuccessResponse({
          access_token: accessToken,
          report_id: existingReports[0].id,
          status: 'already_generated',
        }, 200);
      }
    }

    // Queue report for generation
    accessToken = generateAccessToken();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Call COMPREHENSIVE generator for full 60-80 page report (13 sections)
    console.log('=== FORM DATA FOR PERSONALIZATION ===');
    console.log('Session ID:', session.id);
    console.log('Email:', session.email);
    console.log('Form Data:', JSON.stringify(session.form_data, null, 2));
    console.log('Selected Protocol:', session.selectedProtocol);
    console.log('Allergies:', session.allergies);
    console.log('Avoid Foods:', session.avoidFoods);
    console.log('Health Conditions:', session.healthConditions);
    console.log('=====================================');

    // FIX: The form field names are SCRAMBLED - remap them correctly
    const correctedData = buildReportData(session);

    // VALIDATION LOG: Verify diet selection source
    console.log('=== DIET SELECTION DEBUG ===');
    console.log('session.diet_type (COLUMN):', session.diet_type);
    console.log('session.form_data?.diet (JSONB):', session.form_data?.diet);
    console.log('FINAL selectedProtocol:', correctedData.selectedProtocol);
    console.log('============================');

    // Same gate as the payment boundary, re-checked here: a session created
    // before this rule shipped, or reached by a crafted POST, must not generate
    // a report off a suppressed target or for a minor.
    const reportEligibility = checkTargetEligibility(session.form_data);
    if (reportEligibility) {
      console.warn('[handleReportInit] refusing to generate:', reportEligibility.code);
      return createErrorResponse(
        reportEligibility.code,
        reportEligibility.message,
        422,
        reportEligibility.validation
      );
    }

    // CRITICAL: Calculate macros from form data
    const macros = calculateMacros(session.form_data);
    correctedData.macros = macros;

    console.log('=== CORRECTED DATA MAPPING ===');
    console.log('Corrected firstName:', correctedData.firstName);
    console.log('Corrected allergies:', correctedData.allergies);
    console.log('Corrected avoidFoods:', correctedData.avoidFoods);
    console.log('Calculated macros:', macros);
    console.log('=================================');

    let reportsObject;
    try {
      reportsObject = await generateAllReports(correctedData, env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY);
    } catch (err) {
      if (err instanceof ReportValidationError) {
        // A structured refusal, not a crash. The reader is asked which goal should set
        // their calorie target; nothing is generated and nothing is charged again.
        console.warn('[handleReportInit] refusing to generate:', err.code, err.message);
        return createErrorResponse(err.code, err.message, 422, err.validation);
      }
      throw err;
    }

    // CRITICAL: Combine all 13 sections into single markdown string
    let reportMarkdown = '';
    for (let i = 1; i <= 13; i++) {
      if (reportsObject[i]) {
        if (i > 1) {
          reportMarkdown += '\n\n---\n\n';
        }
        reportMarkdown += reportsObject[i];
      }
    }

    console.log('[handleReportInit] Combined markdown size:', reportMarkdown.length, 'chars');

    // Convert markdown to styled HTML with CSS
    const reportHTML = wrapInPrintHTML(reportMarkdown, correctedData);
    console.log('[handleReportInit] Final HTML size:', reportHTML.length, 'chars');

    // Build report metadata - handle both old and new session structures
    const reportMeta = {
      status: 'completed',
      stage: 5,
      generated_at: new Date().toISOString(),
    };

    // Add tier_id if it exists (old table structure)
    if (session.tier_id) {
      reportMeta.tier_id = session.tier_id;
    }

    // Save report to database - use direct INSERT for all sessions
    const saveResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          session_id: session.id,
          email: session.email || 'unknown@example.com',
          access_token: accessToken,
          report_html: reportHTML,
          report_json: reportMeta,
          is_generated: true,
          is_expired: false,
          expires_at: expiresAt.toISOString(),
        }),
      }
    );

    // The report is returned from memory either way, but a PAID report that fails
    // to persist means the customer loses access after this response. Retry once,
    // then alert loudly (log + ops email) so it never fails silently.
    let reportPersisted = saveResponse.ok;
    let saveErrorText = '';
    if (!saveResponse.ok) {
      saveErrorText = (await saveResponse.text()).substring(0, 300);
      const retryResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/calculator_reports`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            session_id: session.id,
            email: session.email || 'unknown@example.com',
            access_token: accessToken,
            report_html: reportHTML,
            report_json: reportMeta,
            is_generated: true,
            is_expired: false,
            expires_at: expiresAt.toISOString(),
          }),
        }
      );
      reportPersisted = retryResponse.ok;
    }

    if (reportPersisted) {
      console.log('[handleReportInit] Report persisted for session', session.id);
    } else {
      console.error(`[ALERT][handleReportInit] PAID REPORT FAILED TO PERSIST after retry — session ${session.id}, email ${session.email}, error: ${saveErrorText}`);
      if (env.RESEND_API_KEY) {
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
            to: ['iambrew@gmail.com'],
            subject: `🚨 Paid report failed to persist — session ${session.id}`,
            html: `<p>A paid calculator report was generated but could NOT be saved to calculator_reports (retried once).</p><p>Session: ${session.id}<br>Email: ${session.email}<br>Error: ${saveErrorText}</p><p>The customer received the report in-browser/email but their access link will not work. Re-run report init for this session or insert the row manually.</p>`,
          }),
        }).catch(() => {});
      }
    }

    // Append AI/medical disclaimer to report
    const reportDisclaimer = '<div style="margin-top:40px;padding:20px;border-top:1px solid #e0d5c8;font-size:12px;color:#999;line-height:1.6;font-family:Inter,sans-serif;">' +
      '<p style="margin:0 0 8px 0;"><strong style="color:#8b4513;">About this report:</strong> This report was generated by AI (Claude by Anthropic) based on the information you provided, within human-defined editorial guidelines. It is not written by a doctor, dietitian, or licensed healthcare professional.</p>' +
      '<p style="margin:0;">This content is for educational and entertainment purposes only and does not constitute medical advice, diagnosis, or treatment. Consult a qualified healthcare provider before making dietary changes. Individual results may vary. &copy; 2026 Carnivore Weekly.</p>' +
      '</div>';
    const finalReportHTML = reportHTML.replace(/<\/body>/i, reportDisclaimer + '</body>');

    // Log the report size for debugging
    console.log('[handleReportInit] FINAL REPORT SIZE:', finalReportHTML.length, 'characters');
    console.log('[handleReportInit] Report ends with:', finalReportHTML.slice(-200));

    return createSuccessResponse({
      access_token: accessToken,
      status: 'generated',
      report_html: finalReportHTML,
      message: 'Report generated successfully. Download your protocol below.',
      DEBUG: {
        form_data_keys: session.form_data ? Object.keys(session.form_data) : null,
        weight_from_session: session.form_data?.weight,
        age_from_session: session.form_data?.age,
        session_form_data_type: typeof session.form_data,
        has_fallback_template: reportHTML.includes('Your personalized report is being generated'),
        has_claude_content: reportHTML.includes('claude-3-5-sonnet'),
        report_html_length: reportHTML.length,
        report_includes_recommendations: reportHTML.includes('<div class=\"recommendations\">'),
        claude_api_error: session._claude_api_error || null,
      },
    }, 200);
  } catch (err) {
    // The detail stays server side, where it is useful. It does not go to the reader.
    //
    // This returned `String(err)`, and the browser prints that message verbatim in the
    // failure banner. A content-gate failure quotes the rejected report copy, names the
    // gate, and explains what the model should have written instead; a persistence
    // failure carries PostgREST internals. A paying customer read the first of those on
    // 2026-09-09. None of it is theirs to see, and none of it helps them.
    console.error('[handleReportInit] generation failed:', err && err.stack ? err.stack : String(err));
    return createErrorResponse('INTERNAL_ERROR', REPORT_GENERATION_FAILED_MESSAGE, 500);
  }
}

/**
 * POST /api/v1/calculator/email-report
 * Email completed report to user
 */
async function handleEmailReport(request, env) {
  try {
    if (!validateContentType(request)) {
      return createErrorResponse('INVALID_CONTENT_TYPE', 'Expected application/json', 400);
    }

    const body = await parseJsonBody(request);
    const { session_id, email } = body;

    if (!session_id || !email) {
      return createErrorResponse('MISSING_PARAMS', 'session_id and email are required', 400);
    }

    // Fetch report from calculator_reports table (reports are stored there, not on session)
    const reportResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?session_id=eq.${session_id}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!reportResponse.ok) {
      console.error('[Email Report] Failed to fetch report:', reportResponse.status);
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const reports = await reportResponse.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found. Please generate your report first.', 404);
    }

    const report = reports[0];

    // Check if report HTML exists
    if (!report.report_html || report.report_html.length < 100) {
      return createErrorResponse('REPORT_NOT_READY', 'Report has not been generated yet', 400);
    }

    // Send email using Resend
    const resendApiKey = env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[Email Report] RESEND_API_KEY not configured');
      return createErrorResponse('EMAIL_NOT_CONFIGURED', 'Email service not available', 500);
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Carnivore Weekly <reports@carnivoreweekly.com>',
        to: [email],
        subject: 'Your Personalized Carnivore Protocol',
        html: report.report_html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[Email Report] Resend error:', errorText);
      return createErrorResponse('EMAIL_SEND_FAILED', 'Failed to send email', 500);
    }

    const emailResult = await emailResponse.json();
    console.log('[Email Report] Email sent successfully, ID:', emailResult.id);

    return createSuccessResponse({ message: 'Email sent successfully', email_id: emailResult.id });
  } catch (error) {
    console.error('[Email Report] Error:', error);
    return createErrorResponse('EMAIL_ERROR', error.message, 500);
  }
}

/**
 * Calculate macros from form data (mirrors frontend calculation)
 */
/**
 * Goal semantics live in api/goal-semantics.js so the questionnaire and this worker
 * apply the SAME rule. The customer is asked to resolve a contradiction before
 * payment; handleCreateCheckout blocks an unresolved one before a charge exists; and
 * generateAllReports blocks it again as a final backstop. One definition, three gates.
 */

/**
 * Assemble the object every report section is rendered from.
 *
 * Extracted out of handleReportInit() on 2026-09-07 so that the adversarial
 * regression fixture (tests/report-safety.test.mjs) renders from the SAME mapping
 * production uses, instead of a hand-copied replica that silently drifts.
 * If you change the shape of the report data, change it here.
 */
function buildReportData(session) {
  const form = session.form_data || {};
  return {
    ...session,
    ...form,
    // Map frontend field names correctly:
    firstName: form.firstName || session.first_name,
    lastName: form.lastName || session.last_name,
    goals: form.goals || '',                   // User's health goals
    currentSymptoms: form.otherSymptoms || '', // Current symptoms
    dietHistory: form.previousDiets || '',     // Past diet experience
    allergies: form.allergies || '',           // Food allergies
    avoidFoods: form.avoidFoods || '',         // Foods to avoid
    medications: form.medications || '',       // Current medications
    whatWorked: form.whatWorked || '',         // What worked before
    // NOTE: `lifestyle` is overwritten with biggestChallenge below for historical
    // reasons, which is why the real activity level is preserved separately here.
    // buildProfile() reads activityLevel first; without this the AI prompt reported
    // the user's biggest challenge as their activity level.
    activityLevel: form.lifestyle || form.activityLevel || '',
    lifestyle: form.biggestChallenge || '',    // Lifestyle details
    challenges: form.additionalNotes || '',    // Challenges
    healthConditions: form.conditions || [],
    // diet_type is stored as a SEPARATE COLUMN from Step 2, NOT in form_data.diet
    selectedProtocol: session.diet_type || form.diet || 'Carnivore'
  };
}

/**
 * Eligibility gate for anything that depends on a calorie target (2026-09-10).
 *
 * Two refusals, both upstream of money:
 *  - the calculator is an adult product, so under 18 gets no target and no
 *    paid pathway (no pediatric substitute, this is a refusal);
 *  - when maintenance is at or below the self-service floor, calculateMacros
 *    suppresses the target, and a suppressed value must not go on to size a
 *    meal plan or a report. Suppress, never substitute.
 *
 * Returns null when sellable, otherwise {code, message, validation}.
 */
function checkTargetEligibility(formData) {
  // Fails CLOSED: calculateMacros defaults a missing age to 30, so a crafted or
  // legacy POST with age absent, null, 0 or "" would otherwise be priced as an
  // adult. Anything that is not a real age of at least 18 is refused.
  const age = Number((formData || {}).age);
  if (!Number.isFinite(age) || age < 18) {
    return {
      code: 'UNDER_18_NOT_SUPPORTED',
      message: 'This calculator is designed for adults 18 and over.',
      validation: { field: 'age', minimumAge: 18, charged: false },
    };
  }

  const macros = calculateMacros(formData || {});
  if (macros && macros.targetSuppressed) {
    return {
      code: 'CALORIE_TARGET_SUPPRESSED',
      message: 'We cannot generate a self-guided calorie target from these inputs. '
        + 'Estimated maintenance is at or below the lower limit we use for self-guided plans, '
        + 'so this needs a clinician or registered dietitian rather than an automated calculator.',
      validation: {
        field: 'calories',
        reason: macros.suppressionReason,
        selfServiceFloor: macros.selfServiceFloor,
        estimatedMaintenance: macros.tdee,
        charged: false,
      },
    };
  }

  return null;
}

function calculateMacros(formData) {
  // Handle undefined formData
  if (!formData) {
    console.warn('[calculateMacros] formData is null/undefined, using defaults');
    formData = {};
  }

  const weight = formData.weight || 200;
  const heightFeet = formData.heightFeet || 6;
  const heightInches = formData.heightInches || 0;
  const heightCm = formData.heightCm;
  const age = formData.age || 30;
  const sex = (formData.sex || 'male').toLowerCase();
  // Normalize goal - frontend sends 'lose'/'gain'/'maintain' (ISSUE: 'loss' check never matched)
  const goal = String(formData.goal || 'maintain').toLowerCase().trim();
  const isLose = goal === 'lose' || goal === 'loss';
  const isGain = goal === 'gain';
  // Normalize diet - check both 'diet' and 'selectedProtocol' fields, case-insensitive
  const rawDiet = formData.diet || formData.selectedProtocol || 'carnivore';
  const diet = rawDiet.toLowerCase().trim();
  // lifestyle is what the frontend free-results calc keys off; exercise is a fallback
  const activityKey = String(formData.lifestyle || formData.exercise || 'moderate').toLowerCase().trim();

  console.log('[calculateMacros] Input diet:', rawDiet, '-> normalized:', diet);

  // BMR using Mifflin-St Jeor
  let bmr;
  const weightKg = weight * 0.453592;
  // Use heightCm if provided, otherwise calculate from feet/inches
  const heightCmVal = heightCm || ((heightFeet || 6) * 12 + (heightInches || 0)) * 2.54;

  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCmVal - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCmVal - 5 * age - 161;
  }

  // Activity multiplier - covers both lifestyle values (sedentary/light/moderate/very/extreme)
  // and exercise values (none/1-2/3-4/5+). Unknown values fall back to the LOWEST
  // multiplier, never moderate: overestimating burn for a weight-loss customer is the
  // failure mode that produced ISSUE reports (exercise:"none" used to resolve to 1.55).
  const activityMap = {
    none: 1.2,
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    active: 1.725,
    extreme: 1.9,
    veryactive: 1.9,
  };
  const multiplier = activityMap[activityKey] || 1.2;
  const tdee = bmr * multiplier;

  // Percent-based goal adjustment, mirroring the frontend free-results calc:
  // use the user's chosen deficit %, else 20% for loss / 10% for gain.
  const deficitPct = parseFloat(formData.deficit) || (isLose ? 20 : isGain ? 10 : 0);
  let calories = tdee;
  if (isLose) calories = tdee * (1 - deficitPct / 100);
  if (isGain) calories = tdee * (1 + deficitPct / 100);

  // ── Self-service fat-loss calorie guardrail (Brew, 2026-09-10) ──────────────
  // A PRODUCT bound on what this unattended calculator will print, not a
  // universal medical safe minimum. Below it we stop guessing and route the
  // reader to a clinician.
  //
  // Kept inline and identical on both sides on purpose: tests/macro_parity
  // extracts this function standalone via new Function(), so it cannot import
  // a shared module. Change one side, change the other, regenerate golden.json.
  const selfServiceFloor = sex === 'female' ? 1200 : 1500;
  let floorApplied = false;
  let targetSuppressed = false;
  let requestedDeficitPct = isLose ? deficitPct : 0;
  let effectiveDeficitPct = requestedDeficitPct;

  if (isLose) {
    if (tdee <= selfServiceFloor) {
      // Case B: maintenance is already at or under the floor, so there is no
      // honest self-guided deficit to offer. Suppress rather than substitute —
      // returning the floor here would be a deficit that is really a surplus.
      targetSuppressed = true;
      effectiveDeficitPct = 0;
    } else if (calories < selfServiceFloor) {
      // Case A: cap, and stop claiming the deficit they picked was achieved.
      calories = selfServiceFloor;
      floorApplied = true;
      effectiveDeficitPct = Math.round(((tdee - selfServiceFloor) / tdee) * 100);
    }
  }

  let protein, fat, carbs;

  // All low-carb/animal-based diets use similar macro calculation
  // High protein (2g/kg), fat fills remaining calories, minimal carbs
  const isLowCarbDiet = ['carnivore', 'lion', 'pescatarian', 'keto', 'strict carnivore', 'lowcarb', 'low-carb', 'low carb'].includes(diet);

  if (isLowCarbDiet) {
    // 2g/kg, but for BMI >= 30 base it on reference weight at BMI 25 instead of
    // total weight - 2g/kg of total weight told a 312 lb customer to eat 283g/day.
    const heightM = heightCmVal / 100;
    const bmi = weightKg / (heightM * heightM);
    // Goal weight, when the reader gives one, is the protein basis. That is the
    // house standard (0.8-1.0 g per lb of GOAL weight) and it replaces the
    // BMI>=30 proxy below, which only ever existed as a stand-in for the goal
    // weight we never asked for. Two guards on it: floored at BMI 18.5 so an
    // unrealistically low goal cannot cut the protein target (under-eating
    // protein while losing weight is the failure mode we write against), and
    // the same BMI>=30 proxy still caps a goal set that high. No goal weight
    // means the old path, unchanged, so existing sessions price identically.
    const goalLb = Number(formData.goalWeight) || 0;
    const goalKg = goalLb > 0 ? goalLb * 0.453592 : 0;
    let proteinBasisKg;
    if (goalKg > 0) {
      const goalBmi = goalKg / (heightM * heightM);
      const floorKg = 18.5 * heightM * heightM;
      proteinBasisKg = goalBmi >= 30 ? 25 * heightM * heightM : Math.max(goalKg, floorKg);
    } else {
      proteinBasisKg = bmi >= 30 ? 25 * heightM * heightM : weightKg;
    }
    protein = Math.round(proteinBasisKg * 2);
    const proteinCals = protein * 4;

    // Keto and Low-Carb allow a small carb budget (20g), rest from fat.
    // Carnivore/Lion/Pescatarian are the zero-carb diets (Brew, 2026-08-30:
    // "it is only low if they choose Low Carb or Keto"). lowcarb previously
    // fell into the zero branch, contradicting its own "moderate carbs" label.
    if (diet === 'keto' || diet === 'lowcarb' || diet === 'low-carb' || diet === 'low carb') {
      carbs = 20;
      const carbCals = carbs * 4;
      const fatCals = calories - proteinCals - carbCals;
      fat = Math.round(fatCals / 9);
    } else {
      // Carnivore, Lion, Pescatarian - zero/minimal carbs
      carbs = 0;
      const fatCals = calories - proteinCals;
      fat = Math.round(fatCals / 9);
    }
  } else {
    // Standard macro split for other diets (not currently used but keeping for safety)
    protein = Math.round(weightKg * 1.6);
    const proteinCals = protein * 4;
    const fatCals = calories * 0.3;
    fat = Math.round(fatCals / 9);
    carbs = Math.round((calories - proteinCals - fatCals) / 4);
  }

  // Validate: ensure protein + fat + carbs calories roughly equal total
  const calculatedCals = (protein * 4) + (fat * 9) + (carbs * 4);
  console.log('[calculateMacros] Calorie check: target=' + Math.round(calories) + ', calculated=' + calculatedCals + ', diff=' + (Math.round(calories) - calculatedCals));

  // A suppressed target must not leak a number that downstream code could treat
  // as a calorie goal, so the macro fields go null rather than zero.
  const result = targetSuppressed ? {
    calories: null,
    protein_grams: null,
    fat_grams: null,
    carbs_grams: null,
    tdee: Math.round(tdee),
    targetSuppressed: true,
    suppressionReason: 'maintenance_at_or_below_self_service_floor',
    selfServiceFloor,
    floorApplied: false,
    requestedDeficitPct,
    effectiveDeficitPct: 0,
  } : {
    calories: Math.round(calories),
    protein_grams: protein,
    fat_grams: fat,
    carbs_grams: carbs,
    tdee: Math.round(tdee),
    targetSuppressed: false,
    selfServiceFloor,
    floorApplied,
    requestedDeficitPct,
    effectiveDeficitPct,
  };

  console.log('[calculateMacros] Result:', {
    input: { weight, heightFeet, heightInches, age, sex, goal, diet, activityKey },
    output: result,
  });

  return result;
}

// generateSimpleFallbackReport() and its HTML wrappers (generateFallbackReport,
// wrapReportHTML) were DELETED on 2026-09-07.
//
// They were unreachable — nothing called generateSimpleFallbackReport, and
// handleReportInit 500s rather than falling back — but they were a complete second
// report generator that bypassed every guardrail in this file: no medical safety
// rule block, no medication field in the prompt, no api/medical-context.js, and a
// prompt that asked the model for "how to handle their specific conditions/symptoms"
// and "when to adjust macros". Their HTML also printed an ungated daily protein
// target. Wiring one back in during an incident would have silently reverted the
// report to pre-remediation behaviour.
//
// Do not reintroduce a fallback generator. If generateAllReports() fails, the request
// must fail — a paid medical-adjacent report that quietly degrades to an ungated one
// is worse than an error the customer can retry.

/**
 * COMPREHENSIVE REPORT GENERATOR - EXTRACTED CODE
 *
 * This file contains all code needed to generate the comprehensive 13-section
 * 60-80 page personalized diet reports.
 *
 * Originally extracted 2026-01-13 from api/generate-report.js, which was a second,
 * divergent copy of this generator. That file was DELETED on 2026-09-08 after it was
 * proven to have no runtime: no wrangler main, no package main, no import, no route,
 * no CI step. This file is now the only Carnivore Weekly report generator that exists.
 *
 * CONTENTS:
 * 1. foodDatabase constant (master ingredient database)
 * 2. shouldFilterOutFood() - allergies/restrictions filtering
 * 3. generateFullMealPlan() - 30-day meal generation
 * 4. generateGroceryListByWeek() - 4-week shopping lists
 * 5. generateAllReports() - main orchestrator
 * 6. callClaudeAPI() - Claude API wrapper
 * 7. buildExecutiveSummarySystemPrompt() - Report #1 system prompt
 * 8. buildExecutiveSummaryPrompt() - Report #1 user prompt
 * 9. buildObstacleProtocolSystemPrompt() - Report #6 system prompt
 * 10. buildObstacleProtocolPrompt() - Report #6 user prompt
 * 11. loadAndCustomizeTemplate() - template loader
 * 12. generateDynamicFoodGuide() - Report #2 food guide generator
 * 13. getTemplateContent() - all template constants
 * 14. replacePlaceholders() - template variable replacement
 * 15. Helper functions (buildProfile, evaluateCondition, etc.)
 */

// ============================================================================
// 1. MASTER INGREDIENT DATABASE
// ============================================================================

const foodDatabase = {
  proteins: [
    // Beef
    { name: 'Ground Beef (80/20)', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate', 'premium'], calories: 290, protein: 20, fat: 23, carbs: 0 },
    { name: 'Grass-fed Ground Beef', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 280, protein: 21, fat: 22, carbs: 0 },
    { name: 'Ribeye Steak', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['moderate', 'premium'], calories: 291, protein: 24, fat: 23, carbs: 0 },
    { name: 'NY Strip Steak', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['moderate', 'premium'], calories: 271, protein: 27, fat: 18, carbs: 0 },
    { name: 'Chuck Steak', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 300, protein: 22, fat: 24, carbs: 0 },
    { name: 'Beef Brisket', category: 'Beef', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 289, protein: 26, fat: 21, carbs: 0 },
    { name: 'Beef Liver', category: 'Beef Organs', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 165, protein: 26, fat: 6, carbs: 5 },
    { name: 'Beef Heart', category: 'Beef Organs', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Lion'], cost: ['tight'], calories: 96, protein: 17, fat: 3.5, carbs: 0.2 },

    // Lamb
    { name: 'Ground Lamb', category: 'Lamb', diet: ['Carnivore', 'Strict Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 282, protein: 23, fat: 22, carbs: 0 },
    { name: 'Lamb Chops', category: 'Lamb', diet: ['Carnivore', 'Strict Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 294, protein: 25, fat: 22, carbs: 0 },

    // Pork
    { name: 'Pork Chops', category: 'Pork', diet: ['Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 242, protein: 27, fat: 14, carbs: 0 },
    { name: 'Bacon', category: 'Pork', diet: ['Carnivore', 'Keto', 'Lion'], cost: ['tight', 'moderate'], calories: 541, protein: 37, fat: 43, carbs: 1 },

    // Fish
    { name: 'Salmon Fillet (wild)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 280, protein: 25, fat: 20, carbs: 0 },
    { name: 'Salmon Fillet (farmed)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 208, protein: 20, fat: 13, carbs: 0 },
    { name: 'Canned Salmon (in oil)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 220, protein: 20, fat: 15, carbs: 0 },
    { name: 'Mackerel', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 305, protein: 20, fat: 25, carbs: 0 },
    { name: 'Sardines (in oil)', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 208, protein: 25, fat: 11, carbs: 0 },
    { name: 'Herring', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 206, protein: 20, fat: 13, carbs: 0 },
    { name: 'Cod Fillet', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['moderate'], calories: 82, protein: 18, fat: 0.7, carbs: 0 },
    { name: 'Tuna Steak', category: 'Fish', diet: ['Pescatarian', 'Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 132, protein: 23, fat: 4.6, carbs: 0 },

    // Shellfish
    { name: 'Shrimp', category: 'Shellfish', diet: ['Pescatarian', 'Keto'], cost: ['moderate', 'premium'], calories: 99, protein: 24, fat: 0.3, carbs: 0 },
    { name: 'Oysters', category: 'Shellfish', diet: ['Pescatarian', 'Keto'], cost: ['moderate', 'premium'], calories: 68, protein: 7, fat: 2.5, carbs: 4 },
    { name: 'Crab', category: 'Shellfish', diet: ['Pescatarian', 'Keto'], cost: ['moderate', 'premium'], calories: 82, protein: 18, fat: 1.1, carbs: 0 },
    { name: 'Lobster', category: 'Shellfish', diet: ['Pescatarian', 'Keto'], cost: ['premium'], calories: 89, protein: 19, fat: 1.1, carbs: 1.3 },
    { name: 'Clams', category: 'Shellfish', diet: ['Pescatarian', 'Keto'], cost: ['moderate', 'premium'], calories: 86, protein: 15, fat: 1.2, carbs: 3 },
    { name: 'Mussels', category: 'Shellfish', diet: ['Pescatarian', 'Keto'], cost: ['tight', 'moderate'], calories: 86, protein: 12, fat: 2.2, carbs: 4 },

    // Poultry
    { name: 'Eggs', category: 'Eggs', diet: ['Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight', 'moderate'], calories: 155, protein: 13, fat: 11, carbs: 1.1 },
    { name: 'Chicken Thighs', category: 'Poultry', diet: ['Carnivore', 'Keto'], cost: ['tight', 'moderate'], calories: 209, protein: 22, fat: 13, carbs: 0 },
    { name: 'Duck', category: 'Poultry', diet: ['Carnivore', 'Keto'], cost: ['moderate', 'premium'], calories: 337, protein: 19, fat: 29, carbs: 0 },
  ],

  pantryItems: [
    { name: 'Salt (Redmond Real Salt)', category: 'Pantry', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight', 'moderate', 'premium'], calories: 0, protein: 0, fat: 0, carbs: 0 },
    { name: 'Quality Salt', category: 'Pantry', diet: ['Carnivore', 'Strict Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight', 'moderate'], calories: 0, protein: 0, fat: 0, carbs: 0 },
  ],

  fats: [
    { name: 'Butter', category: 'Dairy', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['tight', 'moderate', 'premium'], calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
    { name: 'Grass-fed Butter', category: 'Dairy', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['moderate', 'premium'], calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
    { name: 'Ghee', category: 'Dairy', diet: ['Carnivore', 'Keto', 'Pescatarian'], cost: ['moderate', 'premium'], calories: 900, protein: 0, fat: 100, carbs: 0 },
  ],

  vegetables: [
    { name: 'Spinach', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 3.6 },
    { name: 'Leafy Greens', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 4 },
    { name: 'Broccoli', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 7 },
    { name: 'Cauliflower', category: 'Vegetables', diet: ['Keto'], cost: ['tight', 'moderate'], allergies: [], carbs: 5 },
    { name: 'Asparagus', category: 'Vegetables', diet: ['Keto'], cost: ['moderate', 'premium'], allergies: [], carbs: 2 },
  ],

  other: [
    { name: 'Filtered Water', category: 'Beverages', diet: ['Carnivore', 'Keto', 'Pescatarian', 'Lion'], cost: ['tight'], calories: 0, protein: 0, fat: 0, carbs: 0 },
  ]
};

// ============================================================================
// 2. FOOD FILTERING FUNCTION
// ============================================================================

/**
 * Helper function: Check if a food should be filtered out based on allergies/restrictions
 */
function shouldFilterOutFood(food, allergies, foodRestrictions) {
  const foodName = food.name.toLowerCase();
  const category = (food.category || '').toLowerCase();

  // Filter out allergies
  if (allergies) {
    if (allergies.includes('dairy') && (category.includes('dairy') || foodName.includes('cheese') || foodName.includes('butter') || foodName.includes('ghee') || foodName.includes('cream'))) {
      return true;
    }
    if (allergies.includes('egg') && foodName.includes('egg')) {
      console.log(`[shouldFilterOutFood] EGG CHECK - Food: "${food.name}", allergies: "${allergies}", foodName: "${foodName}", FILTERED OUT: true`);
      return true;
    }
    // IMPORTANT: Check shellfish BEFORE fish - "shellfish" contains "fish" as substring!
    // Use regex word boundary to avoid false matches
    // ENHANCED: Detect shellfish allergy from keyword OR any shellfish item in allergies string
    const hasFishAllergy = /\bfish\b/i.test(allergies);
    const allergiesLower = allergies.toLowerCase();
    const hasShellfishAllergy = /\bshellfish\b/i.test(allergies) ||
      allergiesLower.includes('shrimp') || allergiesLower.includes('crab') ||
      allergiesLower.includes('lobster') || allergiesLower.includes('oyster') ||
      allergiesLower.includes('clam') || allergiesLower.includes('mussel') ||
      allergiesLower.includes('scallop');

    // Check if this food IS a shellfish item (by name or category)
    const isShellfish = category.includes('shellfish') ||
      foodName.includes('shrimp') || foodName.includes('crab') ||
      foodName.includes('lobster') || foodName.includes('oyster') ||
      foodName.includes('clam') || foodName.includes('mussel') ||
      foodName.includes('scallop');

    // If user has ANY shellfish allergy, filter out ALL shellfish items
    if (hasShellfishAllergy && isShellfish) {
      console.log(`[shouldFilterOutFood] SHELLFISH ALLERGY - Filtering: "${food.name}" (category: ${category})`);
      return true;
    }
    if (hasFishAllergy && (category.includes('fish') || foodName.includes('fish') || foodName.includes('salmon') || foodName.includes('tuna') || foodName.includes('mackerel') || foodName.includes('sardine') || foodName.includes('herring') || foodName.includes('cod') || foodName.includes('trout'))) {
      return true;
    }
    if (allergies.includes('pork') && (category.includes('pork') || foodName.includes('pork') || foodName.includes('bacon') || foodName.includes('ham'))) {
      return true;
    }
    if (allergies.includes('beef') && (category.includes('beef') || foodName.includes('beef') || foodName.includes('ground beef') || foodName.includes('ribeye') || foodName.includes('steak'))) {
      return true;
    }
    if (allergies.includes('lamb') && (category.includes('lamb') || foodName.includes('lamb'))) {
      return true;
    }
  }

  // Filter out foods user doesn't like
  if (foodRestrictions) {
    const restrictions = foodRestrictions
      .split(',')
      .map(r => r.trim().toLowerCase())
      .filter(r => r);

    for (const restriction of restrictions) {
      // Exact match first
      if (foodName === restriction) {
        if (foodName.includes('ground') || restriction.includes('ground')) {
          console.log(`[shouldFilterOutFood] EXACT MATCH - Filtering out: "${food.name}" - restriction: "${restriction}"`);
        }
        return true;
      }

      // Substring match (handles "ground beef" matching "Ground Beef (80/20)")
      if (foodName.includes(restriction) || category.includes(restriction)) {
        if (foodName.includes('ground') || restriction.includes('ground')) {
          console.log(`[shouldFilterOutFood] SUBSTRING MATCH - Filtering out: "${food.name}" (${foodName}) - matches restriction "${restriction}"`);
        }
        return true;
      }
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// BASE-FOOD IDENTITY
// ---------------------------------------------------------------------------
// The food database lists the same food more than once when it is sold at different
// quality or preparation grades: "Ground Beef (80/20)" and "Grass-fed Ground Beef",
// "Butter" and "Grass-fed Butter". As shopping options those are correctly two rows.
// As a SET OF DISTINCT FOODS SHOWN TOGETHER they are one food, and printing both is
// how a reader ends up being told to eat "Ground Beef (80/20) + Grass-fed Ground Beef"
// in a single meal (reported 2026-09-09).
//
// The grade lives in the NAME, not in a column, so identity has to be derived from it.
// A food may pin its own identity with an explicit `base` field when the name does not
// carry it; the normalizer is the fallback, not the authority.
//
// SCOPE. This is for places that present several foods together as if each were a
// different food: the eating-pattern options, the budget picks, the substitution
// alternatives. It is deliberately NOT applied to the tier listings (where both grades
// are legitimate things to buy) or to the meal-plan rotation (where the same food on
// two different days is legitimate variety, and where portion macros are read off the
// specific row).
const FOOD_GRADE_PREFIXES = /^(grass[- ]?fed|pasture[d]?(?:[- ]raised)?|wild(?:[- ]caught)?|organic|free[- ]range|farmed|conventional)\s+/i;
const FOOD_GRADE_SUFFIXES = /\s*\((?:\d{2}\/\d{1,2}|grass[- ]?fed|farmed|wild(?:[- ]caught)?|organic|in oil|in water|raw|cooked)\)\s*$/i;

function baseFoodKey(food) {
  const explicit = typeof food === 'object' && food !== null ? food.base : null;
  if (explicit) return String(explicit).trim().toLowerCase();
  const name = typeof food === 'string' ? food : (food?.name || '');
  let key = String(name).trim();
  // Suffix first: "Grass-fed Ground Beef (80/20)" must lose both ends.
  let previous;
  do { previous = key; key = key.replace(FOOD_GRADE_SUFFIXES, '').trim(); } while (key !== previous);
  do { previous = key; key = key.replace(FOOD_GRADE_PREFIXES, '').trim(); } while (key !== previous);
  return key.toLowerCase().replace(/\s+/g, ' ');
}

// Keep the first row for each base food, drop later grades of the same food. First
// wins so the database's own ordering still decides which grade the reader is shown.
function distinctByBaseFood(foods) {
  const seen = new Set();
  const out = [];
  for (const food of foods || []) {
    const key = baseFoodKey(food);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(food);
  }
  return out;
}

// ============================================================================
// 3. FULL 30-DAY MEAL PLAN GENERATOR
// ============================================================================

/**
 * Generate full 30-day meal plan using database and week/day loops
 */
/**
 * The length of the plan this product sells, in days. ONE definition.
 *
 * The generator built 30 days and the calendar template had four week placeholders,
 * so days 29 and 30 were generated, bucketed into a fifth week, and silently dropped
 * on the way to the page (5128d550, 2026-09-08). The report kept its "30-Day Meal
 * Calendar" title throughout. Nothing failed, because nothing compared the two.
 *
 * Both the generator and the renderer now derive from this constant and from the
 * plan object itself, and assertRenderedPlanIsComplete() below fails generation if
 * the rendered day set ever stops matching the generated one.
 */
const MEAL_PLAN_DAYS = 30;

/** Customer-facing heading for each week bucket, by week number. */
function weekHeading(weekNumber, days) {
  const NAMED = {
    1: 'Adaptation & Baseline',
    2: 'Building Consistency',
    3: 'Finding Your Rhythm',
    4: 'The Last Full Week',
  };
  const first = days[0]?.dayNumber;
  const last = days[days.length - 1]?.dayNumber;
  const range = first === last ? `Day ${first}` : `Days ${first}-${last}`;
  // Week 5 is the two-day tail of a 30-day plan, not a real week, so it gets a name
  // that reads correctly to a customer instead of "Week 5: " and two rows.
  const title = NAMED[weekNumber] || 'Final Days';
  return { label: `Week ${weekNumber}`, title, range };
}

/**
 * THE structural invariant for the calendar: everything the generator produced is on
 * the page, exactly once, with no gaps.
 *
 * Throws rather than warns. A report that quietly contains 28 of the 30 days it
 * promises is worse than a report that failed to build, because only one of those
 * two reaches a customer.
 */
function assertRenderedPlanIsComplete(mealPlan, renderedDayNumbers) {
  const generated = (mealPlan.weeks || []).flatMap(w => (w.days || []).map(d => d.dayNumber));
  const rendered = [...renderedDayNumbers];
  const uniq = new Set(rendered);

  if (uniq.size !== rendered.length) {
    const dupes = rendered.filter((d, i) => rendered.indexOf(d) !== i);
    throw new Error(`meal calendar: day(s) rendered more than once: ${[...new Set(dupes)].join(', ')}`);
  }
  const missing = generated.filter(d => !uniq.has(d));
  if (missing.length) {
    throw new Error(`meal calendar: generated ${generated.length} days but rendered ` +
      `${rendered.length}. Days missing from the page: ${missing.join(', ')}. ` +
      `The renderer must consume every week the generator produced.`);
  }
  if (generated.length !== MEAL_PLAN_DAYS) {
    throw new Error(`meal calendar: expected ${MEAL_PLAN_DAYS} generated days, got ${generated.length}.`);
  }
}

/**
 * What Reports #3 and #4 say when the meal plan is withheld.
 *
 * Written by Sarah (sarah-health-coach) on 2026-09-09 and used verbatim. The brief was
 * narrow: say what is missing and why, acknowledge that the right amount depends on
 * clinical information this questionnaire does not have, and send that decision to the
 * reader's doctor or renal dietitian. No substitute figure, no renal diet, no claim
 * that this way of eating suits kidney disease, no promised outcome. 111 words across
 * both notices.
 *
 * "what you told us about your kidneys" is deliberate. A reader who answered that they
 * are not sure about their kidney function gets the same suppression, and must not be
 * handed a diagnosis they did not give us.
 *
 * The headings match the templates these replace, so the report keeps 13 sections in
 * the same order. Nothing is renumbered.
 */
const RENAL_MEAL_CALENDAR_NOTICE =
  'Because of what you told us about your kidneys, this report does not set a protein ' +
  'target for you, so we are not printing a meal calendar with portion amounts. The ' +
  'right amounts depend on clinical information this questionnaire does not have. ' +
  '**Ask your doctor or a renal dietitian what your intake should be**, and build your ' +
  'meals around their guidance.';

const RENAL_GROCERY_LIST_NOTICE =
  'This shopping list is built from the meal calendar, so without portion amounts ' +
  'there are no quantities to buy. The rest of your report is unchanged. Once your ' +
  'doctor or renal dietitian tells you what your intake should be, use their number to ' +
  'work out how much to shop for.';

/**
 * The heading is taken FROM the template it replaces, not retyped beside it. A
 * hardcoded copy agrees on the day it is written and silently disagrees the day
 * someone renames the section, which is how a report ends up with two titles for the
 * same thing. Same reasoning as the tracker renumber in generateAllReports: if the
 * heading it depends on moves, fail rather than ship something malformed.
 */
function suppressedSection(templateName, expectedNumber, notice) {
  const heading = String(getTemplateContent(templateName) || '').split('\n')[0];
  if (!new RegExp(`^## Report #${expectedNumber}:`).test(heading)) {
    throw new Error(
      `suppressedSection: ${templateName} no longer starts with a "## Report #${expectedNumber}:" ` +
      'heading, so the suppressed section would not match the one it replaces.'
    );
  }
  return `${heading}\n\n${notice}`;
}

function buildSuppressedMealCalendarSection() {
  return suppressedSection('mealCalendar', 3, RENAL_MEAL_CALENDAR_NOTICE);
}

function buildSuppressedGroceryListSection() {
  return suppressedSection('shoppingList', 4, RENAL_GROCERY_LIST_NOTICE);
}

function generateFullMealPlan(data) {
  // THE SUPPRESSION BOUNDARY. This plan is protein-anchored: portions are sized to
  // hit data.macros.protein_grams, and the grocery list is derived from the portions.
  // So for a reader whose protein target is withheld, the plan IS the withheld number,
  // written as food. Hiding the figure in prose while the calendar tells them to cook
  // 474 g of meat a day is not suppression, it is the same recommendation in a
  // different unit. Verified 2026-09-09: a declared-CKD persona's day 1 was identical
  // to the healthy baseline's, in the same report that says we set no protein target.
  //
  // Refusing HERE, rather than blanking the section afterwards, is the point: there is
  // no path that can produce the quantities and then forget to hide one of them. The
  // callers that must not reach this are gated before they call (replacePlaceholders
  // and generateAllReports); this throw is what makes a future caller a build failure
  // instead of a silent regression.
  //
  // SUPPRESS, DO NOT SUBSTITUTE: no reduced target, no alternate formula, no renal
  // plan. Choosing a protein intake for reduced kidney function is a clinical
  // decision, and api/medical-context.js is authoritative that the software stops
  // rather than inventing a second number.
  if (deriveMedicalContext(data).restrictProteinTarget) {
    throw new Error(
      'generateFullMealPlan: refusing to build a protein-anchored meal plan for a ' +
      'reader whose protein target is withheld. Use the suppression notice instead.'
    );
  }

  console.log('=== MEAL PLAN DEBUG ===');
  console.log('dailyProtein:', data.dailyProtein);
  console.log('dailyFat:', data.dailyFat);
  console.log('dailyCalories:', data.dailyCalories);
  console.log('mealsPerDay:', data.mealsPerDay);
  console.log('selectedProtocol:', data.selectedProtocol);
  console.log('allergies:', data.allergies);
  console.log('avoidFoods:', data.avoidFoods);
  console.log('Full data keys:', Object.keys(data));

  const diet = (data.selectedProtocol || 'Carnivore').trim();
  const budget = data.budget || 'moderate';
  const allergies = (data.allergies || '').toLowerCase();
  // Use avoidFoods (form field) or foodRestrictions (API field) - whichever is provided
  // Foods the reader asked us to leave out, PLUS foods withheld for a declared medical
  // reason (api/medical-context.js). Both go through the same shouldFilterOutFood()
  // path: one mechanism, so a medical exclusion cannot be honoured in the meal plan
  // and forgotten in the grocery list. This removes items; it never swaps in a
  // "safer" quantity of the removed one.
  const foodRestrictions = withMedicalFoodExclusions(
    (data.avoidFoods || data.foodRestrictions || '').toLowerCase(),
    deriveMedicalContext(data)
  );

  console.log('[generateFullMealPlan] ===  MEAL PLAN GENERATION START ===');
  console.log('[generateFullMealPlan] Diet/Protocol:', diet);
  console.log('[generateFullMealPlan] Budget:', budget);
  console.log('[generateFullMealPlan] Allergies:', allergies);
  console.log('[generateFullMealPlan] Food Restrictions:', foodRestrictions);
  console.log('[generateFullMealPlan] Has macros?:', !!data.macros);
  console.log('[generateFullMealPlan] Macros:', data.macros);

  // Normalize budget - "flexible" means any cost level is acceptable
  const normalizedBudget = budget.toLowerCase();
  const skipBudgetFilter = normalizedBudget === 'flexible' || normalizedBudget === '';
  console.log('[generateFullMealPlan] Normalized budget:', normalizedBudget, 'Skip budget filter:', skipBudgetFilter);

  // Filter proteins by diet, budget, allergies, and restrictions (case-insensitive diet matching)
  // DEBUG: Log each protein's filter results
  console.log('[generateFullMealPlan] === PROTEIN FILTER DEBUG ===');
  console.log('[generateFullMealPlan] Total proteins in DB:', foodDatabase.proteins.length);

  const availableProteins = foodDatabase.proteins.filter(p => {
    const dietMatch = p.diet.some(d => d.toLowerCase() === diet.toLowerCase());
    const budgetMatch = skipBudgetFilter || p.cost.includes(normalizedBudget);
    const notFiltered = !shouldFilterOutFood(p, allergies, foodRestrictions);

    // Log first 5 proteins that FAIL any filter
    if (!dietMatch || !budgetMatch || !notFiltered) {
      if (p.name.toLowerCase().includes('salmon') || p.name.toLowerCase().includes('cod') || p.name.toLowerCase().includes('tuna')) {
        console.log(`[FILTER] ${p.name}: diet=${dietMatch}(${p.diet.join(',')}), budget=${budgetMatch}(${p.cost.join(',')}), notFiltered=${notFiltered}`);
      }
    }

    return dietMatch && budgetMatch && notFiltered;
  });

  console.log('[generateFullMealPlan] Available proteins after filtering:', availableProteins.length);
  console.log('[generateFullMealPlan] First 5 proteins:', availableProteins.slice(0, 5).map(p => p.name).join(', '));

  // Fallback: if no matches, try same diet without budget filter
  if (availableProteins.length === 0) {
    console.log('[generateFullMealPlan] No proteins found, trying without budget filter...');
    availableProteins.push(...foodDatabase.proteins.filter(p =>
      p.diet.some(d => d.toLowerCase() === diet.toLowerCase()) &&
      !shouldFilterOutFood(p, allergies, foodRestrictions)
    ));
    console.log('[generateFullMealPlan] After diet-only fallback:', availableProteins.length);
  }

  // Last resort fallback: if user has conflicting restrictions, show error message in meal plan
  if (availableProteins.length === 0) {
    console.warn('[generateFullMealPlan] WARNING: No proteins available after applying allergies/restrictions. Diet conflict detected.');
    return {
      weeks: [],
      warning: `Your diet selection (${diet}) conflicts with your allergies/restrictions. Please review your selections.`
    };
  }

  // Rotation pool: very lean proteins (cod, tuna, shellfish) can't reach the per-meal
  // calorie target within the 500g portion cap, because portions are protein-anchored -
  // a cod-based day came out ~1,000 cal under target (ISSUE-069 follow-up). Keep them
  // out of the automatic rotation; the substitution guide still offers them as swaps.
  const MIN_ROTATION_CAL_DENSITY = 150; // calories per 100g
  const rotationProteins = availableProteins.filter(p => p.calories >= MIN_ROTATION_CAL_DENSITY);
  if (rotationProteins.length === 0) rotationProteins.push(...availableProteins);

  // Get macro targets for portion calculations
  const dailyCalories = data.macros?.calories || 2000;
  const dailyProtein = data.macros?.protein_grams || 150; // grams
  const dailyFat = data.macros?.fat_grams || 130; // grams
  const mealsPerDay = data.mealsPerDay || 2; // Default to 2 meals (common for carnivore)
  const calPerMeal = Math.round(dailyCalories / mealsPerDay);

  console.log(`[generateFullMealPlan] Daily macros: ${dailyProtein}g protein, ${dailyFat}g fat, ${mealsPerDay} meals/day`);

  // Calculate per-meal macros based on actual meals per day
  const proteinPerMeal = Math.round(dailyProtein / mealsPerDay);
  const fatPerMeal = Math.round(dailyFat / mealsPerDay);

  console.log(`[generateFullMealPlan] Per-meal targets: ${proteinPerMeal}g protein, ${fatPerMeal}g fat`);

  // Generate 30-day meal plan
  const mealPlan = {
    weeks: []
  };

  // Generate all 30 days
  for (let dayNum = 1; dayNum <= MEAL_PLAN_DAYS; dayNum++) {
    const week = Math.ceil(dayNum / 7);

    // Create week object if doesn't exist
    if (!mealPlan.weeks[week - 1]) {
      mealPlan.weeks[week - 1] = {
        weekNumber: week,
        days: []
      };
    }

      // Rotate through proteins for variety
      const proteinIndex = dayNum % rotationProteins.length;
      const mainProtein = rotationProteins[proteinIndex];
      const altProtein = rotationProteins[(proteinIndex + 1) % rotationProteins.length];

      // Generate meals based on diet type
      // Check if eggs are allowed (not in allergies or restrictions)
      const eggsAllowed = !shouldFilterOutFood(
        { name: 'Eggs', category: 'Eggs' },
        allergies,
        foodRestrictions
      );

      // Calculate portion sizes accounting for ALL ingredients
      // Food database has .protein and .fat per 100g

      // Known nutritional values for common additions
      const EGG_PROTEIN = 13; // grams protein per egg
      const EGG_FAT = 11; // grams fat per egg
      const BUTTER_FAT = 11; // grams fat per tbsp
      const AVOCADO_FAT = 11; // grams fat per 1/2 avocado

      const eggCount = eggsAllowed ? 2 : 0; // 2 eggs if allowed
      const eggProtein = eggCount * EGG_PROTEIN; // 26g if eggs allowed, 0 otherwise
      const eggFat = eggCount * EGG_FAT; // 22g if eggs allowed, 0 otherwise

      // Calculate how much protein we need from meat (after accounting for eggs)
      // For meals with eggs, meat provides less protein
      // For meals without eggs, meat provides all protein

      // Helper function: Calculate meat portion accounting for eggs
      const calculateMeatPortion = (food, targetProteinGrams, includeEggs) => {
        const proteinFromEggs = includeEggs ? eggProtein : 0;
        const proteinNeededFromMeat = targetProteinGrams - proteinFromEggs;
        let meatGrams = Math.round((proteinNeededFromMeat * 100) / food.protein);

        // Calorie ceiling: portions are protein-anchored, so dense cuts (duck, bacon,
        // fatty fish) can land a meal ~25% past its calorie budget. Cap the portion to
        // the meal's calorie budget (eggs + base butter accounted for), floor 150g so
        // meals stay real. Lean meals get topped back up by butterizeExtras below.
        const eggCals = includeEggs ? (eggProtein * 4 + eggFat * 9) : 0;
        const calCapGrams = Math.floor((calPerMeal - eggCals - 102) * 100 / food.calories);
        meatGrams = Math.max(150, Math.min(meatGrams, calCapGrams));

        // Return portion and actual macros delivered
        const actualProtein = (meatGrams / 100) * food.protein + proteinFromEggs;
        const actualFat = (meatGrams / 100) * food.fat + (includeEggs ? eggFat : 0);

        return {
          grams: meatGrams,
          protein: actualProtein,
          fat: actualFat
        };
      };

      // Generate meals array based on mealsPerDay
      const meals = [];

      // MEAL VARIETY FIX: For high-calorie targets (3000+), split large portions between two proteins
      // to improve palatability. Max single protein portion is 500g.
      const MAX_SINGLE_PROTEIN_GRAMS = 500;

      // Portions are protein-anchored, so meals built on leaner cuts land under the
      // calorie target. Close the gap with the cooking fat: scale the butter from the
      // fixed "1 tbsp" up to at most 4 tbsp (each ~102 cal / 11g fat).
      const BUTTER_CAL_PER_TBSP = 102;
      // Returns BOTH the display string and the structured items behind it. Every
      // ingredient the reader is told to buy has to leave this function as data, not
      // only as prose: the grocery list is aggregated from these items and from
      // nothing else (see generateGroceryListByWeek), which is what stops the meal
      // calendar and the shopping list from drifting apart the way they did for the
      // 2026-09-07 reports.
      const butterizeExtras = (extras, mealProteinG, mealFatG) => {
        const items = [];
        for (const [needle, item] of NON_MEAT_EXTRAS) {
          if (extras.includes(needle)) items.push({ ...item });
        }
        if (!extras.includes('1 tbsp Butter')) return { text: extras, items };
        const mealCals = mealProteinG * 4 + mealFatG * 9;
        const tbsp = Math.min(4, Math.max(1, Math.round((calPerMeal - mealCals) / BUTTER_CAL_PER_TBSP)));
        for (const it of items) if (it.name === 'Butter') it.qty = tbsp;
        return { text: extras.replace('1 tbsp Butter', `${tbsp} tbsp Butter`), items };
      };

      // Helper: Generate meal description, splitting if portion > 500g
      // STRICT ENFORCEMENT: Never exceed 500g per protein source
      // ---------------------------------------------------------------------
      // DISPLAY UNITS
      // Every ingredient is created as a structured item carrying an explicit
      // display unit, and the sentence the reader sees is RENDERED FROM those
      // items. Nothing builds the prose and the data separately, so the two
      // cannot disagree, and the grocery list aggregates the same objects.
      //
      // Before this, portions were always printed in grams because that is how
      // the nutrition maths works. That produced "423g Eggs", and where the
      // rotation protein was Eggs and the meal also carried the counted egg
      // extra, it produced "2 Eggs, 223g Eggs": one ingredient, twice, in two
      // units, in one sentence.
      // ---------------------------------------------------------------------

      /** Build one structured ingredient from a food-database entry and a gram portion. */
      const meatItem = (food, grams) => {
        const unit = displayUnitFor(food);
        if (unit === 'g') {
          return { name: food.name, category: food.category || 'Protein', unit: 'g', qty: grams,
                   grams, protein: food.protein, calories: food.calories, cost: food.cost, diet: food.diet };
        }
        // Count-denominated food (eggs). ROUNDING POLICY: nearest whole unit,
        // minimum one. The rounded count is AUTHORITATIVE: it is what the reader
        // is told to cook and what the shopping list aggregates, so `grams` is
        // restated from it rather than kept at the pre-rounding figure. Maximum
        // rounding error is half a unit; the suite measures the resulting
        // nutrition variance against an explicit tolerance.
        const per = GRAMS_PER_UNIT[unit];
        const qty = Math.max(1, Math.round(grams / per));
        return { name: food.name, category: food.category || 'Protein', unit, qty,
                 grams: qty * per, protein: food.protein, calories: food.calories,
                 cost: food.cost, diet: food.diet };
      };

      const eggItems = (includeEggs) =>
        includeEggs && eggCount > 0
          ? [{ name: 'Eggs', category: 'Eggs', unit: 'each', qty: eggCount, grams: eggCount * GRAMS_PER_EGG }]
          : [];

      /**
       * Merge duplicates, then render. Merging is what stops "2 Eggs, 223g Eggs":
       * one ingredient appears once per meal, in one unit, with one quantity.
       */
      const buildMeal = (parts) => {
        const merged = [];
        for (const part of parts) {
          if (!part) continue;
          const seen = merged.find(m => m.name === part.name);
          if (!seen) { merged.push({ ...part }); continue; }
          if (seen.unit !== part.unit) {
            throw new Error(`meal render: "${part.name}" appears twice in one meal as ` +
              `"${seen.unit}" and "${part.unit}". One ingredient, one display unit.`);
          }
          seen.qty += part.qty;
          if (typeof seen.grams === 'number' && typeof part.grams === 'number') seen.grams += part.grams;
        }
        return { description: merged.map(renderIngredient).join(', '), items: merged };
      };

      const generateMealDescription = (protein1, protein2, targetProtein, includeEggs, extras = '') => {
        const portion = calculateMeatPortion(protein1, targetProtein, includeEggs);

        if (portion.grams > MAX_SINGLE_PROTEIN_GRAMS) {
          if (protein2 && protein1.name !== protein2.name) {
            const halfProtein = Math.round(targetProtein / 2);
            const portion1 = calculateMeatPortion(protein1, halfProtein, false);
            const portion2 = calculateMeatPortion(protein2, halfProtein, false);
            const splitProtein = portion1.protein + portion2.protein + (includeEggs ? eggProtein : 0);
            const splitFat = portion1.fat + portion2.fat + (includeEggs ? eggFat : 0);
            const splitExtras = butterizeExtras(extras, splitProtein, splitFat);
            return buildMeal([...eggItems(includeEggs), meatItem(protein1, portion1.grams),
                              meatItem(protein2, portion2.grams), ...splitExtras.items]);
          }
          // Only one protein available. HARD CAP at 500g per serving, with the
          // serving count carried on the item so the shopping list buys the
          // whole day rather than one portion of it.
          const servings = Math.ceil(portion.grams / MAX_SINGLE_PROTEIN_GRAMS);
          const cappedExtras = butterizeExtras(extras, portion.protein, portion.fat);
          const capped = meatItem(protein1, MAX_SINGLE_PROTEIN_GRAMS);
          const built = buildMeal([...eggItems(includeEggs),
                                   { ...capped, qty: capped.qty * servings, grams: capped.grams * servings, servings },
                                   ...cappedExtras.items]);
          // Restate the split for the reader without changing what is bought.
          built.description = built.description.replace(
            renderIngredient({ ...capped, qty: capped.qty * servings, grams: capped.grams * servings }),
            `${renderIngredient(capped)} (x${servings} servings throughout day)`);
          return built;
        }

        const ex = butterizeExtras(extras, portion.protein, portion.fat);
        return buildMeal([...eggItems(includeEggs), meatItem(protein1, portion.grams), ...ex.items]);
      };

      if (mealsPerDay === 1) {
        // One meal per day (OMAD) - typically Lion diet.
        // Rendered through buildMeal like every other branch. This branch used to
        // build its own gram strings, which is why "523g Eggs" survived the first
        // pass at display units: the fix has to live in one place or it lives in none.
        const portion = calculateMeatPortion(mainProtein, proteinPerMeal, false);
        // STRICT: For OMAD with high calories, always split if over 500g
        if (portion.grams > MAX_SINGLE_PROTEIN_GRAMS) {
          if (altProtein && mainProtein.name !== altProtein.name) {
            const halfProtein = Math.round(proteinPerMeal / 2);
            const p1 = calculateMeatPortion(mainProtein, halfProtein, false);
            const p2 = calculateMeatPortion(altProtein, halfProtein, false);
            const built = buildMeal([meatItem(mainProtein, p1.grams), meatItem(altProtein, p2.grams)]);
            meals.push({ name: 'Meal', description: built.description, items: built.items });
          } else {
            // Only one protein - cap at 500g per serving with a servings note
            const servings = Math.ceil(portion.grams / MAX_SINGLE_PROTEIN_GRAMS);
            const capped = meatItem(mainProtein, MAX_SINGLE_PROTEIN_GRAMS);
            const whole = { ...capped, qty: capped.qty * servings, grams: capped.grams * servings, servings };
            const built = buildMeal([whole]);
            built.description = built.description.replace(
              renderIngredient(whole), `${renderIngredient(capped)} (x${servings} servings)`);
            meals.push({ name: 'Meal', description: built.description, items: built.items });
          }
        } else {
          const built = buildMeal([meatItem(mainProtein, portion.grams)]);
          meals.push({ name: 'Meal', description: built.description, items: built.items });
        }

      } else if (mealsPerDay === 2) {
        // Two meals per day (common for carnivore/keto)

        // Meal 1 (Morning): Include eggs if allowed
        const isKeto = diet.toLowerCase().includes('keto');
        const extras1 = isKeto ? ', 1/2 Avocado' : ', 1 tbsp Butter';
        const meal1 = generateMealDescription(mainProtein, altProtein, proteinPerMeal, eggsAllowed, extras1);
        meals.push({ name: 'Meal 1', description: meal1.description, items: meal1.items });

        // Meal 2 (Evening): Alternate protein without eggs
        const extras2 = isKeto ? ', 1 cup Broccoli, 1 tbsp Butter' : ', 1 tbsp Butter';
        // Use a third protein if available for more variety
        const thirdProtein = rotationProteins[(proteinIndex + 2) % rotationProteins.length];
        const meal2 = generateMealDescription(altProtein, thirdProtein, proteinPerMeal, false, extras2);
        meals.push({ name: 'Meal 2', description: meal2.description, items: meal2.items });

      } else {
        // Three meals per day - use generateMealDescription for variety on high-calorie plans
        const isKeto = diet.toLowerCase().includes('keto');
        const thirdProtein = rotationProteins[(proteinIndex + 2) % rotationProteins.length];

        // Breakfast: Include eggs if allowed
        const breakfastExtras = isKeto ? ', 1/2 Avocado' : ', 1 tbsp Butter';
        const breakfastMeal = generateMealDescription(mainProtein, altProtein, proteinPerMeal, eggsAllowed, breakfastExtras);
        meals.push({ name: 'Breakfast', description: breakfastMeal.description, items: breakfastMeal.items });

        // Lunch: Main protein, no eggs
        const lunchExtras = isKeto ? ', 1 cup Leafy Greens, 1 tbsp Butter' : '';
        const lunchMeal = generateMealDescription(mainProtein, thirdProtein, proteinPerMeal, false, lunchExtras);
        meals.push({ name: 'Lunch', description: lunchMeal.description, items: lunchMeal.items });

        // Dinner: Alternate protein, no eggs
        const dinnerExtras = isKeto ? ', 1 cup Broccoli, 1 tbsp Butter' : ', 1 tbsp Butter';
        const dinnerMeal = generateMealDescription(altProtein, thirdProtein, proteinPerMeal, false, dinnerExtras);
        meals.push({ name: 'Dinner', description: dinnerMeal.description, items: dinnerMeal.items });
      }

    // Build day object with only the meals that should be included
    const dayObj = {
      dayNumber: dayNum,
      // Structured truth for this day. The rendered strings above are for the reader;
      // THIS is what the grocery list is built from.
      items: meals.flatMap(m => m.items || []),
      // The day's meals in order, named by what they actually are. The calendar table
      // is built from this, so a 2-meal plan renders two columns instead of three with
      // an empty one. Legacy breakfast/lunch/dinner fields below are kept for the
      // sample-day and substitution-guide code that still reads them.
      meals: meals.map(m => ({ name: m.name, description: m.description }))
    };

    // Add meals dynamically (supports 1, 2, or 3 meals)
    meals.forEach((meal, index) => {
      if (mealsPerDay === 1) {
        dayObj.meal = meal.description;
      } else if (mealsPerDay === 2) {
        if (index === 0) dayObj.meal1 = meal.description;
        if (index === 1) dayObj.meal2 = meal.description;
      } else {
        if (index === 0) dayObj.breakfast = meal.description;
        if (index === 1) dayObj.lunch = meal.description;
        if (index === 2) dayObj.dinner = meal.description;
      }
    });

    mealPlan.weeks[week - 1].days.push(dayObj);
  }

  return mealPlan;
}

/**
 * Every non-meat extra a meal description can mention, mapped to the structured item
 * behind it. If you add a new extra to a meal string, add it here in the same commit:
 * the grocery list is built only from structured items, so an extra that is missing
 * from this table is an extra the reader is never told to buy.
 */
const NON_MEAT_EXTRAS = [
  ['1 tbsp Butter',        { name: 'Butter',            category: 'Dairy',   unit: 'tbsp', qty: 1 }],
  ['1/2 Avocado',          { name: 'Avocado',           category: 'Produce', unit: 'half', qty: 1 }],
  ['1 cup Leafy Greens',   { name: 'Leafy Greens',      category: 'Produce', unit: 'cup',  qty: 1 }],
  ['1 cup Broccoli',       { name: 'Broccoli',          category: 'Produce', unit: 'cup',  qty: 1 }],
  ['Salt',                 { name: 'Salt',              category: 'Pantry',  unit: 'each', qty: 1 }],
];

/**
 * UNIT NORMALIZATION
 * ------------------
 * Every aggregated ingredient carries an explicit unit. Nothing infers a unit from a
 * bare number. This exists because "Eggs" legitimately arrives two ways in the same
 * week: as a counted extra ("2 Eggs") and as a gram-portioned rotation protein
 * ("423g Eggs", the food database has an Eggs entry with protein per 100g). Summing
 * those without conversion produced a real shopping list that read
 * "Eggs - 660 (55 dozen)". Grams were being counted as eggs.
 */

/**
 * DISPLAY UNITS
 * -------------
 * Nutrition is computed in grams throughout, because that is what the food database
 * stores. But a reader does not buy or cook 423 grams of egg. Every ingredient
 * therefore declares the unit it is SHOWN and SHOPPED in, and one renderer turns an
 * item into the words the reader sees.
 *
 * Audited 2026-09-08 across every rotation-eligible food (20 of them, after the
 * calorie-density filter): Beef, Beef Organs, Lamb, Pork, Fish and Poultry are all
 * bought and cooked by weight, so grams is their natural unit. Eggs is the only
 * rotation food that is not, and it was rendering as "423g Eggs".
 *
 * Canned fish (Canned Salmon, Sardines) is a deliberate exception left in grams: a
 * tin is a package size, not a portion, and printing "2 cans" would be inventing a
 * can weight we do not store. Grams here is honest and is never labelled as cans.
 */
const GRAMS_PER_EGG_UNIT = 50;
const GRAMS_PER_UNIT = { each: GRAMS_PER_EGG_UNIT };

/**
 * ROUNDING POLICY for count-denominated foods.
 *
 * A gram portion becomes the NEAREST whole unit, minimum one. The rounded count is
 * authoritative: the item's grams are restated as qty * GRAMS_PER_UNIT so the meal the
 * reader cooks, the macros behind it, and the shopping list all describe the same food.
 *
 * Worst-case error is half a unit, so for eggs at 50g (13g protein, 11g fat, 155 cal
 * per 100g) a single portion can move by at most 25g: 3.25g protein, 2.75g fat, 39 cal.
 * tests/report-integrity.test.mjs asserts both the self-consistency and this bound.
 */
const COUNT_ROUNDING_MAX_GRAMS_ERROR = GRAMS_PER_EGG_UNIT / 2;

/** The unit an ingredient is shown and shopped in. Category-keyed, per-food override. */
function displayUnitFor(food) {
  if (food.displayUnit) return food.displayUnit;
  if (food.category === 'Eggs') return 'each';
  return 'g';
}

/** The single place a structured ingredient becomes the words a reader reads. */
function renderIngredient(item) {
  switch (item.unit) {
    case 'g':    return `${item.qty}g ${item.name}`;
    case 'each': return `${item.qty} ${item.name}`;
    case 'tbsp': return `${item.qty} tbsp ${item.name}`;
    case 'cup':  return `${item.qty} cup ${item.name}`;
    case 'half': return item.qty === 1 ? `1/2 ${item.name}` : `${item.qty / 2} ${item.name}`;
    default:
      throw new Error(`meal render: no display rule for unit "${item.unit}" (${item.name}). ` +
        `Add one to renderIngredient() rather than letting a raw number reach the reader.`);
  }
}

/** One large egg, edible portion. The single place grams of egg become a count. */
const GRAMS_PER_EGG = GRAMS_PER_EGG_UNIT;
/** One tablespoon of butter. The single place grams of butter become tablespoons. */
const GRAMS_PER_TBSP_BUTTER = 14;

/**
 * The unit an ingredient is aggregated and shopped in, decided by category so that the
 * same ingredient always lands in the same unit no matter which meal branch produced it.
 */
function canonicalUnitFor(item) {
  if (item.category === 'Eggs') return 'each';   // you buy eggs by the egg
  if (item.category === 'Dairy') return 'tbsp';  // butter accumulates per meal in tbsp
  if (item.category === 'Produce') return item.unit; // avocado halves, cups of greens
  return 'g';                                    // meat and fish
}

/**
 * Convert one item's quantity into `to`. Every accepted pair is listed explicitly.
 * An unlisted pair throws rather than guessing: a silent wrong conversion is exactly
 * the failure this table exists to prevent.
 */
function convertQuantity(qty, from, to, itemName) {
  if (from === to) return qty;
  const key = `${from}->${to}`;
  const conversions = {
    'g->each': g => g / GRAMS_PER_EGG,              // eggs only; see canonicalUnitFor
    'each->g': n => n * GRAMS_PER_EGG,
    'g->tbsp': g => g / GRAMS_PER_TBSP_BUTTER,      // butter only
    'tbsp->g': t => t * GRAMS_PER_TBSP_BUTTER,
  };
  const fn = conversions[key];
  if (!fn) {
    throw new Error(
      `grocery aggregation: no conversion from "${from}" to "${to}" for "${itemName}". ` +
      `Add one to convertQuantity() with a named constant, or give the ingredient a ` +
      `unit it can actually be shopped in. Do not let this fall through to a bare sum.`
    );
  }
  return fn(qty);
}

// ============================================================================
// 4. GROCERY LIST GENERATOR
// ============================================================================

/**
 * Generate data-driven grocery list using database filtering
 */
/**
 * Build the weekly shopping lists.
 *
 * DERIVED, NEVER REGENERATED. This function does not know what a protein rotation is,
 * does not read foodDatabase, and does not look at budget or diet to choose food. It
 * aggregates the structured `items` that generateFullMealPlan already attached to each
 * day. That is the whole design: the only way the shopping list can disagree with the
 * meal calendar is if the calendar disagrees with itself.
 *
 * History: until 2026-09-08 this function ran its OWN protein rotation
 * (meatProteins[(week-1) % len]) alongside the calendar's per-day rotation
 * (dayNum % len). Two generators, two rotations, guaranteed drift. A customer's Week 1
 * meals called for eight cuts while her Week 1 list named two, neither of which she
 * was ever told to cook. Do not reintroduce a food-selection step here.
 *
 * @param {object} data      report data (used only for the pantry staple line)
 * @param {object} mealPlan  the SAME object rendered into the meal calendar
 */
function generateGroceryListByWeek(data, mealPlan) {
  // Fail loudly. A missing meal plan used to mean "improvise a list"; now it means the
  // caller has a bug, and improvising is the bug we are removing.
  if (!mealPlan || !Array.isArray(mealPlan.weeks)) {
    throw new Error('generateGroceryListByWeek: requires the meal plan it must be derived from');
  }

  const GRAMS_PER_LB = 453.6;
  const BUTTER_TBSP_PER_LB = 32;   // ~14g per tbsp

  // Round up, never down: a short shopping list is a reader standing at the counter
  // without enough meat for the day the calendar told them to cook.
  const roundUpHalfLb = g => Math.max(0.5, Math.ceil((g / GRAMS_PER_LB) * 2) / 2);
  const lbs = n => `${n} ${n === 1 ? 'lb' : 'lbs'}`;

  const groceryLists = {};

  for (const week of mealPlan.weeks) {
    const totals = new Map();   // name -> { name, category, unit, qty, ...meta }

    for (const day of (week.days || [])) {
      for (const item of (day.items || [])) {
        if (!item.unit) {
          throw new Error(`grocery aggregation: "${item.name}" has no unit. Every item a ` +
            `meal emits must declare one; see canonicalUnitFor().`);
        }
        const key = item.name;
        const unit = canonicalUnitFor(item);
        const qty = convertQuantity(item.qty, item.unit, unit, item.name);
        const seen = totals.get(key);
        if (seen) {
          // Two entries for one ingredient must already agree on the canonical unit.
          // If they do not, the category is inconsistent and the sum would be nonsense.
          if (seen.unit !== unit) {
            throw new Error(`grocery aggregation: "${item.name}" resolved to both ` +
              `"${seen.unit}" and "${unit}". One ingredient, one canonical unit.`);
          }
          seen.qty += qty;
        } else {
          totals.set(key, { ...item, unit, qty });
        }
      }
    }

    const all = [...totals.values()];
    const fmtEach = n => (n === 1 ? '1' : String(n));

    // Meats and fish: aggregated in grams, shopped in pounds.
    const proteins = all
      .filter(i => i.unit === 'g' && i.category !== 'Eggs')
      .map(i => ({ ...i, quantity: lbs(roundUpHalfLb(i.qty)) }));

    // Eggs: aggregated as a count (grams already converted via GRAMS_PER_EGG), sold
    // by the dozen. Round up once, here, rather than per item.
    const eggs = all
      .filter(i => i.category === 'Eggs')
      .map(i => {
        const count = Math.ceil(i.qty);
        return { ...i, qty: count, quantity: `${count} (${Math.ceil(count / 12)} dozen)` };
      });

    // Fats: butter aggregated in tbsp, shopped in pounds.
    const fats = all
      .filter(i => i.category === 'Dairy')
      .map(i => ({
        ...i,
        quantity: lbs(Math.max(0.5, Math.ceil((i.qty / BUTTER_TBSP_PER_LB) * 2) / 2))
      }));

    const produce = all
      .filter(i => i.category === 'Produce')
      .map(i => ({
        ...i,
        quantity: i.unit === 'half' ? `${Math.ceil(i.qty / 2)}` : `${fmtEach(i.qty)} ${i.unit}s`
      }));

    groceryLists[`week${week.weekNumber}`] = {
      weekNumber: week.weekNumber,
      proteins,
      fats,
      eggs,
      pantry: [
        ...produce,
        { name: 'Salt (Redmond Real Salt)', quantity: '1 container', category: 'Pantry' }
      ]
    };
  }

  return groceryLists;
}

// ============================================================================
// 5. MAIN REPORT ORCHESTRATOR
// ============================================================================

// ============================================================================
// MARKDOWN TO HTML CONVERSION UTILITIES
// ============================================================================

/**
 * Escape HTML special characters
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Apply inline markdown formatting (bold, italic, links, code)
 */
function applyInlineFormatting(html) {
  // Images (must come before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; margin: 12pt 0;">');

  // Bold.
  //
  // [\s\S] rather than '.' because '.' does not match a newline. The report's
  // markdown is hard-wrapped at roughly 80 characters and bold phrases routinely
  // straddle a line break, so with '.' they never matched and the customer was
  // shown literal '**'. Found in a real paid report on 2026-09-09, where the
  // worst case spanned a page break:
  //
  //   **Take this report to your doctor or pharmacist before you start, and let
  //   them tell you which parts apply to you.**
  //
  // The negative lookahead stops one unbalanced '**' from swallowing everything
  // up to the next one across a block boundary.
  html = html.replace(/\*\*((?:(?!\*\*|<\/p>|<\/h[1-6]>|<\/li>|<\/td>)[\s\S])*?)\*\*/g, '<strong>$1</strong>');
  // A RUN of underscores is a fill-in blank, not emphasis. The one-page physician
  // handout ends with:
  //
  //   **Patient Signature:** ___________________________   **Date:** __________
  //
  // The `__` bold rule chewed through that run, emitted empty <strong></strong>
  // pairs, and left one stray `_` behind. The `_italic_` rule below then paired that
  // stray with an underscore thousands of characters later, opening an <em> that ran
  // 7,823 characters: the whole of Section 8 and the Laboratory Reference Guide
  // rendered in italics for the customer. Found by looking at page images of a real
  // generated report on 2026-09-09, after the text-only checks had all passed.
  //
  // Protect the runs, do the emphasis, put them back. Restoring uses a function
  // replacement so a `$` in the blank cannot be read as a capture reference.
  const underscoreRuns = [];
  html = html.replace(/_{3,}/g, (run) => {
    underscoreRuns.push(run);
    return `\u0000UNDERSCORERUN${underscoreRuns.length - 1}\u0000`;
  });

  html = html.replace(/__((?:(?!__|<\/p>|<\/h[1-6]>|<\/li>|<\/td>)[\s\S])*?)__/g, '<strong>$1</strong>');

  // Italic (but not inside bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

  // Blanks restored exactly as the reader must see them.
  html = html.replace(/\u0000UNDERSCORERUN(\d+)\u0000/g, (_m, i) => underscoreRuns[Number(i)]);

  // Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return html;
}

/**
 * Convert markdown to HTML with proper section wrapping.
 *
 * Split out of markdownToHTML() on 2026-09-09 so that blockquotes can render their
 * inner content recursively without applyInlineFormatting() running twice over the
 * same text. Block structure is decided here; inline formatting runs exactly once,
 * in markdownToHTML() below.
 */
function markdownToBlockHTML(markdown, depth = 0) {
  // Depth cap. Each blockquote level strips one '>' before recursing, so well
  // formed input terminates on its own. The cap exists so that malformed input,
  // or a future edit that stops stripping the prefix, degrades into slightly ugly
  // output instead of blowing the worker's stack on a paid request. Found by
  // mutation testing on 2026-09-09: removing the prefix strip turned a rendering
  // bug into a RangeError.
  if (depth > 8) {
    return '<p>' + markdown + '</p>\n';
  }

  const lines = markdown.split('\n');
  let html = '';
  let currentParagraph = [];
  // The OPEN list's tag, or null. It was a boolean, which was fine while '<ul>' was
  // the only list that existed. Ordered lists close with '</ol>', so the state has to
  // remember which one it opened.
  let listTag = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (/^#+\s/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (listTag) {
        html += `</${listTag}>\n`;
        listTag = null;
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }

      const level = line.match(/^#+/)[0].length;
      const title = line.replace(/^#+\s*/, '');
      html += `<h${level}>${escapeHTML(title)}</h${level}>\n`;
    }
    // Blockquote: a contiguous run of lines starting with '>'.
    //
    // buildMedicalSafetyRules() and buildProteinTargetNote() in
    // api/medical-context.js emit every medical safety block as a markdown
    // blockquote. Until 2026-09-09 there was no branch for them here, so those
    // lines fell through to the paragraph case below and a paying customer saw
    // literal '>' and '###' in the safety sections of a report. The '>' prefix
    // also defeated the heading test above, so '> ### Heading' was not a heading.
    //
    // The quoted body is rendered by recursing, so headings, bold, lists and
    // multiple paragraphs inside a quote take exactly the same code path they
    // take anywhere else. Each level of recursion strips one '>', so nested
    // quotes terminate.
    else if (/^>/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (listTag) {
        html += `</${listTag}>\n`;
        listTag = null;
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }

      const quoted = [];
      while (i < lines.length && /^>/.test(lines[i])) {
        // Strip one '>' plus the single optional space after it. A bare '>' line
        // becomes '', which separates paragraphs inside the quote.
        quoted.push(lines[i].replace(/^>[ \t]?/, ''));
        i++;
      }
      i--; // the for-loop increment would otherwise swallow the line after the quote

      html += '<blockquote class="safety-callout">\n'
        + markdownToBlockHTML(quoted.join('\n'), depth + 1)
        + '</blockquote>\n';
    }
    // Horizontal rule
    else if (/^---+$/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      html += '<hr>\n';
    }
    // Empty line
    else if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (listTag) {
        // A blank line BETWEEN numbered items does not end the list, it makes it a
        // loose one, and markdown renders it as a single list. Closing it here opened
        // a fresh <ol> for every item, and each one started at 1: a paying customer
        // read "1. Make dinner your largest meal / 1. If you're hungry after dinner /
        // 1. Clear the kitchen / 1. Identify the trigger" in Report #1, because the
        // model writes its steps with blank lines between them.
        //
        // So look past the blank run before deciding. Another numbered item means the
        // list is still going; anything else (prose, a heading, a table, a bullet)
        // closes it exactly as before. Ordered lists only, deliberately: unordered
        // lists behave the way they always have.
        let nextContent = '';
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() === '') continue;
          nextContent = lines[j];
          break;
        }
        const listContinues = listTag === 'ol' && /^\d{1,3}\.\s+\S/.test(nextContent);
        if (!listContinues) {
          html += `</${listTag}>\n`;
          listTag = null;
        }
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
    }
    // List item
    else if (/^[\*\-]\s/.test(line)) {
      if (!listTag && currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (listTag && listTag !== 'ul') { html += `</${listTag}>\n`; listTag = null; }
      if (!listTag) { html += '<ul>\n'; listTag = 'ul'; }
      const item = line.replace(/^[\*\-]\s*/, '');
      html += `<li>${escapeHTML(item)}</li>\n`;
    }
    // Ordered list item.
    //
    // Until 2026-09-09 there was no branch for these, so every numbered list in the
    // report ran together as one paragraph: "1. Lab monitoring - Baseline now, recheck
    // at 8 weeks 2. Medication monitoring - What you want me to watch". Nine places in
    // a delivered PDF, including the patient's own requests to their doctor and the
    // tracker instructions.
    //
    // Scope, deliberately narrow, because a false positive turns prose into a list:
    //   * the digits must open the line and be followed by '. ' and real content
    //   * at most three digits, so a year at the start of a wrapped line ("2026. ")
    //     is the only shape that could collide and even that needs the period
    //   * headings are already handled above, so '### 1. IDENTIFYING THE ENEMY'
    //     never reaches here, and a bolded pseudo-heading '**1. ApoB**' starts with
    //     '*' so it does not match either. Both shapes appear in real reports.
    else if (/^\d{1,3}\.\s+\S/.test(line)) {
      if (!listTag && currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }
      if (listTag && listTag !== 'ol') { html += `</${listTag}>\n`; listTag = null; }
      if (!listTag) { html += '<ol>\n'; listTag = 'ol'; }
      const item = line.replace(/^\d{1,3}\.\s*/, '');
      html += `<li>${escapeHTML(item)}</li>\n`;
    }
    // Table row
    else if (/^\|.*\|$/.test(line)) {
      if (currentParagraph.length > 0) {
        html += '<p>' + currentParagraph.join('\n') + '</p>\n';
        currentParagraph = [];
      }

      const cells = line.split('|').filter(c => c.trim());
      const isSeparator = cells.every(cell => /^[:|-]+$/.test(cell.trim()));
      if (isSeparator) continue;

      const isPlaceholder = cells.every(cell => {
        const trimmed = cell.trim();
        return /^[-_☐\s]+$/.test(trimmed) || trimmed === '';
      });
      if (isPlaceholder) continue;

      if (!inTable) {
        html += '<table>\n';
        inTable = true;
      }

      html += '<tr>\n';
      cells.forEach(cell => {
        const content = cell.trim();
        if (/^[-_☐\s]+$/.test(content) || content === '') {
          html += '<td></td>\n';
        } else if (!/^-+$/.test(content)) {
          html += `<td>${escapeHTML(content)}</td>\n`;
        }
      });
      html += '</tr>\n';
    }
    // Regular paragraph
    else if (line.trim()) {
      // Lazy continuation of a hard-wrapped list item.
      //
      // The report's markdown wraps at roughly 80 characters, so a long bullet
      // runs onto the next line. Treated as a new paragraph it closed the list
      // and left the remainder stranded at the margin, which is how Report #10's
      // electrolyte bullets rendered as "Sodium: 3-5 grams a day for most adults,
      // up to 6 grams if you are training hard" followed by an orphaned "or
      // working in the heat." (found 2026-09-09 while reading a delivered PDF).
      // A blank line still closes the list, so a genuine following paragraph is
      // unaffected.
      if (listTag && html.endsWith('</li>\n')) {
        html = html.slice(0, -'</li>\n'.length) + ' ' + escapeHTML(line.trim()) + '</li>\n';
      } else {
        if (listTag) {
          html += `</${listTag}>\n`;
          listTag = null;
        }
        if (inTable) {
          html += '</table>\n';
          inTable = false;
        }
        currentParagraph.push(line);
      }
    }
  }

  // Flush remaining content
  if (currentParagraph.length > 0) {
    html += '<p>' + currentParagraph.join('\n') + '</p>\n';
  }
  if (listTag) html += `</${listTag}>\n`;
  if (inTable) html += '</table>\n';

  return html;
}

/**
 * Convert markdown to HTML: block structure first, then one inline pass over the
 * whole document so nothing is formatted twice.
 */
function markdownToHTML(markdown) {
  return applyInlineFormatting(markdownToBlockHTML(markdown));
}

/**
 * Wrap markdown report in print-optimized HTML with CSS
 */
function wrapInPrintHTML(markdownContent, userData = {}) {
  console.log('[wrapInPrintHTML] userData.firstName:', userData.firstName);
  console.log('[wrapInPrintHTML] userData.lastName:', userData.lastName);

  const printCSS = `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    h1, h2, h3 { margin-top: 1.5em; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }

    /* Medical safety callouts. These carry the disclaimer, the "what you told us"
       summary, the kidney and medication warnings and the electrolyte suppression
       note, so they have to read as a deliberate part of the document rather than
       as leftover markup. Deliberately full body size: this report goes to readers
       in their 50s, 60s and 70s, and the safety text is the last thing that should
       ever shrink. */
    blockquote.safety-callout {
      margin: 1.6em 0;
      padding: 16px 22px;
      border-left: 4px solid #8c2f21;
      background: #faf6f3;
      border-radius: 4px;
      font-size: 1em;
      line-height: 1.65;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    blockquote.safety-callout > *:first-child { margin-top: 0; }
    blockquote.safety-callout > *:last-child { margin-bottom: 0; }

    blockquote.safety-callout h1,
    blockquote.safety-callout h2,
    blockquote.safety-callout h3,
    blockquote.safety-callout h4 {
      margin: 0 0 0.6em;
      font-size: 1.05em;
      line-height: 1.4;
    }

    blockquote.safety-callout p { margin: 0 0 0.85em; }
    blockquote.safety-callout ul { margin: 0 0 0.85em; padding-left: 1.3em; }
    blockquote.safety-callout strong { color: #6d2418; }

    .cover-page {
      text-align: center;
      padding: 50px 0;
    }

    .cover-logo img {
      max-width: 300px;
    }

    .cover-title {
      font-size: 28px;
      margin: 30px 0;
    }

    .save-pdf-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffd700;
      color: #000;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }

    @media print {
      .no-print, .save-pdf-button { display: none; }
    }
  `;

  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let contentHTML = markdownToHTML(markdownContent);
  contentHTML = contentHTML.replace(/<h1>[^<]*<\/h1>\n?/, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Carnivore Diet Report</title>
  <style>${printCSS}</style>
</head>
<body>
  <button class="save-pdf-button no-print" onclick="window.print()">💾 Save as PDF</button>
  <div class="cover-page">
    <div class="cover-logo">
      <img src="https://carnivoreweekly.com/images/logo.png" alt="Carnivore Weekly Logo" />
    </div>
    <h1 class="cover-title">Your Complete Personalized<br>Carnivore Diet Report${userData.firstName ? `<br><span style="font-size: 24pt; font-weight: normal; color: #666;">Prepared for ${userData.firstName}${userData.lastName ? ' ' + userData.lastName : ''}</span>` : ''}</h1>
    <div class="cover-date">Generated on ${generatedDate}</div>
  </div>
  <div class="content-start report-content">
    ${contentHTML}
  </div>
</body>
</html>`;
}

// ============================================================================

/**
 * Generate all 13 personalized reports (Hybrid Architecture)
 *
 * AI-Generated (Personalized):
 * - Report #1: Executive Summary
 * - Report #6: Obstacle Override Protocol
 *
 * Static Templates (with placeholder replacement):
 * - Reports #2-5: Food Guide, Meal Calendar, Shopping, Physician Consultation
 * - Reports #7-13: Restaurant, Science, Labs, Electrolytes, Timeline, Stall-Breaker, Tracker
 */
/**
 * Thrown when the canonical generator refuses to build a report. Carries a structured
 * validation result so the caller can answer the customer properly instead of
 * surfacing a stack trace.
 */
class ReportValidationError extends Error {
  constructor(validation) {
    super(validation.message);
    this.name = 'ReportValidationError';
    this.code = validation.code;
    this.validation = validation;
  }
}

/**
 * Every production report passes through here, so this is where the invariants that
 * must hold for ANY entry point live. Fail closed: a report that contradicts itself is
 * worse than a report that is late.
 */
function assertReportInputsCoherent(data) {
  const goalConflict = detectGoalConflict(data);
  if (goalConflict.blocking) {
    throw new ReportValidationError({
      code: 'GOAL_CONFLICT_UNRESOLVED',
      field: 'goal',
      message: goalConflict.message,
      primaryGoal: goalConflict.primary,
      primaryGoalLabel: goalConflict.primaryLabel,
      conflictingMotivations: goalConflict.conflicting,
      // How a caller clears it: ask the reader which goal should set the calorie
      // target, write their answer to `goal`, and set primaryGoalConfirmed = true.
      resolution: 'CONFIRM_PRIMARY_GOAL',
    });
  }
}

/**
 * THE gate set for report copy. ONE list, used in both places that check text:
 * the bounded retry around a model-written section, and the final read-back over
 * every assembled section.
 *
 * They used to be two lists. `generateCheckedSection` checked two of the four, so a
 * model-written Report #1 or #6 that tripped the other two was not re-asked: it fell
 * through to final assembly and killed the whole generation for a customer who had
 * already paid. Reproduced 2026-09-09 on a declared-kidney-disease persona, where
 * Report #1 wrote "What protein amount is appropriate for your current kidney
 * function" — a question for the reader's clinician, matched by the clearance gate,
 * and one re-ask away from acceptable copy that never happened.
 *
 * Keeping one runner is the fix, not adding two calls in a second place: a fifth gate
 * added here is enforced on both paths by construction, which is what stopped being
 * true when the lists diverged. The order is the order the final loop already used.
 *
 * This changes NO gate's semantics. Each assertion is the same function, called with
 * the same arguments, and the finished report is still validated section by section
 * after assembly.
 */
function assertReportCopyIsClean(sectionLabel, text, ctx) {
  // The claim-frame gate needs the reader's declared context; without it,
  // findConditionClaimFrames() has no terms and returns [] — it passes everything,
  // silently. A caller that forgets this argument would disable one gate of four with
  // no throw and no log, which is the fail-open shape this whole fix is about. So the
  // runner refuses to run rather than run at three quarters strength.
  if (!ctx) {
    throw new Error(`${sectionLabel}: no medical context passed to the report copy gate.`);
  }
  assertNoConditionClaimFrames(sectionLabel, text, ctx);
  // Unconditional, and NOT keyed on ctx: a reader who declared nothing is the one
  // this fires for. "You didn't report anything that requires modified guidance, so
  // your targets are appropriate to follow" shipped on the default path, which means
  // it was the sentence most readers saw.
  assertNoUnfoundedClearance(sectionLabel, text);
  assertNoDeterministicOutcomes(sectionLabel, text);
  assertNoAdvocacy(sectionLabel, text);
}

async function generateAllReports(data, apiKey) {
  // Fail closed before a single section is written or a single token is spent.
  assertReportInputsCoherent(data);

  // CRITICAL VALIDATION: Force diet to lowercase and log source
  const diet = (data.selectedProtocol || 'Carnivore').toLowerCase();
  console.log('========================================');
  console.log('FINAL DIET SELECTION:', diet);
  console.log('isPescatarian:', diet === 'pescatarian');
  console.log('========================================');

  console.log('=== GENERATE ALL REPORTS START ===');
  console.log('Session:', data.sessionToken?.substring(0, 20) + '...');
  console.log('Protocol:', data.selectedProtocol);
  console.log('>>> PERSONALIZATION DATA RECEIVED:');
  console.log('  - Name (firstName):', data.firstName);
  console.log('  - Name (lastName):', data.lastName);
  console.log('  - Allergies:', data.allergies);
  console.log('  - Avoid Foods:', data.avoidFoods);
  console.log('  - Health Conditions:', data.healthConditions);
  console.log('  - Diet:', data.selectedProtocol);
  const startTime = Date.now();

  const reports = {};

  try {
    // Section 1: Executive Summary (AI)
    console.log('>>> Section 1: Executive Summary - STARTING');
    const aiReports = await generateAIReports(data, apiKey);
    reports[1] = aiReports.summary;
    console.log('<<< Section 1: Executive Summary - DONE, length:', reports[1]?.length || 'NULL');

    // Section 2: Food Guide (Template)
    console.log('>>> Section 2: Food Guide - STARTING');
    reports[2] = await loadAndCustomizeTemplate('foodGuide', data);
    console.log('<<< Section 2: Food Guide - DONE, length:', reports[2]?.length || 'NULL');

    // Sections 3 and 4: the meal calendar and the grocery list derived from it.
    //
    // Both are quantitative and both are anchored on the protein target. When that
    // target is withheld they are replaced by the suppression notices, and no plan is
    // generated: see generateFullMealPlan(). The sections stay in place, with their
    // own headings, so the report still has thirteen of them in the same order.
    const suppressQuantities = deriveMedicalContext(data).restrictProteinTarget;

    console.log('>>> Section 3: Meal Calendar - STARTING' + (suppressQuantities ? ' (SUPPRESSED)' : ''));
    reports[3] = suppressQuantities
      ? buildSuppressedMealCalendarSection()
      : await loadAndCustomizeTemplate('mealCalendar', data);
    console.log('<<< Section 3: Meal Calendar - DONE, length:', reports[3]?.length || 'NULL');

    console.log('>>> Section 4: Shopping List - STARTING' + (suppressQuantities ? ' (SUPPRESSED)' : ''));
    reports[4] = suppressQuantities
      ? buildSuppressedGroceryListSection()
      : await loadAndCustomizeTemplate('shoppingList', data);
    console.log('<<< Section 4: Shopping List - DONE, length:', reports[4]?.length || 'NULL');

    // Section 5: Physician Consultation (Template)
    console.log('>>> Section 5: Physician Consultation - STARTING');
    reports[5] = await loadAndCustomizeTemplate('physicianConsult', data);
    console.log('<<< Section 5: Physician Consultation - DONE, length:', reports[5]?.length || 'NULL');

    // Section 6: Obstacle Protocol (AI)
    console.log('>>> Section 6: Obstacle Protocol - STARTING');
    reports[6] = aiReports.obstacle;
    console.log('<<< Section 6: Obstacle Protocol - DONE, length:', reports[6]?.length || 'NULL');

    // Section 7: Restaurant Guide (Template)
    console.log('>>> Section 7: Restaurant Guide - STARTING');
    reports[7] = await loadAndCustomizeTemplate('restaurant', data);
    console.log('<<< Section 7: Restaurant Guide - DONE, length:', reports[7]?.length || 'NULL');

    // Section 8: Science & Evidence (Template)
    console.log('>>> Section 8: Science & Evidence - STARTING');
    reports[8] = await loadAndCustomizeTemplate('science', data);
    console.log('<<< Section 8: Science & Evidence - DONE, length:', reports[8]?.length || 'NULL');

    // Section 9: Lab Monitoring (Template)
    console.log('>>> Section 9: Lab Monitoring - STARTING');
    reports[9] = await loadAndCustomizeTemplate('labs', data);
    console.log('<<< Section 9: Lab Monitoring - DONE, length:', reports[9]?.length || 'NULL');

    // Section 10: Electrolyte Protocol (Template)
    console.log('>>> Section 10: Electrolyte Protocol - STARTING');
    reports[10] = await loadAndCustomizeTemplate('electrolytes', data);
    console.log('<<< Section 10: Electrolyte Protocol - DONE, length:', reports[10]?.length || 'NULL');

    // Section 11: Timeline (Template)
    console.log('>>> Section 11: Timeline - STARTING');
    reports[11] = await loadAndCustomizeTemplate('timeline', data);
    console.log('<<< Section 11: Timeline - DONE, length:', reports[11]?.length || 'NULL');

    // Section 12: Stall Breaker (Template) — FAT LOSS ONLY.
    //
    // "What to do if weight loss stalls" is a fat-loss intervention, and its remedies
    // are "reduce added fat by 20%" and "track dairy and cut it by 50%". Printed under
    // a maintenance goal it contradicts the reader's own target and pushes them toward
    // a deficit they did not ask for. A 67-year-old maintenance customer at 120 lbs
    // received exactly this on 2026-09-07 alongside a page-one "1,463 (maintenance)".
    //
    // SUPPRESS, DO NOT SUBSTITUTE. A goal-appropriate replacement would be new
    // guidance nobody reviewed, so the section is omitted and the tracker moves up to
    // take its number. Renumbering is safe because nothing cross-references #12 or
    // #13; the only inline reference in any template points at Report #10.
    const goalKey = resolveGoal(data).key;
    if (goalKey === 'lose') {
      console.log('>>> Section 12: Stall Breaker - STARTING');
      reports[12] = await loadAndCustomizeTemplate('stallBreaker', data);
      console.log('<<< Section 12: Stall Breaker - DONE, length:', reports[12]?.length || 'NULL');

      console.log('>>> Section 13: Progress Tracker - STARTING');
      reports[13] = await loadAndCustomizeTemplate('tracker', data);
      console.log('<<< Section 13: Progress Tracker - DONE, length:', reports[13]?.length || 'NULL');
    } else {
      console.log(`>>> Section 12: Stall Breaker SUPPRESSED (goal=${goalKey}); tracker renumbered to #12`);
      const tracker = await loadAndCustomizeTemplate('tracker', data);
      const renumbered = tracker.replace('## Report #13:', '## Report #12:');
      if (renumbered === tracker) {
        // The heading the renumber depends on has moved. Fail closed rather than ship
        // a report whose sections jump from #11 to #13.
        throw new Error('tracker template heading changed; section renumbering broke');
      }
      reports[12] = renumbered;
      console.log('<<< Section 12: Progress Tracker (renumbered) - DONE, length:', reports[12]?.length || 'NULL');
    }

    // THE RENDER-TIME CLAIM GATE. Reads back what was actually written, for every
    // section, before any of it can reach a reader.
    //
    // This exists because on 2026-09-08 two hardcoded strings in Report #5 put the
    // reader's own diagnosis into "I'm starting a therapeutic {{diet}} protocol to
    // address {{symptoms}}. This is evidence-based metabolic therapy". Prompt rules 11
    // and 12 could not reach it (it is a template, not a prompt), the classifier only
    // decides what sections may say rather than checking what they said, and the
    // fixture asserted the handout CONTAINED the symptom without asserting how. Three
    // layers, all looking somewhere else, all green.
    //
    // Checking the finished text is the one thing none of them did, and the finished
    // text is the only artifact a customer ever sees. It covers the live-written
    // sections too: if the model breaks rule 11, generation fails rather than shipping.
    const medCtx = deriveMedicalContext(data);
    for (const [num, body] of Object.entries(reports)) {
      assertReportCopyIsClean(`Report #${num}`, body, medCtx);
    }

    console.log('=== COMBINING SECTIONS ===');
    const sectionsWithContent = Object.values(reports).filter(s => s && s.length > 0);
    console.log('Total sections with content:', sectionsWithContent.length, '/ 13');
    console.log('Section sizes:', Object.entries(reports).map(([num, content]) =>
      `#${num}:${content?.length || 0}`
    ).join(', '));

    const duration = Date.now() - startTime;
    console.log('=== GENERATE ALL REPORTS COMPLETE ===');
    console.log('Total time:', duration, 'ms');

    return reports;
  } catch (error) {
    console.error('=== generateAllReports FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Generate AI-personalized reports (#1 and #6)
 */
/**
 * Generate a model-written section and CHECK IT before accepting it.
 *
 * The content gates fail closed, which is right: a report that promises an outcome or
 * argues with a clinician must not reach a reader. But a paying customer's report
 * dying because the model wrote "digestion often simplifies" on one run is not a good
 * outcome either, and it happened on the first run after the gates went in.
 *
 * So: check, and if it fails, ask again with the exact violation quoted. Bounded, and
 * still fails closed when the model will not comply. The retry is a convenience for
 * the customer; the gate is the thing that guarantees correctness.
 */
async function generateCheckedSection(apiKey, systemPrompt, userPrompt, maxTokens, label, medCtx) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const correction = lastError
      ? `\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED: ${lastError}\n` +
        'Rewrite it without that. Describe what people report and what varies, never ' +
        'what the reader will experience, and never argue a clinician out of a concern. ' +
        'Do not tell the reader that any number, target or plan is appropriate, safe, ' +
        'suitable or fine for them, and never present this way of eating as treating, ' +
        'addressing, healing or reversing anything they told us about.'
      : '';
    const text = await callClaudeAPI(apiKey, systemPrompt, userPrompt + correction, maxTokens);
    try {
      // The SAME four gates the finished report is held to. A section that would fail
      // at final assembly is re-asked here, where a retry still exists, instead of
      // failing a paid generation outright.
      assertReportCopyIsClean(label, text, medCtx);
      return text;
    } catch (err) {
      lastError = err.message;
      console.warn(`[generateCheckedSection] ${label} attempt ${attempt} rejected: ${err.message}`);
    }
  }
  throw new Error(`${label}: model would not produce acceptable copy after 3 attempts. Last: ${lastError}`);
}

async function generateAIReports(data, apiKey) {
  // The condition-claim gate needs the reader's declared context to know which terms
  // may not appear inside a treatment frame. Derived once, from the same function the
  // final assembly gate uses, so the retry and the final check judge identically.
  const medCtx = deriveMedicalContext(data);

  // Report #1: Executive Summary
  const summaryPrompt = buildExecutiveSummaryPrompt(data);
  const summary = await generateCheckedSection(
    apiKey,
    buildExecutiveSummarySystemPrompt(data),
    summaryPrompt,
    2000,
    'Report #1',
    medCtx
  );

  // Report #6: Obstacle Override Protocol
  const obstaclePrompt = buildObstacleProtocolPrompt(data);
  const obstacle = await generateCheckedSection(
    apiKey,
    buildObstacleProtocolSystemPrompt(data),
    obstaclePrompt,
    2500,
    'Report #6',
    medCtx
  );

  return {
    summary: summary,
    obstacle: `## Report #6: Conquering Your Kryptonite\n\n${obstacle}`
  };
}

// ============================================================================
// 6. CLAUDE API WRAPPER
// ============================================================================

/**
 * Call Claude API with proper error handling
 *
 * SECURITY WARNING: Never log API keys or expose them in error messages.
 * Always pass credentials via secure headers, never in function parameters.
 * API keys should only be available in server environment variables.
 */
async function callClaudeAPI(apiKey, systemPrompt, userPrompt, maxTokens) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: maxTokens,
        // Lowered from 1.0 (2026-09-07 safety remediation): these prompts carry the
        // medication guardrails, and max-entropy sampling is not what you want there.
        temperature: 0.4,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      // SECURITY: Never expose API key or sensitive data in error messages
      // Log safely without credentials
      console.error('Claude API error status:', response.status);
      throw new Error(`Claude API request failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.content[0].text;
  } catch (error) {
    // SECURITY: Catch and sanitize errors to prevent credential exposure
    console.error('Claude API call failed');
    // Re-throw without exposing sensitive information
    throw new Error('Failed to generate report with AI service');
  }
}

// ============================================================================
// 7-10. SYSTEM PROMPTS AND USER PROMPTS
// ============================================================================

/**
 * Build system prompt for Executive Summary (Report #1)
 */
function buildExecutiveSummarySystemPrompt(data) {
  // Build list of foods to absolutely avoid
  let foodsToAvoid = [];

  if (data.allergies) {
    const allergiesList = data.allergies.toLowerCase().split(',').map(a => a.trim());
    foodsToAvoid.push(...allergiesList);
  }

  if (data.avoidFoods || data.foodRestrictions) {
    const avoidList = (data.avoidFoods || data.foodRestrictions || '').toLowerCase();
    if (avoidList) {
      const restrictions = avoidList.split(',').map(r => r.trim()).filter(r => r);
      foodsToAvoid.push(...restrictions);
      console.log(`[buildExecutiveSummarySystemPrompt] Foods to avoid: ${restrictions.join(', ')}`);
    }
  }

  const avoidListFormatted = foodsToAvoid.length > 0
    ? `\n\n⚠️ CRITICAL - FOODS THIS USER CANNOT/WILL NOT EAT:\n${foodsToAvoid.map(f => `- ${f}`).join('\n')}\n\nDO NOT RECOMMEND ANY OF THESE FOODS. PERIOD. This is non-negotiable.`
    : '';

  // Medication and medical-context guardrails live in api/medical-context.js so both
  // AI sections, in both generators, are governed by one rule set. These are the only
  // two sections that receive the reader's medication list.
  const medicalSafetyWarnings = buildMedicalSafetyRules(deriveMedicalContext(data));

  const consistencyRules = `

CONSISTENCY REQUIREMENTS:
1. Only reference information EXPLICITLY provided in user profile
2. DO NOT infer or assume past diet success/failure unless stated
3. DO NOT contradict information from other sections
4. If uncertain about user history, use general language ("many people find...")
5. Cross-check all claims against user profile data

HOUSE STYLE:
6. Never use an em-dash. Use a comma, a period, parentheses or a rewrite instead.
   This is a standing rule for everything this business publishes.`;

  // Build diet-specific food recommendations
  const diet = data.selectedProtocol || 'Carnivore';
  let dietSpecificGuidance = '';

  if (diet.toLowerCase() === 'pescatarian') {
    // Build safe fish list respecting allergies and avoidFoods
    const hasShellfishAllergy = (data.allergies || '').toLowerCase().includes('shellfish');
    const avoidFoods = (data.avoidFoods || '').toLowerCase();
    const safeFishList = [];
    if (!avoidFoods.includes('salmon')) safeFishList.push('salmon');
    if (!avoidFoods.includes('cod')) safeFishList.push('cod');
    if (!avoidFoods.includes('tuna')) safeFishList.push('tuna');
    if (!avoidFoods.includes('mackerel')) safeFishList.push('mackerel');
    if (!avoidFoods.includes('tilapia')) safeFishList.push('tilapia');
    // Sardines only if not in avoidFoods
    if (!avoidFoods.includes('sardine')) safeFishList.push('sardines');
    const safeFishText = safeFishList.length > 0 ? safeFishList.join(', ') : 'salmon, cod, tuna';

    const shellfishWarning = hasShellfishAllergy
      ? '\n- ⚠️ USER HAS SHELLFISH ALLERGY - NO shrimp, crab, lobster, oysters, clams, mussels, scallops'
      : '';

    dietSpecificGuidance = `
DIET PROTOCOL: PESCATARIAN
The user has selected a PESCATARIAN protocol. This means:
- PRIMARY proteins: Fish (${safeFishText})
- SECONDARY proteins: Eggs (if not allergic)
- ALLOWED fats: Butter, ghee, olive oil
- ABSOLUTELY NO: Beef, pork, chicken, lamb, or any land animal meat${shellfishWarning}

For "First Action Step", suggest:
- ${safeFishList[0] || 'Salmon'} fillets (fresh or frozen)
- Canned fish (${safeFishList.slice(0, 3).join(', ') || 'tuna, mackerel'})
- Eggs (if not allergic)
- Butter or ghee for cooking

DO NOT suggest ribeye, ground beef, bacon, chicken, or any meat.`;
  } else if (diet.toLowerCase() === 'lion') {
    dietSpecificGuidance = `
DIET PROTOCOL: LION DIET
The user has selected a LION DIET protocol. This means:
- ONLY beef, salt, and water
- No other meats, no dairy, no eggs
- Strictest elimination protocol

For "First Action Step", suggest:
- Ground beef (80/20)
- Ribeye or NY strip steaks
- Quality salt (Redmond Real Salt)
- Water

DO NOT suggest pork, chicken, fish, eggs, or dairy.`;
  } else if (diet.toLowerCase() === 'keto') {
    dietSpecificGuidance = `
DIET PROTOCOL: KETO
The user has selected a KETO protocol. This means:
- All animal proteins allowed (beef, pork, chicken, fish)
- Eggs and dairy allowed
- Low-carb vegetables allowed
- Focus on high fat, moderate protein, very low carb

For "First Action Step", suggest a mix of:
- Fatty meats (ribeye, ground beef, chicken thighs)
- Eggs
- Butter/ghee
- Low-carb vegetables (spinach, broccoli)`;
  } else {
    // Default Carnivore
    dietSpecificGuidance = `
DIET PROTOCOL: CARNIVORE
The user has selected a CARNIVORE protocol. This means:
- All animal proteins allowed (beef, pork, chicken, lamb, fish)
- Eggs allowed
- Dairy optional (butter, ghee, cheese if tolerated)
- No plant foods

For "First Action Step", suggest:
- Ribeye steaks or ground beef
- Eggs
- Butter for cooking
- Quality salt`;
  }

  return `You are an expert nutritional and behavioral coach creating personalized Executive Summaries for diet protocols.

${dietSpecificGuidance}

TONE & STYLE:
- Direct, supportive, practical
- Acknowledge their specific situation and challenges
- Evidence-based but accessible
- Like a knowledgeable coach who understands their journey
- Avoid hype or unrealistic promises

OUTPUT FORMAT:
- Pure Markdown, no HTML
- No preamble or introduction
- Start directly with the report content

CONTENT REQUIREMENTS:
- Mission Brief (1-2 sentences): Why this protocol fits their situation
- Daily Targets: Specific macros, calories, and approach
- Why This Protocol: Evidence that this works for their goal
- First Action Step: What to do TODAY (must respect diet protocol AND food preferences below)
- 30-Day Timeline: what people COMMONLY REPORT week by week. Individual responses
  vary and you must say so. Do NOT state what the reader's energy, digestion,
  bloating, mood, sleep, skin, hair or mental clarity will do: you do not know.
  Write "some people report", never "energy stabilizes" or "digestion simplifies".
  Point them at Report #12, their own tracker, as the record of what changed for them.
- Biggest Challenge Addressed: Direct response to their stated concern
- Medical Disclaimer: Required at bottom

${avoidListFormatted}

${medicalSafetyWarnings}

${consistencyRules}

When recommending specific foods in "First Action Step" or anywhere else:
- MUST follow the diet protocol above (e.g., NO BEEF for Pescatarian)
- ONLY suggest proteins appropriate for their selected diet
- NEVER force-recommend foods from the avoid list
- ASK what proteins they prefer instead (they told us: ${data.additionalNotes ? data.additionalNotes.substring(0, 200) : 'no preferences stated'}...)
- Build shopping list around their actual preferences, not defaults`;
}

/**
 * Build system prompt for Obstacle Override Protocol (Report #6)
 */
function buildObstacleProtocolSystemPrompt(data) {
  // Build list of foods to absolutely avoid
  let foodsToAvoid = [];
  const diet = (data?.selectedProtocol || 'Carnivore').toLowerCase();
  const isPescatarian = diet === 'pescatarian';

  // For Pescatarian: automatically add all land meats to avoid list
  if (isPescatarian) {
    foodsToAvoid.push('beef', 'ribeye', 'ground beef', 'steak', 'chicken', 'bacon', 'pork', 'lamb', 'jerky');
  }

  if (data && data.allergies) {
    const allergiesList = data.allergies.toLowerCase().split(',').map(a => a.trim());
    foodsToAvoid.push(...allergiesList);
    // If shellfish allergy, add all shellfish items explicitly
    if (allergiesList.some(a => a.includes('shellfish') || a.includes('shrimp') || a.includes('crab'))) {
      foodsToAvoid.push('shrimp', 'crab', 'lobster', 'oysters', 'clams', 'mussels', 'scallops', 'shellfish');
    }
  }

  if (data && (data.avoidFoods || data.foodRestrictions)) {
    const restrictions = (data.avoidFoods || data.foodRestrictions).toLowerCase().split(',').map(r => r.trim());
    foodsToAvoid.push(...restrictions);
  }

  // Deduplicate
  foodsToAvoid = [...new Set(foodsToAvoid)];

  const avoidListFormatted = foodsToAvoid.length > 0
    ? `\n\n⚠️ CRITICAL - FOODS THIS USER CANNOT/WILL NOT EAT:\n${foodsToAvoid.map(f => `- ${f}`).join('\n')}\n\nDO NOT RECOMMEND ANY OF THESE FOODS WHATSOEVER.`
    : '';

  // Diet-specific guidance for AI
  let dietGuidance = '';
  if (isPescatarian) {
    dietGuidance = `\n\nDIET PROTOCOL: PESCATARIAN\nThis user ONLY eats fish, seafood, eggs, and dairy. NO land animal meat.\nWhen suggesting food tactics, ONLY use: salmon, tuna, cod, mackerel, eggs, butter.\nNEVER mention: ribeye, ground beef, steak, chicken, bacon, pork, lamb, or jerky.`;
  }

  // Medication and medical-context guardrails live in api/medical-context.js so both
  // AI sections, in both generators, are governed by one rule set. These are the only
  // two sections that receive the reader's medication list.
  const medicalSafetyWarnings = buildMedicalSafetyRules(deriveMedicalContext(data));

  const consistencyRules = `

CONSISTENCY REQUIREMENTS:
1. Only reference information EXPLICITLY provided in user profile
2. DO NOT infer or assume past diet success/failure unless stated
3. DO NOT contradict information from other sections
4. If uncertain about user history, use general language ("many people find...")
5. Cross-check all claims against user profile data

HOUSE STYLE:
6. Never use an em-dash. Use a comma, a period, parentheses or a rewrite instead.
   This is a standing rule for everything this business publishes.`;

  return `You are an expert behavioral psychologist and diet coach creating Obstacle Override Protocols.

TONE & STYLE:
- Compassionate but practical
- Acknowledge the challenge without judgment
- Provide specific, actionable tactics
- Empowering and motivational
- Direct and solution-focused

GENERATE:
1. IDENTIFYING THE ENEMY: Reframe their challenge psychologically
2. THE MINDSET SHIFT: Explain why they can overcome this
3. THE TACTICAL SOLUTION: 3-step protocol with specific actions
4. THE "BREAK GLASS" EMERGENCY PLAN: Backup tools (the 10-minute rule, a walk, a protein-first snack, etc.). Do NOT build a tactic around salt, electrolyte or supplement dosing — Report #10 owns that and it is gated on the reader's medical context.
5. COMMITMENT CONTRACT: They can sign to reinforce commitment

OUTPUT FORMAT:
- Pure Markdown, no HTML
- Direct, no preamble
- Tone is motivational but grounded in reality

${avoidListFormatted}
${dietGuidance}

${medicalSafetyWarnings}

${consistencyRules}

When suggesting food or nutrition tactics:
- RESPECT their food preferences and restrictions absolutely
- Never suggest foods from their avoid list
- If food is part of a tactic, use proteins/foods they actually want to eat`;
}

/**
 * Build prompt for Executive Summary
 */
function buildExecutiveSummaryPrompt(data) {
  const profile = buildProfile(data);
  return `Generate an Executive Summary for this person:\n\n${profile}`;
}

/**
 * Build prompt for Obstacle Override Protocol
 */
function buildObstacleProtocolPrompt(data) {
  return `Create an Obstacle Override Protocol for this challenge: "${data.biggestChallenge || 'Staying consistent with diet'}"\n\nContext: ${buildProfile(data)}`;
}

// ============================================================================
// 11. TEMPLATE LOADER
// ============================================================================

/**
 * Get template content (stub - will be embedded or fetched)
 */
function getTemplateContent(templateName, dietOrData) {
  const data = typeof dietOrData === 'string' ? { selectedProtocol: dietOrData } : (dietOrData || {});

  // DEBUG TRACING: Verify diet-aware gates are working
  const debugDiet = (data.selectedProtocol || 'Carnivore').toLowerCase();
  const debugIsPescatarian = debugDiet === 'pescatarian';
  console.log(`[DEBUG] Template Rendering - Diet: ${data.selectedProtocol}, isPescatarian: ${debugIsPescatarian}, templateName: ${templateName}`);

  const templates = {
    // Report #2: Food Guide - Conditional on diet type (now dynamically generated)
    foodGuide: generateDynamicFoodGuide(data.selectedProtocol, data),

    // Report #3: 30-Day Meal Calendar - DIET-AWARE
    mealCalendar: (() => {
      const diet = (data.selectedProtocol || 'Carnivore').toLowerCase();
      const isPescatarian = diet === 'pescatarian';
      const fattyProteinExamples = isPescatarian
        ? 'fattier fish like salmon and mackerel'
        : 'fattier cuts like ribeye and ground beef';
      const cookingFatExamples = isPescatarian
        ? 'butter, olive oil'
        : 'butter, tallow';
      return `## Report #3: Your Custom 30-Day Meal Calendar\n\n*Protocol: {{diet}} | Budget Level: {{budget}} | Focus: {{goal}}*\n\n{{mealPlanMedicalNote}}\n\n## A Note Before You Start\nFair warning: this calendar is repetitive. Somewhere around week two you may look at it and think, this again? Yes. On purpose. Deciding what to eat all day is exhausting, and a short, predictable grocery list is one less thing to think about. Boring, here, is a feature.\n\nIt's a starting framework, not a rulebook. An anchor, not a ceiling. Especially in the first week or two, your appetite may not line up with the portions listed. Some days you'll want less. Some days you'll be genuinely hungry, and on those days, eat. Nobody gets a prize for going to bed hungry because a calendar said so.\n\nNotice your hunger before meals, your fullness after, whether you feel satisfied, and how your energy holds. If you consistently need more or less than the plan lists, that's what tells you how to adjust it.\n\n## The Strategy\nThis plan rotates proteins for variety and simplicity. Cook proteins 2-3 times per week, mixing with different {{diet}}-appropriate options.\n\n**Note on Macros:** {{proteinPrecisionClaim}} Fat may vary ±20-30% based on protein choices, and ${fattyProteinExamples} naturally deliver more fat when portioned for protein. Adjust cooking fats (${cookingFatExamples}) up or down based on hunger and your body's response.\n\n{{mealCalendarWeeks}}\n\n## Substitution Guide\n{{substitutionGuide}}\n\n*This meal plan rotates proteins for variety while staying true to {{diet}}.* 🍽️`;
    })(),

    // Report #4: Weekly Shopping Lists
    shoppingList: `## Report #4: Your Weekly Grocery Lists

*Based on your custom {{diet}} meal plan*

> **⚠️ A Note on Grocery Pricing:** Food costs vary by region and season. Your "{{budget}}" setting controls the **types of cuts** recommended, not the final total.

## 🛒 "Week 0" Pantry Stock-Up
* [ ] Quality Salt (Redmond Real Salt or Maldon)
* [ ] Primary Cooking Fat ({{cookingFatRecommendation}})
* [ ] Food Storage Containers
* [ ] Basic Seasonings (if tolerated)

{{groceryWeeks}}

## 💡 Smart Shopping Tips
{{shoppingTips}}

**Pro tip:** {{proTip}}`,

    // Report #5: Physician Consultation Guide
    physicianConsult: `## Report #5: Physician Consultation Guide\n\n*For {{firstName}} to discuss with your doctor about {{diet}}*\n\n> **⚠️ MEDICAL DISCLAIMER:** This guide is educational. Never change medications without medical supervision. Always work with your doctor.\n\n{{medicalContextBanner}}\n\n---\n\n## SECTION 1: The Opening Script\n\n### The 2-Minute Pitch\n\n"Dr. [Name], I'm planning to change the way I eat to a {{diet}} diet, and I want your input before I start. {{symptomDisclosure}} I need your partnership in three areas:\n\n1. **Lab monitoring** - Baseline now, recheck at 8 weeks\n2. **Medication monitoring** - What you want me to watch, when to recheck, and how you would want to handle it if my numbers change\n3. **Advanced markers** - Looking beyond standard LDL to assess real cardiovascular risk\n\nI've prepared a one-page summary for you. Can we schedule an 8-week follow-up now?"\n\n### If They Raise a Concern\n\nUse Section 3 (Questions for Common Concerns) - find the concern that matches and ask the question next to it.\n\n---\n\n## SECTION 2: Advanced Bloodwork Markers\n\n### What a Standard Lipid Panel Does and Does Not Show\n\nA standard lipid panel measures LDL-C, not particle count. LDL-C and non-HDL-C are treatment targets in the current cholesterol guideline, and additional markers refine that picture rather than replace it. On {{diet}}, LDL-C sometimes rises. If yours does, that is a result to take to your doctor and ask how they read it, not one to explain away.\n\n### Request These Advanced Markers\n\n**1. ApoB (Apolipoprotein B)**\n- **What it measures:** Actual number of atherogenic particles\n- **Why it matters:** Better predictor than LDL-C for cardiovascular risk\n- **What people report:** varies. This does not tell you what your own result will be, and an ApoB result does not cancel an LDL-C result\n- **What to say:** \"Would an ApoB add useful information in my situation, or is LDL-C and non-HDL-C enough for how you assess my risk?\"\n\n**2. Triglyceride/HDL Ratio**\n- **What it measures:** Insulin resistance and small dense LDL particles\n- **Why it matters:** A commonly cited reference is a ratio under 2. What it means for you is your doctor's read, not this report's\n- **What people report:** varies. Your doctor interprets it alongside LDL-C and non-HDL-C\n- **What to say:** \"Do you use the triglyceride to HDL ratio, and would you want to track it for me?\"\n\n**3. CAC Score (Coronary Artery Calcium)**\n- **What it measures:** Actual arterial calcification (hard endpoint)\n- **Why it matters:** Direct measure of plaque burden\n- **What it does not measure:** soft, noncalcified plaque. A score of zero means no detectable calcium, which is reassuring but is not proof that there is no disease, and it does not make an LDL-C result irrelevant.\n- **What to say:** \"If my LDL is elevated, would a CAC score help you decide how aggressively to treat it, and how would you read a result of zero in my case?\"\n\n**4. Fasting Insulin & HOMA-IR**\n- **What it measures:** Insulin resistance (root cause of metabolic disease)\n- **Why it matters:** Standard glucose is a lagging indicator\n- **What people report:** varies. Ask your doctor what range they want for you\n- **What to say:** \"Can we measure fasting insulin? I want to track insulin resistance, not just glucose.\"\n\n### The Key Markers Table\n\n| Marker | Common reference | Why it matters | Who sets your number |\n|--------|---|---|---|\n| LDL-C | see your doctor | A treatment target in the current cholesterol guideline | Your doctor |\n| Non-HDL-C | see your doctor | A treatment target alongside LDL-C | Your doctor |\n| ApoB | <130 mg/dL | Can refine risk in selected people | Your doctor |\n| Lp(a) | once in a lifetime | Inherited risk, usually measured once | Your doctor |\n| CAC Score | N/A | Can reclassify risk. Zero means no detectable calcium, not no disease | Your doctor |\n| Fasting Insulin | <10 μIU/mL | Insulin resistance | Your doctor |\n| hs-CRP | <3 mg/L | Inflammation | Your doctor |\n\nThis report does not set targets for any of these. It exists so you can ask your doctor how they read yours.\n\n---\n\n## SECTION 3: Questions for Common Concerns\n\nIf your clinician raises one of these, it is a reasonable thing for them to raise. The point of this section is to give you a question that keeps the conversation going, not an argument that ends it.\n\n### If they raise cholesterol\n\n\"I understand the concern. Can we do three things?\n\n1. **Baseline labs now**, including whatever lipid panel you would normally order\n2. **Recheck at 8 weeks**, and I will change what I am doing if you think I should\n3. **Tell me your thresholds** - which numbers would make you want me to stop\n\nIf some markers improve but my LDL-C rises, how do you weigh that, and what would you want to do about it?\"\n\n### If they raise fibre or vitamins\n\n\"That is worth checking rather than assuming. A 2026 review of the carnivore research flagged possible shortfalls in vitamin C, vitamin D, calcium, magnesium, iodine and fibre.\n\nCan we test my micronutrient levels at baseline and at 8 weeks? If I show deficiencies, I will adjust, and I would like your advice on how.\"\n\n### If they raise your kidneys\n\n\"That is a fair thing to check, and I would rather measure it than argue about it. Can we monitor:\n\n- **Creatinine & eGFR** (kidney function)\n- **Albumin/Creatinine ratio** (kidney damage marker)\n\nCan we take a baseline now and recheck it, and can you tell me what change in those numbers would mean I should stop?\"\n\n{{proteinTargetNote}}\n\n### If they raise carbohydrates and brain function\n\n\"The brain can use ketones, which the liver makes from fat, and ketogenic diets are used clinically in epilepsy. That is evidence about ketogenic diets, and I am not assuming it transfers to eating this way.\n\nCan we track my cognitive function and energy levels? If I report brain fog, fatigue or declining performance, I will reconsider.\"\n\n### When to Seek a Second Opinion\n\nIf you feel your concerns are not being heard, you can ask questions, request clarification, or seek a second opinion from another qualified clinician. That is a normal part of medical care, not a confrontation.\n\n**Reasonable things to ask for:**\n- Baseline labs before you start, so there is something to compare against later\n- A clear explanation of which markers concern your doctor, and why\n- An agreed monitoring schedule while you make a dietary change\n\nDecisions about medications, treatment and testing should be made with your healthcare professional.\n\n---\n\n## SECTION 4: Medications\n\n> **Medication changes are your prescriber's decision, not ours.** Our job is what to measure and what to ask.\n\nA {{diet}} diet can change blood glucose, blood pressure and thyroid labs, sometimes within weeks. That is exactly why this guide exists: so your doctor knows what you are doing and can monitor you properly.\n\n**Bring your current medication list to the appointment and ask:**\n- Which of my medications could be affected if my glucose, blood pressure or weight changes?\n- What should I monitor at home, how often, and what readings should prompt me to call you?\n- When would you like to recheck my labs?\n- If something does need to change, how would you want to do it?\n\n**Do not change a dose, skip a dose, or stop a medication on your own.** If you notice dizziness, shaking, sweating, confusion, unusual fatigue or any symptom that worries you, contact your doctor or seek urgent care.\n\n## SECTION 5: If You Want a Second Opinion\n\n### Signs the Conversation Is Not Working\n\nIf you consistently cannot get answers to reasonable questions, it is fair to seek a second opinion:\n\n- You cannot get baseline labs ordered, or get the results explained\n- Your questions about monitoring go unanswered\n- You do not feel able to raise concerns at all\n\nSeeking a second opinion is not the same as ignoring medical advice. Keep a prescribing clinician involved either way.\n\n### What a Good Consultation Looks Like\n\nThis is about the quality of the conversation, not about whether the clinician agrees with your diet. A clinician who has concerns and monitors you carefully is doing their job.\n\n- They explain their reasoning, including what worries them and why\n- They order the labs they think are needed and go through the results with you\n- They tell you which numbers would change their advice\n- You can raise a concern or disagree without the conversation shutting down\n- They are clear about what is established and what is uncertain\n\n### Finding Another Clinician\n\nLook for someone qualified to manage your whole situation, not someone selected for agreeing with a particular way of eating. A clinician chosen because they will approve of your diet is not a second opinion.\n\n- Ask your current practice for a referral, or ask about seeing a registered dietitian\n- Your insurer or national health service directory can list clinicians taking new patients\n- If a specific concern is driving this, ask for the relevant specialist: endocrinology, cardiology, nephrology, or whatever fits\n\n**What to ask a new clinician:**\n\n1. \"Here is what I am eating and why. What would you want to monitor?\"\n2. \"What would you need to see before you were comfortable, and what would worry you?\"\n3. \"How would you like to follow this up, and how often?\"\n\n---\n\n## SECTION 6: Comprehensive Lab Monitoring Schedule\n\n### Baseline Labs (Week 0 - Before Starting {{diet}})\n\n**Metabolic Panel:**\n- [ ] Fasting Glucose\n- [ ] Fasting Insulin (critical for tracking insulin resistance)\n- [ ] HbA1c (3-month glucose average)\n- [ ] HOMA-IR (calculated from glucose + insulin)\n\n**Lipid Panel (Standard):**\n- [ ] Total Cholesterol\n- [ ] LDL-C\n- [ ] HDL-C\n- [ ] Triglycerides\n- [ ] **Calculate Trig/HDL ratio** (divide Trig by HDL)\n\n**Advanced Lipids (Request if possible):**\n- [ ] ApoB (used selectively in current guidance to refine risk, ask if it applies to you)\n- [ ] LDL Particle Number (LDL-P)\n- [ ] LDL Particle Size (small vs large)\n\n**Cardiovascular Risk:**\n- [ ] hs-CRP (high-sensitivity C-reactive protein - inflammation marker)\n- [ ] **CAC Score** (Coronary Artery Calcium scan - your doctor decides whether your risk profile warrants one)\n\n**Kidney & Liver Function:**\n- [ ] Creatinine\n- [ ] eGFR (estimated glomerular filtration rate)\n- [ ] BUN (blood urea nitrogen)\n- [ ] ALT (alanine aminotransferase)\n- [ ] AST (aspartate aminotransferase)\n- [ ] Albumin\n\n**Micronutrients:**\n- [ ] Vitamin D (25-hydroxy)\n- [ ] Vitamin B12\n- [ ] Magnesium (RBC magnesium preferred over serum)\n- [ ] Iron panel (ferritin, TIBC, serum iron, transferrin saturation)\n\n### Week 8 Recheck (Comprehensive Follow-Up)\n\n**Repeat ALL baseline labs** to assess metabolic response\n\n**Movement people sometimes report. None of this is a prediction about you, and none of these are targets set for you:**\n\nSometimes lower: fasting glucose, fasting insulin, HbA1c, triglycerides, hs-CRP, ALT and AST.\n\nSometimes higher: HDL.\n\nSometimes higher: LDL-C, and total cholesterol with it. Ask your doctor how they read that alongside everything else. It is not a number this report can interpret for you.\n\n**What to do with a mixed result:** if some markers improve and LDL-C rises, that is a question for your doctor, not one this report can answer. LDL-C and non-HDL-C are still treatment targets in the current cholesterol guideline, and a favourable triglyceride or HDL number does not cancel a rising LDL-C. Take the full panel to your appointment and ask how they read it together.\n\n### Ongoing Labs (Beyond Week 8)\n\n- **Week 12-16:** Optional extended monitoring\n- **Yearly:** Full lipid panel, fasting glucose, insulin, HbA1c, kidney/liver function, micronutrients, TSH\n- **Every 2-5 years:** CAC score (if previous score >0)\n\n---\n\n## SECTION 7: The One-Page Doctor Handout\n\n**Print this and bring to your appointment**\n\n---\n\n### ONE-PAGE PHYSICIAN CONSULTATION GUIDE\n\n**Patient:** {{firstName}}\n**Protocol:** {{diet}} Metabolic Intervention\n**Duration:** 8-week monitored trial\n**Date:** {{currentDate}}\n\n**Conditions the patient reported:** {{conditionsList}}\n**Patient-reported symptoms/concerns:** {{symptomsList}}\n**Medications the patient reported:** {{medicationsList}}\n\n*These lists are self-reported into an online questionnaire and have not been verified. They are the patient's own words, not a diagnosis made by this report. Please confirm them against your own record.*\n\n---\n\n#### PATIENT REQUEST:\n\nI am planning to start a **{{diet}}** diet.\n\n{{symptomDisclosure}}\n\nI am requesting:\n1. **Baseline comprehensive labs** (see list below)\n2. **8-week recheck labs**, and your assessment of whether anything in my treatment needs to change\n3. **Partnership in monitoring** - I will report any adverse symptoms immediately\n\n---\n\n#### BASELINE LABS REQUESTED (Week 0):\n\n**Metabolic:** Fasting Glucose, Fasting Insulin, HbA1c, HOMA-IR\n**Lipids:** Total Chol, LDL, HDL, Triglycerides, **ApoB** (if available)\n**Inflammation:** hs-CRP\n**Kidney:** Creatinine, eGFR, BUN\n**Liver:** ALT, AST, Albumin\n**Micronutrients:** Vitamin D, B12, Magnesium, Iron Panel\n**Ask about:** CAC Score, if your doctor thinks your risk profile warrants one\n\n---\n\n#### WEEK 8 RECHECK LABS:\n\n**Repeat all baseline labs** to assess metabolic response\n\n---\n\n#### MEDICATION MONITORING (if applicable):\n\n**I will contact you immediately if:**\n- Blood glucose <70 mg/dL (hypoglycemia)\n- Blood pressure <90/60 mmHg (hypotension)\n- Severe fatigue, dizziness, confusion, chest pain\n- Any other concerning symptoms\n\n---\n\n#### EVIDENCE NOTE:\n\nThis section separates two different bodies of research on purpose.\n\n**Carbohydrate-restricted and ketogenic diets:** studied in randomised trials, including in type 2 diabetes and metabolic syndrome.\n\n**Strict carnivore diets:** a 2026 scoping review (Nutrients) identified nine human studies, mostly case reports, case series, modelling analyses and surveys. No randomised controlled trials, no long-term cohorts, no hard endpoint data. The review judged the evidence very limited, and noted possible shortfalls in vitamin C, vitamin D, calcium, magnesium, iodine and fibre, and raised LDL-C and total cholesterol.\n\nThe patient is not claiming that trial results from the first group apply to the second. This handout exists so the diet is monitored, not to argue that it is proven.\n\n**Patient commitment:** I, {{firstName}} {{lastName}}, will adhere strictly to protocol, monitor daily, and report any adverse effects immediately.\n\n---\n\n**Patient Signature:** ___________________________                    **Date:** __________\n\n---\n\n## SECTION 8: After Your Appointment\n\n### If Your Doctor Agreed to Monitor You ✅\n\n**Immediate Actions:**\n1. [ ] Schedule Week 8 follow-up appointment NOW (before you leave office)\n2. [ ] Get lab orders and complete baseline labs within 48 hours\n3. [ ] Request copies of all lab results (you own your medical records)\n4. [ ] Create a tracking spreadsheet or use app\n5. [ ] Start {{diet}} protocol after baseline labs are complete\n\n**Daily Monitoring (Weeks 0-8):**\n- [ ] Weight (morning, after bathroom) - Log in tracker\n- [ ] Blood glucose (if diabetic/pre-diabetic) - 2-3x daily\n- [ ] Blood pressure (if on BP meds) - Morning + evening\n- [ ] Symptoms: Energy, mood, cravings, digestion - Rate 1-10 daily\n- [ ] Medication changes - Log every adjustment with date/time/reason\n\n**Emergency Contacts:**\n- **Low blood glucose:** a reading under 70 mg/dL, or symptoms of a low (shaking, sweating, confusion, sudden hunger), means follow the hypoglycemia plan your own doctor gave you and call them. If you do not have one and you take any glucose-lowering medication, ask for one before you start this diet. **Call 911 for confusion that is not clearing, seizure, or loss of consciousness.**\n- **Fainting, or a blood pressure reading far below your normal:** lie down and call your doctor. Do not treat it with salt or salted water.\n- **Chest pain**: Call 911 immediately\n\n### If You Did Not Get the Answers You Needed\n\n**You still have options, and none of them mean going it alone:**\n\n- **Ask for a follow-up appointment.** \"I have three specific questions about monitoring\" often changes the conversation.\n- **Request a referral** to a dietitian, endocrinologist or cardiologist, depending on what concerns you.\n- **Seek a second opinion** from another qualified clinician. Bring your labs and this guide.\n\nWhatever you decide, keep a prescribing clinician involved. Decisions about medications, treatment and testing should be made with your healthcare professional.\n\n**Most doctors will work with you if you come prepared, ask specific questions, and commit to monitoring.**`,

    // Report #7: Restaurant & Travel Guide - DIET-AWARE
    restaurant: (() => {
      const diet = (data.selectedProtocol || 'Carnivore').toLowerCase();
      const hasEggAllergy = (data.allergies || '').toLowerCase().includes('egg');
      const hasShellfishAllergy = (data.allergies || '').toLowerCase().includes('shellfish');
      const avoidFoods = (data.avoidFoods || '').toLowerCase();
      const isPescatarian = diet === 'pescatarian';

      // Diet-specific dining options
      let dinerOrder, mcdonaldsOrder, wendysOrder, chipotleOrder, tacoBellOrder;
      let steakhouseOrder, mexicanOrder, asianOrder;
      let travelPacking;
      let goldenRule3;

      if (isPescatarian) {
        // Pescatarian: Fish, seafood, eggs - NO beef, chicken, bacon, jerky
        dinerOrder = hasEggAllergy ? 'Grilled fish + side salad' : 'Grilled fish + eggs + side salad';
        mcdonaldsOrder = hasEggAllergy ? 'Filet-O-Fish (no bun) x2' : 'Filet-O-Fish (no bun) + scrambled eggs';
        wendysOrder = 'Side salad + eggs (if available) or skip';
        chipotleOrder = 'Fish bowl (when available), otherwise sofritas bowl no rice/beans + guacamole';
        tacoBellOrder = 'Black bean bowl no rice + guacamole (limited options)';
        steakhouseOrder = 'Grilled salmon or fish of the day + butter + vegetable';
        mexicanOrder = 'Grilled fish tacos (no tortilla) + guacamole';
        asianOrder = 'Grilled salmon or tuna + steamed vegetables';
        goldenRule3 = 'A grilled fish fillet with butter is available at most restaurants.';

        // Build travel packing list respecting avoidFoods
        const travelItems = [];
        if (!avoidFoods.includes('tuna')) travelItems.push('Canned tuna in oil');
        if (!avoidFoods.includes('salmon')) travelItems.push('Smoked salmon packets');
        if (!avoidFoods.includes('sardine')) travelItems.push('Sardines canned in oil');
        if (!avoidFoods.includes('mackerel')) travelItems.push('Canned mackerel');
        travelItems.push('Macadamia nuts or pecans');
        travelItems.push('Hard cheese');
        travelItems.push('Salt packets');
        travelPacking = travelItems.map(item => `* [ ] ${item}`).join('\n');
      } else {
        // Carnivore/Lion/Keto: Beef, meat-based options
        dinerOrder = hasEggAllergy ? 'Burger (no bun) + bacon + extra patty' : 'Burger (no bun) + eggs + bacon';
        mcdonaldsOrder = hasEggAllergy ? '3x Beef Patties + cheese (no bun) + bacon' : '3x Beef Patties + cheese (no bun) + eggs + bacon';
        wendysOrder = "Dave's Single (no bun) + extra beef";
        chipotleOrder = 'Steak bowl, no rice, no beans';
        tacoBellOrder = 'Power Menu Bowl, no rice/beans';
        steakhouseOrder = 'Ribeye + butter + vegetable';
        mexicanOrder = 'Carne asada + guacamole';
        asianOrder = 'Grilled beef or fish';
        goldenRule3 = 'A plain steak with butter is available almost everywhere.';
        travelPacking = `* [ ] Beef jerky (check sugar content)\n* [ ] Macadamia nuts or pecans\n* [ ] Hard cheese\n* [ ] Sardines canned in oil\n* [ ] Salt packets`;
      }

      return `## Report #7: Dining Out & Travel Survival Guide\n\n*For {{firstName}} navigating the world on {{diet}}*\n\n## The Three Golden Rules\n\n### Rule #1: Be "That Person"\n- Your health comes first. Do not apologize for your dietary needs.\n\n### Rule #2: Beware the Seed Oils\n- Always ask: "What fat do you use for cooking?" Request butter, ghee, or olive oil.\n\n### Rule #3: When in Doubt, Order Fish/Steak\n- ${goldenRule3}\n\n## Restaurant Strategy by Cuisine\n\n### Steakhouse / Seafood Restaurant\n- Order: ${steakhouseOrder}\n- Customization: "Cooked in butter, no seed oils"\n\n### Diner\n- Order: ${dinerOrder}\n- Customization: "Cooked in butter, no seed oils"\n\n### Mexican\n- Order: ${mexicanOrder}\n- Customization: "No tortillas, no rice, cooked in butter"\n\n### Asian\n- Order: ${asianOrder}\n- Customization: "Cooked in butter, no sauce"\n\n## Fast Food Emergency Menu\n\n**McDonald's:** ${mcdonaldsOrder}\n**Wendy's:** ${wendysOrder}\n**Chipotle:** ${chipotleOrder}\n**Taco Bell:** ${tacoBellOrder}\n\n## Travel Packing\n${travelPacking}\n\n**Remember: Own your choices. Your health comes first.** 🍽️`;
    })(),

    // Report #8-13: Appendix Reports (Condensed)
    science: `## Report #8: The Science & Evidence\n\n*What the evidence can and cannot tell us about {{diet}}*\n\n## How to read this section\n\nThree different bodies of research get talked about as if they were one. They are not, and the difference matters when you are deciding what to do:\n\n- **Carbohydrate-restricted and ketogenic diets** have been studied in randomised trials, including for type 2 diabetes and metabolic syndrome.\n\n- **A strict carnivore diet** has not. A 2026 scoping review in Nutrients found nine human studies in total, mostly case reports, case series, modelling analyses and social media surveys. There were no randomised controlled trials, no long-term cohort studies, and no data on hard endpoints such as cardiovascular events or mortality. The review judged the overall quality of evidence to be very limited, because of small samples, short durations and missing control groups.\n\n- **Your own results** are the only evidence about you, which is what Report #12 is for.\n\nEvidence from ketogenic or low-carbohydrate studies cannot simply be assumed to apply to a strict {{diet}} diet. The diets are not the same, and nobody has run the trials that would settle it.\n\n## What the carnivore studies actually reported\n\nWithin those limits, individual publications have reported weight reduction, increased satiety, and changes in some inflammatory and metabolic markers. Those are reports, not findings that generalise, and the same review also identified potential risks: shortfalls in vitamin C, vitamin D, calcium, magnesium, iodine and fibre, and raised LDL cholesterol and total cholesterol.\n\nNone of this is a finding about you, your questionnaire answers, or anything you told us you are dealing with.\n\n## Why people choose {{diet}}\n\nThese are reasons people give, not health claims:\n\n1. **Simple to follow** - A short food list and no calorie counting\n2. **Satiating** - Protein and fat are filling, so many people stop tracking portions\n3. **Easy to shop for** - The same cuts, week after week\n\n## What to ask your clinician\n\n- Given my history, what would you want to monitor if I eat this way?\n- Which of my results would make you want me to stop or change something?\n- Is there anything in my record that makes this a bad idea for me specifically?\n\nWhat any of this does for a condition you are living with is a question for a clinician who treats it, not for this report.\n\n**Work with your doctor for personalized guidance.**`,

    labs: `## Report #9: Laboratory Reference Guide\n\n*Understanding your lab results on {{diet}}*\n\n{{medicalContextBanner}}\n\n## Common Reference Ranges, and Who Interprets Them\n\n### Glucose & Insulin\n| Marker | Common reference | Note |\n|--------|----------|---|\n| Fasting Glucose | 70-100 | This report does not set a personal target |\n| Fasting Insulin | <10 | Measures insulin sensitivity. Your target is your doctor's call |\n| HbA1c | <5.7% | 3-month glucose average. Your target is your doctor's call |\n\n### Lipids\n| Marker | Common reference | What people on this way of eating sometimes report | Note |\n|--------|----------|---|---|\n| LDL-C | set by your risk, not by a single cutoff | Sometimes higher | A treatment target in current guidance. Your number is your doctor's call |\n| Non-HDL-C | set by your risk | Follows LDL-C | A treatment target alongside LDL-C |\n| HDL | >40 | Sometimes higher | Interpretation is your doctor's |\n| Triglycerides | <150 | Sometimes lower | Interpretation is your doctor's |\n| hs-CRP | <1.0 | Sometimes lower | Interpretation is your doctor's |\n\n**On fasting glucose:** this report does not give you a fasting glucose target, and it deliberately does not tell you that lower is better. A fasting glucose under 70 mg/dL is hypoglycemia, and if you take insulin, metformin, a sulfonylurea or any other glucose-lowering medication, chasing a low number is a hazard rather than an achievement. Your target is your doctor\u2019s call. Ask them what yours is.\n\n## What to Expect After 8 Weeks\n\nResults vary between people. Some report movement in HbA1c, glucose, triglycerides, hs-CRP or HDL. LDL-C sometimes rises, and that is one of the things to take to your doctor rather than interpret yourself.\n\n**Ask your doctor:** How do you read my LDL-C and non-HDL-C together, and would ApoB, Lp(a) or a CAC score change how you assess my risk?`,

    // Report #10: Electrolyte Protocol.
    // The body is built in replacePlaceholders() from the reader's declared
    // conditions and medications (api/medical-context.js). getTemplateContent() is
    // called without `data` for this template, so the placeholder is the seam.
    electrolytes: `## Report #10: The Electrolyte Protocol\n\n*Managing sodium, potassium, and magnesium on {{diet}}*\n\n{{medicalContextBanner}}\n\n## Why Electrolytes Matter\n\nOn {{diet}}, your body releases water and electrolytes more rapidly. This causes "keto flu" (headache, fatigue) in Week 1-2.\n\n{{electrolyteProtocol}}`,

    timeline: `## Report #11: The Adaptation Timeline\n\n*What people commonly report, week by week, on {{diet}}*\n\n## Week 1: Starting Out\n\n**Days 1-3:** Some early weight loss is mostly water, and that part is common. How you feel in these first days varies a lot from person to person.\n\n**Days 4-7:** Some people hit a rough patch in the first week. Others barely notice one. Both are normal.\n\n**Action:** Eat normally and stay hydrated. For electrolytes, follow Report #10, the section that knows what you told us about your health.\n\n## Week 2: The Adjustment Window\n\n**Days 8-10:** If you're going to feel off, this is a stretch where people often report it.\n\n**Days 11-14:** Some people start to feel steadier here. Others need longer, and that's not a sign you're doing it wrong.\n\n**Action:** Keep meals simple and keep following Report #10. Write down how you actually feel each day in Report #12, your 30-Day Symptom and Progress Tracker. If you feel genuinely unwell, that's a conversation with your doctor, not something to wait out.\n\n## Week 3: Checking In\n\n**Days 15-21:** Some people report things like steadier energy or hunger that's easier to predict by now. Plenty of people don't notice much yet.\n\n**Action:** Keep logging in your tracker. What you write down is more reliable than what you remember.\n\n## Week 4: Taking Stock\n\n**Days 22-30:** Some people say {{diet}} feels routine by this point. For others it still takes planning, and that's a normal place to be at day 30.\n\n**Action:** Read back through your tracker and see what actually changed for you.\n\n**Adaptation isn't a schedule. This is a rough map of what people commonly report, and your own notes in Report #12 are the only version that's about you.**`,

    stallBreaker: (() => {
      const diet = (data.selectedProtocol || 'Carnivore').toLowerCase();
      const isPescatarian = diet === 'pescatarian';
      const naturalFatSource = isPescatarian ? "fish's natural fat" : "meat's natural fat";
      const plainProteinAdvice = isPescatarian ? 'Switch to plain fish and eggs' : 'Switch to plain meats and dairy';
      const processedFoodCheck = isPescatarian ? 'processed fish, supplements, condiments' : 'processed meats, supplements, condiments';
      const trustMessage = isPescatarian ? 'Trust Pescatarian' : 'Trust Carnivore';
      return `## Report #12: The Stall-Breaker Protocol\n\n*What to do if weight loss stalls after Week 2*\n\n## Check These 4 Things (In Order)\n\n### 1. Real Stall or Normal Fluctuation?\n- It's been 7+ days with no weight loss?\n- You've been strict on {{diet}}?\n- You're drinking water and getting electrolytes?\n\nWait 10-14 days before making changes.\n\n### 2. Dairy Creep\nSmall amounts of cheese/cream add 1000+ calories.\n- Are you adding butter to everything? Using cream in coffee?\n- Solution: Track dairy for 3 days, reduce by 50%\n\n### 3. Too Much Fat\n{{diet}} is high-fat, but not unlimited.\n- How many grams of fat daily? Are you adding excessive cooking fat?\n- Solution: Reduce added fat by 20%, let ${naturalFatSource} be primary\n\n### 4. Hidden Carbs\n- Check labels on ${processedFoodCheck}\n- Solution: ${plainProteinAdvice}\n\n## Keep Going\n\nDon't quit {{diet}} • Don't add carbs • ${trustMessage}. Stalls are temporary`;
    })(),

    tracker: `## Report #13: 30-Day Symptom & Progress Tracker\n\n*Track what matters: How you FEEL, not just the scale*\n\n## How to Use This Tracker\n\n1. Weigh yourself (morning, after bathroom)\n2. Rate energy (1-10)\n3. Rate mood (1-10)\n4. Note digestion quality\n5. Track non-scale victories (NSVs)\n\n## Daily Tracker\n\n| Day | Weight | Energy | Mood | Digestion | NSVs |\n|-----|--------|--------|------|-----------|------|\n| 1 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n| 7 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n| 15 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n| 30 | ___ | ☐☐☐☐☐ | ☐☐☐☐☐ | Good/OK/Bad | |\n\n## Symptom Checklist\n\n| Symptom | Week 1 | Week 2 | Week 3 | Week 4 |\n|---------|--------|--------|--------|--------|\n| Brain fog | ☐ | ☐ | ☐ | ☐ |\n| Energy crashes | ☐ | ☐ | ☐ | ☐ |\n| Cravings | ☐ | ☐ | ☐ | ☐ |\n| Sleep quality | ☐ | ☐ | ☐ | ☐ |\n| Joint pain | ☐ | ☐ | ☐ | ☐ |\n| Bloating | ☐ | ☐ | ☐ | ☐ |\n| Mood | ☐ | ☐ | ☐ | ☐ |\n| Digestion | ☐ | ☐ | ☐ | ☐ |\n\n## End of 30 Days: Reflection\n\n**What improved the most?** _____________\n\n**What's still a challenge?** _____________\n\n**Continue {{diet}} past 30 days?** ☐ Yes ☐ Maybe ☐ No\n\n*Remember: This is YOUR data. Use it to make decisions about {{diet}}.*`
  };

  return templates[templateName] || '';
}

/**
 * Replace {{placeholder}} with actual user data
 */
/**
 * The "if you lack X, substitute with Y" line.
 *
 * Extracted from replacePlaceholders so the rule it enforces can be tested directly.
 * It could not be before: whether two grades of one food land next to each other in
 * planProteins depends on the meal rotation, so no fixture persona reliably exercised
 * it and tests/mutate.sh M17 survived against a live suite. A protection nothing
 * exercises is decoration.
 *
 * The rule: a substitution must be a DIFFERENT FOOD. "If you lack Grass-fed Ground
 * Beef, substitute with Ground Beef (80/20)" is not a substitution, it is the same
 * food at another grade (reported 2026-09-09).
 */
function buildSubstitutionGuide(planProteins, eggsInPlan) {
  if (!planProteins || planProteins.length === 0) {
    return '- Swap any protein in this plan for another you tolerate and enjoy.';
  }
  const [first, ...rest] = planProteins;
  const alternatives = distinctByBaseFood(rest)
    .filter(name => baseFoodKey(name) !== baseFoodKey(first))
    .slice(0, 3);
  const lines = [];
  if (alternatives.length) {
    lines.push(`- If you lack ${first}, substitute with ${alternatives.join(', ')}`);
  }
  lines.push('- Any protein in this plan can stand in for any other; match the portion size, not the cut');
  if (planProteins.length > 4) {
    lines.push(`- Your plan also uses ${planProteins.slice(4).join(', ')}, all interchangeable`);
  }
  if (eggsInPlan) lines.push('- Eggs can replace any protein meal if needed');
  return lines.join('\n');
}

function replacePlaceholders(template, data) {
  let result = template;

  // Derived once, at the top, because several substitutions below it (shopping tips,
  // the doctor-facing diet description) also have to know what the reader declared.
  const medicalContext = deriveMedicalContext(data);

  // First, handle conditional blocks: {{#if condition}} ... {{else if condition}} ... {{else}} ... {{/if}}
  result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    // Try to find else if blocks
    const elseIfRegex = /\{\{else\s+if\s+([^}]+)\}\}([\s\S]*?)(?=\{\{(?:else|\/if)\}\})/g;
    const elseRegex = /\{\{else\}\}([\s\S]*?)$/;

    let mainCondition = evaluateCondition(condition, data);
    if (mainCondition) {
      // Extract content before any else
      const beforeElse = content.split(/\{\{else\s+if|\{\{else\}\}/)[0];
      return beforeElse;
    }

    // Check else if blocks
    let elseIfMatch;
    let remaining = content;
    while ((elseIfMatch = elseIfRegex.exec(content)) !== null) {
      if (evaluateCondition(elseIfMatch[1], data)) {
        return elseIfMatch[2];
      }
    }

    // Check else block
    const elseMatch = content.match(/\{\{else\}\}([\s\S]*?)$/);
    if (elseMatch) {
      return elseMatch[1];
    }

    return ''; // No condition matched
  });

  // Date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  result = result.replace(/\{\{currentDate\}\}/g, currentDate);

  // Basic information
  // {{lastName}} was never registered, so the final unmatched-placeholder sweep
  // deleted it and the physician letter's signature block read "I, Linda , will
  // adhere strictly...". Collapse the full-name pair FIRST, before {{firstName}} is
  // substituted on its own, or the pair never matches.
  result = result.replace(/\{\{firstName\}\} \{\{lastName\}\}/g, [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Friend');
  result = result.replace(/\{\{firstName\}\}/g, data.firstName || 'Friend');
  result = result.replace(/\{\{lastName\}\}/g, data.lastName || '');
  // Display capitalisation for the protocol name.
  //
  // Every template writes {{diet}} in heading and title-case positions:
  // "{{diet}} Target" in the markers table, "Before Starting {{diet}}", and
  // "**{{diet}} expectation:**". The fallback on this very line has always been the
  // capitalised 'Carnivore', so the templates were authored expecting a capitalised
  // value. The stored session value is lower case, which is why a real customer's
  // report read "carnivore Target" and "Before Starting carnivore" (found
  // 2026-09-09 while inspecting a delivered PDF).
  //
  // Capitalisation is applied for display only. calculateMacros() keeps its own
  // lower-cased copy for protocol matching, so this cannot affect any calculation.
  const dietDisplay = String(data.selectedProtocol || 'Carnivore')
    .trim()
    .replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1)) || 'Carnivore';
  result = result.replace(/\{\{diet\}\}/g, () => dietDisplay);
  result = result.replace(/\{\{selectedProtocol\}\}/g, data.selectedProtocol || 'Carnivore');
  // Human label, never the raw enum. "Focus: gain" and "promising results for gain"
  // were both this line printing an internal token at the customer.
  result = result.replace(/\{\{goal\}\}/g, resolveGoal(data).label);
  result = result.replace(/\{\{budget\}\}/g, data.budget || 'Moderate');
  result = result.replace(/\{\{mealPrepTime\}\}/g, data.mealPrepTime || 'Some');
  result = result.replace(/\{\{weight\}\}/g, data.weight || '');

  // Diet-aware section headers for shopping list
  const proteinSectionHeaders = {
    'Pescatarian': '🐟 The Fishmonger & Protein',
    'Lion': '🐂 The Butcher (Beef Only)',
    'Keto': '🥩 Proteins',
    'Carnivore': '🥩 The Butcher',
    'Strict Carnivore': '🥩 The Butcher'
  };
  const proteinSectionHeader = proteinSectionHeaders[data.selectedProtocol] || '🥩 The Butcher';
  result = result.replace(/\{\{proteinSectionHeader\}\}/g, proteinSectionHeader);

  // Diet-aware shopping tips
  const diet = data.selectedProtocol || 'Carnivore';
  const budget = data.budget || 'moderate';
  let shoppingTips = '';
  let proTip = '';

  if (diet === 'Pescatarian') {
    if (budget === 'tight') {
      shoppingTips = 'Buy canned fish (salmon, sardines, mackerel) in bulk. Frozen fish fillets are often cheaper than fresh. Check ethnic grocery stores for better seafood prices.';
      proTip = 'Canned salmon and sardines are budget-friendly, shelf-stable, and packed with omega-3s. Stock up when on sale.';
    } else if (budget === 'moderate') {
      shoppingTips = 'Check seafood counter for daily specials. Buy whole fish for better value. Frozen wild-caught is often fresher than "fresh" farmed fish.';
      proTip = 'Buy fish in bulk when on sale and freeze in portion sizes. This reduces weekly shopping stress and ensures variety.';
    } else {
      shoppingTips = 'Source wild-caught fish from reputable fishmongers. Consider a seafood subscription box for variety. Look for sustainably sourced options.';
      proTip = 'Build relationships with local fishmongers for the freshest catches and insider tips on seasonal availability.';
    }
  } else if (diet === 'Lion') {
    if (budget === 'tight') {
      shoppingTips = "Buy whole sub-primals (brisket, chuck roll) and cut yourself. Ground beef in bulk is your best friend. Check for Manager's Special markdowns.";
      proTip = 'A chest freezer pays for itself quickly. Buy a quarter or half cow directly from a farm for the best per-pound price.';
    } else if (budget === 'moderate') {
      shoppingTips = 'Check store flyers for sales on steaks and roasts. Stock your freezer with discounted items. Buy ground beef in 5-10 lb packages.';
      proTip = 'Buy beef in bulk when on sale and freeze it. This reduces weekly shopping stress and saves money.';
    } else {
      shoppingTips = 'Source grass-fed beef directly from local farms. Consider a beef share or subscription. Prioritize quality over quantity.';
      proTip = 'Invest in a relationship with a local rancher for consistent quality and better pricing on premium cuts.';
    }
  } else if (diet === 'Keto') {
    if (budget === 'tight') {
      shoppingTips = 'Buy fatty cuts of meat (chicken thighs, ground beef, pork shoulder). Eggs are the cheapest high-quality protein. Frozen vegetables are nutritious and affordable.';
      proTip = 'Batch cook proteins and low-carb vegetables on the weekend. This saves time and money throughout the week.';
    } else if (budget === 'moderate') {
      shoppingTips = 'Check store flyers for sales. Mix premium and budget cuts for variety. Buy seasonal vegetables for better prices.';
      proTip = 'Buy proteins in bulk when on sale and freeze them. This reduces weekly shopping stress and saves money.';
    } else {
      shoppingTips = 'Buy from local farms, prioritize quality sources and grass-fed options. Choose organic vegetables when possible.';
      proTip = 'Quality fats (grass-fed butter, avocado oil, olive oil) are worth the investment for both taste and nutrition.';
    }
  } else {
    // Carnivore / Strict Carnivore
    if (budget === 'tight') {
      shoppingTips = "Look for Manager's Special markdowns, buy whole sub-primals, organ meats are super cheap and nutrient-dense.";
      proTip = 'Buy proteins in bulk when on sale and freeze them. This reduces weekly shopping stress and saves money.';
    } else if (budget === 'moderate') {
      shoppingTips = 'Check store flyers for sales, stock your freezer with discounted items.';
      proTip = 'Buy proteins in bulk when on sale and freeze them. This reduces weekly shopping stress and saves money.';
    } else {
      shoppingTips = 'Buy from local farms, prioritize quality sources and grass-fed options.';
      proTip = 'Build relationships with local farmers for the best quality meat and insider access to premium cuts.';
    }
  }
  // Do not send a reader shopping for a food their plan deliberately excluded.
  if (medicalContext.excludedFoodTerms.length) {
    shoppingTips = shoppingTips.replace(
      /,?\s*organ meats are super cheap and nutrient-dense\.?/i,
      '.'
    ).replace(/\.\.$/, '.');
  }
  result = result.replace(/\{\{shoppingTips\}\}/g, shoppingTips);
  result = result.replace(/\{\{proTip\}\}/g, proTip);

  // Cooking fat recommendation - respect dairy allergy
  const hasDairyAllergy = (data.allergies || '').toLowerCase().includes('dairy');
  let cookingFatRecommendation = '';
  if (hasDairyAllergy) {
    cookingFatRecommendation = diet === 'Pescatarian' ? 'Olive Oil, Coconut Oil, or Avocado Oil' : 'Tallow, Lard, or Coconut Oil';
  } else {
    cookingFatRecommendation = diet === 'Pescatarian' ? 'Butter, Ghee, or Olive Oil' : 'Butter or Ghee';
  }
  result = result.replace(/\{\{cookingFatRecommendation\}\}/g, cookingFatRecommendation);

  // ---------------------------------------------------------------------------
  // Medical context. THIS is the fix for the report being condition-blind and
  // medication-blind: replacePlaceholders() is the one function every template
  // section passes through, and it always has the full user object. So the
  // classification happens once, here, and the sections that need it read it as
  // ordinary placeholders. No template parser change required.
  //
  // Before 2026-09-07 these two substitutions were computed and then discarded,
  // because {{conditions}} and {{medications}} appeared in zero templates.
  // ---------------------------------------------------------------------------
  const allergyText = data.allergies ? data.allergies : 'No known allergies';
  const conditionText = medicalContext.hasDeclaredConditions
    ? medicalContext.conditionsText
    : 'No significant health conditions';
  const medicationText = humanizeList(data.medications, 'Not taking medications');
  // Slug values ('brain-fog', 'weight-issues', 'none') used to render raw into the
  // physician-facing letter: "I'm starting a therapeutic Carnivore protocol to
  // address none."


  result = result.replace(/\{\{allergies\}\}/g, allergyText);
  result = result.replace(/\{\{conditions\}\}/g, conditionText);
  result = result.replace(/\{\{conditionsList\}\}/g, medicalContext.conditionsText);
  // Provenance matters on the doctor's sheet: this is what the patient typed, in
  // their words, and it is labelled as such rather than presented as a finding.
  result = result.replace(/\{\{symptomsList\}\}/g, medicalContext.symptomsText);
  // Disclosure, not purpose. See buildSymptomDisclosure() for the bypass this closes.
  result = result.replace(/\{\{symptomDisclosure\}\}/g, () => buildSymptomDisclosure(medicalContext));
  result = result.replace(/\{\{medications\}\}/g, medicationText);
  result = result.replace(/\{\{medicationsList\}\}/g, medicalContext.medicationsText);

  // The acknowledgement block, and the electrolyte section that is gated on it.
  const potassiumSource = (data.selectedProtocol || 'Carnivore').toLowerCase() === 'pescatarian'
    ? 'fish and eggs'
    : 'meat and eggs';
  result = result.replace(/\{\{medicalContextBanner\}\}/g, () => buildMedicalContextBanner(medicalContext));
  result = result.replace(/\{\{electrolyteProtocol\}\}/g, () => buildElectrolyteProtocol(medicalContext, { potassiumSource }));
  result = result.replace(/\{\{proteinTargetNote\}\}/g, () => buildProteinTargetNote(medicalContext));
  // A reader we have just told "this report does not set a protein target for you"
  // must not then be told, two sections later, that their protein target is precisely
  // calculated. Removing the claim, not softening the number.
  // NOTE (2026-09-09): the restricted variant below is unreachable today. Its only
  // consuming template is the meal calendar, and that section is replaced wholesale by
  // the suppression notice for exactly the readers this branch is written for. Left in
  // place rather than deleted, because it is the correct string if the calendar ever
  // comes back for them; do not read it as something a renal customer receives.
  result = result.replace(/\{\{proteinPrecisionClaim\}\}/g, medicalContext.restrictProteinTarget
    ? 'This plan is built around ordinary portions, not around a protein target set for you. You reported kidney disease, and your protein intake is a question for your doctor or a renal dietitian. Take this plan to them before you follow it.'
    : 'Your protein targets are precisely calculated.');
  result = result.replace(/\{\{mealPlanMedicalNote\}\}/g, () => buildMealPlanMedicalNote(medicalContext));

  // Macro information (both macros.calories and calories formats)
  if (data.macros) {
    const calories = data.macros.calories || 2000;
    const protein = data.macros.protein_grams || 130;
    const fat = data.macros.fat_grams || 150;
    const carbs = data.macros.carbs_grams || 20;

    // SUPPRESSION, NOT SUBSTITUTION. A reader who declared kidney disease gets no
    // protein figure anywhere a template can print one. `proteinDisplay` is a phrase,
    // not a smaller number, because choosing a smaller number is the clinical
    // judgement this product is not entitled to make. See api/medical-context.js.
    const proteinDisplay = medicalContext.restrictProteinTarget
      ? 'not set by this report, ask your doctor or renal dietitian'
      : protein;

    result = result.replace(/\{\{macros\.calories\}\}/g, calories);
    result = result.replace(/\{\{macros\.protein\}\}/g, proteinDisplay);
    result = result.replace(/\{\{macros\.fat\}\}/g, fat);
    result = result.replace(/\{\{macros\.carbs\}\}/g, carbs);

    // Also support non-nested format
    result = result.replace(/\{\{calories\}\}/g, calories);
    result = result.replace(/\{\{protein\}\}/g, proteinDisplay);
    result = result.replace(/\{\{fat\}\}/g, fat);
    result = result.replace(/\{\{carbs\}\}/g, carbs);
  }

  // Dairy tolerance
  result = result.replace(/\{\{dairyTolerance\}\}/g, data.dairyTolerance || 'Full');

  // Biggest challenge
  result = result.replace(/\{\{biggestChallenge\}\}/g, data.biggestChallenge || 'Staying consistent');

  // Anything else
  result = result.replace(/\{\{anythingElse\}\}/g, data.anythingElse || '');

  // Report #5 Physician Guide - protein and nutrient fallbacks
  const proteinsByDiet = {
    'Lion': 'beef',
    'Strict Carnivore': 'beef and organ meats',
    'Carnivore': 'beef, fish, and eggs',
    'Pescatarian': 'fish and eggs',
    'Keto': 'meat, fish, and eggs'
  };
  // This string is spoken by the reader to their doctor ("my diet includes X"). If the
  // plan withheld organ meats for a medical reason, the script must not still name them.
  let proteinText = proteinsByDiet[data.selectedProtocol] || 'meat and fish';
  if (medicalContext.excludedFoodTerms.length) {
    proteinText = proteinText.replace(/\s*and organ meats/i, '').replace(/,\s*organ meats/i, '');
  }
  result = result.replace(/\{\{proteins\}\}/g, proteinText);

  // Nutrient fallbacks by diet
  const nutrientsByDiet = {
    'Lion': 'bioavailable B vitamins, iron, and zinc',
    'Strict Carnivore': 'B vitamins, iron, zinc, and selenium',
    'Carnivore': 'complete amino acids, B vitamins, iron, and omega-3s',
    'Pescatarian': 'omega-3 fatty acids, B vitamins, and selenium',
    'Keto': 'vitamins, minerals, and healthy fats'
  };
  const nutrientText = nutrientsByDiet[data.selectedProtocol] || 'essential nutrients';
  result = result.replace(/\{\{nutrient\}\}/g, nutrientText);

  // Lab monitoring fallback (common labs to monitor)
  result = result.replace(/\{\{lab\}\}/g, 'lipid panel and inflammatory markers');

  // Every template is rendered through this function, so the plan was built for all
  // thirteen sections and rendered into the two that carry its placeholders. For a
  // reader whose protein target is withheld it is not built at all: generateFullMealPlan
  // throws by design, and Reports #3 and #4 are replaced upstream by the suppression
  // notices. Skipping here is what lets the OTHER eleven sections generate normally,
  // which is the whole point. The reader keeps the report they paid for.
  if (medicalContext.restrictProteinTarget) {
    // Defensive: these placeholders live only in the two suppressed sections, so
    // nothing should be left to fill. Emptying them means a template that grew one
    // later cannot ship a stray token or a quantity.
    result = result
      .replace(/\{\{mealCalendarWeeks\}\}/g, '')
      .replace(/\{\{groceryWeeks\}\}/g, '')
      .replace(/\{\{substitutionGuide\}\}/g, '')
      .replace(/\{\{(?:breakfast|lunch|dinner)\d+\}\}/g, '')
      .replace(/\{\{\w+\}\}/g, '');
    return result;
  }

  // Generate full 30-day meal plan using database-driven algorithm
  const fullMealPlan = generateFullMealPlan(data);

  // Flatten the meal plan for template replacement
  // Handle dynamic meal structure (1, 2, or 3 meals per day)
  const mealsPerDay = data.mealsPerDay || 2;

  // Build one table per week, with as many meal columns as the plan actually has.
  // Until 2026-09-08 this rendered a fixed Breakfast/Lunch/Dinner table for everyone
  // and wrote '-' into Lunch for the 2-meal default, which markdownToHTML then
  // rendered as an empty cell: 30 blank rows in a calendar the reader paid for. The
  // table now follows the meal plan instead of the meal plan being padded to fit the
  // table.
  //
  // The calendar is built by walking fullMealPlan.weeks, NOT by filling a fixed set
  // of week placeholders. That distinction is the whole fix: a hardcoded week list
  // silently discards anything the generator produces beyond it, which is how days 29
  // and 30 disappeared while the section kept its "30-Day" title. Adding a fifth
  // hardcoded slot would fix today's number and leave the same trap set.
  const renderedDayNumbers = [];
  let calendarBlocks = '';
  for (const week of fullMealPlan.weeks) {
    const days = week?.days || [];
    if (!days.length) continue;
    const names = days[0]?.meals?.map(m => m.name) || [];
    if (!names.length) continue;

    const { label, title, range } = weekHeading(week.weekNumber, days);
    calendarBlocks += `## ${label}: ${title}\n\n*${range}*\n\n`;
    calendarBlocks += `| Day | ${names.join(' | ')} |\n`;
    calendarBlocks += `| :--- | ${names.map(() => ':---').join(' | ')} |\n`;
    for (const d of days) {
      const cells = names.map((_, i) => d.meals[i]?.description || '');
      calendarBlocks += `| Day ${d.dayNumber} | ${cells.join(' | ')} |\n`;
      renderedDayNumbers.push(d.dayNumber);
    }
    calendarBlocks += '\n';
  }

  // Fails the build rather than shipping a short calendar. See the function's comment.
  assertRenderedPlanIsComplete(fullMealPlan, renderedDayNumbers);

  result = result.replace(/\{\{mealCalendarWeeks\}\}/g, calendarBlocks.trimEnd());

  // Legacy per-day placeholders. Some templates and the sample-day breakdown still
  // reference them; they are filled from the same day objects, never recomputed.
  for (let day = 1; day <= 30; day++) {
    const week = Math.ceil(day / 7);
    const dayInWeek = ((day - 1) % 7);
    const dayData = fullMealPlan.weeks[week - 1]?.days[dayInWeek];
    if (dayData) {
      const m = dayData.meals || [];
      const pick = i => m[i]?.description || '';
      result = result.replace(new RegExp(`\\{\\{breakfast${day}\\}\\}`, 'g'), pick(0));
      result = result.replace(new RegExp(`\\{\\{lunch${day}\\}\\}`, 'g'), m.length >= 3 ? pick(1) : '');
      result = result.replace(new RegExp(`\\{\\{dinner${day}\\}\\}`, 'g'), m.length >= 3 ? pick(2) : pick(m.length - 1));
    }
  }

  // Derived from the SAME fullMealPlan object rendered into the calendar above.
  // Passing it is not a convenience: generateGroceryListByWeek throws without it,
  // so there is no code path that can invent a second, disagreeing list.
  const groceryLists = generateGroceryListByWeek(data, fullMealPlan);

  // Built by walking the meal plan's own weeks, for the same reason the calendar is:
  // a fixed `week <= 4` loop drops week 5's shopping without dropping week 5's meals,
  // which is the worse half of the same bug. Days 29 and 30 tell a reader to cook
  // something; this is where they find out to buy it.
  // The computed value, not the placeholder: {{proteinSectionHeader}} was already
  // substituted further up, so emitting the token here would ship it unreplaced.
  const groceryProteinHeader = proteinSectionHeader;
  let groceryBlocks = '';
  for (const planWeek of fullMealPlan.weeks) {
    const days = planWeek?.days || [];
    if (!days.length) continue;
    const week = planWeek.weekNumber;
    const weekData = groceryLists[`week${week}`];

    // Build protein section dynamically (all filtered proteins)
    let proteinSection = '';
    if (weekData && weekData.proteins) {
      weekData.proteins.forEach(p => {
        // CHECKBOX GHOST FIX v2: Strict guard clause - must have valid name with 2+ chars
        const itemName = p?.name;
        if (!itemName || itemName === 'undefined' || itemName.trim().length < 2) {
          return null; // Skip invalid items completely
        }
        const quantity = p.quantity || '1 lb';
        proteinSection += `* [ ] ${itemName.trim()} - ${quantity}\n`;
      });
    }

    // Build dairy/eggs section dynamically (all filtered items)
    let dairyEggsSection = '';
    if (weekData) {
      // Add eggs first (if not allergic and has valid name)
      if (weekData.eggs && weekData.eggs.length > 0) {
        weekData.eggs.forEach(e => {
          // CHECKBOX GHOST FIX v2: Strict guard clause - must have valid name with 2+ chars
          const itemName = e?.name;
          if (!itemName || itemName === 'undefined' || itemName.trim().length < 2) {
            return null; // Skip invalid items completely
          }
          dairyEggsSection += `* [ ] ${itemName.trim()} - ${e.quantity || '1 dozen'}\n`;
        });
      }
      // Add fats/dairy (if not allergic and has valid name)
      if (weekData.fats && weekData.fats.length > 0) {
        weekData.fats.forEach(f => {
          // CHECKBOX GHOST FIX v2: Strict guard clause - must have valid name with 2+ chars
          const itemName = f?.name;
          if (!itemName || itemName === 'undefined' || itemName.trim().length < 2) {
            return null; // Skip invalid items completely
          }
          const quantity = f.quantity || '1 lb';
          dairyEggsSection += `* [ ] ${itemName.trim()} - ${quantity}\n`;
        });
      }
    }

    // Replace entire sections (not individual placeholders)
    // Trim trailing newlines to prevent empty checkboxes in PDF
    let pantrySection = '';
    if (weekData && weekData.pantry) {
      weekData.pantry.forEach(i => {
        const itemName = i?.name;
        if (!itemName || itemName === 'undefined' || itemName.trim().length < 2) return;
        pantrySection += `* [ ] ${itemName.trim()} - ${i.quantity || '1'}\n`;
      });
    }

    const { label, title, range } = weekHeading(week, days);
    groceryBlocks += `## \u{1F6D2} ${label} Shopping List\n\n*${title} \u00b7 ${range}*\n\n`;
    groceryBlocks += `### ${groceryProteinHeader}\n${proteinSection.trim()}\n`;
    groceryBlocks += `### \u{1F95A} Dairy & Eggs\n${dairyEggsSection.trim()}\n`;
    groceryBlocks += `### \u{1F9C2} Pantry\n${pantrySection.trim()}\n\n`;
  }
  result = result.replace(/\{\{groceryWeeks\}\}/g, groceryBlocks.trimEnd());

  // Also fill the old-style single-week placeholders for backward compatibility
  if (groceryLists.week1) {
    const week1 = groceryLists.week1;
    result = result.replace(/\{\{protein1Week1\}\}/g, week1.proteins[0]?.name || '');
    result = result.replace(/\{\{qty1Week1\}\}/g, week1.proteins[0]?.quantity || '');
    result = result.replace(/\{\{protein2Week1\}\}/g, week1.proteins[1]?.name || '');
    result = result.replace(/\{\{qty2Week1\}\}/g, week1.proteins[1]?.quantity || '');
    result = result.replace(/\{\{dairy1\}\}/g, week1.fats[0]?.name || 'Butter');
    result = result.replace(/\{\{dairyQty1\}\}/g, week1.fats[0]?.quantity || '1 lb');
  }

  // Fill substitution guide with actual database values
  if (fullMealPlan.weeks.length > 0 && fullMealPlan.weeks[0].days.length > 0) {
    const firstDay = fullMealPlan.weeks[0].days[0];

    // Extract protein from first meal (handle dynamic structure)
    let firstMeal;
    if (mealsPerDay === 1) {
      firstMeal = firstDay.meal;
    } else if (mealsPerDay === 2) {
      firstMeal = firstDay.meal1;
    } else {
      firstMeal = firstDay.breakfast;
    }

    // Extract the protein name from the first meal (e.g., "Grass-fed Ground Beef + Eggs + Butter" → "Grass-fed Ground Beef")
    const mainProteinMatch = firstMeal?.match(/^(\d+g\s+)?([^,]+)/);
    const mainProtein = mainProteinMatch ? mainProteinMatch[2].trim() : 'Beef';

    result = result.replace(/\{\{protein1\}\}/g, mainProtein);
    result = result.replace(/\{\{protein2\}\}/g, 'Fish');
  } else {
    // Fallback: Use generic values instead of specific foods
    // This should rarely happen if filtering is working correctly
    result = result.replace(/\{\{protein1\}\}/g, 'Protein');
    result = result.replace(/\{\{protein2\}\}/g, 'Fish');
  }

  // Generate diet-appropriate substitution guide (no salt substitution - salt is essential)
  // CRITICAL: Respect user's avoidFoods preferences when generating substitutions
  const dietLower = (data.selectedProtocol || 'Carnivore').toLowerCase();
  const avoidFoodsLower = (data.avoidFoods || '').toLowerCase();
  // Built from the proteins this reader's plan ACTUALLY uses, for the same reason the
  // grocery list is: prose that names food independently of the reader's data will
  // eventually name food the reader told us to avoid. Until 2026-09-08 the carnivore
  // branch was a hardcoded string offering "lamb, pork, or fish" to everyone, which
  // tests/report-integrity.test.mjs caught being served to a reader avoiding pork and
  // lamb.
  const planProteins = [...new Set(
    (fullMealPlan.weeks || [])
      .flatMap(w => w.days || [])
      .flatMap(d => d.items || [])
      .filter(i => i.unit === 'g' && i.category !== 'Eggs')
      .map(i => i.name)
  )];

  const eggsInPlan = (fullMealPlan.weeks || [])
    .flatMap(w => w.days || [])
    .flatMap(d => d.items || [])
    .some(i => i.category === 'Eggs');
  const substitutionGuide = buildSubstitutionGuide(planProteins, eggsInPlan);

  result = result.replace(/\{\{substitutionGuide\}\}/g, substitutionGuide);

  // Remove any remaining unmatched placeholders (set to empty string)
  result = result.replace(/\{\{\w+\}\}/g, '');

  return result;
}

/**
 * Load static template and replace placeholders
 */
async function loadAndCustomizeTemplate(templateName, data) {
  // Template mapping to file names
  const templates = {
    foodGuide: generateDynamicFoodGuide(data.selectedProtocol, data),
    mealCalendar: getTemplateContent('mealCalendar'),
    shoppingList: getTemplateContent('shoppingList'),
    physicianConsult: getTemplateContent('physicianConsult', data),
    restaurant: getTemplateContent('restaurant', data),
    science: getTemplateContent('science', data.selectedProtocol),
    labs: getTemplateContent('labs'),
    electrolytes: getTemplateContent('electrolytes'),
    timeline: getTemplateContent('timeline'),
    stallBreaker: getTemplateContent('stallBreaker'),
    tracker: getTemplateContent('tracker')
  };

  let template = templates[templateName] || '';

  // Replace placeholders with user data
  template = replacePlaceholders(template, data);

  return template;
}

// ============================================================================
// 12. DYNAMIC FOOD GUIDE GENERATOR
// ============================================================================

/**
 * Generate dynamic food guide from filtered database
 * Respects user allergies and food restrictions
 */
function generateDynamicFoodGuide(dietType, data) {
  // DEBUG: Log entire data object to see what we're receiving
  console.log(`[generateDynamicFoodGuide] FULL DATA OBJECT:`, JSON.stringify(data, null, 2));

  // Normalize diet type - extract first word and make lowercase
  const dietNormalized = (dietType || '').trim().toLowerCase().split(/[,\s]+/)[0];
  const allergies = (data.allergies || '').toLowerCase();
  // Use avoidFoods (form field) or foodRestrictions (API field) - whichever is provided
  // Foods the reader asked us to leave out, PLUS foods withheld for a declared medical
  // reason (api/medical-context.js). Both go through the same shouldFilterOutFood()
  // path: one mechanism, so a medical exclusion cannot be honoured in the meal plan
  // and forgotten in the grocery list. This removes items; it never swaps in a
  // "safer" quantity of the removed one.
  const foodRestrictions = withMedicalFoodExclusions(
    (data.avoidFoods || data.foodRestrictions || '').toLowerCase(),
    deriveMedicalContext(data)
  );
  const budget = data.budget || 'moderate';

  console.log(`[generateDynamicFoodGuide] Raw dietType: "${dietType}" → Normalized: "${dietNormalized}"`);
  console.log(`[generateDynamicFoodGuide] Allergies: "${allergies}"`);
  console.log(`[generateDynamicFoodGuide] Food Restrictions/Avoid Foods: "${foodRestrictions}"`);

  // Map diet names to standardized names
  const dietMap = {
    'lion': 'Lion',
    'pescatarian': 'Pescatarian',
    'keto': 'Keto',
    'carnivore': 'Carnivore',
    'lowcarb': 'LowCarb',
    'low-carb': 'LowCarb',
    'low carb': 'LowCarb'
  };

  const standardizedDiet = dietMap[dietNormalized] || 'Carnivore'; // Default to Carnivore
  console.log(`[generateDynamicFoodGuide] Standardized diet: "${standardizedDiet}"`);

  // Filter proteins by diet, allergies, and restrictions
  const availableProteins = foodDatabase.proteins.filter(p =>
    p.diet.some(d => d.toLowerCase() === standardizedDiet.toLowerCase()) &&
    !shouldFilterOutFood(p, allergies, foodRestrictions)
  );

  // DEBUG: Log filtered proteins to verify egg filtering
  console.log(`[generateDynamicFoodGuide] Available proteins after filtering (${availableProteins.length}):`, availableProteins.map(p => p.name).join(', '));

  // Filter fats
  const availableFats = foodDatabase.fats.filter(f =>
    f.diet.some(d => d.toLowerCase() === standardizedDiet.toLowerCase()) &&
    !shouldFilterOutFood(f, allergies, foodRestrictions)
  );

  // Filter vegetables (for Keto only)
  const availableVegetables = foodDatabase.vegetables.filter(v =>
    v.diet.some(d => d.toLowerCase() === standardizedDiet.toLowerCase()) &&
    !shouldFilterOutFood(v, allergies, foodRestrictions)
  );

  console.log(`[generateDynamicFoodGuide] Available proteins: ${availableProteins.length}, Available fats: ${availableFats.length}, Available vegetables: ${availableVegetables.length}`);
  console.log(`[generateDynamicFoodGuide] Protein names: ${availableProteins.map(p => p.name).join(', ')}`);

  // Get unique categories from available proteins
  const categories = {};
  availableProteins.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  // Generate TIER sections - Use standardized diet name
  let tierContent = '';
  if (standardizedDiet === 'Lion') {
    // Lion diet: only beef
    const beefProteins = availableProteins.filter(p => p.category.toLowerCase().includes('beef'));
    tierContent = `## TIER 1: FOUNDATION (100% of intake)\n\n**ALL available beef forms:**\n${beefProteins.map(p => `- ${p.name}`).join('\n')}\n\n**Cooking:** Any method (grilled, fried, broiled, boiled)\n\n**Fat content:** CRITICAL - 80/20 minimum, fattier is better`;

  } else if (standardizedDiet === 'Pescatarian') {
    // Pescatarian: fish, eggs, dairy, shellfish
    const fish = availableProteins.filter(p => p.category.toLowerCase().includes('fish'));
    const eggs = availableProteins.filter(p => p.category.toLowerCase().includes('egg'));
    const shellfish = availableProteins.filter(p => p.category.toLowerCase().includes('shellfish'));

    // Build eggs section only if eggs are available after filtering
    const eggsSection = eggs.length > 0 ? `\n\n**Choose fatty fish, not lean**\n\n### Eggs (Daily Staple)\n${eggs.map(p => `- ${p.name}`).join('\n')}` : '\n\n**Choose fatty fish, not lean**';

    // Build shellfish section dynamically - STRICT: only show shellfish that passed shouldFilterOutFood
    // If shellfish array is empty (either due to allergy OR food restrictions), show NO shellfish fallback
    let shellfishSection = '';
    let shellfishHeader = '';
    if (shellfish.length > 0) {
      shellfishSection = shellfish.map(p => `- ${p.name}`).join('\n');
      shellfishHeader = '### Shellfish & Seafood\n';
    }
    // REMOVED: No more hardcoded shellfish fallback - if filtered out, they stay out

    // Build fats section - respect dairy allergy
    const hasDairyAllergy = allergies.includes('dairy');
    const fatsFallback = hasDairyAllergy ? '- Olive oil, coconut oil, avocado oil' : '- Butter, ghee, coconut oil';
    const fatsSection = availableFats.length > 0 ? availableFats.map(f => `- ${f.name}`).join('\n') : fatsFallback;

    // Build TIER 2 content - only include shellfish section if not allergic
    const tier2Content = shellfishSection
      ? `## TIER 2: VARIETY (20-30%)\n\n${shellfishHeader}${shellfishSection}\n\n### Healthy Fats & Dairy\n${fatsSection}`
      : `## TIER 2: VARIETY (20-30%)\n\n### Healthy Fats & Dairy\n${fatsSection}`;

    tierContent = `## TIER 1: FOUNDATION (60-70% of intake)\n\n### Fatty Fish (Primary Protein)\n${fish.map(p => `- ${p.name}`).join('\n')}${eggsSection}\n\n---\n\n${tier2Content}`;

  } else if (standardizedDiet === 'Keto') {
    // Keto: meats, some plants, dairy
    const meats = availableProteins.filter(p => !p.category.toLowerCase().includes('egg'));
    const eggs = availableProteins.filter(p => p.category.toLowerCase().includes('egg'));

    // DEBUG: Log separation
    console.log(`[generateDynamicFoodGuide] Keto diet - Meats (${meats.length}):`, meats.map(p => p.name).join(', '));
    console.log(`[generateDynamicFoodGuide] Keto diet - Eggs (${eggs.length}):`, eggs.map(p => p.name).join(', '));

    // Build eggs section only if eggs are available after filtering
    const eggsSection = eggs.length > 0 ? `\n\n### Eggs\n${eggs.map(p => `- ${p.name}`).join('\n')}` : '';

    // Build fats section - respect dairy allergy
    const hasDairyAllergy = allergies.includes('dairy');
    const ketoFatsFallback = hasDairyAllergy ? '- Olive oil, avocado oil, coconut oil' : '- Butter, ghee, avocado oil';
    const ketoFatsSection = availableFats.length > 0 ? availableFats.map(f => `- ${f.name}`).join('\n') : ketoFatsFallback;

    tierContent = `## TIER 1: FOUNDATION (70-75%)\n\n### Proteins & Healthy Fats\n${meats.map(p => `- ${p.name}`).join('\n')}${eggsSection}\n\n---\n\n## TIER 2: REGULAR VARIETY (15-20%)\n\n### Low-Carb Vegetables\n${availableVegetables.length > 0 ? availableVegetables.map(v => `- ${v.name}`).join('\n') : '- Leafy greens, broccoli, cauliflower, asparagus, zucchini'}\n\n### Healthy Fats\n${ketoFatsSection}`;

  } else if (standardizedDiet === 'LowCarb') {
    // Low-Carb: similar to Keto but with slightly more flexibility on carbs
    const meats = availableProteins.filter(p => !p.category.toLowerCase().includes('egg'));
    const eggs = availableProteins.filter(p => p.category.toLowerCase().includes('egg'));

    // Build eggs section only if eggs are available after filtering
    const eggsSection = eggs.length > 0 ? `\n\n### Eggs\n${eggs.map(p => `- ${p.name}`).join('\n')}` : '';

    // Build fats section - respect dairy allergy
    const hasDairyAllergy = allergies.includes('dairy');
    const lowCarbFatsFallback = hasDairyAllergy ? '- Olive oil, avocado oil, coconut oil' : '- Butter, ghee, olive oil';
    const lowCarbFatsSection = availableFats.length > 0 ? availableFats.map(f => `- ${f.name}`).join('\n') : lowCarbFatsFallback;

    tierContent = `## TIER 1: FOUNDATION (60-70%)\n\n### Proteins\n${meats.map(p => `- ${p.name}`).join('\n')}${eggsSection}\n\n---\n\n## TIER 2: REGULAR VARIETY (20-25%)\n\n### Low-Carb Vegetables\n${availableVegetables.length > 0 ? availableVegetables.map(v => `- ${v.name}`).join('\n') : '- Leafy greens, broccoli, cauliflower, asparagus, zucchini, bell peppers'}\n\n### Healthy Fats\n${lowCarbFatsSection}\n\n---\n\n## TIER 3: OCCASIONAL (5-10%)\n\n### Limited Carbs\n- Berries (small portions)\n- Nuts and seeds\n- Dark chocolate (85%+ cacao)`;

  } else {
    // Default to Carnivore: all meats
    tierContent = `## TIER 1: FOUNDATION (70-80%)\n\n### Available Proteins\n${Object.entries(categories)
      .map(([cat, items]) => `\n**${cat}**\n${items.map(p => `- ${p.name}`).join('\n')}`)
      .join('\n')}`;
  }

  // Generate daily eating patterns
  // Distinct FOODS, not distinct database rows: without this the first two rows for
  // carnivore are two grades of ground beef and Option 1 pairs a food with itself.
  const proteinSamples = distinctByBaseFood(availableProteins).slice(0, 3);
  const fatSample = distinctByBaseFood(availableFats)[0]?.name || 'Butter';

  let mealPatterns = '';
  if (standardizedDiet === 'Lion') {
    // Lion is the one protocol whose eating pattern states an amount, and it is a
    // static string rather than a calculated one: every Lion reader saw the same
    // "500-1500g". For a reader whose protein target is withheld that is still a large
    // daily meat quantity, printed two sections after we told them we are not setting
    // one and are not printing portions. The number not being derived from their
    // target does not make it a smaller contradiction to the reader holding it.
    //
    // Only the amount bullet changes. Meal timing and seasoning carry no intake
    // guidance and are untouched, and no other protocol is affected: the else branch
    // below lists food combinations without quantities.
    //
    // Copy by Sarah (sarah-health-coach), 2026-09-09, used verbatim.
    const oneMealBullet = deriveMedicalContext(data).restrictProteinTarget
      ? '- **One meal:** Because of what you told us about your kidneys, we are not ' +
        'stating an amount here. Ask your doctor or a renal dietitian how much to eat.'
      : `- **One large meal:** 500-1500g ${proteinSamples[0]?.name || 'beef'} + salt`;
    mealPatterns = `## Daily Eating Pattern\n\nLion Diet is typically **one meal per day (OMAD)**.\n\n${oneMealBullet}\n- **Meal timing:** Whenever hungry\n- **Seasoning:** Salt only`;
  } else {
    mealPatterns = `## Daily Eating Patterns\n\n- **Option 1:** ${proteinSamples[0]?.name || 'Protein'} + ${proteinSamples[1]?.name || 'Protein'} + ${fatSample}\n- **Option 2:** ${proteinSamples[1]?.name || 'Protein'} + ${fatSample}\n- **Option 3:** ${proteinSamples[2]?.name || 'Protein'} + ${proteinSamples[0]?.name || 'Protein'} + ${fatSample}`;
  }

  // Generate budget optimization
  const tightBudgetProteins = distinctByBaseFood(availableProteins.filter(p => p.cost.includes('tight'))).slice(0, 2);
  const moderateProteins = distinctByBaseFood(availableProteins.filter(p => p.cost.includes('moderate'))).slice(0, 2);

  let budgetText = '';
  if (budget === 'tight') {
    budgetText = tightBudgetProteins.map(p => p.name).join(', ') || distinctByBaseFood(availableProteins).slice(0, 2).map(p => p.name).join(', ');
    budgetText += '\n\n**Cost:** $30-50/week';
  } else if (budget === 'moderate') {
    budgetText = moderateProteins.map(p => p.name).join(', ') || distinctByBaseFood(availableProteins).slice(0, 2).map(p => p.name).join(', ');
    budgetText += '\n\n**Cost:** $50-80/week';
  } else {
    budgetText = 'Grass-fed/wild-caught premium options\n\n**Cost:** $80-150+/week';
  }

  // Build complete guide - Map diet to emoji and title
  const emojiMap = {
    'Lion': '🐂',
    'Pescatarian': '🐟',
    'Keto': '🔥',
    'Carnivore': '🥩',
    'LowCarb': '🥗'
  };

  const titleMap = {
    'Lion': 'Lion Diet',
    'Pescatarian': 'Pescatarian Carnivore',
    'Keto': 'Ketogenic',
    'Carnivore': 'Carnivore',
    'LowCarb': 'Low-Carb'
  };

  const emoji = emojiMap[standardizedDiet] || '🥩';
  const title = titleMap[standardizedDiet] || 'Carnivore';

  // Map diet types to their pyramid images
  const imageMap = {
    'Lion': 'https://carnivoreweekly.com/images/LionFP.png',
    'Pescatarian': 'https://carnivoreweekly.com/images/PescatarianFP.png',
    'Keto': 'https://carnivoreweekly.com/images/KetoFP.png',
    'Carnivore': 'https://carnivoreweekly.com/images/CarnivorFP.png',
    'LowCarb': 'https://carnivoreweekly.com/images/LowCarbFP.png'
  };
  const pyramidImageUrl = imageMap[standardizedDiet] || imageMap['Carnivore'];

  // Shellfish allergy disclaimer for pyramid image - ONLY for Pescatarian diet with shellfish allergy
  const isPescatarianDiet = standardizedDiet === 'Pescatarian';
  const hasShellfish = allergies.includes('shellfish');
  const shellfishDisclaimer = (isPescatarianDiet && hasShellfish)
    ? '\n\n> **IMAGE FOR ILLUSTRATION:** Since you have a shellfish allergy, strictly follow the Tier lists below which exclude all shellfish.\n'
    : '';

  return `## Report #2: Your ${title} Food Guide\n\n**Prepared for:** {{firstName}}\n**Diet Protocol:** ${title}\n**Date:** {{currentDate}}\n\n---\n\n## ${emoji} Your ${title} Food Pyramid\n\n![${title} Food Pyramid](${pyramidImageUrl})${shellfishDisclaimer}\n\n${tierContent}\n\n---\n\n${mealPatterns}\n\n---\n\n## Budget Optimization\n\n${budgetText}\n\n---\n\n## Week-by-Week Adaptation\n\n${buildAdaptationOutlook()}\n\n---\n\n**Your personalized guide respects your dietary preferences and restrictions.**`;
}

// ============================================================================
// 13. TEMPLATE CONTENT CONSTANTS (CONTINUED IN NEXT MESSAGE DUE TO SIZE)
// ============================================================================

// NOTE: This file is getting very long. The getTemplateContent() function
// with all 11 template constants will be included in the next extraction
// if needed. For now, this provides all the core logic functions.

// ============================================================================
// 15. HELPER FUNCTIONS
// ============================================================================

/**
 * Build user profile from questionnaire data
 */
function buildProfile(data) {
  let profile = [];

  // Contact info
  if (data.firstName) {
    profile.push(`NAME: ${data.firstName}`);
  }
  profile.push(`EMAIL: ${data.email}`);

  // Age and sex were never placed in the profile at all, so the model writing the
  // personalized sections for a 72-year-old did not know she was 72.
  const demographics = [];
  if (data.age) demographics.push(`- Age: ${data.age}`);
  if (data.sex) demographics.push(`- Sex: ${data.sex}`);
  if (demographics.length) {
    profile.push(`\nDEMOGRAPHICS:`);
    profile.push(...demographics);
  }

  // Macro calculations (if provided from calculator)
  if (data.macros) {
    profile.push(`\nMACRO TARGETS:`);
    profile.push(`- Calories: ${data.macros.calories}`);
    // The model cannot print a number it was never given. A reader who declared kidney
    // disease gets no protein figure in the prompt at all — not a reduced one — so the
    // live-written sections have nothing to quote and nothing to "adjust". The prompt
    // rules (rule 9) tell it what to say instead. Suppression, not substitution.
    if (deriveMedicalContext(data).restrictProteinTarget) {
      profile.push(`- Protein: WITHHELD — this reader declared kidney disease. State no protein target of any kind. See rule 9.`);
    } else {
      profile.push(`- Protein: ${data.macros.protein_grams}g`);
    }
    profile.push(`- Fat: ${data.macros.fat_grams}g`);
    // calculateMacros() does not return activityLevel/goal; these come off the form.
    // They previously rendered the literal string "undefined" into every prompt.
    if (data.lifestyle || data.activityLevel) profile.push(`- Activity Level: ${data.activityLevel || data.lifestyle}`);
    // Stated with its direction so the live-written sections cannot describe these
    // calories as doing the opposite of what the arithmetic above actually does.
    const goalInfo = resolveGoal(data);
    profile.push(`- Goal (authoritative, drives the calorie target above): ${goalInfo.label}`);
    profile.push(`- The calorie figure above is ${goalInfo.direction}. Do not describe it as anything else.`);
  }

  // Allergies & restrictions
  if (data.allergies || data.avoidFoods || data.foodRestrictions || data.dairyTolerance) {
    profile.push(`\nFOOD RESTRICTIONS:`);
    if (data.allergies) profile.push(`- Allergies: ${data.allergies}`);
    if (data.avoidFoods) profile.push(`- Won't eat: ${data.avoidFoods}`);
    else if (data.foodRestrictions) profile.push(`- Won't eat: ${data.foodRestrictions}`);
    if (data.dairyTolerance) profile.push(`- Dairy tolerance: ${data.dairyTolerance}`);
  }

  // Health conditions
  if (data.medications || data.conditions || data.otherConditions) {
    profile.push(`\nHEALTH CONDITIONS:`);
    if (data.medications) profile.push(`- Medications: ${data.medications}`);
    if (data.conditions) {
      const conditionsList = Array.isArray(data.conditions) ? data.conditions.join(', ') : data.conditions;
      profile.push(`- Conditions: ${conditionsList}`);
    }
    if (data.otherConditions) profile.push(`- Other: ${data.otherConditions}`);
  }

  // Symptoms
  if (data.symptoms || data.otherSymptoms) {
    profile.push(`\nCURRENT SYMPTOMS:`);
    if (data.symptoms) {
      const symptomsList = Array.isArray(data.symptoms) ? data.symptoms.join(', ') : data.symptoms;
      profile.push(`- ${symptomsList}`);
    }
    if (data.otherSymptoms) profile.push(`- Other: ${data.otherSymptoms}`);
  }

  // Diet history
  if (data.previousDiets || data.carnivoreExperience || data.whatWorked) {
    profile.push(`\nDIET HISTORY:`);
    if (data.previousDiets) profile.push(`- Previous diets: ${data.previousDiets}`);
    if (data.carnivoreExperience) profile.push(`- Carnivore experience: ${data.carnivoreExperience}`);
    if (data.whatWorked) profile.push(`- What worked/didn't: ${data.whatWorked}`);
  }

  // Lifestyle
  if (data.cookingSkill || data.mealPrepTime || data.budget || data.familySituation || data.workTravel) {
    profile.push(`\nLIFESTYLE:`);
    if (data.cookingSkill) profile.push(`- Cooking skill: ${data.cookingSkill}`);
    if (data.mealPrepTime) profile.push(`- Meal prep time: ${data.mealPrepTime}`);
    if (data.budget) profile.push(`- Budget: ${data.budget}`);
    if (data.familySituation) profile.push(`- Family: ${data.familySituation}`);
    if (data.workTravel) profile.push(`- Work/travel: ${data.workTravel}`);
  }

  // Goals
  if (data.goals || data.biggestChallenge || data.anythingElse) {
    profile.push(`\nGOALS & CHALLENGES:`);
    if (data.goals) {
      const goalsList = Array.isArray(data.goals) ? data.goals.join(', ') : data.goals;
      // Motivations, not direction. This multi-select can contain "weightloss" for a
      // reader whose authoritative goal is Muscle Gain; when they disagree, the Goal
      // line in MACRO TARGETS wins, because that is the field the macros were built on.
      profile.push(`- What they want out of this (motivations, NOT the calorie direction): ${goalsList}`);
    }
    if (data.biggestChallenge) profile.push(`- Biggest challenge: ${data.biggestChallenge}`);
    if (data.anythingElse) profile.push(`- Additional info: ${data.anythingElse}`);
  }

  return profile.join('\n');
}

/**
 * Evaluate conditional expressions for Handlebars
 */
function evaluateCondition(expr, data) {
  // Handle comparisons like: dairyTolerance === 'full'
  const eqMatch = expr.match(/(\w+)\s*===\s*['"]([^'"]+)['"]/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    return data[field] === value;
  }
  return false;
}

// ============================================================================
// NOTE: This extraction is COMPLETE for all logic functions.
// getTemplateContent() with full template strings and replacePlaceholders()
// are both present in the original file and would need to be included
// for full self-contained functionality.
// ============================================================================

/**
 * Ensure content is HTML (pass-through since Claude now outputs HTML directly)
 * Kept as fallback in case any markdown slips through
 */
function ensureHTML(content) {
  if (!content) return '';

  // If content already contains HTML tags, it's good to go
  if (/<[^>]+>/.test(content)) {
    return content;
  }

  // Fallback: Convert any remaining markdown to HTML
  let html = content
    // Headers
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap loose list items in <ul>
    .replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>')
    // Paragraphs
    .split('\n\n')
    .map(para => {
      if (para.trim() && !para.trim().startsWith('<')) {
        return `<p>${para.trim()}</p>`;
      }
      return para;
    })
    .join('\n');

  return html;
}

/**
 * GET /api/v1/calculator/report/{access_token}/content
 * Fetch generated report HTML
 */
async function handleReportContent(request, env, accessToken) {
  try {
    if (!accessToken || accessToken.length !== 64 || !/^[a-f0-9]{64}$/i.test(accessToken)) {
      return createErrorResponse('INVALID_TOKEN', 'Invalid access token format', 400);
    }

    // Security (2026-07-22, Leo review Finding 1): this token-gated read runs
    // server-side, so it uses the service role key rather than the anon key. This
    // lets us drop the public anon SELECT policy on calculator_reports (which
    // otherwise let anyone with the publishable key dump every report's email,
    // access_token and content) without breaking customer report links.
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const reports = await response.json();
    if (!reports || reports.length === 0) {
      return createErrorResponse('REPORT_NOT_FOUND', 'Report not found', 404);
    }

    const report = reports[0];

    // Check expiration
    if (report.is_expired || new Date(report.expires_at) < new Date()) {
      return createErrorResponse('REPORT_EXPIRED', 'Report access has expired', 410);
    }

    // Count the view (metric only — a failure here must never block the report)
    try {
      await fetch(
        `${env.SUPABASE_URL}/rest/v1/calculator_reports?access_token=eq.${accessToken}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            access_count: (report.access_count || 0) + 1,
            last_accessed_at: new Date().toISOString(),
          }),
        }
      );
    } catch (e) {
      console.error('access_count update failed:', e);
    }

    // Return HTML content with appropriate headers
    return new Response(report.report_html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('handleReportContent error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

/**
 * POST /create-checkout
 * Create Stripe checkout session for Stripe payment modal
 */
// ===== GET SESSION (fetch saved form data after payment) =====
async function handleGetSession(request, env) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('id');

    console.log('[handleGetSession] Fetching session:', sessionId);

    if (!sessionId) {
      return createErrorResponse(
        'MISSING_SESSION_ID',
        'session id is required',
        400
      );
    }

    // Fetch session from Supabase
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[handleGetSession] Supabase error:', error);
      return createErrorResponse(
        'DB_ERROR',
        'Failed to fetch session',
        500,
        error
      );
    }

    const sessions = await response.json();
    console.log('[handleGetSession] Found sessions:', sessions.length);

    if (!sessions || sessions.length === 0) {
      return createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found',
        404
      );
    }

    const session = sessions[0];
    console.log('[handleGetSession] Session retrieved:', { id: session.id, email: session.email });

    return createSuccessResponse({
      success: true,
      id: session.id,
      email: session.email,
      first_name: session.first_name,
      form_data: session.form_data,
      payment_status: session.payment_status,
      created_at: session.created_at,
    }, 200);
  } catch (err) {
    console.error('[handleGetSession] error:', err);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      err.message
    );
  }
}

async function handleCreateCheckout(request, env) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Expected application/json',
        400
      );
    }

    // Parse request body
    let body;
    try {
      body = await parseJsonBody(request);
    } catch (err) {
      return createErrorResponse(
        'INVALID_JSON',
        'Request body must be valid JSON',
        400
      );
    }

    const { email, first_name, form_data, formData, success_url, cancel_url, tier_id, amount, discount_percent, coupon_code, session_token } = body;
    const finalFormData = form_data || formData;

    // Map tier_id to Stripe price_id
    const tierPriceMap = {
      'bundle': 'price_1T5CZkEVDfkpGz8wnvZEnZH7',    // $29 USD - Complete Carnivore Protocol
    };

    const stripePriceId = tierPriceMap[tier_id] || tierPriceMap['bundle'];  // Default to bundle
    console.log(`[handleCreateCheckout] Tier: ${tier_id} -> Price ID: ${stripePriceId}`);

    // Validate required fields
    if (!email) {
      return createErrorResponse(
        'MISSING_EMAIL',
        'email is required',
        400
      );
    }

    if (!isValidEmail(email)) {
      return createErrorResponse(
        'INVALID_EMAIL',
        'email must be a valid email address',
        400
      );
    }

    if (!finalFormData || typeof finalFormData !== 'object') {
      return createErrorResponse(
        'MISSING_FORM_DATA',
        'form_data is required and must be an object',
        400
      );
    }

    // ===== PAYMENT BOUNDARY =====
    // The earliest point in the purchase where the server sees the customer's answers
    // and money has not yet moved: no row inserted, no Stripe session created.
    //
    // The questionnaire asks the customer to resolve a contradictory goal before it
    // ever gets here, but that is a UI affordance and a UI affordance is not
    // enforcement. A crafted POST straight at this endpoint reaches the same check.
    //
    // Failing here means no charge and no half-finished purchase to unwind, which is
    // the whole reason this moved upstream of the report generator.
    // Adult-only, and no purchase of a product that depends on a target we
    // deliberately refused to compute.
    const checkoutEligibility = checkTargetEligibility(finalFormData);
    if (checkoutEligibility) {
      console.warn('[handleCreateCheckout] refusing checkout:', checkoutEligibility.code);
      return createErrorResponse(
        checkoutEligibility.code,
        checkoutEligibility.message,
        422,
        checkoutEligibility.validation
      );
    }

    const checkoutGoalConflict = detectGoalConflict(finalFormData);
    if (checkoutGoalConflict.blocking) {
      console.warn('[handleCreateCheckout] refusing checkout:', checkoutGoalConflict.message);
      return createErrorResponse(
        'GOAL_CONFLICT_UNRESOLVED',
        checkoutGoalConflict.message,
        422,
        {
          field: 'goal',
          primaryGoal: checkoutGoalConflict.primary,
          primaryGoalLabel: checkoutGoalConflict.primaryLabel,
          conflictingMotivations: checkoutGoalConflict.conflicting,
          resolution: 'CONFIRM_PRIMARY_GOAL',
          // No customer has been charged and no session row exists at this point.
          charged: false,
        }
      );
    }

    // Allow empty first_name - will be collected in Step 4 and defaulted to "Friend" in report generation
    const sanitizedFirstName = (first_name && typeof first_name === 'string' && first_name.trim().length > 0)
      ? first_name.trim()
      : '';

    // Use success/cancel URLs from request, fall back to calculator app with payment status
    const finalSuccessUrl = success_url || `https://carnivoreweekly.com/calculator.html?payment=success&session_id={CHECKOUT_SESSION_ID}#payment-success`;
    const finalCancelUrl = cancel_url || `https://carnivoreweekly.com/calculator.html?payment=cancelled#upgrade-cta`;

    // Generate UUIDs
    const sessionUUID = generateUUID();

    // ===== STEP 1: INSERT INTO DATABASE =====

    const insertResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          id: sessionUUID,
          email,
          first_name: sanitizedFirstName,
          form_data: finalFormData,
          payment_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Supabase insert error:', errorText);
      return createErrorResponse(
        'DB_INSERT_FAILED',
        'Failed to save assessment data',
        500,
        errorText
      );
    }

    const insertedData = await insertResponse.json();
    const dbSession = Array.isArray(insertedData) ? insertedData[0] : insertedData;

    if (!dbSession?.id) {
      console.error('No session ID returned from database');
      return createErrorResponse(
        'DB_RESPONSE_ERROR',
        'Database did not return session ID',
        500
      );
    }

    // ===== CHECK FOR 100% DISCOUNT - BYPASS STRIPE =====

    // SECURITY (bead u6ty): amount and discount_percent arrive from the
    // client and must never be trusted — the free bypass requires a coupon
    // code that Stripe itself confirms is 100% off. Anything else falls
    // through to real Stripe checkout at the server-side price ID.
    let validatedFreeCoupon = null;
    if (coupon_code && (discount_percent === 100 || amount === 0)) {
      const freeCheck = await validateCoupon(coupon_code, env);
      if (freeCheck.valid && freeCheck.percent === 100) {
        validatedFreeCoupon = freeCheck;
      } else {
        console.warn(`[handleCreateCheckout] Free-checkout attempt rejected: coupon=${coupon_code} valid=${freeCheck.valid} percent=${freeCheck.percent ?? 'n/a'}`);
      }
    } else if (discount_percent === 100 || amount === 0) {
      console.warn('[handleCreateCheckout] Free-checkout attempt rejected: no coupon code supplied');
    }

    if (validatedFreeCoupon) {
      console.log('[handleCreateCheckout] Stripe-verified 100% coupon - bypassing Stripe');

      // Update database to mark as completed (free checkout)
      const updateResponse = await fetch(
        `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionUUID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            payment_status: 'completed',
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        const updateError = await updateResponse.text();
        console.error('Failed to update free checkout session:', updateError);
      }

      // Free checkouts never hit the Stripe webhook, so sync the funnel row
      // (calculator_sessions_v2) here or it stays 'pending' forever
      if (session_token && typeof session_token === 'string') {
        const freeSyncRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(session_token)}&payment_status=eq.pending`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              // payment_integrity constraint: 'completed' requires a non-null
              // payment intent, and free checkouts have none — record a
              // synthetic marker. is_premium omitted (needs tier_id, see
              // premium_requires_payment; payment_status is the paid signal).
              payment_status: 'completed',
              amount_paid_cents: 0,
              stripe_payment_intent_id: `free_coupon_${(coupon_code || '100pct').toString().slice(0, 40)}`,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          }
        );
        if (!freeSyncRes.ok) {
          console.warn('Free checkout: calculator_sessions_v2 sync failed:', await freeSyncRes.text());
        }
      }

      // Return success response with direct redirect (no Stripe)
      return createSuccessResponse({
        success: true,
        checkout_url: `https://carnivoreweekly.com/calculator.html?payment=success&session_id=${sessionUUID}#payment-success`,
        session_uuid: sessionUUID,
        message: 'Free checkout completed (100% discount)',
      }, 200);
    }

    // ===== STEP 2: CREATE STRIPE CHECKOUT SESSION =====

    // Construct success/cancel URLs with sessionUUID as the session_id
    // HARDCODED to production URL to prevent undefined/localhost issues
    const requestOrigin = request.headers.get('origin') || '';
    let baseDomain = 'https://carnivoreweekly.com';

    // For localhost testing only, use the request origin
    if (requestOrigin && requestOrigin.includes('localhost')) {
      baseDomain = requestOrigin;
      console.log('[Worker] Detected localhost - using request origin:', baseDomain);
    }

    const successUrlWithId = `${baseDomain}/calculator.html?payment=success&session_id=${sessionUUID}#payment-success`;
    const cancelUrlWithId = `${baseDomain}/calculator.html?payment=cancelled&session_id=${sessionUUID}#upgrade-cta`;

    console.log('Sending to Stripe:');
    console.log('  success_url:', successUrlWithId);
    console.log('  cancel_url:', cancelUrlWithId);

    const stripeCheckoutPayload = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrlWithId,
      cancel_url: cancelUrlWithId,
      customer_email: email,
      client_reference_id: sessionUUID,
      metadata: {
        assessment_session_id: sessionUUID,
        email,
        first_name: sanitizedFirstName,
      },
    };

    // Build form-encoded body with proper Stripe format
    const formBody = new URLSearchParams();
    formBody.append('payment_method_types[]', 'card');
    formBody.append('line_items[0][price]', stripePriceId);
    formBody.append('line_items[0][quantity]', '1');
    formBody.append('mode', 'payment');

    // ===== APPLY COUPON TO STRIPE CHECKOUT (IF PROVIDED) =====
    let couponApplied = false;
    if (coupon_code) {
      console.log(`[Coupon] Validating coupon: ${coupon_code}`);
      const couponResult = await validateCoupon(coupon_code, env);

      if (couponResult.valid) {
        // Minted per-subscriber codes apply as promotion codes (so Stripe
        // enforces expires_at/max_redemptions); static map codes apply as
        // raw coupons, same as before.
        if (couponResult.stripe_promotion_code_id) {
          console.log(`[Coupon] Valid promotion code! Applying ${couponResult.stripe_promotion_code_id} to checkout`);
          formBody.append('discounts[0][promotion_code]', couponResult.stripe_promotion_code_id);
        } else {
          console.log(`[Coupon] Valid! Applying ${couponResult.stripe_coupon_id} to checkout`);
          formBody.append('discounts[0][coupon]', couponResult.stripe_coupon_id);
        }
        couponApplied = true;
      } else {
        console.log(`[Coupon] Invalid: ${couponResult.error}`);
        // Don't fail checkout - just proceed without discount
        // User was already warned by /validate-coupon endpoint
      }
    }

    // IMPORTANT: Can't use both 'discounts' and 'allow_promotion_codes' in same request
    // Only allow manual promo code entry if we didn't programmatically apply a coupon
    if (!couponApplied) {
      formBody.append('allow_promotion_codes', 'true');  // Allow manual entry in Stripe UI
    }
    // Send complete URLs with session_id to Stripe
    formBody.append('success_url', successUrlWithId);
    formBody.append('cancel_url', cancelUrlWithId);
    formBody.append('customer_email', email);
    formBody.append('client_reference_id', sessionUUID);
    formBody.append('metadata[assessment_session_id]', sessionUUID);
    formBody.append('metadata[email]', email);
    formBody.append('metadata[first_name]', sanitizedFirstName);
    // Funnel-row link: calculator_sessions_v2 has its own UUID keyed by
    // session_token, so the webhook needs this token to mark the right
    // funnel row paid (ISSUE bead carnivore-weekly-bryy)
    if (session_token && typeof session_token === 'string') {
      formBody.append('metadata[calc_session_token]', session_token);
    }

    console.log('=== STRIPE REQUEST DEBUG ===');
    console.log('URL:', 'https://api.stripe.com/v1/checkout/sessions');
    console.log('Method:', 'POST');
    console.log('Headers:', {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY ? 'SET' : 'MISSING'}`,
    });
    console.log('Body (form-encoded):', formBody.toString());

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    console.log('Stripe HTTP Status:', stripeResponse.status);
    console.log('Stripe Response OK:', stripeResponse.ok);

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error('❌ Stripe error (non-200):', stripeError);
      return createErrorResponse(
        'STRIPE_ERROR',
        'Failed to create Stripe checkout session',
        500,
        stripeError
      );
    }

    const stripeResponseText = await stripeResponse.text();
    console.log('=== STRIPE RESPONSE TEXT ===');
    console.log(stripeResponseText);

    let stripeSession;
    try {
      stripeSession = JSON.parse(stripeResponseText);
      console.log('=== STRIPE RESPONSE JSON (PARSED) ===');
      console.log(JSON.stringify(stripeSession, null, 2));
    } catch (parseErr) {
      console.error('Failed to parse Stripe response as JSON:', parseErr.message);
      console.error('Raw response was:', stripeResponseText);
      return createErrorResponse(
        'STRIPE_PARSE_ERROR',
        'Failed to parse Stripe response',
        500,
        stripeResponseText
      );
    }

    console.log('=== STRIPE SESSION FIELDS ===');
    console.log('id:', stripeSession?.id);
    console.log('url:', stripeSession?.url);
    console.log('object:', stripeSession?.object);
    console.log('status:', stripeSession?.status);
    console.log('All keys:', Object.keys(stripeSession || {}));

    if (!stripeSession?.id || !stripeSession?.url) {
      console.error('❌ Invalid Stripe response: Missing id or url');
      console.error('Full response:', JSON.stringify(stripeSession, null, 2));
      return createErrorResponse(
        'STRIPE_RESPONSE_ERROR',
        'Stripe session created but missing required fields',
        500,
        JSON.stringify({ expected: { id: '...', url: '...' }, got: stripeSession })
      );
    }

    console.log('✅ Stripe session valid. URL:', stripeSession.url);
    console.log('Stripe will redirect to:');
    console.log('  success_url:', successUrlWithId);
    console.log('  cancel_url:', cancelUrlWithId);

    // ===== STEP 3: UPDATE DATABASE WITH STRIPE SESSION ID =====

    const updateResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionUUID}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          stripe_session_id: stripeSession.id,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const updateError = await updateResponse.text();
      console.error('Supabase update error:', updateError);
      // Log but don't fail - Stripe session is created, just not linked
      console.warn('Could not update Stripe session ID in database, but checkout session was created');
    }

    // ===== RETURN SUCCESS RESPONSE =====

    return createSuccessResponse({
      success: true,
      url: stripeSession.url,
      session_id: stripeSession.id,
      session_uuid: sessionUUID,
      amount: stripeSession.amount_total,
      message: 'Checkout session created',
    }, 201);

  } catch (err) {
    console.error('handleCreateCheckout error:', err);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      err.message
    );
  }
}

// ===== ETSY INTEGRATION =====

/**
 * Handle Etsy OAuth callback
 * Exchanges auth code for access + refresh tokens
 */
async function handleEtsyCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`
      <html><body style="font-family:system-ui;padding:40px;text-align:center">
        <h1>❌ Etsy Authorization Failed</h1>
        <p>Error: ${error}</p>
        <p>${url.searchParams.get('error_description') || ''}</p>
      </body></html>
    `, { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  if (!code) {
    return new Response(`
      <html><body style="font-family:system-ui;padding:40px;text-align:center">
        <h1>❌ Missing Authorization Code</h1>
        <p>No code received from Etsy.</p>
      </body></html>
    `, { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Get stored PKCE verifier from KV (stored when auth was initiated)
    const storedData = await env.ETSY_AUTH_KV?.get(state, 'json');
    if (!storedData?.code_verifier) {
      return new Response(`
        <html><body style="font-family:system-ui;padding:40px;text-align:center">
          <h1>❌ Invalid State</h1>
          <p>Session expired or invalid. Please try again.</p>
        </body></html>
      `, { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.ETSY_CLIENT_ID,
        redirect_uri: env.ETSY_REDIRECT_URI,
        code,
        code_verifier: storedData.code_verifier
      })
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return new Response(`
        <html><body style="font-family:system-ui;padding:40px;text-align:center">
          <h1>❌ Token Exchange Failed</h1>
          <p>${tokens.error_description || tokens.error}</p>
        </body></html>
      `, { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    // Store tokens in Supabase
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    await fetch(`${env.SUPABASE_URL}/rest/v1/etsy_tokens`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: 'primary',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        user_id: tokens.access_token.split('.')[0], // Extract user ID from token
        updated_at: new Date().toISOString()
      })
    });

    // Clean up KV
    await env.ETSY_AUTH_KV?.delete(state);

    return new Response(`
      <html><body style="font-family:system-ui;padding:40px;text-align:center">
        <h1>✅ Etsy Connected!</h1>
        <p>Access token received and stored.</p>
        <p>Expires in: ${tokens.expires_in} seconds</p>
        <p>You can close this window.</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (err) {
    console.error('Etsy callback error:', err);
    return new Response(`
      <html><body style="font-family:system-ui;padding:40px;text-align:center">
        <h1>❌ Error</h1>
        <p>${err.message}</p>
      </body></html>
    `, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}

/**
 * Initiate Etsy OAuth flow
 * Generates PKCE challenge and returns auth URL
 */
async function handleEtsyAuthInit(request, env) {
  // Generate PKCE
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = btoa(String.fromCharCode(...verifierBytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  // Generate state
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Store verifier in KV for callback
  await env.ETSY_AUTH_KV?.put(state, JSON.stringify({
    code_verifier: verifier,
    created_at: Date.now()
  }), { expirationTtl: 600 }); // 10 min TTL

  // Build auth URL
  const authUrl = new URL('https://www.etsy.com/oauth/connect');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', env.ETSY_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.ETSY_REDIRECT_URI);
  authUrl.searchParams.set('scope', 'listings_r listings_w shops_r');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return createSuccessResponse({ auth_url: authUrl.toString(), state });
}

/**
 * Refresh Etsy access token
 */
async function handleEtsyRefresh(request, env) {
  try {
    // Get current refresh token from Supabase
    const tokenRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/etsy_tokens?id=eq.primary&select=refresh_token`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );
    const tokens = await tokenRes.json();

    if (!tokens?.[0]?.refresh_token) {
      return createErrorResponse('NO_TOKEN', 'No refresh token found. Re-authorize with Etsy.', 401);
    }

    // Refresh the token
    const refreshRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.ETSY_CLIENT_ID,
        refresh_token: tokens[0].refresh_token
      })
    });

    const newTokens = await refreshRes.json();

    if (newTokens.error) {
      return createErrorResponse('REFRESH_FAILED', newTokens.error_description || newTokens.error, 400);
    }

    // Update stored tokens
    const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();

    await fetch(`${env.SUPABASE_URL}/rest/v1/etsy_tokens?id=eq.primary`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
    });

    return createSuccessResponse({
      message: 'Token refreshed',
      expires_at: expiresAt
    });

  } catch (err) {
    console.error('Etsy refresh error:', err);
    return createErrorResponse('INTERNAL_ERROR', err.message, 500);
  }
}

/**
 * Get valid Etsy access token (refresh if needed)
 */
async function getEtsyAccessToken(env) {
  const tokenRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/etsy_tokens?id=eq.primary&select=*`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      }
    }
  );
  const tokens = await tokenRes.json();

  if (!tokens?.[0]) {
    throw new Error('No Etsy tokens found. Please authorize first.');
  }

  const token = tokens[0];
  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  // Refresh if expires in less than 5 minutes
  if (expiresAt - now < 5 * 60 * 1000) {
    const refreshRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.ETSY_CLIENT_ID,
        refresh_token: token.refresh_token
      })
    });

    const newTokens = await refreshRes.json();
    if (newTokens.error) throw new Error(newTokens.error_description || newTokens.error);

    // Update stored tokens
    const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();
    await fetch(`${env.SUPABASE_URL}/rest/v1/etsy_tokens?id=eq.primary`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString()
      })
    });

    return newTokens.access_token;
  }

  return token.access_token;
}

/**
 * Get Etsy shop info
 */
async function handleEtsyGetShop(request, env) {
  try {
    const accessToken = await getEtsyAccessToken(env);
    const userId = accessToken.split('.')[0];

    const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': env.ETSY_CLIENT_ID
      }
    });

    const shop = await shopRes.json();
    return createSuccessResponse(shop);

  } catch (err) {
    console.error('Etsy get shop error:', err);
    return createErrorResponse('ETSY_ERROR', err.message, 500);
  }
}

/**
 * Create Etsy listing
 */
async function handleEtsyCreateListing(request, env) {
  try {
    const body = await parseJsonBody(request);
    const accessToken = await getEtsyAccessToken(env);
    const userId = accessToken.split('.')[0];

    // Get shop ID first
    const shopRes = await fetch(`https://api.etsy.com/v3/application/users/${userId}/shops`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-api-key': env.ETSY_CLIENT_ID
      }
    });
    const shopData = await shopRes.json();
    const shopId = shopData.results?.[0]?.shop_id;

    if (!shopId) {
      return createErrorResponse('NO_SHOP', 'No shop found for this user', 404);
    }

    // Create draft listing
    const listingRes = await fetch(
      `https://api.etsy.com/v3/application/shops/${shopId}/listings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': env.ETSY_CLIENT_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: body.quantity || 999,
          title: body.title,
          description: body.description,
          price: body.price,
          who_made: body.who_made || 'i_did',
          when_made: body.when_made || '2020_2025',
          taxonomy_id: body.taxonomy_id,
          type: 'download',
          tags: body.tags || []
        })
      }
    );

    const listing = await listingRes.json();

    if (listing.error) {
      return createErrorResponse('LISTING_FAILED', listing.error, 400);
    }

    return createSuccessResponse({
      listing_id: listing.listing_id,
      url: `https://www.etsy.com/listing/${listing.listing_id}`,
      message: 'Draft listing created. Upload files to activate.'
    }, 201);

  } catch (err) {
    console.error('Etsy create listing error:', err);
    return createErrorResponse('ETSY_ERROR', err.message, 500);
  }
}

// ===== MAIN ROUTER =====

function getCorsOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8766',
    'http://localhost:8767',
    'https://carnivoreweekly.com',
    'https://ketodial.com',       // KD pages call this worker for the shared refund endpoint
    'https://www.ketodial.com',
    env.FRONTEND_URL
  ].filter(Boolean);

  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

// ===== KETODIAL WELCOME (keto/low-carb calculator opt-ins) =====
// Someone used the Carnivore Weekly calculator, chose keto or low-carb, and opted in.
// They likely don't know KetoDial exists — introduce the sister site, then they land
// on the KD weekly newsletter. Best-effort: failures are logged, never block signup.
async function sendKetoDialWelcome(email, env) {
  if (!env.RESEND_API_KEY) {
    console.error('KD welcome: RESEND_API_KEY not configured');
    return;
  }
  const unsubUrl = `https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe?email=${encodeURIComponent(email)}&site=kd`;
  const html = `<div style="margin:0;padding:0;background:#e2eef7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#334155">
  <div style="max-width:600px;margin:0 auto;background:#ffffff">
    <div style="background:linear-gradient(135deg,#38bdf8 0%,#2dd4bf 100%);padding:32px 24px;text-align:center">
      <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:1px">KetoDial</h1>
      <div style="color:#e0f7ff;font-size:14px;margin-top:6px">Welcome to the keto side</div>
    </div>
    <div style="padding:30px 26px;line-height:1.7;font-size:16px;color:#334155">
      <p style="margin:0 0 16px 0">Hey, and welcome.</p>
      <p style="margin:0 0 16px 0">You just ran your macros over at Carnivore Weekly and landed on keto. That's our cue to say hi, because keto is exactly what we do over here at KetoDial. Same small team, sister site. You'll just feel more at home on this side.</p>
      <p style="margin:0 0 10px 0;font-weight:700;color:#0f172a">Here's what's waiting for you, all free:</p>
      <ul style="margin:0 0 16px 0;padding-left:20px">
        <li style="margin-bottom:8px">70+ keto recipes with the fat, protein, and net carbs already worked out. No math on your end.</li>
        <li style="margin-bottom:8px">Straight guides on the stuff that trips people up early: keto flu, electrolytes, and what to do when the scale stalls.</li>
      </ul>
      <p style="margin:0 0 20px 0">Start with the recipes. Cook one thing this week and see how easy it feels when the numbers are already done.</p>
      <a href="https://ketodial.com/recipes/?utm_source=cw_calculator&amp;utm_medium=email&amp;utm_campaign=kd_welcome" style="display:block;background:#38bdf8;color:#ffffff;text-decoration:none;padding:16px 28px;border-radius:8px;font-weight:700;font-size:17px;text-align:center;margin:0 0 20px 0">Browse the recipes</a>
      <p style="margin:0 0 16px 0">Feeling the keto flu or stuck at a stall? The guides cover both. <a href="https://ketodial.com/blog/?utm_source=cw_calculator&amp;utm_medium=email&amp;utm_campaign=kd_welcome" style="color:#0ea5b7;font-weight:600">Read the keto guides</a>.</p>
      <p style="margin:0 0 16px 0;font-size:15px;color:#475569">And if you ever want someone in your corner, <a href="https://ketodial.com/?utm_source=cw_calculator&amp;utm_medium=email&amp;utm_campaign=kd_welcome_coach" style="color:#0ea5b7;font-weight:600">KetoDial Coach</a> is weekly 1:1 keto coaching for $49/mo. It's there if you want it, no pressure at all.</p>
      <p style="margin:0 0 16px 0">From here, you'll get the KetoDial newsletter once a week. Recipes and practical keto stuff you can actually use. One email, no fluff.</p>
      <div style="margin-top:26px;padding-top:18px;border-top:1px solid #e2e8f0">
        <p style="margin:0 0 4px 0;color:#475569">Glad you're here,</p>
        <p style="margin:0;color:#0f172a;font-weight:700">The KetoDial Team</p>
      </div>
    </div>
    <div style="background:#f1f5f9;padding:18px;text-align:center;font-size:12px;color:#64748b">
      <p style="margin:0 0 6px 0">You're getting this because you signed up through the Carnivore Weekly calculator and chose keto.</p>
      <p style="margin:0"><a href="${unsubUrl}" style="color:#64748b;text-decoration:underline">Unsubscribe</a></p>
      <p style="margin:6px 0 0 0;color:#94a3b8">KetoDial · 1505 Spring Creek, Whistler, BC, Canada</p>
    </div>
  </div>
</div>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'KetoDial <ketodial@carnivoreweekly.com>',
        to: [email],
        reply_to: 'newsletter@carnivoreweekly.com',
        subject: 'You found the keto side of the family',
        html,
        tags: [
          { name: 'email_type', value: 'kd_welcome' },
          { name: 'site', value: 'kd' },
        ],
      }),
    });
    if (!r.ok) console.error('KD welcome send failed:', r.status, await r.text().catch(() => ''));
  } catch (e) {
    console.error('KD welcome send error:', String(e));
  }
}

// ===== CARNIVORE COACH WAITLIST HANDLER =====
async function handleCoachWaitlist(request, env) {
  try {
    const { email, first_name, source } = await request.json();
    if (!email || !isValidEmail(email)) {
      return createErrorResponse('INVALID_EMAIL', 'A valid email is required', 400);
    }
    const cleanEmail = email.trim().toLowerCase();

    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/coach_waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email: cleanEmail,
        first_name: (first_name || '').trim() || null,
        source: source || 'coach-page',
        status: 'waiting',
        site: 'cw',
      }),
    });

    // 409 = duplicate signup; treat as success so the user sees "you're on the list"
    if (!response.ok && response.status !== 409) {
      const errorText = await response.text();
      console.error('coach_waitlist insert error:', response.status, errorText);
      return createErrorResponse('WAITLIST_ERROR', 'Could not join the waitlist, please try again', 500);
    }

    // Notify Brew (best-effort, never blocks the signup)
    if (env.RESEND_API_KEY && response.ok) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
            to: ['iambrew@gmail.com'],
            subject: `Coach waitlist signup: ${cleanEmail}`,
            html: `<p>New Carnivore Coach founding-cohort reservation: <strong>${cleanEmail}</strong> (source: ${source || 'coach-page'})</p>`,
          }),
        });
      } catch (e) {
        console.error('coach waitlist notify failed:', e);
      }
    }

    return createSuccessResponse({ message: 'You are on the list' });
  } catch (err) {
    console.error('handleCoachWaitlist error:', err);
    return createErrorResponse('INTERNAL_ERROR', String(err), 500);
  }
}

// ===== NEWSLETTER SUBSCRIBE HANDLER (in-house: Supabase + Resend) =====
async function handleSubscribe(request, env) {
  try {
    const { email, site, source, diet_type } = await request.json();
    if (!email || !isValidEmail(email.trim())) {
      return createErrorResponse('INVALID_EMAIL', 'Valid email required', 400);
    }
    const cleanEmail = email.trim().toLowerCase();
    // Catch dead domains at the door, so a typo gets fixed while the person is
    // still on the form instead of silently bouncing for 30 days.
    const undeliverable = await checkEmailDeliverable(cleanEmail);
    if (undeliverable) return undeliverable;
    return await subscribeCore(env, cleanEmail, source || 'homepage', diet_type, site);
  } catch (err) {
    return createErrorResponse('SUBSCRIBE_ERROR', String(err), 500);
  }
}

// Core enrollment shared by POST /api/v1/subscribe and the server-side hook in
// handleSaveStep2. The client-side subscribe fetch is silently dropped by ad
// blockers ("subscribe" paths are on common blocklists) — ~30% of step-3 users
// were missing from every drip before the worker enrolled authoritatively
// (bead 39ow, 2026-08-01). Duplicate enrollments resolve as success, so the
// client call and this path can both fire.
async function subscribeCore(env, cleanEmail, sourceValue, diet_type, site) {

    // Route by diet_type when the calculator provides it. Carnivore selectors enter
    // the CW 30-day drip; keto and low-carb enter the KD 30-day drip (its day-1
    // replaces the old one-off KD welcome email — never send both). Pescatarian
    // (no home yet) is held on the CW newsletter, no drip. Unknown/absent diet falls
    // back to the carnivore drip, the safe default on a carnivore site. Homepage
    // forms pass an explicit `site`: each enrolls its own site's newsletter + drip.
    let newsletterSite = 'cw';
    let enrollDrip = true;
    let sendKdWelcome = false;
    const diet = (diet_type || '').toLowerCase().replace(/[^a-z]/g, '');
    if (diet_type) {
      if (diet === 'keto' || diet === 'lowcarb') {
        newsletterSite = 'kd';
        enrollDrip = true;
      } else if (diet === 'pescatarian') {
        newsletterSite = 'cw';
        enrollDrip = false;
      } else {
        newsletterSite = 'cw';
        enrollDrip = true;
      }
    } else {
      newsletterSite = (site === 'kd') ? 'kd' : 'cw';
      enrollDrip = true;
    }
    const dripSite = newsletterSite;

    // Upsert into newsletter_subscribers (re-activates unsubscribed users)
    const nlRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/upsert_newsletter_subscriber`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_email: cleanEmail,
        p_site: newsletterSite,
        p_signup_source: sourceValue,
      }),
    });
    if (!nlRes.ok) console.error('Newsletter upsert error:', await nlRes.text());

    // Legacy path: sendKetoDialWelcome() is retained for any future non-drip KD
    // signup flow, but drip enrollees get the KD drip day-1 instead (never both).
    if (sendKdWelcome) {
      await sendKetoDialWelcome(cleanEmail, env);
    }

    // Enroll into the matching site's 30-day drip
    if (enrollDrip) {
      const dripRes = await fetch(`${env.SUPABASE_URL}/rest/v1/drip_subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          email: cleanEmail,
          source: sourceValue,
          site: dripSite,
        }),
      });

      if (dripRes.ok) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 409/23505 = already exists — treat as success (drip already running)
      const errBody = await dripRes.text().catch(() => '');
      if (dripRes.status === 409 || errBody.includes('23505') || errBody.includes('duplicate')) {
        return new Response(JSON.stringify({ success: true, existing: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.error('Subscribe error:', dripRes.status, errBody);
      return createErrorResponse('SUBSCRIBE_FAILED', 'Subscription failed', 500);
    }

    // Newsletter-only signups (KetoDial keto/low-carb, held pescatarian): no drip
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
}

// ===== FEEDBACK HANDLER =====
async function handleFeedback(request, env) {
  try {
    const { request_text, email } = await request.json();

    if (!email || !isValidEmail(email)) {
      return createErrorResponse('INVALID_EMAIL', 'A valid email is required', 400);
    }
    if (!request_text || request_text.trim().length < 10) {
      return createErrorResponse('INVALID_FEEDBACK', 'Feedback must be at least 10 characters', 400);
    }
    if (request_text.length > 1000) {
      return createErrorResponse('FEEDBACK_TOO_LONG', 'Feedback must be under 1000 characters', 400);
    }

    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/content_feedback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          request_text: request_text.trim(),
          email: email || null,
          fingerprint: null,
          ip_address: request.headers.get('CF-Connecting-IP') || null,
        }),
      }
    );

    if (response.ok || response.status === 201) {
      // Notify Brew via Resend so feedback doesn't just sit in the DB unseen
      if (env.RESEND_API_KEY) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
              to: ['iambrew@gmail.com'],
              ...(email ? { reply_to: email } : {}),
              subject: 'New site feedback',
              html: `
                <h2>New feedback submission</h2>
                <p><strong>From:</strong> ${email || '(no email provided)'}</p>
                <p><strong>Message:</strong><br>${request_text.trim().replace(/\n/g, '<br>')}</p>
              `,
            }),
          });
        } catch (notifyErr) {
          console.error('[Feedback] Resend notification failed:', notifyErr);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const errorText = await response.text();
    console.error('Supabase feedback error:', response.status, errorText);
    return createErrorResponse('FEEDBACK_FAILED', 'Failed to save feedback', 500);
  } catch (err) {
    return createErrorResponse('FEEDBACK_ERROR', String(err), 500);
  }
}

// ===== DRIP SURVEY (anonymous journey check-ins) =====
// Questions are config rows in drip_survey_questions; responses are anonymous
// (fingerprint + IP for dedup only, never identity). See journey-checkin.html.

const DRIP_SURVEY_SITES = ['cw', 'kd'];

function dripSurveyHeaders(env, minimal = false) {
  return {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...(minimal ? { 'Prefer': 'return=minimal' } : {}),
  };
}

// Shared aggregate builder: all active questions for (site, day) with vote counts.
async function buildDripSurveyPayload(env, site, day) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const filter = `site=eq.${site}&day=eq.${day}`;

  const rowsRes = await fetch(
    `${base}/v_drip_survey_results?${filter}&order=q_order.asc,display_order.asc`,
    { headers: dripSurveyHeaders(env) }
  );
  if (!rowsRes.ok) throw new Error(`survey results query failed: ${rowsRes.status}`);
  const rows = await rowsRes.json();
  if (!rows.length) return null;

  // Respondents = distinct fingerprints for the day (small table; fine to count in JS).
  const fpRes = await fetch(
    `${base}/drip_survey_responses?${filter}&select=fingerprint&limit=10000`,
    { headers: dripSurveyHeaders(env) }
  );
  const fps = fpRes.ok ? await fpRes.json() : [];
  const totalRespondents = new Set(fps.map((r) => r.fingerprint)).size;

  const questionRes = await fetch(
    `${base}/drip_survey_questions?${filter}&active=eq.true&select=question_key,intro_text&order=display_order.asc`,
    { headers: dripSurveyHeaders(env) }
  );
  const questionMeta = questionRes.ok ? await questionRes.json() : [];
  const activeKeys = new Set(questionMeta.map((q) => q.question_key));
  const intro = (questionMeta.find((q) => q.intro_text) || {}).intro_text || null;

  const questions = [];
  for (const row of rows) {
    if (!activeKeys.has(row.question_key)) continue;
    let q = questions.find((x) => x.key === row.question_key);
    if (!q) {
      q = { key: row.question_key, text: row.question_text, type: row.question_type, options: [] };
      questions.push(q);
    }
    q.options.push({ id: row.option_id, text: row.option_text, votes: Number(row.votes) });
  }
  for (const q of questions) {
    const total = q.options.reduce((s, o) => s + o.votes, 0);
    for (const o of q.options) o.pct = total ? Math.round((o.votes / total) * 100) : 0;
  }

  return { intro, total_respondents: totalRespondents, questions };
}

// Day 0 is the unsubscribe exit survey (added 2026-08-30); real drip check-ins
// are days 1-28. Note day 0 is falsy, so callers must test `day === null`,
// never `!day`.
function parseDripSurveyDay(raw) {
  const day = parseInt(raw, 10);
  return Number.isInteger(day) && day >= 0 && day <= 28 ? day : null;
}

async function handleDripSurveyGet(url, env) {
  try {
    const day = parseDripSurveyDay(url.searchParams.get('day') || '1');
    const site = (url.searchParams.get('site') || 'cw').toLowerCase();
    if (day === null) return createErrorResponse('INVALID_DAY', 'day must be 0-28', 400);
    if (!DRIP_SURVEY_SITES.includes(site)) return createErrorResponse('INVALID_SITE', 'Unknown site', 400);

    const payload = await buildDripSurveyPayload(env, site, day);
    if (!payload) return createErrorResponse('NO_QUESTION', 'No question for this day', 404);
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DripSurvey] GET failed:', err);
    return createErrorResponse('SURVEY_ERROR', 'Failed to load question', 500);
  }
}

// Lightweight page-view ping so the click→view→submit funnel lives in one store.
// Fired by journey-checkin.html after the question loads (JS-gated, so most bots skip it).
async function handleDripSurveyView(request, env) {
  try {
    const body = await request.json();
    const site = String(body.site || 'cw').toLowerCase();
    const day = parseDripSurveyDay(body.day);
    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.slice(0, 128) : '';
    const source = ['drip', 'calculator', 'blog', 'unsubscribe'].includes(body.source) ? body.source : 'drip';
    if (!DRIP_SURVEY_SITES.includes(site) || day === null || !fingerprint) {
      return createErrorResponse('INVALID_VIEW', 'Bad view ping', 400);
    }
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (!checkRateLimit(`drip-survey-view:${ip || fingerprint}`, 60)) {
      return createErrorResponse('RATE_LIMIT', 'Too many requests', 429);
    }
    await fetch(`${env.SUPABASE_URL}/rest/v1/drip_survey_views`, {
      method: 'POST',
      headers: dripSurveyHeaders(env, true),
      body: JSON.stringify({ site, day, source, fingerprint }),
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Views are best-effort; never let a ping failure surface to the page.
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Resolve a check-in token to the subscriber it belongs to. SERVER SIDE ONLY.
 *
 * THE TOKEN IS NOT A CREDENTIAL. It exists so an answer can be attributed to the
 * person we mailed the link to, and for nothing else. It must never gate a read of
 * weight, health conditions, medications, energy/hunger/mood history, an email
 * address or any trend: a check-in link gets forwarded, quoted in replies and left
 * in shared mailboxes, and whoever receives it must gain nothing by having it.
 * That is why this returns the id and the site and deliberately selects no other
 * column, and why nothing in the GET path accepts a token at all.
 *
 * Returns null on anything unexpected. Every caller falls back to anonymous rather
 * than failing the submission: a reader whose token is stale, mangled by a mail
 * client, or simply absent still gets to answer and still gets their payback.
 */
async function resolveCheckinToken(env, token, site) {
  if (typeof token !== 'string') return null;
  const clean = token.trim();
  // Shape check before it reaches the database: 64 hex chars, as minted by
  // encode(gen_random_bytes(32), 'hex'). Also keeps junk out of the query string.
  if (!/^[a-f0-9]{64}$/i.test(clean)) return null;
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/drip_subscribers` +
        `?checkin_token=eq.${encodeURIComponent(clean)}&select=id,site`,
      { headers: dripSurveyHeaders(env) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length !== 1) return null;
    // Cross-site guard: a CW token presented on a KD day links nothing. The same
    // person can hold a row on both sites, and attributing a KD answer to their CW
    // subscription would silently corrupt every longitudinal series built on it.
    if (site && rows[0].site !== site) return null;
    return rows[0];
  } catch {
    return null;
  }
}

/**
 * ITEM 3A: THE GOAL-MAGNITUDE PAYBACK.
 *
 * The reader taps one band saying how much they hope to lose. We already hold their
 * weight, sex, age, height and activity, so the one thing we cannot know is the
 * magnitude -- and the one thing they cannot work out is how long that takes at their
 * own numbers. So they supply the magnitude and we return the horizon. Asking for a
 * target DATE instead would mean asking the reader to guess the thing we are better
 * placed to compute, and then correcting them.
 *
 * NO SECOND FORMULA. Every calorie number comes from calculateMacros(), the same
 * function the calculator and the paid report use, reached through the same
 * checkTargetEligibility() gate. If that gate refuses, this refuses. The only maths
 * added here is turning an energy deficit into elapsed time.
 *
 * SUPPRESS, NEVER SUBSTITUTE. Every path that cannot honestly produce a number
 * returns a reason instead of a gentler estimate.
 */

// Pounds. All 413 calculator sessions to date are in lbs, so no unit logic.
// Ordered to match drip_survey_options.display_order for the goal_target question,
// which is how an option id resolves to a band. Keep the two in step.
const GOAL_MAGNITUDE_BANDS = [
  { key: 'up_to_15', order: 1, lbs: 10, openEnded: false },
  { key: '15_to_30', order: 2, lbs: 22, openEnded: false },
  { key: '30_to_50', order: 3, lbs: 40, openEnded: false },
  { key: '50_to_80', order: 4, lbs: 65, openEnded: false },
  { key: 'over_80',  order: 5, lbs: 80, openEnded: true  },
];

const HORIZON_BASIS_VERSION = 'goal-horizon-v1';
const KCAL_PER_LB = 3500;
// The linear 3500 kcal/lb rule is the optimistic bound: it ignores the fall in
// maintenance as weight comes off, and it assumes perfect adherence. Neither holds,
// so the slow bound applies a 0.75 efficiency haircut and the pair is reported as a
// RANGE. A single date would be a promise we have no business making.
const SLOW_EFFICIENCY = 0.75;
// Past this, a week count stops being a plan and starts being a discouragement. The
// numbers are still returned; the flag lets the writers choose the framing.
const LONG_HORIZON_WEEKS = 104;

function bandForOptionOrder(order) {
  return GOAL_MAGNITUDE_BANDS.find((b) => b.order === order) || null;
}

const suppressed = (reason, extra = {}) => ({
  basis_version: HORIZON_BASIS_VERSION,
  has_calculator_context: false,
  estimate_available: false,
  suppression_reason: reason,
  ...extra,
});

/**
 * Look up the calculator row behind a subscriber. CASE-INSENSITIVE ON PURPOSE:
 * drip_subscribers is lowercased on insert, calculator_sessions_v2 stores the address
 * as the reader typed it, and 9 rows carry uppercase. An exact-equality join matches
 * 0 of those 9. Verified in production 2026-09-12.
 *
 * Returns the fields calculateMacros needs and NOTHING else. The caller is reached by
 * a check-in token, and a token must never become a way to read somebody's profile.
 */
async function calculatorContextForSubscriber(env, subscriberId) {
  const subRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/drip_subscribers?id=eq.${encodeURIComponent(subscriberId)}&select=email,site`,
    { headers: dripSurveyHeaders(env) }
  );
  if (!subRes.ok) return null;
  const subs = await subRes.json();
  if (!Array.isArray(subs) || subs.length !== 1) return null;

  // PostgREST ilike treats * as a wildcard, and % and _ are SQL wildcards. An address
  // containing one must not be able to widen the match to somebody else's row, so any
  // address carrying a pattern metacharacter falls back to exact equality rather than
  // matching loosely. Losing a row is acceptable; matching the wrong person is not.
  const email = subs[0].email || '';
  const safeForIlike = !/[%_*]/.test(email);
  const filter = safeForIlike
    ? `email=ilike.${encodeURIComponent(email)}`
    : `email=eq.${encodeURIComponent(email)}`;

  const calcRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?${filter}` +
      '&select=weight_value,height_feet,height_inches,height_cm,age,sex,goal,diet_type,' +
      'lifestyle_activity,exercise_frequency,deficit_percentage,created_at' +
      '&order=created_at.desc&limit=1',
    { headers: dripSurveyHeaders(env) }
  );
  if (!calcRes.ok) return null;
  const rows = await calcRes.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/**
 * Derive the horizon for one subscriber and one band.
 *
 * Returns STRUCTURED DATA, never prose. Templates and writers decide how to say it;
 * this decides only what is true. No guarantee language, no outcome claim, no date.
 */
async function computeGoalHorizon(env, subscriberId, optionOrder) {
  const band = bandForOptionOrder(optionOrder);
  if (!band) return suppressed('unknown_goal_band');

  const base = {
    basis_version: HORIZON_BASIS_VERSION,
    goal_band: band.key,
    goal_band_lbs: band.lbs,
    goal_band_open_ended: band.openEnded,
  };

  const calc = subscriberId ? await calculatorContextForSubscriber(env, subscriberId) : null;
  // ~7% of subscribers (homepage and Etsy-bonus signups) have no calculator row. They
  // are NOT asked to recreate the calculator inside an email; they simply get no
  // estimate, and the writers handle that state.
  if (!calc) return { ...base, ...suppressed('no_calculator_context') };

  const formData = {
    weight: Number(calc.weight_value),
    heightFeet: calc.height_feet,
    heightInches: calc.height_inches,
    heightCm: calc.height_cm,
    age: Number(calc.age),
    sex: calc.sex,
    goal: calc.goal,
    diet: calc.diet_type,
    lifestyle: calc.lifestyle_activity,
    exercise: calc.exercise_frequency,
    deficit: calc.deficit_percentage,
  };

  if (!Number.isFinite(formData.weight) || formData.weight <= 0 || !calc.sex) {
    return { ...base, ...suppressed('incomplete_calculator_context'), has_calculator_context: true };
  }
  // A horizon to a LOWER weight only means something for someone losing weight.
  if (String(calc.goal || '').toLowerCase() !== 'lose') {
    return { ...base, ...suppressed('goal_is_not_weight_loss'), has_calculator_context: true };
  }

  // The canonical gate. Under-18 and suppressed-target both refuse here, using the
  // same rule the payment boundary and report generation use.
  const ineligible = checkTargetEligibility(formData);
  if (ineligible) {
    return {
      ...base,
      ...suppressed(ineligible.code === 'UNDER_18_NOT_SUPPORTED'
        ? 'under_18_not_supported'
        : (ineligible.validation && ineligible.validation.reason) || 'calorie_target_suppressed'),
      has_calculator_context: true,
    };
  }

  const macros = calculateMacros(formData);
  const dailyDeficit = Math.round(macros.tdee - macros.calories);
  if (!Number.isFinite(dailyDeficit) || dailyDeficit <= 0) {
    return { ...base, ...suppressed('no_effective_deficit'), has_calculator_context: true };
  }

  const weeksFast = (band.lbs * KCAL_PER_LB) / (dailyDeficit * 7);
  const weeksSlow = weeksFast / SLOW_EFFICIENCY;
  const minWeeks = Math.round(weeksFast);
  const maxWeeks = Math.round(weeksSlow);

  return {
    ...base,
    has_calculator_context: true,
    estimate_available: true,
    suppression_reason: null,
    min_weeks: minWeeks,
    max_weeks: maxWeeks,
    min_months: Math.round((minWeeks / 4.345) * 10) / 10,
    max_months: Math.round((maxWeeks / 4.345) * 10) / 10,
    // The deficit ACTUALLY used, which is not always the one they picked: the
    // self-service floor caps it, and effectiveDeficitPct is what survived.
    daily_deficit_kcal: dailyDeficit,
    requested_deficit_pct: macros.requestedDeficitPct,
    effective_deficit_pct: macros.effectiveDeficitPct,
    floor_applied: macros.floorApplied,
    self_service_floor: macros.selfServiceFloor,
    // Flags, not prose. The writers decide how a two-year horizon is framed.
    long_horizon: maxWeeks > LONG_HORIZON_WEEKS,
    open_ended_band: band.openEnded,
  };
}

async function handleDripSurveySubmit(request, env) {
  try {
    const body = await request.json();
    const site = String(body.site || 'cw').toLowerCase();
    const day = parseDripSurveyDay(body.day);
    const optionIds = Array.isArray(body.option_ids) ? body.option_ids : [];
    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.slice(0, 128) : '';
    const source = ['drip', 'calculator', 'blog', 'unsubscribe'].includes(body.source) ? body.source : 'drip';

    // Honeypot: bots fill the hidden "website" field. Pretend success, store nothing.
    if (body.website) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!DRIP_SURVEY_SITES.includes(site)) return createErrorResponse('INVALID_SITE', 'Unknown site', 400);
    if (day === null) return createErrorResponse('INVALID_DAY', 'day must be 0-28', 400);
    if (!fingerprint) return createErrorResponse('INVALID_FINGERPRINT', 'fingerprint required', 400);
    if (!optionIds.length || optionIds.length > 30 || optionIds.some((id) => typeof id !== 'string')) {
      return createErrorResponse('INVALID_OPTIONS', 'Select at least one answer', 400);
    }

    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (!checkRateLimit(`drip-survey:${ip || fingerprint}`, 20)) {
      return createErrorResponse('RATE_LIMIT', 'Too many submissions, try again later', 429);
    }

    const base = `${env.SUPABASE_URL}/rest/v1`;
    const filter = `site=eq.${site}&day=eq.${day}`;

    // Validate every option belongs to an ACTIVE question on this (site, day),
    // and enforce max one selection for single-choice questions.
    const qRes = await fetch(
      `${base}/drip_survey_questions?${filter}&active=eq.true&select=id,question_type,question_key`,
      { headers: dripSurveyHeaders(env) }
    );
    if (!qRes.ok) throw new Error(`questions query failed: ${qRes.status}`);
    const activeQuestions = await qRes.json();
    if (!activeQuestions.length) return createErrorResponse('NO_QUESTION', 'No question for this day', 404);

    const qIds = activeQuestions.map((q) => q.id);
    const oRes = await fetch(
      `${base}/drip_survey_options?question_id=in.(${qIds.join(',')})&select=id,question_id,display_order`,
      { headers: dripSurveyHeaders(env) }
    );
    if (!oRes.ok) throw new Error(`options query failed: ${oRes.status}`);
    const optionRows = await oRes.json();
    const validOptions = new Map(optionRows.map((o) => [o.id, o.question_id]));
    // display_order is how an option id maps to a GOAL_MAGNITUDE_BANDS entry.
    const optionOrderById = new Map(optionRows.map((o) => [o.id, o.display_order]));
    const typeByQuestion = new Map(activeQuestions.map((q) => [q.id, q.question_type]));

    const picksPerQuestion = new Map();
    for (const id of optionIds) {
      const questionId = validOptions.get(id);
      if (!questionId) return createErrorResponse('INVALID_OPTIONS', 'Unknown answer option', 400);
      picksPerQuestion.set(questionId, (picksPerQuestion.get(questionId) || 0) + 1);
    }
    for (const [questionId, count] of picksPerQuestion) {
      if (typeByQuestion.get(questionId) === 'single' && count > 1) {
        return createErrorResponse('INVALID_OPTIONS', 'Pick one answer for that question', 400);
      }
    }

    // Identity, resolved server side. The token never reaches the response row and
    // never leaves this function; only the id it resolves to is stored. Unknown,
    // malformed, absent or cross-site tokens resolve to null and the answer is
    // recorded anonymously, exactly as it was before identity existed.
    const subscriber = await resolveCheckinToken(env, body.token, site);
    const subscriberId = subscriber ? subscriber.id : null;
    const answeredVia = subscriberId
      ? (body.answered_via === 'one_tap' ? 'one_tap' : 'page')
      : null;

    // Re-answer replaces. Two scopes, deliberately:
    //   - fingerprint: the pre-existing behaviour, unchanged, and the only path that
    //     can ever touch an anonymous row. Historical rows are never rewritten into
    //     an identity; they are only replaced if that same browser answers again,
    //     which is what it already did before this change.
    //   - subscriber_id: so answering again from a different device replaces rather
    //     than duplicates. Matches only rows this subscriber already owns, so it can
    //     never reach somebody else's answer or an anonymous one.
    await fetch(
      `${base}/drip_survey_responses?${filter}&fingerprint=eq.${encodeURIComponent(fingerprint)}`,
      { method: 'DELETE', headers: dripSurveyHeaders(env, true) }
    );
    if (subscriberId) {
      await fetch(
        `${base}/drip_survey_responses?${filter}&subscriber_id=eq.${encodeURIComponent(subscriberId)}`,
        { method: 'DELETE', headers: dripSurveyHeaders(env, true) }
      );
    }

    const rows = optionIds.map((id) => ({
      question_id: validOptions.get(id),
      option_id: id,
      site, day, source, fingerprint,
      ip_address: ip || null,
      subscriber_id: subscriberId,
      answered_via: answeredVia,
    }));
    const insRes = await fetch(`${base}/drip_survey_responses`, {
      method: 'POST',
      headers: dripSurveyHeaders(env, true),
      body: JSON.stringify(rows),
    });
    if (!insRes.ok && insRes.status !== 201) {
      const errText = await insRes.text();
      // 23505 on the identified partial index means this subscriber already has
      // exactly this answer: a double tap, or a mail client prefetching the link
      // while the reader also clicks it. The recorded state is already what the
      // caller asked for, so this is success, not failure. Reporting an error here
      // would show a reader a scary message for having been slightly too quick.
      if (insRes.status === 409 || errText.includes('23505')) {
        console.log('[DripSurvey] duplicate submission absorbed (idempotent)');
      } else {
        console.error('[DripSurvey] insert failed:', insRes.status, errText);
        return createErrorResponse('SURVEY_FAILED', 'Failed to save answer', 500);
      }
    }

    const payload = await buildDripSurveyPayload(env, site, day);

    // Item 3A payback. Only when this submission actually answered goal_target AND a
    // token resolved: the horizon is derived from the subscriber's own calculator row,
    // so there is nothing to compute for an anonymous answer. Deliberately part of the
    // POST response rather than a new endpoint -- a GET that returned this would be a
    // token-gated read of derived personal data, which is the thing we ruled out.
    let goalHorizon;
    if (subscriberId) {
      const goalQ = activeQuestions.find((q) => q.question_key === 'goal_target');
      if (goalQ) {
        const picked = optionIds.find((id) => validOptions.get(id) === goalQ.id);
        if (picked) {
          try {
            goalHorizon = await computeGoalHorizon(env, subscriberId, optionOrderById.get(picked));
          } catch (e) {
            // A payback failure must never cost the reader their answer, which is
            // already saved. They get the confirmation without the estimate.
            console.error('[DripSurvey] goal horizon failed:', e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...payload, ...(goalHorizon ? { goal_horizon: goalHorizon } : {}) }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DripSurvey] POST failed:', err);
    return createErrorResponse('SURVEY_ERROR', 'Failed to save answer', 500);
  }
}

// ===== REFUND REQUEST =====
const REFUND_SECTION_RATINGS = ['helpful', 'not_helpful', 'didnt_use'];
const REFUND_SECTION_LABELS = {
  helpful: 'Helpful',
  not_helpful: 'Not helpful',
  didnt_use: "Didn't use it",
};

// Per-product refund config so both sites share one endpoint. Sections map to the
// meal_plan_feedback / doctor_script_feedback / adaptation_guide_feedback columns;
// a product that uses fewer sections leaves the rest null.
const REFUND_PRODUCTS = {
  calculator_report: {
    from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
    sections: [
      { field: 'meal_plan_feedback', label: '30-day meal plan' },
      { field: 'doctor_script_feedback', label: 'Doctor conversation script' },
      { field: 'adaptation_guide_feedback', label: 'Adaptation/plateau guide' },
    ],
  },
  ketodial_report: {
    from: 'KetoDial <ketodial@carnivoreweekly.com>',
    sections: [
      { field: 'meal_plan_feedback', label: '7-day meal plan' },
      { field: 'doctor_script_feedback', label: "Doctor's report" },
    ],
  },
};

async function handleRefundRequest(request, env) {
  try {
    const {
      email, product, reason_category, reason_text,
      overall_rating, meal_plan_feedback, doctor_script_feedback, adaptation_guide_feedback,
      technical_notes, additional_notes,
    } = await request.json();

    if (!email || !isValidEmail(email)) {
      return createErrorResponse('INVALID_EMAIL', 'A valid email is required', 400);
    }

    const VALID_CATEGORIES = ['not_as_described', 'technical_issue', 'no_longer_needed', 'duplicate_charge', 'other'];
    if (!VALID_CATEGORIES.includes(reason_category)) {
      return createErrorResponse('INVALID_CATEGORY', 'Invalid reason category', 400);
    }

    if (!reason_text || reason_text.trim().length < 10) {
      return createErrorResponse('INVALID_REASON', 'Please tell us a bit more (10 characters minimum)', 400);
    }
    if (reason_text.length > 1000) {
      return createErrorResponse('REASON_TOO_LONG', 'Reason must be under 1000 characters', 400);
    }

    const rating = parseInt(overall_rating, 10);
    if (!rating || rating < 1 || rating > 5) {
      return createErrorResponse('INVALID_RATING', 'Please rate the overall quality 1-5', 400);
    }

    const productConfig = REFUND_PRODUCTS[product] || REFUND_PRODUCTS.calculator_report;
    const sectionValues = { meal_plan_feedback, doctor_script_feedback, adaptation_guide_feedback };
    for (const { field } of productConfig.sections) {
      if (!REFUND_SECTION_RATINGS.includes(sectionValues[field])) {
        return createErrorResponse('INVALID_SECTION_FEEDBACK', `Missing or invalid ${field}`, 400);
      }
    }

    if (technical_notes && technical_notes.length > 1000) {
      return createErrorResponse('TECHNICAL_NOTES_TOO_LONG', 'Technical notes must be under 1000 characters', 400);
    }
    if (additional_notes && additional_notes.length > 1000) {
      return createErrorResponse('ADDITIONAL_NOTES_TOO_LONG', 'Additional notes must be under 1000 characters', 400);
    }

    const insertResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/refund_requests`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          email: email.trim(),
          product: product || 'calculator_report',
          reason_category,
          reason_text: reason_text.trim(),
          overall_rating: rating,
          meal_plan_feedback: meal_plan_feedback || null,
          doctor_script_feedback: doctor_script_feedback || null,
          adaptation_guide_feedback: adaptation_guide_feedback || null,
          technical_notes: technical_notes ? technical_notes.trim() : null,
          additional_notes: additional_notes ? additional_notes.trim() : null,
          fingerprint: null,
          ip_address: request.headers.get('CF-Connecting-IP') || null,
        }),
      }
    );

    if (!insertResponse.ok && insertResponse.status !== 201) {
      const errorText = await insertResponse.text();
      console.error('Supabase refund_requests error:', insertResponse.status, errorText);
      return createErrorResponse('REFUND_REQUEST_FAILED', 'Failed to save refund request', 500);
    }

    // Notify Brew via Resend so requests don't just sit in the DB
    if (env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: productConfig.from,
            to: ['iambrew@gmail.com'],
            reply_to: email.trim(),
            subject: `Refund request (${rating}/5): ${reason_category.replace(/_/g, ' ')}`,
            html: `
              <h2>New refund request</h2>
              <p><strong>Product:</strong> ${product || 'calculator_report'}</p>
              <p><strong>Buyer email:</strong> ${email.trim()}</p>
              <p><strong>Reason category:</strong> ${reason_category.replace(/_/g, ' ')}</p>
              <p><strong>Overall quality rating:</strong> ${rating}/5</p>
              <ul>
                ${productConfig.sections.map(s => `<li><strong>${s.label}:</strong> ${REFUND_SECTION_LABELS[sectionValues[s.field]]}</li>`).join('\n                ')}
              </ul>
              <p><strong>What would have made it worth keeping:</strong><br>${reason_text.trim().replace(/\n/g, '<br>')}</p>
              ${technical_notes ? `<p><strong>Technical issues:</strong><br>${technical_notes.trim().replace(/\n/g, '<br>')}</p>` : ''}
              ${additional_notes ? `<p><strong>Anything else:</strong><br>${additional_notes.trim().replace(/\n/g, '<br>')}</p>` : ''}
              <p style="color:#777;font-size:13px;">Reply-to is set to the buyer's email. Refund manually via the Stripe dashboard.</p>
            `,
          }),
        });
      } catch (notifyErr) {
        console.error('[Refund Request] Resend notification failed:', notifyErr);
      }
    }

    return createSuccessResponse({ success: true });
  } catch (err) {
    return createErrorResponse('REFUND_REQUEST_ERROR', String(err), 500);
  }
}

// ===== STRIPE WEBHOOK HANDLER =====
// ===== ON-SITE SHOP (sell Etsy PDFs direct via Stripe Payment Links) =====
// Files live under an unguessable tokenized path; Resend fetches them as
// attachments at send time. Upsell map: one soft suggestion per product.
const SHOP_DL_BASE = 'https://carnivoreweekly.com/downloads/dl-c8596006aead02d8';
const SHOP_PRODUCTS = {
  'carnivore-cheatsheet': {
    name: 'Carnivore Food Cheat Sheet',
    files: [{ filename: 'Carnivore-Food-Cheat-Sheet.pdf', path: `${SHOP_DL_BASE}/cheatsheet-carnivore-v1.pdf` }],
    upsell: `<p>One thing readers often pair with the cheat sheet: the <a href="https://carnivoreweekly.com/shop.html?utm_source=delivery&utm_medium=email&utm_campaign=post-purchase&utm_content=carnivore-cheatsheet">How To Carnivore Guide with the 14-Day Tracker</a>. The cheat sheet tells you what to eat, the tracker keeps you honest for the first two weeks.</p>`,
  },
  'howto-carnivore': {
    name: 'How To Carnivore Guide + 14-Day Tracker',
    files: [{ filename: 'How-To-Carnivore-Guide-and-Tracker.pdf', path: `${SHOP_DL_BASE}/howto-carnivore-v1.pdf` }],
    upsell: `<p>Since you're starting a structured run at this: we're opening <a href="https://carnivoreweekly.com/coach.html?utm_source=delivery&utm_medium=email&utm_campaign=post-purchase&utm_content=howto-carnivore">Carnivore Coach</a> this fall, a 12-week guided program with weekly check-ins. Reserving a founding spot is free if you want first access.</p>`,
  },
  'howto-lion': {
    name: 'How To Lion Diet Guide + 14-Day Tracker',
    files: [{ filename: 'How-To-Lion-Diet-Guide-and-Tracker.pdf', path: `${SHOP_DL_BASE}/howto-lion-v1.pdf` }],
    upsell: `<p>Elimination runs go better with support: we're opening <a href="https://carnivoreweekly.com/coach.html?utm_source=delivery&utm_medium=email&utm_campaign=post-purchase&utm_content=howto-lion">Carnivore Coach</a> this fall, a 12-week guided program with weekly check-ins. Reserving a founding spot is free.</p>`,
  },
  'anti-inflammatory-set': {
    name: 'Anti-Inflammatory Starter Set',
    files: [
      { filename: 'Anti-Inflammatory-Food-Guide.pdf', path: `${SHOP_DL_BASE}/anti-inflammatory-food-guide.pdf` },
      { filename: 'Anti-Inflammatory-Grocery-List.pdf', path: `${SHOP_DL_BASE}/anti-inflammatory-grocery-list.pdf` },
      { filename: 'Anti-Inflammatory-Getting-Started.pdf', path: `${SHOP_DL_BASE}/anti-inflammatory-getting-started.pdf` },
    ],
    upsell: `<p>If inflammation is the reason you're here, you might like <a href="https://carnivoreweekly.com/coach.html?utm_source=delivery&utm_medium=email&utm_campaign=post-purchase&utm_content=anti-inflammatory-set">Carnivore Coach</a>, our 12-week guided program opening this fall. Weekly check-ins track joint pain and energy, not just weight. Founding spots are free to reserve.</p>`,
  },
  'doctor-prep-kit': {
    name: 'Doctor Visit Prep Kit (Low-Carb Edition)',
    files: [{ filename: 'Doctor-Visit-Prep-Kit.pdf', path: `${SHOP_DL_BASE}/doctor-prep-kit-v1.pdf` }],
    upsell: `<p>If your doctor asks you to monitor at home, the <a href="https://carnivoreweekly.com/shop.html?utm_source=delivery&utm_medium=email&utm_campaign=post-purchase&utm_content=doctor-prep-kit">Share-With-Your-Doctor BP &amp; Glucose Log</a> pairs with this kit. It condenses four weeks of readings into the one page they'll actually read.</p>`,
  },
  'bp-glucose-log': {
    name: 'Share-With-Your-Doctor BP & Glucose Log',
    files: [{ filename: 'BP-Glucose-Doctor-Log.pdf', path: `${SHOP_DL_BASE}/bp-glucose-log-v1.pdf` }],
    upsell: `<p>Some people pair this log with the <a href="https://carnivoreweekly.com/shop.html?utm_source=delivery&utm_medium=email&utm_campaign=post-purchase&utm_content=bp-glucose-log">Doctor Visit Prep Kit</a>. The log collects your numbers, the kit gets the whole appointment organized around them.</p>`,
  },
};

async function fulfillShopOrder(env, obj, shopSlug) {
  const product = SHOP_PRODUCTS[shopSlug];
  const buyerEmail = obj.customer_details?.email || obj.customer_email;
  if (!buyerEmail) {
    console.error(`Shop order ${obj.id} (${shopSlug}) has no buyer email`);
    return createSuccessResponse({ received: true, error: 'no_email' });
  }

  const html = `<div style="font-family: Georgia, serif; font-size: 16px; color: #2c1810; line-height: 1.6; max-width: 560px;">
<p>Thanks for your order! Your <strong>${product.name}</strong> is attached to this email, ready to save or print.</p>
<p>A tip from Sarah, our health coach: print it and put it where the decisions happen. The fridge beats a folder every time.</p>
${product.upsell}
<p>If anything's wrong with your order, just reply to this email and a real person will sort it out.</p>
<p>Enjoy,<br>The Carnivore Weekly Team</p>
</div>`;

  let delivered = false;
  let sendError = '';
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
        to: [buyerEmail],
        reply_to: 'newsletter@carnivoreweekly.com',
        subject: `Your ${product.name} is here`,
        html,
        attachments: product.files,
        tags: [
          { name: 'email_type', value: 'shop_delivery' },
          { name: 'product', value: shopSlug },
        ],
      }),
    });
    delivered = emailRes.ok;
    if (!emailRes.ok) sendError = await emailRes.text();
  } catch (e) {
    sendError = String(e);
  }

  // Paid-but-undelivered is the one unacceptable state — alert Brew immediately.
  if (!delivered && env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
          to: ['iambrew@gmail.com'],
          subject: `🚨 PAID BUT UNDELIVERED: ${shopSlug} for ${buyerEmail}`,
          html: `<p>Stripe checkout ${obj.id} completed (${(obj.amount_total || 0) / 100} ${(obj.currency || '').toUpperCase()}) but the delivery email failed:</p><pre>${sendError.slice(0, 300)}</pre><p>Send the PDF manually to ${buyerEmail}.</p>`,
        }),
      });
    } catch (_) { /* alert is best-effort */ }
  }

  // GA4 purchase event (fire-and-forget)
  if (env.GA4_API_SECRET && env.GA4_MEASUREMENT_ID) {
    fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: obj.id,
        events: [{
          name: 'purchase',
          params: {
            transaction_id: obj.id,
            value: (obj.amount_total || 0) / 100,
            currency: obj.currency?.toUpperCase() || 'USD',
            items: [{ item_id: shopSlug, item_name: product.name, price: (obj.amount_total || 0) / 100, quantity: 1 }],
            source: 'shop_webhook',
          },
        }],
      }),
    }).catch(() => {});
  }

  console.log(`Shop order fulfilled: ${shopSlug} -> ${buyerEmail} (delivered: ${delivered})`);
  return createSuccessResponse({ received: true, shop_product: shopSlug, delivered });
}

/**
 * THE WAY BACK FOR A PAID BUYER.
 *
 * The report is generated AFTER Step 4, and that is correct: it is written from the
 * health profile, and the questionnaire asks for it after payment. So a webhook must
 * NOT generate a report. What it must do is make sure the customer can get back.
 *
 * Before this, they could not. The browser remembers a payment for six hours and then
 * deliberately clears it (a stale success screen used to strand repeat visitors), and
 * nothing was sent from the server, while the post-payment screen told them their
 * protocol was generating and to check their email for a download link. Both untrue.
 * Someone who paid and closed the tab had no route back to an assessment they owned.
 *
 * The link is the SAME url Stripe already redirects to, carrying the assessment UUID
 * the checkout was created with. Nothing new to resolve, nothing new to trust: the
 * existing url-parameter path restores the paid session and drops them at Step 4.
 *
 * IDEMPOTENCY AND RETRY SAFETY, which pull in opposite directions.
 *   - Stripe retries and duplicates must not send a second copy.
 *   - A transient Resend failure must NOT be permanently swallowed by the fact that
 *     the Stripe event was already recorded as processed.
 * So the send is keyed on its OWN marker, not on the event row. The event row means
 * "we have seen this event"; the marker means "this customer has their link". They are
 * different facts and conflating them loses the email. The marker is written only
 * after Resend accepts, so a failure leaves it absent and the next delivery of the
 * same event (which arrives on the duplicate path) tries again.
 *
 * The marker lives in stripe_webhook_events under a synthetic, self-describing id
 * rather than in a new column: the table already exists, already has UNIQUE
 * (stripe_event_id), and needed no migration on a production database with no staging.
 */
/**
 * CONFIRM THE ASSESSMENT IS PAID, and repair it if it is not.
 *
 * cw_assessment_sessions.payment_status is the authority: Step 4 refuses the paid flow
 * on it (403 PAYMENT_REQUIRED), and the resume link is worthless without it. The
 * webhook used to fire the PATCH and only log a failure, then carry on and record the
 * event as processed. A transient failure there left a real buyer holding a link to an
 * assessment the server still called pending, and the redelivery that could have fixed
 * it only retried the email.
 *
 * So the writeback is confirmed rather than assumed, on first delivery AND on every
 * duplicate, and the event is not acknowledged until it is.
 *
 * Two subtleties, both of which have bitten this codebase before:
 *   - PostgREST answers 200 to a PATCH that matched NOTHING. "The request succeeded"
 *     is not "the customer is paid", so the row is read back whenever the PATCH
 *     matches no rows.
 *   - Zero rows is the NORMAL case on a retry, because the filter only matches a
 *     pending row and the first delivery already completed it. Already completed is
 *     success, not an error.
 *
 * Returns { confirmed: true } or { failed: true, reason } — never a maybe.
 */
async function ensureAssessmentPaid(env, assessmentId, patchHeaders) {
  const base = `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions`;
  const id = encodeURIComponent(assessmentId);

  const patch = await fetch(`${base}?id=eq.${id}&payment_status=eq.pending`, {
    method: 'PATCH',
    headers: { ...patchHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify({ payment_status: 'completed', updated_at: new Date().toISOString() }),
  });
  if (!patch.ok) {
    const detail = await patch.text().catch(() => '');
    return { failed: true, reason: `assessment PATCH ${patch.status}: ${detail.slice(0, 200)}` };
  }

  const patched = await patch.json().catch(() => null);
  if (Array.isArray(patched) && patched.length > 0 && patched[0].payment_status === 'completed') {
    return { confirmed: true };
  }

  // Matched nothing. Read the row rather than guessing which reason it was.
  const read = await fetch(`${base}?id=eq.${id}&select=id,payment_status`, { headers: patchHeaders });
  if (!read.ok) return { failed: true, reason: `assessment read-back ${read.status}` };
  const rows = await read.json().catch(() => null);
  if (!Array.isArray(rows) || rows.length === 0) {
    // A paid checkout whose assessment row is gone. Retrying will not conjure it, but
    // acknowledging would file this customer under "handled" and nobody would look
    // again. Stripe keeps redelivering, which is the loudest alarm available here.
    return { failed: true, reason: `no assessment row for ${assessmentId}` };
  }
  const status = rows[0].payment_status;
  if (status === 'completed' || status === 'success') return { confirmed: true, already: true };
  return { failed: true, reason: `assessment is ${status}, not completed` };
}

const RESUME_LINK_BASE = 'https://carnivoreweekly.com/calculator.html';
const resumeEmailMarkerId = checkoutSessionId => `cw-resume-email:${checkoutSessionId}`;

function buildResumeLink(assessmentId) {
  return `${RESUME_LINK_BASE}?payment=success&session_id=${encodeURIComponent(assessmentId)}#payment-success`;
}

/**
 * Sarah (sarah-health-coach), 2026-09-09, used verbatim. It says the payment landed,
 * says one step is left and what the report is built from, and says the link keeps
 * working. It does NOT say a report exists, is being written, or will arrive by email,
 * because none of those are true when it is sent.
 */
const RESUME_EMAIL_SUBJECT = 'Your payment went through. One step left.';

function buildResumeEmailBody(resumeLink) {
  const paragraphs = [
    'Thanks, your payment went through.',
    'There\'s one short step left before your report can be built: the health profile. ' +
    'It asks about any conditions, medications and allergies, what you find hardest, and ' +
    'how you like to cook. Your report is written from those answers, so it can\'t be put ' +
    'together until you\'ve filled it in.',
    'Use this link to go back to your paid assessment:',
  ];
  const closing = [
    'The link works later too, so if now isn\'t a good time, come back when you have a few ' +
    'quiet minutes. Your answers so far are saved.',
    'If anything goes wrong, just reply to this email and I\'ll help.',
  ];

  const text = [...paragraphs, resumeLink, ...closing, 'Sarah', 'Carnivore Weekly'].join('\n\n');

  const html =
    '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Georgia,serif;' +
    'font-size:16px;line-height:1.6;color:#1a120b;max-width:560px;margin:0 auto;padding:24px;">' +
    paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('') +
    `<p style="margin:24px 0;"><a href="${resumeLink}" ` +
    'style="background:#8b4513;color:#ffffff;padding:14px 28px;border-radius:8px;' +
    'text-decoration:none;display:inline-block;font-weight:600;">Finish your health profile</a></p>' +
    `<p style="font-size:14px;word-break:break-all;color:#5c4433;">${escapeHTML(resumeLink)}</p>` +
    closing.map(p => `<p>${escapeHTML(p)}</p>`).join('') +
    '<p style="margin-top:24px;">Sarah<br>Carnivore Weekly</p>' +
    '</div>';

  return { text, html };
}

async function sendResumeEmailIfOwed(env, obj) {
  const assessmentId = obj?.client_reference_id || obj?.metadata?.assessment_session_id;
  // Not a Carnivore Weekly report checkout. KetoDial, coach and shop checkouts reach
  // this webhook too and carry no assessment reference.
  if (!assessmentId) return { skipped: 'not-a-cw-report-checkout' };

  // "Confirmed" means the money arrived. Stripe completes a Session for delayed and
  // asynchronous payment methods before it settles, and "your payment went through"
  // must not be sent for one of those.
  if (obj.payment_status !== 'paid') return { skipped: `payment_status=${obj.payment_status}` };

  const headers = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
  const markerId = resumeEmailMarkerId(obj.id);

  const markerCheck = await fetch(
    `${env.SUPABASE_URL}/rest/v1/stripe_webhook_events?stripe_event_id=eq.${encodeURIComponent(markerId)}&select=id`,
    { headers }
  );
  if (markerCheck.ok) {
    const rows = await markerCheck.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0) return { skipped: 'already-sent' };
  } else {
    // Cannot prove it has not been sent. Sending anyway risks a duplicate; the retry
    // path will pick it up when the database answers.
    return { failed: true, reason: `marker lookup failed (${markerCheck.status})` };
  }

  const sessionLookup = await fetch(
    `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=id,email`,
    { headers }
  );
  if (!sessionLookup.ok) return { failed: true, reason: `session lookup failed (${sessionLookup.status})` };
  const sessions = await sessionLookup.json().catch(() => []);
  if (!Array.isArray(sessions) || sessions.length === 0) {
    // No assessment to go back to. A link to a row that does not exist is worse than
    // no link, and this is not a transient condition, so do not hold up the webhook.
    console.warn(`[resume-email] no assessment row for ${assessmentId}; nothing to link to`);
    return { skipped: 'assessment-not-found' };
  }

  const to = obj.customer_email || obj.customer_details?.email || obj.metadata?.email || sessions[0].email;
  if (!to) return { skipped: 'no-buyer-email' };

  if (!env.RESEND_API_KEY) return { failed: true, reason: 'RESEND_API_KEY not configured' };

  const link = buildResumeLink(assessmentId);
  const { text, html } = buildResumeEmailBody(link);

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      // Deterministic, so a retry inside Resend's 24h window is the same message
      // rather than a second one. The database marker is the durable half.
      'Idempotency-Key': `cw-resume/${obj.id}`,
    },
    body: JSON.stringify({
      from: 'Carnivore Weekly <reports@carnivoreweekly.com>',
      to: [to],
      reply_to: 'sarah@carnivoreweekly.com',
      subject: RESUME_EMAIL_SUBJECT,
      html,
      text,
    }),
  });

  if (!send.ok) {
    const detail = await send.text().catch(() => '');
    console.error(`[resume-email] Resend rejected the send (${send.status}): ${detail.slice(0, 300)}`);
    // Retry only what retrying can fix. A 5xx, a rate limit or a network error is a bad
    // minute at the provider and deserves the whole retry machinery. A plain 4xx is a
    // rejection of THIS message, usually an address that will never accept mail, and
    // answering Stripe with a 500 for that buys nothing: it just retries a doomed send
    // for days and buries the real failures. Log it as owed and let the webhook finish.
    // Permanent means "this message will never be accepted": Resend's validation
    // errors for a malformed or undeliverable recipient. Everything else is worth
    // retrying, including the ones that look like our fault. A rotated key (401), an
    // unverified domain (403), a timeout (408) and a concurrent-idempotent-request
    // (409) are all fixable or transient, and treating them as permanent would strand
    // every buyer silently. Security review, 2026-09-09.
    const retryable = !(send.status === 400 || send.status === 422);
    if (!retryable) {
      console.error(`[resume-email] NOT retrying: ${send.status} is a rejection of this message, ` +
        `not a transient failure. Assessment ${assessmentId} has no resume link.`);
      return { skipped: `resend-rejected-${send.status}` };
    }
    return { failed: true, reason: `resend ${send.status}` };
  }

  // Only now. A marker written before the send would turn one bad minute at the email
  // provider into a customer who never hears from us again.
  const mark = await fetch(`${env.SUPABASE_URL}/rest/v1/stripe_webhook_events`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      stripe_event_id: markerId,
      event_type: 'cw_resume_email_sent',
      session_id: assessmentId,
      amount_cents: 0,
    }),
  });
  if (!mark.ok) {
    // The customer HAS their link. Do not fail the webhook over the bookkeeping, and
    // do not send again on a retry beyond what Resend's key already prevents.
    console.error(`[resume-email] sent to the customer but the marker did not save (${mark.status})`);
  }
  console.log(`[resume-email] sent for assessment ${assessmentId}`);
  return { sent: true };
}

async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return createErrorResponse('MISSING_SIGNATURE', 'Stripe signature required', 401);
  }

  const body = await request.text();

  // Parse Stripe signature header: t=timestamp,v1=hash
  const parts = {};
  for (const item of signature.split(',')) {
    const [key, value] = item.split('=');
    parts[key.trim()] = value.trim();
  }
  if (!parts.t || !parts.v1) {
    return createErrorResponse('INVALID_SIGNATURE', 'Malformed signature header', 401);
  }

  // Verify HMAC-SHA256 signature using Web Crypto API
  const signedPayload = `${parts.t}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (expectedSig !== parts.v1) {
    return createErrorResponse('SIGNATURE_MISMATCH', 'Invalid webhook signature', 401);
  }

  // Reject stale events (>5 minutes old)
  const tolerance = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(parts.t, 10)) > tolerance) {
    return createErrorResponse('STALE_EVENT', 'Webhook timestamp too old', 401);
  }

  const event = JSON.parse(body);

  const supportedEvents = ['checkout.session.completed', 'charge.refunded'];
  if (!supportedEvents.includes(event.type)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`Webhook: ${event.type} received`);

  const patchHeaders = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Dedup: check if this Stripe event was already processed
  const dedupCheck = await fetch(
    `${env.SUPABASE_URL}/rest/v1/stripe_webhook_events?stripe_event_id=eq.${event.id}&select=id`,
    { headers: patchHeaders }
  );
  const existing = await dedupCheck.json();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`Webhook: duplicate event ${event.id}, skipping`);
    // A duplicate is usually Stripe retrying something we did not answer cleanly. The
    // event row says we have SEEN this event; it does not say the customer got their
    // way back. If the resume email failed after the row was written, this is the only
    // place it can be retried, so it is attempted here before acknowledging. It is
    // keyed on its own marker, so a genuine duplicate sends nothing.
    if (event.type === 'checkout.session.completed') {
      const dupObj = event.data.object;
      const dupAssessment = dupObj.client_reference_id || dupObj.metadata?.assessment_session_id;
      // The event row proves we SAW this event, not that we finished it. The payment
      // writeback may be exactly what failed last time, so confirm it before anything
      // else and repair it if it is still pending: an email pointing at an assessment
      // the server calls unpaid sends the customer into a 403 at Step 4.
      // Deliberately the same condition the first delivery uses, which is "we have an
      // assessment reference", not "Stripe says paid". Gating the repair more tightly
      // than the original write is how a retry ends up refusing to fix the very row the
      // first delivery created: the two paths have to agree on what a payment is.
      if (dupAssessment) {
        const paid = await ensureAssessmentPaid(env, dupAssessment, patchHeaders);
        if (paid.failed) {
          console.error(`Webhook: assessment still not confirmed paid on retry of ${event.id}: ${paid.reason}`);
          return createErrorResponse('PAYMENT_WRITEBACK_UNCONFIRMED', 'Payment writeback not confirmed', 500);
        }
      }
      const retry = await sendResumeEmailIfOwed(env, dupObj);
      if (retry.failed) {
        console.error(`Webhook: resume email still owed for ${event.id}: ${retry.reason}`);
        return createErrorResponse('RESUME_EMAIL_FAILED', 'Resume email could not be sent', 500);
      }
    }
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Record this event as processed
  const obj = event.data.object;
  await fetch(`${env.SUPABASE_URL}/rest/v1/stripe_webhook_events`, {
    method: 'POST',
    headers: { ...patchHeaders, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      stripe_event_id: event.id,
      event_type: event.type,
      session_id: obj.client_reference_id || obj.metadata?.assessment_session_id || null,
      amount_cents: obj.amount_total || obj.amount_refunded || 0,
    }),
  });

  // ===== CHECKOUT COMPLETED =====
  if (event.type === 'checkout.session.completed') {
    const sessionUUID = obj.client_reference_id || obj.metadata?.assessment_session_id;
    const amountTotal = obj.amount_total;

    if (!sessionUUID) {
      // Shop purchase? Payment Links carry metadata.shop_product.
      const shopSlug = obj.metadata?.shop_product;
      if (shopSlug && SHOP_PRODUCTS[shopSlug]) {
        return await fulfillShopOrder(env, obj, shopSlug);
      }
      // Product filter: this Stripe account also receives KD report and coach
      // subscription checkouts, which never carry a CW session reference.
      // Not ours — acknowledge so Stripe doesn't retry.
      console.log('Skipping non-CW checkout.session.completed:', obj.id);
      return createSuccessResponse({ received: true, skipped: true });
    }

    // The funnel row in calculator_sessions_v2 has its OWN uuid — sessionUUID
    // here is the ASSESSMENT id, and patching v2 by it silently matched zero
    // rows for months (PostgREST returns 200 on empty PATCHes). Join on the
    // funnel session_token carried through checkout metadata; fall back to
    // the buyer's email for checkouts created before the token was added.
    const calcToken = obj.metadata?.calc_session_token;
    const buyerEmail = obj.customer_email || obj.metadata?.email;
    const calcFilter = calcToken
      ? `session_token=eq.${encodeURIComponent(calcToken)}`
      : (buyerEmail ? `email=eq.${encodeURIComponent(buyerEmail)}` : null);

    const [paidState, calcRes] = await Promise.all([
      // The authoritative writeback, confirmed rather than fired and hoped for.
      ensureAssessmentPaid(env, sessionUUID, patchHeaders),
      calcFilter
        ? fetch(`${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?${calcFilter}&payment_status=eq.pending`, {
            method: 'PATCH',
            headers: { ...patchHeaders, 'Prefer': 'return=representation' },
            body: JSON.stringify({
              // NOTE: is_premium deliberately NOT set — the premium_requires_payment
              // check constraint demands a tier_id and payment_tiers is empty;
              // payment_status='completed' is the source of truth for "paid"
              payment_status: 'completed',
              amount_paid_cents: amountTotal ?? null,
              stripe_payment_intent_id: typeof obj.payment_intent === 'string' ? obj.payment_intent : null,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          }).catch(err => {
            // Bookkeeping must not be able to abort fulfilment. A non-2xx was already
            // handled below; a THROWN fetch (DNS, socket) would have rejected the
            // Promise.all and taken the assessment result down with it.
            console.warn('Webhook: calculator_sessions_v2 PATCH threw:', String(err).slice(0, 200));
            return null;
          })
        : Promise.resolve(null),
    ]);

    // calculator_sessions_v2 is funnel bookkeeping. It is logged and never allowed to
    // hold up a customer's fulfilment, which is the opposite of the assessment row.
    let patchedCalcRows = [];
    if (!calcRes) {
      console.warn('Webhook: no session_token or email on checkout — calculator_sessions_v2 not synced');
    } else if (!calcRes.ok) {
      console.warn('Webhook: calculator_sessions_v2 PATCH failed:', await calcRes.text());
    } else {
      patchedCalcRows = await calcRes.json().catch(() => []);
      if (!Array.isArray(patchedCalcRows)) patchedCalcRows = [];
      if (patchedCalcRows.length === 0) {
        console.warn(`Webhook: calculator_sessions_v2 PATCH matched 0 rows (${calcFilter}) — payment recorded on assessment only`);
      }
    }

    // Nothing past this point may run on an unconfirmed payment: not the analytics
    // event, and above all not the email, which would hand the customer a link to an
    // assessment Step 4 will refuse. 5xx so Stripe redelivers, and the duplicate path
    // repairs it.
    if (paidState.failed) {
      console.error(`Webhook: payment writeback NOT confirmed for ${sessionUUID}: ${paidState.reason}`);
      return createErrorResponse('PAYMENT_WRITEBACK_UNCONFIRMED', 'Payment writeback not confirmed', 500);
    }

    // Server-side GA4 purchase event via Measurement Protocol (fire-and-forget)
    if (env.GA4_API_SECRET && env.GA4_MEASUREMENT_ID) {
      // ga_client_id lives on the funnel row we just patched (the old lookup
      // by assessment id could never find it)
      const clientId = patchedCalcRows[0]?.ga_client_id || sessionUUID;
      fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientId,
          events: [{
            name: 'purchase',
            params: {
              transaction_id: obj.id,
              value: (amountTotal || 0) / 100,
              currency: obj.currency?.toUpperCase() || 'USD',
              items: [{ item_id: 'carnivore-protocol', item_name: 'Personalized Carnivore Protocol', price: (amountTotal || 0) / 100, quantity: 1 }],
              source: 'stripe_webhook',
            },
          }],
        }),
      }).catch(err => console.warn('GA4 Measurement Protocol error:', err));
    }

    // THE WAY BACK. Not the report: the report is built from Step 4, which they have
    // not reached yet, and generating one from what we hold would be a report written
    // from half the questionnaire. This sends the link that lets them finish.
    //
    // Deliberately after the payment writeback and the GA4 event, both of which are
    // done and durable by now. If the send fails we answer 500 so Stripe retries, and
    // the retry arrives on the duplicate path above, which repeats only the email: the
    // payment record is untouched and the purchase is not counted twice.
    const resume = await sendResumeEmailIfOwed(env, obj);
    if (resume.failed) {
      console.error(`Webhook: resume email failed for ${sessionUUID}: ${resume.reason}`);
      return createErrorResponse('RESUME_EMAIL_FAILED', 'Resume email could not be sent', 500);
    }

    return new Response(JSON.stringify({
      received: true,
      session_id: sessionUUID,
      resume_email: resume.sent ? 'sent' : (resume.skipped || 'not-sent'),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ===== CHARGE REFUNDED =====
  if (event.type === 'charge.refunded') {
    const charge = obj;
    const paymentIntentId = charge.payment_intent;
    const amountRefunded = charge.amount_refunded;
    const isFullRefund = charge.refunded === true;

    console.log(`Webhook: charge.refunded — PI: ${paymentIntentId}, amount: ${amountRefunded}, full: ${isFullRefund}`);

    if (isFullRefund && paymentIntentId) {
      // Look up checkout session by payment_intent to find the original session UUID
      const piLookup = await fetch(
        `https://api.stripe.com/v1/checkout/sessions?payment_intent=${paymentIntentId}&limit=1`,
        { headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` } }
      );
      const piData = await piLookup.json();
      const checkoutSession = piData.data?.[0];
      const sessionUUID = checkoutSession?.client_reference_id;

      if (sessionUUID) {
        // Same join fix as checkout.session.completed: the v2 funnel row is
        // keyed by session_token (from checkout metadata) or email — never by
        // the assessment UUID
        const refundToken = checkoutSession?.metadata?.calc_session_token;
        const refundEmail = checkoutSession?.customer_email || checkoutSession?.metadata?.email;
        const refundFilter = refundToken
          ? `session_token=eq.${encodeURIComponent(refundToken)}`
          : (refundEmail ? `email=eq.${encodeURIComponent(refundEmail)}&payment_status=eq.completed` : null);

        await Promise.all([
          fetch(`${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionUUID}`, {
            method: 'PATCH',
            headers: patchHeaders,
            body: JSON.stringify({ payment_status: 'refunded', updated_at: new Date().toISOString() }),
          }),
          refundFilter
            ? fetch(`${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2?${refundFilter}`, {
                method: 'PATCH',
                headers: patchHeaders,
                body: JSON.stringify({ payment_status: 'refunded', is_premium: false, updated_at: new Date().toISOString() }),
              })
            : Promise.resolve(null),
        ]);
        console.log(`Webhook: refund processed for session ${sessionUUID}`);

        // Server-side GA4 refund event
        if (env.GA4_API_SECRET && env.GA4_MEASUREMENT_ID) {
          fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`, {
            method: 'POST',
            body: JSON.stringify({
              client_id: sessionUUID,
              events: [{
                name: 'refund',
                params: {
                  transaction_id: checkoutSession.id,
                  value: amountRefunded / 100,
                  currency: charge.currency?.toUpperCase() || 'USD',
                  source: 'stripe_webhook',
                },
              }],
            }),
          }).catch(err => console.warn('GA4 refund event error:', err));
        }
      } else {
        console.warn('Webhook: refund — could not resolve session UUID from payment_intent');
      }
    }

    return new Response(JSON.stringify({ received: true, refund_processed: isFullRefund }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const corsOrigin = getCorsOrigin(request, env);

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Canary check runs before any route: nothing legitimate carries a canary
    // token, and it must be seen even on paths that do not exist.
    const canary = canaryTripped(request, url, env, ctx);
    if (canary) return canary;

    // Wrapper to add CORS to all responses
    const sendWithCors = (response) => {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    };

    // ===== ROUTES =====

    // Version endpoint for deployment verification
    if (path === '/version' && method === 'GET') {
      return sendWithCors(new Response(JSON.stringify({
        version: DEPLOY_VERSION,
        deployed: new Date().toISOString(),
        file: 'calculator-api.js'
      }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Session management
    if (path === '/api/v1/calculator/session' && method === 'POST') {
      return sendWithCors(await handleCreateSession(request, env));
    }

    if (path === '/api/v1/calculator/validate' && method === 'POST') {
      return await handleValidateSession(request, env);
    }

    // Step submissions
    if (path === '/api/v1/calculator/step/1' && method === 'POST') {
      return await handleSaveStep1(request, env);
    }

    if (path === '/api/v1/calculator/step/2' && method === 'POST') {
      return await handleSaveStep2(request, env);
    }

    if (path === '/api/v1/calculator/step/3' && method === 'POST') {
      return await handleSaveStep3(request, env);
    }

    if (path === '/api/v1/calculator/step/4' && method === 'POST') {
      return await handleStep4Submission(request, env);
    }

    // EXP-004 micro-survey (offer-message fit)
    if (path === '/api/v1/calculator/survey' && method === 'POST') {
      return sendWithCors(await handleSaveSurvey(request, env));
    }

    // Free-results view marker (funnel truth between step 3 and payment)
    if (path === '/api/v1/calculator/results-viewed' && method === 'POST') {
      return sendWithCors(await handleResultsViewed(request, env));
    }

    // Payment flow
    if (path === '/api/v1/calculator/payment/tiers' && method === 'GET') {
      return await handleGetPaymentTiers(request, env);
    }

    if (path === '/validate-coupon' && method === 'POST') {
      return await handleValidateCoupon(request, env);
    }

    if (path === '/get-session' && method === 'GET') {
      return sendWithCors(await handleGetSession(request, env));
    }

    if (path === '/create-checkout' && method === 'POST') {
      return sendWithCors(await handleCreateCheckout(request, env));
    }

    if (path === '/api/v1/calculator/payment/initiate' && method === 'POST') {
      return await handleInitiatePayment(request, env);
    }

    if (path === '/api/v1/calculator/payment/verify' && method === 'POST') {
      return await handleVerifyPayment(request, env);
    }

    // Report flow (NEW ENDPOINTS)
    if (path === '/api/v1/calculator/report/init' && method === 'POST') {
      return await handleReportInit(request, env);
    }

    if (path === '/api/v1/calculator/email-report' && method === 'POST') {
      return await handleEmailReport(request, env);
    }

    const contentMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})\/content$/i);
    if (contentMatch && method === 'GET') {
      return await handleReportContent(request, env, contentMatch[1]);
    }

    // Report status
    const statusMatch = path.match(/^\/api\/v1\/calculator\/report\/([a-f0-9]{64})\/status$/i);
    if (statusMatch && method === 'GET') {
      return await handleReportStatus(request, env, statusMatch[1]);
    }

    // ===== ETSY ROUTES =====

    // OAuth callback (GET - browser redirect from Etsy)
    if (path === '/etsy/callback' && method === 'GET') {
      return await handleEtsyCallback(request, env);
    }

    // Initiate OAuth flow (returns auth URL)
    if (path === '/api/v1/etsy/auth/init' && method === 'POST') {
      return sendWithCors(await handleEtsyAuthInit(request, env));
    }

    // Refresh token
    if (path === '/api/v1/etsy/refresh' && method === 'POST') {
      return sendWithCors(await handleEtsyRefresh(request, env));
    }

    // Get shop info
    if (path === '/api/v1/etsy/shop' && method === 'GET') {
      return sendWithCors(await handleEtsyGetShop(request, env));
    }

    // Create listing
    if (path === '/api/v1/etsy/listings' && method === 'POST') {
      return sendWithCors(await handleEtsyCreateListing(request, env));
    }

    // DEBUG: Check session data
    const debugMatch = path.match(/^\/debug\/session\/(.+)$/);
    if (debugMatch && method === 'GET') {
      const sessionId = debugMatch[1];
      try {
        const sessionResponse = await fetch(
          `${env.SUPABASE_URL}/rest/v1/cw_assessment_sessions?id=eq.${sessionId}`,
          {
            headers: {
              'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        const sessions = await sessionResponse.json();
        if (sessions && sessions[0]) {
          const session = sessions[0];
          return new Response(JSON.stringify({
            session_id: session.id,
            form_data: session.form_data,
            form_data_keys: session.form_data ? Object.keys(session.form_data) : [],
            payment_status: session.payment_status,
          }, null, 2), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ===== SUBSCRIBE (drip signup — in-house Supabase + Resend) =====
    if (path === '/api/v1/subscribe' && method === 'POST') {
      return sendWithCors(await handleSubscribe(request, env));
    }

    // ===== NEWSLETTER SUBSCRIBE =====
    if (path === '/api/v1/subscribe/newsletter' && method === 'POST') {
      return sendWithCors(await handleSubscribe(request, env));
    }

    // ===== UNSUBSCRIBE =====
    if (path === '/api/v1/unsubscribe' && method === 'GET') {
      return await handleUnsubscribe(url, env);
    }

    // ===== FEEDBACK PROXY =====
    if (path === '/api/v1/feedback' && method === 'POST') {
      return sendWithCors(await handleFeedback(request, env));
    }

    // ===== DRIP SURVEY (anonymous journey check-ins) =====
    if (path === '/api/v1/drip-survey' && method === 'GET') {
      return sendWithCors(await handleDripSurveyGet(url, env));
    }
    if (path === '/api/v1/drip-survey' && method === 'POST') {
      return sendWithCors(await handleDripSurveySubmit(request, env));
    }
    if (path === '/api/v1/drip-survey/view' && method === 'POST') {
      return sendWithCors(await handleDripSurveyView(request, env));
    }

    // ===== CARNIVORE COACH WAITLIST =====
    if (path === '/api/v1/coach-waitlist' && method === 'POST') {
      return sendWithCors(await handleCoachWaitlist(request, env));
    }

    // ===== REFUND REQUEST =====
    if (path === '/api/v1/refund-request' && method === 'POST') {
      return sendWithCors(await handleRefundRequest(request, env));
    }

    // ===== STRIPE WEBHOOK (server-to-server, no CORS) =====
    if (path === '/webhook/stripe' && method === 'POST') {
      return await handleStripeWebhook(request, env);
    }

    // ===== RESEND WEBHOOK (email open/click tracking) =====
    if (path === '/webhook/resend' && method === 'POST') {
      return await handleResendWebhook(request, env);
    }

    // 404
    return createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
  },
};

// ===== UNSUBSCRIBE HANDLER =====
async function handleUnsubscribe(url, env) {
  const email = url.searchParams.get('email');
  const rawSite = (url.searchParams.get('site') || 'cw').toLowerCase();
  const site = DRIP_SURVEY_SITES.includes(rawSite) ? rawSite : 'cw';

  if (!email) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>Invalid unsubscribe link</h2><p>No email address provided.</p></body></html>', {
      status: 400, headers: { 'Content-Type': 'text/html' }
    });
  }

  const cleanEmail = decodeURIComponent(email).trim().toLowerCase();

  // Update newsletter_subscribers
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(cleanEmail)}&site=eq.${site}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      }),
    }
  );

  // Also check drip_subscribers (scoped to this site's drip)
  await fetch(
    `${env.SUPABASE_URL}/rest/v1/drip_subscribers?email=eq.${encodeURIComponent(cleanEmail)}&site=eq.${site}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ unsubscribed: true }),
    }
  ).catch(() => {});

  const siteName = site === 'kd' ? 'KetoDial' : 'Carnivore Weekly';
  // Exit survey (Brew, 2026-08-30). The unsubscribe is already committed above,
  // so answering (or ignoring) this can never affect it. Answers land in the
  // drip survey tables at day=0 / source=unsubscribe — day 0 is reserved for
  // this, real check-ins are days 1-28.
  return new Response(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:sans-serif;text-align:center;padding:60px 16px;background:#f7f7f7;">
    <div style="max-width:400px;margin:0 auto;background:#fff;padding:40px 32px;border-radius:12px;">
      <h2 style="margin:0 0 12px;">You've been unsubscribed</h2>
      <p style="color:#666;">You won't receive any more emails from ${siteName}.</p>
      <p style="color:#999;font-size:13px;">If this was a mistake, just sign up again at the site.</p>
      <div id="exitSurvey" style="margin-top:28px;padding-top:22px;border-top:1px solid #eee;">
        <p style="color:#444;font-size:14px;margin:0 0 14px;">One tap before you go, what made you leave?</p>
        <div id="exitOpts" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
    </div>
    <script>
    (function(){
      var site=${JSON.stringify(site)};
      var box=document.getElementById('exitOpts');
      var wrap=document.getElementById('exitSurvey');
      fetch('/api/v1/drip-survey?day=0&site='+site)
        .then(function(r){return r.ok?r.json():null})
        .then(function(data){
          if(!data||!data.questions||!data.questions.length){wrap.style.display='none';return;}
          var q=data.questions[0];
          q.options.forEach(function(o){
            var b=document.createElement('button');
            b.type='button';
            b.textContent=o.text;
            b.style.cssText='padding:11px 14px;border:1px solid #ddd;border-radius:8px;background:#fafafa;color:#333;font-size:14px;cursor:pointer;';
            b.onclick=function(){
              var fp;
              try{fp=crypto.randomUUID();}catch(e){fp='fp-'+Math.random().toString(36).slice(2)+Date.now();}
              fetch('/api/v1/drip-survey',{method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({site:site,day:0,option_ids:[o.id],fingerprint:fp,source:'unsubscribe'})
              }).catch(function(){});
              wrap.innerHTML='<p style="color:#15803d;font-size:14px;margin:22px 0 0;">Thanks, that helps.</p>';
            };
            box.appendChild(b);
          });
        })
        .catch(function(){wrap.style.display='none';});
    })();
    </script>
  </body></html>`, {
    status: 200, headers: { 'Content-Type': 'text/html' }
  });
}

// ===== RESEND WEBHOOK HANDLER =====
// Verifies a Svix-signed webhook (the scheme Resend uses).
//
// Deliberately NOT the same shape as the Stripe verifier above: Svix base64-decodes
// the secret to get the key bytes, emits a base64 signature (not hex), and may send
// several space-separated `v1,<sig>` pairs during a secret rotation, any one of which
// may match. Reusing the Stripe code here would reject every real delivery.
//
// Header names: Svix sends svix-*, the standard-webhooks spec renamed them webhook-*.
// Accept both so a Resend-side migration doesn't silently break tracking.
async function verifyResendSignature(request, rawBody, env) {
  const secret = env.RESEND_WEBHOOK_SECRET;
  // Fail CLOSED. An unset secret is a deployment mistake, and the whole point of
  // this function is that an unauthenticated POST can suppress any subscriber.
  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET is not set - rejecting webhook');
    return { ok: false, reason: 'secret-not-configured' };
  }

  const h = (a, b) => request.headers.get(a) || request.headers.get(b);
  const id = h('svix-id', 'webhook-id');
  const timestamp = h('svix-timestamp', 'webhook-timestamp');
  const sigHeader = h('svix-signature', 'webhook-signature');
  if (!id || !timestamp || !sigHeader) {
    return { ok: false, reason: 'missing-signature-headers' };
  }

  // Reject replays. Svix's own tolerance is 5 minutes.
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    return { ok: false, reason: 'stale-timestamp' };
  }

  // whsec_ prefix is not part of the key material.
  const b64Secret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes;
  try {
    keyBytes = Uint8Array.from(atob(b64Secret), c => c.charCodeAt(0));
  } catch {
    console.error('RESEND_WEBHOOK_SECRET is not valid base64 - rejecting webhook');
    return { ok: false, reason: 'malformed-secret' };
  }

  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signed = `${id}.${timestamp}.${rawBody}`;
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Compare every offered v1 signature in constant time, and never short-circuit on
  // the first match: an early return would leak timing about which one matched.
  let matched = false;
  for (const part of sigHeader.split(' ')) {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value || value.length !== expected.length) continue;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ value.charCodeAt(i);
    if (diff === 0) matched = true;
  }
  return matched ? { ok: true } : { ok: false, reason: 'signature-mismatch' };
}

// Receives email.opened, email.clicked, email.delivered, email.bounced events
// Docs: https://resend.com/docs/dashboard/webhooks/introduction
// A provider refusing a message on content is not a dead address. SES and
// Resend both surface this as bounce.subType 'ContentRejected'; some providers
// spell it differently, so match loosely rather than on one exact literal.
// Kept deliberately narrow: 'Suppressed', 'General', 'NoEmail' and the rest
// still count, because those DO speak to the address.
function isContentRejectedSubtype(subType) {
  return String(subType || '').toLowerCase().replace(/[^a-z]/g, '') === 'contentrejected';
}

async function handleResendWebhook(request, env) {
  try {
    // Read the body as text: HMAC is over the exact bytes Resend signed, so
    // re-serializing a parsed object would change the payload and never match.
    const rawBody = await request.text();

    // Verify BEFORE parsing or touching the database. This endpoint can suppress
    // delivery to any address (one Permanent bounce is enough), so an unsigned
    // POST used to be a remote kill switch for the whole list.
    const verified = await verifyResendSignature(request, rawBody, env);
    if (!verified.ok) {
      console.warn(`Rejected Resend webhook: ${verified.reason}`);
      return new Response(JSON.stringify({ error: 'invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = JSON.parse(rawBody);
    const eventType = body.type; // email.delivered, email.opened, email.clicked, email.bounced
    const data = body.data || {};

    // Map Resend event types to our simple types
    const typeMap = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
    };
    const simpleType = typeMap[eventType] || eventType;

    // send_drip.py already logs 'sent' synchronously right after the Resend API
    // call returns — this webhook firing 'email.sent' too was double-logging every
    // send and dragging down the computed delivery rate (ISSUE tracked 2026-07-18).
    if (simpleType === 'sent') {
      return new Response(JSON.stringify({ ok: true, skipped: 'sent-logged-at-send-time' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Attribute the event to a site so CW/KD engagement stats stay separate.
    // KD emails send from ketodial@/coach@carnivoreweekly.com and tag sequence=kd-*.
    // Resend delivers tags as an array of {name, value}; normalize to an object
    // (older payload shapes were a plain object, so handle both).
    const evFrom = String(data.from || '').toLowerCase();
    const rawTags = data.tags || {};
    const evTags = Array.isArray(rawTags)
      ? Object.fromEntries(rawTags.map(t => [t.name, t.value]))
      : rawTags;
    const evSite = (evFrom.includes('ketodial@') || evFrom.includes('coach@')
      || String(evTags.sequence || '').startsWith('kd')
      || evTags.site === 'kd') ? 'kd' : 'cw';

    // Resend nests click details under data.click and uses `link`/`userAgent`/`ipAddress`.
    // We were reading data.click.url / data.user_agent / data.ip, which don't exist in the
    // payload, so every clicked event logged click_url: null and we couldn't tell a
    // check-in click from any other link in the email. Read the real keys, keep the old
    // ones as fallbacks in case the payload shape changes again.
    const click = data.click || {};
    const payload = {
      email: (data.to && data.to[0]) || data.email || '',
      resend_id: data.email_id || '',
      event_type: simpleType,
      subject: data.subject || '',
      site: evSite,
      // metadata is jsonb. Passing a JSON *string* stored it as a jsonb scalar string,
      // which made metadata->>'click_url' return nothing. Pass the object itself.
      metadata: {
        click_url: click.link || click.url || data.link || null,
        user_agent: click.userAgent || data.user_agent || null,
        ip: click.ipAddress || data.ip || null,
        timestamp: body.created_at || new Date().toISOString(),
        // Bounce classification, recorded so the repeat-bounce walk below can
        // tell a dead mailbox from a content-filter refusal. Without this the
        // history rows are just event_type='bounced' and every refusal looks
        // identical to a nonexistent address. Null on non-bounce events.
        bounce_type: data.bounce?.type || null,
        bounce_subtype: data.bounce?.subType || null,
      },
    };

    await fetch(`${env.SUPABASE_URL}/rest/v1/drip_events`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    // Suppress dead addresses so we stop mailing them.
    // Logging the bounce was never enough: the address stayed active and the
    // daily cron kept sending for the rest of the 30-day sequence. One typo'd
    // domain produced 5 bounces in a week against 61 delivered KD messages,
    // and providers score bounce rate against real volume.
    //
    // Two independent triggers, because one is not enough:
    //
    //  (a) bounce.type === 'Permanent' — the clean signal, suppress on first hit.
    //
    //  (b) REPEAT BOUNCES — the signal that actually matters here. Verified
    //      against real payloads 2026-08-09: SES tagged 'redacted-subscriber-09@example.invalid'
    //      as *Transient/General* even though the diagnostic read "Could not
    //      find a mail server for yagoo.com". A nonexistent domain is as
    //      permanent as it gets, but SES retries for 840 minutes, expires, and
    //      calls that transient. A Permanent-only rule would have suppressed
    //      NONE of the 13 bounces that caused this bug.
    //
    // So: count bounces since the last sign of successful delivery. Three in a
    // row means dead regardless of what the provider labels it, and a genuinely
    // transient problem (full mailbox, outage) clears well before three
    // consecutive daily sends. Complaints always suppress on the first hit,
    // since someone hitting "spam" hurts reputation more than any bounce.
    const bounceType = String(data.bounce?.type || '').toLowerCase();
    const isComplaint = simpleType === 'complained';
    // ContentRejected means the receiving provider refused this particular
    // message, usually on a content filter. It is not a statement about the
    // mailbox, which may be wide awake and reading everything else we send.
    // Suppressing on it cuts off a live reader and, worse, does it silently.
    // Verified 2026-08-30: redacted-subscriber-32@example.invalid was suppressed on three
    // ContentRejected verdicts while opening and clicking throughout.
    const isContentRejected = simpleType === 'bounced'
      && isContentRejectedSubtype(data.bounce?.subType);
    const isPermanent = simpleType === 'bounced' && bounceType === 'permanent'
      && !isContentRejected;
    let repeatBounces = 0;

    if (simpleType === 'bounced' && !isPermanent && !isContentRejected && payload.email) {
      // Walk this address's recent history newest-first and count the bounce
      // run. Any delivered/opened/clicked breaks the run: the address worked
      // at that point, so older bounces are stale and must not accumulate
      // toward suppression months later.
      try {
        const histUrl = `${env.SUPABASE_URL}/rest/v1/drip_events`
          + `?email=eq.${encodeURIComponent(payload.email)}&site=eq.${evSite}`
          + `&select=event_type,created_at,metadata&order=created_at.desc&limit=25`;
        const histRes = await fetch(histUrl, {
          headers: {
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        if (histRes.ok) {
          for (const ev of await histRes.json()) {
            if (ev.event_type === 'bounced') {
              // A ContentRejected bounce is neutral evidence: it says the
              // provider refused THIS message, not that the mailbox is gone.
              // It must not count toward the run, and it must not break the
              // run either, since it proves nothing about deliverability.
              // Rows written before 2026-09-01 carry no bounce_subtype and
              // keep the old counting behaviour.
              if (isContentRejectedSubtype(ev.metadata?.bounce_subtype)) continue;
              repeatBounces++;
            } else if (['delivered', 'opened', 'clicked'].includes(ev.event_type)) break;
          }
        }
      } catch (e) {
        console.error('bounce-history lookup failed:', e);
      }
    }

    const REPEAT_BOUNCE_LIMIT = 3;
    const isHardBounce = !isContentRejected
      && (isPermanent || repeatBounces >= REPEAT_BOUNCE_LIMIT);

    if (isContentRejected) {
      console.log(`ContentRejected for ${payload.email} (${evSite}): provider refused `
        + `the message, not the address - not counted, not suppressing. `
        + `subType=${data.bounce?.subType || 'unknown'}`);
    }

    if (simpleType === 'bounced' && !isHardBounce && !isContentRejected) {
      console.log(`Bounce for ${payload.email} (${evSite}): ${bounceType || 'unknown'}, `
        + `${repeatBounces}/${REPEAT_BOUNCE_LIMIT} consecutive - not suppressing yet`);
    }

    if ((isHardBounce || isComplaint) && payload.email) {
      const detail = `${data.bounce?.subType || 'bounce'}: ${data.bounce?.message || ''}`.trim();
      const reason = (isComplaint
        ? 'spam complaint'
        : isPermanent
          ? `permanent - ${detail}`
          : `${repeatBounces} consecutive bounces - ${detail}`).slice(0, 500);
      const stampedAt = payload.metadata.timestamp;

      // Site-scoped: the same person can legitimately be on both the CW and KD
      // lists, and a KD bounce says nothing about their CW address.
      const scope = `email=eq.${encodeURIComponent(payload.email)}&site=eq.${evSite}`;
      const writeHeaders = {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      };

      const [dripRes, newsRes] = await Promise.all([
        // send_drip.py skips rows with bounced_at set. Kept separate from
        // `completed` (which means graduated, and inserts into the weekly list)
        // and from `unsubscribed` (which is a deliberate user action).
        fetch(`${env.SUPABASE_URL}/rest/v1/drip_subscribers?${scope}`, {
          method: 'PATCH',
          headers: writeHeaders,
          body: JSON.stringify({ bounced_at: stampedAt, bounce_reason: reason }),
        }),
        // send_newsletter.py selects status=active, so this drops them from the
        // weekly too. bounced_at is required by chk_unsub_timestamp.
        fetch(`${env.SUPABASE_URL}/rest/v1/newsletter_subscribers?${scope}&status=eq.active`, {
          method: 'PATCH',
          headers: writeHeaders,
          body: JSON.stringify({
            status: isComplaint ? 'complained' : 'bounced',
            bounced_at: stampedAt,
            bounce_reason: reason,
          }),
        }),
      ]);

      // These run with Prefer: return=minimal, so a failed PATCH still resolves.
      // Without this check a dropped column or a constraint change would leave
      // the address sending forever while the log below claimed it was handled.
      const failures = [];
      if (!dripRes.ok) failures.push(`drip_subscribers ${dripRes.status}: ${await dripRes.text()}`);
      if (!newsRes.ok) failures.push(`newsletter_subscribers ${newsRes.status}: ${await newsRes.text()}`);
      if (failures.length) {
        console.error(`SUPPRESSION FAILED for ${payload.email} (${evSite}) - `
          + `address is still active and will keep bouncing: ${failures.join(' | ')}`);
      } else {
        console.log(`Suppressed ${payload.email} (${evSite}): ${reason}`);
      }
    } else if (simpleType === 'bounced' && !data.bounce) {
      // Fails safe (no suppression), but stay loud: a payload-shape change here
      // would silently switch the Permanent trigger off and nobody would notice.
      console.warn(`Bounce payload had no bounce object for ${payload.email} - check Resend payload shape`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Resend webhook error:', err);
    return new Response(JSON.stringify({ error: 'webhook processing failed' }), {
      status: 200, // Return 200 so Resend doesn't retry
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ============================================================================
// TEST SURFACE
// ----------------------------------------------------------------------------
// Named exports for tests/report-safety.test.mjs, the adversarial regression
// fixture that renders the nine safety personas end to end. Wrangler only cares
// about the default export, so these are inert in the deployed worker. Do not
// remove them: the fixture is the thing that stops the 2026-09-07 defects from
// coming back.
// ============================================================================
export {
  buildReportData as __test_buildReportData,
  generateAllReports as __test_generateAllReports,
  calculateMacros as __test_calculateMacros,
  wrapInPrintHTML as __test_wrapInPrintHTML,
  markdownToHTML as __test_markdownToHTML,
  // Exposed so tests/report-integrity.test.mjs can assert the derivation directly,
  // not just its rendered output: the grocery list must be a pure function of the
  // meal plan. See that file's GROUP D.
  generateAIReports as __test_generateAIReports,
  assertReportCopyIsClean as __test_assertReportCopyIsClean,
  REPORT_GENERATION_FAILED_MESSAGE as __test_REPORT_GENERATION_FAILED_MESSAGE,
  generateFullMealPlan as __test_generateFullMealPlan,
  sendResumeEmailIfOwed as __test_sendResumeEmailIfOwed,
  ensureAssessmentPaid as __test_ensureAssessmentPaid,
  buildResumeLink as __test_buildResumeLink,
  buildResumeEmailBody as __test_buildResumeEmailBody,
  RESUME_EMAIL_SUBJECT as __test_RESUME_EMAIL_SUBJECT,
  RENAL_MEAL_CALENDAR_NOTICE as __test_RENAL_MEAL_CALENDAR_NOTICE,
  RENAL_GROCERY_LIST_NOTICE as __test_RENAL_GROCERY_LIST_NOTICE,
  generateGroceryListByWeek as __test_generateGroceryListByWeek,
  resolveGoal as __test_resolveGoal,
  detectGoalConflict as __test_detectGoalConflict,
  ReportValidationError as __test_ReportValidationError,
  displayUnitFor as __test_displayUnitFor,
  renderIngredient as __test_renderIngredient,
  COUNT_ROUNDING_MAX_GRAMS_ERROR as __test_COUNT_ROUNDING_MAX_GRAMS_ERROR,
  convertQuantity as __test_convertQuantity,
  GRAMS_PER_EGG as __test_GRAMS_PER_EGG,
  // Base-food identity. Exported so tests/report-integrity.test.mjs GROUP L can
  // assert the derivation itself, not only that today's rendered output happens
  // to look right.
  baseFoodKey as __test_baseFoodKey,
  distinctByBaseFood as __test_distinctByBaseFood,
  foodDatabase as __test_foodDatabase,
  buildSubstitutionGuide as __test_buildSubstitutionGuide,
  // Check-in identity. Exposed so tests/drip-checkin-identity.test.mjs can drive
  // the real resolution and the real submit handler against the real database,
  // rather than asserting on a reimplementation of them.
  resolveCheckinToken as __test_resolveCheckinToken,
  handleDripSurveySubmit as __test_handleDripSurveySubmit,
  // Item 3A goal-magnitude payback. Exported so the suite can drive the real
  // derivation against real calculator rows instead of a reimplementation of it.
  computeGoalHorizon as __test_computeGoalHorizon,
  calculatorContextForSubscriber as __test_calculatorContextForSubscriber,
  GOAL_MAGNITUDE_BANDS as __test_GOAL_MAGNITUDE_BANDS,
  HORIZON_BASIS_VERSION as __test_HORIZON_BASIS_VERSION
};

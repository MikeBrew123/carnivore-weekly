/**
 * CW/KD brand isolation for the paid + lifecycle email paths.
 *
 * WHY THIS EXISTS. A 2026-09-13 audit flagged `site=kd` inside the Carnivore Weekly
 * worker and suspected CW paid-report traffic was being attributed to KetoDial. It
 * was a false alarm: that literal lives in sendKetoDialWelcome, which is a genuinely
 * KD email. No routing change was needed. This file locks in the isolation that made
 * the answer "no change", so the next person who greps `site=kd` does not have to
 * re-derive it, and so a future edit cannot quietly break it.
 *
 * WHAT MUST NOT REGRESS:
 *   A. A CW-shaped event attributes to site 'cw' and suppresses ONLY cw rows.
 *   B. A KD-shaped event attributes to site 'kd' and suppresses ONLY kd rows.
 *   C. Suppression PATCHes are always site-scoped, so one brand can never
 *      unsubscribe or bounce-suppress the same person on the other brand.
 *   D. The paid report email still sends, and sends under the CW identity.
 *
 * NO EMAIL IS SENT. globalThis.fetch is replaced for the whole file; any call to
 * api.resend.com is captured and returned as a stub. A real send would have to
 * escape that stub, and the final assertion proves none did.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_JS = path.join(REPO, 'api', 'calculator-api.js');

let checks = 0;
const failures = [];
function check(group, name, ok, detail) {
  checks++;
  if (!ok) failures.push({ group, name, detail: detail || '' });
}

const worker = (await import('file://' + WORKER_JS + '?brandIso=' + Date.now())).default;

const SECRET_B64 = Buffer.from('brand-isolation-test-secret').toString('base64');
const ENV = {
  SUPABASE_URL: 'https://stub.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'stub-service-role',
  RESEND_API_KEY: 'stub-resend-key',
  RESEND_WEBHOOK_SECRET: `whsec_${SECRET_B64}`,
};

/** Sign a payload the way Svix does, so the worker's real verifier accepts it. */
function signed(bodyObj) {
  const body = JSON.stringify(bodyObj);
  const id = 'msg_brandiso';
  const ts = Math.floor(Date.now() / 1000).toString();
  const mac = crypto.createHmac('sha256', Buffer.from(SECRET_B64, 'base64'))
    .update(`${id}.${ts}.${body}`).digest('base64');
  return new Request('https://w.dev/webhook/resend', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': id,
      'svix-timestamp': ts,
      'svix-signature': `v1,${mac}`,
    },
    body,
  });
}

/**
 * Drive one request through the real worker and hand back every outbound call it
 * made, split by destination. `history` is the row list the bounce-history walk sees.
 */
async function drive(request, { history = [] } = {}) {
  const realFetch = globalThis.fetch;
  const resendSends = [];
  const patches = [];
  const inserts = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    if (u.includes('api.resend.com')) {
      resendSends.push({ url: u, body: JSON.parse(opts.body || '{}') });
      return { ok: true, status: 200, json: async () => ({ id: 'stub-email-id' }), text: async () => '' };
    }
    if (u.includes('/rest/v1/drip_events')) {
      if (method === 'POST') { inserts.push(JSON.parse(opts.body || '{}')); return { ok: true, status: 201, json: async () => ([]), text: async () => '' }; }
      return { ok: true, status: 200, json: async () => history, text: async () => '' };
    }
    if (u.includes('/rest/v1/drip_subscribers') || u.includes('/rest/v1/newsletter_subscribers')) {
      if (method === 'PATCH') { patches.push({ url: u, body: JSON.parse(opts.body || '{}') }); return { ok: true, status: 204, json: async () => ([]), text: async () => '' }; }
      return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
    }
    if (u.includes('/rest/v1/calculator_reports')) {
      // Must satisfy the authorization gate added 2026-09-13 (commit 520d8d01):
      // the row needs its canonical owner email, and the assessment below must
      // say the report was paid for. Without both, delivery is refused 403 and
      // this file's Group D would be asserting on a denial, not on brand.
      return { ok: true, status: 200, json: async () => ([{
        email: 'buyer@domain.com',
        report_html: '<html><body>' + 'x'.repeat(200) + '</body></html>',
      }]), text: async () => '' };
    }
    if (u.includes('/rest/v1/cw_assessment_sessions')) {
      return { ok: true, status: 200, json: async () => ([{ payment_status: 'completed' }]), text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
  };
  try {
    const res = await worker.fetch(request, ENV, { waitUntil() {} });
    return { res, resendSends, patches, inserts };
  } finally {
    globalThis.fetch = realFetch;
  }
}

const bounceEvent = (from, extraTags = []) => ({
  type: 'email.bounced',
  created_at: '2026-09-13T12:00:00.000Z',
  data: {
    email_id: 'eid-' + Math.random().toString(16).slice(2),
    from,
    to: ['shared-person@example.com'],
    subject: 'test',
    tags: extraTags,
    bounce: { type: 'Permanent', subType: 'General', message: 'mailbox does not exist' },
  },
});

// ── GROUP A: CW-shaped bounce attributes to cw and scopes writes to cw ──────────
{
  const { inserts, patches } = await drive(signed(bounceEvent('Carnivore Weekly <reports@carnivoreweekly.com>')));
  check('A', 'CW report sender attributes to site=cw',
    inserts.length === 1 && inserts[0].site === 'cw', JSON.stringify(inserts.map(i => i.site)));
  check('A', 'CW bounce patches only site=eq.cw rows',
    patches.length === 2 && patches.every(p => p.url.includes('site=eq.cw')),
    patches.map(p => p.url).join(' | '));
  check('A', 'CW bounce never touches a kd row',
    patches.every(p => !p.url.includes('site=eq.kd')), patches.map(p => p.url).join(' | '));
}

// ── GROUP B: KD-shaped bounce attributes to kd and scopes writes to kd ──────────
{
  const { inserts, patches } = await drive(signed(bounceEvent('KetoDial <ketodial@carnivoreweekly.com>')));
  check('B', 'KD sender attributes to site=kd',
    inserts.length === 1 && inserts[0].site === 'kd', JSON.stringify(inserts.map(i => i.site)));
  check('B', 'KD bounce patches only site=eq.kd rows',
    patches.length === 2 && patches.every(p => p.url.includes('site=eq.kd')),
    patches.map(p => p.url).join(' | '));
  check('B', 'KD bounce never touches a cw row',
    patches.every(p => !p.url.includes('site=eq.cw')), patches.map(p => p.url).join(' | '));
}

// ── GROUP C: the explicit site tag wins, and coach@ is KD ───────────────────────
{
  const { inserts } = await drive(signed(bounceEvent('KetoDial Coach <coach@carnivoreweekly.com>')));
  check('C', 'coach@ attributes to kd', inserts[0]?.site === 'kd', String(inserts[0]?.site));
}
{
  const tagged = bounceEvent('Carnivore Weekly <newsletter@carnivoreweekly.com>', [{ name: 'site', value: 'kd' }]);
  const { inserts, patches } = await drive(signed(tagged));
  check('C', 'explicit site=kd tag overrides a cw-looking from',
    inserts[0]?.site === 'kd', String(inserts[0]?.site));
  check('C', 'tagged-kd event still scopes writes to kd only',
    patches.every(p => p.url.includes('site=eq.kd')), patches.map(p => p.url).join(' | '));
}

// ── GROUP D: paid report delivery still works, under the CW identity ────────────
{
  const req = new Request('https://w.dev/api/v1/calculator/email-report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: '11111111-2222-3333-4444-555555555555', email: 'buyer@domain.com' }),
  });
  const { res, resendSends } = await drive(req);
  check('D', 'paid report endpoint returns 200', res.status === 200, 'status ' + res.status);
  check('D', 'paid report sends exactly one email', resendSends.length === 1, 'sends=' + resendSends.length);
  check('D', 'paid report sends under the CW identity',
    /carnivoreweekly\.com/.test(resendSends[0]?.body?.from || '')
    && !/ketodial@|coach@/.test(resendSends[0]?.body?.from || ''),
    String(resendSends[0]?.body?.from));
}

// ── GROUP E: an unsigned webhook cannot suppress anyone ─────────────────────────
{
  const unsigned = new Request('https://w.dev/webhook/resend', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bounceEvent('KetoDial <ketodial@carnivoreweekly.com>')),
  });
  const { res, patches } = await drive(unsigned);
  check('E', 'unsigned webhook is rejected 401', res.status === 401, 'status ' + res.status);
  check('E', 'unsigned webhook suppresses nobody', patches.length === 0, 'patches=' + patches.length);
}

// ── Report ─────────────────────────────────────────────────────────────────────
console.log(`\nbrand-attribution-isolation: ${checks - failures.length}/${checks} checks passed`);
for (const f of failures) console.log(`  FAIL [${f.group}] ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
process.exit(failures.length ? 1 : 0);

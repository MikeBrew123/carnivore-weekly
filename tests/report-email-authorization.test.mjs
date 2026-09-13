/**
 * POST /api/v1/calculator/email-report — authorization regression suite.
 *
 * THE DEFECT (found 2026-09-13, fixed in this commit). The endpoint read `session_id`
 * and `email` from the request body and mailed the stored report_html to whatever
 * address was supplied. It never checked that the address owned the session, and it
 * never checked that anyone had paid. A CW report contains the reader's weight,
 * goals, medications and kidney status. Anyone holding a session UUID — and those
 * travel in report links, browser history and referrers — could have a stranger's
 * health data mailed to an address they controlled.
 *
 * GROUP B below is that exact exploit, asserted to be impossible now.
 *
 * NO EMAIL IS SENT. globalThis.fetch is stubbed for every case; any call to
 * api.resend.com is captured, not performed. Each denial case additionally asserts
 * that zero sends were attempted, so a regression cannot pass by mailing and then
 * returning an error.
 */
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

const worker = (await import('file://' + WORKER_JS + '?authz=' + Date.now())).default;

const ENV = {
  SUPABASE_URL: 'https://stub.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'stub-service-role',
  RESEND_API_KEY: 'stub-resend-key',
};

const OWNER = 'buyer@example.com';
const ATTACKER = 'attacker@example.com';
const SESSION = '11111111-2222-3333-4444-555555555555';
const REPORT_HTML = '<html><body>' + 'PHI'.repeat(100) + '</body></html>';

/**
 * Drive one request against a stubbed database.
 *  reportRows  — what calculator_reports returns
 *  paymentRows — what cw_assessment_sessions returns
 *  reportsOk / paymentOk — simulate an unreadable table (must fail closed)
 */
async function request({
  bodyEmail = OWNER, sessionId = SESSION,
  reportRows = [{ email: OWNER, report_html: REPORT_HTML }],
  paymentRows = [{ payment_status: 'completed' }],
  reportsOk = true, paymentOk = true,
} = {}) {
  const realFetch = globalThis.fetch;
  const sends = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.resend.com')) {
      sends.push(JSON.parse(opts.body || '{}'));
      return { ok: true, status: 200, json: async () => ({ id: 'stub-id' }), text: async () => '' };
    }
    if (u.includes('/rest/v1/calculator_reports')) {
      return { ok: reportsOk, status: reportsOk ? 200 : 500, json: async () => reportRows, text: async () => '' };
    }
    if (u.includes('/rest/v1/cw_assessment_sessions')) {
      return { ok: paymentOk, status: paymentOk ? 200 : 500, json: async () => paymentRows, text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
  };
  try {
    const res = await worker.fetch(new Request('https://w.dev/api/v1/calculator/email-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, email: bodyEmail }),
    }), ENV, { waitUntil() {} });
    return { res, sends, json: await res.json().catch(() => ({})) };
  } finally {
    globalThis.fetch = realFetch;
  }
}

// ── A: the legitimate path still works ─────────────────────────────────────────
{
  const { res, sends } = await request();
  check('A', 'paid session + owner address returns 200', res.status === 200, 'status ' + res.status);
  check('A', 'exactly one email is sent', sends.length === 1, 'sends=' + sends.length);
  check('A', 'it goes to the owner', sends[0]?.to?.[0] === OWNER, JSON.stringify(sends[0]?.to));
  check('A', 'it carries the report body', (sends[0]?.html || '').includes('PHI'), 'html missing');
}

// ── B: THE EXPLOIT. Valid session, attacker-supplied address. ──────────────────
{
  const { res, sends, json } = await request({ bodyEmail: ATTACKER });
  check('B', 'attacker address is refused 403', res.status === 403, 'status ' + res.status);
  check('B', 'NO email is sent at all', sends.length === 0, 'sends=' + sends.length);
  check('B', 'nothing was mailed to the attacker',
    !sends.some(s => (s.to || []).includes(ATTACKER)), 'attacker received mail');
  check('B', 'response does not leak the owner address',
    !JSON.stringify(json).toLowerCase().includes('buyer@'), JSON.stringify(json));
}
// Same exploit, casing tricks — must not open a bypass, and must not break the owner.
{
  const { res, sends } = await request({ bodyEmail: '  BUYER@EXAMPLE.COM ' });
  check('B', 'owner address still matches despite case/whitespace', res.status === 200, 'status ' + res.status);
  check('B', 'and is normalized to the stored address', sends[0]?.to?.[0] === OWNER, JSON.stringify(sends[0]?.to));
}

// ── C: unpaid / pending entitlement ────────────────────────────────────────────
for (const status of ['pending', 'failed', null]) {
  const { res, sends } = await request({ paymentRows: [{ payment_status: status }] });
  check('C', `payment_status=${status} is refused 403`, res.status === 403, 'status ' + res.status);
  check('C', `payment_status=${status} sends nothing`, sends.length === 0, 'sends=' + sends.length);
}

// ── D: nonexistent / invalid session ───────────────────────────────────────────
{
  const { res, sends } = await request({ reportRows: [] });
  check('D', 'no report row is refused', res.status === 404, 'status ' + res.status);
  check('D', 'no report row sends nothing', sends.length === 0, 'sends=' + sends.length);
}
{
  const { res, sends } = await request({ paymentRows: [] });
  check('D', 'report row with no assessment session is refused 403', res.status === 403, 'status ' + res.status);
  check('D', 'orphan report sends nothing', sends.length === 0, 'sends=' + sends.length);
}

// ── E: missing or unreadable authorization data fails closed ───────────────────
{
  const { res, sends } = await request({ reportRows: [{ email: '', report_html: REPORT_HTML }] });
  check('E', 'report row with blank owner email is refused 403', res.status === 403, 'status ' + res.status);
  check('E', 'blank owner sends nothing', sends.length === 0, 'sends=' + sends.length);
}
{
  const { res, sends } = await request({ paymentOk: false });
  check('E', 'unreadable entitlement table fails closed 403', res.status === 403, 'status ' + res.status);
  check('E', 'unreadable entitlement sends nothing', sends.length === 0, 'sends=' + sends.length);
}
{
  const { res, sends } = await request({ bodyEmail: '' });
  check('E', 'missing email in body is rejected 400', res.status === 400, 'status ' + res.status);
  check('E', 'missing email sends nothing', sends.length === 0, 'sends=' + sends.length);
}
{
  const { res, sends } = await request({ sessionId: '' });
  check('E', 'missing session_id is rejected 400', res.status === 400, 'status ' + res.status);
  check('E', 'missing session_id sends nothing', sends.length === 0, 'sends=' + sends.length);
}

console.log(`\nreport-email-authorization: ${checks - failures.length}/${checks} checks passed`);
for (const f of failures) console.log(`  FAIL [${f.group}] ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
process.exit(failures.length ? 1 : 0);

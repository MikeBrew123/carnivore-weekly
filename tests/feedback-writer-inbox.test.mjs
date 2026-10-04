// Site feedback form -> writer_inbox ledger (Brew, 2026-10-03).
// The daily writer-inbox-daily-check sweep reads writer_inbox; feedback-form
// messages used to go only to Brew's Gmail and were missed on 2026-09-27.
// Extracts the real handler from the worker and runs it with a mocked fetch.
//
// Run: node tests/feedback-writer-inbox.test.mjs
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../api/calculator-api.js', import.meta.url), 'utf8');
function extract(marker) {
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`not found: ${marker}`);
  const end = src.indexOf('\n}\n', start) + 2;
  return src.slice(start, end);
}
const chunk = [
  extract('function createErrorResponse('),
  extract('function isValidEmail('),
  'function addCorsHeaders(r) { return r; }',
  src.slice(src.indexOf('// ===== FEEDBACK HANDLER ====='), src.indexOf('// ===== DRIP SURVEY')),
].join('\n');
const handleFeedback = new Function(`${chunk}; return handleFeedback;`)();
const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r' };
const FB_ID = '11111111-2222-3333-4444-555555555555';

let calls = [];
function mockFetch({ inboxFails = false, inboxThrows = false } = {}) {
  calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url);
    calls.push({ url, body: opts.body ? JSON.parse(opts.body) : null });
    if (url.includes('/writer_inbox')) {
      if (inboxThrows) throw new Error('network down');
      if (inboxFails) return new Response('{"message":"boom"}', { status: 500 });
      return new Response(null, { status: 201 });
    }
    if (url.includes('/content_feedback')) {
      return new Response(JSON.stringify([{ id: FB_ID }]), { status: 201 });
    }
    return new Response('{}', { status: 200 });
  };
}
function req(body, origin = 'https://carnivoreweekly.com') {
  return new Request('https://w.test/api/v1/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}
const quiet = console.error; console.error = () => {};

let failed = 0;
function check(name, ok, detail = '') {
  if (ok) console.log(`PASS ${name}`);
  else { failed++; console.log(`FAIL ${name} ${detail}`); }
}
const inbox = () => calls.find(c => c.url.endsWith('/rest/v1/writer_inbox'));
const msg = 'Do you have a version of the calculator for kids?';

// 1. CW submission writes a ledger row with the right fields
mockFetch();
let res = await handleFeedback(req({ request_text: msg, email: 'Reader@Example.com' }), env);
let row = inbox()?.body;
check('cw: form returns 200', res.status === 200);
check('cw: writer_inbox insert attempted', !!row);
check('cw: site=cw', row?.site === 'cw', JSON.stringify(row));
check('cw: from_email is the visitor', row?.from_email === 'Reader@Example.com');
check('cw: subject Site feedback', row?.subject === 'Site feedback');
check('cw: needs_reply true, status new, to_writer sarah',
  row?.needs_reply === true && row?.status === 'new' && row?.to_writer === 'sarah');
check('cw: resend_inbound_id points at content_feedback row', row?.resend_inbound_id === `feedback:${FB_ID}`);
check('cw: to_address feedback@carnivoreweekly.com', row?.to_address === 'feedback@carnivoreweekly.com');
check('cw: Brew email still sent', calls.some(c => c.url.includes('api.resend.com/emails')
  && c.body.to.includes('iambrew@gmail.com') && c.body.reply_to === 'Reader@Example.com'));

// 2. Site from origin and from explicit body field
mockFetch();
await handleFeedback(req({ request_text: msg, email: 'a@b.co' }, 'https://www.ketodial.com'), env);
check('kd origin -> site=kd', inbox()?.body.site === 'kd');
mockFetch();
await handleFeedback(req({ request_text: msg, email: 'a@b.co' }, 'https://www.pescodial.com'), env);
check('pd origin -> site=pd', inbox()?.body.site === 'pd');
mockFetch();
await handleFeedback(req({ request_text: msg, email: 'a@b.co', site: 'pd' }), env);
check('body site=pd wins over cw origin', inbox()?.body.site === 'pd');

// 3. Insert failure must not break the form
mockFetch({ inboxFails: true });
res = await handleFeedback(req({ request_text: msg, email: 'a@b.co' }), env);
check('inbox 500: form still 200', res.status === 200 && (await res.json()).success === true);
check('inbox 500: Brew email still sent', calls.some(c => c.url.includes('api.resend.com')));
mockFetch({ inboxThrows: true });
res = await handleFeedback(req({ request_text: msg, email: 'a@b.co' }), env);
check('inbox throws: form still 200', res.status === 200);

// 4. Validation failures write nothing
mockFetch();
res = await handleFeedback(req({ request_text: 'short', email: 'a@b.co' }), env);
check('invalid feedback: 400 and no ledger row', res.status === 400 && !inbox());

console.error = quiet;
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);

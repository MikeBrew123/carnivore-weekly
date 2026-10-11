// Site feedback form on KetoDial and PescoDial (Brew, 2026-10-10).
// 1. The worker's handleFeedback saves the right site tag (CW's modal sends none -> 'cw'),
//    refuses unknown sites, and escapes reader text in the notification email.
// 2. The two copies of feedback.js are identical, and each site loads it with its own tag.
// Extracts handleFeedback from the worker and runs it with a mocked fetch, so it checks
// the real code, not a copy.
//
// Run: node tests/feedback-form.test.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url).pathname;
const src = readFileSync(join(root, 'api/calculator-api.js'), 'utf8');

function extract(sig) {
  const start = src.indexOf(sig);
  assert.ok(start >= 0, `${sig} not found`);
  return src.slice(start, src.indexOf('\n}\n', start) + 2);
}
const labelsLine = src.match(/const FEEDBACK_SITE_LABELS = .*;/);
assert.ok(labelsLine, 'FEEDBACK_SITE_LABELS not found');

const calls = [];
globalThis.fetch = async (url, opts) => {
  calls.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
  return new Response('{}', { status: 201 });
};
const handleFeedback = new Function(`
  ${labelsLine[0]}
  ${extract('function isPlausibleEmail(')}
  ${extract('function escapeHTML(')}
  function createErrorResponse(code, message, statusCode = 400) {
    return new Response(JSON.stringify({ code, message }), { status: statusCode });
  }
  ${extract('async function handleFeedback(')}
  return handleFeedback;`)();

const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r' };
async function post(body) {
  calls.length = 0;
  const req = new Request('https://w.test/api/v1/feedback', { method: 'POST', body: JSON.stringify(body) });
  const res = await handleFeedback(req, env);
  return { status: res.status, row: calls.find(c => c.url.includes('content_feedback'))?.body,
           mail: calls.find(c => c.url.includes('resend'))?.body };
}

const note = 'Could you add more dairy-free dinners please?';
let r = await post({ request_text: note, email: 'reader@example.com' });
assert.equal(r.status, 200);
assert.equal(r.row.site, 'cw', 'CW modal sends no site, row must be cw');
assert.match(r.mail.subject, /Carnivore Weekly/);

r = await post({ request_text: note, email: 'reader@example.com', site: 'kd' });
assert.equal(r.row.site, 'kd');
assert.match(r.mail.subject, /KetoDial/);

r = await post({ request_text: note, email: 'reader@example.com', site: 'pd' });
assert.equal(r.row.site, 'pd');
assert.match(r.mail.subject, /PescoDial/);

for (const bad of ['xx', 'toString', '__proto__', '']) {
  r = await post({ request_text: note, email: 'reader@example.com', site: bad });
  assert.equal(r.status, 400, `site ${JSON.stringify(bad)} must be refused`);
  assert.equal(r.row, undefined, `site ${JSON.stringify(bad)} must not be saved`);
}

r = await post({ request_text: '<img src=x onerror=alert(1)> please help', email: 'reader@example.com', site: 'kd' });
assert.ok(!r.mail.html.includes('<img'), 'reader text must be escaped in the notification email');

// Front end: one file, two identical copies, each site tagged correctly.
const pdJs = readFileSync(join(root, 'pescodial/static/js/feedback.js'), 'utf8');
assert.ok(pdJs.includes('/api/v1/feedback'), 'feedback.js must post to the shared endpoint');
const base = readFileSync(join(root, 'pescodial/templates/base.html'), 'utf8');
assert.ok(base.includes('<script src="/js/feedback.js" data-site="pd" defer></script>'), 'PD base template must load feedback.js');
const kdGen = readFileSync(join(root, 'ketodial/scripts/generate_kd_' + 'blog.py'), 'utf8');
assert.ok(kdGen.includes('data-site="kd"'), 'new KD posts must load feedback.js');

// ketodial/public is a submodule; CI jobs that skip submodules check the rest only.
if (!existsSync(join(root, 'ketodial/public/index.html'))) {
  console.log('feedback-form: ketodial/public submodule not checked out, KD page checks skipped');
} else {
  const kdJs = readFileSync(join(root, 'ketodial/public/js/feedback.js'), 'utf8');
  assert.equal(kdJs, pdJs, 'ketodial/public/js/feedback.js must match pescodial/static/js/feedback.js');
  const missing = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (name !== 'components' && name !== 'node_modules') walk(p); continue; }
      if (!name.endsWith('.html') || /^[0-9a-f]{32}/.test(name)) continue;
      const html = readFileSync(p, 'utf8');
      if (html.includes('</body>') && !html.includes('src="/js/feedback.js" data-site="kd"')) missing.push(p);
    }
  })(join(root, 'ketodial/public'));
  assert.deepEqual(missing, [], 'every KD page must load feedback.js');
}

console.log('feedback-form: all checks pass');

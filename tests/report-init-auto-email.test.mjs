/**
 * POST /api/v1/calculator/report/init — the buyer is emailed their report.
 *
 * THE DEFECT (found 2026-10-20). The report email was only ever sent by the "Email me"
 * button on the results page. A buyer who paid $29 on 2026-10-17, finished Step 4 and
 * had a report built never tapped it, so nothing reached their inbox.
 *
 * NO EMAIL IS SENT. globalThis.fetch is stubbed; Resend calls are captured.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worker = (await import('file://' + path.join(ROOT, 'api', 'calculator-api.js') + '?autoemail=' + Date.now())).default;

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') => (ok ? passed++ : failures.push({ group, label, detail }));

const COMPLIANT =
  'Your daily numbers are listed below. People report a wide range of first-week ' +
  'experiences, and yours may differ. Take these figures to your doctor before you start.';

const ENV = {
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  ANTHROPIC_API_KEY: 'sk-fixture',
  RESEND_API_KEY: 'stub-resend-key',
};
const SESSION = {
  id: '00000000-0000-4000-8000-0000000e4a11',
  email: 'Buyer@Example.com',
  payment_status: 'completed',
  diet_type: 'Carnivore',
  form_data: {
    sex: 'male', age: 46, heightFeet: 5, heightInches: 11, weight: 230, goalWeight: 200,
    goal: 'lose', deficit: 20, diet: 'Carnivore', selectedProtocol: 'Carnivore',
    firstName: 'Auto', lastName: 'Email', budget: 'flexible', lifestyle: 'sedentary',
    exercise: '1-2', carnivoreExperience: 'new', goals: ['weightloss'], medications: '',
    conditions: ['none'], symptoms: [],
  },
};

async function run({ existingReport = false, session = SESSION } = {}) {
  const realFetch = globalThis.fetch;
  const sends = [];
  const waits = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.anthropic.com')) {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: COMPLIANT }] }) };
    }
    if (u.includes('api.resend.com')) {
      sends.push(JSON.parse(opts.body || '{}'));
      return { ok: true, status: 200, json: async () => ({ id: 'stub' }), text: async () => '' };
    }
    if (u.includes('/rest/v1/cw_assessment_sessions')) {
      return { ok: true, status: 200, json: async () => [session], text: async () => '' };
    }
    if (u.includes('/rest/v1/calculator_reports')) {
      const rows = existingReport && (!opts.method || opts.method === 'GET')
        ? [{ id: 'r1', access_token: 'tok' }] : [];
      return { ok: true, status: 201, json: async () => rows, text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const quiet = console.log;
  console.log = () => {};
  try {
    const res = await worker.fetch(new Request('https://api.test/api/v1/calculator/report/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id }),
    }), ENV, { waitUntil(p) { waits.push(p); } });
    const json = await res.json().catch(() => ({}));
    await Promise.all(waits);
    return { res, json, sends, waits };
  } finally {
    console.log = quiet;
    globalThis.fetch = realFetch;
  }
}

// GROUP A: a fresh paid report is emailed once, to the stored owner.
{
  const { res, json, sends, waits } = await run();
  check('A', 'report is generated', res.status === 200 && json.status === 'generated', `HTTP ${res.status} ${json.status}`);
  check('A', 'exactly one email is sent', sends.length === 1, `sends=${sends.length}`);
  check('A', 'it goes to the session owner', sends[0]?.to?.[0] === 'buyer@example.com', JSON.stringify(sends[0]?.to));
  check('A', 'it is the CW report email', sends[0]?.subject === 'Your Personalized Carnivore Protocol', sends[0]?.subject);
  check('A', 'it carries the report body', String(sends[0]?.html || '').length > 1000, `len=${String(sends[0]?.html || '').length}`);
  check('A', 'the send is handed to waitUntil, not blocking the response', waits.length >= 1, `waits=${waits.length}`);
}

// GROUP B: a retry that finds the report already built sends nothing.
{
  const { json, sends } = await run({ existingReport: true });
  check('B', 'retry returns already_generated', json.status === 'already_generated', json.status);
  check('B', 'retry sends no second email', sends.length === 0, `sends=${sends.length}`);
}

// GROUP C: an unpaid session gets no report and no email.
{
  const { res, sends } = await run({ session: { ...SESSION, payment_status: 'pending' } });
  check('C', 'unpaid is refused', res.status === 402, `HTTP ${res.status}`);
  check('C', 'unpaid sends no email', sends.length === 0, `sends=${sends.length}`);
}

// GROUP D: no owner address, no send.
{
  const { sends } = await run({ session: { ...SESSION, email: '' } });
  check('D', 'a session with no email sends nothing', sends.length === 0, `sends=${sends.length}`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL [${f.group}] ${f.label} :: ${f.detail}`);
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`report-init-auto-email: ${passed} checks passed`);

/**
 * A REAL Postgres, built from the repository's own checked-in migrations, with a
 * PostgREST-shaped front door so the shipped worker can talk to it unmodified.
 *
 * WHY THIS EXISTS. On 2026-09-09 the Audit 2B deploy took the KetoDial calculator
 * down: the client sends lifestyle_activity as a TDEE multiplier (1.2 .. 1.9) and
 * the column's CHECK constraint accepts five words. Every POST /session returned
 * 500. Nothing caught it, because every test in the repository either mocked the
 * database or asserted against a JavaScript restatement of the constraint. A
 * restatement cannot disagree with itself; only the schema can.
 *
 * So this harness runs PGlite — genuine PostgreSQL compiled to WebAssembly, with
 * CHECK constraints enforced by Postgres itself — and applies the actual migration
 * files. No Docker, no service container, no credentials, and CI never touches
 * production.
 *
 * HONEST LIMITATION. PostgREST itself is not run. The shim below translates the
 * handful of request shapes the worker actually makes (insert, eq-filtered select,
 * eq-filtered patch) into SQL. The HTTP dialect is emulated; the schema, the types
 * and every constraint are real. A defect in PostgREST's own behaviour would not be
 * caught here, but a client-vs-schema vocabulary mismatch — the thing that broke
 * production — cannot hide.
 */
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS_IN_ORDER = [
  // Creates payment_tiers and calculator_sessions_v2 with the constraints that
  // matter: lifestyle_activity, goal, diet_type, sex, weight_unit, dairy_tolerance,
  // cooking_skill, meal_prep_time, budget, family_situation, step_completed, email.
  '20260103180000_create_calculator_payment_system.sql',
  // `source`, which is how KetoDial rows are told apart from Carnivore Weekly's.
  '20260531_add_source_column.sql',
  // utm_* and attribution columns the client sends on create.
  '20260529_add_attribution_and_webhook_dedup.sql',
  // Audit 2B: kidney_status, reports_delivered_at.
  '20260908_kd_audit2b_kidney_status_and_delivery_marker.sql',
  // Audit 2B: resume_token, resume_token_expires_at.
  '20260909_kd_audit2b_resume_token.sql',
];

/** Statements that need a live Supabase (roles, RLS grants) and have no bearing on
 *  whether a payload satisfies a CHECK constraint. Skipping them is what lets the
 *  real migration files run unedited. */
function usable(sql) {
  return splitStatements(sql)
    .filter((s) => !/^\s*(GRANT|REVOKE|ALTER\s+DEFAULT\s+PRIVILEGES|CREATE\s+POLICY|DROP\s+POLICY|ALTER\s+TABLE\s+\S+\s+ENABLE\s+ROW)/i.test(s))
    .filter((s) => !/\bauth\.|\bservice_role\b|\banon\b|\bauthenticated\b/i.test(s));
}

/**
 * Split on semicolons that are NOT inside a dollar-quoted body, a single-quoted
 * string or a line comment. A naive split on ';' tears `DO $$ ... END $$;` in half,
 * which silently dropped the kidney_status CHECK constraint — the migration would
 * "apply" while the constraint it exists to add was never created. Precisely the
 * class of invisible gap this whole file is here to close.
 */
function splitStatements(sql) {
  const out = [];
  let buf = '';
  let i = 0;
  let dollarTag = null;
  let inSingle = false;
  while (i < sql.length) {
    const rest = sql.slice(i);
    if (!inSingle && !dollarTag && rest.startsWith('--')) {
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl + 1;
      continue;
    }
    if (!inSingle) {
      const tag = /^\$[A-Za-z_]*\$/.exec(rest);
      if (tag) {
        if (!dollarTag) dollarTag = tag[0];
        else if (dollarTag === tag[0]) dollarTag = null;
        buf += tag[0];
        i += tag[0].length;
        continue;
      }
    }
    const ch = sql[i];
    if (!dollarTag && ch === "'") inSingle = !inSingle;
    if (ch === ';' && !dollarTag && !inSingle) {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export async function createSchema(repoRoot) {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = await PGlite.create();
  const applied = [];
  for (const name of MIGRATIONS_IN_ORDER) {
    const file = path.join(repoRoot, 'supabase', 'migrations', name);
    const sql = fs.readFileSync(file, 'utf8');
    let ran = 0;
    for (const stmt of usable(sql)) {
      try { await db.exec(stmt + ';'); ran++; }
      catch (err) {
        // A statement that depends on something outside this table's world is not a
        // reason to abandon the schema, but it must be visible rather than silent.
        applied.push({ name, skipped: err.message.split('\n')[0].slice(0, 120) });
      }
    }
    applied.push({ name, statements: ran });
  }
  return { db, applied };
}

/**
 * Translate the worker's PostgREST calls into SQL. Supports exactly what the worker
 * uses: POST insert, GET with eq filters + limit, PATCH with eq filters.
 */
export function postgrestShim(db, { onWrite } = {}) {
  const BASE = 'https://schema-contract.test';
  const parseFilters = (url) => {
    const out = [];
    for (const [k, v] of url.searchParams) {
      if (k === 'limit' || k === 'select' || k === 'order') continue;
      const m = /^eq\.(.*)$/.exec(v);
      if (m) out.push([k, m[1]]);
    }
    return out;
  };
  const where = (filters, params) =>
    filters.length
      ? ' WHERE ' + filters.map(([k]) => `${k} = $${params.push(filters.find(f => f[0] === k)[1])}`).join(' AND ')
      : '';

  return {
    BASE,
    async fetch(url, opts = {}) {
      const u = new URL(String(url));
      // Fire-and-forget RPCs (the newsletter upsert) are not part of the schema
      // contract under test and the worker already swallows their failures. Answer
      // them successfully so the run is not noisy with irrelevant errors.
      if (u.pathname.startsWith('/rest/v1/rpc/')) return jsonRes(200, {});
      const table = u.pathname.replace('/rest/v1/', '').split('?')[0];
      const method = (opts.method || 'GET').toUpperCase();
      const body = opts.body ? JSON.parse(opts.body) : null;

      try {
        if (method === 'POST') {
          const cols = Object.keys(body);
          const params = cols.map((c) => body[c]);
          const sql = `INSERT INTO public.${table} (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`;
          const res = await db.query(sql, params);
          if (onWrite) onWrite({ method, table, body });
          return jsonRes(200, res.rows);
        }
        if (method === 'PATCH') {
          const filters = parseFilters(u);
          const sets = Object.keys(body);
          const params = [];
          const setSql = sets.map((c) => `${c} = $${params.push(body[c])}`).join(', ');
          const whereSql = filters.map(([k, v]) => `${k} = $${params.push(v)}`).join(' AND ');
          const sql = `UPDATE public.${table} SET ${setSql}${whereSql ? ' WHERE ' + whereSql : ''} RETURNING *`;
          const res = await db.query(sql, params);
          if (onWrite) onWrite({ method, table, body });
          return jsonRes(200, res.rows);
        }
        // GET
        const filters = parseFilters(u);
        const params = [];
        const whereSql = filters.map(([k, v]) => `${k} = $${params.push(v)}`).join(' AND ');
        const limit = u.searchParams.get('limit');
        const sql = `SELECT * FROM public.${table}${whereSql ? ' WHERE ' + whereSql : ''}${limit ? ` LIMIT ${Number(limit)}` : ''}`;
        const res = await db.query(sql, params);
        return jsonRes(200, res.rows);
      } catch (err) {
        // Shaped like PostgREST's own error body, which is what the worker logs.
        return jsonRes(500, { code: err.code || '', message: err.message, details: '' });
      }
    },
  };
}

function jsonRes(status, payload) {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(text),
    text: async () => text,
  };
}

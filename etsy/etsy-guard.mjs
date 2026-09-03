// In-process Etsy write guard. Installed by token.mjs, which every listing-write
// script imports, so it covers every script without editing any of them.
//
// Wraps globalThis.fetch. Any POST/PUT/PATCH/DELETE to openapi.etsy.com must:
//   1. have a Live Changes Log row dated TODAY that names the listing id
//      (shop-level writes such as creating a listing need any Etsy row dated today), and
//   2. pass assertEditCap (3 distinct listings per rolling 7 days).
// Rows tagged [cap-exempt <deck>] dated today lift both checks for that day.
// Fails closed: if the log cannot be read, no write goes out. No env bypass, by design.
// GETs, other hosts (Supabase, api.etsy.com OAuth, Replicate) are untouched.
import { readWindow, assertEditCap, LOG_PATH } from './edit-cap.mjs';

const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function checkEtsyWrite(method, url, opts = {}) {
  let u;
  try { u = new URL(String(url)); } catch { return; }
  if (u.hostname !== 'openapi.etsy.com') return;
  if (!WRITE.has(String(method).toUpperCase())) return;
  if (u.pathname.includes('/oauth/')) return;

  const w = readWindow(undefined, opts);            // throws if the log is unreadable (fail closed)
  const exemptToday = w.exemptions.some((e) => e.date === w.today);
  const m = u.pathname.match(/\/listings\/(\d{6,})(\/|$)/);
  if (m) {
    const id = m[1];
    const dates = w.listings.get(id) || [];
    if (!dates.includes(w.today) && !exemptToday) {
      throw new Error(
        `ETSY GUARD: ${method} ${u.pathname} refused. No Live Changes Log row dated ${w.today} names listing ${id}. ` +
        `Write the row FIRST (date | where | what | why | undo), then retry. Log: ${opts.logPath || LOG_PATH}`
      );
    }
    if (!exemptToday) assertEditCap([id], w.today, opts);   // throws past the cap; the row you just wrote is counted
  } else {
    const rowToday =
      exemptToday ||
      w.unattributed.some((x) => x.date === w.today) ||
      [...w.listings.values()].some((ds) => ds.includes(w.today));
    if (!rowToday) {
      throw new Error(
        `ETSY GUARD: ${method} ${u.pathname} refused. No Etsy row dated ${w.today} in the Live Changes Log. Write the row FIRST, then retry.`
      );
    }
  }
}

export function installEtsyGuard() {
  if (globalThis.__etsyGuardInstalled) return;
  const orig = globalThis.fetch;
  globalThis.fetch = async function guardedFetch(input, init) {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input && input.url;
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    checkEtsyWrite(method, url);
    return orig.call(this, input, init);
  };
  globalThis.__etsyGuardInstalled = true;
}

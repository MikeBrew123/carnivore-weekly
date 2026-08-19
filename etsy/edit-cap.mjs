#!/usr/bin/env node
/**
 * Etsy edit cap preflight. READ ONLY. Makes no Etsy call, ever.
 *
 * Rule (Brew approved 2026-08-18, Command Deck 07de35c8, in force 2026-08-19):
 *   1. At most 3 DISTINCT Etsy listings may be edited in any rolling 7 day window.
 *   2. The Live Changes Log row is written BEFORE the call to Etsy, not after.
 *
 * Because the row is written first, this script counting the log IS the counter.
 * It reads the vault log, counts distinct listing ids touched in the trailing
 * 7 days, and exits 1 if the edit you are about to make would break the cap.
 *
 * Usage:
 *   node etsy/edit-cap.mjs                      # report this week's usage
 *   node etsy/edit-cap.mjs 4464217679 4495089980  # check before editing these
 *
 * Or from a script:
 *   import { assertEditCap } from './edit-cap.mjs';
 *   await assertEditCap([listingId]);   // throws if the cap would break
 *
 * Escape hatch: a log row containing "[cap-exempt <deck-id>]" is not counted.
 * That is for batches Brew approved as one job before the cap took force. Every
 * exemption is echoed in this script's output so it cannot be used quietly.
 */

import { readFileSync } from 'fs';

export const LOG_PATH = '/Users/mbrew/Documents/Brew-Vault/00-Core/Live-Changes-Log.md';
export const CAP = 3;
export const WINDOW_DAYS = 7;
export const IN_FORCE_FROM = '2026-08-19';

const DATE_RE = /^(\d{4}-\d{2}-\d{2})/;
const LISTING_ID_RE = /\b\d{10}\b/g;      // Etsy listing ids are 10 digits; file ids are 13, and \b keeps us out of those
const EXEMPT_RE = /\[cap-exempt\s+([0-9a-f]{6,})\]/i;

function localISODate(d) {
  // Local (Pacific on this machine) calendar date, not UTC.
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

function shiftDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Parse the log and return what the trailing window holds. */
export function readWindow(today = localISODate(new Date()), opts = {}) {
  // opts.logPath / opts.inForceFrom exist so the self-test can drive this against a
  // fixture. They are NOT read from the environment: a guard with an env bypass is not a guard.
  const logPath = opts.logPath || LOG_PATH;
  const inForceFrom = opts.inForceFrom || IN_FORCE_FROM;
  let text;
  try {
    text = readFileSync(logPath, 'utf8');
  } catch (e) {
    throw new Error(
      `Cannot read the Live Changes Log at ${logPath}. The cap cannot be checked, so do not edit ` +
      `any listing. Original error: ${e.message}`
    );
  }

  const windowStart = shiftDays(today, -(WINDOW_DAYS - 1));
  const floor = windowStart > inForceFrom ? windowStart : inForceFrom;

  const listings = new Map();   // listing id -> array of log dates
  const exemptions = [];
  const unattributed = [];      // Etsy rows in window naming no listing id

  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] is '' from the leading pipe; cells[1] = date, [2] = where, [3] = what
    const m = cells[1] && cells[1].match(DATE_RE);
    if (!m) continue;
    const date = m[1];
    if (date < floor || date > today) continue;

    const body = cells.slice(2).join(' ');
    if (!/etsy/i.test(body) && !/etsy/i.test(cells[2] || '')) continue;

    const exempt = body.match(EXEMPT_RE);
    if (exempt) {
      exemptions.push({ date, deck: exempt[1], where: cells[2] });
      continue;
    }

    const ids = [...new Set(body.match(LISTING_ID_RE) || [])];
    if (ids.length === 0) {
      unattributed.push({ date, where: cells[2] });
      continue;
    }
    for (const id of ids) {
      if (!listings.has(id)) listings.set(id, []);
      listings.get(id).push(date);
    }
  }

  return { today, windowStart, floor, listings, exemptions, unattributed };
}

/**
 * Throw if editing `pendingIds` would push the rolling window past CAP.
 * Listings already logged in the window are free, re-editing one you already
 * touched this week costs nothing extra.
 */
export function assertEditCap(pendingIds = [], today = localISODate(new Date()), opts = {}) {
  const w = readWindow(today, opts);
  const already = new Set(w.listings.keys());
  const pending = [...new Set(pendingIds.map(String))];
  const fresh = pending.filter((id) => !already.has(id));
  // Etsy rows we could not attribute to a listing id each count as one listing.
  const total = already.size + w.unattributed.length + fresh.length;

  if (total > CAP) {
    throw new Error(
      `ETSY EDIT CAP: this would make ${total} listings in the ${WINDOW_DAYS} day window ` +
      `${w.windowStart} to ${w.today}, and the cap is ${CAP}. Already logged: ` +
      `${[...already].join(', ') || 'none'}${w.unattributed.length ? ` plus ${w.unattributed.length} unattributed Etsy row(s)` : ''}. ` +
      `New in this edit: ${fresh.join(', ') || 'none'}. Stop and ask Brew, or wait for the window to roll.`
    );
  }
  return { total, cap: CAP, already: [...already], fresh, window: [w.windowStart, w.today] };
}

function main() {
  const pending = process.argv.slice(2).filter((a) => /^\d{6,}$/.test(a));
  const w = readWindow();

  console.log(`Etsy edit cap: ${CAP} listings per ${WINDOW_DAYS} days (deck 07de35c8, in force ${IN_FORCE_FROM})`);
  console.log(`Window: ${w.windowStart} to ${w.today}  (counting from ${w.floor})`);
  console.log(`Log: ${LOG_PATH}`);
  console.log('');

  if (w.listings.size === 0) {
    console.log('Listings edited in window: none');
  } else {
    console.log(`Listings edited in window: ${w.listings.size}`);
    for (const [id, dates] of w.listings) console.log(`  ${id}  (${dates.join(', ')})`);
  }
  for (const u of w.unattributed) {
    console.log(`  WARNING unattributed Etsy row ${u.date}: "${u.where}" counts as 1 listing`);
  }
  for (const e of w.exemptions) {
    console.log(`  EXEMPT ${e.date} deck ${e.deck}: "${e.where}" not counted`);
  }
  console.log('');

  try {
    const r = assertEditCap(pending);
    if (pending.length) {
      console.log(`OK. Editing ${pending.join(', ')} would make ${r.total} of ${CAP}.`);
    } else {
      console.log(`Headroom: ${CAP - r.total} more listing(s) this window.`);
    }
    console.log('Reminder: write the Live Changes Log row BEFORE the call to Etsy.');
    process.exit(0);
  } catch (e) {
    console.error(`\n${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('edit-cap.mjs')) main();

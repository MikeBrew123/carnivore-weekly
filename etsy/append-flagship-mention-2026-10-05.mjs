#!/usr/bin/env node
// Flagship mention on the bestseller — listing 4464219356 (Keto Diet Food List).
// Approved by Brew in chat 2026-09-29 ("go for it and lets see what happens"),
// shipped 2026-10-05 once the edit cap rolled. Evidence in
// docs/archive/reports-archive/2026-09-29-keto-flagship-14day-read.md
//
// DRY RUN BY DEFAULT. It sends nothing until you pass --apply.
//
// SAFETY: modeled on starter-kit-keyword-apply.mjs. updateListing wiped 7 of 8
// images on two listings on 2026-08-10, so this sends EXACTLY ONE FIELD,
// `description`, built as the live description + "\n\n" + LINE. The revert copy
// is etsy/_build/4464219356-pre-2026-10-05.json, saved before this runs.
//
//   cd etsy && node append-flagship-mention-2026-10-05.mjs            # dry run
//   cd etsy && node append-flagship-mention-2026-10-05.mjs --apply    # writes description only
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP_ID = 63916912;
const LISTING_ID = 4464219356;
const LINE =
  'Want the plan that goes with this list? Look in our shop for the 30-Day Keto Meal Plan & Food Guide: 30 days of menus, weekly grocery lists, and eat, limit, avoid charts.';

// The complete set of fields this script is allowed to send. Do not extend it.
const FIELDS = ['description'];

const APPLY = process.argv.includes('--apply');

const token = await getEtsyToken();
const headers = etsyHeaders(token);

// ── read the live state and compare it to the saved revert copy ──────────
const res = await fetch(`https://openapi.etsy.com/v3/application/listings/${LISTING_ID}`, { headers });
const before = await res.json();
if (!res.ok) throw new Error(`read failed ${res.status}: ${JSON.stringify(before)}`);
if (String(before.shop_id) !== String(SHOP_ID)) {
  throw new Error(`listing ${LISTING_ID} is not in shop ${SHOP_ID}. Refusing.`);
}
const saved = JSON.parse(
  readFileSync(path.join(__dirname, '_build', `${LISTING_ID}-pre-2026-10-05.json`), 'utf8'),
);
if (before.description !== saved.listing.description) {
  throw new Error('live description differs from the saved revert copy. Re-dump before editing.');
}
if (before.description.includes('30-Day Keto Meal Plan')) {
  throw new Error('description already mentions the flagship. Nothing to do.');
}

const newDescription = `${before.description}\n\n${LINE}`;
console.log(`listing ${LISTING_ID} (${before.state})`);
console.log(`description: ${before.description.length} -> ${newDescription.length} chars`);
console.log(`appended: ${LINE}`);
console.log(`fields sent: ${FIELDS.join(', ')}`);

if (!APPLY) {
  console.log('\nDRY RUN. Nothing was sent. Re-run with --apply to write.');
  process.exit(0);
}

const body = new URLSearchParams();
body.append('description', newDescription);
const keys = [...body.keys()];
if (keys.length !== 1 || keys[0] !== 'description') {
  throw new Error(`payload must be exactly one key (description), got: ${keys.join(', ')}`);
}

const patch = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`,
  {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  },
);
const out = await patch.json().catch(() => ({}));
console.log(patch.ok ? 'description updated' : `PATCH FAILED ${patch.status}: ${JSON.stringify(out)}`);
if (!patch.ok) process.exit(1);

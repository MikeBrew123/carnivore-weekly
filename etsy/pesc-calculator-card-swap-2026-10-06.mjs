#!/usr/bin/env node
// Pescatarian listings, 2026-10-06. Brew: "make the swap, people who buy the Pesco products won't
// have interest in the Keto or Carnivore redirects" (ledger 2026-10-03 decided the PescoDial card).
// On 4464217699, 4513518746 and 4540695590: add Free-PescoDial-Calculator-50-Percent-Off.pdf in the
// slot of Free-KetoDial-Calculator-25-Percent-Off.pdf, then remove the KetoDial card. Upload first,
// delete second, so no listing is ever without a calculator card. The Low-Mercury seafood guide stays.
// The KetoDial card still exists locally (etsy/products/pdfs/bonus-insert-kd-calculator.pdf and the
// Etsy-side file name), so this is reversible. Titles, tags, prices, descriptions, images untouched.
//   node pesc-calculator-card-swap-2026-10-06.mjs          # dry run, reads only
//   node pesc-calculator-card-swap-2026-10-06.mjs --apply  # writes
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP = 63916912;
const LISTINGS = [4464217699, 4513518746]; // 4540695590 waits for the 7-day cap (Live Changes Log), planned 2026-10-12
const OLD = 'Free-KetoDial-Calculator-25-Percent-Off.pdf';
const NEW = 'Free-PescoDial-Calculator-50-Percent-Off.pdf';
const pdf = readFileSync(path.resolve(__dirname, 'products/pdfs', NEW));
const apply = process.argv.includes('--apply');
const headers = etsyHeaders(await getEtsyToken());
const api = 'https://openapi.etsy.com/v3/application';
const files = async (id) => { const r = await fetch(`${api}/shops/${SHOP}/listings/${id}/files`, { headers }); const j = await r.json(); if (!r.ok) throw new Error(`${id} ${r.status} ${JSON.stringify(j)}`); return j.results || []; };
const show = (a) => a.map((f) => `${f.rank}:${f.filename}`).join(' | ');

const plan = [];
for (const id of LISTINGS) {
  const fs_ = await files(id);
  console.log(`${id} files: ${show(fs_)}`);
  const old = fs_.find((f) => f.filename === OLD), done = fs_.find((f) => f.filename === NEW);
  if (!old && !done) throw new Error(`${id}: neither ${OLD} nor ${NEW} attached, unexpected state`);
  plan.push({ id, old, done });
}
if (!apply) { console.log('\nDRY RUN. Nothing changed. Re-run with --apply.'); process.exit(0); }

let shared = null;
for (const p of plan) {
  const base = `${api}/shops/${SHOP}/listings/${p.id}/files`;
  if (!p.done) {
    const form = new FormData();
    if (shared) form.append('listing_file_id', String(shared));
    else { form.append('file', new Blob([pdf], { type: 'application/pdf' }), NEW); form.append('name', NEW); }
    form.append('rank', String(p.old.rank));
    const r = await fetch(base, { method: 'POST', headers, body: form });
    const j = await r.json();
    if (!r.ok) throw new Error(`${p.id} upload failed ${r.status} ${JSON.stringify(j)}`);
    shared = shared || j.listing_file_id;
    console.log(`${p.id}: added ${NEW} (file id ${j.listing_file_id})`);
  } else shared = shared || p.done.listing_file_id;
  const now = await files(p.id);
  if (!now.find((f) => f.filename === NEW)) throw new Error(`${p.id}: new card not visible after upload, NOT deleting old`);
  const old = now.find((f) => f.filename === OLD);
  if (old) {
    const d = await fetch(`${base}/${old.listing_file_id}`, { method: 'DELETE', headers });
    if (!d.ok) throw new Error(`${p.id} delete failed ${d.status} ${await d.text()}`);
    console.log(`${p.id}: removed ${OLD}`);
  }
  console.log(`${p.id} AFTER: ${show(await files(p.id))}`);
}

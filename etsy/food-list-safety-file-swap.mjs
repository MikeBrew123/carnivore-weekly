#!/usr/bin/env node
/**
 * Replace the two delivered landscape PDFs on listing 4464217665 (Diet Food List Printable
 * Bundle, CA$7.99) so buyers stop receiving the ungated electrolyte protocol in the Quick Start
 * panel: "Sodium: 2-3 tsp salt/day", "Magnesium: bone broth or glycinate 400mg", "add lite salt
 * if cramping", and "Signs you need more: headache, fatigue, cramps, dizziness".
 *
 * Repaired source: products/templates/diet-food-list-landscape.html plus build-landscape-v3.py,
 * so a regeneration cannot restore the defect (Sarah, 8 edits, main d887f29e).
 * Rebuilt with: node convert-food-lists.mjs
 *
 * THIS MAKES A PUBLIC SHOP CHANGE. Two-phase, refuses to act without an explicit flag, same
 * shape as chart-file-swap.mjs and keto-bundle-safety-file-swap.mjs and for the same reason:
 * Etsy exposes no download endpoint for a seller's own listing files, so a delete is one way.
 *
 *   node food-list-safety-file-swap.mjs              # dry run, reads only. Default.
 *   node food-list-safety-file-swap.mjs --upload     # phase 1: ADD the repaired PDFs. Reversible.
 *   node food-list-safety-file-swap.mjs --remove-old # phase 2: DELETE the old PDFs. ONE WAY.
 *
 * Unlike the two listings repaired earlier today, this one HAS a real sale: units_90d read 1 from
 * 2026-07-14 and fell to 0 on 2026-08-26, so on a rolling 90-day window the purchase was around
 * late May 2026 and one customer holds the old artifact. No buyer contact is made or proposed.
 * Nothing but the digital files is touched: no title, price, tag, image or description.
 */
import { readFileSync, statSync } from 'fs';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const SHOP = 63916912;
const LISTING = 4464217665;
const SWAPS = [
  { pdf: 'products/pdfs/diet-food-list-landscape-a4.pdf',     name: 'diet-food-list-landscape-a4.pdf',     oldFileId: 1469947956323, rank: 3 },
  { pdf: 'products/pdfs/diet-food-list-landscape-letter.pdf', name: 'diet-food-list-landscape-letter.pdf', oldFileId: 1468776778536, rank: 4 },
];

const mode = process.argv.includes('--remove-old') ? 'remove'
           : process.argv.includes('--upload') ? 'upload' : 'dry';
const H = etsyHeaders(await getEtsyToken());
const base = `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${LISTING}/files`;
const list = async () => {
  const r = await fetch(base, { headers: H });
  if (!r.ok) throw new Error(`list: HTTP ${r.status} ${await r.text()}`);
  return (await r.json()).results || [];
};

console.log(`mode: ${mode}   listing ${LISTING}\n`);
let files = await list();
files.forEach((f) => console.log(`   rank ${f.rank}  ${f.filename}  ${f.filesize}  id=${f.listing_file_id}`));
console.log();

for (const s of SWAPS) {
  const bytes = statSync(s.pdf).size;
  console.log(`${s.name}  (local ${bytes} bytes, replacing id=${s.oldFileId})`);

  if (mode === 'upload') {
    // Etsy caps a listing at 5 files. Replacing two on a listing that already holds four means
    // the second upload is refused until a slot is freed, so this runs as
    // upload -> remove-old -> upload -> remove-old. Skip anything already replaced, otherwise the
    // second pass attaches a duplicate of the first file.
    files = await list();
    if (files.some((f) => f.filename === s.name && f.listing_file_id !== s.oldFileId)) {
      console.log('   already replaced, skipping'); continue;
    }
    const fd = new FormData();
    fd.append('file', new Blob([readFileSync(s.pdf)], { type: 'application/pdf' }), s.name);
    fd.append('name', s.name);
    fd.append('rank', String(s.rank));
    const r = await fetch(base, { method: 'POST', headers: { 'x-api-key': H['x-api-key'], Authorization: H.Authorization }, body: fd });
    const txt = await r.text();
    if (!r.ok) { console.log(`   UPLOAD FAILED: HTTP ${r.status} ${txt}`); continue; }
    const j = JSON.parse(txt);
    console.log(`   uploaded id=${j.listing_file_id} ${j.filename} ${j.filesize}`);
  }

  if (mode === 'remove') {
    files = await list();
    const old = files.find((f) => f.listing_file_id === s.oldFileId);
    if (!old) { console.log('   old file already gone'); continue; }
    // Never let the delete be the thing that leaves the listing without this document.
    const replacement = files.find((f) => f.filename === s.name && f.listing_file_id !== s.oldFileId);
    if (!replacement) { console.log(`   REFUSING to delete: no replacement named ${s.name} attached yet. Run --upload first.`); continue; }
    const r = await fetch(`${base}/${s.oldFileId}`, { method: 'DELETE', headers: H });
    console.log(`   delete id=${s.oldFileId}: HTTP ${r.status}`);
  }
}

if (mode !== 'dry') {
  console.log('\nnow:');
  (await list()).forEach((f) => console.log(`   rank ${f.rank}  ${f.filename}  ${f.filesize}  id=${f.listing_file_id}`));
}

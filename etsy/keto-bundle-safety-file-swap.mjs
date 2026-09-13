#!/usr/bin/env node
/**
 * Replace the delivered keto food-list PDF on the two listings that ship it, so buyers stop
 * receiving the ungated "Daily Electrolyte Targets" table (sodium 3,000-5,000 mg, potassium
 * 2,600/3,400 mg, magnesium 300-400 mg, no medication or condition gate).
 *
 *   4514204763  Keto Bundle        CA$4.99   rank 2  KetoFoodListBundle.pdf
 *   4532542805  Keto Starter Kit   CA$21.99  rank 3  Keto-Food-List-Grocery-Bonus-Pages.pdf
 *
 * Repaired source: etsy/products/templates/keto-bundle-pages.html (Sarah, six edits, main
 * b6cc64cf). Built artifact: products/pdfs/keto-food-list-bundle.pdf, 14 pages.
 * Approval: Brew in session 2026-09-12, including the 4th-listing cap slot, on the basis that
 * units_90d is 0 for BOTH listings across all 65 snapshot rows.
 *
 * THIS MAKES A PUBLIC SHOP CHANGE. Two-phase and refuses to act without an explicit flag, the
 * same shape as chart-file-swap.mjs and for the same reason: Etsy exposes no download endpoint
 * for a seller's own listing files, so a delete cannot be undone byte for byte.
 *
 *   node keto-bundle-safety-file-swap.mjs              # dry run, reads only. Default.
 *   node keto-bundle-safety-file-swap.mjs --upload     # phase 1: ADD the repaired PDF. Reversible.
 *   node keto-bundle-safety-file-swap.mjs --remove-old # phase 2: DELETE the old PDF. ONE WAY.
 *
 * Honest limitation, recorded because it affects phase 2 on the Starter Kit: the bundle's rank-2
 * file was uploaded from this same build pipeline today, so it is known to be the union document.
 * The Starter Kit's rank-3 file was uploaded 2026-07-04 and Etsy reports only a rounded "2.5 MB"
 * with no byte count, so its contents cannot be verified from here. Same rounded size, a name
 * referring to the food list plus bonus pages, and Brew's explicit direction are the grounds for
 * replacing it. Nothing else on either listing is touched: no title, price, image, description,
 * tag or marketing copy.
 */
import { readFileSync, statSync } from 'fs';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const SHOP = 63916912;
const PDF = 'products/pdfs/keto-food-list-bundle.pdf';
const NEW_NAME = 'KetoFoodListBundle.pdf';
const TARGETS = [
  { listingId: 4514204763, label: 'Keto Bundle',      oldFileId: 1514299370882, oldName: 'KetoFoodListBundle.pdf',              rank: 2 },
  { listingId: 4532542805, label: 'Keto Starter Kit', oldFileId: 1497534437658, oldName: 'Keto-Food-List-Grocery-Bonus-Pages.pdf', rank: 3 },
];

const mode = process.argv.includes('--remove-old') ? 'remove'
           : process.argv.includes('--upload') ? 'upload' : 'dry';
const token = await getEtsyToken();
const H = etsyHeaders(token);

const listFiles = async (id) => {
  const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`, { headers: H });
  if (!r.ok) throw new Error(`list files ${id}: HTTP ${r.status} ${await r.text()}`);
  return (await r.json()).results || [];
};

const bytes = statSync(PDF).size;
console.log(`mode: ${mode}`);
console.log(`local artifact: ${PDF}  ${bytes} bytes\n`);

for (const t of TARGETS) {
  const before = await listFiles(t.listingId);
  const old = before.find((f) => f.listing_file_id === t.oldFileId);
  console.log(`${t.label} (${t.listingId})`);
  before.forEach((f) => console.log(`   rank ${f.rank}  ${f.filename}  ${f.filesize}  id=${f.listing_file_id}`));
  if (!old) console.log(`   NOTE: expected old file id ${t.oldFileId} (${t.oldName}) not present`);

  if (mode === 'upload') {
    const fd = new FormData();
    fd.append('file', new Blob([readFileSync(PDF)], { type: 'application/pdf' }), NEW_NAME);
    fd.append('name', NEW_NAME);
    fd.append('rank', String(t.rank));
    const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${t.listingId}/files`,
      { method: 'POST', headers: { 'x-api-key': H['x-api-key'], Authorization: H.Authorization }, body: fd });
    const txt = await r.text();
    if (!r.ok) { console.log(`   UPLOAD FAILED: HTTP ${r.status} ${txt}\n`); continue; }
    const j = JSON.parse(txt);
    console.log(`   uploaded: id=${j.listing_file_id} ${j.filename} ${j.filesize}`);
  }

  if (mode === 'remove') {
    // Refuse unless a DIFFERENT file with the new name is already attached, so the delete can
    // never be the thing that leaves a listing with no food list on it.
    const replacement = before.find((f) => f.filename === NEW_NAME && f.listing_file_id !== t.oldFileId);
    if (!replacement) { console.log(`   REFUSING to delete: no replacement named ${NEW_NAME} found yet. Run --upload first.\n`); continue; }
    if (!old) { console.log(`   nothing to delete; old file already gone\n`); continue; }
    const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${t.listingId}/files/${t.oldFileId}`,
      { method: 'DELETE', headers: H });
    console.log(`   delete old id=${t.oldFileId}: HTTP ${r.status}`);
  }

  if (mode !== 'dry') {
    const after = await listFiles(t.listingId);
    console.log('   now:');
    after.forEach((f) => console.log(`     rank ${f.rank}  ${f.filename}  ${f.filesize}  id=${f.listing_file_id}`));
  }
  console.log();
}

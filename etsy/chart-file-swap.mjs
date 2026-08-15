#!/usr/bin/env node
/**
 * Swap the delivered chart on listing 4464217679 from the old sepia
 * fridge-card-carnivore.pdf to the rebuilt letter-size fridge-card-carnivore-red.pdf.
 *
 * Background: the listing's eight photos all show the red ten-section chart, but the
 * file a buyer downloads is the cream-and-sepia eight-section design that still carries
 * the "Perle cheps" and "Beef of tallow" typos, and two photographed sections do not
 * exist in it at all. Trail: reports/carnivore-chart-mismatch-2026-08-11.md and
 * reports/chart-rebuild-2026-08-12.md in the vault. Rebuild commit: 9fe61879.
 *
 * THIS SCRIPT MAKES A PUBLIC SHOP CHANGE. It is deliberately two-phase and refuses
 * to do anything without an explicit flag.
 *
 *   node chart-file-swap.mjs                 # dry run. Reads only. Default.
 *   node chart-file-swap.mjs --upload        # phase 1: ADD the red chart. Reversible.
 *   node chart-file-swap.mjs --remove-old    # phase 2: DELETE the sepia chart. ONE WAY.
 *
 * Why two phases rather than the upload-then-delete of swap-pescatarian-bonus-insert.mjs:
 * Etsy exposes no download endpoint for a seller's own listing files, and the local
 * copy of fridge-card-carnivore.pdf is 1.08 MB against the 1.18 MB Etsy reports live,
 * so it is a DIFFERENT BUILD. The delete therefore cannot be undone byte for byte.
 * Splitting the phases means phase 1 can be undone completely, and the irreversible
 * step is taken on its own, on purpose, after the upload is confirmed good.
 *
 * Between the two phases the listing carries both charts. That is untidy for a few
 * minutes and is the price of not destroying the only copy of a live file.
 *
 * Run from etsy/.
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHOP = 63916912;
const LISTING = 4464217679;
const OLD_NAME = 'fridge-card-carnivore.pdf';
const NEW_NAME = 'fridge-card-carnivore-red.pdf';
const NEW_PATH = path.resolve(__dirname, 'products/pdfs', NEW_NAME);
const REVIEWED_MD5 = 'fe3c59b33842d83f46074b9eae22336a';

const mode = process.argv.includes('--remove-old') ? 'remove'
  : process.argv.includes('--upload') ? 'upload'
  : 'dry';

const token = await getEtsyToken();
const headers = etsyHeaders(token);
const base = `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${LISTING}/files`;

const listFiles = async () => {
  const res = await fetch(base, { headers });
  const j = await res.json();
  if (!res.ok) throw new Error(`list files failed ${res.status} ${JSON.stringify(j)}`);
  return j.results || [];
};
const show = (fs_) => fs_.map((f) => `${f.rank}:${f.filename} (id ${f.listing_file_id}, ${f.filesize})`).join('  |  ');

const before = await listFiles();
console.log('BEFORE:', show(before));

const old = before.find((f) => f.filename === OLD_NAME);
const already = before.find((f) => f.filename === NEW_NAME);

// --- guards, identical in every mode ----------------------------------------
if (!existsSync(NEW_PATH)) {
  console.error(`Aborting: ${NEW_PATH} is missing. Rebuild it first.`);
  process.exit(1);
}
const buf = readFileSync(NEW_PATH);
const md5 = createHash('md5').update(buf).digest('hex');
if (md5 !== REVIEWED_MD5) {
  console.error(`Aborting: local PDF md5 ${md5} is not the reviewed ${REVIEWED_MD5}.`);
  process.exit(1);
}

if (mode === 'dry') {
  console.log('\nDRY RUN. Nothing was changed on Etsy.');
  console.log(`  phase 1 --upload      would ADD ${NEW_NAME} (${buf.length} bytes, md5 ok)`);
  console.log(`                        currently present: ${already ? 'YES, phase 1 is already done' : 'no'}`);
  console.log(`  phase 2 --remove-old  would DELETE ${old ? `${OLD_NAME} id ${old.listing_file_id}` : `${OLD_NAME} -- NOT PRESENT`}`);
  console.log('\n  Images are not touched by either phase. This uses /files only.');
  process.exit(0);
}

if (mode === 'upload') {
  if (already) { console.error('Aborting: the red chart is already attached. Phase 1 is done.'); process.exit(1); }
  if (!old) { console.error(`Aborting: ${OLD_NAME} is not attached, so this is not the listing state this script was written for.`); process.exit(1); }
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'application/pdf' }), NEW_NAME);
  form.append('name', NEW_NAME);
  form.append('rank', '1');
  const res = await fetch(base, { method: 'POST', headers, body: form });
  const j = await res.json();
  if (!res.ok) { console.error('Upload failed', res.status, JSON.stringify(j)); process.exit(1); }
  console.log('Uploaded, listing_file_id', j.listing_file_id);
  console.log('AFTER:', show(await listFiles()));
  console.log(`\nTo undo phase 1 completely: DELETE ${base}/${j.listing_file_id}`);
  process.exit(0);
}

// mode === 'remove'
if (!already) { console.error('Aborting: the red chart is not attached yet. Run --upload first.'); process.exit(1); }
if (!old) { console.error(`Aborting: ${OLD_NAME} is already gone.`); process.exit(1); }
const del = await fetch(`${base}/${old.listing_file_id}`, { method: 'DELETE', headers });
if (!del.ok) { console.error('Delete failed', del.status, await del.text()); process.exit(1); }
console.log(`Deleted ${OLD_NAME}, id ${old.listing_file_id}. This step is not reversible byte for byte.`);
console.log('AFTER:', show(await listFiles()));

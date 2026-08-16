#!/usr/bin/env node
// Add the CarnivoreWeekly bonus insert to the 8 active listings that shipped
// no bonus card at all. Brew approved 2026-08-10.
//
// All 8 get the diet-neutral CW card rather than the KetoDial one, including
// the two low carb listings: adding a NEW pointer to another brand is a bigger
// call than leaving the existing low carb cheat sheet alone, so it stays CW
// until Brew says otherwise.
//
// The card is appended last, so the product the buyer actually paid for stays
// first in their download list.
import { readFileSync } from 'fs';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const NEW_PATH = 'products/pdfs/bonus-insert-carnivore-weekly.pdf';
const NEW_NAME = 'bonus-insert-carnivore-weekly.pdf';
const IDS = [4482132169, 4513518786, 4513518746, 4516511462, 4516511480, 4513508150, 4495083342, 4495083454];

const token = await getEtsyToken();
const headers = { 'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET, Authorization: 'Bearer ' + token };
const pdf = readFileSync(NEW_PATH);

const results = [];
for (const id of IDS) {
  const base = `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`;
  const before = (await (await fetch(base, { headers })).json()).results || [];

  if (before.some(f => f.filename === NEW_NAME)) { console.log(`${id} SKIP already has the card`); continue; }
  if (before.length >= 5) { console.log(`${id} SKIP at Etsy's 5 file cap`); continue; }

  const form = new FormData();
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), NEW_NAME);
  form.append('name', NEW_NAME);
  form.append('rank', String(before.length + 1));

  const res = await fetch(base, { method: 'POST', headers, body: form });
  const json = await res.json();
  if (!res.ok) { console.error(`${id} FAILED ${res.status}`, JSON.stringify(json)); continue; }

  const after = (await (await fetch(base, { headers })).json()).results || [];
  console.log(`${id} OK  new file id ${json.listing_file_id}  ->  ${after.map(f => `${f.rank}:${f.filename}`).join(' | ')}`);
  results.push({ id, fileId: json.listing_file_id });
  await new Promise(r => setTimeout(r, 200));
}
console.log('\nUNDO (delete these file ids):');
for (const r of results) console.log(`  ${r.id}  ${r.fileId}`);

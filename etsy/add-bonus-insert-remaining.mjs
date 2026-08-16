#!/usr/bin/env node
// Final pass: the 8 active listings still shipping no bonus card, namely the
// 6 meal plans, the doctor prep kit, and the mega bundle. Brew approved
// 2026-08-10.
//
// Card choice: the real carnivore card where the buyer's diet actually matches
// its meat/fat/water/salt tracker, the diet-neutral CW card everywhere else.
// The keto meal plan gets the CW card, not the KetoDial one, on the same rule
// as the low carb listings: adding a NEW pointer to another brand is a bigger
// call than leaving the existing keto listings alone.
//
// Appended last so the product the buyer paid for stays first.
import { readFileSync } from 'fs';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const CW = 'bonus-insert-carnivore-weekly.pdf';
const CARN = 'bonus-insert-carnivore.pdf';

const PLAN = [
  { id: 4540695544, card: CARN, note: '30 Day Carnivore Meal Plan' },
  { id: 4540678283, card: CARN, note: 'Lion Diet 30 Day Protocol, lion uses the carnivore card shop-wide' },
  { id: 4540695558, card: CW,   note: 'Keto Meal Plan 28 Day' },
  { id: 4540695566, card: CW,   note: 'Low Carb Meal Plan 28 Day' },
  { id: 4540695590, card: CW,   note: 'Pescatarian Meal Plan 30 Day' },
  { id: 4540695604, card: CW,   note: 'Mediterranean Meal Plan 7 Day' },
  { id: 4550536874, card: CW,   note: 'Doctor Prep Kit, diet neutral product' },
  { id: 4495089980, card: CW,   note: 'Mega Bundle, mixed diets' },
];

const token = await getEtsyToken();
const headers = { 'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET, Authorization: 'Bearer ' + token };
const bytes = Object.fromEntries([CW, CARN].map(n => [n, readFileSync(`products/pdfs/${n}`)]));

const done = [];
for (const { id, card, note } of PLAN) {
  const base = `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`;
  const before = (await (await fetch(base, { headers })).json()).results || [];

  if (before.some(f => f.filename === CW || f.filename === CARN)) { console.log(`${id} SKIP already has a bonus card`); continue; }
  if (before.length >= 5) { console.log(`${id} SKIP at Etsy's 5 file cap`); continue; }

  const form = new FormData();
  form.append('file', new Blob([bytes[card]], { type: 'application/pdf' }), card);
  form.append('name', card);
  form.append('rank', String(before.length + 1));

  const res = await fetch(base, { method: 'POST', headers, body: form });
  const json = await res.json();
  if (!res.ok) { console.error(`${id} FAILED ${res.status}`, JSON.stringify(json)); continue; }

  const after = (await (await fetch(base, { headers })).json()).results || [];
  console.log(`${id} OK  ${card}  (${note})\n        -> ${after.map(f => `${f.rank}:${f.filename}`).join(' | ')}`);
  done.push({ id, card, fileId: json.listing_file_id });
  await new Promise(r => setTimeout(r, 200));
}
console.log(`\n${done.length}/${PLAN.length} updated`);
for (const d of done) console.log(`  ${d.id}  ${d.card}  file id ${d.fileId}`);

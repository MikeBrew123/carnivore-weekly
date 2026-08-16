#!/usr/bin/env node
// One-off: listing 4464217699 (Pescatarian Diet Food List) shipped
// bonus-insert-keto.pdf, a KetoDial-branded card pointing at ketodial.com.
// Swap it for the CarnivoreWeekly-branded diet-neutral card. Brew approved
// 2026-08-10, pescatarian listing only.
//
// Upload first, delete second, so the listing is never left without a bonus.
import { readFileSync } from 'fs';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const LISTING = 4464217699;
const OLD = 'bonus-insert-keto.pdf';
const NEW_PATH = 'products/pdfs/bonus-insert-carnivore-weekly.pdf';
const NEW_NAME = 'bonus-insert-carnivore-weekly.pdf';

const token = await getEtsyToken();
const headers = { 'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET, Authorization: 'Bearer ' + token };
const base = `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${LISTING}/files`;

const listFiles = async () => (await (await fetch(base, { headers })).json()).results || [];

const before = await listFiles();
console.log('BEFORE:', before.map(f => `${f.rank}:${f.filename} (id ${f.listing_file_id})`).join('  |  '));

const old = before.find(f => f.filename === OLD);
if (!old) { console.error(`Aborting: ${OLD} not attached, nothing to swap.`); process.exit(1); }
if (before.some(f => f.filename === NEW_NAME)) { console.error('Aborting: new card already attached.'); process.exit(1); }

const form = new FormData();
form.append('file', new Blob([readFileSync(NEW_PATH)], { type: 'application/pdf' }), NEW_NAME);
form.append('name', NEW_NAME);
form.append('rank', '1');
const up = await fetch(base, { method: 'POST', headers, body: form });
const upJson = await up.json();
if (!up.ok) { console.error('Upload failed', up.status, JSON.stringify(upJson)); process.exit(1); }
console.log('Uploaded new card, listing_file_id', upJson.listing_file_id);

const del = await fetch(`${base}/${old.listing_file_id}`, { method: 'DELETE', headers });
if (!del.ok) { console.error(`Delete of old ${OLD} failed`, del.status, await del.text()); process.exit(1); }
console.log('Deleted old KetoDial card, listing_file_id', old.listing_file_id);

const after = await listFiles();
console.log('AFTER:', after.map(f => `${f.rank}:${f.filename} (id ${f.listing_file_id})`).join('  |  '));

// Brew approved live 2026-08-22 13:22. Category only. Pre-check: live taxonomy must be 69.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const SHOP = 63916912;
const MAP = { 4550536874:354, 4545921306:354, 4516511462:2078, 4516511480:2078, 4516511490:2078, 4495089980:2078 };
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok=0, skip=0, fail=0;
for (const [id, tax] of Object.entries(MAP)) {
  const cur = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  if (cur.taxonomy_id !== 69) { console.log(`${id}: SKIP, live taxonomy ${cur.taxonomy_id} not 69`); skip++; await sleep(1200); continue; }
  const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}`, {
    method: 'PATCH', headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ taxonomy_id: String(tax) }) });
  const j = await r.json();
  if (r.ok && j.taxonomy_id === tax) { console.log(`${id}: 69 -> ${tax} OK (${j.title.slice(0,40)})`); ok++; }
  else { console.log(`${id}: FAILED ${JSON.stringify(j).slice(0,200)}`); fail++; }
  await sleep(1200);
}
console.log(`\nDone: ${ok} fixed, ${skip} skipped, ${fail} failed of 6`);

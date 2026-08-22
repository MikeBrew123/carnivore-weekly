// Brew approved live 2026-08-22 14:01 ("go 7"). Title only. Pre-check: live title must equal audited title.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import fs from 'fs';
const SHOP = 63916912;
const before = Object.fromEntries(JSON.parse(fs.readFileSync('reports/etsy-audit-2026-08-22-data.json')).map(l=>[l.id,l]));
const NEW = {
  4495052093: "Lion Diet Guide and 14-Day Tracker (PDF Download)",
  4495077633: "Keto Diet Guide & 14-Day Tracker Printable | Low Carb Beginner PDF",
  4489982664: "Modern Keto Diet Food List | Minimalist Low Carb Chart (PDF)",
  4489981356: "Modern Carnivore Diet Food List | Minimalist Meat Guide (PDF Download)",
  4495083274: "Carnivore Diet Guide & 14-Day Tracker | Animal Foods Starter Poster (PDF)",
  4495077741: "Keto Diet Starter Bundle | Cheat Sheet, How-To Guide & 14-Day Tracker (PDF)",
  4495083454: "Low Carb Diet Starter Bundle | Cheat Sheet, How-To Guide & 14-Day Tracker (PDF)",
};
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok=0, skip=0, fail=0;
for (const [id, title] of Object.entries(NEW)) {
  const cur = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  if (cur.title !== before[id].title) { console.log(`${id}: SKIP, live title differs from audit pull`); skip++; await sleep(1200); continue; }
  const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}`, { method:'PATCH',
    headers:{...hdrs,'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({title}) });
  const j = await r.json();
  if (r.ok && j.title===title) { console.log(`${id}: OK -> ${j.title}`); ok++; } else { console.log(`${id}: FAILED ${JSON.stringify(j).slice(0,200)}`); fail++; }
  await sleep(1200);
}
console.log(`\nWrite: ${ok} ok, ${skip} skipped, ${fail} failed of 7\n--- verify ---`);
let pass=0;
for (const [id, want] of Object.entries(NEW)) {
  const l = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  const b = before[id];
  const same = (l.price.amount/l.price.divisor)===b.price && JSON.stringify(l.tags)===JSON.stringify(b.tags) && l.taxonomy_id===b.taxonomy_id && l.state==='active';
  const okT = l.title===want; if (okT && same) pass++;
  console.log(`${id}: title ${okT?'OK':'WRONG'} | price/tags/taxonomy/state unchanged: ${same?'YES':'NO'}`);
  await sleep(1100);
}
console.log(`Verified ${pass}/7`);

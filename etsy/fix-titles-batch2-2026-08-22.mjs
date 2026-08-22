// Brew approved live 2026-08-22 13:58 ("go 9"). Title only. Pre-check: live title must equal audited title.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import fs from 'fs';
const SHOP = 63916912;
const before = Object.fromEntries(JSON.parse(fs.readFileSync('reports/etsy-audit-2026-08-22-data.json')).map(l=>[l.id,l]));
const NEW = {
  4516511462: "Anti-Inflammatory Food List Chart | Arthritis Diet Guide (PDF Download)",
  4514204763: "Keto Grocery List Printable Bundle | Carb Cheat Sheet (US Letter + A4 PDF)",
  4513508150: "Diet Pyramids Printable Bundle | Keto, Carnivore, Lion, Pescatarian Kitchen Art (Digital Download)",
  4513508118: "Carnivore Diet Food Pyramid Poster | Meat Based Kitchen Wall Art (Digital Download)",
  4513508098: "Keto Food Pyramid Poster | Low Carb Diet Chart, Kitchen Wall Art (Digital Download)",
  4513506781: "Lion Diet Food Pyramid Poster | Minimalist Beef Salt Water Chart (Digital Download)",
  4513433391: "20 Keto Dessert Recipe Cards, Macro-Counted Low Carb Sweets (Printable PDF)",
  4495083342: "Low Carb Diet Guide & 14-Day Tracker (PDF Download)",
  4495083368: "Carnivore Diet Starter Bundle | Cheat Sheet, How-To Guide & 14-Day Tracker (PDF)",
};
const TAX = { 4516511462: 2078 }; // recategorized earlier today
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
console.log(`\nWrite: ${ok} ok, ${skip} skipped, ${fail} failed of 9\n--- verify ---`);
let pass=0;
for (const [id, want] of Object.entries(NEW)) {
  const l = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  const b = before[id], tax = TAX[id] ?? b.taxonomy_id;
  const same = (l.price.amount/l.price.divisor)===b.price && JSON.stringify(l.tags)===JSON.stringify(b.tags) && l.taxonomy_id===tax && l.state==='active';
  const okT = l.title===want; if (okT && same) pass++;
  console.log(`${id}: title ${okT?'OK':'WRONG'} | price/tags/taxonomy/state unchanged: ${same?'YES':'NO'}`);
  await sleep(1100);
}
console.log(`Verified ${pass}/9`);

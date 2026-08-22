// Brew approved live 2026-08-22 13:28 ("go 8"). Title only. Pre-check: live title must equal the audited title.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import fs from 'fs';
const SHOP = 63916912;
const audited = Object.fromEntries(JSON.parse(fs.readFileSync('reports/etsy-audit-2026-08-22-data.json')).map(l=>[l.id,l.title]));
const NEW = {
  4550536874: "Doctor Visit Prep Kit, Low-Carb Edition, Medical Organizer (PDF)",
  4540695604: "7-Day Mediterranean Meal Plan with Grocery List (Printable PDF)",
  4540695566: "28-Day Low Carb Meal Plan | 1500 Calorie Whole Foods Menu (Printable PDF)",
  4540695558: "28-Day Keto Meal Plan | 1500 Calorie, Under 25g Net Carbs (Printable PDF)",
  4540695544: "30-Day Carnivore Meal Plan | High Protein Menu, Grocery Lists (PDF)",
  4540678283: "Lion Diet 30-Day Protocol & Meal Plan (Printable PDF)",
  4540695590: "30-Day Pescatarian Low Carb Meal Plan | Seafood Diet Menu (Printable PDF)",
  4495089980: "Low Carb Keto Carnivore Diet Mega Bundle (9 PDFs)",
};
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok=0, skip=0, fail=0;
for (const [id, title] of Object.entries(NEW)) {
  const cur = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  if (cur.title !== audited[id]) { console.log(`${id}: SKIP, live title differs from audit pull`); skip++; await sleep(1200); continue; }
  const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}`, {
    method: 'PATCH', headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ title }) });
  const j = await r.json();
  if (r.ok && j.title === title) { console.log(`${id}: OK -> ${j.title}`); ok++; }
  else { console.log(`${id}: FAILED ${JSON.stringify(j).slice(0,200)}`); fail++; }
  await sleep(1200);
}
console.log(`\nDone: ${ok} retitled, ${skip} skipped, ${fail} failed of 8`);

import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import fs from 'fs';
const before = Object.fromEntries(JSON.parse(fs.readFileSync('reports/etsy-audit-2026-08-22-data.json')).map(l=>[l.id,l]));
const NEW = {
  4550536874:"Doctor Visit Prep Kit, Low-Carb Edition, Medical Organizer (PDF)",
  4540695604:"7-Day Mediterranean Meal Plan with Grocery List (Printable PDF)",
  4540695566:"28-Day Low Carb Meal Plan | 1500 Calorie Whole Foods Menu (Printable PDF)",
  4540695558:"28-Day Keto Meal Plan | 1500 Calorie, Under 25g Net Carbs (Printable PDF)",
  4540695544:"30-Day Carnivore Meal Plan | High Protein Menu, Grocery Lists (PDF)",
  4540678283:"Lion Diet 30-Day Protocol & Meal Plan (Printable PDF)",
  4540695590:"30-Day Pescatarian Low Carb Meal Plan | Seafood Diet Menu (Printable PDF)",
  4495089980:"Low Carb Keto Carnivore Diet Mega Bundle (9 PDFs)",
};
const TAX = { 4550536874:354, 4495089980:2078 }; // the two also recategorized today
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
let pass=0;
for (const [id, want] of Object.entries(NEW)) {
  const l = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  const b = before[id];
  const tax = TAX[id] ?? b.taxonomy_id;
  const same = (l.price.amount/l.price.divisor)===b.price && JSON.stringify(l.tags)===JSON.stringify(b.tags) && l.taxonomy_id===tax && l.state==='active';
  const okT = l.title===want;
  console.log(`${id}: title ${okT?'OK':'WRONG'} | price/tags/taxonomy/state unchanged: ${same?'YES':'NO'}`);
  if (okT && same) pass++;
  await new Promise(r=>setTimeout(r,1100));
}
console.log(`Verified ${pass}/8`);

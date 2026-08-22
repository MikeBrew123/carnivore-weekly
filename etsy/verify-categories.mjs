import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import fs from 'fs';
const before = Object.fromEntries(JSON.parse(fs.readFileSync('reports/etsy-audit-2026-08-22-data.json')).map(l=>[l.id,l]));
const MAP = { 4550536874:354, 4545921306:354, 4516511462:2078, 4516511480:2078, 4516511490:2078, 4495089980:2078 };
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
let pass=0;
for (const [id, tax] of Object.entries(MAP)) {
  const l = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  const b = before[id];
  const same = l.title===b.title && (l.price.amount/l.price.divisor)===b.price && JSON.stringify(l.tags)===JSON.stringify(b.tags) && l.state==='active';
  const okTax = l.taxonomy_id===tax;
  console.log(`${id}: taxonomy ${l.taxonomy_id} ${okTax?'OK':'WRONG'} | title/price/tags/state unchanged: ${same?'YES':'NO'}`);
  if (okTax && same) pass++;
  await new Promise(r=>setTimeout(r,1100));
}
console.log(`Verified ${pass}/6`);

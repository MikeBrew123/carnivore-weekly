import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import fs from 'fs';
const id=4532542805, title="Keto Starter Kit | 30-Day Meal Plan, Food List, Grocery List (PDF Download)";
const audited = JSON.parse(fs.readFileSync('reports/etsy-audit-2026-08-22-data.json')).find(l=>l.id===id);
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const cur = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
if (cur.title !== audited.title) { console.log('SKIP: live title differs from audit pull'); process.exit(2); }
const r = await fetch(`https://openapi.etsy.com/v3/application/shops/63916912/listings/${id}`, { method:'PATCH',
  headers:{...hdrs,'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({title}) });
const j = await r.json();
await new Promise(x=>setTimeout(x,1500));
const v = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
const same = v.price.amount/v.price.divisor===audited.price && JSON.stringify(v.tags)===JSON.stringify(audited.tags) && v.taxonomy_id===audited.taxonomy_id && v.state==='active';
console.log(r.ok && v.title===title ? `OK -> ${v.title}` : `FAILED ${JSON.stringify(j).slice(0,200)}`, '| price/tags/taxonomy/state unchanged:', same?'YES':'NO');

// READ-ONLY: pull every active listing's full data for the 2026-08-22 audit.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const SHOP = 63916912;
let all = [], offset = 0;
while (true) {
  const r = await (await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/active?limit=100&offset=${offset}`, { headers: hdrs })).json();
  all.push(...(r.results||[]));
  if (!r.results || all.length >= r.count) break;
  offset += 100; await new Promise(res=>setTimeout(res,1100));
}
const out = all.map(l => ({
  id: l.listing_id, title: l.title, price: l.price.amount/l.price.divisor, cur: l.price.currency_code,
  taxonomy_id: l.taxonomy_id, tags: l.tags, materials: l.materials, who_made: l.who_made,
  when_made: l.when_made, views: l.views, favs: l.num_favorers, state: l.state,
  desc_first300: (l.description||'').slice(0,300), desc_len: (l.description||'').length,
  has_video: undefined, created: l.original_creation_timestamp, updated: l.last_modified_timestamp
}));
require_fs: {
  const fs = await import('fs');
  fs.writeFileSync('reports/etsy-audit-2026-08-22-data.json', JSON.stringify(out,null,1));
}
console.log(`pulled ${out.length} active listings -> reports/etsy-audit-2026-08-22-data.json`);

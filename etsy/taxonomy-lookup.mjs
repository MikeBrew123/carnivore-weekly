import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const r = await (await fetch('https://openapi.etsy.com/v3/application/seller-taxonomy/nodes', { headers: hdrs })).json();
function walk(nodes, path) {
  for (const n of nodes||[]) {
    const p = [...path, n.name];
    if ([2078,69,1].includes(n.id)) console.log(n.id, '=', p.join(' > '));
    walk(n.children, p);
  }
}
walk(r.results, []);

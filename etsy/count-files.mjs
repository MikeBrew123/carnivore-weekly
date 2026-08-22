import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
for (const id of [4495089980, 4532542805]) {
  const r = await (await fetch(`https://openapi.etsy.com/v3/application/shops/63916912/listings/${id}/files`, { headers: hdrs })).json();
  console.log(id, 'files:', r.count, (r.results||[]).map(f=>f.filename).join(' ; '));
}

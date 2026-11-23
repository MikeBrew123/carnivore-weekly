// Read-only: list the digital files on Etsy listings. GET requests only.
//   node count-files.mjs                 -> the two original listings
//   node count-files.mjs <id> [id ...]   -> those listings
//   node count-files.mjs --active        -> every active listing in the shop
// Output: one line per listing, "<id>\t<count>\t<file ids and names>".
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const SHOP = 63916912;
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const get = async (path) => (await fetch(`https://openapi.etsy.com/v3/application${path}`, { headers: hdrs })).json();

let ids = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
if (process.argv.includes('--active')) {
  ids = [];
  for (let offset = 0; ; offset += 100) {
    const page = await get(`/shops/${SHOP}/listings/active?limit=100&offset=${offset}`);
    ids.push(...(page.results || []).map(l => l.listing_id));
    if (!page.results || page.results.length < 100) break;
  }
}
if (!ids.length) ids = [4495089980, 4532542805];

for (const id of ids) {
  const r = await get(`/shops/${SHOP}/listings/${id}/files`);
  const files = (r.results || []).map(f => `${f.listing_file_id}:${f.filename || '?'}`);
  console.log(`${id}\t${r.count ?? '?'}\t${files.join(' ; ')}`);
}

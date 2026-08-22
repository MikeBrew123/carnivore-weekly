#!/usr/bin/env node
// PRICE REVERT per reports/etsy-price-revert-2026-08-21.md. Brew approved 2026-08-21 06:07.
// Gate (50% sale off) verified live in Shop Manager 2026-08-22 ~13:10 PDT: sale lapsed 08-15.
// Safety: each listing's live price must equal the expected doubled price or it is SKIPPED.
// Controls 4495049647 and 4495055944 are NOT in this map. Hold until 2026-08-31.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const REVERT = { // id: [expected_before, revert_to]
  4513506781:[4.98,2.49], 4513508098:[4.98,2.49], 4513508118:[4.98,2.49],
  4489981356:[8.98,4.49], 4489982664:[8.98,4.49], 4495056564:[8.98,4.49],
  4513517597:[8.98,4.49], 4513518746:[8.98,4.49], 4513518762:[8.98,4.49], 4513518786:[8.98,4.49],
  4482132169:[9.98,4.99], 4513508150:[9.98,4.99], 4514204763:[9.98,4.99],
  4516511462:[9.98,4.99], 4516511480:[9.98,4.99], 4516511490:[9.98,4.99],
  4495052093:[11.98,5.99], 4495077633:[11.98,5.99], 4495083274:[11.98,5.99], 4495083342:[11.98,5.99],
  4495077741:[15.98,7.99], 4495083368:[15.98,7.99], 4495083454:[15.98,7.99],
  4495089980:[39.98,19.99],
};

const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, skipped = 0, failed = 0;

for (const [id, [before, target]] of Object.entries(REVERT)) {
  const cur = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}/inventory`, { headers: hdrs })).json();
  if (cur.error) { console.log(`${id}: FAILED read - ${cur.error}`); failed++; await sleep(1200); continue; }
  const live = cur.products[0].offerings[0].price;
  const liveVal = live.amount / live.divisor;
  if (Math.abs(liveVal - before) > 0.001) {
    console.log(`${id}: SKIP - live $${liveVal.toFixed(2)} ${live.currency_code}, expected $${before.toFixed(2)}. Not forcing.`);
    skipped++; await sleep(1200); continue;
  }
  const products = cur.products.map(p => ({
    sku: p.sku || '', property_values: p.property_values || [],
    offerings: p.offerings.map(o => ({ price: target, quantity: o.quantity, is_enabled: o.is_enabled })),
  }));
  const putRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${id}/inventory`, {
    method: 'PUT', headers: { ...hdrs, 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, price_on_property: cur.price_on_property || [],
      quantity_on_property: cur.quantity_on_property || [], sku_on_property: cur.sku_on_property || [] }),
  });
  const result = await putRes.json();
  if (putRes.ok) {
    const np = result.products?.[0]?.offerings?.[0]?.price;
    console.log(`${id}: $${liveVal.toFixed(2)} -> $${(np.amount/np.divisor).toFixed(2)} ${np.currency_code} OK`);
    ok++;
  } else { console.log(`${id}: FAILED write - ${JSON.stringify(result).slice(0,200)}`); failed++; }
  await sleep(1200);
}
console.log(`\nDone: ${ok} reverted, ${skipped} skipped, ${failed} failed (of ${Object.keys(REVERT).length})`);

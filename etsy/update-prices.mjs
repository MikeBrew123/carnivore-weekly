#!/usr/bin/env node
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;
const SHARED_SECRET = ETSY_SHARED_SECRET;

const PRICE_MAP = {
  // Singles: $7.99 CAD
  4451046699: 7.99, 4451051190: 7.99,
  4451053635: 7.99, 4451056127: 7.99,
  4451067037: 7.99, 4451070758: 7.99,
  4451073001: 7.99, 4451076646: 7.99,
  // Bundles: $14.97 CAD
  4451051221: 14.97, 4451067690: 14.97,
  4451072926: 14.97, 4451077866: 14.97,
  // Complete Kit: $29.97 CAD
  4451079282: 29.97
};

async function run() {
  // Valid Etsy access token from the shared Supabase store (single source of truth).
  const token = await getEtsyToken();

  const hdrs = {
    'x-api-key': `${CLIENT_ID}:${SHARED_SECRET}`,
    'Authorization': `Bearer ${token}`
  };

  // First, check current inventory for one listing to understand structure
  console.log('Checking inventory structure...');
  const invRes = await fetch(`https://openapi.etsy.com/v3/application/listings/4451046699/inventory`, { headers: hdrs });
  const inv = await invRes.json();
  console.log('Inventory:', JSON.stringify(inv, null, 2).substring(0, 500));

  // Update each listing's price via inventory
  console.log('\nUpdating prices...\n');
  let success = 0;
  let failed = 0;

  for (const [listingId, priceValue] of Object.entries(PRICE_MAP)) {
    // Get current inventory
    const getRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`, { headers: hdrs });
    const current = await getRes.json();

    if (current.error) {
      console.log(`  ${listingId}: FAILED to get inventory - ${current.error}`);
      failed++;
      continue;
    }

    // Update offerings with new price
    const products = current.products.map(p => ({
      sku: p.sku || '',
      property_values: p.property_values || [],
      offerings: p.offerings.map(o => ({
        price: priceValue,
        quantity: o.quantity,
        is_enabled: o.is_enabled
      }))
    }));

    const putRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${listingId}/inventory`, {
      method: 'PUT',
      headers: { ...hdrs, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products,
        price_on_property: current.price_on_property || [],
        quantity_on_property: current.quantity_on_property || [],
        sku_on_property: current.sku_on_property || []
      })
    });

    const result = await putRes.json();
    if (putRes.ok) {
      const newPrice = result.products?.[0]?.offerings?.[0]?.price;
      console.log(`  ${listingId}: $${priceValue} OK (verified: $${(newPrice.amount/newPrice.divisor).toFixed(2)} ${newPrice.currency_code})`);
      success++;
    } else {
      console.log(`  ${listingId}: FAILED - ${JSON.stringify(result)}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nResults: ${success} updated, ${failed} failed`);
}

run().catch(e => console.error(e));

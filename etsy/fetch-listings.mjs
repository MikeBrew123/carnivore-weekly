#!/usr/bin/env node
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;

async function run() {
  const token = await getEtsyToken();

  const headers = {
    'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
    'Authorization': 'Bearer ' + token
  };

  const meRes = await fetch('https://openapi.etsy.com/v3/application/users/me', { headers });
  const me = await meRes.json();
  console.log('ME response:', JSON.stringify(me, null, 2));

  const shopId = me.shop_id || (me.results && me.results[0]?.shop_id);
  const userId = me.user_id || (me.results && me.results[0]?.user_id);
  console.log('User ID:', userId);
  console.log('Shop ID:', shopId);

  if (!shopId) {
    // Try getting shop by user
    const shopsRes = await fetch('https://openapi.etsy.com/v3/application/users/' + userId + '/shops', { headers });
    const shopsData = await shopsRes.json();
    console.log('Shops response:', JSON.stringify(shopsData, null, 2));
    return;
  }

  const shopRes = await fetch('https://openapi.etsy.com/v3/application/shops/' + shopId, { headers });
  const shop = await shopRes.json();
  console.log('Shop name:', shop.shop_name);
  console.log('Listings count:', shop.listing_active_count);

  const listingsRes = await fetch('https://openapi.etsy.com/v3/application/shops/' + me.shop_id + '/listings?limit=25&includes=Images', { headers });
  const listings = await listingsRes.json();

  console.log('\n--- LISTINGS ---');
  for (const l of (listings.results || [])) {
    console.log('\n========================================');
    console.log('ID:', l.listing_id);
    console.log('Title:', l.title);
    console.log('State:', l.state);
    console.log('Price:', l.price?.amount / l.price?.divisor, l.price?.currency_code);
    console.log('Tags:', (l.tags || []).join(', '));
    console.log('Tag count:', (l.tags || []).length);
    console.log('Images:', (l.images || []).length);
    console.log('Description length:', (l.description || '').length, 'chars');
    console.log('Description preview:', (l.description || '').substring(0, 200) + '...');
    console.log('Is digital:', l.is_digital);
    console.log('Quantity:', l.quantity);
    console.log('Views:', l.views);
    console.log('Favorites:', l.num_favorers);
    console.log('URL:', l.url);
  }
}
run().catch(e => console.error(e));

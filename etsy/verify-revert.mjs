import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const EXPECT = {
  4513506781:2.49,4513508098:2.49,4513508118:2.49,
  4489981356:4.49,4489982664:4.49,4495056564:4.49,4513517597:4.49,4513518746:4.49,4513518762:4.49,4513518786:4.49,
  4482132169:4.99,4513508150:4.99,4514204763:4.99,4516511462:4.99,4516511480:4.99,4516511490:4.99,
  4495052093:5.99,4495077633:5.99,4495083274:5.99,4495083342:5.99,
  4495077741:7.99,4495083368:7.99,4495083454:7.99,4495089980:19.99,
  4495049647:8.98,4495055944:8.98, // controls must be UNTOUCHED
};
const token = await getEtsyToken();
const hdrs = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, 'Authorization': `Bearer ${token}` };
let pass=0, fail=0;
for (const [id, want] of Object.entries(EXPECT)) {
  const r = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${id}`, { headers: hdrs })).json();
  const p = r.price ? r.price.amount/r.price.divisor : NaN;
  const st = r.state;
  if (Math.abs(p-want)<0.001 && st==='active') pass++;
  else { console.log(`MISMATCH ${id}: $${p} state=${st}, wanted $${want} active`); fail++; }
  await new Promise(res=>setTimeout(res,1100));
}
console.log(`Verified: ${pass}/26 correct (24 reverts + 2 held controls), ${fail} mismatches`);

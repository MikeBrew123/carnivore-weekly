import json, os, subprocess, sys, urllib.request, urllib.error, datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(REPO, 'secrets', 'api-keys.json')) as f:
    d = json.load(f)
etsy = d['etsy']
# api_key / shared_secret are the static app identifiers and do not rotate.
api_key = etsy['api_key']
shared_secret = etsy['shared_secret']
combined_key = f'{api_key}:{shared_secret}'


def live_access_token():
    """Get a valid Etsy access token from the single source of truth.

    This script used to read `access_token` out of secrets/api-keys.json. Etsy
    access tokens live about an hour, so that copy is stale almost always and
    every call came back 401 invalid_token. That is why the daily snapshot has
    been fine while this report has been broken: etsy-snapshot.mjs goes through
    etsy/token.mjs, which holds the shared Supabase `etsy_tokens` row and
    refreshes on demand.

    Refreshing is deliberately delegated to that module rather than reimplemented
    here. Etsy rotates the refresh token on every use and invalidates the
    previous one, so a second refresh chain in Python would silently break the
    Worker and every other script.
    """
    js = ("import { getEtsyToken } from './etsy/token.mjs';"
          "process.stdout.write(await getEtsyToken());")
    try:
        out = subprocess.run(['node', '--input-type=module', '-e', js],
                             cwd=REPO, capture_output=True, text=True, timeout=90)
    except FileNotFoundError:
        sys.exit('node is not on PATH, so the Etsy token cannot be refreshed.')
    token = (out.stdout or '').strip()
    if out.returncode != 0 or not token:
        # stderr can carry Supabase URLs but never the token itself.
        sys.exit('Could not get an Etsy access token via etsy/token.mjs:\n'
                 + (out.stderr or '').strip()[:500]
                 + '\nIf this says invalid_grant, re-authorize: node etsy/etsy-oauth.mjs')
    return token


access_token = live_access_token()

headers = {
    'x-api-key': combined_key,
    'Authorization': f'Bearer {access_token}'
}

SHOP_ID = 63916912

def get(url):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'msg': e.read().decode()[:400]}

# Shop details
shop = get(f'https://openapi.etsy.com/v3/application/shops/{SHOP_ID}')
print('=== SHOP ===')
for k in ['shop_name','title','num_favorers','transaction_sold_count','review_count','review_average','listing_active_count','currency_code']:
    print(f'  {k}: {shop.get(k, "N/A")}')

# Active listings
listings = get(f'https://openapi.etsy.com/v3/application/shops/{SHOP_ID}/listings/active?limit=100')
print('\n=== ACTIVE LISTINGS ===')
if 'results' in listings:
    for l in listings['results']:
        price_amount = l.get('price', {}).get('amount', 0)
        price_div = l.get('price', {}).get('divisor', 100)
        price = price_amount / price_div if price_div else 0
        print(f"  [{l['listing_id']}] {l['title'][:60]}")
        print(f"    price:${price:.2f}  views:{l.get('views',0)}  favs:{l.get('num_favorers',0)}")
else:
    print(json.dumps(listings)[:300])

# Orders
receipts = get(f'https://openapi.etsy.com/v3/application/shops/{SHOP_ID}/receipts?limit=100&was_paid=true')
print('\n=== ORDERS (all paid) ===')
if 'results' in receipts:
    count = receipts.get('count', len(receipts['results']))
    print(f'Total orders: {count}')
    total_rev = 0
    by_month = {}
    for r in receipts['results']:
        ts = r.get('create_timestamp', 0)
        dt = datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
        month = dt[:7]
        gt = r.get('grandtotal', {})
        amt = gt.get('amount', 0) / gt.get('divisor', 100) if gt.get('divisor') else 0
        total_rev += amt
        by_month[month] = by_month.get(month, 0) + amt
        print(f"  {dt}  ${amt:.2f}")
    print(f'\n  TOTAL REVENUE: ${total_rev:.2f}')
    print('\n  BY MONTH:')
    for m, rev in sorted(by_month.items()):
        print(f'    {m}: ${rev:.2f}')
else:
    print(json.dumps(receipts)[:400])

# Listing transactions for product breakdown
print('\n=== PRODUCT BREAKDOWN ===')
txns = get(f'https://openapi.etsy.com/v3/application/shops/{SHOP_ID}/transactions?limit=100')
if 'results' in txns:
    by_product = {}
    for t in txns['results']:
        title = t.get('title', 'Unknown')[:50]
        price = t.get('price', {}).get('amount', 0) / t.get('price', {}).get('divisor', 100) if t.get('price', {}).get('divisor') else 0
        by_product[title] = by_product.get(title, {'count': 0, 'revenue': 0})
        by_product[title]['count'] += 1
        by_product[title]['revenue'] += price
    for title, data in sorted(by_product.items(), key=lambda x: -x[1]['revenue']):
        print(f"  {data['count']}x  ${data['revenue']:.2f}  {title}")
else:
    print(json.dumps(txns)[:300])

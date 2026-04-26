#!/usr/bin/env python3
"""Create all Printify products: 2 black tees, 1 blue tee, 1 navy hoodie, 3 stickers."""
import json, urllib.request, time

secrets = json.load(open('../secrets/api-keys.json'))
KEY = secrets['printify']['api_key']
SHOP = 24087274
images = json.load(open('/tmp/printify-image-ids.json'))

HEADERS = {
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
}

def create_product(product_data):
    payload = json.dumps(product_data).encode()
    req = urllib.request.Request(
        f"https://api.printify.com/v1/shops/{SHOP}/products.json",
        data=payload, headers=HEADERS, method="POST"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        data = json.loads(resp.read())
        return data
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ❌ HTTP {e.code}: {body[:500]}")
        return None

# Variant IDs
BLACK_TEE = [  # Gildan Softstyle 145 / Monster Digital 29
    {"id": 38164, "price": 2999, "is_enabled": True},  # S
    {"id": 38178, "price": 2999, "is_enabled": True},  # M
    {"id": 38192, "price": 2999, "is_enabled": True},  # L
    {"id": 38206, "price": 2999, "is_enabled": True},  # XL
    {"id": 38220, "price": 2999, "is_enabled": True},  # 2XL
    {"id": 42122, "price": 2999, "is_enabled": True},  # 3XL
]

ROYAL_TEE = [  # Royal Blue - Gildan Softstyle 145
    {"id": 38161, "price": 2999, "is_enabled": True},  # S
    {"id": 38175, "price": 2999, "is_enabled": True},  # M
    {"id": 38189, "price": 2999, "is_enabled": True},  # L
    {"id": 38203, "price": 2999, "is_enabled": True},  # XL
    {"id": 38217, "price": 2999, "is_enabled": True},  # 2XL
    {"id": 42118, "price": 2999, "is_enabled": True},  # 3XL
]

NAVY_HOODIE = [  # Heavy Blend 77 / Monster Digital 29
    {"id": 32894, "price": 4999, "is_enabled": True},  # S
    {"id": 32895, "price": 4999, "is_enabled": True},  # M
    {"id": 32896, "price": 4999, "is_enabled": True},  # L
    {"id": 32897, "price": 4999, "is_enabled": True},  # XL
    {"id": 32898, "price": 4999, "is_enabled": True},  # 2XL
    {"id": 32899, "price": 4999, "is_enabled": True},  # 3XL
]

STICKER_4x4 = [  # Kiss-cut 400 / SPOKE 1
    {"id": 45752, "price": 599, "is_enabled": True},  # 4x4 White
]

products = [
    # 1. Meat Heals - Black T-Shirt
    {
        "title": "Meat Heals T-Shirt - Carnivore Diet Shirt - Distressed Vintage Design",
        "description": "Meat heals. That's the whole message.\n\nDistressed vintage design for the carnivore who knows what works. Soft, comfortable, and conversation-starting.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 145,
        "print_provider_id": 29,
        "variants": BLACK_TEE,
        "print_areas": [{"variant_ids": [v["id"] for v in BLACK_TEE], "placeholders": [{"position": "front", "images": [{"id": images["meat-heals.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["carnivore diet", "meat heals", "carnivore shirt", "meat lover", "keto shirt", "animal based", "zero carb", "carnivore gift"]
    },
    # 2. Food Pyramid - Black T-Shirt
    {
        "title": "Real Food Pyramid T-Shirt - Carnivore Diet - Inverted Food Pyramid Shirt",
        "description": "The real food pyramid: all meat, top to bottom.\n\nAn illustrated inverted food pyramid the way nature intended. Bold, colorful design on a black tee.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 145,
        "print_provider_id": 29,
        "variants": BLACK_TEE,
        "print_areas": [{"variant_ids": [v["id"] for v in BLACK_TEE], "placeholders": [{"position": "front", "images": [{"id": images["food-pyramid.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["food pyramid", "carnivore diet", "inverted pyramid", "meat lover", "carnivore shirt", "keto shirt", "animal based", "carnivore gift"]
    },
    # 3. MEAT Collegiate - Royal Blue T-Shirt
    {
        "title": "MEAT Collegiate T-Shirt - Varsity Style Carnivore Shirt - Blue",
        "description": "MEAT. In bold collegiate letters. Like your favorite university hoodie, but better.\n\nClassic varsity-style design on royal blue. Simple, clean, unmistakable.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 145,
        "print_provider_id": 29,
        "variants": ROYAL_TEE,
        "print_areas": [{"variant_ids": [v["id"] for v in ROYAL_TEE], "placeholders": [{"position": "front", "images": [{"id": images["meat-collegiate.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["meat shirt", "collegiate", "varsity", "carnivore diet", "meat lover", "carnivore shirt", "university style", "carnivore gift"]
    },
    # 4. MEAT Collegiate - Navy Hoodie
    {
        "title": "MEAT Collegiate Hoodie - Varsity Style Carnivore Hoodie - Navy",
        "description": "MEAT. The only four letters that matter.\n\nBold collegiate lettering on a heavyweight navy hoodie. Cozy, warm, and makes a statement without saying a word.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 77,
        "print_provider_id": 29,
        "variants": NAVY_HOODIE,
        "print_areas": [{"variant_ids": [v["id"] for v in NAVY_HOODIE], "placeholders": [{"position": "front", "images": [{"id": images["meat-collegiate.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["meat hoodie", "collegiate", "carnivore diet", "varsity hoodie", "meat lover", "carnivore hoodie", "navy hoodie", "carnivore gift"]
    },
    # 5. Meat Heals Sticker
    {
        "title": "Meat Heals Sticker - Carnivore Diet Sticker - Vintage Distressed",
        "description": "Slap this on your water bottle, laptop, or cooler. Meat heals.\n\n4x4 inch kiss-cut sticker. Durable, waterproof vinyl.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 400,
        "print_provider_id": 1,
        "variants": STICKER_4x4,
        "print_areas": [{"variant_ids": [45752], "placeholders": [{"position": "front", "images": [{"id": images["meat-heals.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["meat heals", "carnivore sticker", "meat sticker", "diet sticker", "laptop sticker", "carnivore diet", "meat lover", "vinyl sticker"]
    },
    # 6. Food Pyramid Sticker
    {
        "title": "Real Food Pyramid Sticker - Carnivore Diet - Inverted Pyramid",
        "description": "The real food pyramid belongs on everything you own.\n\n4x4 inch kiss-cut sticker. Durable, waterproof vinyl.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 400,
        "print_provider_id": 1,
        "variants": STICKER_4x4,
        "print_areas": [{"variant_ids": [45752], "placeholders": [{"position": "front", "images": [{"id": images["food-pyramid.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["food pyramid", "carnivore sticker", "inverted pyramid", "diet sticker", "laptop sticker", "carnivore diet", "meat lover", "vinyl sticker"]
    },
    # 7. BBBE Sticker
    {
        "title": "BBBE Sticker - Beef Bacon Butter Eggs - Carnivore Diet Essentials",
        "description": "Beef. Bacon. Butter. Eggs. The four food groups.\n\n4x4 inch kiss-cut sticker with illustrated food design. Durable, waterproof vinyl.\n\nFrom CarnivoreWeekly.com",
        "blueprint_id": 400,
        "print_provider_id": 1,
        "variants": STICKER_4x4,
        "print_areas": [{"variant_ids": [45752], "placeholders": [{"position": "front", "images": [{"id": images["bbbe.png"], "x": 0.5, "y": 0.5, "scale": 1, "angle": 0}]}]}],
        "tags": ["bbbe", "beef bacon butter eggs", "carnivore sticker", "carnivore diet", "meat sticker", "diet sticker", "carnivore essentials", "vinyl sticker"]
    },
]

created = []
for i, p in enumerate(products, 1):
    print(f"\n[{i}/7] Creating: {p['title'][:60]}...")
    result = create_product(p)
    if result:
        pid = result["id"]
        created.append({"id": pid, "title": p["title"]})
        print(f"  ✅ Product ID: {pid}")
    time.sleep(1)  # Rate limit

print(f"\n=== Created {len(created)}/7 products ===")
with open("/tmp/printify-products.json", "w") as f:
    json.dump(created, f, indent=2)
for c in created:
    print(f"  {c['id']}: {c['title'][:60]}")

#!/usr/bin/env python3
"""Resize food icons to thumbnails and generate base64 for HTML embedding."""
import json, base64, io, os
from PIL import Image

icons = ['beef', 'organs', 'lamb', 'pork', 'poultry', 'seafood', 'dairy', 'vegetables', 'nuts-berries', 'grains-legumes']
THUMB_SIZE = 300  # px for landscape layout (print-quality at 300 DPI)
THUMB_SIZE_PORTRAIT = 400  # px for portrait layout (print-quality at 300 DPI)

results = {}
for name in icons:
    path = f'/tmp/food-icon-{name}.png'
    if not os.path.exists(path):
        print(f'  ❌ Missing: {path}')
        continue

    img = Image.open(path).convert('RGBA')

    # Create landscape thumbnail
    img_sm = img.resize((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
    buf = io.BytesIO()
    img_sm.save(buf, 'PNG', optimize=True)
    buf.seek(0)
    b64_sm = base64.b64encode(buf.read()).decode()

    # Create portrait thumbnail
    img_lg = img.resize((THUMB_SIZE_PORTRAIT, THUMB_SIZE_PORTRAIT), Image.LANCZOS)
    buf2 = io.BytesIO()
    img_lg.save(buf2, 'PNG', optimize=True)
    buf2.seek(0)
    b64_lg = base64.b64encode(buf2.read()).decode()

    results[name] = {
        'landscape': b64_sm,
        'portrait': b64_lg,
        'landscape_size': len(b64_sm),
        'portrait_size': len(b64_lg)
    }
    print(f'  ✅ {name}: landscape {len(b64_sm)//1024}KB, portrait {len(b64_lg)//1024}KB')

with open('/tmp/food-icons-b64.json', 'w') as f:
    json.dump(results, f)

print(f'\nTotal icons: {len(results)}')
print(f'Saved to /tmp/food-icons-b64.json')

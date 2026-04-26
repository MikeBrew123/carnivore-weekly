#!/usr/bin/env python3
"""Remove backgrounds from food icons and re-generate base64."""
import json, base64, io, os, numpy as np
from PIL import Image, ImageFilter

icons = ['beef', 'organs', 'lamb', 'pork', 'poultry', 'seafood', 'dairy', 'vegetables', 'nuts-berries', 'grains-legumes']

results = {}
for name in icons:
    path = f'/tmp/food-icon-{name}.png'
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)

    # Detect bg from corners (20x20 patches)
    corners = []
    for cy, cx in [(0,0), (0,-20), (-20,0), (-20,-20)]:
        patch = arr[cy:cy+20 if cy>=0 else None, cx:cx+20 if cx>=0 else None, :3]
        corners.append(patch.reshape(-1, 3))
    bg_color = np.median(np.vstack(corners), axis=0).astype(np.uint8)

    # Remove bg with tolerance
    tolerance = 40
    diff = np.abs(arr[:,:,:3].astype(int) - bg_color.astype(int))
    mask = np.all(diff < tolerance, axis=2)
    alpha = np.where(mask, 0, 255).astype(np.uint8)

    # Feather edges
    alpha_img = Image.fromarray(alpha)
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=1))
    arr[:,:,3] = np.array(alpha_img)

    img_clean = Image.fromarray(arr, 'RGBA')

    # Crop to content
    bbox = img_clean.getbbox()
    if bbox:
        pad = 5
        x1, y1, x2, y2 = bbox
        x1 = max(0, x1-pad); y1 = max(0, y1-pad)
        x2 = min(img_clean.width, x2+pad); y2 = min(img_clean.height, y2+pad)
        img_clean = img_clean.crop((x1, y1, x2, y2))

    # Resize for landscape (40px) and portrait (60px)
    for size_name, sz in [('landscape', 40), ('portrait', 60)]:
        thumb = img_clean.copy()
        thumb.thumbnail((sz, sz), Image.LANCZOS)
        buf = io.BytesIO()
        thumb.save(buf, 'PNG', optimize=True)
        buf.seek(0)
        results.setdefault(name, {})[size_name] = base64.b64encode(buf.read()).decode()

    print(f'  ✅ {name}: bg removed, cropped')

with open('/tmp/food-icons-b64.json', 'w') as f:
    json.dump(results, f)
print(f'\nAll {len(results)} icons processed with transparent backgrounds')

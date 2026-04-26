#!/usr/bin/env python3
"""Upscale designs to 4500px wide and remove solid backgrounds for DTG printing."""
from PIL import Image
import numpy as np
import os

designs = [
    {"src": "/tmp/replicate-meatheals2.png", "out": "/tmp/print-meatheals.png", "bg": "dark"},
    {"src": "/tmp/replicate-pyramid.png", "out": "/tmp/print-pyramid.png", "bg": "dark"},
    {"src": "/tmp/replicate-meat-collegiate.png", "out": "/tmp/print-collegiate.png", "bg": "navy"},
    {"src": "/tmp/replicate-bbbe2.png", "out": "/tmp/print-bbbe.png", "bg": "dark"},
]

TARGET_W = 4500
TARGET_H = 5400

for d in designs:
    name = os.path.basename(d["src"])
    print(f"\nProcessing {name}...")

    img = Image.open(d["src"]).convert("RGBA")
    arr = np.array(img)
    print(f"  Original: {img.size}")

    # Detect background color from corners (sample 20x20 from each corner)
    corners = []
    for cy, cx in [(0, 0), (0, -20), (-20, 0), (-20, -20)]:
        patch = arr[cy:cy+20 if cy >= 0 else None, cx:cx+20 if cx >= 0 else None, :3]
        corners.append(patch.reshape(-1, 3))
    corner_pixels = np.vstack(corners)
    bg_color = np.median(corner_pixels, axis=0).astype(np.uint8)
    print(f"  Detected BG: RGB({bg_color[0]}, {bg_color[1]}, {bg_color[2]})")

    # Remove background: pixels within tolerance of bg_color become transparent
    tolerance = 45
    diff = np.abs(arr[:, :, :3].astype(int) - bg_color.astype(int))
    mask = np.all(diff < tolerance, axis=2)

    # Create alpha channel: bg pixels = 0, design pixels = 255
    alpha = np.where(mask, 0, 255).astype(np.uint8)

    # Edge feathering: soften the boundary
    from PIL import ImageFilter
    alpha_img = Image.fromarray(alpha, mode='L')
    # Slight blur for anti-aliasing
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(radius=1))
    arr[:, :, 3] = np.array(alpha_img)

    img_transparent = Image.fromarray(arr, 'RGBA')

    # Crop to content bounding box with padding
    bbox = img_transparent.getbbox()
    if bbox:
        pad = 20
        x1 = max(0, bbox[0] - pad)
        y1 = max(0, bbox[1] - pad)
        x2 = min(img_transparent.width, bbox[2] + pad)
        y2 = min(img_transparent.height, bbox[3] + pad)
        img_transparent = img_transparent.crop((x1, y1, x2, y2))
        print(f"  Cropped to content: {img_transparent.size}")

    # Upscale to target using LANCZOS
    # Maintain aspect ratio, fit within TARGET_W x TARGET_H
    w, h = img_transparent.size
    scale = min(TARGET_W / w, TARGET_H / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    img_upscaled = img_transparent.resize((new_w, new_h), Image.LANCZOS)
    print(f"  Upscaled to: {img_upscaled.size}")

    # Save
    img_upscaled.save(d["out"], "PNG", optimize=True)
    size_mb = os.path.getsize(d["out"]) / (1024 * 1024)
    print(f"  Saved: {d['out']} ({size_mb:.1f} MB)")

print("\nAll designs processed!")

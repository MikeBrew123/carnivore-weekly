#!/usr/bin/env python3
"""Compress PNGs and upload to Printify. Printify limit ~10MB base64."""
import json, base64, urllib.request, io
from PIL import Image

secrets = json.load(open('../secrets/api-keys.json'))
KEY = secrets['printify']['api_key']

images = [
    ("/tmp/print-collegiate.png", "meat-collegiate.png"),    # smallest first
    ("/tmp/print-meatheals.png", "meat-heals.png"),
    ("/tmp/print-pyramid.png", "food-pyramid.png"),
    ("/tmp/print-bbbe.png", "bbbe.png"),
]

results = {}
for path, name in images:
    print(f"\nProcessing {name}...")
    img = Image.open(path)
    print(f"  Size: {img.size}, Mode: {img.mode}")

    # Convert RGBA to RGB on white background for smaller file
    # DTG printing uses white shirt base anyway for transparent areas
    # Actually for DTG we need the transparency — keep RGBA but optimize

    # Save optimized PNG to buffer
    buf = io.BytesIO()
    # Use maximum compression
    img.save(buf, "PNG", optimize=True, compress_level=9)
    raw_size = buf.tell()
    print(f"  Compressed: {raw_size / (1024*1024):.1f} MB")

    # If still too large, downscale slightly
    if raw_size > 8_000_000:
        # Scale down to fit in 8MB
        scale = (8_000_000 / raw_size) ** 0.5
        new_w = int(img.width * scale)
        new_h = int(img.height * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True, compress_level=9)
        raw_size = buf.tell()
        print(f"  Rescaled to {img.size}: {raw_size / (1024*1024):.1f} MB")

    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    print(f"  Base64: {len(b64) / (1024*1024):.1f} MB")

    payload = json.dumps({"file_name": name, "contents": b64}).encode()
    print(f"  Payload: {len(payload) / (1024*1024):.1f} MB — uploading...")

    req = urllib.request.Request(
        "https://api.printify.com/v1/uploads/images.json",
        data=payload,
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        },
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=180)
        data = json.loads(resp.read())
        results[name] = data["id"]
        print(f"  ✅ → ID: {data['id']} ({data.get('width','?')}x{data.get('height','?')})")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ❌ HTTP {e.code}: {body[:200]}")

print("\n=== Image IDs ===")
print(json.dumps(results, indent=2))
with open("/tmp/printify-image-ids.json", "w") as f:
    json.dump(results, f, indent=2)

#!/usr/bin/env python3
"""Upload design images to Printify via base64 API."""
import json, base64, urllib.request

secrets = json.load(open('../secrets/api-keys.json'))
KEY = secrets['printify']['api_key']

images = [
    ("/tmp/print-meatheals.png", "meat-heals.png"),
    ("/tmp/print-pyramid.png", "food-pyramid.png"),
    ("/tmp/print-collegiate.png", "meat-collegiate.png"),
    ("/tmp/print-bbbe.png", "bbbe.png"),
]

results = {}
for path, name in images:
    print(f"Uploading {name}...")
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    payload = json.dumps({"file_name": name, "contents": b64}).encode()
    req = urllib.request.Request(
        "https://api.printify.com/v1/uploads/images.json",
        data=payload,
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    resp = urllib.request.urlopen(req, timeout=120)
    data = json.loads(resp.read())
    results[name] = data["id"]
    print(f"  ✅ {name} → ID: {data['id']} ({data.get('width','?')}x{data.get('height','?')})")

print("\nImage IDs:")
print(json.dumps(results, indent=2))

# Save for next step
with open("/tmp/printify-image-ids.json", "w") as f:
    json.dump(results, f, indent=2)

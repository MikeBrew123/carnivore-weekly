#!/usr/bin/env python3
"""
Generate a lifestyle background via Replicate Flux, then composite
actual product screenshots onto it for the Etsy hero image.
"""
import json, os, time, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(DIR, 'listing-images')
SECRETS = json.load(open(os.path.join(DIR, '../../secrets/api-keys.json')))
TOKEN = SECRETS['replicate']['api_token']

# ─── Step 1: Generate background scene ───
print("Generating lifestyle background via Replicate Flux...")

prompt = (
    "Flat lay photography from above of a clean bright white marble kitchen countertop, "
    "morning sunlight from left window casting soft shadows, "
    "a cup of black coffee in white ceramic mug top-left corner, "
    "small potted succulent plant bottom-right corner, "
    "scattered fresh vegetables (avocado half, small broccoli floret, few almonds) around edges, "
    "large clean empty center space for placing documents, "
    "soft bokeh background, warm neutral tones, "
    "professional food photography style, 4k, photorealistic"
)

# Submit prediction
data = json.dumps({
    "version": "flux-1.1-pro",
    "input": {
        "prompt": prompt,
        "width": 1024,
        "height": 1024,
        "prompt_upsampling": True,
        "safety_tolerance": 5,
    }
}).encode()

req = urllib.request.Request(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions',
    data=data,
    headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
        'Prefer': 'wait'
    }
)

try:
    res = urllib.request.urlopen(req, timeout=120)
    result = json.loads(res.read())

    if result.get('status') == 'succeeded' and result.get('output'):
        img_url = result['output']
        if isinstance(img_url, list):
            img_url = img_url[0]
        print(f"  Image URL: {img_url[:80]}...")

        # Download
        bg_path = os.path.join(IMG_DIR, 'bg-scene.jpg')
        urllib.request.urlretrieve(img_url, bg_path)
        print(f"  Downloaded background scene")
    else:
        print(f"  Status: {result.get('status')}")
        if result.get('error'):
            print(f"  Error: {result['error']}")
        # Try polling
        if result.get('urls', {}).get('get'):
            poll_url = result['urls']['get']
            for i in range(30):
                time.sleep(3)
                poll_req = urllib.request.Request(poll_url, headers={'Authorization': f'Bearer {TOKEN}'})
                poll_res = urllib.request.urlopen(poll_req)
                poll_data = json.loads(poll_res.read())
                print(f"  Poll {i+1}: {poll_data.get('status')}")
                if poll_data.get('status') == 'succeeded':
                    img_url = poll_data['output']
                    if isinstance(img_url, list):
                        img_url = img_url[0]
                    bg_path = os.path.join(IMG_DIR, 'bg-scene.jpg')
                    urllib.request.urlretrieve(img_url, bg_path)
                    print(f"  Downloaded background scene")
                    break
                elif poll_data.get('status') == 'failed':
                    print(f"  Failed: {poll_data.get('error')}")
                    raise SystemExit(1)

except Exception as e:
    print(f"  Error: {e}")
    # Fallback: create a simple gradient background
    print("  Using fallback gradient background...")
    bg = Image.new('RGB', (2000, 2000), '#f5f0eb')
    draw = ImageDraw.Draw(bg)
    # Subtle radial gradient
    for y in range(2000):
        for x in range(0, 2000, 4):
            dist = ((x - 1000)**2 + (y - 1000)**2) ** 0.5
            factor = min(dist / 1400, 1.0)
            r = int(245 - factor * 20)
            g = int(240 - factor * 18)
            b = int(235 - factor * 15)
            draw.rectangle([(x, y), (x+4, y+1)], fill=(r, g, b))
    bg_path = os.path.join(IMG_DIR, 'bg-scene.jpg')
    bg.save(bg_path, 'JPEG', quality=95)

# ─── Step 2: Composite actual product screenshots onto background ───
print("\nCompositing product screenshots onto background...")

bg = Image.open(os.path.join(IMG_DIR, 'bg-scene.jpg')).resize((2000, 2000), Image.LANCZOS)

# Load product page screenshots
eat_limit = Image.open(os.path.join(IMG_DIR, 'eat-limit-avoid-p1.png'))
grocery = Image.open(os.path.join(IMG_DIR, 'grocery-checklist-p1.png'))
carb_sheet = Image.open(os.path.join(IMG_DIR, 'bundle-p1.png'))

def add_page_shadow(page_img, shadow_size=15):
    """Add realistic drop shadow to a page image."""
    w, h = page_img.size
    shadow = Image.new('RGBA', (w + shadow_size*2, h + shadow_size*2), (0,0,0,0))
    shadow_rect = Image.new('RGBA', (w, h), (0,0,0,80))
    shadow.paste(shadow_rect, (shadow_size+4, shadow_size+4))
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_size))
    shadow.paste(page_img, (shadow_size//2, shadow_size//2))
    return shadow

# Size pages
page_h = 1300
page_w = int(page_h * 816 / 1056)

# Three pages in overlapping stack
main = eat_limit.resize((page_w, page_h), Image.LANCZOS)
back1 = carb_sheet.resize((page_w, page_h), Image.LANCZOS)
back2 = grocery.resize((page_w, page_h), Image.LANCZOS)

main_s = add_page_shadow(main)
back1_s = add_page_shadow(back1)
back2_s = add_page_shadow(back2)

# Position: center with offsets
cx = (2000 - page_w) // 2
cy = 280

bg.paste(back1_s, (cx - 140, cy + 50), back1_s)
bg.paste(back2_s, (cx + 140, cy + 35), back2_s)
bg.paste(main_s, (cx, cy), main_s)

# Add title banner
draw = ImageDraw.Draw(bg)
# Semi-transparent dark bar at top
bar = Image.new('RGBA', (2000, 200), (44, 62, 80, 230))
bg.paste(bar, (0, 0), bar)
draw = ImageDraw.Draw(bg)

try:
    font_big = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
    font_med = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 28)
    font_sm = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
except:
    font_big = ImageFont.load_default()
    font_med = font_big
    font_sm = font_big

# Title text
title = "KETO FOOD LIST"
bbox = draw.textbbox((0, 0), title, font=font_big)
tw = bbox[2] - bbox[0]
draw.text(((2000 - tw) // 2, 25), title, fill='#ffffff', font=font_big)

subtitle = "10-Page Printable Bundle  •  US Letter + A4  •  Instant Download"
bbox2 = draw.textbbox((0, 0), subtitle, font=font_med)
tw2 = bbox2[2] - bbox2[0]
draw.text(((2000 - tw2) // 2, 115), subtitle, fill='#cccccc', font=font_med)

# Badge bottom-right
badge_text = "PDF  •  Print at Home"
bw, bh = 340, 55
bx, by = 2000 - bw - 40, 2000 - bh - 40
draw.rounded_rectangle([(bx, by), (bx+bw, by+bh)], radius=28, fill='#27ae60')
bbox3 = draw.textbbox((0, 0), badge_text, font=font_sm)
tw3 = bbox3[2] - bbox3[0]
draw.text((bx + (bw - tw3) // 2, by + 15), badge_text, fill='#ffffff', font=font_sm)

# Save
out_path = os.path.join(IMG_DIR, 'listing-hero-pro.jpg')
bg.convert('RGB').save(out_path, 'JPEG', quality=93)
print(f"\nSaved: {out_path}")
print("Done!")

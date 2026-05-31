#!/usr/bin/env python3
"""Create Etsy listing images from PDF page screenshots."""

from PIL import Image, ImageDraw, ImageFont
import os

DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(DIR, 'listing-images')
OUT_DIR = IMG_DIR

# Etsy listing image size: 2700x2025 (4:3 landscape) or 2000x2000 (square)
# Using 2000x2000 square for max compatibility
W, H = 2000, 2000

def load(name):
    return Image.open(os.path.join(IMG_DIR, name))

def add_shadow(img, offset=8, blur=0):
    """Add a simple drop shadow effect."""
    shadow = Image.new('RGBA', (img.width + offset*2, img.height + offset*2), (0,0,0,0))
    shadow_layer = Image.new('RGBA', img.size, (0,0,0,60))
    shadow.paste(shadow_layer, (offset, offset))
    shadow.paste(img, (0, 0))
    return shadow

def add_text(draw, text, x, y, size, color='#1a1a2e', bold=True):
    """Add text - uses default font at specified size."""
    try:
        if bold:
            font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)
        else:
            font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)
    except:
        font = ImageFont.load_default()
    draw.text((x, y), text, fill=color, font=font)
    return font

def add_centered_text(draw, text, y, size, color='#1a1a2e', w=W):
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, y), text, fill=color, font=font)

# ════════════════════════════════════════════════════════════════
# IMAGE 1: HERO - Fanned pages with title
# ════════════════════════════════════════════════════════════════
def create_image1():
    img = Image.new('RGB', (W, H), '#f5f0eb')
    draw = ImageDraw.Draw(img)

    # Title banner at top
    draw.rectangle([(0, 0), (W, 180)], fill='#2c3e50')
    add_centered_text(draw, 'KETO FOOD LIST', 15, 80, '#ffffff')
    add_centered_text(draw, 'Printable Bundle  •  10 Pages  •  US Letter + A4', 115, 30, '#cccccc')
    add_centered_text(draw, 'INSTANT DOWNLOAD', 155, 18, '#27ae60')

    # Overlapping cascade - 3 pages stacked with offset (no rotation)
    page_h = 1500
    page_w = int(page_h * 816 / 1056)

    pages_to_show = [
        ('bundle-p1.png', -180, 40),       # Net carb (left, behind)
        ('grocery-checklist-p1.png', 180, 30),  # Grocery (right, behind)
        ('eat-limit-avoid-p1.png', 0, 0),   # Eat/limit/avoid (center, front)
    ]

    center_x = (W - page_w) // 2
    start_y = 240

    for fname, x_offset, y_offset in pages_to_show:
        p = load(fname).resize((page_w, page_h), Image.LANCZOS)
        p_shadow = add_shadow(p, 8)
        px = center_x + x_offset
        py = start_y + y_offset
        img.paste(p_shadow, (px, py), p_shadow)

    # Badge bottom-right
    badge_w, badge_h = 320, 50
    bx, by = W - badge_w - 30, H - badge_h - 30
    draw.rounded_rectangle([(bx, by), (bx+badge_w, by+badge_h)], radius=25, fill='#27ae60')
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), 'PDF  •  Print at Home', font=font)
    tw = bbox[2] - bbox[0]
    draw.text((bx + (badge_w - tw) // 2, by + 13), 'PDF  •  Print at Home', fill='#fff', font=font)

    img.save(os.path.join(OUT_DIR, 'listing-1-hero.jpg'), 'JPEG', quality=92)
    print('listing-1-hero.jpg done')

# ════════════════════════════════════════════════════════════════
# IMAGE 2: ZOOM - Eat/Limit/Avoid close-up
# ════════════════════════════════════════════════════════════════
def create_image2():
    img = Image.new('RGB', (W, H), '#f5f0eb')
    draw = ImageDraw.Draw(img)

    p = load('eat-limit-avoid-p1.png')
    # Scale to fill most of the frame
    scale_h = 1750
    scale_w = int(scale_h * p.width / p.height)
    p = p.resize((scale_w, scale_h), Image.LANCZOS)

    px = (W - scale_w) // 2
    py = (H - scale_h) // 2 + 30

    # Add border/shadow
    draw.rectangle([(px-4, py-4), (px+scale_w+4, py+scale_h+4)], fill='#ddd')
    img.paste(p, (px, py))

    # Small label at top
    draw.rectangle([(0, 0), (W, 80)], fill='#2c3e50')
    add_centered_text(draw, 'EAT  •  LIMIT  •  AVOID  —  At a Glance', 22, 32, '#ffffff')

    img.save(os.path.join(OUT_DIR, 'listing-2-eat-limit-avoid.jpg'), 'JPEG', quality=92)
    print('listing-2-eat-limit-avoid.jpg done')

# ════════════════════════════════════════════════════════════════
# IMAGE 3: WHAT'S INCLUDED - Grid of all pages
# ════════════════════════════════════════════════════════════════
def create_image3():
    img = Image.new('RGB', (W, H), '#f5f0eb')
    draw = ImageDraw.Draw(img)

    # Title
    draw.rectangle([(0, 0), (W, 120)], fill='#2c3e50')
    add_centered_text(draw, "WHAT'S INCLUDED  •  10 PAGES", 30, 42, '#ffffff')

    # Grid: 5 columns x 2 rows of page thumbnails
    all_pages = [
        ('eat-limit-avoid-p1.png', 'Eat / Limit / Avoid'),
        ('grocery-checklist-p1.png', 'Grocery Checklist'),
        ('bundle-p1.png', 'Net Carb Cheat Sheet'),
        ('bundle-p2.png', 'Keto Snacks List'),
        ('bundle-p3.png', 'Foods to Avoid'),
        ('bundle-p4.png', 'Protein-First Foods'),
        ('bundle-p5.png', 'Electrolyte Checklist'),
        ('bundle-p6.png', '7-Day Meal Planner'),
        ('bundle-p7.png', 'Blank Grocery List'),
        ('bundle-p8.png', 'Macro Notes Tracker'),
    ]

    cols, rows = 5, 2
    margin = 30
    gap = 16
    label_h = 44
    avail_w = W - margin * 2 - gap * (cols - 1)
    avail_h = H - 140 - margin - gap * (rows - 1) - label_h * rows
    thumb_w = avail_w // cols
    thumb_h = avail_h // rows

    for i, (fname, label) in enumerate(all_pages):
        col = i % cols
        row = i // cols
        x = margin + col * (thumb_w + gap)
        y = 140 + row * (thumb_h + gap + label_h)

        p = load(fname).resize((thumb_w, thumb_h), Image.LANCZOS)
        # Border
        draw.rectangle([(x-2, y-2), (x+thumb_w+2, y+thumb_h+2)], fill='#ddd')
        img.paste(p, (x, y))

        # Label below
        try:
            font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
        except:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        lx = x + (thumb_w - tw) // 2
        draw.text((lx, y + thumb_h + 6), label, fill='#555', font=font)

    img.save(os.path.join(OUT_DIR, 'listing-3-whats-included.jpg'), 'JPEG', quality=92)
    print('listing-3-whats-included.jpg done')

# ════════════════════════════════════════════════════════════════
# IMAGE 4: GROCERY CHECKLIST zoom
# ════════════════════════════════════════════════════════════════
def create_image4():
    img = Image.new('RGB', (W, H), '#f5f0eb')
    draw = ImageDraw.Draw(img)

    p = load('grocery-checklist-p1.png')
    scale_h = 1750
    scale_w = int(scale_h * p.width / p.height)
    p = p.resize((scale_w, scale_h), Image.LANCZOS)

    px = (W - scale_w) // 2
    py = (H - scale_h) // 2 + 30

    draw.rectangle([(px-4, py-4), (px+scale_w+4, py+scale_h+4)], fill='#ddd')
    img.paste(p, (px, py))

    draw.rectangle([(0, 0), (W, 80)], fill='#2c3e50')
    add_centered_text(draw, 'GROCERY CHECKLIST  •  12 Categories  •  Checkboxes', 22, 32, '#ffffff')

    img.save(os.path.join(OUT_DIR, 'listing-4-grocery.jpg'), 'JPEG', quality=92)
    print('listing-4-grocery.jpg done')

# ════════════════════════════════════════════════════════════════
# IMAGE 5: FORMAT DETAILS
# ════════════════════════════════════════════════════════════════
def create_image5():
    img = Image.new('RGB', (W, H), '#f5f0eb')
    draw = ImageDraw.Draw(img)

    # Title
    draw.rectangle([(0, 0), (W, 120)], fill='#2c3e50')
    add_centered_text(draw, 'DETAILS & FORMAT', 30, 42, '#ffffff')

    # Feature boxes
    features = [
        ('10 PAGES', 'Covers food lists, grocery,\nsnacks, macros & more'),
        ('US LETTER + A4', 'Both sizes included.\nPrint at home or any shop.'),
        ('INSTANT DOWNLOAD', 'Get your PDF immediately\nafter purchase.'),
        ('BEGINNER FRIENDLY', 'Perfect for keto starters.\nClear, organized, practical.'),
        ('PRINT & REUSE', 'Blank checklists &\nplanners you can reprint.'),
        ('CARB COUNTS', '100+ foods with net carb\ncounts per serving.'),
    ]

    cols, rows = 3, 2
    box_w = 560
    box_h = 300
    gap_x = 40
    gap_y = 40
    start_x = (W - cols * box_w - (cols-1) * gap_x) // 2
    start_y = 200

    colors = ['#27ae60', '#2980b9', '#e67e22', '#8e44ad', '#16a085', '#c0392b']

    for i, (title, desc) in enumerate(features):
        col = i % cols
        row = i // cols
        x = start_x + col * (box_w + gap_x)
        y = start_y + row * (box_h + gap_y)

        # Box
        draw.rounded_rectangle([(x, y), (x+box_w, y+box_h)], radius=12, fill='#ffffff', outline='#e0e0e0')
        # Color strip
        draw.rounded_rectangle([(x, y), (x+box_w, y+60)], radius=12, fill=colors[i])
        draw.rectangle([(x, y+48), (x+box_w, y+60)], fill=colors[i])

        # Title
        add_centered_text(draw, title, y + 14, 26, '#ffffff', w=x*2+box_w)

        # Description
        try:
            font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 24)
        except:
            font = ImageFont.load_default()
        lines = desc.split('\n')
        for j, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            draw.text((x + (box_w - tw) // 2, y + 90 + j * 36), line, fill='#555', font=font)

    # Bottom: site URL
    add_centered_text(draw, 'CarnivoreWeekly.com  •  KetoDial.com', H - 80, 28, '#aaa')

    # Show 2 small page previews at the bottom corners
    p1 = load('eat-limit-avoid-p1.png').resize((200, 260), Image.LANCZOS)
    p2 = load('bundle-p1.png').resize((200, 260), Image.LANCZOS)
    img.paste(p1, (60, H - 340))
    img.paste(p2, (W - 260, H - 340))

    img.save(os.path.join(OUT_DIR, 'listing-5-details.jpg'), 'JPEG', quality=92)
    print('listing-5-details.jpg done')


if __name__ == '__main__':
    create_image1()
    create_image2()
    create_image3()
    create_image4()
    create_image5()
    print('\nAll listing images created!')

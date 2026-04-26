#!/usr/bin/env python3
"""Embed food icon images into the diet food list HTML files."""
import json

icons = json.load(open('/tmp/food-icons-b64.json'))

# Map: which icon goes with which category headers in the landscape layout
# Format: (css class of diet column, category header text) → icon name
landscape_map = {
    # Lion
    ('lion', 'Beef Cuts'): 'beef',
    ('lion', 'Beef Organs'): 'organs',
    ('lion', 'Lamb'): 'lamb',
    ('lion', 'Cooking Fats'): 'dairy',
    # Carnivore
    ('carnivore', 'Beef'): 'beef',
    ('carnivore', 'Pork'): 'pork',
    ('carnivore', 'Poultry'): 'poultry',
    ('carnivore', 'Fish & Seafood'): 'seafood',
    ('carnivore', 'Dairy'): 'dairy',
    # Keto
    ('keto', 'Meat & Poultry'): 'beef',
    ('keto', 'Fish & Seafood'): 'seafood',
    ('keto', 'Dairy'): 'dairy',
    ('keto', 'Low-Carb Vegetables'): 'vegetables',
    ('keto', 'Nuts & Seeds'): 'nuts-berries',
    # Pescatarian
    ('pescatarian', 'Fresh Fish'): 'seafood',
    ('pescatarian', 'Eggs & Dairy'): 'dairy',
    ('pescatarian', 'Vegetables'): 'vegetables',
    ('pescatarian', 'Fruits'): 'nuts-berries',
    ('pescatarian', 'Grains'): 'grains-legumes',
}

# For landscape: add a small icon image after select category headers
# We'll add an <img> tag right after the cat-header div for selected categories
html = open('products/diet-food-list-landscape.html', 'r').read()

# Add CSS for the icons
icon_css = """
  .cat-icon {
    width: 55px;
    height: 55px;
    float: right;
    margin: -2px 0 2px 3px;
    border-radius: 4px;
    object-fit: cover;
  }
"""
html = html.replace('  .footer {', icon_css + '  .footer {')

# For each mapping, find the category header and add icon
for (diet, cat_header), icon_name in landscape_map.items():
    b64 = icons[icon_name]['landscape']
    img_tag = f'<img class="cat-icon" src="data:image/png;base64,{b64}" alt="">'

    # Find the pattern: within the diet column, find the cat-header with this text
    # We look for the cat-items div after the matching cat-header and prepend the icon
    search = f'<div class="cat-header">{cat_header}</div>\n        <div class="cat-items">'
    replace = f'<div class="cat-header">{cat_header}</div>\n        <div class="cat-items">{img_tag}'

    if search in html:
        html = html.replace(search, replace, 1)  # Only first occurrence might not be right

with open('products/diet-food-list-landscape.html', 'w') as f:
    f.write(html)
print('✅ Landscape HTML updated with food icons')

# === PORTRAIT VERSION ===
html2 = open('products/diet-food-list-pages.html', 'r').read()

portrait_map = {
    # Lion
    'Beef Cuts': 'beef',
    'Beef Organ Meats': 'organs',
    'Lamb': 'lamb',
    # Carnivore
    'Pork': 'pork',
    'Poultry': 'poultry',
    'Fish & Seafood': 'seafood',
    'Dairy (Full-Fat)': 'dairy',
    # Keto
    'Meat & Poultry': 'beef',
    'Eggs & Dairy': 'dairy',
    'Low-Carb Vegetables': 'vegetables',
    'Nuts & Seeds': 'nuts-berries',
    'Berries (Small Portions)': 'nuts-berries',
    # Pescatarian
    'Fresh Fish': 'seafood',
    'Shellfish': 'seafood',
    'Vegetables': 'vegetables',
    'Fruits': 'nuts-berries',
    'Grains & Starches': 'grains-legumes',
    'Plant Proteins': 'grains-legumes',
}

# Add CSS
icon_css_portrait = """
  .cat-icon-lg {
    width: 70px;
    height: 70px;
    float: right;
    margin: -4px 0 2px 4px;
    border-radius: 5px;
    object-fit: cover;
  }
"""
html2 = html2.replace('  .page-break', icon_css_portrait + '  .page-break')

for cat_header, icon_name in portrait_map.items():
    b64 = icons[icon_name]['portrait']
    img_tag = f'<img class="cat-icon-lg" src="data:image/png;base64,{b64}" alt="">'

    search = f'<div class="cat-title">{cat_header}</div>\n      <ul class="cat-list">'
    replace = f'<div class="cat-title">{cat_header}</div>\n      <ul class="cat-list">{img_tag}'

    # Replace all occurrences (same header might appear on different pages)
    html2 = html2.replace(search, replace)

with open('products/diet-food-list-pages.html', 'w') as f:
    f.write(html2)
print('✅ Portrait HTML updated with food icons')

#!/usr/bin/env python3
"""Build 4 individual portrait fridge-hanger pages — dense 2-column layout."""
import json

icons = json.load(open('/tmp/food-icons-b64.json'))

def img(name, size=50):
    if name and name in icons:
        b64 = icons[name]['landscape']
        return f'<img src="data:image/png;base64,{b64}" class="fi" style="width:{size}px;height:{size}px;">'
    return ''

# ═══════════════════════════════════════════════════
# DIET DATA
# ═══════════════════════════════════════════════════

diets = [
    {
        'name': 'Carnivore',
        'subtitle': 'All Animal Foods · Zero Plants',
        'color': '#8B6914',
        'gradient': 'linear-gradient(135deg, #9a7516, #7a5d10)',
        'hdr_bg': '#a08020',
        'border_color': '#d4c490',
        'sections': [
            ('Beef', img('beef', 50), 'Ribeye · NY Strip · Ground Beef · Chuck Roast · Brisket · Short Ribs · Filet Mignon · Flank Steak · Oxtail · Tri-Tip · Sirloin · Skirt Steak · Round Roast · Flat Iron'),
            ('Pork', img('pork', 46), 'Pork Belly · Bacon (no sugar) · Pork Chops · Shoulder/Butt · Tenderloin · Ground Pork · Spare Ribs · Baby Back Ribs · Pork Rinds · Lard · Ham · Pork Loin'),
            ('Poultry', img('poultry', 46), 'Chicken Thighs · Wings · Drumsticks · Whole Chicken · Breast · Ground Turkey · Turkey Legs · Duck Breast · Duck Legs · Goose · Cornish Hen'),
            ('Fish & Seafood', img('seafood', 50), 'Salmon · Sardines · Mackerel · Tuna · Cod · Halibut · Shrimp · Oysters · Mussels · Crab · Lobster · Clams · Scallops · Anchovies · Trout · Swordfish · Mahi Mahi'),
            ('Organ Meats', img('organs', 44), 'Beef Liver · Chicken Liver · Heart · Tongue · Kidney · Sweetbreads · Bone Marrow · Gizzards · Brain · Tripe · Cheek Meat'),
            ('Eggs & Dairy', img('dairy', 46), 'Chicken Eggs · Duck Eggs · Butter (grass-fed) · Ghee · Heavy Cream · Sour Cream · Cream Cheese · Cheddar · Parmesan · Brie · Gouda · Mozzarella · Colby'),
            ('Animal Fats', None, 'Beef Tallow · Pork Lard · Duck Fat · Bacon Grease · Butter · Bone Marrow · Suet · Schmaltz'),
            ('Cured & Preserved', None, 'Beef Jerky (no sugar) · Biltong · Pemmican · Salami · Prosciutto · Bresaola · Smoked Salmon · Pepperoni · Coppa'),
            ('Bone Broth', None, 'Beef Bone Broth · Chicken Bone Broth · Lamb Bone Broth · Fish Stock · Marrow Broth'),
            ('Beverages', None, 'Water · Sparkling Water · Black Coffee · Tea (black, green, herbal) · Mineral Water'),
        ],
    },
    {
        'name': 'Keto',
        'subtitle': 'High Fat · Under 20g Net Carbs',
        'color': '#2d5016',
        'gradient': 'linear-gradient(135deg, #3a6818, #2d5016)',
        'hdr_bg': '#4a7a22',
        'border_color': '#a0c880',
        'sections': [
            ('Meat & Poultry', img('beef', 48), 'All Beef Cuts · Bacon · Pork Chops · Pork Belly · Chicken Thighs · Wings · Lamb Chops · Sausage (no sugar) · Duck · Turkey · Ground Meats · Bison'),
            ('Fish & Seafood', img('seafood', 48), 'Salmon · Sardines · Mackerel · Tuna · Cod · Shrimp · Crab · Lobster · Oysters · Scallops · Trout · Mahi Mahi · Halibut'),
            ('Eggs & Dairy', img('dairy', 46), 'Eggs (any style) · Butter · Ghee · Heavy Cream · Cream Cheese · Sour Cream · Hard Cheeses · Brie · Mascarpone · Greek Yogurt · Mozzarella'),
            ('Fats & Oils', None, 'Extra Virgin Olive Oil · Avocado Oil · Coconut Oil · MCT Oil · Tallow · Lard · Avocados · Olives · Cocoa Butter'),
            ('Low-Carb Vegetables', img('vegetables', 48), 'Spinach · Arugula · Broccoli · Cauliflower · Zucchini · Asparagus · Kale · Brussels Sprouts · Mushrooms · Celery · Cucumber · Cabbage · Green Beans · Radishes · Bok Choy'),
            ('Nuts & Seeds', img('nuts-berries', 44), 'Macadamia · Pecans · Walnuts · Almonds · Brazil Nuts · Chia Seeds · Flax Seeds · Hemp Hearts · Pumpkin Seeds · Sunflower Seeds'),
            ('Berries & Fruits', None, 'Blackberries · Raspberries · Strawberries · Coconut (fresh/flakes) · Lemon · Lime · Avocado'),
            ('Condiments', None, 'Mustard · Hot Sauce · Mayo (avocado oil) · Pesto · Guacamole · ACV · Soy Sauce · Fish Sauce · Sriracha'),
            ('Baking & Sweeteners', None, 'Almond Flour · Coconut Flour · Erythritol · Monk Fruit · Stevia · Dark Chocolate 85%+ · Cocoa Powder'),
            ('Beverages', None, 'Water · Black Coffee · Tea · Bone Broth · Almond Milk · Coconut Milk · Dry Red Wine (occasional)'),
        ],
    },
    {
        'name': 'Pescatarian',
        'subtitle': 'Seafood + Plants · Low Carb',
        'color': '#0a5e6b',
        'gradient': 'linear-gradient(135deg, #0d7080, #0a5e6b)',
        'hdr_bg': '#1a8a9a',
        'border_color': '#90c8d0',
        'sections': [
            ('Fresh Fish', img('seafood', 50), 'Salmon · Tuna · Cod · Halibut · Trout · Sea Bass · Mahi Mahi · Sardines · Mackerel · Snapper · Swordfish · Sole · Tilapia · Catfish · Grouper'),
            ('Shellfish', None, 'Shrimp · Crab · Lobster · Scallops · Oysters · Mussels · Clams · Calamari · Crawfish · Prawns'),
            ('Eggs & Dairy', img('dairy', 44), 'Eggs · Butter · All Cheeses · Greek Yogurt · Milk · Cottage Cheese · Ricotta · Heavy Cream · Kefir · Cream Cheese'),
            ('Plant Proteins', img('grains-legumes', 44), 'Lentils · Chickpeas · Black Beans · Kidney Beans · Tofu · Tempeh · Edamame · Hummus · Split Peas · Navy Beans'),
            ('Vegetables', img('vegetables', 48), 'Broccoli · Spinach · Kale · Sweet Potatoes · Carrots · Bell Peppers · Tomatoes · Onions · Zucchini · Asparagus · Brussels Sprouts · Cauliflower · Mushrooms · Beets · Artichokes'),
            ('Fruits', img('nuts-berries', 44), 'Berries · Bananas · Apples · Oranges · Avocados · Mangoes · Grapes · Pineapple · Peaches · Kiwi · Pomegranate · Figs'),
            ('Grains & Starches', img('grains-legumes', 40), 'Brown Rice · Quinoa · Oats · Whole Wheat Pasta · Sourdough · Farro · Barley · Couscous · Sweet Potatoes'),
            ('Nuts, Seeds & Fats', None, 'Almonds · Walnuts · Cashews · Chia · Flax · Olive Oil · Avocado Oil · Coconut Oil · Sesame Oil · Tahini · Peanut Butter'),
            ('Condiments', None, 'Soy Sauce · Miso · Fish Sauce · Sriracha · Mustard · Pesto · Vinegars · Curry Paste · Salsa · Lemon Juice'),
            ('Beverages', None, 'Water · Coffee · Tea · Smoothies · Plant Milks · Kombucha · Fresh Juice'),
        ],
    },
    {
        'name': 'Lion Diet',
        'subtitle': 'Ruminant Meat · Salt · Water',
        'color': '#4a0404',
        'gradient': 'linear-gradient(135deg, #5c0a0a, #4a0404)',
        'hdr_bg': '#7a2020',
        'border_color': '#d0a0a0',
        'sections': [
            ('Beef Cuts', img('beef', 50), 'Ribeye · NY Strip · Ground Beef (80/20) · Chuck Roast · Brisket · Short Ribs · Filet Mignon · Flank · Skirt Steak · Tri-Tip · Oxtail · Sirloin · Round Roast · Flat Iron · Hanger Steak'),
            ('Organ Meats', img('organs', 44), 'Liver · Heart · Kidney · Tongue · Sweetbreads · Marrow Bones · Brain · Tripe · Cheek Meat · Oxtail'),
            ('Lamb & Game', img('lamb', 44), 'Lamb Chops · Leg Roast · Ground Lamb · Shanks · Rack · Bison · Venison · Elk · Goat · Lamb Ribs · Lamb Shoulder'),
            ('Fats & Broth', None, 'Beef Tallow · Suet · Lamb Tallow · Bone Marrow · Beef Bone Broth · Lamb Bone Broth · Marrow Bones'),
            ('Seasonings & Drinks', None, 'Sea Salt · Pink Himalayan Salt · Redmond Real Salt · Water · Sparkling Water · Mineral Water'),
        ],
        'tips': True,
    },
]

# ═══════════════════════════════════════════════════
# BUILD HTML — Dense 2-column layout per page
# ═══════════════════════════════════════════════════

pages_html = []
for i, diet in enumerate(diets):
    # Split sections into 2 columns (left-heavy for balance)
    secs = diet['sections']
    mid = (len(secs) + 1) // 2  # left column gets extra if odd
    left_secs = secs[:mid]
    right_secs = secs[mid:]

    def build_col(sections):
        h = ''
        for title, icon_html, items in sections:
            icon = icon_html or ''
            h += f'''
        <div class="sec">
          <div class="sec-hdr" style="background:{diet['hdr_bg']}">{title}</div>
          <div class="sec-body">{icon}{items}</div>
        </div>'''
        return h

    left_html = build_col(left_secs)
    right_html = build_col(right_secs)

    # Lion gets extra content in right column
    extra_right = ''
    if diet.get('tips'):
        extra_right = f'''
        <div class="encouragement" style="color:{diet['hdr_bg']}">Trust the process.<br>Your body knows what to do.</div>
        <div class="tips-box">
          <div class="sec-hdr" style="background:{diet['hdr_bg']}">&#10060; Common Mistakes</div>
          <div class="tips-text" style="border-left-color:{diet['hdr_bg']}">
            <ul class="mistakes-list">
              <li>Going too lean. Fat is your main fuel source, not protein.</li>
              <li>Skipping salt. You need at least 2-3 tsp per day.</li>
              <li>Not eating enough. Eat until you're full every time.</li>
              <li>Stepping on the scale daily. Track weight monthly instead.</li>
              <li>Quitting at week 2. Give your body a full 30 days to adapt.</li>
              <li>Only buying grain-fed. Choose grass-fed when you can.</li>
              <li>Overcooking organs. Liver tastes best medium-rare.</li>
              <li>Forgetting water. Drink half your body weight in oz daily.</li>
            </ul>
          </div>
        </div>'''

    # Quick start guide for Lion
    qs_panel = ''
    if diet.get('tips'):
        qs_panel = f'''
  <div class="qs-panel" style="border-color:{diet['border_color']}">
    <div class="qs-hdr" style="background:{diet['gradient']}">&#9889; Quick Start Guide</div>
    <div class="qs-row">
      <div class="qs-cell"><strong>Electrolytes:</strong> 2-3 tsp salt/day · Magnesium via bone broth or glycinate 400mg · Potassium from meat &amp; broth</div>
      <div class="qs-cell"><strong>Adaptation:</strong> Week 1-2 flu-like symptoms normal · Week 3-4 energy stabilizes · Month 2-3 mental clarity improves</div>
      <div class="qs-cell"><strong>Troubleshooting:</strong> Diarrhea wks 1-2 is normal · Low energy = eat more fat · Cravings = add more salt</div>
    </div>
  </div>'''

    page_break = '' if i == len(diets) - 1 else '<div style="page-break-after:always"></div>'

    pages_html.append(f'''
<div class="page">
  <div class="page-banner" style="background:{diet['gradient']}">
    <h1>{diet['name']}</h1>
    <div class="tagline">{diet['subtitle']}</div>
  </div>
  <div class="two-col" style="border-color:{diet['border_color']}">
    <div class="col">
      {left_html}
    </div>
    <div class="col">
      {right_html}
      {extra_right}
    </div>
  </div>
  {qs_panel}
  <div class="foot">CarnivoreWeekly.com &nbsp;·&nbsp; For Personal Use Only &nbsp;·&nbsp; Print at 100% Scale</div>
</div>
{page_break}''')

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Diet Food Lists — Individual Fridge Cards — CarnivoreWeekly.com</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700&display=swap');

  @page {{ size: 8.5in 11in; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}

  body {{
    font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
    background: #fefcf8;
    color: #2a2a2a;
  }}

  .page {{
    width: 8.5in;
    height: 11in;
    margin: 0 auto;
    padding: 0.25in 0.3in;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }}

  /* ─── BANNER ─── */
  .page-banner {{
    color: #fff;
    text-align: center;
    padding: 10px 0 7px;
    border-radius: 5px;
    margin-bottom: 5px;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }}
  .page-banner::before {{
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px);
  }}
  .page-banner h1 {{
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20pt;
    font-weight: 900;
    letter-spacing: 5px;
    text-transform: uppercase;
    position: relative;
  }}
  .page-banner .tagline {{
    font-size: 7.5pt;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.8;
    position: relative;
    margin-top: 1px;
  }}

  /* ─── 2-COLUMN LAYOUT ─── */
  .two-col {{
    flex: 1;
    display: flex;
    gap: 6px;
    border: 1.5px solid #d4cfc5;
    border-radius: 5px;
    padding: 4px 6px;
    min-height: 0;
  }}
  .col {{
    flex: 1;
    display: flex;
    flex-direction: column;
  }}

  /* ─── SECTIONS ─── */
  .sec {{
    flex: 0 0 auto;
    border-bottom: 1px dashed #d4cfc5;
    padding: 3px 0;
    display: flex;
    flex-direction: column;
  }}
  .sec:last-child {{ border-bottom: none; }}

  .sec-hdr {{
    font-family: 'Source Sans 3', sans-serif;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 1.5px 7px;
    border-radius: 2px;
    color: #fff;
    display: inline-block;
    align-self: flex-start;
    margin-bottom: 2px;
    flex-shrink: 0;
  }}

  .sec-body {{
    font-size: 7.5pt;
    line-height: 1.35;
    color: #3a3a3a;
    padding: 0 3px;
    flex: 1;
  }}

  /* ─── FOOD IMAGES ─── */
  .fi {{
    object-fit: contain;
    vertical-align: middle;
    float: right;
    margin: 0 0 3px 5px;
    border-radius: 3px;
  }}

  /* ─── LION EXTRAS ─── */
  .encouragement {{
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-size: 10pt;
    text-align: center;
    padding: 8px 10px;
    opacity: 0.6;
    flex: 1;
  }}

  .tips-box {{
    flex: 0 0 auto;
  }}
  .tips-text {{
    background: #faf0f0;
    border-radius: 3px;
    padding: 3px 6px 5px 8px;
    border-left: 2.5px solid #7a2020;
    color: #4a1515;
    font-size: 6.5pt;
    line-height: 1.3;
  }}
  .mistakes-list {{
    list-style: disc;
    margin: 0;
    padding: 0 0 0 14px;
  }}
  .mistakes-list li {{
    margin-bottom: 1.5px;
  }}

  /* ─── QUICK START PANEL ─── */
  .qs-panel {{
    flex-shrink: 0;
    margin-top: 5px;
    border: 1.5px solid #d4cfc5;
    border-radius: 5px;
    overflow: hidden;
  }}
  .qs-hdr {{
    color: #fff;
    text-align: center;
    padding: 2px 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .qs-row {{
    display: flex;
    gap: 0;
  }}
  .qs-cell {{
    flex: 1;
    padding: 3px 6px;
    font-size: 6pt;
    line-height: 1.3;
    color: #3a3a3a;
    border-right: 1px dashed #d4cfc5;
  }}
  .qs-cell:last-child {{ border-right: none; }}
  .qs-cell strong {{ color: #2a2a2a; }}

  /* ─── FOOTER ─── */
  .foot {{
    text-align: center;
    font-size: 5.5pt;
    color: #999;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding-top: 3px;
    border-top: 1px solid #e0ddd5;
    margin-top: 4px;
    flex-shrink: 0;
  }}
</style>
</head>
<body>
{''.join(pages_html)}
</body>
</html>'''

with open('products/diet-food-list-pages.html', 'w') as f:
    f.write(html)

print('✅ Portrait fridge cards built — 4 pages, 2-column dense layout')

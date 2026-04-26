#!/usr/bin/env python3
"""Build landscape food list v3 — Carnivore | Keto | Pescatarian | Lion (with tips)."""
import json

icons = json.load(open('/tmp/food-icons-b64.json'))

def img(name, size=48):
    if name and name in icons:
        b64 = icons[name]['landscape']
        return f'<img src="data:image/png;base64,{b64}" class="fi" style="width:{size}px;height:{size}px;">'
    return ''

# ═══════════════════════════════════════════════════
# CARNIVORE — Column 1 (leftmost)
# ═══════════════════════════════════════════════════
carnivore_sections = f'''
    <div class="sec">
      <div class="sec-hdr carn-hdr">Beef</div>
      <div class="sec-body">{img('beef',46)}Ribeye · NY Strip · Ground Beef · Chuck Roast · Brisket · Short Ribs · Filet Mignon · Flank Steak · Oxtail · Tri-Tip · Sirloin</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Pork</div>
      <div class="sec-body">{img('pork',44)}Pork Belly · Bacon (no sugar) · Pork Chops · Shoulder/Butt · Tenderloin · Ground Pork · Spare Ribs · Baby Back Ribs · Pork Rinds · Lard</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Poultry</div>
      <div class="sec-body">{img('poultry',44)}Chicken Thighs · Wings · Drumsticks · Whole Chicken · Breast · Ground Turkey · Turkey Legs · Duck Breast · Duck Legs · Goose</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Fish & Seafood</div>
      <div class="sec-body">{img('seafood',48)}Salmon · Sardines · Mackerel · Tuna · Cod · Halibut · Shrimp · Oysters · Mussels · Crab · Lobster · Clams · Scallops · Anchovies · Trout</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Organ Meats</div>
      <div class="sec-body">{img('organs',40)}Beef Liver · Chicken Liver · Heart · Tongue · Kidney · Sweetbreads · Bone Marrow · Gizzards</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Eggs & Dairy</div>
      <div class="sec-body">{img('dairy',44)}Chicken Eggs · Duck Eggs · Butter (grass-fed) · Ghee · Heavy Cream · Sour Cream · Cream Cheese · Cheddar · Parmesan · Brie · Gouda</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Animal Fats</div>
      <div class="sec-body">Beef Tallow · Pork Lard · Duck Fat · Bacon Grease · Butter · Bone Marrow</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Cured & Preserved</div>
      <div class="sec-body">Beef Jerky (no sugar) · Biltong · Pemmican · Salami · Prosciutto · Bresaola · Smoked Salmon</div>
    </div>
    <div class="sec">
      <div class="sec-hdr carn-hdr">Beverages</div>
      <div class="sec-body">Water · Sparkling Water · Bone Broth · Black Coffee · Tea (black, green, herbal)</div>
    </div>
'''

# ═══════════════════════════════════════════════════
# KETO — Column 2
# ═══════════════════════════════════════════════════
keto_sections = f'''
    <div class="sec">
      <div class="sec-hdr keto-hdr">Meat & Poultry</div>
      <div class="sec-body">{img('beef',44)}All Beef Cuts · Bacon · Pork Chops · Pork Belly · Chicken Thighs · Wings · Lamb Chops · Sausage (no sugar) · Duck</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Fish & Seafood</div>
      <div class="sec-body">{img('seafood',44)}Salmon · Sardines · Mackerel · Tuna · Cod · Shrimp · Crab · Lobster · Oysters · Scallops · Trout</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Eggs & Dairy</div>
      <div class="sec-body">{img('dairy',42)}Eggs (any style) · Butter · Ghee · Heavy Cream · Cream Cheese · Sour Cream · Hard Cheeses · Brie · Mascarpone · Plain Greek Yogurt</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Fats & Oils</div>
      <div class="sec-body">Extra Virgin Olive Oil · Avocado Oil · Coconut Oil · MCT Oil · Tallow · Lard · Avocados · Olives</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Low-Carb Vegetables</div>
      <div class="sec-body">{img('vegetables',44)}Spinach · Arugula · Broccoli · Cauliflower · Zucchini · Asparagus · Kale · Brussels Sprouts · Mushrooms · Celery · Cucumber · Cabbage · Green Beans · Radishes</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Nuts & Seeds</div>
      <div class="sec-body">{img('nuts-berries',42)}Macadamia · Pecans · Walnuts · Almonds · Brazil Nuts · Chia Seeds · Flax Seeds · Hemp Hearts · Pumpkin Seeds</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Berries</div>
      <div class="sec-body">Blackberries · Raspberries · Strawberries · Coconut (fresh/flakes) · Lemon · Lime</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Condiments & Baking</div>
      <div class="sec-body">Mustard · Hot Sauce · Mayo (avocado oil) · Pesto · Guacamole · ACV · Soy Sauce · Almond Flour · Coconut Flour · Erythritol · Monk Fruit · Dark Chocolate 85%+</div>
    </div>
    <div class="sec">
      <div class="sec-hdr keto-hdr">Beverages</div>
      <div class="sec-body">Water · Black Coffee · Tea · Bone Broth · Almond Milk · Coconut Milk · Dry Red Wine (occasional)</div>
    </div>
'''

# ═══════════════════════════════════════════════════
# PESCATARIAN — Column 3
# ═══════════════════════════════════════════════════
pescatarian_sections = f'''
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Fresh Fish</div>
      <div class="sec-body">{img('seafood',46)}Salmon · Tuna · Cod · Halibut · Trout · Sea Bass · Mahi Mahi · Sardines · Mackerel · Snapper · Swordfish · Sole · Tilapia</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Shellfish</div>
      <div class="sec-body">Shrimp · Crab · Lobster · Scallops · Oysters · Mussels · Clams · Calamari · Crawfish</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Eggs & Dairy</div>
      <div class="sec-body">{img('dairy',40)}Eggs · Butter · All Cheeses · Greek Yogurt · Milk · Cottage Cheese · Ricotta · Heavy Cream · Kefir</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Plant Proteins</div>
      <div class="sec-body">{img('grains-legumes',42)}Lentils · Chickpeas · Black Beans · Kidney Beans · Tofu · Tempeh · Edamame · Hummus · Split Peas</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Vegetables</div>
      <div class="sec-body">{img('vegetables',44)}Broccoli · Spinach · Kale · Sweet Potatoes · Carrots · Bell Peppers · Tomatoes · Onions · Zucchini · Asparagus · Brussels Sprouts · Cauliflower · Mushrooms · Beets</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Fruits</div>
      <div class="sec-body">{img('nuts-berries',40)}Berries · Bananas · Apples · Oranges · Avocados · Mangoes · Grapes · Pineapple · Peaches · Kiwi</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Grains & Starches</div>
      <div class="sec-body">{img('grains-legumes',38)}Brown Rice · Quinoa · Oats · Whole Wheat Pasta · Sourdough · Farro · Barley · Couscous</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Nuts, Seeds & Fats</div>
      <div class="sec-body">Almonds · Walnuts · Cashews · Chia · Flax · Olive Oil · Avocado Oil · Coconut Oil · Sesame Oil · Tahini</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Condiments</div>
      <div class="sec-body">Soy Sauce · Miso · Fish Sauce · Sriracha · Mustard · Pesto · Vinegars · Curry Paste · Salsa</div>
    </div>
    <div class="sec">
      <div class="sec-hdr pesc-hdr">Beverages</div>
      <div class="sec-body">Water · Coffee · Tea · Smoothies · Plant Milks · Kombucha · Fresh Juice</div>
    </div>
'''

# ═══════════════════════════════════════════════════
# LION DIET — Column 4 (far right, shorter food list + tips)
# ═══════════════════════════════════════════════════
lion_sections = f'''
    <div class="sec">
      <div class="sec-hdr lion-hdr">Beef Cuts</div>
      <div class="sec-body">{img('beef',38)}Ribeye · NY Strip · Ground Beef (80/20) · Chuck Roast · Brisket · Short Ribs · Filet Mignon · Flank · Skirt Steak · Tri-Tip · Oxtail · Sirloin</div>
    </div>
    <div class="sec">
      <div class="sec-hdr lion-hdr">Organ Meats</div>
      <div class="sec-body">{img('organs',34)}Liver · Heart · Kidney · Tongue · Sweetbreads · Marrow Bones · Brain · Tripe · Cheek Meat</div>
    </div>
    <div class="sec">
      <div class="sec-hdr lion-hdr">Lamb & Game</div>
      <div class="sec-body">{img('lamb',34)}Lamb Chops · Leg Roast · Ground Lamb · Shanks · Rack · Bison · Venison · Elk · Goat</div>
    </div>
    <div class="sec">
      <div class="sec-hdr lion-hdr">Fats & Broth</div>
      <div class="sec-body">Beef Tallow · Suet · Lamb Tallow · Bone Marrow · Beef Bone Broth · Lamb Bone Broth</div>
    </div>
    <div class="sec">
      <div class="sec-hdr lion-hdr">Seasonings & Drinks</div>
      <div class="sec-body">Sea Salt · Pink Himalayan Salt · Redmond Real Salt · Water · Sparkling Water · Mineral Water</div>
    </div>
    <div class="encouragement">Trust the process. Your body knows what to do.</div>
    <div class="sec tips-box">
      <div class="sec-hdr lion-hdr">&#10060; Common Mistakes</div>
      <div class="sec-body tips-text"><ul class="mistakes-list">
<li>Going too lean. Fat is your main fuel source, not protein.</li>
<li>Skipping salt. You need at least 2-3 tsp per day.</li>
<li>Not eating enough. Eat until you're full every time.</li>
<li>Stepping on the scale daily. Track weight monthly instead.</li>
<li>Quitting at week 2. Give your body a full 30 days to adapt.</li>
<li>Only buying grain-fed. Choose grass-fed when you can.</li>
<li>Overcooking organs. Liver tastes best medium-rare.</li>
<li>Forgetting water. Drink half your body weight in oz daily.</li>
</ul></div>
    </div>
'''

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>The Complete Diet Food List — CarnivoreWeekly.com</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700&display=swap');

  @page {{ size: 11in 8.5in; margin: 0; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}

  body {{
    font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
    background: #fefcf8;
    color: #2a2a2a;
    width: 11in;
    height: 8.5in;
    margin: 0 auto;
    padding: 0.18in 0.2in;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  /* ─── BANNER ─── */
  .banner {{
    background: linear-gradient(135deg, #2c1810 0%, #1a1a1a 50%, #2c1810 100%);
    color: #fff;
    text-align: center;
    padding: 6px 0 4px;
    border-radius: 5px;
    margin-bottom: 4px;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }}
  .banner::before {{
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 21px);
  }}
  .banner h1 {{
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 15pt;
    font-weight: 900;
    letter-spacing: 4px;
    text-transform: uppercase;
    position: relative;
  }}
  .banner .tagline {{
    font-size: 6pt;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.7;
    position: relative;
  }}

  /* ─── 4-COLUMN GRID ─── */
  .columns {{
    display: flex;
    gap: 4px;
    flex: 1;
    min-height: 0;
  }}

  .col {{
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1.5px solid #d4cfc5;
    border-radius: 5px;
    overflow: hidden;
  }}

  /* ─── COLUMN HEADERS ─── */
  .col-hdr {{
    text-align: center;
    padding: 4px 4px 3px;
    color: #fff;
    flex-shrink: 0;
  }}
  .col-hdr h2 {{
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 9pt;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .col-hdr .sub {{
    font-size: 5pt;
    opacity: 0.85;
    letter-spacing: 0.8px;
  }}

  .carn-bg {{ background: linear-gradient(135deg, #9a7516, #7a5d10); }}
  .keto-bg {{ background: linear-gradient(135deg, #3a6818, #2d5016); }}
  .pesc-bg {{ background: linear-gradient(135deg, #0d7080, #0a5e6b); }}
  .lion-bg {{ background: linear-gradient(135deg, #5c0a0a, #4a0404); }}

  /* ─── COLUMN BODY ─── */
  .col-body {{
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 2px 3px;
  }}

  /* ─── SECTIONS ─── */
  .sec {{
    flex: 1;
    border-bottom: 1px dashed #d4cfc5;
    padding: 2px 0;
    display: flex;
    flex-direction: column;
  }}
  .sec:last-child {{ border-bottom: none; }}

  .sec-hdr {{
    font-family: 'Source Sans 3', sans-serif;
    font-size: 5.8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 1px 5px;
    border-radius: 2px;
    color: #fff;
    display: inline-block;
    align-self: flex-start;
    margin-bottom: 1px;
    flex-shrink: 0;
  }}
  .carn-hdr {{ background: #a08020; }}
  .keto-hdr {{ background: #4a7a22; }}
  .pesc-hdr {{ background: #1a8a9a; }}
  .lion-hdr {{ background: #7a2020; }}

  .sec-body {{
    font-size: 6.2pt;
    line-height: 1.25;
    color: #3a3a3a;
    padding: 0 2px;
    flex: 1;
  }}

  /* ─── FOOD IMAGES ─── */
  .fi {{
    object-fit: contain;
    vertical-align: middle;
    float: right;
    margin: 0 0 2px 4px;
    border-radius: 3px;
  }}

  /* ─── LION: food sections natural size, space pushes tips to bottom ─── */
  .col:last-child .sec {{ flex: 0 0 auto; }}
  .col:last-child .col-body {{ justify-content: space-between; }}
  .col:last-child .tips-box {{ flex: 0 0 auto; }}
  .encouragement {{
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-size: 9pt;
    color: #7a2020;
    text-align: center;
    padding: 6px 10px;
    opacity: 0.65;
  }}
  .tips-box .sec-body {{
    font-size: 4.8pt;
    line-height: 1.15;
  }}
  .tips-text {{
    background: #faf0f0;
    border-radius: 2px;
    padding: 2px 5px 5px 6px;
    border-left: 2px solid #7a2020;
    color: #4a1515;
  }}
  .mistakes-list {{
    list-style: disc;
    margin: 0;
    padding: 0 0 0 14px;
  }}
  .mistakes-list li {{
    margin-bottom: 1.5px;
  }}

  /* ─── TIPS PANEL (below columns) ─── */
  .tips-panel {{
    flex-shrink: 0;
    margin-top: 4px;
    border: 1.5px solid #d4cfc5;
    border-radius: 5px;
    overflow: hidden;
  }}
  .tips-hdr {{
    background: linear-gradient(135deg, #2c1810 0%, #1a1a1a 50%, #2c1810 100%);
    color: #fff;
    text-align: center;
    padding: 2px 0;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 7pt;
    font-weight: 900;
    letter-spacing: 2px;
    text-transform: uppercase;
  }}
  .tips-row {{
    display: flex;
    gap: 0;
  }}
  .tip-cell {{
    flex: 1;
    padding: 3px 6px;
    font-size: 5.5pt;
    line-height: 1.3;
    color: #3a3a3a;
    border-right: 1px dashed #d4cfc5;
  }}
  .tip-cell:last-child {{ border-right: none; }}
  .tip-cell strong {{
    display: block;
    font-size: 5.8pt;
    color: #2a2a2a;
    margin-bottom: 1px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }}

  /* ─── FOOTER ─── */
  .foot {{
    text-align: center;
    font-size: 5pt;
    color: #999;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding-top: 3px;
    border-top: 1px solid #e0ddd5;
    margin-top: 3px;
    flex-shrink: 0;
  }}
</style>
</head>
<body>

<div class="banner">
  <h1>The Complete Diet Food List</h1>
  <div class="tagline">Carnivore · Keto · Pescatarian (Low Carb) · Lion</div>
</div>

<div class="columns">

  <!-- CARNIVORE -->
  <div class="col">
    <div class="col-hdr carn-bg">
      <h2>Carnivore</h2>
      <div class="sub">All Animal Foods · Zero Plants</div>
    </div>
    <div class="col-body">
{carnivore_sections}
    </div>
  </div>

  <!-- KETO -->
  <div class="col">
    <div class="col-hdr keto-bg">
      <h2>Keto</h2>
      <div class="sub">High Fat · Under 20g Net Carbs</div>
    </div>
    <div class="col-body">
{keto_sections}
    </div>
  </div>

  <!-- PESCATARIAN -->
  <div class="col">
    <div class="col-hdr pesc-bg">
      <h2>Pescatarian</h2>
      <div class="sub">Seafood + Plants · Low Carb</div>
    </div>
    <div class="col-body">
{pescatarian_sections}
    </div>
  </div>

  <!-- LION DIET -->
  <div class="col">
    <div class="col-hdr lion-bg">
      <h2>Lion Diet</h2>
      <div class="sub">Ruminant Meat · Salt · Water</div>
    </div>
    <div class="col-body">
{lion_sections}
    </div>
  </div>

</div>

<div class="tips-panel">
  <div class="tips-hdr">&#9889; Quick Start Guide — All Diets</div>
  <div class="tips-row">
    <div class="tip-cell">
      <strong>&#9889; Electrolytes</strong>
      Sodium: 2-3 tsp salt/day in water or on food · Magnesium: bone broth or glycinate 400mg · Potassium: meat &amp; broth are natural sources — add lite salt if cramping · Signs you need more: headache, fatigue, cramps, dizziness
    </div>
    <div class="tip-cell">
      <strong>&#9888; Troubleshooting</strong>
      Diarrhea (weeks 1-2): Normal — gut is adapting, increase fat slowly · Low energy: Eat more fat, not more protein · Cravings: Add salt and eat until full · Histamine issues: Eat fresh meat only, avoid aged/cured · Constipation: More fat and water
    </div>
    <div class="tip-cell">
      <strong>&#128736; Adaptation Timeline</strong>
      Week 1-2: Adjustment period — flu-like symptoms normal · Week 3-4: Energy stabilizes, cravings fade · Month 2-3: Mental clarity improves, inflammation drops · After 90 days: Reintroduce foods one at a time to identify triggers
    </div>
  </div>
</div>

<div class="foot">CarnivoreWeekly.com &nbsp;·&nbsp; For Personal Use Only &nbsp;·&nbsp; Print at 100% Scale for Best Quality</div>

</body>
</html>'''

with open('products/diet-food-list-landscape.html', 'w') as f:
    f.write(html)

print('✅ Landscape v3 built — Carnivore|Keto|Pesc|Lion order, Lion has electrolytes + troubleshooting + adaptation tips')

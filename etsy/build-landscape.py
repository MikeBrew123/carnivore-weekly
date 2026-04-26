#!/usr/bin/env python3
"""Build landscape food list HTML matching competitor's dense, image-rich style."""
import json

icons = json.load(open('/tmp/food-icons-b64.json'))

def img_tag(name, sz=50):
    """Return an inline img tag with transparent background icon."""
    if name and name in icons:
        b64 = icons[name]['landscape']
        return f'<img src="data:image/png;base64,{b64}" style="width:{sz}px;height:{sz}px;object-fit:contain;vertical-align:middle;margin:0 3px;">'
    return ''

# Build each diet section as a self-contained block
# Using inline items with images scattered throughout, like the competitor

html = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>The Complete Diet Food List - CarnivoreWeekly.com</title>
<style>
  @page { size: 11in 8.5in; margin: 0.25in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    background: #fff;
    color: #1a1a1a;
    font-size: 7pt;
    line-height: 1.3;
    width: 11in;
    height: 8.5in;
    margin: 0 auto;
    padding: 0.25in;
    overflow: hidden;
  }

  .title-bar {
    text-align: center;
    background: #2c2c2c;
    color: #fff;
    padding: 6px 0 4px;
    margin-bottom: 4px;
    border-radius: 4px;
  }
  .title-bar h1 {
    font-family: Georgia, serif;
    font-size: 14pt;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .title-bar .sub {
    font-size: 6.5pt;
    letter-spacing: 1px;
    opacity: 0.8;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 4px;
    height: calc(8.5in - 0.5in - 40px - 20px);
  }

  .diet {
    border: 1.5px solid #ccc;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .diet-title {
    color: #fff;
    text-align: center;
    padding: 3px 4px;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    flex-shrink: 0;
  }
  .diet-sub {
    font-size: 5pt;
    font-weight: 400;
    opacity: 0.85;
    display: block;
  }
  .diet-body {
    flex: 1;
    padding: 2px 3px;
    display: flex;
    flex-direction: column;
  }

  .sec {
    flex: 1;
    border-bottom: 1px dashed #ccc;
    padding: 2px 0;
    overflow: hidden;
  }
  .sec:last-child { border-bottom: none; }
  .sec-title {
    font-size: 6pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    padding: 1px 3px;
    border-radius: 2px;
    color: #fff;
    display: inline-block;
    margin-bottom: 1px;
  }
  .sec-content {
    font-size: 6.2pt;
    line-height: 1.25;
    color: #333;
    padding: 0 2px;
  }
  .sec-content img {
    float: left;
    margin: 0 3px 2px 0;
  }

  .footer-bar {
    text-align: center;
    font-size: 5.5pt;
    color: #888;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding-top: 3px;
    border-top: 1px solid #ddd;
    margin-top: 3px;
  }
</style>
</head>
<body>

<div class="title-bar">
  <h1>The Complete Diet Food List</h1>
  <div class="sub">Lion · Carnivore · Keto · Pescatarian — What to Eat on Every Diet</div>
</div>

<div class="grid">

<!-- LION DIET -->
<div class="diet">
  <div class="diet-title" style="background:#4a0404">Lion Diet<span class="diet-sub">Ruminant Meat · Salt · Water</span></div>
  <div class="diet-body">
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Beef Cuts</span>
      <div class="sec-content">''' + img_tag('beef', 42) + '''Ribeye · NY Strip · Ground Beef · Chuck Roast · Brisket · Short Ribs · Filet Mignon · Flank Steak · Skirt Steak · Tri-Tip · Oxtail · Beef Shanks</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Beef Organs</span>
      <div class="sec-content">''' + img_tag('organs', 38) + '''Liver · Heart · Kidney · Tongue · Sweetbreads · Marrow Bones · Brain · Tripe</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Lamb</span>
      <div class="sec-content">''' + img_tag('lamb', 38) + '''Lamb Chops · Leg Roast · Ground Lamb · Shanks · Shoulder · Rack · Lamb Liver · Lamb Heart</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Bison & Game</span>
      <div class="sec-content">Bison Ribeye · Ground Bison · Bison Short Ribs · Bison Roast · Venison · Elk · Goat · Moose</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Cooking Fats</span>
      <div class="sec-content">Beef Tallow · Beef Suet · Lamb Tallow · Bone Marrow</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Bone Broth</span>
      <div class="sec-content">Beef Bone Broth · Lamb Bone Broth · Bison Bone Broth</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Seasonings</span>
      <div class="sec-content">Sea Salt · Pink Himalayan · Redmond Real Salt</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Beverages</span>
      <div class="sec-content">Water · Sparkling Water · Mineral Water</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#6b1a1a">Remember</span>
      <div class="sec-content">No dairy · No eggs · No pork/poultry · No fish · No coffee/tea · No spices except salt · Cook in tallow only</div>
    </div>
  </div>
</div>

<!-- CARNIVORE -->
<div class="diet">
  <div class="diet-title" style="background:#8B6914">Carnivore<span class="diet-sub">All Animal Foods · Zero Plants</span></div>
  <div class="diet-body">
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Beef</span>
      <div class="sec-content">''' + img_tag('beef', 40) + '''Ribeye · NY Strip · Ground Beef · Chuck Roast · Brisket · Short Ribs · Filet · Flank · Oxtail · Tri-Tip</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Pork</span>
      <div class="sec-content">''' + img_tag('pork', 38) + '''Pork Belly · Bacon · Pork Chops · Shoulder · Tenderloin · Ground Pork · Ribs · Pork Rinds · Lard</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Poultry</span>
      <div class="sec-content">''' + img_tag('poultry', 38) + '''Chicken Thighs · Wings · Drumsticks · Whole Chicken · Breast · Turkey · Duck · Goose</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Fish & Seafood</span>
      <div class="sec-content">''' + img_tag('seafood', 40) + '''Salmon · Sardines · Mackerel · Tuna · Cod · Shrimp · Oysters · Mussels · Crab · Lobster · Clams · Scallops</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Organ Meats</span>
      <div class="sec-content">''' + img_tag('organs', 35) + '''Beef Liver · Heart · Tongue · Kidney · Sweetbreads · Bone Marrow · Chicken Liver</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Eggs & Dairy</span>
      <div class="sec-content">''' + img_tag('dairy', 38) + '''Eggs · Butter · Ghee · Heavy Cream · Sour Cream · Cream Cheese · Hard Cheese · Brie</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Animal Fats</span>
      <div class="sec-content">Tallow · Lard · Duck Fat · Bacon Grease · Butter</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Cured Meats</span>
      <div class="sec-content">Jerky · Biltong · Pemmican · Salami · Prosciutto · Smoked Salmon</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#a07d1c">Beverages</span>
      <div class="sec-content">Water · Bone Broth · Black Coffee · Tea</div>
    </div>
  </div>
</div>

<!-- KETO -->
<div class="diet">
  <div class="diet-title" style="background:#2d5016">Keto<span class="diet-sub">High Fat · Under 20g Net Carbs</span></div>
  <div class="diet-body">
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Meat & Poultry</span>
      <div class="sec-content">''' + img_tag('beef', 38) + '''All Beef Cuts · Bacon · Pork Chops · Pork Belly · Chicken Thighs · Wings · Lamb · Sausage · Duck</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Fish & Seafood</span>
      <div class="sec-content">''' + img_tag('seafood', 38) + '''Salmon · Sardines · Mackerel · Tuna · Cod · Shrimp · Crab · Lobster · Oysters · Scallops</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Eggs & Dairy</span>
      <div class="sec-content">''' + img_tag('dairy', 36) + '''Eggs · Butter · Ghee · Heavy Cream · Cream Cheese · Sour Cream · Hard Cheese · Brie · Mascarpone</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Fats & Oils</span>
      <div class="sec-content">Olive Oil · Avocado Oil · Coconut Oil · MCT Oil · Tallow · Avocados · Olives</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Low-Carb Vegetables</span>
      <div class="sec-content">''' + img_tag('vegetables', 38) + '''Spinach · Broccoli · Cauliflower · Zucchini · Asparagus · Kale · Brussels Sprouts · Mushrooms · Celery · Cucumber · Cabbage</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Nuts & Seeds</span>
      <div class="sec-content">''' + img_tag('nuts-berries', 36) + '''Macadamia · Pecans · Walnuts · Almonds · Brazil Nuts · Chia Seeds · Flax Seeds · Hemp Hearts</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Berries</span>
      <div class="sec-content">Blackberries · Raspberries · Strawberries · Coconut</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Condiments</span>
      <div class="sec-content">Mustard · Hot Sauce · Mayo · Pesto · Guacamole · ACV · Soy Sauce</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Baking</span>
      <div class="sec-content">Almond Flour · Coconut Flour · Erythritol · Monk Fruit · Dark Chocolate 85%+</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#3d6b1e">Beverages</span>
      <div class="sec-content">Water · Coffee · Tea · Bone Broth · Almond Milk · Dry Wine</div>
    </div>
  </div>
</div>

<!-- PESCATARIAN -->
<div class="diet">
  <div class="diet-title" style="background:#0a5e6b">Pescatarian<span class="diet-sub">Seafood + Plants · No Meat</span></div>
  <div class="diet-body">
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Fresh Fish</span>
      <div class="sec-content">''' + img_tag('seafood', 40) + '''Salmon · Tuna · Cod · Halibut · Trout · Sea Bass · Mahi Mahi · Sardines · Mackerel · Snapper</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Shellfish</span>
      <div class="sec-content">Shrimp · Crab · Lobster · Scallops · Oysters · Mussels · Clams · Calamari</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Eggs & Dairy</span>
      <div class="sec-content">''' + img_tag('dairy', 36) + '''Eggs · Butter · Cheese · Greek Yogurt · Milk · Cottage Cheese · Kefir</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Plant Proteins</span>
      <div class="sec-content">''' + img_tag('grains-legumes', 36) + '''Lentils · Chickpeas · Black Beans · Tofu · Tempeh · Edamame · Hummus</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Vegetables</span>
      <div class="sec-content">''' + img_tag('vegetables', 38) + '''Broccoli · Spinach · Kale · Sweet Potatoes · Bell Peppers · Tomatoes · Zucchini · Asparagus · Cauliflower · Mushrooms</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Fruits</span>
      <div class="sec-content">''' + img_tag('nuts-berries', 36) + '''Berries · Bananas · Apples · Oranges · Avocados · Mangoes · Grapes · Pineapple</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Grains</span>
      <div class="sec-content">''' + img_tag('grains-legumes', 34) + '''Brown Rice · Quinoa · Oats · Whole Wheat Pasta · Sourdough · Farro · Barley</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Nuts & Fats</span>
      <div class="sec-content">Almonds · Walnuts · Cashews · Chia · Flax · Olive Oil · Avocado Oil · Coconut Oil · Tahini</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Condiments</span>
      <div class="sec-content">Soy Sauce · Miso · Fish Sauce · Sriracha · Mustard · Pesto · Vinegars</div>
    </div>
    <div class="sec">
      <span class="sec-title" style="background:#127a8a">Beverages</span>
      <div class="sec-content">Water · Coffee · Tea · Smoothies · Plant Milks · Kombucha</div>
    </div>
  </div>
</div>

</div>

<div class="footer-bar">CarnivoreWeekly.com &nbsp;·&nbsp; Personal Use Only &nbsp;·&nbsp; Print at 100% for best quality</div>

</body>
</html>'''

with open('products/diet-food-list-landscape.html', 'w') as f:
    f.write(html)
print('✅ Landscape rebuilt — dense, image-rich, full-page layout')

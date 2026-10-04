#!/usr/bin/env python3
"""
Builds api/pd-foods.js (the PescoDial meal engine's nutrition table) from the
USDA FoodData Central SR Legacy CSV release (April 2018), downloaded from
https://fdc.nal.usda.gov/download-datasets . Every food keeps its fdcId.

Usage:
  python3 pescodial/scripts/build_pd_foods.py <path to FoodData_Central_sr_legacy_food_csv_2018-04>

Rules: exact description match only (no fuzzy picks); a missing nutrient fails
the build, except fiber on animal foods (USDA has no row; no plant fiber exists).
"""
import csv, json, sys
from pathlib import Path

# key, exact USDA SR Legacy description, display unit, grams per unit, store section
FOODS = [
 ('salmon', 'Fish, salmon, Atlantic, farmed, raw', 'oz', 28.35, 'Seafood'),
 ('cod', 'Fish, cod, Atlantic, raw', 'oz', 28.35, 'Seafood'),
 ('shrimp', 'Crustaceans, shrimp, raw', 'oz', 28.35, 'Seafood'),
 ('sardines', 'Fish, sardine, Atlantic, canned in oil, drained solids with bone', 'can', 92, 'Seafood'),
 ('tuna', "Fish, tuna, light, canned in water, drained solids (Includes foods for USDA's Food Distribution Program)", 'can', 142, 'Seafood'),
 ('trout', 'Fish, trout, rainbow, farmed, raw', 'oz', 28.35, 'Seafood'),
 ('tilapia', 'Fish, tilapia, raw', 'oz', 28.35, 'Seafood'),
 ('eggs', 'Egg, whole, raw, fresh', 'each', 50, 'Dairy and eggs'),
 ('greek_yogurt', 'Yogurt, Greek, plain, lowfat', 'cup', 245, 'Dairy and eggs'),
 ('milk', 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 'cup', 244, 'Dairy and eggs'),
 ('feta', 'Cheese, feta', 'oz', 28.35, 'Dairy and eggs'),
 ('parmesan', 'Cheese, parmesan, grated', 'tbsp', 5, 'Dairy and eggs'),
 ('string_cheese', 'Cheese, mozzarella, part skim milk', 'stick', 28, 'Dairy and eggs'),
 ('blueberries', 'Blueberries, raw', 'cup', 148, 'Produce'),
 ('apple', "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)", 'each', 182, 'Produce'),
 ('orange', 'Oranges, raw, all commercial varieties', 'each', 131, 'Produce'),
 ('pear', 'Pears, raw', 'each', 178, 'Produce'),
 ('dates', 'Dates, medjool', 'each', 24, 'Pantry'),
 ('walnuts', 'Nuts, walnuts, english', 'tbsp', 7.5, 'Pantry'),
 ('almonds', 'Nuts, almonds', 'tbsp', 9, 'Pantry'),
 ('almond_butter', 'Nuts, almond butter, plain, without salt added', 'tbsp', 16, 'Pantry'),
 ('chia', 'Seeds, chia seeds, dried', 'tbsp', 12, 'Pantry'),
 ('oats', 'Cereals, oats, regular and quick, not fortified, dry', 'cup', 81, 'Pantry'),
 ('wholegrain_bread', 'Bread, whole-wheat, commercially prepared', 'slice', 32, 'Bakery'),
 ('pita', 'Bread, pita, whole-wheat', 'each', 64, 'Bakery'),
 ('quinoa', 'Quinoa, cooked', 'cup', 185, 'Pantry'),
 ('bulgur', 'Bulgur, cooked', 'cup', 182, 'Pantry'),
 ('ww_pasta', "Pasta, whole-wheat, cooked (Includes foods for USDA's Food Distribution Program)", 'cup', 140, 'Pantry'),
 ('potatoes', 'Potatoes, boiled, cooked in skin, flesh, without salt', 'cup', 156, 'Produce'),
 ('lentils', 'Lentils, mature seeds, cooked, boiled, without salt', 'cup', 198, 'Pantry'),
 ('chickpeas', 'Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained, rinsed in tap water', 'cup', 152, 'Pantry'),
 ('white_beans', 'Beans, white, mature seeds, canned', 'cup', 262, 'Pantry'),
 ('hummus', 'Hummus, commercial', 'tbsp', 15, 'Dairy and eggs'),
 ('spinach', 'Spinach, raw', 'cup', 30, 'Produce'),
 ('greens', 'Lettuce, cos or romaine, raw', 'cup', 47, 'Produce'),
 ('green_beans', 'Beans, snap, green, cooked, boiled, drained, without salt', 'cup', 125, 'Produce'),
 ('tomatoes', 'Tomatoes, red, ripe, raw, year round average', 'cup', 149, 'Produce'),
 ('bell_pepper', 'Peppers, sweet, red, raw', 'cup', 149, 'Produce'),
 ('cucumber', 'Cucumber, with peel, raw', 'cup', 104, 'Produce'),
 ('carrots', 'Carrots, raw', 'cup', 128, 'Produce'),
 ('broccoli', 'Broccoli, cooked, boiled, drained, without salt', 'cup', 156, 'Produce'),
 ('zucchini', 'Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt', 'cup', 180, 'Produce'),
 ('olive_oil', 'Oil, olive, salad or cooking', 'tbsp', 13.5, 'Pantry'),
 ('olives', 'Olives, ripe, canned (small-extra large)', 'each', 4.4, 'Pantry'),
 ('avocado', 'Avocados, raw, all commercial varieties', 'each', 150, 'Produce'),
 ('tomato_sauce', 'Tomato products, canned, sauce', 'cup', 245, 'Pantry'),
 ('lemon', 'Lemons, raw, without peel', 'each', 58, 'Produce'),
 ('butter', 'Butter, salted', 'tbsp', 14.2, 'Dairy and eggs'),
 ('cheddar', "Cheese, cheddar (Includes foods for USDA's Food Distribution Program)", 'oz', 28.35, 'Dairy and eggs'),
 ('cream_cheese', 'Cheese, cream', 'tbsp', 14.5, 'Dairy and eggs'),
 ('heavy_cream', 'Cream, fluid, heavy whipping', 'tbsp', 15, 'Dairy and eggs'),
 ('whole_greek_yogurt', 'Yogurt, Greek, plain, whole milk', 'cup', 245, 'Dairy and eggs'),
 ('mackerel', 'Fish, mackerel, Atlantic, raw', 'oz', 28.35, 'Seafood'),
 ('smoked_salmon', 'Fish, salmon, chinook, smoked', 'oz', 28.35, 'Seafood'),
 ('scallops', 'Mollusks, scallop, mixed species, raw', 'oz', 28.35, 'Seafood'),
 ('halibut', 'Fish, halibut, Atlantic and Pacific, raw', 'oz', 28.35, 'Seafood'),
 ('cauliflower', 'Cauliflower, raw', 'cup', 107, 'Produce'),
 ('asparagus', 'Asparagus, raw', 'cup', 134, 'Produce'),
 ('mushrooms', 'Mushrooms, white, raw', 'cup', 70, 'Produce'),
 ('cabbage', 'Cabbage, raw', 'cup', 89, 'Produce'),
 ('raspberries', 'Raspberries, raw', 'cup', 123, 'Produce'),
 ('strawberries', 'Strawberries, raw', 'cup', 152, 'Produce'),
 ('macadamia', 'Nuts, macadamia nuts, raw', 'tbsp', 8.4, 'Pantry'),
]

WANT = {"1008": "kcal", "1003": "protein", "1004": "fat", "1005": "carbs", "1079": "fiber"}
ANIMAL = {"Seafood", "Dairy and eggs"}


def main(src):
    src = Path(src)
    desc = {r["description"].lower(): (r["fdc_id"], r["description"]) for r in csv.DictReader(open(src / "food.csv", encoding="utf-8"))}
    missing = [k for k, q, *_ in FOODS if q.lower() not in desc]
    if missing:
        sys.exit(f"no exact USDA match for: {missing}")
    ids = {desc[q.lower()][0] for _, q, *_ in FOODS}
    nut = {}
    for r in csv.DictReader(open(src / "food_nutrient.csv", encoding="utf-8")):
        if r["fdc_id"] in ids and r["nutrient_id"] in WANT:
            nut.setdefault(r["fdc_id"], {})[WANT[r["nutrient_id"]]] = float(r["amount"])
    out = {}
    for key, q, unit, gpu, section in FOODS:
        fid, d = desc[q.lower()]
        n = dict(nut.get(fid, {}))
        for k in WANT.values():
            if k not in n:
                if k == "fiber" and section in ANIMAL:
                    n[k] = 0.0
                else:
                    sys.exit(f"{key}: USDA has no {k}")
        out[key] = {"fdcId": int(fid), "usda": d, "unit": unit, "gramsPerUnit": gpu, "section": section,
                    "per100g": {k: n[k] for k in ("kcal", "protein", "fat", "carbs", "fiber")}}
    js = ("// GENERATED by pescodial/scripts/build_pd_foods.py from USDA FoodData Central,\n"
          "// SR Legacy (April 2018 release). Values per 100 g. Do not hand-edit.\n"
          "// Animal foods with no USDA fiber row carry fiber 0.\n"
          "export const PD_FOODS = " + json.dumps(out, indent=1) + ";\n")
    Path(__file__).resolve().parents[2].joinpath("api/pd-foods.js").write_text(js)
    print(f"{len(out)} foods written to api/pd-foods.js")


if __name__ == "__main__":
    main(sys.argv[1])

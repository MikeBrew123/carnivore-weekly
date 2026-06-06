#!/usr/bin/env python3
"""
Add Recipe JSON-LD schema to KetoDial recipe pages.
Extracts data from existing HTML structure and injects schema before </head>.
"""

import json
import os
import re
from pathlib import Path

RECIPES_DIR = Path(__file__).parent.parent / "public" / "recipes"


def extract_recipe_data(html, slug):
    """Extract recipe data from HTML structure."""
    data = {}

    # Title from <title> tag
    m = re.search(r"<title>([^—]+)", html)
    data["name"] = m.group(1).strip() if m else slug

    # Description from meta
    m = re.search(r'<meta name="description" content="([^"]+)"', html)
    data["description"] = m.group(1) if m else ""

    # Image from og:image
    m = re.search(r'og:image" content="([^"]+)"', html)
    data["image"] = m.group(1) if m else ""

    # Category from rc-cat
    m = re.search(r"Recipe Card · (\w+)", html)
    data["category"] = m.group(1) if m else "Dinner"

    # Times from rc-meta
    prep = re.search(r"Prep</div><div class=\"mv\">(\d+)", html)
    cook = re.search(r"Cook</div><div class=\"mv\">(\d+)", html)
    total = re.search(r"Total</div><div class=\"mv\">(\d+)", html)
    data["prepTime"] = f"PT{prep.group(1)}M" if prep else None
    data["cookTime"] = f"PT{cook.group(1)}M" if cook else None
    data["totalTime"] = f"PT{total.group(1)}M" if total else None

    # Servings
    m = re.search(r"Serves</div><div class=\"mv\">(\d+)", html)
    data["yield"] = m.group(1) if m else None

    # Nutrition from macro-row
    kcal = re.search(r"(\d+) kcal</span>", html)
    fat = re.search(r"Fat (\d+)g", html)
    protein = re.search(r"Protein (\d+)g", html)
    carbs = re.search(r"Carbs (\d+)g", html)
    net = re.search(r"Net carbs (\d+)g", html)

    data["nutrition"] = {}
    if kcal:
        data["nutrition"]["calories"] = f"{kcal.group(1)} calories"
    if fat:
        data["nutrition"]["fatContent"] = f"{fat.group(1)} g"
    if protein:
        data["nutrition"]["proteinContent"] = f"{protein.group(1)} g"
    if carbs:
        data["nutrition"]["carbohydrateContent"] = f"{carbs.group(1)} g"
    if net:
        data["nutrition"]["fiberContent"] = f"{int(carbs.group(1)) - int(net.group(1))} g" if carbs else None

    # Ingredients
    ingredients = re.findall(
        r'<li><span class="qty">([^<]*)</span><span>(?:<b>)?([^<]+)',
        html,
    )
    data["ingredients"] = []
    for qty, ing in ingredients:
        qty = qty.strip()
        ing = re.sub(r"</b>", "", ing).strip().rstrip(",")
        data["ingredients"].append(f"{qty} {ing}".strip())

    # Instructions from method
    instructions = re.findall(
        r"<li><span>(?:<b>[^<]+</b>)?\s*([^<]+)",
        html,
    )
    # Get full instruction text including bold part
    method_items = re.findall(r"<li><span>(.*?)</span></li>", html, re.DOTALL)
    data["instructions"] = []
    for item in method_items:
        text = re.sub(r"<[^>]+>", "", item).strip()
        if text and len(text) > 10:
            data["instructions"].append(text)

    # Keywords from rc-kicker
    m = re.search(r'class="rc-kicker">([^<]+)', html)
    data["keywords"] = m.group(1).strip() if m else "keto"

    return data


def build_schema(data, slug):
    """Build Recipe JSON-LD from extracted data."""
    schema = {
        "@context": "https://schema.org/",
        "@type": "Recipe",
        "name": data["name"],
        "description": data["description"],
        "author": {
            "@type": "Organization",
            "name": "KetoDial",
            "url": "https://ketodial.com",
        },
        "datePublished": "2025-01-01",
        "keywords": data["keywords"],
        "recipeCategory": data["category"],
        "recipeCuisine": "American",
        "url": f"https://ketodial.com/recipes/{slug}",
    }

    if data.get("image"):
        schema["image"] = data["image"]
    if data.get("prepTime"):
        schema["prepTime"] = data["prepTime"]
    if data.get("cookTime"):
        schema["cookTime"] = data["cookTime"]
    if data.get("totalTime"):
        schema["totalTime"] = data["totalTime"]
    if data.get("yield"):
        schema["recipeYield"] = f"{data['yield']} servings"

    if data.get("ingredients"):
        schema["recipeIngredient"] = data["ingredients"]

    if data.get("instructions"):
        schema["recipeInstructions"] = [
            {"@type": "HowToStep", "text": step}
            for step in data["instructions"]
        ]

    if data.get("nutrition") and data["nutrition"].get("calories"):
        nutrition = {"@type": "NutritionInformation"}
        nutrition["servingSize"] = "1 serving"
        for k, v in data["nutrition"].items():
            if v:
                nutrition[k] = v
        schema["nutrition"] = nutrition

    return schema


def main():
    count = 0
    for fname in sorted(RECIPES_DIR.glob("*.html")):
        if fname.name == "index.html":
            continue

        html = fname.read_text()

        # Skip if already has Recipe schema
        if '"@type":"Recipe"' in html or '"@type": "Recipe"' in html:
            print(f"  Skip {fname.name} (already has schema)")
            continue

        slug = fname.name
        data = extract_recipe_data(html, slug)

        if not data.get("ingredients"):
            print(f"  Skip {fname.name} (no ingredients found)")
            continue

        schema = build_schema(data, slug)
        script_tag = f'<script type="application/ld+json">\n{json.dumps(schema, indent=2)}\n</script>\n'

        # Insert before </head>
        new_html = html.replace("</head>", f"{script_tag}</head>", 1)
        fname.write_text(new_html)
        count += 1
        print(f"  ✅ {fname.name} — {len(data['ingredients'])} ingredients, {len(data.get('instructions', []))} steps")

    print(f"\nDone: added Recipe schema to {count} pages")


if __name__ == "__main__":
    main()

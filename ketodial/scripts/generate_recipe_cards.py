#!/usr/bin/env python3
"""
Generate KetoDial recipe card pages from structured recipe data.

Uses public/recipes/bacon-spinach-egg-cups.html as the layout template and
swaps every per-recipe section (meta, JSON-LD, header, macros, ingredients,
method, tip, related cards). Never touches existing pages.

Input: two JSON files merged by slug —
  raw JSON:   macros, times, servings, source info   (from scraper)
  voice JSON: title, blurb, ingredients, method, tip (from writer agent)

Usage: python3 generate_recipe_cards.py <raw.json> <voice.json>
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent / "public"
TEMPLATE = ROOT / "recipes" / "bacon-spinach-egg-cups.html"
CAT_LABEL = {"breakfast": "Breakfast", "lunch": "Lunch", "dinner": "Dinner",
             "snack": "Snack", "dessert": "Dessert", "side": "Side"}


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def related_pool():
    """Parse recipes/index.html for slug -> (title, kcal, net, meal)."""
    html = (ROOT / "recipes" / "index.html").read_text()
    pool = {}
    for m in re.finditer(
        r'<a class="recipe" data-meal="([a-z]+)" href="/recipes/([a-z0-9-]+)\.html">.*?'
        r'<span class="net-tag">([\d.]+)g net</span>.*?<h3>(.*?)</h3>.*?'
        r'<span class="mp kcal">(\d+) kcal</span>', html, re.S):
        meal, slug, net, title, kcal = m.groups()
        pool[slug] = {"meal": meal, "net": net, "title": title, "kcal": kcal}
    return pool


def build_jsonld(r):
    total = r["prep_min"] + r["cook_min"] if not r.get("total_min") else r["total_min"]
    schema = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": r["title"],
        "url": f"https://ketodial.com/recipes/{r['slug']}.html",
        "image": f"https://ketodial.com/images/recipes/recipe-{r['slug']}.jpg",
        "description": r["meta_description"],
        "author": {"@type": "Organization", "name": "KetoDial"},
        "prepTime": f"PT{r['prep_min']}M",
        "cookTime": f"PT{r['cook_min']}M",
        "totalTime": f"PT{total}M",
        "recipeYield": f"{r['servings']} servings",
        "recipeCategory": CAT_LABEL[r["meal_type"]],
        "recipeCuisine": "Keto",
        "keywords": f"keto, low carb, {r['title'].lower()}",
        "recipeIngredient": [
            f"{i['qty']} {i['item']}" + (f", {i['note']}" if i.get("note") else "")
            for i in r["ingredients"]
        ],
        "recipeInstructions": [
            {"@type": "HowToStep", "text": f"{s['lead']} {s['text']}"} for s in r["method"]
        ],
        "nutrition": {
            "@type": "NutritionInformation",
            "servingSize": "1 serving",
            "calories": f"{r['calories']} calories",
            "fatContent": f"{r['fat_g']} g",
            "proteinContent": f"{r['protein_g']} g",
            "carbohydrateContent": f"{r['carbs_g']} g",
            "fiberContent": f"{r['fiber_g']} g",
        },
    }
    return "<script type=\"application/ld+json\">\n" + json.dumps(schema, indent=2) + "\n</script>"


def build_page(tpl, r, pool):
    slug, title = r["slug"], r["title"]
    page_title = f"{title} — KetoDial Recipe"
    url = f"https://ketodial.com/recipes/{slug}.html"
    img = f"https://ketodial.com/images/recipes/recipe-{slug}.jpg"
    cat = CAT_LABEL[r["meal_type"]]
    html = tpl

    html = re.sub(r"<title>.*?</title>", f"<title>{esc(page_title)}</title>", html)
    html = re.sub(r'<meta name="description" content="[^"]*">',
                  f'<meta name="description" content="{esc(r["meta_description"])}">', html)
    html = re.sub(r'<link rel="canonical" href="[^"]*">',
                  f'<link rel="canonical" href="{url}">', html)
    html = re.sub(r'<meta property="og:url" content="[^"]*">',
                  f'<meta property="og:url" content="{url}">', html)
    html = re.sub(r'<meta property="og:title" content="[^"]*">',
                  f'<meta property="og:title" content="{esc(page_title)}">', html)
    html = re.sub(r'<meta property="og:description" content="[^"]*">',
                  f'<meta property="og:description" content="{esc(r["meta_description"])}">', html)
    html = re.sub(r'<meta property="og:image" content="[^"]*">',
                  f'<meta property="og:image" content="{img}">', html)
    jld = build_jsonld(r)
    html = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: jld, html, flags=re.S)

    html = re.sub(r'<span class="rc-cat">[^<]*</span>',
                  f'<span class="rc-cat">Recipe Card · {cat}</span>', html)
    html = re.sub(r'<div class="rc-kicker">[^<]*</div>',
                  f'<div class="rc-kicker">{esc(r["kicker"])}</div>', html)
    html = re.sub(r"<h1>.*?</h1>", f"<h1>{r['title_html']}</h1>", html, flags=re.S)
    html = re.sub(r'<p class="rc-blurb">.*?</p>',
                  f'<p class="rc-blurb">{esc(r["blurb"])}</p>', html, flags=re.S)
    html = re.sub(r'<div class="num">\d+</div>', f'<div class="num">{r["calories"]}</div>', html)

    mvs = [f'{r["prep_min"]} <small>min</small>', f'{r["cook_min"]} <small>min</small>',
           f'{r["prep_min"] + r["cook_min"]} <small>min</small>', str(r["servings"])]
    it = iter(mvs)
    html = re.sub(r'<div class="mv">.*?</div>', lambda m: f'<div class="mv">{next(it)}</div>', html, count=4)

    macro = (
        '<div class="macro-row">\n'
        '      <span class="lbl">Per serving</span>\n'
        f'      <span class="mpill kcal">{r["calories"]} kcal</span>\n'
        f'      <span class="mpill"><span class="d" style="background:var(--fat)"></span>Fat {r["fat_g"]}g</span>\n'
        f'      <span class="mpill"><span class="d" style="background:var(--protein)"></span>Protein {r["protein_g"]}g</span>\n'
        f'      <span class="mpill"><span class="d" style="background:var(--carbs)"></span>Carbs {r["carbs_g"]}g</span>\n'
        f'      <span class="net">Net carbs {r["net_carbs_g"]}g</span>\n'
        '    </div>'
    )
    html = re.sub(r'<div class="macro-row">.*?</div>', lambda m: macro, html, flags=re.S)

    img_tag = (f'<img src="/images/recipes/recipe-{slug}.jpg" alt="{esc(r["alt_text"])}" '
               'style="width:100%;border-radius:14px;object-fit:cover;max-height:340px" loading="lazy" />')
    html = re.sub(r'<img src="/images/recipes/[^"]*"[^>]*/>', lambda m: img_tag, html, count=1)

    ingr = "\n".join(
        f'          <li><span class="qty">{esc(i["qty"])}</span><span><b>{esc(i["item"])}</b>'
        + (f",  {esc(i['note'])}" if i.get("note") else "") + "</span></li>"
        for i in r["ingredients"])
    html = re.sub(r'<ul class="ingr">.*?</ul>', lambda m: f'<ul class="ingr">\n{ingr}\n        </ul>', html, flags=re.S)

    meth = "\n".join(
        f'          <li><span><b>{esc(s["lead"])}</b> {esc(s["text"])}</span></li>' for s in r["method"])
    html = re.sub(r'<ol class="method">.*?</ol>', lambda m: f'<ol class="method">\n{meth}\n        </ol>', html, flags=re.S)

    tip = ('<div class="tip">\n      <div class="tt">Dial-in tip</div>\n      '
           + r["tip"] + "\n    </div>\n\n    ")
    html = re.sub(r'<div class="tip">.*?(?=<div class="shop no-print">)', lambda m: tip, html, flags=re.S)

    same_cat = [(s, d) for s, d in pool.items() if d["meal"] == r["meal_type"] and s != slug]
    others = [(s, d) for s, d in pool.items() if d["meal"] != r["meal_type"] and s != slug]
    picks = (same_cat + others)[:3]
    rel = "".join(
        f'      <a class="rel-card" href="/recipes/{s}.html">\n'
        f'        <img src="/images/recipes/recipe-{s}.jpg" alt="{esc(d["title"])}" loading="lazy" />\n'
        '        <div class="rb">\n'
        f'          <span class="rk">{CAT_LABEL[d["meal"]]}</span>\n'
        f'          <h3>{d["title"]}</h3>\n'
        f'          <span class="rm">{d["kcal"]} kcal · {d["net"]}g net carbs</span>\n'
        "        </div>\n      </a>\n"
        for s, d in picks)
    related = ('<div class="related no-print">\n  <h2>You might also like</h2>\n'
               f'  <div class="rel-grid">\n{rel}  </div>\n</div>\n')
    html = re.sub(r'<div class="related no-print">.*?(?=<script src="/js/share-buttons\.js")', lambda m: related, html, flags=re.S)

    return html


def main():
    raw_path, voice_path = sys.argv[1], sys.argv[2]
    raw = {r["slug"]: r for r in json.load(open(raw_path))}
    voice = json.load(open(voice_path))
    tpl = TEMPLATE.read_text()
    pool = related_pool()

    for v in voice:
        r = {**raw[v["slug"]], **v}
        out = ROOT / "recipes" / f"{r['slug']}.html"
        if out.exists():
            print(f"SKIP {r['slug']} — page already exists")
            continue
        out.write_text(build_page(tpl, r, pool))
        print(f"OK   {out.name}")


if __name__ == "__main__":
    main()

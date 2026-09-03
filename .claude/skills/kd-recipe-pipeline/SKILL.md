---
name: kd-recipe-pipeline
description: Add KetoDial recipes - Apify scrape, recipe card build, Replicate image generation under the $1/day budget, sitemap and index publish. Use whenever recipes are added or fixed on ketodial.com.
---

# KetoDial Recipe Pipeline (mandatory, no exceptions)

## 1. Scrape via Apify (MCP tools, never manual WebFetch)
- Key: `project-nexus/secrets/api-keys.json` → `apify.api_key`.
- Sources: Wholesome Yum, Diet Doctor, KetoConnect, Ruled Me. Only recipes rated 4.5+ with verified vote counts.
- Check `ketodial/public/recipes/` first; no duplicates.
- Extract: title, rating + votes, servings, prep/cook/total time, calories, fat, protein, net carbs, ingredients with amounts, steps.

## 2. Build the card
- Match `ketodial/public/recipes/bacon-spinach-egg-cups.html` EXACTLY (design reference: `ketodial/design/recipes/Recipe-Card-Template.html`): CSS, gauge SVG, meta row, macro pills, two-column ingredients + method, tip box, pantry/shop section linking `/pantry.html`, footer, 3 related same-category recipe cards.
- Category tag in header: Breakfast, Lunch, Dinner, Snack, or Dessert.

## 3. Generate the image via Replicate (we own every image)
- Never use source-site images.
- Model `black-forest-labs/flux-schnell` (~$0.003/image). Not nano-banana-pro, not flux-pro.
- Token: `secrets/api-keys.json` → `replicate.api_token`. Gate on `scripts/image_budget.py` ($1/day shared cap, fails closed).
- Prompt: describe the finished dish as food photography, then append: "warm natural light, rich earthy tones, shallow depth of field, high detail, photorealistic, no text, no people".
- Save to `ketodial/public/images/recipes/recipe-{slug}.jpg`; replace the `<div class="photo">` placeholder with an `<img>`. Reference flow: `scripts/generate_post_images.py`.

## 4. Publish
1. `ketodial/public/sitemap.xml` entry (priority 0.7, monthly).
2. Card in `ketodial/public/recipes/index.html` with the correct `data-meal` and an `<img>` tag: `<div class="rwrap"><img src="/images/recipes/recipe-{slug}.jpg" alt="..." loading="lazy" /><span class="net-tag">...`. Cards without `<img>` render blank.
3. Update the recipe count in the index filter JS (or use `cards.length`).
4. Submit URLs to the Google Indexing API with `dashboard/ga4-credentials.json`.

PROHIBITED: scraping without Apify, source-site images, recipes under 4.5 stars, duplicates, missing sitemap/index updates, skipping GSC submission, cards missing the pantry section or `<img>`.

---
name: etsy-listing-standards
description: The CarnivoreWeekly Etsy listing standard. Use EVERY time a session creates or edits any Etsy listing (title, tags, description, category, materials, price), audits the shop, or evaluates listing quality. Encodes Etsy's official search rules (Seller Handbook, Aug 2025 revision), Etsy's own title-recommendation format, the shop's hard-won lessons (ISSUE-064, the doubling), and the standing constraints (edit cap, freeze windows, approval gates).
---

# Etsy Listing Standards (CarnivoreWeekly)

Built 2026-08-22 from Etsy's Seller Handbook (Keywords 101 + Ultimate Guide to Etsy Search, "as
of August 2025" revision), Etsy's Search Visibility recommendations for THIS shop, and the shop's
own recorded history. If Etsy's guidance changes, update THIS file, not just the session.

## Non-negotiable process gates (before any listing write)

1. **Edit cap:** 3 distinct listings per rolling 7 days (deck 07de35c8). Check the count FIRST.
   Write the row to Brew-Vault/00-Core/Live-Changes-Log.md BEFORE the API call.
2. **One variable per window.** Never change price and images/titles in the same test window.
   ISSUE-064 (Jul 16: thumbnail swap + price doubling same day) cost weeks of unreadable data.
3. **Never touch the bestseller** 4464219356 without explicit fresh approval from Brew. It is
   ~half of all lifetime revenue.
4. **Check live state immediately before any write** (near-miss rule of 2026-08-10).
5. **Public-facing changes always need Brew's go.** Titles, prices, categories, photos: his tap.
   Materials and alt text are recorded as no-approval API work, still logged.
6. Measure results on VIEWS, not sales (2026-08-09 arithmetic: sales need ~550 days per arm).

## Titles (Etsy's current doctrine, confirmed by their own AI recommendations)

- Short, natural, buyer-readable. ONE clear product name, not a keyword run.
- Etsy's own format for this shop's products: `<Product Name> | <one clarifying phrase> (PDF)`
  or `(Printable PDF)`. Examples Etsy generated for us:
  - "30-Day Carnivore Meal Plan | High Protein Menu, Grocery Lists (PDF)"
  - "Doctor Visit Prep Kit, Low-Carb Edition, Medical Organizer (PDF)"
- Keyword POSITION does not affect ranking (official), but the first ~40 characters are what
  mobile shoppers see. Lead with what the thing IS.
- Strip: "Instant Download", sale language, prices, "beautiful/amazing/unique" filler.
- 4+ pipe-separated segments = rewrite it.
- NEVER state a count or feature the files don't match (the "9 PDFs" vs 7 incident). Verify
  attached files before writing a count into a title.

## Tags (13 slots, 20 chars each)

- All 13, always. Multi-word phrases, never single words.
- All 13 as unique as possible: no root word in more than ~4 tags.
- Never duplicate the category or attributes ("digital download", "digital print" are wasted).
- Mix types: descriptive, who-it's-for (gifts for dad), occasion, solution (fridge organization),
  style, size, technique. Long-tail beats head terms at our scale.
- Regional synonyms welcome; no deliberate misspellings; plurals don't matter (root matching).

## Categories and attributes

- Most specific subcategory ALWAYS; categories act as tags.
- Charts/posters/food lists: 2078 Art & Collectibles > Prints > Digital Prints.
- Meal plans, planners, logs, prep kits: 354 Paper & Party Supplies > Paper > Calendars & Planners.
- Recipes/recipe cards: 6347 Craft Supplies & Tools > Patterns & How To > Recipes.
- NEVER taxonomy 69 (Figurines & Knick Knacks); that was the 2026-08-22 audit's worst find.
- Fill every attribute offered; attributes act as tags; then don't repeat them in tags.
- Materials field = indexed keyword slots. Never leave empty. E.g. `digital file`, `US Letter PDF`,
  `A4 printable` per product truthfully.

## Descriptions

- First 2-3 sentences carry the top keywords in natural prose; they are indexed and previewed.
  Never open with a bare heading like "WHAT IT IS".
- Don't paste the title verbatim. Then: what's inside, what it's for, honest expectations,
  the medical-education disclaimer where health-adjacent.

## Prices

- Current canon (post 2026-08-22 revert): $4.49 charts, $2.49 pyramids, $4.99 mid lists/bundles,
  $5.99 guides, $7.99 starter bundles, $19.99 mega bundle. The 2026-07-16 doubling is proven
  harmful (-79% on its cohort); NEVER re-propose doubled anchors or the $3.99 flat plan.
- Sales: only a real discount off the real price, ~25%, time-boxed 2-3 weeks, never standing.
  (P2 evidence: 2.2x orders, 2.4x revenue/day, AOV up.) Requires Brew; sales have NO API.

## Monthly standing check

Open Shop Manager > Etsy search visibility (needs Brew's browser). Whatever Etsy flags there IS
the current standard; fold new guidance back into this file. Etsy's title-recommendation wizard
holds per-listing AI titles: read them, bring them to Brew, accept selectively. Never bulk-Publish.

## Where things live

- Daily snapshots: reports/etsy-snapshots/snapshots.jsonl (8:09am task) + etsy-watchdog (8:42am).
- Audit of record: Brew-Vault/.../reports/etsy-listing-audit-2026-08-22.md (+ data json in repo).
- Change log: Brew-Vault/00-Core/Live-Changes-Log.md. Ledger: decision-ledger.md.

# Fact-check and medicine-safety log: pescatarian-dinner-ideas

Checked 2026-11-28. All sources fetched live that day (curl, USDA FDC API, the official FDC SR Legacy CSV download, Internet Archive captures for the three sites that block bots).

**Totals (23 markers: 20 VERIFY + 2 VERIFY-URL + 1 FDC-ID marker, plus 12 unmarked claims checked = 35 rows): 19 verified as written, 13 changed, 3 removed.** Zero "[[" left in the file. Final visible word count: 1,522 (validator count, band 900 to 1,600; draft was 1,712 including markers).

Fetch notes:
- USDA SR Legacy CSV (`https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`, 200) for every food and portion weight. All 13 cited records cross-checked through the FDC API (DEMO_KEY, two batch calls, 200): protein and sodium matched the CSV exactly.
- Per-serving figure = per-100 g value x grams / 100. 3 oz = 85 g (FDC portion table). Soy sauce 1 tbsp = 16 g (FDC 174277), teriyaki 1 tbsp = 18 g (171167), taco mix 2 tsp = 5.7 g (172243).
- Dietary Guidelines 2025-2030: `https://www.realfood.gov/documents/DGA.pdf` 200, PDF page 6: "The general population, ages 14 and above, should consume less than 2,300 mg per day of sodium." The draft's `cdn.realfood.gov/DGA.pdf` link does not resolve (DNS failure) and was replaced.
- foodsafety.gov, fsis.usda.gov and ods.od.nih.gov return 403 to curl. Text read from Internet Archive captures of the same URLs: FoodSafety.gov temperatures 2026-11-23, FSIS Leftovers 2026-11-23, ODS Vitamin K consumer 2026-11-14.
- No PubMed/DOI source needed; none linked. No consensus.app links.

## Claim table

| # | Claim in draft | Verdict | Final wording / figure | Source | Arithmetic |
|---|---|---|---|---|---|
| 1 | Most dinners on the table in about 30 minutes (marker) | REMOVED | "most of them one pan and quick enough for a weeknight"; 30 minutes also removed from meta_description and excerpt. No primary source for cook times | n/a | n/a |
| 2 | AHA serving 3 oz cooked (marker) | CHANGED | "3 ounces cooked, or about three quarters of a cup of flaked fish". "Deck of cards" dropped: not on the AHA page | AHA Fish and Omega-3 page (200): "A serving is 3 ounces cooked, or about ¾ cup, of flaked fish" | n/a |
| 3 | AHA at least 2 fish servings a week (marker) | CHANGED | "recommends 2 servings of fish a week, particularly fatty fish" (AHA wording) | AHA: "recommends eating 2 servings of fish (particularly fatty fish) per week" | n/a |
| 4 | Fish safe at 145°F (marker, writer flag) | VERIFIED | 145°F kept. Doneness sign changed from "turns opaque and flakes" to FoodSafety.gov's "no longer see-through and separates easily with a fork"; added shrimp and scallops "pearly and opaque" | FoodSafety.gov chart (archive): "Fin fish 145°F ... or cook until flesh is no longer translucent and separates easily with a fork"; "Shrimp, lobster, crab, and scallops: Cook until flesh is pearly or white, and opaque". FDA seafood page: "Most seafood should be cooked to an internal temperature of 145°F" | n/a |
| 5 | Cooked Atlantic salmon 3 oz about 50 mg sodium (marker) | VERIFIED | 50 mg | FDC 175168, 61 mg/100 g | 61 x 0.85 = 52 |
| 6 | Soy sauce 1 tbsp roughly 900 mg (marker, writer flag) | CHANGED | "about 880 mg" | FDC 174277 (shoyu) 5,493 mg/100 g, tbsp 16 g | 5,493 x 0.16 = 879 |
| 7 | Under 2,300 mg/day (marker) | VERIFIED | "less than 2,300 mg for the whole day" (DGA wording); link fixed | DGA.pdf p6 | n/a |
| 8 | Oven 425°F (marker) | VERIFIED as instruction | Kept as a recipe instruction; no primary source sets roasting temps. Doneness now tied to 145°F | n/a | n/a |
| 9 | Salmon roasts 10 to 12 minutes at 425°F (marker) | REMOVED | Now "roast until it flakes and reaches 145°F" | n/a | n/a |
| 10 | Salmon 19 g protein (marker) | VERIFIED | 19 g | FDC 175168, 22.1 g/100 g | 22.1 x 0.85 = 18.8 |
| 11 | Cod 19 g (marker) | VERIFIED | 19 g; row now adds "haddock 17 g" since recipe allows either | FDC 171956, 22.83 g/100 g | 22.83 x 0.85 = 19.4 |
| 12 | Shrimp 20 g (marker) | VERIFIED | 20 g | FDC 175180, 23.98 g/100 g | 23.98 x 0.85 = 20.4 |
| 13 | Rainbow trout farmed 20 g (marker) | VERIFIED | 20 g | FDC 173718, 23.8 g/100 g | 23.8 x 0.85 = 20.2 |
| 14 | Tilapia 22 g, row labelled "Pollock or tilapia" (marker) | CHANGED | Tilapia 22 g verified; row now "Tilapia (or Alaska pollock)", "22 g (pollock 17 g)" | FDC 175177, 26.15 g/100 g; FDC 173726, 19.42 g/100 g | 26.15 x 0.85 = 22.2; 19.42 x 0.85 = 16.5 |
| 15 | Scallops 17 g (marker) | VERIFIED | 17 g | FDC 167742 (bay and sea, steamed), 20.54 g/100 g | 20.54 x 0.85 = 17.5 |
| 16 | Catfish farmed 16 g (marker) | VERIFIED | 16 g | FDC 175166, 18.44 g/100 g | 18.44 x 0.85 = 15.7 |
| 17 | Haddock 20 g (marker) | CHANGED | 17 g | FDC 174198, 19.99 g/100 g | 19.99 x 0.85 = 17.0 |
| 18 | Cold-water thaw about 30 minutes, under running water (marker) | CHANGED | "sealed in a plastic bag and set in cold water if you're in a hurry"; time dropped (FDA gives none) | FDA seafood page (200): "seal it in a plastic bag and immerse it in cold water" | n/a |
| 19 | Cooked fish keeps 3 to 4 days (marker) | CHANGED (reworded) | "Leftovers keep in the fridge for 3 to 4 days" (FSIS speaks of leftovers in general) | FSIS archive: "Leftovers can be kept in the refrigerator for 3 to 4 days" | n/a |
| 20 | Fish and crustacean shellfish on FDA list of 9 (marker, writer flag) | VERIFIED | "on the FDA's list of nine major food allergens, listed as two separate allergens" | FDA Food Allergies (200): "milk, eggs, fish, Crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and sesame"; FALCPA 8 + FASTER Act sesame | n/a |
| 21 | VERIFY-URL FoodSafety.gov temps | VERIFIED | 403 anti-bot; archive 2026-11-23 confirms content | archive | n/a |
| 22 | VERIFY-URL FDA Selecting and Serving Seafood | VERIFIED | 200 | fda.gov | n/a |
| 23 | Generic FDC homepage source + "confirm FDC IDs" (marker + VERIFY-URL) | CHANGED | Replaced with 13 specific record links (175168, 171956, 174198, 175180, 171971, 173718, 175177, 173726, 167742, 175166, 174277, 171167, 172243) | FDC API | n/a |
| U1 | "Plain fish is naturally low in sodium" | CHANGED | "Most plain fish is low in sodium" plus "Scallops run higher, about 570 mg per 3 ounces cooked" (haddock is also 222 mg) | FDC 167742 667 mg/100 g; 174198 261 mg/100 g | 667 x 0.85 = 567; 261 x 0.85 = 222 |
| U2 | "many jarred stir-fry and teriyaki sauces aren't far behind" | CHANGED | "a tablespoon of bottled teriyaki sauce about 690 mg" | FDC 171167 3,833 mg/100 g, tbsp 18 g | 3,833 x 0.18 = 690 |
| U3 | Taco packet seasoning "it's mostly salt" | CHANGED | "USDA puts two teaspoons of the dry mix at about 410 mg of sodium" (7.2 g sodium per 100 g is about 18% salt, not "mostly") | FDC 172243 7,203 mg/100 g, 2 tsp 5.7 g | 7,203 x 0.057 = 411 |
| U4 | Frozen shrimp/fish packed with sodium-based solutions | VERIFIED, sharpened | "USDA lists cooked shrimp with these additives at about 800 mg of sodium per 3 ounces, against about 95 mg for plain cooked shrimp" | FDC 171971 947 mg/100 g; 175180 111 mg/100 g | 947 x 0.85 = 805; 111 x 0.85 = 94 |
| U5 | Breaded fish brings extra sodium | VERIFIED | kept | FDC 171970 breaded fried shrimp 344 vs 111 mg/100 g | n/a |
| U6 | Frozen "usually cheaper" | REMOVED | No source; sentence cut | n/a | n/a |
| U7 | Allergy: "A shrimp allergy doesn't always mean you react to salmon ... ask your doctor about the other before you try it" | CHANGED | Cross-reaction inference deleted (FDA says nothing on it); per-section doctor caveat deleted. Now "If you're allergic to either, skip those dinners." | FDA allergies page | n/a |
| U8 | Red-flag allergy signs (hives, itching, tingling mouth, cramps, vomiting, swelling, breathing trouble, faint) | VERIFIED | kept | FDA allergies page symptom list | n/a |
| U9 | Med box warfarin and leafy greens, vitamin K | VERIFIED (reworded) | "carry vitamin K, and the amount you eat each day matters" | ODS archive: "If you are taking a blood thinner such as warfarin (Coumadin), it's very important to get about the same amount of vitamin K each day"; spinach listed | n/a |
| U10 | All species Best Choices | VERIFIED | salmon, cod, haddock, shrimp, rainbow trout (Trout, freshwater), pollock, tilapia, scallop, catfish all "Best Choice". None of the Choices to Avoid named | FDA Advice about Eating Fish (200) | n/a |
| U11 | "Here's what I've seen work" | REMOVED | unsupported experience framing; now "Think in a pattern, not recipes." | n/a | n/a |
| U12 | Personal detail "I use my dad's old one" | CHANGED | cut for length; remaining persona lines (cooking for one, frozen cod on weekly shop) are not health or heart history | n/a | n/a |

## Source URL check

| URL | Result |
|---|---|
| https://fdc.nal.usda.gov/food-details/{13 ids above}/nutrients | JavaScript app: curl gets the shell with 404, record renders in a browser (same link form as published PD guides). All 13 ids returned 200 via FDC API |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200 |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 200 |
| https://www.realfood.gov/documents/DGA.pdf | 200 (replaces cdn.realfood.gov, DNS failure) |
| https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures | 403 anti-bot; archive 2026-11-23 confirms |
| https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely | 200 |
| https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety | 403 anti-bot; archive 2026-11-23 confirms |
| https://ods.od.nih.gov/factsheets/VitaminK-Consumer/ | 403 anti-bot; archive 2026-11-14 confirms |
| https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies | 200 |

## Medicine-safety and contract checklist

- Exactly one `<aside class="med-note">`; names blood-pressure medicine, blood thinners such as warfarin, diabetes medicine and statins in plain words; sends reader to "your doctor or pharmacist before you change anything". Pass.
- Required safety sentence word for word, once, inside the box only. Pass.
- No per-recipe doctor caveats (the allergy-section doctor line was removed). "Doctor" outside the box only in the "When to talk to your doctor" h2 and the red-flag BP line. Pass.
- Red-flag section lists allergic reaction signs with 911 line, low blood sugar on diabetes medicine, bleeding on a blood thinner, leg swelling and high home BP readings. Pass.
- No start/stop/change-medicine advice, no diagnosis, no cure, no drug doses, no supplement amounts. Never tells reader to add salt. Pass.
- No canned-fish recipes (links out to /guides/canned-fish-recipes/), no shrimp cholesterol section, not a weekly plan. Pass.
- No em-dashes; allowed tags only. Pass.
- /calculator/ at visible word 98. Internal guide links: 2 (low-mercury-fish 2026-11-03, canned-fish-recipes 2026-11-17, both published). No pescatarian-vs-vegetarian link. `related` (low-mercury-fish, canned-fish-recipes, pescatarian-protein-sources) all published. Pass.
- Title 55, meta_description 155, excerpt 130 chars. Pass.
- Fields: site pd, author sarah, topic_id P14, category meal-plan, date = publish_date = scheduled_date = 2026-12-04, status ready, published false. Pass.
- `generate_pd_site.validate_post` returns no problems; JSON parses; no "[[" left. Pass.

## Open points for the editor

- Recipe timings (8 minutes for beans, 3 minutes a side trout, 2 minutes a side scallops) are unmarked cooking instructions, not sourced facts; left as written.
- Scallop sodium comes from USDA's steamed record (667 mg/100 g); dry-packed scallops will vary by brand.

Result: no hard safety violation found. Main corrections: haddock protein (17 g not 20 g), soy sauce 880 mg, the dead DGA link, the unsourced 30-minute and taco "mostly salt" claims, and the shellfish cross-reaction line.

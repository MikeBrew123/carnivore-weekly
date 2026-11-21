# Fact-check and medicine-safety log: pescatarian-breakfast-ideas

Checked 2026-11-21. All sources fetched live that day (curl, USDA FDC API, the official FDC SR Legacy CSV download, Internet Archive captures for the two sites that block bots).

**Totals (40 markers: 36 VERIFY + 4 VERIFY-URL, plus 15 unmarked claims checked = 55 rows): 23 verified as written, 29 changed, 3 removed.** Zero "[[" left in the file. Final visible word count: 1,594 (band 900 to 1,600, validator count including tables and Sources).

Fetch notes:
- USDA SR Legacy CSV bulk file (`https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`, 200) used for every ingredient. The ten main records were cross-checked through the FDC API (DEMO_KEY, one batch call, 200): protein and sodium matched the CSV exactly.
- Per-serving figure = per-100 g value x grams / 100. Gram weights from the FDC portion table: 1 oz = 28.35 g, 2 oz = 56.7 g, 3 oz = 85 g, large egg 50 g, Greek yogurt container 170 g, cottage cheese 1 cup 226 g, sardine can 92 g, rye slice 32 g, cream cheese 1 tbsp 14.5 g, canned pink salmon can drained 315 g, spinach 1 cup 30 g, canned tomatoes 1 cup 240 g, oats 1 cup 81 g, milk 1 cup 244 g, rye crispbread 10 g, avocado NLEA serving 50 g.
- Dietary Guidelines: dietaryguidelines.gov now points to the 2025-2030 edition at RealFood.gov. `https://www.realfood.gov/documents/DGA.pdf` (200, application/pdf, byte-identical to the Internet Archive capture 2026-11-18 of `cdn.realfood.gov/DGA.pdf`, which timed out today). PDF text: "The general population, ages 14 and above, should consume less than 2,300 mg per day of sodium."
- ods.od.nih.gov and fsis.usda.gov return 403 to curl (anti-bot). Text read from Internet Archive captures of the same URLs: ODS Vitamin K consumer sheet 2026-11-14, FSIS Leftovers 2026-11-21.
- No PubMed source was needed: the satiety claim was softened to a non-study, non-numeric line rather than sourced (row U2).

## Claim table

| # | Claim in draft | Verdict | Final wording / figure | Source fetched | Arithmetic |
|---|---|---|---|---|---|
| 1 | Most breakfasts land around 15 to 30 g protein (marker) | CHANGED | "around 20 to 30 grams of protein, using USDA figures"; 8 of 10 final rows sit in 20 to 30 (19 and 34 are the outliers) | FDC rows 16 to 35 | range 19 to 34 |
| 2 | Sodium under 2,300 mg a day (marker, house number) | VERIFIED as written | 2,300 mg; source moved from the superseded 2020-2025 edition to 2025-2030 | realfood.gov DGA.pdf | n/a |
| 3 | Lox 2 oz sodium 1,140 mg (marker) | CHANGED | 1,130 mg | FDC 171985 (lox, regular) 2,000 mg/100 g | 2,000 x 0.567 = 1,134 |
| 4 | Regular smoked salmon 2 oz sodium 450 mg (marker) | CHANGED | 380 mg | FDC 173687 672 mg/100 g | 672 x 0.567 = 381 |
| 5 | Cottage cheese 2%, 1 cup, 700 mg (marker) | VERIFIED as written | 700 mg | FDC 172182 308 mg/100 g | 308 x 2.26 = 696 |
| 6 | Canned pink salmon 3 oz 320 mg (marker) | VERIFIED as written | 320 mg (record is "drained solids", not "with bone"; table already says "regular") | FDC 175175 381 mg/100 g | 381 x 0.85 = 324 |
| 7 | Canned light tuna in water 3 oz "200 to 320 mg" label range (marker) | CHANGED | 210 mg; the 320 upper end had no source | FDC 173709 247 mg/100 g | 247 x 0.85 = 210 |
| 8 | Sardines in oil, 3.75 oz can, 280 mg (marker) | VERIFIED as written | 280 mg | FDC 175139 307 mg/100 g, can = 92 g | 307 x 0.92 = 282 |
| 9 | Large egg 70 mg (marker) | VERIFIED as written | 70 mg | FDC 171287 142 mg/100 g | 142 x 0.50 = 71 |
| 10 | Greek yogurt nonfat 3/4 cup 60 mg (marker) | VERIFIED (serving relabelled) | 60 mg; serving now "6 oz tub (170 g)" to match the FDC portion | FDC 170894 36 mg/100 g, container 170 g | 36 x 1.7 = 61 |
| 11 | Fresh cooked salmon 3 oz 50 mg (marker) | VERIFIED as written | 50 mg | FDC 175168 (Atlantic, farmed, cooked) 61 mg/100 g | 61 x 0.85 = 52 |
| 12 | Lox plate (2 oz lox, rye slice, 1 tbsp cream cheese) "push past 1,400 mg", about 60% of 2,300 (marker) | CHANGED | "comes to about 1,370 mg. That's about 60%". "Same fish, cooked fresh" changed to "Three ounces of salmon cooked fresh last night is about 50 mg" (the 50 mg is a 3 oz Atlantic salmon figure, not 2 oz chinook) | FDC 171985, 172684, 173418 | 1,134 + 193 + 46 = 1,373; 1,373 / 2,300 = 59.7% |
| 13 | No-salt-added canned pink salmon well under 100 mg per 3 oz (marker) | VERIFIED as written | well under 100 mg | FDC 174225 (without salt) 75 mg/100 g | 75 x 0.85 = 64 |
| 14 | Every fish in the post is an FDA/EPA Best Choice (marker) | VERIFIED as written | Salmon, Sardine, Cod, "Tuna, canned light (includes skipjack)" all Best Choice. Smoked salmon records are chinook salmon, covered by "Salmon". No herring or trout appears in the post | https://www.fda.gov/food/consumers/advice-about-eating-fish | n/a |
| 15 | Egg muffins keep 3 to 4 days in the fridge (marker) | VERIFIED as written | FSIS: "Leftovers can be kept in the refrigerator for 3 to 4 days" | FSIS Leftovers page, archive capture 2026-11-21 | n/a |
| 16 | 1. Scramble protein 19 g (marker) | CHANGED | 20 g (3 eggs, 1 cup spinach, half a medium tomato) | FDC 171287, 168462, 170457 | 18.84 + 0.86 + 0.54 = 20.2 |
| 17 | 1. Scramble sodium 230 mg | CHANGED | 240 mg | same | 213 + 24 + 3 = 240 |
| 18 | 2. Yogurt bowl protein 21 g (marker) | CHANGED | 22 g (170 g yogurt, 1 oz walnuts, 1/2 cup blueberries 74 g) | FDC 170894, 170187, 171711 | 17.32 + 4.32 + 0.55 = 22.2 |
| 19 | 2. Yogurt bowl sodium 65 mg | CHANGED | 60 mg | same | 61.2 + 0.6 + 0.7 = 62.5 |
| 20 | 3. Smoked salmon on rye plus egg, protein 19 g (marker) | VERIFIED as written | 19 g | FDC 173687, 172684, 171287 | 10.36 + 2.72 + 6.28 = 19.4 |
| 21 | 3. Sodium 710 mg; lox version about 1,400 mg | CHANGED | 650 mg; lox version about 1,400 mg verified | same plus 171985 | 381 + 193 + 71 = 645; 1,134 + 193 + 71 = 1,398 |
| 22 | 4. Sardines and egg protein 29 g (marker) | VERIFIED as written | 29 g | FDC 175139, 171287 | 22.65 + 6.28 = 28.9 |
| 23 | 4. Sodium 360 mg | CHANGED | "350 mg, plus the olives" (the recipe adds olives, which FDC 169094 puts at 735 mg/100 g; amount is "a few", so not totalled) | same | 282 + 71 = 353 |
| 24 | 5. Egg muffins (3 of 12) protein 24 g (marker) | CHANGED | 34 g. Recipe now names "one large can of pink salmon (about 11 oz once drained)", the FDC can weight | FDC 171287, 175175 (can drained 315 g), 168462 | (62.8 + 72.8 + 1.7) / 4 = 34.3 |
| 25 | 5. Sodium 350 mg | CHANGED | 490 mg | same | (710 + 1,200 + 47) / 4 = 489 |
| 26 | 6. Cottage cheese plate protein 24 g (marker) | VERIFIED as written | 24 g | FDC 172182 | 10.45 x 2.26 = 23.6 |
| 27 | 6. Sodium 710 mg | CHANGED | 700 mg (matches the body text and sodium table) | FDC 172182, 170457, 168409 | 696 + about 5 = 701 |
| 28 | 7. Shakshuka protein 21 g (marker) | VERIFIED as written | 21 g | FDC 171287, 170138 (no salt added) | 18.84 + 1.90 = 20.7 |
| 29 | 7. Sodium 260 mg | CHANGED | 240 mg | same | 213 + 24 = 237 |
| 30 | 8. Overnight oats protein 22 g (marker) | VERIFIED as written | 22 g. Assumes 1/2 cup Greek yogurt = 113 g (scaled from the 170 g, 3/4 cup tub) and 1 tbsp chia = 10 to 12 g (FDC gives only 1 oz) | FDC 173904, 170894, 171267, 170554 | 5.33 + 11.5 + 4.03 + 1.7 to 2.0 = 22.6 to 22.9 |
| 31 | 8. Sodium 110 mg | CHANGED | 100 mg | same | 2.4 + 40.7 + 57.3 + 1.9 = 102 |
| 32 | 9. Tuna and egg salad protein 27 g (marker) | CHANGED | 28 g; now includes the two rye crispbreads the recipe uses. Body changed from "half a can" to "two ounces of drained canned light tuna" (FDC's can is 165 g, so half a can would be 2.9 oz) | FDC 173709, 171287, 170894 (2 tbsp = 28 g), 172739 (crispbread 10 g) | 11.02 + 12.56 + 2.89 + 1.58 = 28.1 |
| 33 | 9. Sodium 300 mg, "varies by brand" | CHANGED | 370 mg; brand note dropped (no source) | same | 140 + 142 + 10 + 82 = 374 |
| 34 | 10. Leftover fish plate protein 28 g (marker) | CHANGED | 26 g (3 oz salmon, 1 egg, 1 tomato slice, 50 g avocado) | FDC 175168, 171287, 170457, 171705 | 18.79 + 6.28 + 0.18 + 1.00 = 26.3 |
| 35 | 10. Sodium 130 mg | VERIFIED as written | 130 mg | same | 52 + 71 + 1 + 3.5 = 128 |
| 36 | FDA major food allergens, nine (marker) | CHANGED | "Fish, eggs and milk are all on the FDA's list of nine major food allergens." FDA: "milk, eggs, fish, Crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and sesame". Shellfish dropped (none in the recipes); see U13 | https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies | n/a |
| 37 | VERIFY-URL: FDA grapefruit page | VERIFIED as written | 200. Supports the med-box line (U9) | fda.gov | n/a |
| 38 | VERIFY-URL: ODS Vitamin K consumer sheet | VERIFIED as written | 403 anti-bot; archive capture 2026-11-14 supports the warfarin line and lists spinach as a vitamin K source | archive | n/a |
| 39 | VERIFY-URL: FDA Food Allergies | CHANGED | Old URL 301s; replaced with the final URL `/food/nutrition-food-labeling-and-critical-foods/food-allergies` (200) | fda.gov | n/a |
| 40 | VERIFY-URL: FSIS Leftovers and Food Safety | VERIFIED as written | 403 anti-bot; archive capture 2026-11-21 has "3 to 4 days" | archive | n/a |
| U1 | "Most people who start the day on toast and coffee are digging through the cupboard by 10:30" | REMOVED | Unsourced "most people" claim; now "If that's your usual start, you probably know the 10:30 trip to the cupboard" | n/a | n/a |
| U2 | Satiety: "Three things keep most people full through a morning: protein, fiber and some fat" | CHANGED (softened) | "Every plate covers three things: protein, fiber and some fat. Many people find a plate like that carries them further than toast alone." No study, no number | n/a | n/a |
| U3 | h2 "Why these breakfasts hold you until lunch" | CHANGED | "How these breakfasts are built" | n/a | n/a |
| U4 | meta_description "to keep you full until lunch" | CHANGED | "with USDA protein and sodium numbers for every plate" (139 chars) | n/a | n/a |
| U5 | Oats: "turns oats from a 10:30 crash into a real breakfast" | REMOVED | Now "The yogurt is what puts real protein into a bowl of oats" | n/a | n/a |
| U6 | Leftover fish plate is "the lowest-sodium plate on this list" | CHANGED | "the lowest-sodium fish plate": the yogurt bowl (60 mg) is lower than this plate (130 mg) | rows 19, 35 | n/a |
| U7 | Tuna recipe "half a can" | CHANGED | see row 32 | FDC 173709 | n/a |
| U8 | Muffin recipe "one drained can of salmon" | CHANGED | see row 24 | FDC 175175 | n/a |
| U9 | Med box: grapefruit and grapefruit juice can change how some statins and some blood-pressure medicines work | VERIFIED as written | FDA lists "Some statin drugs to lower cholesterol" and "Some drugs that treat high blood pressure"; page warns against "drinking grapefruit juice or eating grapefruit" with affected drugs; sends reader to "health care provider or pharmacist". No drug names or doses printed in the post | FDA grapefruit page | n/a |
| U10 | Med box: big swings in spinach and leafy greens matter on warfarin, because of vitamin K | VERIFIED as written | ODS: "If you are taking a blood thinner such as warfarin (Coumadin), it's very important to get about the same amount of vitamin K each day"; green leafy vegetables such as spinach listed as sources | ODS Vitamin K | n/a |
| U11 | Light tuna is on Best Choices, albacore is not | VERIFIED as written | Albacore is "Good Choice" | FDA fish page | n/a |
| U12 | Sardines in olive oil bring omega-3 fats and edible bones with calcium | VERIFIED as written | FDC 175139 (drained solids with bone) lists calcium and EPA/DHA; record now linked in Sources | FDC 175139 | n/a |
| U13 | "Fish and shellfish are separate allergens, so reacting to one doesn't automatically mean the other" | REMOVED | FDA lists them separately but says nothing about cross-reaction; inference deleted | FDA allergies page | n/a |
| U14 | Yogurt bowl body "three quarters of a cup ... a small handful of walnuts" | CHANGED | "A 6-ounce tub of plain Greek yogurt (about three quarters of a cup), an ounce of walnuts" so the table figures trace to stated amounts | FDC 170894, 170187 | n/a |
| U15 | Sources: generic FDC homepage, DGA 2020-2025 link | CHANGED | Ten FDC record links added (lox, smoked salmon, egg, Greek yogurt, cottage cheese, canned pink salmon, no-salt pink salmon, light tuna, sardines, cooked salmon), FDC homepage kept for the minor ingredients, DGA link moved to 2025-2030 | n/a | n/a |

## Source URL check

| URL | Result |
|---|---|
| https://fdc.nal.usda.gov/food-details/{171985,173687,171287,170894,172182,175175,174225,173709,175139,175168}/nutrients | JavaScript app: curl gets the app shell with status 404, the record renders in a browser. Same link form the published PD guides use. All ten confirmed 200 through the FDC API batch call |
| https://fdc.nal.usda.gov/ | 200 |
| https://www.realfood.gov/documents/DGA.pdf | 200, sodium sentence read from PDF text |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200, lists confirmed |
| https://www.fda.gov/consumers/consumer-updates/grapefruit-juice-and-some-drugs-dont-mix | 200 |
| https://ods.od.nih.gov/factsheets/VitaminK-Consumer/ | 403 anti-bot; content confirmed from archive capture 2026-11-14 |
| https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies | 200 (replaces the old URL, which redirected here) |
| https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety | 403 anti-bot; content confirmed from archive capture 2026-11-21 |

No consensus.app links. No PubMed/DOI links in the post.

## Medicine-safety and contract checklist

- Exactly one `<aside class="med-note">`; names blood-pressure medicine, statins, blood thinners such as warfarin and diabetes medicine in plain words; ends "Ask your doctor or pharmacist before you change anything." Pass.
- Required safety sentence present word for word exactly once, inside the box, nowhere else. Pass.
- No doctor caveats tacked onto recommendations. "Doctor" appears outside the box only in the "When to talk to your doctor" h2. Pass.
- "When to talk to your doctor" lists red-flag signs (allergic reaction with 911 line, low-blood-sugar signs on diabetes medicine, bleeding signs on a blood thinner, new leg swelling or sudden weight gain, unintended weight loss). Not a second warning. Pass.
- No start/stop/change-medicine advice, no diagnosis, no cure claim, no drug names with doses, no supplement amounts. Validator dose rule passes (an earlier Sources wording tripped it, fixed by dropping "2,300 mg" from the DGA source line, which sat in the same run of text as "Office of Dietary Supplements"). Pass.
- No personal protein target; the post sends readers to /calculator/ for their numbers. Pass.
- Never tells readers to add salt ("don't salt any of it"); sodium only as under 2,300 mg a day. Pass.
- Fish named: salmon (fresh, smoked chinook, canned pink), sardines, canned light tuna, cod. All FDA/EPA Best Choices. Albacore appears only as "not" the choice. Pass.
- No em-dashes. Allowed tags only (a, aside, h2, h3, li, ol, p, strong, table, tbody, td, th, thead, tr, ul). Pass.
- /calculator/ link at visible word 95. Internal guide links: 2 (low-mercury-fish, canned-fish-recipes), both published. No link to pescatarian-protein-sources. `related`: canned-fish-recipes, low-mercury-fish, 7-day-pescatarian-meal-plan-weight-loss-after-50, all published. Pass.
- Title 53 chars, meta_description 139, excerpt 143. Pass.
- Fields: site pd, slug pescatarian-breakfast-ideas, author marcus, topic_id P10, category meal-plan, date = publish_date = scheduled_date = 2026-11-27, status ready, published false, no image field. Pass.
- `generate_pd_site.validate_post` on the draft returns no problems. JSON parses; no "[[" in the file. Pass.

## Open points for the editor

- Word count is 1,594, six under the 1,600 cap. Any added sentence needs a matching cut.
- Egg muffins now read 34 g protein for three muffins, well above the other plates, because the recipe uses a full large can of salmon. Halving to a small can would bring it near 25 g if a more even table is wanted.
- Smoked salmon figures come from USDA's chinook records; supermarket smoked salmon is often Atlantic and sodium varies by brand. The post shows the USDA figure only.
- Overnight oats (row 30) rests on two volume-to-weight assumptions (yogurt cup, chia tablespoon) that FDC does not publish; both are noted above.

Result: no hard safety violation found. Main corrections were the egg-muffin, tuna and smoked-salmon numbers, the lox-plate total (1,370 mg, not "past 1,400"), and softening the unsourced fullness claims.

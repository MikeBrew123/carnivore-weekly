# Fact-check and medicine-safety log: pescatarian-protein-sources

Checked 2026-11-21. All sources fetched live that day (curl, USDA FDC API with DEMO_KEY, USDA's official SR Legacy CSV bulk file).

**Totals (29 markers: 27 VERIFY + 2 VERIFY-URL): 19 verified as written, 9 changed, 1 removed.** Plus 16 unmarked claims checked (rows 30 to 45). Zero "[[" left in the file. Final visible word count: 1,541 (band 900 to 1,600, Sources list included).

Fetch notes:
- USDA SR Legacy CSV: `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip` (200). Spot-checked against the FDC API (records 175139 and 173709, both 200, values match). Per-serving figure = per-100 g value x serving grams (3 oz = 85 g; other servings from the record's own portion table).
- FDA Advice about Eating Fish: 200, Best Choices list read from page text.
- heart.org Fish and Omega-3 page: 200 live today. Text: "A serving is 3 ounces cooked, or about ¾ cup, of flaked fish."
- DGA 2020-2025 PDF (`https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf`): 200. Sodium "Limit: 2,300 mg"; Appendix 1 adult AMDR: protein 10-35%, fat 20-35%, carbohydrate 45-65%. The 2025-2030 PDF host (cdn.realfood.gov) did not resolve today, so the 2020-2025 PDF is cited.
- ODS Potassium (Health Professional): 403 to curl (anti-bot); read from Internet Archive capture 2026-11-09.

## Claim table

| # | Claim in draft | Verdict | Final wording / figure | Source fetched | Arithmetic |
|---|---|---|---|---|---|
| 1 | Fish serving 3 oz cooked, "about the size of a deck of cards" | CHANGED | "3 ounces cooked, the serving size the American Heart Association uses, or about 3/4 cup of flaked fish". Deck of cards not on any fetched source; FDA uses 4 oz, so attributed to AHA | heart.org page | n/a |
| 2 | Every fish in table is an FDA/EPA Best Choice | VERIFIED | Sardine, Salmon, Tuna canned light, Trout freshwater, Pollock, Shrimp, Atlantic mackerel, Cod all "Best Choice" | FDA Advice about Eating Fish | n/a |
| 3 | Sardine can 3.75 oz | VERIFIED | FDC 175139 portion "1 can (3.75 oz)" = 92 g | FDC 175139 | n/a |
| 4 | Sardines, 1 can, 23 g | VERIFIED | 23 g | FDC 175139 | 24.62 x 0.92 = 22.7 |
| 5 | Light tuna in water, 3 oz, 22 g | CHANGED | 17 g (standard record; 22 g is only the "without salt" record 171986) | FDC 173709 | 19.44 x 0.85 = 16.5 |
| 6 | Rainbow trout cooked, 3 oz, 21 g | CHANGED | 20 g, row now "farmed" | FDC 173718 (wild 175155 = 19.5) | 23.8 x 0.85 = 20.2 |
| 7 | Atlantic salmon cooked, 19 to 22 g | VERIFIED | 19 to 22 g | FDC 175168 farmed, 171998 wild | 22.1 x 0.85 = 18.8; 25.44 x 0.85 = 21.6 |
| 8 | Atlantic mackerel cooked, 20 g | VERIFIED | 20 g | FDC 175120 | 23.85 x 0.85 = 20.3 |
| 9 | Shrimp cooked, 20 g | VERIFIED | 20 g | FDC 175180 | 23.98 x 0.85 = 20.4 |
| 10 | Pollock or cod cooked, 19 to 20 g | VERIFIED | 19 to 20 g | FDC 173681, 171956 | 23.48 x 0.85 = 20.0; 22.83 x 0.85 = 19.4 |
| 11 | Firm tofu 1/2 cup, 10 to 20 g | CHANGED | 11 to 22 g, varies by brand | FDC 172448 (nigari), 172475 (calcium sulfate); 1/2 cup = 126 g | 9.04 x 1.26 = 11.4; 17.27 x 1.26 = 21.8 |
| 12 | 170 g container = 3/4 cup | CHANGED | Serving now "1 container (170 g)"; FDC lists the container, no cup measure | FDC 170894 | n/a |
| 13 | Greek yogurt plain nonfat 170 g, 17 g | VERIFIED | 17 g | FDC 170894 | 10.19 x 1.7 = 17.3 |
| 14 | Cottage cheese 2%, 1/2 cup, 12 g | VERIFIED | 12 g | FDC 172182 (1 cup = 226 g) | 10.45 x 1.13 = 11.8 |
| 15 | Lentils 1/2 cup, 9 g | VERIFIED | 9 g | FDC 172421 (1 cup = 198 g) | 9.02 x 0.99 = 8.9 |
| 16 | Edamame 1/2 cup, 9 g | VERIFIED | 9 g; label "shelled" changed to "frozen, cooked" to match the record name | FDC 168411 (1 cup = 155 g) | 11.91 x 0.775 = 9.2 |
| 17 | Milk 1 cup, 8 g | VERIFIED | 8 g | FDC 171267 (2%), 171265 (whole) | 3.3 x 2.44 = 8.1; 3.15 x 2.44 = 7.7 |
| 18 | Black beans 1/2 cup, 8 g | VERIFIED | 8 g | FDC 173735 (1 cup = 172 g) | 8.86 x 0.86 = 7.6 |
| 19 | Chickpeas 1/2 cup, 7 g | VERIFIED | 7 g | FDC 173757 (1 cup = 164 g) | 8.86 x 0.82 = 7.3 |
| 20 | Cheddar 1 oz, 7 g | CHANGED | 6 g | FDC 173414 | 22.87 x 0.2835 = 6.5 |
| 21 | Large egg, 6 g | VERIFIED | 6 g | FDC 171287 (large = 50 g) | 12.56 x 0.5 = 6.3 |
| 22 | 1 cup lentils, about 40 g carbohydrate | VERIFIED | 40 g | FDC 172421 | 20.13 x 1.98 = 39.9 |
| 23 | Sodium under 2,300 mg a day | VERIFIED | 2,300 mg | DGA 2020-2025 PDF | n/a |
| 24 | 2 eggs + Greek yogurt close to 30 g | VERIFIED | close to 30 | rows 13, 21 | 12 + 17 = 29 |
| 25 | AMDR 10-35 / 20-35 / 45-65 % | VERIFIED | as written | DGA 2020-2025 Appendix 1 | n/a |
| 26 | Sample day 1 total 96 g | CHANGED | 94 g (dinner 30 to 29, snack 7 to 6) | table | 29 + 30 + 29 + 6 = 94 |
| 27 | Sample day 2 total 97 g | CHANGED | 92 g (lunch 30 to 25) | table | 26 + 25 + 29 + 12 = 92 |
| 28 | VERIFY-URL: dietaryguidelines.gov homepage, "2020-2025" | CHANGED | Homepage now shows the 2025-2030 edition; replaced with the 2020-2025 PDF (200) that holds both cited numbers | PDF above | n/a |
| 29 | VERIFY-URL: NAP DRI catalog page | REMOVED | Redirects to nationalacademies.org/publications/10490, 403. AMDR now cited from DGA Appendix 1 | n/a | n/a |
| 30 | "Most people over 50 who stop eating meat... run short on protein... stairs feel steeper" | CHANGED | "Stop eating meat after 50 and the thing to watch isn't fish. It's protein, and the gap is easy to miss." No source for the "most people" claim | n/a | n/a |
| 31 | "My mother, Joan, is 82 and lives alone in Kelowna" | CHANGED | "My mother lives alone." Name, age and city are in no persona file (same fix as sardines-benefits row 31) | .claude/agents/marcus.md | n/a |
| 32 | "One piece of fish lands around 19 to 23 grams" | CHANGED | "17 to 23 grams" (tuna row) | table | n/a |
| 33 | Fish "most protein per bite" | CHANGED | "most protein per serving in that table, with almost no carbohydrate" (cheddar per 100 g is about equal to fish) | FDC records | n/a |
| 34 | Canned fish "cost less than fresh" | REMOVED | No price source | n/a | n/a |
| 35 | Breakfast and snacks are "the two places most people over 50 come up short"; breakfast is "where most of the gap lives" | CHANGED | "the two meals that are easiest to leave light"; "start with breakfast. It's usually the easiest meal to fix." No survey data fetched | n/a | n/a |
| 36 | Greek yogurt "is strained, so thicker, usually more protein" | CHANGED | "carries close to twice the protein of regular plain yogurt in USDA's records" | FDC 170894 vs 170887 | 10.19 / 5.73 = 1.8 |
| 37 | Legumes bring "fiber and minerals fish doesn't" | CHANGED | "bring fiber, which fish doesn't" | FDC records | n/a |
| 38 | Legumes add 7 to 9 g per half cup | VERIFIED | rows 15, 16, 18, 19 | n/a | n/a |
| 39 | Lean fish mostly protein, little fat | VERIFIED | cod 0.86 g, pollock 1.18 g, shrimp 0.28 g fat per 100 g | FDC 171956, 173681, 175180 | n/a |
| 40 | Fatty fish fat mostly unsaturated | VERIFIED | saturated is 10 to 23% of total fat (salmon farmed 2.4/12.35, sardine 1.5/11.45, mackerel 4.2/17.8) | FDC 175168, 175139, 175120 | n/a |
| 41 | Legumes more carbohydrate than protein | VERIFIED | lentils 20.1 g carb vs 9.0 g protein per 100 g | FDC 172421 | n/a |
| 42 | Cottage cheese runs salty; cheese adds sat fat and salt | VERIFIED | cottage 308 mg Na/100 g; cheddar 653 mg Na, 18.9 g sat fat/100 g | FDC 172182, 173414 | n/a |
| 43 | Med note: some BP medicines change potassium handling; beans, yogurt, milk, fish carry potassium | VERIFIED | ODS: ACE inhibitors, ARBs, potassium-sparing diuretics can cause hyperkalemia; "legumes... fish, milk, yogurt... contain potassium" | ODS Potassium HP, archive 2026-11-09 | n/a |
| 44 | Sample days count side foods (rice, salad, apple) | CHANGED | Added "counting the protein foods only" | n/a | n/a |
| 45 | Sources: generic FDC homepage | CHANGED | Replaced with 21 record links (every FDC record used above, plus 170887 for row 36) | n/a | n/a |

## Source URL check

| URL | Result |
|---|---|
| https://fdc.nal.usda.gov/food-details/<id>/nutrients (21 records) | JavaScript app, same link form the published PD guides use; all 21 ids present in USDA SR Legacy CSV; 175139 and 173709 also 200 via FDC API |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200 |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 200 |
| https://www.dietaryguidelines.gov/sites/default/files/2020-12/Dietary_Guidelines_for_Americans_2020-2025.pdf | 200 |
| https://ods.od.nih.gov/factsheets/Potassium-HealthProfessional/ | 403 anti-bot; content confirmed from archive capture 2026-11-09 |

No PubMed/DOI sources are cited (no study claims in the post). No consensus.app links.

## Medicine-safety and contract checklist

- Exactly one `<aside class="med-note">`; names diabetes medicine, blood-pressure medicine, blood thinners such as warfarin, statins; sends reader to doctor or pharmacist; says medicine changes are the prescriber's decision. Pass.
- Required safety sentence present word for word exactly once, inside the box. Pass.
- No doctor caveats after recommendations; outside the box "doctor" appears only in the red-flag h2 title and a red-flag bullet ("especially on diabetes medicine"). Pass.
- "When to talk to your doctor" lists red-flag signs (unplanned weight loss, chewing/swallowing trouble, weakness, low-blood-sugar symptoms, allergic reaction with emergency line). Pass.
- No start/stop/change-medicine advice, diagnosis, cure claims, drug doses, supplement or protein-powder amounts. Pass.
- No personalised protein target and no CW g/lb figure; reader is sent to the calculator; sample days explicitly "aren't a target". Pass.
- Fish named are all FDA/EPA Best Choices (row 2). Never advises adding salt. Pass.
- Allowed tags only. /calculator/ at visible word 123. Internal guide links: 2 (fish-high-in-omega-3, 7-day-pescatarian-meal-plan-weight-loss-after-50). related: fish-high-in-omega-3, 7-day-pescatarian-meal-plan-weight-loss-after-50, canned-fish-recipes (all on the published list). Pass.
- No em-dashes. Title 56 chars, meta_description 154, excerpt 150. Pass.
- Fields: site pd, slug pescatarian-protein-sources, author marcus, topic_id P6, category nutrition, date = publish_date = scheduled_date = 2026-11-24, status ready, published false. Pass.
- JSON parses; no "[[" in file; `generate_pd_site.validate_post` returns no problems. Pass.

## Open points for the editor

- Canned light tuna: USDA's standard record gives 17 g per 3 oz, the "without salt" record 22 g. The post uses 17 g; the gap is between samples, not caused by salt.
- DGA cited is the 2020-2025 edition (its PDF loads; the 2025-2030 PDF host did not resolve today). Both numbers used (2,300 mg, AMDR) are unchanged facts in that edition.
- "I eat plenty of beef myself" kept (Marcus is a CW carnivore writer); persona family details trimmed to "my mother".

Result: no hard safety violation found. Main corrections: four table values (tuna, trout, tofu, cheddar) and the two sample-day totals, serving-size attribution, and unsourced population claims softened or removed.

## Main-session edit (2026-11-21)
- Removed the "my mother lives alone" anecdote: not in Marcus's writer profile, so it is an invented personal story (contract: no invented personal history). Kept "Easy protein beats perfect protein."

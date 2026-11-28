# Fact-check and medicine-safety log: pescatarian-vs-vegetarian

Checked 2026-11-28. All sources fetched live that day (curl, USDA FDC API, the official FDC SR Legacy CSV download, Europe PMC API, PMC full text, Internet Archive captures for ods.od.nih.gov, which blocks bots).

**Totals (27 markers: 26 VERIFY + 1 VERIFY-URL, plus 16 unmarked claims checked = 43 rows): 24 verified as written, 16 changed, 3 removed.** Zero "[[" left in the file. Final visible word count: 1,587 (validator count, including table and Sources; band 900 to 1,600).

Fetch notes:
- USDA SR Legacy CSV (`https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`, 200) for protein, iron, B12 and portion weights. All eight linked records re-confirmed through one FDC API batch call (DEMO_KEY, 200); protein and iron matched the CSV.
- Per-serving figure = per-100 g value x grams / 100. Portions from the FDC portion table: 3 oz = 85 g, large egg 50 g, Greek yogurt container 170 g, lentils 1 cup 198 g (half = 99 g), tofu 1/2 cup 126 g, spinach 1 cup 180 g (half = 90 g).
- ods.od.nih.gov returns 403 to curl. Text read from Internet Archive captures of the same URLs: Vitamin B12 HP 2026-11-15 (sheet dated July 2, 2025), Iron HP 2026-11-16 (Sept 4, 2025), Omega-3 HP 2026-11-15 (Aug 22, 2025), Potassium HP 2026-11-09, Vitamin K Consumer 2026-11-14.
- **The current ODS B12 sheet differs from older versions in two places the draft relied on:** clams are now listed at 17 mcg per 3 oz (older sheet and SR Legacy record 171975 give about 84 mcg), and the "adults over 50 should get most B12 from fortified foods or supplements" line is gone. Post now follows the current sheet.
- Tong et al. 2019: PMID 31484644 and PMC6724406 from `scripts/pubmed_lookup.py search`. Abstract read via Europe PMC API; discussion and Table 2 read from PMC full text (200). doi.org/10.1136/bmj.l4897 resolves to bmj.com, which returns 403 to curl, so the Sources link now points to the PMC full text.

## Claim table

| # | Claim in draft | Verdict | Final wording / figure | Source | Arithmetic |
|---|---|---|---|---|---|
| 1 | Fish serving 3 oz cooked (marker) | VERIFIED | "3 oz ... the American Heart Association's serving size" | AHA: "A serving is 3 ounces cooked" | n/a |
| 2 | 3 oz cooked salmon 19 to 22 g protein (marker) | VERIFIED | 19 to 22 g | FDC 175168 (Atlantic farmed) 22.1 g/100 g; 171998 (Atlantic wild) 25.44 | 18.8; 21.6 |
| 3 | 1/2 cup cooked lentils 9 g (marker) | VERIFIED | 9 g | FDC 172421 9.02 g/100 g | 9.02 x 0.99 = 8.9 |
| 4 | Egg about 6 g (marker) | VERIFIED | "about 6 g in a large one" | FDC 171287 12.56 g/100 g | 12.56 x 0.5 = 6.3 |
| 5 | Greek yogurt 17 g per 170 g (marker) | VERIFIED | "plain nonfat Greek yogurt (about 17 g in a 6 oz tub)" | FDC 170894 10.19 g/100 g, container 170 g | 17.3 |
| 6 | ALA converts only a small share (marker) | CHANGED | "turns very little ALA into EPA and DHA. The NIH puts the reported conversion rates at less than 15%" | ODS Omega-3: "very limited, with reported rates of less than 15%" | n/a |
| 7 | AHA 2 servings fish a week (marker) | VERIFIED | "recommends 2 servings of fish a week, particularly fatty fish" | AHA page (200) | n/a |
| 8 | B12 adult target 2.4 mcg (marker) | VERIFIED | 2.4 mcg | ODS B12 Table 1, 19+ years | n/a |
| 9 | Clams 3 oz about 84 mcg (marker) | CHANGED | "about 17 mcg, roughly seven times a whole day's target" | ODS B12 Table 2 (current): 17 mcg. SR Legacy 171975 would give 84; conflict noted above, post follows ODS | 17 / 2.4 = 7.1 |
| 10 | Salmon (sockeye) 3 oz 2.6 mcg (marker) | CHANGED | Label now "Atlantic salmon", 2.6 mcg | ODS Table 2 "Salmon, Atlantic, cooked, 3 ounces 2.6"; sockeye would be 3.8 (FDC 173692 4.47 x 0.85) | n/a |
| 11 | Light tuna canned 3 oz 2.5 mcg (marker) | VERIFIED | 2.5 mcg, label "canned in water" | ODS Table 2: 2.5 (FDC 173709 gives 2.2; ODS figure used for the list) | n/a |
| 12 | Milk 1 cup 1.2 mcg (marker) | CHANGED | "Milk, 2%, 1 cup: about 1.3 mcg" | ODS Table 2: 1.3; FDC 171267 0.53 x 2.44 = 1.29 | n/a |
| 13 | Egg 0.5 mcg (marker) | VERIFIED | 0.5 mcg, "1 large, cooked" | ODS Table 2 "Egg, whole, cooked, 1 large 0.5" | n/a |
| 14 | NIH: adults over 50 get most B12 from fortified foods (marker) | CHANGED | Line no longer on the current ODS sheet. Now: NIH lists older adults and vegetarians among those most likely to run low; atrophic gastritis in 8% to 9% of adults 65+ cuts stomach acid; B12 in fortified foods (many breakfast cereals, nutritional yeasts) doesn't need that step | ODS B12: risk groups, "8% to 9% of adults age 65 and older", "already in free form and therefore does not require the separation step" | n/a |
| 15 | Iron 18 mg (19 to 50), 8 mg (51+) (marker) | VERIFIED | "need 18 mg ... from 51 on ... 8 mg" ("about" dropped) | ODS Iron Table 1 | n/a |
| 16 | Vegetarians 1.8x iron (marker) | VERIFIED | Wording aligned: "1.8 times as much iron as people who include meat in their diet" | ODS Iron | n/a |
| 17 | Oysters 3 oz 8 mg (marker) | VERIFIED | "Eastern oysters, 3 oz cooked: about 8 mg" | ODS Table 2; FDC 171980 9.21 x 0.85 = 7.8 | n/a |
| 18 | Lentils 1/2 cup 3 mg (marker) | VERIFIED | 3 mg | ODS Table 2; FDC 172421 3.33 x 0.99 = 3.3 | n/a |
| 19 | Firm tofu 1/2 cup 3 mg (marker) | VERIFIED | 3 mg | ODS Table 2; FDC 172475 2.66 x 1.26 = 3.4 | n/a |
| 20 | Spinach 1/2 cup boiled 3 mg (marker) | VERIFIED | 3 mg | ODS Table 2; FDC 168463 3.57 x 0.9 = 3.2 | n/a |
| 21 | Vitamin C helps non-heme iron absorption (marker) | VERIFIED | as written | ODS Iron: ascorbic acid "enhances the bioavailability of nonheme iron" | n/a |
| 22 | EPIC-Oxford about 48,000 people, 18 years (marker) | VERIFIED | as written | Tong 2019: 48,188 participants, 18.1 years | n/a |
| 23 | Fish eaters 13% lower, vegetarians 22% lower heart disease (marker) | CHANGED (precision) | Now "ischaemic heart disease (the kind caused by narrowed arteries)" and "vegetarians, a group that included vegans"; numbers unchanged | Tong: HR 0.87 (0.77 to 0.99) and 0.78 (0.70 to 0.87) | n/a |
| 24 | Vegetarians about 20% more stroke, "researchers can't yet explain" (marker) | CHANGED | "20% higher rates of stroke than meat eaters, mostly the bleeding kind. The authors say more research is needed to confirm this and explain why." Association wording kept; next paragraph says observational, not proof | Tong: HR 1.20 (1.02 to 1.40), "mostly due to a higher rate of haemorrhagic stroke"; "Further research is needed to replicate these results ... and to identify mediators" | n/a |
| 25 | FDA/EPA Best Choices list (marker) | VERIFIED | as written | FDA page (200). Every fish/shellfish in the post is Best Choice: salmon, sardine, trout (freshwater), Atlantic mackerel, shrimp, clam, oyster, light tuna | n/a |
| 26 | Sodium under 2,300 mg/day (marker) | VERIFIED | as written | FDA Sodium in Your Diet (200): DGA "less than 2,300 mg per day"; realfood.gov DGA.pdf 200 | n/a |
| 27 | VERIFY-URL: replace FDC homepage | CHANGED | Eight food-specific FDC links (175168, 171998, 172421, 171287, 170894, 172475, 171980, 168463). B12 list cites ODS Table 2, so no FDC B12 links needed | FDC API 200 | n/a |
| U1 | Table: heme iron from "clams, oysters, mussels and sardines" | CHANGED | "seafood such as oysters, clams and sardines, which carry heme iron"; mussels had no fetched source | ODS Iron ("seafood ... richest dietary sources of heme iron"; oysters, sardines in Table 2); FDC 171975 clams | n/a |
| U2 | Table: vegetarian "usually the highest fiber and lowest saturated fat"; pescatarian "similar" | CHANGED | "In the EPIC-Oxford study, slightly more fiber and slightly less saturated fat than fish eaters" / "Very close to vegetarians on both" | Tong Table 2: fibre 22.1 vs 21.2 g/day; sat fat 10.2% vs 10.6% energy | n/a |
| U3 | "It comes up on my Tuesday morning walks with friends" | REMOVED | Unverifiable personal anecdote (also cut for length) | n/a | n/a |
| U4 | "Most [vegetarians] still eat eggs and dairy" | CHANGED | "Many still eat" (no source for "most") | n/a | n/a |
| U5 | "trout or mackerel" | CHANGED | "trout or Atlantic mackerel" (king mackerel is Choice to Avoid) | FDA list | n/a |
| U6 | "tuna and white bean salad" | CHANGED | "light tuna" (albacore is only Good Choice) | FDA list | n/a |
| U7 | "I eat plenty of meat myself, so I don't have a horse in this race" | REMOVED | Personal claim, cut for length; the post stays neutral | n/a | n/a |
| U8 | Med box: beans, lentils, yogurt, fish carry potassium; some BP medicines change how the body handles it | VERIFIED | as written | ODS Potassium: lentils, beans, yogurt, salmon in Table 2; ACE inhibitors/ARBs "reduce urinary potassium excretion" | n/a |
| U9 | Med box: more leafy greens changes vitamin K intake on warfarin | VERIFIED | as written | ODS Vitamin K: "very important to get about the same amount of vitamin K each day" | n/a |
| U10 | Med box: some diabetes and stomach-acid medicines can lower B12 | VERIFIED | as written | ODS B12: metformin, gastric acid inhibitors | n/a |
| U11 | Bottom line: vegetarian "tends to bring more fiber and less saturated fat" | CHANGED | "brought slightly more fiber and less saturated fat in the biggest study" | Tong Table 2 | n/a |
| U12 | Source link doi.org (bmj.com 403 to curl) | CHANGED | PMC full-text link from pubmed_lookup | PMC (200) | n/a |
| U13 | Calculator gives calorie and protein figure from age, height, weight | VERIFIED | as written | pescodial/public/calculator/index.html (age, ft/in/cm, weight fields; "calories, protein and fish meals") | n/a |
| U14 | B12 only found naturally in animal foods | VERIFIED | as written | ODS B12: "not naturally present in plant foods" | n/a |
| U15 | Iron target drops "because periods have usually stopped" | CHANGED | "because monthly blood loss has usually stopped" | ODS Iron: "Losses are greater in menstruating women" | n/a |
| U16 | "Here's what I've seen work" | REMOVED | Personal-experience claim dropped; sentence kept as plain advice | n/a | n/a |

## Source URL check

| URL | Result |
|---|---|
| ods.od.nih.gov: VitaminB12-HP, Iron-HP, Omega3FattyAcids-HP, Potassium-HP, VitaminK-Consumer | 403 anti-bot to curl; content confirmed from archive captures (dates above) |
| https://fdc.nal.usda.gov/food-details/{175168,171998,172421,171287,170894,172475,171980,168463}/nutrients | JS app: curl gets app shell with 404, renders in browser; same link form as published PD guides. All eight confirmed via FDC API batch (200) |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 200 |
| https://pmc.ncbi.nlm.nih.gov/articles/PMC6724406/ | 200 (PMID 31484644 via pubmed_lookup) |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200 |
| https://www.fda.gov/food/nutrition-education-resources-materials/sodium-your-diet | 200 |

No consensus.app links.

## Medicine-safety and contract checklist

- Exactly one `<aside class="med-note">`, containing the required safety sentence word for word, once in the whole post. Names statins, blood-pressure medicine, blood thinners such as warfarin, diabetes medicine; ends "Any change to a medicine is your prescriber's decision. Ask your doctor or pharmacist before you change anything." Pass.
- No per-recommendation doctor caveats. "Doctor" appears outside the box only in the "When to talk to your doctor" h2 and its list. Pass.
- "When to talk to your doctor" lists red-flag signs (low iron/anemia signs, low B12 signs, bleeding or bruising on a blood thinner, plus a 911 line for stroke/heart signs). Pass.
- No supplement doses (no mg/mcg pill amounts for B12, iron or omega-3); every mg/mcg is a food amount or an RDA/sodium limit. No start/stop/change-medicine advice, no diagnosis, no cure claim. Pass.
- EPIC-Oxford worded as rates/links in an observational study, explicitly "not proof that the diet caused them". Pass.
- Fair comparison: table and bottom line give each pattern its strengths; no verdict. Pass.
- Omega-3: one paragraph plus link to /guides/fish-high-in-omega-3/. Pass.
- Internal guide links: 2 (pescatarian-protein-sources 2026-11-24, fish-high-in-omega-3 2026-10-23, both published). /calculator/ link at visible word 88. Pass.
- No em-dashes. Allowed tags only. Pass.
- Title 58 chars, meta_description 138, excerpt 143. Fields: site pd, author sarah, topic_id P11, category health, date = publish_date = scheduled_date = 2026-12-01, status ready, published false, no image. Pass.
- `generate_pd_site.validate_post` returns no problems; JSON parses; no "[[" in the file. Pass.

## Open points for the editor

- Word count 1,587, 13 under the cap.
- Clams B12: ODS (17 mcg) and USDA SR Legacy (about 84 mcg) disagree by 5x; the post uses the lower, current ODS figure.

Result: no hard safety violation found. Main corrections: clams B12 (84 to 17 mcg), milk B12, salmon label, the over-50 B12 advice rewritten to match the current NIH sheet, EPIC-Oxford wording tightened (ischaemic heart disease, vegans included, authors' own "more research needed"), fiber/saturated fat claim pinned to the study's actual small gap.

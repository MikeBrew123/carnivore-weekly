# Fact-check and medicine-safety log: sardines-benefits

Checked 2026-11-14. All sources fetched live that day (curl, USDA FDC API, the official FDC SR Legacy CSV download, Internet Archive captures for the two sites that block bots).

**Totals (21 markers: 16 VERIFY + 5 VERIFY-URL, plus 14 unmarked claims checked = 35 rows): 20 verified as written, 12 changed, 3 removed.** Zero "[[" left in the file. Final visible word count: 1,467 (band 900 to 1,600).

Fetch notes:
- USDA FDC API (DEMO_KEY) answered records 175139 and 175140, then returned 429 OVER_RATE_LIMIT (retry-after about 11 hours). The remaining records came from USDA's official SR Legacy CSV bulk file (`https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`, 200), which matched the API exactly for the two records fetched both ways. Per-serving figures = per-100 g value x 0.85 (3 oz = 85 g).
- Because the API was rate-limited, the Branded Foods search could not be run, so no USDA record for boneless, skinless sardines was fetched. That claim was replaced with a verified USDA comparison (row 20).
- heart.org and ods.od.nih.gov return 403 to curl and WebFetch (anti-bot). Page text was read from Internet Archive captures of the same URLs: heart.org 2026-11-02, ODS Calcium 2026-11-09, ODS Vitamin D 2026-11-10, ODS Omega-3 2026-11-08.
- cdn.realfood.gov/DGA.pdf (200): PDF text reads "The general population, ages 14 and above, should consume less than 2,300 mg per day of sodium."
- FDA Advice about Eating Fish (200, content current as of 03/05/2024).

## Claim table

| # | Claim in draft | Verdict | Final wording / figure | Source fetched | Arithmetic |
|---|---|---|---|---|---|
| 1 | Standard flat can size and drained weight (marker) | CHANGED | "USDA's standard can is 3.75 ounces, which drains down to about 92 grams of fish, a little over one 3-ounce serving" | FDC 175139 portion "1 can (3.75 oz)" = 92 g, https://api.nal.usda.gov/fdc/v1/food/175139 | 92 / 28.35 = 3.25 oz |
| 2 | Protein per 3 oz (marker) | VERIFIED as written | About 21 grams | FDC 175139 | 24.62 x 0.85 = 20.9 g |
| 3 | Calcium per 3 oz (marker) | VERIFIED as written | About 325 mg | FDC 175139 | 382 x 0.85 = 324.7 mg |
| 4 | Vitamin D per 3 oz (marker) | VERIFIED as written | About 4 mcg | FDC 175139 | 4.8 x 0.85 = 4.08 mcg |
| 5 | EPA plus DHA per 3 oz (marker) | VERIFIED as written | About 0.8 grams | FDC 175139 | (0.473 + 0.509) x 0.85 = 0.83 g |
| 6 | Sodium per 3 oz (marker) | VERIFIED as written | About 260 mg | FDC 175139 | 307 x 0.85 = 261 mg |
| 7 | AHA: at least 2 servings a week, 3 oz cooked, fatty fish (marker) | CHANGED | "recommends 2 servings of fish a week"; "at least" dropped to match the AHA sentence ("recommends eating 2 servings of fish (particularly fatty fish) per week. A serving is 3 ounces cooked"). Same fix as earlier PD guides | heart.org Fish and Omega-3 page, archive capture 2026-11-02 | n/a |
| 8 | Sardines are a fatty fish | VERIFIED as written (tied to source) | "Sardines are on its list of fatty fish" (AHA list: anchovies, herring, mackerel, salmon, sardines) | same AHA page | n/a |
| 9 | FDA/EPA: sardine is a Best Choice (marker) | VERIFIED as written | "Best Choices list"; no servings figure printed (the chart's 2 to 3 servings is written for pregnancy and breastfeeding) | https://www.fda.gov/food/consumers/advice-about-eating-fish | n/a |
| 10 | Sodium under 2,300 mg a day (marker, house number) | VERIFIED as written | 2,300 mg; added "about 260 mg is roughly 11% of the day" | https://cdn.realfood.gov/DGA.pdf | 261 / 2,300 = 11.3% |
| 11 | Calcium need, women 51 and over (marker) | VERIFIED as written | 1,200 mg (women 51 to 70: 1,200; adults 71+: 1,200); "from all sources" dropped; added "roughly a quarter" | ODS Calcium consumer sheet, archive capture 2026-11-09 | 325 / 1,200 = 27% |
| 12 | Vitamin D need, adults 51 to 70 (marker) | CHANGED | "adults up to age 70 as 15 mcg" (ODS row is 19 to 70 years); added "roughly a quarter" | ODS Vitamin D consumer sheet, archive capture 2026-11-10 | 4.08 / 15 = 27% |
| 13 | Canned pink salmon calcium per 3 oz (marker) | VERIFIED as written | About 240 mg | FDC 175175 (SR Legacy CSV) | 283 x 0.85 = 240.6 mg |
| 14 | Canned pink salmon vitamin D per 3 oz (marker) | VERIFIED as written | About 12 mcg | FDC 175175 | 14.5 x 0.85 = 12.3 mcg |
| 15 | Canned pink salmon EPA plus DHA per 3 oz (marker) | VERIFIED as written | About 0.9 grams | FDC 175175 | (0.334 + 0.743) x 0.85 = 0.92 g |
| 16 | Atlantic mackerel Best Choice, king mackerel Choice to Avoid (marker) | VERIFIED as written | Both confirmed in the FDA text list | FDA Advice about Eating Fish | n/a |
| 17 | King mackerel is a "much larger fish", on the Avoid list "because of mercury" | CHANGED | "a different fish and sits on the FDA's Choices to Avoid list, the group with the highest mercury levels" (FDA: "Choice to Avoid: HIGHEST MERCURY LEVELS"). "Much larger" had no source, deleted | FDA page | n/a |
| 18 | Sauce-packed sardines (tomato or mustard) often carry more sodium than plain (unmarked, writer flag) | CHANGED | "USDA's record for sardines in tomato sauce lists about 350 mg of sodium per 3 ounces, against about 260 mg for sardines in oil." Mustard and "in water" dropped: no USDA record fetched. Note the two records are different species (Pacific vs Atlantic) | FDC 175140 and 175139 (API) | 414 x 0.85 = 352 mg; 307 x 0.85 = 261 mg |
| 19 | Most anchovies are salt-cured and run much higher in sodium (unmarked, writer flag) | CHANGED | "USDA lists five canned anchovy fillets at about 730 mg of sodium, far more than a full 3-ounce serving of sardines." "Most are salt-cured" had no source, deleted | FDC 174183 (CSV): 3,668 mg per 100 g, portion "5 anchovies" = 20 g | 3,668 x 0.20 = 734 mg vs 261 mg |
| 20 | Boneless, skinless sardines lose most of the calcium (unmarked, writer flag) | REMOVED and replaced | No USDA sardine record could be fetched for it. Replaced with: regular canned pink salmon about 240 mg per 3 oz vs about 50 mg skinless and boneless, then "check the calcium line on the label" for boneless sardines | FDC 175175 and 173724 (CSV) | 283 x 0.85 = 241; 60 x 0.85 = 51 |
| 21 | Canning makes the bones soft enough to eat | CHANGED | "In a can, those bones are soft enough to eat, and the NIH lists canned sardines and salmon with bones among the foods that contain calcium" (ODS: "Canned sardines and salmon with bones contain calcium") | ODS Calcium sheet | n/a |
| 22 | Calcium is "the main mineral in bone" (table) | CHANGED | "Almost all of your body's calcium is stored in bones and teeth" (ODS wording) | ODS Calcium sheet | n/a |
| 23 | Vitamin D helps your body absorb calcium | VERIFIED as written | ODS: "Vitamin D helps your body absorb calcium" | ODS Calcium and Vitamin D sheets | n/a |
| 24 | Fatty fish is one of the few foods that naturally has vitamin D | VERIFIED as written | ODS: "Very few foods naturally contain vitamin D"; fatty fish "among the best natural sources" | ODS Vitamin D sheet | n/a |
| 25 | Body makes very little EPA and DHA; fatty fish is the main source | CHANGED | "Your body makes only very small amounts of them, so they mostly come from food, and they're found in fish and other seafood" (ODS: converts ALA "only in very small amounts"; "DHA and EPA are found in fish and other seafood") | ODS Omega-3 sheet, archive capture 2026-11-08 | n/a |
| 26 | Same group as salmon, trout, herring, Atlantic mackerel | CHANGED | Trout dropped (not on the AHA fatty fish list): "salmon, herring and Atlantic mackerel" | AHA page; FDA (Atlantic mackerel is a Best Choice) | n/a |
| 27 | Lean fish and shrimp don't carry much omega-3 | CHANGED | "Lean white fish carries far less: USDA lists about 0.1 gram in 3 ounces of cooked cod." Shrimp dropped: USDA shrimp records disagree with each other | FDC 171956 (CSV) | (EPA + DHA) 0.158 x 0.85 = 0.13 g |
| 28 | Protein "helps you hold on to muscle as you age" (table) | REMOVED | Outcome claim with no source; cell now reads "What muscle is built from" | n/a | n/a |
| 29 | Salmon and sardines both on the lowest-mercury list | VERIFIED as written | Salmon and Sardine both "Best Choice" | FDA page | n/a |
| 30 | Anchovies: small, oily, used a fillet or two at a time | VERIFIED as written | AHA lists anchovies as fatty fish; FDA lists Anchovy as Best Choice. Usage line is "people typically", no number | AHA, FDA | n/a |
| 31 | "When I drive to Kelowna to stock my mother's kitchen" | REMOVED (detail only) | "When I stock my mother's kitchen". The place name is in no persona file; the family grocery anecdote stays (no health claim, same pattern as Sarah's in earlier guides) | .claude/agents/marcus.md | n/a |
| 32 | VERIFY-URL: AHA Fish and Omega-3 | VERIFIED as written | Kept | archive capture 2026-11-02 | n/a |
| 33 | VERIFY-URL: ODS Calcium and ODS Vitamin D (2 markers) | VERIFIED as written | Kept | archive captures 2026-11-09 and 2026-11-10 | n/a |
| 34 | VERIFY-URL: ODS Omega-3 | VERIFIED as written | Kept | archive capture 2026-11-08 | n/a |
| 35 | VERIFY-URL: DGA 2025-2030 PDF | VERIFIED as written | Kept | https://cdn.realfood.gov/DGA.pdf (200) | n/a |

House numbers: sodium under 2,300 mg (row 10) and the 3 oz cooked serving (row 7) verified. "At least 2 servings" is the house wording, but the AHA sentence fetched says "2 servings", so the post prints 2 (row 7).

## Source URL check

| URL | Result |
|---|---|
| https://fdc.nal.usda.gov/food-details/175139/nutrients (and 175140, 175175, 173724, 174183, 171956) | JavaScript app: curl gets the app shell with status 404, the record renders in a browser. Same link form the published PD guides use. 175139 and 175140 confirmed 200 through the FDC API; the other four confirmed in USDA's SR Legacy CSV (API rate-limited) |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200, lists confirmed |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 403 anti-bot; content confirmed from archive capture 2026-11-02 |
| https://ods.od.nih.gov/factsheets/Calcium-Consumer/ | 403 anti-bot; content confirmed from archive capture 2026-11-09 |
| https://ods.od.nih.gov/factsheets/VitaminD-Consumer/ | 403 anti-bot; content confirmed from archive capture 2026-11-10 |
| https://ods.od.nih.gov/factsheets/Omega3FattyAcids-Consumer/ | 403 anti-bot; content confirmed from archive capture 2026-11-08 |
| https://cdn.realfood.gov/DGA.pdf | 200, sodium sentence read from PDF text |
| https://fdc.nal.usda.gov/ (generic homepage link) | Removed from Sources, replaced by the six record links |

Every source left in the list backs at least one number or claim in the body. A live 200 could not be observed directly for heart.org and the three ODS pages (bot blocking), only through archive captures 4 to 12 days old.

## Medicine-safety and contract checklist

- Exactly one `<aside class="med-note">`; names blood thinners (warfarin), blood-pressure medicine, statins and diabetes medicine; sends the reader to her doctor or pharmacist; says medicine changes are the prescriber's decision. Pass.
- Required safety sentence present word for word exactly once, inside the box, nowhere else. Pass.
- No doctor caveats tacked on after recommendations. The only other "doctor" mention outside the box is a red-flag bullet ("the target your doctor gave you"). Pass.
- "When to Talk to Your Doctor" h2 lists red-flag signs plus an emergency line, not a second warning. Pass.
- No start/stop/change-medicine advice, no diagnosis, no cure or prevention promise. Heart and bone sections say what the food contains and what AHA, FDA and NIH say. Protein outcome claim removed (row 28). Pass.
- No drug doses, no supplement amounts (all mg, mcg and gram figures are nutrients in food, daily needs or the sodium limit). Pass.
- Never advises adding salt; sodium only as under 2,300 mg a day. Pass.
- Only Atlantic mackerel recommended; king mackerel appears only as a Choice to Avoid. Pass.
- No g/lb protein target. No invented study, quote, testimonial, client story or writer health history. Unsupported place detail removed (row 31). Pass.
- Scope: omega-3 is one paragraph with the link to /guides/fish-high-in-omega-3/. No recipes, no recipes-guide mention or link. Pass.
- Allowed tags only (a, aside, h2, h3, li, ol, p, strong, table, tbody, td, th, thead, tr, ul). Pass.
- /calculator/ link at visible word 98. Internal guide links: 2 (fish-high-in-omega-3, how-much-fish-per-week-after-60), both on the allowed list. Pass.
- No em-dashes. Title 61 chars, meta_description 144, excerpt 135. Pass.
- Fields: site pd, slug sardines-benefits, author marcus, topic_id L5, category nutrition, date = publish_date = scheduled_date = 2026-11-20, status ready, published false, no image field. Pass.
- JSON parses; no "[[" in the file. Pass.

## Validator rewording (2026-11-14, after first check)

`generate_pd_site.py --check-only` flagged "supplement dose '1,200 mg'": its dose rule fails any mg, mcg, IU or gram figure in the same sentence as "supplement", "fish oil", "capsule", "pill" or "tablet". The calcium sentence named the "NIH Office of Dietary Supplements" beside the 1,200 mg daily need. Reworded to "The NIH lists the daily calcium need for women aged 51 and over as 1,200 mg"; the full office name now appears only in the Sources list, where no figure sits. No figure or meaning changed. Every other figure in the body (table, sodium, vitamin D, omega-3, salmon, anchovies, medicine box) was run through the same rule: zero hits. The validator's own `validate_post` on the draft returns no problems.

## Open points for the editor

- FDC 175175 is titled "salmon, pink, canned, drained solids" (it does not say "with bone"). USDA keeps a separate "without skin and bones" record (173724), so the post calls 175175 "regular" canned pink salmon rather than "with the bones".
- The tomato-sauce comparison uses a Pacific sardine record against an Atlantic one, the only two sardine records USDA SR Legacy has.
- Row 28: "What muscle is built from" is general knowledge with no listed source; delete the cell text if a stricter reading is wanted.

Result: no hard safety violation found. Main corrections were sourcing the three flagged qualitative claims to USDA records, matching the AHA wording, and removing two unsourced statements.

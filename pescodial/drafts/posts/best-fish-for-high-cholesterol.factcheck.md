# Fact-check: best-fish-for-high-cholesterol (PD, P8, 2026-10-20)

Checked 2026-10-17. All sources fetched live today.

**Totals (15 claims below): verified 6, changed 7, removed 2.** Plus 1 source removed (NIH ODS, unreachable) and 3 sources added. 0 markers remain. Contract validator (`validate_pd_posts`, run in memory against the PD set) returns no errors. Visible words: 1,575 (including the Sources list). /calculator/ link at word 103.

## Claims

| # | Claim | Original | Final | Source | Outcome |
|---|---|---|---|---|---|
| 1 | AHA saturated fat limit | under 6% of calories "if you need to lower your cholesterol" | under 6% of daily calories (condition dropped; the live page states it as a general pattern target) | https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats | changed |
| 2 | Replacing saturated with unsaturated fat lowers LDL and is linked with less heart disease | as written | as written | https://doi.org/10.1161/CIR.0000000000000510 (abstract read via PubMed E-utilities, PMID 28620111) | verified |
| 3 | AHA fish servings per week | "at least 2" | "2 servings ... particularly fatty fish" (live page: "2 servings of fish (particularly fatty fish) per week") | https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | changed |
| 4 | AHA serving size | 3 oz cooked, "deck of cards" | 3 oz cooked (about 85 g, or roughly 3/4 cup flaked), per live page; deck-of-cards comparison dropped as not in source | same AHA page | changed |
| 5 | FDA/EPA Best Choices: adults can eat 2 to 3 servings a week | 2 to 3 servings for adults | removed; the FDA chart gives 2 to 3 servings for pregnancy/breastfeeding only, not adults in general. Sentence now just says the fish are on the lowest-mercury list | https://www.fda.gov/food/consumers/advice-about-eating-fish | removed |
| 6 | All table species are on Best Choices (salmon, sardine, Atlantic mackerel, freshwater trout, herring, cod, haddock, pollock, canned light tuna) | as written | as written | FDA/EPA page | verified |
| 7 | Farmed Atlantic salmon, cooked, saturated fat per 3 oz | 2.6 g | about 2 g (2.4 g/100 g x 0.85 = 2.04 g) | https://fdc.nal.usda.gov/food-details/175168/nutrients | changed |
| 8 | Atlantic cod, cooked, saturated fat per 3 oz | 0.1 g | 0.1 g (0.168 g/100 g x 0.85 = 0.14 g) | https://fdc.nal.usda.gov/food-details/171956/nutrients | verified |
| 9 | 80% lean ground beef, cooked, saturated fat per 3 oz | about 5 g; cited FDC 174036, which is RAW beef | about 5.5 g (6.55 g/100 g x 0.85 = 5.57 g), FDC 171799 crumbles, pan-browned | https://fdc.nal.usda.gov/food-details/171799/nutrients | changed |
| 10 | Wild sockeye leaner than farmed | no source | kept; sockeye cooked 5.6 g fat/100 g vs farmed Atlantic cooked 12.4 g; FDC 173692 added to Sources | https://fdc.nal.usda.gov/food-details/173692/nutrients | verified |
| 11 | AHA 2018 advisory: 1 to 2 seafood meals a week, especially replacing less healthy foods; omega-3 lowers triglycerides; shrimp/cod low in omega-3 | as written | as written ("on blood fats" added for precision). Also now carries the omega-3 sources claim formerly sourced to NIH ODS | https://doi.org/10.1161/CIR.0000000000000574 (abstract via PMID 29773586; full text PMC6903778) | verified |
| 12 | Smoked salmon sodium vs fresh | "several times"; cited FDC 175170, which is CRAYFISH | "more than ten times": smoked chinook about 570 mg per 3 oz (672 mg/100 g) vs cooked chinook about 50 mg (60 mg/100 g) | https://fdc.nal.usda.gov/food-details/173687/nutrients , https://fdc.nal.usda.gov/food-details/171999/nutrients | changed |
| 13 | Sodium under 2,300 mg/day | 2,300 mg | 2,300 mg ("Less than 2,300 milligrams per day") | DGA 2020-2025 PDF | verified |
| 14 | Good Choices (albacore): limit to 1 serving a week | 1 serving a week | removed; the FDA's "1 serving from Good Choices" is pregnancy/breastfeeding guidance. Rewritten: albacore is in the middle Good Choices group, so canned light tuna is the lower-mercury everyday pick | FDA/EPA page | removed |
| 15 | Cook fish to 145F | FDA, cited foodsafety.gov | "The FDA advises cooking most seafood to 145F" (FDA: "Most seafood should be cooked to an internal temperature of 145F") | https://www.fda.gov/food/buy-store-serve-safe-food/selecting-and-serving-fresh-and-frozen-seafood-safely | changed (re-sourced from foodsafety.gov, 403, to FDA) |

Totals: verified = #2, #6, #8, #10, #11, #13. Changed = #1, #3, #4, #7, #9, #12, #15 (#15 number kept, source changed). Removed = #5, #14.

## URL check

| URL | Live result | Action |
|---|---|---|
| heart.org saturated-fats | 403 to plain curl/WebFetch (bot block); full page rendered via browser-engine reader, content confirmed ("less than 6% of total calories") | kept |
| heart.org fish-and-omega-3-fatty-acids | same bot block; rendered page confirmed ("2 servings of fish (particularly fatty fish) per week", "3 ounces cooked, or about 3/4 cup") | kept, marker removed |
| doi.org/10.1161/CIR.0000000000000510 | 302 to ahajournals.org (correct article); publisher blocks bots (403); metadata and abstract confirmed via NCBI E-utilities | kept, marker removed |
| doi.org/10.1161/CIR.0000000000000574 | 302 to ahajournals.org (correct article); same; full text read via PMC | kept, marker removed |
| fda.gov advice-about-eating-fish | 200, correct content | kept |
| fdc.nal.usda.gov food-details 175168, 171956 | SPA shell (server sends 404 status for deep routes, page renders client-side); ids and values confirmed via FDC API and FDC portal-data endpoint | kept |
| fdc food-details 174036 | wrong food (raw beef) | replaced with 171799 (cooked, pan-browned) |
| fdc food-details 175170 | wrong food (crayfish) | replaced with 173687 (chinook, smoked) |
| fdc food-details 171999, 173692 | confirmed via FDC data | added |
| dietaryguidelines.gov 2020-2025 PDF | 200, PDF text confirmed | kept, marker removed |
| ods.od.nih.gov Omega3FattyAcids-HealthProfessional | 403 (Cloudflare challenge), could not confirm | removed; claim now sourced to Rimm 2018 |
| foodsafety.gov safe-minimum-internal-temperatures | 403 | replaced with FDA seafood safety page (200) |
| fda.gov selecting-and-serving-fresh-and-frozen-seafood-safely | 200, "145F" confirmed | added |
| fda.gov food-allergies | 200, fish listed as major allergen | kept, label added |

## Medicine-safety review

- Exactly one `<aside class="med-note">`: names statins, blood-pressure medicine, blood thinners such as warfarin, diabetes medicine; says food works alongside a statin, never instead; sends her to doctor or pharmacist before changing anything. PASS.
- No supplement doses (no mg/IU/g of fish oil or omega-3). PASS.
- No clinical judgement; no claim that high LDL is safe; no personal heart history for the writer; no invented stats or quotes. PASS.
- Choices to Avoid species appear only in the "skip" list. PASS.
- FDA servings guidance that applies to pregnancy/breastfeeding had been presented as adult guidance (2 to 3 Best Choices, 1 Good Choices per week). FIXED (both removed).
- Shrimp: one line linking /guides/is-shrimp-bad-for-cholesterol/. Omega-3: one paragraph. Internal guide links: 2, both allowed. /calculator/ in first 300 words. "When to Talk to Your Doctor" and "Sources" h2 present. PASS.
- No em-dashes in content or meta fields. PASS.
- Fields: site pd, title 63 chars, meta 145, excerpt 144, date = publish_date = scheduled_date = 2026-10-20, status ready, published false, category health, topic_id P8. PASS.

## Flag for the editor

House claims (PD, Fish frequency) says "At least 2 servings"; the live AHA page now says "2 servings ... per week" without "at least". Post follows the live page.

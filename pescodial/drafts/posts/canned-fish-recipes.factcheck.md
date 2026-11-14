# Fact-check and medicine-safety log: canned-fish-recipes

Checked 2026-11-14. All sources fetched live that day (curl, USDA FDC API with DEMO_KEY, NCBI E-utilities, WebFetch, WebSearch).

**Totals (16 markers: 13 VERIFY + 3 VERIFY-URL, plus 6 unmarked claims = 22 rows): 12 verified as written or filled from source, 7 changed, 3 removed.** Zero "[[" left in the file. Final visible word count: 1,545 (band 900-1,600).

Fetch notes:
- USDA FDC API answered every lookup (no rate limit). All records are SR Legacy. Per-serving figures = per-100 g value x 0.85 (3 oz = 85 g).
- heart.org returns 403 to curl and WebFetch (anti-bot) on every path tried. The page text was read from the Internet Archive capture of the same URL dated 2026-11-02 (web.archive.org/web/20261102081033/...), and an AHA newsroom page that does load (newsroom.heart.org, 200) repeats the advice.
- ods.od.nih.gov returns 403 to curl and WebFetch (anti-bot, HTML and PDF). The page text was read from the Internet Archive capture dated 2026-11-08 (web.archive.org/web/20261108165415/...), and the warfarin point was cross-checked on MedlinePlus (200).
- FDC record pages (fdc.nal.usda.gov/food-details/ID/nutrients) are a JavaScript app: curl gets the app shell ("FDC is loading") with a 404 status code, and the record renders in a browser. This is the same link form the published PD guides already use. Record contents were confirmed through the FDC API for each ID.
- cdn.realfood.gov/DGA.pdf: 200, PDF text read today.

## Marker table

| # | Claim in draft | Verdict | Final wording / figure | Source fetched | Arithmetic |
|---|---|---|---|---|---|
| 1 | Sardines and salmon are both on the FDA/EPA Best Choices list | VERIFIED as written | Unchanged | https://www.fda.gov/food/consumers/advice-about-eating-fish (text list: "Salmon Best Choice", "Sardine Best Choice") | n/a |
| 2 | AHA: at least 2 servings of fish a week, fatty fish favoured, serving 3 oz cooked | CHANGED | "recommends 2 servings of fish a week, favouring fatty fish, with a serving being 3 ounces cooked" (AHA: "recommends eating 2 servings of fish (particularly fatty fish) per week. A serving is 3 ounces cooked, or about 3/4 cup, of flaked fish.") "At least" dropped to match the sentence | heart.org Fish and Omega-3 page via archive capture 2026-11-02; newsroom.heart.org release ("two servings (3-4 ounces cooked) of fish per week") | n/a |
| 3 | A 3.75 oz can of sardines, drained, is close to one 3 oz serving | CHANGED | "holds about 3 1/4 ounces of fish, a little more than one 3-ounce serving" | FDC 175139, portion "1 can (3.75 oz)" = 92 g drained solids | 92 / 28.35 = 3.25 oz |
| 4 | Sodium, canned sardines in oil, drained, per 3 oz | VERIFIED (figure filled) | "about 260 mg" | FDC 175139: 307 mg per 100 g | 307 x 0.85 = 261 |
| 5 | Sodium, regular canned pink salmon, per 3 oz | VERIFIED (figure filled) | "around 325 mg" | FDC 175175 (drained solids): 381 mg per 100 g | 381 x 0.85 = 324 |
| 6 | Sodium, no-salt-added canned pink salmon, per 3 oz | VERIFIED (figure filled) | "around 65 mg". Note: the only USDA no-salt pink salmon record is "solids with bone and liquid", not drained. The sentence does not say drained for salmon | FDC 174225: 75 mg per 100 g | 75 x 0.85 = 64 |
| 7 | Dietary Guidelines: under 2,300 mg sodium a day | VERIFIED as written | Unchanged ("The general population, ages 14 and above, should consume less than 2,300 mg per day of sodium") | https://cdn.realfood.gov/DGA.pdf | n/a |
| 8 | Rinsing canned fish washes off some of the salt | REMOVED | Bullet now reads "Drain the can well before you start." The one primary source found (PMID 6833685, 1983) tested canned tuna only, with a 3-minute rinse, not sardines or salmon, and it also halved calcium | NCBI E-utilities abstract for PMID 6833685 | n/a |
| 9 | Parsley and leafy greens carry vitamin K, which matters on warfarin | VERIFIED as written | Unchanged | ODS Vitamin K consumer sheet (green leafy vegetables; "If you take warfarin, make sure that the amount of vitamin K you consume from food and supplements is about the same every day"); FDC 170416 fresh parsley 1,640 mcg per 100 g; FDC 169387 arugula 109 mcg per 100 g; MedlinePlus warfarin page | No figure printed |
| 10 | Canned salmon with bones has more calcium than without | VERIFIED as written | Unchanged, no number printed | FDC 175175 (drained solids, with bone) 283 mg per 100 g vs FDC 173724 (without skin and bones) 60 mg per 100 g | 283 / 60 = 4.7x |
| 11 | Mild allergy signs: mouth itching or tingling, rash, cramps, vomiting | CHANGED | Added "Hives" and "swollen lips" to this bullet. FDA describes hives and lip swelling as mild symptoms; the draft had them in the emergency line | https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies | n/a |
| 12 | Emergency signs: swelling of lips, tongue or throat, hives, trouble breathing | CHANGED | "Swelling of the tongue or throat, trouble breathing, or feeling faint after eating fish is an emergency." (FDA list: tongue swelling, swelling of the throat, difficulty breathing, dizziness or lightheadedness, loss of consciousness) | Same FDA page | n/a |
| 13 | Sources: add FDC record numbers | CHANGED | Five record links added: 175139, 175175, 174225, 173724, 170416. Bare FDC homepage link dropped | FDC API, each ID | n/a |
| 14 | VERIFY-URL: AHA Fish and Omega-3 page | VERIFIED | Kept. Live site 403 to bots; content confirmed from the 2026-11-02 archive capture | See fetch notes | n/a |
| 15 | VERIFY-URL: NIH ODS Vitamin K consumer sheet | VERIFIED | Kept. Live site 403 to bots; content confirmed from the 2026-11-08 archive capture | See fetch notes | n/a |
| 16 | VERIFY-URL: FDA Food Allergies | CHANGED | Old path redirects (200). Link updated to the final URL; label now "signs of an allergic reaction" (the page is not fish-specific) | https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies | n/a |

## Unmarked claims checked

| # | Claim | Verdict | Final wording | Source / reasoning |
|---|---|---|---|---|
| 17 | Canned fish "keeps for years" | REMOVED | "it keeps in the pantry" | No source in the post for a shelf-life figure |
| 18 | Canned fish "costs far less than the fresh counter" | CHANGED | "it usually costs less than the fresh counter" | No price source; softened |
| 19 | Sardines and salmon are fatty fish | VERIFIED as written | Unchanged | AHA page: "Fatty fish, such as anchovies, herring, mackerel, salmon, sardines..." |
| 20 | A tall 14.75 oz can of salmon feeds three or four | VERIFIED as written | Unchanged | FDC 175175 portion "1 can drained solids (total)" = 315 g; 315 / 85 = 3.7 servings of 3 oz |
| 21 | Capers, olives, pickles, mustard, crackers and bread bring their own sodium | VERIFIED as written | Unchanged, no number printed | Spot check FDC 172238 capers, canned: 2,350 mg per 100 g |
| 22 | Med box: "Check with them before you change anything" (a second doctor caveat next to the required line) | REMOVED | Folded into the statin sentence: "If you take a statin, ask your doctor or pharmacist before you change how you eat." | Content line: one safety line per page |

Not changed, judgement calls: "A 5-ounce can of salmon is a generous serving for one" (kitchen guidance, no source needed); "Most take about ten minutes"; patty cook time; "I cook for one most nights" (a writer detail with no health claim).

## Source URL check

| URL | Result |
|---|---|
| https://fdc.nal.usda.gov/food-details/175139/nutrients (and 175175, 174225, 173724, 170416) | App shell returned to curl with status 404, renders in a browser; each record confirmed 200 through api.nal.usda.gov/fdc/v1/food/ID |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200, Best Choices list confirmed |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 403 anti-bot; content confirmed from archive capture 2026-11-02 |
| https://cdn.realfood.gov/DGA.pdf | 200, sodium sentence read from PDF text |
| https://ods.od.nih.gov/factsheets/VitaminK-Consumer/ | 403 anti-bot; content confirmed from archive capture 2026-11-08 |
| https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/food-allergies | 200, symptom list confirmed |
| https://fdc.nal.usda.gov/ (homepage) | Removed, replaced by the record links |

Every source left in the list backs a number or fact in the post. No unused sources remain.

Internal links: /calculator/ (word 112), /guides/fish-high-in-omega-3/ and /guides/is-canned-tuna-healthy/ (2 guide links, both on the allowed list). "related" lists only allowed slugs.

## Medicine-safety checklist

- Exactly one `<aside class="med-note">`; names blood-pressure medicine, blood thinners (warfarin), diabetes medicine and statins; sends the reader to her doctor or pharmacist. Pass.
- Required safety sentence present word for word exactly once, inside the box, nowhere else. Pass.
- One extra caveat in the box removed (row 22). No doctor caveats after individual recipes or recommendations. Pass.
- No supplement amounts. The only mg figures are sodium in food. Pass.
- No start, stop or change-medicine advice, no diagnosis, no cure promise, no drug doses, no advice to skip care. Pass.
- Sodium only as under 2,300 mg a day; the page never tells the reader to add salt (pasta water is unsalted, no recipe adds salt). Pass.
- "When to Talk to Your Doctor" lists red-flag signs plus an emergency line, not a second warning. Emergency line corrected to FDA's severe signs (rows 11 and 12). Pass.
- Only Best Choices fish recommended (sardines, salmon; canned tuna named once as a swap, linked to its own guide). Nothing from Choices to Avoid. Pass.
- Scope: recipes only. No sardine benefits section, no tuna or mercury verdict, no weekly meal plan. Pass.
- No invented studies, quotes, testimonials, client stories or heart history for Sarah. Pass.
- Contract: tags used are a, aside, h2, h3, li, p, strong, ul (all allowed). No em-dashes. Title 57, meta 156, excerpt 150 chars. Fields: pd, canned-fish-recipes, sarah, P13, meal-plan, 2026-11-17 x3, ready, published false, no image field. JSON parses. Pass.

Result: no hard safety violation found. Main corrections: the sardine can weight (3.25 oz, not 3), hives and lip swelling moved out of the emergency line to match FDA, and the unsourced rinsing claim removed.

## Open items for the editor

- heart.org and ods.od.nih.gov block automated fetches, so their live 200 could not be observed directly; both were confirmed from archive captures less than two weeks old.
- FDC record links answer curl with a 404 status because the page is a JavaScript app. Same link form as published PD guides.
- The no-salt salmon figure (65 mg) comes from a record that includes the can liquid; USDA has no drained no-salt pink salmon record.

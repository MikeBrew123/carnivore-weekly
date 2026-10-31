# Fact-check and medicine-safety log: is-canned-tuna-healthy

Checked 2026-10-31. All sources fetched live that day (curl, WebFetch, WebSearch, USDA FDC API and the official FDC SR Legacy CSV download).

**Totals (26 markers: 22 VERIFY + 4 VERIFY-URL): 17 verified as written (13 VERIFY + 4 URLs), 8 changed, 1 removed.** Zero "[[" left in the file. Final visible word count: 1,549 (band 900-1,600).

Fetch notes:
- USDA FDC API (DEMO_KEY) answered the first 3 lookups, then returned OVER_RATE_LIMIT (429). The remaining values came from USDA's official SR Legacy CSV bulk file (`fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip`), which matched the API exactly for the 3 records fetched both ways. All per-serving figures = per-100 g value x 0.85 (3 oz = 85 g).
- ods.od.nih.gov returns 403 to curl and WebFetch (anti-bot, HTML and PDF). Content confirmed via WebSearch snippets of the live pages (B12 adults 2.4 mcg; many older adults lack the stomach acid to absorb food B12; selenium adults 55 mcg).
- heart.org (403) was dropped from Sources: no AHA figure is used in the final body.
- dietaryguidelines.gov homepage links the current edition at cdn.realfood.gov/DGA.pdf. The PDF text, read today, says: "The general population, ages 14 and above, should consume less than 2,300 mg per day of sodium" (2025-2030 edition).

## Marker table

| # | Claim in draft | Result | Final text / source |
|---|---|---|---|
| 1 | ~20 g protein per 3 oz light tuna in water | Changed | 16.5 g -> "about 17 grams" (FDC 173709, regular). Draft figure matched the no-salt record 171986 (21.7 g) |
| 2 | ~100 kcal per 3 oz | Changed | 73 kcal -> "roughly 75 calories" (FDC 173709) |
| 3 | ~all of a day's B12 | Changed | 2.17 mcg = ~90% of 2.4 mcg (FDC 173709; NIH ODS RDA) |
| 4 | B12 absorbed less well after 50 | Changed (reworded to source) | "many older adults make less stomach acid and absorb less of the B12 in food" (NIH ODS) |
| 5 | Selenium, more than a day's worth | Verified | 60.0 mcg vs 55 mcg RDA (FDC 173709; NIH ODS); numbers added |
| 6 | Light tuna ~0.2 g EPA+DHA | Verified | 0.19 g (FDC 173709) |
| 7 | Albacore ~0.7 g | Verified | 0.73 g, albacore in water (FDC 175158) |
| 8 | Sardines 0.8-1.0 g | Changed | 0.83 g -> "around 0.8 grams" (FDC 175139, Atlantic, in oil, drained) |
| 9 | Pink salmon ~0.7 g or more | Changed | 0.92 g -> "about 0.9 grams" (FDC 175175, drained) |
| 10 | Canned light 0.126 ppm | Verified | FDA 1990-2012 table, mean 0.126, n=545 |
| 11 | Canned albacore 0.350 ppm | Verified | FDA table, mean 0.350, n=451 |
| 12 | Yellowfin 0.354 ppm | Verified | FDA table, fresh/frozen yellowfin mean 0.354, n=231 |
| 13 | Bigeye 0.689 ppm | Verified | FDA table, fresh/frozen bigeye mean 0.689, n=21 |
| 14 | Albacore ~3x light | Verified | 0.350 / 0.126 = 2.8, "close to three times" (computed from FDA table) |
| 15 | Good Choices 1 serving/week | Verified | FDA/EPA chart: "1 serving a week" from Good Choices (chart audience stated in How Often section) |
| 16 | Canned light mostly skipjack, may contain yellowfin | Removed | FDA page says only "Tuna, canned light (includes skipjack)"; yellowfin claim not found on any FDA page, deleted. Table "Mostly skipjack" -> "Skipjack" |
| 17 | Light tuna in water 200-300 mg sodium | Changed | 210 mg (FDC 173709); added albacore in water 320 mg (FDC 175158); dropped unsourced "branded entries" range |
| 18 | No-salt under 50 mg | Verified | 42.5 mg -> "around 40 mg" (FDC 171986). "Very low sodium" wording dropped (no source record) |
| 19 | DGA under 2,300 mg/day | Verified | DGA 2025-2030 PDF, ages 14+ |
| 20 | Oil-packed light ~170 kcal | Verified | 168 kcal (FDC 173708); comparison updated to ~75 for water |
| 21 | FDA: BPA safe at food levels | Verified | FDA BPA page: "BPA is safe at the current levels occurring in foods" (content current as of 04/20/2023) |
| 22 | Best Choices 2-3 servings/week "for adults" | Changed | FDA chart is written for pregnancy/breastfeeding and children 1-11; post now says so, gives 2-3 Best / 1 Good, and adds FDA-cited DGA "at least 8 ounces of seafood a week" for adults on 2,000 kcal |

VERIFY-URL markers (4, all verified and kept): FDA mercury table (200, content confirmed), ODS B12 (403, confirmed via search), ODS selenium (403, confirmed via search), FDA BPA (200, content confirmed). Separately, the unmarked AHA source line was dropped as unused.

Unmarked items also checked and fixed: "Bigger, longer-lived tunas build up more mercury" (unsourced generalization, removed; the FDA table carries the point); "Many tuna brands now sell BPA-free cans" (unsourced, reworded to a neutral tip); "Normal amounts of canned light tuna aren't a mercury worry for most people" (reworded to the FDA list fact); BPA framing tied to FDA's own sentences on can coatings and migration; "no carbohydrate" confirmed (FDC 173709 carbohydrate 0 g).

## Source URL check

| URL | Result |
|---|---|
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200, content confirmed |
| https://www.fda.gov/food/environmental-contaminants-food/mercury-levels-commercial-fish-and-shellfish-1990-2012 | 200, tuna rows confirmed |
| https://fdc.nal.usda.gov/ | 200 |
| https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/ | 403 anti-bot; page and figures confirmed via WebSearch |
| https://ods.od.nih.gov/factsheets/Selenium-Consumer/ | 403 anti-bot; page and 55 mcg confirmed via WebSearch |
| https://cdn.realfood.gov/DGA.pdf | 200, sodium sentence read from PDF text (replaces dietaryguidelines.gov homepage link) |
| https://www.fda.gov/food/food-packaging-other-substances-come-contact-food-information-consumers/bisphenol-bpa-use-food-contact-application | 200, content confirmed |
| heart.org Fish and Omega-3 page | Removed from Sources (not used) |

Internal links: /calculator/ (word ~107), /guides/fish-high-in-omega-3/ and /guides/how-much-fish-per-week-after-60/ (2 guide links, both published before 2026-11-06). No link to /guides/low-mercury-fish/. "related" lists only approved slugs.

## Medicine-safety checklist

- Exactly one `<aside class="med-note">`; names blood-pressure medicine, blood thinners (warfarin), diabetes medicine and statins; sends reader to doctor or pharmacist. Pass.
- Required safety sentence present verbatim exactly once, inside the box, nowhere else. Pass.
- No repeated doctor caveats after recommendations. Pass.
- No supplement doses (only mg figures are sodium; mcg figures are B12 and selenium in food). Pass.
- No start/stop/change-medicine advice, no diagnosis, no cure promise, no clinical judgement. Pass.
- Sodium only as under 2,300 mg/day; never advises adding salt. Pass.
- "When to Talk to Your Doctor" lists red-flag signs plus an emergency line, not a second warning. Pass.
- FDA tuna groups correct (canned light/skipjack Best; albacore and yellowfin Good; bigeye Avoid). Nothing from Choices to Avoid recommended. Pass.
- Pregnancy/children: only described as the chart's audience, linked to FDA. Pass.
- No invented stats, studies, quotes or health history for Sarah. Mom grocery anecdote kept: no health claim. Pass.
- No em-dashes. Title 57, meta 156, excerpt 152 chars. Fields set (pd, sarah, 2026-11-06 x3, ready, published false, nutrition, L2). Pass.

Result: no hard safety violation. Main corrections were nutrient values that matched the no-salt USDA record rather than regular canned light tuna, and an unsupported yellowfin claim.

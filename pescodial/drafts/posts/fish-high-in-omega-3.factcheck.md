# Fact-check and medicine-safety log: fish-high-in-omega-3

Checked 2026-10-17. All sources fetched live that day.

**Totals: verified 14, changed 5, removed 0.** All 13 [[VERIFY]] and 4 [[VERIFY-URL]] markers resolved; zero "[[" left. Visible words: 1,433. Contract validator (`generate_pd_site.py --check-only`, run on a temp copy of blog_posts.json with this draft appended) passes.

Fetch notes: ODS, heart.org, ahajournals and PubMed block curl (Cloudflare/reCAPTCHA). ODS and AHA text was read through a rendering proxy and a headless browser; Rimm 2018 abstract through NCBI E-utilities. USDA values came from the FDC portal-data JSON (DEMO_KEY API was rate limited). FDC `food-details` pages return HTTP 404 to plain fetchers but render the correct food and EPA/DHA rows in a browser (confirmed headless for all 11 IDs below), same as the shipped shrimp guide links.

USDA values are per 100 g; per 3 oz = x 0.85.

## Claims

| # | Claim | Original | Final | Source | Outcome |
|---|---|---|---|---|---|
| 1 | Body makes only small amounts of EPA/DHA from ALA | as written | unchanged (no number) | ODS fact sheet: conversion "very limited, with reported rates of less than 15%" | verified |
| 2 | Atlantic salmon, farmed, cooked | about 1.8 g | about 1.8 g | ODS Table 2: DHA 1.24 + EPA 0.59 = 1.83; USDA FDC 175168: 1.83 | verified |
| 3 | Atlantic salmon, wild, cooked | about 1.6 g | about 1.6 g | ODS Table 2: 1.22 + 0.35 = 1.57; USDA 171998: 1.57 | verified |
| 4 | Sardines, canned in tomato sauce | about 1.2 g | about 1.2 g | ODS Table 2: 0.74 + 0.45 = 1.19; USDA 175140: 1.19 | verified |
| 5 | Atlantic mackerel, cooked | about 1.0 g | about 1.0 g | ODS Table 2: 0.59 + 0.43 = 1.02; USDA 175120: 1.02 | verified |
| 6 | Herring | "Herring, about 0.9 g" (marker said pickled) | "Atlantic herring, about 1.7 g", moved to row 2, Top tier | ODS Table 2 lists herring Atlantic cooked: 0.94 + 0.77 = 1.71. Pickled (USDA 175118) is 1.18, so 0.9 was wrong either way | changed |
| 7 | Rainbow trout (wild, cooked) | about 0.8 g | about 0.8 g | ODS Table 2: 0.44 + 0.40 = 0.84; USDA 175155: 0.84 | verified |
| 8 | Sockeye salmon, cooked | about 0.7 g | about 0.7 g | USDA FDC 173692: (0.299 + 0.560) x 0.85 = 0.73 | verified |
| 9 | Canned light tuna in water | about 0.2 g | about 0.2 g | ODS Table 2: 0.17 + 0.02 = 0.19; USDA 173709: 0.19 | verified |
| 10 | Cod, tilapia | "Cod, tilapia, shrimp: well under 0.3 g" | "Cod, tilapia: about 0.1 g" | ODS Table 2: cod (Pacific) 0.14, tilapia 0.11; USDA 171956 cod Atlantic 0.13, 175177 tilapia 0.11 | changed |
| 11 | Shrimp | (in row above) | own row: "a few hundredths of a gram" | USDA FDC 175180: (0.015 + 0.015) x 0.85 = 0.03 g. Matches the shipped shrimp guide wording | changed |
| 12 | AHA: fish at least 2 times a week, favouring fatty fish | as written | unchanged | heart.org page (last reviewed Aug 23, 2024): "Eat fish at least twice a week ... 2 servings of fish (particularly fatty fish) per week" | verified |
| 13 | AHA serving size | "3 oz cooked" (marker asked 3 vs 3.5 oz) | "3 oz cooked, or about 3/4 cup of flaked fish" | heart.org live page now says "A serving is 3 ounces cooked, or about 3/4 cup, of flaked fish" (the 3.5 oz wording is gone). Agrees with house line | changed (added 3/4 cup) |
| 14 | Table intro serving "3 oz cooked" | as written | unchanged | heart.org, as above | verified |
| 15 | Rimm 2018 AHA advisory: 1 to 2 seafood meals a week, especially replacing less healthy foods | as written | unchanged | Abstract: "1 to 2 seafood meals per week ... especially when seafood replaces the intake of less healthy foods" (Circulation 2018;138:e35-e47) | verified |
| 16 | Sodium under 2,300 mg a day | cited DGA 2020-2025 | number unchanged; source switched to the current DGA 2025-2030 | DGA 2025-2030 p.5: "ages 14 and above, should consume less than 2,300 mg per day of sodium". dietaryguidelines.gov now points to this edition | verified |
| 17 | All table fish are FDA/EPA Best Choices | "All of the oily fish in the table above sit on..." | "Every fish in the table above sits on..." | FDA chart: salmon, herring, sardine, Atlantic mackerel, trout (freshwater), canned light tuna, cod, tilapia, shrimp all "Best Choice" | changed (wording widened to match the table) |
| 18 | Choices to Avoid list (king mackerel, marlin, orange roughy, shark, swordfish, bigeye tuna, Gulf of Mexico tilefish) | as written | unchanged | FDA chart, all seven "Choice to Avoid: HIGHEST MERCURY LEVELS" | verified |
| 19 | Atlantic mackerel is Best Choice, king mackerel is not | as written | unchanged | FDA chart | verified |

## Note for the shipped shrimp guide (not edited)
`is-shrimp-bad-for-cholesterol` says cooked shrimp has "only a few hundredths of a gram of EPA and DHA" per 3 oz, citing USDA FDC 175180. That is correct for 175180 (0.03 g). However, NIH ODS Table 2 lists "Shrimp, cooked, 3 ounces" at DHA 0.12 + EPA 0.12 = 0.24 g, which matches a different USDA entry (171971, shrimp mixed species, moist heat: 0.235 g). Both are live primary sources. The new guide follows 175180 for consistency and cites it; the ODS fact sheet is also in its Sources (for other fish). Worth a future review to decide which shrimp entry PD uses house-wide. Either way shrimp stays "not a meaningful source" (under a quarter of a gram).

## URL check

| URL | Result |
|---|---|
| https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/ | 200 in browser, Table 2 and ALA text present (curl gets Cloudflare 403) |
| https://fdc.nal.usda.gov/food-details/175168/nutrients | Renders "Fish, salmon, Atlantic, farmed, cooked, dry heat" with EPA/DHA (server status 404, SPA) |
| https://fdc.nal.usda.gov/food-details/173692/nutrients | Renders "Fish, salmon, sockeye, cooked, dry heat"; replaces the generic fdc.nal.usda.gov link |
| https://fdc.nal.usda.gov/food-details/175180/nutrients | Renders "Crustaceans, shrimp, cooked" |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 200 in browser, title "Fish and Omega-3 Fatty Acids", serving text present |
| https://doi.org/10.1161/CIR.0000000000000574 | 302 to ahajournals; 200 in browser with the Rimm 2018 advisory |
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200, full Best/Good/Avoid chart |
| https://cdn.realfood.gov/DGA.pdf | 200, PDF, DGA 2025-2030, sodium line on p.5. Replaces the superseded 2020-2025 PDF |
| Removed: https://fdc.nal.usda.gov/ (generic) | replaced by 173692 page; cod and tilapia now trace to ODS Table 2 |
| Removed: dietaryguidelines.gov 2020-2025 PDF | still loads, but superseded edition |

## Medicine-safety review
- Exactly one `<aside class="med-note">`: names blood thinners such as warfarin (pharmacist before fish oil or any omega-3 supplement), statins, blood-pressure medicine, diabetes medicine; sends her to doctor or pharmacist before changing anything. Pass.
- Supplement doses: none. Only gram figures are food EPA+DHA per 3 oz fish serving, plus the 2,300 mg sodium line. Pass.
- Clinical judgement: none. Triglycerides, heart history and fish oil questions route to the doctor. Pass.
- Species: every fish recommended or tabled is an FDA/EPA Best Choice; Avoid list named only as fish to avoid. Pass.
- Writer heart history, invented stats or quotes: none ("Here's what I've seen work" is advice framing, no health history). Pass.
- Internal links: 2, /guides/is-shrimp-bad-for-cholesterol/ (Sarah's) and /guides/7-day-pescatarian-meal-plan-weight-loss-after-50/ credited to Marcus (correct per blog_posts.json and the draft). Both published before 2026-10-23. Pass.
- /calculator/ link at word 133. "When to Talk to Your Doctor" and "Sources" h2s present. Pass.
- No em-dashes in content or any field. Fields checked: site pd, slug, title 55 chars, meta 157, excerpt 148, author sarah, dates 2026-10-23 x3, status ready, published false, category nutrition, topic_id P4, related = the two published slugs. Pass.

No safety issue needed fixing; the draft's medicine box was already compliant.

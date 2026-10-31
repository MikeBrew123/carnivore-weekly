# Fact-check and medicine-safety log: low-mercury-fish

Checked 2026-10-31. All sources fetched live that day (curl, WebFetch, WebSearch).

**Totals: 28 markers resolved. 24 verified as written, 2 changed, 2 removed/replaced (1 claim rewritten to what the source says, 1 dead URL replaced).** Plus 9 unmarked claims corrected or cut in the full-post pass (listed below). Zero "[[" left in the file. Final visible word count: 1,545.

Fetch notes: FDA mercury table parsed straight from the live HTML (200). The FDA advice page carries serving counts only for pregnancy/childhood; the general-adult wording ("2 to 3 servings ... 8 to 12 ounces", "everyone can follow this advice") comes from the FDA Q&A page, fetched live. The draft's EPA Q&A URL is a 404; the cooking claim is now sourced to the FDA Q&A page. DGA PDF loads (200) but is not text-extractable here; the under-2,300 mg figure was confirmed via WebSearch, as in the sibling post's log.

## Marker table

| # | Claim | Result | Source |
|---|---|---|---|
| 1 | 2 to 3 servings a week from Best Choices | Verified; added "about 8 to 12 ounces" and "which the FDA says anyone can follow" | FDA Q&A |
| 2 | Cooking/cleaning doesn't remove mercury; "binds to protein in the muscle, not fat or skin"; "freezing or canning" | Changed: rewrote to FDA wording (mercury is found throughout the flesh, so cleaning, trimming or cooking won't reduce it). Dropped the protein/fat mechanism and the freezing/canning part (not in a fetched source) | FDA Q&A |
| 3-19 | Table ppm: scallop 0.003, shrimp 0.009, oyster 0.012, sardine 0.013, tilapia 0.013, anchovies 0.016, salmon fresh/frozen 0.022, catfish 0.024, pollock 0.031, Atlantic mackerel 0.050, haddock 0.055, flatfish 0.056, trout freshwater 0.071, herring 0.078, cod 0.111, canned light tuna 0.126, halibut 0.241 | Verified as written (17) | FDA Mercury Levels 1990-2012 |
| 20 | Salmon, canned 0.008 | **Changed to 0.014** and moved below tilapia to keep the table in order | FDA Mercury Levels 1990-2012 |
| 21 | Albacore canned 0.350 | Verified | FDA table |
| 22 | Swordfish 0.995 | Verified | FDA table |
| 23 | Swordfish more than 70x sardines | Verified (0.995 / 0.013 = 76.5) | FDA table |
| 24 | Chilean bass about 0.354 | Verified | FDA table |
| 25 | Albacore roughly 3x light tuna | Verified (FDA: "typically contains three times more mercury"; table ratio 2.8). Worded "about three times" | FDA Q&A, FDA table |
| 26 | Sodium under 2,300 mg/day | Verified | DGA 2025-2030 |
| 27 | VERIFY-URL: FDA Mercury Levels page | Verified, 200 | n/a |
| 28 | VERIFY-URL: EPA Q&A page | Removed: 404. Replaced with the FDA Q&A page | n/a |

## Unmarked claims fixed in the full-post pass

- "Builds up as it moves up the food chain": rewritten to EPA wording (depends on diet, lifespan, place in food chain); added EPA "How People Are Exposed" source.
- "FDA has tested ... for decades": changed to "from 1990 to 2012" (dataset title).
- "Scallops through cod: differences don't matter": judgement call replaced with "everything from scallops down through canned light tuna sits in the FDA's Best Choices group".
- "Canned mackerel is usually Atlantic or chub": unsourced, cut.
- "Atlantic and Pacific cod are Best Choices": FDA lists just "Cod"; simplified. Black cod = sablefish, not a cod: added NOAA Sablefish source.
- Ahi = yellowfin or bigeye: added NOAA yellowfin and bigeye sources.
- "Frozen often cheaper": price claim cut; frozen/fresh point reframed to what the source supports (the FDA lists go by species).
- "White tuna on a sushi menu can mean different fish": unsourced, cut to "Ask which fish it is."
- Red flags: "tremor, memory changes" are EPA symptoms for elemental/inorganic mercury, not methylmercury. Replaced with EPA's methylmercury list (pins and needles, loss of side vision, hearing/speech/walking problems, poor coordination, muscle weakness).
- "Mercury from normal amounts isn't something most people need to worry about": replaced with FDA's "lower mercury fish are a good choice for everyone."
- Cut a promise of a future canned-tuna guide.

Category check: every species named as a Best or Good Choice matches the live FDA chart. All 7 Choices to Avoid (king mackerel, marlin, orange roughy, shark, swordfish, bigeye tuna, Gulf of Mexico tilefish) are named only as fish to skip. Nothing on the Avoid list is recommended.

## Source URL check

| URL | Result |
|---|---|
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200 |
| https://www.fda.gov/food/environmental-contaminants-food/mercury-levels-commercial-fish-and-shellfish-1990-2012 | 200 |
| https://www.fda.gov/food/consumers/questions-answers-fdaepa-advice-about-eating-fish-those-who-might-become-or-are-pregnant-or | 200 (added) |
| https://www.epa.gov/mercury/how-people-are-exposed-mercury | 200 (added) |
| https://www.epa.gov/mercury/health-effects-exposures-mercury | 200 |
| https://www.fisheries.noaa.gov/species/pacific-bigeye-tuna | 200 (added) |
| https://www.fisheries.noaa.gov/species/atlantic-yellowfin-tuna | 200 (added) |
| https://www.fisheries.noaa.gov/species/sablefish | 200 (added) |
| https://cdn.realfood.gov/DGA.pdf | 200 |
| https://www.epa.gov/choose-fish-and-shellfish-wisely/questions-answers-fish-consumption-advice | 404, removed |

Internal links: /calculator/ (about word 160, inside the first 300) and one guide link, /guides/how-much-fish-per-week-after-60/. "related" lists only approved slugs.

## Medicine-safety checklist

- One `<aside class="med-note">`, naming blood thinners (warfarin), blood-pressure medicine, statins and diabetes medicine; sends the reader to her pharmacist or doctor before changing anything. Pass.
- Required safety sentence appears verbatim exactly once, inside the box. Pass.
- No repeated doctor caveats after recommendations. Pass.
- No supplement doses. The only mg figures are the 2,300 mg sodium ceiling. Pass.
- No start/stop/change medicine advice, no diagnosing, no cure claims. Pass.
- Sodium framed only as under 2,300 mg/day; no advice to add salt. Pass.
- "When to Talk to Your Doctor" lists red-flag signs (now matched to EPA's methylmercury symptoms) plus an allergy emergency line; not a second warning. Pass.
- Pregnancy/children: only a link to FDA. Pass.
- Anecdotes: Sarah doing her mom's groceries (sole, frozen cod) and asking servers in Whistler. Neither makes a health or medical claim. Kept. No personal heart history. Pass.
- No em-dashes. Title 60, meta 154, excerpt 158 chars. Fields set per brief (pd, sarah, 2026-11-03 x3, ready, published false, health, L1). Pass.

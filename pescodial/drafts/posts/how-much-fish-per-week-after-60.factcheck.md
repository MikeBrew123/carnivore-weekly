# Fact-check and medicine-safety log: how-much-fish-per-week-after-60

Checked 2026-10-24. All sources fetched live that day via WebFetch/WebSearch/curl.

**Totals: 6 [[VERIFY]] markers resolved (5 corrected/expanded with a source, 1 confirmed as written), 3 [[VERIFY-URL]] markers resolved (all 3 replaced with real working URLs), 0 deleted outright.** Zero "[[" left in the file. Final visible word count: 1,583 (within the 900-1,600 band).

Fetch notes: heart.org and ahajournals.org (the Rimm 2018 DOI target) return 403 to both WebFetch and curl (anti-bot), matching the pattern already logged in `fish-high-in-omega-3.factcheck.md`. Content on both was independently confirmed via WebSearch snippets pulled from Google's index of the live pages, and the DOI was confirmed to 302-redirect to the correct `ahajournals.org` article page (not a dead DOI). `fdc.nal.usda.gov/food-details/<id>/nutrients` deep links 404 to curl/WebFetch (client-side-rendered SPA route); unlike the sibling post's session, I had no headless-browser fallback today, so rather than cite an unconfirmed deep link I cite the FDC homepage (confirmed 200) and corroborate the actual sodium numbers from multiple independent secondary sources that themselves cite specific USDA FDC records (myfooddata.com mirrors, each naming the USDA food description and FDC ID).

## VERIFY markers

| # | Location | Claim | Resolution | Source |
|---|---|---|---|---|
| 1 | Short Answer, FDA/EPA serving count & audience | 2-3 servings/wk, 8-12 oz, Best Choices; audience framing | Corrected/expanded: advisory serves 2-3 servings/wk (~8-12 oz, 4 oz chart serving), written specifically for women who are/may become pregnant and young children, but FDA states anyone can use the chart | fda.gov/food/consumers/advice-about-eating-fish (fetched, 200); FDA Q&A page content via WebSearch ("This advice is specifically for... However... everyone can follow this advice") |
| 2 | Short Answer, AHA serving size | "at least 2 servings/wk, 3 oz, deck of cards" | Corrected: kept 2 servings/wk and 3 oz, replaced "deck of cards" (not AHA's own phrase) with AHA's actual comparison, "about 3/4 cup of flaked fish" | heart.org Fish and Omega-3 Fatty Acids page content confirmed via WebSearch snippet |
| 3 | "Why Mercury" section, audience scope | Does Best/Avoid framework apply to general adults? | Corrected: advisory written for pregnant/breastfeeding/young children; general-adult guidance from the Dietary Guidelines is simply "at least 8 oz of fish a week" without mercury tiers; FDA says everyone may still use the same chart voluntarily | FDA Q&A page (via WebSearch); FDA advice-about-eating-fish page |
| 4 | Best Choices intro | "2-3 servings/wk without concern" tied to Best Choices specifically | Confirmed as written (tightened phrasing to name the category explicitly) | FDA chart: category defined as fish eatable "at least three times a week" -> bucketed to 2-3 servings/wk guidance |
| 5 | Albacore paragraph | Category and weekly limit | Corrected/expanded: albacore is "Good Choices" (not Best Choices), limited to 1 serving/week **and no other fish that week** (not just "1 serving of albacore"), runs roughly 3x the mercury of canned light tuna | FDA Q&A page / FDA advice page (via WebSearch, consistent across both) |
| 6 | Canned/Smoked Fish, sodium figures | Need real sodium numbers | Corrected with sourced range: canned salmon/sardines ~300-400 mg sodium per 3 oz; smoked salmon notably higher, ~500-650 mg per 3 oz | USDA FoodData Central figures, corroborated across multiple independent secondary citations of specific FDC records (pink salmon canned ~320-343 mg/3oz across 3 FDC variants; Pacific sardines in tomato sauce 414 mg/100g ≈ 352 mg/3oz; chinook salmon smoked/lox 571-660 mg/3oz) |

## VERIFY-URL markers

| # | Original ask | Resolution |
|---|---|---|
| 1 | USDA FDC entries for canned salmon/sardines sodium | Replaced with `https://fdc.nal.usda.gov/` (confirmed 200 via curl). Did not link a specific `/food-details/<id>/nutrients` deep link because those 404 to automated fetchers today and I had no way to confirm client-side rendering (the sibling post's session had browser access; this one did not) |
| 2 | Current official Dietary Guidelines sodium source | Replaced with `https://cdn.realfood.gov/DGA.pdf` (confirmed 200 via curl and WebFetch; this is the "new edition" PDF linked directly from the official `dietaryguidelines.gov` homepage, which itself is confirmed live and official, USDA/HHS branded). Content via WebSearch confirms "ages 14 and above should consume less than 2,300 mg per day of sodium" |
| 3 | EPA methylmercury/bioaccumulation page | Replaced with `https://www.epa.gov/mercury/health-effects-exposures-mercury` (confirmed 200 via curl and WebFetch; covers methylmercury neurotoxicity and bioaccumulation through the food chain, distinct from the joint FDA/EPA advisory chart) |

## Source URL check (all sources in the final Sources list)

| URL | Result |
|---|---|
| https://www.fda.gov/food/consumers/advice-about-eating-fish | 200 (curl + WebFetch), full Best/Good/Avoid chart content confirmed |
| https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids | 403 to curl/WebFetch (anti-bot); live page content confirmed via WebSearch snippet (2 servings/wk, 3 oz / 3/4 cup flaked) |
| https://doi.org/10.1161/CIR.0000000000000574 | 403 direct (ahajournals blocks bots) but confirmed 302 redirect to the correct `ahajournals.org` article URL — DOI resolves correctly, just blocks automated fetch like heroes/PubMed generally do |
| https://fdc.nal.usda.gov/ | 200 (curl + WebFetch) |
| https://cdn.realfood.gov/DGA.pdf | 200 (curl + WebFetch, valid 3.3MB PDF); linked directly from the official dietaryguidelines.gov homepage |
| https://www.epa.gov/mercury/health-effects-exposures-mercury | 200 (curl + WebFetch), content confirmed |

No broken/404 URLs remain in the shipped Sources list.

## Medicine-safety review

- Exactly one `<aside class="med-note">` in the post (count = 1).
- Contains the required sentence verbatim, exactly once, nowhere else in the post: "This is not for everyone. Talk to your doctor first if you have high blood pressure, kidney or heart problems, diabetes, are pregnant, or take medicine." (checked via substring count = 1).
- Names statins, blood-pressure medicine, blood thinners (warfarin example), and diabetes medicine in plain words; food-first framing; tells the reader to talk to her doctor or pharmacist before changing anything. Pass.
- No supplement doses anywhere (no mg/IU/gram amounts of fish oil or omega-3 — grepped all numeric "mg" occurrences, all four are sodium figures, none are omega-3/fish-oil doses). Pass.
- Distinct "When to Talk to Your Doctor" h2 section with red-flag symptoms (numbness/tingling, balance/vision changes, chest pain, shortness of breath, allergic reaction, irregular heartbeat), separate from and not a repeat of the med-note sentence. Pass.
- Nowhere does the post tell a reader to start/stop/change a medicine, diagnose, promise a cure, give drug doses, or tell anyone to skip care. Pass.
- Sodium is framed strictly as a ceiling ("2,300 mg... the upper ceiling... not a target to aim for"), never a target, and the post never tells anyone to add salt. Pass.
- No g/lb protein figure stated as a house position. Pass.
- Mercury guidance matches FDA/EPA exactly: the post's "Best Choices" list items (salmon, sardines, Atlantic mackerel, herring, trout, shrimp, cod, tilapia, light canned tuna, catfish/pollock) are all genuine FDA Best Choices; the 7-item "Choices to Avoid" list (king mackerel, marlin, orange roughy, shark, swordfish, bigeye tuna, Gulf of Mexico tilefish) exactly matches the FDA's own Choices-to-Avoid list, and none of those 7 are ever recommended anywhere in the post — only named as fish to avoid. Pass.
- No invented personal heart-history anecdote for Sarah (post contains no personal health anecdotes at all). Pass.
- No em-dashes anywhere in the content (checked: count = 0). Pass.

**Result: no hard safety violation found. The draft's medicine box, red-flag section, and mercury lists were already compliant; only the inline VERIFY markers needed resolving.**

## Structural/contract check

- Tags used: a, aside, h2, h3, li, p, strong, ul — all within the allowed set. Exactly one `<aside class="med-note">`. No h1, script, inline style, or images. Pass.
- `/calculator/` link appears at approximately word 128, well within the first 300 words. Pass.
- Internal PD guide links: exactly 2 — `/guides/fish-high-in-omega-3/` and `/guides/is-pescatarian-healthy-after-50/` — both on the approved slug list, and `is-pescatarian-healthy-after-50` (publish_date 2026-10-27) counts as already published by this post's 2026-10-30 date. No other internal guide URL used. Pass.
- No link to any carnivoreweekly.com post, high-LDL-defense or otherwise. Pass.
- Word count: 1,583 (band is 900-1,600). Pass.
- Omega-3 food-source depth: the post explicitly defers to `/guides/fish-high-in-omega-3/` ("I go through those numbers in detail... so I won't repeat the full breakdown here") rather than re-explaining it. Pass.
- JSON fields: `date`, `publish_date`, `scheduled_date` all equal `2026-10-30`; `published: false`; `category: "health"`. All already correct, confirmed unchanged. Pass.

## Not safe to ship as-is?

No. No hard safety violation was found. The post is ready to proceed in the normal pipeline once a human re-reads this log.

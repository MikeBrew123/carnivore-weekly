# Fact-check and medicine-safety log: is-pescatarian-healthy-after-50 (PD, P3, 2026-10-27)

Checked 2026-10-24. **Totals: 9 markers resolved (6 VERIFY, 3 VERIFY-URL) — 6 corrected with a new/added source, 3 verified-as-written with marker removed, 0 deleted outright.** Zero `[[` remain. Visible words: 1,458 (900-1600 OK). Structural contract check passed (script run against the draft, see below).

Fetch notes: heart.org, ods.od.nih.gov, and bmj.com return HTTP 403 to direct fetch (bot-blocking), same pattern noted in the prior two PD fact-checks (`fish-high-in-omega-3`, `best-fish-for-high-cholesterol`). Confirmed via WebSearch snippets instead, cross-checked against the two prior PD fact-check logs where the same heart.org pages were rendered in a browser. FDA, PMC/NCBI, and the USDA FDC JSON API (`api.nal.usda.gov`) all returned content directly. USDA FDC's human-readable `food-details` pages 404 to a bot fetcher (SPA) but the IDs below were confirmed correct via the FDC API JSON.

## Markers

| # | Marker | Resolution | Source |
|---|---|---|---|
| 1 | VERIFY: sat fat vs. dietary cholesterol/LDL framing | **Corrected framing**, kept claim: saturated fat raises LDL more than dietary cholesterol for most people; AHA's own fat guidance centers on cutting saturated fat | heart.org Saturated Fats page (search-confirmed: "saturated fat is the predominant dietary determinant of LDL"); added to Sources |
| 2 | VERIFY: specific heart-disease study + DOI | **Corrected** with a real, specific result | Tong TYN et al., EPIC-Oxford, BMJ 2019;366:l4897, DOI 10.1136/bmj.l4897. Fish eaters vs. regular meat eaters: HR 0.87 (95% CI 0.77-0.99) for ischaemic heart disease, 48,188 participants, 18.1-yr follow-up |
| 3 | VERIFY: AHA serving language/frequency | **Corrected**: dropped "at least" (live AHA page says "2 servings," not "at least 2," per two prior PD checks) and dropped the unverifiable "deck of cards" comparison, replaced with "roughly 3/4 cup of flaked fish" | heart.org Fish and Omega-3 Fatty Acids page |
| 4 | VERIFY: fiber-satiety claim, keep general | **Verified as written** — general, well-established nutrition science (fiber slows gastric emptying/aids satiety); language already hedged ("tends to help"), no specific number claimed, no new citation needed | — |
| 5 | VERIFY: weight/waist-size study + number | **Corrected**: "waist size" dropped (the only study found reports BMI, not waist circumference — don't claim what isn't in the source); BMI figure added | Same Tong et al. 2019 BMJ paper: fish eaters BMI 23.1 vs. meat eaters 24.1 |
| 6 | VERIFY: sodium figures for canned salmon/sardines/smoked salmon | **Corrected** with real per-serving numbers | USDA FDC: canned pink salmon drained (FDC 173724) 378 mg/100g → ~320 mg/3oz; canned sardines in oil drained w/bone (FDC 175139) 307 mg/100g → ~260 mg/3oz; smoked salmon/chinook (FDC 173687) 672 mg/100g → ~570 mg/3oz |
| 7 | VERIFY-URL: pescatarian CVD/weight outcomes study link | **Corrected**: added working DOI link | https://doi.org/10.1136/bmj.l4897 (confirms 302-redirects to bmj.com; PMC full text confirms same DOI, title, numbers) |
| 8 | VERIFY-URL: USDA FDC entries, canned salmon/sardines | **Corrected**: added 3 FDC links (salmon, sardines, and smoked salmon, since all three sodium figures above needed sourcing) | fdc.nal.usda.gov/food-details/173724, /175139, /173687 |
| 9 | VERIFY-URL: DGA sodium source, flagged `cdn.realfood.gov/DGA.pdf` as suspicious | **Confirmed the flag was correct — removed that URL entirely**, replaced with a stable FDA source | See "Important finding" below |

## Important finding: bad citation already live on a sibling PD post

I fetched `https://cdn.realfood.gov/DGA.pdf` directly (the URL this draft's marker flagged as suspicious, and the URL the **already-published** `fish-high-in-omega-3` post currently cites for the 2,300 mg sodium guidance). **It is not the Dietary Guidelines document.** It resolves to a Shutterstock stock photo (ID 1140303914, binary image data, no text). `realfood.gov` itself is a real, live official US government site (confirmed: "An official website of the United States government," hosts the 2025-2030 Dietary Guidelines under the new administration's "Real Food" branding) — but that specific `/DGA.pdf` path on the `cdn.` subdomain is broken/wrong, and notably the live realfood.gov content I checked does **not** state a quantified sodium ceiling at all (it leads with protein, produce, and whole-grain targets instead). The prior fact-check log for `fish-high-in-omega-3` (dated 2026-10-17) claims it verified this exact URL as "200, PDF, DGA 2025-2030, sodium line on p.5" — that verification was wrong. **This draft does not use that URL** (replaced with the FDA source below); the live `fish-high-in-omega-3` post should be corrected separately.

## Sources used in this draft (verified live or via cross-confirmed search)

| URL | Result | Action |
|---|---|---|
| heart.org/.../fish-and-omega-3-fatty-acids | 403 direct; content confirmed via search + 2 prior PD fact-checks that browser-rendered it | kept |
| heart.org/.../saturated-fats | 403 direct; content confirmed via search (sat-fat-vs-LDL framing, "<6% of calories") | added, kept |
| doi.org/10.1161/CIR.0000000000000574 (Rimm 2018 AHA advisory) | 302 to ahajournals.org; title/authors/year confirmed via search | kept |
| doi.org/10.1136/bmj.l4897 (Tong 2019 EPIC-Oxford) | 302 to bmj.com; full text + DOI cross-confirmed via PMC6724406 | added |
| ods.od.nih.gov Omega-3 fact sheet | 403 direct (Cloudflare); content confirmed via search (fatty-fish list, EPA/DHA, LDL/HDL effects) | kept |
| fda.gov/food/consumers/advice-about-eating-fish | 200, direct fetch. Choices to Avoid confirmed verbatim: king mackerel, marlin, orange roughy, shark, swordfish, bigeye tuna, Gulf of Mexico tilefish | kept |
| fdc.nal.usda.gov/food-details/173724, /175139, /173687 | 404 to bot (SPA); IDs and sodium values confirmed via api.nal.usda.gov JSON (378, 307, 672 mg/100g respectively) | added |
| fda.gov/food/nutrition-education-resources-materials/sodium-your-diet | 200, direct fetch. States "less than 2,300 milligrams (mg) per day" as a ceiling, not a target | added, replaces the bad `cdn.realfood.gov/DGA.pdf` link |
| cdn.realfood.gov/DGA.pdf | Loads but is a stock photo, not the DGA document | **removed** |

## Medicine-safety review

- Exactly one `<aside class="med-note">` (content count: 1). Contains the required sentence **word for word, exactly once** (verified by exact-string count = 1): "This is not for everyone. Talk to your doctor first if you have high blood pressure, kidney or heart problems, diabetes, are pregnant, or take medicine." Not repeated or paraphrased elsewhere. PASS.
- Med box names statins, blood-pressure medicine, a blood thinner (warfarin named as example), and diabetes medicine, in plain words, food-first, directing to doctor/pharmacist before changing anything. PASS.
- No supplement doses anywhere (checked every `mg`/`g`/`IU` occurrence in the content programmatically — all are food sodium figures: canned salmon ~320 mg, sardines ~260 mg, smoked salmon ~570 mg, and the 2,300 mg sodium ceiling. No fish-oil/omega-3 supplement doses). PASS.
- Distinct "When to Talk to Your Doctor" h2 present with a red-flag symptom list (chest pain, shortness of breath, swelling, irregular heartbeat, dizziness/fainting, unexplained weight change) plus a 911 line for chest pain/shortness of breath — separate from the med-note, not a repeat. PASS.
- No instruction to start/stop/change medicine, no diagnosis, no cure claim, no drug doses, no "skip medical care" language. PASS.
- Sodium: presented only as a ceiling ("keep your overall day under the standard 2,300 mg sodium ceiling rather than adding salt back in somewhere else"). Never tells the reader to add salt. PASS.
- No g/lb protein figure stated as a house position — content explicitly says "We don't have a one-size target to hand you here" and routes to the calculator. PASS.
- Mercury: only FDA/EPA "Best Choices" fish are named or implied as choices (salmon, sardines, trout, herring, Atlantic mackerel, cod, shrimp — all confirmed Best Choice on the FDA chart). The "Choices to Avoid" list never appears as a recommendation anywhere in the body. PASS.
- No invented personal heart-history anecdote for Sarah (none present; her only permitted stories, anemia/PCOS, aren't used here either, which is fine). PASS.
- No em-dashes anywhere in content or any JSON field (checked programmatically across all string fields). PASS.

## Structural/contract check (run programmatically against the draft)

- Allowed tags only. Tags actually used: `a, aside, h2, li, p, strong, ul`. No h1/script/style/img. PASS.
- `/calculator/` link appears at word 156 (within first 300). PASS.
- Internal PD guide links: exactly 2 — `/guides/best-fish-for-high-cholesterol/` and `/guides/fish-high-in-omega-3/`, both on the allowed list of 4, and both confirmed live on disk (`pescodial/public/guides/<slug>/index.html` exists for each). PASS.
- No link to any carnivoreweekly.com post. PASS.
- Word count: 1,458 (range 900-1,600). PASS.
- `date` = `publish_date` = `scheduled_date` = `2026-10-27`. PASS.
- `published`: false. `category`: health. Both already correct, confirmed, no change needed.

No hard safety violation found. No post-drop recommendation. The draft is ready to proceed in the pipeline as far as this fact-check/safety gate is concerned.

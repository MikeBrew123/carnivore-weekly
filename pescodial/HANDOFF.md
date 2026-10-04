# PescoDial build: handoff (2026-10-03 16:40 PT)

Branch `pescodial-build`. Brew approved everything below; ledger entries are in the vault.

## Done
- Site generator + 2/week cap + isolation tests (`pescodial/scripts/generate_pd_site.py`, `tests/test_pd_site_isolation.py`)
- Pesco styles in the shared macro engine (golden 1515/1515), worker site support (`tests/pd-subscribe-routing.test.mjs`)
- ISSUE-086 report diet profiles (`tests/report-diet-fidelity.test.mjs`, 7 diets pass; pesco-mediterranean pending)
- Supabase: site 'pd' and pesco-* diet values allowed (migrations applied to prod)
- Cloudflare Pages project `pescodial` (noindex placeholder at pescodial.pages.dev); GitHub secrets set; `.github/workflows/pescodial-deploy.yml`
- Drip: `scripts/send_drip.py` SITES['pd']; Sarah's fact-checked drafts in `pescodial/drafts/drip/`
- Report copy (Sarah) in `pescodial/drafts/report/`; Brew's design in `pescodial/design/report-v2/plan.html`
- Meal engine `api/pd-meal-plan.js` + USDA table `api/pd-foods.js`

## Done 2026-10-04 (branch `pescodial-build-sr4qkr`)
- Meal engine: all checks pass; per-meal portion limits (fish 4 oz+, one fruit, eggs <=3); zero-fish week refused.
- Paid report for `pesco-mediterranean` inside `generateAllReports` (`api/pd-report.js` renders only). Numbers hidden for kidney disease only; medicine, diabetes and blood thinners get maintenance numbers plus a warning box that says why (Brew 2026-10-04). `tests/pd-report.test.mjs`.
- PD branding: report email from `reports@pescodial.com`, resume link on pescodial.com, CW abandon email never sent to PD readers, claim gate covers pesco/Mediterranean.
- Drip HTML in `data/drip-emails/pd/` (generator `pescodial/scripts/build_pd_drip.py`), workflow step behind `vars.PD_DRIP_ENABLED` (off). `tests/test_pd_drip.py`.
- Guard suite 29/29 plus the PD drip test, all in calculator-guard CI.

## Waiting on Brew
- CW paid report brought in line with the 2026-10-04 rule (done): the warning now sits at the top of Report #1, above the numbers, for readers who declared a medicine or condition; the blood-thinner line no longer claims greens were removed (Sarah). `tests/cw-report-warning.test.mjs`. Not deployed.
- Report photos: cover and recipe photo slots are a plain pattern for now.
- PD abandon-recovery copy (Sarah) and the go to send it.
- Flip `PD_DRIP_ENABLED` when the drip may send.

## Next, in order (original list; 1-4 done)
1. `tests/pd-meal-plan.test.mjs`: fix 2 failures (2300 kcal Sun +7.3%; excluding all fish must refuse, not build a fish-free week).
2. Wire `buildPescoMedWeek` into the report for `pesco-mediterranean`; PD section set per the design (numbers, fish plan, 7-day table, grocery, recipes, eating out, doctor questions, sources); numbers-hidden variant when medical-context suppresses calorie guidance (meal table shows dishes only, grocery list no quantities); PD theme in `wrapInPrintHTML` (fonts + CSS from the design); add pesco-mediterranean to the fidelity test + CI.
3. PD brand: report email from reports@pescodial.com, resume link pescodial.com/calculator/, no "Carnivore Weekly" text in PD reports (extend brand-attribution test). Extend CLAIM_FRAME_DIET with pesco/mediterranean.
4. Drip HTML in `data/drip-emails/pd/` from the drafts ([PROMO SLOT] removed until the report ships); workflow step `send_drip.py --site pd`.
5. Calculator frontend for PD (four styles, spelled-out names) once Brew's site design lands.

## Also on the list (Brew, 2026-10-03)
- GA4 property, Google Search Console (sc-domain:pescodial.com, DNS-verified) and Bing Webmaster for pescodial.com, wired before launch.
- Cross-links between PescoDial and CW, KD, mikebrew.ca and whistlerbrew.com, in both directions. Use contextual links and an "our sites" line on About pages rather than identical sitewide footer links (a network of sites all footer-linking each other reads as a link scheme). Do not touch CW pages that are in an open experiment or the control group.

## Never without Brew's go
Production worker deploy, DNS changes, any email send, Etsy edits, merging to main.
Fish: 5 meals/week, lowest-mercury species only. Price $29 USD. Plan length 7 days.

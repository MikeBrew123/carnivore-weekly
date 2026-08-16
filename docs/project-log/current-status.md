# Current Status

**Last Updated:** 2026-08-02 (Etsy sales-drop investigation → thumbnail revert, ISSUE-064)

**2026-08-02 — Etsy "one sale this week" investigated → Jul-16 thumbnail swap reverted on 10 sellers (ISSUE-064).** Brew flagged the sales drop suspecting the Jul 27-28 image work. Investigation cleared that (those listings had ~0 traffic) and the Jul 15-16 price doubling (50%-off sale keeps effective prices at old levels — verified live, sale ends Aug 15). Actual finding: on Jul 16 rank-1 thumbnails were swapped to branded mockups (product shrunk on beige bg + marketing copy) on ~every listing EXCEPT top seller keto food list 4464219356 — post-swap the shop sold only the untouched listing; carn/pesc food lists sold Jul 9-13 then went silent on swap day (dessert cards sold once post-swap — noted counterexample). Reverted: original product-first heroes re-ranked to rank 1 on all 10 receipt-verified sellers via API (mockups kept at rank 2+, nothing deleted, verified 10/10). Also this session: lion food list 4464219372 (expired Jul 30) + med poster 4482132169 (expiring Aug 2) renewed; auto-renew enabled on all 39 active listings (Brew-approved, ~$0.20/listing/4mo). Nano-banana image-experiment memory updated with negative verdict. **Watch:** sales recovery ~Aug 9 (bead ykn7); 50%-off sale must be renewed before Aug 15 or list prices double for real; meal-plan recheck crh1 Aug 3.

**2026-07-28 — Audience alignment sprint (7 commits, all pushed).** Deep dive proved the demographic/content mismatch: 190 calc sessions = 64% 45+, 58% female, 87% weight loss; only buyers ever are women 69+72 via evergreen guides; GSC clicks concentrate on calculator+symptom content while athlete/debate posts get ~0. Shipped: (1) **Editorial rebalance 8f9bc200** — writer mix 3/3/3→Sarah 5/Marcus 2/Chloe 2 in scheduled-task SKILL.md + weekly_content_prompt.md + agent files + writer_memory_log rows 333-335; every topic needs a target search query; takes effect ~Aug 8 when queue drains. (2) **Calculator CTA block 191371aa** — after every CW post body, GA event `calculator_cta_post_body` (only 5 old posts were feeding the funnel). (3) **SEO rescue 2fe02520** — meal-plan guide's 155-word plan section → 2,810-word post w/ real 7-day plan + 1200/1500/2000-cal scaling (was pos 42.9 on 3,346 imp, top buyer referrer); adaptation-timeline retitled "Symptoms Week by Week" (CTR fix); calculator.html got animal-based/Saladino FAQ (550+ imp at pos 7-8, now 11 FAQPage questions). (4) **Most Popular pins c554adbf** — `featured_bento` flag in blog_posts.json + generate.py; slots were secretly posts 6-8 by date, now pin macro-calculator/food-list/meal-plan. (5) **Drip fixes 57ab457e** — day-6 false "last email" line + "your mom" reframe, bridge lines days 10/14/21; **completion is 4/6 eligible (~67%), NOT 4/67 (censored data)** — drip is not broken; audit archived at docs/archive/reports-archive/2026-07-28-drip-audit-45plus-voice.md (gitignored, local). (6) **Homepage direction test 67c939c9** — grafted Claude Design hero (single CTA, GA `homepage_hero_calculator_cta`, honest 190-reader trust line) + Start Here 3-card row (`homepage_start_here_click`) into index_template.html (template-level, automation-safe, archive path verified); decision gate ~Aug 11-25 on homepage→calculator CTR; full plan at ~/.claude/plans/this-is-what-claude-abstract-raccoon.md incl. rebuild constraints map. (7) **Meds guide c8b3f6b0** — Sarah's "Carnivore With Health Conditions and Medications" cornerstone (1,371w, doctor-coordination framing, no dosing/reversal claims) queued Aug 8, image generated. **Parked deliberately:** $29 copy rewrite (bead 8iwy blocked — copy already fits buyer, EXP-004 has 1 response, revisit at ~30). **Brew decisions pending:** 7-Day vs 30-Day drip naming (signup pages vs day-10-28 emails disagree); day-3 $24 vs day-7 $14.50 price ladder (needs WELCOME5 conversion data); ButcherBox day-21 CTA vs Canadian geography. GPT homepage mockup rejected: fabricated writers w/ fake RN credentials.

**2026-07-27 — Meal-plan listings rescue (bead pshn closed, recheck bead crh1 filed 2026-08-03).** All 6 Jul-19 meal-plan listings + Keto Starter Kit bundle sat at 0-2 lifetime views after 8 days. Diagnosis: NOT an indexing/category problem — API relevancy probe (sort_on=score) ranks them #1-#12 for their exact queries, taxonomy/attributes identical to the 13k-view winners. They were surfaced but never clicked: each listing had ONE text-only hero card as its entire gallery. Digging for preview pages exposed ISSUE-060: keto/lowcarb/pescatarian/mediterranean PDFs shipped with grocery/directory pages overprinting each other (build_mealplans.py fixed-height pages + balanced CSS columns; carnivore/lion happened to fit). Applied: (1) build_mealplans.py now measures blocks in-browser and packs explicit flex columns with continuation headers — all 6 PDFs rebuilt, verified page-by-page, files replaced on Etsy (fresh zips for carnivore/lion); (2) 4 real-page preview images per listing (composite fan thumbnail + week grid + grocery + directory), built from actual PDF pages per the listing-images-show-pages rule, replacing the text hero; (3) titles front-load the exact head query, all 13 tags per listing re-based on tags mined from top-30 score-ranked competitors per target query, materials matched to winners; (4) bundle retargeted from "keto starter kit" (19-result micro-niche) to keto-for-beginners/keto-meal-plan terms. Pricing untouched, nothing added to Aug-15 sale (zero-view listings — discount changes nothing). Baseline for the Aug-3 recheck lives in bead crh1.

**2026-07-27 — Checkout scare investigated: NOT broken, NOT a traffic drop — metric noise.** "17→4 Stripe sessions/week, all 4 expired, no sale in 11 days" decomposed: last week's 4 expired = 3x Brew's own `iambrew+funneltest0720` QA + 1 shop PDF click; prior week's 17 included ~12 no-email shop-button bot bursts (07-13 19:36 + 22:06 UTC, same-minute batches) + KD deploy tests. Real organic calculator checkout starts are ~0/week and have been all month — both actual buyers (classyn53 07-05, crswarner 07-16 $14.50 w/ 52fYA51M) converted via drip email, not the on-page funnel. Calculator traffic itself is steady: 21-24 real sessions/wk in `calculator_sessions_v2`, ~15/wk reach Step 3; GA4 shows zero non-QA `calculator_payment_modal_opened` since 07-06. Live funnel walk (QA email, browser, stopped at Stripe page): Step 1→3 → modal $29.00 → worker create-checkout → checkout.stripe.com "Complete Protocol Bundle $29.00", `calc_session_token` metadata present (ISSUE-047 fix holding through the 07-22 anon-grant lockdown + 07-23 webhook redeploys, which nobody had exercised since). QA rows deleted (calc_v2, cw_assessment, drip+newsletter subs), QA Stripe session force-expired. Bead `carnivore-weekly-1j9o` (P2): segment checkout-starts reporting calculator-vs-shop + exclude QA emails/no-email bot bursts; real paid-funnel KPI = non-QA modal opens. Commit 60a3382a.

**2026-07-19 (evening) — Fable final sprint: 5 revenue builds shipped, 6 products launched.**
- **Honest expiring drip codes — LIVE:** `send_drip.py` mints per-subscriber single-use Stripe promo codes on days 7/28 (`WEEK1-`/`GRAD-`, real 48h `expires_at`, coupon `52fYA51M`, livemode check, DRIP50 no-claim fallback); worker `validatePromotionCode()` validates unknowns (Stripe-Version pinned 2024-06-20 — account default drops embedded coupon shape; found via debug deploy). E2E: mint → validate 200 @50% → deactivated rejected → DRIP50 regression clean. Day-14 keto→carnivore product fix; day-28 graduation section added. GH Action passes STRIPE_SECRET_KEY. Commits 25133b4c, c05bfb3f, b0de2a50.
- **Calculator SEO push (7zgc, A-C/E-G) — LIVE:** cannibalization found — blog post 2026-02-26-best-macro-calculator ranks 5.7-7.6 on ALL head queries while calculator.html sits 28-35 suppressed. Blog post got FAQPage schema (new `faq` + `date_modified` pipeline fields), above-fold calculator box, TDEE section; calculator.html retitled to animal-based cluster; 15 anchors consolidated (informational "macro calculator" → post; tool CTAs de-"macro"d); 3 KD posts cross-link the post (submodule d591151). Task D (title) HELD to ~Jul 26. Commit aa62729f.
- **Etsy overhaul — LIVE:** cross-sell blocks on 8 zero-sale listings (13 sellers frozen via receipt-verified ID allowlist); shop digital_sale_message sharpened (Sarah; Brew picked option 2 himself); OAuth re-scoped +shops_w. Mega bundle: found INACTIVE while headlining the banner → refreshed to 9 PDFs (adds both trackers, old leaked 7-PDF zip now stale), reactivated, price via inventory endpoint to $39.98, Brew added to Aug-15 sale → shows $19.99/50%.
- **Etsy→email pipeline (3z3u) — LIVE:** free 30-day tracker PDFs (CW+KD branded, Playwright HTML→PDF at etsy/products/templates/), /bonus pages both sites → /api/v1/subscribe (cw: newsletter+drip; kd: newsletter; source `etsy-bonus`), E2E verified; found+fixed silent RPC failure (signup_source CHECK constraint, migration 031). Insert cards uploaded to ALL 25 matched listings (sellers Brew-approved). Commits 2bb4404d, e5a6a3e (KD).
- **Meal-plan product line (2l3a) — PUBLISHED (all 6 by Brew):** SERP research per diet → universal winner = N-day meal plan + grocery lists, calorie-specified (keto exemplar: 5.6k reviews). Engine at `etsy/products/mealplans/` (ingredients.json macro table — macros NEVER hand-written; auto-scale hit 1499/1501 on the "1500 Calorie" claims; Marcus meal pools, Sarah prose+listing copy). Listings: carnivore 4540695544 $9.99 (zip w/ tracker), keto 4540695558 $7.99, lowcarb 4540695566 $7.99, lion 4540678283 $11.99 (zip w/ new symptom journal), pescatarian 4540695590 $9.99, mediterranean 4540695604 $4.99. Commit ffa55148.
- **Security:** paid mega-bundle zip untracked from PUBLIC repo (.zip escaped *.pdf ignore; still in history — accepted risk, relaunch staled it). Brew-Vault verified private.
- **Morning sweep artifacts:** CW/KD site-scan + final-sweep reports in docs/archive/reports-archive/2026-07-19-fable-*; 12 beads filed; vault review findings in final-sweep doc.
- **Watch this week:** WEEK1- codes in Stripe (first real day-7 ~Jul 21-22), `signup_source='etsy-bonus'`, new-listing views/sales (bead pshn ~Jul 26), Pinterest queue by Jul 27 (la0y), task D decision Jul 26.

**2026-07-19 — Drip check-in / anonymous insight engine — LIVE, all 30 days.** Every drip email now carries a "question of the day" button → `public/journey-checkin.html?day=N` → anonymous answer → aggregate bars. Architecture: config-driven Supabase tables (`drip_survey_questions/options/responses/views`, RLS, site-scoped) + Worker endpoints (`GET/POST /api/v1/drip-survey`, `POST .../view` funnel ping) + one static page. Anti-abuse: honeypot (silent discard), per-IP rate limit, option-set validation, fingerprint dedup (localStorage UUID, re-answer replaces). 37 questions seeded: Day-1 motivation (10 opts), 4-metric check-in grid with FROZEN identical wording on days 2/5/7/10/14/21/28 (energy/hunger/mood/weight-trend — edits require a new `question_key` or trends break), one-offs D3/D4/D6/D10/D14/D21/D28 (D21 mirrors D4, D28 mirrors D14 for before/after). All copy by Sarah agent. Funnel = `drip_events` clicked → `drip_survey_views` → `drip_survey_responses`, one-query SQL in vault `Carnivore-Weekly/Drip-Checkin-Guide.md`. Governance: Scoreboard Operating Rule 7 (click ≥25%, completion ≥60%, no external quotes below n=100, decisions at n≈50). Page is noindex + 200 + out of sitemap deliberately (verified GSC-clean). Pilot gate was waived by Brew same day (risk doesn't scale with template count; 45 mid-journey subscribers' data unrecoverable). Calculator embed PARKED (bead rh19). Wrangler OAuth was expired — re-authed via browser flow. Commits ba604537, 5227b1c4, fcacd1b5, bbb2761d. Also: closed GH #52 (transient KD-post leak into CW bento, ISSUE-056; self-healed), ISSUE-055 (CI requires canonical on every page — local validator doesn't check).

**2026-07-19 — GA4 audit for CW + KD (ISSUE-058).** CW's GA4 key events were pointed at event names the site never fires (`calculator_complete`, `calculator_start`, `calculator_payment`, `report_generated`, `report_accessed`, `blog_share`, `affiliate_click`) — conversion reports were near-empty for months. Fixed via Admin API: key events now `purchase`, `newsletter_signup`, `starter_plan_signup`, `calculator_free_results`, `calculator_completed`, `calculator_report_generated`. Also stripped `utm_source=` from internal links (index template hero/CTA, `calculator-cta.js`, `desserts.html` → neutral `?src=` params) — internal UTMs were resetting session attribution and driving CW's ~20% Unassigned share. KD config verified healthy (key events firing; first ChatGPT referral landed in GA4's built-in "AI Assistant" channel). Retention already max (14mo), enhanced measurement + Signals on, both properties. Remaining for Brew (UI-only, in vault todos): internal-traffic IP filter, GSC product-link check, Reports-snapshot customization. Audit script pattern preserved in ISSUE-058 entry. Commit cf90d741.

**2026-07-13 — Calculator Growth Team + funnel fixes (all shipped/verified live).** Built a standing growth team: 4 project subagents in `.claude/agents/` (`growth-conversion-lead`, `growth-acquisition-lead`, `growth-lifecycle-lead`, `growth-customer-intel-lead`), reusing global `sam-analytics-manager`; Director = main session. Workspace at vault `Carnivore-Weekly/growth/` (Charter, Experiment-Log, Customer-Insights, Channel-Plans) — writes INTO existing surfaces (scoreboard, weekly-ops-log, approval-queue, beads), no parallel docs.
- **Baseline corrected a false assumption:** post-June-29-gate email capture is **74%** (not a leak). Real constraint = **free→paid ~3%** (1/31 post-gate qualified) on low volume (~30 free-results/mo). Stripe is the only revenue truth (~$58/30d, 2 sales); `calculator_sessions_v2.payment_status` under-records.
- **EXP-000 (measurement) — LIVE + verified:** `CalculatorApp.tsx` retry-on-write + email-on-create; worker `handleCreateSession` persists email → the existing Stripe webhook email-fallback now matches funnel rows. Verified end-to-end (session-create stores email; DB reconciles).
- **Payment-screen bug — LIVE + verified:** stale `paymentStatus='success'` in localStorage booted repeat visitors straight to "Payment Successful" forever (+ "snag loading saved answers"). Fix: 6h TTL on persisted payment state in `App.tsx` (the winning path) + `usePaymentState.ts`; stale state clears + resets the store to Step 1. Verified on production.
- **EXP-002 (acquisition) — LIVE:** calculator title/meta/H1 add "TDEE" (kept "carnivore diet calculator" ranking phrase); TDEE FAQ (visible + FAQPage JSON-LD); 6 in-prose calculator links added to legacy high-intent posts (surgical, not pipeline). Bing IndexNow + Pinterest pin = open beads.
- **EXP-004 (micro-survey) — LIVE + verified:** "What are you trying to figure out next?" (6 opts) rendered BELOW the $29 card (paid CTA doesn't move) for non-buyers; `MicroSurvey.tsx` + Step3 wire-in; worker `POST /api/v1/calculator/survey` → `calculator_sessions_v2.survey_next_step` (migration 030). GA4 `calculator_survey_response` + DB write both verified. Watch click rate; kill if ~0.
- **UI polish — LIVE:** removed "uses male/female metabolic equations" noise (kept Biological Sex header); bottom Start Over → pill button; top inline start-over/go-back links cleaned.
- **Instrumentation gap noted:** `dashboard/calculator-funnel-report.js` queried a phantom `calculator_step` event — fixed to consume the real step events; now renders the full funnel.
- **Queued:** EXP-001 (free→paid offer rewrite) held until the survey collects ~1wk of data (Brew + Hermes aligned). EXP-003 (non-buyer drip) needs send approval. Pre-existing `wrangler.toml` `kv_namespaces`-not-in-`env.production` warning filed as a bead to verify.

**2026-07-05 — Calculator sales signal — first movement since December**

**2026-07-05 — Calculator sales drought broken?** Brew reports 0 calculator/report sales since December 2025, then 2 in the week of Jun 29-Jul 5 2026 — both **full price, no coupon** (stronger buying-intent signal than a WELCOME5 redemption). Timing lines up with a cluster of this week's fixes: mobile LCP fix (`54f5d5a7`, responsive pyramid images + PNG recompression, addressing the 7.3s mobile LCP flagged 2026-07-04), the payment-redirect scroll race fix, and several mobile-overflow bugs on calculator.html. Too early to confirm causation — need Stripe MCP re-authorized (`/mcp`) to pull exact sale timestamps and compare against deploy times. Watch next 1-2 weeks: if sales rate holds or grows, this week's mobile fixes were very likely the silent conversion killer since December.

**2026-07-05 — Calculator sales drought broken?** Brew reports 0 calculator/report sales since December 2025, then 2 in the week of Jun 29-Jul 5 2026 — both **full price, no coupon** (stronger buying-intent signal than a WELCOME5 redemption). Timing lines up with a cluster of this week's fixes: mobile LCP fix (`54f5d5a7`, responsive pyramid images + PNG recompression, addressing the 7.3s mobile LCP flagged 2026-07-04), the payment-redirect scroll race fix, and several mobile-overflow bugs on calculator.html. Too early to confirm causation — need Stripe MCP re-authorized (`/mcp`) to pull exact sale timestamps and compare against deploy times. Watch next 1-2 weeks: if sales rate holds or grows, this week's mobile fixes were very likely the silent conversion killer since December.

**Last Updated:** 2026-07-04 (Revenue Sprint COMPLETE — Days 1-4 all shipped Jul 4)

**Day 4 done (night):** Sprint finished. 4.1: two zombie scheduled tasks deleted; blackout policy = accept-gap for Claude tasks (pre-absence checklist in the Operator Handbook); dashboard cron → `dashboard-update.yml` on GHA, gated until Brew adds secrets. 4.2: two-sided staleness monitoring — `automation-staleness` job in weekly-health-check.yml + `scripts/heartbeat_check.py` (Mon 10:45 UTC cron, Resend email alerts, live-tested). Audit found weekly/monthly-report + vaultsync LaunchAgents silently dead (macOS Full Disk Access — Brew-only fix) and this week's weekly-update refresh commit lost to a push race (ISSUE-036, fixed with rebase-retry). 4.3: Beehiiv/MailerLite purge — `handleSubscribe` rename + dead MailerLite handler removed from the worker (deployed `--env production`, subscribe verified live), beehiiv scripts deleted, ISSUE-001 closed, README/CLAUDE.md truth-up. One deliberate leftover: `generate_site_report.py` still reads MailerLite (bead filed). 4.4: **Operator Handbook** at `Brew-Vault/04-Systems/Projects/Carnivore-Weekly/Operator-Handbook.md` — weekly loop, decision rules, blackout playbook, never-do list; CLAUDE.md trigger "run the week". 4.5: retro appended to `Brew-Vault/00-Core/Fable-Sprint-2026-07.md` (incl. Brew-only queue: FDA grant for LaunchAgents, GHA secrets, backlink emails, Schmitz ask, Etsy buyer message).

**Day 3 finish (evening):** 3.3 backlinks were done in the morning. 3.4 newsletter done — rotating affiliate slot (LMNT ↔ ButcherBox by ISO week) + Starter Kit bundle feature added to the CW weekly, config in committed `data/newsletter_affiliates.json` (auto-sends Sun cron). Sealed a site-wide affiliate leak: the LMNT link on 180 pages was a bare uncredited `elementallabs.refr.cc`; swapped all 191 links to Brew's coded referral link + http→https. Fixed engagement-tracking.js affiliate labeling and added an "affiliate clicks by partner" scoreboard row (GA4 linkDomain). **Day 4 (durability audit, docs truth-up/Beehiiv purge, Operator Handbook, retro) not started — pick up in a fresh chat per Fable-Sprint-2026-07.md.**


**PM session 2026-07-04 (funnel routing, calc SEO, bug fixes — all shipped + verified live):**
- Diet-based signup routing live: carnivore→CW drip, keto/low-carb→KetoDial newsletter + KD welcome email, pescatarian→held on CW newsletter, unknown→CW drip. Worker (`handleBeehiivSubscribe` in api/calculator-api.js) + frontend (`calculator.html` now sends `diet_type`). Killed the day-28 keto router; unified finale with soft KD off-ramp. `funnel_by_diet` DB view feeds the weekly scoreboard; sprint task 3.6 (calc SEO) also done here.
- Calculator SEO (3.6): title/H1/meta/OG lead with "carnivore diet calculator"; 2 new FAQ entries (calorie-calculator, fat-to-protein-ratio) for the GSC cluster ranking pos 5-9.
- Bug fixes: 4 mobile-overflow bugs on calculator.html + sitewide `.site-title` overflow (global.css); payment-redirect scroll race (scrollToAnchor now polls for the anchor + cancels stale scrolls — CalculatorApp.tsx, rebuilt to bundle index-Cit1EhrW.js); un-broke update-references.mjs (was crashing every build on a deleted legacy file).
- Perf: calculator images 38.9MB→10.2MB on disk (visitor download ~2.9MB→~800KB). NEW: LCP 7.3s mobile lab (poor) filed as its own task (defer gtag, lazy-load bundle, self-host 1 Unsplash image); CLS 0.036 is green.
- ISSUE-033 (Pages "try again later") recurred; fresh dispatch fixed. Rule tightened: never rerun-failed.

**Current Focus:**
Executing the Jul 4-7 revenue sprint (`Brew-Vault/00-Core/Fable-Sprint-2026-07.md`). Day 1 and Day 2 are fully done. Day 1: webhook fixes, drip 7→30 days, WELCOME5 coupon, paid-report persistence alert, scoreboard truth-pass automation. Day 2: Keto Starter Kit bundle shipped a day early and live at $21.99 CAD (listing 4532542805, price ladder now $4.49 → $7.99 → $21.99); Etsy title/tag rewrite (2.4) finished across all 14 listings that scored above the audit threshold; task 2.3 (image refresh) reassigned permanently to Brew (Nano Banana needs hands-on iteration, not a batch job). Day 3 (distribution) started: 3.3 (KD backlink plan, 10 verified targets + 2 outreach drafts) and 3.1a (KD Pinterest queue replenish, 41→65 queued past the Jul 8 drain date) both done. Remaining Day 3: 3.2 (drip cross-promo, mostly satisfied already), 3.4 (newsletter), 3.5 (scoreboard distribution rows), 3.6 (CW calculator SEO — sprint's own "cheapest lever" pick). Day 4 (automation durability, docs truth-up, Operator Handbook) not started.

---

## Outstanding TODOs

- **Etsy content series** — Sarah's bridal Etsy series: posts 1-2 shipped (May 19, May 30), posts 3-4 not yet written.
- **Scheduled task auth (ISSUE-001)** — ✅ FIXED (fixed since May 30 restructuring; entry was stale)
- **Author profile pages** — /about.html#sarah-whitfield etc. needed for Google Quality Raters
- **Author bio/photo block in template** — Only byline + schema updated; no visible bio on posts
- **PubMed citation links** — PMIDs exist in posts but aren't hyperlinked
- **Calculator CTA conversion tracking** — ✅ DONE (May 24) — diet_selected, completed, email_cta, product_cta events live
- **Internal linking** — ✅ DONE (Jul 13 EXP-002 added 6 in-prose calculator links to high-intent legacy posts; Jul 19 consolidated 15 anchors across the cluster)
- **Starter plan page traffic** — Only 3 views/30 days (down from 18/week)
- **Newsletter migrated to Beehiiv** — superseded: Beehiiv deprecated, all email in-house via Resend as of late June 2026
- **Backfill E-E-A-T signals** — 75+ existing posts still lack new writer identity signals
- **Etsy buyer message** — Updated copy written by Sarah; needs to be pasted into Etsy dashboard
- **Old blog images** — 43 posts (Apr+May) have no article images. NOT backfilling — only generating for new posts going forward.

---

## Latest Session (2026-05-26 — Blog Recovery + Image Pipeline Fix)

### Blog Queue Recovery
- 7-day publishing gap (May 20-26) — daily cron had nothing to publish
- Root cause: scheduled task auth fails every week (ISSUE-001, recurring since May 5)
- Generated 9 new posts: 3 Sarah (health), 3 Marcus (performance), 3 Chloe (community)
- 7 posts set to published (May 20-26 backfill), 2 queued ready (May 27-28)
- All 9 posts have article images generated via Replicate
- Total blog posts: 139

### Image Pipeline Fixed
- Root cause: `generate_post_images.py` was never added to any automated pipeline (ISSUE-010)
- Fixed in: SKILL.md Step 5, weekly_content_prompt.md Step 3
- Images built locally during weekly batch, committed to repo, deployed by daily cron
- CI (daily_publish.py) does NOT run Replicate — images ship with content
- 43 older posts still missing images — NOT backfilling per Brew decision

### Newsletter Migrated to Beehiiv
- MailerLite deprecated (12.5% open rate due to shared IPs)
- Beehiiv free Launch plan (2,500 sub limit)
- Signup endpoint: Cloudflare Worker → Beehiiv API
- Welcome email enabled, drip automation not on free plan

### Etsy Series Status
- Sarah's 4-week bridal Etsy content series: post 1 live (May 19), posts 2-4 not written
- Will be spaced out with other content between (not an "Etsy dump")

---

## Previous Session (2026-05-25/26 — Hermes Recommendations + Audit Fixes)

### Protocol Preview Teaser (commit 7848920)
- `ReportPreviewTeaser.tsx` — static masked preview on Step 3
- Shows fictional complex profile (insulin resistance, food intolerances, budget, sedentary)
- Visible: executive summary, sample Day 1 meals, Week 2 adaptation
- Locked: 6 sections behind blur/gradient with gold CTA
- New GA4 event: `calculator_preview_unlock_click`

### Upgrade Card Tightened
- Removed verbose 6-bullet card with $97/$79/$69/$53 value badges
- Now: 3 clear bullets + "$29 — Yours forever" + simple guarantee

### Hero Diet Language Broadened
- calculator.html h1: "Free Carnivore, Keto & Low-Carb Macro Calculator"
- Title/OG/Twitter meta tags updated to match

### Hermes Visual Audit Fixes (commit 41a07a9)
- P2: Payment modal header color fixed for contrast
- P2: Success card box-sizing/maxWidth fixed for mobile
- P1: GA4 preview event verified in source + production bundle (needs real traffic confirmation)

### Other Changes
- Etsy link updated from dead printable to bundle ($7.99) (commit 12e2c78)
- Feedback modals added to 4 pages (commit 032a1ea)
- 245 dead files cleaned up (commit 04ac96e)
- .gitignore cleaned up

---

## Previous Session (2026-05-24 — Hermes Onboarding + Measurement Sprint)

### Hermes Onboarded
- Growth/Ops Analyst role, communicates via Brew-Vault GitHub repo
- First spec delivered and executed same day (calculator tracking)
- Claude is CAO, Hermes advises, Brew has final say

### Email Capture Fixed (Was Silently Broken)
- starter-plan.html: N8N webhook → Cloudflare Worker (N8N had broken Supabase JWT)
- index.html: wrong form ID + Supabase client → corrected selector + Worker fetch
- calculator.html + keto-macro-calculator.html: added capture forms (didn't exist before)
- Uploaded MAILERLITE_API_KEY to Cloudflare (was missing)
- End-to-end tested: form → Worker → MailerLite → correct group → automation triggers

### Calculator Diet-Selection Tracking (GA4)
- `calculator_diet_selected` — fires on diet dropdown change
- `calculator_completed` — fires when results shown (step 3)
- `calculator_email_cta_clicked` — fires on post-calc email form submit
- `calculator_product_cta_clicked` — already existed as `calculator_upgrade_click`
- Fixed: tracking was in dead CalculatorWizard.tsx, moved to active CalculatorApp.tsx
- Rebuilt and deployed React app with new bundle hash

### Scoreboard
- `data/scoreboard.json` — baseline week (May 19) with all metrics
- Calculator tracking fields added (null until ~48h data collection)
- Brew-Vault `scoreboard.md` pushed for Hermes

### Team Overview Document
- Full architecture writeup: writer agents, memory system, why we chose this design
- Wins and losses honestly documented
- Current state: 131 posts, 72 sessions/week, $3.91 net profit, 62x gap to $1k target

---

## Previous Session (2026-05-19 — CLAUDE.md Consolidation + Docs Purge)

### CLAUDE.md Cleanup
- Project CLAUDE.md: 1,012 → 281 lines. Only prescriptive rules remain.
- Root CLAUDE.md: 286 → 136 lines. Global rules only, zero CW-specific content.
- Applied Prescriptive Test: rules stay in CLAUDE.md, facts move to memory files.
- Fixed Leo/MCP contradiction: Leo designs SQL but cannot execute MCP tools.

### Memory System Established
- 12 memory files created at `.claude/projects/.../memory/`
- Covers: credentials, Supabase config, Stripe MCP, newsletter workflow, autonomous pipeline, calculator validation, goals, user profile, feedback rules
- MEMORY.md index file for discoverability

### Stale Documentation Purge (251 files, ~95K lines)
- Deleted: docs/architecture/ (34), docs/specs/ (40), docs/qa/ (19), docs/design-system/ (18), docs/systems/ (11), docs/getting-started/ (11), docs/agents/ (12), api/ (12), calculator2-demo/ (13 .md files)
- Deleted: AGENTS.md, FAQ.md, START_HERE.md, STATUS.md, brand-kit.md, style-guide.md, etc.
- Archived: agent reports, visual baselines, daily logs → docs/archive/reports-archive/

### Agent Cleanup
- Deleted: casey.md, jordan.md, alex.md, eric.md, sam.md (both agents/ and .claude/agents/)
- Casey/Jordan refs in scripts (generate.py, full-validation-sweep.py, seed_writer_data.js) are harmless — low-priority future cleanup
- Active agents: Quinn (ops), Sarah/Marcus/Chloe (writers), Leo (DB design)

### Commit
- `5c25235 chore: consolidate CLAUDE.md and purge 95K lines of stale docs`
- Branch: claude/magical-leavitt-11291e (pushed to remote)

---

## Session (2026-04-13 — Pipeline Fix + Etsy Review)

### Daily-Publish Pipeline Bug — FIXED (commit 208b5ab)

**Root cause:** `.github/workflows/daily-publish.yml` line 37 used `git diff --name-only` to detect new blog HTML files. But new files are **untracked** — `git diff` only sees modifications to already-tracked files. So new posts were generated in the runner, but `has_changes` was always `false`, the commit step was skipped, and the HTML was thrown away. Every day from Apr 8-12 the workflow ran, published posts in memory, and discarded the results.

**Fix:** Changed to `git add -A` before the diff, then `git diff --staged --name-only` to detect both new and modified files.

**Impact:** 5 posts sat unpublished for up to 5 days. Sarah's Apr 8 post (published manually on Apr 8) was live but showed 404 initially because the index listed it before the HTML existed.

**Verification:** All 5 backlogged posts manually published and pushed. Workflow fix deployed — future runs should commit correctly.

### Missing Hero Images — PATCHED (commit 1a09ecd)

**Root cause:** 12 posts (Mar 15 onward) never had hero images generated. The "Validate & Deploy" workflow treats missing images as critical and exits with code 1, blocking deployment.

**Fix:** Copied placeholder images for all 12 posts. These are identical copies — proper unique images still need to be generated.

### Etsy Sales & Cross-Sell

- 4 total Etsy orders: 2x Keto Food List, 1x Lion Diet, 1x Pescatarian (CA$4.49 each)
- **Zero Etsy referral traffic** to carnivoreweekly.com in GA4 — old buyer messages had no links
- Sarah wrote updated "Message to buyers" for both digital and merch purchases
- Digital message includes free calculator CTA + ETSY50 discount code for all diet types
- Messages not yet applied in Etsy dashboard — needs manual paste

### E-E-A-T Overhaul (from Apr 7 session, context carried forward)

- Writers got full names: Sarah Whitfield, Marcus Cole, Chloe Navarro
- Conference memories created (~800 words each) for first-person experience signals
- Cross-referencing rules: writers reference each other's previous week articles only
- Affiliate links: LMNT + ButcherBox integrated; Amazon discontinued
- Template updated: full author names in byline + enhanced Person schema with url/image
- Generator updated: full name lookup dictionary

### Site Traffic (7-day snapshot, Apr 6-13)

- 44 users, 53 sessions, 101 pageviews
- Calculator: 28 views (17 users) — still #1 draw
- Starter plan: 3 views in 30 days — effectively dead
- Sources: 105 direct, 30 Google, 15 DuckDuckGo, 7 Bing, 2 ChatGPT
- No Etsy referral traffic at all

---

## Session (2026-04-05 — Security Hardening + GSC Push)

### Email Deliverability — FIXED
- DMARC record added: `v=DMARC1; p=none; rua=mailto:dmarc-reports@carnivoreweekly.com`
- SPF confirmed covering MailerLite; DKIM live for Resend
- All three DNS checks now pass — emails should stop hitting spam

### Supabase Key Rotation — COMPLETE
- Old key rotated in Supabase Dashboard
- New key updated in: Wrangler (carnivore-report-api), secrets/api-keys.json, apply-migration.js, apply-migrations.js, VERIFY_WRANGLER_SETUP.sh
- Deploy scripts refactored to read key from secrets/api-keys.json at runtime — no more hardcoded keys

### Supabase CLI
- Logged in with personal access token (stored in secrets/api-keys.json → `cli_access_token`)
- Can now apply migrations directly without dashboard SQL editor

### RLS Migration Applied
- Dropped `rls_public_update_calculator2_sessions` — anon users could update any session
- Dropped duplicate `select_calculator2_sessions` policy
- Migration file: `supabase/migrations/20260405_tighten_calculator2_sessions_rls.sql`
- Applied directly in Supabase SQL editor (confirmed: no rows returned = policies gone)

### GSC Indexing Push
- GSC report pulled: 97 submitted in sitemap, 6 of 20 recent posts indexed
- 14 unindexed March posts submitted to Indexing API
- Sitemap resubmitted to GSC
- Adaptation timeline post: 3,535 impressions / 3 clicks (0.08% CTR) — title rewritten

### Adaptation Timeline CTR Fix
- Old title: "How Long Does Carnivore Adaptation Take? Week-by-Week Timeline"
- New title: "Carnivore Flu Timeline: When Does Adaptation Actually End?"
- New meta: "Week 2 feels like quitting. Here's exactly what's happening in your body each week of carnivore adaptation — and when most people finally turn the corner."
- H1, OG, Twitter, schema all updated. Deployed to Cloudflare Pages.

### File Cleanup
- Deleted: WealthSimple monthly statements (5 files), TD account activity (9 files), crypto_transaction_summary.csv, investment_holdings.csv, Apple Watch ECG exports (13 files)

---

## Previous Session (2026-03-06 — Maintenance + Hardening)

- 4 GSC 404s fixed, YouTube Shorts filter deployed, Supabase migration 029, video section silent bug fixed, trending topics link hardening, 12 March posts submitted to Indexing API

---

## Current Status: PRODUCTION - FULLY OPERATIONAL

**All Features Working:**
- Calculator: Full flow + Stripe $29 + PDF + conversion tracking
- Blog: 70+ published posts, 3-wall validation, daily-publish cron active
- Email: DKIM/SPF/DMARC live; MailerLite 7-day drip + newsletter groups
- Feedback: Worker → Supabase content_feedback
- GSC Tooling: gsc-report.js + gsc-request-indexing.js
- Etsy: 14 active listings, API scripted
- Supabase: CLI logged in, MCP connected, 30+ tables, keep-alive active
- Weekly Automation: run_weekly_update.sh (Sun + Wed midnight UTC)

---

## Next Session Priorities (Updated 2026-04-05)

1. **Check GSC** — Are 14 March posts + 3 newly sitemapped posts indexed? (24-48h from submission)
2. **Calculator conversion tracking** — Add event tracking to CTA clicks
3. **Internal linking** — Link indexed posts to calculator
4. **Starter plan page** — Figure out why traffic is flat at 18 views/week
5. **Affiliate hub page** — Starter Kit roundup

---

## Evening Session (2026-04-05 — Validation + CI Fix)

### CI Fix
- `gsc-request-indexing.js` existed locally but was never committed — daily-publish workflow failing with exit code 1
- Fixed: committed the file, pipeline green on manual re-run
- **Lesson:** Any script referenced in a GitHub Actions workflow must be tracked in git

### Full Site Validation
- `validate_before_commit.py` → 129 warnings, 0 critical
- W3C (`validate-w3c.sh`) → 90/90 real posts pass; 2 redirect stubs flagged (expected)

### Fixes Applied
- 3 posts missing from sitemap added (Mar 27, 29, 31) — were invisible to Google
- 89 post images batch-patched with `width="1200" height="630" loading="lazy"` (CLS)
- Blog post template img tag fixed — all future posts get attributes automatically
- SEO hard rules added to Sarah, Marcus, Chloe agent self-check sections
- 19 long titles rewritten by writer agents in parallel — all now ≤60 chars

### Key Lesson: Writer agents > batch sed for content edits
Batch sed truncates blindly. Writer agents read the post, understand the topic, and write keyword-forward titles. Always use agents for title/meta rewrites.

## 2026-07-03 — Sprint plan of record (read this first)

A 4-day revenue sprint (Jul 4-7) is planned and pre-verified. Before doing ANY work in this repo:
1. Read `/Users/mbrew/Documents/Brew-Vault/00-Core/Fable-Sprint-2026-07.md` — day-by-day tasks with model tiers, pre-flight results (Supabase/Stripe/GA4/Etsy all verified working Jul 3), and live baseline numbers.
2. Read `/Users/mbrew/Documents/Brew-Vault/04-Systems/Projects/Carnivore-Weekly/reports/technical-handoff-map-2026-07-03.md` — repo topology, the six landmines (manual Vite rebuild, submodule two-step, `--env production` deploys, dual Etsy token stores, shared DRIP50/ETSY50 coupon, KD generator contamination), and the confirmed cross-product Stripe webhook bug (task 1.3).
Key correction vs older notes in this log: the "amount-capture bug" and "ISSUE-001 recurring" framings are stale; see the handoff map.

## 2026-07-05 — LCP fix plan ready (calculator.html + homepage hero)

Full execution plan: `docs/plans/lcp-calculator-plan-2026-07-05.md` (Sonnet-tier, escalate only if the carousel or payment flow breaks). Key facts: the 7.3s measurement PREDATES the Jul 4 evening fixes (gtag defer, font swap, lazy bundle loader are all already live — do not redo). The remaining bug: mobile hides the hero pyramid carousel at <=480px but still downloads CarnivorFP.webp (113KB) at fetchpriority=high; all four pyramid images ship 2816px wide with no srcset; and the Jul 4 image-compression pass missed /images/ (three PNGs at 1.2-1.7MB). Plan = measure first (local Lighthouse, PSI quota is 429'd), responsive media-gated sources + 1px placeholder for mobile, compress the missed PNGs same-filename, verify payment flow + SEO tags unchanged before push.

## 2026-07-09 — Email infra + on-site shop shipped (evening session)

**Newsletter fixed:** ISSUE-041 — Sunday send had silently failed since 07-05 (KD post leaked into CW pool via missing site filter + CI log filter swallowed the abort). `get_recent_cw_posts()` now site-filters; slug resolver auto-corrects wrong-date hallucinations against published-CW-only; mid-drip subscribers suppressed from weekly sends (send_newsletter.py). July 9 issue sent to 37.

**Inbound email LIVE:** @carnivoreweekly.com receives mail (Resend receiving toggle was off — enabled via API). Webhook now includes email.received + email.failed → drip_events. Writer addresses (sarah@/marcus@/chloe@) published on both About pages + CW footer. Daily 8AM scheduled task `writer-inbox-daily-check` drafts replies for approval. All customer-facing reply-tos flipped to newsletter@carnivoreweekly.com. Memory: reference-resend-inbound.md.

**Data purge:** 504 QA/test rows deleted across 8 tables (ISSUE-040 3rd strike; bead v9j filed for endpoint guard). Clean baselines: 142 calc sessions, 2 paying customers ever, 31 CW / 1 KD newsletter.

**Recovery play:** Sarah emails to 4 abandoned checkouts with single-use 75% codes SARAH75BW/IG/SA/CW (expire 2026-07-16, Stripe coupon kSl0AsLw). Watch redemptions + replies.

**Carnivore Coach waitlist:** /coach.html live ($79 USD, 12-week program, Sept cohort). Day-7 drip PS pitches it. Endpoint /api/v1/coach-waitlist → coach_waitlist (site='cw', notifies Brew). GATE (pre-agreed): 5+ signups in ~2 weeks = build on KD Coach chassis; 0 = drop. **EXTENDED 2026-07-23 by Brew: the gate review date moves out to 2026-08-31, signups stay open, do not drop or close the waitlist before then** (see decisions.md 2026-07-23). Design: memory project-carnivore-coach.md.

**On-site shop:** /shop.html live — 4 carnivore PDFs via Stripe Payment Links (USD: 4.49/4.99/4.99/9.99, Etsy parity). Webhook fulfillment (fulfillShopOrder in calculator-api.js) emails PDFs from tokenized public/downloads/dl-c8596006aead02d8/ (robots-blocked, gitignore exception) with per-product soft upsell, paid-but-undelivered alert, GA4 purchase events. E2E verified with $0 promo checkout. report access_count now increments (was never wired). KD duplication checklist in bead s5w (target 07-10). New-page checklist: ISSUE-042 (canonical + meta description required by validators).

**Content queued:** 2 Sarah landing posts (07-19 women-over-45 macros, 07-20 starting after 60) + scheduled task adds reciprocal backlink 07-19. llms.txt live; GSC sitemap resubmitted.

## 2026-07-28 — W31 digest blockers cleared (pipeline hygiene, commit d03e207b)

All three blockers from the W31 cowork digest fixed and pushed:

**Image-before-post ordering race enforced.** `daily_publish.py` now defers any "ready" post whose `image` path is not on disk (CW: `public/`, KD: `ketodial/public/`) instead of flipping it to published. Deferred posts stay "ready" and the existing `<= today` backlog logic retries next run — no more rendering pages with missing-image refs that fail validation and break the deploy (the Jul self-healed incident class). Guard: `split_missing_images()`.

**Whole-tree staging eliminated.** `run_weekly_agent.sh` `git add .` → scoped list (`data/ public/ images/ templates/ newsletters/ ketodial/`); `run_weekly_update.sh` printed deploy instructions likewise. `weekly-update.yml` staged list drops the legacy roots (`blog/`, root `index.html`/`archive.html`/`channels.html`, removed in ed69de3e) so the `blog/blog/` mirror cannot be re-committed by CI even if a script recreates it. The `cp -r public/blog blog/` root cause was already gone (Jul 26 cleanup); this closes the staging half.

**Stale scheduler tasks deleted.** `cw-pipeline-dry-run` (one-time, fired 2026-04-06) and `backlink-women-over-45-cluster` (one-time, fired 2026-07-19) removed from the local Claude scheduler; SKILL.md files left on disk for prompt recovery.

---

## 2026-08-10 status

**Shipped today, all live and verified:**
- Saladino title tag + credit block on `public/calculator.html`, commit `ffd791af`, Pages deploy confirmed.
- Duplicate Doctor Prep Kit 4545904719 deactivated (reversible). Shop 43 to 42 active. 4550536874 untouched.
- Listings 4464217679 and 4464217699 built from 2 images to 8. Controls held: 4495055944 and 4495049647. Bestseller 4464219356 not touched.
- Bonus card coverage finished: 4540695544 and 4540678283 got `bonus-insert-carnivore.pdf` (diet matches the tracker), and 4540695558, 4540695566, 4540695590, 4540695604, 4550536874, 4495089980, 4545921306 got `bonus-insert-carnivore-weekly.pdf`. Applied by `etsy/add-bonus-insert-remaining.mjs`, appended last. Shop is now 42/42 active listings with a card: 16 CW-generic, 15 carnivore, 11 KetoDial. Verified by full sweep.
- Audit lesson: the first `bonus-insert` sweep was read through `tail -120`, which silently hid the head of the output and made 4545921306 (Blood Pressure Log) look covered when it had no card. Pipe the sweep to a file and count programmatically, never eyeball a truncated tail.
- Keto is now split the same way low carb is: the 11 pre-existing keto listings still point at ketodial.com, while the new keto meal plan card (4540695558) points at carnivoreweekly.com. Same rule both times, adding a new outbound pointer to another brand needs Brew, leaving an old one alone does not. Resolve when Brew rules on the KetoDial question.
- Bonus insert added to the 8 active listings that had none: 4482132169, 4513518786, 4513518746, 4516511462, 4516511480, 4513508150, 4495083342, 4495083454. Applied by `etsy/add-bonus-insert-to-8.mjs`, appended last so the paid product stays rank 1. Brew approved. Etsy dedupes by content, so all 9 listings carrying `bonus-insert-carnivore-weekly.pdf` share listing_file_id 1506104322436; remove per listing in Shop Manager, not by API delete. Nothing left uncovered after the second pass below.
- Listing 4464217699 (pescatarian) bonus insert swapped from the KetoDial card to new `bonus-insert-carnivore-weekly.pdf` (diet-neutral, CW-branded, carnivoreweekly.com/bonus). Built via `etsy/products/templates/build_bonus_inserts.py`, applied by `etsy/swap-pescatarian-bonus-insert.mjs`. New file id 1506104322436, old 1500921514076. Brew approved, pescatarian only.
- KetoDial cadence 7/week to 2/week via the `kd-blog-content-generation` task. Next generation run 2026-08-15, first slots 08-18 and 08-21.

**Open, needs Brew:**
- 50%-off sale expires 2026-08-15. Manual, Shop Manager only.
- Etsy Stats "How shoppers found you" screenshot for 4464219356 (bestseller down 47% on views).
- Which carnivore chart buyers actually receive: `etsy/products/pdfs/fridge-card-carnivore.pdf` is a sepia design, the live hero is the modern red one.
- 9 genuinely-keto CW listings still ship `bonus-insert-keto.pdf` pointing at ketodial.com (4464219356, 4513433391, 4532542805, 4495077633, 4516511490, 4514204763, 4513508098, 4495077741, 4489982664). Brew flagged for later 2026-08-10, not a bug until he decides. Separately, `4495056564` (Low Carb Cheat Sheet) keeps its KetoDial card, declined for now. Note the 2 low carb listings that gained a card on 2026-08-10 got the CW one, so low carb is now split between brands: 4495056564 points at ketodial.com, 4495083342 and 4495083454 point at carnivoreweekly.com.

**Known and expected, do not treat as regressions:**
- `blog-queue-watchdog.yml` will raise one false staleness alarm Mon 2026-08-17 from the one-time 7-day cadence transition gap. Close the issue, the 5-day threshold is correctly tuned.
- 3 pytest failures in `test_layout_integration.py` (missing `analysis` field) and the jest/playwright suites failing to load are both pre-existing, confirmed by stashing and re-running.
- Uncommitted: `etsy/build-foodlist-listing-images.py`, `etsy/_build/`, and `etsy/products/listing-images/food-list-buildout-2026-08-10/` (local only, nothing from it went live).

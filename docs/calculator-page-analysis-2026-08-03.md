# Calculator Page: SEO and Conversion Analysis

**Date:** 2026-08-03 (Pacific)
**Page:** https://carnivoreweekly.com/calculator.html
**Scope:** read-only analysis. No page, template, config or bundle was changed. Nothing was deployed, committed or pushed.
**Baseline:** live HTML fetched 2026-08-03 is byte-identical to `public/calculator.html` at HEAD (87,395 bytes), so source analysis and live analysis agree.
**Pre-read completed:** `Brew-Vault/04-Systems/Projects/Carnivore-Weekly/reports/technical-handoff-map-2026-07-03.md`

---

## TLDR

**The page is not too long. The walk to the calculator is too long.**

On a phone, the first input box sits **9.1 screens down**. Roughly **half of mobile visitors (41 of 87 in 28 days) tap the "Start Calculator" shortcut button** rather than read the way down. They are telling you, with their thumbs, that the preamble is in the way.

Mobile bounces at **65%** against desktop's 49%, and mobile is 56% of your calculator traffic.

**Nothing needs to be deleted.** Three good teaching blocks are simply sitting in the wrong place. Cut and paste them to below the calculator and the walk drops from 9.1 screens to about 3.1. That is a one to two hour job, no copy rewritten, no work thrown away.

**Second best money move, 30 minutes:** the "Paul Saladino calculator" query cluster already ranks at positions 6 to 9 and earns almost no clicks (220 impressions, 2 clicks, 0.91% CTR over 3 months on one query). The ranking is won. The title tag is not cashing it in.

**Do not touch yesterday's offer copy yet.** It has two days of data. Judging it now would repeat the exact mistake the Aug 1 root-cause doc warned about.

---

## What changed on 2026-08-01

Commit `32d2bf20` "growth: reframe calculator offer to stall-first copy + instrument offer funnel."

Important for this analysis: **it did not change the page above the calculator.** The only edit to `calculator.html` was a one-line Vite bundle hash swap. The real changes landed in `Step3FreeResults.tsx` (+96 lines) and the Worker. So yesterday's work made the **results screen** longer and better targeted, and left the **path to the tool** exactly as it was.

The last change to the static page was `2fe02520` on 2026-07-28, which added one FAQ (the Saladino question) plus matching JSON-LD.

**Brew's 2026-07-29 diagnosis is therefore still live and still accurate.** Yesterday's work did not address it, and was not trying to.

---

## His four questions, each with a number

### 1. Is it too long?

**Yes on mobile, and only in one specific way: the distance to the tool. No on total word count.**

| Measurement | Mobile (375x812) | Desktop (1440x900) |
|---|---|---|
| Scroll distance to the calculator's first input | **7,363px = 9.07 screens** | 3,971px = 4.41 screens |
| Total page height | 15,207px = 18.7 screens | 8,476px = 9.4 screens |

Brew said "there's 10 pages above the calculator." Measured: **9.1 phone screens.** He was right to within a rounding error.

Total rendered body copy is **1,760 words**. That is unremarkable for a calculator page that has to rank. The word count is not the problem.

Breakdown of the 9.07 mobile screens:

| Block | Words | Mobile height | Screens |
|---|---|---|---|
| Hero (H1, subhead, 3 badges) | 30 | 592px | 0.7 |
| Intro copy plus Sarah quote | 199 | 1,549px | 1.9 |
| **How the Calculator Works** | 170 | 1,451px | **1.8** |
| **Protein Targets by Goal plus table** | 134 | 1,698px | **2.1** |
| **What the Full Carnivore Playbook Includes ($29)** | 87 | 1,693px | **2.1** |
| Medical disclaimer | 56 | 380px | 0.5 |
| **Calculator mounts here** | | at 7,363px | |
| FAQ (11 questions) | 765 | 5,002px | 6.2 |
| Email capture block | 50 | | |

The three bolded blocks total **4,842px, exactly 6.0 phone screens**, and every one of them teaches something the visitor could just as usefully read *after* getting their numbers.

**Supporting evidence that this is real and not theory:**
- `calculator_mobile_cta_click` fired **62 times across 41 distinct users** in 28 days. That floating "Start Calculator" button only renders on mobile, and only 87 mobile users visited the page in that window. **Roughly half of mobile visitors ask to skip the preamble.**
- Mobile bounce rate **65.0%** vs desktop **49.0%** on the same page. Mobile was 56% of sessions over 28 days and 71% over the last 7.
- Average engagement time is **122.8 seconds per user**. The page promises results in "90 seconds." Visitors are spending more time getting to the tool than the tool claims to take.

### 2. Is it too much information?

**No. The information is good. It is in the wrong order.**

The FAQ is the strongest asset on the page: 11 questions, 765 words, and a **zero percent overlap rate between answers** when tested for shared 5-word phrases. Every question targets a distinct query. It should not be touched.

The teaching blocks are also good. "How the Calculator Works" explains Mifflin-St Jeor. "Protein Targets by Goal" carries a comparison table plus a Layman citation, which is exactly the kind of passage AI search engines quote. The Playbook block sells the report with three real product images.

None of it is filler. It is 676 words and 6 screens of genuinely useful material standing between a visitor and the one thing they arrived to use.

### 3. Does it repeat too much?

**Mildly, and it is not your main problem.**

Verbatim repetition is low. Across all eight page sections, only two pairs share any 6-word phrases at all:

- Protein Targets table intro vs the "How much protein" FAQ: **8 shared phrases** (the 2g/kg and 0.9g/lb baseline, stated twice almost identically)
- Playbook pitch vs the "Is the calculator free" FAQ: **4 shared phrases** (the meal plan and doctor script bullets)

Thematic repetition is higher:

| Idea | Sections it appears in |
|---|---|
| The stall / plateau / scale not moving | **5 of 8** |
| Your goal changes your targets | 4 of 8 |
| Mifflin-St Jeor | 3 |
| "90 seconds" | 3 |
| Undereating protein by 20 to 30g | 3 |

The stall theme appearing five times is deliberate after yesterday's reframe, and defensible. The one genuine excess: **the $29 offer is pitched four separate times** before a visitor can decline it once. Static Playbook section, then the results bridge card, then the locked outline, then the final upgrade card. Recommendation R1 removes one of those from the path for free.

### 4. Is it exactly perfect?

**The parts are close to right. The sequence is wrong.** That is a good problem, because sequence is the cheapest thing on a web page to change and it costs you none of the work already invested.

---

## The growth pattern, confirmed

Brew: "we keep adding to it rather than really optimizing it."

`public/calculator.html` since 2026-05-01:

- **64 commits**
- **662 lines added, 249 removed, net +413**
- **1,260 lines to 1,673 lines, a 33% increase in three months**
- Exactly one commit in that window was a net shrink (Jun 10, minus 40 lines)

Verified. The page has only ever grown.

---

## Real data versus inference

### What the data actually said

**Google Search Console, `sc-domain:carnivoreweekly.com`.** Property string authenticated as siteOwner on the first attempt. No 403 occurred. The known wrong-property trap did not bite.

`/calculator.html`, last 28 days (2026-07-05 to 08-01):
- 32 clicks, 1,431 impressions, 2.24% CTR, average position 10.57
- Up sharply from the prior 28 days: 9 clicks to 32 (+256%), impressions 836 to 1,431 (+71%), position flat
- Mobile: position **7.11**, CTR 3.55%. Desktop: position **19.88**, CTR 0.99%

The Saladino and animal-based cluster, last 28 days, roughly **450 impressions at positions 6 to 9 earning 11 clicks (2.4% CTR)**. The worst single case over 3 months: **"paul saladino macro calculator", 220 impressions, 2 clicks, 0.91% CTR, position 7.51.** A page at position 7.5 should be earning 3 to 4 percent. This is a snippet problem, not a ranking problem.

Separately, a second cluster sits at positions 15 to 47 ("carnivore macro calculator" at 37.5, "carnivore diet calculator" at 34.2). Those are ranking problems and will not be fixed by a title tag.

**GA4 property 517632328, last 28 days.** `/calculator.html`: 287 pageviews, 221 sessions, 164 users. Bounce 58.4% overall, 65.0% mobile, 49.0% desktop.

Funnel by distinct users:

| Stage | Users |
|---|---|
| calculator_step1_viewed | 127 |
| calculator_step1_completed | 46 |
| calculator_step2_completed | 45 |
| calculator_free_results | 65 |
| calculator_payment_modal_opened | **3** |
| begin_checkout | 2 |
| purchase | 2 |

This matches the Aug 1 root-cause verdict exactly: the funnel dies between free results and the payment modal, not at checkout.

### What is inference, not data

- That reordering the page will lift conversion. The reasoning is: half of mobile users already ask to skip the preamble, mobile bounces 16 points worse than desktop, and mobile is the majority of traffic. That is a strong chain, but it is a hypothesis until measured.
- That moving teaching content below the calculator will not cost rankings. Inference from precedent on this same page: the Saladino FAQ added Jul 28 sits below the calculator and holds positions 6 to 9 with 550-plus impressions. Below-the-tool content on this URL demonstrably ranks.
- That the title tag is what is suppressing Saladino CTR. Position 7.5 with 0.91% CTR is roughly a quarter of expected. Title and snippet are the usual cause, but a SERP feature above the fold could also explain it and was not checked.

---

## Recommendations, ranked by likely revenue impact

### R1. Move three blocks below the calculator. SURGICAL. 1 to 2 hours.

Reorder `public/calculator.html` only. Target order:

hero → intro copy → disclaimer → **calculator** → How the Calculator Works → Protein Targets by Goal → What the Full Carnivore Playbook Includes → FAQ → email capture

This is cut and paste of existing `<div>` and `<section>` blocks. **No copy is rewritten. Nothing is deleted. No React, no Worker, no Vite rebuild.**

Effect: mobile scroll-to-tool drops from **9.07 screens to approximately 3.1** (a 66% cut). Desktop drops from 4.41 to approximately 1.9.

Why this is the top revenue item: the 41 mobile users per month who tap "Start Calculator" are the ones who *found* the shortcut. The 65% who bounced on mobile largely did not. Every visitor who reaches step 1 is worth an email address at minimum and a $29 sale at best, and right now the page asks for six screens of reading first.

Bonus: it also drops the pre-calculator $29 pitch out of the path, taking the offer from four surfaces to three, without deleting it.

Risks and how to hold them:
- The `#calculator-slot` container currently wraps the three blocks *and* the mount point. Keep `#calculator-start` and `#root` where the mobile CTA and the payment-return scroll anchor can still find them (`cwScrollWindowTo`, `scrollToAnchor` in `CalculatorApp.tsx`, and the `?payment=` eager-load branch all depend on those IDs).
- Re-test the Stripe payment return scroll, which lands on `#calculator-start`.
- Watch GSC position on the calculator cluster for two weeks.

### R2. Rewrite the title tag for the Saladino cluster. SURGICAL. 30 minutes.

Current title, 60 characters: `Free Carnivore & Animal-Based Diet Calculator: Macros & TDEE`

It says "Animal-Based" but never says "Saladino," and Saladino is what people are typing. That cluster is your best-ranked, worst-converting traffic: roughly 450 impressions per 28 days at positions 6 to 9, earning 11 clicks.

Get "Saladino" into the title or the opening of the meta description. If a doubled CTR is achievable on an already-won ranking, this is the highest revenue-per-hour item on the page.

Hold: change the title only, measure two weeks, do not stack it with R1 in the same week or you will not know which one moved. Suggest R1 first (it is a conversion change, invisible to the SERP), then R2.

### R3. Fix the funnel instrumentation before judging any offer change. SURGICAL. About 1 hour.

Four measurement holes found:

1. The `step` custom dimension is registered in GA4 but resolves to `(not set)` on **100%** of calculator events.
2. `calculator_payment_cancelled` has **never fired**, in any window. Either not implemented or not wired.
3. `scroll_depth` runs on `/blog/`, `/`, `/channels.html` and `/index.html` but **never fires on `/calculator.html`**. On the single page where scroll distance is the central question, there is no scroll data. This is the number that would have settled the "too long" argument outright.
4. `calculator_offer_impression` shipped on 2026-08-01 and has 3 events from 2 users. Per the project's own rule from the Aug 1 verdict, never trend an event across its own instrumentation date. It needs two to three more weeks.

Revenue impact is indirect but it gates every future decision on this page, including whether R1 worked.

### R4. Consolidate the offer surfaces. STRUCTURAL, needs Brew's go-ahead. 2 to 3 hours.

The $29 is pitched four times: static Playbook section, results bridge card, locked outline, final upgrade card. R1 removes the first from the path for free. Merging the bridge card and the final card is worth considering after that.

**Explicitly hold this until roughly 2026-08-20.** Yesterday's stall-first copy is the best-reasoned change on this funnel in months and it has two days of data. Changing it now destroys the read.

### R5. Investigate the desktop ranking gap. STRUCTURAL, needs go-ahead. About 2 hours.

Same URL, same 28 days: mobile position 7.11, desktop position **19.88**. Desktop impressions are 303 and clicks are 3. A 13-position spread between devices on one URL is unusual and worth understanding, but the absolute revenue at stake is small.

### R6. SEO hygiene. SURGICAL. 15 minutes. Minimal revenue.

- **Three H1 tags on the page.** The hidden refund and feedback modals inject "Request a refund" and "What would you like to see?" as H1s. Demote to H2.
- **`WebApplication` schema `dateModified` is stale** at 2026-07-04.
- **No `Product` or paid `Offer` schema** for the $29 report. The only Offer on the page declares `price: "0"`.
- **`og:image` is the site logo**, not a calculator screenshot. Weak social and AI-preview click appeal.

---

## What I could not verify

1. **Whether the mobile floating CTA hides correctly once the calculator is on screen.** It appeared to stay visible at every scroll position I probed, including with the calculator in view. **This is almost certainly a tool artifact, not a bug:** a control IntersectionObserver I installed myself fired zero callbacks in the same environment, so the headless browser available to me does not support the API the page relies on. Worth sixty seconds on a real phone to confirm, since a gold pill permanently pinned over the bottom of the viewport would sit on top of the calculator's own buttons.

2. **The height of the free-results screen, and where the three offer surfaces land on it.** Verifying this requires completing the calculator, which creates a real Supabase session, a drip subscriber, and live GA4 events. The Aug 1 root-cause doc specifically calls out `iambrew+funneltest` self-test rows as data pollution. I chose not to add more. Analysis of the results screen here is from source only.

3. **Whether the Aug 1 stall-first copy is working.** 3 offer impressions across 2 days is not a sample.

4. **GA4 revenue on this page does not reconcile with Stripe and should not be trusted yet.** GA4 reports 4 transactions and $164.24 across the last 28 days, on 2026-07-10 ($41.10) and 2026-07-13 ($123.14). The Aug 1 verdict, sourced from Stripe and Supabase directly, lists 2 paid calculator sessions in 90 days: $29 on Jul 5 and $14.50 on Jul 16. **Neither the dates nor the amounts match, and $41.10 is not a price this product sells for.** Something is inflating GA4 purchase value on this page. Worth its own short investigation before any revenue reporting leans on it.

5. **Whether R1 costs any rankings.** Reasoned from the FAQ precedent on this same URL, not measured.

6. **Real-device rendering.** All geometry above was measured in an emulated 375x812 and 1440x900 viewport against the live site, not on a physical phone.

---

## Suggested sequence

1. **R3** (instrumentation) first, so R1 can be measured. Same day as R1 is fine.
2. **R1** (reorder). Measure two weeks: mobile bounce rate, `calculator_step1_viewed` users, `calculator_mobile_cta_click` (it should *fall* if R1 worked, because fewer people need the shortcut).
3. **R2** (title tag). Two weeks alone.
4. Around 2026-08-20, with three weeks of `calculator_offer_impression` data, revisit **R4**.
5. **R6** whenever convenient.

Do not do R1 and R2 in the same week.

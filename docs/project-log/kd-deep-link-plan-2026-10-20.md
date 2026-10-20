# KD deep-link plan: CW articles link to specific KD articles (2026-10-20)

**Status:** shipped 2026-10-20 (12 links). Brew approved the pairs and the writers' sentences.

## Why
- Google has indexed 1 of 166 KD sitemap URLs (the homepage). 13 of 15 sampled KD URLs are "URL is unknown to Google" (never crawled), although the sitemap was downloaded 2026-10-07. This is a crawl-demand problem, not a page-quality verdict.
- 279 CW pages link to KD and the links are followed (`rel="noopener"` only), but 277 of them are the site footer link to the KD homepage calculator. That homepage is the one indexed KD page.
- Contextual links from CW articles Google already crawls give it a path to specific KD articles.

## Rules for this change
- One sentence and one link per CW page, inside the body, written by the post's writer (Sarah, Marcus or Chloe). It follows the 2026-10-15 diet-flexibility decision: moving between diets by goal is normal. No health claims.
- Full `https://ketodial.com/...` URLs (ISSUE-038). No UTM on these links, so they look like normal editorial links.
- Skipped: the 16 posts in the 10-03 early-calculator test, the Period/Cycle post (measured from 10-20), High Ferritin (untouched comparison page), the 5 electrolyte-hold posts with their own pending early line (adaptation-timeline, night-sweats, fasting-protocols, sleep-insomnia, women-over-40), and the buyer bridge pages (Food List, Meal Plan Guide), so readers are not sent away from where they buy.
- Check the Marcus consolidation list before shipping. Do not add links to a post about to be merged.
- The footer link stays as it is.

## Pairs (14). CW clicks = 56 days of GSC to 2026-10-17
| CW post | CW clicks | CW pos | KD target |
|---|---|---|---|
| best-macro-calculator-carnivore-keto-low-carb | 58 | 10.8 | full-day-of-keto-macros |
| endurance-running-marathon | 51 | 6.8 | keto-working-out-do-you-need-carbs |
| carnivore-fertility-conception | 25 | 8.8 | keto-pcos-meta-analysis |
| what-1500-calories-carnivore-looks-like | 24 | 5.6 | recalculate-macros-every-10-pounds |
| carnivore-recomp | 23 | 5.6 | high-protein-keto-macros |
| appetite-loss-carnivore | 22 | 5.2 | am-i-eating-enough-on-keto |
| knee-pain-arthritis-after-60 | 19 | 8.2 | keto-meal-plan-beginners-first-7-days |
| carnivore-a1c-90-days | 14 | 5.4 | keto-blood-sugar-first-30-days |
| 80-20-or-93-7-ground-beef | 14 | 6.8 | keto-protein-foods |
| hair-shedding-carnivore-month-three | 10 | 6.6 | keto-hair-loss-month-3 |
| histamine-intolerance-carnivore | 8 | 6.5 | keto-gut-health-microbiome |
| womens-health | 7 | 10.0 | keto-women-cycle |
| carnivore-cheat-reentry-protocol | 7 | 5.9 | why-you-quit-keto-last-time |
| carnivore-sleep-week-3 | 7 | 5.7 | keto-insomnia-3am |

All 14 KD targets return 200 and none is linked from its CW post today.

## Baseline (2026-10-20)
- All 14 KD targets: "URL is unknown to Google".
- KD: 1 indexed URL; 0 Google clicks and 11 impressions over 28 days to 10-17.
- CW posts: clicks and positions above.

## Read
- **2026-11-17** (4 weeks after shipping): URL Inspection on the 14 targets (crawled? indexed?) against 14 KD URLs that got no new link, plus KD indexed count and impressions. Check the 14 CW posts' positions for any drop.
- Win: targets get crawled or indexed and the comparison URLs do not.

## Separate, manual (Brew in GSC): "Request indexing"
1. https://ketodial.com/blog/keto-meal-plan-beginners-first-7-days.html
2. https://ketodial.com/blog/
3. https://ketodial.com/blog/keto-grocery-list.html
4. https://ketodial.com/blog/full-day-of-keto-macros.html
5. https://ketodial.com/blog/keto-cramps-decision-tree.html

Requesting some of the 14 targets would blur the read. Items 1 and 4 are in the plan; if Brew submits them, count them out of the read.

## What shipped (2026-10-20)
- 12 links. Sentences drafted by Sarah and Marcus. Changes from the draft above:
  - best-macro-calculator swapped for rabbit-starvation-fat-floor -> too-much-fat-keto, because the Marcus consolidation plan upgrades best-macro-calculator (read about 11-13).
  - histamine-intolerance dropped. The KD gut page recommends high-histamine foods, and no KD page covers histamine.
  - womens-health pulled from the batch. The validator blocks it for a pre-existing universal magnesium dose ("300-400 mg"), a separate safety fix for Brew.
- Side effect: the wiki auto-linker's 5-link cap dropped no wiki links on the 12 posts that shipped.

## Tracking
- Script: `python3 dashboard/kd-deep-link-read.py [--save]`. It compares the 12 LINKED KD pages with 12 CONTROL KD pages that have no CW link anywhere (random, seed 20261020). Measures: GSC URL Inspection (crawled? indexed?), KD GSC clicks and impressions, KD GA4 sessions from carnivoreweekly.com by landing page, and the 12 CW source posts' 28-day clicks and positions.
- Baseline 2026-10-20 (`dashboard/kd-deep-link-snapshots/2026-10-20.json`): LINKED crawled 1/12, indexed 0/12; CONTROL crawled 0/12, indexed 0/12; 0 impressions in both groups.
- Reads: 2026-11-03 (two-week pulse) and **2026-11-17** (verdict). Win: LINKED gets crawled or indexed and CONTROL does not. If Brew requests keto-meal-plan-beginners-first-7-days by hand, count it apart.

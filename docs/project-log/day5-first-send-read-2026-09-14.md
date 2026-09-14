# Day 5 first-send read (bead `carnivore-weekly-u05p`)

**Date:** 2026-09-14 (Pacific)
**Scope:** READ ONLY. Nothing in the drip sequence, config, copy, question state or subscriber data was changed. No send, no deploy, no flag flip.
**Data source:** Supabase PostgREST, `drip_events`, `drip_survey_questions`, `drip_survey_options`, `drip_survey_responses`, `drip_subscribers`, `calculator_sessions_v2`. Database was reachable; every number below is measured, none estimated.

---

## Headline

**The new CW day 5 has been delivered to exactly 5 people, once, on 2026-09-13.** 5 delivered, 3 opened, 2 clicked, 2 banded answers recorded, both by one-tap from the email. Zero skips were logged because all five recipients happened to have `goal = lose` on their calculator row.

**The sample is too thin to settle the segmentation-versus-copy question.** The engagement numbers are directionally above baseline but rest on 5 deliveries. The skip question got literally zero evidence, because this cohort contained no one the rule would have excluded. Re-read on or after **2026-09-21**.

---

## Verification that the feature is actually live

`drip_survey_questions` for `question_key = 'goal_target'`:

| site | day | version | active |
|---|---|---|---|
| cw | 5 | 1 | **true** |
| kd | 5 | 1 | false |

CW is active, KD is still inactive as intended. `personalised_days()` in `scripts/send_drip.py` therefore returns `{5}` for CW, so the day-5 eligibility rule was armed at cron time. KD stays dormant.

The sends are identifiable by subject. The old day 5 was "When does the good stuff kick in? Here's your timeline". The new one is **"How long will this take? One tap and I'll show you."** and appears for the first time on 2026-09-13.

CW day-5 `sent` events:

| Date | Count | Subject |
|---|---|---|
| 2026-09-10 | 3 | old (timeline) |
| 2026-09-11 | 5 | old (timeline) |
| 2026-09-12 | 0 | no CW drip run |
| **2026-09-13** | **5** | **new (one tap)** |
| 2026-09-14 | 0 | run had not fired at time of reading (04:12 PDT) |

Observed send timestamps were 17:22 to 17:23 UTC on 2026-09-13, not the 09:00 EST the bead anticipated. Worth a glance if send timing matters, but it did not affect this read.

---

## 1. `drip_events` skipped rows and `skip_reason`

**Zero `event_type = 'skipped'` rows exist in `drip_events`. Not zero for day 5, zero all-time.**

This is correct behaviour, not a broken instrument. Every one of the five recipients carries `goal = 'lose'` with both `weight_value` and `sex` present on their most recent `calculator_sessions_v2` row, so `day5_eligibility()` returned eligible for all five and had nothing to log.

Recipient calculator context (addresses truncated):

| Recipient | goal | sex | weight | calc row |
|---|---|---|---|---|
| nur… | lose | female | 204 | 2026-09-08 |
| lin… | lose | female | 235 | 2026-09-07 |
| ash… | lose | female | 220 | 2026-09-08 |
| nan… | lose | female | 101 | 2026-09-08 |
| bbu… | lose | male | 218 | 2026-09-08 |

All five signed up in the same 2026-09-07 to 2026-09-08 window. They are a single self-selected intake batch, not a cross-section of the list.

### The segmentation risk is still real at list level, it was just not exercised

Current CW `drip_subscribers`: 232 total, **101 active** (not completed, not unsubscribed, not bounced). Joining each to their most recent calculator row:

| Calculator goal state | Count | Share of active | Day-5 outcome |
|---|---|---|---|
| lose | 60 | 59.4% | sends |
| null goal | 14 | 13.9% | sends (null is not a skip, by design) |
| **maintain** | 12 | 11.9% | **skips** `goal_not_weight_loss` |
| **gain** | 10 | 9.9% | **skips** `goal_not_weight_loss` |
| no calculator row | 5 | 5.0% | skips `no_calculator_context` |
| incomplete calculator context | 0 | 0% | n/a |

Explicit maintain or gain is **22 of 101 active, 21.8%**. That is lower than the 29% (37 of 125) measured on 2026-09-12, and the active base has shrunk from 125 to 101, so some of the movement is the base changing rather than the mix changing. Total projected skip rate across all reasons is 27 of 101, **26.7%**.

Narrowing to the subscribers who have not yet passed day 5 (the actual future day-5 audience, 27 people):

| Projected outcome | Count | Share |
|---|---|---|
| sends, goal = lose | 20 | 74.1% |
| skips, `goal_not_weight_loss` | 4 | 14.8% |
| skips, `no_calculator_context` | 3 | 11.1% |

So roughly **1 in 4 of the next cohort will be skipped**, and about 15% for the maintain/gain reason specifically.

### Verdict: segmentation versus copy

**Neither, on this evidence. The sample is too thin, and specifically the skip path was never touched.**

To be precise about what can and cannot be said:

- **The copy question has weak positive evidence.** 3 of 5 opened and 2 of 5 clicked through to the check-in and answered. That is above the frozen baseline on every measure, but see section 4 for how wide the error bars are.
- **The segmentation question has NO evidence at all.** Not a low number, not a null result: the rule produced zero decisions because no ineligible subscriber reached day 5 in this run. Any claim about whether the 29%/21.8% is "showing up in practice" would be manufactured.
- **The list-level data does say the segmentation exposure is genuine and will materialise.** It is 21.8% of the active list and 14.8% of the immediate pipeline. The rule will start firing in the next few runs, and then the question becomes answerable.

The honest framing is that the segmentation problem is a **known structural property of the list**, already measured twice, and the eligibility rule is the correct handling of it. What the first send does not tell us is whether the copy underperforms for the readers who do receive it, because there are only five of them.

---

## 2. `goal_target` band distribution

The six CW bands, in `display_order`:

| Band | Option text | Responses |
|---|---|---|
| 1 | Up to 15 lb | 0 |
| 2 | 15 to 30 lb | **1** |
| 3 | 30 to 50 lb | **1** |
| 4 | 50 to 80 lb | 0 |
| 5 | More than 80 lb | 0 |
| 6 | I don't have a specific number yet | **0** |

**Total responses: 2.** Response rate 2 of 5 delivered, 40%.

The sixth band, which was the piece of finished work waiting on this read, has **not been chosen once**. At n=2 that carries no information whatsoever. Two respondents cannot tell you anything about whether an escape-hatch option is being used; you would need on the order of 20 to 30 answers before a persistent zero on band 6 would start to mean something.

Both answers landed in the middle bands, which is consistent with the recipients' calculator weights (101 to 235 lb, four of five between 204 and 235), but two data points do not establish a distribution.

Four older `site = cw`, `day = 5` responses exist from 2026-09-11 against `checkin_energy`, `checkin_hunger`, `checkin_mood` and `checkin_weight`. Those questions are now `active = false`. They are the previous four-metric day 5, are anonymous (`subscriber_id = null`, `answered_via = null`), and are not part of this read.

---

## 3. One-tap versus page

| Channel | Count | Share |
|---|---|---|
| `answered_via = 'one_tap'` | **2** | **100%** |
| `answered_via = 'page'` | 0 | 0% |
| anonymous / no token | 0 | 0% |

Every answer came from a tap in the email body. Nobody landed on `journey-checkin.html` and chose a band there.

The click-to-record path is clean end to end. Both clicked URLs carry the tokenised check-in link with an `a=` option parameter, and both option ids resolve to exactly the bands that were subsequently recorded:

- click `a=15d67686…` maps to band 3, "30 to 50 lb", and a band-3 response was written at 18:25:46 UTC
- click `a=ca6cd871…` maps to band 2, "15 to 30 lb", and a band-2 response was written at 22:04:44 UTC

Both rows carry a real `subscriber_id`, so the identity join is working on live traffic. Two clicks, two answers, zero loss between the tap and the row. The mechanic works. Whether readers prefer it is a separate question that two events cannot answer.

---

## 4. Open and click against the frozen baseline

All rates are **unique recipients by distinct `resend_id`**, per the recorded project decision. Raw event counts are not used anywhere in this report.

| Metric | Baseline (frozen) | Day 5, 2026-09-13 | Difference |
|---|---|---|---|
| Delivered | 173 | **5** | n is 2.9% of baseline |
| Open | 48.6% | **60.0%** (3 of 5) | +11.4 pts |
| Unique click | 5.8% | **40.0%** (2 of 5) | +34.2 pts |
| Check-in click | 1.7% | **40.0%** (2 of 5) | +38.3 pts |

Every clicked URL was a `journey-checkin.html?day=5` link, so unique click and check-in click are the same two people.

Per-recipient breakdown, showing there is no double-counting:

| Send | delivered | opened | clicked |
|---|---|---|---|
| 78423e42 | yes | yes | yes |
| 2c4ef937 | yes | no | no |
| a4e690a4 | yes | no | no |
| 187a63af | yes | yes | no |
| 5baf74fd | yes | yes | yes |

Zero bounces, zero complaints on this send.

**How much of this is real:** 95% Wilson intervals at n = 5 are enormous.

- Open 60%, CI 23.1% to 88.2%. The baseline 48.6% sits comfortably inside. **Not distinguishable from baseline.**
- Unique click 40%, CI 11.8% to 76.9%. The baseline 5.8% falls below the lower bound, so this is nominally a real lift, but it rests on two click events. One more non-clicker moves the point estimate to 33%, and the whole claim turns on whether two particular people happened to tap. **Treat as encouraging, not as a result.**

The frozen baseline was built on 173 deliveries. Comparing 5 against 173 is not a comparison, it is a first look.

---

## When there will be enough data

27 active CW subscribers currently sit below day 5. Their positions:

| current_day | Subscribers | Reaches day 5 on approximately |
|---|---|---|
| 4 | 3 | 2026-09-14 |
| 3 | 4 | 2026-09-15 |
| 1 | 11 | 2026-09-18 |
| 0 | 9 | 2026-09-19 |

Assuming the daily cron holds, the full 27 will have passed day 5 by roughly **2026-09-19 or 2026-09-20**, producing an estimated **25 cumulative day-5 deliveries** and, at the projected 26% skip rate, about **7 skip rows** with a real `skip_reason` breakdown.

**Recommended re-read: 2026-09-21.** That allows two days of open and click settling after the last of the cohort receives it.

What 25 deliveries will and will not support:

- **Will support:** a first real `skip_reason` distribution, which is the whole segmentation question, because it goes from zero decisions to roughly seven; a first meaningful look at one-tap versus page; a first look at whether band 6 is ever chosen.
- **Will not support:** a defensible open or click comparison against a 173-delivery baseline. At n = 25 a 40% click rate still carries a CI of roughly 23% to 59%. Matching the baseline's precision needs on the order of 150 deliveries, which at current intake is months away, not days.

The practical consequence: **the segmentation question becomes answerable around 2026-09-21. The copy question does not, and should not be forced.**

---

## What stays frozen

Per the bead and the 2026-09-12 decision, nothing was changed. Day 5 remains frozen. This read does not by itself justify unfreezing:

- The **ninth symptom option** (day 3) is unaffected by this read either way. It is day-3 work and nothing here touches day-3 evidence.
- **Day 4** and **KD day 5 copy** are held behind the same gate.

Recommendation is to hold all three until the 2026-09-21 re-read, or to release them on the explicit basis that this read found no defect rather than on the basis that it produced a verdict. It did not produce a verdict. That is Brew's call, not an operational one.

---

## Integrity notes

- Read-only throughout. No INSERT, UPDATE, DELETE or RPC was issued. No email was sent. No worker deployed. No question activated or deactivated.
- No synthetic or fixture rows were created, so there is nothing to clean up.
- Credentials were read from `dashboard/.env` and never printed or written anywhere.
- All engagement figures are distinct-`resend_id` unique-recipient rates.

# PescoDial newsletter launch plan (draft, 2026-10-17)

Status: APPROVED by Brew 2026-10-17 (all three recommendations). Nothing goes live until Brew reads the --test email.

## Where things stand
- Template: done. Brew's design (2026-10-03) is `render_newsletter()` in `pescodial/scripts/pd_email_shell.py`. Preview: `~/Downloads/PescoDial-Email-Previews/pd-newsletter-sample.html`. Sample copy is a test fixture only, never sent.
- Sender: not wired. `scripts/send_newsletter.py --site` accepts cw, kd, kd_coach. No pd.
- List: 2 real active subscribers (both from the calculator, 2026-10-04) plus 1 bounced typo row. Both are mid-drip (signed up 10-04, drip day 28 lands about 11-01).
- Content to link: 2 live guides, `/guides/is-shrimp-bad-for-cholesterol/` (Sarah) and `/guides/7-day-pescatarian-meal-plan-weight-loss-after-50/` (Marcus). 2 more land each week (Saturday writing task).
- Unsubscribe: the signed link already supports `site=pd` (`scripts/unsubscribe_link.py`).

## Decisions for Brew
1. **Cadence. Recommend weekly, Sunday morning,** same day as CW and KD. The 2 guides a week give each issue a fresh question of the week without stretching. Alternative: every other Sunday until the list passes about 25.
2. **Mid-drip readers. Recommend PD follows the CW/KD rule:** nobody gets the weekly while still in the 30-day drip. Both current readers graduate about 11-01, so **first live issue: Sunday 2026-11-08.** Alternative: send to everyone from issue 1 (Sunday 10-25), which means 2 emails some days.
3. **Automation after issue 1. Recommend:** Sarah writes issue 1 by hand and you approve it. From issue 2, the Sunday job drafts each issue in Sarah's voice from that week's live PD guides, with issue 1 as the model. It sends only if every check passes. If a check fails, the issue is skipped and you get an alert, not a weaker email.

## Issue 1 (Sarah writes it, via the sarah-health-coach agent)
Follows the template's sections:
- Intro: welcome, what this email is, signed Sarah.
- Question of the week: "Is shrimp bad for cholesterol?", short answer linking the live shrimp guide.
- Recipe: a simple fish dinner in method form. No photo unless we have a real hosted one (no AI food images, no stock pretending to be ours).
- Shopping tip: one practical fish-counter or freezer-aisle tip.
- Calculator box: the free PescoDial calculator (`/#calc`).
- Reply question: one question readers can answer by hitting reply.
Rules: no doses, no medicine advice, no new clinical guidance (paid-report safety rule applies to email too). Product mention stays soft. Links only to pages that are live on pescodial.com today. No em-dashes.

## Wiring (one PR, in a worktree, tests before merge)
1. `send_newsletter.py`: add `pd` to SITES. From `PescoDial <sarah@pescodial.com>`, reply-to `pescodial@carnivoreweekly.com`, the same as the PD drip, so replies reach the daily writer-inbox sweep. Add `pd` to `--site` choices and to the mid-drip hold (if you pick option 2).
2. Issues live as JSON at `data/newsletters/pd/YYYY-MM-DD.json` and render through `render_newsletter()`. The subject comes from the issue file. No web archive page (no new URLs on a fresh domain).
3. Checks that block a send: every link returns 200, unsubscribe link present and signed for pd, the style and health checks (`check_newsletter_content` with site pd), test fixture addresses blocked.
4. Tests (`tests/test_pd_newsletter.py`, added to calculator-guard CI): renders from a sample issue, the unsubscribe tag is filled, `--test` reaches only the 2 test inboxes, mid-drip readers are held, a dead link stops the send. Each protection gets broken once to prove the suite goes red, then restored.
5. Update `docs/guides/email.md` with the PD newsletter row in the reply-to map.
6. Automation (decision 3): its own workflow, `.github/workflows/pd-newsletter.yml`, Sunday 14:00 UTC (7am PDT / 6am PST), separate from `weekly-update.yml` so a PD failure cannot touch the CW/KD sends. `scripts/pd_newsletter.py` does nothing before 11-08.

## Timeline
| When | What |
|---|---|
| 10-18 to 10-22 | Wiring PR built and tested; Brew merges |
| by 10-23 | Sarah writes issue 1; `--test` to iambrew@ and assistantbrew@ |
| Brew's read | Brew reads it on his phone; edits go back to Sarah |
| Sun 11-08 | First live send (or Sun 10-25 if Brew picks send-to-everyone) |
| Sun 11-15 on | Weekly, automated, alert on any skip |
| 12-06 | First read: replies, unsubscribes, GA4 sessions with `utm_source=pd_newsletter`, $29 plan sales from subscribers |

## Not changing
- The 10-18 CW newsletter PD feature and its 10-25 read: untouched.
- The PD drip copy and its 11-09 reply-question read: untouched.
- PD blog cadence (2 a week): untouched.

## Built 2026-10-17 (branch feat/pd-newsletter)
Issue 1 by Sarah: `data/newsletters/pd/2026-11-08.json`, passes every check. --test sent to iambrew@ and assistantbrew@ 2026-10-17. Tests: `tests/test_pd_newsletter.py` (28 checks, in calculator-guard CI); each of 10 protections was broken once and went red on a named assertion, then restored.

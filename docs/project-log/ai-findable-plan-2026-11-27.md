---
updated: 2026-11-27
---
# Plan: get CW, KD and PD recommended by AI assistants

Source idea: Guillermo Rauch (Vercel) on Codie Sanchez's BigDeal, 2026-11-24. People increasingly ask ChatGPT, Gemini, Perplexity or Claude instead of Google, and the assistant decides who gets named.

Evidence order: problem -> existing URL -> numbers -> action. Action for this plan: **UPGRADE (measure first)**. No new pages.

## What is true today (checked 2026-11-27)

| Check | CW | KD | PD |
|---|---|---|---|
| AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) can load the site | yes (200) | yes (200) | yes (301 to www, fine) |
| llms.txt (a plain summary file for AI) | yes, last touched 2026-08-23, no PescoDial line | yes | **missing (404)** |
| Calculator has structured data AI can read | yes: WebApplication, FAQ (11 Q&As), Offer, Table | not checked | not checked |
| Visits from AI assistants, last 90 days (GA4) | 13 of 7,288 (chatgpt.com 11) | 13 of 796 (chatgpt.com 12) | 0 of 147 |
| AI visits by month (CW) | Sep 7, Oct 5, Nov 1 | | |

Plain reading: the technical basics are already in place on CW. AI assistants send almost nothing, and the trend is down. **What we do not know is whether the assistants mention us at all when asked.** That is the real gap, so the first step is to find out, not to change pages.

Ledger: no earlier decision on AI search. Open tests this must not touch: XR-18 on ten CW posts (window to 2026-12-04, read 12-05), KD early-calculator link (read 12-15), KD sender (read 12-01), CW newsletter link to KD guide (read 12-01), PD homepage title (read 11-30).

## Phase 1: baseline, no site changes. DONE 2026-11-27, scorecard: docs/archive/reports-archive/2026-11-27-ai-mention-baseline.md

1. Write 12 questions a real 45-70 reader would ask an assistant, taken from GSC queries that already bring calculator traffic (for example "carnivore diet macro calculator for women over 50", "how much protein on carnivore", "keto calculator for menopause", "pescatarian meal plan calculator").
2. Ask each one in ChatGPT, Gemini, Perplexity, Copilot and Google's AI answer, logged out, via Chrome. Record: is CW/KD/PD named, linked, or absent; who is named instead.
3. Check that Bing has the calculator pages indexed (ChatGPT search leans on Bing; Bing Webmaster is already verified).
4. Save the scorecard to `docs/archive/reports-archive/2026-11-27-ai-mention-baseline.md`.

Result is one of: **named often** (protect it, re-check monthly), **named rarely** (go to Phase 2), **never named** (Phase 2 plus find out who is named and why).

## Phase 2: low-risk upgrades (not before 2026-12-05, after XR-18 reads)

Only sitewide files and facts that do not change any ranking page's text:
- Add llms.txt to PescoDial. Refresh CW's (add PD, current offer facts, the 45-70 audience).
- Fill whatever gap the baseline shows on KD and PD calculator structured data.
- Fix Bing gaps found in Phase 1.

Anything that edits a page ranking at position 15 or better needs the usual preservation plan and a before/after window. Not part of this plan.

## Phase 3: re-measure (2027-01-09, 5 weeks after Phase 2)

Same 12 questions, same assistants. Plus GA4 AI-assistant visits for Dec 6 to Jan 8 vs the 90-day baseline above. Win: named in more answers than the baseline, or AI visits clearly up. With numbers this small (about 4 a month), the mention count is the main measure, not visits.

## Out of scope on purpose

- **Letting AI agents run the calculator directly** (the "agent can place the order" idea from the video). That would be a new way to generate a paid health report, so the hard launch rule applies: every entry point has to be covered by the medicine and kidney safety checks first. Park it unless Phase 3 shows assistants sending real buyers.
- Buying AI-visibility tools or services.

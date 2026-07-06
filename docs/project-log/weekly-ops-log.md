# Weekly Ops Log

Dated entries from the Monday weekly-operator-review scheduled task. Plain facts for future sessions. Newest at bottom.

## 2026-07-05 — Weekly Ops Review

- **GH issues:** none open (health-check, automated).
- **Heartbeat:** only the 2 known-dead LaunchAgents (weekly-report, vaultsync) — documented Brew-only macOS Full Disk Access fix. Not new.
- **Scoreboard:** `logs/scoreboard_truth_pass.log` absent (Monday cron hadn't run — off-cycle Sat run). Ran `scoreboard_truth_pass.py` manually → appended vault scoreboard 2026-07-05, errors none. NOTE: the script writes only to the vault scoreboard.md + snapshot JSON, never to `logs/scoreboard_truth_pass.log` (only the cron wrapper would) — the Handbook/task "confirm the log entry" check is unreliable off cron day.
- **Leading indicators:** CW 445 sess/321 users 30d; KD 62/34. Stripe: 1 live $29 calc sale this week (on ~1/mo base rate). Drip list 14 total, +9 this week (~1.3/day, near 2/day target). Coupons: 0 DRIP50/WELCOME5 redemptions. Etsy orders trending up Apr 4 → May 10 → Jun 15 (AOV $5.23 CAD; no July orders yet, latest Jun 30). Calc GSC cluster steady pos ~6-9 ("carnivore macro calculator" 6.8). KD GSC thin: 4 pages / 15 imp / 0 clicks 28d; backlinks not landed (gated on Brew outreach).
- **Queue depths:** pin queue 55 unposted (>20 ok); blog ready next 7d CW 5 / KD 6 (>3-day ok).
- **Drip health 7d:** 69 sent / 40 delivered / 31 opened / 1 click / 2 bounced / **0 complained**.
- **Beads filed:** carnivore-weekly-0s0 (P1) — 13 live-mode 100%-off test coupons still valid in production Stripe (guessable names, TestingOnGoing redeemed 18×); revenue leak, Brew-only fix (never-do: sessions don't touch coupons).
- **Recurring-issues:** none added.

## 2026-07-06 — Weekly Ops Review

- **GH issues:** none open (health-check, automated).
- **Heartbeat:** 1 problem this week — weekly-report LaunchAgent still failing (known Brew-only macOS Full Disk Access fix). vaultsync cleared since last week. Not new.
- **Scoreboard:** Monday truth pass wrote today (`logs/scoreboard_truth_pass.log` + vault scoreboard.md). Etsy row blank — cron lacks node on PATH (see ISSUE-039 / bead 7m2). Pulled Etsy manually instead.
- **Leading indicators:** CW 485 sess/352 users 30d; KD 60/32. Stripe 30d: 2 live full-price $29 calc sales ($58), 1 landed this week (Jul 5) — drought-broken signal continues. **Drip list 18 total, +13 this week** (vs +2 prior 3 wks combined — email-capture launch converting, ~1.9/day at target); 1 unsub. Coupons: 0 DRIP50/WELCOME5 redemptions (both sales full-price). Etsy 90d: 30 orders/$156 CAD/AOV $5.20, monthly trend Apr 4 → May 10 → Jun 15 (growing), Jul 1 so far; Starter Bundle 3 sales (below 5-sale ads gate, no review). Calc GSC cluster holding: "carnivore macro calculator" pos 5.9, cluster 6-9. KD GSC 0 imp 14d (backlinks pending Brew outreach); newsletter 5 (<50 gate).
- **Queue depths:** pin queue 35 unposted (>20 ok); blog ready CW 12 (through Jul 18) / KD 4 — both ok.
- **Drip health 7d:** 117 sent / 59 delivered / 39 opened / 2 clicks / 7 bounced / **0 complained**.
- **Beads filed:** carnivore-weekly-7m2 (P3) — scoreboard cron can't run Etsy summary (no node on PATH), Etsy row blank weekly.
- **Recurring-issues:** added ISSUE-039 (scoreboard Etsy/node PATH).

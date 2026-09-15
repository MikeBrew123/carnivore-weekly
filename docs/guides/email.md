# Email: drip, newsletter and transactional

Consolidated 2026-09-14 from the email sections of `AGENTS.md` and `CLAUDE.md`, which
had drifted apart. This is the single reference for how CW and KD email works.

No credentials or secret values appear in this file. Where a key is needed, only its
location is named.

**How to read this file.** Section 1 is policy: rules that hold regardless of how the
code is built, and the ones that exist because something went wrong. Section 2 is the
current configuration: facts that are true today and will change when the system does.
Section 3 is procedure. Section 4 names the runtime source of truth for each claim, so
that when this guide and the code disagree, you know which one to believe and where to
look.

---

## 1. Policy and safety rules

These bind every session, scheduled run and workflow.

### Platform

- **All email is in-house via Resend.** Beehiiv and MailerLite are DEPRECATED and
  purged (2026-07-04 and 2026-05-26). Never use either for anything.
- **Resend is on a PAID plan** (Brew, confirmed 2026-09-13). The old free-tier
  100/day cap no longer applies. A full newsletter to the whole list is fine in one
  send. Do not split sends or hold back a newsletter on quota grounds, and do not
  change the plan without Brew.

### Replies reach a person

- **Every subscriber send replies to an `@carnivoreweekly.com` catch-all, never a
  personal inbox.** All inbound mail to that domain is swept by the
  `writer-inbox-daily-check` scheduled task, which is the one funnel that guarantees
  nothing anyone says goes unseen. A personal inbox sits outside it.
- **Never `iambrew@gmail.com` as a reply-to on any subscriber send.** It appears in
  the codebase only as a test recipient in `send_newsletter.py`, never as a reply-to.
- **The reply-to address is not the same as the from address, and it is not uniform
  across KetoDial.** Four different reply-to addresses are in use. Do not generalise
  from one path to another: see the mapping in Section 2 before writing or changing
  any send.

### Honest urgency

- **Never write drip copy claiming a deadline Stripe does not enforce.** Day 7 and
  day 28 mint single-use 48-hour promo codes. If the mint fails, the copy falls back
  to a static code with no expiry claim. The claim follows the code, never the other
  way round.
- **KD promo copy says "enter code at checkout", never "auto-applies".**

### Quota refusals are never silently retried

The quota alarm keys off Resend's 429 error names, not a daily count, so it stays
correct on the paid plan and should now fire rarely.

- A 429 `daily_quota_exceeded` or `monthly_quota_exceeded` is **never retried.** A row
  is written to the Supabase `email_send_refusals` table, a GitHub issue is opened, and
  the workflow run turns red. Re-send by hand, then set `resent_at` on the row.
- **Drip refusals retry themselves** on the next daily run. **Newsletter refusals do
  not.** A missed newsletter stays missed until someone sends it.
- A 429 `rate_limit_exceeded` is different: it backs off and retries normally.

### Sending hygiene

- **Never send a newsletter without `--test` first.**
- **Never rich-text paste into an email editor.** It strips styling.
- The CW newsletter is blocked outright if it trips the sweet-treat guard, including
  when that guard cannot be loaded. It fails closed on purpose. Rewrite the draft.

---

## 2. Current operational configuration

True as of 2026-09-14. Expect these to change; Section 4 says where to confirm them.

### Domain and keys

| | Value |
|---|---|
| Sending domain | `carnivoreweekly.com`, verified, DKIM/SPF/DMARC live |
| API key location | `secrets/api-keys.json`, key `resend.key` |
| Webhook secret location | `secrets/api-keys.json`, key `resend.webhook_signing_secret` |

### From and reply-to, per sending path

Read directly from the sending scripts on 2026-09-14. **The reply-to is not derived
from the from address**, and KetoDial does not use one reply-to across its paths.

| Path | From | Reply-to | Defined in |
|---|---|---|---|
| CW drip | `Carnivore Weekly <newsletter@carnivoreweekly.com>` | `newsletter@carnivoreweekly.com` | `scripts/send_drip.py` `SITES["cw"]` |
| KD drip | `KetoDial <ketodial@carnivoreweekly.com>` | **`ketodial@carnivoreweekly.com`** | `scripts/send_drip.py` `SITES["kd"]` |
| CW newsletter | `newsletter@carnivoreweekly.com` | `newsletter@carnivoreweekly.com` | `scripts/send_newsletter.py` `SITES["cw"]` |
| KD newsletter | `ketodial@carnivoreweekly.com` | **`newsletter@carnivoreweekly.com`** | `scripts/send_newsletter.py` `SITES["kd"]` |
| KD Coach newsletter | `coach@carnivoreweekly.com` | **`newsletter@carnivoreweekly.com`** | `scripts/send_newsletter.py` `SITES["kd_coach"]` |
| Coach launch | `Sarah at Carnivore Weekly <newsletter@carnivoreweekly.com>` | **`sarah@carnivoreweekly.com`** | `scripts/send_coach_launch.py` `FROM` / `REPLY_TO` |

Three things this table is here to stop you assuming:

- **`ketodial@carnivoreweekly.com` is the reply-to for the KD drip only.** The KD
  newsletter and the KD Coach newsletter both reply to
  `newsletter@carnivoreweekly.com`, even though they send from KD addresses.
- **`sarah@carnivoreweekly.com` is a real reply-to**, used by the coach-launch send
  and nowhere else. It is the only path that does not reply to one of the three
  addresses above.
- **`kd_coach` is a configuration entry, not part of the weekly automation.**
  `weekly_newsletter.py` sends only `cw` and `kd`; `kd_coach` is reachable through
  the manual sender.

All six are `@carnivoreweekly.com` addresses, so the catch-all rule in Section 1 holds
for every path.

### Drip sequences

Two sequences, one per site, eleven emails each: day 1 through day 7 daily, then
day 10, 14, 21 and 28.

| | CW | KD |
|---|---|---|
| Name | 30-Day Carnivore Starter | 30-Day Keto Starter |
| Templates | `data/drip-emails/` | `data/drip-emails/kd/` |
| Enabled by | always on | the `KD_DRIP_ENABLED` GitHub repo variable |

- Subscribers live in the Supabase `drip_subscribers` table, which is **site-scoped**:
  its unique key is `(email, site)`. It tracks `current_day`, `last_sent_at` and
  `completed`.
- Flow: signup writes a row, the daily run advances the subscriber to their next
  scheduled day, and after day 28 they graduate to `newsletter_subscribers`.

### Newsletter

- Subscribers live in `newsletter_subscribers`, **site-scoped** by a `site` column
  holding `cw` or `kd`.
- Content for the manual path comes from `data/newsletter_content.json` (subject line
  and sections by writer). Generated newsletters land in `newsletters/{date}.html`.

### Open and click tracking

- Resend posts events to the Cloudflare Worker at
  `https://carnivore-report-api.iambrew.workers.dev/webhook/resend`.
- Events captured: sent, delivered, opened, clicked, bounced, complained.
- Stored in the Supabase `drip_events` table: `email`, `resend_id`, `event_type`,
  `subject`, `metadata`.
- Engagement is measured **per unique recipient**, by distinct `resend_id`, not by raw
  event count. Raw counts overstate click rates by roughly two times.

### Public endpoints

All on the Cloudflare Worker.

| Route | Effect |
|---|---|
| `/api/v1/subscribe` | inserts into `drip_subscribers` |
| `/api/v1/subscribe/newsletter` | inserts into `newsletter_subscribers` |
| `/api/v1/unsubscribe` | unsubscribes; linked from every send |

---

## 3. Procedures

### Drip, automated

Runs daily inside the `daily-publish.yml` GitHub Action, before any article work.
CW sends first, then KD if its repo variable is set. Both steps are
`continue-on-error`, so a send failure alerts rather than aborting the publish run,
and a quota refusal fails the whole run at the end.

```bash
python3 scripts/send_drip.py            # CW
python3 scripts/send_drip.py --site kd  # KD
```

### Newsletter, automated

Runs inside `weekly-update.yml` on Sunday and Wednesday. This script researches,
writes, style-checks and guards the content, then shells out to `send_newsletter.py`
for the send itself, once for `cw` and once for `kd`. It never sends `kd_coach`.

```bash
python3 scripts/weekly_newsletter.py --site both
```

It also accepts `--site cw`, `--site kd`, `--test` (sends only to the operator) and
`--dry-run` (shows what would happen without sending). Because the send is delegated,
the from and reply-to addresses come from `send_newsletter.py`'s `SITES` map, which is
the mapping in Section 2.

### Newsletter, manual

The older two-step path. Nothing in CI calls it; it exists for a hand-built send.

```bash
python3 scripts/generate_newsletter.py                 # -> newsletters/{date}.html
python3 scripts/send_newsletter.py --site cw --test    # ALWAYS test first
python3 scripts/send_newsletter.py --site cw           # or --site kd
```

### Reading engagement

```sql
SELECT * FROM drip_events WHERE event_type = 'opened' ORDER BY created_at DESC;
```

Count distinct `resend_id` per recipient for any rate you intend to quote.

### After a quota refusal

1. Find the row in Supabase `email_send_refusals`.
2. Send the affected message by hand.
3. Set `resent_at` on that row.

Drip refusals clear themselves on the next daily run. Newsletter refusals do not.

---

## 4. Runtime source of truth

This guide is documentation. Nothing reads it at runtime. When it disagrees with the
code, the code is correct and this file needs updating.

| Claim in this guide | Where it is actually defined |
|---|---|
| Drip send behaviour, promo minting, unsubscribe link | `scripts/send_drip.py` |
| Automated weekly newsletter, style enforcement, sweet guard | `scripts/weekly_newsletter.py` |
| Newsletter from and reply-to for every site, suppression rules | `scripts/send_newsletter.py`, `SITES` |
| Coach-launch send, and the `sarah@` reply-to | `scripts/send_coach_launch.py` |
| Manual newsletter generation | `scripts/generate_newsletter.py` |
| Quota refusal handling | `scripts/resend_quota.py`, `scripts/resend_quota_alert.sh` |
| Subscriber fixture and hygiene guards | `scripts/subscriber_hygiene.py` |
| Webhook receiver, subscribe and unsubscribe routes | `api/calculator-api.js` |
| KD intake and its reply-to | `ketodial/worker/intake.js` |
| Drip and newsletter schedules, the `KD_DRIP_ENABLED` gate | `.github/workflows/daily-publish.yml` |
| Newsletter schedule | `.github/workflows/weekly-update.yml` |
| Drip content | `data/drip-emails/` and `data/drip-emails/kd/` |
| Quota alarm behaviour | `tests/test_resend_quota_alarm.py` |

---

## Related

- Sweet-treat rule and its enforcement: `scripts/cw_sweet_guard.py`, and Gate 10 in
  `scripts/validate_before_commit.py`. CW only; KD keto content legitimately
  discusses sweeteners.
- Inbound reply handling and the daily digest: the `writer-inbox-daily-check`
  scheduled task.
- Subscriber privacy and PII history: `docs/project-log/decisions.md`, entries dated
  2026-09-03 and 2026-09-05.

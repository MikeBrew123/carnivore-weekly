# KetoDial Stripe TEST-mode end-to-end harness

**Status: BLOCKED, waiting on one credential.** Everything below is built and the
non-Stripe halves are verified. The run needs a working Stripe **test** secret key,
which only Brew can create — rotating an API key is a Stripe Dashboard action behind
his login, and the Stripe MCP server is not authorized in this session.

```
secrets/api-keys.json -> stripe.secret_key_test   (last rotated 2026-01-06)
GET https://api.stripe.com/v1/balance
  -> "Expired API Key provided: sk_test_****"
```

The **live** key works. It was deliberately not used: creating a live-mode Checkout
Session is a production artifact, and this exercise is explicitly non-production.

## What Brew needs to do (about two minutes)

1. Stripe Dashboard → **Developers → API keys**, with the **Test mode** toggle on.
2. Reveal or roll the **test** secret key (`sk_test_…`) and copy it.
3. Copy the **test** publishable key (`pk_test_…`) from the same page.
4. Put both into `secrets/api-keys.json` under `stripe.secret_key_test` and
   `stripe.publishable_key_test`, and set `stripe.last_rotated` to today.

Only the test credentials change. **Do not touch `secret_key_live` or
`publishable_key_live`, and do not modify any live Price object.**

## Then

```bash
node tests/harness/stripe-e2e.mjs --create-prices   # makes TEST-mode products/prices

# In a second terminal — leave it running:
stripe listen --forward-to localhost:8797/api/webhook
#   -> Ready! Your webhook signing secret is whsec_…

KD_STRIPE_CLI_SECRET=whsec_… node tests/harness/stripe-e2e.mjs --stripe-cli

node tests/harness/stripe-e2e.mjs --cleanup         # archives the TEST prices
```

`--stripe-cli` routes **run A's** webhook through Stripe CLI, so at least one
completed purchase is proven against Stripe's real event envelope and signing
format rather than only our own HMAC. Runs B, C and D keep the harness-signed
replay, which is what makes the replay / malformed / multi-signature cases
deterministic. Without the flag every run uses the synthetic signature and the
script says so on startup.

There is nothing to assert on the CLI-forwarded response — Stripe CLI holds it —
so the evidence that the event arrived **and verified** is the payment writeback,
which only the paid path performs. A failed signature returns 400 and the row never
changes.

## Why swapping two env vars is not enough

The production client and worker hardcode production surfaces. Three of them matter,
and the third was not in the review's list — it is the one that would have quietly
made a "test" run touch production:

| Surface | Hardcoded to | Harness override |
|---|---|---|
| Stripe return URL (worker) | `https://ketodial.com` | `RETURN_URL_BASE` |
| **Report link base (worker, 2 sites)** | `https://ketodial-api.iambrew.workers.dev` | `REPORT_BASE_URL` |
| API base (browser) | `https://ketodial-api.iambrew.workers.dev` | harness serves a patched copy |
| Publishable key (browser) | `pk_live_…` | harness serves a patched copy |
| Price IDs (worker) | live price map | `PRICE_MAP_JSON` (already existed) |

Without `REPORT_BASE_URL`, a test purchase would email report links pointing at the
**live worker**, which would then read the test session from Stripe test mode, fail,
and — worse — the run would have looked like it passed the parts that mattered.

Both worker overrides **default to exactly the string they replaced**, pinned by
GROUP R in `tests/kd-intake-authority.test.mjs` with a mutation proving a non-production
default fails the build. The browser-side values are patched only in a copy the
harness serves from memory; `ketodial/public/` is never modified. GROUP R also pins
that both constants are still rewritable and that the shipped file still carries the
production values — if either moves, the harness would silently serve a page pointing
at production with the LIVE publishable key.

## Safety rails in the harness

- Refuses to start unless the key begins `sk_test_`, and re-checks `livemode:false`
  on the account before doing anything.
- Every Supabase row is tagged `source='kd-audit2b-test'` with an `@audit2b.invalid`
  email, and cleanup fails the run if one survives. This is the same marked-and-cleaned
  procedure used throughout Audit 2B — there is only one Supabase project on the
  account and it is production.
- Resend is intercepted by default (`--live-email` is required to opt out, and even
  then it only sends to `@audit2b.invalid`, which cannot receive mail).
- Card numbers are Stripe's documented test PANs only.

## What it covers

| Run | Kidney | Products | Expected |
|---|---|---|---|
| A | No | Full Protocol | $10.99, all reports, normal protein target |
| B | Yes | Doctor + Starter | $9.98, meal plan unavailable, no protein figure anywhere |
| C | Unsure | Doctor + Starter | as B, and never described as a kidney diagnosis |
| D | No, pay before profile | Doctor | webhook sends the finish email; profile attaches via the Stripe session id; `/fulfill` delivers |

Plus the failure matrix: unknown checkout session, unpaid session attempting a
post-payment write, missing metadata, incomplete authoritative intake, and a check
that nothing anywhere falls back to `form_data` or an invented customer value.

## How a Checkout Session actually completes: one manual card entry

**There is no API shortcut, and an earlier version of this file was wrong to try one.**
It retrieved the Session's PaymentIntent and confirmed it directly. Stripe's Checkout
API states plainly that a PaymentIntent belonging to a Checkout Session cannot be
confirmed or cancelled that way. Any other trick that merely makes `payment_status`
*look* paid would be worse: it would prove nothing about the path a real customer takes.

So the session completes the way Stripe intends. The harness:

1. serves the real shipped calculator from `http://localhost:8797`, with `API_BASE`
   and `STRIPE_PK` rewritten **in memory** to the harness API and `pk_test_…`
   (`ketodial/public/` is never modified);
2. proxies `/api/*` to this process's worker, with TEST prices and the TEST return URL;
3. prints the URL and **waits** while you complete embedded Checkout with
   `4242 4242 4242 4242`, any future expiry, any CVC;
4. polls Stripe until the Session reports `status=complete` and `payment_status=paid`;
5. automates everything after that.

**One manual card entry per run is the only human step.** Cross-origin iframe
interaction is not something page JavaScript can do, and this harness does not pretend
otherwise. If you have browser automation that can drive the Stripe iframe, it can
replace step 3; nothing else changes.

## The webhook is in the matrix, not skipped

Earlier the run went `checkout → fake payment → /fulfill`, which stepped over the most
important post-payment code. It now goes:

```
real Checkout completion → signed checkout.session.completed → /webhook
  → payment writeback → immediate delivery, or the finish-profile path
```

`/fulfill` is still tested, but only where it belongs: after a late profile completion.

**Signing.** The harness signs its replay with its own secret
(`whsec_kd_audit2b_harness_only_not_production`) supplied to the worker as
`STRIPE_WEBHOOK_SECRET`. The production webhook secret is deliberately not used and
this process never holds it. The event body is the genuine Checkout Session Stripe
just produced.

For end-to-end Stripe-signed delivery instead, run
`stripe listen --forward-to localhost:8797/api/webhook` and set the harness secret to
the one the CLI prints.

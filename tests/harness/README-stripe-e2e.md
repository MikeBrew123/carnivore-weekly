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
node tests/harness/stripe-e2e.mjs                   # runs the full matrix
node tests/harness/stripe-e2e.mjs --cleanup         # archives the TEST prices
```

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
harness serves from a temporary directory; `ketodial/public/` is never modified.

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

## The one thing the harness cannot do headlessly

Completing payment inside Stripe's **embedded** checkout requires driving their
iframe, which is hosted on `js.stripe.com` and not scriptable from our page. The
harness therefore uses the documented test card through Stripe's own API to move the
session to `paid`, then drives the real webhook and the real return URL. That is a
real test-mode Checkout Session and a real payment, but the card entry itself is
API-driven rather than typed into their iframe.

If the reviewer wants the literal iframe interaction too, that is a manual pass:
open the harness page, pay with `4242 4242 4242 4242`, and confirm the same
assertions. The harness prints the URL to use.

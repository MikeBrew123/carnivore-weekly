# KetoDial Stripe TEST-mode end-to-end harness

**Status: RUN COMPLETE, 2026-09-08.** The TEST secret was rotated, five TEST-mode
prices were created, real Checkout Sessions were completed with `4242 4242 4242 4242`
in a browser, and `stripe listen --forward-to` forwarded genuine
`checkout.session.completed` events into the worker, which accepted them (200) and
performed the payment writeback. Full evidence table: `docs/archive/reports-archive/`.

Nine TEST Checkout Sessions exist in Stripe history, all `livemode=false`, every one
carrying metadata keys `customer_name, items, session_token` and **no `form_data`**.
Stripe does not allow deleting Checkout Sessions; that history is normal and is not
cleanup residue. All five temporary TEST prices are archived (`active=false`), and no
live Price object was created, modified, or archived.

## Credentials

`secrets/api-keys.json` → `stripe.secret_key_test` / `stripe.publishable_key_test`
(rotated 2026-09-08). The harness refuses to start unless the secret begins `sk_test_`
**and** the publishable key begins `pk_test_`, and it re-checks `livemode:false` on the
account before touching anything. `secret_key_live` and `publishable_key_live` are never
read by this file.

## To run it again

```bash
node tests/harness/stripe-e2e.mjs --create-prices   # makes TEST-mode products/prices

# In a second terminal — leave it running:
stripe listen --forward-to localhost:8797/api/webhook
#   -> Ready! Your webhook signing secret is whsec_…

KD_STRIPE_CLI_SECRET=whsec_… node tests/harness/stripe-e2e.mjs --stripe-cli

node tests/harness/stripe-e2e.mjs --cleanup         # archives the TEST prices
```

`--stripe-cli` routes **every** completed purchase's webhook through Stripe CLI, so the
signature, the event envelope and the delivery are all Stripe's rather than ours.
Without the flag every run uses the harness's own HMAC and the script says so on
startup. Those synthetic signatures are still what makes the malformed-signature,
replay-window and secret-rotation cases deterministic — but they are harness-generated,
not Stripe-generated, and must never be described as the latter.

There is nothing to assert on the CLI-forwarded response — Stripe CLI holds it — so the
evidence that the event arrived **and verified** is the payment writeback, which only
the paid branch of a signature-verified event performs. A failed signature returns 400
and the row never changes. Every CLI leg asserts on that row, never on a literal `true`.

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

**One card entry per run is the only step the harness cannot do itself.** Cross-origin
iframe interaction is not something page JavaScript can do, and this harness does not
pretend otherwise. On 2026-09-08 step 3 was performed twice by hand and then by Chrome
browser automation driving the real Stripe iframe; the in-app browser pane could not
reach across the origin boundary, so the run used the Chrome extension instead. Nothing
else about the flow changes either way.

## The webhook is in the matrix, not skipped

Earlier the run went `checkout → fake payment → /fulfill`, which stepped over the most
important post-payment code. It now goes:

```
real Checkout completion → signed checkout.session.completed → /webhook
  → payment writeback → immediate delivery, or the finish-profile path
```

`/fulfill` is still tested, but only where it belongs: after a late profile completion.

**Signing, and what each kind of signature does and does not prove.**

| Signature | Produced by | Proves |
|---|---|---|
| `stripe listen --forward-to` | Stripe | that Stripe's real envelope and signing format verify against the worker, end to end |
| harness HMAC over the genuine Session body | this script | malformed signatures, the replay window, multi-secret rotation, and the unpaid branch, deterministically |

The harness HMAC cases are useful and they are **not** Stripe-generated. Do not describe
them as Stripe evidence.

Whichever is in use, `STRIPE_WEBHOOK_SECRET` given to the worker is the matching test
secret: the harness's own `whsec_kd_audit2b_harness_only_not_production`, or the one
`stripe listen` prints. The production webhook secret is deliberately not used and this
process never holds it. Passing `KD_STRIPE_CLI_SECRET` switches both the worker's
verification secret and the harness's signing secret together; an earlier version
switched only one, and every CLI run returned 400 for the wrong reason.

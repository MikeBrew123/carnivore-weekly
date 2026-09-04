# Canary tokens (honeytokens)

A canary token is a credential with no power. It exists only to be stolen.
Nothing legitimate ever sends one, so a single hit is a real signal rather than
noise: somebody found a planted key and tried it.

The idea is Thinkst's (canary.tools / canarytokens.org). This is a self-hosted
version so alerts stay on our own infrastructure.

## What is running

Detection lives in `api/calculator-api.js`, in the `CANARY TOKENS` block, and
runs before any route. It costs nothing when idle: a handful of string checks
per request, no daemon, no polling, no extra service.

Two shapes, both matched on prefix so a new token works the moment it is minted,
with no redeploy:

| shape | example | fires when |
|---|---|---|
| fake API key | `cw_live_sk_<placement>_<random>` | someone **uses** it against the API |
| fake webhook URL | `https://api.carnivoreweekly.com/api/v1/hooks/cwc_<placement>_<random>` | anything **fetches** it |

The key is read from the `Authorization` header, `X-Api-Key`, or the `key`,
`api_key` and `token` query params. Request bodies are deliberately not read:
consuming the stream would break every downstream handler.

A tripped canary emails `iambrew@gmail.com` through Resend with the IP, country,
ASN, user agent, method, full URL and timestamp, then answers a plain
`401 Unauthorized` — exactly what the real API tells any unauthorised caller, so
a prober learns nothing and has no reason to think they were seen.

Alerts are deduped in KV to one per token+IP per hour, so a scanner hammering
the endpoint cannot become a thousand emails. If KV is unavailable it fails
open and still alerts.

## Minting and planting

```bash
python3 scripts/canary_mint.py <placement> "where exactly it lives"
```

`placement` is a short label (`ghpub`, `macenv`, `vault`, `n8n`) that shows up in
the alert subject, so the email tells you which hiding place was opened.

The map from token to hiding place is `secrets/canary-tokens.json`. That
directory is gitignored and must stay that way: the ledger is the only thing
that turns an alert into "someone was in X".

## What this does and does not catch

It catches someone who found a planted credential and tried it against our API,
and anything that fetches a planted URL.

It does **not** catch a stolen key being tried somewhere else. A fake Supabase
key tested against `supabase.co` is invisible to us, because Supabase has no
idea the key is ours. For a token that reports usage no matter where it is
tried, use Thinkst's AWS key token — AWS CloudTrail does the detection.

It does **not** detect someone merely scanning the network. That needs a
listener, and a listener is a process.

## Is it us, or somebody else?

Every alert leads with a verdict, so the subject line alone is usually enough to
triage from a phone:

    CANARY [INTERNAL] macenv - 208.181.70.230 (TELUS)      calm
    CANARY [EXTERNAL] macenv - 185.220.101.5 (LeaseWeb)    the alarm
    CANARY [EXPECTED] ghpub - 3.101.22.9 (Amazon)          data, not an incident

The useful question is not "what user agent is this" — our own scripts and an
attacker's script both look like `curl` or `python-requests`. It is **could this
request have come from where the token was planted**. A key that only ever
existed on the Mac cannot legitimately be used from a datacenter in Amsterdam.

| verdict | what triggers it | what to do |
|---|---|---|
| `INTERNAL` | from a known address of yours (`CANARY_TRUSTED_IPS`) | almost certainly your own tooling; glance and move on |
| `PROBABLY INTERNAL` | your ISP (`CANARY_HOME_ASNS`, AS852 TELUS) on a new IP | check the IP looks like yours, e.g. after a router reboot |
| `EXTERNAL` | a local-only token used from anywhere else, or a hosting network, or a scanner signature | **the file left the machine.** Rotate anything real that sat beside it |
| `EXPECTED` | a token planted somewhere public | measurement, not an incident. Note the ASN to see who is harvesting |
| `UNCLEAR` | unrecognised origin, nothing obviously hostile | judge it on the details in the mail |

Placement prefixes decide the policy: `mac*`, `vault*`, `env*` and `laptop*` are
local-only, so any off-network use is `EXTERNAL`. `ghpub*` is public by design.
Anything unrecognised is treated as local-only, which errs toward alarming.

Tune without a redeploy:

```bash
cd api
echo "1.2.3.4,5.6.7.8" | npx wrangler secret put CANARY_TRUSTED_IPS --env production
echo "852,6327"        | npx wrangler secret put CANARY_HOME_ASNS  --env production
```

### The blind spot, stated plainly

`INTERNAL` means *the request came from your network*. It does not mean *safe*.
Malware running on the Mac, or anyone on your LAN, uses the key from your own IP
and will be labelled `INTERNAL`. What the verdict genuinely rules out is a
credential being used from somewhere you are not.

So the signal to trust most is the inverse: an `EXTERNAL` on a local-only token
is close to conclusive, because there is no innocent way for that key to be
called from a datacenter. A calm `INTERNAL` is weaker evidence than a loud
`EXTERNAL`.

## Rules

- **Never rotate, "fix", or remove a canary.** It is inert by design and grants
  nothing. A key named like a secret sitting in a config file is the point.
- **Never commit `secrets/canary-tokens.json`.**
- Never use a canary value for anything real. The first legitimate use destroys
  the instrument, because from then on a hit no longer means an intrusion.
- If an alert arrives, check the placement in the ledger before assuming the
  worst: a tool that reads config files broadly can trip one honestly.

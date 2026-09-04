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

## Rules

- **Never rotate, "fix", or remove a canary.** It is inert by design and grants
  nothing. A key named like a secret sitting in a config file is the point.
- **Never commit `secrets/canary-tokens.json`.**
- Never use a canary value for anything real. The first legitimate use destroys
  the instrument, because from then on a hit no longer means an intrusion.
- If an alert arrives, check the placement in the ledger before assuming the
  worst: a tool that reads config files broadly can trip one honestly.

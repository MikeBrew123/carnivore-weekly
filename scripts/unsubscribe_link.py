"""Signed unsubscribe links, shared by every Python sender (2026-09-27).

The worker endpoint used to act on ?email=...&site=... alone, so anyone who knew an
address could unsubscribe that person. Links now carry

    sig = HMAC-SHA256(UNSUBSCRIBE_SECRET, "unsubscribe-v1|<site>|<email lowercased>")

as hex, first 32 characters. This MUST match unsubscribeSignature() in
api/calculator-api.js and ketodial/worker/index.js; tests/test_unsubscribe_link.py and
tests/unsubscribe-signed-link.test.mjs pin all three to the same vector.

The secret comes from the UNSUBSCRIBE_SECRET env var (GitHub Actions) or
secrets/api-keys.json -> unsubscribe.secret (local runs). There is deliberately no
unsigned fallback here: a batch sender that cannot sign stops before mailing anyone,
because an unsigned link stops working after the legacy cutoff.
"""
import hashlib
import hmac
import os
from urllib.parse import quote

UNSUB_BASE = "https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe"
SITES = ("cw", "kd", "pd")


class MissingUnsubscribeSecret(RuntimeError):
    pass


def load_secret(secrets=None):
    secret = os.environ.get("UNSUBSCRIBE_SECRET") or ((secrets or {}).get("unsubscribe") or {}).get("secret")
    if not secret:
        raise MissingUnsubscribeSecret(
            "UNSUBSCRIBE_SECRET is not set (env var, or unsubscribe.secret in secrets/api-keys.json). "
            "Refusing to send: every email must carry a signed unsubscribe link."
        )
    return secret


def signature(email, site, secret):
    msg = f"unsubscribe-v1|{site}|{email.strip().lower()}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()[:32]


def unsubscribe_url(email, site, secret):
    if site not in SITES:
        raise ValueError(f"unknown unsubscribe site {site!r}")
    clean = email.strip().lower()
    return f"{UNSUB_BASE}?email={quote(clean, safe='')}&site={site}&sig={signature(clean, site, secret)}"

#!/usr/bin/env python3
"""
Stripe Revenue Report — Carnivore Weekly / KetoDial

Read-only report of actual revenue straight from the Stripe API. Exists because
Google Analytics has been reporting the wrong sales number (test purchases
counted as real, real sales missing). This script never writes to Stripe: it
only issues GET requests.

Live mode and test mode are fetched with separate keys and are NEVER summed
together. Test-mode totals are reported for visibility only.

Usage:
    python3 scripts/stripe_revenue_report.py                  # live mode
    python3 scripts/stripe_revenue_report.py --mode both      # live + test, kept apart
    python3 scripts/stripe_revenue_report.py --json-only      # machine-readable only
    python3 scripts/stripe_revenue_report.py --out data/stripe_revenue.json

Credentials (first hit wins, never printed):
    live: env STRIPE_SECRET_KEY_LIVE, env STRIPE_SECRET_KEY,
          secrets/api-keys.json -> stripe.secret_key_live
    test: env STRIPE_SECRET_KEY_TEST,
          secrets/api-keys.json -> stripe.secret_key_test

Exit codes:
    0 ok, 2 missing credential, 3 Stripe API error, 4 mode/key mismatch
"""

import argparse
import datetime
import json
import os
import sys
from collections import defaultdict

import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS_PATH = os.path.join(BASE_DIR, "secrets", "api-keys.json")
DEFAULT_OUT = os.path.join(BASE_DIR, "data", "stripe_revenue.json")
API = "https://api.stripe.com/v1"
TIMEOUT = 30

# Zero-decimal currencies (Stripe amounts are already whole units)
ZERO_DECIMAL = {"bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
                "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"}


class StripeError(RuntimeError):
    pass


def load_secrets():
    try:
        with open(SECRETS_PATH) as fh:
            return json.load(fh)
    except Exception:
        return {}


def get_key(mode):
    """Return the secret key for `mode`, or None. Never log or return partials."""
    secrets = load_secrets().get("stripe", {})
    if mode == "live":
        key = (os.environ.get("STRIPE_SECRET_KEY_LIVE")
               or os.environ.get("STRIPE_SECRET_KEY")
               or secrets.get("secret_key_live"))
    else:
        key = (os.environ.get("STRIPE_SECRET_KEY_TEST")
               or secrets.get("secret_key_test"))
    return key or None


def key_mode(key):
    """Infer mode from the key prefix without revealing the key."""
    if key.startswith("sk_live_") or key.startswith("rk_live_"):
        return "live"
    if key.startswith("sk_test_") or key.startswith("rk_test_"):
        return "test"
    return "unknown"


def units(amount, currency):
    """Convert a Stripe minor-unit amount to major units."""
    if (currency or "").lower() in ZERO_DECIMAL:
        return float(amount)
    return amount / 100.0


def get_all(key, path, params=None):
    """Paginate a Stripe list endpoint. GET only."""
    out = []
    params = dict(params or {})
    params["limit"] = 100
    starting_after = None
    while True:
        if starting_after:
            params["starting_after"] = starting_after
        resp = requests.get(f"{API}/{path}", auth=(key, ""), params=params, timeout=TIMEOUT)
        if resp.status_code != 200:
            detail = ""
            try:
                detail = resp.json().get("error", {}).get("message", "")
            except Exception:
                pass
            raise StripeError(f"GET /{path} returned HTTP {resp.status_code}. {detail}".strip())
        body = resp.json()
        data = body.get("data", [])
        out.extend(data)
        if not body.get("has_more") or not data:
            break
        starting_after = data[-1]["id"]
    return out


OWNER_EMAILS = {"iambrew@gmail.com", "hello@carnivoreweekly.com", "mike@carnivoreweekly.com"}


def session_index(key):
    """Map payment_intent -> product name and owner-purchase flag via Checkout Sessions.

    Customer emails are used only to flag the owner's own test purchases. They are
    never stored in the report output.
    """
    index = {}
    try:
        sessions = get_all(key, "checkout/sessions", {"expand[]": "data.line_items"})
    except StripeError:
        return index
    for s in sessions:
        pi = s.get("payment_intent")
        if not pi:
            continue
        items = (s.get("line_items") or {}).get("data", [])
        product = items[0].get("description") if items else None
        meta = s.get("metadata") or {}
        email = (meta.get("email")
                 or (s.get("customer_details") or {}).get("email")
                 or "").strip().lower()
        index[pi] = {
            "product": product,
            "owner_purchase": email in OWNER_EMAILS,
        }
    return index


def utc_from(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc)


def month_of(ts):
    return utc_from(ts).strftime("%Y-%m")


def collect(key, mode):
    """Pull charges, refunds and disputes for one mode and roll them up."""
    actual = key_mode(key)
    if actual != "unknown" and actual != mode:
        raise StripeError(
            f"Key for '{mode}' mode is actually a '{actual}' key. Refusing to mix modes."
        )

    account = requests.get(f"{API}/account", auth=(key, ""), timeout=TIMEOUT)
    if account.status_code != 200:
        raise StripeError(f"GET /account returned HTTP {account.status_code}. Key rejected.")
    acct = account.json()

    charges = get_all(key, "charges", {"expand[]": "data.balance_transaction"})
    refunds = get_all(key, "refunds", {"expand[]": "data.balance_transaction"})
    disputes = get_all(key, "disputes")
    sessions = session_index(key)

    livemodes = {bool(c.get("livemode")) for c in charges}
    if len(livemodes) > 1:
        raise StripeError("Charge list mixed livemode true and false. Aborting.")
    livemode = livemodes.pop() if livemodes else (mode == "live")
    if charges and livemode != (mode == "live"):
        raise StripeError(f"Expected {mode} mode data but Stripe returned livemode={livemode}.")

    succeeded = [c for c in charges if c.get("status") == "succeeded"]
    failed = [c for c in charges if c.get("status") == "failed"]
    pending = [c for c in charges if c.get("status") == "pending"]

    by_currency = defaultdict(lambda: {"gross": 0, "refunded": 0, "count": 0})
    by_month = defaultdict(lambda: defaultdict(lambda: {"gross": 0, "count": 0}))
    settlement = defaultdict(lambda: {"gross": 0, "fees": 0, "net": 0})

    for c in succeeded:
        cur = (c.get("currency") or "").lower()
        by_currency[cur]["gross"] += c.get("amount", 0)
        by_currency[cur]["refunded"] += c.get("amount_refunded", 0)
        by_currency[cur]["count"] += 1
        m = month_of(c["created"])
        by_month[m][cur]["gross"] += c.get("amount", 0)
        by_month[m][cur]["count"] += 1
        bt = c.get("balance_transaction")
        if isinstance(bt, dict):
            scur = (bt.get("currency") or "").lower()
            settlement[scur]["gross"] += bt.get("amount", 0)
            settlement[scur]["fees"] += bt.get("fee", 0)
            settlement[scur]["net"] += bt.get("net", 0)

    # Refunds reduce settlement net (their balance transactions are negative).
    refund_settlement = defaultdict(lambda: {"amount": 0, "fee": 0, "net": 0})
    for r in refunds:
        bt = r.get("balance_transaction")
        if isinstance(bt, dict):
            scur = (bt.get("currency") or "").lower()
            refund_settlement[scur]["amount"] += bt.get("amount", 0)
            refund_settlement[scur]["fee"] += bt.get("fee", 0)
            refund_settlement[scur]["net"] += bt.get("net", 0)

    dispute_settlement = defaultdict(int)
    for d in disputes:
        dispute_settlement[(d.get("currency") or "").lower()] += d.get("amount", 0)

    currencies = {}
    for cur, v in sorted(by_currency.items()):
        currencies[cur] = {
            "successful_payments": v["count"],
            "gross": round(units(v["gross"], cur), 2),
            "refunded": round(units(v["refunded"], cur), 2),
            "gross_after_refunds": round(units(v["gross"] - v["refunded"], cur), 2),
        }

    settled = {}
    for cur in sorted(set(settlement) | set(refund_settlement)):
        s = settlement.get(cur, {"gross": 0, "fees": 0, "net": 0})
        r = refund_settlement.get(cur, {"amount": 0, "fee": 0, "net": 0})
        settled[cur] = {
            "gross": round(units(s["gross"], cur), 2),
            "stripe_fees": round(units(s["fees"] + r["fee"], cur), 2),
            "refunds": round(units(-r["amount"], cur), 2),
            "net_after_fees_and_refunds": round(units(s["net"] + r["net"], cur), 2),
        }

    months = {}
    for m in sorted(by_month):
        months[m] = {
            cur: {"gross": round(units(v["gross"], cur), 2), "count": v["count"]}
            for cur, v in sorted(by_month[m].items())
        }

    # Real customer revenue: succeeded, not refunded, not one of the owner's own
    # test purchases made against the live key.
    customer = defaultdict(lambda: {"amount": 0, "count": 0})
    by_product = defaultdict(lambda: defaultdict(lambda: {"amount": 0, "count": 0}))
    owner_test = defaultdict(lambda: {"amount": 0, "count": 0})
    for c in succeeded:
        cur = (c.get("currency") or "").lower()
        info = sessions.get(c.get("payment_intent"), {})
        kept = c.get("amount", 0) - c.get("amount_refunded", 0)
        if info.get("owner_purchase"):
            owner_test[cur]["amount"] += c.get("amount", 0)
            owner_test[cur]["count"] += 1
            continue
        if kept <= 0:
            continue
        customer[cur]["amount"] += kept
        customer[cur]["count"] += 1
        by_product[info.get("product") or "(unattributed)"][cur]["amount"] += kept
        by_product[info.get("product") or "(unattributed)"][cur]["count"] += 1

    return {
        "mode": mode,
        "livemode": livemode,
        "account_id": acct.get("id"),
        "account_default_currency": (acct.get("default_currency") or "").lower(),
        "charges_seen": len(charges),
        "successful_payments": len(succeeded),
        "failed_payments": len(failed),
        "pending_payments": len(pending),
        "refund_count": len(refunds),
        "dispute_count": len(disputes),
        "disputed_amounts": {c: round(units(a, c), 2) for c, a in sorted(dispute_settlement.items())},
        "lifetime_by_presentment_currency": currencies,
        "lifetime_by_settlement_currency": settled,
        "real_customer_revenue": {
            cur: {"amount": round(units(v["amount"], cur), 2), "count": v["count"]}
            for cur, v in sorted(customer.items())
        },
        "owner_test_purchases": {
            cur: {"amount": round(units(v["amount"], cur), 2), "count": v["count"]}
            for cur, v in sorted(owner_test.items())
        },
        "real_customer_revenue_by_product": {
            prod: {cur: {"amount": round(units(v["amount"], cur), 2), "count": v["count"]}
                   for cur, v in sorted(curs.items())}
            for prod, curs in sorted(by_product.items())
        },
        "by_month": months,
        "payments": [
            {
                "id": c["id"],
                "created_utc": utc_from(c["created"]).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "amount": round(units(c.get("amount", 0), c.get("currency")), 2),
                "currency": (c.get("currency") or "").lower(),
                "refunded": round(units(c.get("amount_refunded", 0), c.get("currency")), 2),
                "disputed": bool(c.get("disputed")),
                "product": (sessions.get(c.get("payment_intent"), {}).get("product")
                            or "(unattributed)"),
                "owner_purchase": bool(
                    sessions.get(c.get("payment_intent"), {}).get("owner_purchase")
                ),
            }
            for c in sorted(succeeded, key=lambda x: x["created"])
        ],
    }


def money(amount, currency):
    return f"{amount:,.2f} {currency.upper()}"


def render(result):
    lines = []
    tag = "LIVE" if result["mode"] == "live" else "TEST (not real money)"
    lines.append("")
    lines.append("=" * 66)
    lines.append(f"  STRIPE {tag}  ·  account {result['account_id']}")
    lines.append("=" * 66)
    lines.append(f"  Successful payments : {result['successful_payments']}")
    lines.append(f"  Failed / pending    : {result['failed_payments']} / {result['pending_payments']}")
    lines.append(f"  Refunds / disputes  : {result['refund_count']} / {result['dispute_count']}")
    lines.append("")

    lines.append("  Lifetime gross by charge currency")
    if not result["lifetime_by_presentment_currency"]:
        lines.append("    (no successful payments)")
    for cur, v in result["lifetime_by_presentment_currency"].items():
        lines.append(
            f"    {cur.upper()}: {money(v['gross'], cur)} gross across {v['successful_payments']} "
            f"payment(s); refunded {money(v['refunded'], cur)}; "
            f"after refunds {money(v['gross_after_refunds'], cur)}"
        )
    lines.append("")

    lines.append("  Lifetime net of Stripe fees (settlement currency)")
    if not result["lifetime_by_settlement_currency"]:
        lines.append("    (no settled transactions)")
    for cur, v in result["lifetime_by_settlement_currency"].items():
        lines.append(
            f"    {cur.upper()}: gross {money(v['gross'], cur)} "
            f"- fees {money(v['stripe_fees'], cur)} "
            f"- refunds {money(v['refunds'], cur)} "
            f"= net {money(v['net_after_fees_and_refunds'], cur)}"
        )
    lines.append("")

    lines.append("  REAL CUSTOMER REVENUE (excludes refunds and the owner's own test buys)")
    if not result["real_customer_revenue"]:
        lines.append("    (none)")
    for cur, v in result["real_customer_revenue"].items():
        lines.append(f"    {money(v['amount'], cur)} across {v['count']} sale(s)")
    if result["owner_test_purchases"]:
        for cur, v in result["owner_test_purchases"].items():
            lines.append(
                f"    excluded as owner test purchases: {money(v['amount'], cur)} "
                f"across {v['count']} charge(s)"
            )
    lines.append("")

    lines.append("  Real customer revenue by product")
    if not result["real_customer_revenue_by_product"]:
        lines.append("    (none)")
    for prod, curs in result["real_customer_revenue_by_product"].items():
        parts = [f"{money(v['amount'], cur)} ({v['count']})" for cur, v in curs.items()]
        lines.append(f"    {prod}: " + "  ".join(parts))
    lines.append("")

    lines.append("  Per-month gross (UTC)")
    if not result["by_month"]:
        lines.append("    (none)")
    for m, curs in result["by_month"].items():
        parts = [f"{money(v['gross'], cur)} ({v['count']})" for cur, v in curs.items()]
        lines.append(f"    {m}: " + "  ".join(parts))
    lines.append("")

    lines.append("  Individual successful payments")
    for p in result["payments"]:
        flags = []
        if p["refunded"]:
            flags.append(f"refunded {money(p['refunded'], p['currency'])}")
        if p["disputed"]:
            flags.append("DISPUTED")
        suffix = ("  [" + ", ".join(flags) + "]") if flags else ""
        if p["owner_purchase"]:
            flags.append("OWNER TEST BUY")
            suffix = "  [" + ", ".join(flags) + "]"
        desc = (p["product"] or "")[:42]
        lines.append(
            f"    {p['created_utc'][:10]}  {money(p['amount'], p['currency']):>14}  {desc}{suffix}"
        )
    lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="Read-only Stripe revenue report.")
    ap.add_argument("--mode", choices=["live", "test", "both"], default="live",
                    help="Which Stripe mode to report. Modes are never summed together.")
    ap.add_argument("--out", default=DEFAULT_OUT, help="Path for the JSON output.")
    ap.add_argument("--json-only", action="store_true", help="Suppress the human summary.")
    args = ap.parse_args()

    modes = ["live", "test"] if args.mode == "both" else [args.mode]
    report = {
        "generated_utc": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "stripe_api_read_only",
        "modes": {},
    }
    failures = {}

    for mode in modes:
        key = get_key(mode)
        if not key:
            env_hint = ("STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY"
                        if mode == "live" else "STRIPE_SECRET_KEY_TEST")
            failures[mode] = (
                f"no Stripe {mode}-mode secret key found. Set {env_hint} or add "
                f"stripe.secret_key_{mode} to secrets/api-keys.json."
            )
            report["modes"][mode] = {"mode": mode, "error": failures[mode]}
            continue
        try:
            report["modes"][mode] = collect(key, mode)
        except StripeError as exc:
            failures[mode] = str(exc)
            report["modes"][mode] = {"mode": mode, "error": str(exc)}
        except requests.RequestException as exc:
            failures[mode] = f"could not reach the Stripe API ({exc.__class__.__name__})."
            report["modes"][mode] = {"mode": mode, "error": failures[mode]}

    for mode, msg in failures.items():
        sys.stderr.write(
            f"ERROR: Stripe {mode} mode produced NO DATA: {msg}\n"
            f"       Treat the {mode} numbers as unknown, not as zero.\n"
        )

    if not args.json_only:
        for mode in modes:
            if "error" in report["modes"][mode]:
                continue
            print(render(report["modes"][mode]))
        if args.mode == "both":
            print("  NOTE: live and test totals above are deliberately kept separate.")
            print("        Only the LIVE block is real revenue.\n")

    if len(failures) == len(modes):
        sys.stderr.write(
            "FATAL: no mode returned data. Leaving any previous JSON untouched so that a\n"
            "       stale-but-real number is never replaced by a fake zero.\n"
        )
        sys.exit(2 if all("no Stripe" in m for m in failures.values()) else 3)

    out_path = args.out if os.path.isabs(args.out) else os.path.join(BASE_DIR, args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as fh:
        json.dump(report, fh, indent=2)
    if not args.json_only:
        print(f"  JSON written to {os.path.relpath(out_path, BASE_DIR)}\n")
    else:
        print(json.dumps(report, indent=2))

    if failures:
        sys.exit(2 if all("no Stripe" in m for m in failures.values()) else 3)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Tests for the shared CW+KD daily image spend cap.

No network, no API keys, no money. Every case runs against a temp config and
temp ledger so the real ledger is never touched.

Run: python3 tests/test_image_budget.py
"""

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from image_budget import BudgetBlocked, ImageBudget, today_str  # noqa: E402

FLUX = "black-forest-labs/flux-schnell"
HAIKU = "claude-haiku-4-5-20251001"

PASSED = []
FAILED = []


def check(name, condition, detail=""):
    if condition:
        PASSED.append(name)
        print(f"  PASS  {name}")
    else:
        FAILED.append(f"{name} {detail}".strip())
        print(f"  FAIL  {name} {detail}")


class Sandbox:
    """A throwaway config + ledger pair."""

    def __init__(self, config=None, ledger_lines=None):
        self.dir = Path(tempfile.mkdtemp(prefix="imgbudget-"))
        self.config_file = self.dir / "image-budget.json"
        self.ledger_file = self.dir / "image-spend-ledger.jsonl"
        if config is not None:
            self.config_file.write_text(
                config if isinstance(config, str) else json.dumps(config)
            )
        if ledger_lines is not None:
            self.ledger_file.write_text("".join(ledger_lines))

    def budget(self, **kw):
        return ImageBudget(
            config_file=self.config_file, ledger_file=self.ledger_file, **kw
        )

    def close(self):
        shutil.rmtree(self.dir, ignore_errors=True)


def good_config(cap=1.0, enabled=True):
    return {
        "enabled": enabled,
        "daily_cap_usd": cap,
        "timezone": "America/Vancouver",
        "unit_costs_usd": {FLUX: 0.003, HAIKU: 0.0006},
    }


def row(cost, day=None, site="cw", model=FLUX):
    return json.dumps({
        "date": day or today_str(),
        "site": site,
        "post": "test",
        "image": "x.jpg",
        "model": model,
        "cost_usd": cost,
    }) + "\n"


# ---------------------------------------------------------------- happy path

def test_fresh_budget_allows_spend():
    sb = Sandbox(good_config())
    try:
        b = sb.budget()
        check("fresh budget is available", b.available, b.blocked_reason or "")
        check("fresh budget spent is zero", b.spent_today == 0.0)
        check("fresh budget remaining is the cap", b.remaining == 1.0)
        ok, why = b.check(FLUX)
        check("fresh budget allows an image", ok, why or "")
    finally:
        sb.close()


def test_record_accumulates_and_persists():
    sb = Sandbox(good_config())
    try:
        b = sb.budget()
        b.record(site="cw", post="p1", image="a.jpg", model=FLUX)
        check("record updates in-memory total", abs(b.spent_today - 0.003) < 1e-9)

        reloaded = sb.budget()
        check(
            "spend survives a reload",
            abs(reloaded.spent_today - 0.003) < 1e-9,
            f"got {reloaded.spent_today}",
        )
        lines = [l for l in sb.ledger_file.read_text().splitlines() if l.strip()]
        check("ledger has one row", len(lines) == 1, f"got {len(lines)}")
        entry = json.loads(lines[0])
        for field in ("date", "site", "post", "image", "model", "cost_usd"):
            check(f"ledger row has {field}", field in entry)
    finally:
        sb.close()


def test_yesterday_does_not_count_against_today():
    sb = Sandbox(good_config(), ledger_lines=[row(0.99, day="2020-01-01")])
    try:
        b = sb.budget()
        check("old spend excluded from today", b.spent_today == 0.0, f"got {b.spent_today}")
        ok, _ = b.check(FLUX)
        check("old spend does not block today", ok)
    finally:
        sb.close()


# ------------------------------------------------------------ the cap itself

def test_cap_blocks_when_reached():
    sb = Sandbox(good_config(), ledger_lines=[row(1.0)])
    try:
        b = sb.budget()
        check("spent equals cap", abs(b.spent_today - 1.0) < 1e-9)
        check("remaining is zero", b.remaining == 0.0)
        ok, why = b.check(FLUX)
        check("cap refuses further spend", not ok)
        check("refusal explains itself", bool(why) and "cap" in (why or ""), why or "")
    finally:
        sb.close()


def test_cap_blocks_the_call_that_would_exceed_it():
    # 0.9985 spent, cap 1.00, next image 0.003 -> would land at 1.0015.
    sb = Sandbox(good_config(), ledger_lines=[row(0.9985)])
    try:
        b = sb.budget()
        ok, _ = b.check(FLUX)
        check("cap refuses the call that would exceed it", not ok)
    finally:
        sb.close()


def test_shared_pool_across_sites():
    sb = Sandbox(good_config(cap=0.01))
    try:
        b = sb.budget()
        b.record(site="cw", post="cw1", image="a.jpg", model=FLUX)
        b.record(site="kd", post="kd1", image="b.jpg", model=FLUX)
        b.record(site="kd", post="kd2", image="c.jpg", model=FLUX)
        check("three images spent 0.009", abs(b.spent_today - 0.009) < 1e-9)
        ok, _ = b.check(FLUX)
        check("KD spend eats into the same pool as CW", not ok)
    finally:
        sb.close()


def test_check_pair_prices_the_whole_chain():
    # Room for exactly one image but not for prompt + image.
    sb = Sandbox(good_config(cap=0.0035))
    try:
        b = sb.budget()
        ok_single, _ = b.check(FLUX)
        check("single image fits", ok_single)
        ok_pair, why = b.check_pair(HAIKU, FLUX)
        check("prompt plus image does not fit", not ok_pair, why or "")
    finally:
        sb.close()


# --------------------------------------------------------------- fail closed

def test_missing_config_fails_closed():
    sb = Sandbox(config=None)
    try:
        b = sb.budget()
        check("missing config blocks", not b.available)
        ok, _ = b.check(FLUX)
        check("missing config refuses spend", not ok)
    finally:
        sb.close()


def test_corrupt_config_fails_closed():
    sb = Sandbox(config="{ this is not json")
    try:
        b = sb.budget()
        check("corrupt config blocks", not b.available)
        check("corrupt config says why", "valid JSON" in (b.blocked_reason or ""))
    finally:
        sb.close()


def test_disabled_fails_closed():
    sb = Sandbox(good_config(enabled=False))
    try:
        b = sb.budget()
        check("disabled blocks", not b.available)
        ok, _ = b.check(FLUX)
        check("disabled refuses spend", not ok)
    finally:
        sb.close()


def test_zero_cap_blocks_everything():
    sb = Sandbox(good_config(cap=0.0))
    try:
        b = sb.budget()
        check("zero cap is still available", b.available, b.blocked_reason or "")
        ok, _ = b.check(FLUX)
        check("zero cap refuses every image", not ok)
    finally:
        sb.close()


def test_corrupt_ledger_fails_closed():
    sb = Sandbox(good_config(), ledger_lines=[row(0.001), "NOT JSON AT ALL\n"])
    try:
        b = sb.budget()
        check("corrupt ledger blocks", not b.available)
        check("corrupt ledger says why", "corrupt" in (b.blocked_reason or "").lower())
        ok, _ = b.check(FLUX)
        check("corrupt ledger refuses spend", not ok)
    finally:
        sb.close()


def test_non_numeric_cost_fails_closed():
    sb = Sandbox(good_config(), ledger_lines=[
        json.dumps({"date": today_str(), "cost_usd": "lots"}) + "\n"
    ])
    try:
        b = sb.budget()
        check("non-numeric cost blocks", not b.available)
    finally:
        sb.close()


def test_unknown_model_fails_closed():
    sb = Sandbox(good_config())
    try:
        b = sb.budget()
        ok, why = b.check("some/model-nobody-priced")
        check("unpriced model is refused", not ok)
        check("unpriced model says why", "unit cost" in (why or ""), why or "")
        raised = False
        try:
            b.record(site="cw", post="p", image="i", model="some/model-nobody-priced")
        except BudgetBlocked:
            raised = True
        check("recording an unpriced model raises", raised)
    finally:
        sb.close()


def test_unwritable_ledger_fails_closed():
    sb = Sandbox(good_config())
    try:
        sb.ledger_file.write_text("")
        os.chmod(sb.ledger_file, 0o444)
        b = sb.budget()
        check("read-only ledger blocks", not b.available, b.blocked_reason or "")
        os.chmod(sb.ledger_file, 0o644)
    finally:
        sb.close()


def test_bad_cap_value_fails_closed():
    cfg = good_config()
    cfg["daily_cap_usd"] = "one dollar"
    sb = Sandbox(cfg)
    try:
        b = sb.budget()
        check("non-numeric cap blocks", not b.available)
    finally:
        sb.close()


# -------------------------------------------------------------- dry run mode

def test_dry_run_writes_nothing():
    sb = Sandbox(good_config())
    try:
        b = sb.budget(dry_run=True)
        b.record(site="cw", post="p", image="i.jpg", model=FLUX)
        check("dry run leaves no ledger file", not sb.ledger_file.exists())
        check("dry run still tracks in memory", abs(b.spent_today - 0.003) < 1e-9)
    finally:
        sb.close()


# --------------------------------------------------------------- CEO reports

def test_report_line_for_a_quiet_day():
    sb = Sandbox(good_config())
    try:
        b = sb.budget()
        line = b.report_line("2020-01-01")
        check("quiet day reports zero", "$0.00" in line, line)
        check("quiet day names the cap", "$1.00" in line, line)
    finally:
        sb.close()


def test_report_line_counts_images_not_prompts():
    sb = Sandbox(good_config(), ledger_lines=[
        row(0.0006, day="2026-08-08", site="cw", model=HAIKU),
        row(0.003, day="2026-08-08", site="cw"),
        row(0.0006, day="2026-08-08", site="kd", model=HAIKU),
        row(0.003, day="2026-08-08", site="kd"),
        row(0.003, day="2026-08-08", site="kd"),
    ])
    try:
        b = sb.budget()
        s = b.day_summary("2026-08-08")
        check("summary totals all cost", abs(s["total_usd"] - 0.0102) < 1e-6, str(s["total_usd"]))
        check("summary counts 3 images not 5 calls", s["images"] == 3, str(s["images"]))
        check("summary splits by site", s["by_site"] == {"cw": 1, "kd": 2}, str(s["by_site"]))
        line = b.report_line("2026-08-08")
        check("report line mentions both sites", "CW 1" in line and "KD 2" in line, line)
    finally:
        sb.close()


# ------------------------------------------------------- the shipped config

def test_shipped_config_is_on_at_one_dollar():
    b = ImageBudget()
    check("shipped budget loads", b.available, b.blocked_reason or "")
    check("shipped cap is $1.00", b.cap == 1.0, str(b.cap))
    check("shipped budget is enabled", b.enabled is True)
    check("flux is priced", b.unit_cost(FLUX) is not None)
    check("haiku is priced", b.unit_cost(HAIKU) is not None)
    check("nano-banana-pro is priced", b.unit_cost("google/nano-banana-pro") is not None)


def main():
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    print(f"Running {len(tests)} image budget test groups\n")
    for t in tests:
        print(t.__name__)
        t()
        print()

    print("=" * 60)
    print(f"{len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        for f in FAILED:
            print(f"  FAILED: {f}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

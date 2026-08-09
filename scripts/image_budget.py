#!/usr/bin/env python3
"""
Shared daily image-generation spend cap for Carnivore Weekly and KetoDial.

ONE pool across both sites. Brew approved $1.00/day total on 2026-08-08, on the
condition that yesterday's spend shows up in his morning CEO brief.

Design rule: FAIL CLOSED. If the config cannot be read, the ledger cannot be
read or written, or a model's unit cost is unknown, nothing is generated. A
missing image is cheap; an uncapped Replicate loop is not.

Config: config/image-budget.json
Ledger: data/image-spend-ledger.jsonl (one JSON object per line, append only)

Typical use:

    from image_budget import ImageBudget, BudgetBlocked

    budget = ImageBudget()
    ok, why = budget.check("black-forest-labs/flux-schnell")
    if not ok:
        print(f"  SKIPPED (budget): {why}")
        continue
    ... make the API call ...
    budget.record(site="cw", post=slug, image=str(dest),
                  model="black-forest-labs/flux-schnell")

CLI:
    python3 scripts/image_budget.py --status
    python3 scripts/image_budget.py --report            # yesterday, one line
    python3 scripts/image_budget.py --report --date 2026-08-09
"""

import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover - Python < 3.9
    ZoneInfo = None

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_FILE = BASE_DIR / "config" / "image-budget.json"
DEFAULT_LEDGER_FILE = BASE_DIR / "data" / "image-spend-ledger.jsonl"

DEFAULT_TZ = "America/Vancouver"

# Floating point slop guard so 0.003 * 333 style sums do not overshoot the cap
# by a fraction of a cent and refuse a legitimate image.
EPSILON = 1e-9


class BudgetBlocked(Exception):
    """Raised when the budget system cannot vouch for a spend. Always fatal."""


def today_str(tz_name=DEFAULT_TZ):
    """Today's date in Pacific time. Vault rule: never a bare local date."""
    if ZoneInfo is not None:
        try:
            return datetime.now(ZoneInfo(tz_name)).date().isoformat()
        except Exception:
            pass
    return date.today().isoformat()


def yesterday_str(tz_name=DEFAULT_TZ):
    return (date.fromisoformat(today_str(tz_name)) - timedelta(days=1)).isoformat()


class ImageBudget:
    """Reads the cap, reads the ledger, answers can-I-spend, appends what was spent."""

    def __init__(self, config_file=None, ledger_file=None, dry_run=False):
        self.config_file = Path(config_file) if config_file else DEFAULT_CONFIG_FILE
        self.ledger_file = Path(ledger_file) if ledger_file else DEFAULT_LEDGER_FILE
        self.dry_run = dry_run

        self.blocked_reason = None
        self.config = {}
        self.enabled = False
        self.cap = 0.0
        self.tz_name = DEFAULT_TZ
        self.unit_costs = {}
        self.today = today_str()
        self._spent_today = 0.0

        self._load()

    # ------------------------------------------------------------------ load

    def _load(self):
        try:
            raw = self.config_file.read_text()
        except Exception as e:
            self.blocked_reason = f"cannot read {self.config_file}: {e}"
            return

        try:
            cfg = json.loads(raw)
        except Exception as e:
            self.blocked_reason = f"{self.config_file} is not valid JSON: {e}"
            return

        if not isinstance(cfg, dict):
            self.blocked_reason = f"{self.config_file} must contain a JSON object"
            return

        self.config = cfg
        self.tz_name = cfg.get("timezone") or DEFAULT_TZ
        self.today = today_str(self.tz_name)

        self.enabled = cfg.get("enabled")
        if self.enabled is not True:
            self.blocked_reason = "image budget is disabled (config enabled != true)"
            return

        cap = cfg.get("daily_cap_usd")
        if not isinstance(cap, (int, float)) or isinstance(cap, bool) or cap < 0:
            self.blocked_reason = f"daily_cap_usd must be a non-negative number, got {cap!r}"
            return
        self.cap = float(cap)

        costs = cfg.get("unit_costs_usd")
        if not isinstance(costs, dict) or not costs:
            self.blocked_reason = "unit_costs_usd must be a non-empty object"
            return
        clean = {}
        for key, value in costs.items():
            if key.startswith("_"):
                continue
            if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
                self.blocked_reason = f"unit cost for {key!r} is not a non-negative number"
                return
            clean[key] = float(value)
        self.unit_costs = clean

        try:
            self._spent_today = self._read_spend(self.today)
        except BudgetBlocked as e:
            self.blocked_reason = str(e)
            return

        if not self._ledger_writable():
            self.blocked_reason = f"ledger not writable: {self.ledger_file}"
            return

    def _ledger_writable(self):
        try:
            self.ledger_file.parent.mkdir(parents=True, exist_ok=True)
        except Exception:
            return False
        if self.ledger_file.exists():
            return os.access(self.ledger_file, os.W_OK)
        return os.access(self.ledger_file.parent, os.W_OK)

    def _read_spend(self, day):
        """Sum of cost_usd for one day. A corrupt ledger blocks; it never guesses."""
        if not self.ledger_file.exists():
            return 0.0
        try:
            lines = self.ledger_file.read_text().splitlines()
        except Exception as e:
            raise BudgetBlocked(f"cannot read ledger {self.ledger_file}: {e}")

        total = 0.0
        for n, line in enumerate(lines, 1):
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except Exception as e:
                raise BudgetBlocked(f"ledger line {n} is corrupt ({e}); refusing to spend")
            if entry.get("date") != day:
                continue
            cost = entry.get("cost_usd")
            if not isinstance(cost, (int, float)) or isinstance(cost, bool):
                raise BudgetBlocked(f"ledger line {n} has a non-numeric cost_usd; refusing to spend")
            total += float(cost)
        return total

    # ---------------------------------------------------------------- queries

    @property
    def available(self):
        return self.blocked_reason is None

    @property
    def spent_today(self):
        return round(self._spent_today, 6)

    @property
    def remaining(self):
        if not self.available:
            return 0.0
        return round(max(0.0, self.cap - self._spent_today), 6)

    def unit_cost(self, model):
        return self.unit_costs.get(model)

    def check(self, model, quantity=1):
        """(ok, reason). Never returns ok=True when anything is uncertain."""
        if not self.available:
            return False, self.blocked_reason

        cost = self.unit_cost(model)
        if cost is None:
            return False, (
                f"no unit cost configured for model {model!r}; "
                f"add it to {self.config_file.name} before generating"
            )

        projected = self._spent_today + (cost * quantity)
        if projected > self.cap + EPSILON:
            return False, (
                f"daily cap reached: ${self._spent_today:.4f} spent of ${self.cap:.2f}, "
                f"next call needs ${cost * quantity:.4f}"
            )
        return True, None

    def check_pair(self, *models):
        """Can we afford this whole chain of calls? All or nothing."""
        if not self.available:
            return False, self.blocked_reason

        total = 0.0
        for model in models:
            cost = self.unit_cost(model)
            if cost is None:
                return False, (
                    f"no unit cost configured for model {model!r}; "
                    f"add it to {self.config_file.name} before generating"
                )
            total += cost

        if self._spent_today + total > self.cap + EPSILON:
            return False, (
                f"daily cap reached: ${self._spent_today:.4f} spent of ${self.cap:.2f}, "
                f"this item needs ${total:.4f}"
            )
        return True, None

    # ----------------------------------------------------------------- record

    def record(self, site, post, image, model, quantity=1, cost_usd=None, note=""):
        """Append one spend row. Raises BudgetBlocked if it cannot be persisted."""
        if cost_usd is None:
            unit = self.unit_cost(model)
            if unit is None:
                raise BudgetBlocked(f"cannot record spend for unknown model {model!r}")
            cost_usd = unit * quantity

        entry = {
            "date": self.today,
            "ts": datetime.now(ZoneInfo(self.tz_name)).isoformat(timespec="seconds")
            if ZoneInfo is not None
            else datetime.now().isoformat(timespec="seconds"),
            "site": site,
            "post": post,
            "image": image,
            "model": model,
            "quantity": quantity,
            "cost_usd": round(float(cost_usd), 6),
        }
        if note:
            entry["note"] = note

        if self.dry_run:
            entry["dry_run"] = True
            self._spent_today += float(cost_usd)
            return entry

        try:
            with open(self.ledger_file, "a") as fh:
                fh.write(json.dumps(entry) + "\n")
                fh.flush()
                os.fsync(fh.fileno())
        except Exception as e:
            raise BudgetBlocked(f"cannot append to ledger {self.ledger_file}: {e}")

        self._spent_today += float(cost_usd)
        return entry

    # ---------------------------------------------------------------- reports

    def day_entries(self, day):
        if not self.ledger_file.exists():
            return []
        out = []
        for line in self.ledger_file.read_text().splitlines():
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except Exception:
                continue
            if entry.get("date") == day:
                out.append(entry)
        return out

    def day_summary(self, day):
        entries = self.day_entries(day)
        total = sum(float(e.get("cost_usd", 0) or 0) for e in entries)
        images = sum(
            1 for e in entries if not str(e.get("model", "")).startswith("claude-")
        )
        by_site = {}
        for e in entries:
            if str(e.get("model", "")).startswith("claude-"):
                continue
            by_site[e.get("site", "?")] = by_site.get(e.get("site", "?"), 0) + 1
        return {
            "date": day,
            "total_usd": round(total, 4),
            "images": images,
            "by_site": by_site,
            "cap_usd": self.cap,
            "entries": entries,
        }

    def report_line(self, day):
        """One phone-readable line for the CEO brief."""
        s = self.day_summary(day)
        if not s["entries"]:
            return f"Image spend {day}: $0.00 of ${self.cap:.2f} cap (no images generated)."
        sites = ", ".join(f"{k.upper()} {v}" for k, v in sorted(s["by_site"].items())) or "none"
        pct = (s["total_usd"] / self.cap * 100) if self.cap else 0
        return (
            f"Image spend {day}: ${s['total_usd']:.2f} of ${self.cap:.2f} cap "
            f"({pct:.0f}%), {s['images']} images ({sites})."
        )


def main():
    args = sys.argv[1:]
    day = None
    if "--date" in args:
        day = args[args.index("--date") + 1]

    budget = ImageBudget()

    if "--report" in args:
        # The CEO brief runs at 3:25am, so "yesterday" is the completed day.
        target = day or yesterday_str(budget.tz_name if budget.available else DEFAULT_TZ)
        if not budget.available:
            print(f"Image spend {target}: UNAVAILABLE ({budget.blocked_reason}).")
            return 0
        print(budget.report_line(target))
        return 0

    target = day or budget.today
    if not budget.available:
        print(f"Image budget: BLOCKED ({budget.blocked_reason})")
        return 1
    s = budget.day_summary(target)
    print(f"Image budget for {target}")
    print(f"  cap:       ${budget.cap:.2f}/day (shared CW + KD)")
    print(f"  spent:     ${s['total_usd']:.4f}")
    print(f"  remaining: ${budget.remaining:.4f}")
    print(f"  images:    {s['images']}  {s['by_site'] or ''}")
    print(f"  ledger:    {budget.ledger_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

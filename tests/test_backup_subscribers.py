#!/usr/bin/env python3
"""
Tests for the subscriber list backup.

No network, no Supabase, no API keys. Every case runs against a fake GET and a
temp directory, so the real list is never touched and no real backup is moved.

The point of these tests is the refusal path: a backup that silently comes back
short or empty is worse than no backup, because someone will trust it.

Run: python3 tests/test_backup_subscribers.py
"""

import json
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from backup_subscribers import (  # noqa: E402
    PAGE_SIZE,
    backup_filename,
    build_payload,
    fetch_all,
    parse_content_range,
    verify_payload,
    write_backup,
)

PASSED = []
FAILED = []

AT = datetime(2026, 9, 2, 14, 30, 12, tzinfo=timezone.utc)


def check(name, condition, detail=""):
    if condition:
        PASSED.append(name)
        print(f"  PASS  {name}")
    else:
        FAILED.append(f"{name} {detail}".strip())
        print(f"  FAIL  {name} {detail}")


class FakeResponse:
    def __init__(self, rows):
        self._rows = rows

    def json(self):
        return self._rows


def fake_getter(rows):
    """Stands in for PostgREST: honours limit/offset the way the real API does."""
    def get(table, params, extra_headers=None):
        offset = int(params.get("offset", 0))
        limit = int(params.get("limit", PAGE_SIZE))
        return FakeResponse(rows[offset:offset + limit])
    return get


def row(i):
    return {"id": i, "email": f"person{i}@example.com", "site": "cw", "status": "active"}


def test_parse_content_range():
    check("content-range total", parse_content_range("0-0/238") == 238)
    check("content-range full page", parse_content_range("0-99/238") == 238)
    check("content-range unknown", parse_content_range("0-0/*") is None)
    check("content-range missing", parse_content_range(None) is None)


def test_fetch_all_pages():
    rows = [row(i) for i in range(PAGE_SIZE + 37)]
    got = fetch_all(fake_getter(rows), "newsletter_subscribers")
    check("fetch_all crosses page boundary", len(got) == len(rows),
          f"got {len(got)} want {len(rows)}")
    check("fetch_all keeps order", got[0]["id"] == 0 and got[-1]["id"] == len(rows) - 1)


def test_fetch_all_exact_page():
    rows = [row(i) for i in range(PAGE_SIZE)]
    got = fetch_all(fake_getter(rows), "drip_subscribers")
    check("fetch_all exact page size", len(got) == PAGE_SIZE, f"got {len(got)}")


def test_payload_shape():
    p = build_payload({"newsletter_subscribers": [row(1)], "drip_subscribers": [row(2), row(3)]}, AT)
    check("payload total", p["total_rows"] == 3)
    check("payload per-table count", p["tables"]["drip_subscribers"]["count"] == 2)
    check("payload timestamp is Z", p["generated_at"] == "2026-09-02T14:30:12Z",
          p["generated_at"])
    check("payload keeps every column", set(p["tables"]["newsletter_subscribers"]["rows"][0]) ==
          {"id", "email", "site", "status"})


def test_verify_accepts_a_good_backup():
    p = build_payload({"newsletter_subscribers": [row(1)], "drip_subscribers": [row(2)]}, AT)
    check("verify clean", verify_payload(p, {"newsletter_subscribers": 1,
                                             "drip_subscribers": 1}) == [])


def test_verify_rejects_short_read():
    p = build_payload({"newsletter_subscribers": [row(1)], "drip_subscribers": [row(2)]}, AT)
    problems = verify_payload(p, {"newsletter_subscribers": 238, "drip_subscribers": 1})
    check("verify catches truncation", len(problems) == 1 and "238" in problems[0], problems)


def test_verify_rejects_empty_table():
    p = build_payload({"newsletter_subscribers": [], "drip_subscribers": [row(2)]}, AT)
    problems = verify_payload(p, {"newsletter_subscribers": 0, "drip_subscribers": 1})
    check("verify refuses empty", any("0 rows" in x for x in problems), problems)


def test_verify_rejects_missing_email():
    p = build_payload({"newsletter_subscribers": [{"id": 1, "email": ""}]}, AT)
    problems = verify_payload(p, {"newsletter_subscribers": 1})
    check("verify catches blank email", any("no email" in x for x in problems), problems)


def test_write_backup_roundtrip():
    tmp = Path(tempfile.mkdtemp(prefix="cw-backup-test-"))
    try:
        p = build_payload({"newsletter_subscribers": [row(i) for i in range(5)],
                           "drip_subscribers": [row(9)]}, AT)
        path = write_backup(p, tmp, AT)
        check("filename is timestamped", path.name == "subscribers-20260902T143012Z.json",
              path.name)
        check("file is 0600", oct(path.stat().st_mode)[-3:] == "600",
              oct(path.stat().st_mode))
        back = json.loads(path.read_text())
        check("roundtrip row count", len(back["tables"]["newsletter_subscribers"]["rows"]) == 5)
        check("roundtrip email intact",
              back["tables"]["drip_subscribers"]["rows"][0]["email"] == "person9@example.com")
    finally:
        shutil.rmtree(tmp)


def test_backup_filename_sorts_chronologically():
    a = backup_filename(datetime(2026, 9, 2, 1, 0, 0, tzinfo=timezone.utc))
    b = backup_filename(datetime(2026, 10, 1, 1, 0, 0, tzinfo=timezone.utc))
    check("filenames sort by date", sorted([b, a]) == [a, b])


def main():
    print("Subscriber backup tests")
    for fn in [
        test_parse_content_range,
        test_fetch_all_pages,
        test_fetch_all_exact_page,
        test_payload_shape,
        test_verify_accepts_a_good_backup,
        test_verify_rejects_short_read,
        test_verify_rejects_empty_table,
        test_verify_rejects_missing_email,
        test_write_backup_roundtrip,
        test_backup_filename_sorts_chronologically,
    ]:
        fn()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())

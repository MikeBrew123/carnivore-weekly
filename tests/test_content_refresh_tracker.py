#!/usr/bin/env python3
"""A page Google lists under two URLs must not lose its real numbers (2026-11-02)."""
import importlib.util
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("tracker", f"{ROOT}/scripts/content_refresh_tracker.py")
tracker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tracker)


class FakeGsc:
    def __init__(self, rows):
        self.rows = rows

    def searchanalytics(self):
        return self

    def query(self, **_):
        return self

    def execute(self):
        return {"rows": self.rows}


def row(url, impr, clicks, pos):
    return {"keys": [url], "impressions": impr, "clicks": clicks, "position": pos}


def test_url_variants_are_added_up():
    base = "https://carnivoreweekly.com/blog/2026-05-20-pork-chops"
    stats = tracker.page_stats(FakeGsc([row(base + ".html", 534, 1, 8.0), row(base, 1, 0, 60.0)]), "a", "b")
    assert stats["2026-05-20-pork-chops"]["impr"] == 535
    assert stats["2026-05-20-pork-chops"]["clicks"] == 1
    assert stats["2026-05-20-pork-chops"]["pos"] == 8.1


def test_order_of_variants_does_not_matter():
    base = "https://carnivoreweekly.com/blog/x"
    stats = tracker.page_stats(FakeGsc([row(base, 1, 0, 60.0), row(base + ".html", 534, 1, 8.0)]), "a", "b")
    assert stats["x"]["impr"] == 535


def test_non_blog_pages_are_ignored():
    assert tracker.page_stats(FakeGsc([row("https://carnivoreweekly.com/calculator.html", 9, 9, 1.0)]), "a", "b") == {}


if __name__ == "__main__":
    test_url_variants_are_added_up()
    test_order_of_variants_does_not_matter()
    test_non_blog_pages_are_ignored()
    print("ok")

#!/usr/bin/env python3
"""Signed unsubscribe links from the Python senders (2026-09-27).

WHY: the unsubscribe endpoint acted on ?email=...&site=... alone, so anyone who knew
an address could unsubscribe that person. Every link now carries an HMAC sig. The
worker side is covered by tests/unsubscribe-signed-link.test.mjs, which checks the
SAME fixed vector as below, so the three signers cannot drift apart silently.

WHAT MUST NOT REGRESS:
  - scripts/unsubscribe_link.py matches the fixed vector
  - drip, newsletter and coach-launch put a signed link in the body AND the
    List-Unsubscribe header, identical, with the right site
  - no sender mails anyone when UNSUBSCRIBE_SECRET is missing

NO EMAIL IS SENT. requests.post is replaced everywhere.
"""
import os
import sys
from pathlib import Path
from unittest import mock

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import unsubscribe_link  # noqa: E402
import send_drip  # noqa: E402
import send_newsletter  # noqa: E402
import send_coach_launch  # noqa: E402

# Same vector as tests/unsubscribe-signed-link.test.mjs (also checked with openssl).
VECTOR_SECRET = "vector-secret"
VECTOR_EMAIL = "reader+tag@example.com"
VECTOR_CW = "26ccdf56c2e2eb70b0e091dabd281480"
VECTOR_KD = "446ad78e471fb2f262c039ab50dbc658"
SECRET = "test-unsubscribe-secret"


class FakeResp:
    status_code = 200
    text = "{}"

    @staticmethod
    def json():
        return {"id": "stub-id"}


def test_signature_matches_the_shared_vector():
    assert unsubscribe_link.signature(VECTOR_EMAIL, "cw", VECTOR_SECRET) == VECTOR_CW
    assert unsubscribe_link.signature(VECTOR_EMAIL, "kd", VECTOR_SECRET) == VECTOR_KD
    assert unsubscribe_link.signature("  Reader+Tag@Example.COM ", "cw", VECTOR_SECRET) == VECTOR_CW


def test_url_shape_matches_the_worker():
    url = unsubscribe_link.unsubscribe_url(" Reader+Tag@Example.com ", "cw", VECTOR_SECRET)
    assert url == ("https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe"
                   f"?email=reader%2Btag%40example.com&site=cw&sig={VECTOR_CW}")


def test_unknown_site_is_refused():
    with pytest.raises(ValueError):
        unsubscribe_link.unsubscribe_url(VECTOR_EMAIL, "kd_coach", SECRET)


def test_missing_secret_raises(monkeypatch):
    monkeypatch.delenv("UNSUBSCRIBE_SECRET", raising=False)
    with pytest.raises(unsubscribe_link.MissingUnsubscribeSecret):
        unsubscribe_link.load_secret({})
    assert unsubscribe_link.load_secret({"unsubscribe": {"secret": "from-file"}}) == "from-file"
    monkeypatch.setenv("UNSUBSCRIBE_SECRET", "from-env")
    assert unsubscribe_link.load_secret({"unsubscribe": {"secret": "from-file"}}) == "from-env"


@pytest.mark.parametrize("site", ["cw", "kd"])
def test_drip_body_and_header_are_signed_and_identical(monkeypatch, site):
    monkeypatch.setattr(send_drip, "SITE", site)
    monkeypatch.setattr(send_drip, "CFG", send_drip.SITES[site])
    monkeypatch.setattr(send_drip, "UNSUB_SECRET", SECRET)
    expected = unsubscribe_link.unsubscribe_url("reader@example.com", site, SECRET)
    html = send_drip.personalize('<a href="{$unsubscribe}">Unsubscribe</a>', "reader@example.com")
    assert f'href="{expected}"' in html

    sent = []
    with mock.patch.object(send_drip.requests, "post", side_effect=lambda url, **kw: sent.append(kw["json"]) or FakeResp()), \
         mock.patch.object(send_drip.send_guard, "allow", return_value=True), \
         mock.patch.object(send_drip.time, "sleep", return_value=None):
        send_drip.send_email("stub", "reader@example.com", "s", html, log=False)
    assert sent and sent[0]["headers"]["List-Unsubscribe"] == f"<{expected}>"
    assert "&sig=" in expected and f"&site={site}" in expected


def test_drip_refuses_to_run_without_secret(monkeypatch):
    monkeypatch.delenv("UNSUBSCRIBE_SECRET", raising=False)
    monkeypatch.setattr(send_drip, "load_secrets", lambda: {"supabase": {"url": "u", "service_role_key": "k"}, "resend": {"key": "r"}})
    monkeypatch.setattr(sys, "argv", ["send_drip.py", "--site", "cw"])
    with mock.patch.object(send_drip.requests, "post") as post, \
         mock.patch.object(send_drip.requests, "get") as get, pytest.raises(SystemExit) as exc:
        send_drip.main()
    assert exc.value.code == 1
    post.assert_not_called()
    get.assert_not_called()


@pytest.mark.parametrize("site", ["cw", "kd"])
def test_newsletter_body_and_header_are_signed(monkeypatch, site):
    monkeypatch.setenv("UNSUBSCRIBE_SECRET", SECRET)
    cfg = send_newsletter.SITES[site]
    sent = []
    with mock.patch.object(send_newsletter.requests, "post", side_effect=lambda url, **kw: sent.append(kw["json"]) or FakeResp()), \
         mock.patch.object(send_newsletter.send_guard, "allow", return_value=True), \
         mock.patch.object(send_newsletter.time, "sleep", return_value=None):
        send_newsletter.send_via_resend("stub", cfg["from_email"], cfg["from_name"], cfg["reply_to"],
                                        ["reader@example.com"], "s", '<a href="{{unsubscribe_url}}">x</a>', site)
    expected = unsubscribe_link.unsubscribe_url("reader@example.com", site, SECRET)
    assert sent[0]["headers"]["List-Unsubscribe"] == f"<{expected}>"
    assert f'href="{expected}"' in sent[0]["html"]


def test_newsletter_sends_nothing_without_secret(monkeypatch):
    monkeypatch.delenv("UNSUBSCRIBE_SECRET", raising=False)
    with mock.patch.object(send_newsletter.requests, "post") as post, \
         mock.patch.object(send_newsletter.send_guard, "allow", return_value=True), \
         pytest.raises(unsubscribe_link.MissingUnsubscribeSecret):
        send_newsletter.send_via_resend("stub", "f", "n", "r", ["reader@example.com"], "s", "{{unsubscribe_url}}", "cw")
    post.assert_not_called()


def test_coach_launch_link_is_signed():
    html = send_coach_launch.personalise('<a href="{{unsubscribe_url}}">x</a>', "reader@example.com", SECRET)
    assert f'href="{unsubscribe_link.unsubscribe_url("reader@example.com", "cw", SECRET)}"' in html


def test_no_python_sender_builds_an_unsigned_link():
    for name in ("send_drip.py", "send_newsletter.py", "send_coach_launch.py"):
        src = (ROOT / "scripts" / name).read_text(encoding="utf-8")
        assert "v1/unsubscribe" not in src, f"{name} builds its own unsubscribe URL"

#!/usr/bin/env python3
"""Keep subscriber email addresses out of run logs.

Why this exists (2026-11-10): this repo is PUBLIC, and so are its GitHub
Actions logs. The drip and newsletter senders printed each subscriber's
address on every send, skip, graduation and failure line, so the logs of
daily-publish.yml, weekly-update.yml and pd-newsletter.yml were a list of
subscriber addresses anyone could read.

Two layers:

1. Source. The senders print a non-identifying reference instead of the
   address: ref(row_id) gives "sub:1a2b3c4d" (the first 8 characters of the
   Supabase row id, which can be looked up privately), and when no row id is
   known, ref(email=...) gives "ref:xxxxxxxx", a keyed hash that cannot be
   reversed from the public log.

2. Guard. install() wraps sys.stdout and sys.stderr so any email address that
   still reaches them (an HTTP error that echoes the recipient, a traceback
   holding a request URL, a line added later by someone who forgot) is
   replaced with "[email redacted]" before it is written. Each sender calls it
   at the very top of the file, before its other imports. URL-encoded
   addresses ("%40") are caught too, because Supabase filter URLs carry them.

Nothing is allowlisted: our own operational addresses are redacted as well,
which keeps the rule simple and the test strict.

Writes that go around sys.stdout (os.write on fd 1, sys.stdout.buffer, a child
process that inherits the file descriptor) are not covered by the guard. Every
sender run as a child process installs the guard itself.

Tested by tests/test_log_redaction.py.
"""

import atexit
import hashlib
import hmac
import os
import re
import secrets as _secrets
import sys

REDACTED = "[email redacted]"

# local part, then "@" or its URL encoding, then a dotted domain.
_LOCAL = r"[A-Za-z0-9._%+\-']+"
_AT = r"(?:@|%40)"
_DOMAIN = r"[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)+"
EMAIL_RE = re.compile(_LOCAL + _AT + _DOMAIN, re.IGNORECASE)
# Used only on a held fragment at flush time, when the address may be cut off
# before its dot: anything shaped like "x@y" goes.
_LOOSE_RE = re.compile(r"[^\s<>\"'(),;]*" + _AT + r"[^\s<>\"'(),;]*", re.IGNORECASE)
# Characters that can belong to an address. A write that ends in a run of
# these may be the first half of one, so that run is held back until the
# next write, a newline, or a flush.
_TAIL_RE = re.compile(r"[A-Za-z0-9._%+\-'@]+\Z")

_PROCESS_KEY = _secrets.token_bytes(16)


def redact(text):
    """Return text with every email address replaced by REDACTED."""
    if not isinstance(text, str):
        text = str(text)
    return EMAIL_RE.sub(REDACTED, text)


def _hash_key():
    secret = os.environ.get("UNSUBSCRIBE_SECRET") or os.environ.get("LOG_REF_SECRET")
    return secret.encode("utf-8") if secret else _PROCESS_KEY


def ref(row_id=None, email=None):
    """A short, stable, non-identifying label for one subscriber.

    Prefers the database row id ("sub:" + its first 8 characters). Without
    one, a keyed hash of the lowercased address ("ref:" + 8 hex). The key is
    the run's UNSUBSCRIBE_SECRET, so the label is stable across runs but
    cannot be brute-forced from a list of guessed addresses by anyone reading
    the public log. With no secret available the key is random per process:
    still safe, just not stable between runs.
    """
    if row_id:
        return f"sub:{str(row_id)[:8]}"
    if email:
        digest = hmac.new(_hash_key(), str(email).strip().lower().encode("utf-8"),
                          hashlib.sha256).hexdigest()
        return f"ref:{digest[:8]}"
    return "sub:unknown"


class RedactingStream:
    """A text stream wrapper that redacts addresses before they are written.

    Complete lines are redacted and passed through at once. A trailing run of
    address characters with no newline after it is held, so an address split
    across two write() calls is still caught. flush() releases anything held
    (with a looser match, since it may be a cut-off address) and flushes the
    wrapped stream, so print(..., flush=True) and progress output behave as
    before. Everything else (fileno, isatty, encoding, buffer, ...) is the
    wrapped stream's own.
    """

    def __init__(self, stream):
        self._stream = stream
        self._held = ""

    @property
    def wrapped(self):
        return self._stream

    def write(self, s):
        if not isinstance(s, str):
            s = str(s)
        n = len(s)
        data = self._held + s
        self._held = ""
        if not data:
            return n
        cut = data.rfind("\n") + 1
        head, tail = data[:cut], data[cut:]
        m = _TAIL_RE.search(tail)
        if m:
            self._held = m.group(0)
            tail = tail[:m.start()]
        out = redact(head + tail)
        if out:
            self._stream.write(out)
        return n

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def _release(self):
        if self._held:
            held, self._held = self._held, ""
            self._stream.write(_LOOSE_RE.sub(REDACTED, redact(held)))

    def flush(self):
        self._release()
        flush = getattr(self._stream, "flush", None)
        if flush:
            flush()

    def close(self):
        self._release()
        self._stream.close()

    def writable(self):
        return True

    def __getattr__(self, name):
        return getattr(self._stream, name)


def install():
    """Wrap sys.stdout and sys.stderr. Safe to call more than once."""
    for name in ("stdout", "stderr"):
        stream = getattr(sys, name)
        if stream is not None and not isinstance(stream, RedactingStream):
            setattr(sys, name, RedactingStream(stream))
    if not getattr(install, "_atexit", False):
        atexit.register(_flush_all)
        install._atexit = True


def _flush_all():
    for name in ("stdout", "stderr"):
        stream = getattr(sys, name, None)
        if isinstance(stream, RedactingStream):
            try:
                stream.flush()
            except Exception:
                pass

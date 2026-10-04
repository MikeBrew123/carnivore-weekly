#!/usr/bin/env python3
"""One-off Carnivore Weekly -> PescoDial invite, 2026-10-04.

Modeled on scripts/send_coach_launch.py (same ledger, confirm prompt, send_guard
choke point and signed CW unsubscribe link). Copy is Sarah's final draft,
pescodial/drafts/invite/cw-pescatarian-invite.md, parsed at build time so the
HTML is always reproducible from the draft:

  python3 scripts/send_pd_invite.py --build     # write emails/2026-10-04-pd-invite.html
  python3 scripts/send_pd_invite.py --check     # exit 1 if that file is stale
  python3 scripts/send_pd_invite.py --dry-run   # who would get it, sends nothing
  python3 scripts/send_pd_invite.py --test      # only TEST_EMAILS
  python3 scripts/send_pd_invite.py --send      # the real thing

Audience (Brew-approved 2026-10-03): anyone who picked diet "pescatarian" in the
CW calculator (calculator_sessions_v2 source cw, or cw_assessment_sessions), who is
still mailable on CW (active newsletter subscriber, or drip subscriber not
unsubscribed and not bounced), minus fixtures (filter_mailable) and minus EXCLUDE_SHA256.

Every attempt against the real audience is appended to
reports/pd-invite-send-ledger.jsonl (gitignored: the repo is public) and flushed
before the next recipient. Re-running skips anyone already recorded as sent.
A live send asks for confirmation first; --yes skips the prompt.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(ROOT / "pescodial" / "scripts"))
import send_guard  # noqa: E402
from subscriber_hygiene import filter_mailable  # noqa: E402
import unsubscribe_link  # noqa: E402
import pd_email_shell as shell  # noqa: E402

DRAFT = ROOT / "pescodial" / "drafts" / "invite" / "cw-pescatarian-invite.md"
HTML = ROOT / "emails" / "2026-10-04-pd-invite.html"
LEDGER = ROOT / "reports" / "pd-invite-send-ledger.jsonl"
FROM = "Sarah at Carnivore Weekly <newsletter@carnivoreweekly.com>"
REPLY_TO = "sarah@carnivoreweekly.com"   # @carnivoreweekly.com catch-all, swept daily
TEST_EMAILS = ["qa-checkout-probe@carnivoreweekly.com", "iambrew@gmail.com"]
FOOTER_REASON = "You're getting this because you subscribed to Carnivore Weekly emails."
UTM = "utm_source=carnivoreweekly&utm_medium=email&utm_campaign=pd_invite"

# Never mail these, whatever the database says. Stored as sha256(lower(email)) so
# no real customer address lands in this public repo (scripts/check-pii.sh).
# 59384c35...: the closed customer Brew named on 2026-10-03 (do not re-contact).
EXCLUDE_SHA256 = {"59384c3586b2405c7f53f31582dad39d31f5c02cb0c7d87334ee941f35b78673"}


def email_hash(email):
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


# ---------- copy ----------

def _section(md, heading):
    m = re.search(rf"^## {re.escape(heading)}[^\n]*\n(.*?)(?=^## |\Z)", md, re.M | re.S)
    if not m:
        raise SystemExit(f"draft has no '## {heading}' section")
    return m.group(1).strip()


def parse_draft(md=None):
    md = md if md is not None else DRAFT.read_text(encoding="utf-8")
    subj = [l for l in _section(md, "Subject options").splitlines() if "(Sarah's pick)" in l]
    if len(subj) != 1:
        raise SystemExit("draft must mark exactly one subject as (Sarah's pick)")
    subject = re.sub(r"^\d+\.\s*", "", subj[0]).replace("(Sarah's pick)", "").strip()
    reply = _section(md, "Reply question").split("\n\n")[0].strip()
    button = _section(md, "Button text")
    link = re.search(r"^Link:\s*(\S+)", button, re.M).group(1)
    return {
        "subject": subject,
        "preheader": _section(md, "Preheader").splitlines()[0].strip(),
        "body": [p.strip() for p in re.split(r"\n\s*\n", _section(md, "Body")) if p.strip()],
        "reply": reply,
        "button": button.splitlines()[0].strip(),
        "link": link,
    }


def _para(p):
    m = re.fullmatch(r"\[(.+?)\]\((\S+?)\)", p)
    if m:                                   # the main link: render as the pill button
        return f'<div style="margin:0 0 24px;">{shell.pill(m.group(1), m.group(2))}</div>'
    m = re.fullmatch(r"\*(.+)\*", p, re.S)
    if m:                                   # Not a Doctor note
        return (f'<p class="t-muted" style="margin:0 0 16px;font-size:15px;line-height:23px;'
                f'font-style:italic;color:{shell.MUTED};">{shell.e(m.group(1))}</p>')
    return f'<p style="margin:0 0 16px;">{"<br>".join(shell.e(l) for l in p.splitlines())}</p>'


def _reply(text):
    """Sarah's reply question in the shell's reply box: lead / question / the rest."""
    m = re.fullmatch(r"(.+?:)\s+(.+?\?)\s+(.+)", text, re.S)
    if not m:
        raise SystemExit("reply question not in 'lead: question? rest' form")
    lead, question, rest = m.groups()
    question = question[0].upper() + question[1:]   # starts its own line in the box
    box = shell.reply_block(lead, question)
    return box.replace("</span>\n", f"</span><br>\n            {shell.e(rest)}\n", 1)


def build_html(copy=None):
    c = copy or parse_draft()
    body = c["body"]
    cut = next((i for i, p in enumerate(body) if p.startswith("Please talk to your doctor")), None)
    if cut is None:
        raise SystemExit("draft body has no doctor line to place the reply question above")
    sections = [
        shell.body_section("\n      ".join(_para(p) for p in body[:cut])),
        _reply(c["reply"]),
        shell.body_section("\n      ".join(_para(p) for p in body[cut:])),
    ]
    head = ("<!-- Generated by scripts/send_pd_invite.py --build from "
            "pescodial/drafts/invite/cw-pescatarian-invite.md. Edit the draft, not this file. -->\n")
    return shell.render_email(
        title=c["subject"], preheader=c["preheader"],
        header_label="From Carnivore Weekly", header_sub="One-time note",
        sections=sections, footer_reason=FOOTER_REASON,
        unsubscribe=shell.NEWSLETTER_UNSUBSCRIBE, utm=UTM, head_comment=head,
    )


# ---------- secrets + audience ----------

def secrets_path():
    """secrets/ is gitignored, so a worktree lacks it: fall back to the main checkout."""
    local = ROOT / "secrets" / "api-keys.json"
    if local.exists():
        return local
    try:
        common = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--path-format=absolute",
                                 "--git-common-dir"], capture_output=True, text=True, check=True).stdout.strip()
        main = Path(common).parent / "secrets" / "api-keys.json"
        if main.exists():
            return main
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    raise SystemExit("secrets/api-keys.json not found in this checkout or the main checkout")


def secrets():
    return json.loads(secrets_path().read_text())


def _get(url, h, table, params):
    r = requests.get(f"{url}/rest/v1/{table}", headers=h, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def _norm(rows, *keys):
    out = set()
    for r in rows:
        for k in keys:
            v = (r.get(k) or "").strip().lower()
            if v:
                out.add(v)
                break
    return out


def fetch_pescatarian(url, h):
    calc = _get(url, h, "calculator_sessions_v2", {
        "select": "email", "diet_type": "ilike.pescatarian", "email": "not.is.null",
        "or": "(source.is.null,source.eq.cw)"})
    assess = _get(url, h, "cw_assessment_sessions", {
        "select": "email,form_email:form_data->>email", "form_data->>diet": "ilike.pescatarian"})
    return _norm(calc, "email") | _norm(assess, "email", "form_email")


def fetch_cw_mailable(url, h):
    nl = _get(url, h, "newsletter_subscribers", {
        "select": "email", "site": "eq.cw", "status": "eq.active", "unsubscribed_at": "is.null"})
    dr = _get(url, h, "drip_subscribers", {
        "select": "email", "site": "eq.cw", "bounced_at": "is.null",
        "or": "(unsubscribed.is.null,unsubscribed.eq.false)"})
    return _norm(nl, "email") | _norm(dr, "email")


def select_audience(pescatarian, cw_mailable, exclude_sha256=EXCLUDE_SHA256):
    """Pure: pescatarian pickers still mailable on CW, minus EXCLUDE_SHA256 and fixtures."""
    pool = {e.strip().lower() for e in pescatarian} & {e.strip().lower() for e in cw_mailable}
    pool = {e for e in pool if email_hash(e) not in exclude_sha256}
    mailable, _blocked = filter_mailable(sorted(pool))
    return mailable


def audience(s):
    sb = s["supabase"]; url = sb["url"].rstrip("/"); key = sb["service_role_key"]
    h = {"apikey": key, "Authorization": f"Bearer {key}"}
    return select_audience(fetch_pescatarian(url, h), fetch_cw_mailable(url, h))


# ---------- ledger + send (as send_coach_launch.py) ----------

def read_ledger(path):
    sent, failed, bad = set(), set(), 0
    if not path.exists():
        return sent, failed, bad
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                email = (rec.get("email") or "").strip().lower()
            except (ValueError, AttributeError):
                bad += 1
                continue
            if not email:
                bad += 1
                continue
            (sent if rec.get("status") == "sent" else failed).add(email)
    return sent, failed - sent, bad


def ledger_append(fh, email, status, message_id=None, http_status=None, error=None):
    fh.write(json.dumps({
        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ts": int(time.time()), "email": email, "status": status,
        "message_id": message_id, "http_status": http_status, "error": error,
    }) + "\n")
    fh.flush()
    os.fsync(fh.fileno())


def confirm(prompt):
    if not sys.stdin.isatty():
        print("Not a terminal and no --yes flag, so there is nobody to ask. Refusing to send.")
        return False
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except (EOFError, KeyboardInterrupt):
        print()
        return False


def personalise(html, email, unsub_secret):
    return html.replace("{{unsubscribe_url}}", unsubscribe_link.unsubscribe_url(email, "cw", unsub_secret))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true", help=f"write {HTML.relative_to(ROOT)} from the draft")
    ap.add_argument("--check", action="store_true", help="exit 1 if the built HTML is stale")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--test", action="store_true")
    ap.add_argument("--send", action="store_true")
    ap.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    ap.add_argument("--ledger", default=str(LEDGER), help=f"append-only send ledger (default: {LEDGER})")
    a = ap.parse_args()

    copy = parse_draft()
    html = build_html(copy)
    if a.build:
        HTML.parent.mkdir(parents=True, exist_ok=True)
        HTML.write_text(html, encoding="utf-8")
        print(f"wrote {HTML.relative_to(ROOT)}")
        return 0
    if a.check:
        fresh = HTML.exists() and HTML.read_text(encoding="utf-8") == html
        print("fresh" if fresh else f"STALE: run --build ({HTML.relative_to(ROOT)})")
        return 0 if fresh else 1
    if not (a.dry_run or a.test or a.send):
        ap.error("pick one of --build, --check, --dry-run, --test, --send")
    if not HTML.exists() or HTML.read_text(encoding="utf-8") != html:
        print(f"Refusing: {HTML.relative_to(ROOT)} is missing or stale versus the draft. Run --build and review it.")
        return 1
    send_guard.set_dry_run(a.dry_run)

    s = secrets()
    try:
        unsub_secret = unsubscribe_link.load_secret(s)
    except unsubscribe_link.MissingUnsubscribeSecret as exc:
        print(f"Error: {exc}")
        return 1
    ledger_path = Path(a.ledger)
    use_ledger = not a.test

    to = TEST_EMAILS if a.test else audience(s)
    audience_size = len(to)
    already, failed_before, bad_lines = read_ledger(ledger_path) if use_ledger else (set(), set(), 0)
    skipped = [e for e in to if e in already]
    if use_ledger:
        to = [e for e in to if e not in already]

    print(f"subject : {copy['subject']}")
    print(f"from    : {FROM}")
    print(f"reply-to: {REPLY_TO}")
    print(f"recipients: {audience_size}")
    if use_ledger:
        print(f"ledger  : {ledger_path}")
        print(f"  ledger records {len(already)} sent; {len(skipped)} of this audience already sent -> skipping")
        if failed_before:
            print(f"  {len(failed_before)} earlier failure(s) recorded, still queued to retry")
        if bad_lines:
            print(f"  WARNING: {bad_lines} unreadable ledger line(s) ignored")
    else:
        print("ledger  : not used for --test")
    print(f"to send : {len(to)}")

    if a.dry_run:
        sample = personalise(html, to[0] if to else TEST_EMAILS[0], unsub_secret)
        ok = "{{unsubscribe_url}}" not in sample and "unsubscribe?email=" in sample and "site=cw" in sample
        print(f"unsubscribe placeholder replaced in dry render: {'yes' if ok else 'NO'}")
        for e in to:
            print(f"   would send -> {e}")
        for e in skipped:
            print(f"   skip (already sent) -> {e}")
        print("\nDRY RUN. Nothing sent.")
        return 0 if ok else 1

    if not to:
        print("\nNothing left to send: the ledger already covers everyone in this audience.")
        return 0

    if not a.yes:
        target = f"TEST send to {', '.join(TEST_EMAILS)}" if a.test else "LIVE send"
        summary = f"{len(to)} email(s) will go out"
        if use_ledger:
            summary += f", {len(skipped)} skipped as already sent, logged to {ledger_path.name}"
        print(f"\n{target}: {summary}.")
        if not confirm("Type 'yes' to send: "):
            print("Aborted. Nothing sent.")
            return 1

    key = s["resend"]["key"]
    subject = copy["subject"]
    sent = failed = 0
    fh = None
    if use_ledger:
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        fh = ledger_path.open("a", encoding="utf-8")
    try:
        for i, e in enumerate(to, 1):
            if not send_guard.allow(f"send the PescoDial invite email to {e}"):
                continue
            try:
                r = requests.post("https://api.resend.com/emails",
                                  headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                                  json={"from": FROM, "to": e, "reply_to": REPLY_TO,
                                        "subject": subject, "html": personalise(html, e, unsub_secret)},
                                  timeout=30)
            except requests.RequestException as exc:
                failed += 1
                print(f"  FAIL {e}: {exc}")
                if fh:
                    ledger_append(fh, e, "failed", error=str(exc)[:200])
                time.sleep(0.6)
                continue
            if r.status_code < 300:
                try:
                    message_id = r.json().get("id")
                except ValueError:
                    message_id = None
                sent += 1
                if fh:
                    ledger_append(fh, e, "sent", message_id=message_id, http_status=r.status_code)
            else:
                failed += 1
                print(f"  FAIL {e}: {r.status_code} {r.text[:110]}")
                if fh:
                    ledger_append(fh, e, "failed", http_status=r.status_code, error=r.text[:200])
            if i % 10 == 0:
                print(f"  {i}/{len(to)}...")
            time.sleep(0.6)
    finally:
        if fh:
            fh.close()
    print(f"\nsent {sent}, failed {failed}")
    if use_ledger:
        print(f"ledger: {ledger_path} (re-run to retry anyone not recorded as sent)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Carnivore Weekly sweet-treat guardrail.

Standing rule from Brew, 2026-09-07. The Sep 6 CW newsletter opened on sweet
swaps and named dark chocolate, berries and keto desserts in the hero teaser.
Carnivore Weekly does not promote sweet treats, desserts, or sugar substitutes.
The personas (Sarah, Marcus, Chloe) get the rule in their prompts; this module
is what makes it a rule instead of a request.

CARNIVORE WEEKLY ONLY. KetoDial is a different brand and keto content
legitimately discusses sweeteners, so every entry point takes a `site` and
returns nothing when the site is not 'cw'.

Two rules:

  Rule A, promotion. Copy may not recommend, endorse, or give instructions for
  sweet treats, desserts, or sugar substitutes. Naming one in order to talk a
  reader out of it is fine. That is our actual editorial position and the
  reason a blunt keyword ban would be wrong.

  Rule B, prominence. Sweet-treat topics may not occupy the front of a CW
  newsletter: subject line, opening, hero title, hero teaser. Body copy can
  answer the question when the answer is "don't". The front of the email is a
  promise, and "here are your cheats and substitutes" is not a promise this
  brand makes.

Design constraint: a false positive is worse than the original bug. Sweetbreads
are an organ meat we write about. Crab cakes are food. Sweet browning on a
seared steak is a real description. None of those may trip this.

Usage:
    from cw_sweet_guard import check_copy, check_newsletter_content

    check_copy(html_or_text, site='cw', label='post: slug')   -> [violations]
    check_newsletter_content(content_dict, site='cw')         -> [violations]

CLI (handy for spot checks and for proving the thing fires):
    python3 scripts/cw_sweet_guard.py --files public/blog/*.html
    echo "Try these keto brownies" | python3 scripts/cw_sweet_guard.py --stdin
"""

import argparse
import re
import sys

# --------------------------------------------------------------------------
# Vocabulary
# --------------------------------------------------------------------------

# Things that are a sweet treat, a dessert, or a sugar substitute.
# Deliberately specific. Bare "sugar" and bare "sweet" are NOT here: "blood
# sugar" is core CW subject matter and "a sweet, nutty crust" is a sear.
SWEET_OBJECT = re.compile(
    r"""\b(?:
        sweeteners?
      | artificial\ sweeteners?
      | sugar[-\s](?:substitutes?|alternatives?|replacements?)
      | sugar[-\s]free\ (?:treats?|desserts?|candy|candies|chocolates?|cookies?|
                          sweets?|snacks?|ice\ cream|syrup)
      | stevia | erythritol | monk\ fruit | allulose | xylitol | maltitol
      | sorbitol | sucralose | aspartame | saccharin | splenda | truvia | swerve
      | desserts?
      | sweet\ (?:treats?|swaps?|snacks?|tooth|fix|options?|substitutes?)
      | keto\ (?:treats?|desserts?|sweets?|candy|candies|cookies?|chocolates?)
      | candy | candies | cookies? | brownies? | cakes? | cheesecake
      | ice\ cream | chocolates? | fat\ bombs? | pudding | mousse | frosting
      | maple\ syrup | honey | agave
      | cheat\ (?:days?|meals?|treats?|foods?)
    )\b""",
    re.I | re.X,
)

# A match is discarded when its immediate context says it is not a sweet at all.
# "sweetbreads" already survives the \b in \bsweet\ ...\b, but it is named here
# on purpose so nobody loosens the pattern later without seeing why.
NOT_A_SWEET = re.compile(
    r"""(?:
        sweetbread
      | (?:crab|fish|salmon|tuna|meat|beef|pork|chicken|liver|lamb|pan|hot)[-\s]cakes?
      | cookie\ (?:consent|banner|policy|settings)
      | (?:accept|third-party|browser)\ cookies?
      | honey(?:comb|moon)
    )""",
    re.I | re.X,
)

# Language that recommends, endorses, or hands over instructions.
PROMOTES = re.compile(
    r"""\b(?:
        recommend\w* | suggest\w*
      | enjoy\w* | indulge\w* | savou?r
      | reach\ for | go\ for | opt\ for | swap\ in | swap\ to
      | grab | stock\ up | pick\ up | keep\ some | keep\ a\ few
      | whip\ up | bake | make\ these | make\ this | make\ a\ batch
      | recipes? | how\ to\ make
      | best | favou?rites? | go-to | our\ pick | we\ love | you'?ll\ love
      | satisfy\w* | curb\w* | hits\ the\ spot | scratch(?:es)?\ the\ itch
      | perfect\ for | great\ option | good\ option | solid\ option
      | works\ well | totally\ fine | perfectly\ fine | no\ problem
      | you\ can\ (?:have|eat|enjoy|make)
      | (?:is|are)\ (?:allowed|fine|ok|okay|approved|compliant)
      | treat\ yourself | guilt[-\s]free
    )\b""",
    re.I | re.X,
)

# Language that is talking the reader OUT of it. When any of these share the
# sentence, the mention is editorial, not promotional. This is what lets Sarah
# keep writing "not with berries, not with dark chocolate".
DISCOURAGES = re.compile(
    r"""(?:
        \bnot\b | n't | \bno\b | \bnever\b | \bnone\b | \bnothing\b
      | \bavoid\w* | \bskip\w* | \bwithout\b | \bquit\w* | \bstop\w*
      | \bcut\ out\b | \bdrop\ the\b | \bresist\w* | \bpause\b
      | \binstead\ of\b | \brather\ than\b | \bbefore\ you\b
      | \bkeeps?\ the\ crav | \bkeeping\ (?:you|the)\b
      | \bstall\w* | \bderail\w* | \btrap\b | \bbackfire\w*
      | \bmyth\b | \bwhy\ .{0,30}\ (?:fail|don'?t\ work)
      | \bput\ it\ back\b | \bless\b | \bfewer\b
      | \bditch\w* | \bswapp?ing\ out\b
      | \bargu\w* | \bdebat\w* | \bverdict\b | \boverrated\b
      | \bnot\ necessary\b | \bthe\ claim\b | \bwe\ tested\b
    )""",
    re.I | re.X,
)

# Phrases that are promotional no matter what else is in the sentence.
ALWAYS_PROMOTES = re.compile(
    r"""(?:
        satisf\w+\ your\ sweet\ tooth
      | treat\ yourself
      | guilt[-\s]free
      | don'?t\ be\ afraid\ to\ (?:have|eat|enjoy|try)
      | you\ deserve\ (?:a|some|it)
    )""",
    re.I | re.X,
)

# A bare source citation is not editorial copy. Quoting the title of a Reddit
# thread we are reviewing must not read as an endorsement of the thread.
CITATION = re.compile(
    r"""^\s*(?:reddit\ thread|source|sources|study|studies|via|thread
                |see\ also|reference|references|citation)\s*[:\-]""",
    re.I | re.X,
)

# Newsletter fields that are "the front of the email" for Rule B.
FRONT_FIELDS = ("subject_line", "preview", "preview_text", "opening", "hero")


def strip_html(html):
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html or "")
    # Block-level tags end a sentence. Without this, two unrelated <p> blocks
    # merge and a promo verb in one gets glued to a sweet object in the next.
    text = re.sub(r"(?i)</?(p|div|td|tr|li|ul|ol|h[1-6]|br|table)[^>]*>", " . ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&mdash;", " ").replace("&nbsp;", " ")
                .replace("&rsquo;", "'").replace("&lsquo;", "'")
                .replace("&ldquo;", '"').replace("&rdquo;", '"')
                .replace("&amp;", "&"))
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _sentences(text):
    parts = re.split(r"(?<=[.!?;])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _sweet_objects(sentence):
    """Sweet objects in this sentence, with the not-a-sweet exceptions removed."""
    hits = []
    for m in SWEET_OBJECT.finditer(sentence):
        window = sentence[max(0, m.start() - 30):m.end() + 20]
        if NOT_A_SWEET.search(window):
            continue
        hits.append(m.group(0))
    return hits


def find_promotion(text, site="cw"):
    """Rule A. Sentences that promote a sweet treat, dessert, or sugar substitute.

    Returns a list of (matched_object, sentence) tuples. Empty means clean.
    """
    if (site or "cw").lower() != "cw":
        return []
    findings = []
    for sentence in _sentences(strip_html(text)):
        if CITATION.match(sentence):
            continue
        objects = _sweet_objects(sentence)
        if not objects:
            continue
        if ALWAYS_PROMOTES.search(sentence):
            findings.append((objects[0], sentence))
            continue
        if DISCOURAGES.search(sentence):
            continue
        if PROMOTES.search(sentence):
            findings.append((objects[0], sentence))
    return findings


def find_prominence(text, site="cw"):
    """Rule B. Any sweet object at all, discouraging or not.

    Only for the front of a newsletter. The Sep 6 issue argued AGAINST sweet
    swaps and still shipped "Dark chocolate, berries, keto desserts" in the
    hero teaser, which is the thing Brew actually saw.
    """
    if (site or "cw").lower() != "cw":
        return []
    found = []
    for sentence in _sentences(strip_html(text)):
        found.extend(_sweet_objects(sentence))
    return found


def check_copy(text, site="cw", label="copy"):
    """Violation strings for arbitrary CW copy. Empty list means clean."""
    out = []
    for obj, sentence in find_promotion(text, site):
        snippet = sentence if len(sentence) <= 160 else sentence[:157] + "..."
        out.append(
            f'{label}: promotes sweet treats / sugar substitutes ("{obj}") '
            f"in: {snippet}"
        )
    return out


def check_newsletter_content(content, site="cw"):
    """Violation strings for a CW newsletter content dict (weekly_newsletter.py).

    Rule A everywhere, Rule B on the subject line, opening and hero.
    """
    if (site or "cw").lower() != "cw":
        return []
    out = []

    def walk(value, path):
        if isinstance(value, str):
            out.extend(check_copy(value, site, path))
        elif isinstance(value, dict):
            for k, v in value.items():
                walk(v, f"{path}.{k}")
        elif isinstance(value, list):
            for i, v in enumerate(value):
                walk(v, f"{path}[{i}]")

    walk(content, "newsletter")

    for field in FRONT_FIELDS:
        if field not in content:
            continue
        blob = content[field]
        blob = " . ".join(str(v) for v in blob.values()) if isinstance(blob, dict) else str(blob)
        hits = find_prominence(blob, site)
        if hits:
            out.append(
                f"newsletter.{field}: sweet-treat topic in the front of the email "
                f'({", ".join(sorted(set(h.lower() for h in hits)))}). '
                "Carnivore Weekly does not lead with sweets. Move it into the body "
                "or pick a different hero."
            )
    return out


def _cli():
    ap = argparse.ArgumentParser(description="Carnivore Weekly sweet-treat guardrail")
    ap.add_argument("--files", nargs="*", default=[])
    ap.add_argument("--stdin", action="store_true")
    ap.add_argument("--site", default="cw")
    ap.add_argument("--quiet", action="store_true", help="only print violations")
    args = ap.parse_args()

    bad = 0
    if args.stdin:
        probs = check_copy(sys.stdin.read(), args.site, "stdin")
        for p in probs:
            print(f"  VIOLATION {p}")
        bad += bool(probs)
        if not probs and not args.quiet:
            print("clean")

    for path in args.files:
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                probs = check_copy(fh.read(), args.site, path.split("/")[-1])
        except OSError as e:
            print(f"  skip {path}: {e}")
            continue
        if probs:
            bad += 1
            print(f"[VIOLATION] {path}")
            for p in probs:
                print(f"        {p}")
        elif not args.quiet:
            print(f"[ok  ] {path}")

    print(f"\n{bad} file(s) with sweet-treat violations")
    return 2 if bad else 0


if __name__ == "__main__":
    sys.exit(_cli())

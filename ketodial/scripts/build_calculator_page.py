#!/usr/bin/env python3
"""Generate ketodial.com/calculator as a real, indexable page.

Why this script exists instead of a hand-written file
-----------------------------------------------------
Until 2026-09-20 `/calculator` was a `noindex` meta-refresh that bounced to
`/#calc`, an anchor partway down the homepage. Both URLs returned 200, so
nothing looked broken, but the KD calculator had no page Google could index
and therefore nothing to rank. It took 24 sessions in 101 days, none of them
from a search engine (money-path costing 2026-09-18, deck add99e65).

The calculator itself is ~450 lines of markup in index.html wired to
ketodial.js by element id. Copying that markup into a second file by hand
guarantees the two drift apart, and a drifted copy is worse than a redirect
because it fails silently. So the page is GENERATED from index.html: the
calculator block, the header, the footer and the checkout/success modals are
lifted verbatim, and only the head metadata and the supporting copy below the
tool are this page's own.

Re-run it after any change to the calculator markup in index.html:

    python3 ketodial/scripts/build_calculator_page.py

Remember `ketodial/public` is a git submodule: commit inside it, then bump the
pointer in the parent repo.
"""

# RETIRED 2026-09-26 (Brew): /calculator is a redirect to the homepage calculator again.
# The homepage IS the calculator and is the page Google indexes; a second calculator page
# split the signal. Do not regenerate it. See docs/project-log/decisions.md 2026-09-26.
raise SystemExit("build_calculator_page.py is retired (2026-09-26); /calculator redirects to /#calc")


import re
import sys
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SRC = PUBLIC / "index.html"
OUT = PUBLIC / "calculator.html"

CANONICAL = "https://ketodial.com/calculator"
TITLE = "Keto Macro Calculator: Free Fat, Protein and Carb Targets | KetoDial"
DESCRIPTION = (
    "Free keto macro calculator. Enter your age, sex, height, weight and activity "
    "and get daily fat, protein and net carb targets in about 90 seconds. "
    "Mifflin-St Jeor TDEE, no signup wall."
)
OG_TITLE = "Keto Macro Calculator: free fat, protein and carb targets"
OG_DESCRIPTION = (
    "Enter your stats and get your daily keto macros free. Mifflin-St Jeor TDEE, "
    "70/25/5 keto split, no signup wall."
)


def slice_between(lines, start_pat, end_pat, start_from=0):
    """Return the inclusive slice of lines from the first start_pat to the next end_pat."""
    start = None
    for i in range(start_from, len(lines)):
        if re.match(start_pat, lines[i]):
            start = i
            break
    if start is None:
        sys.exit(f"build_calculator_page: never found {start_pat!r} in index.html")
    for j in range(start, len(lines)):
        if re.match(end_pat, lines[j]):
            return lines[start:j + 1], j
    sys.exit(f"build_calculator_page: never found {end_pat!r} after {start_pat!r}")


def build_head(head_html):
    """Take the homepage head and make it this page's head.

    Everything structural is kept as is: the resume-reference scrubber that has to
    stay the first executable script, GA, the stylesheet, Pinterest, the favicons.
    Only the things that identify the page change.
    """
    # The homepage's JSON-LD blocks describe the site and the homepage. Drop all of
    # them and emit this page's own below, or the WebApplication url would point at
    # the homepage from the calculator page.
    head_html = re.sub(
        r'<script type="application/ld\+json">.*?</script>\n',
        "",
        head_html,
        flags=re.S,
    )

    subs = [
        (r"<title>.*?</title>", f"<title>{TITLE}</title>"),
        (r'<meta name="description" content=".*?">',
         f'<meta name="description" content="{DESCRIPTION}">'),
        (r'<link rel="canonical" href=".*?">',
         f'<link rel="canonical" href="{CANONICAL}">'),
        (r'<meta property="og:url" content=".*?">',
         f'<meta property="og:url" content="{CANONICAL}">'),
        (r'<meta property="og:title" content=".*?">',
         f'<meta property="og:title" content="{OG_TITLE}">'),
        (r'<meta property="og:description" content=".*?">',
         f'<meta property="og:description" content="{OG_DESCRIPTION}">'),
        (r'<meta name="twitter:title" content=".*?">',
         f'<meta name="twitter:title" content="{OG_TITLE}">'),
        (r'<meta name="twitter:description" content=".*?">',
         f'<meta name="twitter:description" content="{OG_DESCRIPTION}">'),
    ]
    for pat, repl in subs:
        head_html, n = re.subn(pat, repl, head_html, count=1, flags=re.S)
        if n != 1:
            sys.exit(f"build_calculator_page: head pattern {pat!r} matched {n} times")

    # There must be no noindex left anywhere: that was the whole defect.
    if "noindex" in head_html:
        sys.exit("build_calculator_page: a noindex tag survived into the head")

    head_html = head_html.replace("</head>", SCHEMA + "</head>")
    return head_html


SCHEMA = """
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "KetoDial Keto Macro Calculator",
  "url": "https://ketodial.com/calculator",
  "applicationCategory": "HealthApplication",
  "operatingSystem": "Web",
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
  "description": "Free keto macro calculator. Daily fat, protein and net carb targets from a Mifflin-St Jeor TDEE estimate.",
  "publisher": {"@type": "Organization", "name": "KetoDial", "url": "https://ketodial.com"}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "KetoDial", "item": "https://ketodial.com/"},
    {"@type": "ListItem", "position": 2, "name": "Keto macro calculator", "item": "https://ketodial.com/calculator"}
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {"@type":"Question","name":"What formula does this keto calculator use?","acceptedAnswer":{"@type":"Answer","text":"It estimates your resting metabolic rate with the Mifflin-St Jeor equation, multiplies that by an activity factor to get your total daily energy expenditure, then adjusts for your goal: 20 percent below maintenance to lose, 10 percent above to gain, unchanged to maintain. The resulting calories are split 70 percent fat, 25 percent protein and 5 percent carbohydrate, and converted to grams at 9 calories per gram of fat and 4 per gram of protein and carbohydrate."}},
    {"@type":"Question","name":"Are the carb grams total carbs or net carbs?","acceptedAnswer":{"@type":"Answer","text":"Net carbs, which is total carbohydrate minus fibre. Fibre is counted out because it is not absorbed the way other carbohydrate is. On a label, subtract the fibre grams from the total carbohydrate grams and compare that number with your target."}},
    {"@type":"Question","name":"Why is my protein target different from a bodybuilding calculator?","acceptedAnswer":{"@type":"Answer","text":"This calculator sets protein as a share of your calories, 25 percent, rather than as grams per pound of bodyweight. Both are common. The two agree closely for people near an average build and diverge for people who are very lean, very heavy, or eating far below maintenance."}},
    {"@type":"Question","name":"Do I need to recalculate as my weight changes?","acceptedAnswer":{"@type":"Answer","text":"Yes. Every number here is driven by your current weight, so the targets drift as you do. Running it again after roughly ten to fifteen pounds of change keeps the estimate honest."}},
    {"@type":"Question","name":"How accurate is a keto macro calculator?","acceptedAnswer":{"@type":"Answer","text":"It is an estimate, not a measurement. Equations like Mifflin-St Jeor predict resting metabolic rate for most adults within roughly ten percent, and the activity multiplier is a self-reported guess on top of that. Treat the output as a starting point and adjust it against what actually happens over two to three weeks."}}
  ]
}
</script>
"""

HERO_OLD = """    <div class="hero-head">
      <span class="eyebrow">Keto macro calculator</span>
      <h1>Dial in your <span class="accent">macros.</span></h1>
      <p class="hero-sub">Enter your stats and get precise keto macro targets based on your body — <b>free, right here on this page.</b> No wizard, no signup wall. Then dial it in further for a personalized PDF plan.</p>
    </div>
"""

HERO_NEW = """    <div class="hero-head">
      <span class="eyebrow">Free tool</span>
      <h1>Keto macro <span class="accent">calculator.</span></h1>
      <p class="hero-sub">Your daily fat, protein and net carb targets, worked out from your own age, sex, height, weight and activity. It takes about 90 seconds, it is free, and there is no signup wall in front of the numbers.</p>
    </div>
"""

# Everything below the calculator is written for this page. It is deliberately not
# a copy of the homepage FAQ: two URLs answering the same five questions in the same
# words is how a site competes with itself.
SUPPORTING = """
<!-- HOW THE NUMBERS ARE WORKED OUT (page-specific content, not on the homepage) -->
<section class="how" id="method">
  <div class="wrap">
    <span class="eyebrow">The method</span>
    <h2>How the numbers above are worked out</h2>
    <p>No part of this is a secret, so here is the whole calculation. You can check it
    on paper if you want to.</p>

    <ol style="margin:22px 0 0;padding-left:20px;line-height:1.7;color:var(--ink-soft)">
      <li style="margin-bottom:14px"><b>Resting metabolic rate, from Mifflin&ndash;St Jeor.</b>
      For men, <code>10 &times; weight&nbsp;kg + 6.25 &times; height&nbsp;cm &minus; 5 &times; age + 5</code>.
      For women the same expression ending <code>&minus; 161</code>. It is the equation most
      dietetic practice reaches for first, and it needs nothing you cannot measure at home.</li>

      <li style="margin-bottom:14px"><b>Total daily burn.</b> That resting figure is multiplied
      by an activity factor, from 1.2 for a desk-bound day to about 1.9 for a physical job plus
      hard training. This is the step you control by answering honestly rather than
      aspirationally.</li>

      <li style="margin-bottom:14px"><b>Your goal moves the calorie line.</b> Lose sets calories
      to 80% of that total, a 20% deficit. Gain sets it to 110%. Maintain leaves it alone.</li>

      <li style="margin-bottom:14px"><b>The split.</b> Those calories are divided 70% fat,
      25% protein, 5% carbohydrate, then converted to grams at 9 calories per gram of fat and
      4 per gram of protein and carbohydrate. The carbohydrate figure is a net carb target,
      meaning total carbohydrate minus fibre.</li>
    </ol>

    <h3 style="margin-top:30px">A worked example</h3>
    <p>A 40-year-old woman, 5&prime;6&Prime; and 175&nbsp;lb, moderately active, aiming to lose
    weight. Mifflin&ndash;St Jeor puts her resting burn near 1,481&nbsp;kcal. The moderate
    activity factor of 1.55 takes that to about 2,295&nbsp;kcal a day, and a 20% deficit brings
    the target to 1,836&nbsp;kcal. Split 70/25/5 that is <b>143&nbsp;g fat, 115&nbsp;g protein
    and 23&nbsp;g net carbs</b>, which is exactly what the calculator above returns for those
    inputs. Run your own numbers; these are hers.</p>

    <h3 style="margin-top:30px">What this calculator will not do</h3>
    <p>It will not set a personalised protein target for someone who tells us their kidney
    function is impaired or that they are unsure about it. Protein needs can change with kidney
    function, and that is a number for a doctor or a renal dietitian, not a web form. Everything
    else on the page still works; the protein figure is replaced with a referral rather than a
    quieter guess.</p>

    <p style="margin-top:18px">These figures are general nutrition estimates, not medical advice.
    If you take medication or have a medical condition, talk to your own clinician before
    changing how you eat.</p>
  </div>
</section>

<!-- QUESTIONS SPECIFIC TO THE TOOL (the homepage FAQ answers different questions) -->
<section class="how" id="calculator-faq">
  <div class="wrap">
    <span class="eyebrow">Questions about the calculator</span>
    <h2>Before you trust the number</h2>
    <p>Broader keto questions, like how much fat to eat or how many carbs put you in ketosis,
    are answered on the <a href="/" style="color:var(--accent-text);font-weight:600">KetoDial
    homepage</a> and across the <a href="/blog/" style="color:var(--accent-text);font-weight:600">keto
    guides</a>. These five are about this tool.</p>

    <details style="margin-top:18px;padding:16px 0;border-top:1px solid rgba(226,238,247,.15)">
      <summary style="font-weight:700;cursor:pointer;font-size:16px">Are the carb grams total carbs or net carbs?</summary>
      <p style="margin-top:10px;color:var(--ink-soft);line-height:1.55">Net carbs: total carbohydrate
      minus fibre. Fibre is counted out because it is not absorbed the way other carbohydrate is.
      On a label, subtract the fibre grams from the total carbohydrate grams and compare that
      number with your target.</p>
    </details>

    <details style="margin-top:0;padding:16px 0;border-top:1px solid rgba(226,238,247,.15)">
      <summary style="font-weight:700;cursor:pointer;font-size:16px">Why is my protein target different from a bodybuilding calculator?</summary>
      <p style="margin-top:10px;color:var(--ink-soft);line-height:1.55">Because this one sets protein
      as a share of your calories, 25%, rather than as grams per pound of bodyweight. Both
      approaches are in common use. They land close together for someone near an average build
      and drift apart for people who are very lean, very heavy, or eating well below maintenance.</p>
    </details>

    <details style="margin-top:0;padding:16px 0;border-top:1px solid rgba(226,238,247,.15)">
      <summary style="font-weight:700;cursor:pointer;font-size:16px">Do I need to run it again as my weight changes?</summary>
      <p style="margin-top:10px;color:var(--ink-soft);line-height:1.55">Yes. Every number here is
      driven by your current weight, so the targets drift as you do. Coming back after roughly
      ten to fifteen pounds of change keeps the estimate honest.</p>
    </details>

    <details style="margin-top:0;padding:16px 0;border-top:1px solid rgba(226,238,247,.15)">
      <summary style="font-weight:700;cursor:pointer;font-size:16px">How accurate is any keto macro calculator?</summary>
      <p style="margin-top:10px;color:var(--ink-soft);line-height:1.55">It is an estimate, not a
      measurement. Equations like Mifflin&ndash;St Jeor predict resting metabolic rate for most
      adults within roughly ten percent, and the activity multiplier is a self-reported guess
      stacked on top of that. Use the output as a starting point, then adjust it against what
      actually happens over two or three weeks.</p>
    </details>

    <details style="margin-top:0;padding:16px 0;border-top:1px solid rgba(226,238,247,.15)">
      <summary style="font-weight:700;cursor:pointer;font-size:16px">Do I have to give an email to see my macros?</summary>
      <p style="margin-top:10px;color:var(--ink-soft);line-height:1.55">The calculator asks for one
      so it can email your results to you, and the free weekly keto email comes with it. You can
      unsubscribe from any message. The paid PDF plans are optional add-ons and nothing is
      charged unless you choose one.</p>
    </details>
  </div>
</section>
"""


def main():
    raw = SRC.read_text(encoding="utf-8")
    lines = raw.splitlines(keepends=True)

    head_lines, head_end = slice_between(lines, r"<!DOCTYPE html>", r"</head>")
    header_lines, header_end = slice_between(lines, r"<header class=\"nav\">", r"</header>", head_end)
    calc_lines, calc_end = slice_between(
        lines, r"<section class=\"hero\" id=\"main-content\">", r"</section>", header_end)
    footer_lines, footer_end = slice_between(lines, r"<footer>", r"</footer>", calc_end)
    modal_lines, modal_end = slice_between(
        lines, r"<!-- EMBEDDED CHECKOUT MODAL -->", r"</html>", footer_end)

    head = build_head("".join(head_lines))

    calc = "".join(calc_lines)
    if HERO_OLD not in calc:
        sys.exit("build_calculator_page: the hero heading in index.html changed; update HERO_OLD")
    calc = calc.replace(HERO_OLD, HERO_NEW, 1)
    # The copy-link button hardcodes the homepage anchor in an inline onclick.
    # On this page it should hand out this page's URL. (The Facebook/X/Pinterest
    # hrefs are built in ketodial.js, which reads location.pathname.)
    calc = calc.replace("https://ketodial.com/#calc", CANONICAL)
    # The in-page nav anchors point at homepage sections that do not exist here.
    header = "".join(header_lines).replace('href="#calc"', 'href="/calculator"')
    header = header.replace('href="#how"', 'href="/#how"')

    out = (
        head
        + "<body>\n"
        + '<a href="#main-content" class="skip-nav">Skip to content</a>\n\n'
        + header
        + "\n"
        + calc
        + SUPPORTING
        + "\n"
        + "".join(footer_lines)
        + "\n"
        + "".join(modal_lines)
    )

    OUT.write_text(out, encoding="utf-8")
    print(f"wrote {OUT} ({len(out):,} bytes)")

    # Cheap self-checks. A page that silently loses the calculator is the failure
    # mode this whole script exists to avoid.
    problems = []
    if "noindex" in out:
        problems.append("noindex survived into the page")
    if 'http-equiv="refresh"' in out:
        problems.append("the old meta refresh is still there")
    if out.count('id="step1"') != 1:
        problems.append("step 1 form missing or duplicated")
    if 'src="ketodial.js"' not in out:
        problems.append("ketodial.js is not loaded")
    if f'href="{CANONICAL}"' not in out:
        problems.append("canonical does not point at the calculator page")
    for el in ("checkoutOverlay", "successOverlay", "reportRows", "checkout-container"):
        if f'id="{el}"' not in out:
            problems.append(f"missing #{el}, checkout will break")
    if problems:
        for p in problems:
            print(f"  FAIL: {p}")
        sys.exit(1)
    print("  self-checks passed")


if __name__ == "__main__":
    main()

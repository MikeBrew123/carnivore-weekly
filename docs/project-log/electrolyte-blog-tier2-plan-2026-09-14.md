# Tier 2 preservation plan — CW blog electrolyte sweep, 2026-09-14

Written BEFORE any edit. Companion to `electrolyte-blog-baseline-2026-09-14.md`.

## Scope correction, read this first

The tier-1 triage undercounted. It classified by splitting content into sentences,
and markdown bullet lists have no sentence boundary, so dosing that lives in a
bullet ("- Magnesium: If you have cramps or insomnia, supplement 300-400 mg
magnesium glycinate") was invisible to it. The tier-1 baseline therefore lists
**16 pages** as the remaining scope. Re-scanned against raw source instead of
sentences, the real figure is **44 pages carrying 91 electrolyte-adjacent
figures**, of which 67 read as prescriptive.

That number still overstates the defect. Broken down by mineral:

| mineral | prescriptive hits | what they mostly are |
|---|---:|---|
| sodium | ~35 files | overwhelmingly "salt your food, about 1-2 tsp" |
| magnesium | 17 files | genuine dosing |
| potassium | 1 file | genuine, and the last one on the site |

**This pass covers the 17 magnesium pages plus the one potassium page** (they
overlap: `2026-09-17-cravings-spike-week-before-period` has both).

**Sodium salt-to-taste guidance is deliberately NOT being removed.** Brew's
instruction for this pass is explicit about not weakening useful advice, and
under-salting is the actual reason most readers feel terrible in month one. The
hazard ranking is not close either: hyperkalemia from potassium on an ACE
inhibitor or in CKD can stop a heart, and magnesium accumulates when kidneys are
not clearing it. Sodium over-salting in a population without a sodium restriction
is a materially weaker risk. Where a page prescribes a sodium *escalation* rather
than salting to taste (`2026-02-16-carnivore-over-60-aging` says "Increase your
sodium to 5-7 grams per day"), that is in scope because of who it is aimed at.

## Pages already correct. Do not touch.

- `2026-04-27-carnivore-sleep-week-two-electrolytes`
- `2026-05-17-carnivore-electrolyte-problem`
- `2026-09-09-potassium-on-carnivore`
- `2026-04-11-diy-electrolytes-vs-lmnt-dr-hampton` — this one scans as a potassium
  offender and is the opposite. It is a potassium **overdose warning** built around
  a reader who put 8 tsp of potassium in bone broth instead of 1/8 tsp and spent
  three days in hospital. Its figures are product labels and hazard explanation.
  Removing them would make the page less safe. Position 5.0.

`2026-04-30-72-hour-fast-protocol-carnivore` is a partial: it already says "We do
not publish a potassium dose for extended fasting" and that sentence stays. Only
its magnesium and sodium dosing is in scope.

## GSC baseline, re-read 2026-09-14 16:05 PDT

Page dimension, last 28 days. Numbers drift slightly from the tier-1 pull because
the 28-day window rolls; that pull is the formal baseline, this is the working copy.

| slug | impressions | clicks | avg position |
|---|---:|---:|---:|
| 2026-02-08-adaptation-timeline | 1280 | 42 | 6.39 |
| 2026-06-15-carnivore-and-alcohol | 577 | 3 | 10.87 |
| 2026-01-07-fasting-protocols | 434 | 13 | 14.18 |
| 2025-12-21-night-sweats | 356 | 10 | 7.79 |
| 2026-05-07-carnivore-fasting-protocols | 176 | 4 | 8.32 |
| 2026-02-19-carnivore-sleep-insomnia | 172 | 6 | 8.54 |
| 2026-02-08-powerlifting-programming | 51 | 5 | 5.90 |
| 2026-06-23-carnivore-endurance-problem | 51 | 0 | 6.86 |
| 2026-02-08-carnivore-constipation | 1 | 0 | 8.00 |
| the other 8 | 0 | 0 | zero data |

Nine pages sit at position <= 15 and are protected assets. **`adaptation-timeline`
carries 1,280 impressions and 42 clicks at position 6.39** and is the most valuable
page in the whole electrolyte set.

## What must not change

On every page in this pass: URL, `<title>`, meta description, canonical, H1 and the
H2/H3 structure. Search intent stays put: a constipation page still has to solve
constipation, a sleep page still has to get someone to sleep. Explanations that make
a page useful survive; only the prescribed figure comes out.

On `adaptation-timeline` specifically, the change is minimum-viable. It is a
week-by-week timeline whose value is the timeline, not the magnesium line. One
figure comes out. Nothing is restructured, no section is added, and length moves by
a sentence or two at most.

Warning weight is matched to the page. A page where magnesium is one passing mention
gets a clause, not a block. Seventeen identical warning paragraphs would read as
boilerplate and dilute the pages where it actually matters.

## Measurement

**Read date: 2026-10-12**, same as tier 1, so both passes are read in one sitting
against the same window.

Watch `adaptation-timeline` first: impressions, clicks and position against 1280 /
42 / 6.39. A drop there is the signal that this pass cost something. The eight
zero-data pages cannot regress on a metric they do not have, and are the safest in
the set to change.

Confound to note when reading: tier 1 and tier 2 land on the same day, so the
2026-10-12 read cannot separate their effects. They are different page sets with no
overlap, which is what makes that acceptable. No other content experiment should be
started on any of these pages before the read date.

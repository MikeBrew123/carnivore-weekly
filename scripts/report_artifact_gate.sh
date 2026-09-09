#!/usr/bin/env bash
# scripts/report_artifact_gate.sh <report.pdf>
#
# The gate a regenerated paid report must pass before it reaches a customer.
# Every check is run against the RENDERED PDF, not the source, because the source
# being right has never been the thing that failed. Exits non-zero on any failure.
set -uo pipefail
PDF="${1:?usage: report_artifact_gate.sh <report.pdf>}"
TXT=$(mktemp); pdftotext "$PDF" "$TXT" 2>/dev/null
fails=0
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fails=$((fails+1)); }
absent(){ if grep -qi -- "$1" "$TXT"; then bad "$2 (found: $1)"; else ok "$2"; fi; }
# Case-SENSITIVE, word-bounded. "NaN" matched inside "maintenance" when this was -i,
# which is the kind of check that trains you to ignore the gate.
absent_cs(){ if grep -qwE -- "$1" "$TXT"; then bad "$2 (found: $1)"; else ok "$2"; fi; }
present(){ if grep -qi -- "$1" "$TXT"; then ok "$2"; else bad "$2 (missing: $1)"; fi; }

echo "=== artifact gate: $(basename "$PDF")"
CHARS=$(tr -d '[:space:]' < "$TXT" | wc -c | tr -d ' ')
PAGES=$(grep -c $'\f' "$TXT" || true)
echo "    ${PAGES} pages, ${CHARS} characters of extractable text"

echo "--- readable, which is what the customer reported"
[ "$CHARS" -gt 20000 ] && ok "has a real text layer (not an image-only PDF)" \
                       || bad "text layer too thin: ${CHARS} chars"

echo "--- no print artifacts leaked into a customer document"
absent "file:///"                  "no local file path baked into the page"
absent "Save as PDF"               "no in-page print button rendered"
absent "{{"                        "no unreplaced template placeholder"
absent_cs "undefined"              "no undefined value rendered"
absent_cs "\[object Object\]"      "no object stringified into the copy"
absent_cs "NaN"                    "no NaN in a number"

echo "--- raw markdown must not be customer-visible (2026-09-09)"
# This gate PASSED a PDF whose safety sections printed literal '>', '###' and '**'.
# It checked for unreplaced '{{' placeholders and never for markdown that survived
# the renderer. A gate is only worth what it looks at.
#
# Deliberately NOT a blanket "no > anywhere" check: HDL >40, age >40 and CAC <50 are
# legitimate medical reference values the reader needs. These check for markdown
# SYNTAX, which is line-leading and space-delimited, not for the character.
LAYOUT=$(mktemp); pdftotext -layout "$PDF" "$LAYOUT" 2>/dev/null

n=$(grep -cE '^[[:space:]]*>' "$LAYOUT" || true)
[ "$n" = "0" ] && ok "no line-leading markdown quote marker" \
               || bad "line-leading quote markers visible on $n line(s)"

n=$(grep -cE '(^|[[:space:]])#{1,6}[[:space:]]' "$LAYOUT" || true)
[ "$n" = "0" ] && ok "no raw markdown heading marker" \
               || bad "raw '###' heading markers visible on $n line(s)"

n=$(grep -cE '\*\*' "$LAYOUT" || true)
[ "$n" = "0" ] && ok "no raw markdown bold marker" \
               || bad "raw '**' bold markers visible on $n line(s)"

n=$(grep -cE '>[[:space:]]*>' "$LAYOUT" || true)
[ "$n" = "0" ] && ok "no '> >' quote separator" \
               || bad "'> >' separators visible on $n line(s)"

# Known medical helper sentences must be clean prose, with no quote marker injected
# mid-sentence. This is the specific shape the reader saw: "re-time any > medication".
BROKEN=0
for phrase in "Take this report to your doctor" "Do not change, stop, skip or re-time" \
              "generated automatically from your questionnaire" "is not a clinician" \
              "What you told us"; do
  if grep -qF "$phrase" "$LAYOUT"; then
    # pull the sentence and look for an injected marker inside it
    if grep -A3 -F "$phrase" "$LAYOUT" | grep -qE '(^|[[:space:]])>([[:space:]]|$)'; then
      bad "medical helper text has an injected '>' marker near: $phrase"; BROKEN=1
    fi
  fi
done
[ "$BROKEN" = "0" ] && ok "medical helper text carries no injected quote markers"

# A safety callout must not be torn across a page. pdftotext -layout emits \f at a
# page boundary; a page that OPENS mid-sentence (lower-case first word, no heading)
# right after a page containing safety text is the page 13/14 failure.
ORPHAN=$(python3 - "$LAYOUT" <<'PY'
import sys, re
# PRECISE, not heuristic. The first version flagged any page that opened in lower
# case after a page containing safety text anywhere, which fires on ordinary prose
# flowing across a break: it failed a correct report whose page 15 continued the
# doctor pitch. A torn callout means a safety SENTENCE is split, so check exactly
# that: every known safety sentence must appear whole on one page.
pages = open(sys.argv[1], encoding='utf-8', errors='replace').read().split('\f')
norm = lambda t: re.sub(r'\s+', ' ', t)
SENTENCES = [
    'Take this report to your doctor or pharmacist before you start',
    'Do not change, stop, skip or re-time any medication',
    'Medication and treatment decisions belong',
    'was generated automatically from your questionnaire',
    'it does not know your kidney function, and it is not a clinician',
    'What you told us, and what it means for this report',
]
whole = [norm(p) for p in pages]
joined = norm(' '.join(pages))
bad = []
for s in SENTENCES:
    if s not in joined:
        continue                      # not in this report at all, nothing to tear
    if not any(s in p for p in whole):
        bad.append(f'"{s[:52]}" is split across a page boundary')
print('; '.join(bad))
PY
)
[ -z "$ORPHAN" ] && ok "no safety callout split across a page boundary" \
                 || bad "safety callout torn across pages: $ORPHAN"

echo "--- goal coherence (the 2026-09-07 complaint)"
present "maintenance"              "names the resolved goal"
absent  "stall-breaker"            "no weight-loss stall protocol under a maintenance goal"
absent  "consistent weight loss"   "no weight-loss promise under a maintenance goal"
absent  "healing benefits appear"  "no unsupported healing claim"

echo "--- one food may not be presented as two (2026-09-09)"
if grep -oiE "Option [0-9]+:.*" "$TXT" | grep -qiE "ground beef.*ground beef|salmon fillet.*salmon fillet"; then
  bad "an eating-pattern option names one food twice"
else ok "no eating-pattern option names one food twice"; fi
if grep -oiE "substitute with.*" "$TXT" | grep -qi "ground beef"; then
  grep -qiE "lack ground beef.*substitute with.*ground beef|lack grass-fed ground beef.*substitute with.*ground beef" "$TXT" \
    && bad "substitution offers another grade of the same food" \
    || ok "substitutions are different foods"
else ok "substitutions are different foods"; fi

echo "--- safety routing survives"
present "prolapse"                 "the declared condition is disclosed, not dropped"
# Matches the real wording ("is not intended as medical advice"), not a guessed
# phrase. The first version of this check looked for the literal "not medical advice"
# and failed a report whose disclaimer was present and correct.
if grep -qiE "not (intended as|constitute) medical advice|is not medical advice" "$TXT"; then
  ok "medical disclaimer present"; else bad "medical disclaimer present"; fi

echo "--- structure"
for s in "Week 1 Shopping List" "Week 2 Shopping List" "Week 3 Shopping List" "Week 4 Shopping List"; do
  present "$s" "$s"
done
SEQ=$(grep -oE "Report #[0-9]+" "$TXT" | grep -oE "[0-9]+" | sort -n -u | tr '\n' ' ')
echo "    report sections present: ${SEQ}"

echo
if [ "$fails" -eq 0 ]; then echo "ARTIFACT GATE PASSED"; else echo "ARTIFACT GATE FAILED: $fails check(s)"; fi
rm -f "$TXT" "$LAYOUT"
exit "$fails"

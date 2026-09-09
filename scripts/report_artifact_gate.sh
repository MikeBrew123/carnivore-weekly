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
rm -f "$TXT"
exit "$fails"
